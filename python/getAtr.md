# `getAtr.py` — Average True Range

`getAtr.py` calculates the Average True Range (ATR) for one or more ticker
symbols using daily OHLC data downloaded through `yfinance`. ATR measures
volatility; it does not indicate price direction or guarantee future movement.

The calculation follows the [ATR technical specification](../docs/specs/ATR/README.md).

## Requirements

- Python 3
- `pandas`, `numpy`, and `yfinance`
- Internet access when using the command-line ticker interface

If using the repository's Python virtual environment, install missing packages
into it and run the script from the repository root:

```bash
python/.venv/bin/python -m pip install pandas numpy yfinance
```

No `.env` file or API credentials are required by this script.

## Command-line usage

Pass a single ticker:

```bash
python/.venv/bin/python python/getAtr.py AAPL
```

Pass multiple comma-separated tickers:

```bash
python/.venv/bin/python python/getAtr.py AAPL,MSFT,SPY
```

The script prints the latest available ATR for each ticker, rounded to two
decimal places. The underlying calculation retains full floating-point
precision.

With no command-line ticker argument, the script reads ticker symbols from
`Tickers_owned.json` in the repository root. The file must contain a JSON array
of non-empty strings, for example:

```json
["AAPL", "MSFT", "SPY"]
```

If this file is absent or invalid, provide ticker symbols on the command line
or create the JSON file in the repository root.

## Python API

`calculate_atr` accepts a pandas DataFrame with `High`, `Low`, and `Close`
columns and returns a pandas Series named `ATR`, aligned with the input index.
The lookback period defaults to 14 and can be supplied explicitly:

```python
import pandas as pd

from python.getAtr import calculate_atr

ohlc = pd.DataFrame(
    {
        "High": [105, 108, 110],
        "Low": [100, 103, 106],
        "Close": [102, 107, 109],
    }
)

atr = calculate_atr(ohlc, period=3)
print(atr.iloc[-1])  # 5.0
```

The first `period - 1` output rows are `NaN`, because there are not yet enough
True Range values to seed ATR. If fewer than `period` rows are supplied, the
entire result is `NaN`. The first ATR is the simple average of the first
`period` True Range values; subsequent values use Wilder smoothing.

`gATR(ticker)` downloads daily data for one ticker and returns its aligned ATR
Series. It raises an error if no market data is returned. The command-line
interface additionally reports an error if there are not enough rows to
calculate the latest ATR.

## Calculation

For the first row, True Range is `High - Low`. For each later row:

```text
TR = max(
    High - Low,
    abs(High - previous Close),
    abs(Low - previous Close)
)
```

The initial ATR is the arithmetic mean of the first `period` True Range values.
Each following ATR is:

```text
ATR(current) =
    (ATR(previous) * (period - 1) + TR(current)) / period
```

See the [ATR technical specification](../docs/specs/ATR/README.md) for the
definitions and worked example.

## Data and output notes

- The script requests enough recent calendar history for at least `Period * 3`
  days (42 days with the default period) and calculates from the returned daily
  bars. Market-data availability depends on the ticker and data provider.
- `Period` in `getAtr.py` controls the lookback used by the ticker downloader
  and command-line interface. For direct calculations on supplied OHLC data,
  pass `period` to `calculate_atr`.
- Setting the module-level `OutputFile` option to `True` writes the downloaded
  rows and ATR column to `ATR_tmpout.csv` in the current working directory.
  By default, no CSV file is written.
- Invalid periods, missing OHLC columns, non-finite prices, and rows with
  `High < Low` are rejected with an error.

## Tests

Run the focused tests from the repository root:

```bash
python/.venv/bin/python -m unittest discover -s python/tests -v
```
