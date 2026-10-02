---
name: html-css-js-senior-developer
description: 'Use when building, reviewing, debugging, or refactoring browser interfaces with HTML, CSS, and JavaScript. Covers semantic markup, responsive styling, accessibility, browser behavior, frontend security, and practical validation without assuming a framework.'
---

# Senior HTML, CSS, and JavaScript Development

## When to Use

- Build or improve a website or browser-based interface using HTML, CSS, or JavaScript.
- Review frontend code for maintainability, accessibility, security, responsive behavior, or browser compatibility.
- Debug a user-visible frontend behavior or plan a focused frontend change.

## Workflow

1. **Understand the project.** Read applicable repository instructions and inspect the target files, existing design system, framework, package scripts, tests, and supported browsers. Do not introduce a framework or dependency when the project does not need one.
2. **Define the smallest complete change.** Preserve existing APIs and visual conventions. Identify expected loading, empty, success, error, and narrow-viewport states relevant to the change.
3. **Implement with platform fundamentals.**
   - Use semantic HTML, logical heading order, native controls, associated form labels, and buttons for actions versus links for navigation.
   - Keep CSS scoped and consistent with existing tokens and patterns. Make layouts responsive, preserve visible keyboard focus, support reduced motion, and avoid layout shifts or clipped text.
   - Follow the project's JavaScript module and state patterns. Avoid unnecessary globals, duplicated logic, implicit coercions, and premature abstractions. Handle asynchronous failures and clean up event listeners or resources when their lifetime ends.
4. **Protect users and data.** Treat URL, form, and external data as untrusted. Prefer `textContent` and DOM APIs over interpolating data into `innerHTML`; use established sanitization when rich HTML is required. Do not put credentials or sensitive data in client-side source or persistent browser storage.
5. **Verify behavior.** Run the narrowest relevant formatter, lint, typecheck, test, or build commands already provided by the project. Check the changed flow with keyboard interaction and responsive viewports; use browser automation when available and proportionate. Report checks that were not run.
6. **Review the result.** Check accessibility names and focus order, contrast against project standards, responsive overflow, console errors, broken links/assets, and unintended changes. Keep the diff focused and explain meaningful tradeoffs.

## Working Principles

- Prefer native browser capabilities and progressive enhancement where they fit the project.
- Match the existing design system; for a new interface, choose a coherent visual direction suited to its users and domain.
- Optimize based on evidence. Avoid adding libraries or complexity for hypothetical performance gains.
- Do not silently change unrelated copy, routes, data contracts, or behavior.

## Readable Functions

Write every function, method, and event handler so a capable developer who is new to the code can understand its purpose and behavior without needing senior-level context.

- Give each function one clear responsibility and a descriptive name that says what it does. Use clear parameter and local-variable names; avoid vague names and unexplained abbreviations.
- Keep the function at one level of abstraction. Extract a meaningful, named helper when it clarifies a distinct step, but do not split simple logic into tiny functions that make readers jump around.
- Make inputs, return values, and side effects apparent. Avoid surprising mutation, hidden dependencies on global state, and boolean parameters that make calls hard to interpret.
- Prefer straightforward control flow over clever or compressed expressions. Reduce deep nesting when a clear early return or well-named helper makes the path easier to follow.
- Handle invalid inputs and failure cases at the appropriate boundary. Keep error behavior explicit rather than silently swallowing failures.
- Add comments to explain non-obvious intent, constraints, or reasoning, not to narrate each line. Document public or non-obvious contracts when names and types alone are insufficient.
- Where practical, keep decision logic testable without requiring DOM or browser state; isolate browser effects at clear boundaries.