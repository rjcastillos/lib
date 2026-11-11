import csv
import tempfile
import unittest
from pathlib import Path

from python.nine_candle_score import (
    DEFAULT_CONFIG,
    ScoreInputError,
    _band_value,
    _load_config,
    calculate_report,
    render_markdown,
)


def write_study_csv(path, rows):
    fields = (
        "Ticker",
        "Date",
        "Open",
        "High",
        "Low",
        "Close",
        "Direction",
        "PredecessorPatternCode",
        "PredecessorStatus",
        "BodyAtr",
        "CloseLocation",
        "Rvol",
        "Slope9",
        "Slope20",
        "Slope50",
    )
    with path.open("w", encoding="utf-8", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def make_row(day, **updates):
    row = {
        "Ticker": "NVDA",
        "Date": day,
        "Open": "10",
        "High": "11",
        "Low": "9",
        "Close": "10.5",
        "Direction": "bullish",
        "PredecessorPatternCode": "HH-HL",
        "PredecessorStatus": "OK",
        "BodyAtr": "0.1",
        "CloseLocation": "0.8",
        "Rvol": "1.0",
        "Slope9": "0",
        "Slope20": "0",
        "Slope50": "0",
    }
    row.update(updates)
    return row


class NineCandleScoreTests(unittest.TestCase):
    def test_configured_scoring_boundaries_match_ver5_tables(self):
        config = _load_config(DEFAULT_CONFIG)
        body_bands = config["body_atr_bands"]
        volume_bands = config["rvol_multiplier_bands"]
        location_bands = config["close_location_bands"]

        self.assertEqual(_band_value(0.5, body_bands, "score"), 0.5)
        self.assertEqual(_band_value(1.0, body_bands, "score"), 1.0)
        self.assertEqual(_band_value(1.5, body_bands, "score"), 2.0)
        self.assertEqual(_band_value(2.0, body_bands, "score"), 3.0)
        self.assertEqual(_band_value(0.8, volume_bands, "multiplier"), 1.0)
        self.assertEqual(_band_value(1.2, volume_bands, "multiplier"), 1.0)
        self.assertEqual(_band_value(3.0, volume_bands, "multiplier"), 2.0)
        self.assertEqual(_band_value(0.5, location_bands, "score"), -1.0)
        self.assertEqual(_band_value(0.6, location_bands, "score"), 0.0)
        self.assertEqual(_band_value(0.75, location_bands, "score"), 1.0)

    def test_scores_the_nine_completed_candles_and_excludes_as_of_candle(self):
        days = [
            "2026-07-21",
            "2026-07-22",
            "2026-07-23",
            "2026-07-24",
            "2026-07-27",
            "2026-07-28",
            "2026-07-29",
            "2026-07-30",
            "2026-07-31",
        ]
        rows = [make_row(day) for day in days]
        rows.append(make_row("2026-08-03", PredecessorStatus="INVALID_OHLC"))

        with tempfile.TemporaryDirectory() as directory:
            input_path = Path(directory) / "study.csv"
            write_study_csv(input_path, rows)
            report = calculate_report("2026-08-03", input_path, DEFAULT_CONFIG)

        self.assertEqual(len(report["candles"]), 9)
        self.assertEqual(report["candles"][0]["candle"], "T-9")
        self.assertEqual(report["candles"][0]["weight"], 1)
        self.assertEqual(report["candles"][-1]["candle"], "T-1")
        self.assertEqual(report["candles"][-1]["date"], "2026-07-31")
        self.assertEqual(report["bull_pressure"], 225)
        self.assertEqual(report["bear_pressure"], 0)
        self.assertEqual(report["net_score"], 225)
        self.assertAlmostEqual(report["directional_balance"], 1)
        self.assertEqual(report["bias"], "STRONG_BULLISH")

        rendered = render_markdown(report)
        self.assertIn("| BullPressure | 225.00 |", rendered)
        self.assertIn("| BearPressure | 0.00 |", rendered)

    def test_missing_rvol_uses_neutral_multiplier_and_reports_it(self):
        rows = [
            make_row(f"2026-01-{day:02d}", **({"Rvol": ""} if day == 3 else {}))
            for day in range(1, 10)
        ]
        with tempfile.TemporaryDirectory() as directory:
            input_path = Path(directory) / "study.csv"
            write_study_csv(input_path, rows)
            report = calculate_report("2026-01-10", input_path, DEFAULT_CONFIG)

        self.assertEqual(report["candles"][2]["volume_multiplier"], 1)
        self.assertTrue(report["candles"][2]["warnings"])
        self.assertTrue(report["data_quality_pass"])

    def test_missing_slope_keeps_aggregate_unavailable(self):
        rows = [
            make_row(f"2026-01-{day:02d}", **({"Slope20": ""} if day == 9 else {}))
            for day in range(1, 10)
        ]
        with tempfile.TemporaryDirectory() as directory:
            input_path = Path(directory) / "study.csv"
            write_study_csv(input_path, rows)
            report = calculate_report("2026-01-10", input_path, DEFAULT_CONFIG)

        self.assertIsNone(report["candles"][-1]["trend_score"])
        self.assertIsNone(report["total_pressure"])
        self.assertEqual(report["bias"], "UNDEFINED")

    def test_requires_nine_prior_candles(self):
        with tempfile.TemporaryDirectory() as directory:
            input_path = Path(directory) / "study.csv"
            write_study_csv(input_path, [make_row("2026-01-01")])
            with self.assertRaises(ScoreInputError):
                calculate_report("2026-01-02", input_path, DEFAULT_CONFIG)


if __name__ == "__main__":
    unittest.main()
