import { prisma } from "@/lib/prisma";
import { computeStandings } from "@/domain/standings";
import type {
  PlayedFixtureInput,
  SeasonRules,
  StandingsMode,
  StandingsResult,
  StandingsTeamInput,
} from "@/domain/types";
import { seasonCache, type SeasonCacheStore } from "@/server/cache/seasonCache";
import { DomainValidationError } from "@/server/auth/rbac";
import { extractSeasonRules } from "./seasonRules";

export interface StandingsRepo {
  loadSeasonData(seasonId: string): Promise<{
    seasonId: string;
    status: "DRAFT" | "ACTIVE" | "COMPLETED";
    rules: SeasonRules;
    teams: StandingsTeamInput[];
    fixtures: PlayedFixtureInput[];
  } | null>;
}

const prismaStandingsRepo: StandingsRepo = {
  async loadSeasonData(seasonId: string) {
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        seasonTeams: {
          include: {
            team: {
              select: { id: true, name: true, shortName: true },
            },
          },
        },
        fixtures: {
          select: {
            id: true,
            roundNumber: true,
            homeTeamId: true,
            awayTeamId: true,
            homeGoals: true,
            awayGoals: true,
            status: true,
            isBye: true,
            playedAt: true,
            scheduledAt: true,
          },
        },
      },
    });

    if (!season) return null;

    return {
      seasonId: season.id,
      status: season.status,
      rules: extractSeasonRules(season),
      teams: season.seasonTeams.map((st) => ({
        id: st.team.id,
        name: st.team.name,
        shortName: st.team.shortName,
      })),
      fixtures: season.fixtures.map((f) => ({
        id: f.id,
        roundNumber: f.roundNumber,
        homeTeamId: f.homeTeamId,
        awayTeamId: f.awayTeamId,
        homeGoals: f.homeGoals,
        awayGoals: f.awayGoals,
        status: f.status,
        isBye: f.isBye,
        playedAt: f.playedAt?.toISOString() ?? null,
        scheduledAt: f.scheduledAt.toISOString(),
      })),
    };
  },
};

export function createStandingsService(
  repo: StandingsRepo = prismaStandingsRepo,
  cache: SeasonCacheStore = seasonCache,
) {
  return {
    async getSeasonStandings(
      seasonId: string,
      explicitMode?: StandingsMode,
    ): Promise<StandingsResult> {
      const cacheKey = `standings:${explicitMode ?? "auto"}`;
      return cache.getOrCompute(seasonId, cacheKey, async () => {
        const data = await repo.loadSeasonData(seasonId);
        if (!data) {
          throw new DomainValidationError(404, "Sezonul solicitat nu a fost găsit.");
        }
        const mode: StandingsMode =
          explicitMode ?? (data.status === "COMPLETED" ? "final" : "intermediate");
        return computeStandings(data.teams, data.fixtures, data.rules, mode);
      });
    },
  };
}

const defaultStandingsService = createStandingsService();

export async function getSeasonStandings(
  seasonId: string,
  explicitMode?: StandingsMode,
): Promise<StandingsResult> {
  return defaultStandingsService.getSeasonStandings(seasonId, explicitMode);
}
