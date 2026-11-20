import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateTeamIcal } from "@/domain/ical";
import { DomainValidationError, handleApiError } from "@/server/auth/rbac";

export async function GET(
  _request: Request,
  context: { params: Promise<{ seasonId: string; teamId: string }> },
) {
  try {
    const { seasonId, teamId } = await context.params;

    const [season, team, fixtures] = await Promise.all([
      prisma.season.findUnique({ where: { id: seasonId } }),
      prisma.team.findUnique({ where: { id: teamId } }),
      prisma.fixture.findMany({
        where: {
          seasonId,
          OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
        },
        include: {
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } },
          pitch: { select: { name: true } },
        },
        orderBy: [{ roundNumber: "asc" }, { scheduledAt: "asc" }],
      }),
    ]);

    if (!season || !team) {
      throw new DomainValidationError(404, "Sezonul sau echipa solicitată nu a fost găsită.");
    }

    const ics = generateTeamIcal(
      team.name,
      season.name,
      fixtures.map((f) => ({
        id: f.id,
        roundNumber: f.roundNumber,
        homeTeamName: f.homeTeam.name,
        awayTeamName: f.awayTeam.name,
        pitchName: f.pitch?.name ?? null,
        scheduledAt: f.scheduledAt.toISOString(),
        durationMinutes: season.matchDurationMinutes,
        status: f.status,
      })),
      new Date().toISOString(),
    );

    const filename = `${team.slug}-${season.slug}.ics`;
    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
