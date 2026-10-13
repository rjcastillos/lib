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

## Release decision summary

This summary is an index, not a second requirements source. Requirement IDs in REQ1–REQ4 below are authoritative; acceptance criteria reference those IDs.

- Planning is long-only; portfolio JSON remains the execution source of truth and its execution rows are immutable.
- Plans, revisions, notes, candidate levels, and helpers follow the explicit save, lifecycle, and calculation requirements in REQ1.
- The open-position snapshot and currency-separated strategy allocation view follow REQ2 and use loaded portfolio data.
- Preserve the existing filtered Positions CSV. A separate persistent execution CSV follows REQ3 and records actual executions only.
- Portable planner backup is user-driven versioned JSON; no cross-device automatic sync, market data, brokerage, or automatic order execution is introduced.
- NVDA example: entry `$232.48`, PT1 `$237.13` at 2%, resistance PT2 `$243.38` on `1 Day`.
Detailed requirements and acceptance checks below are authoritative; avoid restating them here.

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

### Design boundary

Implementation details and user-visible behavior are specified once in REQ1–REQ4. Use those requirements for plan revision/lifecycle rules, plan selection, strategy allocation, IndexedDB persistence and portability, execution CSV setup/recovery, and cross-tab state. The portfolio-update specification and JSON schema define the existing execution accounting contract; this document does not duplicate that contract.

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
| **Plan Revision ID** | Stable identifier for one saved version of a plan's criteria. The opening execution stores the revision used; later events copy that reference by default, but the user may clear it together with the Plan ID. |
| **Execution ID** | Stable identifier for one individual execution, used for execution-history CSV synchronization and duplicate prevention. It is distinct from Plan ID and Plan Revision ID. |

## Requirements

### REQ1 — Evaluate and manage a proposed trade

#### REQ1-01 — Inputs, fees, defaults, and validation

The planner shall let the user enter and review the following inputs and calculated values:

| Input or result | Meaning | Requirement |
| --- | --- | --- |
| Funding | Capital amount used by the plan | User-editable currency amount; new plans default to `$2,500` |
| Loss tolerance / risk budget | Percentage of funding that defines maximum planned loss | User-editable percentage; defaults to `1%`. Show both the percentage and derived currency risk budget |
| PT1 | First profit taker price, calculated above entry | User-editable percentage; defaults to `2%` |
| Entry fee | Estimated opening commission/fee | User-editable currency amount; defaults to `0` |
| Estimated exit fee | Estimated fee for the planned exit | Optional, user-editable currency amount; defaults to `1.00` in the selected plan currency (`$1.00` for USD), and `0` is valid. Include it in net scenario P&L and risk-based quantity sizing. |
| Asset/ticker and direction | Instrument and proposed side | Long only in this release; short-sale planning is deferred |
| Entry price | Planned entry price per unit | User-entered |
| ATR and ATR percentage | Volatility values included by the workbook | Store/display their value, date, and source; do not imply they are live unless refreshed |
| Stop | Planned stop price | Distinguish calculated/ideal stop from a user-entered realistic or predicted stop |
| Profit target | Planned exit target | Distinguish calculated/ideal target from a user-entered realistic target |
| Quantity | Proposed position size | Fractional by default; optional whole shares rounded down |
| Fees | Estimated commissions/fees where applicable | Show each assumption and include it consistently in estimates |
| Estimated outcomes | Risk, reward, P&L, reward/risk, and ROI | Label as estimates, not actual performance; display reward/risk as a ratio and ROI as a percentage for supported long scenarios |

Funding must be greater than zero; risk tolerance must be between 0 and 100 percentage points inclusive; fees must be finite and nonnegative; entry price must be positive. All plan amounts use the plan's declared currency without conversion. When a plan is selected for a portfolio ticker, its currency must match the ticker's portfolio currency before plan-to-position linkage or snapshot calculations are allowed. A plan that is not linked to portfolio activity may be edited in its own declared currency.

New plans show editable field defaults of `$2,500` funding, `1%` risk tolerance, `2%` PT1, `0` entry fee, and `1.00` exit fee in the plan currency (`$1.00` for USD). These are field values, not placeholders. Save all input assumptions with every saved revision.

Warn the user before leaving, reloading, or closing the tab when an unsaved plan or revision has changes. This warning is best-effort and cannot prevent data loss from browser crashes or forced termination; in that case the user must re-enter the unsaved information.

Provide a **Notes/Comments** action that opens a popup dialog containing an editable free-text field for rationale, observations, or comments. Notes are part of the plan revision and persist only when that plan or revision is explicitly saved. Editing the note alone does not save it.

#### REQ1-02 — Saved plan management and concurrent editing

Unsaved drafts and edits remain in page memory only. Saved revisions are immutable; **Save Revision** creates a new revision and never overwrites an earlier revision. Save the plan record and revision in one IndexedDB transaction. On failure, report that the save did not complete and retain the draft in memory where possible.

When two tabs edit the same plan, use the revision count (or equivalent persisted version) loaded when editing began as an optimistic concurrency check. If it changed before save, reject the stale write, preserve the local draft, and ask the user to reload or reconcile; do not silently overwrite another tab's revision. Broadcast plan save, archive, and lifecycle changes to same-origin planner/Positions tabs using `BroadcastChannel`; messages notify other tabs to refresh from IndexedDB and the latest loaded portfolio ledger, and are not a persistence source themselves.

Unexecuted plans may be deleted after confirmation or archived. Archive hides a plan from normal active-plan selectors while retaining it for review and permitting explicit unarchive. A plan with any linked opening execution cannot be deleted or archived, including after closure. A closed plan may be duplicated as a new, unlinked plan with a new Plan ID; its copied content begins a new revision history.

#### REQ1-03 — Plan lifecycle and closure reconciliation

Use lifecycle states `saved`, `linked-open`, and `closed`. The opening execution is the authoritative link: a new opening selected from a plan stores `PlanID` and `PlanRevisionID` and the plan store retains its `OpeningExecutionID`. Never link a second plan to the same position lifecycle.

Whenever a portfolio JSON ledger is loaded or changed, recompute linked lifecycle state from that ledger and the opening `ExecutionID`; treat the stored `positionClosed`/lifecycle value in IndexedDB only as a cache. A matching open lifecycle means `linked-open`; a matching fully closed lifecycle means `closed`. If the linked opening execution is absent from the loaded ledger, do not infer closure or reuse the plan: show a mismatch requiring review. A confirmed **Release Plan Link** recovery action may clear a stale local association only when the opening execution is absent from the selected ledger; it does not modify portfolio JSON, remove immutable execution references, or make an executed plan eligible for deletion or reuse. A genuinely closed plan remains read-only; use duplicate-as-new to create another plan.

#### REQ1-04 — Cross-page portfolio state

Open the planner from Positions in a new tab so the Positions page and its unsaved in-memory portfolio are not discarded by navigation. Warn before unloading Positions when its portfolio has unexported changes. Establish a same-origin `BroadcastChannel` handshake so the tabs can exchange the current portfolio snapshot and subsequently notify each other about portfolio changes, plan links, and confirmed lifecycle transitions. Treat the currently loaded JSON and IndexedDB as the respective sources of truth; a channel message is only a refresh/update signal and cannot mark JSON exported or bypass the save/validation rules.

#### REQ1-05 — Sizing and quantity mode

Enter and display percentage fields in percentage points (`1` means `1%`), then convert once for calculations: `RiskFraction = RiskTolerancePercent / 100` and `PTFraction = PTPercent / 100`. Thus `RiskBudget = Funding * RiskFraction`, `SL1 = EntryPrice * (1 - RiskFraction)`, and `PT1 = EntryPrice * (1 + PTFraction)`.

Include entry and exit fees in estimated net P&L and risk-budget sizing. With risk budget `R`, entry fee `F_in`, exit fee `F_out`, entry price `E`, and selected stop `SL`, calculate risk-limited quantity as `(R - F_in - F_out) / (E - SL)` when `E > SL` and `R > F_in + F_out`. Also constrain quantity so planned entry investment does not exceed funding: `Q_funding = (Funding - F_in) / E`; the allowed quantity for that stop is the smaller of the risk-limited and funding-limited quantities. Fees that exhaust the risk budget or funding, or invalid denominators, produce a clear validation/unavailable state rather than zero or negative quantity.

Quantity is fractional by default. Each plan may instead select **Whole shares (round down)**; floor each stop scenario's allowed quantity to a whole share and recalculate investment, P&L, ROI, and reward/risk using that rounded quantity. Confirm the rounded quantity remains within funding and risk-budget limits. Persist the quantity mode in each plan revision.

#### REQ1-06 — Profit and stop candidates

The planner shall compare potential exit scenarios using the proposed entry, quantity, fees, and currency. Every calculated level and outcome is an estimate; the page does not retrieve chart levels, place orders, or guarantee an exit.

**Profit taker candidates (`PT1...PTn`)**

- Provide mandatory candidate `PT1`, calculated from the entry using the editable profit-target percentage `PT`, defaulting to `2%`:
  - Long: `PT1 = EntryPrice * (1 + PTFraction)`
  - This release supports long scenarios only. Short-sale planning and short-position scenario handling are deferred to a future release.
- Allow optional additional profit takers `PT2...PTn`, selected from manual price observations or the Fibonacci helper. Record each candidate's source, chart interval, and observation date/time when applicable.
- **Resistance:** let the user enter a resistance price and its chart interval (for example, `1 Day`). This user-observed price becomes an optional PT candidate; it is not automatically discovered.
- **Fibonacci extension:** the popup helper takes Point A (swing low), Point B (swing high), and Point C (pullback low). For each supported ratio `r`, calculate `ExtensionPrice = C + (B - A) * r`. Identify each result by extension percentage and show it as a candidate. The user chooses which calculated levels to add to `PT2...PTn`; none are automatically selected as an order. Store the input prices, ratio, chart interval, and observation date/time/source with the chosen plan revision.
- **Trend-line / “return to the scene of the crime”:** allow a manually observed chart price point, with chart interval (for example, `1 Day`) and observation date/time/source, as a PT candidate. The page does not draw, discover, or project trend-lines.
- For every target candidate, show its estimated net P&L, ROI, and reward/risk against the selected stop scenario. Label each metric and its assumptions; do not compare a target against an unstated or different stop.

**Stop-loss candidates (`SL1...SLn`)**

- Provide `SL1`, calculated from the risk-tolerance percentage:
  - Long: `SL1 = EntryPrice * (1 - RiskFraction)`
  - This release supports long scenarios only. Short-sale stops are deferred to a future release.
- Support optional additional stop-loss candidates `SL2...SLn`; each retains its source, chart interval, and observation date/time when applicable.
- Limit each plan to at most 10 PT candidates and 10 SL candidates, including PT1 and SL1. Explain the limit when reached.
- Every stop candidate must be below the positive entry price. Flag any PT candidate at or below entry and exclude it from positive-reward comparisons until corrected or removed.
- **Support:** let the user enter an observed support price and interval as an optional SL candidate.
- **Fibonacci retracement:** for the long-only helper, Point A is the swing low and Point B is the swing high. For each ratio `r`, calculate `SL = B - (B - A) * r`. The user chooses which levels to add to `SL2...SLn`; none are automatically selected. Store the selected level's ratio, A/B prices, chart interval, and observation date/time/source with the plan revision.
- **ATR/ATRP distances:** allow the user to enter ATR and ATRP as optional alternative stop distances and show the resulting stop price and estimated net loss when each is applied:
  - ATR is a user-supplied absolute price distance. Initial long scenario: `ATRStop = EntryPrice - ATR`.
  - ATRP is a user-supplied percentage of entry price, entered in percentage points (for example, `3` means `3%`); calculate `ATRPStop = EntryPrice * (1 - ATRP / 100)`.
  - Require the source chart interval and as-of date/time for manually supplied ATR/ATRP values. Do not imply live data. Use the direct user-entered ATR distance (1x); no multiplier control or automatic ATR/ATRP retrieval is included in this release.
- A user may also enter a direct stop price as an additional SL candidate, with source and chart interval/as-of details.
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

#### REQ1-07 — Contextual indicators and distance display

- **RSI (Relative Strength Index):** A momentum oscillator used as technical-analysis context. The user enters the observed RSI reading, from `0` through `100`, along with its chart interval and observation date/time. The page does not calculate RSI.
- **EMA (Exponential Moving Average):** The user may enter the observed EMA price/level for periods `9`, `100`, and `200`. Store the period, observed price/level, chart interval, and observation date/time. These are manually supplied indicator readings; the page does not calculate EMA or infer it from a single current asset price.
- **VWAP (Volume Weighted Average Price):** Let the user enter the observed VWAP price/level as contextual chart-indicator data, with chart interval and observation date/time. Do not calculate or fetch VWAP, or automatically use it as a PT or SL candidate.
- Label this field **Chart interval** and use only these supported values: `1 Week`, `1 Day`, `4 Hours`, `1 Hour`, `30 min`, and `5 min`. Use these exact labels consistently for resistance, support, Fibonacci inputs, trend-line observations, RSI, EMA, VWAP, ATR, and ATRP data where an interval is applicable. Do not show alternate labels or duplicate equivalents.
- Store observation timestamps as ISO 8601 date-time strings with their UTC offset. Display manually supplied readings with their chart interval and observation time.
- Display price-valued PT/SL candidates and price-valued EMA/VWAP readings side by side with their percentage distance from entry: `abs(ObservedPrice - EntryPrice) / EntryPrice * 100`. This is descriptive context only. Do not automatically detect confluence, calculate win probability, or imply a guaranteed result. RSI is not a price and has no entry-price distance.

#### Candidate inventory

| Group | Candidate | Source and behavior |
| --- | --- | --- |
| Profit takers `PT1...PTn` | `PT1` | Calculated from entry and editable PT percentage. |
| Profit takers `PT1...PTn` | Resistance (`PT2...`) | User-entered observed price, chart interval, and as-of time. |
| Profit takers `PT1...PTn` | Fibonacci extension (`PT2...`) | User selects one or more calculated extension levels from the popup helper. |
| Profit takers `PT1...PTn` | Trend-line (`PT2...`) | User-entered observed price point, chart interval, and as-of time. |
| Stop losses `SL1...SLn` | `SL1` | Calculated from editable risk tolerance. |
| Stop losses `SL1...SLn` | Support (`SL2...`) | User-entered observed price, chart interval, and as-of time. |
| Stop losses `SL1...SLn` | Fibonacci retracement (`SL2...`) | User selects one or more calculated retracement levels from the popup helper. |
| Stop losses `SL1...SLn` | ATR / ATRP (`SL2...`) | User-entered volatility distances derive alternative stop prices using the specified formulas. |
| Contextual indicators | RSI, EMA 9/100/200, VWAP | User-entered readings only; they do not automatically create or trigger PT/SL candidates. Price-valued readings may show percent distance from entry; RSI does not. |

All items in this table are candidate estimates or observed context, not orders. Each selected PT/SL candidate is stored with source and applicable interval/time in the explicitly saved plan revision.

#### Fibonacci popup helper

- Provide a separate, keyboard-accessible popup dialog for calculating Fibonacci levels. The helper operates on manually entered prices and does not fetch chart data.
- Extension inputs: Point A (swing low), Point B (swing high), and Point C (pullback low). For each listed ratio `r`, calculate `ExtensionLevel = C + (B - A) * r`.
- Retracement inputs: Point A (swing low) and Point B (swing high). For each listed ratio `r`, calculate `RetracementLevel = B - (B - A) * r`.
- Validate extension inputs as finite positive prices with `A < C < B`; validate retracement inputs as finite positive prices with `A < B`. Do not calculate or add levels when these ordering rules fail.
- Use these ratios for both tools, in this order: `0.236`, `0.382`, `0.50`, `0.618`, `0.65`, `0.764`, `1.00`, and `1.20`. Clearly label the results as extension or retracement percentage.
- Allow the user to select calculated extension levels as PT candidates and retracement levels as SL candidates. Selecting a level adds it to the unsaved plan in page memory; the user must explicitly save the plan/revision to persist it. Calculation or selection in the popup alone must not write plan data to IndexedDB.
- Display the entered Point values and chart interval/as-of information with results. For example, with extension A=`100`, B=`120`, C=`110`, levels are `114.72`, `117.64`, `120`, `122.36`, `123`, `125.28`, `130`, and `134`. With retracement A=`100`, B=`120`, levels are `115.28`, `112.36`, `110`, `107.64`, `107`, `104.72`, `100`, and `96`.

The REQ1 workbook used the adjustable risk-tolerance percentage for both maximum currency risk budget (`Funding * RiskFraction`) and the initial stop distance. Retain this behavior for `SL1` and support separate alternative distances through `SL2...SLn`; each stop alternative uses the same maximum risk budget but may produce a different allowed quantity. For example, `$2,500` funding and `1%` risk tolerance yields a `$25` maximum planned loss. At `$100` entry, `SL1=$99` has `$1` price risk per share; with `$1` exit fee, risk sizing allows 24 shares (price risk `$24` plus fee `$1`). An alternative `SL2=$95` has `$5` price risk per share; with the same `$25` risk budget and `$1` fee, it allows 4.8 shares. Both are before any optional entry fee and below the `$2,500` funding limit. If the fee is `$0`, the same stops allow 25 and 5 shares. If a fee exhausts the budget, or a stop is at/above entry, show a validation error.

**NVDA example:** For entry `$232.48`, the mandatory 2% PT1 is `$232.48 * 1.02 = $237.1296`, displayed as `$237.13`. The optional resistance candidate PT2 is `$243.38` at chart interval `1 Day`. Store PT2 as a manually observed resistance level with chart interval and observation date/time/source; do not imply automatic chart lookup.

### REQ2 — Record and track an open position

#### REQ2-01 — Snapshot source and plan scenario selection

- REQ2 is an open-position snapshot: it shows current open quantity, entry basis, stop/target scenarios, and estimates while the position is open. It is not the historical record and shall not be used to reconstruct closed activity.
- Load the user's selected portfolio JSON using the same local file-selection workflow as the existing browser pages. Do not assume access to a repository file path or silently write changes back to the selected file.
- Use the selected portfolio data for ticker identity, currency, `Div`, `Periodicity`, and current position basis. Calculate YOC as specified below; do not use the old external dividend workbook or its cached values.
- For an open long position, the per-cycle dividend amount is `open Qty * Div`; do not divide by `Periodicity`. If an annual projection is shown, calculate it separately as `per-cycle amount * payoutsPerYear(Periodicity)` (`M=12`, `Q=4`, `S=2`, `A=1`). When `Periodicity` is `N/A`, show dividend projections as `N/A`, not as a payable amount.
- A user shall explicitly record an actual execution; saving or approving a plan alone shall not open a position.
- Actual executions shall use the existing append-only portfolio ledger and accounting rules in [the position specification](../portfolio-update/README.md).
- Treat open quantity and average basis as read-only values derived from the selected portfolio JSON execution ledger; do not create editable duplicate position balances in the snapshot.
- For an open long position, set snapshot quantity to the ledger's open quantity and `EP` to its current fee-inclusive `Positions[0].AvgPrice`. Snapshot `EntryFee` is `0`, because opening commissions are already included in that average basis; do not charge them a second time. Use the user-editable estimated exit fee for the projected exit.
- For a plan-linked open position, show stop/target candidates from the exact plan revision referenced by the opening execution by default. Let the user explicitly select a later saved revision for comparison; label that it is not the revision used to open. Additional ad-hoc levels in the snapshot are in-memory only and do not alter or revise the saved plan.
- The UI shall show the current direction, open quantity, average basis, invested basis/proceeds, and realized P&L using the existing position behavior.
- Stop and target values originating from a plan may be shown as reference levels, but shall not be represented as executed orders or guaranteed exits.
- The user shall be able to record a partial reduction or full close. The history must retain each execution rather than overwrite the opening record.
- Estimated/unrealized values shall be labelled separately from realized P&L. Any estimate based on a manually entered market/exit price shall display the price used and the applicable fee assumption.
- Keep strategy as capital-allocation classification, not as a plan or execution identifier. A selected Plan ID is stored on a plan-originated opening execution. Later rows for its lifecycle copy the opening `PlanID` and `PlanRevisionID` by default; the user may clear both on a reduction or close. Never attach a different plan to that lifecycle or backfill references to older executions.

#### REQ2-02 — Reward/risk, ROI, and YOC

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

#### REQ2-03 — Strategy allocation summary

Show the strategy-allocation summary on the Positions page below the portfolio controls and above the execution table. Group first by currency, then by strategy. Each group shows open-position count, remaining open basis, and portfolio-derived dividend projections. Show per-cycle projections separated by payout periodicity rather than combining unlike cycles; show an annual projection separately when schedules are valid. Keep shorts, non-dividend positions, and unsupported periodicity visibly separate or `N/A`. Do not combine unlike currencies or represent dividend projections as guaranteed income.

### REQ3 — Review completed activity

#### REQ3-01 — Execution ledger and plan references

- Users shall be able to review the executions and dates that produced a position, including partial reductions and the final close.
- Store history separately from the REQ2 open-position snapshot. The history is transaction-level and append-only; retain the existing execution-ledger rules for recording executions and deriving realized P&L. The portfolio JSON execution ledger remains the source for position calculations.
- Preserve the existing Positions trade-history CSV: it is generated at the user's request from the currently filtered history view and downloaded through the browser. Its purpose remains reviewing, filtering, and auditing loaded portfolio data. The table and export shall continue to show the same filtered records. Additional fields may be added where they improve this audit purpose, but this export is not the persistent execution-history log.
- Maintain a second, persistent, system-maintained CSV history log for actual executions. After initial storage setup, append a record when an execution is recorded in Positions, including opening/increase executions, partial reductions, and full closes. Do not append a row for a plan, estimate, failed validation, or cancelled action. The log retains activity after a position becomes flat.
- Recorded execution rows in portfolio JSON are immutable. A reduction, close, plan edit, or history export must never alter or remove an earlier execution. Derived aggregate fields may be recalculated from the immutable ledger.
- The portfolio JSON execution ledger remains the source for position calculation and accounting. The persistent CSV is a durable companion log; each new execution receives a stable `ExecutionID` at record time, distinct from `PlanID` and `PlanRevisionID`, for append/duplicate prevention.
- Generate each new `ExecutionID` as a ULID when the user confirms an execution. Store it as an additive optional field on the immutable JSON row. Generate a legacy sidecar-only identity as `legacy:{ticker}:{ordinal}:{hash}` where `ordinal` is the one-based index within that ticker's ordered `Trades` array and `hash` is the first eight lowercase hexadecimal digits of SHA-256 over canonical UTF-8 JSON for the row (object keys recursively sorted; array order preserved; no insignificant whitespace). A changed row produces a different hash and is a reconciliation discrepancy; never rewrite a legacy JSON row to assign a migration ID.
- Later rows for a plan-linked lifecycle copy the opening `PlanID` and `PlanRevisionID` by default. The user may clear both on an increase, reduction, or close. If present, they must identify the opening lifecycle's plan and revision; no other plan may be substituted. Rows for unlinked openings keep both fields absent. Do not backfill older rows.
- Each persistent CSV row shall include these header fields: `ExecutionID`, `LedgerSeq`, `Ticker`, `ExecutionDate`, `Action`, `PositionEffect`, `Side`, `Quantity`, `Price`, `Commission`, `Currency`, `Strategy`, `PlanID`, `PlanRevisionID`, `ReleasedBasis`, `RealizedPnL`, `OpenQtyAfter`, `AccountingMethod`, `Source`, and `RecordedAt`. Use `Source` values `new` or `migrated`; use FIFO for `AccountingMethod`. Blank non-applicable monetary fields consistently. Serialize numbers with `.` decimal separator and at most 8 fractional places, ISO dates, UTF-8 with BOM on initial file creation, CRLF line endings, and correct CSV quoting/escaping.
- Include the fields needed to interpret realized P&L, including the accounting method (FIFO) and any relevant allocated basis/released basis, or clearly document that these are derived by replaying the referenced execution ledger. Do not misrepresent an execution-level P&L as a complete closed-lifecycle result when one execution only partially reduces a position.
- Preserve append order using `LedgerSeq` and the order of the portfolio `Trades` array. Initialize the history from existing executions before appending new ones; migration is idempotent and detects existing IDs. Do not rewrite or delete prior CSV rows when a position changes or closes.
- The persistent CSV is never silently overwritten. Report write, permission, locked-file, and space errors explicitly.
- Do not implement this persistent history as the existing user-triggered download. It is a separate, system-maintained file that retains history across sessions. Browser filesystem APIs require user authorization to select/create a file and may require renewed permission; alternatively a backend service is needed for fully automatic filesystem writes. The user is responsible for opening the CSV in spreadsheet software and managing its location, backup, retention, and sharing. The app must explain setup and expose synchronization/recovery status.
- Do not overwrite or delete historical executions when a position is closed or reduced.
- The transaction-level history shall remain consistent with the append-only execution contract and the existing [trade-history requirements](../Trades-window-with-filter/README.md).
- A closed-position summary may show opening activity, closing activity, holding period, realized P&L, commissions, strategy, and lifecycle Plan ID when these can be derived unambiguously from the opening execution. Individual reduction or closing executions may remain unlinked; older opening executions must not be assigned a plan retroactively.
- Historical values shall not be silently recalculated using a current quote. The view shall distinguish recorded execution prices from any current or estimated price.
- When new long-only executions are recorded by this feature, they shall be written to the portfolio JSON execution ledger and reflected in the persistent CSV history. Short-sale entry/management is not supported in this release; short records already present in imported historical data must not be silently transformed or discarded.

#### REQ3-02 — Durable queue and per-execution save states

When an execution is confirmed, persist its complete immutable row in an IndexedDB queue keyed by `ExecutionID` before attempting the CSV append. The queue survives page reloads and is removed only after the JSON export and CSV append are both confirmed. Append during the user action that records the execution so browser permission prompts occur within a user gesture. Before appending, check the CSV `ExecutionID` column for duplicates; serialize concurrent writers across same-origin tabs using the Web Locks API.

Track each execution through `recorded` → `csv-written` → `json-exported`. `recorded` means retained in the local queue, not saved to both files. Show **Saved** only after reaching `json-exported`; until then show which output is pending. If no CSV is configured, do not block execution recording: queue the row and show a persistent setup/synchronization banner. If CSV permission is denied or the file is locked (including by spreadsheet software), retain the queue item, report the failure, and allow a safe retry.

The existing portfolio page downloads an exported JSON copy and does not write back to the selected source file. Therefore **json-exported** means the browser completed the download, not that the user replaced or persisted their working source file. State that limitation explicitly; do not call download confirmation a disk save to the selected source.

#### REQ3-03 — File reconciliation and recovery

On portfolio JSON load and when a history CSV is selected, compare execution IDs:

- **JSON has ID, CSV does not:** warn that a CSV append is being performed for a ledger execution and append it idempotently.
- **CSV has ID, JSON does not, and IndexedDB has the queued full row:** identify it as a CSV-written/JSON-export-pending execution and offer to include it in the next portfolio export. Do not create a second row.
- **CSV has ID, JSON does not, and no matching queue row exists:** show the ticker and execution ID as an unresolved ledger/history mismatch. Never label it as a plan or assume it was merely planned; this CSV contains actual executions only. Do not delete, import, or alter records automatically.
- If a legacy row's canonical hash changes or ordinal mapping shifts, report a discrepancy for user review rather than silently treating it as an unchanged execution.

Retain pending queue items through failures and reloads. Reconciliation and retry must use the stable `ExecutionID`, never duplicate a row, never mutate earlier JSON executions, and never infer Plan IDs for legacy rows.

#### REQ3-04 — Cross-tab execution context

When opened from Positions, the planner runs in a new tab. Positions warns before unload while its portfolio has unexported changes. A same-origin `BroadcastChannel` handshake provides the planner the current validated in-memory portfolio snapshot and notifies both tabs of subsequent portfolio or lifecycle changes. Treat channel messages as transient coordination only: persist executions and plan state through their owning storage transactions and recompute plan lifecycle from the currently selected/loaded JSON ledger.

#### REQ3 CSV distinction

| CSV | Trigger and persistence | Purpose |
| --- | --- | --- |
| Existing Positions trade-history CSV | User opens history, applies filters, and requests a browser download to a chosen location. | Filter, inspect, and audit loaded portfolio history. It may gain useful display/export fields while retaining this purpose and matching the visible filtered rows. |
| New execution-history CSV | User selects or creates a persistent CSV and grants write permission; the app appends actual executions and retries queued writes. | Durable, spreadsheet-readable record of openings, increases, reductions, and closes. It is not a filtered replacement for the existing export. |

The execution-history CSV uses the schema, initialization, append, queue, synchronization-state, and reconciliation requirements in REQ3-01 through REQ3-03. The user is responsible for the file's location, backup, retention, and sharing. The app must not replace or reuse the filtered trade-history export, claim atomicity between the CSV and downloaded portfolio JSON, or report an execution as fully saved until it reaches the specified `json-exported` state.

### REQ4 — Persist and move planner data

#### REQ4-01 — IndexedDB lifecycle and portable backup

- Portfolio JSON remains authoritative for real executions and position accounting. IndexedDB stores saved plan records and immutable revisions, plan lifecycle cache, and the REQ3 pending execution queue/synchronization state. Browser-bound settings or file handles needed for the local workflow may also be retained there, but are excluded from portable backups. IndexedDB is browser-managed storage for the same app origin and browser profile, not a user-editable database file, a second execution ledger, a backup guarantee, or automatic cross-device synchronization.
- Load saved plans from IndexedDB when the planner opens. Unsaved drafts and edits remain in page memory only until the user explicitly selects **Save Plan** or **Save Revision**. A save succeeds only after its IndexedDB read/write transaction completes. Write the plan and its revision in one transaction. On transaction, quota, or browser-storage failure, report that data was not saved and retain the in-memory draft where possible.
- After the first successful explicit plan save, request persistent browser storage with `navigator.storage.persist()` where supported. This request is non-blocking and must not delay or invalidate the plan save. Report whether persistent storage was granted, denied, or unsupported. Do not claim that persistent-storage mode is a backup or guarantees data recovery. The UI shall show when the last backup was made and the number of plan revisions created since that backup.
- Provide user-triggered JSON backup export of all successfully saved plans, complete revision histories, stable IDs, order, closure/link lifecycle data needed for recovery, and schema metadata. Exclude unsaved drafts, browser-specific file handles, permissions, and origin-bound settings. Use this envelope:

  ```json
  {
    "format": "trade-planner-backup",
    "schemaVersion": 1,
    "exportedAt": "ISO-8601 timestamp",
    "plans": [],
    "checksum": "sha256:<hex digest>"
  }
  ```

- Calculate the SHA-256 checksum over the `plans` array serialized as canonical UTF-8 JSON: recursively sort object keys, preserve array order, and omit insignificant whitespace. This detects accidental corruption; it is not an authenticity or encryption mechanism. If reading, serialization, checksum generation, or download fails, report the failure and do not update the last-successful-backup status.
- Provide a file-picker restore flow usable in another browser profile or on another computer. Validate the entire envelope, checksum, schema version, and plan/revision contents before changing local data. Accept supported versions and apply explicit migrations for older supported versions; reject unsupported newer versions. Preview plan count and tickers, explain that restore replaces saved planner records rather than merging, and identify loaded portfolio or queued-execution references whose plan IDs would be absent after restore. Offer a backup download of the current local data before replacement.
- Apply an accepted restore as a single atomic IndexedDB replacement of saved plans, revisions, and their lifecycle cache only. Preserve Plan IDs, Revision IDs, ordering, and closed state; do not replace or delete the pending execution queue, sync state, or browser-bound file settings. Require explicit confirmation. Invalid input or transaction failure must leave existing local records intact and must not show success. Restore does not modify portfolio JSON or the execution-history CSV; file handles and permissions must be selected or granted again in the destination browser. Unsaved drafts are not exported or restored.
- Successful backup means the browser completed the backup file download; successful restore means the atomic IndexedDB transaction completed. Do not silently overwrite the selected portfolio source file. Keep the existing user-requested filtered Positions CSV separate and unchanged.

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
- `ATRP` (`B4 = 0.03`) and `ATR` (`C4 = 0.72`) are entered but are not referenced by any calculation in this archived sheet. Their new-release units and behavior are defined in REQ1-07; do not infer them from the workbook.

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

For the new snapshot, `Q` means currently open quantity and `EP`/`AVG` is the current fee-inclusive average basis read-only from the loaded portfolio JSON execution ledger. Entry fee for snapshot calculations is zero because acquisition commissions are already included in that basis. These are settled REQ2 rules, not workbook behavior.

The new output meanings are:

| Output | Formula/meaning |
| --- | --- |
| Investment | `Q * EP + EntryFee`. |
| Stop P&L | `Q * Stop - ExitFee - Investment`. |
| Target P&L | `Q * PT - ExitFee - Investment`. |
| Reward/Risk | `TargetPnl / abs(StopPnl)`, shown as a ratio (for example, `0.598:1`), not a percentage. |
| Target ROI | `TargetPnl / Investment * 100`, shown as a percentage in a separate column. |
| YOC | Derived from the selected portfolio JSON data using the DCA formula above; it is not the old REQ2 external lookup. |

The old `L` and `P` percentage columns use inconsistent fee bases. Retire them in the release in favor of the clearly named Stop P&L, Target P&L, Reward/Risk, and Target ROI outputs. Do not silently relabel them as fee-inclusive returns.

## Calculation and data-integrity rules

1. **Formula source:** The archived workbook behavior above documents historical calculations only. The new product follows the formulas and decisions in this specification; workbook parity is not required.
2. **Scenario vs execution:** Planner inputs and results are estimates. They must not be written as executed trades until the user records an actual execution.
3. **Long and short orientation:** The new planner and snapshot workflow support long positions only in this release. Short-sale planning and tracking are deferred to a future release; existing positions-page short accounting is unchanged.
4. **Fees:** The optional exit fee defaults to `$1` for USD, accepts zero, and is included in scenario P&L and risk-based quantity sizing. Entry fee is zero unless supplied. REQ2 Reward/Risk and Target ROI use fee-inclusive stop and target P&L.
5. **Precision:** Keep full calculation precision internally and apply display rounding only for presentation. REQ1-05 defines the per-plan quantity mode: fractional by default or whole shares rounded down.
6. **Position ledger:** Keep the existing append-only execution order, FIFO accounting, and no-reversal rule for new position executions. Do not alter the portfolio accounting contract as an incidental planner change.
7. **Currency:** Keep amounts and fees in a declared currency. The existing positions tools do not perform currency conversion; do not aggregate unlike currencies as if converted.
8. **Dates:** Distinguish plan date, execution date, and close date. An estimated plan date is not an execution date.
9. **Validation:** Reject or clearly flag missing, non-finite, negative, or incompatible values before showing a result. Explain invalid inputs rather than presenting a success-shaped zero.
10. **Integrity:** Keep the source workbook/file unchanged unless the user explicitly exports or saves a new artifact. Make the selected source and last-export state clear.

## Release acceptance criteria

### Planning

- **REQ1-01/05:** Verify initial defaults, editable fees, input ranges, both quantity modes, and funding/risk limits. With `$2,500`, `1%` risk, `$571` entry, `2%` PT, and `$1` exit fee, SL1 is `$565.29`, quantity is `4.20315236`, PT1 is `$582.42`, target `$582` P&L is about `$45.23`, stop `$566` P&L about `-$22.02`, and SL1 loss is `$25`. With no fees, quantity is `4.37828371`.
- **REQ1-06/07:** Verify PT/SL candidates, limits and validation, Fibonacci extension/retracement examples, chart interval and observation timestamp with offset, and percentage distance for price levels. RSI has no price distance; automatic confluence/probability detection is deferred.
- **REQ1-02/03:** Verify memory-only drafts and warnings, notes, immutable revisions, delete/archive restrictions, duplicate-as-new, concurrent-edit rejection, ledger-derived lifecycle states, and guarded link release.
- **REQ1-04:** Verify new-tab launch, unsaved Positions warning, portfolio handshake, and cross-tab refresh without treating channel messages as persistence.
- **REQ4-01:** Verify atomic plan/revision saves and restores, storage-protection status, backup envelope/checksum, restore preview and replacement confirmation, invalid-file rejection, and unchanged local data on restore failure.
- All examples use full calculation precision internally and display rounding only at the UI boundary. Invalid inputs show clear errors rather than plausible zeroes.

- Apply the accessibility, responsive-design, and existing visual-language requirements in the page-integration section; these presentation checks do not duplicate the financial requirements listed above.

### Position tracking and history

- Recording an execution requires explicit confirmation and follows the existing append-only JSON contract; FIFO accounting examples in [the portfolio-update specification](../portfolio-update/README.md) remain the regression baseline.
- REQ2 snapshot/YOC and REQ3 execution/CSV behavior are verified by their requirement-specific criteria above.
- **Worked snapshot case:** For ACRE (`Q=110`, `EP=$4.43`, entry fee `$0`, stop `$3`, target `$5.30`, exit fee `$1.01`), verify `$487.30` investment, `-$158.31` stop P&L, `$94.69` target P&L, Reward/Risk about `0.598:1`, and Target ROI about `19.43%`.
- Verify blank/flat positions, missing dividend data, invalid periodicity, short positions, and currency mismatch states as specified in REQ2; keep estimates distinct from realized P&L and broker-confirmed executions.
- **REQ2-03:** Verify currency-first, strategy-second grouping, separate payout-period projections, and that open counts, remaining basis, and dividend projections derive from the loaded portfolio ledger without currency conversion or guaranteed-income claims.
- The existing user-requested filtered Positions CSV remains unchanged; the new persistent execution CSV is governed only by REQ3-01 through REQ3-04.

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

## Implementation constraints

The product decisions needed to begin design and implementation are recorded in REQ1–REQ4 above. The remaining work is technical verification, not an unresolved product requirement:

- Select and document a supported-browser matrix for IndexedDB, `navigator.storage.persist()`, `BroadcastChannel`, Web Locks, and the user-authorized file APIs needed for persistent CSV writes. Where a required capability is unavailable or permission is denied, preserve queued data, report the limitation, and do not claim the affected persistence state succeeded.
- Exercise the specified JSON-download/CSV-append recovery path because those writes cannot be atomic in the static browser app. Keep queue state and user-visible save status aligned with REQ3-02/03.
- Automatic market data, chart detection, and confluence/probability claims are deferred. RSI, EMA, VWAP, and price candidates remain manually observed as specified in REQ1-07.

## Suggested delivery sequence

1. Verify the browser capability and permission matrix, then implement planner storage, revision/lifecycle handling, backup/restore, and ticker-matched plan selection/prefill.
2. Implement plan linkage and actual execution recording without changing the immutable portfolio accounting contract; apply CSV queue, save-state, and reconciliation behavior from REQ3.
3. Validate fee-aware sizing and every SL/PT scenario, plan revisions and closure locking, JSON load/export, CSV migration and persistence, duplicate prevention, interrupted-write recovery, keyboard use, narrow-screen layouts, and visual consistency.

## Reconciled source files

The source workbooks remain unchanged under [spreadsheets-old-way/](spreadsheets-old-way/). REQ2's legacy YOC column contains cached values and formulas linked to an absent external dividend workbook; these values are superseded by the JSON-backed DCA calculation specified above.
