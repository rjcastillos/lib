---
name: build-static-html-app-skill
description: "Use when creating, changing, or reviewing standalone HTML, CSS, and browser JavaScript in html/, including the asset portfolio manager in index.html and its local JSON/tranche workflow. Pair with review-financial-calculations-skill for formula changes and plan-cloud-native-web-migration-skill for explicit migration or scaling work."
---

# Static HTML and Browser JavaScript

Use this playbook for the browser tools in `html/`. They are standalone pages with vanilla JavaScript, embedded styles, and no package manager, framework, bundler, server, or automated browser-test setup by default. Keep that shape unless the task explicitly calls for a migration.

## Start With the Local Contract

- Read the page and script being changed, plus the related JSON fixture or schema.
- Treat `html/index.html` and its `app.js` behavior as the asset portfolio manager: users select an asset, edit active purchase tranches and payout metadata, and import/export a portfolio JSON file. Read `html/portfolio.json` as a representative fixture.
- For DCA behavior, read `docs/specs/Dollar-cost-average-planning/README.md` and invoke `review-financial-calculations-skill` before changing formula semantics.
- For portfolio data, use `json/portfolio.md` and `json/portfolio-template.json` as schema references. Confirm any disagreement between schema, spec, and implementation before deciding which is authoritative.
- Preserve the existing no-dependency, local-browser workflow. Do not add React, a build tool, a server, or network requests without an explicit requirement.

## Browser Implementation

- Use semantic HTML, associated labels, keyboard-operable controls, visible focus, and accessible names. Preserve the page's existing standalone loading path.
- Keep controls and tables usable on narrow screens; allow wide ledgers to scroll without clipping inputs or summaries.
- Keep financial calculation logic distinct from DOM updates when making a substantive calculation change. Prefer small pure functions and explicit inputs/outputs over hidden global state, while avoiding broad refactors for a one-line fix.
- Use DOM APIs and `textContent` for imported or user-provided values. Do not interpolate untrusted JSON values into `innerHTML`; validate expected fields and types before using imported records to populate the page.
- Treat imported files as untrusted input. Handle parse and schema errors without replacing valid in-memory data, preserve useful user feedback, and avoid silently coercing malformed values into plausible financial outputs.
- Keep file import/export local and user-initiated. Do not transmit portfolio data or imply that the app saves changes to disk automatically.
- Keep event handling consistent with the existing page. Use native browser APIs and avoid dependencies unless they materially solve a stated need.

## Validation

- Run `node --check html/app.js` when changing that script.
- Check any changed JSON with a JSON parser and verify it still matches `json/portfolio.md`.
- Exercise the affected page in a browser for its key interaction: empty state, normal values, zero or invalid input, active/inactive rows, asset switching, and import/export as applicable.
- Compare displayed results with hand-calculated cases from the DCA specification. Check narrow and desktop layouts when changing markup or styles.
- There is no established HTML test runner. Do not claim browser behavior was tested unless it was actually exercised.

## Scope Boundaries

- The app is a local calculation aid, not a brokerage connection, accounting ledger, tax tool, or financial-advice product.
- Do not infer trading behavior from fields that the calculation does not currently model. In particular, do not introduce sell/short-position, realized-profit, tax, dividend-reinvestment, corporate-action, or market-price logic without an explicit product rule.
- Surface uncertainty in domain terms or imported-data semantics instead of silently changing them.

## Future Evolution

- The static asset manager is the current implementation, not a permanent architecture constraint. Keep ordinary UI and calculation fixes dependency-free unless the task explicitly changes scope.
- For an explicit scaling or static-to-dynamic/cloud-native task, load `plan-cloud-native-web-migration-skill` and consult `docs/architecture.md` before selecting frameworks, APIs, persistence, or hosting.
- Avoid speculative client/server abstractions solely to prepare for migration. Preserve clear calculation inputs/outputs and JSON contracts where a small change helps testability without adding architectural weight.
- Do not assume the migration target, user model, persistence semantics, cloud provider, or deployment platform until requirements establish them.
