# Candlestick Output Contract

- Date: 2026-11-02
- Status: Accepted requirements; ready for implementation
- Scope: Candlestick-study JSON and CSV serialization, ordering, validation, and predecessor relationships
- Related request: User clarification in this conversation; no GitHub issue number supplied
- Specification: [Candlestick study](../../docs/specs/candlesticks/shapes/study/README.md) and [output contract](../../docs/specs/candlesticks/shapes/study/output-contract/README.md)

## Decision

- Generate JSON and CSV from the same records, sorted in ascending chronological order before calculations and export. The JSON array order and CSV row order are required serialized layouts.
- Keep JSON field names in `snake_case` and use the exact `PascalCase` CSV columns from the output contract. Spell abbreviations as specified there, such as `Atr`, `Rvol`, `Ema`, and `Sma`.
- Preserve input values, timezone/UTC offsets, and numeric precision. Do not convert timestamps to another timezone or round values for export. Serialize finite numbers with enough precision to recover the same value when parsed.
- Represent JSON unavailable values as `null`. Represent unavailable and empty text values as empty CSV cells; these cases are intentionally indistinguishable in CSV.
- Report invalid candles using the candle-specific error format in the study specification and continue processing. Retain the input row and values, but do not classify invalid candle direction, shape, geometry, or predecessor relationships.
- Compare predecessor relationships with the immediately preceding row in chronological order. If that row is invalid or lacks required high/low values, leave the relationship unavailable; do not skip it to find an older candle.

## Rationale

One canonical schema and order make the two exports directly comparable. Preserving source timezone and numeric precision avoids altering the feed during serialization. Keeping invalid rows while refusing to classify them preserves traceability, and the immediate-predecessor rule is consistent with the existing missing-predecessor requirement.

## Affected Areas

- `docs/specs/candlesticks/shapes/study/README.md`
- `docs/specs/candlesticks/shapes/study/output-contract/README.md`
- Future JSON/CSV serialization and validation implementation for the candlestick study

## Validation and Compatibility

- Documentation-only decision; no runtime behavior or code was changed.
- Checked the output field/column tables against the parent study specification and aligned the sample candle's direction, shape, locations, and ATR ratios with its input values.
- The contract replaces input-casing preservation with canonical output names, makes serialized order mandatory, and explicitly forbids rounding and timezone conversion. Runtime compatibility remains to be validated when the serializer is implemented.
