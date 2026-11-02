# Candlestick ATR Export and Default Output Paths

- Date: 2026-11-02
- Status: Accepted and implemented
- Type: Output schema change and CLI usability enhancement
- Scope: Candlestick-study JSON/CSV schema and CLI output arguments
- Related request: User-provided issue list in this conversation; no GitHub issue number supplied
- Specification: [Candlestick study](../../docs/specs/candlesticks/shapes/study/README.md) and [output contract](../../docs/specs/candlesticks/shapes/study/output-contract/README.md)

## Decision

- Include the current row's configured-period ATR as top-level JSON field `atr`, immediately after `shape` and before `range`.
- Include the corresponding PascalCase CSV column `Atr` at the same position.
- Follow the existing ATR warm-up and invalid-data behavior: `atr` is unavailable until a complete sequence of configured-period valid true-range observations exists, and becomes unavailable when OHLC invalidates the ATR sequence.
- Make `--json-output` and `--csv-output` optional CLI arguments. Default to `candles-study.json` and `candles-study.csv`, respectively, in the current working directory. Explicitly supplied paths override the defaults.
- Keep the ATR calculation period configurable with the existing default of `9`; the output field reports the ATR for that configured period.

## Rationale

Exporting ATR directly makes the study's volatility baseline visible alongside the ATR-normalized candle measurements. Default output filenames allow the common one-input-file command without requiring repetitive output options, while explicit paths remain available.

## Affected Areas

- `docs/specs/candlesticks/shapes/study/README.md`
- `docs/specs/candlesticks/shapes/study/output-contract/README.md`
- `python/candlestick_study.py`
- `python/tests/test_candlestick_study.py`
- `python/README.md`

## Validation and Compatibility

- The JSON field count changes from 39 to 40; `atr` is inserted after `shape`.
- The CSV field count changes from 43 to 44; `Atr` is inserted after `Shape`.
- Consumers relying on positional output columns must account for this schema change.
- Output arguments may now be omitted; omitted paths write to the current working directory using the documented defaults.
- Focused validation covers canonical field order, current ATR values, default output files, CLI behavior, and the complete Python test suite.
