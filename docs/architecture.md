# Architecture

## Current System

This repository currently contains Go calculation tools organized as individual modules and two standalone browser tools under `html/`. The asset portfolio manager is `html/index.html`, which loads `html/app.js` and reads/writes portfolio data through user-selected JSON files. `html/DCA.html` is a separate monthly DCA calculator. The web tools have no API, server-side persistence, account system, or cloud deployment contract today.

Go calculation modules should remain deterministic and usable both as command-line programs and as importable Go packages. Follow each module's existing input/output conventions; where the repository's general CLI convention applies, JSON output should include the input and result, with `-L` reserved for the documented legacy text output.

## Web Application Direction

The intended future direction is to scale the asset portfolio manager into a dynamic, cloud-native application. This is a product direction, not an instruction to add a backend or cloud infrastructure to routine changes. No framework, cloud provider, database, identity provider, or service topology has been chosen.

Before selecting those technologies, document requirements for users and portfolio ownership, synchronization and concurrency, data sensitivity and retention, availability, scale, recovery, operating cost, and support. Prefer an incremental migration over a rewrite when it can meet those requirements.

Migration work should:

- Preserve the documented DCA calculation semantics and characterize existing behavior with tests before moving calculation responsibilities.
- Define versioned API and persistence contracts; explicitly plan JSON import/export compatibility and data migrations.
- Establish numeric precision and rounding rules across calculations, storage, and display.
- Enforce authentication, authorization, input validation, and portfolio ownership at trusted service boundaries; do not rely on browser checks for access control.
- Include an operational plan for secrets, backups and restore, audit needs, observability, deployment, rollback, security, and cost appropriate to the selected design.

See `.github/skills/plan-cloud-native-web-migration-skill/SKILL.md` for the migration workflow. Routine static UI work remains governed by `.github/skills/build-static-html-app-skill/SKILL.md`.