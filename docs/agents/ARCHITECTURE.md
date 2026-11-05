# Architecture — ProiectWeb2

<!-- graffino-agentic:begin v1 -->
> How this repo is built, generated from the code at backfill and kept current by
> whoever changes the structure. The code wins: when this page is wrong, fix it.
<!-- graffino-agentic:end -->

## Overview
Web application project (ProiectWeb2) configured with containerized runtime via Docker.

```text
[Client / Browser] <---> [Containerized Application Services (Docker)] <---> [Database / Storage]
```

## Parts
| Part | Path | Responsibility | Talks to |
|---|---|---|---|
| Agents Configuration | `.agents/`, `.claude/`, `docs/agents/` | Agent rules, workflows, skills, and ledgers | Developer / AI Agent |

## Data flow
1. Development cycle: `/plan` -> user approval -> `/build` (tests first) -> verify checks.

## State and storage
| What | Where | Owner | Notes |
|---|---|---|---|
| Knowledge Ledger | `docs/agents/` | Repository | Tracks decisions, patterns, contracts, questions |

## Configuration
| Name | Where set | Used by | Notes |
|---|---|---|---|
<!-- names only, never values -->

## Build, deploy, runtime
Docker container runtime. See AGENTS.md section 2.

## Boundaries
Container boundary managed by Docker. Guards defined in D-001.
