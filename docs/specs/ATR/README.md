# Average True Range (ATR) Technical Specification

## Purpose

The Average True Range (ATR) is a volatility indicator introduced by J. Welles Wilder Jr. in *New Concepts in Technical Trading Systems* (1978).

ATR measures the average price movement of an asset over a specified lookback period, considering both intraperiod range and gaps between periods.

ATR does not indicate trend direction. It measures only volatility.

---

# Definitions

| Symbol | Description |
|----------|-------------|
| H(t) | High price of current period |
| L(t) | Low price of current period |
| C(t) | Close price of current period |
| C(t-1) | Previous period close |
| TR(t) | True Range |
| ATR(t) | Average True Range |
| n | ATR lookback period (default: 14) |

---

# True Range Calculation

For each period:

```text
TR(t) = max(
    H(t) - L(t),
    |H(t) - C(t-1)|,
    |L(t) - C(t-1)|
)
```

For the first candle where no previous close exists:

```text
TR(1) = H(1) - L(1)
```

---

# ATR Calculation

## Initial ATR

The first ATR value is calculated using a simple arithmetic average:

```text
ATR(n) =
(TR1 + TR2 + ... + TRn) / n
```

where n is the selected ATR lookback period.

---

## Subsequent ATR Values

After the initial ATR is obtained, Wilder's smoothing method is used:

```text
ATR(t) =
((ATR(t-1) × (n - 1)) + TR(t)) / n
```

This smoothing method reduces noise while maintaining responsiveness to volatility changes.

---

# Algorithm

1. Calculate True Range for every candle.
2. Calculate the average of the first n True Range values.
3. Store this result as the first ATR value.
4. Apply Wilder's smoothing to all subsequent periods.
5. Return ATR values aligned with the source data index.

---

# Worked Example

Input:

| High | Low | Close |
|------|------|------|
| 105 | 100 | 102 |
| 108 | 103 | 107 |
| 110 | 106 | 109 |

True Range values:

```text
TR1 = 105 - 100 = 5

TR2 = max(
108 - 103,
|108 - 102|,
|103 - 102|
)
= max(5, 6, 1)
= 6

TR3 = max(
110 - 106,
|110 - 107|,
|106 - 107|
)
= max(4, 3, 1)
= 4
```

For period = 3:

```text
ATR = (5 + 6 + 4) / 3
ATR = 5
```

---

# Trading Applications

## Loss Protection

ATR is commonly used to place stop losses that adapt to volatility.

Examples:

```text
Stop Loss = Entry Price - (2 × ATR)
```

```text
Trailing Stop = Highest Close - (3 × ATR)
```

## Profit Taking

ATR may assist in estimating realistic profit objectives.

```text
Target = Entry Price + (2 × ATR)
```

ATR targets should be combined with:

- Resistance levels
- Fibonacci extensions
- Supply zones
- Risk/Reward objectives

## Position Sizing

Higher ATR values imply greater volatility.

To maintain the same monetary risk per trade:

```text
Position Size = Maximum Risk / Stop Distance
```

Since stop distance often depends on ATR, position size naturally decreases when volatility rises.

---

# Implementation Requirements

A compliant ATR implementation shall:

1. Accept OHLC price data.
2. Calculate True Range according to the specification.
3. Use a configurable lookback period.
4. Calculate the initial ATR using a simple average.
5. Apply Wilder's smoothing thereafter.
6. Return ATR values aligned with input records.
7. Preserve numerical precision appropriate for the instrument traded.

---

# Complexity

Time Complexity:

```text
O(n)
```

Space Complexity:

```text
O(n)
```

or

```text
O(1)
```

for streaming implementations.

---

# References

- J. Welles Wilder Jr., New Concepts in Technical Trading Systems (1978)
- ATR standard definition used throughout technical analysis platforms and charting systems
