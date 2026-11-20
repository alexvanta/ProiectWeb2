import { prisma } from "@/lib/prisma";
import {
  evaluateSuspensions,
  isPlayerSuspendedForFixture,
} from "@/domain/suspensions";
import type {
  CarryOverSuspensionInput,
  DisciplineEventInput,
  DisciplineFixtureInput,
  PlayerSeasonTeam,
  SeasonRules,
} from "@/domain/types";
import { DomainValidationError } from "@/server/auth/rbac";
import { extractSeasonRules } from "./seasonRules";

export interface SubmitMatchSheetEntryInput {
  playerId: string;
  isStarter: boolean;
  shirtNumber?: number | null;
}

export interface SubmitMatchSheetInput {
  fixtureId: string;
  teamId: string;
  submittedById: string;
  entries: SubmitMatchSheetEntryInput[];
}

export interface MatchSheetRepo {
  loadValidationContext(fixtureId: string, teamId: string): Promise<{
    fixture: {
      id: string;
      seasonId: string;
      homeTeamId: string;
      awayTeamId: string;
      status: "SCHEDULED" | "PLAYED" | "POSTPONED" | "INTERRUPTED_REPLAY";
    };
    rules: SeasonRules;
    teamRegisteredPlayerIds: string[];
    playerNames: Record<string, string>;
    allFixtures: DisciplineFixtureInput[];
    allEvents: DisciplineEventInput[];
    allRegistrations: PlayerSeasonTeam[];
    carryOverSuspensions: CarryOverSuspensionInput[];
  } | null>;
  saveMatchSheet(input: SubmitMatchSheetInput): Promise<{ id: string; count: number }>;
}

const prismaMatchSheetRepo: MatchSheetRepo = {
  async loadValidationContext(fixtureId: string, teamId: string) {
    const fixture = await prisma.fixture.findUnique({
      where: { id: fixtureId },
      include: { season: true },
    });
    if (!fixture) return null;

    const [registrations, allFixtures, allEvents, activeCarryOvers] = await Promise.all([
      prisma.playerSeasonRegistration.findMany({
        include: { player: { select: { id: true, fullName: true } } },
      }),
      prisma.fixture.findMany({
        include: {
          matchSheets: {
            include: { entries: { select: { playerId: true } } },
          },
        },
      }),
      prisma.matchEvent.findMany(),
      prisma.suspension.findMany({
        where: {
          remainingRounds: { gt: 0 },
          carryOverToNextSeason: true,
        },
      }),
    ]);

    const playerNames: Record<string, string> = {};
    const teamRegisteredPlayerIds: string[] = [];

    for (const r of registrations) {
      playerNames[r.playerId] = r.player.fullName;
      if (r.seasonId === fixture.seasonId && r.teamId === teamId) {
        teamRegisteredPlayerIds.push(r.playerId);
      }
    }

    return {
      fixture: {
        id: fixture.id,
        seasonId: fixture.seasonId,
        homeTeamId: fixture.homeTeamId,
        awayTeamId: fixture.awayTeamId,
        status: fixture.status,
      },
      rules: extractSeasonRules(fixture.season),
      teamRegisteredPlayerIds,
      playerNames,
      allFixtures: allFixtures.map((f) => ({
        id: f.id,
        seasonId: f.seasonId,
        roundNumber: f.roundNumber,
        homeTeamId: f.homeTeamId,
        awayTeamId: f.awayTeamId,
        status: f.status,
        isBye: f.isBye,
        scheduledAt: f.scheduledAt.toISOString(),
        playedAt: f.playedAt?.toISOString() ?? null,
        matchSheetPlayerIds: f.matchSheets.flatMap((ms) =>
          ms.entries.map((e) => e.playerId),
        ),
      })),
      allEvents: allEvents.map((e) => ({
        id: e.id,
        fixtureId: e.fixtureId,
        playerId: e.playerId,
        teamId: e.teamId,
        type: e.type,
        minute: e.minute,
        isAnnulled: e.isAnnulled,
      })),
      allRegistrations: registrations.map((r) => ({
        playerId: r.playerId,
        seasonId: r.seasonId,
        teamId: r.teamId,
      })),
      carryOverSuspensions: activeCarryOvers
        .filter((s) => s.originSeasonId !== fixture.seasonId)
        .map((s) => ({
          id: s.id,
          playerId: s.playerId,
          originSeasonId: s.originSeasonId,
          originFixtureId: s.originFixtureId,
          reason: s.reason,
          remainingRounds: s.remainingRounds,
          carryOverToNextSeason: s.carryOverToNextSeason,
        })),
    };
  },

  async saveMatchSheet(input: SubmitMatchSheetInput) {
    const sheet = await prisma.$transaction(async (tx) => {
      const existing = await tx.matchSheet.findUnique({
        where: {
          fixtureId_teamId: {
            fixtureId: input.fixtureId,
            teamId: input.teamId,
          },
        },
      });

      if (existing) {
        await tx.matchSheetEntry.deleteMany({
          where: { matchSheetId: existing.id },
        });
        return tx.matchSheet.update({
          where: { id: existing.id },
          data: {
            submittedById: input.submittedById,
            submittedAt: new Date(),
            entries: {
              create: input.entries.map((e) => ({
                playerId: e.playerId,
                isStarter: e.isStarter,
                shirtNumber: e.shirtNumber ?? null,
              })),
            },
          },
        });
      }

      return tx.matchSheet.create({
        data: {
          fixtureId: input.fixtureId,
          teamId: input.teamId,
          submittedById: input.submittedById,
          entries: {
            create: input.entries.map((e) => ({
              playerId: e.playerId,
              isStarter: e.isStarter,
              shirtNumber: e.shirtNumber ?? null,
            })),
          },
        },
      });
    });

    return { id: sheet.id, count: input.entries.length };
  },
};

export function createMatchSheetService(repo: MatchSheetRepo = prismaMatchSheetRepo) {
  return {
    async submitMatchSheet(input: SubmitMatchSheetInput) {
      const ctx = await repo.loadValidationContext(input.fixtureId, input.teamId);
      if (!ctx) {
        throw new DomainValidationError(404, "Meciul solicitat nu a fost găsit.");
      }

      if (
        ctx.fixture.homeTeamId !== input.teamId &&
        ctx.fixture.awayTeamId !== input.teamId
      ) {
        throw new DomainValidationError(
          400,
          "Echipa selectată nu participă în acest meci.",
        );
      }

      // Deduplicate player IDs
      const uniqueIds = new Set(input.entries.map((e) => e.playerId));
      if (uniqueIds.size !== input.entries.length) {
        throw new DomainValidationError(
          400,
          "Foaia de meci conține jucători duplicați.",
        );
      }

      // ROAF Art. 45, 48, 60, 63: min 7 players, max 11 starters
      const starters = input.entries.filter((e) => e.isStarter);
      if (input.entries.length < ctx.rules.minMatchSheetPlayers) {
        throw new DomainValidationError(
          422,
          `Foaia de meci necesită minim ${ctx.rules.minMatchSheetPlayers} jucători.`,
        );
      }
      if (starters.length > ctx.rules.maxMatchSheetStarters) {
        throw new DomainValidationError(
          422,
          `Foaia de meci permite maxim ${ctx.rules.maxMatchSheetStarters} titulari.`,
        );
      }

      // Verify all players are registered for this team in this season
      const registeredSet = new Set(ctx.teamRegisteredPlayerIds);
      const unregistered = input.entries.filter((e) => !registeredSet.has(e.playerId));
      if (unregistered.length > 0) {
        throw new DomainValidationError(
          422,
          "Unul sau mai mulți jucători nu sunt legitimați la această echipă în sezonul curent.",
          { unregisteredPlayerIds: unregistered.map((u) => u.playerId) },
        );
      }

      // D-005: Server-side suspension enforcement (including carry-over from prior season)
      const evaluation = evaluateSuspensions({
        fixtures: ctx.allFixtures,
        events: ctx.allEvents,
        registrations: ctx.allRegistrations,
        carryOverSuspensions: ctx.carryOverSuspensions,
        rules: ctx.rules,
      });

      const suspendedEntries = input.entries.filter((e) =>
        isPlayerSuspendedForFixture(evaluation, input.fixtureId, e.playerId),
      );

      if (suspendedEntries.length > 0) {
        const suspendedDetails = suspendedEntries.map((e) => ({
          playerId: e.playerId,
          playerName: ctx.playerNames[e.playerId] ?? e.playerId,
          remainingRounds:
            evaluation.players[e.playerId]?.activeSuspensionRounds ?? 1,
        }));
        const namesList = suspendedDetails
          .map((d) => `${d.playerName} (${d.remainingRounds} etape)`)
          .join(", ");

        throw new DomainValidationError(
          422,
          `Foaia de meci a fost respinsă: jucători suspendați detectați (${namesList}).`,
          { suspendedPlayers: suspendedDetails },
        );
      }

      return repo.saveMatchSheet(input);
    },
  };
}

const defaultMatchSheetService = createMatchSheetService();

export async function submitMatchSheet(input: SubmitMatchSheetInput) {
  return defaultMatchSheetService.submitMatchSheet(input);
}
