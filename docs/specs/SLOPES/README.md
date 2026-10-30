## 23. SLOPE9

**Underlying indicator:** EMA9  
**Moving-average period:** 9  
**Slope comparison lag:** 9 bars

Formula:

`SLOPE9[t] = ((EMA9[t] - EMA9[t-9]) / EMA9[t-9]) * 100`

**Warm-up:**
- EMA9 is first valid at bar 9.
- SLOPE9 requires EMA9 at both the current bar and 9 bars earlier.
- SLOPE9 MUST return null for bars 1 through 17.
- **First valid output bar: bar 18.**

Return null whenever either EMA9 value is unavailable or the historical EMA9 denominator is zero.

---

## 24. SLOPE20

**Underlying indicator:** SMA20  
**Moving-average period:** 20  
**Slope comparison lag:** 9 bars

Formula:

`SLOPE20[t] = ((SMA20[t] - SMA20[t-9]) / SMA20[t-9]) * 100`

**Warm-up:**
- SMA20 is first valid at bar 20.
- SLOPE20 requires SMA20 at both the current bar and 9 bars earlier.
- SLOPE20 MUST return null for bars 1 through 28.
- **First valid output bar: bar 29.**

Return null whenever either SMA20 value is unavailable or the historical SMA20 denominator is zero.

Note: SLOPE20 is the only slope in this specification that uses SMA rather than EMA.

---

## 25. SLOPE50

**Underlying indicator:** EMA50  
**Moving-average period:** 50  
**Slope comparison lag:** 9 bars

Formula:

`SLOPE50[t] = ((EMA50[t] - EMA50[t-9]) / EMA50[t-9]) * 100`

**Warm-up:**
- EMA50 is first valid at bar 50.
- SLOPE50 requires EMA50 at both the current bar and 9 bars earlier.
- SLOPE50 MUST return null for bars 1 through 58.
- **First valid output bar: bar 59.**

Return null whenever either EMA50 value is unavailable or the historical EMA50 denominator is zero.

---

## 26. SLOPE200

**Underlying indicator:** EMA200  
**Moving-average period:** 200  
**Slope comparison lag:** 9 bars

Formula:

`SLOPE200[t] = ((EMA200[t] - EMA200[t-9]) / EMA200[t-9]) * 100`

**Warm-up:**
- EMA200 is first valid at bar 200.
- SLOPE200 requires EMA200 at both the current bar and 9 bars earlier.
- SLOPE200 MUST return null for bars 1 through 208.
- **First valid output bar: bar 209.**

Return null whenever either EMA200 value is unavailable or the historical EMA200 denominator is zero.

---

## 27. Common slope calculation rules

The following rules apply to all slope calculations:

1. **Separate parameters:** The moving-average period and slope comparison lag are independent parameters. They MUST NOT be treated as interchangeable.
2. **Comparison lag:** The current project uses a slope comparison lag of 9 bars for all four slopes.
3. **Current observation:** The current moving-average value is included in the calculation.
4. **Historical observation:** The comparison value is taken exactly 9 bars before the current bar.
5. **Warm-up:** A slope MUST remain null until both required moving-average values exist.
6. **First valid output:** Under uninterrupted valid input data, the first valid output bar is the moving-average period plus the comparison lag.
7. **Missing values:** If either required moving-average value is unavailable, the slope MUST be null for that bar.
8. **Zero denominator:** If the historical moving-average value is zero, the slope MUST be null.
9. **No forward filling:** Missing moving-average values MUST NOT be replaced with previous values to produce a slope.
10. **Calculation precision:** Full available precision MUST be retained internally. Rounding is applied only at the output stage.

### 27.1. General formula

For an underlying moving average with period `N` and comparison lag `L`:

`SlopePercent[t] = ((MA[t] - MA[t-L]) / MA[t-L]) * 100`

The first valid output bar, assuming the moving average is initialized using the first `N` valid observations and the input series is uninterrupted, is:

`FirstValidBar = N + L`

For this project, `L = 9`.

### 27.2. First valid output summary

| Slope | Moving average | MA period | Comparison lag | Null through bar | First valid bar |
|---|---|---:|---:|---:|---:|
| SLOPE9 | EMA9 | 9 | 9 | 17 | 18 |
| SLOPE20 | SMA20 | 20 | 9 | 28 | 29 |
| SLOPE50 | EMA50 | 50 | 9 | 58 | 59 |
| SLOPE200 | EMA200 | 200 | 9 | 208 | 209 |

These bar numbers assume the first input observation is bar 1 and there are no missing or invalid observations.

If an input moving average becomes unavailable later in the series, the slope MUST be null whenever either of its two required values is unavailable. The initial warm-up table does not override this rule.