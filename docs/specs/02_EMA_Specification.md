File 2: EMA_Specification.md
# Exponential Moving Average (EMA)
# Technical Specification

## 1. Purpose

The Exponential Moving Average (EMA) is a weighted moving average that gives more importance to recent prices.

EMA reacts faster than SMA to trend changes.

Common uses:

- Trend identification
- Dynamic support/resistance
- Trend following systems
- Crossover strategies

---

# 2. Inputs

| Parameter | Type | Description |
|------------|------|-------------|
| prices | array<float> | Ordered price series |
| period | integer | EMA lookback period |

---

# 3. Data Validation

Valid:

```text
price > 0
price != NULL
price != NaN
```

Invalid:

```text
NULL
NaN
0
Negative values
Infinity
```

---

# 4. EMA Smoothing Factor

The EMA weighting coefficient:

```text
α = 2 / (N + 1)
```

---

## Example

EMA(5)

```text
α = 2 / 6

α = 0.333333
```

EMA(20)

```text
α = 2 / 21

α = 0.095238
```

---

# 5. EMA Initialization

EMA requires a seed value.

Industry standard:

```text
EMA(N) starts with SMA(N)
```

---

## Example

Input:

```text
100
102
101
104
103
```

Calculation:

```text
SMA(5)=102
```

Initialization:

```text
EMA[4] = 102
```

---

# 6. EMA Formula

For every new observation:

```text
EMA_t =
EMA_(t-1)
+
α × (Price_t - EMA_(t-1))
```

---

# 7. Warm-Up Period

Before enough observations exist:

```text
Output = NULL
```

Rules:

```text
Index < N-1 → NULL
Index = N-1 → SMA(N)
Index > N-1 → EMA Formula
```

---

# 8. EMA Illustration

```text
New Price
    |
    v

Price - Previous EMA
         |
         v

      × α
         |
         v

Add Previous EMA
         |
         v

     New EMA
```

---

# 9. Worked Example

Period:

```text
N = 5
```

Smoothing:

```text
α = 0.333333
```

Initial EMA:

```text
EMA = 102.00
```

New price:

```text
106
```

Calculation:

```text
EMA

= 102

+ 0.333333 × (106 - 102)

= 102 + 1.333332

= 103.33
```

---

# 10. Next EMA Value

Previous EMA:

```text
103.33
```

New Price:

```text
110
```

Calculation:

```text
EMA

= 103.33

+ 0.333333 × (110 - 103.33)

= 103.33 + 2.22

= 105.55
```

---

# 11. Expected Output

| Index | Price | EMA(5) |
|---------|---------|---------|
| 0 | 100 | NULL |
| 1 | 102 | NULL |
| 2 | 101 | NULL |
| 3 | 104 | NULL |
| 4 | 103 | 102.00 |
| 5 | 106 | 103.33 |
| 6 | 110 | 105.55 |

---

# 12. Missing Data Rules

If current price is invalid:

```text
EMA = NULL
```

Recommended rule:

```text
NULL propagates
```

until a new valid initialization can be performed.

---

# 13. Pseudocode

```text
alpha = 2 /(period + 1)

EMA[period-1] =
SMA(period)

FOR i = period TO LastIndex

    IF Price[i] <= 0 OR Price[i] IS NULL

        EMA[i] = NULL
        CONTINUE

    EMA[i] =
        EMA[i-1]
        + alpha *
          (Price[i] - EMA[i-1])

END FOR
```

---

# 14. Best Practices

```text
Initialization : SMA(N)
Warm-up Output : NULL
Missing Data   : NULL
Storage Type   : float64
Display        : 2-4 decimals
```

---

# 15. Summary

```text
EMA = EMA_prev + α × (Price - EMA_prev)

α = 2/(N+1)
```

Properties:

```text
Recent prices weighted more heavily
Lower lag than SMA
Faster trend response
Industry standard trend indicator
```

Additional recommendation

Since EMA depends on SMA for initialization, in a technical indicators repository it is better if both  documents are considered as a whole:

01_SMA_Specification.md
02_EMA_Specification.md


This mirrors the computational dependency chain and makes the documentation easier to follow for developers implementing the indicators from scratch.