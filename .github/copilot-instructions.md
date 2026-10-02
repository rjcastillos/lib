# Lib Copilot Instructions

## Repository Purpose

This repository is a collection of usefully functions to perform financial calculations oriented to trading

It intents to be the daily go to tools to buy assets such as stocks , commodities or crypto.

These tools are:
- Visual in the form of html with a forseen future to evolve to apps.
- Command Lines and or libraries in GO , Python or JS to be easily reused.
- Keep track of assets 

## Core Rules

- Treat the visible root-level directories as the canonical source layout for this repository.
- Keep reusable assets technology-agnostic unless the asset explicitly targets a technology.
- Inspect the target directory and neighboring examples before adding or changing an asset.
- Follow the naming, file-layout, metadata, and Markdown conventions in `docs/repository-conventions.md`.
- Keep changes focused; do not reorganize the repository or introduce new top-level directories without documenting the convention.
- Prefer existing templates and patterns over introducing a new format.
- Do not add generated outputs, dependency directories, caches, secrets, or local environment files to version control.
- Preserve user changes and avoid unrelated formatting or content changes.
- When a skill exists both under `.github/skills/` and root-level `skills/`,
  apply the `.github/skills/` version to the current project. Treat the
  root-level version as the reusable source asset and starting point for
  external projects.

## Issue Intake and Resolution

- Classify every incoming issue or work request as a bug, requirement clarification, new requirement or feature, change request, refactor or maintenance task, documentation task, or another explicit type. Do not assume every request is a bug.
- Preserve the supplied GitHub issue number and link. Treat the GitHub issue as the canonical tracker; do not create a parallel issue-status list in repository Markdown.
- Ensure each issue captures its context, current behavior or ambiguity, expected outcome, acceptance criteria, and affected area. For financial behavior, include worked inputs and expected values.
- When work is completed, document the resolution in the linked issue or pull request: what changed, affected source/spec/schema files, validation performed, and compatibility notes.
- When an issue implementation establishes or changes durable product behavior, financial semantics, or a schema contract, update the owning spec/schema **and** create a numbered record in `copilot/decisions/` that links the originating issue. Updating a spec alone is not a substitute for recording such a decision. Use the decision record for the agreed rule and rationale, not as a duplicate issue-status list.
- Before finishing issue work, verify that its resolution note is present in the linked issue or pull request. If GitHub cannot be updated from the available tools, keep the issue number/link in the local decision or owning spec, record the local implementation summary, changed files, validation, and compatibility, then explicitly report that the external issue still needs its resolution note or closure. Do not report issue work complete without either the external resolution note or this documented local fallback.
- For requests without a GitHub issue, do not invent an issue number. Capture the outcome in the resulting pull request or in the relevant durable repository documentation.

# General Coding Instructions

- Very important: Use internal program documentation to make the code more human readable and understandable.


## Source and Generated Projects

This repository is the canonical source. When assets are projected into a real generated project, GitHub- and Copilot-specific files belong under `.github/`, including:

- `.github/copilot-instructions.md`
- `.github/instructions/`
- `.github/agents/`
- `.github/prompts/`
- `.github/skills/`
- `.github/workflows/`
- `.github/copilot/decisions/`
- `.github/copilot/prompt-history/`

General documentation, application source, tests, and editor configuration remain outside `.github/` unless the target project has an established convention that requires otherwise.

## Documentation and Memory

- Record durable repository decisions in `copilot/decisions/`.
- Record substantial prompt, agent, or skill changes in `copilot/prompt-history/`.
- For generated projects, use the corresponding `.github/copilot/` directories.
- Update the relevant README or convention document when changing repository structure, reusable asset formats, supported technologies, or user-facing workflows.
- Use repository-relative paths in documentation; do not document machine-specific paths.

## Validation

Before completing a change:

1. Check the changed Markdown for valid structure and consistent paths.
2. Run the narrowest relevant test or script validation available.
3. Review the final diff for unrelated changes and accidental generated files.
