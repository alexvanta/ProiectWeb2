import { prisma } from "@/lib/prisma";
import {
  detectRetroactiveConflicts,
  evaluateSuspensions,
} from "@/domain/suspensions";
import type {
  CarryOverSuspensionInput,
  DisciplineEventInput,
  DisciplineEventType,
  DisciplineFixtureInput,
  PlayerSeasonTeam,
  RetroactiveConflictAlert,
  SeasonRules,
} from "@/domain/types";
import { DomainValidationError } from "@/server/auth/rbac";
import { seasonCache, type SeasonCacheStore } from "@/server/cache/seasonCache";
import { extractSeasonRules } from "./seasonRules";
import type { MatchEventType, Prisma } from "@prisma/client";

export interface ResultEventPayload {
  playerId: string;
  teamId: string;
  type: DisciplineEventType;
  minute: number;
  isAnnulled?: boolean;
  committeeBanRounds?: number | null;
}

export interface EnterOrCorrectResultInput {
  fixtureId: string;
  actorId: string;
  homeGoals: number;
  awayGoals: number;
  events: ResultEventPayload[];
  /** Mandatory when correcting an already-PLAYED fixture (D-005) */
  reason?: string;
}

export interface ResultCorrectionOutput {
  fixtureId: string;
  seasonId: string;
  isCorrection: boolean;
  auditId: string | null;
  retroactiveAlerts: RetroactiveConflictAlert[];
}

export interface ResultRepo {
  loadFixtureContext(fixtureId: string): Promise<{
    fixture: {
      id: string;
      seasonId: string;
      roundNumber: number;
      status: "SCHEDULED" | "PLAYED" | "POSTPONED" | "INTERRUPTED_REPLAY";
      homeGoals: number | null;
      awayGoals: number | null;
      scheduledAt: string;
      playedAt: string | null;
    };
    existingEvents: ResultEventPayload[];
    rules: SeasonRules;
  } | null>;

  persistResultAndAudit(params: {
    fixtureId: string;
    actorId: string;
    homeGoals: number;
    awayGoals: number;
    events: ResultEventPayload[];
    isCorrection: boolean;
    reason?: string;
    beforeSnapshot: Record<string, unknown>;
    afterSnapshot: Record<string, unknown>;
  }): Promise<{ auditId: string | null }>;

  loadLeagueDisciplineContext(seasonId: string): Promise<{
    allFixtures: DisciplineFixtureInput[];
    allEvents: DisciplineEventInput[];
    allRegistrations: PlayerSeasonTeam[];
    carryOverSuspensions: CarryOverSuspensionInput[];
  }>;

  saveRetroactiveAlerts(
    auditId: string,
    alerts: RetroactiveConflictAlert[],
  ): Promise<void>;
}

const prismaResultRepo: ResultRepo = {
  async loadFixtureContext(fixtureId: string) {
    const fixture = await prisma.fixture.findUnique({
      where: { id: fixtureId },
      include: { season: true, events: true },
    });
    if (!fixture) return null;

    return {
      fixture: {
        id: fixture.id,
        seasonId: fixture.seasonId,
        roundNumber: fixture.roundNumber,
        status: fixture.status,
        homeGoals: fixture.homeGoals,
        awayGoals: fixture.awayGoals,
        scheduledAt: fixture.scheduledAt.toISOString(),
        playedAt: fixture.playedAt?.toISOString() ?? null,
      },
      existingEvents: fixture.events.map((e) => ({
        playerId: e.playerId,
        teamId: e.teamId,
        type: e.type,
        minute: e.minute,
        isAnnulled: e.isAnnulled,
      })),
      rules: extractSeasonRules(fixture.season),
    };
  },

  async persistResultAndAudit(params) {
    return prisma.$transaction(async (tx) => {
      await tx.fixture.update({
        where: { id: params.fixtureId },
        data: {
          homeGoals: params.homeGoals,
          awayGoals: params.awayGoals,
          status: "PLAYED",
          playedAt: new Date(),
        },
      });

      await tx.matchEvent.deleteMany({
        where: { fixtureId: params.fixtureId },
      });

      if (params.events.length > 0) {
        await tx.matchEvent.createMany({
          data: params.events.map((e) => ({
            fixtureId: params.fixtureId,
            teamId: e.teamId,
            playerId: e.playerId,
            type: e.type as MatchEventType,
            minute: e.minute,
            isAnnulled: e.isAnnulled ?? false,
          })),
        });
      }

      let auditId: string | null = null;
      if (params.isCorrection) {
        const audit = await tx.resultCorrectionAudit.create({
          data: {
            fixtureId: params.fixtureId,
            actorId: params.actorId,
            reason: params.reason ?? "",
            beforeSnapshot: params.beforeSnapshot as Prisma.InputJsonValue,
            afterSnapshot: params.afterSnapshot as Prisma.InputJsonValue,
          },
        });
        auditId = audit.id;
      }

      return { auditId };
    });
  },

  async loadLeagueDisciplineContext(seasonId: string) {
    const [allFixtures, allEvents, registrations, activeCarryOvers] =
      await Promise.all([
        prisma.fixture.findMany({
          include: {
            matchSheets: {
              include: { entries: { select: { playerId: true } } },
            },
          },
        }),
        prisma.matchEvent.findMany(),
        prisma.playerSeasonRegistration.findMany(),
        prisma.suspension.findMany({
          where: {
            remainingRounds: { gt: 0 },
            carryOverToNextSeason: true,
          },
        }),
      ]);

    return {
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
        .filter((s) => s.originSeasonId !== seasonId)
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

  async saveRetroactiveAlerts(auditId: string, alerts: RetroactiveConflictAlert[]) {
    if (alerts.length === 0) return;
    await prisma.retroactiveSuspensionAlert.createMany({
      data: alerts.map((a) => ({
        correctionAuditId: auditId,
        fixtureId: a.fixtureId,
        playerId: a.playerId,
        teamId: a.teamId,
        description: a.description,
      })),
    });
  },
};

export function createResultService(
  repo: ResultRepo = prismaResultRepo,
  cache: SeasonCacheStore = seasonCache,
) {
  return {
    async enterOrCorrectResult(
      input: EnterOrCorrectResultInput,
    ): Promise<ResultCorrectionOutput> {
      const ctx = await repo.loadFixtureContext(input.fixtureId);
      if (!ctx) {
        throw new DomainValidationError(404, "Meciul solicitat nu a fost găsit.");
      }

      const isCorrection = ctx.fixture.status === "PLAYED";
      const trimmedReason = input.reason?.trim() ?? "";

      if (isCorrection && trimmedReason.length < 3) {
        throw new DomainValidationError(
          400,
          "Corecția unui rezultat deja salvat necesită un motiv explicit (minim 3 caractere).",
        );
      }

      const beforeSnapshot = {
        status: ctx.fixture.status,
        homeGoals: ctx.fixture.homeGoals,
        awayGoals: ctx.fixture.awayGoals,
        events: ctx.existingEvents,
      };
      const afterSnapshot = {
        status: "PLAYED",
        homeGoals: input.homeGoals,
        awayGoals: input.awayGoals,
        events: input.events,
      };

      const { auditId } = await repo.persistResultAndAudit({
        fixtureId: input.fixtureId,
        actorId: input.actorId,
        homeGoals: input.homeGoals,
        awayGoals: input.awayGoals,
        events: input.events,
        isCorrection,
        reason: trimmedReason,
        beforeSnapshot,
        afterSnapshot,
      });

      // D-004: Deterministically invalidate per-season cache after every result entry or correction
      cache.invalidateSeason(ctx.fixture.seasonId);

      // D-005: On correction, detect retroactive suspension conflicts WITHOUT altering later scores
      let retroactiveAlerts: RetroactiveConflictAlert[] = [];
      if (isCorrection && auditId) {
        const disc = await repo.loadLeagueDisciplineContext(ctx.fixture.seasonId);
        const afterEval = evaluateSuspensions({
          fixtures: disc.allFixtures,
          events: disc.allEvents,
          registrations: disc.allRegistrations,
          carryOverSuspensions: disc.carryOverSuspensions,
          rules: ctx.rules,
        });

        retroactiveAlerts = detectRetroactiveConflicts(
          input.fixtureId,
          disc.allFixtures,
          afterEval,
          disc.allRegistrations,
        );

        await repo.saveRetroactiveAlerts(auditId, retroactiveAlerts);
      }

      return {
        fixtureId: input.fixtureId,
        seasonId: ctx.fixture.seasonId,
        isCorrection,
        auditId,
        retroactiveAlerts,
      };
    },
  };
}

const defaultResultService = createResultService();

export async function enterOrCorrectResult(input: EnterOrCorrectResultInput) {
  return defaultResultService.enterOrCorrectResult(input);
}
