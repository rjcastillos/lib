# Trade History and Next Ex-Date Display

- Date: 2026-09-30
- Status: Implemented
- Type: New requirement and change request
- Scope: Browser positions page trade review
- Related issue: [GitHub issue #3](https://github.com/rjcastillos/lib/issues/3)
- Feature specification: [Trades window with filter](../../docs/specs/Trades-window-with-filter/README.md)

## Request

Provide an on-demand, non-editable per-ticker trade history view with open/closed/date-range filters and CSV export, and show the ticker's next ex-dividend date when available.

## Resolution

Added a native dialog opened beside the ticker name. Legacy lot-shaped records use the requested open and closed filters, ordered by their corresponding entry or exit dates. Append-only Buy/Sell execution ledgers default to All history and derive Long/Short action descriptions chronologically without assigning lot-level open/closed states. CSV export contains the currently filtered rows. A valid compact `NextExDate` appears in a readable format beside the ticker name; invalid or empty values remain hidden.

## Validation

- Core tests cover legacy open/closed filters, date bounds, chronological Buy/Sell display, Long/Short action derivation, compact Ex-date validation, and CSV escaping.
- Browser checks verified the dialog, legacy views, execution history, displayed Ex-date, and generated CSV content/name.
- Browser checks at desktop and 390px confirmed the dialog controls fit, the history table scrolls inside the dialog without page overflow, and Escape dismisses the dialog.

## Affected Files

- `html/positions.html`
- `html/positions-app.js`
- `html/positions-core.js`
- `html/positions-core.test.js`
- `docs/specs/Trades-window-with-filter/README.md`
