# Issue Resolution Traceability Gate

- Date: 2026-10-02
- Affected asset: `.github/copilot-instructions.md`, `docs/repository-conventions.md`, `copilot/README.md`, `copilot/decisions/README.md`
- Related decision: [Decision 0005](../decisions/0005-issue-4-currency-and-asset-metadata.md)

## Change

Clarified that durable issue-driven behavior, financial, and schema decisions require both an owning spec/schema update and a numbered, issue-linked decision record. Added an explicit issue-completion gate for recording resolution details locally when GitHub cannot be updated and reporting the outstanding external issue note or closure.

## Justification

Issue #4 implementation updated the owning specifications but omitted a numbered decision record. Existing guidance said to record durable decisions in `copilot/decisions/`, yet its issue fallback allowed updating a spec instead, and no explicit completion checklist required verifying the external or local resolution note. The updated instructions remove that ambiguity and make traceability a completion requirement.

## Compatibility

No runtime behavior changes. Existing decision and prompt-history records remain unchanged; the issue #4 decisions are recorded in Decision 0005.
