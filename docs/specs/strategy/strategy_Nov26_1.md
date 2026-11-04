# 9-Candle Weighted Trading Decision Framework

## Objective

Design a simple, deterministic trading system that evaluates the previous nine candles and produces a single weighted score indicating:

- Open Long
- Open Short
- Close Long
- Close Short
- Reverse Position
- Remain Flat

The framework leverages:

- Market Structure (`PredecessorPatternCode`)
- Candle Strength (`BodyAtr`)
- Trend (`Slope9`, `Slope20`, `Slope50`)
- Volume Participation (`Rvol`)
- Candle Location (`CloseLocation`)
- Volatility (`Atr`)

The system is intentionally **not symmetrical** between long and short signals. A valid long setup does not necessarily imply a valid short setup.

---

# 1. Nine-Candle Weighting Model

The most recent candles carry the highest influence.

| Candle | Weight |
|----------|----------:|
| T-1 | 9 |
| T-2 | 8 |
| T-3 | 7 |
| T-4 | 6 |
| T-5 | 5 |
| T-6 | 4 |
| T-7 | 3 |
| T-8 | 2 |
| T-9 | 1 |

Total Weight:

```text
9 + 8 + 7 + 6 + 5 + 4 + 3 + 2 + 1 = 45
```

This creates a natural recency bias while still incorporating the last nine bars.

---

# 2. Per-Candle Scoring

Each candle contributes bullish and bearish pressure.

## 2.1 Market Structure Score

Based on:

```text
PredecessorPatternCode
```

### Bullish Structure

| Pattern | Score |
|----------|-------:|
| HH-HL | +4 |
| LH-HL | +2 |

### Bearish Structure

| Pattern | Score |
|----------|-------:|
| LH-LL | -4 |
| HH-LL | -2 |

### Interpretation

```text
HH-HL = Strong trend continuation

LH-LL = Strong downtrend continuation

LH-HL = Compression / possible bullish reversal

HH-LL = Expansion / possible bearish reversal
```

---

## 2.2 Candle Strength Score

Based on:

```text
Direction
BodyAtr
```

### Bullish Candle

| BodyAtr | Score |
|----------|-------:|
| > 1.00 | +3 |
| 0.60 - 1.00 | +2 |
| 0.30 - 0.60 | +1 |

### Bearish Candle

| BodyAtr | Score |
|----------|-------:|
| > 1.00 | -3 |
| 0.60 - 1.00 | -2 |
| 0.30 - 0.60 | -1 |

Large ATR-normalized bodies exert more influence than small candles.

---

## 2.3 Volume Confirmation

Based on:

```text
Rvol
```

Apply a multiplier to the candle score.

| RVOL | Multiplier |
|--------|-----------:|
| > 1.50 | 1.50 |
| > 1.20 | 1.25 |
| < 0.80 | 0.75 |
| Otherwise | 1.00 |

---

## 2.4 Trend Alignment Score

Based on:

```text
Slope9
Slope20
Slope50
```

### Bullish Trend

| Condition | Score |
|------------|-------:|
| Slope9 > 0 | +1 |
| Slope20 > 0 | +2 |
| Slope50 > 0 | +3 |

### Bearish Trend

| Condition | Score |
|------------|-------:|
| Slope9 < 0 | -1 |
| Slope20 < 0 | -2 |
| Slope50 < 0 | -3 |

Longer-term trend receives greater weight.

---

# 3. Weighted Nine-Candle Score

For every candle:

```text
WeightedContribution =
CandleScore × CandleWeight
```

Calculate:

```text
BullScore =
Sum of all positive contributions

BearScore =
Sum of absolute negative contributions
```

Then:

```text
NetScore =
BullScore - BearScore
```

Normalize:

```text
Confidence =
NetScore / (BullScore + BearScore)
```

Range:

```text
-1.00 to +1.00
```

---

# 4. Trading State Matrix

## Strong Long Bias

```text
Confidence >= +0.40
```

Action:

```text
Open Long
```

If currently short:

```text
Reverse to Long
```

---

## Weak Long Bias

```text
+0.20 <= Confidence < +0.40
```

Action:

```text
Hold Existing Long

Do Not Initiate Short Positions
```

---

## Neutral

```text
-0.20 < Confidence < +0.20
```

Action:

```text
Remain Flat

Reduce Exposure

Take Partial Profits
```

---

## Weak Short Bias

```text
-0.40 < Confidence <= -0.20
```

Action:

```text
Hold Existing Short
```

---

## Strong Short Bias

```text
Confidence <= -0.40
```

Action:

```text
Open Short
```

If currently long:

```text
Reverse to Short
```

---

# 5. Entry Triggers

The confidence score provides market bias.

Actual trade entry requires a trigger.

---

## 5.1 Long Entry

Conditions:

```text
Confidence > +0.40
```

and