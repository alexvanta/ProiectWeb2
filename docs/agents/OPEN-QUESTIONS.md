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
- Q-004 · What is the git remote, branching, versioning, and release workflow? · _answered_
- Q-005 · What are the design tokens, token source, and design board / Figma links? · _answered_
- Q-006 · How do we screenshot this app? · _answered_
- Q-007 · Which real league is selected, and what is the official rule source? · _answered_
- Q-008 · What are the exact historical seed data (teams, rosters, results) from a past season? · _answered_
- Q-009 · What are the exact competition format parameters of the real league? · _answered_
- Q-010 · What is the exact tie-breaker chain and three-way tie mini-table rule in the real regulation? · _answered_
- Q-011 · What are the exact suspension rules (card thresholds, red card committee range, carry-over)? · _answered_
- Q-012 · What are the real pitch, day, time-slot, and organizer scheduling constraints? · _answered_

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
- **Status:** answered 2026-11-20
- **Blocks:** AGENTS.md section 5 deployment and release details
- **Who answers:** project owner
- **Answer:** Remote `origin` is `https://github.com/alexvanta/ProiectWeb2.git` with default branch `main`; the application runs local-only with PostgreSQL, with no public production deploy and no mandatory CI/CD pipeline.
- **Recorded as:** `AGENTS.md` section 5

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

## Q-007 · Which real league is selected, and what is the official rule source?
- **Status:** answered 2026-11-20
- **Blocks:** `RULES.md`, league identity in UI/seed, and competition rules
- **Who answers:** project owner (with professor approval)
- **Answer:** Professor approved using **SuperLiga României (regular season, home-and-away round-robin)** with official rules extracted from ROAF FRF (2018 edition, updated to 16 teams for SuperLiga) and Regulamentul Disciplinar FRF (2017 edition), replacing the organizer interview.
- **Recorded as:** `RULES.md`, `README.md`, `CONTEXT.md`

## Q-008 · What are the exact historical seed data (teams, rosters, results) from a past season?
- **Status:** answered 2026-11-20
- **Blocks:** Real-league dataset in `prisma/seed.ts` and verification against a past season
- **Who answers:** project owner (with professor approval)
- **Answer:** Seed data will use SuperLiga României regular-season data (16 teams, 30-round home-and-away format) matching the competition rules in `RULES.md`.
- **Recorded as:** `RULES.md`, `README.md`

## Q-009 · What are the exact competition format parameters of the real league?
- **Status:** answered 2026-11-20
- **Blocks:** Default season rule values (exact round-robin legs, points per win/draw/loss, match sheet squad size limits)
- **Who answers:** project owner (from `RULES.md`)
- **Answer:** Per ROAF Art. 8 lit. a, Art. 10 alin. 3, Art. 21 alin. 1, Art. 23, Art. 45, Art. 48, Art. 60, and Art. 63: 16 teams, home-and-away round-robin (30 rounds, same fixture sequence in the return leg), 90 min (2×45), 3 pts win / 1 pt draw / 0 pts loss, match sheet min 7 players / max 11 starters (+ substitutes) with server-side blocking of suspended players. The pure `src/domain/` engine remains configurable for odd team counts with `bye` per D-003.
- **Recorded as:** `RULES.md`

## Q-010 · What is the exact tie-breaker chain and three-way tie mini-table rule in the real regulation?
- **Status:** answered 2026-11-20
- **Blocks:** Default ordered tie-breaker criteria for the real league (head-to-head mini-table variant, circular `A>B>C>A` resolution, goal difference, goals scored)
- **Who answers:** project owner (from `RULES.md`)
- **Answer:** Per ROAF Art. 27 alin. 3 and 5: intermediate standings rank equal-point teams by overall goal difference, then overall goals scored. Final regular-season standings (including 3+ team head-to-head mini-table and circularity resolution) use: (1) head-to-head points, (2) head-to-head goal difference, (3) head-to-head goals scored, (4) head-to-head away goals scored, (5) overall goal difference, (6) overall goals scored.
- **Recorded as:** `RULES.md`

## Q-011 · What are the exact suspension rules (card thresholds, red card committee range, carry-over)?
- **Status:** answered 2026-11-20
- **Blocks:** Default suspension rule values (yellow-card threshold, double-yellow vs direct-red ban range, execution and replay rules)
- **Who answers:** project owner (from `RULES.md`)
- **Answer:** Per RD Art. 18, Art. 19 alin. 3, Art. 41 alin. 1–2.3, Art. 63 alin. 2, and D-005: yellow-card accumulation in the same competition triggers 1-round automatic suspension at 4, 7, 9 yellows, then every new yellow from the 10th onward (configurable per season); two yellows in one match (indirect red) trigger 1-round automatic suspension and cancel both yellows from the tally; yellow + direct red keeps the yellow in the tally; direct red triggers minimum 1-round suspension (configurable 1–24 rounds by committee decision, default 2 rounds for serious foul/language); only actually played matches consume bans in actual play order (postponed fixtures and `bye` rounds do not); replayed interrupted matches cancel yellow cards from the interrupted match (RD Art. 41 alin. 2.2); retroactive corrections raise a manual review alert without automatic forfeit (D-005).
- **Recorded as:** `RULES.md`

## Q-012 · What are the real pitch, day, time-slot, and organizer scheduling constraints?
- **Status:** answered 2026-11-20
- **Blocks:** Real pitch/availability seed data and scheduling constraints
- **Who answers:** project owner (from `RULES.md`)
- **Answer:** SuperLiga României regular season uses 16-team, 30-round home-and-away scheduling with identical round sequence in the return leg (ROAF Art. 10 alin. 3), respecting no double fixtures per day for a team, pitch day/time-slot availability, and home/away balance.
- **Recorded as:** `RULES.md`
