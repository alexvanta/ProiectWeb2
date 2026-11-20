# P19 — SuperLiga României (sezon regular): fixtures, clasament, suspendări

Platformă web pentru competiția **SuperLiga României — sezon regular** (o singură ligă, mai multe sezoane, regulament oficial extras din ROAF FRF 2018 și Regulamentul Disciplinar FRF 2017): sezoane, echipe (16 echipe, 30 etape tur–retur), jucători cu transferuri între sezoane, terenuri cu disponibilitate, generare program tur–retur cu constrângeri (configurabil și pentru număr impar cu `bye`), introducere și corecție rezultate cu istoric, clasament live cu lanț de departajare configurabil, suspendări automate/disciplinare cu validare pe server la foaia de meci și alertare la modificări retroactive, statistici, export iCal per echipă și notificări in-app la reprogramare.

- **Limbă UI:** română (Light + Dark mode, responsive)
- **Limbă cod & ledger:** engleză (`AGENTS.md`, `docs/agents/`)

---

## Scope-ul proiectului

### Ce intră în scope (Must)
- **Administrare domeniu:** sezoane, echipe, jucători (transferuri între sezoane cu păstrarea istoricului), terenuri cu disponibilități (zile, intervale), configurare reguli ligă ca date.
- **Generator de program (doar tur-retur / round-robin):** algoritm testat pentru număr par și impar de echipe (cu `bye`), respectând constrângerile: niciun meci dublu în aceeași zi pentru o echipă, disponibilitățile terenurilor și echilibrarea acasă / în deplasare.
- **Rezultate, evenimente și corecții cu istoric:** introducere scor, goluri, marcatori și cartonașe de către `arbitru / organizator` (sau `admin`); orice corecție cere motiv, salvează snapshot de audit (`before`/`after`, autor, timestamp) și invalidează cache-ul sezonului.
- **Clasament live & departajare („la trei”):** funcție pură, testată determinist, cu lanț de departajare configurabil ca listă ordonată de criterii (inclusiv mini-clasament pentru 3+ echipe cu circularitate `A > B > C > A` și reluarea lanțului pentru echipele încă egale).
- **Suspendări & foaie de meci:** suspendări automate după regulamentul ligii (cumul galbene + decizie comisie la roșu), consumate pe **următoarele etape jucate efectiv de echipă** (nu calendaristic; o etapă amânată nu consumă suspendarea), raportabile în sezonul următor; respingere obligatorie **pe server** a jucătorilor suspendați la trimiterea foii de meci; **alerte de suspendare retroactivă** către `arbitru / organizator` și `admin` la corecții care afectează meciuri deja jucate (fără anulare automată a scorului).
- **Statistici, iCal și notificări:** top marcatori, cartonașe, forma ultimelor 5 meciuri, pagini publice echipe și jucători, program public cu filtre, export iCal (`.ics`) per echipă și notificări **in-app** (PostgreSQL) la reprogramare.
- **Regulament oficial & date:** [RULES.md](RULES.md) (regulamentul SuperLigii României — sezon regular, cu citarea articolelor din ROAF FRF 2018 și RD FRF 2017, aprobat de profesor) și datele reale ale unui sezon regular în `prisma/seed.ts`.

### Ecrane (10 ecrane — Light & Dark)
**Publice:**
1. `/` — Clasament live & Etapa curentă
2. `/program` — Program meciuri (filtre + export iCal per echipă)
3. `/meciuri/[id]` — Detaliu meci (scor, evenimente, foi de meci, istoric corecții)
4. `/statistici` — Statistici & Suspendări active
5. `/echipe/[id]` — Profil echipă
6. `/jucatori/[id]` — Profil jucător

**Autentificate:**
7. `/login` și `/notificari` — Autentificare + Centru notificări in-app
8. `/capitan/foaie-meci/[matchId]` — Foaie de meci (Căpitan)
9. `/arbitru` — Panou Arbitru / Organizator
10. `/admin` — Panou Admin

### Roluri și permisiuni (RBAC verificat pe server)
- **Vizitator (neautentificat):** acces public la clasament, program + filtre, detalii meci, statistici, suspendări active, pagini echipe/jucători, export iCal.
- **Jucător:** permisiunile vizitatorului + status propriu cartonașe/suspendări + notificări in-app de reprogramare.
- **Căpitan:** permisiunile jucătorului + completare/trimitere foaie de meci pentru echipa sa.
- **Arbitru / Organizator (rol unic):** introducere și corecție rezultate/evenimente (cu motiv și istoric), reprogramare meciuri, decizii suspendare la roșu, alerte suspendări retroactive.
- **Admin:** toate permisiunile + sezoane, reguli ligă, echipe, jucători/transferuri, terenuri/disponibilități, generator program, conturi și roluri.

### Ce NU intră în proiect (Out of scope)
1. Formate cu grupe și faze eliminatorii (cupă / play-off).
2. Plăți, taxe de înscriere, amenzi financiare sau deconturi de arbitraj.
3. Notificări externe (email SMTP, SMS, WhatsApp, push notifications).
4. Aplicație mobilă nativă (iOS / Android).
5. OAuth terț (Google/Facebook) și auto-înregistrare publică a jucătorilor.
6. Live ticker minut cu minut (WebSockets), chat, comentarii, forum sau galerii media.
7. Multi-tenant / mai multe ligi paralele gestionate separat.
8. Anulare automată la „masa verde” (3–0) în caz de suspendare retroactivă.
9. Deploy în producție și CI/CD complex (rulare locală reproductibilă; eventualul deploy rămâne opțional, vezi `Q-004`).

---

## Stack tehnologic
- **Frontend & Backend:** Next.js (App Router), TypeScript (strict), Tailwind CSS
- **Bază de date & ORM:** PostgreSQL + Prisma
- **Autentificare:** Email + parolă cu sesiuni HTTP-only; conturi create de Admin + conturi demo în seed; RBAC pe server
- **Cache:** Cache pe server per sezon (fără Redis), invalidat determinist la rezultate și corecții
- **Testare & Verificare vizuală:** Vitest (algoritmi, clasament pur, suspendări, cache, server guards) + Playwright (E2E + screenshot-uri automate Light & Dark)

---

## Pornire rapidă locală (Docker / PostgreSQL)

```bash
# 1. Instalează dependențele și configurează variabilele de mediu
npm install
cp .env.example .env

# 2. Pornește PostgreSQL local prin Docker Compose
docker compose up -d

# 3. Aplică migrările Prisma și încarcă datele (Sezon real 2025/2026 + Sezon activ 2026/2027)
npx prisma migrate dev
npm run db:seed

# 4. Pornește aplicația Next.js
npm run dev
```

Aplicația va fi disponibilă la `http://localhost:3000`.

### Conturi demo pre-încărcate (`D-002`)
| Rol | Email | Parolă | Acces principal |
|---|---|---|---|
| `ADMIN` | `admin@superliga.ro` | `Admin123!` | `/admin` (sezoane, echipe, transferuri, terenuri, generator program, conturi) |
| `REFEREE_ORGANIZER` | `arbitru@superliga.ro` | `Arbitru123!` | `/arbitru` (rezultate, corecții audit, reprogramări, alerte retroactive) |
| `CAPTAIN` (Univ. Craiova) | `capitan@craiova.ro` | `Capitan123!` | `/capitan` (foaie de meci cu blocare suspendați) & `/notificari` |
| `PLAYER` (Univ. Craiova) | `jucator@craiova.ro` | `Jucator123!` | `/notificari` (notificări in-app reprogramare) |
| `VISITOR` | *(neautentificat)* | — | Clasament, program + iCal, detalii meci, statistici, echipe, jucători |

### Teste & verificare
```bash
# Teste unitare & server (Vitest — 30 teste: scheduler, clasament 3-way, sezon real 2025/2026, suspendări, RBAC, cache)
npm test

# Verificare TypeScript, ESLint, Next.js build și ledger
npm run typecheck
npm run lint
npm run build
python3 docs/agents/tools/ledger-lint.py

# Teste E2E Playwright (necesită PostgreSQL pornit și baza populată cu npm run db:seed)
npx playwright install chromium
npm run test:e2e
```

---

## Documentație repo
- [AGENTS.md](AGENTS.md) — reguli de lucru și definiția de „done”
- [CONTEXT.md](CONTEXT.md) — vocabularul aprobat al proiectului
- [INTERVIEW.md](INTERVIEW.md) — interviul de analiză a cerințelor și validarea pe sezonul real 2025/2026
- [RULES.md](RULES.md) — regulamentul oficial al competiției (SuperLiga României — sezon regular, ROAF FRF 2018 & RD FRF 2017)
- [AI_LOG.md](AI_LOG.md) — jurnalul etapelor de lucru
- [docs/agents/README.md](docs/agents/README.md) — ghid rapid pentru ledger-ul de cunoștințe
- [docs/agents/ARCHITECTURE.md](docs/agents/ARCHITECTURE.md) — arhitectura implementată și fluxuri de date
- [docs/agents/OPEN-QUESTIONS.md](docs/agents/OPEN-QUESTIONS.md) — toate întrebările `Q-001`–`Q-012` (închise)
- [docs/design/DESIGN.md](docs/design/DESIGN.md) & [docs/design/registry.yaml](docs/design/registry.yaml) — reguli de design și registrul ecranelor (`DS-`)
