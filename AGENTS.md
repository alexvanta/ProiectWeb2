# AGENTS.md — p19-liga-amatori

<!-- graffino-agentic:begin v1 -->
## How we work here

**Before any work:** `git fetch --all --prune`, then `git pull --ff-only`. Stop on a
non-fast-forward or on uncommitted changes you did not make.

**Always load** (indexes; open the entry, or its topic file, before you rely on it):
`docs/agents/DECISIONS.md`, `docs/agents/PATTERNS.md`,
`docs/agents/CONTRACTS.md`, `docs/agents/OPEN-QUESTIONS.md`, `CONTEXT.md`.

**Load on demand:**

| When | Load |
|---|---|
| You rely on an entry | the entry, or its topic file under `docs/agents/<kind>/` |
| Structural work | `docs/agents/ARCHITECTURE.md` |
| Old code or a past decision needs explaining | `docs/agents/DECISIONS-SUPERSEDED.md`, `PATTERNS-SUPERSEDED.md` (never obeyed) |
| UI work | `docs/design/DESIGN.md`, `docs/design/registry.yaml` |

**Flow:** a change to more than a few lines, or one with a design choice, starts with
`/plan`. The approved plan runs with `/build`. Small fixes go straight to build, with
tests first where tests exist.

### The gate
Ask yourself: **does this change something already approved?**
- **Do, then report:** add a `candidate` pattern; add or answer an open question
  (only with an answer the user gave); write a `Proposed answer` the evidence
  supports (the question stays `investigating` until the user confirms it); fix a
  typo, link or moved path; code that follows the approved entries.
- **Propose and wait:** change, supersede or delete an `approved` pattern or
  decision; promote `candidate → approved`; add a decision; code that contradicts an
  entry. Use this shape, then stop:

```text
PROPOSAL: <add-decision | change | supersede | promote | delete>
- Existing: <ID and what it says, or "none">
- Proposed: <the new rule>
- Why now: <what changed>
- Impact: <files that follow the old rule>
- If approved: <old ID> → superseded-by <new ID> (kept, not deleted)
```
Before you propose, check `docs/agents/REJECTED.md`: never re-propose a rejected item
without new evidence. A rejected proposal is added there with the reason.

### Hard rules
- Build only from `approved` entries. Unanswered means out of scope: record a Q-,
  never invent a value, a requirement or a behaviour.
- Add nothing nobody asked for. Note it as a suggestion instead.
- Build the smallest change that meets the approved criteria, reusing existing code.
  A new abstraction, dependency, configuration option, extension point or broad
  refactor needs a concrete reason today. Never at the cost of tests or error handling.
- Tests first where the repo has tests. Never change what an existing test asserts
  to make code pass; an assertion you think is wrong goes to the user.
- Never write a secret, token, password or personal data into a file, commit or log.
- Never push, tag, release, or deploy without the user's go for that action.
- When you cite past work, label the intent: **replicate** (only for an `approved`
  pattern) or **for awareness only**. History is not a template.
- The code wins over any document. When they disagree, say so and fix the document.
- Report honestly: a failed check is reported with its output; a skipped step is
  named with its reason.

### Ledger rules
- IDs are one sequence per kind in this repo: `D-`, `PATTERN-`, `C-`, `Q-`. Never renumber.
- A provided contract (C-) lives here only; consumers link to it. Changing one is a
  PROPOSAL, and the plan names the consumer files too.
- Superseded entries stay (`status: superseded-by <ID>`) so old code stays explainable.
  Their index lines live in `DECISIONS-SUPERSEDED.md` / `PATTERNS-SUPERSEDED.md`, not
  in the always-loaded indexes; the lint (`--fix`) moves them.
- After any ledger change: `python3 docs/agents/tools/ledger-lint.py --fix` (next free
  ID: `--next D`). It must pass.
- **Confirmed:** when the user confirms an entry in a plan, set `- **Confirmed:** <date>`
  on it. Any edit to an entry removes its Confirmed line.
- A new reusable practice becomes a `candidate` pattern in the same session.
- A settled constraint becomes a decision PROPOSAL in the same session.
<!-- graffino-agentic:end -->

## 1. What this repo is
P19 **SuperLiga României (sezon regular)** web platform (single league, multiple seasons):
round-robin fixtures with pitch constraints, audited result entry, live standings with
configurable tie-breakers (ROAF Art. 27), suspensions enforced on match sheets (RD FRF),
stats, iCal export, and in-app reschedule notifications. Official rules and requirements
are documented in `RULES.md` and `INTERVIEW.md` (`Q-001`–`Q-012` all answered).

## 2. Stack and commands
Next.js 15 (App Router), TypeScript (strict), Tailwind CSS v4, Prisma, PostgreSQL, Vitest, Playwright.

```bash
# Ledger check (verified)
python3 docs/agents/tools/ledger-lint.py

# Install & Database (local PostgreSQL via Docker Compose)
npm install
docker compose up -d
npx prisma migrate dev
npm run db:seed

# Verify (all verified)
npm test               # Vitest (30 domain + server tests)
npm run typecheck      # tsc --noEmit
npm run lint           # next lint
npm run build          # Next.js production build

# Local dev & Playwright E2E (requires local PostgreSQL running)
npm run dev
npm run test:e2e
```

## 3. Layout
- `.claude/` — repo-local agent skills (`/plan`, `/build`) and subagents (`planner`, `builder`).
- `docs/agents/` — knowledge ledger, architecture, and `ledger-lint.py`.
- `docs/design/` — design guardrails, token tables, `registry.yaml`, `mocks/`, and `screens/`.
- `RULES.md`, `INTERVIEW.md`, `README.md`, `CONTEXT.md`, `AI_LOG.md` — rules, organizer interview, scope, vocabulary, and AI log.
- `src/domain/` — pure, unit-tested TypeScript domain engine (`scheduler`, `standings`, `suspensions`, `ical`).
- `src/server/` — HTTP-only auth & RBAC (`auth/`), per-season server cache (`cache/`), business services (`services/`), and server queries (`queries/`).
- `src/app/` & `src/components/` — all 10 Romanian Light/Dark UI screens and 19 API Route Handlers.
- `prisma/` — `schema.prisma`, migrations, `seed.ts`, and `seed-data/superliga-2025-2026.json` + `official-standings-2025-2026.txt`.
- `tests/` — Vitest suites (`tests/domain/`, `tests/server/`) and Playwright E2E suites (`tests/e2e/`).

## 4. Rules for this repo
- UI copy is in Romanian; code, tests, and `docs/agents/` stay in English.
- Competition rules follow `RULES.md` (ROAF FRF 2018 & RD FRF 2017) stored as configurable season data (`D-003`).
- Keep standings, suspensions, iCal, and schedule generation as pure, unit-tested TypeScript functions.

## 5. Release
- Default branch: `main`. Remote `origin`: `https://github.com/alexvanta/ProiectWeb2.git`.
- Local-only runtime with PostgreSQL; no public production deploy and no mandatory CI/CD pipeline (Q-004).
- Never push, tag, release, or deploy without the user's go.

## 6. Definition of done
- `python3 docs/agents/tools/ledger-lint.py` passes.
- `npm test` (Vitest) passes.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass.
- `npm run test:e2e` (Playwright Light & Dark E2E) verified locally against PostgreSQL.
- New practices recorded as candidate patterns; open points recorded as Q- entries.
