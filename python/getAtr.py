import datetime
import json
import sys
from pathlib import Path
from typing import Sequence

import numpy as np
import pandas as pd


DEBUG = False
Print = False
OutputFile = False
DAYSBACK = 20
Period = 14
tickersList = Path(__file__).resolve().parent.parent / "Tickers_owned.json"


def calculate_atr(ohlc: pd.DataFrame, period: int = Period) -> pd.Series:
    """Calculate Wilder ATR values aligned with the OHLC rows."""
    if not isinstance(period, int) or isinstance(period, bool) or period <= 0:
        raise ValueError("period must be a positive integer")
    if not isinstance(ohlc, pd.DataFrame):
        raise TypeError("ohlc must be a pandas DataFrame")

    required_columns = {"High", "Low", "Close"}
    data = ohlc
    if isinstance(data.columns, pd.MultiIndex):
        for level in range(data.columns.nlevels):
            labels = data.columns.get_level_values(level)
            if required_columns.issubset(set(labels)):
                data = data.copy()
                data.columns = labels
                break

    missing_columns = required_columns.difference(data.columns)
    if missing_columns:
        missing = ", ".join(sorted(missing_columns))
        raise ValueError(f"OHLC data is missing required columns: {missing}")
    if not data.columns.is_unique:
        raise ValueError("OHLC data must have unique column names")

    prices = data.loc[:, ["High", "Low", "Close"]].apply(
        pd.to_numeric, errors="raise"
    )
    price_values = prices.to_numpy(dtype=float)
    if not np.isfinite(price_values).all():
        raise ValueError("OHLC prices must be finite numbers")

    high = prices["High"].to_numpy(dtype=float)
    low = prices["Low"].to_numpy(dtype=float)
    close = prices["Close"].to_numpy(dtype=float)
    if np.any(high < low):
        raise ValueError("High prices must be greater than or equal to Low prices")

    true_range = np.empty(len(prices), dtype=float)
    if len(prices):
        true_range[0] = high[0] - low[0]
        true_range[1:] = np.maximum.reduce(
            (
                high[1:] - low[1:],
                np.abs(high[1:] - close[:-1]),
                np.abs(low[1:] - close[:-1]),
            )
        )

    atr_values = np.full(len(prices), np.nan, dtype=float)
    if len(prices) >= period:
        atr_values[period - 1] = np.mean(true_range[:period])
        for index in range(period, len(prices)):
            atr_values[index] = (
                atr_values[index - 1] * (period - 1) + true_range[index]
            ) / period

    return pd.Series(atr_values, index=ohlc.index, name="ATR")


def gATR(Ticker: str) -> pd.Series:
    if DEBUG:
        print("received ARGS", Ticker)

    import yfinance as yf

    history_days = max(DAYSBACK, Period * 3)
    start_date = (
        datetime.date.today() - datetime.timedelta(days=history_days)
    ).isoformat()
    data = yf.download(Ticker, start=start_date, progress=False)
    if data.empty:
        raise ValueError(f"No OHLC data returned for ticker {Ticker!r}")

    data = data.sort_index()
    atr = calculate_atr(data, Period)
    if OutputFile:
        output = data.copy()
        output["ATR"] = atr
        output.to_csv("ATR_tmpout.csv", encoding="utf-8")
    if Print:
        latest_atr = atr.iloc[-1]
        if pd.isna(latest_atr):
            raise ValueError(
                f"Not enough OHLC rows for ticker {Ticker!r} "
                f"to calculate a {Period}-period ATR"
            )
        print("<<<<< ATR >>>>> =", f"{latest_atr:.2f}")

    return atr


def main() -> None:
    if len(sys.argv) > 1:
        tickers: Sequence[str] = [
            ticker.strip() for ticker in sys.argv[1].split(",") if ticker.strip()
        ]
    else:
        print("If no ARG, working with", tickersList)
        with tickersList.open("r", encoding="utf-8") as ticker_file:
            tickers = json.load(ticker_file)

    if not isinstance(tickers, list) or not all(
        isinstance(ticker, str) and ticker.strip() for ticker in tickers
    ):
        raise ValueError("Ticker input must be a non-empty list of ticker symbols")
    if not tickers:
        raise ValueError("At least one ticker symbol is required")

    for ticker in tickers:
        gATR(ticker.strip())


if __name__ == "__main__":
    Print = True
    main()
