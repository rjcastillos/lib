Trade Planning Spec: Review
10 Oct 2026 · @Ramon



1. CSV sync and commit semantic

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


### New decisions' list


1. Plan lifecycle state machine and reconciliation. Closure is stored in IndexedDB but caused by a JSON ledger the planner may not have loaded. If the user never exports the JSON, or loads an older one, plans get stuck as linked or closed. Proposal: states are saved → linked-open → closed, and the stored flag is a cache. Recompute the state from the ledger whenever a portfolio loads, using the opening ExecutionID as the link. Provide an explicit, confirmed "release link" recovery action.

2. Open-position snapshot source. The spec says both "read-only from the ledger" and "remains a decision". Resolve it as read-only from the ledger, with EP = fee-inclusive average basis and EntryFee = 0. Stop and target levels come from the linked plan revision (opening revision by default, with a latest-revision selector). Ad-hoc levels are in-memory only.

3. Cross-page state. Navigating from Positions to the planner would drop the in-memory portfolio and any unexported executions. Open the planner in a new tab, add beforeunload guards on Positions, and use a BroadcastChannel to push plan closure and link changes.

4. Plan references on later rows. The spec says "when relevant" and leaves the rule open. Default-fill the lifecycle's Plan IDs on increases, reductions and closes, let the user clear them, and forbid any other plan.

5. Add an optional per-plan "whole shares, round down" setting that re-checks the risk budget after rounding.

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



## Document hygiene problems
The README contradicts itself in places and repeats its rules, so it should be consolidated before design starts.
• Several statements conflict and are resolved only by the line that clarifications supersede earlier wording. One example is whether the snapshot's quantity and basis come from the JSON; other "remains a decision" notes are scattered through the body.
• The same rules appear three to four times (Fibonacci, plan selection, closure). The copies will drift apart.
• There are no requirement IDs, so design and tests cannot trace back to a requirement.
Consolidate into numbered requirements and delete the superseded wording.


