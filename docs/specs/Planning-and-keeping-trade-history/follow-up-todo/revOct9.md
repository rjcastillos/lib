Trade Planning Spec: Readiness Review
10 Oct 2026 · @Ramon

Verdict

The spec is ready to start design, but not ready to implement everything. 

The planner's calculation core can be built now. Persistence, CSV synchronization and the plan-to-position linkage need the resolutions below first.

Only the README was reviewed. The linked contracts (portfolio-update, portfolio.md, Trades-window-with-filter, the DCA spec) were not attached, so anything depending on them is unverified. That includes the . ticker prefix, FIFO details, and whether the JSON schema tolerates extra fields.

What is solid
Every worked example in the spec re-computes correctly. The checks covered:
• NVDA PT1 (237.1296) and the $571 sizing case: 24 / 5.71 = 4.2032 shares, notional $2,400, net P&L +45.23, -22.02, -25.00.
• The $100 entry cases: 24 shares at SL1 and 4.8 shares at SL2.
• ACRE: stop P&L -158.31, target P&L +94.69, reward/risk 0.598:1, ROI 19.43%.
• YOC of 15.10% and both Fibonacci tables.
The fee-aware sizing formula is internally consistent: the loss at the stop equals the risk budget exactly. The long-only boundary, the immutable ledger, and the separation of the two CSVs are also clear.


## Document hygiene problems
The README contradicts itself in places and repeats its rules, so it should be consolidated before design starts.
• Several statements conflict and are resolved only by the line that clarifications supersede earlier wording. One example is whether the snapshot's quantity and basis come from the JSON; other "remains a decision" notes are scattered through the body.
• The same rules appear three to four times (Fibonacci, plan selection, closure). The copies will drift apart.
• There are no requirement IDs, so design and tests cannot trace back to a requirement.
Consolidate into numbered requirements and delete the superseded wording.
Proposed resolutions to the five listed decisions
Each decision has a viable, mutually consistent resolution below.


1. CSV sync and commit semantics
• Environment: 
Chromium desktop (Chrome or Edge) is the supported target for auto-append, since it needs the File System Access API. Serve the app from localhost or https, because behavior on file:// differs between browsers.

• Other browsers: 
Firefox and Safari work without auto-append. Pending rows stay queued, with a clearly labelled "download unsynced rows" fallback.

• Pending queue: 
Every recorded execution goes into an IndexedDB queue holding its full row, keyed by ExecutionID. The queue survives reloads.

• Per-execution state: 
recorded → csv-written → json-exported. The UI never says "saved" until the relevant state is reached, and shows "JSON not yet exported" until then.

• Appending: 
Append at record time, inside the click that records the execution, so any permission re-prompt has a user gesture. Read the existing ExecutionID column before appending to prevent duplicates, and serialize writers across tabs with the Web Locks API.

• Failures: 
If the CSV is locked (for example open in Excel) or permission is denied, keep the item queued and retry.

• Reconciliation: 
On new CSV selection and on portfolio json file load IDs' comparision. 
In JSON but not in CSV: 
    as by defintion if is in portfolio and ticker does not start with "." shall be logged in history because is either a position reduction or closed , therefore the trade shall be shown warning  that an ordered append is taking place.  
In CSV but not in JSON: 
    most plans might never make it as real trades we shall just show  tickers and trade IDs warning "CSV ahead of ledger check trades only planned".
• No CSV configured: 
    Do not block recording; queue and show a banner.

2. Execution identities and migration
• Generate ExecutionID as a ULID at record time and store it as an additive optional field on new JSON rows. Confirm that the portfolio schema allows this.
• Legacy rows get sidecar-only IDs: legacy:{ticker}:{ordinal}:{8-char hash of the canonical row}. The hash lets reconciliation detect a changed ledger.
• Proposed CSV header: ExecutionID, LedgerSeq, Ticker, ExecutionDate, Action, PositionEffect, Side, Quantity, Price, Commission, Currency, Strategy, PlanID, PlanRevisionID, ReleasedBasis, RealizedPnL, OpenQtyAfter, AccountingMethod, Source (new|migrated), RecordedAt.
• Formatting: UTF-8 with a BOM written at file creation (for Excel), CRLF line endings, . decimals with at most 8 places.

3. Portable backup format
• Envelope: {format: "trade-planner-backup", schemaVersion: 1, exportedAt, plans: [...], checksum}, with a SHA-256 over the canonical plans.
• Compatibility: an integer schema version. The reader accepts the same major version, migrates older ones through a chain, and rejects newer ones with a clear message.
• Restore: validate everything, show a preview, then replace in a single transaction. Offer to download a backup of the current data first.
• Cross-check: if a loaded portfolio references Plan IDs missing from the backup, show a warning.

4. Persistent storage
• Call navigator.storage.persist() after the first successful save and show the result (granted, denied, or unsupported).
• It is non-blocking. Add a "last backup N days ago / N revisions since" indicator.

5. Confluence
• Close it as deferred. Show indicators and levels side by side with each level's percent distance from entry, and do no automatic detection.

• Remove the confluence criteria from acceptance.


### Gaps not in the decisions list

### Eleven gaps are not covered by the spec's decision list, and they block implementation until decided.

1. Plan lifecycle state machine and reconciliation. Closure is stored in IndexedDB but caused by a JSON ledger the planner may not have loaded. If the user never exports the JSON, or loads an older one, plans get stuck as linked or closed. Proposal: states are saved → linked-open → closed, and the stored flag is a cache. Recompute the state from the ledger whenever a portfolio loads, using the opening ExecutionID as the link. Provide an explicit, confirmed "release link" recovery action.

2. Open-position snapshot source. The spec says both "read-only from the ledger" and "remains a decision". Resolve it as read-only from the ledger, with EP = fee-inclusive average basis and EntryFee = 0. Stop and target levels come from the linked plan revision (opening revision by default, with a latest-revision selector). Ad-hoc levels are in-memory only.

3. Cross-page state. Navigating from Positions to the planner would drop the in-memory portfolio and any unexported executions. Open the planner in a new tab, add beforeunload guards on Positions, and use a BroadcastChannel to push plan closure and link changes.

4. Plan references on later rows. The spec says "when relevant" and leaves the rule open. Default-fill the lifecycle's Plan IDs on increases, reductions and closes, let the user clear them, and forbid any other plan.

5. Quantity rounding. Default to fractional, matching the workbook. Add an optional per-plan "whole shares, round down" setting that re-checks the risk budget after rounding.

6. Missing validation rules.
 Funding > 0 and fees ≥ 0. 
 Risk between 0 and 100 percent. 
 Stops must be below entry, and PT candidates at or below entry are flagged. 
 Fibonacci needs A < C < B for extensions and A < B for retracements. 
 Cap candidates at about 10 PTs and 10 SLs, because the target × stop matrix grows quickly.

7. Plan management. Saved revisions are immutable. Unexecuted plans can be deleted or archived; executed plans cannot. Add "duplicate as new plan" for closed plans. Use an optimistic revision-count check to handle two tabs editing the same plan.

8. Entry fee. It appears in the formulas but is not listed as an editable planner input. Make it editable, defaulting to 0.

9. Currency and time zones. Block or warn on a plan/portfolio currency mismatch. Store observation timestamps as ISO with offset.

10. Strategy-allocation summary. It is described but has no placement or format. Specify where it appears, and group by currency since there is no conversion.

11. Legacy REQ2 L/P columns. Retire them, since the spec only keeps them "unless there is a user need".

Suggested gate
Build the calculation core now; hold Positions integration and the CSV sidecar until the gaps above are decided.
• Build now: the REQ1 calculation engine, scenarios, Fibonacci helper, and plan CRUD with revisions and backup/restore. Settle gap items 6 to 8 first.
• Design after the gap items are decided: Positions integration, the CSV sidecar, and plan-closure locking.
• Spike first: File System Access append behavior, including large files, Excel locks, and permission persistence.