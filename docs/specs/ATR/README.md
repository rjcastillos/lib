# Average True Range (ATR) Technical Specification

## 1. Purpose
The Average True Range (ATR) is a volatility indicator introduced by J. Welles Wilder Jr. in *New Concepts in Technical Trading Systems* (1978).

The Average True Range (ATR) measures market volatility (price movement ) of an asset by calculating the average of the **True Range (TR)** over a specified lookback period.

ATR measures:

- Volatility
- Price expansion and contraction
- Risk
- Stop-loss sizing
- Position sizing

ATR does **not** measure trend direction.

A rising ATR indicates increasing volatility.

A falling ATR indicates decreasing volatility.

---

# 2. Inputs

## Required Inputs

| Parameter | Type | Description |
|------------|------|-------------|
| High | float | Bar high price |
| Low | float | Bar low price |
| Close | float | Bar close price |
| Period | integer | ATR lookback period |

---

## Data Requirements

For each bar:

```text
High >= Low

High > 0
Low > 0
Close > 0
```

---

# 3. Data Validation

A bar is considered valid when:

```text
High  != NULL
Low   != NULL
Close != NULL

High > 0
Low > 0
Close > 0
```

---

## Invalid Values

The following values are invalid:

```text
NULL
NaN
0
Negative values
Infinity
```

---

# 4. True Range (TR)

ATR is based on the concept of **True Range**.

The True Range captures both:

- Intrabar movement
- Gaps between bars

---

## Formula

For bar t:

```text
TR = MAX(

    High - Low,

    ABS(High - PreviousClose),

    ABS(Low - PreviousClose)

)
```

---

# 5. True Range Components

### Component 1

Current bar range:

```text
High - Low
```

Example:

```text
High = 105
Low  = 100

Range = 5
```

---

### Component 2

Gap up measurement:

```text
ABS(High - Previous Close)
```

---

### Component 3

Gap down measurement:

```text
ABS(Low - Previous Close)
```

---

### Final True Range

Select the largest value:

```text
TR = MAX(Component1, Component2, Component3)
```

---

# 6. First Bar Special Case

The first bar has no previous close.

Therefore:

```text
TR = High - Low
```

---

## Example

```text
High = 105
Low = 100
```

```text
TR = 105 - 100

TR = 5
```

---

# 7. ATR Calculation Method

The industry standard ATR uses:

```text
Wilder's Smoothing Method
```

which behaves similarly to an EMA but uses a different smoothing constant.

---

# 8. ATR Initialization

Before ATR can be calculated:

1. Calculate TR values
2. Collect N TR observations
3. Compute the first ATR using an arithmetic average

---

## Initial ATR Formula

```text
ATR_initial

=
(TR1 + TR2 + ... + TRN)

÷ N
```

---

# 9. ATR Recursive Formula

After initialization:

```text
ATR_t

=

(
ATR_(t-1) × (N - 1)

+ TR_t

)

÷ N
```

Equivalent form:

```text
ATR_t

=

ATR_(t-1)

+

(TR_t - ATR_(t-1))

÷ N
```

This form is usually preferred for implementation.

---

# 10. Warm-Up Period

## Best Practice

ATR requires a complete TR history before producing valid values.

For ATR(N):

```text
Output NULL
until N True Range values exist.
```

---

## Example

ATR(5)

| Index | ATR |
|---------|---------|
| 0 | NULL |
| 1 | NULL |
| 2 | NULL |
| 3 | NULL |
| 4 | First ATR |

---

## Never Use

```text
0
```

during the warm-up period.

Use:

```text
NULL
```

instead.

---

# 11. Worked Example (ATR(5))

A small lookback period is used purely for illustration.

The same process applies to:

```text
ATR(9)
ATR(14)
ATR(20)
ATR(50)
```

---

## Market Data

| Bar | High | Low | Close |
|------|------|------|------|
| 1 | 105 | 100 | 102 |
| 2 | 107 | 101 | 106 |
| 3 | 110 | 104 | 108 |
| 4 | 111 | 105 | 106 |
| 5 | 109 | 102 | 103 |
| 6 | 108 | 101 | 107 |

---

# 12. Calculate True Range

## Bar 1

No previous close:

```text
TR1 = High - Low

TR1 = 105 - 100

TR1 = 5
```

---

## Bar 2

Previous Close:

```text
102
```

Components:

```text
107 - 101 = 6

|107 - 102| = 5

|101 - 102| = 1
```

TR:

```text
MAX(6,5,1)

TR2 = 6
```

---

## Bar 3

Previous Close:

```text
106
```

Components:

```text
110 - 104 = 6

|110 - 106| = 4

|104 - 106| = 2
```

TR:

```text
TR3 = 6
```

---

## Bar 4

Previous Close:

```text
108
```

Components:

```text
111 - 105 = 6

|111 - 108| = 3

|105 - 108| = 3
```

TR:

```text
TR4 = 6
```

---

## Bar 5

Previous Close:

```text
106
```

Components:

```text
109 - 102 = 7

|109 - 106| = 3

|102 - 106| = 4
```

TR:

```text
TR5 = 7
```

---

## Bar 6

Previous Close:

```text
103
```

Components:

```text
108 - 101 = 7

|108 - 103| = 5

|101 - 103| = 2
```

TR:

```text
TR6 = 7
```

---

# 13. True Range Table

| Bar | TR |
|------|------|
| 1 | 5 |
| 2 | 6 |
| 3 | 6 |
| 4 | 6 |
| 5 | 7 |
| 6 | 7 |

---

# 14. Calculate Initial ATR(5)

Using first 5 TR values:

```text
5 + 6 + 6 + 6 + 7

= 30
```

```text
ATR

= 30 / 5

= 6.0
```

Result:

```text
ATR5[5] = 6.0
```

---

# 15. Calculate Next ATR Value

New TR:

```text
TR6 = 7
```

Previous ATR:

```text
ATR5 = 6.0
```

Apply Wilder Formula:

```text
ATR

=

((6.0 × 4) + 7)

÷ 5
```

```text
=(24 + 7)

÷ 5

=31 ÷ 5

=6.2
```

Result:

```text
ATR6 = 6.2
```

---

# 16. Final Output

| Bar | TR | ATR(5) |
|------|------|------|
| 1 | 5 | NULL |
| 2 | 6 | NULL |
| 3 | 6 | NULL |
| 4 | 6 | NULL |
| 5 | 7 | 6.00 |
| 6 | 7 | 6.20 |

---

# 17. Missing Data Rules

If any required value is invalid:

```text
High
Low
Close
```

then:

```text
TR = NULL
```

and

```text
ATR = NULL
```

---

## Example

| High | Low | Close |
|------|------|------|
| 105 | 100 | 102 |
| NULL | 101 | 106 |

Result:

```text
TR = NULL

ATR = NULL
```

---

# 18. Recommended Implementation Behavior

## Input Validation

```text
IF High <= 0 → Invalid

IF Low <= 0 → Invalid

IF Close <= 0 → Invalid
```

---

## Warm-Up

```text
Bars before ATR initialization

→ NULL
```

---

## Missing Data

```text
Invalid bar

→ NULL
```

---

## Precision

Recommended:

```text
Storage = float64

Display = 2-4 decimals
```

Examples:

```text
ATR(14)=2.54

ATR(14)=2.5438
```

---

# 19. Pseudocode

```text
FOR each bar

    IF first bar

        TR =
            High - Low

    ELSE

        TR = MAX(

            High - Low,

            ABS(High - PrevClose),

            ABS(Low - PrevClose)

        )

END FOR


First ATR

=

AVERAGE(
    First N TR values
)


FOR remaining bars

    ATR =
        ATR_previous
        +
        (TR - ATR_previous)
          / N

END FOR
```

---

# 20. Summary

## True Range

```text
TR = MAX(

    High - Low,

    ABS(High - PreviousClose),

    ABS(Low - PreviousClose)

)
```

---

## Initial ATR

```text
ATR_initial

=

Average of first N TR values
```

---

## Ongoing ATR

```text
ATR

=

ATR_previous

+

(TR - ATR_previous)

÷ N
```

---

## Best Practices

```text
Warm-up          -> NULL
Missing Values   -> NULL
Zero Values      -> Invalid
Initialization   -> Average Of First N TR
Smoothing        -> Wilder Method
Storage          -> float64
Display          -> 2-4 decimals
```

ATR measures volatility only.

It does not indicate trend direction, bullishness, or bearishness.