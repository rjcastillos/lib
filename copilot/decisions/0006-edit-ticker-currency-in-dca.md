# Editing Ticker Currency in the DCA Planner

- Date: 2026-10-05
- Status: Implemented
- Type: Bug fix
- Scope: DCA planner ticker metadata editing
- Related request: User-reported bug; no GitHub issue number supplied
- Related decision: [Decision 0005](0005-issue-4-currency-and-asset-metadata.md)

## Report

The Currency field in `html/index.html` was read-only, preventing users from entering or changing a ticker's currency from the DCA planner.

## Decision

Allow the selected ticker's `Currency` field to be edited in the DCA planner. Accept exactly three ASCII letters, normalize valid input to uppercase, and update ticker metadata in memory so the selected currency formats planner amounts and is included on export. On invalid input when the field is committed, show an error and restore the previous valid value. Keep the existing USD display fallback for records that do not yet contain `Currency`.

## Rationale

Decision 0005 established ticker-level currency as informational display metadata and the DCA planner as a surface that formats monetary amounts in that currency. Making the field read-only prevented users from supplying that metadata in the planner.

## Validation

- Browser checks verified that typing `eur` changes the field to `EUR` and formats planner amounts in euros.
- Invalid currency entry displays feedback and restores the previous value.
- `node --check html/app.js` and `git diff --check` passed.

## Affected Files

- `html/index.html`
- `html/app.js`
- `docs/specs/Dollar-cost-average-planning/README.md`
- `json/portfolio.md`
