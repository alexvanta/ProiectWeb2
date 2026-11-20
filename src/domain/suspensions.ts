import type {
  CarryOverSuspensionInput,
  DisciplineEventInput,
  DisciplineFixtureInput,
  PlayerDisciplineState,
  PlayerSeasonTeam,
  RetroactiveConflictAlert,
  SeasonRules,
  SuspensionEvaluationResult,
} from "./types";

export interface EvaluateSuspensionsInput {
  fixtures: DisciplineFixtureInput[];
  events: DisciplineEventInput[];
  registrations: PlayerSeasonTeam[];
  carryOverSuspensions?: CarryOverSuspensionInput[];
  rules: SeasonRules;
}

function getOrCreatePlayerState(
  map: Map<string, PlayerDisciplineState>,
  playerId: string,
): PlayerDisciplineState {
  let state = map.get(playerId);
  if (!state) {
    state = {
      playerId,
      yellowCardsBySeason: {},
      redCardsTotal: 0,
      activeSuspensionRounds: 0,
      suspensions: [],
    };
    map.set(playerId, state);
  }
  return state;
}

function isYellowThresholdHit(count: number, rules: SeasonRules): boolean {
  if (rules.yellowCardThresholds.includes(count)) return true;
  if (count >= rules.yellowCardRepeatFrom) return true;
  return false;
}

function clampDirectRedRounds(
  committeeRounds: number | null | undefined,
  rules: SeasonRules,
): number {
  const raw = committeeRounds ?? rules.directRedDefaultRounds;
  return Math.max(rules.directRedMinRounds, Math.min(rules.directRedMaxRounds, raw));
}

function recomputeActiveRounds(state: PlayerDisciplineState): number {
  let total = 0;
  for (const s of state.suspensions) {
    total += s.remainingRounds;
  }
  state.activeSuspensionRounds = total;
  return total;
}

/**
 * Pure disciplinary & suspension engine (RD Art. 18, 19 alin. 3, 41 alin. 1–2.3, 63 alin. 2; D-005).
 *
 * - Evaluates fixtures strictly in actual play order (`playedAt ?? scheduledAt`).
 * - Only `status === "PLAYED"` and `!isBye` fixtures consume suspensions (postponed & bye never consume).
 * - Carry-over suspensions remain bound to `playerId` across seasons, including after team transfers.
 * - Yellow accumulation triggers 1-round bans at `yellowCardThresholds` (4, 7, 9) and every yellow >= `yellowCardRepeatFrom` (10+).
 * - Indirect red (SECOND_YELLOW_RED or 2x YELLOW_CARD in one match) triggers `indirectRedBanRounds` (1) and cancels both yellows from cumulative tally.
 * - Yellow + direct red in same match keeps the yellow in cumulative tally AND applies direct red ban.
 * - Annulled events (`isAnnulled: true`, RD Art. 41 alin. 2.2 for interrupted-and-replayed matches) are excluded from yellow accumulation.
 */
export function evaluateSuspensions(
  input: EvaluateSuspensionsInput,
): SuspensionEvaluationResult {
  const { fixtures, events, registrations, carryOverSuspensions = [], rules } = input;

  const players = new Map<string, PlayerDisciplineState>();
  const ineligibleByFixture: Record<string, string[]> = {};

  // Seed carry-over suspensions from prior seasons
  for (const carry of carryOverSuspensions) {
    if (!carry.carryOverToNextSeason || carry.remainingRounds <= 0) continue;
    const state = getOrCreatePlayerState(players, carry.playerId);
    state.suspensions.push({
      id: carry.id,
      playerId: carry.playerId,
      originSeasonId: carry.originSeasonId,
      originFixtureId: carry.originFixtureId ?? null,
      reason: carry.reason,
      totalRounds: carry.remainingRounds,
      remainingRounds: carry.remainingRounds,
      consumedFixtureIds: [],
      carryOverToNextSeason: true,
    });
    recomputeActiveRounds(state);
  }

  // Index player registrations per (seasonId, teamId)
  const rosterBySeasonTeam = new Map<string, string[]>();
  for (const reg of registrations) {
    const key = `${reg.seasonId}|${reg.teamId}`;
    const list = rosterBySeasonTeam.get(key) ?? [];
    if (!list.includes(reg.playerId)) {
      list.push(reg.playerId);
    }
    rosterBySeasonTeam.set(key, list);
    getOrCreatePlayerState(players, reg.playerId);
  }

  // Group events by fixtureId
  const eventsByFixture = new Map<string, DisciplineEventInput[]>();
  for (const ev of events) {
    const list = eventsByFixture.get(ev.fixtureId) ?? [];
    list.push(ev);
    eventsByFixture.set(ev.fixtureId, list);
  }

  // Sort fixtures strictly by actual play order (played fixtures first by playedAt, then scheduled)
  const orderedFixtures = [...fixtures].sort((a, b) => {
    const tA = a.playedAt ?? a.scheduledAt;
    const tB = b.playedAt ?? b.scheduledAt;
    if (tA !== tB) return tA.localeCompare(tB);
    return a.roundNumber - b.roundNumber || a.id.localeCompare(b.id);
  });

  let suspSeq = 0;

  for (const fx of orderedFixtures) {
    // Postponed, interrupted-replay, and bye rounds never consume bans or accrue active cards
    if (fx.isBye || fx.status === "POSTPONED") {
      continue;
    }

    const homeRoster = rosterBySeasonTeam.get(`${fx.seasonId}|${fx.homeTeamId}`) ?? [];
    const awayRoster = rosterBySeasonTeam.get(`${fx.seasonId}|${fx.awayTeamId}`) ?? [];
    const fixtureRoster = Array.from(new Set([...homeRoster, ...awayRoster]));

    // 1. Record who is ineligible entering this fixture
    const ineligible: string[] = [];
    for (const playerId of fixtureRoster) {
      const state = getOrCreatePlayerState(players, playerId);
      if (state.activeSuspensionRounds > 0) {
        ineligible.push(playerId);
      }
    }
    if (ineligible.length > 0) {
      ineligibleByFixture[fx.id] = ineligible;
    }

    // Only actually PLAYED fixtures consume bans and record disciplinary events
    if (fx.status !== "PLAYED") {
      continue;
    }

    const sheetSet = new Set(fx.matchSheetPlayerIds ?? []);

    // 2. Consume 1 round of the earliest active suspension for suspended players who sat out
    for (const playerId of ineligible) {
      // If the player was illegally fielded (e.g., discovered via retroactive correction),
      // do not count that illegal appearance as serving the ban.
      if (sheetSet.has(playerId)) {
        continue;
      }
      const state = getOrCreatePlayerState(players, playerId);
      const nextActive = state.suspensions.find((s) => s.remainingRounds > 0);
      if (nextActive) {
        nextActive.remainingRounds -= 1;
        nextActive.consumedFixtureIds.push(fx.id);
        recomputeActiveRounds(state);
      }
    }

    // 3. Process disciplinary events of this played fixture
    const fxEvents = eventsByFixture.get(fx.id) ?? [];
    const perPlayer = new Map<string, DisciplineEventInput[]>();
    for (const ev of fxEvents) {
      const list = perPlayer.get(ev.playerId) ?? [];
      list.push(ev);
      perPlayer.set(ev.playerId, list);
    }

    for (const [playerId, pEvents] of perPlayer.entries()) {
      const state = getOrCreatePlayerState(players, playerId);
      const activeEvents = pEvents.filter((e) => !e.isAnnulled);

      const yellowEvents = activeEvents.filter((e) => e.type === "YELLOW_CARD");
      const secondYellowEvents = activeEvents.filter((e) => e.type === "SECOND_YELLOW_RED");
      const directRedEvents = activeEvents.filter((e) => e.type === "DIRECT_RED");

      const hasIndirectRed = secondYellowEvents.length > 0 || yellowEvents.length >= 2;

      if (hasIndirectRed) {
        // RD Art. 41: two yellows in same match = 1-round automatic ban; BOTH yellows cancelled from cumulative tally
        state.redCardsTotal += 1;
        suspSeq += 1;
        state.suspensions.push({
          id: `susp-${fx.id}-${playerId}-${suspSeq}`,
          playerId,
          originSeasonId: fx.seasonId,
          originFixtureId: fx.id,
          reason: "INDIRECT_RED",
          totalRounds: rules.indirectRedBanRounds,
          remainingRounds: rules.indirectRedBanRounds,
          consumedFixtureIds: [],
          carryOverToNextSeason: true,
        });
      } else if (yellowEvents.length === 1) {
        // Single yellow (including when paired with a DIRECT_RED in the same match!) stays in cumulative tally
        const prevCount = state.yellowCardsBySeason[fx.seasonId] ?? 0;
        const nextCount = prevCount + 1;
        state.yellowCardsBySeason[fx.seasonId] = nextCount;

        if (isYellowThresholdHit(nextCount, rules)) {
          suspSeq += 1;
          state.suspensions.push({
            id: `susp-${fx.id}-${playerId}-${suspSeq}`,
            playerId,
            originSeasonId: fx.seasonId,
            originFixtureId: fx.id,
            reason: "YELLOW_ACCUMULATION",
            totalRounds: 1,
            remainingRounds: 1,
            consumedFixtureIds: [],
            carryOverToNextSeason: true,
          });
        }
      }

      for (const redEv of directRedEvents) {
        state.redCardsTotal += 1;
        const banRounds = clampDirectRedRounds(redEv.committeeBanRounds, rules);
        suspSeq += 1;
        state.suspensions.push({
          id: `susp-${fx.id}-${playerId}-${suspSeq}`,
          playerId,
          originSeasonId: fx.seasonId,
          originFixtureId: fx.id,
          reason: "DIRECT_RED",
          totalRounds: banRounds,
          remainingRounds: banRounds,
          consumedFixtureIds: [],
          carryOverToNextSeason: true,
        });
      }

      recomputeActiveRounds(state);
    }
  }

  const playersObj: Record<string, PlayerDisciplineState> = {};
  for (const [pid, st] of players.entries()) {
    playersObj[pid] = st;
  }

  return {
    players: playersObj,
    ineligibleByFixture,
  };
}

/**
 * Checks whether a player is suspended for a specific target fixture.
 */
export function isPlayerSuspendedForFixture(
  evaluation: SuspensionEvaluationResult,
  fixtureId: string,
  playerId: string,
): boolean {
  const ineligible = evaluation.ineligibleByFixture[fixtureId];
  return ineligible ? ineligible.includes(playerId) : false;
}

/**
 * Pure retroactive conflict detector (D-005).
 * After a result/event correction on an earlier fixture, compares the updated
 * suspension evaluation against all subsequent already-PLAYED fixtures that have
 * match sheets. Raises manual review alerts WITHOUT mutating any fixture score.
 */
export function detectRetroactiveConflicts(
  correctedFixtureId: string,
  fixtures: DisciplineFixtureInput[],
  afterEvaluation: SuspensionEvaluationResult,
  registrations: PlayerSeasonTeam[],
): RetroactiveConflictAlert[] {
  const correctedFixture = fixtures.find((f) => f.id === correctedFixtureId);
  if (!correctedFixture) return [];

  const correctedTime = correctedFixture.playedAt ?? correctedFixture.scheduledAt;
  const regMap = new Map<string, string>();
  for (const r of registrations) {
    regMap.set(`${r.seasonId}|${r.playerId}`, r.teamId);
  }

  const alerts: RetroactiveConflictAlert[] = [];

  for (const fx of fixtures) {
    if (fx.id === correctedFixtureId) continue;
    if (fx.status !== "PLAYED" || fx.isBye) continue;

    const fxTime = fx.playedAt ?? fx.scheduledAt;
    if (fxTime < correctedTime) continue;

    const ineligible = new Set(afterEvaluation.ineligibleByFixture[fx.id] ?? []);
    if (ineligible.size === 0) continue;

    for (const playerId of fx.matchSheetPlayerIds ?? []) {
      if (ineligible.has(playerId)) {
        const teamId =
          regMap.get(`${fx.seasonId}|${playerId}`) ?? fx.homeTeamId;
        alerts.push({
          fixtureId: fx.id,
          roundNumber: fx.roundNumber,
          playerId,
          teamId,
          description: `Corecția meciului ${correctedFixtureId} face jucătorul ${playerId} retroactiv suspendat pentru etapa ${fx.roundNumber} (meci deja disputat). Necesită revizuire manuală — scorul nu a fost modificat automat.`,
        });
      }
    }
  }

  return alerts;
}
