# EMA(9) Slope — Momentum Indicator Specification

## 1. Purpose

The EMA(9) Slope indicator measures the percentage change in the Exponential Moving Average over the previous nine completed bars.

Its primary purpose is to quantify short-term directional momentum and provide a weighting factor for long and short trading decisions.

The indicator must support:

- Bullish and bearish momentum identification.
- Momentum strength classification.
- Deterministic directional scoring.
- Long and short entry evaluation.
- Existing-position management and exit evaluation.
- Momentum weakening and strengthening detection.

EMA(9) Slope is a momentum indicator, not an independent trading signal. It must be evaluated alongside the broader trend, price structure, volatility and risk-management rules.

## 2. Input Requirements

| Input | Description |
|---|---|
| Close[t] | Closing price of the current completed bar |
| EMA9[t] | EMA calculated using a period of 9 |
| EMA9[t-9] | EMA value nine bars before the current bar |
| Period | 9 bars |

All calculations must use chronologically ordered OHLC observations.

Only completed candles may be used for trading decisions. An unfinished candle must not generate an actionable SLOPE9 signal.

## 3. EMA(9) Calculation

EMA(9) is calculated using the following smoothing factor:

```text
alpha = 2 / (9 + 1)
alpha = 0.2
```

EMA calculation:

```text
EMA9[t] = alpha * Close[t] + (1 - alpha) * EMA9[t-1]
```

Initialization:

```text
EMA9[9] = SMA(Close[1], Close[2], ..., Close[9])
```

The first valid EMA9 value is therefore at bar 9, assuming uninterrupted and valid input data.

## 4. SLOPE9 Calculation

### 4.1 Formula

```text
SLOPE9[t] = ((EMA9[t] - EMA9[t-9]) / EMA9[t-9]) * 100
```

### 4.2 Interpretation

The calculation measures the percentage change in EMA9 over nine elapsed bar intervals.

It does not measure the angle of the EMA line or the percentage change of the closing price.

### 4.3 Example

Assume:

```text
EMA9[t]     = 105.00
EMA9[t-9]   = 100.00
```

Calculation:

```text
SLOPE9 = ((105.00 - 100.00) / 100.00) * 100

SLOPE9 = 5.00%
```

Interpretation: Strong bullish momentum.

### 4.4 Validity and Warm-up

SLOPE9 is valid only when both EMA9[t] and EMA9[t-9] are valid and finite, and the denominator is greater than zero.

With an SMA initialization for EMA9:

- First valid EMA9: bar 9.
- First valid EMA9[t-9]: bar 18.
- First valid SLOPE9: bar 18.

All preceding SLOPE9 values must be NULL.

Missing or invalid observations must not be silently treated as zero. The indicator must follow the common missing-data and EMA recovery policy defined by the main indicator specification.

## 5. SLOPE9 Classification

The following thresholds provide a descriptive interpretation of momentum.

They do not modify the underlying SLOPE9 calculation.

| SLOPE9 percentage | Classification | Interpretation |
|---|---|---|
| Greater than +4.00% | `strong_bull_trend` | Very strong positive momentum |
| Greater than +2.00% and up to +4.00% | `bull_trend` | Strong positive momentum |
| Greater than or equal to -2.00% and less than or equal to +2.00% | `sideways` | Weak or neutral momentum |
| Greater than or equal to -4.00% and less than -2.00% | `bear_trend` | Strong negative momentum |
| Less than -4.00% | `strong_bear_trend` | Very strong negative momentum |

### 5.1 Exact Boundary Rules

For deterministic classification:

- SLOPE9 = +4.00%: `bull_trend`
- SLOPE9 > +4.00%: `strong_bull_trend`
- SLOPE9 = +2.00%: `sideways`
- SLOPE9 = -2.00%: `sideways`
- SLOPE9 = -4.00%: `bear_trend`
- SLOPE9 < -4.00%: `strong_bear_trend`

The classification is symmetrical between bullish and bearish momentum.

## 6. Momentum Score

The descriptive classification alone is insufficient for calculating a weighted trading decision.

A continuous normalized score is therefore required.

### 6.1 Recommended Scoring Formula

The score must be consistent with the classification thresholds.

```text
IF ABS(SLOPE9) <= 2.0:
    SLOPE9Score = 0

ELSE IF ABS(SLOPE9) < 4.0:
    SLOPE9Score = SIGN(SLOPE9) * (ABS(SLOPE9) - 2.0) * 50

ELSE:
    SLOPE9Score = SIGN(SLOPE9) * 100
```

The score is bounded between -100 and +100.

Interpretation:

- Positive values indicate bullish momentum.
- Negative values indicate bearish momentum.
- Values equal to zero indicate neutral momentum.
- Values approaching +100 indicate strong bullish momentum.
- Values approaching -100 indicate strong bearish momentum.

### 6.2 Examples

| SLOPE9 | SLOPE9Score |
|---:|---:|
| +5.00% | +100 |
| +4.00% | +100 |
| +3.00% | +50 |
| +2.00% | 0 |
| +1.00% | 0 |
| 0.00% | 0 |
| -1.00% | 0 |
| -2.00% | 0 |
| -3.00% | -50 |
| -4.00% | -100 |
| -5.00% | -100 |

This score is a deterministic transformation of SLOPE9, not a probability of a profitable trade.

## 7. Momentum Acceleration

A positive SLOPE9 indicates upward momentum, but does not necessarily indicate that momentum is increasing.

To identify momentum acceleration, introduce:

```text
SlopeAcceleration[t] = SLOPE9[t] - SLOPE9[t-1]
```

Interpretation:

| Condition | Interpretation |
|---|---|
| Acceleration > 0 | Bullish momentum is increasing or bearish momentum is weakening |
| Acceleration < 0 | Bullish momentum is weakening or bearish momentum is increasing |
| Acceleration = 0 | Momentum is unchanged |

Acceleration must be interpreted together with the direction of SLOPE9.

Examples:

| SLOPE9 | Acceleration | Interpretation |
|---:|---:|---|
| +3.0% | +0.5 | Bullish momentum strengthening |
| +3.0% | -0.5 | Bullish momentum weakening |
| -3.0% | -0.5 | Bearish momentum strengthening |
| -3.0% | +0.5 | Bearish momentum weakening |

Acceleration is a secondary indicator and must not independently trigger an entry or exit.

## 8. Volatility Normalization — Recommended Improvement

The fixed percentage thresholds may not be equally appropriate for different securities or timeframes.

A 3% EMA change over nine daily bars can have a very different significance from a 3% change over nine intraday bars.

Introduce an optional volatility-normalized measurement:

```text
NormalizedSlope[t] = (EMA9[t] - EMA9[t-9]) / ATR(N)[t]
```

Where ATR(N) represents the Average True Range over the configured period.

This measures the EMA displacement over nine bars relative to the instrument's current volatility.

The normalized slope should be used to calibrate or replace fixed percentage thresholds after empirical testing.

The original SLOPE9 percentage must remain available as a separate output.

## 9. Trading Strategy Weight

SLOPE9Score should contribute to the overall strategy score.

Recommended initial weight:

| Indicator | Weight |
|---|---:|
| EMA9 Slope Score | 20% |
| Other strategy components | 80% |
| Total | 100% |

The overall strategy score is calculated as:

```text
StrategyScore =
    0.20 * SLOPE9Score
    + 0.80 * OtherIndicatorsScore
```

All component scores must use the same normalized range of -100 to +100.

### 9.1 Long Position Evaluation

Positive SLOPE9 contributes positively to a long entry decision.

Recommended conditions:

- SLOPE9 > 0.
- SLOPE9 classification is not `bear_trend` or `strong_bear_trend`.
- The broader trend filter supports a long position.
- The overall strategy score satisfies the configured entry threshold.
- Risk-management conditions permit entry.

### 9.2 Short Position Evaluation

Negative SLOPE9 contributes positively to a short entry decision.

Recommended conditions:

- SLOPE9 < 0.
- SLOPE9 classification is not `bull_trend` or `strong_bull_trend`.
- The broader trend filter supports a short position.
- The overall strategy score satisfies the configured entry threshold.
- Risk-management conditions permit entry.

### 9.3 Exit Evaluation

A change in SLOPE9 direction indicates a possible momentum reversal.

However, a zero crossing should initially be treated as an exit warning rather than an automatic exit.

Exit decisions should also consider:

- Opposing strategy score.
- Trend reversal.
- Stop-loss and trailing-stop conditions.
- Position risk and capital protection.

Protective stops must always take precedence over indicator-based exit confirmation.

## 10. Pseudocode

### 10.1 SLOPE9 Calculation

```python
def calculate_slope9(ema9):

    # EMA9 must contain chronologically ordered values.
    # The comparison requires EMA9[t] and EMA9[t-9].

    if len(ema9) < 10:
        return None

    current = ema9[-1]
    previous = ema9[-10]

    if current is None or previous is None:
        return None

    if not is_finite(current) or not is_finite(previous):
        return None

    if previous <= 0:
        return None

    slope9 = ((current - previous) / previous) * 100.0

    return slope9
```

### 10.2 Classification Pseudocode

```python
def classify_slope9(slope9):

    if slope9 is None or not is_finite(slope9):
        return None

    if slope9 > 4.0:
        return "strong_bull_trend"

    elif slope9 > 2.0:
        return "bull_trend"

    elif slope9 >= -2.0:
        return "sideways"

    elif slope9 >= -4.0:
        return "bear_trend"

    else:
        return "strong_bear_trend"
```

### 10.3 Normalized Score Pseudocode

```python
def calculate_slope9_score(slope9):

    if slope9 is None or not is_finite(slope9):
        return None

    magnitude = abs(slope9)

    if magnitude <= 2.0:
        return 0.0

    if magnitude >= 4.0:
        return 100.0 if slope9 > 0 else -100.0

    score = (magnitude - 2.0) * 50.0

    return score if slope9 > 0 else -score
```

### 10.4 Acceleration Pseudocode

```python
def calculate_slope_acceleration(
    current_slope,
    previous_slope
):

    if current_slope is None or previous_slope is None:
        return None

    if not is_finite(current_slope):
        return None

    if not is_finite(previous_slope):
        return None

    return current_slope - previous_slope
```

### 10.5 Entry Evaluation Pseudocode

```python
def evaluate_slope9_entry(
    slope9,
    slope9_score,
    strategy_score,
    min_entry_score
):

    if slope9 is None or slope9_score is None:
        return "NO_SIGNAL"

    if strategy_score is None:
        return "NO_SIGNAL"

    if strategy_score >= min_entry_score and slope9 > 0:
        return "LONG_CANDIDATE"

    if strategy_score <= -min_entry_score and slope9 < 0:
        return "SHORT_CANDIDATE"

    return "NO_SIGNAL"
```

The candidate result must subsequently pass the strategy's independent trend, confirmation and risk-management filters.

## 11. Output Contract

Recommended output fields:

| Field | Type | Description |
|---|---|---|
| `ema9` | float / NULL | Current EMA9 |
| `ema9_previous_9` | float / NULL | EMA9 nine bars earlier |
| `slope9` | float / NULL | Calculated percentage slope |
| `slope9_classification` | string / NULL | Descriptive classification |
| `slope9_score` | float / NULL | Normalized momentum score |
| `slope9_acceleration` | float / NULL | Change in slope since previous bar |
| `normalized_slope9` | float / NULL | Optional ATR-normalized slope |

All calculations must preserve full internal precision. Rounding must only be applied when serializing output.

## 12. Validation Requirements

The implementation must pass the following tests:

1. Positive EMA movement must produce a positive slope.
2. Negative EMA movement must produce a negative slope.
3. Identical EMA values must produce zero slope.
4. Classification must respect all exact threshold boundaries.
5. Score must remain within -100 and +100.
6. Invalid or missing EMA values must produce NULL.
7. The first valid SLOPE9 must occur at bar 18 when EMA9 uses an SMA initialization and the input series is uninterrupted.
8. No future observations may be used.
9. The same input series must always produce identical results.
10. Acceleration must use consecutive valid SLOPE9 observations.

## 13. Calibration and Backtesting

The proposed thresholds and weights are initial configuration values, not proven optimal trading parameters.

They must be validated using:

- Multiple securities.
- Multiple market regimes.
- Bullish, bearish and sideways markets.
- Different volatility conditions.
- Out-of-sample testing.
- Walk-forward validation.
- Transaction costs and slippage.

The objective is to improve risk-adjusted performance, not simply maximize the number of profitable signals.

Avoid optimizing thresholds and weights on the same historical observations used to evaluate performance.

## 14. Final Design Decision

EMA9 Slope should be treated as a short-term momentum contributor to the overall strategy score.

The original percentage formula and descriptive classifications should be retained.

The normalized score should provide the deterministic weighting mechanism.

Momentum acceleration and volatility normalization should be introduced as additional analytical outputs, with their use in trading decisions subject to independent validation.

SLOPE9 must never override protective risk-management rules or independently authorize a trade.

## 15. Scoring Refinement — Final Recommendation

The scoring function must be consistent with the descriptive classification thresholds.

A simple linear mapping such as:

```text
SLOPE9Score = SLOPE9 * 25
```

would assign a score of +50 to a slope of +2%, even though +2% belongs to the `sideways` classification.

This creates a mismatch between classification and trading weight.

The recommended scoring function in Section 6 resolves this inconsistency:

- SLOPE9 between -2% and +2% produces a zero directional score.
- SLOPE9 between +2% and +4% produces a progressively increasing positive score.
- SLOPE9 between -4% and -2% produces a progressively increasing negative score.
- SLOPE9 at or above +4% produces +100.
- SLOPE9 at or below -4% produces -100.

This ensures that the classification and scoring systems are aligned.

## 16. Final Assessment

| Element | Assessment |
|---|---|
| Original EMA9 slope formula | Keep |
| Nine-bar comparison | Keep |
| Five classifications | Keep |
| Fixed thresholds | Backtest and calibrate |
| Normalized momentum score | Implement |
| Momentum acceleration | Add as secondary output |
| ATR normalization | Recommended improvement |
| 20% strategy weighting | Initial hypothesis; validate |
| Entry/exit decisions | Require independent confirmation |

**Important consideration:** SLOPE9 measures momentum over nine bars, so it can be relatively slow to recognize a sudden momentum reversal. Acceleration helps identify changes earlier, but should not replace the primary trend and risk filters.

The final objective is to use EMA9 Slope as a consistent, deterministic and measurable momentum contribution to the overall trading strategy, rather than as an independent buy or sell signal.