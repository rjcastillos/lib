# Candlestick RVOL and Invalid Number Representation

- Date: 2026-11-02
- Status: Accepted calculation and serialization rules; CLI diagnostics policy resolved by [Decision 0011](0011-candlestick-shape-and-cli-policy.md)
- Scope: Candlestick-study RVOL baseline and numeric input serialization
- Related request: User clarification in this conversation; no GitHub issue number supplied
- Specification: [Candlestick study](../../docs/specs/candlesticks/shapes/study/README.md) and [output contract](../../docs/specs/candlesticks/shapes/study/output-contract/README.md)
- Supersedes: Clarifies RVOL and invalid-number handling left open by [Decision 0009](0009-candlestick-output-contract.md)

## Decision

- Calculate RVOL from the current bar's volume divided by the mean volume of the immediately preceding nine bars for the same ticker and timeframe. Exclude the current bar. This applies to daily and intraday input and is not time-of-day-adjusted RVOL.
- Return `null` for RVOL when fewer than nine prior bars exist, the current or any baseline volume is missing or invalid, or the baseline mean is zero. Do not skip invalid baseline observations. A genuine zero current volume yields `0.0` when the baseline mean is positive.
- Keep percentage-named study outputs, including slopes, as decimal fractions in JSON and CSV. Multiply by 100 only for human-readable percentage interpretation.
- Serialize missing, non-numeric, NaN, or infinite values in numeric source fields as JSON `null` and empty CSV cells. Retain finite numeric source values even when the candle fails structural OHLC validation; derived candle values are unavailable for that invalid candle.
- Decision 0011 defines the CLI error destination and exit-status behavior.

## Rationale

The prior-nine-bars rule is explicit and deterministic across candle intervals, while excluding the current volume prevents it from changing its own baseline. Decimal-fraction output keeps study measurements consistent and avoids conflating percentage display with stored values. Mapping values that cannot be represented as numbers to null/empty preserves valid JSON and CSV while retaining finite source values needed to inspect structurally invalid candles.

## Affected Areas

- `docs/specs/candlesticks/shapes/study/README.md`
- `docs/specs/candlesticks/shapes/study/output-contract/README.md`
- Future Python candlestick-study calculations and serializers

## Validation and Compatibility

- Documentation-only decision; no runtime behavior or code was changed.
- Verified the documented nine-volume example: `28,000 / (127,000 / 9) = 1.984251968503937`.
- CLI diagnostics and exit behavior are resolved by Decision 0011.
