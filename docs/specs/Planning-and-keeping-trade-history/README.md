# Trade Planning, Tracking, and History Requirements

## Status and purpose

This document is a requirements draft for the next release. It describes two connected capabilities:

1. Evaluate a proposed trade before placing an order.
2. Carry the plan into position tracking and retain the resulting trade history.

These capabilities may be delivered as a new planning page plus enhancements to the existing positions page. The release should reuse the current portfolio and execution-history behavior rather than create a second position ledger.

The previous planning and tracking workflow used Excel workbooks. They are retained as historical references, not used by the new release at runtime. The repository also has a browser positions page that loads and exports `portfolio.json`, records append-only executions, derives position totals, and displays trade history. The new planner uses its specified browser-local plan store and the portfolio JSON for real-position context.

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

- **NVDA target example:** The correct entry is `$232.48`. At the default `PT=2%`, T1 is `$237.1296`, displayed as `$237.13`; the user-entered resistance target T2 is `$243.38` on the `1 Day` chart interval.
- **Direction scope:** The new planning and snapshot workflow is long-only for this release. Short-sale support is deferred to a future release. This does not change short accounting already supported by the existing positions page or erase historical short executions.
- **Immutable executions:** Once a real execution is recorded in the portfolio JSON, its execution row is immutable. Open, increase, reduction, and close activity is represented by appending new rows; changing a plan or closing a position never edits or removes a recorded execution. Derived aggregate fields such as open quantity and average basis may still be recalculated from the ledger.
- **Two distinct CSV workflows:** Preserve the existing user-requested CSV from the Positions trade-history dialog. It remains a filtered, spreadsheet-friendly view for inspecting and auditing loaded portfolio history; its save location is selected through the browser's download workflow. The new execution-history CSV is a separate system-maintained append log, updated for each newly recorded execution, including reductions and closes. It is not a replacement for or repurposing of the existing export.
- **Plan storage and strategy purpose:** Plans are planning records in the new plan page, not executions. Multiple plans may exist for the same ticker, each with its own criteria and stable Plan ID; a plan-originated opening execution records its Plan ID and the exact Plan Revision ID used. A user may record an execution without a plan. Strategies classify capital allocation and remain unchanged for the lifetime of an open position.
- **Adjustable planning inputs and defaults:** Funding in currency, risk tolerance/budget in percent, PT1 in percent, and exit fee in currency are user-editable plan inputs. Defaults must appear as actual field values when the page loads, not only as placeholders. Initial defaults are `$2,500` funding, `1%` risk tolerance, `2%` PT1, and `$1.00` exit fee for a USD plan. The exit fee may be set to `$0`; a nonzero fee is included in scenario P&L and planned quantity sizing. Save the values and defaults used with each plan revision.
- **ATR and ATRP inputs:** In this release, the user supplies ATR as an absolute price distance and ATRP as a percentage. Apply the documented formulas to those inputs; do not fetch or calculate them from market history. Modernizing `python/getAtr.py` or connecting it to the page is out of scope.
- **Stop scenarios:** Support `SL1` through `SLn`, just as the planner supports `PT1` through `PTn`. `SL1` is derived from risk tolerance; additional stops may be entered as explicit prices or derived from supplied ATR/ATRP values. Show sizing and outcomes for each candidate rather than treating alternative stops as live orders.
- **Plan selection from Positions:** For a selected portfolio JSON ticker that does not start with `.`, offer matching plans when no position is open. The user may select a plan to prefill an opening execution and must confirm actual values. The new execution stores the plan's Plan ID and selected revision ID in portfolio JSON. Do not retrofit these links to older executions or attach a new plan to an already-open unlinked position. Reductions and closes are allowed without choosing or linking a plan; if no suitable plan applies, the new execution has no plan reference.
- **Plan-to-position cardinality and closure:** A plan may be associated with at most one position lifecycle, and an open position lifecycle may be associated with at most one plan. This lifecycle association is established by the opening execution. A reduction or close execution may omit the plan reference when no suitable plan applies; this does not undo the opening lifecycle association. The plan's `positionClosed` flag is set when its linked position reaches zero; a closed plan becomes read-only and cannot be used to open another position. An unexecuted plan is not considered closed.
- **Plan closure and locking:** Keep plan closure state in the planning store. When the linked position is fully closed, mark the plan's position as closed and make that plan read-only. Unexecuted plans remain editable; an open linked position does not itself lock the plan.
- **IndexedDB behavior:** IndexedDB is a browser-managed structured database, not a plain-text file and not a third-party hosted service. The browser persists its internal representation for the app's origin and loads requested records into page memory through its JavaScript API; the full database need not be loaded at once. Records survive page reloads but may be lost if site data is cleared. IndexedDB is not encrypted by this requirement. A user-readable JSON backup/export remains a separate feature decision.
- **Execution-history CSV ownership:** The app appends to a user-selected CSV automatically while browser file permission is available. The user is responsible for opening it in spreadsheet software and managing its location, backup, retention, and sharing. Permission and browser support remain technical constraints; the CSV is not the existing filtered Positions download.
- **Trend-line observation:** A trend-line input is a manually observed price point from a chart, recorded with its chart interval (for example, `1 Day`) and observation time/source. It is not a chart object drawn or automatically detected by this feature.
- **SniperNine:** Describe it as an automated, proprietary strategy whose performance is currently being tested. This is descriptive only: the planner does not execute the strategy or imply that its performance is established.
- **Fibonacci extensions:** When a Fibonacci extension calculation is shown, present all eight levels, in order: 23.6%, 38.2%, 50%, 61.8%, 65%, 76.4%, 100%, and 120%. The 61.8% and 65% levels are distinct requested options.

These clarifications supersede any conflicting earlier wording in the requirements and the open-questions list below.

## Current state and release boundary

| Area | Current workflow | Existing repository behavior |
| --- | --- | --- |
| Pre-trade evaluation | Formerly an Excel workbook with funding, risk tolerance, entry, target, stop, and quantity calculations | New plan page stores editable plans separately from recorded executions |
| Open-position tracking | Formerly a separate Excel workbook | Positions page records immutable executions in JSON and derives open quantity, basis, and realized P&L |
| Closed-position review | Spreadsheet history | Positions page retains executions and provides trade history; a grouped “trade” history is not currently part of the execution-ledger contract |
| Persistence | Excel files | Browser pages load a user-selected portfolio JSON file and download an export; export does not update the selected source file automatically |

### Proposed release boundary

- **Planner:** Add a browser feature for entering and reviewing a proposed trade, its assumptions, and its estimated risk/reward. The selected portfolio JSON remains the source for real positions; the legacy workbooks are reference material, not an assumed runtime import format.
- **Position tracking:** Reuse the existing positions page and execution ledger for actual buys, sells, reductions, and closes. Do not create a parallel editable spreadsheet-style position table.
- **History:** Keep the open-position snapshot separate from the historical record. The append-only execution ledger in `portfolio.json` remains the calculation source. Maintain a separate persistent execution-history CSV, while retaining the existing user-requested Positions history CSV for filtered review and audit.
- **Plan linkage:** Persist a stable Plan ID and the exact Plan Revision ID used on new plan-originated portfolio JSON executions. Do not infer or backfill plan links for older executions. Keep both plan identifiers distinct from any execution identifier used for CSV retry/deduplication.
- **Market data:** Assume prices are entered by the user for the initial release. Live quotes, automatic price refresh, broker integration, and automatic order execution are out of scope unless separately approved.
- **Excel and JSON:** The legacy workbooks are not used in the new workflow; no `.xlsx` import is required. The new plan store contains planning inputs, while the selected portfolio JSON remains the source of real executions and position accounting.

### Page and visual integration

The planner is a new page; the existing [`positions.html`](../../../html/positions.html) remains the real-position entry, reduction, close, and history page. Do not port or depend on the legacy Python `addPosition.py` script. Preserve the boundary between the new planner, the positions execution ledger, the existing DCA planner, and the Positions page's user-requested history CSV.

Changes to the existing positions page should extend its established workflow rather than replace it:

| Existing page area | Planned addition or preserved behavior |
| --- | --- |
| Header and navigation | Add a clear link to the new planner. Retain the existing DCA navigation and portfolio JSON open/export controls. |
| Selected ticker and position summary | Continue to show the selected asset and ledger-derived direction, open quantity, average basis, and open basis/proceeds. Do not create a second editable position balance or alter the execution ledger to store scenario estimates. |
| Scenario/snapshot area | Add a visually distinct section for open-position stop/target scenarios and their estimates, using the selected ticker and current open position when available. Show the price/level source and as-of chart interval/date. Keep estimated P&L, Reward/Risk, and ROI distinct from recorded executions and realized P&L. Do not treat candidate stops or targets as orders. If the selected position is short, preserve its existing position and execution controls; do not offer the new long-only snapshot calculations for it. |
| Execution forms and history | Preserve the existing open/add, reduce, close, and filtered trade-history export behavior. Any persistent execution-history CSV status and retry action must be clearly separate from the existing user-requested export. The filtered export may gain fields that improve auditability without changing its purpose or making it the persistent history store. |
| Strategy field | Keep the portfolio's canonical strategy values. For an open position, retain the strategy chosen on opening and do not allow it to change before the position is fully closed; a new position opened later may select another strategy. Add concise helper text or an accessible description; do not persist workbook abbreviations such as `DT`, `HF`, or `LF` as new enum values. Describe `SniperNine` as an automated proprietary strategy under performance testing, without claiming proven performance or running it from this feature. |

Any new page and all added sections should follow the existing pages' visual language: centered content around the current 1100px maximum width, pale gray page background, white rounded content surfaces, the existing system font stack, navy/blue actions, muted field labels, and consistent tables, spacing, and focus indicators. Reuse the responsive grid and mobile stacking behavior; long tables may scroll horizontally rather than force page-wide overflow. Keep controls keyboard-accessible and label fields and live status messages. Match the current design patterns without requiring an unrelated CSS refactor.

### Plan storage, execution links, and strategy allocation

- Persist full plan records in IndexedDB, separately from the execution ledger, while storing a stable `PlanID` and the exact `PlanRevisionID` used on new plan-originated executions in `portfolio.json`. Multiple plans may exist for one ticker; each plan record contains its own criteria and ticker. A plan and a position lifecycle are linked one-to-one. Older execution rows remain unlinked; do not assign or infer plan links retroactively.
- Keep saved plan revisions so later edits cannot erase criteria used for earlier review. When a selected plan is used to record an opening execution, include its Plan ID and the exact revision ID used. Subsequent execution rows for that position may retain the same references when relevant, but do not require a plan selection or link for reductions or closes; the user may leave the plan reference blank if no available plan applies. Never substitute a different plan for an already-open position. Plan edits create later revisions and do not change the revision referenced by the opening execution. A plan may remain editable while its linked position is open. When the position reaches zero, set the plan-domain closed flag based on the linked position lifecycle and make the plan read-only, even if the closing execution itself has no Plan ID; an unexecuted plan remains editable.
- When a selected real ticker (not dot-prefixed) has multiple plans and no open position, let the user choose the matching plan. Prefill appropriate opening fields, but require confirmation of actual quantity, execution price, date, fees, and strategy before recording. A plan does not place an order, and actual values may differ from its estimates. Do not attach a plan to a position that is already open or link a second plan to one position.
- Use the Plan ID and opening Plan Revision ID on the lifecycle opening execution to review the exact plan criteria alongside position history. An individual reduction or close execution may have no plan reference, and that does not remove the lifecycle-level link established at opening. Do not claim a plan association for older executions, an opening execution recorded without selecting a plan, or an individual management execution left unlinked.
- Treat strategy as a capital-allocation classification, separate from Plan ID and execution identity. A position keeps the strategy chosen when it is opened until that position is fully closed; additions and reductions do not change it. A subsequent position opened after closure may use another strategy. Attribute the remaining open basis and portfolio-derived long dividend projections to that position strategy; show shorts and non-dividend assets separately or as not applicable rather than as positive dividend income.
- Strategy `SniperNine` is an automated, proprietary strategy under performance testing; do not present its performance as established or imply that this planning feature runs it.
- **IndexedDB behavior and example:** IndexedDB is a browser-provided structured database API, not a third-party service or an ordinary plain-text file. A database such as `TradePlanner` could contain a `plans` object store keyed by `planId`, with ticker, current criteria, saved revisions (each with a stable revision ID), position-closed flag, and timestamps; a `settings` store may hold the selected CSV file handle and pending append status. The browser stores data in its own internal format and manages persistence, indexes, and transactions. When the application requests records, those records are materialized as JavaScript objects in page memory; the app need not load the entire database. Data is local to the web-app origin and browser profile, survives page reloads, is not encrypted by this requirement, and may be removed when site data is cleared. A separate JSON backup/export format remains to be defined.
- **CSV responsibility:** After the user selects/creates the separate execution-history CSV and grants file access, the app appends newly recorded execution rows automatically while permission is available. The user is responsible for opening the CSV in spreadsheet software and managing its location, backup, retention, and sharing. The app must explain permission requirements and report append or permission failures; it must not silently overwrite the file. This does not change the existing user-triggered filtered history download.
- **Trend-line input:** Store a manually observed chart price point with the asset, chart interval, observation date/time, and source/context. Use the supported chart interval labels, such as `1 Day`. The feature does not draw or automatically detect trend-lines.
- **Proposed local implementation:** Use IndexedDB for plan records, revisions, the closed flag, selected-file handle, and pending synchronization/recovery metadata. Keep Plan IDs, Plan Revision IDs, and execution IDs distinct. New plan-originated opening executions carry the Plan ID and Plan Revision ID selected at opening. Later executions may carry those same references, but reductions and closes are valid without any plan reference; legacy executions are not retroactively assigned plan references.

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
| **Plan ID** | Stable identifier for a plan record tied to a ticker and criteria history. It is stored on new plan-originated portfolio executions and is distinct from an execution identifier. |
| **Plan Revision ID** | Stable identifier for one saved version of a plan's criteria. The opening execution stores the revision used; later events may repeat that reference but reductions and closes may omit it. |
| **Execution ID** | Stable identifier for one individual execution, used for execution-history CSV synchronization and duplicate prevention. It is distinct from Plan ID and Plan Revision ID. |

## Requirements

### REQ1 — Evaluate a proposed trade

The planner shall let the user enter and review the following inputs and calculated values:

| Input or result | Meaning | Requirement |
| --- | --- | --- |
| Funding | Capital amount used by the plan | User-editable currency amount; new plans default to `$2,500` |
| Loss tolerance / risk budget | Percentage of funding that defines maximum planned loss | User-editable percentage; defaults to `1%`. Show both the percentage and derived currency risk budget |
| PT1 | First profit target percentage above entry | User-editable percentage; defaults to `2%` |
| Estimated exit fee | Estimated fee for the planned exit | Optional, user-editable currency amount; defaults to `1.00` in the selected plan currency (`$1.00` for USD), and `0` is valid. Include it in net scenario P&L and risk-based quantity sizing. |
| Asset/ticker and direction | Instrument and proposed side | Long only in this release; short-sale planning is deferred |
| Entry price | Planned entry price per unit | User-entered |
| ATR and ATR percentage | Volatility values included by the workbook | Store/display their value, date, and source; do not imply they are live unless refreshed |
| Stop | Planned stop price | Distinguish calculated/ideal stop from a user-entered realistic or predicted stop |
| Profit target | Planned exit target | Distinguish calculated/ideal target from a user-entered realistic target |
| Quantity | Proposed position size | Show whether fractional units are supported and how quantity is rounded |
| Fees | Estimated commissions/fees where applicable | Show each assumption and include it consistently in estimates; REQ1's confirmed legacy fee is an editable exit-fee input defaulting to 1.00 in the selected plan currency |
| Estimated outcomes | Risk, reward, P&L, reward/risk, and ROI | Label as estimates, not actual performance; display reward/risk as a ratio and ROI as a percentage for supported long scenarios |

The planner shall preserve the inputs and outputs needed to review the decision later, using the plan storage and revision rules above. Editing a plan must not modify an already recorded execution. Funding (currency amount), risk tolerance/budget (percentage), PT1 (percentage), and exit fee (currency amount) are adjustable inputs. Populate new-plan fields on page load with defaults: `$2,500` funding, `1%` risk tolerance, `2%` PT1, and `1.00` exit fee in the plan currency (`$1.00` for USD). These are visible field values that users can change, not placeholder text. An exit fee of zero is valid. Store inputs with each plan revision.

Enter and display percentage fields in percentage points (`1` means `1%`), then convert once for calculations: `RiskFraction = RiskTolerancePercent / 100` and `PTFraction = PTPercent / 100`. Thus `RiskBudget = Funding * RiskFraction`, `SL1 = EntryPrice * (1 - RiskFraction)`, and `T1 = EntryPrice * (1 + PTFraction)`.

Use the plan's currency and do not convert currencies. Include the optional exit fee in estimated net P&L and in risk-budget sizing. With risk budget `R`, optional entry fee `F_in` (zero when absent), exit fee `F_out`, entry price `E`, and selected stop `SL`, calculate risk-limited quantity as `(R - F_in - F_out) / (E - SL)` when `E > SL` and `R > F_in + F_out`. Also constrain quantity so planned entry investment does not exceed funding: `Q_funding = (Funding - F_in) / E`; the allowed quantity for that stop is the smaller of the risk-limited and funding-limited quantities. If the exit fee is omitted, treat it as `$0` (or zero in the selected currency); if fees consume the risk budget or funding, or either denominator is invalid, show a validation/unavailable state rather than zero or negative quantity. Keep fractional quantity unless a separate rounding rule is selected.

#### REQ1 exit scenarios

The planner shall compare potential exit scenarios using the proposed entry, quantity, fees, and currency. Every calculated level and outcome is an estimate; the page does not retrieve chart levels, place orders, or guarantee an exit.

**Profit targets**

- Provide mandatory target `T1`, calculated from the entry using the editable profit-target percentage `PT`, defaulting to `2%`:
  - Long: `T1 = EntryPrice * (1 + PTFraction)`
  - This release supports long scenarios only. Short-sale planning and short-position scenario handling are deferred to a future release.
- Allow optional additional targets `T2...Tn`. Each target may be entered as a price or generated by one of the optional methods below. Record the target's source, chart interval, and observation date/time when provided.
- Optional resistance target: let the user enter the next resistance price and its chart interval (for example, `1 Day`). This is a user-supplied chart observation, not an automatically discovered level.
- Optional Fibonacci extension targets: capture Point A (swing low), Point B (swing high), and Point C (pullback low). Calculate and present all eight long extension levels using `Target = C + (B - A) * ratio`, with ratio values `0.236`, `0.382`, `0.50`, `0.618`, `0.65`, `0.764`, `1.00`, and `1.20`, respectively. Identify each result by its extension percentage. Record the three point prices, chart interval, and observation date/time/source. These are candidate target scenarios, not automatically selected orders. Short/bearish projections are out of scope.
- Optional trend-line / “return to the scene of the crime” target: allow a manually observed price point from a chart, with the selected chart interval (for example, `1 Day`) and observation date/time/source. Treat it as a candidate target price; the page does not draw, discover, or project trend-lines.
- For every target candidate, show its estimated net P&L, ROI, and reward/risk against the selected stop scenario. Label each metric and its assumptions; do not compare a target against an unstated or different stop.

**Stop-loss scenarios**

- Provide `SL1`, calculated from the risk-tolerance percentage:
  - Long: `SL1 = EntryPrice * (1 - RiskFraction)`
  - This release supports long scenarios only. Short-sale stops are deferred to a future release.
- Support additional candidate stops `SL2...SLn`. The user may enter a stop price directly or derive one from an entered ATR/ATRP value. Each candidate retains its source, chart interval, and observation date/time when applicable.
- Allow the user to enter ATR and ATRP values as optional alternative stop distances and show the resulting stop price and estimated net loss when each is applied:
  - ATR is a user-supplied absolute price distance. Initial long scenario: `ATRStop = EntryPrice - ATR`.
  - ATRP is a user-supplied percentage of entry price, entered in percentage points (for example, `3` means `3%`); calculate `ATRPStop = EntryPrice * (1 - ATRP / 100)`.
  - Require the source chart interval and as-of date/time for manually supplied ATR/ATRP values. Do not imply live data. Use the direct user-entered ATR distance (1x); no multiplier control or automatic ATR/ATRP retrieval is included in this release.
- Treat each `SLi` as an estimate, not an order. For each valid stop, calculate its allowed quantity using the same funding, risk budget, and fee assumptions; show the stop price/distance, risk-limited size, funding-limited size, and estimated outcomes. The user may select which stop scenario sets the plan's primary quantity; changing the selected stop recalculates the plan quantity and outcomes. Alternative stops must not silently overwrite the selected stop.
- Short-side ATR/ATRP orientation is out of scope for this release and may be specified in a future release.

**Scenario inputs and calculations**

- For a selected `SLi`, use that stop's calculated plan quantity and the same plan fees/currency for all target scenarios being compared. Show the stop and quantity assumptions for every outcome. For unselected alternative stops, show their own allowed quantity and corresponding outcomes so the stop choices can be compared on a consistent risk-budget basis.
- Calculate outcomes consistently for REQ1 and REQ2:
  - `Investment = Quantity * EntryPrice + EntryFee`
  - `StopPnl = Quantity * StopPrice - ExitFee - Investment`
  - `TargetPnl = Quantity * TargetPrice - ExitFee - Investment`
  - Treat an unspecified entry fee as zero and display that assumption.
  - `RewardRisk = TargetPnl / abs(StopPnl)` only when `TargetPnl > 0` and `StopPnl < 0`.
  - `TargetROI = TargetPnl / Investment * 100` only when `Investment > 0`.
- Show outcome in currency and percentage where applicable. Use fee-inclusive P&L and clearly labeled ROI/reward-risk formulas defined in this spec.
- Validate target/stop ordering and reject zero or negative risk distances before presenting reward/risk. Display unavailable rather than a misleading number when a denominator is zero or a scenario has no positive reward.

**Manual technical-indicator readings**

- **RSI (Relative Strength Index):** A momentum oscillator used as technical-analysis context. The user enters the observed RSI reading, from `0` through `100`, along with its chart interval and observation date/time. The page does not calculate RSI.
- **EMA (Exponential Moving Average):** The user may enter the observed EMA price/level for periods `9`, `100`, and `200`. Store the period, observed price/level, chart interval, and observation date/time. These are manually supplied indicator readings; the page does not calculate EMA or infer it from a single current asset price.
- Label this field **Chart interval** and use only these supported values: `1 Week`, `1 Day`, `4 Hours`, `1 Hour`, `30 min`, and `5 min`. Use these exact labels consistently for resistance, Fibonacci inputs, trend-line observations, RSI, EMA, ATR, and ATRP data where an interval is applicable. Do not show alternate labels or duplicate equivalents.
- Display the supplied readings as user-provided context with chart interval and observation date/time. Comparisons with entry, targets, or stops are qualitative confluence only; do not infer a win probability or guaranteed result.

The REQ1 workbook used the adjustable risk-tolerance percentage for both maximum currency risk budget (`Funding * RiskFraction`) and the initial stop distance. Retain this behavior for `SL1` and support separate alternative distances through `SL2...SLn`; each stop alternative uses the same maximum risk budget but may produce a different allowed quantity. For example, `$2,500` funding and `1%` risk tolerance yields a `$25` maximum planned loss. At `$100` entry, `SL1=$99` has `$1` price risk per share; with `$1` exit fee, risk sizing allows 24 shares (price risk `$24` plus fee `$1`). An alternative `SL2=$95` has `$5` price risk per share; with the same `$25` risk budget and `$1` fee, it allows 4.8 shares. Both are before any optional entry fee and below the `$2,500` funding limit. If the fee is `$0`, the same stops allow 25 and 5 shares. If a fee exhausts the budget, or a stop is at/above entry, show a validation error.

**NVDA example:** For entry `$232.48`, the mandatory 2% T1 is `$232.48 * 1.02 = $237.1296`, displayed as `$237.13`. The optional resistance target T2 is `$243.38` at chart interval `1 Day`. Store T2 as a manually observed resistance level with chart interval and observation date/time/source; do not imply automatic chart lookup.

### REQ2 — Record and track an open position

- REQ2 is an open-position snapshot: it shows current open quantity, entry basis, stop/target scenarios, and estimates while the position is open. It is not the historical record and shall not be used to reconstruct closed activity.
- Load the user's selected portfolio JSON using the same local file-selection workflow as the existing browser pages. Do not assume access to a repository file path or silently write changes back to the selected file.
- Use the selected portfolio data for ticker identity, currency, `Div`, `Periodicity`, and current position basis. Calculate YOC as specified below; do not use the old external dividend workbook or its cached values.
- For an open long position, the per-cycle dividend amount is `open Qty * Div`; do not divide by `Periodicity`. If an annual projection is shown, calculate it separately as `per-cycle amount * payoutsPerYear(Periodicity)` (`M=12`, `Q=4`, `S=2`, `A=1`). When `Periodicity` is `N/A`, show dividend projections as `N/A`, not as a payable amount.
- A user shall explicitly record an actual execution; saving or approving a plan alone shall not open a position.
- Actual executions shall use the existing append-only portfolio ledger and accounting rules in [the position specification](../portfolio-update/README.md).
- Treat open quantity and average basis as read-only values derived from the selected portfolio JSON execution ledger; do not create editable duplicate position balances in the snapshot.
- The UI shall show the current direction, open quantity, average basis, invested basis/proceeds, and realized P&L using the existing position behavior.
- Stop and target values originating from a plan may be shown as reference levels, but shall not be represented as executed orders or guaranteed exits.
- The user shall be able to record a partial reduction or full close. The history must retain each execution rather than overwrite the opening record.
- Estimated/unrealized values shall be labelled separately from realized P&L. Any estimate based on a manually entered market/exit price shall display the price used and the applicable fee assumption.
- Keep strategy as capital-allocation classification, not as a plan or execution identifier. A selected Plan ID is stored on new plan-originated executions and retained by subsequent events for the same open position; do not infer or backfill links for older executions.

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
- Preserve the existing Positions trade-history CSV: it is generated at the user's request from the currently filtered history view and downloaded through the browser. Its purpose remains reviewing, filtering, and auditing loaded portfolio data. The table and export shall continue to show the same filtered records. Additional fields may be added where they improve this audit purpose, but this export is not the persistent execution-history log.
- Maintain a second, persistent, system-maintained CSV history log for actual executions. After initial storage setup, append a record when an execution is recorded in Positions, including opening/increase executions, partial reductions, and full closes. Do not append a row for a plan, estimate, failed validation, or cancelled action. The log retains activity after a position becomes flat.
- Recorded execution rows in portfolio JSON are immutable. A reduction, close, plan edit, or history export must never alter or remove an earlier execution. Derived aggregate fields may be recalculated from the immutable ledger.
- The portfolio JSON execution ledger remains the source for position calculation and accounting. The persistent CSV is a durable companion log; give each new execution a stable `ExecutionID` separate from `PlanID` and `PlanRevisionID`, and use it for append/duplicate-prevention so a retry cannot create duplicate history rows. Existing executions without an `ExecutionID` may be assigned repeatable migration identities in the sidecar without rewriting their immutable JSON rows; do not assign plan references to older executions.
- Each persistent CSV row shall include at minimum: ticker, execution ID or stable sequence, optional Plan ID and Plan Revision ID when that individual execution is linked, execution date, action, position effect (open/increase/reduce/close), position side, quantity, execution price, commission, currency, strategy, and realized P&L (blank or zero according to a documented convention when the execution does not realize P&L). Plan IDs, Plan Revision IDs, and execution IDs have distinct meanings; reduction and close rows may leave plan references blank.
- Include the fields needed to interpret realized P&L, including the accounting method (FIFO) and any relevant allocated basis/released basis, or clearly document that these are derived by replaying the referenced execution ledger. Do not misrepresent an execution-level P&L as a complete closed-lifecycle result when one execution only partially reduces a position.
- Preserve the append order of executions. Define stable headers, ISO date format, decimal representation independent of display formatting, UTF-8 encoding, and correct CSV escaping for commas, quotes, and newlines. Never rewrite or delete existing history rows when the open snapshot changes or a position closes.
- Provide a way to initialize the history from existing portfolio JSON executions before the first new execution is appended. The migration must be idempotent and must detect/reconcile already logged execution IDs. This history migration must not add Plan IDs to old JSON execution rows or imply those executions used a plan.
- The persistent CSV is not silently overwritten. The system shall report write/permission/space errors before treating an execution and its history log as fully saved. Define recovery behavior if updating/exporting the portfolio JSON succeeds but appending the CSV fails, or vice versa.
- Do not implement this persistent history as the existing user-triggered download. It is a separate, system-maintained file that retains history across sessions. Browser filesystem APIs require user authorization to select/create a file and may require renewed permission; alternatively a backend service is needed for fully automatic filesystem writes. The user is responsible for opening the CSV in spreadsheet software and managing its location, backup, retention, and sharing. The app must explain setup and expose synchronization/recovery status.
- Do not overwrite or delete historical executions when a position is closed or reduced.
- The transaction-level history shall remain consistent with the append-only execution contract and the existing [trade-history requirements](../Trades-window-with-filter/README.md).
- A closed-position summary may show opening activity, closing activity, holding period, realized P&L, commissions, strategy, and lifecycle Plan ID when these can be derived unambiguously from the opening execution. Individual reduction or closing executions may remain unlinked; older opening executions must not be assigned a plan retroactively.
- Historical values shall not be silently recalculated using a current quote. The view shall distinguish recorded execution prices from any current or estimated price.
- When new long-only executions are recorded by this feature, they shall be written to the portfolio JSON execution ledger and reflected in the persistent CSV history. Short-sale entry/management is not supported in this release; short records already present in imported historical data must not be silently transformed or discarded.

#### REQ3 CSV distinction and storage options

| CSV | Trigger and persistence | Purpose |
| --- | --- | --- |
| Existing Positions trade-history CSV | User opens history, applies filters, and requests a browser download to a chosen location. | Filter, inspect, and audit loaded portfolio history. It may gain useful display/export fields while retaining this purpose and matching the visible filtered rows. |
| New execution-history CSV | System-maintained persistent file; append after each recorded execution once storage is configured. | Durable record of actual executions, including reductions and closes, keyed by stable execution identity and optionally carrying Plan ID and Plan Revision ID when applicable. The user opens/manages this file in spreadsheet software. Not a filtered replacement for the existing export. |

Possible persistence implementations:

| Option | How it works | Advantages | Risks/limitations |
| --- | --- | --- | --- |
| **A. User-authorized CSV sidecar (recommended for this static local app)** | During setup, the user selects/creates the history CSV and grants write permission. Thereafter the app appends each execution automatically while it retains permission. | Produces the required system-maintained spreadsheet-readable file without a server. | Browser support and retained permissions vary; JSON export and CSV append cannot be committed atomically. Requires visible synchronization state, stable IDs, safe retry/reconciliation, and a recovery queue. |
| **B. IndexedDB for plans and recovery state, plus CSV sidecar** | Keep plans, revisions, and pending CSV synchronization state in a browser-local database; maintain the separate CSV through option A. | Keeps plans separate from portfolio JSON and supports revision history and retry state across page reloads. | Data is browser/profile-specific and needs a backup/recovery policy; it does not remove the CSV file permission requirement or guarantee cross-device access. |
| **C. Backend history service** | Server stores executions and produces/exports the CSV; portfolio state and history can be committed transactionally. | Strongest consistency, backup, multi-device access, and audit controls. | Requires evolving the static single-user app into a service, including authentication, hosting, APIs, and operations; outside a minimal local-page release. |

**Proposed initial contract:** Use IndexedDB for plans, plan revisions, closed state, and a pending-sync queue. Use a user-authorized CSV sidecar as the persistent execution-history file, with system appends after a valid execution is recorded. Give each new execution a stable `ExecutionID` distinct from any `PlanID` or `PlanRevisionID`; assign repeatable migration identities to old rows in the sidecar without mutating portfolio JSON or adding plan references. A plan-originated opening execution stores its Plan ID and opening Plan Revision ID in portfolio JSON and the CSV. Later execution rows may retain those references when relevant, but reductions and closes may be unlinked; retry handling still uses ExecutionID. If a CSV append fails, retain the pending execution identity and report that the history file is not synchronized; retry must not duplicate the row. The existing portfolio page currently exports a downloaded JSON copy rather than writing back to the selected source file, so the exact point at which JSON and CSV count as jointly saved remains a design decision. Do not claim atomic persistence or full synchronization until both stores are confirmed. The user manages the CSV file in spreadsheet software and is responsible for its location, backup, retention, and sharing.

The new CSV implementation must not replace, alter, or reuse the existing Positions trade-history export. Browser support, initial file selection/permission, IndexedDB backup/export, and JSON/CSV recovery behavior still require design. A normal per-execution download is not the proposed system-maintained workflow.

## Workbook-backed behavior

The original workbooks are retained as historical reference inputs only; the new release does not use them at runtime and does not require workbook-parity outputs:

- [REQ1.xlsx](spreadsheets-old-way/REQ1.xlsx) — trade evaluation.
- [REQ2.xlsx](spreadsheets-old-way/REQ2.xlsx) — position watchlist and exit scenarios.

The formulas below document what the archived workbooks calculated. They are not the new product formula contract or acceptance baseline where they conflict with the clarified requirements. In particular, the new planner includes the optional exit fee in risk sizing; therefore some quantity and scenario results intentionally differ from the archived REQ1 workbook.

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
- The `+1` in both archived scenario formulas acts like an estimated exit fee. The new planner's optional editable exit fee defaults to 1.00 in the plan currency (`$1` for USD), accepts zero, and is included in both scenario P&L and risk-based quantity sizing. No entry fee is present in the archived REQ1 workbook; any optional entry fee defaults to zero.
- `ATRP` (`B4 = 0.03`) and `ATR` (`C4 = 0.72`) are entered but are not referenced by any calculation in this sheet. Although the adjacent labels include “Date purchase,” the sample cells contain numeric values, not dates. Their units, intended dates, and whether they should affect calculations remain unspecified.

### REQ2 — Position watchlist and exit scenarios

REQ2 is a position/scenario snapshot, not an execution ledger: it has no entry/exit dates, per-order history, or explicit open/closed state. Its rows cannot by themselves satisfy REQ3 or be imported as actual executions. The sample rows establish the following provisional field meanings:

| Column | Workbook label | Observed meaning |
| --- | --- | --- |
| `A` | `TI` | Strategy/type code. Workbook values include `DT` and `LF`; `HF` is not present in the REQ2 snapshot. The confirmed shorthand mappings are `DT` → `Daytrade`, `HF` → `SwingTrade`, and `LF` → `LongtimeInvestment`. `HF` is retained as a supported shorthand for `SwingTrade`, not as a new `Trades.Strategy` value. |
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

1. **Formula source:** The archived workbook behavior above documents historical calculations only. The new product follows the formulas and decisions in this specification; workbook parity is not required.
2. **Scenario vs execution:** Planner inputs and results are estimates. They must not be written as executed trades until the user records an actual execution.
3. **Long and short orientation:** The new planner and snapshot workflow support long positions only in this release. Short-sale planning and tracking are deferred to a future release; existing positions-page short accounting is unchanged.
4. **Fees:** The optional exit fee defaults to `$1` for USD, accepts zero, and is included in scenario P&L and risk-based quantity sizing. Entry fee is zero unless supplied. REQ2 Reward/Risk and Target ROI use fee-inclusive stop and target P&L.
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
- Valid example cases reproduce this specification's worked outputs within an agreed rounding tolerance; matching archived workbook outputs is not required.
- With `$2,500` funding, `1%` risk tolerance, `$571` entry, `2%` PT1, and `$1` exit fee, `SL1` is `$565.29`, risk sizing allows `24 / 5.71 = 4.20315236` shares, and planned notional is `$2,400`. PT1 is `$582.42`. At the `$582` target, estimated net P&L is about `$45.23`; at the `$566` stop, estimated net P&L is about `-$22.02`; at `SL1`, net loss including the exit fee is `$25.00`. With a `$0` exit fee and the same `SL1`, quantity is `25 / 5.71 = 4.37828371` shares.
- For the DCA YOC example, 300 shares at a `$9.5367` fee-inclusive average basis and a `$0.12` monthly dividend produce about `15.10%` YOC; use full precision internally and round only for display.
- Invalid or incomplete inputs produce a clear validation message and no misleading calculated result.
- Funding, risk-tolerance percentage, PT1 percentage, and optional exit fee are editable. On initial new-plan page load, their fields show `$2,500`, `1%`, `2%`, and `1.00` in the selected plan currency respectively; defaults are not placeholder-only hints. Reopening a saved plan restores its saved values.
- The exit fee defaults to 1.00 in the selected currency (`$1` for USD), accepts zero, and affects both scenario P&L and position sizing under each stop. The optional entry fee is zero when absent.
- PT1 uses the PT percentage, default `2%`; SL1 is calculated from risk tolerance. Support additional stop candidates `SL2...SLn` from user-entered prices or user-supplied ATR/ATRP values. For each stop, display its own max quantity and estimated outcomes under the same funding, risk-budget, and fee assumptions; a selected stop determines the plan's primary quantity.
- Each target candidate shows net P&L, ROI, and reward/risk against every applicable stop scenario, with the stop and quantity assumptions identified.
- Optional T2...Tn can store user-entered prices and their chart interval/source. Resistance, Fibonacci, and trend-line inputs are candidate price levels; RSI and EMA 9/100/200 are indicator readings; ATR and ATRP are volatility readings used in stop scenarios. These are user-provided or formula-derived, not live chart data. RSI and EMA readings are manually entered in this release; the page does not calculate them from historical market data.
- Indicators or price levels near a target or stop may be presented as qualitative confluence for user review. Do not claim that confluence increases the odds of a winning trade, calculate a win probability, or imply a guaranteed outcome without a separately specified and validated statistical model. Define the proximity threshold and data provenance before automatically identifying confluence.

- When a Fibonacci extension is calculated, the UI presents all eight requested levels in order: 23.6%, 38.2%, 50%, 61.8%, 65%, 76.4%, 100%, and 120%. For Point A=`100`, Point B=`120`, and Point C=`110`, the corresponding targets are `114.72`, `117.64`, `120`, `122.36`, `123`, `125.28`, `130`, and `134`.
- Optional chart, volatility, and indicator inputs retain their source value, units or period, chart interval, and as-of date/time; changing those inputs updates only the relevant scenario estimates.
- RSI accepts only finite values from `0` through `100`. EMA accepts finite, nonnegative manually observed price/level values for periods `9`, `100`, and `200`. Each reading retains and displays its chart interval and as-of date/time and is identified as manually entered, not live or page-calculated.
- For the NVDA example, `$232.48` entry with `PT=2%` calculates T1 as `$237.1296`, displayed as `$237.13`; the user-entered resistance T2 is `$243.38` at chart interval `1 Day`.
- ATR and ATRP scenarios show the assumed user-supplied value, units, chart interval/date, stop price, max quantity, and net loss; they create alternative `SL` candidates and do not silently replace the selected primary stop.
- Zero/invalid risk and reward do not produce a numeric reward/risk result; the UI shows an explicit unavailable state.
- The new planner and snapshot accept long scenarios only. No short-sale planning or short-position workflow is added by these features in this release; future short-sale support is deferred, and existing portfolio-page behavior is unchanged.
- The positions page preserves its existing supported long/short execution accounting. Strategy descriptions that mention shorts do not enable short-sale planning or change that release boundary.
- For every selected real portfolio ticker that does not start with `.` and has no open position, Positions offers matching plans in a selector. Selecting a plan prefills opening fields; the user confirms actual execution quantity, price, date, fees, and strategy. When recorded, the opening execution carries the selected Plan ID and exact Plan Revision ID. A reduction or close remains available without a plan selection; its execution may omit both plan references, including when no listed plan is appropriate. The opening execution remains the lifecycle link used to close the plan when its position reaches zero. Older executions are not retroactively linked, and a plan cannot be attached to an already-open unlinked position.
- The strategy helper describes `SniperNine` as an automated proprietary strategy under performance testing. The page does not execute it or claim established performance.
- The planner link and scenario section follow the current pages' typography, colors, centered content, card/table styling, spacing, focus states, and responsive behavior. At narrow widths, controls stack and wide history/scenario tables remain usable without causing page-wide horizontal overflow.
- Editing a plan does not change portfolio executions or derived open-position totals.
- Saving a plan revision preserves earlier revisions for review. Keep the plan editable while its linked position is open. When its position is fully closed, set the plan-domain closed flag and prevent further edits; plans with no recorded execution remain editable.
- On the Positions page, a flat, non-dot-prefixed portfolio ticker offers matching plans for selector/prefill. Prefilled values are not executions; users confirm actual trade details before saving. The opening execution records the selected Plan ID and Plan Revision ID. Later events may retain both when relevant, but reductions and closes are allowed with neither reference.
- Plan IDs are stable identifiers for planning records tied to a ticker and criteria. Multiple plans may exist for one ticker; a plan-originated position records which plan and exact saved revision were used. Do not add plan references to older executions or infer historical associations. Keep Plan ID and Plan Revision ID separate from Execution ID, which identifies individual ledger events and prevents duplicate CSV appends.
- The strategy-allocation summary groups remaining open basis by the position's strategy, selected when opened and held constant through additions and reductions until the position is fully closed. A subsequent position may use a different strategy. Derive long dividend projections from portfolio JSON; do not count closed capital as currently invested.
- `SniperNine` is described as an automated proprietary strategy under performance testing; neither the planner nor Positions page runs it or represents its performance as proven.

### Position tracking and history

- Recording an execution changes the position only after explicit confirmation and follows the current JSON execution contract.
- Partial reductions, full closes, FIFO basis, commissions, and realized results continue to satisfy the existing position specification’s worked examples.
- **Unlinked reduction/close acceptance case:** A user with an open 10-share position can sell 2 shares, then close the remaining 8, without choosing a plan even if matching plans exist but none is suitable. Both new execution rows are recorded normally with blank `PlanID` and `PlanRevisionID`; CSV history still appends them using their `ExecutionID`. If the opening execution linked the position to a plan, that lifecycle-level link remains on the opening record and the plan is marked closed when the net position reaches zero. If the opening execution had no plan, no plan is linked or locked.
- When retaining REQ2's ACRE formulas, `Q=110`, `EP=$4.43`, entry fee `$0`, stop `$3`, target `$5.30`, and exit fee `$1.01` produce `$487.30` investment, `-$158.31` stop P&L, and `$94.69` target P&L. Show Reward/Risk as approximately `0.598:1` and Target ROI separately as approximately `19.43%`.
- A blank asset or zero quantity produces a validation/empty state, not the workbook's fee-only P&L result.
- YOC uses dividend, periodicity, and fee-inclusive basis from the selected portfolio JSON asset, matches the DCA formula, and is `N/A` for missing/unmatched asset data, `Periodicity: "N/A"`, unavailable basis, flat positions, or shorts. An absent periodicity uses the DCA page's legacy `M` fallback; a valid zero dividend rate displays 0%.
- For an open long position, the displayed per-cycle dividend amount is `open Qty * Div`, independent of periodicity. If shown, annualized dividend is a separate projection using the `Periodicity` payout count; `N/A` periodicity yields `N/A` projections.
- The feature can load a user-selected portfolio JSON file with the same validation and local import/export behavior as the existing browser pages; it does not silently overwrite the selected file.
- The existing user-requested Positions trade-history CSV remains a filtered audit/export workflow and is not repurposed as the persistent history log. Any added fields preserve the filtered view/export purpose and the visible-row/export consistency.
- Open-position snapshot rows are not treated as the historical record; open, reduction, and close events remain available in the separately defined append-only history.
- Each successfully recorded execution is appended to the separate system-maintained CSV history, including opening/increase, partial reduction, and close activity, even after the position becomes flat.
- CSV history rows have stable execution IDs distinct from optional Plan IDs and Plan Revision IDs, retain ledger order, include realized P&L and required context, and correctly escape CSV fields. Plan-originated opening executions include both plan references; subsequent reduction or close rows may omit them, and older rows do not receive plan references.
- Existing executions can be reconciled into a newly selected history CSV without losing ledger order or duplicating records. Any sidecar migration identity is for CSV duplicate prevention only; do not rewrite old immutable portfolio rows or associate them with plans.
- A CSV write failure is reported distinctly from a portfolio JSON save. Retrying a pending CSV append does not duplicate a row, and the UI does not claim both stores are saved until both writes succeed.
- Closing or reducing a position does not delete or overwrite its previously recorded CSV rows.
- The persistent CSV history remains available across page reloads/sessions and is not confused with the user-requested Positions history export. It is not a per-execution download in this release. The user opens it in spreadsheet software and manages its location, backup, retention, and sharing.
- A close leaves the immutable execution history available for review; an open position is not duplicated as a second record just to make it appear in another screen.
- Estimated values cannot be mistaken for realized P&L or broker-confirmed fills.
- History exports match the displayed records and identify the values’ currency and date meaning.

### Persistence and migration

- Archived Excel workbooks are not imported or used at runtime. Portfolio JSON is authoritative for real execution and open-position calculations; IndexedDB is the proposed browser-local store for plan records only.
- Full plan records and revisions are separate from portfolio JSON execution rows; new plan-originated executions contain `PlanID` and `PlanRevisionID` references as described above. The raw plan database is not exposed as a user-editable file; plans and comparisons are operated through the plan page.
- Import/export behavior preserves strategy, ticker, dates, quantities, prices, fees, currency, and history order, or reports every unsupported field/row before saving.
- The source file is not silently overwritten. A user can verify and export a valid portfolio file and reload it without losing supported data.

## Recommended enhancements (optional)

These additions can improve later analysis, but should not block a first release focused on the approved requirements:

- **Decision journal:** Allow optional entry rationale, exit rationale, and free-text notes linked to the plan or lifecycle. Keep notes separate from financial calculations.
- **Scenario comparison:** Show ideal and realistic target/stop scenarios side by side, with the assumptions and risk/reward for each scenario visible. Fibonacci extension levels in the planner must include all eight confirmed percentages above.
- **Valuation provenance:** For any manually entered current price, retain the value and its “as of” date/time so an estimate can be interpreted later.
- **Outcome review:** Summarize realized results from executions separately from estimated outcomes and avoid labeling a trade successful based only on an unrealized mark.

## Strategy descriptions

These are explanations of existing strategy classifications, not new enum values or claims of performance:

| Strategy | Description |
| --- | --- |
| `Daytrade` | Short-horizon trading over daily/weekly periods. The existing Positions page may record long or short executions; the new planner is long-only. |
| `SwingTrade` (`HF` shorthand) | Hedge-fund-style swing positions over a months-long horizon. Short positions may be used for hedging in the existing Positions page, not in the new planner. |
| `LongtimeInvestment` | Long-horizon holdings such as high-dividend equities, bonds, and index ETFs, with a growth objective comparable to broad indexes; not a promised return. |
| `SniperNine` | An automated proprietary strategy whose performance is currently being tested. This feature describes but does not run it or claim proven performance. |

These strategy descriptions do not change allowed position directions or serialized strategy enum values.

## Decisions required before implementation

1. **Execution persistence and synchronization:** Confirm supported browsers and the initial history-CSV file selection/permission flow for the system-maintained sidecar, plus recovery and synchronization behavior. Browser pages currently download portfolio JSON rather than write back to the selected file; define what the UI may report as committed when a CSV append and JSON export cannot be atomic.
2. **Execution identities and migration:** Define stable `ExecutionID` values for new executions, distinct from Plan IDs and Plan Revision IDs, and repeatable migration IDs for old immutable rows. Define recovery and duplicate detection when a CSV append or portfolio export fails. Do not retrofit plan references to old executions.
3. **IndexedDB backup/export:** Decide whether to provide an application-level JSON backup/export for plans and its format.
4. **Targets and chart concepts:** RSI and EMA 9/100/200 are manually entered readings; no automatic market-data feed or chart analysis is assumed. If confluence is identified automatically, define its proximity threshold and validate the method before any probability claim.

## Suggested delivery sequence

1. Resolve execution-history CSV browser permissions, execution IDs/migration, and the synchronization/recovery contract with downloaded portfolio JSON.
2. Implement plan storage, ticker-matched selection/prefill, Plan ID linkage for newly plan-originated positions, and a closed flag that locks a plan when its linked position is fully closed.
3. Add the system-maintained execution-history CSV without replacing the existing filtered trade-history export or changing the immutable execution ledger.
4. Validate fee-aware sizing and every SL/PT scenario, plan revisions and closure locking, JSON load/export, CSV migration and persistence, duplicate prevention, interrupted-write recovery, keyboard use, narrow-screen layouts, and visual consistency.

## Reconciled source files

The source workbooks remain unchanged under [spreadsheets-old-way/](spreadsheets-old-way/). REQ2's legacy YOC column contains cached values and formulas linked to an absent external dividend workbook; these values are superseded by the JSON-backed DCA calculation specified above.
