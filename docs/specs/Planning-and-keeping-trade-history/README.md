# Planning , tracing and keeping trade history Requirements

## Status and purpose

This document is a requirements draft for the next release. It describes two connected capabilities:

1. Evaluate a proposed trade before placing an order.
2. Carry the plan into position tracking and retain the resulting trade history.

These capabilities may be delivered as a new planning page plus enhancements to the existing positions page. The release should reuse the current portfolio and execution-history behavior rather than create a second position ledger.

The current planning and tracking workflow uses Excel workbooks. The repository also has a browser positions page that loads and exports `portfolio.json`, records append-only executions, derives position totals, and displays trade history. These are different current-state workflows; the release must define how Excel data enters the browser workflow before implementation.

Related contracts:

- [Position and portfolio behavior](../portfolio-update/README.md)
- [Portfolio JSON schema](../../../json/portfolio.md)
- [Existing trade-history view requirements](../Trades-window-with-filter/README.md)

## Goals

- Replace spreadsheet-based pre-trade evaluation with a clear browser workflow.
- Make estimated values visibly distinct from executed values and realized results.
- Let a user record an actual execution without silently turning a proposed plan into a filled order.
- Track open positions and their reductions using the existing portfolio execution ledger.
- Keep enough information to review closed positions and analyze past decisions.
- Preserve calculation accuracy and make assumptions, commissions, dates, and currencies visible.

## Current state and release boundary

| Area | Current workflow | Existing repository behavior |
| --- | --- | --- |
| Pre-trade evaluation | Excel workbook with funding, risk tolerance, entry, target, stop, and quantity calculations | No equivalent dedicated planner is specified here |
| Open-position tracking | Separate Excel workbook | Positions page records executions in JSON and derives open quantity, basis, and realized P&L |
| Closed-position review | Spreadsheet history | Positions page retains executions and provides trade history; a grouped “trade” history is not currently part of the execution-ledger contract |
| Persistence | Excel files | Browser pages load a user-selected portfolio JSON file and download an export; export does not update the selected source file automatically |

### Proposed release boundary

- **Planner:** Add a browser feature for entering and reviewing a proposed trade, its assumptions, and its estimated risk/reward.
- **Position tracking:** Reuse the existing positions page and execution ledger for actual buys, sells, reductions, and closes. Do not create a parallel editable spreadsheet-style position table.
- **History:** Keep the open-position snapshot separate from the historical record. Preserve actual executions in an append-only history; whether that history is the existing `Trades` array in `portfolio.json` or a separate file/table must be confirmed before implementation.
- **Market data:** Assume prices are entered by the user for the initial release. Live quotes, automatic price refresh, broker integration, and automatic order execution are out of scope unless separately approved.
- **Excel and JSON:** Do not assume the browser can read or write `.xlsx` files. Choose and document the migration/import and source-of-truth behavior before implementation.

## Terminology

| Term | Meaning |
| --- | --- |
| **Plan** | A proposed trade and its estimates before any execution is recorded. A plan is not proof that an order was placed or filled. |
| **Execution** | One actual buy or sell, recorded as an append-only event in the portfolio. |
| **Position** | The current net open quantity for one ticker, derived from executions. A position has one direction at a time. |
| **Reduction** | An execution that decreases an open position without taking its quantity to zero. |
| **Close** | An execution that takes the open position to zero. |
| **Realized P&L** | P&L attributable to executed reductions or closes, including the applicable execution commissions. |
| **Unrealized P&L** | An estimate based on an open position and a user-provided current/exit price; it is not realized until an exit is recorded. |
| **Trade ID** | A proposed identifier for linking a plan to related activity. Its grouping semantics are unresolved; it must not be confused with an individual execution or the current open-position snapshot. |

## Requirements

### REQ1 — Evaluate a proposed trade

The planner shall let the user enter and review the inputs represented in the current planning workbook:

| Input or result | Meaning | Requirement |
| --- | --- | --- |
| Funding | Capital amount used by the plan | User-entered amount with currency |
| Loss tolerance | Maximum planned loss as a fraction or amount | Its unit and interpretation must be explicit |
| Risk budget | Maximum planned loss in currency | Show the formula and source inputs |
| Estimated exit fee | Estimated fee for the planned exit | User-editable; defaults to 1.00 in the selected plan currency (`$1` for USD) |
| Asset/ticker and direction | Instrument and proposed long or short side | Required to orient target, stop, and P&L calculations |
| Entry price | Planned entry price per unit | User-entered |
| ATR and ATR percentage | Volatility values included by the workbook | Store/display their value, date, and source; do not imply they are live unless refreshed |
| Stop | Planned stop price | Distinguish calculated/ideal stop from a user-entered realistic or predicted stop |
| Profit target | Planned exit target | Distinguish calculated/ideal target from a user-entered realistic target |
| Quantity | Proposed position size | Show whether fractional units are supported and how quantity is rounded |
| Fees | Estimated commissions/fees where applicable | Show each assumption and include it consistently in estimates; REQ1's confirmed legacy fee is an editable exit-fee input defaulting to 1.00 in the selected plan currency |
| Estimated outcomes | Risk, reward, P&L, reward/risk, and ROI | Label as estimates, not actual performance; display reward/risk as a ratio and ROI as a percentage |

The planner shall preserve the inputs and outputs needed to review the decision later, subject to the storage and plan-ID decision below. Editing a plan must not modify an already recorded execution. The REQ1 fee input replaces the workbook's hard-coded `1` in both scenario-result formulas. Use the plan's currency and do not convert currencies. Whether this fee must also be deducted from the risk budget before sizing quantity remains to be confirmed.

### REQ2 — Record and track an open position

- REQ2 is an open-position snapshot: it shows current open quantity, entry basis, stop/target scenarios, and estimates while the position is open. It is not the historical record and shall not be used to reconstruct closed activity.
- Load the user's selected portfolio JSON using the same local file-selection workflow as the existing browser pages. Do not assume access to a repository file path or silently write changes back to the selected file.
- Use the selected portfolio data for ticker identity, currency, `Div`, `Periodicity`, and current position basis. Calculate YOC as specified below; do not use the old external dividend workbook or its cached values.
- A user shall explicitly record an actual execution; saving or approving a plan alone shall not open a position.
- Actual executions shall use the existing append-only portfolio ledger and accounting rules in [the position specification](../portfolio-update/README.md).
- The UI shall show the current direction, open quantity, average basis, invested basis/proceeds, and realized P&L using the existing position behavior.
- Stop and target values originating from a plan may be shown as reference levels, but shall not be represented as executed orders or guaranteed exits.
- The user shall be able to record a partial reduction or full close. The history must retain each execution rather than overwrite the opening record.
- Estimated/unrealized values shall be labelled separately from realized P&L. Any estimate based on a manually entered market/exit price shall display the price used and the applicable fee assumption.
- A position’s strategy and any plan link shall be preserved consistently across its related executions if those fields are included in the final data contract.

#### REQ2 reward/risk, ROI, and YOC

- Keep the stop and target scenario P&L calculations net of entry and estimated exit fees:
  - `Investment = Q * EP + EntryFee`
  - `StopPnl = Q * Stop - ExitFee - Investment`
  - `TargetPnl = Q * PT - ExitFee - Investment`
- Add **Reward/Risk** as a ratio: `TargetPnl / abs(StopPnl)`. This uses the net target reward divided by the absolute net stop loss. It is not a percent and must not be labeled ROI. If stop P&L is zero or positive, or target P&L is zero or negative, show an unavailable marker rather than divide by zero or present an invalid reward/risk ratio.
- Add a separate **Target ROI** percentage: `(TargetPnl / Investment) * 100`, when `Investment > 0`. This replaces the old mislabelled `R:R P` usage as ROI; preserve a distinct ROI column alongside the new reward/risk ratio.
- Calculate **YOC** consistently with the DCA page and [the DCA calculation specification](../Dollar-cost-average-planning/README.md):
  - `AnnualDividendPerShare = Div * payoutsPerYear(Periodicity)`, with `M=12`, `Q=4`, `S=2`, `A=1`.
  - `YOC = AnnualDividendPerShare / AverageBasisPerShare * 100`, when the period is not `N/A` and average basis is greater than zero.
  - Read `Div`, `Periodicity`, and the applicable average basis from the selected ticker's record in the loaded portfolio JSON. For a real position, use its current fee-inclusive average basis; for DCA planner rows, use the DCA page's active-row weighted dollar average. Do not use the REQ2 snapshot's `EP` or `AVG` in place of portfolio data.
  - Show `N/A` for flat positions and short positions; the DCA YOC formula represents dividend yield on long acquisition cost, not income attributable to a short position.
  - Follow the DCA page's compatibility default of monthly (`M`) only when `Periodicity` is absent; reject unsupported period codes. A valid zero `Div` produces 0% YOC, while `Periodicity: "N/A"` produces N/A.
  - Show `N/A` when the ticker cannot be matched, dividend data is invalid/missing, or basis is unavailable; do not use stale workbook lookup results or imply the dividend is guaranteed.
  - Use the portfolio currency for display, defaulting to USD only according to existing portfolio-page compatibility behavior. Do not convert currencies.

### REQ3 — Review completed activity

- Users shall be able to review the executions and dates that produced a position, including partial reductions and the final close.
- Store history separately from the REQ2 open-position snapshot. The history is transaction-level and append-only; use the existing ledger behavior for recording executions and deriving realized P&L into a separate csv file to keep a log of all executed trades. Do not overwrite or delete historical executions when a position is closed or reduced.
- The transaction-level history shall remain consistent with the append-only execution contract and the existing [trade-history requirements](../Trades-window-with-filter/README.md).
- A closed-position summary may show opening activity, closing activity, holding period, realized P&L, commissions, strategy, and plan reference, but only when those values can be derived unambiguously from the selected grouping/accounting rules.
- Historical values shall not be silently recalculated using a current quote. The view shall distinguish recorded execution prices from any current or estimated price.
- Exported history shall identify the ticker, currency, dates, direction, quantities, prices, commissions, and realized result in a spreadsheet-friendly format.

## Workbook-backed behavior

The original workbooks are retained as reference inputs:

- [REQ1.xlsx](spreadsheets-old-way/REQ1.xlsx) — trade evaluation.
- [REQ2.xlsx](spreadsheets-old-way/REQ2.xlsx) — position watchlist and exit scenarios.

The formulas below were read from the workbook cells. The files are legacy examples, not automatically approved as the new product's formula contract. Preserve them as a baseline, make any deliberate formula changes explicit, and use the worked examples below as regression checks if the baseline is adopted.

### REQ1 — Trade evaluation

| Cell(s) | Workbook label | Observed meaning/formula |
| --- | --- | --- |
| `H1` | Funding | User input: `$2,500`. |
| `H2` | Loss tolerance | User input: `1%`; used as a fraction of funding and also as the stop distance from entry. |
| `I2` | — | Risk budget: `H1 * H2`. |
| `E4` | Entry Price | User input: `$571`. |
| `E6` | Stop Loss | `E4 * (1 - H2)`. |
| `E7` | Loss per Share | `E4 - E6`. |
| `H3` | Q. Shares | `I2 / E7`; no whole-share rounding is applied. |
| `I1` | — | Planned notional: `H3 * E4`. |
| `L1` | PT% | User input: `2%`. |
| `E5` | Ideal Target price | `E4 * (1 + L1)`. |
| `E10` | Realistic Target | User input: `$582`. |
| `L10` | PT% | `(E10 - E4) / E4`. |
| `M10` | — | Estimated result at realistic target: `(E10 * H3) - (I1 + 1)`. |
| `E12` | Predicted Stop | User input: `$566`. |
| `L12` | Loss% | `(E12 - E4) / E4`; negative for a price below entry. |
| `M12` | — | Estimated result at predicted stop: `(E12 * H3) - (I1 + 1)`. |

The sample yields a `$25` pre-fee risk budget, `4.3782837` shares, `$2,500` planned notional, a `$565.29` ideal stop, and a `$582.42` ideal target. At the entered realistic target of `$582`, the workbook's estimated result is `$47.16`; at the predicted stop of `$566`, it is `-$22.89`.

Important limitations of this workbook behavior:

- It models a long position only. Its stop and target formulas do not define short-side behavior.
- Quantity is fractional; the workbook does not round it to whole shares.
- The `+1` in both scenario formulas acts like an estimated exit fee. In the new planner this shall be an editable fee input, defaulting to 1.00 in the plan currency (`$1` for USD). No entry fee is present in the REQ1 workbook, and the fee is not included in its risk-budget sizing formula. At the ideal stop, the `$25` price risk therefore becomes `$26` with the default fee.
- `ATRP` (`B4 = 0.03`) and `ATR` (`C4 = 0.72`) are entered but are not referenced by any calculation in this sheet. Although the adjacent labels include “Date purchase,” the sample cells contain numeric values, not dates. Their units, intended dates, and whether they should affect calculations remain unspecified.

### REQ2 — Position watchlist and exit scenarios

REQ2 is a position/scenario snapshot, not an execution ledger: it has no entry/exit dates, per-order history, or explicit open/closed state. Its rows cannot by themselves satisfy REQ3 or be imported as actual executions. The sample rows establish the following provisional field meanings:

| Column | Workbook label | Observed meaning |
| --- | --- | --- |
| `A` | `TI` | Strategy/type code. Values include `DT` and `LF`; `DT` appears to correspond to `Daytrade`, while `LF` may correspond to `LongtimeInvestment`. Confirm `LF` before mapping it to `Trades.Strategy`; do not persist abbreviations without an approved mapping. |
| `B` | `Asset` | Ticker or instrument description; examples include `ACRE`, `GLAD`, and `GS 2027 7.4%`. |
| `C` | `Q` | Quantity. |
| `D` | `EP` | Entry price per unit. |
| `E` | `Bid fee` | Entry fee/commission, added to investment. |
| `F` | `Stop` | User-entered stop scenario price. |
| `G` | `PT` | User-entered profit-target scenario price. |
| `H` | `Inv` | `Q * EP + Bid fee`. |
| `I` | `Ask fee` | Exit fee/commission deducted in the two P&L scenarios. |
| `J` | `AVG` | `Inv / Q`, or a dash when `Q` is zero. |
| `K` | `P&L L` | P&L at the stop: `Q * Stop - Ask fee - Inv`. |
| `L` | `P&L P` | P&L at the target: `Q * PT - Ask fee - Inv`. |
| `M` | `R:R P` | Legacy formula `P&L P / Inv`. This is target-scenario return relative to investment, **not** a reward-to-risk ratio. The new spec replaces this column's meaning with Reward/Risk and adds a separate ROI column. |
| `N` | `L` | `(Q * Stop - Inv) / Inv`. This percentage includes the entry fee through `Inv` but omits the exit fee. |
| `O` | `P` | `(Q * PT - Q * EP) / (Q * EP)`. This price-change percentage omits both entry and exit fees. |
| `P` | `Comments` | Free-text column; no sample value is populated. |
| `Q` | `YOC` | Exact-match external lookup: `VLOOKUP(Asset, [Dividend_CalandTrack.xlsx]Div_Cal!$K$9:$T$99, 10, FALSE)`. |

For the ACRE sample (`Q=110`, `EP=$4.43`, entry fee `$0`, stop `$3`, target `$5.30`, exit fee `$1.01`), `Inv` is `$487.30`, `AVG` is `$4.43`, stop-scenario P&L is `-$158.31`, and target-scenario P&L is `$94.69`. The legacy `M` formula displays approximately `19.43%` ROI. Under the clarified requirements, net Reward/Risk is `94.69 / abs(-158.31)`, approximately `0.598:1`, and the separate Target ROI remains `19.43%`. Legacy `L` is approximately `-32.28%` and `P` approximately `19.64%`.

The legacy metric labels are not fully consistent with their calculations: `R:R P` is a return on investment, and `L` and `P` use different fee treatments. The new feature shall use descriptive labels (`Stop P&L`, `Target P&L`, `Reward/Risk`, `Target ROI`, `Stop return`, and `Target price change`) and state which fees are included, rather than reproduce ambiguous abbreviations as product terminology.

The legacy `YOC` cells depend on a separate external workbook, `Dividend_CalandTrack.xlsx`, which is not present in this repository. This external lookup is superseded by the confirmed requirement to calculate YOC from the user-loaded `portfolio.json`, using the DCA page's dividend and basis semantics. Do not use cached YOC values from REQ2.

The workbook also contains a blank-asset row with `Q=0`; formulas still show negative exit-fee P&L values for that row. This is a spreadsheet artifact, not a valid position. The new feature must validate required fields and avoid presenting calculations for an empty or zero-quantity position.

For the new snapshot, `Q` means currently open quantity. `EP`/`AVG` must represent the current position's fee-inclusive average entry basis for the snapshot calculation, rather than an individual historical fill. Whether snapshot quantity and basis are entered manually or read from the loaded portfolio JSON remains a release decision; the JSON load is required at minimum for YOC.

The new output meanings are:

| Output | Formula/meaning |
| --- | --- |
| Investment | `Q * EP + EntryFee`. |
| Stop P&L | `Q * Stop - ExitFee - Investment`. |
| Target P&L | `Q * PT - ExitFee - Investment`. |
| Reward/Risk | `TargetPnl / abs(StopPnl)`, shown as a ratio (for example, `0.598:1`), not a percentage. |
| Target ROI | `TargetPnl / Investment * 100`, shown as a percentage in a separate column. |
| YOC | Derived from the selected portfolio JSON data using the DCA formula above; it is not the old REQ2 external lookup. |

The old `L` and `P` percentage columns use inconsistent fee bases. The release should either retire them in favor of the clearly named Stop P&L, Target P&L, Reward/Risk, and Target ROI outputs, or preserve them as explicitly labeled legacy metrics. Do not silently relabel them as fee-inclusive returns.

## Calculation and data-integrity rules

1. **Formula source:** The workbook-backed behavior above is the legacy baseline, not automatically the new product contract. Record any approved correction or improvement and its worked examples here before implementation.
2. **Scenario vs execution:** Planner inputs and results are estimates. They must not be written as executed trades until the user records an actual execution.
3. **Long and short orientation:** The supplied REQ1 formula set is long-only; REQ2 also calculates exit scenarios as a long position. Short-plan semantics need explicit approval.
4. **Fees:** REQ1's editable exit-fee input defaults to `$1`; its legacy quantity sizing excludes this fee. REQ2 includes entry and exit fees in dollar P&L. The new REQ2 Reward/Risk and Target ROI use fee-inclusive stop and target P&L. Confirm whether REQ1 sizing should account for the exit fee.
5. **Precision:** Keep full calculation precision internally; apply display rounding only for presentation. Quantity rounding must follow an explicitly chosen rule.
6. **Position ledger:** Keep the existing append-only execution order, FIFO accounting, and no-reversal rule for new position executions. Do not alter the portfolio accounting contract as an incidental planner change.
7. **Currency:** Keep amounts and fees in a declared currency. The existing positions tools do not perform currency conversion; do not aggregate unlike currencies as if converted.
8. **Dates:** Distinguish plan date, execution date, and close date. An estimated plan date is not an execution date.
9. **Validation:** Reject or clearly flag missing, non-finite, negative, or incompatible values before showing a result. Explain invalid inputs rather than presenting a success-shaped zero.
10. **Integrity:** Keep the source workbook/file unchanged unless the user explicitly exports or saves a new artifact. Make the selected source and last-export state clear.

## Release acceptance criteria

### Planning

- A user can enter the required plan inputs and identify the asset, direction, currency, and assumptions.
- The page labels inputs, derived values, and estimates distinctly and explains the selected calculation basis.
- Valid example cases reproduce the verified workbook’s outputs within an agreed rounding tolerance.
- When retaining REQ1's sample formulas, the `$2,500` funding, `1%` loss tolerance, `$571` entry, and `2%` target produce 4.3782837 shares, `$565.29` ideal stop, `$582.42` ideal target, `$47.16` at the `$582` realistic target, and `-$22.89` at the `$566` predicted stop with the default `$1` exit fee.
- For the DCA YOC example, 300 shares at a `$9.5367` fee-inclusive average basis and a `$0.12` monthly dividend produce about `15.10%` YOC; use full precision internally and round only for display.
- Invalid or incomplete inputs produce a clear validation message and no misleading calculated result.
- The REQ1 fee is editable, defaults to 1.00 in the selected currency (`$1` for USD), and changing it updates scenario estimates; it is not silently applied to quantity sizing unless that behavior is separately confirmed.
- Long and short examples cover stop/target orientation, fees, quantity sizing, and non-positive/zero-risk edge cases according to the approved rules.
- Editing a plan does not change portfolio executions or derived open-position totals.

### Position tracking and history

- Recording an execution changes the position only after explicit confirmation and follows the current JSON execution contract.
- Partial reductions, full closes, FIFO basis, commissions, and realized results continue to satisfy the existing position specification’s worked examples.
- When retaining REQ2's ACRE formulas, `Q=110`, `EP=$4.43`, entry fee `$0`, stop `$3`, target `$5.30`, and exit fee `$1.01` produce `$487.30` investment, `-$158.31` stop P&L, and `$94.69` target P&L. Show Reward/Risk as approximately `0.598:1` and Target ROI separately as approximately `19.43%`.
- A blank asset or zero quantity produces a validation/empty state, not the workbook's fee-only P&L result.
- YOC uses dividend, periodicity, and fee-inclusive basis from the selected portfolio JSON asset, matches the DCA formula, and is `N/A` for missing/unmatched asset data, `Periodicity: "N/A"`, unavailable basis, flat positions, or shorts. An absent periodicity uses the DCA page's legacy `M` fallback; a valid zero dividend rate displays 0%.
- The feature can load a user-selected portfolio JSON file with the same validation and local import/export behavior as the existing browser pages; it does not silently overwrite the selected file.
- Open-position snapshot rows are not treated as the historical record; open, reduction, and close events remain available in the separately defined append-only history.
- A close leaves the immutable execution history available for review; an open position is not duplicated as a second record just to make it appear in another screen.
- Estimated values cannot be mistaken for realized P&L or broker-confirmed fills.
- History exports match the displayed records and identify the values’ currency and date meaning.

### Persistence and migration

- The release documents whether Excel import is supported, whether the user must migrate/enter data manually, and which file is authoritative after migration.
- Import/export behavior preserves strategy, ticker, dates, quantities, prices, fees, currency, and history order, or reports every unsupported field/row before saving.
- The source file is not silently overwritten. A user can verify and export a valid portfolio file and reload it without losing supported data.

## Recommended enhancements (optional)

These additions can improve later analysis, but should not block a first release focused on verified workbook parity:

- **Plan-versus-actual comparison:** Retain planned entry, size, and fees separately from the actual execution values. Where both values exist, show slippage and size/fee variance without changing the execution record.
- **Decision journal:** Allow optional entry rationale, exit rationale, and free-text notes linked to the plan or lifecycle. Keep notes separate from financial calculations.
- **Scenario comparison:** Show ideal and realistic target/stop scenarios side by side, with the assumptions and risk/reward for each scenario visible.
- **Valuation provenance:** For any manually entered current price, retain the value and its “as of” date/time so an estimate can be interpreted later.
- **Outcome review:** Summarize realized results from executions separately from estimated outcomes and avoid labeling a trade successful based only on an unrealized mark.

## Decisions required before implementation

1. **Persistence and source of truth:** Are the Excel workbooks reference-only, or must the release import `.xlsx`/CSV? If imported, define how workbook edits and portfolio JSON edits are reconciled. Do not imply workbook import is supported until it is implemented and tested.
2. **REQ1 fee and sizing:** Should the editable default `$1` fee affect only scenario P&L, preserving legacy quantity sizing, or should sizing reserve that fee from the risk budget? Is there also an entry fee for a planned trade?
3. **Snapshot data source:** Are current open quantity and average basis entered/maintained in the REQ2 snapshot, or should they be read from the selected portfolio JSON? Portfolio JSON must be loaded for YOC either way.
4. **History storage:** Does “stored separately” mean a separate workbook sheet/file from the snapshot, or is the append-only `Trades` history in portfolio JSON an acceptable separate history store? Define the canonical store and how it relates to the execution ledger before implementation.
5. **Short and direction support:** REQ1 and REQ2 workbooks calculate long scenarios. Should short plans be included in the first release? If so, define their risk/reward and fee formulas before implementation.
6. **ATR fields:** What are the intended units and dates for `ATRP` and `ATR`, and should they affect stop, target, sizing, or remain informational?
7. **Target and stop scenarios:** Should `Ideal Target`/`Stop Loss` be calculated while `Realistic Target`/`Predicted Stop` are manually entered, as in REQ1? Which levels drive sizing versus scenario reporting?
8. **Strategy mapping:** Confirm `DT` → `Daytrade` and whether `LF` maps to `LongtimeInvestment` or a distinct value.
9. **YOC matching and position type:** Confirm ticker matching when the snapshot instrument name differs from the portfolio ticker key (for example, `GS 2027 7.4%`), and whether YOC should be `N/A` for short positions and zero-basis rows as proposed.
10. **Legacy percentages:** Should the old REQ2 `L` and `P` metrics be removed, or retained with labels that explain their different fee treatment?
11. **Plan identity and lifecycle grouping:** Is an identifier needed for a plan, an execution, a full position lifecycle, or a strategy/campaign? One lifecycle can have many executions and partial closes, so define grouping before adding a `TradeID` field.
12. **Plan-to-execution link and valuation:** Should a user be able to start an execution from a plan with values prefilled? If so, identify which values are copied and require confirmation of actual fill price, quantity, date, and fees. Is a current price manually entered for estimates, or is a market-data provider required?

## Suggested delivery sequence

1. Decide the remaining open questions, especially fee/sizing semantics, short support, strategy mapping, and plan persistence.
2. Define how the page selects and matches the JSON ticker record for YOC, and settle whether snapshot quantity/basis also come from that file.
3. Decide the canonical append-only history store separately from the open snapshot.
4. Implement and validate the planner as estimates only, using the worked examples above as regression checks where the legacy formulas are retained.
5. Integrate an explicit plan-to-execution handoff with the existing positions page, if approved.
6. Add a grouped lifecycle summary only after grouping rules are defined; continue to expose transaction-level history.
7. Validate financial examples, JSON load/export compatibility, and the release acceptance criteria above.

## Reconciled source files

The source workbooks remain unchanged under [spreadsheets-old-way/](spreadsheets-old-way/). REQ2's legacy YOC column contains cached values and formulas linked to an absent external dividend workbook; these values are superseded by the JSON-backed DCA calculation specified above.
