# Nine-Candle Regime Breakout Proposal

- Date: 2026-11-11
- Status: Proposed for research; not approved for live trading
- Type: New strategy specification
- Scope: Daily-candle regime breakout, staged exits, and risk controls
- Related request: User request on 2026-11-11; no GitHub issue number supplied
- Specification: [Nine-Candle Regime Breakout and Risk-Control Strategy](../../docs/specs/strategy/nine-candle-regime-breakout-v1.md)
- Data reviewed: `python/all_nvda_ohlc_data.csv` and `python/candles-study.csv`

## Proposal

- Define a candidate directional setup from a nine-prior-candle breakout,
  EMA50/EMA200 regime, Slope50 direction, body strength, close location, and
  optional RVOL confirmation.
- Default short entries to disabled because the earlier NVDA diagnostic found
  materially weaker short-side behavior. Keep the short rule specified so it
  can be evaluated independently before enabling.
- Use next-tradable-event entries with an ATR gap filter, an initial ATR stop,
  risk-based sizing, staged 1.5R/3R profit-taking, and a non-loosening
  post-target trailing stop.
- Define all requested position and decision actions, risk vetoes, conservative
  daily OHLC fill ordering, and out-of-sample promotion gates.
- Treat the proposal as research only. No profitability claim or live
  authorization follows from the historical diagnostic.

## Rationale

The original nine-candle score strategy did not demonstrate reliable
next-session predictability on the longer NVDA series; short-side performance
was especially weak. A simpler regime-and-breakout candidate provides
explicit, testable entry conditions, while the trend filter and disabled
short default avoid assuming that long and short outcomes are symmetric.
Profit targets and stops turn the forecast into an auditable position policy,
but their thresholds remain uncalibrated.

## Diagnostic Evidence

An exploratory event study on 1,724 daily NVDA candles from 2020-01-02 through
2026-11-10 found 95 candidate setups (85 long, 10 short) with the proposed
trend, nine-bar breakout, body, close-location, and RVOL conditions. Returns
from the next session's open to the close 1, 5, and 10 sessions later averaged
approximately -0.21%, +0.70%, and +2.27%, respectively, before costs and
without strategy exits. Mean ten-session returns varied from approximately
+1.76% in 2020-2023 and +3.93% in 2024-2025 to -1.13% in 2026-to-date.

These are overlapping event returns from one asset and one timeframe. They
are not an independently tested strategy backtest and do not establish
positive net expectancy. The 2026 observations have already been inspected
and cannot serve as an untouched test set.

## Affected Areas

- `docs/specs/strategy/nine-candle-regime-breakout-v1.md`
- `python/all_nvda_ohlc_data.csv` (read-only research input)
- `python/candles-study.csv` (read-only research input)

## Validation and Compatibility

- Confirmed both CSVs contain 44 columns of the documented candle-study
  schema; the longer file has 1,724 daily NVDA rows, unique chronological
  dates, valid OHLC, and indicator warm-up nulls.
- Reproduced the candidate event-study setup counts and descriptive forward
  returns from completed-candle signals with next-session-open entry timing.
- Parsed all fenced JSON examples and checked relative Markdown links in the
  new specification.
- This is a new, standalone proposal and does not change the existing
  strategy's behavior. Consumers must use the exact action names and
  semantics in the new specification.
- No production implementation, costs-aware backtest, multi-asset
  out-of-sample test, or paper-trading validation was performed.
