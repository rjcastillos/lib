# Plan and Execution History Boundaries

- Date: 2026-10-08
- Status: Accepted product requirements; browser persistence details remain for design
- Type: Product requirements and persistence clarification
- Scope: Trade planner, Positions page, portfolio JSON executions, execution-history CSV, and strategy allocation
- Related request: User clarification in this conversation; no GitHub issue number supplied
- Specification: [Planning and keeping trade history](../../docs/specs/Planning-and-keeping-trade-history/README.md)

## Decision

- A plan is a mutable planning record created in the new plan page. An execution is an actual buy or sell recorded through the existing Positions page. A plan neither places nor proves an order, and an execution's confirmed values may differ from its plan.
- Allow multiple plans per ticker, each with stable `PlanID`, ticker, and its own criteria/revisions. A position lifecycle may be linked to at most one plan, and a plan may be used for at most one position lifecycle. A new plan-originated opening execution records the selected `PlanID` and exact `PlanRevisionID` in portfolio JSON. Later events may repeat both references when relevant, but reductions and closes do not require a plan selection and may omit them when no suitable plan applies. Never link a different plan to an already-open position. Plan edits create new revisions but do not change the revision referenced by an existing position. Do not infer or backfill plan references for older executions.
- In the Positions page, offer matching plans when the selected portfolio ticker does not start with `.` and has no open position. Selecting a plan may prefill opening fields, but the user confirms actual quantity, price, date, fees, and strategy before recording. The opening execution retains the selected Plan ID and exact saved revision ID. Reductions and closes are allowed without selecting a plan; their rows may omit plan references, including when no listed plan is appropriate. Do not attach a new plan to an already-open unlinked position.
- Preserve plan revisions. A plan stays editable while its linked position is open. When the linked position reaches zero, set `positionClosed` in the plan domain and prevent further edits, even when the closing execution row omits plan references; use the lifecycle association from its opening execution. Unexecuted plans remain editable. A closed plan cannot be reused to initiate another position.
- Once an execution is recorded in portfolio JSON, its execution row is immutable. Opens, increases, reductions, and closes append rows. Recalculate derived aggregates from the ledger, but never edit or remove the original execution row as a result of a plan edit or position close.
- Keep two distinct CSV workflows:
  1. The existing user-requested Positions history CSV remains a filtered, downloadable view for reviewing and auditing loaded portfolio data. It may gain useful fields but keeps that purpose.
  2. A new system-maintained execution-history CSV separately appends a durable row for each recorded execution, including reductions and closes. It does not replace or reuse the existing filtered export.
- Strategy values classify capital allocation, not plans or position lifecycles. A position's strategy is chosen when opened and remains unchanged through additions and reductions until that position is fully closed. Remaining open basis and portfolio-derived long dividend projections use that position strategy. A position opened after closure may use a different strategy.
- In this release, users supply ATR as an absolute price distance and ATRP as a percentage. Use the documented calculations directly, with no ATR multiplier control or market-data retrieval. Modernizing or connecting `python/getAtr.py` is out of scope.
- Funding (currency amount), risk tolerance (percentage), PT1 (percentage), and exit fee (currency amount) are editable plan inputs. Show the defaults as field values when creating a new plan: `$2,500`, `1%`, `2%`, and `$1.00` respectively for a USD plan. When reopening a saved plan, restore its saved revision values. Save the assumptions used with each plan revision. Interpret percentage inputs in percentage points (`1` means `1%`) and convert to fractions for formulas.
- An exit fee is optional, accepts zero, and affects both estimated scenario P&L and planned position sizing. Calculate risk budget as `Funding * (RiskTolerancePercent / 100)`. For a risk budget `R`, entry fee `F_in` (zero when absent), exit fee `F_out`, entry price `E`, and stop `SL`, risk-limited quantity is `(R-F_in-F_out)/(E-SL)` when the available risk and stop distance are positive. Also cap the quantity by available funding. SL1 uses the risk-tolerance percentage; additional SL2...SLn candidates may use user-entered prices or entered ATR/ATRP values. Each stop has an allowed quantity and scenario outcomes under the same budget and fee assumptions.
- Describe `SniperNine` as an automated proprietary strategy under performance testing. Do not imply established performance or that the planning feature runs it.
- A trend-line input is a manually observed price point from a chart, with chart interval (for example, `1 Day`), observation time, and source/context. The application does not draw or automatically detect trend-lines.

## Local Persistence

For the static browser app, use IndexedDB for plans, plan revisions, closed state, settings, and pending synchronization state. IndexedDB is a browser-provided structured database API, not a third-party database service or a plain-text file. The browser stores data in its internal format and materializes requested records as JavaScript objects in page memory; it need not load the entire database. Records are local to the web-app origin and browser profile, survive reloads, are not encrypted by this requirement, and may be cleared with site data.

Maintain the separate execution-history CSV through a user-authorized file handle, appending automatically after initial setup while permission remains available. The user is responsible for opening it in spreadsheet software and managing its location, backup, retention, and sharing. Browser support, permission renewal, application-level IndexedDB backup/export, stable execution IDs, and synchronization with the existing downloaded portfolio JSON workflow still require design. The current Positions page does not write changes back to the selected JSON file, and separate JSON and CSV writes cannot be atomic in a static browser app.

## Rationale

Separating plans from the immutable execution ledger preserves both the original decision and the actual transaction facts. Revision history enables fair review when a plan changes. Keeping the current filtered CSV distinct from the new append log preserves its existing audit workflow while allowing durable execution history. Strategy-based capital summaries answer allocation and dividend questions without conflating strategy with plan or lifecycle identity.

## Affected Areas

- `docs/specs/Planning-and-keeping-trade-history/README.md`
- `docs/specs/portfolio-update/README.md`
- `json/portfolio.md`
- `html/positions.html` and `html/positions-app.js`
- New planner page and its local persistence layer

## Validation and Compatibility

- Documentation-only changes; no application behavior was implemented. Requirements and schema documentation now define optional `PlanID`, `PlanRevisionID`, and `ExecutionID` fields for new execution rows.
- Confirmed that the existing Positions history CSV is generated on user request and that portfolio JSON exports are downloads rather than writes to the selected source file.
- Confirmed that the existing position accounting specification already treats execution rows as append-only and immutable.
- The existing CSV export remains a separate workflow; the supplied workbooks remain unchanged. The user-managed persistent CSV remains an automatically appended sidecar.

## Decisions Still Required

- Supported browser set, file permission renewal, and initial selection/creation flow for the user-managed CSV.
- Recovery and commit/status behavior when CSV append and portfolio JSON download/export do not both succeed.
- Execution ID generation for new immutable rows and repeatable sidecar-only IDs for old rows, without changing old JSON or assigning plan references.
- Whether the IndexedDB plan store needs an in-app backup/export feature and its format.
