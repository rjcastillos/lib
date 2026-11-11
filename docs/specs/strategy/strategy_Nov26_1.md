# 9-Candle Weighted Trading Decision Framework
## Complete Technical Specification

**Document ID:** TSW-9C-001  
**Version:** 3.1<br>
**Status:** Proposed implementation specification  
**Classification:** Deterministic, rule-based trading strategy  
**Input reference:** `field-reference.md`  
**Base strategy:** `strategy_Nov26_1.md`

---

# 1. Purpose

The purpose of this specification is to define a deterministic trading decision system that evaluates the nine most recently completed candles and produces a trading action based on:

1. Market structure.
2. Candle strength.
3. Volume participation.
4. Trend alignment.
5. Candle closing location.
6. Market volatility.
7. Current portfolio position.
8. Entry and exit conditions.
9. Risk-management constraints.

The system must produce exactly one primary action per evaluation:

- `OPEN_LONG`
- `OPEN_SHORT`
- `HOLD_LONG`
- `HOLD_SHORT`
- `CLOSE_LONG`
- `CLOSE_SHORT`
- `REVERSE_TO_LONG`
- `REVERSE_TO_SHORT`
- `REMAIN_FLAT`
- `NO_TRADE`

The strategy intentionally supports independent long and short configurations. However, the initial configuration uses symmetrical directional thresholds until empirical testing demonstrates that asymmetric parameters improve performance.

## 1.1 Design principles

The implementation must follow these principles:

- Deterministic: identical inputs and configuration must produce identical outputs.
- Explainable: every score and decision must be traceable to its inputs.
- Non-repainting: only completed candles may influence a decision.
- Risk-first: risk controls may veto any entry or reversal.
- Explicit: missing, invalid and unavailable values must never be silently interpreted as zero.
- Modular: market analysis, trading decisions and risk management must be independent components.
- Auditable: every decision must retain its score breakdown and reason codes.

# 2. System architecture

The strategy consists of three independent layers.

## 2.1 Layer 1 — Market Analysis Engine

Evaluates the nine-candle window and calculates:

- Market structure score.
- Candle body strength score.
- Volume-adjusted candle strength.
- Close-location score.
- Trend alignment score.
- Weighted bullish pressure.
- Weighted bearish pressure.
- Net score.
- Directional balance.
- Evidence strength.

Output: `MarketAnalysisResult`.

## 2.2 Layer 2 — Trading Decision Engine

Receives the market analysis and evaluates:

- Current position.
- Market bias.
- Entry confirmation.
- Exit conditions.
- Reversal conditions.
- Trading state transitions.

Output: `TradingDecision`.

## 2.3 Layer 3 — Risk Management Engine

Evaluates:

- Available account equity.
- Permitted monetary risk.
- Position size.
- Stop-loss distance.
- Maximum exposure.
- Daily loss limits.
- Execution constraints.

Output: `RiskDecision`.

The final trading action is permitted only when all applicable conditions pass.

# 3. Input data specification

The input data must follow the definitions in `field-reference.md`.

## 3.1 Required candle fields

| Field | Type | Purpose |
|---|---|---|
| `Ticker` | String | Instrument identifier |
| `Date` | Date | Candle date |
| `Time` | Time/null | Candle start time |
| `Open` | Decimal | Opening price |
| `High` | Decimal | Highest price |
| `Low` | Decimal | Lowest price |
| `Close` | Decimal | Closing price |
| `Direction` | Enum | bullish, bearish, neutral |
| `BodyAtr` | Decimal/null | ATR-normalized candle body |
| `PredecessorPatternCode` | String/null | Market structure |
| `PredecessorStatus` | Enum | Validity of predecessor comparison |
| `CloseLocation` | Decimal/null | Closing position within candle |
| `Rvol` | Decimal/null | Relative volume |
| `Atr` | Decimal/null | Average true range |
| `Slope9` | Decimal/null | EMA9 slope |
| `Slope20` | Decimal/null | SMA20 slope |
| `Slope50` | Decimal/null | EMA50 slope |

Additional fields such as `RangeAtr`, `Magnitude`, `Ema9`, `Sma20` and `Ema50` may be retained for diagnostics and future extensions.

## 3.2 Field interpretation

All ratios and percentage-based fields must use the conventions in `field-reference.md`.

Examples:

- `Slope9 = 0.04` means a 4% fractional change.
- `CloseLocation = 0.80` means the candle closed 80% of the way from its low to its high.
- `BodyAtr = 1.20` means the body is 1.2 times the previous candle's ATR.
- `Rvol = 1.50` means volume is 150% of the preceding nine-bar average.

The implementation must not multiply these values by 100 before scoring.

## 3.3 Candle window

The evaluation window consists of nine completed candles:

| Identifier | Description | Weight |
|---|---|---:|
| T-1 | Most recent completed candle | 9 |
| T-2 | Previous completed candle | 8 |
| T-3 | Third most recent | 7 |
| T-4 | Fourth most recent | 6 |
| T-5 | Fifth most recent | 5 |
| T-6 | Sixth most recent | 4 |
| T-7 | Seventh most recent | 3 |
| T-8 | Eighth most recent | 2 |
| T-9 | Oldest candle in evaluation | 1 |

Total weight = 45.

The candle T-10 must also be available for calculating the predecessor relationship of T-9.

The indicator calculations must have sufficient historical warm-up data. Missing indicator history must not be interpreted as a zero value.

# 4. Data validation

Validation must occur before scoring.

## 4.1 Structural validation

Verify:

1. All nine candles belong to the same ticker.
2. All nine candles use the same timeframe.
3. Candles are chronologically ordered.
4. No candle is duplicated.
5. OHLC values are valid.
6. All nine candles are completed.
7. The predecessor relationship is valid where required.
8. Numeric fields contain finite values.

OHLC validation:

- `High >= Open`
- `High >= Close`
- `Low <= Open`
- `Low <= Close`
- `High >= Low`

## 4.2 Data-quality statuses

| Status | Meaning |
|---|---|
| `OK` | All required data is valid |
| `INSUFFICIENT_DATA` | Insufficient historical records |
| `INVALID_DATA` | One or more invalid records |
| `INCOMPLETE_CANDLE` | A candle is still forming |
| `INDICATOR_UNAVAILABLE` | Required indicator history is unavailable |

An invalid evaluation must not produce an opening or reversal order.

## 4.3 Missing optional data

The following policies apply:

- Missing `Rvol`: use multiplier 1.00 and record a warning.
- Missing `PredecessorPatternCode`: structure component unavailable.
- Missing `CloseLocation`: location component unavailable.
- Missing `BodyAtr`: candle-strength component unavailable.
- Missing any required slope: trend component unavailable.

Unavailable components must not be silently treated as neutral evidence.

The system must calculate component coverage and apply the configured minimum coverage thresholds.

Recommended initial configuration:

- At least 8 of 9 valid structure observations.
- At least 8 of 9 valid body observations.
- At least 8 of 9 valid location observations.
- At least 8 of 9 valid trend observations.

RVOL may be unavailable without invalidating the entire evaluation.

These coverage values are proposed defaults and must be configurable.

If any minimum is not met, the final action is `NO_TRADE`.

`NO_TRADE` means that no new strategy order is authorized; it does not mean
that an existing position is closed or that its protective orders are removed.
When candle data is invalid or component coverage fails, do not derive a
market-driven exit or reversal from the incomplete analysis. Preserve the
current position and keep its independently configured protective stops and
account-level risk controls active. Those controls may still require a
risk-driven close through the execution layer.
If a required protective control is missing or cannot be monitored, the risk
layer must request closure and report `STOP_EXECUTION_FAILURE`; `NO_TRADE`
must not leave an unprotected position unmanaged.

The evidence gate applies to new entries and reversals. When input data and
component coverage are valid but the evidence gate fails, do not open or
reverse. Continue to evaluate an existing position against its holding
threshold; close it if that threshold is breached, otherwise hold it.

# 5. Market Analysis Engine

## 5.1 Component architecture

For each candle, calculate:

```text
StructureScore
BodyScore
VolumeMultiplier
VolumeAdjustedBodyScore
LocationScore
TrendScore
```

The final candle score is:

```text
CandleScore =
    StructureScore
    + VolumeAdjustedBodyScore
    + LocationScore
    + TrendScore
```

The weighted contribution is:

```text
WeightedContribution =
    CandleScore × CandleWeight
```

Each component is calculated independently before aggregation.

# 6. Market Structure Scoring

Use `PredecessorPatternCode`.

Only records with:

```text
PredecessorStatus = OK
```

are eligible for structure scoring.

## 6.1 Structure scoring table

| Pattern | Score | Interpretation |
|---|---:|---|
| HH-HL | +4 | Strong bullish structure |
| LH-HL | +2 | Weak bullish structure |
| LH-LL | -4 | Strong bearish structure |
| HH-LL | -2 | Weak bearish structure |
| EH-HL | +2 | Equal high, higher low |
| HH-EL | +2 | Higher high, equal low |
| LH-EL | -2 | Lower high, equal low |
| EH-LL | -2 | Equal high, lower low |
| EH-EL | 0 | No directional structural change |

The equal-high/equal-low extensions are proposed rules because the original strategy did not define their scores.

Any other code must be treated as unavailable and flagged for review.

## 6.2 Interpretation

- HH-HL indicates bullish structural continuation.
- LH-HL indicates improving lows but weaker highs.
- LH-LL indicates bearish structural continuation.
- HH-LL indicates weakening lows despite higher highs.

These patterns provide directional evidence. They are not independent entry triggers.

# 7. Candle Strength Scoring

Candle strength is based on:

- `Direction`
- `BodyAtr`

## 7.1 Bullish candles

| BodyAtr | Score |
|---|---:|
| >= 1.00 | +3 |
| >= 0.60 and < 1.00 | +2 |
| >= 0.30 and < 0.60 | +1 |
| < 0.30 | 0 |

## 7.2 Bearish candles

| BodyAtr | Score |
|---|---:|
| >= 1.00 | -3 |
| >= 0.60 and < 1.00 | -2 |
| >= 0.30 and < 0.60 | -1 |
| < 0.30 | 0 |

Neutral candles receive zero.

Invalid or missing `BodyAtr` values must be marked unavailable.

The score represents directional body strength relative to volatility, not total candle range.

# 8. Volume Participation

Volume modifies the candle body strength only.

Use `Rvol`.

## 8.1 RVOL multiplier

| Rvol | Multiplier |
|---|---:|
| > 1.50 | 1.50 |
| > 1.20 and <= 1.50 | 1.25 |
| >= 0.80 and <= 1.20 | 1.00 |
| < 0.80 | 0.75 |

## 8.2 Calculation

```text
VolumeAdjustedBodyScore =
    BodyScore × VolumeMultiplier
```

Example:

```text
Direction = bullish
BodyAtr = 1.20
Rvol = 1.60

BodyScore = +3
VolumeMultiplier = 1.50

VolumeAdjustedBodyScore = +4.50
```

If RVOL is unavailable:

```text
VolumeMultiplier = 1.00
```

The missing volume confirmation must be reported.

RVOL must not multiply the entire candle score.

# 9. Candle Close Location

Use `CloseLocation`.

This component measures the position of the closing price within the candle range.

## 9.1 Scoring

| CloseLocation | Score |
|---|---:|
| >= 0.70 | +1 |
| > 0.30 and < 0.70 | 0 |
| <= 0.30 | -1 |

Invalid values outside `[0,1]` are unavailable.

A zero-range candle must not generate a location score.

This component provides confirmation but must not dominate the overall strategy.

# 10. Trend Alignment

Use:

- `Slope9`
- `Slope20`
- `Slope50`

The original strategy assigns increasing importance to longer-term slopes.

A configurable deadband is introduced to avoid treating negligible changes as meaningful.

## 10.1 Trend thresholds

Define:

```text
SlopeEpsilon = configurable fractional threshold
```

Initial default:

```text
SlopeEpsilon = 0
```

## 10.2 Scoring table

| Indicator | Positive slope | Negative slope |
|---|---:|---:|
| Slope9 | +1 | -1 |
| Slope20 | +2 | -2 |
| Slope50 | +3 | -3 |

Rules:

```text
If Slope > +SlopeEpsilon:
    Apply positive score

If Slope < -SlopeEpsilon:
    Apply negative score

Otherwise:
    Score = 0
```

Trend score:

```text
TrendScore =
    Slope9Score
    + Slope20Score
    + Slope50Score
```

A missing slope must be marked unavailable.

# 11. Nine-Candle Aggregation

## 11.1 Candle score

For each candle:

```text
CandleScore =
    StructureScore
    + VolumeAdjustedBodyScore
    + LocationScore
    + TrendScore
```

## 11.2 Weighted contribution

```text
WeightedContribution =
    CandleScore × CandleWeight
```

## 11.3 Bullish pressure

```text
BullPressure =
    SUM(MAX(WeightedContribution, 0))
```

## 11.4 Bearish pressure

```text
BearPressure =
    SUM(ABS(MIN(WeightedContribution, 0)))
```

## 11.5 Total pressure

```text
TotalPressure =
    BullPressure + BearPressure
```

## 11.6 Net score

```text
NetScore =
    BullPressure - BearPressure
```

## 11.7 Directional balance

```text
DirectionalBalance =
    NetScore / TotalPressure
```

If `TotalPressure = 0`:

```text
DirectionalBalance = 0
```

Directional balance is constrained to:

```text
-1.00 <= DirectionalBalance <= +1.00
```

**Important:** Directional balance is not a statistical probability or probability of profit. It expresses the relative balance of bullish and bearish scored evidence.

# 12. Evidence Strength

A high directional balance does not necessarily indicate sufficient evidence.

Example:

A single small bullish contribution with no other activity can produce a directional balance of +1.

To prevent this, introduce an independent evidence-strength gate.

## 12.1 Maximum theoretical pressure

Under the proposed component weights:

```text
MaximumStructureScore = 4
MaximumBodyScore = 3 × 1.50 = 4.50
MaximumLocationScore = 1
MaximumTrendScore = 6

MaximumCandleScore = 15.50
```

Across the nine weighted candles:

```text
MaximumTotalPressure = 15.50 × 45

MaximumTotalPressure = 697.50
```

## 12.2 Minimum evidence

Introduce:

```text
MinimumEvidenceRatio
```

Proposed initial default:

```text
MinimumEvidenceRatio = 0.10
```

Calculate:

```text
EvidenceRatio =
    TotalPressure / 697.50
```

The evidence gate passes when:

```text
EvidenceRatio >= MinimumEvidenceRatio
```

This 10% threshold is a provisional engineering default, not an empirically validated trading threshold.

The maximum theoretical pressure must be recalculated if component weights or multipliers change.

# 13. Market Bias Classification

The original thresholds are retained as initial parameters.

| DirectionalBalance | Bias |
|---|---|
| >= +0.40 | STRONG_BULLISH |
| >= +0.20 and < +0.40 | WEAK_BULLISH |
| > -0.20 and < +0.20 | NEUTRAL |
| > -0.40 and <= -0.20 | WEAK_BEARISH |
| <= -0.40 | STRONG_BEARISH |

The classification is valid only when:

- Data quality passes.
- Minimum component coverage passes.
- Minimum evidence passes.

Otherwise:

```text
Bias = UNDEFINED
```

Do not open or reverse when bias is undefined. If the underlying candle data
and component coverage are valid, an existing position must still be managed
using its holding threshold as defined in Section 4.3. If data or coverage is
invalid, follow the protective-control policy in Section 4.3.

# 14. Entry Confirmation

A market bias alone is not sufficient to open a position.

The strategy uses a breakout confirmation to avoid entering solely because of a high aggregate score.

Only completed candles are used.

## 14.1 Long entry trigger

A long entry trigger occurs when:

```text
Close(T-1) > High(T-2)
```

Optional breakout buffer:

```text
LongBreakoutBuffer =
    Configurable ATR multiple
```

If enabled:

```text
Close(T-1) >
    High(T-2) + LongBreakoutBuffer × ATR(T-2)
```

The initial default buffer is zero.

A long position may be opened only when all conditions pass:

1. Bias = STRONG_BULLISH.
2. DirectionalBalance >= LongEntryThreshold.
3. Evidence gate passes.
4. Data-quality gate passes.
5. Long entry trigger is true.
6. Current position is FLAT.
7. Risk-management gate passes.

## 14.2 Short entry trigger

A short entry trigger occurs when:

```text
Close(T-1) < Low(T-2)
```

Optional breakout buffer:

```text
ShortBreakoutBuffer =
    Configurable ATR multiple
```

If enabled:

```text
Close(T-1) <
    Low(T-2) - ShortBreakoutBuffer × ATR(T-2)
```

A short position may be opened only when all conditions pass:

1. Bias = STRONG_BEARISH.
2. DirectionalBalance <= -ShortEntryThreshold.
3. Evidence gate passes.
4. Data-quality gate passes.
5. Short entry trigger is true.
6. Current position is FLAT.
7. Risk-management gate passes.

`LongEntryThreshold` is a positive directional-balance threshold, and
`ShortEntryThreshold` is its positive-magnitude counterpart. The configured
defaults are both `0.40`; the short comparison negates that magnitude. Do not
configure the short threshold as a signed negative value.

## 14.3 Execution timing

The strategy calculates signals after candle T-1 closes.

The default execution model is:

```text
Signal calculation: Close of T-1
Order execution: Next available tradable event
```

The backtest must not assume execution at the signal candle's closing price unless that execution is demonstrably achievable.

# 15. Position Management

## 15.1 Position states

The system supports exactly three position states:

```text
FLAT
LONG
SHORT
```

The current position must be supplied by the portfolio or execution system, not inferred from the market score.

## 15.2 Position-state transition matrix

The proposed exit policy introduces hysteresis:

- A long position is maintained while bullish balance remains at least +0.20.
- A short position is maintained while bearish balance remains at most -0.20.
- Strong opposite bias can trigger a reversal, subject to confirmation.
- Loss of the holding threshold triggers an exit.
- A reversal requires valid data, sufficient component coverage, a passing
  evidence gate, its entry trigger, and risk approval. If any reversal
  condition fails, evaluate the holding threshold and close to flat when it
  has been breached.

| Current position | Strong bullish | Weak bullish | Neutral | Weak bearish | Strong bearish |
|---|---|---|---|---|---|
| FLAT | OPEN_LONG* | REMAIN_FLAT | REMAIN_FLAT | REMAIN_FLAT | OPEN_SHORT* |
| LONG | HOLD_LONG | HOLD_LONG | CLOSE_LONG | CLOSE_LONG | REVERSE_TO_SHORT* |
| SHORT | REVERSE_TO_LONG* | CLOSE_SHORT | CLOSE_SHORT | HOLD_SHORT | HOLD_SHORT |

`*` Requires the appropriate entry trigger and risk approval.

This matrix is a proposed completion of the original strategy. It must be treated as a configurable exit policy.

## 15.3 Long exit

A long position is closed when:

```text
DirectionalBalance < LongHoldThreshold
```

Initial default:

```text
LongHoldThreshold = +0.20
```

A strong bearish signal may additionally qualify for reversal.

If the reversal trigger or risk approval fails, close the existing long and remain flat.

## 15.4 Short exit

A short position is closed when:

```text
DirectionalBalance > ShortHoldThreshold
```

Initial default:

```text
ShortHoldThreshold = -0.20
```

A strong bullish signal may additionally qualify for reversal.

If the reversal trigger or risk approval fails, close the existing short and remain flat.

## 15.5 Reversal execution

Reversals must be handled as two separate execution operations:

1. Close the existing position.
2. Verify the exit fill.
3. Re-evaluate the new entry's risk conditions.
4. Open the opposite position only if permitted.

If the exit succeeds but the new entry fails, the resulting state is FLAT.

Never assume that a reversal is a guaranteed atomic transaction.

# 16. Long/Short Asymmetry

The strategy permits independent long/short thresholds after validation.
Version 3.1 uses symmetrical entry and holding thresholds and one shared
minimum evidence threshold; the configuration does not define separate
long/short evidence minima.

Parameters:

```text
LongEntryThreshold
ShortEntryThreshold

LongHoldThreshold
ShortHoldThreshold

LongBreakoutBuffer
ShortBreakoutBuffer
```

Initial configuration:

```text
LongEntryThreshold = +0.40
ShortEntryThreshold = +0.40

LongHoldThreshold = +0.20
ShortHoldThreshold = -0.20
```

`ShortEntryThreshold` is a positive magnitude; the short-entry comparison is
`DirectionalBalance <= -ShortEntryThreshold`.

Independent parameters may be introduced after historical validation.

The implementation must not assume that long and short trading have equivalent profitability.

Evaluate separately:

- Long win rate.
- Short win rate.
- Long profit factor.
- Short profit factor.
- Long drawdown.
- Short drawdown.
- Average holding period.
- Transaction costs.
- Short availability and borrow costs, where applicable.

# 17. Risk Management Engine

Risk management is independent of the directional scoring model.

A market signal cannot override a risk veto.

## 17.1 Required parameters

| Parameter | Description |
|---|---|
| AccountEquity | Current account equity |
| RiskPerTrade | Maximum permitted account risk |
| MaxExposure | Maximum permitted exposure |
| MaxDailyLoss | Maximum permitted daily loss |
| MaxOpenPositions | Maximum number of concurrent positions |
| ATRStopMultiplier | ATR-based stop distance |
| MinimumStopDistance | Minimum permitted stop distance |
| MaximumStopDistance | Maximum permitted stop distance |
| ContractMultiplier | Instrument-specific value multiplier |
| AccountCurrencyConversion | Conversion from instrument P&L currency to account currency |
| EstimatedRoundTripCostsPerUnit | Estimated entry and exit costs per unit in account currency |

`RiskPerTrade` is a fraction of `AccountEquity`. `MaxExposure`,
`MaxDailyLoss`, and `EstimatedRoundTripCostsPerUnit` are denominated in
account currency; stop distances are denominated in instrument price units.
Exposure includes existing positions plus the proposed position, valued using
the estimated entry price, contract multiplier, and account-currency
conversion.
`MaxDailyLoss` includes realized and unrealized P&L and costs, and requires a
configured trading-session boundary and reset policy. `MaxOpenPositions` is a
positive integer. Account equity, current exposure, daily loss, and open
position count are runtime portfolio inputs, not fixed strategy constants.

All required risk and instrument parameters must be finite and configured
before an entry or reversal can be approved. `RiskPerTrade` must be greater
than zero and no greater than one; stop multipliers, contract multipliers,
exposure limits, equity and currency-conversion inputs must be valid and
positive where applicable. A missing or invalid required value rejects the
entry; it must not be defaulted to zero or bypassed.

## 17.2 Initial stop-loss

A configurable ATR-based stop is proposed.

Use the ATR aligned with the latest completed signal candle T-1. Calculate
the stop distance as `ATR(T-1) × ATRStopMultiplier`; it must be finite and
positive and fall within the configured minimum and maximum stop distances.
Reject the entry if it does not. Do not silently clamp the stop distance or
move the stop farther away to satisfy a limit.

Long:

```text
StopLoss = EstimatedEntryPrice - StopDistance
```

Short:

```text
StopLoss = EstimatedEntryPrice + StopDistance
```

The initial ATR multiplier must be calibrated.

The ATR and estimated entry price must be known at the time the order is
submitted. Never use future observations. A stop order is a risk control, not a
guaranteed fill price; gaps and execution failures can cause losses to exceed
the planned risk.

## 17.3 Position sizing

Calculate the maximum monetary risk:

```text
MaximumRiskAmount =
    AccountEquity × RiskPerTrade
```

Calculate per-unit stop risk in account currency, including contract
multiplier, currency conversion, and estimated round-trip fees and slippage:

```text
PerUnitRisk =
    ABS(EstimatedEntryPrice - StopLoss)
    × ContractMultiplier
    × AccountCurrencyConversion
    + EstimatedRoundTripCostsPerUnit
```

Then:

```text
PositionSize =
    MaximumRiskAmount /
    PerUnitRisk
```

Adjust the result for:

- Minimum lot size.
- Lot increments.
- Contract specifications.
- Currency conversion.
- Fees and expected slippage.

Round position size down to the permitted trading increment.

After fills, recompute exposure and planned stop risk using the actual average
fill. Reduce or close the position if permitted limits are exceeded. If the
venue or execution layer cannot place and monitor the configured protective
stop, live entry is not authorized. The execution layer must define handling
for stop gaps, rejected or partial orders, and stop replacement failures.

## 17.4 Risk vetoes

Reject new entries when:

- Stop-loss cannot be calculated.
- Position size is invalid.
- Maximum exposure would be exceeded.
- Daily loss limit has been reached.
- Maximum concurrent positions has been reached.
- Market liquidity is insufficient.
- Trading is suspended.
- Instrument is not available for the intended direction.
- Any required risk or instrument parameter is missing, invalid, or in the
  wrong currency or unit.

When `MaxDailyLoss` is reached, cancel pending entry orders, close any open
position, reject entries and reversals, and keep new entries disabled until
the configured session reset boundary. Report the risk action explicitly.

Output:

```text
RiskGate = REJECT
ReasonCode = RISK_CONFIGURATION_INVALID | RISK_LIMIT_EXCEEDED
```

For a flat position, a rejected entry produces `NO_TRADE`. For an existing
position, a rejected reversal must not prevent a required close: close the
existing side when its holding threshold or an independent risk control
requires it, and do not open the opposite side.

## 17.5 Additional execution protections

The implementation should support:

- Gap protection.
- Maximum spread.
- Maximum slippage.
- Rejected orders.
- Partial fills.
- Trading halts.
- Stop-loss execution failures.
- Maximum holding duration.
- Overnight exposure restrictions.

These controls are not calculated by the nine-candle score.

# 18. ATR and Volatility Management

`Atr` is used primarily for risk management and optional breakout buffers.

`RangeAtr` and `Magnitude` may be used for volatility diagnostics.

Recommended future enhancement:

Introduce a volatility regime classification:

- LOW_VOLATILITY
- NORMAL_VOLATILITY
- HIGH_VOLATILITY
- EXTREME_VOLATILITY

Any such classification must use explicitly configured thresholds and historical validation.

The initial version must not modify directional scores based on volatility regime unless this additional scoring behavior is separately specified and tested.

# 19. Final Decision Algorithm

The decision engine must follow this order:

```text
1. Evaluate independent, configured hard risk controls for existing
   positions. If one requires a close, issue the corresponding close action;
   candle-score gates cannot veto it.

2. Validate input data and verify nine completed candles.

3. If structural validation fails or component coverage is below minimum,
   prohibit new entries and reversals, preserve the current position, and
   return NO_TRADE. Keep independent protective orders and risk controls active.

4. Calculate component scores and coverage.

5. Calculate weighted contributions.

6. Calculate BullPressure.

7. Calculate BearPressure.

8. Calculate TotalPressure.

9. Calculate NetScore.

10. Calculate DirectionalBalance.

11. Calculate EvidenceRatio.

12. Determine data, coverage, and evidence gates.

13. Classify market bias. Evidence failure blocks entries and reversals, but
    does not skip holding-threshold exits for an existing position.

14. Read current portfolio position.

15. Evaluate entry triggers.

16. Evaluate exit conditions.

17. Evaluate reversal conditions.

18. Apply entry/reversal risk-management rules. A risk rejection blocks the
    new side; if an existing position's exit condition was met, close it and
    remain flat.

19. Generate exactly one primary action.

20. Record the full audit breakdown.
```

## 19.1 Decision pseudocode

```text
function evaluateStrategy(candles, currentPosition, config):

    if independentHardRiskControlRequiresClose(currentPosition):
        return riskDrivenCloseAction()

    validate(candles)

    if validationFailed:
        keepProtectiveControlsActive(currentPosition)
        return NO_TRADE

    analysis = calculateMarketAnalysis(candles, config)

    if analysis.coverageFailed:
        keepProtectiveControlsActive(currentPosition)
        return NO_TRADE

    entriesAllowed = analysis.evidenceGatePassed
    if entriesAllowed:
        bias = classifyBias(analysis.directionalBalance, config)
    else:
        bias = UNDEFINED

    longTrigger = evaluateLongTrigger(candles, config)
    shortTrigger = evaluateShortTrigger(candles, config)

    if currentPosition == FLAT:

        if entriesAllowed and bias == STRONG_BULLISH and longTrigger:
            if riskGatePasses(LONG):
                return OPEN_LONG
            return NO_TRADE

        if entriesAllowed and bias == STRONG_BEARISH and shortTrigger:
            if riskGatePasses(SHORT):
                return OPEN_SHORT
            return NO_TRADE

        return REMAIN_FLAT

    if currentPosition == LONG:

        if entriesAllowed and bias == STRONG_BEARISH:
            if shortTrigger and riskGatePasses(SHORT):
                return REVERSE_TO_SHORT

        if analysis.directionalBalance <
           config.LongHoldThreshold:
            return CLOSE_LONG

        return HOLD_LONG

    if currentPosition == SHORT:

        if entriesAllowed and bias == STRONG_BULLISH:
            if longTrigger and riskGatePasses(LONG):
                return REVERSE_TO_LONG

        if analysis.directionalBalance >
           config.ShortHoldThreshold:
            return CLOSE_SHORT

        return HOLD_SHORT
```

Execution failures, partial fills and risk-driven emergency exits must be handled by the execution and portfolio-management layer.

# 20. Configuration Specification

All thresholds must be externalized.

Suggested initial configuration:

```json
{
  "strategy": {
    "name": "9-Candle Weighted Trading Decision Framework",
    "version": "3.1",
    "window_size": 9,
    "use_completed_candles_only": true
  },
  "weights": {
    "T1": 9,
    "T2": 8,
    "T3": 7,
    "T4": 6,
    "T5": 5,
    "T6": 4,
    "T7": 3,
    "T8": 2,
    "T9": 1
  },
  "structure": {
    "HH-HL": 4,
    "LH-HL": 2,
    "LH-LL": -4,
    "HH-LL": -2,
    "EH-HL": 2,
    "HH-EL": 2,
    "LH-EL": -2,
    "EH-LL": -2,
    "EH-EL": 0
  },
  "body": {
    "strong_threshold": 1.0,
    "medium_threshold": 0.6,
    "weak_threshold": 0.3,
    "strong_score": 3,
    "medium_score": 2,
    "weak_score": 1
  },
  "volume": {
    "high_threshold": 1.5,
    "high_multiplier": 1.5,
    "medium_threshold": 1.2,
    "medium_multiplier": 1.25,
    "low_threshold": 0.8,
    "low_multiplier": 0.75,
    "default_multiplier": 1.0
  },
  "location": {
    "bullish_threshold": 0.7,
    "bearish_threshold": 0.3,
    "directional_score": 1
  },
  "trend": {
    "slope_epsilon": 0.0,
    "slope9_weight": 1,
    "slope20_weight": 2,
    "slope50_weight": 3
  },
  "decision": {
    "long_entry_threshold": 0.4,
    "short_entry_threshold": 0.4,
    "long_hold_threshold": 0.2,
    "short_hold_threshold": -0.2,
    "minimum_evidence_ratio": 0.1,
    "minimum_component_coverage": 8
  },
  "entry": {
    "long_breakout_buffer_atr": 0.0,
    "short_breakout_buffer_atr": 0.0
  },
  "risk": {
    "risk_per_trade": null,
    "atr_stop_multiplier": null,
    "minimum_stop_distance": null,
    "maximum_stop_distance": null,
    "max_exposure": null,
    "max_daily_loss": null,
    "max_open_positions": null
  }
}
```

Null risk parameters mean that live trading is not authorized until the risk
configuration is supplied. Runtime account values and instrument metadata,
including account equity, contract multiplier, and currency conversion, must
also be provided to the risk engine.

The configuration must be version-controlled and recorded with every evaluation.

# 21. Output Specification

Every evaluation must produce a structured result.

## 21.1 Required output

```json
{
  "ticker": "EXAMPLE",
  "timeframe": "DEFINED_TIMEFRAME",
  "evaluation_time": "ISO-8601",
  "strategy_version": "3.1",

  "data_quality": {
    "status": "OK",
    "valid_candle_count": 9,
    "component_coverage": {
      "structure": 9,
      "body": 9,
      "location": 9,
      "trend": 9,
      "volume": 9
    },
    "warnings": []
  },

  "scores": {
    "bull_pressure": 0.0,
    "bear_pressure": 0.0,
    "total_pressure": 0.0,
    "net_score": 0.0,
    "directional_balance": 0.0,
    "evidence_ratio": 0.0
  },

  "bias": "NEUTRAL",
  "current_position": "FLAT",

  "triggers": {
    "long_trigger": false,
    "short_trigger": false
  },

  "risk": {
    "status": "NOT_EVALUATED",
    "stop_loss": null,
    "position_size": null
  },

  "action": "REMAIN_FLAT",
  "reason_codes": []
}
```

Values are illustrative.

## 21.2 Per-candle audit record

The system must also preserve a detailed breakdown for every candle:

```json
{
  "candle": "T-1",
  "weight": 9,
  "structure_score": 4,
  "body_score": 3,
  "volume_multiplier": 1.5,
  "adjusted_body_score": 4.5,
  "location_score": 1,
  "trend_score": 6,
  "candle_score": 15.5,
  "weighted_contribution": 139.5
}
```

This breakdown is mandatory for debugging and performance analysis.

# 22. Reason Codes

Use standardized reason codes.

Examples:

| Code | Meaning |
|---|---|
| `DATA_VALIDATION_FAILED` | Input validation failed |
| `INSUFFICIENT_HISTORY` | Insufficient candles |
| `LOW_COMPONENT_COVERAGE` | Required component coverage failed |
| `LOW_EVIDENCE` | Evidence below minimum |
| `STRONG_BULLISH_BIAS` | Strong bullish bias |
| `STRONG_BEARISH_BIAS` | Strong bearish bias |
| `LONG_BREAKOUT_CONFIRMED` | Long trigger passed |
| `SHORT_BREAKDOWN_CONFIRMED` | Short trigger passed |
| `LONG_EXIT_THRESHOLD_BREACHED` | Long holding threshold breached |
| `SHORT_EXIT_THRESHOLD_BREACHED` | Short holding threshold breached |
| `RISK_LIMIT_EXCEEDED` | Risk veto |
| `RISK_CONFIGURATION_INVALID` | Required risk or instrument configuration is missing or invalid |
| `HARD_RISK_CONTROL_TRIGGERED` | Independent risk control requires position reduction or closure |
| `STOP_EXECUTION_FAILURE` | Protective stop could not be placed, monitored, or executed as specified |
| `POSITION_DATA_UNAVAILABLE` | Candle analysis is unavailable; existing protective controls remain active |
| `REVERSAL_ENTRY_REJECTED` | Opposite entry rejected |
| `NO_ENTRY_TRIGGER` | Bias present but trigger absent |
| `VOLUME_UNAVAILABLE` | Volume confirmation unavailable |

Multiple reason codes may be returned, but only one primary action is allowed.

# 23. Backtesting and Validation

The proposed scoring values and thresholds must be treated as hypotheses.

## 23.1 Historical testing

Use historical candle data with sufficient warm-up periods.

The backtest must reproduce the exact production logic.
Record the strategy version, input data, configuration, signal timestamp,
execution timestamp and fill model so results are reproducible. Compare results
over the same dates and execution assumptions against buy-and-hold and simple
directional baselines. Report return both gross and net of costs, as well as
market exposure, turnover and trade count; make exposure differences explicit
when comparing strategies.

Include:

- Trading fees.
- Spread.
- Slippage.
- Borrow costs where applicable.
- Contract specifications.
- Trading hours.
- Execution delays.
- Stop-loss gaps.
- Rejected and partially filled orders.

## 23.2 Data partitioning

Use chronological separation:

1. Training period.
2. Validation period.
3. Final out-of-sample test period.

Do not randomly shuffle time-series observations.

Do not repeatedly optimize against the final test period.
Choose thresholds and component weights using training data only. Use
validation data for model selection, then evaluate the frozen configuration
once on the final out-of-sample period. Include multiple instruments,
timeframes and market regimes before claiming generalization. The supplied
225-row NVDA daily fixture is suitable only for code-path diagnostics; it is
not sufficient to calibrate parameters or establish predictive performance.

## 23.3 Performance metrics

Report:

- Total net return.
- Annualized return.
- Maximum drawdown.
- Sharpe ratio.
- Sortino ratio.
- Profit factor.
- Win rate.
- Average winning trade.
- Average losing trade.
- Number of trades.
- Average holding period.
- Market exposure.
- Long performance.
- Short performance.
- Performance by volatility regime.

## 23.4 Robustness testing

Test:

- Different instruments.
- Different timeframes.
- Trending markets.
- Sideways markets.
- High-volatility periods.
- Low-volatility periods.
- Different trading sessions.
- Small changes to score thresholds.
- Small changes to component weights.

A strategy that performs well only under one narrow parameter combination must be treated as overfit.

Because structure, body, location and moving-average slopes can encode
overlapping price information, also perform component-ablation tests. Compare
the full strategy with variants that remove one component at a time, and
retain a component only when its incremental out-of-sample value is robust to
costs and small parameter changes. Inspect turnover and holding duration when
adjusting exit thresholds; do not select thresholds solely to improve the
final test period.

## 23.5 Deployment sequence

Recommended deployment:

1. Unit tests.
2. Historical backtesting.
3. Walk-forward validation.
4. Paper trading.
5. Controlled live deployment.
6. Periodic performance review.

# 24. Acceptance Criteria

The implementation is considered technically complete when all the following conditions are satisfied:

1. Nine completed candles are evaluated in the correct order.
2. All input fields are interpreted according to `field-reference.md`.
3. Every scoring component is deterministic.
4. All score boundaries are explicitly defined.
5. Missing values are handled according to the specification.
6. Weighted contributions are calculated correctly.
7. Directional balance is bounded between -1 and +1.
8. Evidence strength is calculated independently.
9. Market bias is classified correctly.
10. Long and short triggers are independently evaluated.
11. Current portfolio position influences the action.
12. Every possible position state has a defined transition.
13. Reversals follow the required execution sequence.
14. Risk controls can veto an entry.
15. Every output contains a reason code.
16. Every output has an auditable per-candle score breakdown.
17. Identical inputs and configuration produce identical decisions.
18. Invalid data and low evidence follow the distinct position-management
    policies specified in Sections 4.3 and 19.
19. Short-entry threshold configuration and comparison use one consistent
    positive-magnitude convention.
20. Entry and reversal approval requires valid risk configuration, stop
    distance, sizing, and executable protective-stop handling.

Technical completion does not establish a profitable strategy. Live use is
not authorized until the frozen configuration has passed cost-aware,
chronological out-of-sample and walk-forward validation and the required
execution and account-risk parameters are configured.

# 25. Required Unit Tests

The implementation must include at least the following scenarios.

| Test | Scenario | Expected result |
|---|---|---|
| UT-001 | All nine candles strongly bullish | Strong bullish bias, subject to evidence gate |
| UT-002 | All nine candles strongly bearish | Strong bearish bias, subject to evidence gate |
| UT-003 | Equal bullish and bearish pressure | Neutral bias |
| UT-004 | Zero total pressure | Neutral bias, no entry |
| UT-005 | Very low total pressure | NO_TRADE |
| UT-006 | Missing required slope | Coverage failure or unavailable evaluation |
| UT-007 | Missing RVOL | Default multiplier and warning |
| UT-008 | Invalid OHLC | INVALID_DATA |
| UT-009 | Incomplete latest candle | INCOMPLETE_CANDLE |
| UT-010 | Long bias with no breakout | No new long |
| UT-011 | Strong bullish bias with breakout and flat position | OPEN_LONG if risk passes |
| UT-012 | Strong bearish bias with breakdown and flat position | OPEN_SHORT if risk passes |
| UT-013 | Existing long and weak bullish bias | HOLD_LONG |
| UT-014 | Existing long and neutral bias | CLOSE_LONG |
| UT-015 | Existing short and neutral bias | CLOSE_SHORT |
| UT-016 | Existing long and strong bearish bias with breakdown | REVERSE_TO_SHORT if risk passes |
| UT-017 | Existing short and strong bullish bias with breakout | REVERSE_TO_LONG if risk passes |
| UT-018 | Risk gate rejects entry | NO_TRADE |
| UT-019 | Reversal close succeeds but new entry fails | FLAT |
| UT-020 | Exact threshold boundaries | Correct classification according to inclusive/exclusive rules |
| UT-021 | Positive short threshold configuration | Short entry requires `DirectionalBalance <= -ShortEntryThreshold` |
| UT-022 | Invalid data with an open position | No market-driven order; protective controls remain active |
| UT-023 | Coverage failure with an open position | No market-driven order; protective controls remain active |
| UT-024 | Low evidence with an open position | No entry/reversal; holding-threshold exit still applies |
| UT-025 | Required risk parameter missing or invalid | Entry and reversal rejected |
| UT-026 | Stop distance outside configured bounds | Entry and reversal rejected without silently clamping |
| UT-027 | Risk stop gaps or fails to execute | Execution layer reports failure and applies configured recovery policy |
| UT-028 | Maximum daily loss reached with an open position | Close position, cancel pending entries, and block new entries until reset |

Boundary tests must also cover:

- `BodyAtr = 0.30`
- `BodyAtr = 0.60`
- `BodyAtr = 1.00`
- `Rvol = 0.80`
- `Rvol = 1.20`
- `Rvol = 1.50`
- `CloseLocation = 0.30`
- `CloseLocation = 0.70`
- `DirectionalBalance = -0.40`
- `DirectionalBalance = -0.20`
- `DirectionalBalance = +0.20`
- `DirectionalBalance = +0.40`

# 26. Outstanding Configuration Decisions

The following parameters must be confirmed for a production deployment:

| Parameter | Required decision |
|---|---|
| Instrument universe | Which instruments are traded? |
| Timeframe | Which candle duration is used? |
| Trading session | Regular session or extended session? |
| Entry execution | Next open, limit, market or other execution rule? |
| ATR stop multiplier | What stop distance is appropriate? |
| Risk per trade | What fraction of equity is permitted? |
| Maximum exposure | What is the permitted portfolio exposure? |
| Daily loss limit | What is the maximum daily loss? |
| Slope deadband | Should small slopes be treated as neutral? |
| Long/short asymmetry | Should thresholds differ after validation? |
| Evidence threshold | Is 10% sufficiently conservative? |
| Component coverage | Are 8 of 9 observations acceptable? |
| Holding policy | Are overnight positions allowed? |

These are configuration decisions rather than missing scoring formulas.

# 27. Final Implementation Recommendation

Implement the strategy as three independent modules:

**Module A — Market Analysis**

Input: Nine completed candles and required historical indicator data.

Output: Component scores, weighted scores, directional balance, evidence ratio and market bias.

**Module B — Trading Decisions**

Input: Market analysis, current position and entry/exit configuration.

Output: One deterministic trading action with reason codes.

**Module C — Risk and Execution**

Input: Trading action, portfolio information, market conditions and risk configuration.

Output: Approved or rejected order instructions and actual portfolio state.

The modules must not modify each other's intermediate calculations.

The scoring engine must remain independent of execution mechanics. The execution engine must remain authoritative about actual positions and fills.

---

# Appendix A — Important Formula Summary

For each candle:

```text
CandleScore =
    StructureScore
    + BodyScore × VolumeMultiplier
    + LocationScore
    + TrendScore
```

Weighted contribution:

```text
WeightedContribution =
    CandleScore × CandleWeight
```

Bullish pressure:

```text
BullPressure =
    SUM(MAX(WeightedContribution, 0))
```

Bearish pressure:

```text
BearPressure =
    SUM(ABS(MIN(WeightedContribution, 0)))
```

Total pressure:

```text
TotalPressure =
    BullPressure + BearPressure
```

Net score:

```text
NetScore =
    BullPressure - BearPressure
```

Directional balance:

```text
DirectionalBalance =
    NetScore / TotalPressure
```

Evidence ratio:

```text
EvidenceRatio =
    TotalPressure / 697.50
```

The evidence ratio formula assumes the component weights and multipliers specified in this version.

# Appendix B — Source Alignment and Proposed Changes

The following distinctions are important for maintaining traceability.

| Element | Origin |
|---|---|
| Nine-candle window | Original strategy |
| Recency weights 9 through 1 | Original strategy |
| HH-HL, LH-HL, LH-LL, HH-LL scores | Original strategy |
| BodyAtr scoring | Original strategy |
| RVOL multipliers | Original strategy |
| Slope9, Slope20, Slope50 weights | Original strategy |
| Bull/bear pressure and directional normalization | Original strategy |
| Initial directional thresholds | Original strategy |
| Positive-magnitude short-entry threshold configuration | Specification clarification |
| `BodyAtr` and `RangeAtr` use previous candle ATR | Field reference |
| RVOL uses preceding nine bars | Field reference |
| Slope units and lookback | Field reference |
| CloseLocation definition | Field reference |
| Equal-high/equal-low structure scores | Proposed extension |
| Close-location scoring | Proposed extension |
| Slope deadband | Proposed extension |
| Evidence-strength safeguard | Proposed extension |
| Breakout entry confirmation | Proposed extension |
| Position-state transition matrix | Proposed completion |
| Reversal execution sequence | Proposed extension |
| ATR-based stops and sizing | Proposed risk-management layer |
| Data/evidence gate behavior for open positions | Specification clarification |
| Account-currency risk sizing and protective-stop prerequisites | Specification clarification |
| JSON output and reason codes | Proposed implementation contract |
| Backtesting and acceptance criteria | Proposed implementation requirements |

**Final status:** This document defines a complete proposed technical implementation of the nine-candle strategy. It does not establish that the strategy has a positive trading expectancy. All proposed parameters and trading rules require historical, out-of-sample and paper-trading validation before live deployment.