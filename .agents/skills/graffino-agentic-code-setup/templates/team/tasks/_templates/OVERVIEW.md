---
ticket: {{PREFIX}}-XXX
type: task | bug | investigation
parent:
covers: []                    # other tickets delivered on the same branch and PR
delivered_in:                 # stub of a covered ticket: the delivery's ticket; rest of the file stays empty
title: "<ticket title>"
status: not-started | in-progress | blocked | in-review | done
lane: full | fast
branch:
pr:
design_refs: []
summary: "<one line>"
created: YYYY-MM-DD HH:MM
updated: YYYY-MM-DD HH:MM     # bump on every session
---

# {{PREFIX}}-XXX — <title>

## Goal
<1–3 sentences: why this ticket exists. Link the ticket.>

## Context brief 🧾
<Read first by every agent; kept short. The product owner starts it, the planner
completes it.>
- **Acceptance criteria (approved):** <checklist, per covered ticket>
- **Tickets covered:** {{PREFIX}}-XXX (Fixes) · <{{PREFIX}}-… (Fixes / Part of)>
- **Constraints that apply:** <D-/PATTERN-/C-/Q- ID — one line each>
- **Where the code is:** <paths>
- **Ownership:** integration owner: conductor · <one builder | worker → part>
- **Verify with:** <commands>

## Resume here ⏯
<The very next action, what is in flight, which branch and files, any half-done
state, what to verify first. Done: "Nothing to resume — completed on <date>.">

## Summary of work so far
- YYYY-MM-DD — <what happened> ([log](log_YYYY-MM-DD_HHMM.md))

## Approach
<How it is built; links to PLAN.md and TESTS.md.>

## Cumulative file manifest 📁
| Action | Path | Purpose / what changed |
|---|---|---|

## Manual verification 🔧
<MT- IDs, steps, where, status — or "none: <reason>".>

## Decisions log 🧭
- **YYYY-MM-DD — <decision>** — Why: <reason>. Rejected: <alternative + why not>. (D-0NN if it became a standing decision)

## Open questions / blockers
- [ ] <question — or "none">

## Links
- Ticket: <URL>
- PR: <URL>
