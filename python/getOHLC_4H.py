import argparse
from datetime import date, datetime, timezone
from pathlib import Path
import re
import sys

import pandas as pd
import yfinance as yf


MARKET_TIMEZONE = "America/New_York"
OHLCV_FIELDS = ("Open", "High", "Low", "Close", "Volume")


def _parse_start_date(value: str) -> date:
    try:
        start_date = datetime.strptime(value, "%d-%m-%Y").date()
    except ValueError as exc:
        raise argparse.ArgumentTypeError(
            "start date must use DD-MM-YYYY, for example 10-10-2026"
        ) from exc

    if start_date > date.today():
        raise argparse.ArgumentTypeError("start date must not be in the future")
    return start_date


def _columns_for_ticker(data: pd.DataFrame, ticker: str) -> pd.DataFrame:
    if not isinstance(data.columns, pd.MultiIndex):
        return data

    for level in range(data.columns.nlevels):
        matching_ticker = next(
            (
                value
                for value in data.columns.get_level_values(level).unique()
                if str(value).upper() == ticker
            ),
            None,
        )
        if matching_ticker is not None:
            return data.xs(matching_ticker, axis="columns", level=level)

    raise ValueError(f"Downloaded data does not contain columns for ticker {ticker}")


def _resample_to_four_hours(data: pd.DataFrame, ticker: str) -> pd.DataFrame:
    data = _columns_for_ticker(data, ticker)
    missing_fields = set(OHLCV_FIELDS).difference(data.columns)
    if missing_fields:
        missing = ", ".join(sorted(missing_fields))
        raise ValueError(f"Downloaded data is missing required OHLCV fields: {missing}")

    if not isinstance(data.index, pd.DatetimeIndex):
        raise ValueError("Downloaded data must have a datetime index for 4-hour sampling")

    data = data.copy()
    if data.index.tz is None:
        data.index = data.index.tz_localize(MARKET_TIMEZONE)
    else:
        data.index = data.index.tz_convert(MARKET_TIMEZONE)

    # Resampling anchors at local midnight, so 90 minutes places bins at 9:30 AM.
    four_hour_data = data.resample("4h", offset="90min").agg(
        {
            "Open": "first",
            "High": "max",
            "Low": "min",
            "Close": "last",
            "Volume": "sum",
        }
    )
    return four_hour_data.dropna(subset=["Open"])


def _output_filename(ticker: str, sampling: str) -> str:
    safe_ticker = re.sub(r"[^A-Z0-9._-]", "_", ticker.upper())
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    return f"{safe_ticker}_{sampling}_{timestamp}.csv"


def fetch_and_save_ohlc(
    ticker: str,
    sampling: str = "4h",
    output_directory: Path = Path("."),
    start_date: date | None = None,
    all_history: bool = False,
) -> Path | None:
    """Download 1-hour data and save it unchanged or as 4-hour New York bars."""
    ticker = ticker.strip().upper()
    if not ticker:
        raise ValueError("Ticker must not be empty")
    if sampling not in {"1h", "4h"}:
        raise ValueError("Sampling must be either '1h' or '4h'")
    if start_date is not None and all_history:
        raise ValueError("Specify either a start date or all history, not both")
    if start_date is not None and start_date > date.today():
        raise ValueError("Start date must not be in the future")

    download_options: dict[str, str] = {"interval": "1h"}
    if all_history:
        download_options["period"] = "max"
        date_description = "all available"
    elif start_date is not None:
        download_options["start"] = start_date.isoformat()
        date_description = f"from {start_date:%d-%m-%Y}"
    else:
        download_options["period"] = "30d"
        date_description = "for the last 30 days"

    print(f"Downloading 1-hour {ticker} data from Yahoo Finance {date_description}...")
    data = yf.download(ticker, **download_options)
    if data.empty:
        print(
            "No data retrieved. Check your internet connection and ticker symbol.",
            file=sys.stderr,
        )
        return None

    if sampling == "4h":
        print(
            "Resampling data to 4-hour intervals aligned with "
            "the 9:30 AM New York market open..."
        )
        output_data = _resample_to_four_hours(data, ticker)
    else:
        output_data = data

    print(f"\nFirst 5 rows of {sampling} {ticker} OHLC data:")
    print(output_data.head())

    output_path = Path(output_directory) / _output_filename(ticker, sampling)
    output_data.to_csv(output_path)
    print(f"\nData successfully saved to {output_path}")
    return output_path


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Download a ticker's 1-hour OHLC data or 4-hour resampled bars."
    )
    parser.add_argument("ticker", help="Ticker symbol to download from Yahoo Finance")
    parser.add_argument(
        "sampling",
        nargs="?",
        choices=("1h", "4h"),
        default="4h",
        help="Output sampling interval (default: 4h)",
    )
    date_group = parser.add_mutually_exclusive_group()
    date_group.add_argument(
        "--start-date",
        type=_parse_start_date,
        metavar="DD-MM-YYYY",
        help="Retrieve data starting on this date (for example: 10-10-2026)",
    )
    date_group.add_argument(
        "--ALL",
        "--all",
        dest="all_history",
        action="store_true",
        help="Retrieve all history available from Yahoo Finance",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_argument_parser().parse_args(argv)
    output_path = fetch_and_save_ohlc(
        args.ticker,
        args.sampling,
        start_date=args.start_date,
        all_history=args.all_history,
    )
    return 0 if output_path is not None else 1


if __name__ == "__main__":
    raise SystemExit(main())
