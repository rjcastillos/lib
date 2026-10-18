


Given:

O = Open
H = High
L = Low
C = Close

# Candle type
    Bullish candle: C > O
    Bearish candle: C < O

## Bullish candle calculations

A bullish candle requires:

C > O

### Range     = H - L
### Body      = C - O
### UpperWick = H - C
### LowerWick = O - L

### Proportions of the candle
#### BodyRatio      = Body      / Range
#### UpperWickRatio = UpperWick / Range
#### LowerWickRatio = LowerWick / Range

### Position of the close
#### CloseLocation = (C - L) / Range

### Price-relative movement

#### ReferencePrice = O (Open) 
#### BodyPercent    = Body  / ReferencePrice * 100
#### RangePercent   = Range / ReferencePrice * 100


### ATR 
#### Candle ATR(14)
##### Algorithm

1. Calculate True Range for every candle.
2. Calculate the average of the first n True Range values.
3. Store this result as the first ATR value.
4. Apply Wilder's smoothing to all subsequent periods.
5. Return ATR values aligned with the source data index.

---

##### Worked Example ATR(3)

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

### Move size (Magnitude)relative to the Average True Range of last interval 
#### BodyATR  = Body  / ATR(t-1)
#### RangeATR = Range / ATR(t-1)

>Example: $100 asset
O = 100.00
H = 102.05
L = 99.95
C = 102.00


Calculations:

Range     = 2.10
Body      = 2.00
UpperWick = 0.05
LowerWick = 0.05

BodyRatio      = 2.00 / 2.10 = 95.24%
UpperWickRatio = 0.05 / 2.10 = 2.38%
LowerWickRatio = 0.05 / 2.10 = 2.38%

BodyPercent = 2.00 / 100.00 = 2.00%

---

### Candlestick bullish shape 

if bodyRatio >= 0.90
   and upperWickRatio <= 0.05
   and lowerWickRatio <= 0.05:
       shape = "bullish_marubozu"

else if bodyRatio >= 0.60
   and upperWickRatio <= 0.10
   and lowerWickRatio >= 0.15:
       shape = "bullish_lower_rejection"

else if bodyRatio >= 0.60
   and upperWickRatio <= 0.20
   and lowerWickRatio <= 0.20:
       shape = "bullish_momentum"

else if bodyRatio <= 0.35
   and lowerWickRatio >= 0.50
   and upperWickRatio <= 0.10
   and lowerWick >= 2 * body:
       shape = "bullish_hammer"

else if bodyRatio <= 0.30
   and upperWickRatio >= 0.20
   and lowerWickRatio >= 0.20:
       shape = "bullish_spinning_top"

else if bodyRatio <= 0.35
   and upperWickRatio >= 0.50
   and lowerWickRatio <= 0.10
   and upperWick >= 2 * body:
       shape = "bullish_inverted_hammer"

else:
       shape = "unclassified_bullish"


## Bearish candle calculations

A bearish candle requires:

C < O

### Range     = H - L
### Body      = O - C
### UpperWick = H - O
### LowerWick = C - L

### Candle Bearish shape proportions
#### BodyRatio      = Body      / Range
#### UpperWickRatio = UpperWick / Range
#### LowerWickRatio = LowerWick / Range

### Close location
#### CloseLocation = (C - L) / Range

### Open location
#### OpenLocation = (O - L) / Range

###  Normalize price against the asset price


#### ReferencePrice = O (Open)

#### BodyPercent      = Body      / ReferencePrice * 100
#### RangePercent     = Range     / ReferencePrice * 100
#### UpperWickPercent = UpperWick / ReferencePrice * 100
#### LowerWickPercent = LowerWick / ReferencePrice * 100

### Normalize price against recent volatility


#### BodyATR      = Body      / ATR(t-1)
#### RangeATR     = Range     / ATR(t-1)
#### UpperWickATR = UpperWick / ATR(t-1)
#### LowerWickATR = LowerWick / ATR(t-1)


### Candlestick bearish  shape 

if bodyRatio >= 0.90
   and upperWickRatio <= 0.05
   and lowerWickRatio <= 0.05:
       shape = "bearish_marubozu"

else if bodyRatio >= 0.60
   and upperWickRatio >= 0.15
   and upperWickRatio <= 0.35
   and lowerWickRatio <= 0.10:
       shape = "bearish_upper_rejection_momentum"

else if bodyRatio >= 0.60
   and upperWickRatio <= 0.20
   and lowerWickRatio <= 0.20:
       shape = "bearish_momentum"

else if bodyRatio <= 0.35
   and upperWickRatio >= 0.50
   and lowerWickRatio <= 0.10
   and upperWick >= 2 * body:
       shape = "bearish_shooting_star_shape"

else if bodyRatio <= 0.30
   and upperWickRatio >= 0.20
   and lowerWickRatio >= 0.20:
       shape = "bearish_spinning_top"

else if bodyRatio <= 0.35
   and lowerWickRatio >= 0.50
   and upperWickRatio <= 0.10
   and lowerWick >= 2 * body:
       shape = "bearish_long_lower_wick"

else:
       shape = "unclassified_bearish"



# Magnitud clasification for both bullish and bearish
if rangeATR >= 2.0:
    magnitud = "Monster_move"
else if rangeATR >= 1.50:
    magnitude = "exceptionally_large"
else if rangeATR >= 1.00:
    magnitude = "large"
else if rangeATR >= 0.50:
    magnitude = "normal"
else:
    magnitude = "small"
