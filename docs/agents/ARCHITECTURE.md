# Architecture — p19-liga-amatori

<!-- graffino-agentic:begin v1 -->
> How this repo is built, generated from the code at backfill and kept current by
> whoever changes the structure. The code wins: when this page is wrong, fix it.
<!-- graffino-agentic:end -->

## Overview
Planned architecture for **P19 — Amateur Football League** (single league, multiple
seasons; app not scaffolded yet). A Next.js App Router monolith serves 10 Romanian UI
screens (light and dark), authenticates users via email/password HTTP-only sessions with
server-side RBAC, executes pure TypeScript domain algorithms, and persists state in
PostgreSQL via Prisma. League-specific rules remain configurable data (Q-007–Q-012).

```text
Browser (10 Romanian UI screens, Light/Dark, iCal download)
  │
  ▼
Next.js App Router (src/app/)
  ├── Server Auth & RBAC (src/server/auth/)  ──► HTTP-only session cookie
  ├── Per-Season Server Cache (src/server/cache/) ──► invalidated on result write/correction
  ├── Pure Domain Engine (src/domain/)
  │     ├── scheduler   (round-robin par/impar + bye + pitch/day/home-away constraints)
  │     ├── standings   (pure function + configurable tie-breaker chain incl. 3-way mini-table)
  │     ├── suspensions (played-round countdown, carry-over, retroactive eligibility check)
  │     └── ical        (.ics generator per team)
  └── Persistence (Prisma ORM, prisma/)
        │
        ▼
PostgreSQL (local instance / Docker Compose)
```

## Parts
| Part | Path | Responsibility | Talks to |
|---|---|---|---|
| Web UI & API *(planned)* | `src/app/` | 10 screens (6 public, 4 authenticated), Route Handlers, Server Actions, iCal endpoint | `src/server/`, `src/domain/`, Prisma |
| Domain engine *(planned)* | `src/domain/` | Pure functions for schedule generation, standings, suspensions, retroactive checks, iCal | None (pure TypeScript) |
| Auth & RBAC *(planned)* | `src/server/auth/` | Email/password hashing, HTTP-only session validation, 5-role RBAC enforcement | Prisma |
| Season cache *(planned)* | `src/server/cache/` | Per-season cached standings/results with deterministic invalidation (no Redis) | `src/domain/`, Prisma |
| Persistence *(planned)* | `prisma/` | Schema, migrations, demo accounts, and real-league seed script (Q-008) | PostgreSQL |
| Tests *(planned)* | `tests/` | Vitest unit/integration tests and Playwright E2E + light/dark screenshot scripts | `src/domain/`, Next.js app |

## Data flow
1. **Schedule generation:** Admin configures season, teams, and pitch availabilities → `src/domain/scheduler` generates a constrained round-robin schedule (par/impar with `bye`, max 1 fixture/team/day, pitch slots, home/away balance) → preview shown → Admin confirms → fixtures saved to PostgreSQL.
2. **Match sheet submission:** Captain submits a squad for an upcoming fixture → server verifies role and team ownership → `src/domain/suspensions` evaluates active bans by played rounds → server rejects any suspended player (4xx) or saves the match sheet.
3. **Result entry & audited correction:** Referee/Organizer submits or edits score and match events → server requires a reason on correction and writes a `before`/`after` audit snapshot → season cache is invalidated → `src/domain/standings` recomputes standings → `src/domain/suspensions` checks already-played later fixtures and raises a retroactive suspension alert if an ineligible player appeared (never auto-forfeits).
4. **Fixture reschedule:** Referee/Organizer updates fixture date, time, or pitch → fixture saved → server writes in-app reschedule notifications in PostgreSQL for players and captains of both teams → team iCal feeds serve updated schedule.

## State and storage
| What | Where | Owner | Notes |
|---|---|---|---|
| League, seasons, rule configs | PostgreSQL (`prisma/`) | Admin | Tie-breaker chain and suspension rules stored as data (Q-009–Q-011) |
| Teams, players, season transfers | PostgreSQL (`prisma/`) | Admin | Transfers are season-scoped to preserve past history |
| Pitches & availability slots | PostgreSQL (`prisma/`) | Admin | Days and time intervals (Q-012) |
| Fixtures, match sheets, match events | PostgreSQL (`prisma/`) | Captain / Referee-Organizer | Match sheets enforce suspension check on server |
| Result corrections audit log | PostgreSQL (`prisma/`) | Referee / Organizer | Immutable `before`/`after` snapshot, reason, actor, timestamp |
| Suspensions & retroactive alerts | PostgreSQL (`prisma/`) | System / Referee-Organizer | Served per played round; committee sets red-card duration |
| In-app reschedule notifications | PostgreSQL (`prisma/`) | System | Read/unread state for players and captains |
| Standings & results cache | Server memory / Next.js cache | Server (`src/server/cache/`) | Keyed per season; invalidated on every result or correction; no Redis |

## Configuration
| Name | Where set | Used by | Notes |
|---|---|---|---|
| `DATABASE_URL` | `.env` (local, untracked) | Prisma / Next.js server | PostgreSQL connection string |
| `SESSION_SECRET` | `.env` (local, untracked) | `src/server/auth/` | Signs HTTP-only session tokens |
<!-- names only, never values -->

## Build, deploy, runtime
Local-first Next.js and PostgreSQL setup (no production CI/CD in scope). Commands and release status live in `AGENTS.md` sections 2 and 5 (see also Q-004).

## Boundaries
- **Authentication & RBAC:** Enforced on the server for every mutation and restricted route; 5 roles (`visitor`, `player`, `captain`, `referee_organizer`, `admin`).
- **Match-sheet integrity:** Server unconditionally rejects suspended players; UI disabling is advisory only.
- **Audit & retroactive safety:** Corrections always append an audit record; retroactive suspension conflicts raise an alert for human review instead of mutating past match scores.
- **No external runtime dependencies:** No OAuth, no SMTP/SMS, no Redis.
