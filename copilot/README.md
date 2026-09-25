# Copilot Memory

This directory records decisions and prompt evolution for the reusable assets in Agent Foundry.

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

## Recording Prompt Changes

Add an entry to `prompt-history/` when a prompt, agent, or skill is introduced or substantially changed. Record the change, its justification, affected asset, and date.

Project-specific memory belongs with the generated project, normally under `.github/copilot/`.

When a reusable asset, repository convention, supported technology, or user-facing workflow changes, update the repository's global `README.md` in the same change.

## Generated Artifacts and Dependencies

- Keep generated test outputs, including `.docx` files, under `output/` unless they are intentional versioned deliverables.
- Do not commit dependency directories such as `node_modules/`.
- Commit lockfiles such as `package-lock.json` when they provide reproducible installs for a repository skill.
- Use `npm ci` when a lockfile is present; use `npm install` only to create or intentionally update the lockfile.
