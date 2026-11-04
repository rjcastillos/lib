# Candle Data Fields — TL;DR

Quick reference for the candle-study JSON fields and their flattened CSV equivalents. The full ordering and serialization requirements are defined in the [output contract](./output-contract/README.md).

Percent-based fields and slopes are decimal fractions: `0.04` represents `4%`. Ratio fields such as locations, ATR-normalized values, and RVOL are also stored as ratios, not multiplied by 100. Unavailable values are `null` in JSON and empty in CSV.

## Input and identity

| JSON field | CSV column | One-line definition |
|---|---|---|
| `ticker` | `Ticker` | Symbol identifying the instrument for this candle. |
| `date` | `Date` | Local calendar date of the candle, formatted `YYYY-MM-DD`. |
| `time` | `Time` | Candle start time, including the input UTC offset when present; `null` for daily data. |
| `open` | `Open` | Original opening price for the candle. |
| `high` | `High` | Original highest price reached during the candle. |
| `low` | `Low` | Original lowest price reached during the candle. |
| `close` | `Close` | Original closing price for the candle. |
| `volume` | `Volume` | Original traded volume; unavailable when not supplied or invalid. |

## Direction, shape, and candle geometry

| JSON field | CSV column | One-line definition |
|---|---|---|
| `direction` | `Direction` | `bullish`, `bearish`, or `neutral` according to close versus open. |
| `shape` | `Shape` | Candle geometry classification based on validated OHLC values. |
| `range` | `Range` | Candle price range, `high - low`. |
| `body` | `Body` | Absolute distance between close and open. |
| `upper_wick` | `UpperWick` | Distance from the higher of open/close to high. |
| `lower_wick` | `LowerWick` | Distance from low to the lower of open/close. |
| `body_percent` | `BodyPercent` | Body divided by candle range, stored as a fraction. |
| `upper_wick_percent` | `UpperWickPercent` | Upper wick divided by candle range, stored as a fraction. |
| `lower_wick_percent` | `LowerWickPercent` | Lower wick divided by candle range, stored as a fraction. |

## ATR, predecessor, and location

| JSON field | CSV column | One-line definition |
|---|---|---|
| `atr` | `Atr` | Configured-period Wilder ATR aligned with this candle. |
| `predecessor` | — | Nested comparison of this candle’s high/low against the immediately preceding candle. |
| `predecessor.high_relation` | `PredecessorHighRelation` | Current high versus previous high: `HH`, `LH`, or `EH`. |
| `predecessor.low_relation` | `PredecessorLowRelation` | Current low versus previous low: `HL`, `LL`, or `EL`. |
| `predecessor.pattern_code` | `PredecessorPatternCode` | Combined high/low relationship code, such as `HH-HL`. |
| `predecessor.pattern_name` | `PredecessorPatternName` | Descriptive geometry name mapped from the predecessor pattern code. |
| `predecessor.status` | `PredecessorStatus` | Comparison state: `NO_PREDECESSOR`, `MISSING_PRICE`, `INVALID_PRICE`, `INVALID_OHLC`, or `OK`. |
| `open_location` | `OpenLocation` | Open’s position within the candle range, `(open - low) / range`. |
| `close_location` | `CloseLocation` | Close’s position within the candle range, `(close - low) / range`. |
| `magnitude` | `Magnitude` | Category derived from `range_atr` using the thresholds below; `null` when `range_atr` is unavailable. |

Magnitude values:

| `range_atr` condition | `magnitude` value |
|---|---|
| `range_atr >= 2.0` | `monster_move` |
| `1.5 <= range_atr < 2.0` | `exceptionally_large` |
| `1.0 <= range_atr < 1.5` | `large` |
| `0.5 <= range_atr < 1.0` | `normal` |
| `range_atr < 0.5` | `small` |
| `range_atr` is null, undefined, or non-finite | `null` |



## Price-relative and volatility-normalized movement

| JSON field | CSV column | One-line definition |
|---|---|---|
| `relative_open_percent` | `RelativeOpenPercent` | Body divided by open, stored as a percentage fraction. |
| `relative_open_range_percent` | `RelativeOpenRangePercent` | Range divided by open, stored as a percentage fraction. |
| `relative_open_upper_wick_percent` | `RelativeOpenUpperWickPercent` | Upper wick divided by open, stored as a percentage fraction. |
| `relative_open_lower_wick_percent` | `RelativeOpenLowerWickPercent` | Lower wick divided by open, stored as a percentage fraction. |
| `body_atr` | `BodyAtr` | Body divided by the previous candle’s ATR. |
| `range_atr` | `RangeAtr` | Range divided by the previous candle’s ATR. |
| `upper_wick_atr` | `UpperWickAtr` | Upper wick divided by the previous candle’s ATR. |
| `lower_wick_atr` | `LowerWickAtr` | Lower wick divided by the previous candle’s ATR. |

## Volume and moving averages

| JSON field | CSV column | One-line definition |
|---|---|---|
| `rvol` | `Rvol` | Current volume divided by the mean of the immediately previous nine bars; unavailable if any required volume is missing or invalid. |
| `ema9` | `Ema9` | Nine-period exponential moving average of close. |
| `sma20` | `Sma20` | Twenty-period simple moving average of close. |
| `ema50` | `Ema50` | Fifty-period exponential moving average of close. |
| `ema100` | `Ema100` | One-hundred-period exponential moving average of close. |
| `ema200` | `Ema200` | Two-hundred-period exponential moving average of close. |

## Moving-average slopes

| JSON field | CSV column | One-line definition |
|---|---|---|
| `slope9` | `Slope9` | Fractional change in EMA9 versus its value nine bars earlier. |
| `slope20` | `Slope20` | Fractional change in SMA20 versus its value nine bars earlier. |
| `slope50` | `Slope50` | Fractional change in EMA50 versus its value nine bars earlier. |
| `slope200` | `Slope200` | Fractional change in EMA200 versus its value nine bars earlier. |
