# Predecessor Status Contract

- Date: 2026-11-02
- Status: Approved and implemented
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
- Compare prices using exact equality on parsed input numbers because no tick-size metadata is part of this input contract; do not apply an arbitrary tolerance.

## Rationale

The status values make the existing predecessor pseudocode observable and distinguish an absent predecessor from missing or invalid comparison data. Returning `OK` when all four relationship fields are available completes the status cases consistently.

## Affected Areas

- `docs/specs/candlesticks/shapes/study/README.md`
- `docs/specs/candlesticks/shapes/study/output-contract/README.md`
- [New Python study module](../../python/candlestick_study.py), including predecessor calculation and JSON/CSV serialization
- [Focused module tests](../../python/tests/test_candlestick_study.py)

## Validation and Compatibility

- Implemented in a new standard-library-only Python module; existing Python source modules were not modified.
- The JSON example and CSV field order include the status field.
- Adding `PredecessorStatus` changes the CSV contract from 42 to 43 columns; consumers using positional CSV columns must account for the added column.
- Subsequent [Decision 0014](0014-candlestick-atr-export-and-default-output-paths.md) adds `Atr` as the tenth column, bringing the current CSV contract to 44 columns.
- The approved pattern-name mapping is part of the output contract and must be implemented as specified.
- The implementation boundary is a new Python module; existing Python source files are not to be modified.
- The module sorts and rejects duplicate candle timestamps, preserves input timestamp offsets, applies exact price comparisons, and writes JSON/CSV in the required field order.
- Focused validation: `python3 -m unittest python.tests.test_candlestick_study` and `python3 -m compileall -q python/candlestick_study.py`.
