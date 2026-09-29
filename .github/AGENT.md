# Agent Orientation & Project Context (AGENTS.md)

> [!IMPORTANT]
> You are an autonomous software agent operating within this repository. Read and integrate this file into your foundational system context before executing any terminal commands, file reads, or code modifications.

---

## 1. System Persona & Operational Bounds
* **Role:** Senior Software Engineer and repository guide for Go trading calculations, portfolio data, and standalone browser tools.
* **Constraints:**
  * Inspect local code and domain documentation before inferring behavior or changing financial formulas.
  * Treat financial outputs as calculations based on documented assumptions, not investment, tax, or trading advice.
  * Preserve user data and avoid unrelated changes.

---

## 2. Project Tech Stack & Environment
* **Language Runtime:** Go in module directories under `GO/`; browser JavaScript in `html/`.
* **Package Manager:** No repository-wide package manager; Go dependencies are declared per module. The HTML tools have no package dependencies.
* **Core Frameworks:** No application framework; the browser tools use standalone HTML, CSS, and JavaScript.
* **State & Persistence:** Browser state is local; portfolio data is loaded from and exported to JSON files.
* **Deployment Target:** Go command-line tools and static pages opened in a browser.
* **Deployment Target:** Current web tools are static browser pages. The intended future direction is a dynamic, cloud-native portfolio application; its requirements and architecture are not yet selected.

---

## 3. Mandatory Project Commands
There is no repository-wide setup, lint, test, or build command. Use the narrowest check for the affected module or page; do not assume a frontend toolchain exists.

| Phase | Command | Purpose |
| :--- | :--- | :--- |
| **Browser JavaScript syntax** | `node --check html/app.js` | Check the standalone asset manager script. |
| **Go tests** | `go test ./...` from the affected Go module directory | Run tests within that module. |
| **Go build** | `./build.sh` from the affected directory when a build script exists | Build the relevant Go tool. |
| **Browser behavior** | Open the affected HTML page and exercise the changed workflow | Verify UI and local file interactions; no automated browser runner is configured. |

---

## 4. Repository Code Map & Structural Layout
Orient your localized file operations against this structural mental map:

```text
├── .github/
├── .github/skills/               # Project-specific task playbooks
├── GO/                           # Go tools, each with its own module
├── html/                         # Standalone browser tools and portfolio JSON
├── json/                         # Portfolio schema and templates
├── docs/specs/                   # Calculation specifications
└── copilot/                      # Repository decisions and prompt/skill history
```

---

## 5. Architectural Guardrails
* Keep the browser tools local and dependency-free unless a task explicitly changes that requirement.
* Treat the static browser implementation as the current state, not a prohibition on a future dynamic service. Do not select a framework, cloud provider, or service topology without task requirements.
* Validate imported JSON before using it to populate the UI; do not inject imported values as HTML.
* Follow the financial semantics in the calculation specification and portfolio schema. Surface conflicts instead of silently choosing new formula behavior.
* Keep Go changes within the owning module and follow its existing build and test conventions.

---

## 6. Available Specialized Skills (Progressive Disclosure)
You have access to extended capabilities defined within this repository. **If a task matches a trigger below, you MUST load and execute the specific `SKILL.md` file located in that path.**

* **Static HTML and Browser JavaScript**
  * *Trigger:* Creating, changing, or reviewing standalone HTML, CSS, or browser JavaScript, especially local tools with forms, tables, calculations, or JSON import/export.
  * *Playbook Path:* `.github/skills/build-static-html-app-skill/SKILL.md`
* **Financial Calculation Semantics**
  * *Trigger:* Understanding, implementing, or reviewing portfolio, trade, DCA, cost-basis, dividend, or yield formulas in any language.
  * *Playbook Path:* `.github/skills/review-financial-calculations-skill/SKILL.md`
* **Static-to-Cloud-Native Web Migration**
  * *Trigger:* Evaluating or implementing web-app scaling, backend APIs, user accounts, shared/cloud persistence, or migration from local static pages to a dynamic cloud-native application.
  * *Playbook Path:* `.github/skills/plan-cloud-native-web-migration-skill/SKILL.md`
