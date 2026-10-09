# JavaScript Maintainability Guidelines

- **Date:** 2026-10-09
- **Affected assets:** `.github/instructions/javascript-tools.instructions.md`, `.github/skills/build-static-html-app-skill/SKILL.md`, `.github/skills/html-css-js-senior-developer/README.md`
- **Change:** Added project-wide JavaScript guidance for readable functions, cohesive module boundaries, concise contract documentation, explicit failures, and testable logic. Reinforced the same guidance in browser-specific skills.
- **Justification:** Make JavaScript easier for human developers to understand and maintain while encouraging separate files when responsibility, reuse, testing, or complexity warrants them—without requiring one file per function or unnecessary refactors.
- **Compatibility:** Guidance only; no runtime code, dependencies, or script-loading behavior changed. Static browser pages retain their no-build constraints.
