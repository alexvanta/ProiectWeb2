# INTERVIEW — Interviu de analiză a cerințelor (SuperLiga României)

- **Data:** 2026-11-20
- **Intervievat:** Reprezentant Departament Competiții (Organizator SuperLiga României)
- **Scop:** Clarificarea regulilor operaționale, a fluxurilor de arbitraj/disciplină și a cazurilor limită pentru aplicația P19.
- **Documente de referință invocate în discuție:** ROAF FRF (ediția 2018, actualizat la 16 echipe) și Regulamentul Disciplinar FRF (ediția 2017).

---

## 1. Format competiție & calendar

**Întrebare:** Cum arată structura sezonului regular pe care trebuie să o modelăm și unde apar cele mai mari bătăi de cap la întocmirea programului?

**Răspuns:**
> În sezonul regular avem 16 echipe și jucăm sistem campionat clasic, tur–retur — adică 30 de etape, 15 în tur și 15 în retur, câte 90 de minute pe meci, cu punctajul standard 3–1–0. Un lucru la care ținem mult, conform ROAF Art. 10 alin. 3, este ca returul să păstreze exact aceeași succesiune a meciurilor ca turul, doar cu inversarea gazdei și a oaspetelui.
>
> În practică, cele mai frecvente probleme la generarea calendarului apar din suprapunerile de teren și din succesiunea acasă/deplasare. Nu poți programa aceeași echipă de două ori în aceeași zi și nici nu poți pune două meciuri pe același teren în același interval orar. În plus, dacă vrem să testăm sau să configurăm în viitor un sezon cu număr impar de echipe — cum se mai întâmplă când o echipă se retrage înainte de start — generatorul ar trebui să știe singur să introducă o etapă liberă (`bye`) fără să trebuiască să rescriem codul.

**Impact în aplicație:**
- Configurația implicită de sezon: **16 echipe, 30 de etape tur–retur** cu aceeași succesiune a meciurilor, **90 min (2×45)**, **3 / 1 / 0 puncte** ([RULES.md §1–§2](RULES.md)).
- Motorul de generare a programului din `src/domain/` rămâne pur, determinist și configurabil ca date, suportând atât număr par, cât și număr impar de echipe cu `etapă liberă` (`bye`), respectând constrângerile de teren, absența meciurilor duble în aceeași zi și echilibrarea acasă/deplasare (`D-003`).

---

## 2. Reprogramări & amânări

**Întrebare:** Cum gestionați în timpul sezonului meciurile amânate sau reprogramate din cauza vremii, a terenurilor indisponibile sau a altor solicitări, și cum află echipele din timp?

**Răspuns:**
> Reprogramările sunt aproape inevitabile într-un sezon de 30 de etape — fie avem ploi torențiale și teren impracticabil, fie un stadion intră în lucrări, fie o echipă are o solicitare aprobată de mutare pe altă zi sau altă oră. Regula de bază e simplă: doar Departamentul Competiții (organizatorul/arbitrul desemnat sau administratorul sistemului) are voie să modifice data, ora sau terenul unui meci. Cluburile nu editează programul.
>
> Problema reală din teren este comunicarea: de multe ori un delegat zice „eu n-am văzut mesajul pe grup”. De aceea avem nevoie ca în momentul în care mutăm un meci, aplicația să trimită automat o notificare direct în conturile căpitanilor și ale jucătorilor echipelor afectate. Nu vrem dependențe de servere de email sau SMS care pot pica sau intra în spam; un centru de notificări clar în aplicație este suficient și verificabil. În plus, echipele și suporterii cer des să își poată importa programul echipei favorite direct în Google Calendar sau Apple Calendar, deci un export iCal (`.ics`) per echipă ne scutește de zeci de telefoane.

**Impact în aplicație:**
- Reprogramarea unui meci (dată, oră, teren) este permisă exclusiv rolurilor `arbitru / organizator` și `admin` (`D-002`).
- Fiecare reprogramare creează automat **notificări in-app** stocate în PostgreSQL pentru jucătorii și căpitanii echipelor afectate, fără furnizori externi SMTP/SMS/WhatsApp/push (`D-004`).
- Programul public (`/program`) oferă **export iCal (`.ics`) per echipă** (`D-001`).

---

## 3. Clasament & departajare

**Întrebare:** Unde apar cele mai des discuții sau erori de calcul în clasament, mai ales spre finalul sezonului regular?

**Răspuns:**
> Aici avem două momente distincte, prevăzute clar în ROAF Art. 27, și lumea le încurcă mereu dacă nu sunt implementate corect.
>
> Pe parcursul sezonului regular, în clasamentele intermediare, departajarea la egalitate de puncte se face simplu: golaverajul general, apoi golurile marcate în total. Nu are sens să aplici meciurile directe în etapa a 8-a când echipele nici măcar nu s-au întâlnit încă tur–retur.
>
> Însă la finalul sezonului regular intră în vigoare criteriile pe meciuri directe: mai întâi punctele din meciurile directe, apoi golaverajul direct, golurile marcate în meciurile directe, golurile marcate în deplasare în meciurile directe, și abia apoi golaverajul general și golurile marcate total. Cel mai delicat caz pe care îl întâlnim aproape în fiecare sezon este egalitatea în trei sau patru echipe — uneori chiar circulară, gen A a bătut pe B, B a bătut pe C și C a bătut pe A. Acolo trebuie construit corect mini-clasamentul doar între echipele aflate la egalitate, iar dacă după un criteriu rămân două echipe tot egale, se reia lanțul doar pentru ele. Calculul trebuie să fie 100% determinist și să se actualizeze imediat ce intră un rezultat sau o corecție.

**Impact în aplicație:**
- Clasamentul și lanțul de departajare sunt implementate ca funcție pură, testată determinist în `src/domain/`, cu lanț configurabil per sezon care acoperă atât modul intermediar, cât și modul final de sezon regular (toate cele 6 criterii din ROAF Art. 27 alin. 3 și 5, inclusiv mini-clasament pentru 3+ echipe și rezolvare circularitate `A > B > C > A`) ([RULES.md §3](RULES.md), `D-003`).
- Clasamentul calculat este memorat într-un **cache pe server per sezon (fără Redis)**, invalidat determinist la fiecare introducere sau corecție de rezultat (`D-004`).

---

## 4. Foi de meci & eligibilitate

**Întrebare:** Cum decurge depunerea foii de meci înaintea partidei și cum preveniți situațiile în care intră pe teren un jucător suspendat?

**Răspuns:**
> Înainte de fluierul de start, delegatul sau căpitanul echipei completează foaia de meci cu lotul pentru partida respectivă — conform ROAF, o echipă nu poate începe jocul cu mai puțin de 7 jucători și poate trece maxim 11 titulari plus rezervele.
>
> Cea mai costisitoare greșeală administrativă într-un campionat este să bagi din neatenție un jucător suspendat pe foaie. Degeaba îi pui un semn roșu în interfață dacă cineva tot poate forța trimiterea formularului. Pentru noi e critic ca verificarea eligibilității să fie făcută obligatoriu pe server: dacă un jucător are suspendare activă pentru etapa respectivă, sistemul trebuie să respingă depunerea foii de meci și să spună clar de ce, indiferent de ce face utilizatorul în browser.

**Impact în aplicație:**
- Foaia de meci (`/capitan/foaie-meci/[matchId]`) respectă limitele ROAF Art. 45, 48, 60, 63 (**minim 7 jucători**, **maxim 11 titulari + rezerve**) ([RULES.md §4](RULES.md)).
- Validarea eligibilității este aplicată **necondiționat pe server** la depunerea foii de meci (acoperită de teste automate), respingând orice jucător aflat în suspendare activă (`D-005`).

---

## 5. Disciplină & suspendări

**Întrebare:** Care sunt regulile exacte pentru cumulul de cartonașe și pentru executarea suspendărilor? Ce cazuri limită vă dau cel mai des bătăi de cap?

**Răspuns:**
> Aici ne ghidăm strict după Regulamentul Disciplinar FRF (Art. 18, 19, 41 și 63), și sunt câteva nuanțe pe care tabelele făcute în Excel le greșesc aproape garantat:
>
> 1. **Cumulul de galbene** în aceeași competiție: un jucător stă automat 1 etapă la al 4-lea cartonaș galben, apoi la al 7-lea, apoi la al 9-lea, iar de la al 10-lea încolo stă 1 etapă la absolut fiecare nou cartonaș galben. E bine ca pragurile să fie configurabile per sezon, în caz că regulamentul se ajustează în sezoanele viitoare.
> 2. **Două galbene în același meci (roșu indirect):** jucătorul primește 1 etapă suspendare automată, dar — atenție! — acele două galbene se anulează din cumul, nu se adaugă la contorul de galbene.
> 3. **Galben + roșu direct în același meci:** aici e invers — cartonașul galben primit anterior în acel meci rămâne în cumul, pe lângă suspendarea pentru roșu direct.
> 4. **Roșu direct:** atrage minim 1 etapă automat, dar Comisia de Disciplină poate stabili între 1 și 24 de etape, în funcție de gravitate (în practică, pentru o abatere gravă sau limbaj injurios, plecăm frecvent de la 2 etape implicit, ajustabil de organizator).
> 5. **Cum se execută suspendarea:** niciodată calendaristic și niciodată pe etape amânate sau etape libere (`bye`)! Dacă echipa are etapa 12 amânată din cauza zăpezii și joacă mai întâi etapa 13, jucătorul stă în etapa 13 (primul meci jucat efectiv) și va putea juca în restanța din etapa 12. Doar meciurile disputate efectiv consumă etape de suspendare, în ordinea reală în care se joacă.
> 6. **Meci întrerupt și rejucat integral:** conform RD Art. 41 alin. 2.2, cartonașele galbene acordate în meciul întrerupt se anulează.

**Impact în aplicație:**
- Toate regulile de disciplină (praguri `4, 7, 9, 10+` configurabile per sezon; roșu indirect = `1` etapă + anularea celor 2 galbene din cumul; galben + roșu direct = păstrarea galbenului; roșu direct = `1–24` etape configurabile, implicit `2`; anularea galbenelor la meci întrerupt rejucat integral) sunt documentate în [RULES.md §5](RULES.md) și implementate ca funcții pure în `src/domain/` (`D-003`).
- Contorizarea suspendărilor se face strict pe **următoarele meciuri jucate efectiv de echipă**, în ordinea efectivă de disputare, ignorând meciurile amânate și etapele libere (`bye`) (`D-005`).

---

## 6. Corecții post-meci & alerte retroactive

**Întrebare:** Se întâmplă să fie necesară corectarea unui raport de arbitraj după ce meciul a fost deja salvat — de exemplu un cartonaș galben trecut din greșeală pe numărul 14 în loc de numărul 4? Ce trebuie să facă aplicația într-un asemenea caz?

**Răspuns:**
> Se întâmplă mai des decât ar crede lumea, mai ales când plouă și numerele de pe tricouri nu se văd clar sau când raportul e introdus seara târziu după meci. Corecțiile trebuie permise pentru `arbitru / organizator` și `admin`, dar niciodată „pe tăcute”: cel care modifică scorul sau un eveniment de meci trebuie să scrie obligatoriu un motiv, iar sistemul să păstreze intact istoricul — ce era înainte, ce e după, cine a modificat și la ce oră.
>
> Marea capcană apare când corecția vine după ce s-a jucat deja etapa următoare. Să zicem că în etapa 5 îi mutăm retroactiv un galben jucătorului X, și astfel el ajunge la al 4-lea galben după etapa 5 — deci ar fi trebuit să fie suspendat în etapa 6, pe care însă echipa lui a jucat-o deja cu el pe teren! Într-o asemenea situație, aplicația **nu** are voie să schimbe singură scorul etapei 6 în 3–0 la masa verde. O omologare cu forfait este o decizie omenească de comisie, nu o regulă automată de software. Ce vrem de la aplicație este să detecteze imediat conflictul retroactiv și să ridice o alertă vizibilă către organizator și admin pentru revizuire manuală.

**Impact în aplicație:**
- Fiecare corecție de rezultat sau eveniment de meci impune un **motiv obligatoriu** și salvează un **snapshot de audit imutabil** (`before`/`after`, autor, timestamp), vizibil în pagina de detaliu meci, invalidând determinist cache-ul sezonului (`D-004`, `D-005`).
- Dacă o corecție face retroactiv un jucător neeligibil într-un meci deja jucat, aplicația **nu modifică automat scorul** (fără forfait automat), ci generează o **alertă de suspendare retroactivă** pentru `arbitru / organizator` și `admin` ([RULES.md §5.7](RULES.md), `D-005`).

---

## 7. Roluri & control acces

**Întrebare:** Cine are cont în platformă și cum ar trebui gestionate permisiunile? Vreți înregistrare liberă pentru jucători sau autentificare cu Google?

**Răspuns:**
> Nu vrem înregistrare liberă pe internet — altfel și-ar face cont oricine și s-ar da drept căpitanul unei echipe ca să vadă sau să modifice foi de meci. Conturile trebuie create și administrate centralizat de `Admin` (plus conturi demo preconfigurate pentru evaluare și testare), cu autentificare simplă pe email și parolă, fără login-uri terțe gen Google sau Facebook.
>
> Ca niveluri de acces, avem cinci roluri clare: publicul neautentificat (`vizitator`) vede tot ce e public; `jucătorul` își vede în plus situația proprie de cartonașe/suspendări și notificările de reprogramare; `căpitanul` poate depune foaia de meci a echipei sale; `arbitrul / organizatorul` (un singur rol operațional combinat) introduce și corectează rezultate, reprogramează meciuri, stabilește etapele de suspendare la roșu direct și revizuiește alertele retroactive; iar `adminul` are control complet asupra sezoanelor, echipelor, transferurilor, terenurilor, generatorului de program și conturilor. Toate verificările de rol trebuie făcute strict pe server.

**Impact în aplicație:**
- Autentificare cu **email + parolă** și **sesiuni HTTP-only semnate**, fără OAuth terț și fără auto-înregistrare publică; conturi create de `Admin` + conturi demo în seed (`D-002`).
- **RBAC strict pe server** pentru exact cele 5 roluri: `visitor`, `player`, `captain`, `referee_organizer`, `admin` (`D-002`).

---

## 8. Experiența publicului & utilizarea pe mobil

**Întrebare:** Cum folosesc suporterii, jucătorii și presa platforma în ziua de meci? Ce informații caută în primele secunde, mai ales de pe telefon?

**Răspuns:**
> Peste 70% din trafic în weekend e de pe mobil, direct din tribună sau imediat după fluierul final. Oamenii nu vor să sape prin meniuri: vor să intre pe prima pagină și să vadă instant **clasamentul live**, **etapa curentă**, **forma ultimelor 5 meciuri** (și pe desktop, când pui cursorul pe un badge de formă `W`/`D`/`L`, să vezi repede adversarul și scorul acelui meci) și **topul marcatorilor** sau jucătorii suspendați.
>
> Pe pagina de program, lumea filtrează după echipa favorită, etapă sau status și descarcă fișierul iCal. Iar când dau click pe un meci, vor o pagină de detaliu curată: scorul mare, cronologia evenimentelor (goluri, cartonașe galbene și roșii cu minutul), foile de meci ale celor două echipe și — pentru transparență completă — istoricul eventualelor corecții de rezultat. Totul trebuie să fie în limba română, lizibil atât pe temă deschisă ziua pe stadion, cât și pe temă întunecată seara.

**Impact în aplicație:**
- Interfață în **limba română**, **responsive**, cu suport **Light & Dark mode**, aliniată la sistemul de design din [docs/design/DESIGN.md](docs/design/DESIGN.md) și verificată prin screenshot-uri Playwright (`D-001`).
- Ecrane publice dedicate: `/` (Clasament live, etapa curentă, formă ultimele 5 meciuri cu detalii la hover), `/program` (filtre + export iCal `.ics`), `/meciuri/[id]` (scor, timeline evenimente, foi de meci, istoric corecții), `/statistici` (top marcatori, cartonașe, suspendări active), `/echipe/[id]` și `/jucatori/[id]` (`D-001`).

---

## Rezumat mapare cerințe → `RULES.md` și `DECISIONS.md`

| Temă din interviu | Regulă oficială (`RULES.md`) | Decizii arhitecturale (`docs/agents/DECISIONS.md`) |
|---|---|---|
| 1. Format & calendar (16 echipe, 30 etape tur–retur, configurabil cu `bye`) | [RULES.md §1–§2](RULES.md) (ROAF Art. 8 lit. a, 10 alin. 3, 21 alin. 1, 23) | `D-001`, `D-003` |
| 2. Reprogramări, notificări in-app & iCal `.ics` | [RULES.md §1](RULES.md) | `D-001`, `D-002`, `D-004` |
| 3. Clasament intermediar vs. final & mini-clasament 3+ echipe | [RULES.md §3](RULES.md) (ROAF Art. 27 alin. 3 & 5) | `D-003`, `D-004` |
| 4. Foi de meci (min 7 / max 11 + rezerve) & blocare suspendați pe server | [RULES.md §4](RULES.md) (ROAF Art. 45, 48, 60, 63) | `D-002`, `D-005` |
| 5. Disciplină, praguri galbene, roșu indirect/direct, consum pe meciuri jucate | [RULES.md §5.1–§5.6](RULES.md) (RD Art. 18, 19 alin. 3, 41 alin. 1–2.3, 63 alin. 2) | `D-003`, `D-005` |
| 6. Corecții cu motiv & audit `before`/`after` + alerte retroactive fără forfait automat | [RULES.md §5.7](RULES.md) | `D-004`, `D-005` |
| 7. Autentificare email+parolă, 5 roluri, RBAC pe server | — (operațional) | `D-002` |
| 8. Public mobil/desktop, română, Light/Dark, formă, timeline, statistici | — (UX & design: `docs/design/DESIGN.md`) | `D-001` |
