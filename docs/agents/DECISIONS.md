# Decisions — p19-liga-amatori

<!-- graffino-agentic:begin v1 -->
> Constraints the code must obey. Status: `approved` (obey) · `proposed` (do not
> build on it) · `superseded-by <ID>` (kept to explain old code).
> Adding or changing an entry needs the user's OK (AGENTS.md → The gate).
<!-- graffino-agentic:end -->

## Index
- D-001 · Tech stack and single-league monolith
- D-002 · Auth, HTTP-only sessions, and server-side RBAC
- D-003 · Round-robin only and pure, data-driven domain engine
- D-004 · Per-season server cache without Redis and in-app notifications only
- D-005 · Audited corrections, server-enforced match sheets, and non-destructive retroactive suspension alerts

---

## D-001 · Tech stack and single-league monolith
- **Status:** approved
- **Date:** 2026-11-19
- **Rule:** Build P19 as a single-league (multi-season) Next.js (App Router) + TypeScript (strict) + Tailwind CSS + Prisma + PostgreSQL monolith, tested with Vitest (domain/server) and Playwright (E2E and light/dark screenshots). Keep UI copy in Romanian and code, tests, and `docs/agents/` in English.
- **Why:** Confirmed during the scope interview (Q-001, Q-002, Q-006) for single-language full-stack ergonomics, relational modeling, and automated visual verification.
- **Rejected:** Separate SPA + Express/Fastify backend; multi-tenant leagues; native mobile apps.
- **Evidence:** `README.md`, `AGENTS.md`, `docs/agents/OPEN-QUESTIONS.md` (Q-001, Q-002, Q-006)
- **Source:** user · confidence high

## D-002 · Auth, HTTP-only sessions, and server-side RBAC
- **Status:** approved
- **Date:** 2026-11-19
- **Rule:** Authenticate users with email + password and signed HTTP-only session cookies, with accounts created by Admin plus demo accounts in seed (no third-party OAuth, no public self-signup). Enforce RBAC on the server for exactly 5 roles: `visitor` (unauthenticated), `player`, `captain`, `referee_organizer` (single combined role), and `admin`.
- **Why:** Keeps local execution and testing deterministic without external auth dependencies and matches the confirmed role boundaries (Q-001, Q-003).
- **Rejected:** Third-party OAuth (Google/Facebook), public player self-registration, separate `referee` and `organizer` roles.
- **Evidence:** `README.md`, `docs/agents/ARCHITECTURE.md`, `docs/agents/OPEN-QUESTIONS.md` (Q-001, Q-003)
- **Source:** user · confidence high

## D-003 · Round-robin only and pure, data-driven domain engine
- **Status:** approved
- **Date:** 2026-11-19
- **Rule:** Support only classic home-and-away round-robin leagues (even and odd team counts with `bye`; groups and knockout stages are out of scope). Implement schedule generation, standings (with a configurable ordered tie-breaker chain supporting 3+ team head-to-head mini-tables and circularity), and suspension calculations as pure, unit-tested TypeScript modules in `src/domain/`, reading league-specific parameters from season configuration rather than hard-coding unconfirmed real-league rules.
- **Why:** Scope was narrowed to classic round-robin, and real-league rules remain open (Q-007–Q-012) until the organizer interview and `RULES.md` are completed.
- **Rejected:** Groups + knockout/play-off formats; hard-coding guessed real-league thresholds or tie-breaker order.
- **Evidence:** `README.md`, `docs/agents/ARCHITECTURE.md`, `docs/agents/OPEN-QUESTIONS.md` (Q-003, Q-007–Q-012)
- **Source:** user · confidence high

## D-004 · Per-season server cache without Redis and in-app notifications only
- **Status:** approved
- **Date:** 2026-11-19
- **Rule:** Cache computed standings and results per season on the server without Redis, invalidating deterministically on every result entry or correction. Deliver fixture reschedule notifications exclusively as in-app PostgreSQL records (no external SMTP, SMS, WhatsApp, or push providers).
- **Why:** Keeps local setup self-contained and makes cache invalidation and notification behavior deterministically testable (Q-003).
- **Rejected:** External Redis cache; SMTP/SMS/WhatsApp/push notification providers.
- **Evidence:** `README.md`, `docs/agents/ARCHITECTURE.md`, `docs/agents/OPEN-QUESTIONS.md` (Q-003)
- **Source:** user · confidence high

## D-005 · Audited corrections, server-enforced match sheets, and non-destructive retroactive suspension alerts
- **Status:** approved
- **Date:** 2026-11-19
- **Rule:** Every result or match-event correction requires a reason and records an immutable audit snapshot (`before`/`after`, actor, timestamp). Match-sheet submission unconditionally rejects suspended players on the server (covered by automated tests). Suspensions count down on the team's next played rounds (postponed rounds do not consume a ban). When a correction retroactively makes a player ineligible for an already-played later fixture, raise an alert for `referee_organizer` and `admin` without automatically forfeiting or altering that fixture's score.
- **Why:** Enforces P19's core integrity and "twist" requirements while keeping disciplinary score decisions under human authority.
- **Rejected:** Silent result edits; UI-only suspension checks; calendar-based suspension countdowns; automatic 3–0 forfeit on retroactive conflicts.
- **Evidence:** `README.md`, `docs/agents/ARCHITECTURE.md`
- **Source:** user · confidence high
