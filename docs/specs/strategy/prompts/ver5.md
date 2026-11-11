Calculate the Weighted Contribution  at the market open of 2026-08-03 represented as T-0.

# Candle window

The evaluation window consists of nine completed candles:

| Identifier | Description | Weight |
|---|---|---:|
| T-1 | Most recent completed candle | 9 |
| T-2 | Previous completed candle | 8 |
| T-3 | Third most recent | 7 |
| T-4 | Fourth most recent | 6 |
| T-5 | Fifth most recent | 5 |
| T-6 | Sixth most recent | 4 |
| T-7 | Seventh most recent | 3 |
| T-8 | Eighth most recent | 2 |
| T-9 | Oldest candle in evaluation | 1 |

Total weight = 45.


# Signal Analysis Engine

For each candle, calculate:

```text
StructureScore
BodyScore
VolumeMultiplier
VolumeAdjustedBodyScore
LocationScore
TrendScore
```

The final candle score is:

```text
CandleScore =
    StructureScore
    + VolumeAdjustedBodyScore
    + LocationScore
    + TrendScore
```

The weighted contribution is:

```text
WeightedContribution =
    CandleScore × CandleWeight
```

## StructureScore - Structure scoring table

| Pattern | Score | Interpretation |
|---|---:|---|
| HH-HL | +4 | Strong bullish structure |
| LH-HL | +2 | Weak bullish structure |
| LH-LL | -4 | Strong bearish structure |
| HH-LL | -2 | Weak bearish structure |
| EH-HL | +2 | Equal high, higher low |
| HH-EL | +2 | Higher high, equal low |
| LH-EL | -2 | Lower high, equal low |
| EH-LL | -2 | Equal high, lower low |
| EH-EL | 0 | No directional structural change |

## BodyScore 
 based on:

- `Direction`
- `BodyAtr`

### Bullish candles

| BodyAtr | Score |
|---|---:|
| >= 2.00 | +3 |
| >= 1.50  < 2.00 | +2 |
| >= 1.00 and < 1.50 | +1 |
| >= 0.50 and < 1.00 | +.5 |
| < 0.50 | 0 |

### Bearish candles
| BodyAtr | Score |
|---|---:|
| >= 2.00 | -3 |
| >= 1.50  < 2.00 | -2 |
| >= 1.00 and < 1.50 | -1 |
| >= 0.50 and < 1.00 | -.5 |
| < 0.50 | 0 |


Neutral candles receive zero.

Invalid or missing `BodyAtr` values must be marked unavailable.

The score represents directional body strength relative to volatility, not total candle range.

## VolumeMultiplier - Volume Participation

Volume modifies the candle body strength only.

Use `Rvol`.

## RVOL multiplier

| Rvol | Multiplier |
|---|---:|
| > 3 | 3 |
| > 2.00 and <= 3.00 | 2 |
| > 1.50 and <= 2.00 | 1.50 |
| > 1.20 and <= 1.50 | 1.25 |
| >= 0.80 and <= 1.20 | 1.00 |
| < 0.80 | 0.75 |

##  VolumeAdjustedBodyScore Calculation

```text
VolumeAdjustedBodyScore =
    BodyScore × VolumeMultiplier
```

Example:

```text
Direction = bullish
BodyAtr = 1.20
Rvol = 1.60

BodyScore = +3
VolumeMultiplier = 1.50

VolumeAdjustedBodyScore = +4.50
```

If RVOL is unavailable:

```text
VolumeMultiplier = 1.00
```

The missing volume confirmation must be reported.

RVOL must not multiply the entire candle score.

## LocationScore - Candle Close Location

Use `CloseLocation`.

This component measures the position of the closing price within the candle range.

### Scoring

| CloseLocation | Score |
|---|---:|
| >= 0.75 | +1 |
| > 0.60 and < 0.75 | +0.5 |
| > 0.50 and < 0.60 | +0 |
| <= 0.50 | -1 |

Invalid values outside `[0,1]` are unavailable.

A zero-range candle must not generate a location score.

This component provides confirmation but must not dominate the overall strategy.

# TrendScore - Trend Alignment

Use:

- `Slope9`
- `Slope20`
- `Slope50`



##  Trend thresholds

Define:

```text
SlopeEpsilon = configurable fractional threshold
```

Initial default:

```text
SlopeEpsilon = 0
```

## 10.2 Scoring table

| Indicator | Positive slope | Negative slope |
|---|---:|---:|
| Slope9 | +1 | -1 |
| Slope20 | +2 | -2 |
| Slope50 | +3 | -3 |

Rules:

```text
If Slope > +SlopeEpsilon:
    Apply positive score

If Slope < -SlopeEpsilon:
    Apply negative score

Otherwise:
    Score = 0
```

Trend score:

```text
TrendScore =
    Slope9Score
    + Slope20Score
    + Slope50Score
```

A missing slope must be marked unavailable.
A missing slope must be marked unavailable.

## Nine-Candle Aggregation

###  Candle score

For each candle:

```text
CandleScore =
    StructureScore
    + VolumeAdjustedBodyScore
    + LocationScore
    + TrendScore
```

##  Weighted contribution

```text
WeightedContribution =
    CandleScore × CandleWeight
```


##################

## Bullish pressure

```text
BullPressure =
    SUM(MAX(WeightedContribution, 0))
```

## Bearish pressure

```text
BearPressure =
    SUM(ABS(MIN(WeightedContribution, 0)))
```

## Total pressure

```text
TotalPressure =
    BullPressure + BearPressure
```

## Net score

```text
NetScore =
    BullPressure - BearPressure
```

## Directional balance

```text
DirectionalBalance =
    NetScore / TotalPressure
```

If `TotalPressure = 0`:

```text
DirectionalBalance = 0
```

Directional balance is constrained to:

```text
-1.00 <= DirectionalBalance <= +1.00
```

###############4


## Bullish pressure

```text
BullPressure =
    SUM(MAX(WeightedContribution, 0))
```

## Bearish pressure

```text
BearPressure =
    SUM(ABS(MIN(WeightedContribution, 0)))
```

## Total pressure

```text
TotalPressure =
    BullPressure + BearPressure
```

## Net score

```text
NetScore =
    BullPressure - BearPressure
```

## Directional balance

```text
DirectionalBalance =
    NetScore / TotalPressure
```

If `TotalPressure = 0`:

```text
DirectionalBalance = 0
```

Directional balance is constrained to:

```text
-1.00 <= DirectionalBalance <= +1.00
```

**Important:** Directional balance is not a statistical probability or probability of profit. It expresses the relative balance of bullish and bearish scored evidence.

# Evidence Strength

A high directional balance does not necessarily indicate sufficient evidence.

Example:

A single small bullish contribution with no other activity can produce a directional balance of +1.

To prevent this, introduce an independent evidence-strength gate.

## Maximum theoretical pressure

Under the proposed component weights:

```text
MaximumStructureScore = 4
MaximumBodyScore = 3 × 1.50 = 4.50
MaximumLocationScore = 1
MaximumTrendScore = 6

MaximumCandleScore = 15.50
```

Across the nine weighted candles:

```text
MaximumTotalPressure = 15.50 × 45

MaximumTotalPressure = 697.50
```

## 12.2 Minimum evidence

Introduce:

```text
MinimumEvidenceRatio
```

Proposed initial default:

```text
MinimumEvidenceRatio = 0.10
```

Calculate:

```text
EvidenceRatio =
    TotalPressure / 697.50
```

The evidence gate passes when:

```text
EvidenceRatio >= MinimumEvidenceRatio
```

This 10% threshold is a provisional engineering default, not an empirically validated trading threshold.

The maximum theoretical pressure must be recalculated if component weights or multipliers change.

# Market Bias Classification

The original thresholds are retained as initial parameters.

| DirectionalBalance | Bias |
|---|---|
| >= +0.40 | STRONG_BULLISH |
| >= +0.20 and < +0.40 | WEAK_BULLISH |
| > -0.20 and < +0.20 | NEUTRAL |
| > -0.40 and <= -0.20 | WEAK_BEARISH |
| <= -0.40 | STRONG_BEARISH |

The classification is valid only when:

- Data quality passes.
- Minimum component coverage passes.
- Minimum evidence passes.

Otherwise:

```text
Bias = UNDEFINED
```

Do not open or reverse when bias is undefined. If the underlying candle data
and component coverage are valid, an existing position must still be managed
using its holding threshold as defined in Section 4.3. If data or coverage is
invalid, follow the protective-control policy in Section 4.3.

#  Entry Confirmation

A market bias alone is not sufficient to open a position.

The strategy uses a breakout confirmation to avoid entering solely because of a high aggregate score.

Only completed candles are used.

##  Long entry trigger

A long entry trigger occurs when:

```text
Close(T-1) > High(T-2)
```

Optional breakout buffer:

```text
LongBreakoutBuffer =
    Configurable ATR multiple
```

If enabled:

```text
Close(T-1) >
    High(T-2) + LongBreakoutBuffer × ATR(T-2)
```

The initial default buffer is zero.

A long position may be opened only when all conditions pass:

1. Bias = STRONG_BULLISH.
2. DirectionalBalance >= LongEntryThreshold.
3. Evidence gate passes.
4. Data-quality gate passes.
5. Long entry trigger is true.
6. Current position is FLAT.
7. Risk-management gate passes.

##  Short entry trigger

A short entry trigger occurs when:

```text
Close(T-1) < Low(T-2)
```

Optional breakout buffer:

```text
ShortBreakoutBuffer =
    Configurable ATR multiple
```

If enabled:

```text
Close(T-1) <
    Low(T-2) - ShortBreakoutBuffer × ATR(T-2)
```

A short position may be opened only when all conditions pass:

1. Bias = STRONG_BEARISH.
2. DirectionalBalance <= -ShortEntryThreshold.
3. Evidence gate passes.
4. Data-quality gate passes.
5. Short entry trigger is true.
6. Current position is FLAT.
7. Risk-management gate passes.

`LongEntryThreshold` is a positive directional-balance threshold, and
`ShortEntryThreshold` is its positive-magnitude counterpart. The configured
defaults are both `0.40`; the short comparison negates that magnitude. Do not
configure the short threshold as a signed negative value.



