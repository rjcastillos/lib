# Nine-Candle Strategy Validation and Risk Gates

- Date: 2026-11-10
- Status: Accepted for the proposed specification; not implemented or empirically validated
- Type: Strategy specification clarification
- Scope: Nine-candle strategy entries, position management, risk sizing, and validation
- Related request: User request on 2026-11-10; no GitHub issue number supplied
- Specification: [9-Candle Weighted Trading Decision Framework](../../docs/specs/strategy/strategy_Nov26_1.md)

## Decision

- Define `ShortEntryThreshold` as a positive magnitude. With the default `0.40`, short confirmation requires `DirectionalBalance <= -ShortEntryThreshold`. The configuration example and strategy version are updated to 3.1.
- Separate data-quality and evidence gates. Invalid data or insufficient component coverage blocks new entries and reversals; any open position retains independent protective controls and is not given a market-driven signal from invalid analysis. Valid data with low evidence blocks entries and reversals but still applies the existing position's holding threshold.
- Require finite, dimensionally consistent risk inputs before entries or reversals. Specify the ATR reference candle, stop-distance bounds, account-currency per-unit risk including estimated costs, fill-time risk recalculation, and a live-entry prohibition when protective-stop execution is unsupported or undefined. No unvalidated risk parameter values are selected.
- Treat the daily loss limit as a hard session stop: cancel pending entries, close open positions, and block new entries until the configured reset boundary.
- Require reproducible, cost-aware chronological evaluation against baselines, multiple instruments and regimes, and component ablation. The checked-in NVDA fixture is for code-path diagnostics only, not parameter calibration or evidence of predictive performance.
- Preserve the current exit thresholds as hypotheses. Backtests must report turnover, exposure, and holding duration when assessing possible exit churn; thresholds must not be tuned against the final test period.

## Rationale

The prior short threshold used a negative configured value with an additional
negation in the rule, making the configuration inconsistent with the intended
bearish boundary. The prior decision pseudocode returned `NO_TRADE` before
position management on data or evidence failures, without defining what
happens to open positions. Risk sizing omitted currency conversion and
estimated costs, while stop-distance and execution requirements were
underspecified. Finally, the strategy's weighted components can overlap, and
their parameters have not been empirically validated; out-of-sample
comparisons and ablation are required before attributing predictive value.

## Diagnostic Backtest

A non-persisted diagnostic used the 225 daily NVDA candles in
`python/candles-study.csv`, the strategy's score rules and coverage gates,
signals after completed closes, and transitions at the following session's
open. It produced six position legs, a 33.3% winning-leg rate, approximately
-4.9% gross strategy return, and approximately 22.4% maximum drawdown. A
roughly same-period buy-and-hold comparison returned approximately -5.7%.

This is not a production-faithful or statistically meaningful performance
test: it has one instrument and a short history, omits fees, spread, slippage,
borrow costs, stop execution, and risk-based sizing, and cannot support
parameter calibration or an edge claim. The diagnostic bypassed the risk gate:
the sample configuration leaves required risk values null, so the documented
strategy would not authorize live entries with that configuration. These
results are recorded only to document why the fixture is classified as
diagnostic data.

## Affected Areas

- `docs/specs/strategy/strategy_Nov26_1.md`
- `python/candles-study.csv` (read-only diagnostic input)

## Validation and Compatibility

- Reviewed threshold usage, position-state pseudocode, risk formulas,
  configuration examples, output version, and validation criteria for
  consistency.
- Added explicit maximum-daily-loss handling and a required close if an
  existing position lacks a functioning protective control.
- Reproduced an exploratory daily-close/next-open backtest on the supplied
  fixture. No implementation or strategy unit tests exist in this
  specification-only change.
- Strategy configuration consumers must change a signed short threshold such
  as `-0.40` to the positive magnitude `0.40`; otherwise the configuration
  violates version 3.1.
- Missing required risk inputs now explicitly reject entry and reversal.
  Existing positions continue to rely on independently configured protective
  controls when candle data is invalid or coverage is insufficient.
- No empirical profitability claim is made; live deployment remains
  unauthorized until the specified risk configuration and validation gates
  are satisfied.
