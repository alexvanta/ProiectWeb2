import type {
  FormEntry,
  PlayedFixtureInput,
  SeasonRules,
  StandingsMode,
  StandingsResult,
  StandingsRow,
  StandingsTeamInput,
  TieBreakGroupSummary,
  TieBreakerCriterion,
} from "./types";

interface TeamAccumulator {
  teamId: string;
  teamName: string;
  shortName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: FormEntry[];
}

interface MiniStats {
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  awayGoalsFor: number;
}

function computeMiniTable(
  teamIds: string[],
  playedFixtures: PlayedFixtureInput[],
  rules: SeasonRules,
): Map<string, MiniStats> {
  const idSet = new Set(teamIds);
  const stats = new Map<string, MiniStats>();

  for (const id of teamIds) {
    stats.set(id, {
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      awayGoalsFor: 0,
    });
  }

  for (const fx of playedFixtures) {
    if (!idSet.has(fx.homeTeamId) || !idSet.has(fx.awayTeamId)) continue;
    if (fx.homeGoals === null || fx.awayGoals === null) continue;

    const home = stats.get(fx.homeTeamId)!;
    const away = stats.get(fx.awayTeamId)!;

    home.goalsFor += fx.homeGoals;
    home.goalsAgainst += fx.awayGoals;
    away.goalsFor += fx.awayGoals;
    away.goalsAgainst += fx.homeGoals;
    away.awayGoalsFor += fx.awayGoals;

    if (fx.homeGoals > fx.awayGoals) {
      home.points += rules.pointsWin;
      away.points += rules.pointsLoss;
    } else if (fx.homeGoals < fx.awayGoals) {
      away.points += rules.pointsWin;
      home.points += rules.pointsLoss;
    } else {
      home.points += rules.pointsDraw;
      away.points += rules.pointsDraw;
    }
  }

  for (const st of stats.values()) {
    st.goalDifference = st.goalsFor - st.goalsAgainst;
  }

  return stats;
}

function getCriterionValue(
  acc: TeamAccumulator,
  criterion: TieBreakerCriterion,
  mini: Map<string, MiniStats>,
): number {
  const h2h = mini.get(acc.teamId);
  switch (criterion) {
    case "H2H_POINTS":
      return h2h?.points ?? 0;
    case "H2H_GD":
      return h2h?.goalDifference ?? 0;
    case "H2H_GF":
      return h2h?.goalsFor ?? 0;
    case "H2H_AWAY_GF":
      return h2h?.awayGoalsFor ?? 0;
    case "OVERALL_GD":
      return acc.goalsFor - acc.goalsAgainst;
    case "OVERALL_GF":
      return acc.goalsFor;
  }
}

interface RankedItem {
  acc: TeamAccumulator;
  tieBreakGroupId: string | null;
  tieBreakCriterion: TieBreakerCriterion | null;
}

/**
 * Recursively ranks a tied group of teams using the configured ordered
 * tie-breaker chain (ROAF Art. 27 alin. 3 & 5).
 *
 * - For 3+ tied teams, builds a head-to-head mini-table strictly among the
 *   current tied subgroup.
 * - When a criterion partially splits a subgroup (e.g. 3 -> [1, 2]), restarts
 *   the full tie-breaker chain on each remaining tied subgroup.
 * - Handles circular ties (A > B > C > A) by advancing cleanly to the next
 *   criterion when all teams in the subgroup tie on the current criterion.
 */
function resolveTiedGroup(
  group: TeamAccumulator[],
  playedFixtures: PlayedFixtureInput[],
  rules: SeasonRules,
  chain: TieBreakerCriterion[],
  startCriterionIndex: number,
  topGroupId: string | null,
  recordSummary: (summary: TieBreakGroupSummary) => void,
  isTopLevelTie: boolean,
): RankedItem[] {
  if (group.length <= 1) {
    const single = group[0];
    return single
      ? [{ acc: single, tieBreakGroupId: topGroupId, tieBreakCriterion: null }]
      : [];
  }

  const teamIds = group.map((t) => t.teamId);
  const mini = computeMiniTable(teamIds, playedFixtures, rules);

  for (let idx = startCriterionIndex; idx < chain.length; idx++) {
    const criterion = chain[idx]!;
    const buckets = new Map<number, TeamAccumulator[]>();

    for (const acc of group) {
      const val = getCriterionValue(acc, criterion, mini);
      const list = buckets.get(val) ?? [];
      list.push(acc);
      buckets.set(val, list);
    }

    // Criterion did not distinguish any team in this subgroup -> advance to next criterion
    if (buckets.size === 1) {
      continue;
    }

    if (isTopLevelTie && topGroupId) {
      recordSummary({
        groupId: topGroupId,
        points: group[0]!.points,
        teamIds,
        resolvedBy: criterion,
        miniTable: group
          .map((t) => {
            const m = mini.get(t.teamId)!;
            return {
              teamId: t.teamId,
              teamName: t.teamName,
              points: m.points,
              goalDifference: m.goalDifference,
              goalsFor: m.goalsFor,
              awayGoalsFor: m.awayGoalsFor,
            };
          })
          .sort(
            (a, b) =>
              b.points - a.points ||
              b.goalDifference - a.goalDifference ||
              b.goalsFor - a.goalsFor ||
              b.awayGoalsFor - a.awayGoalsFor ||
              a.teamName.localeCompare(b.teamName, "ro"),
          ),
      });
    }

    const sortedValues = Array.from(buckets.keys()).sort((a, b) => b - a);
    const result: RankedItem[] = [];

    for (const val of sortedValues) {
      const sub = buckets.get(val)!;
      if (sub.length === 1) {
        result.push({
          acc: sub[0]!,
          tieBreakGroupId: topGroupId,
          tieBreakCriterion: criterion,
        });
      } else {
        // Partial split: restart tie-breaker chain from index 0 on the smaller subgroup
        const subRanked = resolveTiedGroup(
          sub,
          playedFixtures,
          rules,
          chain,
          0,
          topGroupId,
          recordSummary,
          false,
        );
        result.push(...subRanked);
      }
    }

    return result;
  }

  // All configured criteria exhausted -> deterministic alphabetical fallback
  const fallbackSorted = [...group].sort((a, b) =>
    a.teamName.localeCompare(b.teamName, "ro"),
  );

  if (isTopLevelTie && topGroupId) {
    recordSummary({
      groupId: topGroupId,
      points: group[0]!.points,
      teamIds,
      resolvedBy: "ALPHABETICAL",
      miniTable: fallbackSorted.map((t) => {
        const m = mini.get(t.teamId)!;
        return {
          teamId: t.teamId,
          teamName: t.teamName,
          points: m.points,
          goalDifference: m.goalDifference,
          goalsFor: m.goalsFor,
          awayGoalsFor: m.awayGoalsFor,
        };
      }),
    });
  }

  return fallbackSorted.map((acc) => ({
    acc,
    tieBreakGroupId: topGroupId,
    tieBreakCriterion: null,
  }));
}

/**
 * Pure standings computation function (D-003).
 * Computes team standings, last-5 form entries, and tie-break mini-table summaries.
 */
export function computeStandings(
  teams: StandingsTeamInput[],
  fixtures: PlayedFixtureInput[],
  rules: SeasonRules,
  mode: StandingsMode = "final",
): StandingsResult {
  const accumulators = new Map<string, TeamAccumulator>();
  for (const team of teams) {
    accumulators.set(team.id, {
      teamId: team.id,
      teamName: team.name,
      shortName: team.shortName ?? team.name.slice(0, 3).toUpperCase(),
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
      form: [],
    });
  }

  const playedFixtures = fixtures
    .filter(
      (f) =>
        f.status === "PLAYED" &&
        !f.isBye &&
        f.homeGoals !== null &&
        f.awayGoals !== null &&
        accumulators.has(f.homeTeamId) &&
        accumulators.has(f.awayTeamId),
    )
    .sort((a, b) => {
      const tA = a.playedAt ?? a.scheduledAt ?? "";
      const tB = b.playedAt ?? b.scheduledAt ?? "";
      if (tA !== tB) return tA.localeCompare(tB);
      return a.roundNumber - b.roundNumber || a.id.localeCompare(b.id);
    });

  for (const fx of playedFixtures) {
    const home = accumulators.get(fx.homeTeamId)!;
    const away = accumulators.get(fx.awayTeamId)!;
    const hg = fx.homeGoals!;
    const ag = fx.awayGoals!;

    home.played += 1;
    away.played += 1;
    home.goalsFor += hg;
    home.goalsAgainst += ag;
    away.goalsFor += ag;
    away.goalsAgainst += hg;

    let homeRes: "W" | "D" | "L";
    let awayRes: "W" | "D" | "L";

    if (hg > ag) {
      home.won += 1;
      home.points += rules.pointsWin;
      away.lost += 1;
      away.points += rules.pointsLoss;
      homeRes = "W";
      awayRes = "L";
    } else if (hg < ag) {
      away.won += 1;
      away.points += rules.pointsWin;
      home.lost += 1;
      home.points += rules.pointsLoss;
      homeRes = "L";
      awayRes = "W";
    } else {
      home.drawn += 1;
      home.points += rules.pointsDraw;
      away.drawn += 1;
      away.points += rules.pointsDraw;
      homeRes = "D";
      awayRes = "D";
    }

    const matchDate = fx.playedAt ?? fx.scheduledAt ?? null;

    home.form.push({
      fixtureId: fx.id,
      roundNumber: fx.roundNumber,
      result: homeRes,
      opponentId: away.teamId,
      opponentName: away.teamName,
      goalsFor: hg,
      goalsAgainst: ag,
      isHome: true,
      date: matchDate,
    });

    away.form.push({
      fixtureId: fx.id,
      roundNumber: fx.roundNumber,
      result: awayRes,
      opponentId: home.teamId,
      opponentName: home.teamName,
      goalsFor: ag,
      goalsAgainst: hg,
      isHome: false,
      date: matchDate,
    });
  }

  // Group teams by total points descending
  const pointsBuckets = new Map<number, TeamAccumulator[]>();
  for (const acc of accumulators.values()) {
    const list = pointsBuckets.get(acc.points) ?? [];
    list.push(acc);
    pointsBuckets.set(acc.points, list);
  }

  const sortedPoints = Array.from(pointsBuckets.keys()).sort((a, b) => b - a);
  const chain =
    mode === "intermediate" ? rules.intermediateTieBreakerOrder : rules.tieBreakerOrder;

  const tieBreakGroups: TieBreakGroupSummary[] = [];
  const rankedItems: RankedItem[] = [];
  let tieCounter = 0;

  for (const pts of sortedPoints) {
    const group = pointsBuckets.get(pts)!;
    if (group.length === 1) {
      rankedItems.push({
        acc: group[0]!,
        tieBreakGroupId: null,
        tieBreakCriterion: null,
      });
    } else {
      tieCounter += 1;
      const groupId = group.length >= 3 ? `D3-${tieCounter}` : `TB-${tieCounter}`;
      const resolved = resolveTiedGroup(
        group,
        playedFixtures,
        rules,
        chain,
        0,
        groupId,
        (summary) => tieBreakGroups.push(summary),
        true,
      );
      rankedItems.push(...resolved);
    }
  }

  const rows: StandingsRow[] = rankedItems.map((item, idx) => ({
    position: idx + 1,
    teamId: item.acc.teamId,
    teamName: item.acc.teamName,
    shortName: item.acc.shortName,
    played: item.acc.played,
    won: item.acc.won,
    drawn: item.acc.drawn,
    lost: item.acc.lost,
    goalsFor: item.acc.goalsFor,
    goalsAgainst: item.acc.goalsAgainst,
    goalDifference: item.acc.goalsFor - item.acc.goalsAgainst,
    points: item.acc.points,
    lastFiveForm: item.acc.form.slice(-5),
    tieBreakGroupId: item.tieBreakGroupId,
    tieBreakCriterion: item.tieBreakCriterion,
  }));

  return {
    mode,
    rows,
    tieBreakGroups,
  };
}
