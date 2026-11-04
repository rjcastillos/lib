import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch

import pandas as pd

from python.getOHLC_4H import build_argument_parser, fetch_and_save_ohlc


class GetOhlcTests(unittest.TestCase):
    def test_one_hour_sampling_writes_downloaded_data_without_resampling(self):
        data = pd.DataFrame(
            {
                "Open": [10.0, 11.0],
                "High": [12.0, 13.0],
                "Low": [9.0, 10.0],
                "Close": [11.0, 12.0],
                "Volume": [100, 200],
            },
            index=pd.date_range("2026-11-04 09:30", periods=2, freq="h"),
        )

        with tempfile.TemporaryDirectory() as directory:
            with patch("python.getOHLC_4H.yf.download", return_value=data) as download:
                output_path = fetch_and_save_ohlc("amd", "1h", Path(directory))

            self.assertIsNotNone(output_path)
            self.assertRegex(
                output_path.name,
                r"^AMD_1h_\d{8}T\d{12}Z\.csv$",
            )
            download.assert_called_once_with("AMD", interval="1h", period="30d")
            pd.testing.assert_frame_equal(
                pd.read_csv(output_path, index_col=0, parse_dates=True),
                data,
                check_dtype=False,
                check_freq=False,
            )

    def test_four_hour_sampling_resamples_from_new_york_market_open(self):
        index = pd.date_range(
            "2026-11-04 09:30",
            periods=8,
            freq="h",
            tz="America/New_York",
        )
        data = pd.DataFrame(
            {
                ("Open", "AMD"): range(8),
                ("High", "AMD"): range(10, 18),
                ("Low", "AMD"): range(-1, 7),
                ("Close", "AMD"): range(1, 9),
                ("Volume", "AMD"): range(100, 108),
            },
            index=index,
        )

        with tempfile.TemporaryDirectory() as directory:
            with patch("python.getOHLC_4H.yf.download", return_value=data):
                output_path = fetch_and_save_ohlc("AMD", "4h", Path(directory))

            self.assertIsNotNone(output_path)
            self.assertRegex(
                output_path.name,
                r"^AMD_4h_\d{8}T\d{12}Z\.csv$",
            )
            result = pd.read_csv(output_path, index_col=0, parse_dates=True)

        self.assertEqual(len(result), 2)
        self.assertEqual(
            pd.to_datetime(result.index).tolist(),
            [
                pd.Timestamp("2026-11-04 09:30", tz="America/New_York"),
                pd.Timestamp("2026-11-04 13:30", tz="America/New_York"),
            ],
        )
        self.assertEqual(
            result.iloc[0].to_dict(),
            {"Open": 0, "High": 13, "Low": -1, "Close": 4, "Volume": 406},
        )
        self.assertEqual(
            result.iloc[1].to_dict(),
            {"Open": 4, "High": 17, "Low": 3, "Close": 8, "Volume": 422},
        )

    def test_sampling_argument_defaults_to_four_hours(self):
        args = build_argument_parser().parse_args(["AMD"])

        self.assertEqual(args.ticker, "AMD")
        self.assertEqual(args.sampling, "4h")

    def test_sampling_argument_accepts_one_hour(self):
        args = build_argument_parser().parse_args(["AMD", "1h"])

        self.assertEqual(args.sampling, "1h")

    def test_date_argument_is_parsed_as_day_month_year(self):
        args = build_argument_parser().parse_args(
            ["AMD", "--start-date", "10-10-2026"]
        )

        self.assertEqual(args.start_date, date(2026, 10, 10))
        self.assertFalse(args.all_history)

    def test_all_argument_is_supported(self):
        args = build_argument_parser().parse_args(["AMD", "--ALL"])

        self.assertTrue(args.all_history)
        self.assertIsNone(args.start_date)

    def test_invalid_start_date_is_rejected(self):
        with self.assertRaises(SystemExit):
            build_argument_parser().parse_args(["AMD", "--start-date", "2026-10-10"])

    def test_start_date_and_all_history_are_mutually_exclusive(self):
        with self.assertRaises(SystemExit):
            build_argument_parser().parse_args(
                ["AMD", "--start-date", "10-10-2026", "--ALL"]
            )

    def test_explicit_start_date_is_passed_to_yfinance(self):
        data = pd.DataFrame(
            {"Open": [10], "High": [11], "Low": [9], "Close": [10], "Volume": [100]},
            index=pd.date_range("2026-10-10", periods=1, freq="h"),
        )

        with tempfile.TemporaryDirectory() as directory:
            with patch("python.getOHLC_4H.yf.download", return_value=data) as download:
                fetch_and_save_ohlc(
                    "AMD",
                    "1h",
                    Path(directory),
                    start_date=date(2026, 10, 10),
                )

        download.assert_called_once_with("AMD", interval="1h", start="2026-10-10")

    def test_all_history_requests_maximum_available_period(self):
        data = pd.DataFrame(
            {"Open": [10], "High": [11], "Low": [9], "Close": [10], "Volume": [100]},
            index=pd.date_range("2026-10-10", periods=1, freq="h"),
        )

        with tempfile.TemporaryDirectory() as directory:
            with patch("python.getOHLC_4H.yf.download", return_value=data) as download:
                fetch_and_save_ohlc(
                    "AMD",
                    "1h",
                    Path(directory),
                    all_history=True,
                )

        download.assert_called_once_with("AMD", interval="1h", period="max")


if __name__ == "__main__":
    unittest.main()
