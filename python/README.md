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

## Nine-candle strategy score

[`nine_candle_score.py`](./nine_candle_score.py) scores the nine completed
candles strictly before a market-open date and prints a Markdown score table
with pressure, directional-balance, evidence, and bias aggregates. It reads
the derived `candles-study.csv` output, not raw OHLCV; create that file with
[`candlestick_study.py`](./candlestick_study.py) first when needed.

```bash
python3 python/candlestick_study.py data/nvda_ohlc_data.csv \
python3 python/nine_candle_score.py 2026-08-03
python3 python/nine_candle_score.py 2026-08-03 \
  --input python/candles-study.csv \
  --config python/nine_candle_score_config.json
```

The positional date uses `YYYY-MM-DD`; the candle on that date is excluded.
The JSON config contains the nine weights and the scoring ranges, structure
scores, trend weights and epsilon, evidence threshold, evidence denominator,
directional-balance bands, and trace-table source columns. The trace table
appears last in the Markdown output and defaults to `Close`, `Ema9`,
`PredecessorPatternCode`, `Body`, `Atr`, `BodyAtr`, `Range`, `RangeAtr`, and
`Rvol`, in that order. Edit the JSON array to change the columns. Edit the
other values to adjust the strategy thresholds.
The script follows the BodyAtr scoring table rather than the conflicting
BodyScore worked example in `docs/specs/strategy/prompts/ver5.md`. The
close-location table assigns exactly `0.60` to score `0` to close the gap
between the documented adjacent ranges. Missing RVOL uses multiplier `1.00`
and is reported; missing score components prevent aggregate scoring and leave
bias `UNDEFINED`. The evidence denominator defaults to ver5's stated `697.50`;
that value uses an RVOL body multiplier of `1.50`, although the RVOL table
allows a multiplier of `3.00`. Review `maximum_total_pressure` in the config
if the prompt's evidence calculation is revised.

Run its focused tests with:

```bash
python3 -m unittest python.tests.test_nine_candle_score
```

## CSV value lookup

[`csv_lookup.py`](./csv_lookup.py) searches the CSV files directly inside a
directory (the current directory by default) for rows matching a ticker and
date or ISO timestamp, then prints selected columns as a Markdown table.
Duplicate values are collapsed into one row with their source filenames;
different values remain separate rows. Column names are case-insensitive, and
`magnitud` is accepted as an alias for `Magnitude`. Price-denominated fields
such as OHLC, ATR, range, body, wicks, and moving averages display two decimal
places; other numeric values display four.
Volume displays as a comma-separated whole number.

```bash
python3 python/csv_lookup.py NVDA 2026-07-29 Magnitude Slope9
python3 python/csv_lookup.py NVDA 2026-07-29T10:30:00-04:00 Magnitude Slope9 \
  --directory data
python3 python/csv_lookup.py NVDA 2026-10-06 T-9 Rvol Volume
python3 python/csv_lookup.py NVDA 2026-10-06 Rvol Volume --range T-9
python3 csv_lookup.py NVDA 2026-07-29 Magnitude Slope9 --directory ../data
python3 csv_lookup.py NVDA 2026-07-24 Close Ema9 PredecessorPatternCode Magnitude Slope9
```

A date-only query returns every matching intraday row for that day; a
timestamp query matches the exact timestamp. Flat CSVs with a `Ticker` column
and yfinance's three-row multi-header CSV export are supported. When there is
no ticker column, the ticker must be identified by the filename or yfinance
header.

An optional `T-n` argument (or `--range T-n`) includes the anchor row as
`T-0` and up to 99 prior rows, labeled `T-1` through `T-n`, in newest-first
order. A date anchor selects the latest available row on that date as `T-0`;
an ISO timestamp anchor selects that exact timestamp. If files disagree on
values for the same row, each distinct value set is shown under the same
T-index rather than consuming extra positions.

Run its focused tests with:

```bash
python3 -m unittest python.tests.test_csv_lookup
```



