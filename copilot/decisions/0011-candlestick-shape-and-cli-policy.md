# Candlestick Shape and CLI Policy

- Date: 2026-11-02
- Status: Accepted requirements; ready for implementation
- Scope: Candlestick shape classification, invalid-row diagnostics, and command exit status
- Related request: User clarification in this conversation; no GitHub issue number supplied
- Specification: [Candlestick study](../../docs/specs/candlesticks/shapes/study/README.md) and [output contract](../../docs/specs/candlesticks/shapes/study/output-contract/README.md)
- Clarifies: [Decision 0010](0010-candlestick-rvol-and-invalid-numbers.md)

## Decision

- Make the fixed, symmetric candle-shape thresholds already implemented by `python/candle_shape.py` authoritative for the study. Evaluate flat and doji first; for directional candles evaluate marubozu, rejection, momentum, hammer, inverted hammer, spinning top, then the standard fallback. Rejection takes precedence over momentum.
- Write the specified per-candle validation error and a final valid/invalid row summary to standard error. Continue processing after row-level invalid data and write both output files with invalid raw numeric values represented as JSON `null` and empty CSV cells; retain finite source numbers even when their candle violates structural OHLC constraints.
- Return exit status `0` only when both output files are written and all rows are valid; return `1` when both files are written but one or more candle rows are invalid; return `2` for fatal input, processing, or output failures that prevent completing both outputs.

## Rationale

The existing Python prototype provides a concrete implementation of the proposed symmetric taxonomy. Publishing its boundary conditions and precedence in the owning study specification makes the behavior reproducible and testable. Standard-error diagnostics keep machine-readable output files clean, while a distinct partial-data exit status allows scripts to detect invalid input even when exports were produced.

## Affected Areas

- `docs/specs/candlesticks/shapes/study/README.md`
- `docs/specs/candlesticks/shapes/study/output-contract/README.md`
- `python/candle_shape.py` and the future study CLI/pipeline

## Validation and Compatibility

- Documentation-only decision; no runtime behavior or code was changed.
- The study acceptance matrix now calls for threshold-boundary and mirrored-geometry cases.
- CLI consumers must treat status `1` as partial output that exists but contains invalid rows; status `2` means both outputs were not completed.
