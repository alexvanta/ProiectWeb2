import { prisma } from "@/lib/prisma";
import { generateRoundRobinSchedule } from "@/domain/scheduler";
import { hashPassword } from "@/lib/password";
import { DomainValidationError } from "@/server/auth/rbac";
import { seasonCache } from "@/server/cache/seasonCache";
import type { SeasonStatus, UserRole } from "@prisma/client";

export async function createAdminSeason(input: {
  name: string;
  slug: string;
  status?: SeasonStatus;
  teamIds: string[];
  pointsWin?: number;
  pointsDraw?: number;
  pointsLoss?: number;
  yellowCardThresholds?: number[];
  yellowCardRepeatFrom?: number;
  directRedDefaultRounds?: number;
}) {
  const league = await prisma.league.findFirst();
  if (!league) {
    throw new DomainValidationError(404, "Liga principală nu este configurată.");
  }

  return prisma.season.create({
    data: {
      leagueId: league.id,
      name: input.name,
      slug: input.slug,
      status: input.status ?? "DRAFT",
      isActive: input.status === "ACTIVE",
      pointsWin: input.pointsWin ?? 3,
      pointsDraw: input.pointsDraw ?? 1,
      pointsLoss: input.pointsLoss ?? 0,
      ...(input.yellowCardThresholds ? { yellowCardThresholds: input.yellowCardThresholds } : {}),
      yellowCardRepeatFrom: input.yellowCardRepeatFrom ?? 10,
      directRedDefaultRounds: input.directRedDefaultRounds ?? 2,
      seasonTeams: {
        create: input.teamIds.map((teamId) => ({ teamId })),
      },
    },
    include: { seasonTeams: true },
  });
}

export async function createAdminTeam(input: {
  name: string;
  shortName: string;
  slug: string;
  crestColorA?: string;
  crestColorB?: string;
  homePitchId?: string | null;
  seasonId?: string;
}) {
  const team = await prisma.team.create({
    data: {
      name: input.name,
      shortName: input.shortName.toUpperCase(),
      slug: input.slug,
      crestColorA: input.crestColorA ?? "#156842",
      crestColorB: input.crestColorB ?? "#0F5132",
      homePitchId: input.homePitchId ?? null,
    },
  });

  if (input.seasonId) {
    await prisma.seasonTeam.create({
      data: { seasonId: input.seasonId, teamId: team.id },
    });
    seasonCache.invalidateSeason(input.seasonId);
  }

  return team;
}

export async function createPlayerTransfer(input: {
  playerId: string;
  seasonId: string;
  toTeamId: string;
  shirtNumber?: number | null;
  isCaptain?: boolean;
}) {
  const existing = await prisma.playerSeasonRegistration.findFirst({
    where: {
      playerId: input.playerId,
      seasonId: input.seasonId,
      leftAt: null,
    },
  });

  return prisma.$transaction(async (tx) => {
    if (existing && existing.teamId !== input.toTeamId) {
      await tx.playerSeasonRegistration.update({
        where: { id: existing.id },
        data: { leftAt: new Date() },
      });
    }

    return tx.playerSeasonRegistration.upsert({
      where: {
        playerId_seasonId_teamId: {
          playerId: input.playerId,
          seasonId: input.seasonId,
          teamId: input.toTeamId,
        },
      },
      update: {
        leftAt: null,
        shirtNumber: input.shirtNumber ?? undefined,
        isCaptain: input.isCaptain ?? false,
      },
      create: {
        playerId: input.playerId,
        seasonId: input.seasonId,
        teamId: input.toTeamId,
        shirtNumber: input.shirtNumber ?? null,
        isCaptain: input.isCaptain ?? false,
      },
    });
  });
}

export async function createAdminPitch(input: {
  name: string;
  city: string;
  address?: string | null;
  sharedGroup?: string | null;
  availabilities: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
}) {
  return prisma.pitch.create({
    data: {
      name: input.name,
      city: input.city,
      address: input.address ?? null,
      sharedGroup: input.sharedGroup ?? null,
      availabilities: {
        create: input.availabilities,
      },
    },
    include: { availabilities: true },
  });
}

export async function generateOrCommitSeasonSchedule(input: {
  seasonId: string;
  startDate: string;
  daysBetweenRounds?: number;
  confirm: boolean;
}) {
  const season = await prisma.season.findUnique({
    where: { id: input.seasonId },
    include: {
      seasonTeams: {
        include: {
          team: { include: { homePitch: true } },
        },
      },
    },
  });

  if (!season) {
    throw new DomainValidationError(404, "Sezonul solicitat nu a fost găsit.");
  }

  const pitches = await prisma.pitch.findMany({
    include: { availabilities: true },
  });

  const schedule = generateRoundRobinSchedule(
    season.seasonTeams.map((st) => ({
      id: st.team.id,
      name: st.team.name,
      homePitchId: st.team.homePitchId,
      sharedGroup: st.team.homePitch?.sharedGroup ?? null,
    })),
    pitches.map((p) => ({
      id: p.id,
      name: p.name,
      sharedGroup: p.sharedGroup,
      availabilities: p.availabilities.map((a) => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
      })),
    })),
    {
      startDate: input.startDate,
      daysBetweenRounds: input.daysBetweenRounds ?? 7,
      matchDurationMinutes: season.matchDurationMinutes,
    },
  );

  if (!input.confirm) {
    return { committed: false, schedule };
  }

  await prisma.$transaction(async (tx) => {
    await tx.fixture.deleteMany({
      where: { seasonId: season.id, status: "SCHEDULED" },
    });

    await tx.fixture.createMany({
      data: schedule.matches.map((m) => ({
        seasonId: season.id,
        roundNumber: m.roundNumber,
        leg: m.leg,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        pitchId: m.pitchId,
        scheduledAt: new Date(m.scheduledAt),
        status: "SCHEDULED",
        isBye: false,
      })),
    });
  });

  seasonCache.invalidateSeason(season.id);
  return { committed: true, schedule };
}

export async function createAdminUser(input: {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  teamId?: string | null;
  playerId?: string | null;
}) {
  return prisma.user.create({
    data: {
      email: input.email.trim().toLowerCase(),
      passwordHash: hashPassword(input.password),
      name: input.name.trim(),
      role: input.role,
      teamId: input.teamId ?? null,
      playerId: input.playerId ?? null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      teamId: true,
      playerId: true,
      createdAt: true,
    },
  });
}
