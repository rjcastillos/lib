#!/usr/bin/env python3
"""Calculate and export the candlestick OHLCV study.

The module uses only the Python standard library. Its calculations and output
field order follow docs/specs/candlesticks/shapes/study and its output contract.

Example:
    python3 python/candlestick_study.py input.csv \
        --json-output output.json --csv-output output.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from collections import deque
from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Iterable, Sequence


JSON_FIELDS = (
    "ticker",
    "date",
    "time",
    "open",
    "high",
    "low",
    "close",
    "direction",
    "shape",
    "atr",
    "range",
    "body",
    "upper_wick",
    "lower_wick",
    "body_percent",
    "upper_wick_percent",
    "lower_wick_percent",
    "predecessor",
    "open_location",
    "close_location",
    "magnitude",
    "relative_open_percent",
    "relative_open_range_percent",
    "relative_open_upper_wick_percent",
    "relative_open_lower_wick_percent",
    "body_atr",
    "range_atr",
    "upper_wick_atr",
    "lower_wick_atr",
    "rvol",
    "ema9",
    "sma20",
    "ema50",
    "ema100",
    "ema200",
    "slope9",
    "slope20",
    "slope50",
    "slope200",
    "volume",
)

PREDECESSOR_FIELDS = (
    "high_relation",
    "low_relation",
    "pattern_code",
    "pattern_name",
    "status",
)

CSV_COLUMNS = (
    "Ticker",
    "Date",
    "Time",
    "Open",
    "High",
    "Low",
    "Close",
    "Direction",
    "Shape",
    "Atr",
    "Range",
    "Body",
    "UpperWick",
    "LowerWick",
    "BodyPercent",
    "UpperWickPercent",
    "LowerWickPercent",
    "PredecessorHighRelation",
    "PredecessorLowRelation",
    "PredecessorPatternCode",
    "PredecessorPatternName",
    "PredecessorStatus",
    "OpenLocation",
    "CloseLocation",
    "Magnitude",
    "RelativeOpenPercent",
    "RelativeOpenRangePercent",
    "RelativeOpenUpperWickPercent",
    "RelativeOpenLowerWickPercent",
    "BodyAtr",
    "RangeAtr",
    "UpperWickAtr",
    "LowerWickAtr",
    "Rvol",
    "Ema9",
    "Sma20",
    "Ema50",
    "Ema100",
    "Ema200",
    "Slope9",
    "Slope20",
    "Slope50",
    "Slope200",
    "Volume",
)

PATTERN_NAMES = {
    "HH-HL": "upward_shift",
    "HH-EL": "upper_expansion",
    "HH-LL": "outside_bar",
    "LH-HL": "inside_bar",
    "LH-LL": "downward_shift",
    "LH-EL": "upper_contraction",
    "EH-HL": "lower_contraction",
    "EH-LL": "lower_expansion",
    "EH-EL": "unchanged_boundaries",
}

_CSV_FIELD_MAP = dict(zip(JSON_FIELDS[:10], CSV_COLUMNS[:10]))
_CSV_FIELD_MAP.update(zip(JSON_FIELDS[10:17], CSV_COLUMNS[10:17]))
_CSV_FIELD_MAP.update(zip(JSON_FIELDS[18:], CSV_COLUMNS[22:]))
_CSV_FIELD_MAP.update(
    {
        f"predecessor.{field}": column
        for field, column in zip(PREDECESSOR_FIELDS, CSV_COLUMNS[17:22])
    }
)


@dataclass(frozen=True)
class CandleInput:
    """One parsed input row, retaining source validity for diagnostics."""

    ticker: str
    date_text: str
    time_text: str | None
    timestamp_text: str
    timestamp: datetime
    open: float | None
    high: float | None
    low: float | None
    close: float | None
    volume: float | None
    invalid_numeric_fields: frozenset[str]
    missing_numeric_fields: frozenset[str]
    volume_invalid: bool

    @property
    def valid_ohlc(self) -> bool:
        values = (self.open, self.high, self.low, self.close)
        if any(value is None or not math.isfinite(value) or value <= 0 for value in values):
            return False
        assert self.open is not None
        assert self.high is not None
        assert self.low is not None
        assert self.close is not None
        return (
            self.high >= self.low
            and self.high >= max(self.open, self.close)
            and self.low <= min(self.open, self.close)
        )


def _parse_number(value: str | None, field: str) -> tuple[float | None, str | None]:
    if value is None or not value.strip():
        return None, "missing"
    try:
        number = float(value.strip())
    except ValueError:
        return None, "invalid"
    if not math.isfinite(number):
        return None, "invalid"
    if field == "volume" and number < 0:
        return None, "invalid"
    return number, None


def _parse_timestamp(value: str) -> tuple[str, str | None, datetime]:
    timestamp_text = value.strip()
    if not timestamp_text:
        raise ValueError("input contains a row with an empty date/timestamp")
    normalized = (
        timestamp_text[:-1] + "+00:00"
        if timestamp_text.endswith("Z")
        else timestamp_text
    )
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise ValueError(f"invalid ISO 8601 date/timestamp {timestamp_text!r}") from exc

    if "T" in timestamp_text:
        time_text = timestamp_text.split("T", 1)[1]
    elif " " in timestamp_text:
        time_text = timestamp_text.split(" ", 1)[1].strip()
    else:
        time_text = None

    return parsed.date().isoformat(), time_text, parsed


def _clean_cells(row: Sequence[str]) -> list[str]:
    return [cell.strip() for cell in row]


def _source_ticker(metadata: Iterable[str], override: str | None) -> str:
    tickers = {ticker.strip() for ticker in metadata if ticker.strip()}
    if len(tickers) > 1:
        raise ValueError("input contains more than one ticker")
    source_ticker = next(iter(tickers), None)
    if override and source_ticker and override.strip() != source_ticker:
        raise ValueError(
            f"--ticker {override.strip()!r} does not match input ticker {source_ticker!r}"
        )
    ticker = override.strip() if override else source_ticker
    if not ticker:
        raise ValueError("ticker is not present in the input; supply --ticker")
    return ticker


def _make_candle(
    values: dict[str, str | None],
    ticker: str,
    timestamp_value: str,
) -> CandleInput:
    date_text, time_text, timestamp = _parse_timestamp(timestamp_value)
    numeric_values: dict[str, float | None] = {}
    invalid_fields: set[str] = set()
    missing_fields: set[str] = set()

    for field in ("open", "high", "low", "close", "volume"):
        numeric, status = _parse_number(values.get(field), field)
        numeric_values[field] = numeric
        if status == "invalid":
            invalid_fields.add(field)
        elif status == "missing":
            missing_fields.add(field)

    return CandleInput(
        ticker=ticker,
        date_text=date_text,
        time_text=time_text,
        timestamp_text=timestamp_value.strip(),
        timestamp=timestamp,
        open=numeric_values["open"],
        high=numeric_values["high"],
        low=numeric_values["low"],
        close=numeric_values["close"],
        volume=numeric_values["volume"],
        invalid_numeric_fields=frozenset(invalid_fields),
        missing_numeric_fields=frozenset(missing_fields),
        volume_invalid="volume" in invalid_fields,
    )


def _read_yfinance_csv(rows: list[list[str]], ticker_override: str | None) -> list[CandleInput]:
    columns = _clean_cells(rows[0])[1:]
    ticker_row = _clean_cells(rows[1])[1:]
    ticker = _source_ticker(ticker_row, ticker_override)
    indices = {name.casefold(): index for index, name in enumerate(columns)}
    required = {"open", "high", "low", "close"}
    missing = required.difference(indices)
    if missing:
        raise ValueError(f"input is missing required columns: {', '.join(sorted(missing))}")
    time_label = _clean_cells(rows[2])[0].casefold()
    if time_label not in {"date", "datetime"}:
        raise ValueError("yfinance input must identify its index as Date or Datetime")

    candles = []
    for row_number, raw_row in enumerate(rows[3:], start=4):
        row = _clean_cells(raw_row)
        if not any(row):
            continue
        values: dict[str, str | None] = {}
        for field in ("open", "high", "low", "close", "volume"):
            index = indices.get(field)
            values[field] = row[index + 1] if index is not None and index + 1 < len(row) else None
        timestamp_value = row[0] if row else ""
        try:
            candles.append(
                _make_candle(values, ticker, timestamp_value)
            )
        except ValueError as exc:
            raise ValueError(f"input row {row_number}: {exc}") from exc
    return candles


def _read_flat_csv(rows: list[list[str]], ticker_override: str | None) -> list[CandleInput]:
    header = [value.casefold() for value in _clean_cells(rows[0])]
    indices = {name: index for index, name in enumerate(header) if name}
    timestamp_name = next(
        (name for name in ("datetime", "timestamp", "date") if name in indices),
        None,
    )
    if timestamp_name is None:
        raise ValueError("CSV header must contain Date, Datetime, or Timestamp")
    required = {"open", "high", "low", "close"}
    missing = required.difference(indices)
    if missing:
        raise ValueError(f"input is missing required columns: {', '.join(sorted(missing))}")
    candles = []

    for row_number, raw_row in enumerate(rows[1:], start=2):
        row = _clean_cells(raw_row)
        if not any(row):
            continue
        ticker_value = row[indices["ticker"]] if "ticker" in indices and indices["ticker"] < len(row) else ""
        ticker = _source_ticker((ticker_value,), ticker_override)
        values = {
            field: row[index] if index < len(row) else None
            for field, index in indices.items()
            if field in {"open", "high", "low", "close", "volume"}
        }
        timestamp_value = (
            row[indices[timestamp_name]]
            if indices[timestamp_name] < len(row)
            else ""
        )
        try:
            candles.append(
                _make_candle(values, ticker, timestamp_value)
            )
        except ValueError as exc:
            raise ValueError(f"input row {row_number}: {exc}") from exc
    return candles


def load_candles(input_path: Path, ticker: str | None = None) -> list[CandleInput]:
    """Read daily/intraday yfinance multi-header or conventional flat CSV."""
    with input_path.open("r", encoding="utf-8-sig", newline="") as source:
        rows = [row for row in csv.reader(source)]
    if not rows or not any(cell.strip() for cell in rows[0]):
        raise ValueError("input CSV is empty")
    if (
        len(rows) >= 3
        and _clean_cells(rows[0])[0].casefold() == "price"
        and _clean_cells(rows[1])[0].casefold() == "ticker"
    ):
        candles = _read_yfinance_csv(rows, ticker)
    else:
        candles = _read_flat_csv(rows, ticker)
    if not candles:
        raise ValueError("input CSV contains no candle rows")
    return _sort_and_validate_timestamps(candles)


def _sort_and_validate_timestamps(candles: Sequence[CandleInput]) -> list[CandleInput]:
    if len({candle.ticker for candle in candles}) > 1:
        raise ValueError("input contains more than one ticker")
    has_time = [candle.time_text is not None for candle in candles]
    if any(has_time) and not all(has_time):
        raise ValueError("input cannot mix daily and intraday candles")
    awareness = [
        candle.timestamp.utcoffset() is not None for candle in candles if candle.time_text
    ]
    if awareness and any(awareness) and not all(awareness):
        raise ValueError("intraday timestamps cannot mix timezone-aware and timezone-naive values")

    def key(candle: CandleInput) -> date | datetime:
        if candle.time_text is None:
            return candle.timestamp.date()
        if candle.timestamp.utcoffset() is not None:
            return candle.timestamp.astimezone(timezone.utc)
        return candle.timestamp

    sorted_candles = sorted(candles, key=key)
    previous_key: date | datetime | None = None
    for candle in sorted_candles:
        candle_key = key(candle)
        if candle_key == previous_key:
            raise ValueError(
                f"duplicate candle timestamp {candle.timestamp_text!r}; "
                "input must contain at most one candle per timestamp"
            )
        previous_key = candle_key
    return sorted_candles


def _relation(high: float, previous_high: float) -> str:
    if high > previous_high:
        return "HH"
    if high < previous_high:
        return "LH"
    return "EH"


def _low_relation(low: float, previous_low: float) -> str:
    if low > previous_low:
        return "HL"
    if low < previous_low:
        return "LL"
    return "EL"


def _null_predecessor(status: str) -> dict[str, str | None]:
    return {
        "high_relation": None,
        "low_relation": None,
        "pattern_code": None,
        "pattern_name": None,
        "status": status,
    }


def _predecessor(
    previous: CandleInput | None, current: CandleInput
) -> dict[str, str | None]:
    if previous is None:
        return _null_predecessor("NO_PREDECESSOR")

    required = (("high", previous), ("low", previous), ("high", current), ("low", current))
    for field, candle in required:
        if field in candle.missing_numeric_fields:
            return _null_predecessor("MISSING_PRICE")
    for field, candle in required:
        if field in candle.invalid_numeric_fields:
            return _null_predecessor("INVALID_PRICE")

    prices = (previous.high, previous.low, current.high, current.low)
    if any(price is None or price <= 0 for price in prices):
        return _null_predecessor("INVALID_PRICE")
    if not previous.valid_ohlc or not current.valid_ohlc:
        return _null_predecessor("INVALID_OHLC")

    assert previous.high is not None and previous.low is not None
    assert current.high is not None and current.low is not None
    high_relation = _relation(current.high, previous.high)
    low_relation = _low_relation(current.low, previous.low)
    code = f"{high_relation}-{low_relation}"
    return {
        "high_relation": high_relation,
        "low_relation": low_relation,
        "pattern_code": code,
        "pattern_name": PATTERN_NAMES[code],
        "status": "OK",
    }


def _finite(value: float | None) -> float | None:
    if value is None or not math.isfinite(value):
        return None
    return value


def _classify_shape(
    open_: float, high: float, low: float, close: float, range_: float, body: float,
    upper_wick: float, lower_wick: float,
) -> tuple[str, str, float | None, float | None, float | None]:
    direction = "bullish" if close > open_ else "bearish" if close < open_ else "neutral"
    if range_ == 0:
        return direction, "flat_neutral_candle", None, None, None

    body_ratio = body / range_
    upper_ratio = upper_wick / range_
    lower_ratio = lower_wick / range_
    if direction == "neutral":
        return direction, "doji_neutral_candle", body_ratio, upper_ratio, lower_ratio

    if direction == "bullish":
        rejection_ratio, opposite_ratio = lower_ratio, upper_ratio
        hammer_ratio, opposite_hammer_ratio = lower_ratio, upper_ratio
        inverted_ratio, opposite_inverted_ratio = upper_ratio, lower_ratio
        hammer_wick, inverted_wick = lower_wick, upper_wick
        rejection_name = "lower_rejection"
    else:
        rejection_ratio, opposite_ratio = upper_ratio, lower_ratio
        hammer_ratio, opposite_hammer_ratio = upper_ratio, lower_ratio
        inverted_ratio, opposite_inverted_ratio = lower_ratio, upper_ratio
        hammer_wick, inverted_wick = upper_wick, lower_wick
        rejection_name = "upper_rejection"

    if body_ratio >= 0.90 and upper_ratio <= 0.05 and lower_ratio <= 0.05:
        suffix = "marubozu"
    elif (
        0.60 <= body_ratio < 0.90
        and rejection_ratio >= 0.15
        and opposite_ratio <= 0.10
    ):
        suffix = rejection_name
    elif (
        0.60 <= body_ratio < 0.90
        and upper_ratio <= 0.20
        and lower_ratio <= 0.20
        and not (rejection_ratio >= 0.15 and opposite_ratio <= 0.10)
    ):
        suffix = "momentum"
    elif (
        0 < body_ratio <= 0.35
        and hammer_ratio >= 0.50
        and opposite_hammer_ratio <= 0.10
        and hammer_wick >= 2 * body
    ):
        suffix = "hammer_shape"
    elif (
        0 < body_ratio <= 0.35
        and inverted_ratio >= 0.50
        and opposite_inverted_ratio <= 0.10
        and inverted_wick >= 2 * body
    ):
        suffix = "inverted_hammer_shape"
    elif (
        0 < body_ratio <= 0.30
        and upper_ratio >= 0.20
        and lower_ratio >= 0.20
    ):
        suffix = "spinning_top"
    else:
        suffix = "standard"

    return direction, f"{direction}_{suffix}", body_ratio, upper_ratio, lower_ratio


def _moving_average(values: Sequence[float | None], period: int, exponential: bool) -> list[float | None]:
    result: list[float | None] = [None] * len(values)
    window: deque[float] = deque(maxlen=period)
    ema: float | None = None
    alpha = 2.0 / (period + 1)

    for index, value in enumerate(values):
        if value is None or not math.isfinite(value) or value <= 0:
            window.clear()
            ema = None
            continue
        if exponential and ema is not None:
            ema = alpha * value + (1 - alpha) * ema
            result[index] = _finite(ema)
            continue
        window.append(value)
        if len(window) == period:
            seed = sum(window) / period
            if not math.isfinite(seed):
                if exponential:
                    window.clear()
                continue
            if exponential:
                ema = seed
            result[index] = _finite(seed)
    return result


def _atr(candles: Sequence[CandleInput], period: int = 9) -> list[float | None]:
    result: list[float | None] = [None] * len(candles)
    seed_values: deque[float] = deque(maxlen=period)
    previous_close: float | None = None
    current_atr: float | None = None

    for index, candle in enumerate(candles):
        if not candle.valid_ohlc:
            previous_close = None
            seed_values.clear()
            current_atr = None
            continue

        assert candle.high is not None and candle.low is not None
        assert candle.close is not None
        true_range = candle.high - candle.low
        if previous_close is not None:
            true_range = max(
                true_range,
                abs(candle.high - previous_close),
                abs(candle.low - previous_close),
            )
        previous_close = candle.close

        if not math.isfinite(true_range):
            seed_values.clear()
            current_atr = None
            continue
        if current_atr is None:
            seed_values.append(true_range)
            if len(seed_values) == period:
                current_atr = sum(seed_values) / period
                if math.isfinite(current_atr):
                    result[index] = current_atr
                else:
                    seed_values.clear()
                    current_atr = None
        else:
            current_atr = ((period - 1) * current_atr + true_range) / period
            result[index] = _finite(current_atr)
            if not math.isfinite(current_atr):
                current_atr = None
                seed_values.clear()
    return result


def _rvol(candles: Sequence[CandleInput], index: int, period: int = 9) -> float | None:
    current = candles[index].volume
    if current is None or index < period:
        return None
    baseline = [candle.volume for candle in candles[index - period : index]]
    if any(value is None for value in baseline):
        return None
    average = sum(value for value in baseline if value is not None) / period
    if average == 0 or not math.isfinite(average):
        return None
    return _finite(current / average)


def _slope(values: Sequence[float | None], index: int, period: int = 9) -> float | None:
    if index < period:
        return None
    current = values[index]
    previous = values[index - period]
    if current is None or previous is None or previous == 0:
        return None
    return _finite((current - previous) / previous)


def calculate_study(
    candles: Sequence[CandleInput], period: int = 9
) -> list[dict[str, object]]:
    """Return canonical ordered records for already parsed candles."""
    if not isinstance(period, int) or isinstance(period, bool) or period < 1:
        raise ValueError("period must be an integer greater than or equal to 1")
    ordered = _sort_and_validate_timestamps(candles)
    closes = [
        candle.close
        if candle.close is not None and candle.close > 0 and "close" not in candle.invalid_numeric_fields
        else None
        for candle in ordered
    ]
    ema9 = _moving_average(closes, 9, exponential=True)
    sma20 = _moving_average(closes, 20, exponential=False)
    ema50 = _moving_average(closes, 50, exponential=True)
    ema100 = _moving_average(closes, 100, exponential=True)
    ema200 = _moving_average(closes, 200, exponential=True)
    atr_values = _atr(ordered, period)
    results: list[dict[str, object]] = []

    for index, candle in enumerate(ordered):
        predecessor = _predecessor(ordered[index - 1] if index else None, candle)
        direction = shape = None
        range_ = body = upper_wick = lower_wick = None
        body_percent = upper_percent = lower_percent = None
        open_location = close_location = None
        magnitude = None
        relative_open_percent = relative_range_percent = None
        relative_upper_percent = relative_lower_percent = None
        body_atr = range_atr = upper_wick_atr = lower_wick_atr = None

        if candle.valid_ohlc:
            assert candle.open is not None and candle.high is not None
            assert candle.low is not None and candle.close is not None
            range_ = _finite(candle.high - candle.low)
            body = _finite(abs(candle.close - candle.open))
            upper_wick = _finite(candle.high - max(candle.open, candle.close))
            lower_wick = _finite(min(candle.open, candle.close) - candle.low)
            if range_ is not None and body is not None and upper_wick is not None and lower_wick is not None:
                direction, shape, body_percent, upper_percent, lower_percent = _classify_shape(
                    candle.open,
                    candle.high,
                    candle.low,
                    candle.close,
                    range_,
                    body,
                    upper_wick,
                    lower_wick,
                )
                if range_ > 0:
                    open_location = _finite((candle.open - candle.low) / range_)
                    close_location = _finite((candle.close - candle.low) / range_)
                if candle.open > 0:
                    relative_open_percent = _finite(body / candle.open)
                    relative_range_percent = _finite(range_ / candle.open)
                    relative_upper_percent = _finite(upper_wick / candle.open)
                    relative_lower_percent = _finite(lower_wick / candle.open)

                previous_atr = atr_values[index - 1] if index else None
                if previous_atr is not None and previous_atr > 0:
                    body_atr = _finite(body / previous_atr)
                    range_atr = _finite(range_ / previous_atr)
                    upper_wick_atr = _finite(upper_wick / previous_atr)
                    lower_wick_atr = _finite(lower_wick / previous_atr)
                    if range_atr is not None:
                        if range_atr >= 2.0:
                            magnitude = "monster_move"
                        elif range_atr >= 1.50:
                            magnitude = "exceptionally_large"
                        elif range_atr >= 1.00:
                            magnitude = "large"
                        elif range_atr >= 0.50:
                            magnitude = "normal"
                        else:
                            magnitude = "small"

        record: dict[str, object] = {
            "ticker": candle.ticker,
            "date": candle.date_text,
            "time": candle.time_text,
            "open": candle.open,
            "high": candle.high,
            "low": candle.low,
            "close": candle.close,
            "direction": direction,
            "shape": shape,
            "atr": atr_values[index],
            "range": range_,
            "body": body,
            "upper_wick": upper_wick,
            "lower_wick": lower_wick,
            "body_percent": body_percent,
            "upper_wick_percent": upper_percent,
            "lower_wick_percent": lower_percent,
            "predecessor": predecessor,
            "open_location": open_location,
            "close_location": close_location,
            "magnitude": magnitude,
            "relative_open_percent": relative_open_percent,
            "relative_open_range_percent": relative_range_percent,
            "relative_open_upper_wick_percent": relative_upper_percent,
            "relative_open_lower_wick_percent": relative_lower_percent,
            "body_atr": body_atr,
            "range_atr": range_atr,
            "upper_wick_atr": upper_wick_atr,
            "lower_wick_atr": lower_wick_atr,
            "rvol": _rvol(ordered, index),
            "ema9": ema9[index],
            "sma20": sma20[index],
            "ema50": ema50[index],
            "ema100": ema100[index],
            "ema200": ema200[index],
            "slope9": _slope(ema9, index),
            "slope20": _slope(sma20, index),
            "slope50": _slope(ema50, index),
            "slope200": _slope(ema200, index),
            "volume": candle.volume,
        }
        results.append(record)

    validate_output_records(results)
    return results


def validate_output_records(records: Sequence[dict[str, object]]) -> None:
    """Reject schema/order errors and non-finite numeric values before export."""
    for row_number, record in enumerate(records, start=1):
        if tuple(record) != JSON_FIELDS:
            raise ValueError(f"output row {row_number} does not match the canonical JSON field order")
        predecessor = record["predecessor"]
        if not isinstance(predecessor, dict) or tuple(predecessor) != PREDECESSOR_FIELDS:
            raise ValueError(f"output row {row_number} has an invalid predecessor object")
        status = predecessor["status"]
        if status not in {"NO_PREDECESSOR", "MISSING_PRICE", "INVALID_PRICE", "INVALID_OHLC", "OK"}:
            raise ValueError(f"output row {row_number} has an invalid predecessor status")
        relation_values = tuple(predecessor[field] for field in PREDECESSOR_FIELDS[:4])
        if status == "OK":
            if any(value is None for value in relation_values):
                raise ValueError(f"output row {row_number} has incomplete OK predecessor data")
            code = predecessor["pattern_code"]
            if PATTERN_NAMES.get(str(code)) != predecessor["pattern_name"]:
                raise ValueError(f"output row {row_number} has an unknown predecessor pattern")
        elif any(value is not None for value in relation_values):
            raise ValueError(f"output row {row_number} has predecessor data for non-OK status")

        for key, value in record.items():
            values = value.values() if key == "predecessor" and isinstance(value, dict) else (value,)
            for item in values:
                if isinstance(item, float) and not math.isfinite(item):
                    raise ValueError(f"output row {row_number} contains non-finite {key}")


def _flatten_record(record: dict[str, object]) -> dict[str, object]:
    flattened: dict[str, object] = {}
    for field in JSON_FIELDS:
        value = record[field]
        if field == "predecessor":
            assert isinstance(value, dict)
            for predecessor_field in PREDECESSOR_FIELDS:
                flattened[_CSV_FIELD_MAP[f"predecessor.{predecessor_field}"]] = value[
                    predecessor_field
                ]
        else:
            flattened[_CSV_FIELD_MAP[field]] = value
    if tuple(flattened) != CSV_COLUMNS:
        raise ValueError("flattened CSV fields do not match the canonical column order")
    return flattened


def write_outputs(
    records: Sequence[dict[str, object]], json_path: Path, csv_path: Path
) -> None:
    """Write JSON and CSV using the canonical field order and null conventions."""
    validate_output_records(records)
    json_path = json_path.resolve()
    csv_path = csv_path.resolve()
    if json_path == csv_path:
        raise ValueError("JSON and CSV output paths must be different")

    with json_path.open("w", encoding="utf-8", newline="\n") as destination:
        json.dump(records, destination, indent=2, ensure_ascii=False, allow_nan=False)
        destination.write("\n")
    with csv_path.open("w", encoding="utf-8", newline="") as destination:
        writer = csv.DictWriter(destination, fieldnames=CSV_COLUMNS, extrasaction="raise")
        writer.writeheader()
        for record in records:
            flattened = _flatten_record(record)
            writer.writerow(
                {
                    column: "" if value is None else value
                    for column, value in flattened.items()
                }
            )


def _row_errors(candle: CandleInput) -> list[str]:
    errors = []
    if not candle.valid_ohlc:
        errors.append(
            f"Ticker {candle.ticker} has an invalid candle at "
            f"{candle.timestamp_text} (in the feed). Please check."
        )
    if candle.volume_invalid:
        errors.append(
            f"Ticker {candle.ticker} has invalid volume at "
            f"{candle.timestamp_text} (in the feed). Please check."
        )
    return errors


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Calculate the documented OHLCV candlestick study and export JSON and CSV."
    )
    parser.add_argument("input_csv", type=Path, help="Daily or intraday CSV input")
    parser.add_argument("--ticker", help="Ticker for a flat CSV without a Ticker column")
    parser.add_argument(
        "--period",
        type=int,
        default=9,
        help="ATR initialization/smoothing period (default: 9)",
    )
    parser.add_argument(
        "--json-output",
        type=Path,
        default=Path("candles-study.json"),
        help="JSON output file (default: candles-study.json)",
    )
    parser.add_argument(
        "--csv-output",
        type=Path,
        default=Path("candles-study.csv"),
        help="CSV output file (default: candles-study.csv)",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    candles: list[CandleInput] = []
    try:
        input_path = args.input_csv.resolve()
        json_path = args.json_output.resolve()
        csv_path = args.csv_output.resolve()
        if input_path in {json_path, csv_path}:
            raise ValueError("output paths must not overwrite the input CSV")
        if json_path == csv_path:
            raise ValueError("JSON and CSV output paths must be different")
        candles = load_candles(input_path, args.ticker)
        records = calculate_study(candles, period=args.period)
    except (OSError, UnicodeError, csv.Error, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        if candles:
            invalid_rows = sum(bool(_row_errors(candle)) for candle in candles)
            valid_rows = len(candles) - invalid_rows
            print(
                f"Summary: valid rows: {valid_rows}; invalid rows: {invalid_rows}; "
                "both output files written: no",
                file=sys.stderr,
            )
        else:
            print(
                "Summary: valid rows: unavailable; invalid rows: unavailable; "
                "both output files written: no",
                file=sys.stderr,
            )
        return 2

    invalid_rows = 0
    for candle in candles:
        errors = _row_errors(candle)
        if errors:
            invalid_rows += 1
            for error in errors:
                print(error, file=sys.stderr)
    valid_rows = len(candles) - invalid_rows
    try:
        write_outputs(records, json_path, csv_path)
    except (OSError, UnicodeError, csv.Error, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        print(
            f"Summary: valid rows: {valid_rows}; invalid rows: {invalid_rows}; "
            "both output files written: no",
            file=sys.stderr,
        )
        return 2
    print(
        f"Summary: valid rows: {valid_rows}; invalid rows: {invalid_rows}; "
        "both output files written: yes",
        file=sys.stderr,
    )
    return 1 if invalid_rows else 0


if __name__ == "__main__":
    raise SystemExit(main())
