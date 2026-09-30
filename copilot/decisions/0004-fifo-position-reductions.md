# FIFO Position Reductions

- Date: 2026-09-30
- Status: Accepted
- Type: Financial accounting rule change
- Scope: Append-only real-position execution accounting in the browser tools
- Related issue: GitHub issue #2 and the MSFT FIFO basis clarification
- Supersedes: [Decision 0001](0001-append-only-position-executions.md)

## Decision

Keep real-position Buy and Sell execution rows immutable. Process them in `Trades` array order and consume the oldest open execution first whenever an opposite-side execution reduces a position. Entry commission is included in its opening lot basis per unit. A partial lot reduction consumes the corresponding quantity and entry commission proportionally without changing the recorded opening execution. The exit commission is charged to that execution's realized P&L and never changes the remaining lots' basis.

`Invested` is the sum of the basis of the remaining FIFO lots. `Positions[0].AvgPrice` is `Invested / Qty` while open and zero when flat. A reduction may therefore change average basis. Reject a reduction larger than the open quantity; after a full close, a new position in either direction may be opened.

Short positions use the same FIFO ordering. Each short lot's basis is sale proceeds less its allocated opening commission; covers consume the oldest short lots and realize released basis less cover cost and cover commission. Keep legacy `On` lot-shaped trades readable, but do not mix open legacy lots with append-only execution rows for one ticker without an explicit migration.

## Worked Results

For MSFT's seven one-share opening executions, basis totals `$2,775.33`. The three one-share sells consume the first three lots with basis `$430.50`, `$424.08`, and `$417.25`. The remaining four lots have `$1,503.50` invested and exact average basis `$375.875`, displayed as `$375.88` using standard two-decimal currency rounding. Realized P&L across the sales is `$162.49`.

A sale quantity need not match a buy lot: buying 2 at `$10` with `$2` commission and 3 at `$20` with `$3` commission, then selling 3 at `$25` with `$1` exit commission, consumes the first lot and one unit of the second. It releases `$43` basis, realizes `$31`, and leaves 2 units with `$42` basis at `$21` per unit.

## Rationale

The MSFT result requires lot-specific basis release rather than proportional average-cost release. FIFO preserves the immutable execution history and deterministically handles reductions that span purchases with different quantities and prices.

## Affected Areas

- `html/positions-core.js` and `html/positions-core.test.js`
- `html/app.js` and `html/index.html` for DCA display and aggregate export consistency
- `docs/specs/portfolio-update/README.md`
- `json/portfolio.md`
- `.github/skills/review-financial-calculations-skill/SKILL.md`

## Edge Cases

- A reduction smaller than the oldest open lot leaves a smaller remainder of that lot with the same per-unit basis.
- A reduction spanning multiple lots consumes them oldest-first and partially consumes the next lot if needed.
- Same-date executions retain their `Trades` array order; do not reorder the execution ledger.
- A full close leaves zero quantity, invested basis, and average basis. Subsequent opposite-side trades start a new position.
- Oversized sells/covers are rejected; they do not reverse the position.
- Opening and closing commissions remain separate: entry commissions are allocated to their opening lot basis, while each exit commission is charged once to that reduction's realized P&L.
- New execution rows cannot be combined with open legacy lot-shaped rows for the same ticker until the legacy quantity is migrated.
