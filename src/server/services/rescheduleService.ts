import { prisma } from "@/lib/prisma";
import { DomainValidationError } from "@/server/auth/rbac";
import { seasonCache } from "@/server/cache/seasonCache";
import type { FixtureStatus } from "@prisma/client";

export interface RescheduleFixtureInput {
  fixtureId: string;
  scheduledAt: Date;
  pitchId?: string | null;
  status?: FixtureStatus;
  message?: string;
}

/**
 * Reschedules a fixture and creates in-app PostgreSQL notifications
 * for all players and captains of both affected teams (D-004).
 */
export async function rescheduleFixture(input: RescheduleFixtureInput) {
  const fixture = await prisma.fixture.findUnique({
    where: { id: input.fixtureId },
    include: {
      pitch: { select: { name: true } },
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
  });

  if (!fixture) {
    throw new DomainValidationError(404, "Meciul solicitat nu a fost găsit.");
  }

  let newPitchName = fixture.pitch?.name ?? null;
  if (input.pitchId && input.pitchId !== fixture.pitchId) {
    const newPitch = await prisma.pitch.findUnique({
      where: { id: input.pitchId },
      select: { name: true },
    });
    if (!newPitch) {
      throw new DomainValidationError(404, "Terenul selectat nu a fost găsit.");
    }
    newPitchName = newPitch.name;
  }

  const affectedUsers = await prisma.user.findMany({
    where: {
      role: { in: ["PLAYER", "CAPTAIN"] },
      teamId: { in: [fixture.homeTeamId, fixture.awayTeamId] },
    },
    select: { id: true },
  });

  const defaultMessage = `Meciul ${fixture.homeTeam.name} – ${fixture.awayTeam.name} (Etapa ${fixture.roundNumber}) a fost reprogramat.`;

  const updated = await prisma.$transaction(async (tx) => {
    const fx = await tx.fixture.update({
      where: { id: fixture.id },
      data: {
        scheduledAt: input.scheduledAt,
        ...(input.pitchId !== undefined ? { pitchId: input.pitchId } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
    });

    if (affectedUsers.length > 0) {
      await tx.rescheduleNotification.createMany({
        data: affectedUsers.map((u) => ({
          fixtureId: fixture.id,
          userId: u.id,
          oldScheduledAt: fixture.scheduledAt,
          newScheduledAt: input.scheduledAt,
          oldPitchName: fixture.pitch?.name ?? null,
          newPitchName,
          message: input.message?.trim() || defaultMessage,
        })),
      });
    }

    return fx;
  });

  seasonCache.invalidateSeason(fixture.seasonId);

  return {
    fixture: updated,
    notifiedCount: affectedUsers.length,
  };
}
