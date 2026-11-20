import { describe, expect, it } from "vitest";
import {
  detectRetroactiveConflicts,
  evaluateSuspensions,
  isPlayerSuspendedForFixture,
} from "@/domain/suspensions";
import {
  SUPERLIGA_DEFAULT_RULES,
  type DisciplineEventInput,
  type DisciplineFixtureInput,
  type PlayerSeasonTeam,
} from "@/domain/types";

function makeFixture(
  id: string,
  seasonId: string,
  roundNumber: number,
  homeTeamId: string,
  awayTeamId: string,
  status: DisciplineFixtureInput["status"],
  isoDate: string,
  extra?: Partial<DisciplineFixtureInput>,
): DisciplineFixtureInput {
  return {
    id,
    seasonId,
    roundNumber,
    homeTeamId,
    awayTeamId,
    status,
    scheduledAt: isoDate,
    playedAt: status === "PLAYED" ? isoDate : null,
    ...extra,
  };
}

describe("evaluateSuspensions & detectRetroactiveConflicts", () => {
  it("triggers 1-round automatic suspensions at 4, 7, 9 yellows and every yellow >= 10 (RD Art. 41)", () => {
    const registrations: PlayerSeasonTeam[] = [
      { playerId: "p1", seasonId: "s1", teamId: "t1" },
    ];
    const fixtures: DisciplineFixtureInput[] = [];
    const events: DisciplineEventInput[] = [];

    // 15 rounds; p1 gets a yellow in rounds 1,2,3,4 (banned R5), 6,7,8 (7th -> banned R9),
    // 10,11 (9th -> banned R12), 13 (10th -> banned R14), 15 (11th -> active 1 round left)
    const yellowRounds = new Set([1, 2, 3, 4, 6, 7, 8, 10, 11, 13, 15]);
    for (let r = 1; r <= 15; r++) {
      const fId = `f-${r}`;
      fixtures.push(
        makeFixture(
          fId,
          "s1",
          r,
          "t1",
          "t2",
          "PLAYED",
          `2026-08-${String(r).padStart(2, "0")}T18:00:00.000Z`,
        ),
      );
      if (yellowRounds.has(r)) {
        events.push({
          id: `ev-${r}`,
          fixtureId: fId,
          playerId: "p1",
          teamId: "t1",
          type: "YELLOW_CARD",
          minute: 30,
        });
      }
    }

    const res = evaluateSuspensions({
      fixtures,
      events,
      registrations,
      rules: SUPERLIGA_DEFAULT_RULES,
    });

    expect(isPlayerSuspendedForFixture(res, "f-4", "p1")).toBe(false);
    expect(isPlayerSuspendedForFixture(res, "f-5", "p1")).toBe(true); // 4th yellow
    expect(isPlayerSuspendedForFixture(res, "f-6", "p1")).toBe(false);
    expect(isPlayerSuspendedForFixture(res, "f-9", "p1")).toBe(true); // 7th yellow
    expect(isPlayerSuspendedForFixture(res, "f-12", "p1")).toBe(true); // 9th yellow
    expect(isPlayerSuspendedForFixture(res, "f-14", "p1")).toBe(true); // 10th yellow
    expect(res.players["p1"]?.yellowCardsBySeason["s1"]).toBe(11);
    expect(res.players["p1"]?.activeSuspensionRounds).toBe(1); // 11th yellow pending
  });

  it("cancels both yellows from cumulative tally on indirect red (2 yellows in same match)", () => {
    const registrations: PlayerSeasonTeam[] = [
      { playerId: "p1", seasonId: "s1", teamId: "t1" },
    ];
    const fixtures = [
      makeFixture("f1", "s1", 1, "t1", "t2", "PLAYED", "2026-08-01T18:00:00.000Z"),
      makeFixture("f2", "s1", 2, "t1", "t2", "PLAYED", "2026-08-08T18:00:00.000Z"),
      makeFixture("f3", "s1", 3, "t1", "t2", "PLAYED", "2026-08-15T18:00:00.000Z"),
      makeFixture("f4", "s1", 4, "t1", "t2", "PLAYED", "2026-08-22T18:00:00.000Z"),
      makeFixture("f5", "s1", 5, "t1", "t2", "PLAYED", "2026-08-29T18:00:00.000Z"),
      makeFixture("f6", "s1", 6, "t1", "t2", "SCHEDULED", "2026-09-05T18:00:00.000Z"),
    ];
    // 3 yellows in R1..R3, then 2 yellows (indirect red) in R4 -> 1-round ban in R5, yellow tally stays 3!
    const events: DisciplineEventInput[] = [
      { id: "e1", fixtureId: "f1", playerId: "p1", teamId: "t1", type: "YELLOW_CARD", minute: 10 },
      { id: "e2", fixtureId: "f2", playerId: "p1", teamId: "t1", type: "YELLOW_CARD", minute: 20 },
      { id: "e3", fixtureId: "f3", playerId: "p1", teamId: "t1", type: "YELLOW_CARD", minute: 30 },
      { id: "e4a", fixtureId: "f4", playerId: "p1", teamId: "t1", type: "YELLOW_CARD", minute: 40 },
      { id: "e4b", fixtureId: "f4", playerId: "p1", teamId: "t1", type: "SECOND_YELLOW_RED", minute: 70 },
    ];

    const res = evaluateSuspensions({
      fixtures,
      events,
      registrations,
      rules: SUPERLIGA_DEFAULT_RULES,
    });

    expect(res.players["p1"]?.yellowCardsBySeason["s1"]).toBe(3); // NOT 4 or 5
    expect(isPlayerSuspendedForFixture(res, "f5", "p1")).toBe(true); // 1-round indirect red served
    expect(isPlayerSuspendedForFixture(res, "f6", "p1")).toBe(false); // eligible again
  });

  it("keeps the yellow card in cumulative tally when paired with a direct red in the same match, and supports 1-24 committee rounds", () => {
    const registrations: PlayerSeasonTeam[] = [
      { playerId: "p1", seasonId: "s1", teamId: "t1" },
    ];
    const fixtures = [
      makeFixture("f1", "s1", 1, "t1", "t2", "PLAYED", "2026-08-01T18:00:00.000Z"),
      makeFixture("f2", "s1", 2, "t1", "t2", "PLAYED", "2026-08-08T18:00:00.000Z"),
      makeFixture("f3", "s1", 3, "t1", "t2", "PLAYED", "2026-08-15T18:00:00.000Z"),
      makeFixture("f4", "s1", 4, "t1", "t2", "PLAYED", "2026-08-22T18:00:00.000Z"),
      makeFixture("f5", "s1", 5, "t1", "t2", "PLAYED", "2026-08-29T18:00:00.000Z"),
      makeFixture("f6", "s1", 6, "t1", "t2", "PLAYED", "2026-09-05T18:00:00.000Z"),
      makeFixture("f7", "s1", 7, "t1", "t2", "PLAYED", "2026-09-12T18:00:00.000Z"),
      makeFixture("f8", "s1", 8, "t1", "t2", "SCHEDULED", "2026-09-19T18:00:00.000Z"),
    ];
    // 3 prior yellows + in R4 gets 1 yellow (hits 4th -> +1 round) + 1 direct red (committee 3 rounds) = 4 rounds total (R5, R6, R7, R8)
    const events: DisciplineEventInput[] = [
      { id: "e1", fixtureId: "f1", playerId: "p1", teamId: "t1", type: "YELLOW_CARD", minute: 10 },
      { id: "e2", fixtureId: "f2", playerId: "p1", teamId: "t1", type: "YELLOW_CARD", minute: 20 },
      { id: "e3", fixtureId: "f3", playerId: "p1", teamId: "t1", type: "YELLOW_CARD", minute: 30 },
      { id: "e4y", fixtureId: "f4", playerId: "p1", teamId: "t1", type: "YELLOW_CARD", minute: 40 },
      {
        id: "e4r",
        fixtureId: "f4",
        playerId: "p1",
        teamId: "t1",
        type: "DIRECT_RED",
        minute: 60,
        committeeBanRounds: 3,
      },
    ];

    const res = evaluateSuspensions({
      fixtures,
      events,
      registrations,
      rules: SUPERLIGA_DEFAULT_RULES,
    });

    expect(res.players["p1"]?.yellowCardsBySeason["s1"]).toBe(4);
    expect(isPlayerSuspendedForFixture(res, "f5", "p1")).toBe(true);
    expect(isPlayerSuspendedForFixture(res, "f6", "p1")).toBe(true);
    expect(isPlayerSuspendedForFixture(res, "f7", "p1")).toBe(true);
    expect(isPlayerSuspendedForFixture(res, "f8", "p1")).toBe(true);
  });

  it("consumes bans ONLY on actually played matches in actual play order (postponed & bye do NOT consume, D-005)", () => {
    const registrations: PlayerSeasonTeam[] = [
      { playerId: "p1", seasonId: "s1", teamId: "t1" },
    ];
    const fixtures = [
      makeFixture("f1", "s1", 1, "t1", "t2", "PLAYED", "2026-08-01T18:00:00.000Z"),
      makeFixture("f2-postponed", "s1", 2, "t1", "t3", "POSTPONED", "2026-08-08T18:00:00.000Z"),
      makeFixture("f3-bye", "s1", 3, "t1", "t1", "PLAYED", "2026-08-15T18:00:00.000Z", { isBye: true }),
      makeFixture("f4-played", "s1", 4, "t1", "t4", "PLAYED", "2026-08-22T18:00:00.000Z"),
      makeFixture("f5-next", "s1", 5, "t1", "t5", "SCHEDULED", "2026-08-29T18:00:00.000Z"),
    ];
    // Direct red default (2 rounds) in R1 -> postponed R2 & bye R3 do NOT consume;
    // R4 consumes 1st round -> still suspended (1 remaining) entering R5!
    const events: DisciplineEventInput[] = [
      { id: "r1", fixtureId: "f1", playerId: "p1", teamId: "t1", type: "DIRECT_RED", minute: 50 },
    ];

    const res = evaluateSuspensions({
      fixtures,
      events,
      registrations,
      rules: SUPERLIGA_DEFAULT_RULES,
    });

    expect(isPlayerSuspendedForFixture(res, "f4-played", "p1")).toBe(true);
    expect(isPlayerSuspendedForFixture(res, "f5-next", "p1")).toBe(true);
    expect(res.players["p1"]?.activeSuspensionRounds).toBe(1);
  });

  it("annuls yellow cards from interrupted matches replayed in full (RD Art. 41 alin. 2.2)", () => {
    const registrations: PlayerSeasonTeam[] = [
      { playerId: "p1", seasonId: "s1", teamId: "t1" },
    ];
    const fixtures = [
      makeFixture("f1", "s1", 1, "t1", "t2", "PLAYED", "2026-08-01T18:00:00.000Z"),
      makeFixture("f2", "s1", 2, "t1", "t2", "PLAYED", "2026-08-08T18:00:00.000Z"),
      makeFixture("f3", "s1", 3, "t1", "t2", "PLAYED", "2026-08-15T18:00:00.000Z"),
      makeFixture("f4", "s1", 4, "t1", "t2", "PLAYED", "2026-08-22T18:00:00.000Z"),
      makeFixture("f5", "s1", 5, "t1", "t2", "SCHEDULED", "2026-08-29T18:00:00.000Z"),
    ];
    const events: DisciplineEventInput[] = [
      { id: "e1", fixtureId: "f1", playerId: "p1", teamId: "t1", type: "YELLOW_CARD", minute: 10 },
      { id: "e2", fixtureId: "f2", playerId: "p1", teamId: "t1", type: "YELLOW_CARD", minute: 20 },
      { id: "e3", fixtureId: "f3", playerId: "p1", teamId: "t1", type: "YELLOW_CARD", minute: 30 },
      // Interrupted match yellow is annulled -> does NOT trigger 4th yellow suspension
      { id: "e4", fixtureId: "f4", playerId: "p1", teamId: "t1", type: "YELLOW_CARD", minute: 35, isAnnulled: true },
    ];

    const res = evaluateSuspensions({
      fixtures,
      events,
      registrations,
      rules: SUPERLIGA_DEFAULT_RULES,
    });

    expect(res.players["p1"]?.yellowCardsBySeason["s1"]).toBe(3);
    expect(isPlayerSuspendedForFixture(res, "f5", "p1")).toBe(false);
  });

  it("carries over unserved suspensions into the next season, including after a player transfers teams", () => {
    const registrations: PlayerSeasonTeam[] = [
      // Season 1 at team t1, transferred to team t9 in Season 2
      { playerId: "p1", seasonId: "s1", teamId: "t1" },
      { playerId: "p1", seasonId: "s2", teamId: "t9" },
    ];
    const fixtures = [
      makeFixture("s1-f30", "s1", 30, "t1", "t2", "PLAYED", "2026-03-09T18:00:00.000Z"),
      makeFixture("s2-f1", "s2", 1, "t9", "t3", "PLAYED", "2026-07-18T18:00:00.000Z"),
      makeFixture("s2-f2", "s2", 2, "t4", "t9", "SCHEDULED", "2026-07-25T18:00:00.000Z"),
    ];
    // Direct red (2 rounds) in the final round of Season 1 -> carried over to t9 in Season 2
    const events: DisciplineEventInput[] = [
      { id: "red30", fixtureId: "s1-f30", playerId: "p1", teamId: "t1", type: "DIRECT_RED", minute: 88, committeeBanRounds: 2 },
    ];

    const res = evaluateSuspensions({
      fixtures,
      events,
      registrations,
      rules: SUPERLIGA_DEFAULT_RULES,
    });

    expect(isPlayerSuspendedForFixture(res, "s2-f1", "p1")).toBe(true);
    expect(isPlayerSuspendedForFixture(res, "s2-f2", "p1")).toBe(true);
    expect(res.players["p1"]?.activeSuspensionRounds).toBe(1);
  });

  it("detects retroactive suspension alerts without altering subsequent fixture scores (D-005)", () => {
    const registrations: PlayerSeasonTeam[] = [
      { playerId: "p1", seasonId: "s1", teamId: "t1" },
    ];
    // Round 5 was already played with p1 on the match sheet
    const fixtures = [
      makeFixture("f1", "s1", 1, "t1", "t2", "PLAYED", "2026-08-01T18:00:00.000Z", { matchSheetPlayerIds: ["p1"] }),
      makeFixture("f2", "s1", 2, "t1", "t3", "PLAYED", "2026-08-08T18:00:00.000Z", { matchSheetPlayerIds: ["p1"] }),
      makeFixture("f3", "s1", 3, "t1", "t4", "PLAYED", "2026-08-15T18:00:00.000Z", { matchSheetPlayerIds: ["p1"] }),
      makeFixture("f4", "s1", 4, "t1", "t5", "PLAYED", "2026-08-22T18:00:00.000Z", { matchSheetPlayerIds: ["p1"] }),
      makeFixture("f5", "s1", 5, "t1", "t6", "PLAYED", "2026-08-29T18:00:00.000Z", { matchSheetPlayerIds: ["p1"] }),
    ];

    // After correcting f4 to add p1's 4th yellow card:
    const afterEvents: DisciplineEventInput[] = [
      { id: "e1", fixtureId: "f1", playerId: "p1", teamId: "t1", type: "YELLOW_CARD", minute: 10 },
      { id: "e2", fixtureId: "f2", playerId: "p1", teamId: "t1", type: "YELLOW_CARD", minute: 20 },
      { id: "e3", fixtureId: "f3", playerId: "p1", teamId: "t1", type: "YELLOW_CARD", minute: 30 },
      { id: "e4", fixtureId: "f4", playerId: "p1", teamId: "t1", type: "YELLOW_CARD", minute: 45 },
    ];

    const afterEval = evaluateSuspensions({
      fixtures,
      events: afterEvents,
      registrations,
      rules: SUPERLIGA_DEFAULT_RULES,
    });

    const alerts = detectRetroactiveConflicts("f4", fixtures, afterEval, registrations);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      fixtureId: "f5",
      roundNumber: 5,
      playerId: "p1",
      teamId: "t1",
    });
    expect(alerts[0]?.description).toContain("scorul nu a fost modificat automat");
  });
});
