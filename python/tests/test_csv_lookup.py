import csv
import tempfile
import unittest
from pathlib import Path

from python.csv_lookup import (
    LookupError,
    _format_field_value,
    _parse_range,
    find_matches,
    render_markdown,
)


def write_study_csv(path, rows):
    with path.open("w", encoding="utf-8", newline="") as output:
        writer = csv.DictWriter(
            output,
            fieldnames=("Ticker", "Date", "Magnitude", "Slope9", "Volume", "Rvol"),
        )
        writer.writeheader()
        writer.writerows(rows)


class CsvLookupTests(unittest.TestCase):
    def test_formats_price_values_to_two_places_and_other_numbers_to_four(self):
        self.assertEqual(_format_field_value("Close", "123.456789"), "123.46")
        self.assertEqual(_format_field_value("Ema9", "123.456789"), "123.46")
        self.assertEqual(_format_field_value("BodyAtr", "0.7597764"), "0.7598")
        self.assertEqual(_format_field_value("Slope9", "-0.000001"), "0.0000")
        self.assertEqual(_format_field_value("Magnitude", "normal"), "normal")
        self.assertEqual(_format_field_value("Close", ""), "UNAVAILABLE")

    def test_formats_volume_as_a_comma_separated_whole_number(self):
        self.assertEqual(_format_field_value("Volume", "742789000"), "742,789,000")
        self.assertEqual(_format_field_value("Volume", "742789000.4"), "742,789,000")
        self.assertEqual(_format_field_value("Volume", "0.2"), "0")

    def test_markdown_formats_each_column_by_field_type(self):
        matches = [
            {
                "date": "2026-07-29",
                "values": ("189.797622", "0.759776", "1.190858"),
                "files": ["candles-study.csv"],
            }
        ]
        output = render_markdown(
            "NVDA", ["Close", "BodyAtr", "Rvol"], matches
        )
        self.assertIn(
            "| NVDA | 2026-07-29 | 189.80 | 0.7598 | 1.1909 | candles-study.csv |",
            output,
        )

    def test_collapses_duplicate_values_and_reports_files_for_differences(self):
        rows = [
            {
                "Ticker": "NVDA",
                "Date": "2026-07-29",
                "Magnitude": "normal",
                "Slope9": "-0.20001",
            }
        ]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_study_csv(root / "first.csv", rows)
            write_study_csv(root / "duplicate.csv", rows)
            write_study_csv(
                root / "different.csv",
                [
                    {
                        "Ticker": "NVDA",
                        "Date": "2026-07-29",
                        "Magnitude": "large",
                        "Slope9": "-0.20002",
                    }
                ],
            )
            # A different ticker on the same date must not be included.
            write_study_csv(
                root / "other.csv",
                [
                    {
                        "Ticker": "AMD",
                        "Date": "2026-07-29",
                        "Magnitude": "small",
                        "Slope9": "0.1",
                    }
                ],
            )
            matches, warnings = find_matches(
                "NVDA", "2026-07-29", ["magnitud", "slope9"], root
            )

        self.assertEqual(warnings, [])
        self.assertEqual(len(matches), 2)
        self.assertEqual(matches[0]["values"], ("large", "-0.2000"))
        self.assertEqual(matches[0]["files"], ["different.csv"])
        self.assertEqual(matches[1]["values"], ("normal", "-0.2000"))
        self.assertEqual(matches[1]["files"], ["duplicate.csv", "first.csv"])
        output = render_markdown("NVDA", ["Magnitude", "Slope9"], matches)
        self.assertIn(
            "| NVDA | 2026-07-29 | normal | -0.2000 | duplicate.csv, first.csv |",
            output,
        )

    def test_deduplicates_volume_using_whole_number_display_precision(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name, volume in (("first.csv", "742789000.1"), ("second.csv", "742789000.4")):
                write_study_csv(
                    root / name,
                    [
                        {
                            "Ticker": "NVDA",
                            "Date": "2026-11-12",
                            "Volume": volume,
                        }
                    ],
                )
            matches, _ = find_matches("NVDA", "2026-11-12", ["Volume"], root)

        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0]["values"], ("742,789,000",))
        self.assertEqual(matches[0]["files"], ["first.csv", "second.csv"])

    def test_date_only_matches_all_intraday_rows_and_timestamp_matches_one(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / "NVDA_intraday.csv"
            write_study_csv(
                path,
                [
                    {
                        "Ticker": "NVDA",
                        "Date": "2026-07-29T09:30:00-04:00",
                        "Magnitude": "normal",
                        "Slope9": "0.1",
                    },
                    {
                        "Ticker": "NVDA",
                        "Date": "2026-07-29T10:30:00-04:00",
                        "Magnitude": "large",
                        "Slope9": "0.2",
                    },
                ],
            )
            date_matches, _ = find_matches("NVDA", "2026-07-29", ["Magnitude"], root)
            timestamp_matches, _ = find_matches(
                "NVDA",
                "2026-07-29T10:30:00-04:00",
                ["Magnitude"],
                root,
            )

        self.assertEqual(len(date_matches), 2)
        self.assertEqual(len(timestamp_matches), 1)
        self.assertEqual(timestamp_matches[0]["values"], ("large",))

    def test_t_range_returns_t0_then_previous_rows_in_recency_order(self):
        days = [
            "2026-09-23",
            "2026-09-24",
            "2026-09-25",
            "2026-09-28",
            "2026-09-29",
            "2026-09-30",
            "2026-10-01",
            "2026-10-02",
            "2026-10-05",
            "2026-10-06",
        ]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_study_csv(
                root / "NVDA_history.csv",
                [
                    {
                        "Ticker": "NVDA",
                        "Date": day,
                        "Magnitude": f"m{index}",
                        "Volume": str(index * 1000),
                        "Rvol": str(index / 10),
                    }
                    for index, day in enumerate(days)
                ],
            )
            range_count, fields = _parse_range(
                ["T-9", "Rvol", "Volume"], None
            )
            matches, _ = find_matches(
                "NVDA", "2026-10-06", fields, root, range_count
            )

        self.assertEqual(len(matches), 10)
        self.assertEqual(
            [match["range"] for match in matches],
            [f"T-{index}" for index in range(10)],
        )
        self.assertEqual(
            [match["date"] for match in matches],
            list(reversed(days)),
        )
        output = render_markdown("NVDA", fields, matches)
        self.assertIn("| Range | Ticker | Date | Rvol | Volume | File |", output)
        self.assertTrue(output.splitlines()[2].startswith("| T-0 | NVDA | 2026-10-06 |"))

    def test_conflicting_files_share_the_same_t_index(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_study_csv(
                root / "first.csv",
                [
                    {
                        "Ticker": "NVDA",
                        "Date": "2026-10-05",
                        "Magnitude": "normal",
                    },
                    {
                        "Ticker": "NVDA",
                        "Date": "2026-10-06",
                        "Magnitude": "large",
                    },
                ],
            )
            write_study_csv(
                root / "second.csv",
                [
                    {
                        "Ticker": "NVDA",
                        "Date": "2026-10-06",
                        "Magnitude": "small",
                    }
                ],
            )
            matches, _ = find_matches(
                "NVDA", "2026-10-06", ["Magnitude"], root, range_count=1
            )

        self.assertEqual(
            [(match["range"], match["date"], match["values"]) for match in matches],
            [
                ("T-0", "2026-10-06", ("large",)),
                ("T-0", "2026-10-06", ("small",)),
                ("T-1", "2026-10-05", ("normal",)),
            ],
        )

    def test_t_range_supports_iso_timestamp_and_caps_at_99(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_study_csv(
                root / "NVDA_intraday.csv",
                [
                    {
                        "Ticker": "NVDA",
                        "Date": "2026-10-06T09:30:00-04:00",
                        "Magnitude": "normal",
                    },
                    {
                        "Ticker": "NVDA",
                        "Date": "2026-10-06T10:30:00-04:00",
                        "Magnitude": "large",
                    },
                ],
            )
            matches, _ = find_matches(
                "NVDA",
                "2026-10-06T10:30:00-04:00",
                ["Magnitude"],
                root,
                range_count=1,
            )
            with self.assertRaisesRegex(LookupError, "between 0 and 99"):
                find_matches("NVDA", "2026-10-06", ["Magnitude"], root, 100)

        self.assertEqual(
            [(match["range"], match["date"]) for match in matches],
            [
                ("T-0", "2026-10-06T10:30:00-04:00"),
                ("T-1", "2026-10-06T09:30:00-04:00"),
            ],
        )
        self.assertEqual(_parse_range(["Rvol", "Volume"], "T-9"), (9, ["Rvol", "Volume"]))
        with self.assertRaisesRegex(LookupError, "cannot exceed T-99"):
            _parse_range(["Rvol"], "T-100")

    def test_reads_yfinance_multiheader_csv(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "source.csv").write_text(
                "Price,Close,Close,High,High\n"
                "Ticker,NVDA,AMD,NVDA,AMD\n"
                "Date,,,,\n"
                "2026-07-29,100,50,101,52\n",
                encoding="utf-8",
            )
            nvda_matches, _ = find_matches("NVDA", "2026-07-29", ["Close"], root)
            amd_matches, _ = find_matches("AMD", "2026-07-29", ["Close"], root)

        self.assertEqual(nvda_matches[0]["values"], ("100.00",))
        self.assertEqual(amd_matches[0]["values"], ("50.00",))

    def test_missing_field_fails_with_available_column_names(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            write_study_csv(root / "data.csv", [])
            with self.assertRaisesRegex(LookupError, "available fields"):
                find_matches("NVDA", "2026-07-29", ["NotAColumn"], root)


if __name__ == "__main__":
    unittest.main()
