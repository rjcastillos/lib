# Copilot Memory

This directory records decisions ,prompt evolution and every issue presented as bug , new or requiriment clarifications and changes in general of this repo

## Structure

- `decisions/`: Durable repository decisions, including what was decided, why, and what it affects.
- `prompt-history/`: Significant additions, changes, and removals to prompts, agents, and skills.

## Recording a Decision

Create a numbered Markdown file in `decisions/` for an accepted repository-level decision. Include:

- Date
- Status
- Scope
- Decision
- Rationale
- Affected files or areas
- Superseded decisions, when applicable

For issue-driven implementation that establishes or changes durable product behavior, financial semantics, or a schema contract, create this decision record in addition to updating the owning specification or schema. Include the originating issue link and summarize the implemented rule, validation, and compatibility. Do not use decision records as an issue-status list. If the GitHub issue or pull request cannot be updated, preserve its link and record the local resolution details here or in the owning specification, then report that the external resolution note or closure is still outstanding.

## Recording Prompt Changes

Add an entry to `prompt-history/` when a prompt, agent, or skill is introduced or substantially changed. Name it `YYYY-MM-DD-short-topic.md` with a concise kebab-case topic; distinguish same-day entries by topic rather than sequence number. Record the change, its justification, affected asset, and date.

When updating repository instructions or conventions to change issue handling or completion requirements, record the guidance change in `prompt-history/` as well.

Project-specific memory belongs with the generated project, normally under `.github/copilot/`.

When a reusable asset, repository convention, supported technology, or user-facing workflow changes, update the repository's global `README.md` in the same change.

## Generated Artifacts and Dependencies

- Keep generated test outputs, including `.docx` files, under `output/` unless they are intentional versioned deliverables.
- Do not commit dependency directories such as `node_modules/`.
- Commit lockfiles such as `package-lock.json` when they provide reproducible installs for a repository skill.
- Use `npm ci` when a lockfile is present; use `npm install` only to create or intentionally update the lockfile.
