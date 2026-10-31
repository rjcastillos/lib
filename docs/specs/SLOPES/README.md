## 23. SLOPE9

Source moving average: EMA9 Slope lookback: 9 bars

Calculate the percentage change between the current EMA9 value and the EMA9 value nine bars earlier.

```
SLOPE9 = ((EMA9[t] - EMA9[t-9]) / EMA9[t-9]) * 100

```


Rules:

- Use the EMA9 values calculated in section 18.
- Compare the current EMA9 value with the value exactly 9 observations earlier.
- Return `null` until both EMA9 values are available.
- Return `null` if the historical EMA9 denominator is zero or invalid.
- Do not substitute zero for an unavailable slope.

Warm-up and first valid output:

| Bars      | Result                                               |
| --------- | ---------------------------------------------------- |
| 1–17      | `null`                                               |
| 18 onward | Calculate when both values and denominator are valid |

The first valid result is bar 18, assuming uninterrupted data and one-based bar numbering.

## 24. SLOPE20

Source moving average: SMA20 Slope lookback: 9 bars

This is the only slope indicator calculated using SMA rather than EMA.

```

SLOPE20 = ((SMA20[t] - SMA20[t-9]) / SMA20[t-9]) * 100

```

Rules:

- Use the SMA20 values calculated in section 22.
- Compare the current SMA20 value with the value exactly 9 observations earlier.
- Return `null` until both SMA20 values are available.
- Return `null` if the historical SMA20 denominator is zero or invalid.
- Do not substitute zero for an unavailable slope.

Warm-up and first valid output:

| Bars      | Result                                               |
| --------- | ---------------------------------------------------- |
| 1–28      | `null`                                               |
| 29 onward | Calculate when both values and denominator are valid |

The first valid result is bar 29, assuming uninterrupted data and one-based bar numbering.

## 25. SLOPE50

Source moving average: EMA50 Slope lookback: 9 bars

```

SLOPE50 = ((EMA50[t] - EMA50[t-9]) / EMA50[t-9]) * 100

```

Rules:

- Use the EMA50 values calculated in section 19.
- Compare the current EMA50 value with the value exactly 9 observations earlier.
- Return `null` until both EMA50 values are available.
- Return `null` if the historical EMA50 denominator is zero or invalid.
- Do not substitute zero for an unavailable slope.

Warm-up and first valid output:

| Bars      | Result                                               |
| --------- | ---------------------------------------------------- |
| 1–58      | `null`                                               |
| 59 onward | Calculate when both values and denominator are valid |

The first valid result is bar 59, assuming uninterrupted data and one-based bar numbering.

## 26. SLOPE200

Source moving average: EMA200 Slope lookback: 9 bars

```
SLOPE200 = ((EMA200[t] - EMA200[t-9]) / EMA200[t-9]) * 100
```

Rules:

- Use the EMA200 values calculated in section 21.
- Compare the current EMA200 value with the value exactly 9 observations earlier.
- Return `null` until both EMA200 values are available.
- Return `null` if the historical EMA200 denominator is zero or invalid.
- Do not substitute zero for an unavailable slope.

Warm-up and first valid output:

| Bars       | Result                                               |
| ---------- | ---------------------------------------------------- |
| 1–208      | `null`                                               |
| 209 onward | Calculate when both values and denominator are valid |

The first valid result is bar 209, assuming uninterrupted data and one-based bar numbering.

## 27. Slope calculation rules and interpretation

### 27.1 General calculation and validity rules

All four slope indicators use the same calculation principle:

1. Calculate the relevant moving average according to its own specification.
2. Compare its current value with its value exactly 9 observations earlier.
3. Calculate the percentage change using the historical value as the denominator.
4. Return `null` until both required moving-average values are available.
5. Return `null` if the historical denominator is zero or invalid.

The first valid slope bar is therefore determined by:

```

FirstValidBar = MovingAveragePeriod + 9 

```


This assumes:

- One-based bar numbering.
- Continuous, uninterrupted input data.
- The moving average first becomes valid at its own period number.
- No missing or invalid observations interrupt the calculation.

First valid output summary:

| Indicator | Moving average | MA first valid bar | Slope lag | First valid slope bar |
| --------- | -------------- | ------------------ | --------- | --------------------- |
| SLOPE9    | EMA9           | 9                  | 9         | 18                    |
| SLOPE20   | SMA20          | 20                 | 9         | 29                    |
| SLOPE50   | EMA50          | 50                 | 9         | 59                    |
| SLOPE200  | EMA200         | 200                | 9         | 209                   |

If missing or invalid data interrupts the moving-average calculation, the slope must remain `null` until both the current and historical moving-average values are valid again.

### 27.2 Slope interpretation

The following thresholds provide a descriptive interpretation of the calculated slope. They do not alter the underlying calculation.

| Slope percentage                               | Interpretation      |
| ---------------------------------------------- | ------------------- |
| Greater than +4%                               | `strong_bull_trend` |
| Greater than +2% and up to +4%                 | `bull_trend`        |
| Greater than or equal to -2% and up to +2%     | `sideways`          |
| Greater than or equal to -4% and less than -2% | `bear_trend`        |
| Less than -4%                                  | `strong_bear_trend` |

Boundary values are assigned to only one category:

- Exactly `+4%` is `bull_trend`.
- Exactly `+2%` is `bull_trend`.
- Exactly `-2%` is `sideways`.
- Exactly `-4%` is `bear_trend`.

The interpretation should only be assigned when the corresponding slope value is not `null`.

Important implementation note: The slope lookback is always 9 observations. It is not the moving-average period. For example, SLOPE200 compares EMA200 at the current bar with EMA200 nine bars earlier; it does not compare it with EMA200 two hundred bars earlier.