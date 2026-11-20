import { describe, expect, it, vi } from "vitest";
import {
  SUPERLIGA_DEFAULT_RULES,
  type PlayedFixtureInput,
  type RetroactiveConflictAlert,
} from "@/domain/types";
import { DomainValidationError } from "@/server/auth/rbac";
import { SeasonCacheStore } from "@/server/cache/seasonCache";
import {
  createResultService,
  type ResultEventPayload,
  type ResultRepo,
} from "@/server/services/resultService";
import {
  createStandingsService,
  type StandingsRepo,
} from "@/server/services/standingsService";

describe("Per-season cache invalidation & audited result correction (D-004, D-005)", () => {
  it("caches standings, invalidates cache on result correction, recomputes standings, and raises retroactive alert without altering later scores", async () => {
    const cache = new SeasonCacheStore();

    // In-memory fixture store backing both standingsService and resultService
    const fixturesState: PlayedFixtureInput[] = [
      {
        id: "fx-1",
        roundNumber: 1,
        homeTeamId: "team-a",
        awayTeamId: "team-b",
        homeGoals: 2,
        awayGoals: 0,
        status: "PLAYED",
        playedAt: "2026-07-18T18:00:00.000Z",
        scheduledAt: "2026-07-18T18:00:00.000Z",
      },
      {
        id: "fx-2",
        roundNumber: 2,
        homeTeamId: "team-a",
        awayTeamId: "team-b",
        homeGoals: 1,
        awayGoals: 1,
        status: "PLAYED",
        playedAt: "2026-07-25T18:00:00.000Z",
        scheduledAt: "2026-07-25T18:00:00.000Z",
      },
    ];

    let fx1Events: ResultEventPayload[] = [];
    const savedAudits: Array<{ reason: string; before: unknown; after: unknown }> = [];
    const savedAlerts: RetroactiveConflictAlert[] = [];

    const loadSpy = vi.fn(async (seasonId: string) => ({
      seasonId,
      status: "ACTIVE" as const,
      rules: SUPERLIGA_DEFAULT_RULES,
      teams: [
        { id: "team-a", name: "Echipa A", shortName: "ECA" },
        { id: "team-b", name: "Echipa B", shortName: "ECB" },
      ],
      fixtures: fixturesState.map((f) => ({ ...f })),
    }));

    const standingsRepo: StandingsRepo = { loadSeasonData: loadSpy };

    const resultRepo: ResultRepo = {
      async loadFixtureContext(fixtureId) {
        const fx = fixturesState.find((f) => f.id === fixtureId);
        if (!fx) return null;
        return {
          fixture: {
            id: fx.id,
            seasonId: "season-2",
            roundNumber: fx.roundNumber,
            status: fx.status,
            homeGoals: fx.homeGoals,
            awayGoals: fx.awayGoals,
            scheduledAt: fx.scheduledAt!,
            playedAt: fx.playedAt ?? null,
          },
          existingEvents: fx1Events,
          rules: SUPERLIGA_DEFAULT_RULES,
        };
      },

      async persistResultAndAudit(params) {
        const fx = fixturesState.find((f) => f.id === params.fixtureId)!;
        fx.homeGoals = params.homeGoals;
        fx.awayGoals = params.awayGoals;
        fx.status = "PLAYED";
        fx1Events = params.events;
        if (params.isCorrection) {
          savedAudits.push({
            reason: params.reason ?? "",
            before: params.beforeSnapshot,
            after: params.afterSnapshot,
          });
          return { auditId: "audit-1" };
        }
        return { auditId: null };
      },

      async loadLeagueDisciplineContext() {
        return {
          allFixtures: fixturesState.map((f) => ({
            id: f.id,
            seasonId: "season-2",
            roundNumber: f.roundNumber,
            homeTeamId: f.homeTeamId,
            awayTeamId: f.awayTeamId,
            status: f.status,
            scheduledAt: f.scheduledAt!,
            playedAt: f.playedAt ?? null,
            // p-1 appeared on match sheet in already-played fx-2!
            matchSheetPlayerIds: f.id === "fx-2" ? ["p-1"] : [],
          })),
          allEvents: fx1Events.map((e, idx) => ({
            id: `ev-${idx}`,
            fixtureId: "fx-1",
            ...e,
          })),
          allRegistrations: [
            { playerId: "p-1", seasonId: "season-2", teamId: "team-a" },
          ],
          carryOverSuspensions: [],
        };
      },

      async saveRetroactiveAlerts(_auditId, alerts) {
        savedAlerts.push(...alerts);
      },
    };

    const standingsService = createStandingsService(standingsRepo, cache);
    const resultService = createResultService(resultRepo, cache);

    // 1. Initial standings read -> cache miss; Team A leads (4 pts vs 1 pt)
    const before1 = await standingsService.getSeasonStandings("season-2");
    expect(before1.rows[0]?.teamId).toBe("team-a");
    expect(before1.rows[0]?.points).toBe(4);
    expect(loadSpy).toHaveBeenCalledTimes(1);

    // 2. Second read -> served directly from cache (no DB reload)
    const before2 = await standingsService.getSeasonStandings("season-2");
    expect(before2.rows[0]?.teamId).toBe("team-a");
    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect(cache.getStats().hits).toBe(1);

    // 3. Correction without reason -> rejected with 400
    await expect(
      resultService.enterOrCorrectResult({
        fixtureId: "fx-1",
        actorId: "ref-1",
        homeGoals: 0,
        awayGoals: 2,
        events: [],
        reason: "",
      }),
    ).rejects.toBeInstanceOf(DomainValidationError);

    // 4. Valid correction: flips fx-1 to 0-2 AND adds DIRECT_RED for p-1 -> invalidates cache & raises retroactive alert for fx-2
    const correction = await resultService.enterOrCorrectResult({
      fixtureId: "fx-1",
      actorId: "ref-1",
      homeGoals: 0,
      awayGoals: 2,
      events: [
        {
          playerId: "p-1",
          teamId: "team-a",
          type: "DIRECT_RED",
          minute: 80,
        },
      ],
      reason: "Corecție raport arbitraj aprobată de observator",
    });

    expect(correction.isCorrection).toBe(true);
    expect(correction.auditId).toBe("audit-1");
    expect(savedAudits).toHaveLength(1);
    expect(cache.getStats().invalidations).toBe(1);

    // Retroactive alert raised for fx-2, while fx-2's score (1-1) remains UNCHANGED (no auto-forfeit, D-005)
    expect(savedAlerts).toHaveLength(1);
    expect(savedAlerts[0]?.fixtureId).toBe("fx-2");
    expect(fixturesState[1]?.homeGoals).toBe(1);
    expect(fixturesState[1]?.awayGoals).toBe(1);

    // 5. Next standings read -> cache was invalidated, reloads DB and Team B now leads (4 pts vs 1 pt)!
    const after = await standingsService.getSeasonStandings("season-2");
    expect(loadSpy).toHaveBeenCalledTimes(2);
    expect(after.rows[0]?.teamId).toBe("team-b");
    expect(after.rows[0]?.points).toBe(4);
    expect(after.rows[1]?.teamId).toBe("team-a");
    expect(after.rows[1]?.points).toBe(1);
  });
});
