# Project Setup and Running Scripts

This repository uses a local Python virtual environment to run the project scripts. Follow these steps to create the environment, install dependencies, and run the scripts.

## Prerequisites

- Ubuntu / Debian system
- `python3` installed
- Recommended: install system packages:
  ```bash
  sudo apt update
  sudo apt install python3-venv python3-full -y
  # remove any broken venv if present
rm -rf .venv

# create a new venv
python3 -m venv .venv

# activate it
source .venv/bin/activate

# upgrade pip and packaging tools inside the venv
python -m pip install --upgrade pip setuptools wheel

# install project dependencies (example)
pip install yfinance
# or install from requirements file if present
pip install -r requirements.txt

## Download intraday OHLC data

[`getOHLC_4H.py`](./getOHLC_4H.py) downloads the selected ticker at Yahoo
Finance's 1-hour interval. Sampling defaults to `4h`, which resamples bars in
the `America/New_York` timezone with 4-hour bins offset to align with the
9:30 AM market open. Select `1h` to write the downloaded bars without
resampling. Each run writes one CSV named with the ticker, sampling interval,
and a UTC timestamp to the current working directory. Downloads default to the
last 30 days. Use `--start-date DD-MM-YYYY` to retrieve from a specific date,
or `--ALL` to request the maximum history Yahoo Finance makes available for
the selected interval. Yahoo Finance may limit how far back intraday history
is available.

```bash
python3 python/getOHLC_4H.py NVDA
python3 python/getOHLC_4H.py NVDA 1h
python3 python/getOHLC_4H.py NVDA 4h
python3 python/getOHLC_4H.py NVDA 4h --start-date 10-10-2026
python3 python/getOHLC_4H.py NVDA 1h --ALL
```

## Environment validation

/home/rcastillo/checkoutcode/lib/python/.venv/bin/python

## How to check from the top repo if a requirements.txt file exist
[ -f requirements.txt ] && echo "exists" || echo "missing"

## How to create a requirements.txt file

python -m pip freeze > requirements.txt

## Candlestick study

The standalone [`candlestick_study.py`](./candlestick_study.py) module reads a
single-ticker daily or intraday OHLCV CSV and writes the study's canonical JSON
and CSV outputs. It supports yfinance's three-row multi-header export and a
flat CSV with `Date`, `Open`, `High`, `Low`, `Close`, and optional `Volume`
columns. A flat file without a `Ticker` column requires `--ticker`.
`--period` configures ATR initialization and smoothing; it defaults to `9` and
must be a positive integer. RVOL remains based on the immediately preceding
nine bars, as defined by the study.

```bash
python3 python/candlestick_study.py candles.csv
```

The output flags are optional. `--json-output` defaults to
`candles-study.json`, and `--csv-output` defaults to `candles-study.csv`, both
in the current working directory. Supply either flag to choose a different
path. `--period` defaults to `9` and can be supplied when another ATR period is
needed.

The command sorts records chronologically, preserves timestamp offsets,
retains invalid rows using the documented null/empty-cell representation, and
writes row diagnostics and a summary to standard error. Exit status is `0`
when every row is valid and both files are written, `1` when both files are
written with one or more invalid rows, and `2` for fatal input, processing, or
output failures. The module uses only the Python standard library. Run its
focused tests with:

```bash
python3 -m unittest python.tests.test_candlestick_study
```





