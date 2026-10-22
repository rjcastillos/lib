## 7. Candle-shape rules


### 7 Candles  Classification principles

1. Direction is independent of shape. `direction` is `bullish` when `C > O`, `bearish` when `C < O`, and `neutral` when `C = O`.
2. Neutral candles are handled first. A candle with `H = L` is classified as flat; otherwise, a candle with `C = O` is classified as a doji.
3. Shapes are based on normalized body and wick proportions. The thresholds are the same for bullish and bearish candles.
4. Rules must be mutually exclusive. Each rule uses a distinct region of the proportion space, with explicit precedence only for defensive handling.
5. Unclassified shapes are avoided for valid candles. The final fallback is a general shape such as `standard`, not a direction-specific unclassified shape.
6. Zero-body candles are excluded from bullish/bearish shape rules. This avoids the problem of a zero body satisfying comparisons such as `wick >= 2 × body`.

The proposed taxonomy uses six paired shapes plus a standard fallback. 

### 7.2 Canonical geometry formulas

Replace the separate bullish and bearish proportion formulas with a single shared definition.

```
Range     = H - L
Body      = abs(C - O)
UpperWick = H - max(O, C)
LowerWick = min(O, C) - L

BodyRatio      = Body / Range
UpperWickRatio = UpperWick / Range
LowerWickRatio = LowerWick / Range
```

These formulas are symmetric for bullish and bearish candles. They also eliminate the need to maintain two copies of the same calculations.

For `Range = 0`, do not calculate the ratios. Classify the candle as `flat_neutral_candle` when `C = O`; otherwise, return `flat_bullish_candle` or `flat_bearish_candle` if such inputs are permitted. Under valid OHLC data, a zero-range candle necessarily has `C = O`.

### 7.3 Revised shape taxonomy

The table below defines the new thresholds. The bullish and bearish columns show the corresponding shape names.

| Shape geometry         | Body ratio                              | Wick requirements                                                  | Bullish shape                   | Bearish shape                   |
| ---------------------- | --------------------------------------- | ------------------------------------------------------------------ | ------------------------------- | ------------------------------- |
| Marubozu               | `>= 0.90`                               | Both wicks `<= 0.05`                                               | `bullish_marubozu`              | `bearish_marubozu`              |
| Momentum               | `>= 0.60` and `< 0.90`                  | Both wicks `<= 0.20`                                               | `bullish_momentum`              | `bearish_momentum`              |
| Rejection              | `>= 0.60` and `< 0.90`                  | Rejection-side wick `>= 0.15`; opposite wick `<= 0.10`             | `bullish_lower_rejection`       | `bearish_upper_rejection`       |
| Hammer-shaped          | `> 0` and `<= 0.35`                     | Long wick `>= 0.50`; short wick `<= 0.10`; long wick `>= 2 × body` | `bullish_hammer_shape`          | `bearish_hammer_shape`          |
| Inverted-hammer-shaped | `> 0` and `<= 0.35`                     | Long wick `>= 0.50`; short wick `<= 0.10`; long wick `>= 2 × body` | `bullish_inverted_hammer_shape` | `bearish_inverted_hammer_shape` |
| Spinning top           | `> 0` and `<= 0.30`                     | Both wicks `>= 0.20`                                               | `bullish_spinning_top`          | `bearish_spinning_top`          |
| Standard               | All remaining valid non-neutral candles | No additional restriction                                          | `bullish_standard`              | `bearish_standard`              |

For the rejection row, the rejection-side wick is the lower wick for bullish candles and the upper wick for bearish candles. For hammer-shaped candles, the long wick is the lower wick for bullish candles and the upper wick for bearish candles. For inverted-hammer-shaped candles, these are reversed.

One important adjustment to the previous draft: the body-ratio bands for marubozu, momentum, rejection, and the smaller-body shapes are explicitly separated. The standard shape captures the remaining valid geometries.


### 7.5 One refinement also improved 


Define two canonical wick ratios relative to the candle's direction:

```
OpenSideWickRatio  = UpperWickRatio if bearish
                     LowerWickRatio if bullish

CloseSideWickRatio = LowerWickRatio if bearish
                     UpperWickRatio if bullish
```

Then use these consistently in all mirrored rules. However, the definitions above should be chosen according to the actual intended meaning of each shape; the important requirement is that bullish and bearish conditions are exact mirrors, not merely similar thresholds.

## 8. Required acceptance tests

Before replacing the README rules, I would require these tests:

- Every valid bullish candle receives exactly one `bullish_*` shape.
- Every valid bearish candle receives exactly one `bearish_*` shape.
- Mirroring a bullish candle's geometry vertically produces the corresponding bearish shape.
- A flat neutral candle is classified before any ratio calculation.
- A non-flat doji is classified as `doji_neutral_candle`.
- No candle satisfies two shape rules simultaneously.
- Every valid non-neutral candle that does not match a specialized shape receives `standard`.
- Threshold tests cover values immediately below, exactly at, and immediately above each boundary.

This implementation above is functioning in a POC python code python/candle_shape.py for a detailed implementation


## 9. Download and run the Python script

`candle_shape.py`

Python 3 · Standard library only · Command-line interface

Accepts OHLC prices and returns the candle direction, shape, and geometry ratios.

Download the Python script

### Usage

Option 1 — Positional arguments in O, H, L, C order

```
python candle_shape.py 100 105 98 104
```

Example output:

```
Direction: bullish
Shape:     bullish_standard
Ratios:    body=0.5714285714285714, upper_wick=0.14285714285714285, lower_wick=0.2857142857142857
```

Option 2 — Named arguments

```
python candle_shape.py \
  --open 100 \
  --high 105 \
  --low 98 \
  --close 104
```

Option 3 — JSON output

```
python candle_shape.py 100 105 98 104 --json
```

This returns a machine-readable object with the direction, shape, ratios, and absolute candle dimensions.

### Test different candle shapes

Bullish marubozu

O H L C: 100 110 100 109.5

Expected: `{ex.expected}`

&#x20;Copy command

Bearish marubozu

O H L C: 110 110 100 100.5

Expected: `{ex.expected}`

&#x20;Copy command

Bullish hammer-shaped

O H L C: 105 106 95 106

Expected: `{ex.expected}`

&#x20;Copy command

Bearish hammer-shaped

O H L C: 95 105 94 94

Expected: `{ex.expected}`

&#x20;Copy command

Neutral doji

O H L C: 100 105 95 100

Expected: `{ex.expected}`

&#x20;Copy command

Flat neutral

O H L C: 100 100 100 100

Expected: `{ex.expected}`

&#x20;Copy command

One caveat when testing against real candles: the labels `hammer_shape` and `inverted_hammer_shape` describe geometry, not proof of a market reversal. Also, the thresholds are initial proposed definitions; real-market validation may show that they need refinement.

Recommended next step: Run the script against representative bullish and bearish candles from your historical data, then examine the distribution of shapes and the candles assigned to `standard`. That will help establish whether the thresholds describe the patterns you actually want to detect.
