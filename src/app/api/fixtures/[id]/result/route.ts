import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, requireRole } from "@/server/auth/rbac";
import { enterOrCorrectResult } from "@/server/services/resultService";

const resultSchema = z.object({
  homeGoals: z.number().int().min(0).max(50),
  awayGoals: z.number().int().min(0).max(50),
  reason: z.string().optional(),
  events: z
    .array(
      z.object({
        playerId: z.string().min(1),
        teamId: z.string().min(1),
        type: z.enum([
          "GOAL",
          "OWN_GOAL",
          "YELLOW_CARD",
          "SECOND_YELLOW_RED",
          "DIRECT_RED",
        ]),
        minute: z.number().int().min(1).max(130),
        isAnnulled: z.boolean().optional(),
        committeeBanRounds: z.number().int().min(1).max(24).nullable().optional(),
      }),
    )
    .default([]),
});

async function handleWrite(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole(["REFEREE_ORGANIZER", "ADMIN"]);
    const { id: fixtureId } = await context.params;
    const body = resultSchema.parse(await request.json());

    const result = await enterOrCorrectResult({
      fixtureId,
      actorId: actor.id,
      homeGoals: body.homeGoals,
      awayGoals: body.awayGoals,
      events: body.events,
      reason: body.reason,
    });

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleWrite(request, context);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleWrite(request, context);
}
