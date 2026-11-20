import { prisma } from "@/lib/prisma";
import { getSeasonStandings } from "@/server/services/standingsService";
import type { StandingsResult } from "@/domain/types";

export interface SeasonOption {
  id: string;
  name: string;
  slug: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED";
  isActive: boolean;
}

export interface TopScorerItem {
  playerId: string;
  playerName: string;
  playerSlug: string;
  teamId: string;
  teamName: string;
  teamShortName: string;
  teamSlug: string;
  crestColorA: string;
  crestColorB: string;
  goals: number;
  yellowCards: number;
  redCards: number;
}

export async function getAllSeasons(): Promise<SeasonOption[]> {
  return prisma.season.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      isActive: true,
    },
  });
}

export async function resolveSeason(
  seasonSlugOrId?: string | null,
): Promise<{ seasons: SeasonOption[]; current: SeasonOption | null }> {
  const seasons = await getAllSeasons();
  if (seasons.length === 0) return { seasons: [], current: null };

  if (seasonSlugOrId) {
    const matched = seasons.find(
      (s) => s.slug === seasonSlugOrId || s.id === seasonSlugOrId,
    );
    if (matched) return { seasons, current: matched };
  }

  const active = seasons.find((s) => s.isActive) ?? seasons[0]!;
  return { seasons, current: active };
}

export async function getSeasonTopScorers(seasonId: string): Promise<TopScorerItem[]> {
  const events = await prisma.matchEvent.findMany({
    where: {
      fixture: { seasonId, status: "PLAYED" },
      isAnnulled: false,
      type: { in: ["GOAL", "YELLOW_CARD", "SECOND_YELLOW_RED", "DIRECT_RED"] },
    },
    include: {
      player: { select: { id: true, fullName: true, slug: true } },
      team: {
        select: {
          id: true,
          name: true,
          shortName: true,
          slug: true,
          crestColorA: true,
          crestColorB: true,
        },
      },
    },
  });

  const byPlayer = new Map<string, TopScorerItem>();
  for (const ev of events) {
    let item = byPlayer.get(ev.playerId);
    if (!item) {
      item = {
        playerId: ev.player.id,
        playerName: ev.player.fullName,
        playerSlug: ev.player.slug,
        teamId: ev.team.id,
        teamName: ev.team.name,
        teamShortName: ev.team.shortName,
        teamSlug: ev.team.slug,
        crestColorA: ev.team.crestColorA,
        crestColorB: ev.team.crestColorB,
        goals: 0,
        yellowCards: 0,
        redCards: 0,
      };
      byPlayer.set(ev.playerId, item);
    }

    if (ev.type === "GOAL") item.goals += 1;
    else if (ev.type === "YELLOW_CARD") item.yellowCards += 1;
    else if (ev.type === "SECOND_YELLOW_RED" || ev.type === "DIRECT_RED") item.redCards += 1;
  }

  return Array.from(byPlayer.values()).sort(
    (a, b) =>
      b.goals - a.goals ||
      a.yellowCards - b.yellowCards ||
      a.playerName.localeCompare(b.playerName, "ro"),
  );
}

export async function getHomePageData(seasonSlug?: string) {
  const { seasons, current } = await resolveSeason(seasonSlug);
  if (!current) {
    return {
      seasons,
      current: null,
      standings: null as StandingsResult | null,
      teamMeta: {} as Record<string, { slug: string; crestColorA: string; crestColorB: string }>,
      topScorers: [] as TopScorerItem[],
      currentRound: 1,
      roundFixtures: [],
    };
  }

  const [standings, seasonTeams, topScorers, fixtures] = await Promise.all([
    getSeasonStandings(current.id),
    prisma.seasonTeam.findMany({
      where: { seasonId: current.id },
      include: {
        team: {
          select: { id: true, slug: true, crestColorA: true, crestColorB: true },
        },
      },
    }),
    getSeasonTopScorers(current.id),
    prisma.fixture.findMany({
      where: { seasonId: current.id },
      include: {
        homeTeam: {
          select: { id: true, name: true, shortName: true, slug: true, crestColorA: true, crestColorB: true },
        },
        awayTeam: {
          select: { id: true, name: true, shortName: true, slug: true, crestColorA: true, crestColorB: true },
        },
        pitch: { select: { id: true, name: true } },
      },
      orderBy: [{ roundNumber: "asc" }, { scheduledAt: "asc" }],
    }),
  ]);

  const teamMeta: Record<string, { slug: string; crestColorA: string; crestColorB: string }> = {};
  for (const st of seasonTeams) {
    teamMeta[st.team.id] = {
      slug: st.team.slug,
      crestColorA: st.team.crestColorA,
      crestColorB: st.team.crestColorB,
    };
  }

  // Pick next scheduled round if active, or latest played round if completed
  const firstScheduled = fixtures.find((f) => f.status === "SCHEDULED");
  const lastPlayed = [...fixtures].reverse().find((f) => f.status === "PLAYED");
  const currentRound = firstScheduled?.roundNumber ?? lastPlayed?.roundNumber ?? 1;
  const roundFixtures = fixtures.filter((f) => f.roundNumber === currentRound);

  return {
    seasons,
    current,
    standings,
    teamMeta,
    topScorers: topScorers.slice(0, 20),
    currentRound,
    roundFixtures,
  };
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.rescheduleNotification.count({
    where: { userId, readAt: null },
  });
}
