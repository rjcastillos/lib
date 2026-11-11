# Nine-Candle Regime Breakout and Risk-Control Strategy

**Document ID:** TSW-9C-RB-001  
**Version:** 1.0  
**Status:** Research proposal; not validated for live trading  
**Type:** Deterministic daily-candle strategy specification  
**Field definitions:** [Candle field reference](../candlesticks/shapes/study/field-reference.md)  
**Related strategy:** [9-Candle Weighted Trading Decision Framework](./strategy_Nov26_1.md)  
**Decision record:** [Decision 0017](../../../copilot/decisions/0017-nine-candle-regime-breakout-proposal.md)

## 1. Purpose and limitations

This specification defines a testable strategy candidate using the nine most
recently completed candles, a long-term trend regime, breakout confirmation,
volatility-based risk, and staged profit taking. It defines exact decision and
order-handling rules; it does **not** establish that the strategy is
profitable.

The supplied NVDA history is one instrument, one daily timeframe, and one
historical market path. Thresholds are uncalibrated starting hypotheses.
Historical results must not be interpreted as a forecast or promise of
returns. Live deployment is prohibited until the risk configuration,
execution behavior, and independent out-of-sample validation are complete.

The “best price” cannot be known in advance. This specification uses a
conditional next-session entry and cancels entries after excessive gaps rather
than assuming a fill at the signal candle's close.

## 2. Market data and timing

The strategy requires:

- One ticker and one fixed timeframe per evaluation.
- Nine completed candles preceding the signal candle `t` for the breakout
  comparison, plus completed candle `t` itself.
- Valid OHLC on every candle used.
- `Atr`, `BodyAtr`, `CloseLocation`, `Ema50`, `Ema200`, and `Slope50` for the
  signal candle.
- `Rvol` when available.
- Chronological, unique candles with adequate indicator warm-up history.

The strategy intentionally does not score `Shape`, `Direction`,
`PredecessorPatternCode`, `OpenLocation`, or `Slope9`/`Slope20`; the breakout,
regime, body, and close-location conditions define the entry. Those fields may
be retained for audit and later ablation tests, but must not silently affect a
signal.

All price ratios and slopes follow the field reference: they are fractional
values, not values multiplied by 100. `BodyAtr` is normalized by the prior
candle's ATR; `Atr` is aligned with its own candle; `Rvol` compares current
volume with the immediately preceding nine bars.

At completed candle `t`:

- The signal uses data through `t`.
- The breakout range uses the nine candles immediately before `t`, excluding
  `t`.
- An approved entry is submitted for the next available tradable event. For
  daily data, the baseline backtest fill is the next session's open.
- A close-based signal is executed at the next available tradable event.
- No signal may use a still-forming candle or future data.

## 3. Regime and entry rules

### 3.1 Long setup

All of the following must be true at the close of candle `t`:

1. `Close(t) > Ema50(t) > Ema200(t)`.
2. `Slope50(t) > 0`.
3. `Close(t) > MAX(High(t-1) ... High(t-9))`.
4. `BodyAtr(t) >= 0.30`.
5. `CloseLocation(t) >= 0.70`.
6. If `Rvol(t)` is available, `Rvol(t) >= 0.80`.
7. The input, indicator-coverage, and account-risk gates pass.
8. There is no open position in this ticker.

### 3.2 Short setup

All of the following must be true at the close of candle `t`:

1. `Close(t) < Ema50(t) < Ema200(t)`.
2. `Slope50(t) < 0`.
3. `Close(t) < MIN(Low(t-1) ... Low(t-9))`.
4. `BodyAtr(t) >= 0.30`.
5. `CloseLocation(t) <= 0.30`.
6. If `Rvol(t)` is available, `Rvol(t) >= 0.80`.
7. Short trading is explicitly enabled, and borrow/locate and account-risk
   gates pass.
8. There is no open position in this ticker.

The initial configuration sets `short_enabled` to `false`. The longer NVDA
diagnostic produced few short setups, and the previous nine-candle strategy's
short signals were materially weaker than its long signals. Shorting must be
evaluated separately and enabled only after validation on independent data.

If RVOL is unavailable, the setup may pass with a `VOLUME_UNAVAILABLE`
warning; it must not be silently treated as evidence of high participation.
If RVOL is present but below `0.80`, reject the setup.

### 3.3 Entry price and gap control

Let `C = Close(t)`, `A = Atr(t)`, and `O = Open(t+1)`.

- Cancel either entry if `ABS(O - C) > 0.50 × A`.
- Otherwise submit the order at the next tradable event. The backtest baseline
  uses `O`; a live execution adapter must report actual fills.

The gap threshold is a provisional anti-chase rule, not a calibrated price
improvement guarantee. If the order cannot be filled within configured
spread/slippage limits, cancel it and return to flat.

Do not pyramid or add to a position. Permit at most one position per ticker.

## 4. Initial stop and position sizing

At signal time, calculate the initial stop distance:

```text
InitialStopDistance = 2.0 × Atr(t)
```

Use the estimated entry price `E`:

```text
LongInitialStop  = E - InitialStopDistance
ShortInitialStop = E + InitialStopDistance
R = InitialStopDistance
```

`R` is the initial per-unit price risk, before fees and slippage. Reject the
entry if ATR is missing, non-finite, zero, or if the stop cannot be placed.
Do not move a stop farther away to avoid a stop-out.

Calculate risk in account currency:

```text
PerUnitRisk =
    InitialStopDistance
    × ContractMultiplier
    × AccountCurrencyConversion
    + EstimatedRoundTripCostsPerUnit

MaximumRiskAmount = AccountEquity × RiskPerTrade
PositionSize = FLOOR_TO_LOT_INCREMENT(MaximumRiskAmount / PerUnitRisk)
```

Also enforce configured maximum exposure, portfolio risk, liquidity, spread,
slippage, and short-borrow constraints. Missing or invalid risk inputs reject
the entry. The example configuration leaves live risk values null; null
values mean that live entries are disabled. Fees, FX conversion, contract
specifications, and available stop-order types must be supplied by the
execution/risk layer.

The initial stop is active immediately after entry. Stop gaps fill at the
first available executable price, which may be worse than the stop. A stop
does not guarantee a maximum loss.

## 5. Profit taking and trailing protection

Targets are based on the initial `R` and entry fill `E`:

| Target | Long price | Short price | Action |
|---|---:|---:|---|
| T1 | `E + 1.5 × R` | `E - 1.5 × R` | Reduce 50% of original filled size |
| T2 | `E + 3.0 × R` | `E - 3.0 × R` | Reduce 25% of original filled size |
| Runner | No fixed target | No fixed target | Trail remaining 25% until stop or trend exit |

Percentages refer to the original filled size. Round reductions down to the
permitted lot increment; close any residual below the minimum lot at the next
valid target or exit.

After T1, move the stop on the remaining quantity to at least break-even after
estimated costs. After each subsequent completed candle, update a two-ATR
close-based trail for the next session only:

```text
LongTrailCandidate  = Close(t) - 2 × Atr(t)
LongStop(t+1)        = MAX(LongStop(t), BreakEvenPrice, LongTrailCandidate)

ShortTrailCandidate = Close(t) + 2 × Atr(t)
ShortStop(t+1)       = MIN(ShortStop(t), BreakEvenPrice, ShortTrailCandidate)
```

Never loosen a stop. A missing ATR does not loosen or remove an existing stop.
If the protective stop cannot be monitored or replaced, invoke the configured
emergency close and report `STOP_LOSS` with reason `STOP_EXECUTION_FAILURE`.

When daily OHLC cannot establish whether a stop or target occurred first, use
the conservative backtest convention: **stop first**. When both profit targets
are touched in one candle, execute only the next unfilled target for that
candle; do not assume an unknowable intrabar path or multiple favorable fills.
Target limit orders may fill at their target price; do not assume price
improvement on a gap.

## 6. Position exits, holds, and reversals

- **Long trend exit:** after a completed candle closes below `Ema50`, close
  remaining long quantity at the next tradable event.
- **Short trend exit:** after a completed candle closes above `Ema50`, close
  remaining short quantity at the next tradable event.
- **Stop:** an active protective stop closes all remaining quantity according
  to the stop execution policy, regardless of signal quality.
- **Reversal:** a valid opposite setup first closes the existing position.
  Verify the closing fill, then independently recheck the opposite entry's
  risk, gap, borrow, and order gates. If any gate fails, remain flat.
- **Hold:** if no stop, target, trend exit, risk veto, or approved reversal
  occurs, retain the position and active protective orders.
- **Maximum daily loss:** cancel pending entries, close open positions, and
  block new entries until the configured session reset. This is a risk action,
  not a candle prediction.

When data or coverage is invalid, do not create a score-driven entry, exit, or
reversal. Keep independently placed protective controls active. If existing
controls cannot be confirmed, request an emergency close rather than leaving
an unprotected position.

## 7. Required actions and output contract

Each evaluation returns exactly one primary `action`, with reason codes and
relevant prices/quantities. The event priority is:

1. A triggered protective stop (`STOP_LOSS`) or hard account-risk action.
2. A profit-target reduction already touched during the candle.
3. A valid strategy close or reversal.
4. A valid entry.
5. Hold the existing position, or remain flat.
6. If data or risk prevents an order, report `NO_TRADE` when flat; with an
   existing position, report `HOLD_LONG` or `HOLD_SHORT` while retaining
   independently working protective orders. If protection cannot be
   confirmed, report `STOP_LOSS` and request emergency closure.

An entry response includes target levels as fields in the response; this does
not create a second simultaneous primary action. Use
`PROFIT_TAKER_TARGETS` when target levels are first published or revised
without a higher-priority order action.

Actions mean:

| Action | Meaning |
|---|---|
| `OPEN_LONG` | Submit a risk-approved long entry after the long setup |
| `OPEN_SHORT` | Submit a risk-approved short entry after the enabled short setup |
| `HOLD_LONG` | Retain a long position and its protective orders |
| `HOLD_SHORT` | Retain a short position and its protective orders |
| `CLOSE_LONG` | Close a long for a strategy exit, daily-loss limit, or rejected reversal |
| `CLOSE_SHORT` | Close a short for a strategy exit, daily-loss limit, or rejected reversal |
| `REDUCE_LONG_BASED_IN_PROFIT_TAKER` | Reduce the specified long quantity at T1 or T2 |
| `REDUCE_SHORT_BASED_IN_PROFIT_TAKER` | Reduce the specified short quantity at T1 or T2 |
| `REVERSE_TO_LONG` | Close short, verify fill, then separately approve/open long |
| `REVERSE_TO_SHORT` | Close long, verify fill, then separately approve/open short |
| `REMAIN_FLAT` | Valid evaluation; no entry condition |
| `NO_TRADE` | Invalid/incomplete data, failed coverage, failed risk, or unavailable configuration prevents a new order |
| `STOP_LOSS` | Protective stop or emergency risk close triggered; include fill and reason |
| `PROFIT_TAKER_TARGETS` | Publish active T1/T2 prices, remaining size, and stop; not itself an order |

Example response:

```json
{
  "strategy": "TSW-9C-RB-001",
  "version": "1.0",
  "ticker": "NVDA",
  "timeframe": "1d",
  "signal_candle_date": "YYYY-MM-DD",
  "action": "OPEN_LONG",
  "reason_codes": ["LONG_REGIME", "NINE_BAR_BREAKOUT", "RISK_APPROVED"],
  "entry": {
    "order_timing": "NEXT_TRADABLE_EVENT",
    "maximum_gap_atr": 0.5,
    "estimated_entry_price": 101.0,
    "filled_average_price": 101.0,
    "position_size": 10.0,
    "execution_status": "FILLED"
  },
  "risk": {
    "initial_stop": 97.0,
    "initial_risk_per_unit": 4.0
  },
  "profit_taker_targets": {
    "t1_price": 107.0,
    "t1_reduce_original_fraction": 0.5,
    "t2_price": 113.0,
    "t2_reduce_original_fraction": 0.25
  },
  "data_quality": {
    "status": "OK",
    "warnings": []
  }
}
```

For `HOLD_*`, `REDUCE_*`, `STOP_LOSS`, and `PROFIT_TAKER_TARGETS`, include
current position size, remaining size, active stop, and target fill state.
Never return an order-shaped success when risk approval or execution failed.

## 8. Evaluation pseudocode

```text
evaluate(candles, position, config):
    if protectiveStopTriggered:
        close remaining quantity at the stop execution price
        return STOP_LOSS

    if dailyLossLimitReached:
        cancelPendingEntries()
        if position is LONG:
            return CLOSE_LONG with reason DAILY_LOSS_LIMIT
        if position is SHORT:
            return CLOSE_SHORT with reason DAILY_LOSS_LIMIT
        return NO_TRADE with reason DAILY_LOSS_LIMIT

    if candleDataInvalid or indicatorCoverageInsufficient:
        if position is FLAT:
            return NO_TRADE
        if protectiveOrdersCannotBeConfirmed:
            requestEmergencyClose()
            return STOP_LOSS
        return HOLD_LONG or HOLD_SHORT with a data warning

    updatePositionStopsAndCheckTargetsUsingConservativeIntrabarPriority()
    if a stop filled:
        return STOP_LOSS
    if a profit target filled:
        return REDUCE_LONG_BASED_IN_PROFIT_TAKER
               or REDUCE_SHORT_BASED_IN_PROFIT_TAKER

    computeRegimeAndNineBarBreakoutUsingCompletedCandles()
    if a trend exit is confirmed:
        if an opposite setup is valid and enabled:
            close current side, verify fill, then separately recheck risk
            return REVERSE_TO_LONG or REVERSE_TO_SHORT
        return CLOSE_LONG or CLOSE_SHORT

    if position is FLAT and a setup is valid:
        if the next-event gap exceeds 0.50 × signal ATR:
            return REMAIN_FLAT
        if risk, execution, and (for shorts) borrow checks pass:
            submit entry and protective stop
            return OPEN_LONG or OPEN_SHORT with target levels
        return NO_TRADE

    if position is LONG:
        return HOLD_LONG with active stop and target state
    if position is SHORT:
        return HOLD_SHORT with active stop and target state
    return REMAIN_FLAT
```

## 9. Initial configuration

| Parameter | Initial value | Status |
|---|---:|---|
| Breakout lookback | 9 prior completed candles | Fixed candidate rule |
| Entry body threshold | `BodyAtr >= 0.30` | Hypothesis |
| Entry close location | `>= 0.70` long; `<= 0.30` short | Hypothesis |
| RVOL minimum | `0.80` when available | Hypothesis |
| Initial stop | `2.0 × Atr(t)` | Uncalibrated |
| Entry gap limit | `0.50 × Atr(t)` | Uncalibrated |
| First target | `1.5R`, reduce 50% original size | Uncalibrated |
| Second target | `3.0R`, reduce 25% original size | Uncalibrated |
| Trail | `2.0 × Atr` from completed close after T1 | Uncalibrated |
| Short trading | Disabled | Re-enable only after separate validation |
| Risk per trade | `null` | Must be configured; otherwise no live trading |
| Max exposure / daily loss / portfolio risk | `null` | Must be configured; otherwise no live trading |

No values in this table are presented as optimized or proven profitable.

Example research configuration:

```json
{
  "strategy": "TSW-9C-RB-001",
  "version": "1.0",
  "breakout_lookback": 9,
  "body_atr_min": 0.30,
  "close_location_long_min": 0.70,
  "close_location_short_max": 0.30,
  "rvol_min_when_available": 0.80,
  "maximum_entry_gap_atr": 0.50,
  "initial_stop_atr": 2.0,
  "target_1_r": 1.5,
  "target_1_original_fraction": 0.50,
  "target_2_r": 3.0,
  "target_2_original_fraction": 0.25,
  "trail_atr_after_target_1": 2.0,
  "short_enabled": false,
  "risk_per_trade": null,
  "max_exposure": null,
  "max_daily_loss": null
}
```

## 10. Diagnostic study and interpretation

The longer available study contains 1,724 daily NVDA rows from 2020-01-02
through 2026-11-10. It is one asset and one timeframe, not a broad sample.
Strategy-relevant fields include:

- Price and candle geometry: OHLC, `Direction`, `CloseLocation`, and
  `PredecessorPatternCode`.
- Volatility and participation: `Atr`, `BodyAtr`, and `Rvol`.
- Trend: `Ema50`, `Ema200`, and `Slope50`.

An exploratory event study applying the regime and nine-bar breakout
conditions in Sections 3.1-3.2 found 95 setups (85 long, 10 short) when RVOL
was required to be at least `0.80` when available. It measured directional
returns from the next session's open to the close 1, 5, and 10 sessions later,
without exits or costs:

| Horizon | Setups | Directional win rate | Mean directional return |
|---|---:|---:|---:|
| 1 session | 95 | 46.3% | -0.21% |
| 5 sessions | 95 | 56.8% | +0.70% |
| 10 sessions | 95 | 55.8% | +2.27% |

The ten-session event windows overlap substantially; this table is descriptive
only. Performance varied by period: mean ten-session directional return was
approximately +1.76% for 2020-2023 (54 setups), +3.93% for 2024-2025 (33), and
-1.13% for 2026 through November 10 (8). This instability does not support a
profitability claim. It supports keeping short trading disabled by default
and testing the long setup further; it does not prove that long trading is
profitable.

This event study is not a full strategy backtest: it does not model stop/target
ordering, staged fills, position sizing, risk limits, fees, spread, slippage,
tax, financing, borrow, or portfolio interactions. The period through
November 10, 2026 has already been inspected and is **not** an untouched
out-of-sample test. No strategy parameter should be selected because it
improves these in-sample figures.

## 11. Validation plan and promotion gates

Before asserting predictive or economic value:

1. Freeze this version and configuration before opening a genuinely unseen
   chronological test period.
2. Test multiple tickers, asset types, and timeframes with adequate OHLCV and
   realistic survivorship and corporate-action handling.
3. Reproduce actual decision timing and next-event fills. Model spread, fees,
   slippage, gaps, borrow, rejected/partial fills, stop priority, and target
   execution conservatively.
4. Report gross and net results, event hit rates with uncertainty, per-trade
   expectancy, annualized return, maximum drawdown, exposure, turnover, trade
   count, holding duration, and long/short results separately.
5. Compare against same-period buy-and-hold, always-long, breakout-only, and
   no-signal baselines with exposure stated.
6. Use chronological train/validation/test splits and walk-forward evaluation.
   Never tune against the final test period.
7. Perform component ablations and parameter-neighborhood sensitivity tests.
   Include non-overlapping event windows or block-bootstrap uncertainty;
   overlapping forward returns are not independent samples.
8. Paper-trade with live quotes and actual order/stop handling before any
   controlled deployment.

Promotion requires robust positive **net** expectancy across multiple
out-of-sample periods and instruments, acceptable drawdown under the approved
risk budget, and no dependence on one narrow parameter setting. Until those
criteria pass, label every strategy output `RESEARCH_ONLY` and do not
authorize live orders.

## 12. Reason codes

Use reason codes including:

- `DATA_VALIDATION_FAILED`
- `INSUFFICIENT_HISTORY`
- `INDICATOR_UNAVAILABLE`
- `LOW_COMPONENT_COVERAGE`
- `LONG_REGIME`
- `SHORT_REGIME`
- `NINE_BAR_BREAKOUT`
- `BODY_TOO_SMALL`
- `CLOSE_LOCATION_NOT_CONFIRMED`
- `VOLUME_TOO_LOW`
- `VOLUME_UNAVAILABLE`
- `ENTRY_GAP_TOO_LARGE`
- `RISK_CONFIGURATION_INVALID`
- `RISK_LIMIT_EXCEEDED`
- `SHORT_DISABLED`
- `BORROW_UNAVAILABLE`
- `TREND_EXIT`
- `PROFIT_TARGET_1`
- `PROFIT_TARGET_2`
- `STOP_TRIGGERED`
- `STOP_EXECUTION_FAILURE`
- `DAILY_LOSS_LIMIT`
- `NO_SETUP`
