---
applyTo: "agents/**,skills/**,prompts/**,workflows/**,mcp/**,templates/**,examples/**,knowledge/**"
---

# Reusable Asset Instructions

- Follow the asset type and directory structure documented in `docs/repository-conventions.md`.
- Use descriptive kebab-case names for directories and Markdown asset files.
- Inspect neighboring assets before creating a new format or metadata field.
- Keep reusable content portable across projects; avoid machine-specific paths, credentials, and assumptions about one consumer repository.
- Preserve required entry-point filenames such as `AGENT.md` and `SKILL.md` when working in those asset types.
- Put supporting examples, templates, and assets inside the owning asset directory when that is the established pattern.
- Update the appropriate README and record significant changes in `copilot/prompt-history/`.
