# Separate Volume Validation

- Date: 2026-11-02
- Status: Accepted requirements; ready for implementation
- Scope: Candlestick-study volume validation, serialization, and RVOL inputs
- Related request: User clarification in this conversation; no GitHub issue number supplied
- Specification: [Candlestick study](../../docs/specs/candlesticks/shapes/study/README.md) and [output contract](../../docs/specs/candlesticks/shapes/study/output-contract/README.md)
- Clarifies: [Decision 0010](0010-candlestick-rvol-and-invalid-numbers.md) and [Decision 0011](0011-candlestick-shape-and-cli-policy.md)

## Decision

- Missing Volume is allowed. Serialize it as JSON `null` and an empty CSV cell without a validation error. RVOL is unavailable when the current or any required prior-nine-bar volume is missing.
- Report supplied negative, non-numeric, NaN, or infinite Volume using a volume-specific diagnostic on standard error. Serialize that Volume as unavailable and do not use it to calculate RVOL.
- Invalid Volume does not invalidate candle shape or predecessor calculations when OHLC is valid. Count a row with one or more validation errors only once as invalid for the CLI summary and exit status.

## Rationale

Volume is optional in the input contract and is not required for candle geometry or predecessor classification. Treating its validation separately preserves these OHLC-based outputs while making RVOL unavailable whenever a required volume observation is unusable.

## Affected Areas

- `docs/specs/candlesticks/shapes/study/README.md`
- `docs/specs/candlesticks/shapes/study/output-contract/README.md`
- Future Python volume validation and RVOL calculation

## Validation and Compatibility

- Documentation-only decision; no runtime behavior or code was changed.
- Missing volume no longer implies an input error; supplied invalid volume is now a row-level validation error and affects the partial-data exit status.
