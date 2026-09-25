---
title: Trade Lib
version: 1.0.0
owner: Ramon Castillo Sanchez
        ramon.castillosanchez@rewe-group.com
        ramon@rcastillo.net
---

# Trade Library Repository Conventions

## Repository Description

Trade Lib is a centralized collection of reusable calculataion to quickly evaluate a trade.

---

# Purpose

To alculate an entry or exit position running easy commands or using the code as library that can be reused and imported for other outside GO mudules




---

# Repository Structure
 TBD 


# Naming Standards

## General Principles

Names must be:

- Descriptive
- Consistent
- Predictable
- Searchable
- Human readable

Avoid:

```text
agent1
test
new-skill
helper
```

Prefer:

```text
github-release-agent
generate-go-service-skill
azure-cost-optimizer
```

---

# Case Convention

## Repository Names

Use:

```text
kebab-case
```

Examples:

```text
cloud-platform-toolkit
agent-workbench
```

---

## Directory Names

Use:

```text
kebab-case
```

Examples:

```text
customer-support-agent
go-service-template
release-workflow
```

---

## Markdown Files

Use:

```text
kebab-case.md
```

Examples:

```text
getting-started.md
repository-conventions.md
agent-authoring-guide.md
```

---

## YAML Files

Use:

```text
kebab-case.yaml
```

Examples:

```text
github-release.yaml
azure-pipeline.yaml
```

---

## JSON Files

Use:

```text
kebab-case.json
```

Examples:

```text
agent-config.json
skill-metadata.json
```

---

## Environment Variables

Use:

```text
UPPER_SNAKE_CASE
```

Examples:

```text
OPENAI_API_KEY
GITHUB_TOKEN
AZURE_SUBSCRIPTION_ID
```

---

## Python Files

Use:

```text
snake_case.py
```

Examples:

```text
generate_docs.py
skill_validator.py
```

---

## Go Packages

Use:

```text
lowercase
```

Examples:

```text
agent
workflow
generator
```

---

## Go Files

Use:

```text
snake_case.go
```

Examples:

```text
agent_loader.go
workflow_runner.go
```

---

# Agent Convention

## Directory Format

```text
agents/<domain>-<purpose>-agent/
```

Examples:

TBD 

## Structure

TBD 
---

# Skill Convention

## Directory Format

```text
skills/<action>-<target>-skill/
```

Examples:

```text
generate-go-service-skill
review-pull-request-skill
validate-terraform-module-skill
create-kubernetes-manifest-skill
```

## Structure

TBD 

---

# Prompt Convention

## Format

```text
<purpose>.prompt.md
```

Examples:

```text
code-review.prompt.md
root-cause-analysis.prompt.md
generate-unit-tests.prompt.md
architecture-review.prompt.md
```

Directory Structure:

```text
prompts/
├── coding/
├── architecture/
├── documentation/
├── analysis/
└── operations/
```

---

# Workflow Convention

## Format

```text
<process>-workflow
```

Examples:

```text
ci-cd-workflow
release-workflow
incident-management-workflow
skill-validation-workflow
```

---

# Template Convention

## Format

```text
<artifact>-template
```

Examples:

```text
agent-template
skill-template
workflow-template
go-service-template
mcp-server-template
```

---

# MCP Convention

## Format

```text
<provider>-<service>-mcp
```

Examples:

```text
github-pull-requests-mcp
azure-devops-mcp
jira-issues-mcp
servicenow-tickets-mcp
```

---

# Documentation Convention

## Format

```text
<topic>.md
```

Examples:

```text
getting-started.md
architecture.md
repository-conventions.md
agent-development-guide.md
skill-authoring-guide.md
```

---

# Versioning

Use Semantic Versioning.

Format:

```text
MAJOR.MINOR.PATCH
```

Examples:

```text
1.0.0
1.1.0
1.2.4
2.0.0
```

Meaning:

| Change | Version Increment |
|----------|----------|
| Breaking Change | MAJOR |
| New Feature | MINOR |
| Bug Fix | PATCH |

---

# Git Tags

Repository Releases:

```text
v1.0.0
v1.1.0
v2.0.0
```

Skill Releases:

```text
skill/v1.0.0
```

Agent Releases:

```text
agent/v1.0.0
```

---

# Branching Convention

## Main Branches

```text
main
develop
```

## Feature Branches

```text
feature/add-github-release-agent
feature/create-kubernetes-skill
```

## Bug Fixes

```text
fix/skill-validation-error
fix/template-rendering-bug
```

## Documentation

```text
docs/update-conventions
docs/add-skill-guide
```

## Experimental Work

```text
experiment/multi-agent-routing
experiment/langgraph-evaluation
```

---

# Asset Metadata Standard

Every reusable asset should expose