# Append-Only Position Executions

- Date: 2026-09-30
- Status: Accepted
- Scope: Real-position accounting in the browser portfolio tools
- Related issue: GitHub issue #2

https://github.com/rjcastillos/lib/issues/2


## Decision

Record every real-position buy or sell as a new immutable trade execution. Derive open quantity, direction, invested basis, average price, and realized P&L by processing executions in order using weighted-average cost. Reject executions that would reverse an open position. Closing the full position uses the same execution model as a partial reduction.

New execution rows use `Action`, `Strategy`, `Qty`, `Date`, `Price`, and `Commission`. Legacy lot-shaped rows remain readable. `On` continues to control DCA planner rows and is not used to determine whether a new real-position execution is active.

## Rationale

A reduction is an independent executed order; its quantity need not match any purchase quantity. Preserving the original buys and appending the sale retains the actual transaction history and avoids imposing FIFO, LIFO, or lot selection on users.

## Affected Areas

- `html/positions-core.js` and `html/positions-app.js`
- `html/app.js` real-ticker display
- `docs/specs/portfolio-update/README.md`
- `json/portfolio.md`

## Compatibility

Existing portfolios using `On`, `Direction`, `DateIn`, `PriceIn`, `DateOut`, and `PriceOut` remain readable. New executions are appended in the new format; aggregate position fields are recalculated from the legacy open rows and subsequent executions.
