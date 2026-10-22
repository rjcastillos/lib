# Simple Moving Average (SMA)
# Technical Specification

## 1. Purpose

The Simple Moving Average (SMA) calculates the arithmetic mean of the most recent N valid prices.

SMA is used to:

- Smooth price fluctuations
- Identify trend direction
- Filter market noise
- Serve as a baseline for other indicators

---

# 2. Inputs

| Parameter | Type | Description |
|------------|------|-------------|
| prices | array<float> | Ordered price series |
| period | integer | SMA lookback window |

---

# 3. Data Validation

A valid price satisfies:

```text
price > 0
price != NULL
price != NaN
price is finite
```

Invalid values:

```text
NULL
NaN
0
Negative values
Infinity
```

---

# 4. Formula

For period N:

SMA_t:

```text
(P_t + P_(t-1) + ... + P_(t-N+1))
---------------------------------
                N
```

---

# 5. Warm-Up Period

A valid SMA requires N observations.

Before enough observations exist:

```text
Output = NULL
```

Never:

```text
Output = 0
```

---

# 6. Example

Input Prices:

| Index | Price |
|---------|---------|
| 0 | 100 |
| 1 | 102 |
| 2 | 101 |
| 3 | 104 |
| 4 | 103 |
| 5 | 106 |

---

## First Valid SMA(5)

Window:

```text
100
102
101
104
103
```

Calculation:

```text
(100+102+101+104+103)/5

= 510/5

= 102.00
```

Result:

| Index | SMA(5) |
|---------|---------|
| 4 | 102.00 |

---

## Next SMA(5)

Window:

```text
102
101
104
103
106
```

Calculation:

```text
(102+101+104+103+106)/5

= 516/5

= 103.20
```

Result:

| Index | SMA(5) |
|---------|---------|
| 5 | 103.20 |

---

# 7. Illustration

```text
Price Series

100 102 101 104 103 106
 |-----------------|
       SMA(5)

Sum = 510

SMA = 510/5

SMA = 102
```

---

# 8. Expected Output

| Index | Price | SMA(5) |
|---------|---------|---------|
| 0 | 100 | NULL |
| 1 | 102 | NULL |
| 2 | 101 | NULL |
| 3 | 104 | NULL |
| 4 | 103 | 102.00 |
| 5 | 106 | 103.20 |

---

# 9. Missing Data Rules

If any value inside the calculation window is invalid:

```text
Output = NULL
```

Example:

```text
100
101
NULL
104
105
```

Result:

```text
SMA = NULL
```

---

# 10. Pseudocode

```text
FOR i = 0 TO LastIndex

    IF i < period - 1
        SMA[i] = NULL
        CONTINUE

    sum = 0
    valid = TRUE

    FOR j = 0 TO period-1

        p = prices[i-j]

        IF p <= 0 OR p IS NULL
            valid = FALSE
            BREAK

        sum += p

    END FOR

    IF valid
        SMA[i] = sum / period
    ELSE
        SMA[i] = NULL

END FOR
```

---

# 11. Best Practices

```text
Warm-up Output : NULL
Invalid Input  : NULL
Storage Type   : float64
Display        : 2-4 decimals
```

---

# 12. Summary

```text
SMA = Arithmetic Mean of Last N Prices

Equal Weighting
Higher Lag
Strong Smoothing
```