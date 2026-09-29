---
applyTo: "**/*.py"
---

# Python Development Instructions

- Use the Python standard library unless an explicit requirement justifies a dependency.
- Preserve existing command-line behavior, import behavior, and documented paths unless an intentional or modernization change is required.
- Keep imports side-effect-free; put executable entry-point behavior behind a main guard.
- Use `pathlib` for filesystem paths and specify UTF-8 when reading or writing text.
- Keep functions focused, validate external inputs, and document behavior that is not obvious from the code.
- Avoid destructive file operations; preserve user data and handle optional inputs explicitly.
- Add or update focused tests for changed behavior using the repository's existing test framework. No repository-wide Python test suite is currently configured.
- Run the narrowest relevant test and a Python syntax check for changed files. Update nearby usage documentation when behavior, arguments, output, or safety rules change.
- For trading, portfolio, DCA, cost-basis, dividend, or yield formulas, load `.github/skills/review-financial-calculations-skill/SKILL.md` before interpreting or changing calculation semantics.
