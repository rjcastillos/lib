# Trade Planning, Tracking, and History Requirements

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
- Compare multiple user-defined exit scenarios and their estimated financial outcomes without implying that any target or stop will execute automatically.

## Confirmed release clarifications

- **NVDA target example:** The correct entry is `$232.48`. At the default `PT=2%`, T1 is `$237.1296`, displayed as `$237.13`; the user-entered resistance target T2 is `$243.38` on the `1D` chart.
- **Direction scope:** The new planning and snapshot workflow is long-only for this release. Short-sale support is deferred to a future release. This does not change short accounting already supported by the existing positions page or erase historical short executions.
- **Execution history:** The CSV is a persistent history file for actual executions, not a download-only artifact and not the DCA audit/troubleshooting CSV. It retains opens, increases, reductions, and closes for later review. The CSV persistence option table below describes implementation choices; a normal download does not satisfy the requirement.
- **DCA CSV isolation:** The existing CSV download in DCA is out of scope and must remain unchanged. The new planner, snapshot, and execution-history features must not modify, replace, rename, reuse, or change the DCA CSV's content, format, generation, or download behavior.
- **Fibonacci extensions:** When a Fibonacci extension calculation is shown, present all seven levels: 23.6%, 38.2%, 50%, 65%, 76.4%, 100%, and 120%.

These clarifications supersede any conflicting earlier wording in the requirements and the open-questions list below.

## Current state and release boundary

| Area | Current workflow | Existing repository behavior |
| --- | --- | --- |
| Pre-trade evaluation | Excel workbook with funding, risk tolerance, entry, target, stop, and quantity calculations | No equivalent dedicated planner is specified here |
| Open-position tracking | Separate Excel workbook | Positions page records executions in JSON and derives open quantity, basis, and realized P&L |
| Closed-position review | Spreadsheet history | Positions page retains executions and provides trade history; a grouped “trade” history is not currently part of the execution-ledger contract |
| Persistence | Excel files | Browser pages load a user-selected portfolio JSON file and download an export; export does not update the selected source file automatically |

### Proposed release boundary

- **Planner:** Add a browser feature for entering and reviewing a proposed trade, its assumptions, and its estimated risk/reward. Do not change the existing DCA CSV download or its workflow.
- **Position tracking:** Reuse the existing positions page and execution ledger for actual buys, sells, reductions, and closes. Do not create a parallel editable spreadsheet-style position table.
- **History:** Keep the open-position snapshot separate from the historical record. The existing append-only execution ledger in `portfolio.json` remains the calculation source; maintain a persistent CSV history sidecar for later review. The history CSV is not a download in this release.
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
| Asset/ticker and direction | Instrument and proposed side | Long only in this release; short-sale planning is deferred |
| Entry price | Planned entry price per unit | User-entered |
| ATR and ATR percentage | Volatility values included by the workbook | Store/display their value, date, and source; do not imply they are live unless refreshed |
| Stop | Planned stop price | Distinguish calculated/ideal stop from a user-entered realistic or predicted stop |
| Profit target | Planned exit target | Distinguish calculated/ideal target from a user-entered realistic target |
| Quantity | Proposed position size | Show whether fractional units are supported and how quantity is rounded |
| Fees | Estimated commissions/fees where applicable | Show each assumption and include it consistently in estimates; REQ1's confirmed legacy fee is an editable exit-fee input defaulting to 1.00 in the selected plan currency |
| Estimated outcomes | Risk, reward, P&L, reward/risk, and ROI | Label as estimates, not actual performance; display reward/risk as a ratio and ROI as a percentage for supported long scenarios |

The planner shall preserve the inputs and outputs needed to review the decision later, subject to the storage and plan-ID decision below. Editing a plan must not modify an already recorded execution. The REQ1 fee input replaces the workbook's hard-coded `1` in both scenario-result formulas. Use the plan's currency and do not convert currencies. Whether this fee must also be deducted from the risk budget before sizing quantity remains to be confirmed.

#### REQ1 exit scenarios

The planner shall compare potential exit scenarios using the proposed entry, quantity, fees, and currency. Every calculated level and outcome is an estimate; the page does not retrieve chart levels, place orders, or guarantee an exit.

**Profit targets**

- Provide mandatory target `T1`, calculated from the entry using the editable profit-target percentage `PT`, defaulting to `2%`:
  - Long: `T1 = EntryPrice * (1 + PT)`
  - This release supports long scenarios only. Short-sale planning and short-position scenario handling are deferred to a future release.
- Allow optional additional targets `T2...Tn`. Each target may be entered as a price or generated by one of the optional methods below. Record the target's source and chart timeframe/date when provided.
- Optional resistance target: let the user enter the next resistance price and its chart timeframe (for example, `1D`). This is a user-supplied chart observation, not an automatically discovered level.
- Optional Fibonacci extension targets: capture Point A (swing low), Point B (swing high), and Point C (pullback low). Calculate and present all seven long extension levels using `Target = C + (B - A) * ratio`, with ratio values `0.236`, `0.382`, `0.50`, `0.65`, `0.764`, `1.00`, and `1.20`, respectively. Identify each result by its extension percentage. Record the three point prices, timeframe, and date/source. These are candidate target scenarios, not automatically selected orders. Short/bearish projections are out of scope.
- Optional trend-line / “return to the scene of the crime” target: allow a manually entered target price and optional note/timeframe. Automatic trend-line drawing, detection, and price projection are out of scope unless separately specified.
- For every target candidate, show its estimated net P&L, ROI, and reward/risk against the selected stop scenario. Label each metric and its assumptions; do not compare a target against an unstated or different stop.

**Stop-loss scenarios**

- Provide mandatory stop `SL`, calculated from the loss-tolerance percentage:
  - Long: `SL = EntryPrice * (1 - LossTolerance)`
  - This release supports long scenarios only. Short-sale stops are deferred to a future release.
- Allow the user to enter ATR and ATRP values as optional alternative stop distances and show the resulting stop price and estimated net loss when each is applied:
  - ATR is an absolute price distance. Initial long scenario: `ATRStop = EntryPrice - ATR`.
  - ATRP is a percentage of entry price. Initial long scenario: `ATRPStop = EntryPrice * (1 - ATRP)`.
  - Require the source timeframe and as-of date for manually supplied ATR/ATRP values. Do not imply live data.
- ATR and ATRP alternatives are estimates, not extra fees or target rules. They must not silently replace the mandatory SL or change quantity. If the user selects an alternative stop for comparison, identify it as the stop used for that target's reward/risk calculation.
- ATR multiplier remains to be decided. Short-side ATR/ATRP orientation is out of scope for this release and may be specified in a future release.

**Scenario inputs and calculations**

- Use the same planned quantity, entry fee, exit fee, and currency for comparisons unless the user explicitly changes an assumption; show the values used for each scenario.
- Calculate outcomes consistently for REQ1 and REQ2:
  - `Investment = Quantity * EntryPrice + EntryFee`
  - `StopPnl = Quantity * StopPrice - ExitFee - Investment`
  - `TargetPnl = Quantity * TargetPrice - ExitFee - Investment`
  - Treat an unspecified entry fee as zero and display that assumption.
  - `RewardRisk = TargetPnl / abs(StopPnl)` only when `TargetPnl > 0` and `StopPnl < 0`.
  - `TargetROI = TargetPnl / Investment * 100` only when `Investment > 0`.
- Show outcome in currency and percentage where applicable. Use fee-inclusive P&L and clearly labeled ROI/reward-risk formulas defined in this spec.
- Validate target/stop ordering and reject zero or negative risk distances before presenting reward/risk. Display unavailable rather than a misleading number when a denominator is zero or a scenario has no positive reward.

The REQ1 workbook uses `LossTolerance` both for the maximum currency risk budget (`Funding * LossTolerance`) and as the percentage distance from entry to the stop. Keep the baseline visible as two concepts—**maximum account risk** and **stop distance**—and confirm whether they are intentionally controlled by one shared input or should be separate inputs. If stop distance is zero/non-positive or would produce invalid quantity, show a validation error.

**NVDA example:** For entry `$232.48`, the mandatory 2% T1 is `$232.48 * 1.02 = $237.1296`, displayed as `$237.13`. The optional resistance target T2 is `$243.38` on the `1D` chart. Store T2 as a manually observed resistance level with timeframe/source; do not imply automatic chart lookup.

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
- Store history separately from the REQ2 open-position snapshot. The history is transaction-level and append-only; retain the existing execution-ledger rules for recording executions and deriving realized P&L. The portfolio JSON execution ledger remains the source for position calculations.
- Maintain a persistent, separate CSV history log for actual executions. This is not the DCA page's optional downloadable audit/troubleshooting file, and it is not merely a one-time CSV download. It exists to retain executed buys, reductions, and closes for later review, including activity after a position is flat.
- Append one record for each successfully recorded execution, including opening/increase executions, partial reductions, and full closes. Do not append a row for a plan, estimate, failed validation, or cancelled action.
- The portfolio JSON execution ledger remains the source for position calculation and accounting. The CSV is a durable history/audit copy; define a stable execution identity and append/duplicate-prevention behavior so a retry cannot create duplicate history rows.
- Each CSV row shall include at minimum: ticker, execution ID or stable sequence, execution date, action, long-position effect (open/increase/reduce/close), quantity, execution price, commission, currency, strategy, realized P&L (blank or zero according to a documented convention when the execution does not realize P&L), and an optional plan/lifecycle ID if adopted.
- Include the fields needed to interpret realized P&L, including the accounting method (FIFO) and any relevant allocated basis/released basis, or clearly document that these are derived by replaying the referenced execution ledger. Do not misrepresent an execution-level P&L as a complete closed-lifecycle result when one execution only partially reduces a position.
- Preserve the append order of executions. Define stable headers, ISO date format, decimal representation independent of display formatting, UTF-8 encoding, and correct CSV escaping for commas, quotes, and newlines. Never rewrite or delete existing history rows when the open snapshot changes or a position closes.
- Provide a way to initialize the history from existing portfolio JSON executions before the first new execution is appended. The migration must be idempotent and must detect/reconcile already logged execution IDs.
- The persistent CSV is not silently overwritten. The system shall report write/permission/space errors before treating an execution and its history log as fully saved. Define recovery behavior if updating the portfolio JSON succeeds but appending the CSV fails, or vice versa.
- Do not implement this history CSV as a user-triggered download in this release. It must be a persistent, separate file that retains history across sessions; the DCA audit/troubleshooting export remains a separate workflow.
- Do not overwrite or delete historical executions when a position is closed or reduced.
- The transaction-level history shall remain consistent with the append-only execution contract and the existing [trade-history requirements](../Trades-window-with-filter/README.md).
- A closed-position summary may show opening activity, closing activity, holding period, realized P&L, commissions, strategy, and plan reference, but only when those values can be derived unambiguously from the selected grouping/accounting rules.
- Historical values shall not be silently recalculated using a current quote. The view shall distinguish recorded execution prices from any current or estimated price.
- When new long-only executions are recorded by this feature, they shall be written to the portfolio JSON execution ledger and reflected in the persistent CSV history. Short-sale entry/management is not supported in this release; short records already present in imported historical data must not be silently transformed or discarded.

#### REQ3 CSV purpose and storage options

The history CSV has a different purpose from the DCA page's optional CSV/audit workflow:

| History CSV (this feature) | DCA audit/troubleshooting CSV |
| --- | --- |
| Durable, append-only transaction history for later review | Diagnostic trace of loaded/edited planner data used to investigate mistakes |
| One row per actual execution; includes reductions and full closes | Not the canonical execution history |
| Must persist between sessions and remain available when the current position is flat | User-initiated or workflow-specific troubleshooting artifact |
| Tied to actual execution IDs and accounting results | Does not establish that an order executed |
| Not merely a browser download | Existing DCA workflow behavior remains unchanged |

Possible persistence implementations:

| Option | How it works | Advantages | Risks/limitations |
| --- | --- | --- | --- |
| **A. User-authorized CSV sidecar (recommended for a local browser app)** | User selects/creates a history CSV through a browser file-picker with write permission. The app appends each committed execution and retains the file handle where browser security permits. | Matches the user's separate-file requirement; data remains a normal spreadsheet-readable file under user control; no server required. | File System Access API support is browser-dependent; permission can be revoked; selecting the portfolio JSON and CSV are two independent writes, so they cannot be committed atomically. The app needs visible sync status and a safe retry/reconciliation flow. |
| **B. Local browser database, with CSV as a persistent managed artifact** | Keep execution-history events in IndexedDB and provide a persistent history view plus explicit CSV save/export. | Better browser-side transaction handling, indexing, and recovery than repeatedly rewriting CSV; useful if more reporting is added. | The database is browser/profile-specific and not itself a portable CSV; backup and CSV generation still need clear UX. A CSV cannot be assumed to exist or stay current without an authorized write/export action. |
| **C. Backend history service** | Server stores executions and produces/exports the CSV; portfolio state and history can be committed transactionally. | Strongest consistency, backup, multi-device access, and audit controls. | Requires evolving the static single-user app into a service, including authentication, hosting, APIs, and operations; outside a minimal local-page release. |

Option B satisfies the requirement only if it also maintains the persistent CSV file, such as by syncing to a user-authorized sidecar. An IndexedDB record plus an explicit CSV download/export alone is not sufficient.

**Recommended initial contract:** Keep the existing portfolio JSON execution ledger as the accounting/source-of-truth input, and use a user-authorized CSV sidecar as the durable review log. Give every execution a stable `ExecutionID` (including deterministic IDs assigned when migrating existing executions) so retries can detect an already appended row. Write and validate the portfolio JSON state first, then append the corresponding CSV row; if CSV append fails, report that the execution is recorded in JSON but not yet synchronized to the history CSV, preserve the pending execution identity, and offer a retry that does not duplicate the row. Do not tell the user both stores are saved until both writes are confirmed. This cross-file failure behavior, browser support baseline, and migration of existing rows must be accepted before implementation.

The user must choose the CSV persistence option before implementation. A conventional download-only flow does **not** satisfy this requirement.

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

The legacy metric labels are not fully consistent with their calculations: `R:R P` is a return on investment, and `L` and `P` use different fee treatments. The new feature shall use descriptive labels (`Stop P&L`, `Target P&L`, `Reward/Risk`, and `Target ROI`) and state which fees are included, rather than reproduce ambiguous abbreviations as product terminology. The legacy `L` and `P` columns are not required for the new feature.

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

The old `L` and `P` percentage columns use inconsistent fee bases. The release should retire them in favor of the clearly named Stop P&L, Target P&L, Reward/Risk, and Target ROI outputs unless there is a specific user need to retain the legacy calculations. If retained, document their distinct fee treatment. Do not silently relabel them as fee-inclusive returns.

## Calculation and data-integrity rules

1. **Formula source:** The workbook-backed behavior above is the legacy baseline, not automatically the new product contract. Record any approved correction or improvement and its worked examples here before implementation.
2. **Scenario vs execution:** Planner inputs and results are estimates. They must not be written as executed trades until the user records an actual execution.
3. **Long and short orientation:** The new planner and snapshot workflow support long positions only in this release. Short-sale planning and tracking are deferred to a future release; existing positions-page short accounting is unchanged.
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
- Mandatory T1 uses the PT percentage, default `2%`; the mandatory SL is calculated from loss tolerance. Each target candidate shows net P&L, ROI, and reward/risk against the explicitly selected stop.
- Optional T2...Tn can store user-entered prices and their timeframe/source. Resistance, Fibonacci, trend-line, ATR, and ATRP levels are identified as user-provided or formula-derived scenarios, not live chart data.
- When a Fibonacci extension is calculated, the UI presents all seven requested levels in order: 23.6%, 38.2%, 50%, 65%, 76.4%, 100%, and 120%. For Point A=`100`, Point B=`120`, and Point C=`110`, the corresponding targets are `114.72`, `117.64`, `120`, `123`, `125.28`, `130`, and `134`.
- Optional chart/volatility inputs retain their source value, units, timeframe, and as-of date; changing those inputs updates only the relevant scenario estimates.
- For the NVDA example, `$232.48` entry with `PT=2%` calculates T1 as `$237.1296`, displayed as `$237.13`; the user-entered `1D` resistance T2 is `$243.38`.
- ATR and ATRP scenarios show the assumed value, units, timeframe/date, stop price, and net loss; they do not silently replace the mandatory stop or change quantity.
- Zero/invalid risk and reward do not produce a numeric reward/risk result; the UI shows an explicit unavailable state.
- The new planner and snapshot accept long scenarios only. No short-sale planning or short-position workflow is added by these features in this release; future short-sale support is deferred, and existing portfolio-page behavior is unchanged.
- Editing a plan does not change portfolio executions or derived open-position totals.

### Position tracking and history

- Recording an execution changes the position only after explicit confirmation and follows the current JSON execution contract.
- Partial reductions, full closes, FIFO basis, commissions, and realized results continue to satisfy the existing position specification’s worked examples.
- When retaining REQ2's ACRE formulas, `Q=110`, `EP=$4.43`, entry fee `$0`, stop `$3`, target `$5.30`, and exit fee `$1.01` produce `$487.30` investment, `-$158.31` stop P&L, and `$94.69` target P&L. Show Reward/Risk as approximately `0.598:1` and Target ROI separately as approximately `19.43%`.
- A blank asset or zero quantity produces a validation/empty state, not the workbook's fee-only P&L result.
- YOC uses dividend, periodicity, and fee-inclusive basis from the selected portfolio JSON asset, matches the DCA formula, and is `N/A` for missing/unmatched asset data, `Periodicity: "N/A"`, unavailable basis, flat positions, or shorts. An absent periodicity uses the DCA page's legacy `M` fallback; a valid zero dividend rate displays 0%.
- The feature can load a user-selected portfolio JSON file with the same validation and local import/export behavior as the existing browser pages; it does not silently overwrite the selected file.
- The existing DCA CSV download remains unchanged in content, format, generation, and user workflow. The new planner, open-position snapshot, and persistent execution-history CSV do not read, write, repurpose, or otherwise alter that DCA CSV.
- Open-position snapshot rows are not treated as the historical record; open, reduction, and close events remain available in the separately defined append-only history.
- Each successfully saved execution is retained in the persistent CSV history sidecar, including opening/increase, partial reduction, and close activity, even after the position becomes flat.
- CSV history rows have stable execution IDs, retain ledger order, include realized P&L and required context, and correctly escape CSV fields.
- Existing executions can be reconciled into a newly selected history CSV without losing ledger order or duplicating records; each migrated record has a stable execution identity.
- A CSV write failure is reported distinctly from a portfolio JSON save. Retrying a pending CSV append does not duplicate a row, and the UI does not claim both stores are saved until both writes succeed.
- Closing or reducing a position does not delete or overwrite its previously recorded CSV rows.
- The CSV history remains available across page reloads/sessions and is not confused with the DCA audit/troubleshooting CSV. It is not a downloadable artifact in this release.
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
- **Scenario comparison:** Show ideal and realistic target/stop scenarios side by side, with the assumptions and risk/reward for each scenario visible. Fibonacci extension levels in the planner must include the seven confirmed percentages above.
- **Valuation provenance:** For any manually entered current price, retain the value and its “as of” date/time so an estimate can be interpreted later.
- **Outcome review:** Summarize realized results from executions separately from estimated outcomes and avoid labeling a trade successful based only on an unrealized mark.

## Decisions required before implementation

1. **Persistence and source of truth:** Are the Excel workbooks reference-only, or must the release import `.xlsx`/CSV? If imported, define how workbook edits and portfolio JSON edits are reconciled. Do not imply workbook import is supported until it is implemented and tested.
2. **REQ1 fee and sizing:** Should the editable default 1.00 exit fee affect only scenario P&L, preserving legacy quantity sizing, or should sizing reserve that fee from the risk budget? Is an entry fee also needed for planned trades?
3. **Risk tolerance inputs:** Should the legacy shared percentage continue to control both maximum account risk and stop distance, or should those become independent inputs?
4. **Snapshot source:** Are open quantity and fee-inclusive average basis read-only values derived from the loaded portfolio JSON, or are they editable snapshot fields? If manually overridden, define how they are reconciled with the actual execution ledger.
5. **CSV persistence implementation:** Choose the durable CSV sidecar, IndexedDB-backed history, or backend service described above. A download-only implementation is out of scope. Confirm supported browsers and the user-facing file selection/permission workflow.
6. **Migration and consistency:** Approve the stable `ExecutionID` strategy for existing JSON execution records, and the proposed migration, idempotent retry, and recovery behavior if the JSON save succeeds but the CSV append fails (or vice versa).
7. **ATR inputs:** Confirm ATR/ATRP source, units, timeframe, and as-of date; whether the default ATR multiplier is 1x or user-selectable; and whether ATR values remain manually entered in the first release.
8. **Targets and chart concepts:** Confirm that additional non-Fibonacci targets are manually entered and define the minimal stored trend-line data (for example, a manually entered candidate price and timeframe). The Fibonacci extension percentages are confirmed above. No automatic chart analysis is assumed.
9. **Strategy mapping:** Confirm `DT` → `Daytrade` and whether `LF` maps to `LongtimeInvestment` or a distinct value.
10. **YOC ticker matching:** Confirm ticker matching when the snapshot instrument description differs from the portfolio ticker key (for example, `GS 2027 7.4%`). Do not fuzzy-match without user confirmation.
11. **Plan identity and lifecycle grouping:** Is an identifier needed for a plan, an execution, a full position lifecycle, or a strategy/campaign? One lifecycle can have many executions and partial closes, so define grouping before adding a `TradeID` field.
12. **Plan-to-execution link and valuation:** Should a user be able to start an execution from a plan with values prefilled? If so, identify copied values and require confirmation of actual fill price, quantity, date, and fees. Is a current price manually entered for estimates, or is a market-data provider required?

## Suggested delivery sequence

1. Resolve remaining planning questions, especially fee sizing, shared risk inputs, target/chart inputs, and plan persistence.
2. Choose the persistent CSV implementation and confirm its supported-browser, file-selection, and permission workflow; a download-only flow is not an option.
3. Define stable IDs for new and legacy executions, idempotent JSON-to-CSV migration, and visible retry/recovery behavior for interrupted or partial writes.
4. Define how the page selects and matches a portfolio JSON ticker record and whether snapshot quantity/basis are derived from that file.
5. Implement and validate the planner as estimates only, using the worked examples above as regression checks where legacy formulas are retained.
6. Integrate an explicit plan-to-execution handoff with the existing positions page, if approved, and append each confirmed execution to persistent history.
7. Validate financial examples, JSON load/export, CSV migration and persistence across sessions, duplicate prevention, interrupted-write recovery, and the release acceptance criteria above.

## Reconciled source files

The source workbooks remain unchanged under [spreadsheets-old-way/](spreadsheets-old-way/). REQ2's legacy YOC column contains cached values and formulas linked to an absent external dividend workbook; these values are superseded by the JSON-backed DCA calculation specified above.
