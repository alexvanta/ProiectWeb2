# RULES — Regulamentul competiției (SuperLiga României — Sezon regular)

Acest document definește regulamentul oficial folosit de platforma **P19**, aprobat pentru utilizarea cu regulamentul și datele **SuperLigii României (sezon regular, format tur–retur)**.

Regulile sunt extrase din:
- **ROAF FRF** — *Regulamentul de Organizare a Activității Fotbalistice* (ediția 2018, cu actualizarea la 16 echipe pentru SuperLiga României);
- **RD FRF** — *Regulamentul Disciplinar al FRF* (ediția 2017).

> **Principiu de arhitectură (`D-003`):** Toți parametrii numerici (număr de echipe, praguri de cartonașe, lanț de departajare, intervale de suspendare) sunt stocați ca date de configurare per sezon și evaluați de module pure, testate unitar din `src/domain/`. Valorile de mai jos constituie configurația oficială implicită pentru un sezon de SuperLiga României.

---

## 1. Formatul competiției

**Surse:** ROAF Art. 8 lit. a, Art. 10 alin. 3; `D-003`.

- **Număr de echipe:** **16 echipe**.
- **Sistem de desfășurare:** campionat **tur–retur** (round-robin clasic), totalizând **30 de etape** (15 etape în tur + 15 etape în retur).
- **Succesiunea etapelor:** returul păstrează **aceeași succesiune a meciurilor** ca turul, cu inversarea rolurilor gazdă / oaspete (ROAF Art. 10 alin. 3).
- **Configurabilitate motor pur (`D-003`):** generatorul de program din `src/domain/` rămâne configurabil și pentru un număr impar de echipe, caz în care introduce automat câte o **etapă liberă (`bye`)** per etapă.
- **Constrângeri de programare:** niciun meci dublu în aceeași zi pentru o echipă, respectarea disponibilității terenurilor (zile și intervale orare) și echilibrarea alternanței acasă / în deplasare.
- **În afara scope-ului (`D-003`):** fazele de play-off / play-out, grupele și fazele eliminatorii.

---

## 2. Durata meciului și punctajul

**Surse:** ROAF Art. 21 alin. 1, Art. 23.

- **Durata regulamentară:** **90 de minute** (2 reprize × 45 de minute).
- **Punctaj:**
  - **Victorie:** `3` puncte
  - **Egal:** `1` punct
  - **Înfrângere:** `0` puncte

---

## 3. Clasament și lanț de departajare

**Surse:** ROAF Art. 27 alin. 3 și alin. 5; `D-003`.

Echipele sunt ordonate descrescător după numărul total de puncte. În caz de egalitate de puncte, departajarea diferă între clasamentele intermediare și clasamentul final al sezonului regular:

### 3.1. Clasamente intermediare (pe parcursul sezonului regular)

1. **Golaveraj general** (goluri marcate minus goluri primite)
2. **Goluri marcate total**

### 3.2. Clasament final de sezon regular (inclusiv egalitate la 3+ echipe)

La egalitate de puncte între 2 sau mai multe echipe la finalul sezonului regular, se aplică următorul lanț ordonat de criterii (pentru 3+ echipe se construiește **mini-clasamentul** meciurilor directe dintre echipele aflate la egalitate, cu rezolvarea circularității `A > B > C > A` și reluarea lanțului pentru subgrupul rămas încă la egalitate):

1. **Puncte în meciurile directe**
2. **Golaveraj în meciurile directe**
3. **Goluri marcate în meciurile directe**
4. **Goluri marcate în deplasare în meciurile directe**
5. **Golaveraj general**
6. **Goluri marcate total**

---

## 4. Foaie de meci și eligibilitate

**Surse:** ROAF Art. 45, Art. 48, Art. 60, Art. 63; `D-005`.

- **Număr de jucători:** **minim 7 jucători** pentru disputarea jocului / **maxim 11 titulari** (+ rezerve înscrise pe foaia de meci).
- **Eligibilitate & blocare pe server (`D-005`):** jucătorii care au o suspendare activă pentru etapa respectivă sunt **blocați obligatoriu pe server** la depunerea foii de meci (validarea nu este exclusiv în UI).

---

## 5. Disciplină și suspendări

**Surse:** RD Art. 18, Art. 19 alin. 3, Art. 41 alin. 1–2.3, Art. 63 alin. 2; `D-005`.

### 5.1. Cumul de cartonașe galbene

- Acumularea de cartonașe galbene în aceeași competiție atrage **1 etapă de suspendare automată** la atingerea pragurilor:
  - **4** cartonașe galbene → 1 etapă
  - **7** cartonașe galbene → 1 etapă
  - **9** cartonașe galbene → 1 etapă
  - **începând cu al 10-lea cartonaș galben** → 1 etapă la **fiecare** nou cartonaș galben (`10, 11, 12, ...`).
- Pragurile sunt configurabile per sezon în datele competiției.

### 5.2. Cartonaș roșu indirect (două galbene în același meci)

- Două cartonașe galbene primite în același meci (eliminare prin roșu indirect) atrag **1 etapă de suspendare automată**.
- Cele două cartonașe galbene din acel meci **se anulează din cumul** (nu se adaugă la contorul de galbene al jucătorului).

### 5.3. Galben + roșu direct în același meci

- Dacă un jucător primește un cartonaș galben și apoi un cartonaș roșu direct în același meci, **cartonașul galben se menține în cumul**.

### 5.4. Cartonaș roșu direct

- Cartonașul roșu direct atrage o suspendare automată de **minim 1 etapă**.
- Durata totală este **configurabilă între 1 și 24 de etape** în funcție de decizia comisiei (introdusă de `arbitru / organizator` sau `admin`), cu valoare **implicită de 2 etape** pentru abatere gravă / limbaj.

### 5.5. Executarea suspendărilor

- **Doar meciurile jucate efectiv** consumă etape de suspendare, în **ordinea efectivă de disputare** (`D-005`).
- **Meciurile amânate** și **etapele libere (`bye`)** **nu** consumă etape de suspendare (`D-005`).

### 5.6. Meci întrerupt și rejucat integral

- În cazul unui meci întrerupt și rejucat integral, **cartonașele galbene acordate în meciul întrerupt se anulează** (RD Art. 41 alin. 2.2).

### 5.7. Corecții retroactive

- Conform `D-005`, atunci când o corecție de rezultat sau evenimente de meci (înregistrată cu motiv și snapshot de audit `before`/`after`) face retroactiv un jucător neeligibil într-un meci deja disputat ulterior, sistemul **nu anulează automat scorul** (nu aplică forfait / 3–0 automat), ci generează o **alertă de suspendare retroactivă** pentru revizuire manuală de către `arbitru / organizator` și `admin`.

---

## 6. Rezumat parametri impliciți de sezon (SuperLiga României)

| Parametru | Valoare implicită | Sursă |
|---|---|---|
| Echipe | `16` (motor configurabil și pentru număr impar cu `bye`) | ROAF Art. 8 lit. a, `D-003` |
| Etape (tur–retur) | `30` (15 tur + 15 retur, aceeași succesiune) | ROAF Art. 10 alin. 3 |
| Durată meci | `90` min (`2 × 45`) | ROAF Art. 21 alin. 1 |
| Punctaj (V / E / Î) | `3` / `1` / `0` | ROAF Art. 23 |
| Departajare intermediară | Golaveraj general → Goluri marcate | ROAF Art. 27 alin. 3 |
| Departajare finală (sezon regular) | Puncte directe → Golaveraj direct → Goluri marcate direct → Goluri deplasare direct → Golaveraj general → Goluri marcate total | ROAF Art. 27 alin. 3, 5 |
| Foaie de meci | Minim `7` jucători / Maxim `11` titulari (+ rezerve) | ROAF Art. 45, 48, 60, 63 |
| Praguri galbene (1 etapă suspendare) | `4`, `7`, `9`, apoi fiecare galben `>= 10` | RD Art. 41 alin. 1–2.3 |
| Roșu indirect (2 galbene / meci) | `1` etapă; cele 2 galbene se anulează din cumul | RD Art. 41 |
| Galben + roșu direct / meci | Galbenul se menține în cumul | RD Art. 41 |
| Roșu direct | Minim `1` etapă; configurabil `1–24` (implicit `2`) | RD Art. 18, 19 alin. 3, 63 alin. 2 |
| Consum suspendare | Doar meciuri jucate efectiv, în ordine efectivă (fără amânate/`bye`) | `D-005` |
| Meci întrerupt rejucat integral | Galbenele din meciul întrerupt se anulează | RD Art. 41 alin. 2.2 |
| Conflict retroactiv | Alertă revizuire manuală (fără forfait automat) | `D-005` |
