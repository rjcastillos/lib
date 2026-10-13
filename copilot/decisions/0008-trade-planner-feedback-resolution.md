# Trade Planner Feedback Resolution

- Date: 2026-10-09
- Status: Accepted requirements; ready for design and implementation
- Scope: Trade planner, Positions snapshot/allocation, IndexedDB persistence, execution-history CSV, and browser portability
- Related request: User feedback snapshot in this conversation; no GitHub issue number supplied
- Specification: [Planning and keeping trade history](../../docs/specs/Planning-and-keeping-trade-history/README.md)
- Supersedes: Relevant unresolved details in [Decision 0007](0007-plan-and-execution-history-boundaries.md)

## Decision

- Use the loaded portfolio JSON execution ledger as the source of truth for actual positions, execution history, and lifecycle reconciliation. Keep the user's filtered Positions CSV export separate from the system-maintained, append-only execution-history CSV.
- Give new executions ULID `ExecutionID` values. Assign legacy CSV migration identities deterministically without modifying older portfolio JSON rows or retroactively assigning plan references. Store the complete execution row in an IndexedDB queue before CSV append; reconcile and retry by `ExecutionID`, use Web Locks for concurrent same-origin writers, and expose `recorded`, `csv-written`, and `json-exported` states. The CSV contains actual executions only; an unknown CSV execution absent from both the ledger and queue is an unresolved mismatch, never assumed to be a plan. `json-exported` means the browser completed its JSON download, not that it changed the selected source file.
- Treat a plan as explicitly saved planning data, not an execution. Unsaved drafts remain in memory; saved revisions are immutable, plan-plus-revision writes are atomic, and concurrent stale-tab writes are rejected. Plans with a linked opening execution cannot be deleted or archived. Derive `saved`, `linked-open`, or `closed` from the selected portfolio ledger and its opening execution ID; cached plan lifecycle state is not authoritative. Reductions and closes remain valid with no plan link, and later lifecycle rows copy the opening plan references by default but may clear both.
- Use the selected portfolio JSON for the REQ2 open-position snapshot, with current ledger quantity and fee-inclusive average basis. Use zero snapshot entry fee to avoid charging opening commission twice. Default plan scenario levels to the opening revision and require explicit selection for later revisions or keep ad-hoc snapshot levels transient.
- Keep strategy as a capital-allocation classification for an open lifecycle. Show the Positions allocation summary grouped by currency and then strategy; derive open count, remaining basis, and dividend projections from loaded portfolio data. Separate per-cycle projections by payout periodicity; do not convert currencies or make guaranteed-income claims.
- Keep plan sizing inputs editable, including entry fee (default `0`) and optional exit fee (default `$1.00` for USD); fees are finite, nonnegative, and included in risk-based sizing and scenario estimates. Fractional quantity is the default; an optional whole-share mode rounds down and revalidates limits. Support up to 10 candidates in each of PT and SL groups, with manual price/indicator observations, chart intervals, and Fibonacci helpers as specified. Automatic market data, confluence detection, and probability claims are deferred.
- Keep explicitly saved plans and revisions, plan lifecycle cache, and the REQ3 pending execution queue/synchronization state in IndexedDB; browser-bound settings or file handles may also be retained locally but are excluded from portable backups. After the first successful plan save, request `navigator.storage.persist()` without blocking the save and report granted, denied, or unsupported. Persistent storage is not a backup. Provide versioned JSON backup and validated, previewed, explicitly confirmed restore with checksum verification and atomic replacement of plan records/lifecycle cache only; preserve the execution queue and browser-bound settings. Backups exclude unsaved drafts and browser-bound permissions.
- For the existing static browser app, document the supported browser and file-permission matrix during design. Preserve queued records and communicate unsupported or denied capabilities explicitly; never claim atomicity between JSON download and CSV append.

## Rationale

The feedback resolves the remaining product choices while preserving the append-only financial ledger and existing filtered CSV workflow. Stable execution identities and an explicit queue make partial CSV/JSON completion recoverable without fabricating executions. Immutable plan revisions and ledger-derived lifecycle state preserve decision history without making a plan an order. A versioned application backup provides portability without exposing IndexedDB internals or treating browser retention as guaranteed.

## Affected Areas

- `docs/specs/Planning-and-keeping-trade-history/README.md`
- `docs/specs/portfolio-update/README.md`
- `json/portfolio.md`
- `html/positions.html` and `html/positions-app.js`
- New planner page and its local persistence layer

## Validation and Compatibility

- Updated the planning specification to assign requirement IDs REQ1-01 through REQ1-07, REQ2-01 through REQ2-03, REQ3-01 through REQ3-04, and REQ4-01.
- Updated the portfolio execution documentation and schema to default-copy plan references on later lifecycle rows while allowing users to clear both fields.
- Document-only changes in this decision; implementation and runtime tests remain for the design/implementation phase.
- The older filtered Positions CSV and existing portfolio JSON export behavior remain unchanged.
