---
applyTo: "tools/**/*.py"
---

# Python Tooling Instructions

- Use the Python standard library unless the tool has an explicit dependency requirement.
- Preserve the existing command-line behavior and documented paths unless the change requires an intentional update.
- Use `pathlib` for filesystem paths and UTF-8 for text files, consistent with the synchronizer.
- Keep file operations safe: preserve target-only files, avoid destructive deletion, and handle missing optional Git metadata gracefully.
- Keep functions focused and document behavior that is not obvious from the code.
- Validate changes with the narrowest relevant Python command or test available.
- Update the tool README when behavior, configuration, output, or safety rules change.
