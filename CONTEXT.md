# CONTEXT — p19-liga-amatori vocabulary

<!-- graffino-agentic:begin v1 -->
> The approved terms for this project. Use each term exactly as defined, in the part
> of speech given. Never swap in a synonym; never use a word on an _Avoid_ line.
<!-- graffino-agentic:end -->

**Season** (noun; UI: *Sezon*) — One regular-season competition edition of SuperLiga României (16 teams, 30 home-and-away rounds per ROAF FRF, with configurable rules in `src/domain/`).
_Avoid_: championship, year, edition, tournament

**Round** (noun; UI: *Etapă*) — One scheduled round-robin matchday in a season (1–30 in SuperLiga României regular season); suspensions count down per actually played round of a team.
_Avoid_: week, gameweek, stage

**Fixture** (noun; UI: *Meci*) — A scheduled or played 90-minute (2×45) football game between a home team and an away team on a pitch at a date and time.
_Avoid_: game, bout, event

**Bye** (noun; UI: *Etapă liberă*) — An unassigned round slot when a season is configured with an odd number of teams (supported by `src/domain/` per D-003); it does not count as a played round.
_Avoid_: rest day, free match, skip

**Pitch** (noun; UI: *Teren*) — A physical playing venue with configured available days and time slots.
_Avoid_: field, stadium, court, venue

**Match sheet** (noun; UI: *Foaie de meci*) — The official squad list (min 7 players, max 11 starters + substitutes per ROAF) submitted by a captain for a fixture; the server rejects suspended players.
_Avoid_: lineup card, team sheet, squad sheet

**Match event** (noun; UI: *Eveniment de meci*) — A recorded goal, scorer, or card (yellow, indirect red, or direct red) tied to a fixture and player.
_Avoid_: incident, log, stat entry

**Result correction** (noun; UI: *Corecție rezultat*) — An audited edit to a fixture's score or events storing reason, actor, timestamp, and before/after snapshot.
_Avoid_: override, rollback, silent edit

**Standings** (noun; UI: *Clasament*) — The ordered team table computed purely from played fixtures and the season's configured tie-breaker chain (intermediate vs. final regular-season rules per ROAF Art. 27).
_Avoid_: leaderboard, rankings, table

**Tie-breaker chain** (noun; UI: *Lanț de departajare*) — An ordered, configurable list of criteria ranking teams equal on points (in SuperLiga României final regular-season standings: head-to-head points, goal difference, goals scored, away goals, then overall goal difference and goals scored, including 3+ team mini-tables).
_Avoid_: sorting rules, tie rules

**Suspension** (noun; UI: *Suspendare*) — A ban (from yellow-card accumulation at 4/7/9/10+, indirect red, or 1–24 round direct-red decision per RD FRF) blocking a player from match sheets for a set number of their team's next actually played rounds.
_Avoid_: penalty, timeout, banishment

**Retroactive suspension alert** (noun; UI: *Alertă suspendare retroactivă*) — A flag raised for the referee/organizer and admin when a result correction shows a player was ineligible in an already-played later fixture.
_Avoid_: auto-forfeit, automatic 3-0, penalty error

**Transfer** (noun; UI: *Transfer*) — A player's move between teams across seasons while preserving past-season history.
_Avoid_: reassignment, swap, migration

**Referee / Organizer** (noun; UI: *Arbitru / Organizator*) — A single authenticated role that enters/corrects results, reschedules fixtures, sets committee red-card bans, and reviews retroactive suspension alerts.
_Avoid_: official, moderator, match manager

**Reschedule notification** (noun; UI: *Notificare reprogramare*) — An in-app PostgreSQL notification sent to affected players and captains when a fixture's date, time, or pitch changes.
_Avoid_: alert, message, email
