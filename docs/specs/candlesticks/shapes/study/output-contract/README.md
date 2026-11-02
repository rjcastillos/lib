# Output requirements — JSON and CSV contract

## 1. General contract

The pipeline shall generate two output formats:

1. A JSON file containing the input candle data and all calculated fields.
2. A CSV file containing the same input candle data and calculated fields, represented as a flat table.

Both formats must contain the same information, use the same field meanings, and follow the same canonical field order.

The naming conventions are:

- **JSON:** all field names use `snake_case`.
- **CSV:** all column names use `PascalCase`.
- Field names must be translated consistently between formats. Their meanings and values must not change.
- CSV uses the exact PascalCase names in the canonical column table. Acronyms follow those spellings (for example, `Atr`, `Rvol`, `Ema`, and `Sma`), not all-uppercase variants.
- Percent-based measurements, including all `*_percent` fields and the slope fields, contain decimal fractions. For example, `0.04` represents `4%`; do not multiply by 100 for storage or export.

The JSON structure defines the canonical field order. The CSV column order must follow that same sequence.

Before calculations and export, sort records in ascending chronological order. JSON array order and CSV row order must both follow this sorted order.
For intraday records, sort by the instant represented by the parsed timestamp, including its UTC offset. For daily records, sort by date. Sorting must not change the timestamp timezone or offset serialized in either output.

Each calculation is performed for one ticker and one timeframe per processing run. The output must not combine different tickers or timeframes into the same calculation series.

Do not round calculations or numeric values for export. Serialize finite numbers with enough precision to recover the same numeric value when parsed again. Use a period as the decimal separator in CSV and do not add thousands separators.

## 2. JSON output contract

### 2.1 Structure

The JSON file shall contain an array of candle objects.

Each object represents one input candle and contains:

- Original identifying information: ticker, date and, when available, time.
- Original OHLCV input values.
- Calculated candle direction and shape.
- Calculated candle geometry.
- Predecessor relationship information.
- Price-location and relative-price measurements.
- Volatility and magnitude measurements.
- Relative volume.
- Moving averages.
- Moving-average slopes.

The JSON field names must use `snake_case`, including the fields originating from the input data.

The `predecessor` information is the only nested object defined by this contract.

### 2.2 Canonical JSON field order

The fields must appear in the following order:

| Order | JSON field                    | Type           | Description                                    |
| ----- | ----------------------------- | -------------- | ---------------------------------------------- |
| 1     | `ticker`                      | string         | Instrument ticker                              |
| 2     | `date`                        | string         | Candle date, ISO 8601 format (`YYYY-MM-DD`)    |
| 3     | `time`                        | string or null | Candle start time when available               |
| 4     | `open`                        | number         | Opening price                                  |
| 5     | `high`                        | number         | Highest price                                  |
| 6     | `low`                         | number         | Lowest price                                   |
| 7     | `close`                       | number         | Closing price                                  |
| 8     | `direction`                   | string or null | `bullish`, `bearish` or `neutral`              |
| 9     | `shape`                       | string or null | Candle shape classification                    |
| 10    | `range`                       | number or null | High minus low                                 |
| 11    | `body`                        | number or null | Absolute difference between close and open     |
| 12    | `upper_wick`                  | number or null | Upper wick size                                |
| 13    | `lower_wick`                  | number or null | Lower wick size                                |
| 14    | `body_percent`                | number or null | Body divided by range                          |
| 15    | `upper_wick_percent`          | number or null | Upper wick divided by range                    |
| 16    | `lower_wick_percent`          | number or null | Lower wick divided by range                    |
| 17    | `predecessor`                 | object         | Predecessor relationship information           |
| 18    | `open_location`               | number or null | Opening price location within the candle range |
| 19    | `close_location`              | number or null | Closing price location within the candle range |
| 20    | `magnitude`                   | string or null | Movement magnitude classification              |
| 21    | `relative_open_percent`       | number or null | Body relative to the opening price             |
| 22    | `relative_open_range_percent` | number or null | Candle range relative to the opening price     |
| 23    | `relative_open_upper_wick_percent` | number or null | Upper wick divided by opening price            |
| 24    | `relative_open_lower_wick_percent` | number or null | Lower wick divided by opening price            |
| 25    | `body_atr`                    | number or null | Body normalized by previous-period ATR         |
| 26    | `range_atr`                   | number or null | Range normalized by previous-period ATR        |
| 27    | `upper_wick_atr`              | number or null | Upper wick normalized by previous-period ATR   |
| 28    | `lower_wick_atr`              | number or null | Lower wick normalized by previous-period ATR   |
| 29    | `rvol`                        | number or null | Relative volume                                |
| 30    | `ema9`                        | number or null | EMA with period 9                              |
| 31    | `sma20`                       | number or null | SMA with period 20                             |
| 32    | `ema50`                       | number or null | EMA with period 50                             |
| 33    | `ema100`                      | number or null | EMA with period 100                            |
| 34    | `ema200`                      | number or null | EMA with period 200                            |
| 35    | `slope9`                      | number or null | EMA9 fractional slope over 9 observations      |
| 36    | `slope20`                     | number or null | SMA20 fractional slope over 9 observations     |
| 37    | `slope50`                     | number or null | EMA50 fractional slope over 9 observations     |
| 38    | `slope200`                    | number or null | EMA200 fractional slope over 9 observations    |
| 39    | `volume`                      | number or null | Original candle volume                         |

The relative-wick fields are calculated as `upper_wick / open` and `lower_wick / open`, respectively. They are unavailable when the opening price is invalid or zero.

The field order above is mandatory. Do not reorder fields alphabetically or according to calculation execution order.

### 2.3 Predecessor object

The JSON `predecessor` object shall contain the following fields in this order:

| Order | JSON field      | Type           | Description                                       |
| ----- | --------------- | -------------- | ------------------------------------------------- |
| 1     | `high_relation` | string or null | `HH`, `LH` or `EH`                                |
| 2     | `low_relation`  | string or null | `HL`, `LL` or `EL`                                |
| 3     | `pattern_code`  | string or null | Combination of high and low relations             |
| 4     | `pattern_name`  | string or null | Descriptive geometric name associated with the pattern code |
| 5     | `status`        | string         | `NO_PREDECESSOR`, `MISSING_PRICE`, `INVALID_PRICE`, `INVALID_OHLC`, or `OK` |

Example:

```
"predecessor": {
  "high_relation": "HH",
  "low_relation": "LL",
  "pattern_code": "HH-LL",
  "pattern_name": "outside_bar",
  "status": "OK"
}
```

The study specification defines the approved `pattern_name` mapping keyed by `pattern_code`. When the status is `OK`, all four relationship fields must be non-null. For `NO_PREDECESSOR`, `MISSING_PRICE`, `INVALID_PRICE`, or `INVALID_OHLC`, all four relationship fields must be `null`. The status field is always present and must never be `null`.

The predecessor object must remain present in every JSON record; none of its five fields may be omitted. Compare each candle with the immediately preceding row in chronological order. If that row is invalid or lacks the required high/low values, leave the relationship unavailable; do not skip it to compare with an older candle.

## 3. CSV output contract

### 3.1 Structure

The CSV file shall contain one row per input candle.

The CSV must contain:

- The same input and calculated information as the JSON output.
- The same logical field order as the JSON output.
- Flat columns only.
- No nested objects or JSON fragments inside CSV cells.

The CSV field names must use `PascalCase`.

Nested JSON fields must be flattened using the parent object name as a prefix.

For example:

| JSON field                  | CSV column                |
| --------------------------- | ------------------------- |
| `predecessor.high_relation` | `PredecessorHighRelation` |
| `predecessor.low_relation`  | `PredecessorLowRelation`  |
| `predecessor.pattern_code`  | `PredecessorPatternCode`  |
| `predecessor.pattern_name`  | `PredecessorPatternName`  |
| `predecessor.status`        | `PredecessorStatus`       |

### 3.2 Canonical CSV column order

The CSV columns must follow the same sequence as the JSON fields, including the five flattened predecessor fields.

| Order | CSV column                 |
| ----- | -------------------------- |
| 1     | `Ticker`                   |
| 2     | `Date`                     |
| 3     | `Time`                     |
| 4     | `Open`                     |
| 5     | `High`                     |
| 6     | `Low`                      |
| 7     | `Close`                    |
| 8     | `Direction`                |
| 9     | `Shape`                    |
| 10    | `Range`                    |
| 11    | `Body`                     |
| 12    | `UpperWick`                |
| 13    | `LowerWick`                |
| 14    | `BodyPercent`              |
| 15    | `UpperWickPercent`         |
| 16    | `LowerWickPercent`         |
| 17    | `PredecessorHighRelation`  |
| 18    | `PredecessorLowRelation`   |
| 19    | `PredecessorPatternCode`   |
| 20    | `PredecessorPatternName`   |
| 21    | `PredecessorStatus`        |
| 22    | `OpenLocation`             |
| 23    | `CloseLocation`            |
| 24    | `Magnitude`                |
| 25    | `RelativeOpenPercent`      |
| 26    | `RelativeOpenRangePercent` |
| 27    | `RelativeOpenUpperWickPercent` |
| 28    | `RelativeOpenLowerWickPercent` |
| 29    | `BodyAtr`                  |
| 30    | `RangeAtr` |
| 31    | `UpperWickAtr` |
| 32    | `LowerWickAtr` |
| 33    | `Rvol` |
| 34    | `Ema9` |
| 35    | `Sma20` |
| 36    | `Ema50` |
| 37    | `Ema100` |
| 38    | `Ema200` |
| 39    | `Slope9` |
| 40    | `Slope20` |
| 41    | `Slope50` |
| 42    | `Slope200` |
| 43    | `Volume` |

The CSV column order is mandatory and must not depend on dictionary iteration order or the order in which calculations are executed.

### 3.3 Daily and intraday data

The input may contain daily or intraday candles.

- For daily data, `Date` is required and `Time` is unavailable.
- For intraday data, both `Date` and `Time` are required.
- The CSV must retain the `Time` column in both cases.
- For daily records, the `Time` cell must be empty.
- The JSON `time` field must be `null` when the input does not contain a time.

The timestamp represents the start of the candle interval. Preserve its input timezone and UTC offset; do not convert it to another timezone. When splitting a timestamp, `Date` contains its local date component and `Time` contains its local time and any input offset or `Z` designator.

## 4. Null, missing and unavailable values

The same logical value must be represented consistently in both output formats.

| Situation                  | JSON representation | CSV representation |
| -------------------------- | ------------------- | ------------------ |
| Valid numeric value        | JSON number         | Numeric cell       |
| Valid text value           | JSON string         | Text cell          |
| Missing, non-numeric or non-finite numeric input/result | `null` | Empty field |
| Unavailable text result    | `null`              | Empty field        |
| Missing time in daily data | `null`              | Empty field        |
| Empty text value           | `""`                | Empty field        |

The following rules are mandatory:

1. Do not serialize Python `NaN` as the literal JSON token `NaN`.
2. Do not serialize positive or negative infinity as JSON numbers.
3. Convert unavailable numeric results to JSON `null` at the serialization boundary.
4. Represent unavailable CSV values and empty text values as empty fields, not as the literal strings `NULL`, `NaN` or `None`. These two cases are intentionally indistinguishable in CSV.
5. Do not replace unavailable indicator values with zero unless the relevant indicator specification explicitly requires zero.
6. A genuine numeric zero must remain zero. It must not be confused with an unavailable value.
7. When a raw numeric input is missing, non-numeric, NaN, or infinite, represent that field as JSON `null` and an empty CSV cell. Do not retain non-numeric text or non-finite tokens in a field defined as numeric.
8. A finite numeric source value that violates a candle-level structural rule (for example, `high < low`) remains in the output as supplied. Mark derived candle fields unavailable and report the invalid candle. This preserves usable source values for inspection without serializing an invalid token as a number.

The calculation layer may continue to use Python/pandas `NaN` internally where appropriate. Conversion to the required output representation must take place when serializing the results.

## 5. Input data preservation

The pipeline must retain the original candle information in the output.

The input values are mapped to output fields as follows. Output names follow this contract even when input column names use different casing.

| Input information                     | JSON field | CSV column |
| ------------------------------------- | ---------- | ---------- |
| Ticker                                | `ticker`   | `Ticker`   |
| Date / Datetime date component        | `date`     | `Date`     |
| Datetime time component, when present | `time`     | `Time`     |
| Open                                  | `open`     | `Open`     |
| High                                  | `high`     | `High`     |
| Low                                   | `low`      | `Low`      |
| Close                                 | `close`    | `Close`    |
| Volume                                | `volume`   | `Volume`   |

The output field names must follow the conventions specified in this document, regardless of the casing used by the original input file.

The input values themselves must not be modified merely to satisfy the naming convention.

## 6. Consistency between JSON and CSV

The JSON and CSV files must represent the same calculated dataset.

The following requirements apply:

1. Every JSON candle object must correspond to exactly one CSV data row.
2. Both formats must contain the same number of candle records.
3. Both formats must preserve the same ascending chronological order.
4. Every JSON field must have a corresponding CSV column.
5. Every nested JSON field must have a corresponding flattened CSV column.
6. Field names may differ only according to the specified naming conventions and flattening rules.
7. The meaning, units, calculation and underlying value of a field must be identical in both formats.
8. Null and unavailable values must follow the representation rules in section 4.
9. The pipeline must not introduce additional output fields without updating this contract.
10. The pipeline must not silently omit fields because their values are unavailable during warm-up.

## 7. Output validation

Before writing the files, the pipeline must validate the output structure.

At minimum, validate that:

- All required fields are present.
- JSON field names follow `snake_case`.
- CSV column names follow `PascalCase`.
- JSON fields and CSV columns follow the specified order.
- Records are sorted in ascending chronological order before calculations and export.
- The predecessor object contains exactly the five defined fields and a valid status.
- Predecessor status is one of `NO_PREDECESSOR`, `MISSING_PRICE`, `INVALID_PRICE`, `INVALID_OHLC`, or `OK`.
- `OK` has four populated relationship fields; every other status has four `null` relationship fields.
- CSV contains flattened predecessor fields and no nested objects.
- JSON contains valid standard JSON values.
- No Python `NaN`, infinity or non-standard numeric token is present in JSON.
- CSV unavailable values are empty fields.
- JSON and CSV contain the same number of candle records.
- The record order is identical in both files.

For an invalid candle, retain the input record and its original input values in both outputs. Report the candle-specific error using the format defined in the study specification and continue with the next candle. Do not assign direction, shape, candle geometry, or predecessor classifications to invalid data. Its invalidity also makes it unavailable as the predecessor for the next row; do not skip it. Other indicators follow their own input-validity and warm-up rules.

Volume is optional. If it is absent, serialize it as unavailable without a validation error; RVOL is unavailable whenever the current volume or a required baseline volume is absent. If Volume is supplied but is negative, non-numeric, NaN, or infinite, report the volume-specific error defined in the study specification, serialize `volume` as JSON `null` and an empty CSV cell, and make affected RVOL values unavailable. This does not invalidate otherwise valid OHLC-based candle or predecessor calculations. Count the row once as invalid for the CLI summary and exit status, even if it has multiple validation errors.