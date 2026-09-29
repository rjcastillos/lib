---
name: plan-cloud-native-web-migration-skill
description: "Use when evaluating, designing, or implementing the evolution of the static portfolio web app into a dynamic, multi-user, data-backed, or cloud-native application. Covers migration planning, API and persistence boundaries, scaling, security, and operations; not for routine edits to the existing static pages."
---

# Plan a Cloud-Native Web Migration

Use this playbook when the task explicitly concerns scaling or migrating the portfolio web app beyond its current static, local-browser design. The intended direction is dynamic and cloud-native, but no target framework, cloud provider, database, or deployment topology has been selected.

## Current Baseline

- `html/index.html` is the asset portfolio manager; it loads `html/app.js` and works with user-selected JSON files in the browser.
- `html/DCA.html` is a separate static calculator.
- `html/portfolio.json`, `json/portfolio-template.json`, and `json/portfolio.md` define existing portfolio data and compatibility expectations.
- There is currently no web API, server-side persistence, account system, or cloud deployment contract.

Treat local file import/export as the current workflow, not a constraint that prevents a future service. Keep routine static-page changes within `build-static-html-app-skill`; load `review-financial-calculations-skill` whenever the financial meaning changes.

## Discover Before Choosing Technology

Establish the actual requirements before proposing infrastructure:

- Who uses the app, whether multiple users or shared portfolios are needed, and how ownership and collaboration work.
- Whether data must sync across devices, how conflicts and concurrent edits are resolved, and whether offline use matters.
- Data sensitivity, retention, deletion, export, recovery, audit, and regulatory requirements.
- Expected portfolio volume, request patterns, availability, latency, and cost constraints.
- Operational ownership, deployment environment, support expectations, and acceptable failure modes.

Do not equate cloud-native with Kubernetes, microservices, or a particular framework. Prefer the simplest architecture that satisfies verified requirements and can evolve without a rewrite.

## Preserve Contracts and Calculation Meaning

- Treat the DCA specification and portfolio schema as domain contracts. Resolve discrepancies before migrating them; do not silently redefine formulas or fields.
- Keep calculation behavior deterministic and independent of browser rendering, storage, and network calls. Extract shared calculation logic behind explicit inputs and outputs when useful, and establish parity tests before moving execution to a server.
- Version API and persisted-data contracts. Plan schema migrations, validation, backward compatibility, and import/export behavior explicitly.
- Define decimal precision and rounding rules for calculation, storage, and display before selecting persistence types.
- Keep sample portfolios and worked formula cases as migration fixtures. Verify old JSON can be imported or migrated without losing fields or transaction dates.

## Evolve in Verifiable Steps

1. Record requirements, trust boundaries, current behavior, and target acceptance criteria in `docs/architecture.md` or an approved specification.
2. Add characterization tests for current calculations and data transformations before moving responsibilities.
3. Define API, identity, authorization, and persistence contracts before wiring a cloud service to the UI.
4. Introduce the chosen backend and storage incrementally, with explicit migration and rollback plans; retain import/export where it remains a user need.
5. Validate security, data recovery, operational visibility, deployment, and compatibility before directing users to the new workflow.

Avoid a big-bang rewrite unless requirements demonstrate that incremental migration is not viable. Do not add cloud infrastructure, credentials, network calls, or dependencies as speculative preparation.

## Cloud Service Guardrails

- Enforce authentication and per-portfolio authorization on the server; never trust client-provided owner identifiers or calculated totals as authoritative.
- Validate and normalize requests at the service boundary. Keep secrets and privileged credentials out of browser code and static assets.
- Design persistence operations for transactionality and concurrency according to the actual user workflow; define backup, restore, deletion, and audit needs.
- Establish appropriate automated tests, deployment controls, observability, failure handling, and cost/security review for the selected hosting model.
- Keep financial calculations traceable to the documented formulas and clearly separate projections from guaranteed outcomes.
