---
description: "Use when creating, reviewing, or modifying JavaScript. Covers readable functions, maintainable file/module boundaries, documentation, and explicit error handling."
applyTo:
  - "**/*.js"
  - "**/*.mjs"
  - "**/*.cjs"
---

# JavaScript Maintainability

- Write code so a developer who is new to the module can understand its purpose, inputs, outputs, and side effects from names and structure.
- Give functions and variables descriptive names. Keep each function focused on one responsibility and prefer straightforward control flow over compressed or clever expressions.
- Split code into separate files when distinct responsibilities, reuse, testing needs, or file size make the boundary useful. Group related functions into cohesive modules by domain or responsibility; do not create one file per function or split small, tightly related logic without a concrete benefit.
- Keep browser/UI effects, financial calculations, persistence, and file operations at clear boundaries when the feature's size and existing architecture support that separation. Preserve the project's module system, script-loading order, and no-build constraints; do not introduce module-loading or bundling requirements without need.
- Make dependencies explicit. Avoid unnecessary globals, hidden mutable state, surprising mutation, boolean parameters that obscure call intent, and circular module dependencies.
- Document public or non-obvious contracts with concise JSDoc or equivalent documentation when names and types are insufficient. Add comments to explain non-obvious intent, constraints, or reasoning; do not narrate obvious lines of code.
- Keep internal program documentation and examples current when changing a module's behavior or public interface.
- Surface invalid inputs and failures at the appropriate boundary. Do not silently catch errors, return success-shaped fallbacks, or turn malformed input into plausible values.
- Keep calculation and decision logic testable without browser or DOM state where practical. Add or update focused tests for meaningful behavior changes.
