import { describe, expect, it } from "vitest";
import { computeStandings } from "@/domain/standings";
import {
  SUPERLIGA_DEFAULT_RULES,
  type PlayedFixtureInput,
  type SeasonRules,
  type StandingsTeamInput,
} from "@/domain/types";

function fx(
  id: string,
  roundNumber: number,
  homeTeamId: string,
  awayTeamId: string,
  homeGoals: number,
  awayGoals: number,
): PlayedFixtureInput {
  return {
    id,
    roundNumber,
    homeTeamId,
    awayTeamId,
    homeGoals,
    awayGoals,
    status: "PLAYED",
    playedAt: `2026-08-${String(roundNumber).padStart(2, "0")}T18:00:00.000Z`,
  };
}

describe("computeStandings", () => {
  it("uses overall GD then GF in intermediate mode (ROAF Art. 27 alin. 3), ignoring H2H", () => {
    const teams: StandingsTeamInput[] = [
      { id: "A", name: "Echipa A" },
      { id: "B", name: "Echipa B" },
      { id: "C", name: "Echipa C" },
    ];
    // A beat B 1-0 (H2H favors A), but B beat C 5-0 while A lost to C 0-1 (B has better overall GD)
    const fixtures = [
      fx("1", 1, "A", "B", 1, 0),
      fx("2", 2, "B", "C", 5, 0),
      fx("3", 3, "C", "A", 1, 0),
    ];

    const intermediate = computeStandings(teams, fixtures, SUPERLIGA_DEFAULT_RULES, "intermediate");
    expect(intermediate.rows.map((r) => r.teamId)).toEqual(["B", "A", "C"]);
  });

  it("respects configurable tie-breaker chain order (data-driven D-003)", () => {
    const teams: StandingsTeamInput[] = [
      { id: "A", name: "Echipa A" },
      { id: "B", name: "Echipa B" },
    ];
    // Both 3 pts: A won 2-1 at home, B won 4-3 at home -> equal H2H pts (3), equal H2H GD (0),
    // A has 5 H2H GF (3 away), B has 5 H2H GF (1 away) -> H2H_AWAY_GF favors A.
    // Let's compare custom chain starting with OVERALL_GF vs H2H_AWAY_GF
    const fixtures = [
      fx("1", 1, "A", "B", 2, 1),
      fx("2", 2, "B", "A", 4, 3),
    ];

    const customRules: SeasonRules = {
      ...SUPERLIGA_DEFAULT_RULES,
      tieBreakerOrder: ["H2H_AWAY_GF"],
    };
    const res = computeStandings(teams, fixtures, customRules, "final");
    expect(res.rows.map((r) => r.teamId)).toEqual(["A", "B"]);
  });

  // ---- 6 dedicated 3+ team tie-breaker tests ----

  it("[3-way #1] resolves 3-team tie by head-to-head mini-table points (H2H_POINTS)", () => {
    const teams: StandingsTeamInput[] = [
      { id: "A", name: "Alpha" },
      { id: "B", name: "Beta" },
      { id: "C", name: "Gamma" },
      { id: "D", name: "Delta" },
    ];
    // A, B, C all finish with 6 pts overall.
    // In H2H among {A, B, C}: A beats B (1-0) and C (1-0) -> 6 H2H pts;
    // B beats C (1-0) -> 3 H2H pts; C loses both -> 0 H2H pts.
    // Overall points equalized via matches against D (C beats D twice with huge GD).
    const fixtures = [
      fx("1", 1, "A", "B", 1, 0),
      fx("2", 2, "A", "C", 1, 0),
      fx("3", 3, "B", "C", 1, 0),
      fx("4", 4, "B", "D", 1, 0),
      fx("5", 5, "C", "D", 4, 0),
      fx("6", 6, "D", "C", 0, 4),
    ];

    const res = computeStandings(teams, fixtures, SUPERLIGA_DEFAULT_RULES, "final");
    expect(res.rows.slice(0, 3).map((r) => r.teamId)).toEqual(["A", "B", "C"]);
    expect(res.tieBreakGroups[0]?.resolvedBy).toBe("H2H_POINTS");
  });

  it("[3-way #2] resolves circular tie A > B > C > A (equal H2H points) via H2H_GD", () => {
    const teams: StandingsTeamInput[] = [
      { id: "A", name: "Alpha" },
      { id: "B", name: "Beta" },
      { id: "C", name: "Gamma" },
    ];
    // Circular A > B > C > A: each has 3 pts in H2H & overall
    // A beats B 3-0 (+3), B beats C 2-0 (+2), C beats A 1-0 (+1)
    // H2H GD: A = +2, B = -1, C = -1 -> wait, let's make all 3 distinct:
    // A beats B 4-0, B beats C 2-0, C beats A 1-0 -> GD: A = +3, B = -2, C = -1 => A > C > B
    const fixtures = [
      fx("1", 1, "A", "B", 4, 0),
      fx("2", 2, "B", "C", 2, 0),
      fx("3", 3, "C", "A", 1, 0),
    ];

    const res = computeStandings(teams, fixtures, SUPERLIGA_DEFAULT_RULES, "final");
    expect(res.rows.map((r) => r.teamId)).toEqual(["A", "C", "B"]);
    expect(res.tieBreakGroups[0]?.resolvedBy).toBe("H2H_GD");
  });

  it("[3-way #3] resolves circular tie A > B > C > A with equal H2H points & GD via H2H_GF", () => {
    const teams: StandingsTeamInput[] = [
      { id: "A", name: "Alpha" },
      { id: "B", name: "Beta" },
      { id: "C", name: "Gamma" },
    ];
    // Circular A > B > C > A, every match margin = 1 so all have H2H pts=3, H2H GD=0:
    // A beats B 3-2, B beats C 2-1, C beats A 1-0
    // H2H GF: B = 2+2 = 4, A = 3+0 = 3, C = 1+1 = 2 => B > A > C
    const fixtures = [
      fx("1", 1, "A", "B", 3, 2),
      fx("2", 2, "B", "C", 2, 1),
      fx("3", 3, "C", "A", 1, 0),
    ];

    const res = computeStandings(teams, fixtures, SUPERLIGA_DEFAULT_RULES, "final");
    expect(res.rows.map((r) => r.teamId)).toEqual(["B", "A", "C"]);
    expect(res.tieBreakGroups[0]?.resolvedBy).toBe("H2H_GF");
  });

  it("[3-way #4] resolves 3-team tie with equal H2H pts, GD, and GF via H2H_AWAY_GF (ROAF Art. 27 alin. 5)", () => {
    const teams: StandingsTeamInput[] = [
      { id: "A", name: "Alpha" },
      { id: "B", name: "Beta" },
      { id: "C", name: "Gamma" },
    ];
    // Home-and-away draws so all 3 have H2H pts=4, H2H GD=0, H2H GF=4, but different H2H away goals:
    // A-B: 0-0, B-A: 2-2 (A away=2, B away=0)
    // A-C: 1-1, C-A: 1-1 (A away=1, C away=1)
    // B-C: 2-2, C-B: 0-0 (B away=0, C away=2)
    // Totals: GF: A=4, B=4, C=4; Away GF: A=3, C=3? Let's make away GF strictly distinct (3, 2, 1):
    // A-B 1-1 (B away 1), B-A 2-2 (A away 2)
    // B-C 1-1 (C away 1), C-B 0-0 (B away 0)
    // C-A 1-1 (A away 1), A-C 0-0 (C away 0)
    // Wait check GF: A=4, B=4, C=2 -> adjust C-A / A-C:
    // Use 3 matches where each team plays 1H + 1A, all draws, GF all = 3:
    // A vs B: 0-0 (A:0, B:0a) -> nope. Try:
    // A vs B: 1-1 (B away=1), B vs C: 2-2 (C away=2), C vs A: 3-3 (A away=3) -> GF: A=4, B=3, C=5 (not equal).
    // For equal GF & GD & pts across 3 teams in 6 games (home & away):
    // A-B 0-0, B-A 2-2 (A: 2 GF / 2 away, B: 2 GF / 0 away)
    // A-C 2-2, C-A 0-0 (A: 2 GF / 0 away, C: 2 GF / 2 away) -> A total 4 GF (2 away)
    // B-C 1-1, C-B 1-1 (B: 2 GF / 1 away, C: 2 GF / 1 away) -> B total 4 GF (1 away), C total 4 GF (3 away)
    // Result: ALL 3 have pts=4, GD=0, GF=4; H2H_AWAY_GF: C=3, A=2, B=1 => C > A > B!
    const fixtures = [
      fx("1", 1, "A", "B", 0, 0),
      fx("2", 2, "B", "A", 2, 2),
      fx("3", 3, "A", "C", 2, 2),
      fx("4", 4, "C", "A", 0, 0),
      fx("5", 5, "B", "C", 1, 1),
      fx("6", 6, "C", "B", 1, 1),
    ];

    const res = computeStandings(teams, fixtures, SUPERLIGA_DEFAULT_RULES, "final");
    expect(res.rows.map((r) => r.teamId)).toEqual(["C", "A", "B"]);
    expect(res.tieBreakGroups[0]?.resolvedBy).toBe("H2H_AWAY_GF");
  });

  it("[3-way #5] restarts tie-breaker chain on remaining 2-team subgroup after partial 3-team split", () => {
    const teams: StandingsTeamInput[] = [
      { id: "A", name: "Alpha" },
      { id: "B", name: "Beta" },
      { id: "C", name: "Gamma" },
      { id: "D", name: "Delta" },
    ];
    // A, B, C all finish with 7 pts overall:
    // H2H among {A, B, C}:
    // A beats B 2-0, A beats C 2-0 -> A has 6 H2H pts (breaks away as #1!)
    // B vs C: C beats B 1-0 -> in {A,B,C} mini-table: C has 3 pts, B has 0 pts (already split).
    // Let's make B and C TIED in {A,B,C} mini-table on H2H_POINTS, then split when restarting on {B,C}!
    // Suppose A beats B 3-0, A draws C 0-0 (wait: then A=4, C=1, B=0).
    // Better: A beats B 1-0, A beats C 1-0 (A=6); B beats C 2-1, C beats B 1-0 ->
    // In {A,B,C}: A=6 pts, B=3 pts (GD 0, GF 2), C=3 pts (GD 0, GF 2).
    // Restart chain on {B, C} -> H2H_POINTS(3 vs 3), H2H_GD(0 vs 0), H2H_GF(2 vs 2), H2H_AWAY_GF: C scored 1 away at B, B scored 0 away at C => C > B!
    // Equalize overall points to 6 each via D: B beats D 5-0 (better overall GD than C), C beats D 1-0.
    const fixtures = [
      fx("1", 1, "A", "B", 1, 0),
      fx("2", 2, "A", "C", 1, 0),
      fx("3", 3, "B", "C", 2, 1),
      fx("4", 4, "C", "B", 1, 0),
      fx("5", 5, "B", "D", 5, 0),
      fx("6", 6, "C", "D", 1, 0),
    ];

    const res = computeStandings(teams, fixtures, SUPERLIGA_DEFAULT_RULES, "final");
    // Even though B has much better overall GD (+5 vs +1), restarting H2H on {B,C} puts C ahead on H2H_AWAY_GF!
    expect(res.rows.slice(0, 3).map((r) => r.teamId)).toEqual(["A", "C", "B"]);
  });

  it("[3-way #6] falls back to OVERALL_GD then OVERALL_GF when 3-way H2H mini-table is completely identical", () => {
    const teams: StandingsTeamInput[] = [
      { id: "A", name: "Alpha" },
      { id: "B", name: "Beta" },
      { id: "C", name: "Gamma" },
      { id: "D", name: "Delta" },
    ];
    // All home-and-away H2H matches among {A, B, C} end 1-1 (completely identical mini-table including away goals)
    // All 3 beat D once: C wins 4-0 (+4), A wins 3-1 (+2, 3 GF), B wins 2-0 (+2, 2 GF)
    const fixtures = [
      fx("1", 1, "A", "B", 1, 1),
      fx("2", 2, "B", "A", 1, 1),
      fx("3", 3, "B", "C", 1, 1),
      fx("4", 4, "C", "B", 1, 1),
      fx("5", 5, "C", "A", 1, 1),
      fx("6", 6, "A", "C", 1, 1),
      fx("7", 7, "C", "D", 4, 0),
      fx("8", 8, "A", "D", 3, 1),
      fx("9", 9, "B", "D", 2, 0),
    ];

    const res = computeStandings(teams, fixtures, SUPERLIGA_DEFAULT_RULES, "final");
    expect(res.rows.slice(0, 3).map((r) => r.teamId)).toEqual(["C", "A", "B"]);
    expect(res.tieBreakGroups[0]?.resolvedBy).toBe("OVERALL_GD");
  });

  it("tracks lastFiveForm in chronological order (max 5) with opponent metadata", () => {
    const teams: StandingsTeamInput[] = [
      { id: "A", name: "Alpha" },
      { id: "B", name: "Beta" },
    ];
    const fixtures = [
      fx("1", 1, "A", "B", 1, 0), // W
      fx("2", 2, "B", "A", 1, 1), // D
      fx("3", 3, "A", "B", 0, 2), // L
      fx("4", 4, "B", "A", 0, 1), // W
      fx("5", 5, "A", "B", 2, 2), // D
      fx("6", 6, "B", "A", 3, 1), // L
    ];

    const res = computeStandings(teams, fixtures, SUPERLIGA_DEFAULT_RULES, "final");
    const rowA = res.rows.find((r) => r.teamId === "A")!;
    expect(rowA.lastFiveForm.map((f) => f.result)).toEqual(["D", "L", "W", "D", "L"]);
    expect(rowA.lastFiveForm[4]).toMatchObject({
      roundNumber: 6,
      opponentId: "B",
      goalsFor: 1,
      goalsAgainst: 3,
      isHome: false,
    });
  });
});
