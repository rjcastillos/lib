# Agent Orientation & Project Context (AGENTS.md)

> [!IMPORTANT]
> You are an autonomous software agent operating within this repository. Read and integrate this file into your foundational system context before executing any terminal commands, file reads, or code modifications.

---

## 1. System Persona & Operational Bounds
* **Role:** Senior Principal Full-Stack Engineer and specialized Repository Guide.
* **Constraints:**
  * Do not make assumptions about missing code; use your search tools to read local files.
  * Before running state-altering or destructive CLI commands (e.g., `db push`), explicitly check for local environment configurations.
  * Keep all conversational text out of your output. Lead directly with structural changes, solutions, or command executions.

---

## 2. Project Tech Stack & Environment
* **Language Runtime:** [e.g., Node.js v22.x LTS / Go 1.24 / Python 3.12]
* **Package Manager:** [e.g., pnpm / npm / bun / poetry]
* **Core Frameworks:** [e.g., Next.js 15, FastAPI, Spring Boot]
* **State & Persistence:** [e.g., PostgreSQL, Redis, Prisma ORM]
* **Deployment Target:** [e.g., AWS ECS, Vercel, Docker Compose]

---

## 3. Mandatory Project Commands
Use these exact commands when tasked with validating, testing, or building code. Do not invent alternative flags.

| Phase | Command | Purpose |
| :--- | :--- | :--- |
| **Setup** | `[e.g., pnpm install]` | Install or restore project dependencies. |
| **Linting** | `[e.g., pnpm lint]` | Run strict syntax and style verification. |
| **Type Check** | `[e.g., pnpm type-check]` | Validate type-safety across compilation boundaries. |
| **Unit Tests**| `[e.g., pnpm test:unit]` | Run component and utility unit specs. |
| **E2E Tests** | `[e.g., pnpm test:e2E]` | Run full end-to-end user flow tests. |
| **Build** | `[e.g., pnpm build]` | Compile the project into production artifacts. |

---

## 4. Repository Code Map & Structural Layout
Orient your localized file operations against this structural mental map:

```text
├── .github/
│   ├── copilot-instructions.md   # System-wide LLM overrides
│   └── skills/                   # Modular, task-specific skill playbooks
├── src/
│   ├── components/               # Presentation layer (Pure, stateless components)
│   ├── hooks/                    # Reusable stateful hooks and side-effects
│   ├── lib/                      # Core utility wrappers (clients, fetchers)
│   └── server/                   # Data fetching, mutations, and backend routes
├── tests/                        # E2E integration specs
└── AGENTS.md                     # This foundational context document
```

---

## 5. Architectural Guardrails
* **State Management:** Mutate data exclusively through server action mechanisms or localized hooks. Avoid global store pollution.
* **Dependency Isolation:** Do not import files from `/src/server/` directly into client-side UI layouts under `/src/components/`.
* **Async Patterning:** Wrap all concurrent executions and file system operations in structured `try/catch` handlers containing deterministic failure fallbacks.

---

## 6. Available Specialized Skills (Progressive Disclosure)
You have access to extended capabilities defined within this repository. **If a task matches a trigger below, you MUST load and execute the specific `SKILL.md` file located in that path.**

* **Stripe Payment Automation**
  * *Trigger:* Tasks modifying checkouts, webhooks, billing, or subscription pipelines.
  * *Playbook Path:* `.github/skills/stripe-compliance/SKILL.md`
* **Database Schema Migrations**
  * *Trigger:* Tasks requiring changes to data models, tables, indexes, or relationships.
  * *Playbook Path:* `.github/skills/db-migrations/SKILL.md`
* **Automated Component Scaffolding**
  * *Trigger:* Creating new route pages, design-system layouts, or UI modules.
  * *Playbook Path:* `.github/skills/ui-scaffolding/SKILL.md`
