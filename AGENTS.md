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
P19 amateur football league platform (single league, multiple seasons): round-robin
fixtures with pitch constraints, audited result entry, live standings with configurable
tie-breakers, suspensions enforced on match sheets, stats, iCal export, and in-app
reschedule notifications. Real league rules and seed data are open (Q-007–Q-012).

## 2. Stack and commands
Next.js (App Router), TypeScript (strict), Tailwind CSS, Prisma, PostgreSQL, Vitest, Playwright.

```bash
# Ledger check (verified)
python3 docs/agents/tools/ledger-lint.py

# Install, dev, build, lint, type-check, Vitest — not run: app not scaffolded yet
# Playwright screenshots (light & dark) — not run: app not scaffolded yet (Q-006)
```

## 3. Layout
- `.claude/` — repo-local agent skills (`/plan`, `/build`) and subagents (`planner`, `builder`).
- `docs/agents/` — knowledge ledger, architecture, and `ledger-lint.py`.
- `docs/design/` — design guardrails, token tables, `registry.yaml`, `mocks/`, and `screens/`.
- `README.md` — project scope, stack, roles, and open league variables.
- Planned app folders (`src/app/`, `src/domain/`, `src/server/`, `prisma/`, `tests/`) — not scaffolded yet.

## 4. Rules for this repo
- UI copy is in Romanian; code, tests, and `docs/agents/` stay in English.
- Never invent real-league rules, thresholds, pitch schedules, or seed data (see Q-007–Q-012).
- Keep standings and schedule generation as pure, unit-tested TypeScript functions.

## 5. Release
- Default branch: `main`. Remote `origin`: `https://github.com/alexvanta/ProiectWeb2.git`.
- Local-only runtime with PostgreSQL; no public production deploy and no mandatory CI/CD pipeline (Q-004).
- Never push, tag, release, or deploy without the user's go.

## 6. Definition of done
- `python3 docs/agents/tools/ledger-lint.py` passes.
- Vitest suite passes (once scaffolded).
- Next.js build, lint, and TypeScript type-check pass (once scaffolded).
- Playwright light and dark screenshots of every changed screen compared with `docs/design/DESIGN.md` (once scaffolded).
- New practices recorded as candidate patterns; open points recorded as Q- entries.
