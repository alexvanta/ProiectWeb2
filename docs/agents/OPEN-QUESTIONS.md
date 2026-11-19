# Open questions — p19-liga-amatori

<!-- graffino-agentic:begin v1 -->
> Unknowns. Work that depends on an open question is out of scope until it is
> answered. Only the user answers; an agent never answers by guessing. An agent may
> write a `Proposed answer` the evidence supports; the question stays
> `investigating` until the user confirms it.
> Answered entries stay, with the answer and date, and usually become a D- or PATTERN-.
<!-- graffino-agentic:end -->

## Index
- Q-001 · What is the purpose, audience, runtime, and domain vocabulary of p19-liga-amatori? · _answered_
- Q-002 · What tech stack and dev/build/test/lint commands does this repo use? · _answered_
- Q-003 · What is the top-level repository layout and high-level architecture? · _answered_
- Q-004 · What is the git remote, branching, versioning, and release workflow?
- Q-005 · What are the design tokens, token source, and design board / Figma links? · _answered_
- Q-006 · How do we screenshot this app? · _answered_
- Q-007 · Which real amateur football league is selected, and what did the organizer interview reveal?
- Q-008 · What are the exact historical seed data (teams, rosters, results) from a past season?
- Q-009 · What are the exact competition format parameters of the real league?
- Q-010 · What is the exact tie-breaker chain and three-way tie mini-table rule in the real regulation?
- Q-011 · What are the exact suspension rules (card thresholds, red card committee range, carry-over)?
- Q-012 · What are the real pitch, day, time-slot, and organizer scheduling constraints?

---

## Q-001 · What is the purpose, audience, runtime, and domain vocabulary of p19-liga-amatori?
- **Status:** answered 2026-11-19
- **Blocks:** AGENTS.md section 1, CONTEXT.md vocabulary, and initial feature planning
- **Who answers:** project owner
- **Answer:** P19 amateur football league web platform (single league, multiple seasons): fixtures, live standings with configurable tie-breakers, suspensions with server-side match-sheet validation and retroactive alerts, statistics, iCal export, and in-app reschedule notifications. Roles: visitor, player, captain, referee/organizer (single role), admin. Romanian UI; English code and `docs/agents/`. Real league specifics are tracked separately in Q-007 through Q-012.
- **Recorded as:** D-001, D-002, `README.md`, `CONTEXT.md`, `AGENTS.md`

## Q-002 · What tech stack and dev/build/test/lint commands does this repo use?
- **Status:** answered 2026-11-19
- **Blocks:** AGENTS.md sections 2 and 6, project scaffolding, and automated checks
- **Who answers:** project owner
- **Answer:** Next.js (App Router), TypeScript (strict), Tailwind CSS, Prisma, PostgreSQL, Vitest, and Playwright. Exact CLI commands will be verified when the application is scaffolded.
- **Recorded as:** D-001, `AGENTS.md`, `README.md`

## Q-003 · What is the top-level repository layout and high-level architecture?
- **Status:** answered 2026-11-19
- **Blocks:** AGENTS.md section 3, docs/agents/ARCHITECTURE.md, and initial code structure
- **Who answers:** project owner
- **Answer:** Single Next.js App Router codebase with pure domain modules (`src/domain/`), Prisma/PostgreSQL (`prisma/`), server-side RBAC with HTTP-only email/password sessions, per-season server cache without Redis, and Vitest/Playwright tests. Round-robin home-and-away only (no groups/knockout); out-of-scope boundaries recorded in `README.md`.
- **Recorded as:** D-001, D-002, D-003, D-004, D-005, `docs/agents/ARCHITECTURE.md`, `AGENTS.md`, `README.md`

## Q-004 · What is the git remote, branching, versioning, and release workflow?
- **Status:** open
- **Blocks:** AGENTS.md section 5 deployment and release details (if a public deploy is needed for grading)
- **Who answers:** project owner
- **Proposed answer:** Remote `origin` is `https://github.com/alexvanta/ProiectWeb2.git` with default branch `main`; application runs locally with PostgreSQL, with no production deploy or CI/CD pipeline unless needed later.

## Q-005 · What are the design tokens, token source, and design board / Figma links?
- **Status:** answered 2026-11-19
- **Blocks:** `docs/design/DESIGN.md` token tables, HTML mocks in `docs/design/mocks/`, and UI implementation
- **Who answers:** project owner / designer
- **Answer:** Clean sport-editorial direction approved for Light and Dark modes: pitch-emerald primary accent (`#156842` Light / `#34D399` Dark) on neutral surfaces, WCAG AA semantic tokens for `W`/`D`/`L` form badges (using `W`/`D`/`L` labels with Romanian `aria-label`), yellow/red cards, active suspensions, retroactive suspension alerts (`--alert-retro-*`), and reschedule notifications (`--info-*`). Typography: `Barlow Semi Condensed` (headings/scoreboards), `Inter` with `tabular-nums` (UI/dense tables/scores), and `JetBrains Mono` (audit snapshots/timestamps). Token source in code planned as `src/app/globals.css` mapped to Tailwind CSS; no external design board or Figma link yet.
- **Recorded as:** `docs/design/DESIGN.md`, `docs/design/registry.yaml`

## Q-006 · How do we screenshot this app?
- **Status:** answered 2026-11-19
- **Blocks:** AGENTS.md section 2 screenshot command and UI verification in /build
- **Who answers:** project owner
- **Answer:** Playwright headless browser capturing light and dark screenshots (`docs/design/screens/<DS-id>.<light|dark>.png`). Exact command will be added and verified once Playwright is configured.
- **Recorded as:** `AGENTS.md` sections 2 and 6

## Q-007 · Which real amateur football league is selected, and what did the organizer interview reveal?
- **Status:** open
- **Blocks:** `INTERVIEW.md`, `RULES.md`, league identity in UI/seed, and real scheduling/standings pain points
- **Who answers:** project owner (after organizer interview)

## Q-008 · What are the exact historical seed data (teams, rosters, results) from a past season?
- **Status:** open
- **Blocks:** Real-league dataset in `prisma/seed.ts` and verification against a past season
- **Who answers:** project owner (from the real league)

## Q-009 · What are the exact competition format parameters of the real league?
- **Status:** open
- **Blocks:** Default season rule values (exact round-robin legs, points per win/draw/loss, match sheet squad size limits)
- **Who answers:** project owner (from `RULES.md`)

## Q-010 · What is the exact tie-breaker chain and three-way tie mini-table rule in the real regulation?
- **Status:** open
- **Blocks:** Default ordered tie-breaker criteria for the real league (head-to-head mini-table variant, circular `A>B>C>A` resolution, goal difference, goals scored, fair-play, drawing of lots)
- **Who answers:** project owner (from `RULES.md`)

## Q-011 · What are the exact suspension rules (card thresholds, red card committee range, carry-over)?
- **Status:** open
- **Blocks:** Default suspension rule values (yellow-card threshold, double-yellow vs direct-red ban range, season carry-over rules, exceptions)
- **Who answers:** project owner (from `RULES.md`)

## Q-012 · What are the real pitch, day, time-slot, and organizer scheduling constraints?
- **Status:** open
- **Blocks:** Real pitch/availability seed data and any league-specific scheduling constraints beyond no double matches per day, pitch availability, and home/away balance
- **Who answers:** project owner (from organizer interview)
