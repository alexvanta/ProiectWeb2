import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/server/auth/rbac";
import { seasonCache } from "@/server/cache/seasonCache";
import type { FixtureStatus } from "@prisma/client";

export async function GET(
  request: Request,
  context: { params: Promise<{ seasonId: string }> },
) {
  try {
    const { seasonId } = await context.params;
    const url = new URL(request.url);
    const round = url.searchParams.get("round");
    const teamId = url.searchParams.get("teamId");
    const pitchId = url.searchParams.get("pitchId");
    const status = url.searchParams.get("status") as FixtureStatus | null;

    const cacheKey = `fixtures:${round ?? "all"}:${teamId ?? "all"}:${pitchId ?? "all"}:${status ?? "all"}`;

    const fixtures = await seasonCache.getOrCompute(seasonId, cacheKey, async () => {
      return prisma.fixture.findMany({
        where: {
          seasonId,
          ...(round ? { roundNumber: Number(round) } : {}),
          ...(teamId
            ? { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] }
            : {}),
          ...(pitchId ? { pitchId } : {}),
          ...(status ? { status } : {}),
        },
        include: {
          homeTeam: {
            select: { id: true, name: true, shortName: true, slug: true, crestColorA: true, crestColorB: true },
          },
          awayTeam: {
            select: { id: true, name: true, shortName: true, slug: true, crestColorA: true, crestColorB: true },
          },
          pitch: { select: { id: true, name: true, city: true } },
        },
        orderBy: [{ roundNumber: "asc" }, { scheduledAt: "asc" }],
      });
    });

    return NextResponse.json({ fixtures });
  } catch (err) {
    return handleApiError(err);
  }
}
