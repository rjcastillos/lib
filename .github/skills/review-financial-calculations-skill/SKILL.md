---
name: review-financial-calculations-skill
description: "Use when understanding, implementing, or reviewing portfolio, trade, DCA, cost-basis, dividend, or yield formulas in this repository. Apply across Go and browser code; use the relevant spec and schema as the source of current product semantics."
---

# Financial Calculation Semantics

Use this skill to reason about the repository's financial calculations. It supports implementation and review; it does not provide investment, tax, or trading advice.

## Sources of Truth

- For DCA and yield-on-cost formulas, start with `docs/specs/Dollar-cost-average-planning/README.md`.
- For portfolio fields and JSON representations, read `json/portfolio.md` and `json/portfolio-template.json`.
- For the new position page's opens, partial closes, short positions, and realized P&L, use `docs/specs/portfolio-update/README.md` as the behavioral source of truth. These rules do not describe the existing DCA-only calculator.
- Compare those documents with the owning implementation. If the spec, schema, and code disagree, report the mismatch and clarify intended behavior before changing the model. Do not treat an implementation detail as an approved financial rule.

## Current DCA Model

The documented planner formulas model purchase tranches. Check which page owns the behavior before assuming every rule applies everywhere:

- `html/index.html` with `html/app.js` supports long-only tranches, active-row filtering, and `Periodicity` codes `M`, `Q`, `S`, and `A`.
- `html/DCA.html` is a separate monthly-only calculator. It has no active-row checkbox; all rows contribute to its cumulative values.
- The DCA specification documents monthly annualization and active-row filtering. The additional periodicity multipliers in `app.js` are implementation behavior also reflected by the portfolio schema, not fully specified in the DCA formula document.

For the asset manager, the formulas are:

- Tranche investment is quantity times price per share plus commission.
- Tranche price after commission is investment divided by tranche quantity, when quantity is positive.
- Cumulative shares and cumulative investment are sums of active tranches through the current row.
- Dollar average is cumulative active investment divided by cumulative active shares. It is a weighted cost basis, not the arithmetic mean of tranche prices.
- `Div` is the dividend per share for one payout period. In `app.js`, `Periodicity` maps monthly, quarterly, semi-annual, and annual periods to 12, 4, 2, and 1 payouts per year. In `DCA.html`, the input is monthly and is multiplied by 12.
- Annual dividend per share is `Div` times the payout multiplier. Payable amount per period is cumulative active shares times `Div`.
- `DivAmnt` is the gross dividend amount per payout cycle, calculated as the current quantity times `Div`. It is not annualized; derive an annual projection by multiplying by the `Periodicity` payout count.
- Yield on cost is annual dividend per share divided by the applicable dollar average, times 100. It is based on acquisition cost, not current market price; do not call it current yield.
- In the asset manager, inactive tranches do not contribute shares or investment to cumulative figures; the separate `DCA.html` calculator has no inactive state. Preserve separately displayed per-tranche values according to the owning page's UI contract.

A useful arithmetic check is 100 shares at $10 with a $1 commission: investment is $1,001 and price after commission is $10.01 per share. Two equal-size tranches at different prices must produce a quantity-weighted average, not an unweighted average of their prices.

The checked-in AGNC fixture provides an end-to-end formula example for the asset manager: three active tranches of 100 shares at $9.68, $9.50, and $9.40, each with a $1 commission, total 300 shares and $2,861 invested. The weighted average is $2,861 / 300 = $9.5367; at a monthly dividend of $0.12, `DivAmnt` and the monthly payable are $36 per cycle. Annual dividend per share is $1.44, annual projected total is $432, and YOC is about 15.10%.

## Trading and Financial Boundaries

- The current formula set does not model sells, short positions, realized/unrealized profit and loss, tax lots, fees beyond commission, currency conversion, stock splits, corporate actions, dividend reinvestment, or changing/future dividend declarations.
- In the existing DCA calculator, trade fields such as `DateOut`, `PriceOut`, and `Direction` do not implement closed or short position calculations. Do not infer those behaviors from that calculator.
- The separate portfolio-update spec defines append-only executions, FIFO basis release across open lots, entry/exit commission treatment, and realized P&L for the positions page. Legacy lot-shaped records remain readable. Do not apply those rules to the existing DCA calculator.
- DCA here means sequential cost-basis tranches in a ledger; it does not implement a scheduled contribution calendar or forecast purchase prices.
- Dividend and yield outputs are gross projections based on the entered per-period dividend. Do not imply a guaranteed payment or return.
- Preserve transaction dates and source values when saving calculations unless the user has explicitly defined a mutation rule.

## Calculation Safety and Review

- Guard divisions when quantity, cumulative shares, or dollar average is zero. Define the displayed zero/blank state consistently with the owning UI.
- Validate finite numeric inputs and nonnegative quantities, prices, commissions, and dividend rates where the product contract requires them. Do not silently convert malformed values into valid-looking zeroes.
- Keep full numeric precision during calculations and avoid repeated rounding of intermediate totals. The spec says to round for display; current `saveCurrentViewToData` also stores `Invested` to two decimals and `Positions[0].AvgPrice` to four decimals. That persisted rounding is not defined by the spec, so clarify the storage contract before changing or relying on it.
- Verify active-row inclusion, row ordering, totals, and units (per share, per tranche, per payout period, annualized) independently.
- Use small worked examples and invariants: aggregate shares equal active quantities; aggregate investment equals active tranche costs; weighted cost times aggregate shares equals aggregate investment within display precision.
- Flag ambiguous schema language before propagating it. In particular, confirm whether an aggregate field is per payout period or annualized if its documentation and implementation differ.
