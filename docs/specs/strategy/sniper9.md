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

- `ticker`
- `date`
- `time`
- `open`
- `high`
- `low`
- `close`
- `direction`
- `shape`
- `range`
- `body`
- `upper_wick`
- `lower_wick`
- `body_percent`
- `upper_wick_percent`
- `lower_wick_percent`
- `predecessor_high_relation`
- `predecessor_low_relation`
- `predecessor_pattern_code`
- `predecessor_pattern_name`
- `predecessor_status`
- `open_location`
- `close_location`
- `magnitude`
- `relative_open_percent`
- `relative_open_range_percent`
- `relative_open_upper_wick_percent`
- `relative_open_lower_wick_percent`
- `body_atr`
- `range_atr`
- `upper_wick_atr`
- `lower_wick_atr`
- `rvol`
- `ema9`
- `sma20`
- `ema50`
- `ema100`
- `ema200`
- `slope9`
- `slope20`
- `slope50`
- `slope200`
- `volume`



