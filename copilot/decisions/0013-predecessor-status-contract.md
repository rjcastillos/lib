# Predecessor Status Contract

- Date: 2026-11-02
- Status: Approved
- Scope: Candlestick predecessor JSON object and flattened CSV fields
- Related request: User clarification in this conversation; no GitHub issue number supplied
- Specification: [Candlestick study](../../docs/specs/candlesticks/shapes/study/README.md) and [output contract](../../docs/specs/candlesticks/shapes/study/output-contract/README.md)

## Decision

- Include `status` as the fifth field in the JSON `predecessor` object, after `pattern_name`, and flatten it to `PredecessorStatus` immediately after `PredecessorPatternName` in CSV.
- Allow statuses `NO_PREDECESSOR`, `MISSING_PRICE`, `INVALID_PRICE`, `INVALID_OHLC`, and `OK`.
- For `OK`, all four relationship fields are populated. For every other status, all four relationship fields are `null`; `status` is always present.
- Use the following short geometric names for the nine `pattern_code` values:
  - `HH-HL`: `upward_shift`
  - `HH-EL`: `upper_expansion`
  - `HH-LL`: `outside_bar`
  - `LH-HL`: `inside_bar`
  - `LH-LL`: `downward_shift`
  - `LH-EL`: `upper_contraction`
  - `EH-HL`: `lower_contraction`
  - `EH-LL`: `lower_expansion`
  - `EH-EL`: `unchanged_boundaries`
- These labels are the finalized `pattern_name` output values.
- Implement the candlestick study as a new Python module under `python/`. Do not modify existing Python source files; the existing candle-shape prototype remains unchanged.

## Rationale

The status values make the existing predecessor pseudocode observable and distinguish an absent predecessor from missing or invalid comparison data. Returning `OK` when all four relationship fields are available completes the status cases consistently.

## Affected Areas

- `docs/specs/candlesticks/shapes/study/README.md`
- `docs/specs/candlesticks/shapes/study/output-contract/README.md`
- New Python module for the candlestick study, including predecessor calculation and JSON/CSV serialization

## Validation and Compatibility

- Documentation-only decision; no runtime behavior or code was changed.
- The JSON example and CSV field order include the status field.
- Adding `PredecessorStatus` changes the CSV contract from 42 to 43 columns; consumers using positional CSV columns must account for the added column.
- The approved pattern-name mapping is part of the output contract and must be implemented as specified.
- The implementation boundary is a new Python module; existing Python source files are not to be modified.
