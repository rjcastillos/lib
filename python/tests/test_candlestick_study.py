import csv
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from python.candlestick_study import (
    CSV_COLUMNS,
    JSON_FIELDS,
    PATTERN_NAMES,
    calculate_study,
    load_candles,
    write_outputs,
)


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = REPOSITORY_ROOT / "python" / "candlestick_study.py"


def write_flat_csv(path, rows, include_volume=True):
    headers = ["Date", "Ticker", "Open", "High", "Low", "Close"]
    if include_volume:
        headers.append("Volume")
    with path.open("w", encoding="utf-8", newline="") as output:
        writer = csv.writer(output)
        writer.writerow(headers)
        writer.writerows(rows)


def make_row(timestamp, open_, high, low, close, volume=100):
    return [timestamp, "TEST", open_, high, low, close, volume]


class CandlestickStudyTests(unittest.TestCase):
    def test_reads_yfinance_multiheader_daily_export(self):
        with tempfile.TemporaryDirectory() as directory:
            input_path = Path(directory) / "yfinance.csv"
            input_path.write_text(
                "Price,Close,High,Low,Open,Volume\n"
                "Ticker,NVDA,NVDA,NVDA,NVDA,NVDA\n"
                "Date,,,,,\n"
                "2026-10-15,100.12345678901234,102,99,100.5,1200\n",
                encoding="utf-8",
            )
            candles = load_candles(input_path)
            records = calculate_study(candles)

        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["ticker"], "NVDA")
        self.assertEqual(records[0]["date"], "2026-10-15")
        self.assertIsNone(records[0]["time"])
        self.assertEqual(records[0]["close"], 100.12345678901234)
        self.assertEqual(records[0]["predecessor"]["status"], "NO_PREDECESSOR")

    def test_sorts_rows_preserves_offset_and_exports_canonical_layout(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            input_path = root / "input.csv"
            write_flat_csv(
                input_path,
                [
                    make_row("2026-10-15T10:30:00-04:00", 10, 12, 9, 11),
                    make_row("2026-10-15T09:30:00-04:00", 10, 11, 9, 10.5),
                ],
            )
            candles = load_candles(input_path)
            records = calculate_study(candles)
            json_path = root / "output.json"
            csv_path = root / "output.csv"
            write_outputs(records, json_path, csv_path)

            self.assertEqual(len(JSON_FIELDS), 40)
            self.assertEqual(len(CSV_COLUMNS), 44)
            self.assertEqual(len(set(CSV_COLUMNS)), 44)
            self.assertEqual(JSON_FIELDS[8:11], ("shape", "atr", "range"))
            self.assertEqual(CSV_COLUMNS[8:11], ("Shape", "Atr", "Range"))
            self.assertEqual(records[0]["time"], "09:30:00-04:00")
            self.assertEqual(records[1]["time"], "10:30:00-04:00")
            self.assertEqual(
                records[1]["predecessor"],
                {
                    "high_relation": "HH",
                    "low_relation": "EL",
                    "pattern_code": "HH-EL",
                    "pattern_name": "upper_expansion",
                    "status": "OK",
                },
            )
            json_records = json.loads(json_path.read_text(encoding="utf-8"))
            with csv_path.open(encoding="utf-8", newline="") as source:
                csv_reader = csv.DictReader(source)
                csv_records = list(csv_reader)
                self.assertEqual(tuple(csv_reader.fieldnames), CSV_COLUMNS)
            self.assertEqual(len(json_records), len(csv_records))
            self.assertEqual(csv_records[0]["Time"], "09:30:00-04:00")
            self.assertEqual(csv_records[1]["PredecessorStatus"], "OK")

    def test_approved_nine_pattern_names_are_calculated(self):
        relation_inputs = (
            (21, 11),
            (21, 10),
            (21, 9),
            (19, 11),
            (19, 9),
            (19, 10),
            (20, 11),
            (20, 9),
            (20, 10),
        )
        with tempfile.TemporaryDirectory() as directory:
            input_path = Path(directory) / "patterns.csv"
            rows = []
            for index, (high, low) in enumerate(relation_inputs):
                day = index * 2 + 1
                rows.append(make_row(f"2026-01-{day:02d}", 15, 20, 10, 16))
                rows.append(
                    make_row(
                        f"2026-01-{day + 1:02d}",
                        low + 0.4,
                        high,
                        low,
                        low + 0.6,
                    )
                )
            write_flat_csv(input_path, rows)
            actual = [
                row["predecessor"]["pattern_name"]
                for row in calculate_study(load_candles(input_path))[1::2]
            ]
        self.assertEqual(actual, list(PATTERN_NAMES.values()))

    def test_invalid_ohlc_and_volume_are_exported_as_null_and_empty(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            input_path = root / "invalid.csv"
            write_flat_csv(
                input_path,
                [
                    make_row("2026-01-01", 10, 12, 9, 11),
                    make_row("2026-01-02", 10, 12, 13, 11, -1),
                    make_row("2026-01-03", 10, 13, 9, 12),
                ],
            )
            candles = load_candles(input_path)
            records = calculate_study(candles)
            self.assertEqual(records[1]["predecessor"]["status"], "INVALID_OHLC")
            self.assertEqual(records[2]["predecessor"]["status"], "INVALID_OHLC")
            self.assertIsNone(records[1]["volume"])
            self.assertIsNone(records[1]["direction"])

            json_path = root / "output.json"
            csv_path = root / "output.csv"
            write_outputs(records, json_path, csv_path)
            json_rows = json.loads(json_path.read_text(encoding="utf-8"))
            with csv_path.open(encoding="utf-8", newline="") as source:
                csv_rows = list(csv.DictReader(source))
            self.assertEqual(json_rows[1]["low"], 13.0)
            self.assertEqual(csv_rows[1]["Low"], "13.0")
            self.assertEqual(csv_rows[1]["Volume"], "")
            self.assertEqual(csv_rows[1]["Direction"], "")
            self.assertEqual(csv_rows[1]["PredecessorStatus"], "INVALID_OHLC")

    def test_missing_and_invalid_comparison_prices_have_distinct_statuses(self):
        with tempfile.TemporaryDirectory() as directory:
            input_path = Path(directory) / "comparison-prices.csv"
            write_flat_csv(
                input_path,
                [
                    make_row("2026-01-01", 10, 12, 9, 11),
                    make_row("2026-01-02", 10, "", 9, 11),
                    make_row("2026-01-03", 10, "NaN", 9, 11),
                    make_row("2026-01-04", 10, 13, 9, 12),
                ],
            )
            records = calculate_study(load_candles(input_path))

        self.assertEqual(records[1]["predecessor"]["status"], "MISSING_PRICE")
        self.assertEqual(records[2]["predecessor"]["status"], "MISSING_PRICE")
        self.assertEqual(records[3]["predecessor"]["status"], "INVALID_PRICE")
        self.assertIsNone(records[2]["high"])

    def test_full_numeric_precision_round_trips_in_both_formats(self):
        source_value = 100.12345678901234
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            input_path = root / "precision.csv"
            write_flat_csv(
                input_path,
                [make_row("2026-01-01", source_value, 101, 99, source_value)],
            )
            records = calculate_study(load_candles(input_path))
            json_path = root / "precision.json"
            csv_path = root / "precision-out.csv"
            write_outputs(records, json_path, csv_path)
            json_value = json.loads(json_path.read_text(encoding="utf-8"))[0]["open"]
            with csv_path.open(encoding="utf-8", newline="") as source:
                csv_value = float(next(csv.DictReader(source))["Open"])
        self.assertEqual(json_value, source_value)
        self.assertEqual(csv_value, source_value)

    def test_rvol_uses_exactly_the_prior_nine_bars_and_ema_sma_seed(self):
        with tempfile.TemporaryDirectory() as directory:
            input_path = Path(directory) / "long.csv"
            rows = [
                make_row(
                    f"2026-{1 + index // 28:02d}-{1 + index % 28:02d}",
                    100 + index,
                    101 + index,
                    99 + index,
                    100 + index,
                    (index + 1) * 10,
                )
                for index in range(210)
            ]
            write_flat_csv(input_path, rows)
            records = calculate_study(load_candles(input_path))

        self.assertIsNone(records[8]["rvol"])
        expected_rvol = (10 * 10) / (sum(10 * value for value in range(1, 10)) / 9)
        self.assertAlmostEqual(records[9]["rvol"], expected_rvol)
        self.assertAlmostEqual(records[8]["ema9"], 104.0)
        self.assertAlmostEqual(records[19]["sma20"], 109.5)
        self.assertAlmostEqual(records[8]["atr"], 2.0)
        self.assertIsNone(records[16]["slope9"])
        self.assertIsNotNone(records[17]["slope9"])
        self.assertIsNotNone(records[208]["slope200"])

    def test_cli_writes_both_outputs_and_returns_partial_data_status(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            input_path = root / "input.csv"
            write_flat_csv(
                input_path,
                [
                    make_row("2026-01-01", 10, 12, 9, 11),
                    make_row("2026-01-02", 10, 12, 9, 11, -1),
                ],
            )
            json_path = root / "output.json"
            csv_path = root / "output.csv"
            result = subprocess.run(
                [
                    sys.executable,
                    str(MODULE_PATH),
                    str(input_path),
                    "--json-output",
                    str(json_path),
                    "--csv-output",
                    str(csv_path),
                ],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 1)
            self.assertIn("has invalid volume at 2026-01-02", result.stderr)
            self.assertIn("valid rows: 1; invalid rows: 1", result.stderr)
            self.assertTrue(json_path.exists())
            self.assertTrue(csv_path.exists())

            fatal_json_path = root / "fatal.json"
            fatal_csv_path = root / "fatal.csv"
            fatal_result = subprocess.run(
                [
                    sys.executable,
                    str(MODULE_PATH),
                    str(input_path),
                    "--period",
                    "0",
                    "--json-output",
                    str(fatal_json_path),
                    "--csv-output",
                    str(fatal_csv_path),
                ],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(fatal_result.returncode, 2)
            self.assertIn("period must be an integer", fatal_result.stderr)
            self.assertIn("both output files written: no", fatal_result.stderr)
            self.assertFalse(fatal_json_path.exists())
            self.assertFalse(fatal_csv_path.exists())

    def test_cli_defaults_output_paths_when_only_input_is_given(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            input_path = root / "input.csv"
            write_flat_csv(
                input_path,
                [
                    make_row(f"2026-01-{index:02d}", 10, 12, 9, 11)
                    for index in range(1, 10)
                ],
            )
            result = subprocess.run(
                [sys.executable, str(MODULE_PATH), str(input_path)],
                check=False,
                capture_output=True,
                text=True,
                cwd=root,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            json_path = root / "candles-study.json"
            csv_path = root / "candles-study.csv"
            self.assertTrue(json_path.exists())
            self.assertTrue(csv_path.exists())
            json_rows = json.loads(json_path.read_text(encoding="utf-8"))
            self.assertEqual(json_rows[-1]["atr"], 3.0)

    def test_duplicate_timestamps_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            input_path = Path(directory) / "duplicate.csv"
            write_flat_csv(
                input_path,
                [
                    make_row("2026-01-01", 10, 12, 9, 11),
                    make_row("2026-01-01", 10, 12, 9, 11),
                ],
            )
            with self.assertRaisesRegex(ValueError, "duplicate candle timestamp"):
                load_candles(input_path)

    def test_atr_period_must_be_a_positive_integer(self):
        with tempfile.TemporaryDirectory() as directory:
            input_path = Path(directory) / "one.csv"
            write_flat_csv(input_path, [make_row("2026-01-01", 10, 12, 9, 11)])
            candles = load_candles(input_path)
        for invalid_period in (0, -1, 1.5, True):
            with self.subTest(period=invalid_period):
                with self.assertRaisesRegex(ValueError, "period must be an integer"):
                    calculate_study(candles, period=invalid_period)


if __name__ == "__main__":
    unittest.main()
