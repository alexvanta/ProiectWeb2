# AI_LOG — p19-liga-amatori

## 2026-11-19 — Specificație P19, documentație inițială și decizii D-001–D-005
- **Activitate:**
  - Interviu de specificație în română pentru proiectul **P19 („Liga de amatori: fixtures, clasament, suspendări”)** — clarificate stack-ul, rolurile/RBAC, formatul competiției, strategia de cache/notificări, cele 10 ecrane și lista explicită de Out of scope.
  - Actualizat/creat documentația de proiect și ledger-ul: `README.md`, `AGENTS.md`, `CONTEXT.md`, `docs/agents/ARCHITECTURE.md`, `docs/agents/OPEN-QUESTIONS.md` (`Q-001`–`Q-003`, `Q-006` răspunse; `Q-004`–`Q-005` deschise; adăugate `Q-007`–`Q-012` pentru liga reală, interviul cu organizatorul și `RULES.md`, fără valori inventate) și `docs/design/registry.yaml` (10 ecrane `DS-p19-*`, `status: draft`).
  - Propuse și aprobate deciziile tehnice `D-001`–`D-005`, înregistrate în `docs/agents/DECISIONS.md` (`status: approved`).
- **Verificare:** `python3 docs/agents/tools/ledger-lint.py --fix` și `python3 docs/agents/tools/ledger-lint.py` → `✓ ledger ok`.

## 2026-11-20 — Sistem de design (Partea D), Regulament oficial, Interviu și Implementare P19 (Fazele 1–6)
- **Activitate:**
  - **Sistem de design & mock-uri publice (`ed1435a`):** completat `docs/design/DESIGN.md` (token-uri Light/Dark WCAG AA), mock-uri HTML publice (`DS-p19-home-standings`, `DS-p19-fixtures`, `DS-p19-match-detail`, `DS-p19-team-profile`) și închis `Q-005`.
  - **Regulament oficial & Interviu (`9fd33a1`, `db9348f`, `f220fb9`):** creat `RULES.md` (ROAF FRF 2018 & RD FRF 2017 pentru SuperLiga României — sezon regular) și `INTERVIEW.md`; închise toate întrebările `Q-004` și `Q-007`–`Q-012`.
  - **Faza 1 (`88053d1`):** inițializat Next.js 15 (App Router), TypeScript strict, Tailwind CSS v4, Prisma + PostgreSQL (`docker-compose.yml` + `.env.example`), Vitest, Playwright și schema completă `prisma/schema.prisma`.
  - **Faza 2 (`a4d6aec`):** implementat motorul pur în `src/domain/` (`scheduler.ts`, `standings.ts`, `suspensions.ts`, `ical.ts`) + 20 teste unitare Vitest (inclusiv 6 teste pe departajarea la 3+ echipe și circularitate `A > B > C > A`).
  - **Faza 3 (`e80e1c3`):** extras sezonul regular real 2025/2026 (240 meciuri, 16 echipe normalizate) în `prisma/seed-data/superliga-2025-2026.json`, șters `ROU.csv`, adăugat testul de validare exactă față de `official-standings-2025-2026.txt` și implementat `prisma/seed.ts` multi-sezon (Sezon 1 real + Sezon 2 generat cu transferuri, suspendări reportate și 4 conturi demo + vizitator).
  - **Faza 4 (`9e0bfd3`):** implementat autentificare `scrypt` + sesiuni HTTP-only semnate, RBAC strict pe server (`D-002`), cache per sezon fără Redis (`D-004`), blocare suspendați pe server la foaia de meci, audit imutabil `before`/`after` + alerte retroactive fără forfait automat (`D-005`), notificări in-app și export iCal (`.ics`), plus 9 teste server Vitest.
  - **Faza 5 (`9692abe`):** implementate toate cele 10 ecrane UI în română (Light/Dark, fără date hardcodate) conectate la Prisma/API și actualizat `docs/design/registry.yaml`.
  - **Faza 6:** adăugate suitele Playwright E2E (`tests/e2e/public-flows.spec.ts`, `tests/e2e/role-flows.spec.ts`), completată secțiunea de validare în `INTERVIEW.md` și actualizate `AGENTS.md`, `ARCHITECTURE.md`, `README.md` și `AI_LOG.md`.
- **Verificare:** `npm test` (8/8 fișiere, 30/30 teste trecute), `npm run typecheck`, `npm run lint`, `npm run build` și `python3 docs/agents/tools/ledger-lint.py` → toate verzi.
