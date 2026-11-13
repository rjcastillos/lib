# sniper9 Framework
## Complete Technical Specification

**Document ID:** TSW-9RC-001  
**Version:** 1.0<br>
**Status:** Proposed implementation specification  
**Classification:** Deterministic, rule-based trading strategy  
**Input reference:** `field-reference.md`  
**Base strategy:** `sniper9.md`

## Actions
- `OPEN_LONG`
- `OPEN_SHORT`
- `HOLD_LONG`
- `HOLD_SHORT`
- `CLOSE_LONG`
- `CLOSE_SHORT`
- `REDUCE_LONG_BASED_IN_PROFIT_TAKER`
- `REDUCE_SHORT_BASED_IN_PROFIT_TAKER`
- `REVERSE_TO_LONG`
- `REVERSE_TO_SHORT`
- `REMAIN_FLAT`
- `NO_TRADE`
- `STOP_LOSS`
- `PROFIT_TAKER_TARGETS`

## Available data points per candle

- `Ticker`
- `Date`
- `Time`
- `Open`
- `High`
- `Low`
- `Close`
- `Direction`
- `Shape`
- `Atr`
- `Range`
- `Body`
- `UpperWick`
- `LowerWick`
- `BodyPercent`
- `UpperWickPercent`
- `LowerWickPercent`
- `PredecessorHighRelation`
- `PredecessorLowRelation`
- `PredecessorPatternCode`
- `PredecessorPatternName`
- `PredecessorStatus`
- `OpenLocation`
- `CloseLocation`
- `Magnitude`
- `RelativeOpenPercent`
- `RelativeOpenRangePercent`
- `RelativeOpenUpperWickPercent`
- `RelativeOpenLowerWickPercent`
- `BodyAtr`
- `RangeAtr`
- `UpperWickAtr`
- `LowerWickAtr`
- `Rvol`
- `Ema9`
- `Sma20`
- `Ema50`
- `Ema100`
- `Ema200`
- `Slope9`
- `Slope20`
- `Slope50`
- `Slope200`
- `Volume`


### Slope interpretation

The following thresholds provide a descriptive interpretation of the calculated slope. They do not alter the underlying calculation.
To compare a raw study (`ST`) value with the percentage thresholds below, multiply it by 100. For example, `0.04` corresponds to `4%`.

| Slope percentage                               | Interpretation      |
| ---------------------------------------------- | ------------------- |
| Greater than +4%                               | `strong_bull_trend` |
| Greater than +2% and up to +4%                 | `bull_trend`        |
| Greater than or equal to -2% and up to +2%     | `sideways`          |
| Greater than or equal to -4% and less than -2% | `bear_trend`        |
| Less than -4%                                  | `strong_bear_trend` |

Boundary values are assigned to only one category:

- Exactly `+4%` is `bull_trend`.
- Exactly `+2%` is `bull_trend`.
- Exactly `-2%` is `sideways`.
- Exactly `-4%` is `bear_trend`.
