import { NextResponse } from "next/server";
import type { StandingsMode } from "@/domain/types";
import { getSeasonStandings } from "@/server/services/standingsService";
import { handleApiError } from "@/server/auth/rbac";

export async function GET(
  request: Request,
  context: { params: Promise<{ seasonId: string }> },
) {
  try {
    const { seasonId } = await context.params;
    const url = new URL(request.url);
    const modeParam = url.searchParams.get("mode");
    const explicitMode: StandingsMode | undefined =
      modeParam === "intermediate" || modeParam === "final"
        ? modeParam
        : undefined;

    const standings = await getSeasonStandings(seasonId, explicitMode);
    return NextResponse.json(standings);
  } catch (err) {
    return handleApiError(err);
  }
}
