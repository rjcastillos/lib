---
name: repository-consistency-review
description: >-
  Audit a repository for contradictions between policies, documentation,
  reusable assets, templates, scripts, and validation mechanisms. Use when a
  user asks for a repository consistency check, documentation drift review,
  convention audit, or a traceable improvement report.
version: "1.0.0"
compatibility: "Requires repository read and search access; no external dependencies."
metadata:
  author: "Agent Foundry"
  category: "Repository Maintenance"
---

# Repository Consistency Review

Perform a read-only audit of repository consistency and produce an evidence-based report. The skill is designed for source repositories that contain reusable agents, skills, prompts, workflows, templates, documentation, and automation tools.

## 1. Trigger Scenarios

Use this skill when the user asks to:

- Check a repository for inconsistencies or documentation drift.
- Review conventions against the files that implement them.
- Find stale paths, contradictory instructions, incomplete assets, or placeholder content.
- Suggest repository improvements with evidence and prioritization.
- Create a repeatable or traceable model for future repository reviews.

Do not use this skill as a substitute for a security audit, dependency audit, or broad code-quality review unless the user explicitly includes that scope.

## 2. Inputs and Scope

Before starting, identify:

- Repository root.
- Requested paths or full-repository scope.
- Review date.
- Any user-specified focus, exclusions, or risk tolerance.

If the scope is not specified, review the full repository but prioritize the repository instructions, root README, conventions, templates, representative assets, scripts, and decision/history records.

## 3. Required Discovery

Read applicable repository-local instructions before evaluating files. At minimum, inspect:

- The repository's main instruction file, such as `.github/copilot-instructions.md`.
- Instructions matching the files being reviewed.
- The authoritative conventions document.
- Neighboring examples and templates for each relevant asset type.

Use targeted file reads and searches. Do not modify files during discovery or analysis unless the user explicitly requests implementation.

## 4. Audit Workflow

Execute these steps in order:

1. **Map the source layout:** Compare documented root directories and file trees with the actual repository.
2. **Check conventions:** Compare naming, entry-point filenames, metadata, front matter, and directory rules with representative assets and templates.
3. **Check documentation:** Compare README, contribution, getting-started, and tool documentation with current paths, commands, defaults, and behavior.
4. **Check implementation claims:** Compare scripts and examples with their documented inputs, outputs, transformations, exclusions, and safety controls.
5. **Check repository memory:** Verify decision and prompt-history numbering, required fields, links, affected paths, and supersession status.
6. **Find incomplete content:** Identify empty, unfinished, duplicated, placeholder-only, machine-specific, or contradictory files.
7. **Check validation coverage:** Compare stated validation requirements with available tests, validators, CI workflows, and executable checks.
8. **Classify findings:** Separate confirmed inconsistencies from suggestions and owner decisions.
9. **Report evidence:** Order confirmed findings by severity and include a practical remediation and validation check for each.
10. **Record traceability when requested:** Preserve the review in repository-local history and create a decision record only for an accepted policy change.

## 5. Finding Contract

For every confirmed finding, provide:

| Field | Required content |
| --- | --- |
| Severity | `High`, `Medium`, or `Low` |
| Evidence | Repository-relative file paths and the conflicting facts |
| Impact | How the issue can mislead contributors or break a workflow |
| Recommendation | Smallest practical remediation |
| Validation | A check that can confirm the remediation |

Order findings by severity, then by affected workflow. Do not report personal style preferences as defects unless a repository policy supports them.

## 6. Decision Rules

- If documentation and implementation disagree, report both paths and behavior; do not silently select one as authoritative.
- If two policy files conflict, identify the conflict and state which file is intended to govern only when repository instructions make that clear.
- If a file is empty, report it as incomplete only when its location or documentation presents it as an active guide, example, or asset.
- If a documented path is stale, verify the current path before recommending a change.
- If a finding is based only on an inferred preference, classify it as a suggestion or open question.
- If no executable validator exists, state that explicitly rather than claiming validation passed.
- Do not edit, delete, rename, or “clean up” repository files during an audit unless implementation was explicitly requested.

## 7. Negative Guardrails

Never:

- Invent tests, commands, metadata requirements, or repository structure.
- Treat generated-project `.github/` layout as the source repository layout without confirming scope.
- Copy machine-specific absolute paths into new repository documentation.
- Remove user-authored files or rewrite unrelated content.
- Create a decision record for a finding that has not been accepted as policy.
- Hide uncertainty; label assumptions and open questions clearly.

## 8. Traceability Workflow

When the user requests a durable review:

1. Use the next available number in `copilot/prompt-history/`.
2. Record the date, asset or prompt used, scope, findings summary, affected areas, and validation performed.
3. Link to a decision record only when one exists.
4. Use the next available number in `copilot/decisions/` for an accepted policy change.
5. Preserve earlier records and state when a new decision supersedes one.
6. Update the relevant README or conventions document only when the review changes a path, rule, workflow, or supported behavior.

## 9. Report Format

Use this structure:

```markdown
# Repository Consistency Review: <review date>

## Findings

- **<Severity>: <short title>**
  - Evidence: <repository-relative paths and facts>
  - Impact: <workflow or contributor impact>
  - Recommendation: <smallest practical fix>
  - Validation: <confirming check>

## Suggestions

- <Improvement that is not a confirmed policy violation>

## Open Questions

- <Decision requiring repository-owner input>

## Validation Performed

- <Search, script, test, or diagnostic actually run>
```

Keep the report concise, concrete, and traceable. Link repository files when the host supports file links.
