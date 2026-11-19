# P19 — Liga de amatori: fixtures, clasament, suspendări

Platformă web pentru o ligă reală de fotbal de amatori (o singură ligă, mai multe sezoane): sezoane, echipe, jucători cu transferuri între sezoane, terenuri cu disponibilitate, generare program tur-retur cu constrângeri, introducere și corecție rezultate cu istoric, clasament live cu lanț de departajare configurabil, suspendări automate/disciplinare cu validare pe server la foaia de meci și alertare la modificări retroactive, statistici, export iCal per echipă și notificări in-app la reprogramare.

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
- **Livrabile de input uman:** `INTERVIEW.md` (interviul cu organizatorul), `RULES.md` (regulamentul real citat) și datele de seed ale unui sezon trecut (în așteptarea confirmării ligii reale — vezi secțiunea „Variabilele proiectului”).

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

## Variabilele proiectului (încă deschise — `Q-`)

Nu a fost inventat niciun detaliu despre liga reală sau organizator. Toate variabilele care depind de alegerea ligii finale, interviul cu organizatorul (`INTERVIEW.md`), regulamentul real (`RULES.md`) și sistemul de design sunt urmărite în [docs/agents/OPEN-QUESTIONS.md](docs/agents/OPEN-QUESTIONS.md):

| ID | Variabilă deschisă | Ce blochează |
|---|---|---|
| `Q-004` | Deploy / release la predare (local-only vs deploy public) | Secțiunea 5 din `AGENTS.md` |
| `Q-007` | Liga reală aleasă și concluziile interviului cu organizatorul | `INTERVIEW.md`, `RULES.md`, identitatea ligii |
| `Q-008` | Datele reale ale unui sezon trecut (echipe, loturi, rezultate) | `prisma/seed.ts` cu date reale |
| `Q-009` | Parametrii exacți ai formatului ligii (tururi, puncte, limite foaie de meci) | Configurația implicită de sezon |
| `Q-010` | Lanțul exact de departajare și varianta exactă de mini-clasament „la trei” | Ordinea implicită a criteriilor în motorul de clasament |
| `Q-011` | Regulile exacte de suspendări (prag galbene, roșu, raportare între sezoane) | Parametrii impliciți ai motorului de suspendări |
| `Q-012` | Constrângerile reale de terenuri, zile, intervale și obiceiuri de programare | Datele inițiale de terenuri și constrângeri suplimentare |

---

## Documentație repo
- [AGENTS.md](AGENTS.md) — reguli de lucru și definiția de „done”
- [CONTEXT.md](CONTEXT.md) — vocabularul aprobat al proiectului
- [docs/agents/README.md](docs/agents/README.md) — ghid rapid pentru ledger-ul de cunoștințe
- [docs/agents/ARCHITECTURE.md](docs/agents/ARCHITECTURE.md) — arhitectura planificată și fluxuri de date
- [docs/agents/OPEN-QUESTIONS.md](docs/agents/OPEN-QUESTIONS.md) — întrebări deschise (`Q-`)
- [docs/design/DESIGN.md](docs/design/DESIGN.md) & [docs/design/registry.yaml](docs/design/registry.yaml) — reguli de design și registrul ecranelor (`DS-`)
