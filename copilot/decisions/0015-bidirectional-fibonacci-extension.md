# Bidirectional Fibonacci Extensions

- Date: 2026-11-04
- Status: Accepted and implemented
- Scope: Trade planner Fibonacci helper
- Related request: [Fibonacci Level helper follow-up](../../docs/specs/Planning-and-keeping-trade-history/issues-postimplementaiton/20261104_1.md)
- Specification: [Planning and keeping trade history](../../docs/specs/Planning-and-keeping-trade-history/README.md)
- Supersedes: The extension direction and ratio details in [Decision 0007](0007-plan-and-execution-history-boundaries.md)

## Decision

- Replace the Fibonacci ratio `0.764` with `0.786` for both extensions and retracements.
- Permit extension inputs in either impulse direction. Point C must be strictly between A and B: `min(A, B) < C < max(A, B)`.
- Continue using `ExtensionLevel = C + (B - A) * ratio`; a descending impulse naturally produces descending extension levels.
- Label extension inputs according to direction: for ascending impulses A/B/C are swing low/swing high/pullback low; for descending impulses they are swing high/swing low/pullback high.
- Keep retracement validation and calculation unchanged.

## Rationale

The helper's previous `A < C < B` validation rejected valid descending impulses even though the same signed extension formula yields the expected values. The supplied examples calculate to `170.04` and `294.08` at ratio `0.786`, so strict interval validation provides one symmetric rule without special-case formulas.

## Affected Areas

- `html/trade-planner-core.js`
- `html/trade-planner-core.test.js`
- `html/trade-planner-app.js`
- `html/trade-planner.html`
- `docs/specs/Planning-and-keeping-trade-history/README.md`
- `docs/specs/Planning-and-keeping-trade-history/follow-up-todo/revOct9.md`
- `docs/specs/Planning-and-keeping-trade-history/issues-postimplementaiton/20261104_1.md`

## Validation and Compatibility

- Added tests for ascending and descending example values, replacement of `0.764` with `0.786`, and rejection of C outside the A/B interval.
- Existing ascending extensions retain the same formula; only the supported `0.764` level changes to `0.786`.
- Fibonacci retracement calculations use the updated ratio list.
- Validation run: `node --test html/trade-planner-core.test.js`, JavaScript syntax checks, and `git diff --check`.
