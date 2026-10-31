The output contract should define one canonical set of fields and one canonical field order, with the same meanings and values in both formats. The only differences should be naming convention and representation:

- JSON: `snake_case` for all field names.
- CSV: `PascalCase` for all column names.
- JSON order: the order shown in the JSON example becomes the canonical order.
- CSV order: follows the same sequence, translating each JSON field name to PascalCase and flattening nested objects.

One important change from the current README: the instruction to preserve the original input casing should be replaced. Otherwise, it conflicts with the requested naming conventions. The values from the input must be preserved, but the exported field names should follow the conventions below.

## Proposed replacement: Output requirements

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

The JSON structure defines the canonical field order. The CSV column order must follow that same sequence.

The output must contain one record per input candle, preserving the original chronological order.

Each calculation is performed for one ticker and one timeframe per processing run. The output must not combine different tickers or timeframes into the same calculation series.

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
| 35    | `slope9`                      | number or null | EMA9 percentage slope over 9 observations      |
| 36    | `slope20`                     | number or null | SMA20 percentage slope over 9 observations     |
| 37    | `slope50`                     | number or null | EMA50 percentage slope over 9 observations     |
| 38    | `slope200`                    | number or null | EMA200 percentage slope over 9 observations    |
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
| 4     | `pattern_name`  | string or null | Descriptive name associated with the pattern code |

Example:

```
"predecessor": {
  "high_relation": "HH",
  "low_relation": "LL",
  "pattern_code": "HH-LL",
  "pattern_name": "outside_bar"
}
```

When there is no predecessor, or the required predecessor comparison cannot be performed, all four fields must be `null`.

The predecessor object must remain present in the JSON record; its fields must not be omitted.

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

### 3.2 Canonical CSV column order

The CSV columns must follow the same sequence as the JSON fields, including the four flattened predecessor fields.

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
| 21    | `OpenLocation`             |
| 22    | `CloseLocation`            |
| 23    | `Magnitude`                |
| 24    | `RelativeOpenPercent`      |
| 25    | `RelativeOpenRangePercent` |
| 26    | `RelativeOpenUpperWickPercent` |
| 27    | `RelativeOpenLowerWickPercent` |
| 28    | `BodyAtr`                  |
| 29    | `RangeAtr` |
| 30    | `UpperWickAtr` |
| 31    | `LowerWickAtr` |
| 32    | `Rvol` |
| 33    | `Ema9` |
| 34    | `Sma20` |
| 35    | `Ema50` |
| 36    | `Ema100` |
| 37    | `Ema200` |
| 38    | `Slope9` |
| 39    | `Slope20` |
| 40    | `Slope50` |
| 41    | `Slope200` |
| 42    | `Volume` |

The CSV column order is mandatory and must not depend on dictionary iteration order or the order in which calculations are executed.

### 3.3 Daily and intraday data

The input may contain daily or intraday candles.

- For daily data, `Date` is required and `Time` is unavailable.
- For intraday data, both `Date` and `Time` are required.
- The CSV must retain the `Time` column in both cases.
- For daily records, the `Time` cell must be empty.
- The JSON `time` field must be `null` when the input does not contain a time.

The timestamp represents the start of the candle interval, using the input timezone information where applicable.

## 4. Null, missing and unavailable values

The same logical value must be represented consistently in both output formats.

| Situation                  | JSON representation | CSV representation |
| -------------------------- | ------------------- | ------------------ |
| Valid numeric value        | JSON number         | Numeric cell       |
| Valid text value           | JSON string         | Text cell          |
| Unavailable numeric result | `null`              | Empty field        |
| Unavailable text result    | `null`              | Empty field        |
| Missing time in daily data | `null`              | Empty field        |

The following rules are mandatory:

1. Do not serialize Python `NaN` as the literal JSON token `NaN`.
2. Do not serialize positive or negative infinity as JSON numbers.
3. Convert unavailable numeric results to JSON `null` at the serialization boundary.
4. Represent unavailable CSV values as empty fields, not as the literal strings `NULL`, `NaN` or `None`.
5. Do not replace unavailable indicator values with zero unless the relevant indicator specification explicitly requires zero.
6. A genuine numeric zero must remain zero. It must not be confused with an unavailable value.

The calculation layer may continue to use Python/pandas `NaN` internally where appropriate. Conversion to the required output representation must take place when serializing the results.

## 5. Input data preservation

The pipeline must retain the original candle information in the output.

The input fields are mapped as follows:

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
3. Both formats must preserve the same chronological order.
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
- The predecessor object contains exactly the four defined fields.
- CSV contains flattened predecessor fields and no nested objects.
- JSON contains valid standard JSON values.
- No Python `NaN`, infinity or non-standard numeric token is present in JSON.
- CSV unavailable values are empty fields.
- JSON and CSV contain the same number of candle records.
- The record order is identical in both files.

If a candle is invalid according to the OHLC validation rules, the pipeline must report the candle-specific validation error and continue processing the next candle as specified in the OHLC validation section. Invalid data must not be forced into a valid shape or predecessor classification.

## Important points to resolve before treating this as final

I have kept the contract aligned with the latest README, but there are a few issues worth explicitly resolving:

1. `time` on daily data: I have specified that the field remains present but is `null` in JSON and empty in CSV. This avoids changing the schema between daily and intraday exports.
2. Input casing: The existing instruction to preserve input casing conflicts with the new naming convention. The proposed contract preserves input values, not input field names.
3. `body_percent`: The README defines this as `Body / Range`, while `relative_open_percent` is `Body / Open`. These are separate measurements and should remain separate fields.
4. Invalid candles: The README requires reporting an error and continuing. It does not fully define whether invalid input values should remain in the exported row or whether the row should be excluded. The proposed contract assumes the row is retained and invalid derived values are unavailable; this should be confirmed.
5. Numeric precision: The README does not specify rounding or decimal precision. I recommend retaining full calculation precision internally and applying a single documented serialization precision policy, rather than rounding intermediate calculations.

One correction to the example: its `open=100` and `close=102` imply `bullish` direction, not `bearish`. Also, `BodyATR = 2 / 1.70` is approximately `1.18`, and `RangeATR = 2.10 / 1.70` is approximately `1.24`. Those sample values should be corrected independently of the output contract.