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
- Organize price candidates as `PT1...PTn` and `SL1...SLn`: PT1 is percentage-derived, with additional resistance, Fibonacci extension, and trend-line price candidates; SL1 is risk-derived, with additional support, Fibonacci retracement, ATR/ATRP-derived, or direct stop-price candidates. Candidates retain their source and applicable chart interval/as-of information.
- Provide a Fibonacci popup helper for both long extensions (`A` swing low, `B` swing high, `C` pullback low; `Extension = C + (B-A)*ratio`) and retracements (`A` swing low, `B` swing high; `Retracement = B - (B-A)*ratio`). Both use ratios `0.236`, `0.382`, `0.50`, `0.618`, `0.65`, `0.764`, `1.00`, and `1.20`. Chosen extension levels can be added as PT candidates; chosen retracement levels can be added as SL candidates.
- RSI, EMA 9/100/200, and VWAP are manually entered contextual readings with chart interval/as-of time, not automatically calculated or fetched. VWAP is not automatically a PT/SL candidate.
- Unsaved plans, changes, notes, and selected helper levels remain in page memory only. **Save Plan**/**Save Revision** explicitly persists them to IndexedDB. Warn before navigation/reload/tab close with unsaved changes; a crash or forced termination may lose the draft. Saved plan revisions include an editable free-text notes/comments field edited through a popup.
- Describe `SniperNine` as an automated proprietary strategy under performance testing. Do not imply established performance or that the planning feature runs it.
- A trend-line input is a manually observed price point from a chart, with chart interval (for example, `1 Day`), observation time, and source/context. The application does not draw or automatically detect trend-lines.

## Local Persistence

For the static browser app, use IndexedDB for explicitly saved plans and revisions, closed state, settings, and pending synchronization state; never use it for unsaved drafts. IndexedDB is a browser-provided structured database API, not a third-party database service or a plain-text file. The browser stores data in its internal format and materializes requested records as JavaScript objects in page memory; it need not load the entire database. Its scope is the web-app origin and browser profile, not a tab or browsing session: a successfully saved record is available after closing and reopening the app in the same profile, including after a browser restart. It is not synchronized to other profiles, devices, or users.

Load saved data into page memory when needed. Keep unsaved new plans, edits, notes, and helper selections in page memory only. Show save success only after the IndexedDB read/write transaction completes; save a plan and its revision atomically in one transaction. On transaction failure or abort, report that the plan was not saved and preserve the in-memory edits where possible. IndexedDB is not a backup or an absolute retention guarantee: users or browser tools can clear site data, private-browsing storage may be removed when that session ends, and browser policies or storage pressure may deny or remove data. Do not claim encryption, cross-device sync, or recovery after data removal.

Provide application-level portable backup/restore as a versioned JSON file containing saved plans, full revision histories, stable IDs, and plan closure/lifecycle state. Export excludes unsaved drafts and browser-bound settings such as file handles and granted permissions; it is not a raw IndexedDB database copy. Restore validates the complete file and previews its contents, then replaces the local portable planner data only after explicit confirmation; it does not merge. Apply a valid replacement atomically and preserve stable plan/revision identities. The backup does not include or modify `portfolio.json` or the separate execution-history CSV. On another browser/profile/device, the user must separately load those files and grant file permissions again. Treat the backup as sensitive because it may contain private trading notes.

Maintain the separate execution-history CSV through a user-authorized file handle, appending automatically after initial setup while permission remains available. The user is responsible for opening it in spreadsheet software and managing its location, backup, retention, and sharing. Browser support, permission renewal, stable execution IDs, and synchronization with the existing downloaded portfolio JSON workflow still require design. The current Positions page does not write changes back to the selected JSON file, and separate JSON and CSV writes cannot be atomic in a static browser app.

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
- The portable backup JSON schema versioning and compatibility policy, and whether the app should request persistent-storage protection from browsers that support it.
