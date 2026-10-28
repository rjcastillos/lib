##  Period, Lookback, Initialization, and Indicator Calculation Rules

### 1. Purpose and scope

This section defines the common terminology and calculation conventions applicable to all technical indicators and derived metrics in the pipeline, including ATR, RVOL, SMA, EMA, slopes, and ratios derived from indicator values.

Each indicator MUST follow the common rules in this section and MUST define any additional calculation-specific behavior required to produce deterministic, reproducible results.

### 2. Definition of period

**Period** is a positive integer specifying the number of observations or the observation lag used by an indicator or calculation, as defined by that indicator's calculation contract.

An observation is typically a candle or bar, or a value derived from a candle, such as its closing price, volume, True Range, or a previously calculated indicator value.

The meaning of a period depends on the indicator:

- For a rolling calculation, the period specifies the number of observations included in the calculation window.
- For a smoothing calculation, the period specifies the parameter controlling the smoothing behavior and, where applicable, initialization.
- For a historical comparison, the period may specify the number of observations separating the current value from a previous value.
- For a normalized or relative metric, the period specifies the historical observations used to establish the comparison baseline.

The indicator-specific definition MUST state which interpretation applies.

For example, `ATR(9)` means ATR with a period of 9. It does not, by itself, imply that every indicator using period 9 follows the same calculation method.

### 3. General period rules

1. **Type:** A period MUST be an integer greater than or equal to 1. Booleans, fractional numbers, zero, negative numbers, and non-numeric values MUST be rejected.
2. **Units:** Periods are measured in observations, not elapsed clock time. For example, a period of 9 on hourly bars refers to nine bars, not necessarily nine consecutive hours of elapsed time.
3. **Ordering:** Observations MUST be processed in chronological ascending order. Duplicate or out-of-order timestamps MUST be rejected unless an explicit upstream normalization rule applies.
4. **Scope:** A calculation MUST operate on a single instrument and timeframe per series.
5. **Current observation:** Each indicator MUST explicitly state whether its current observation is included in its calculation window. This MUST NOT be inferred solely from the period value.
6. **Historical observations:** An indicator MUST specify whether its period refers to the total window size, the number of preceding observations, or the lag between two observations.
7. **Defaults:** Each indicator MUST define its default period, if one is supported. The pipeline MUST NOT rely on undocumented library defaults.
8. **Configuration:** A configured period MUST be validated before calculation. An implementation MUST use the same period for all outputs belonging to the same indicator instance.
9. **Consistency:** The period MUST be applied consistently across all records in the same calculation run unless the specification explicitly permits per-record variation.

### 4. Lookback window and warm-up

**Lookback window** is the set of historical observations required by an indicator to calculate its value for a given candle.

**Warm-up period** is the initial portion of a series during which the indicator cannot yet produce a valid result because sufficient eligible observations or initialization data are unavailable.

**First valid value** is the earliest value in a series for which all inputs and initialization requirements defined by the indicator are satisfied.

Each indicator MUST specify:

- The observations required to calculate a value.
- Whether the current candle is included in the window.
- The initialization or seed method, if applicable.
- The conditions under which the first valid value is produced.
- How missing or invalid observations affect initialization and subsequent calculations.

A period of `N` MUST NOT automatically be interpreted as requiring exactly `N` rows before the first valid result. The number of required rows depends on the indicator's calculation method.

For example, a slope comparing a value at index `t` with the value at index `t-N` requires both values and therefore a lag of `N` observations. If the underlying values are themselves an indicator with a warm-up period, the slope's first valid value occurs later.

### 5. Missing and invalid observations

The pipeline MUST distinguish between:

- **Warm-up unavailable:** Insufficient eligible history exists to calculate the indicator.
- **Missing input:** A required input value is absent or null.
- **Invalid input:** A required input violates the applicable validation rules or is non-finite.
- **Undefined result:** The inputs exist, but the mathematical operation is undefined, such as division by zero.
- **Valid result:** All required inputs and calculation conditions are satisfied.

Unless an indicator explicitly defines a different rule, unavailable, invalid, or undefined results MUST be represented as null in the logical output.

Each indicator MUST specify whether missing or invalid inputs cause its calculation state to reset, skip an observation, or propagate the unavailable result. Implementations MUST NOT silently substitute zero, reuse stale values, or silently shorten a required window.

For indicators whose initialization requires consecutive valid observations, an invalid observation MUST interrupt the sequence. Reinitialization MUST follow the indicator-specific recovery rule.

Missing timestamps and gaps in elapsed time do not, by themselves, create additional observations. If a bar is absent from the input series, the pipeline MUST NOT fabricate a bar unless an explicit data-generation rule authorizes it.

### 6. Indicator-specific calculation contracts

The following contracts define the meaning of period for the indicators covered by this specification.

#### 6.1. ATR(N) — Average True Range

- **Period meaning:** Number of eligible True Range (TR) observations used to initialize ATR.
- **Project default:** `ATR(9)`, with period 9.
- **True Range:** MUST be calculated according to the project's separate ATR definition.
- **Initialization:** The first ATR value MUST be the arithmetic mean of `N` consecutive valid TR observations.
- **Subsequent values:** MUST use Wilder's smoothing formula:

  `ATR[t] = (ATR[t-1] * (N-1) + TR[t]) / N`
- **Warm-up:** ATR MUST remain null until `N` consecutive valid TR observations are available.
- **Recovery:** An invalid OHLC candle MUST interrupt the initialization sequence. The previous close MUST be cleared. The first valid candle after the interruption MUST calculate TR as `High - Low`. ATR MUST remain null until a new sequence of `N` consecutive valid TR observations has been collected.
- **Configuration:** The project-level `ATR(9)` calculation MUST use period 9. An implementation MUST NOT silently substitute another default.

#### 6.2. SMA(N) — Simple Moving Average

- **Period meaning:** Number of closing-price observations included in the rolling arithmetic mean.
- **Calculation:** SMA at index `t` MUST be the arithmetic mean of the current closing price and the preceding `N-1` eligible closing prices.
- **Warm-up:** SMA MUST remain null until `N` eligible closing-price observations are available.
- **Missing data:** If a required closing price is missing or invalid, the SMA MUST be null until a complete window of `N` eligible observations is available again.
- **Window alignment:** The current candle is included in the window.

Formula:

`SMA(N)[t] = sum(Close[t-N+1 ... t]) / N`

#### 6.3. EMA(N) — Exponential Moving Average

- **Period meaning:** Parameter controlling the exponential weighting and initialization of the moving average.
- **Smoothing factor:** MUST be calculated as:

  `alpha = 2 / (N + 1)`
- **Initialization:** The first EMA value MUST be seeded using the SMA of the first `N` consecutive eligible closing-price observations.
- **Subsequent values:** MUST be calculated as:

  `EMA[t] = alpha * Close[t] + (1 - alpha) * EMA[t-1]`
- **Warm-up:** EMA MUST remain null until its initial SMA seed can be calculated.
- **Missing data:** A missing or invalid required closing price MUST invalidate the current EMA sequence. The EMA MUST be reinitialized using a new set of `N` consecutive eligible closing-price observations.
- **Reproducibility:** Implementations MUST NOT use a library's alternative EMA initialization convention unless explicitly authorized by this specification.

#### 6.4. RVOL(N) — Relative Volume

- **Period meaning:** Number of preceding eligible volume observations used to establish the historical comparison baseline.
- **Baseline window:** The baseline MUST use the `N` eligible volume observations immediately preceding the current candle. The current candle's volume MUST NOT be included in its own baseline.
- **Calculation:** RVOL MUST be calculated as current volume divided by the baseline volume statistic specified by the project's RVOL definition.
- **Warm-up:** RVOL MUST remain null until `N` eligible preceding volume observations are available.
- **Missing data:** Missing or invalid volume observations MUST NOT be treated as zero. The indicator MUST follow an explicit missing-volume policy; by default, the baseline MUST be unavailable when the required preceding window contains missing or invalid volume.
- **Undefined result:** If the baseline volume is zero, RVOL MUST be null rather than infinity or an arbitrary numeric value.

Unless otherwise specified, the baseline statistic is the arithmetic mean of the preceding `N` eligible volume observations:

`RVOL(N)[t] = Volume[t] / mean(Volume[t-N ... t-1])`

#### 6.5. Slope(N)

- **Period meaning:** Number of observations separating the current underlying value from the historical value used for comparison.
- **Default comparison method:** Unless a separate regression-based slope is explicitly defined, slope MUST be calculated as the difference between the current value and the value `N` observations earlier.
- **Underlying series:** The specification MUST identify the series whose slope is being calculated, such as SMA, EMA, or closing price.
- **Calculation:**

  `Slope(N)[t] = X[t] - X[t-N]`

  where `X` is the specified underlying series.
- **Warm-up:** Slope MUST remain null until both `X[t]` and `X[t-N]` are valid.
- **Missing data:** If either required value is unavailable, slope MUST be null.
- **Normalization:** If the project requires a percentage slope or a slope per observation, that metric MUST be defined separately, including its denominator and zero-denominator behavior.

A regression-based slope MUST be treated as a separately specified calculation, with its period defining the number of observations in the regression window. It MUST NOT be substituted for the comparison-based slope without an explicit specification change.

### 7. Derived metrics

Derived metrics, including candle ratios, ATR-normalized values, moving-average comparisons, and indicator-based features, MUST define their dependencies and calculation rules.

Each derived metric MUST specify:

- Its input indicator or source fields.
- Any period or historical lag it uses.
- Its formula and denominator, if applicable.
- Its first-valid-value requirements.
- Its missing-data and undefined-result behavior.

A derived metric MUST be null whenever a required input is unavailable or invalid, unless an explicit alternative rule is defined.

Division by zero MUST NOT produce infinity, `NaN`, or an arbitrary substitute in the logical output. The result MUST be null.

### 8. Output and serialization

The logical output MUST distinguish valid numeric results from unavailable results.

- **JSON:** Unavailable numeric values MUST be serialized as `null`, never as non-standard `NaN` or `Infinity` values.
- **CSV:** Unavailable numeric values MUST be represented by an empty field.
- **Internal calculations:** An implementation MAY use an internal missing-value representation such as Python `NaN`, provided it is converted according to the output rules before serialization.
- **Rounding:** Calculations MUST retain full available precision internally. Rounding MUST occur only at the explicitly defined output stage and MUST NOT affect subsequent indicator calculations.

### 9. Required tests

Implementations MUST include tests covering, at minimum:

1. Rejection of zero, negative, fractional, boolean, and non-numeric periods.
2. Correct calculation for period 1.
3. Correct window alignment and inclusion or exclusion of the current observation.
4. Correct initialization and first-valid-value index for each indicator.
5. Correct results after the warm-up period.
6. Correct handling of missing and invalid observations.
7. Correct recovery after an invalid observation where recovery is applicable.
8. Correct handling of zero denominators and other undefined results.
9. Consistent output of JSON `null` and empty CSV fields for unavailable values.
10. Agreement between independently implemented calculations using the same period, inputs, and calculation contract.