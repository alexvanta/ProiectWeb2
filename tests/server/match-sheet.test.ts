import { describe, expect, it, vi } from "vitest";
import { SUPERLIGA_DEFAULT_RULES } from "@/domain/types";
import { DomainValidationError } from "@/server/auth/rbac";
import {
  createMatchSheetService,
  type MatchSheetRepo,
} from "@/server/services/matchSheetService";

function makeBasePlayers(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `p-${i + 1}`);
}

describe("Server-side match-sheet suspension enforcement (D-005)", () => {
  it("rejects with 422 when a submitted player has an active in-season suspension", async () => {
    const saveSpy = vi.fn(async () => ({ id: "ms-1", count: 8 }));
    const squad = makeBasePlayers(11);

    const repo: MatchSheetRepo = {
      async loadValidationContext() {
        return {
          fixture: {
            id: "fx-2",
            seasonId: "s2",
            homeTeamId: "team-a",
            awayTeamId: "team-b",
            status: "SCHEDULED",
          },
          rules: SUPERLIGA_DEFAULT_RULES,
          teamRegisteredPlayerIds: squad,
          playerNames: Object.fromEntries(squad.map((id) => [id, `Jucător ${id}`])),
          allFixtures: [
            {
              id: "fx-1",
              seasonId: "s2",
              roundNumber: 1,
              homeTeamId: "team-a",
              awayTeamId: "team-c",
              status: "PLAYED",
              scheduledAt: "2026-07-18T18:00:00.000Z",
              playedAt: "2026-07-18T18:00:00.000Z",
            },
            {
              id: "fx-2",
              seasonId: "s2",
              roundNumber: 2,
              homeTeamId: "team-a",
              awayTeamId: "team-b",
              status: "SCHEDULED",
              scheduledAt: "2026-07-25T18:00:00.000Z",
            },
          ],
          allEvents: [
            {
              id: "ev-red",
              fixtureId: "fx-1",
              playerId: "p-3",
              teamId: "team-a",
              type: "DIRECT_RED",
              minute: 72,
            },
          ],
          allRegistrations: squad.map((playerId) => ({
            playerId,
            seasonId: "s2",
            teamId: "team-a",
          })),
          carryOverSuspensions: [],
        };
      },
      saveMatchSheet: saveSpy,
    };

    const service = createMatchSheetService(repo);

    try {
      await service.submitMatchSheet({
        fixtureId: "fx-2",
        teamId: "team-a",
        submittedById: "captain-1",
        entries: squad.slice(0, 8).map((playerId) => ({
          playerId,
          isStarter: true,
        })),
      });
      expect.unreachable("Suspended player p-3 must be rejected on server");
    } catch (err) {
      expect(err).toBeInstanceOf(DomainValidationError);
      expect((err as DomainValidationError).status).toBe(422);
      expect((err as DomainValidationError).message).toContain("Jucător p-3");
    }

    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("rejects with 422 when a player has a carry-over suspension from the previous season (including after transfer)", async () => {
    const saveSpy = vi.fn(async () => ({ id: "ms-2", count: 8 }));
    const squad = makeBasePlayers(11);

    const repo: MatchSheetRepo = {
      async loadValidationContext() {
        return {
          fixture: {
            id: "s2-fx-1",
            seasonId: "s2",
            homeTeamId: "team-craiova",
            awayTeamId: "team-fcsb",
            status: "SCHEDULED",
          },
          rules: SUPERLIGA_DEFAULT_RULES,
          teamRegisteredPlayerIds: squad,
          playerNames: { ...Object.fromEntries(squad.map((id) => [id, `Jucător ${id}`])), "p-5": "Transferat Suspendat" },
          allFixtures: [
            {
              id: "s2-fx-1",
              seasonId: "s2",
              roundNumber: 1,
              homeTeamId: "team-craiova",
              awayTeamId: "team-fcsb",
              status: "SCHEDULED",
              scheduledAt: "2026-07-18T18:00:00.000Z",
            },
          ],
          allEvents: [],
          allRegistrations: squad.map((playerId) => ({
            playerId,
            seasonId: "s2",
            teamId: "team-craiova",
          })),
          carryOverSuspensions: [
            {
              id: "carry-1",
              playerId: "p-5",
              originSeasonId: "s1",
              originFixtureId: "s1-fx-30",
              reason: "DIRECT_RED",
              remainingRounds: 2,
              carryOverToNextSeason: true,
            },
          ],
        };
      },
      saveMatchSheet: saveSpy,
    };

    const service = createMatchSheetService(repo);

    await expect(
      service.submitMatchSheet({
        fixtureId: "s2-fx-1",
        teamId: "team-craiova",
        submittedById: "captain-1",
        entries: squad.slice(0, 8).map((playerId) => ({
          playerId,
          isStarter: true,
        })),
      }),
    ).rejects.toMatchObject({
      status: 422,
      message: expect.stringContaining("Transferat Suspendat"),
    });

    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("accepts a valid match sheet with eligible players (7..11 starters)", async () => {
    const saveSpy = vi.fn(async () => ({ id: "ms-ok", count: 8 }));
    const squad = makeBasePlayers(11);

    const repo: MatchSheetRepo = {
      async loadValidationContext() {
        return {
          fixture: {
            id: "fx-ok",
            seasonId: "s2",
            homeTeamId: "team-a",
            awayTeamId: "team-b",
            status: "SCHEDULED",
          },
          rules: SUPERLIGA_DEFAULT_RULES,
          teamRegisteredPlayerIds: squad,
          playerNames: Object.fromEntries(squad.map((id) => [id, `Jucător ${id}`])),
          allFixtures: [
            {
              id: "fx-ok",
              seasonId: "s2",
              roundNumber: 1,
              homeTeamId: "team-a",
              awayTeamId: "team-b",
              status: "SCHEDULED",
              scheduledAt: "2026-07-18T18:00:00.000Z",
            },
          ],
          allEvents: [],
          allRegistrations: squad.map((playerId) => ({
            playerId,
            seasonId: "s2",
            teamId: "team-a",
          })),
          carryOverSuspensions: [],
        };
      },
      saveMatchSheet: saveSpy,
    };

    const service = createMatchSheetService(repo);
    const res = await service.submitMatchSheet({
      fixtureId: "fx-ok",
      teamId: "team-a",
      submittedById: "captain-1",
      entries: squad.slice(0, 8).map((playerId) => ({
        playerId,
        isStarter: true,
      })),
    });

    expect(res).toEqual({ id: "ms-ok", count: 8 });
    expect(saveSpy).toHaveBeenCalledTimes(1);
  });
});
