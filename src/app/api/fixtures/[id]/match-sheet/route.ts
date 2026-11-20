import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertCaptainOfTeam,
  getCurrentUser,
  handleApiError,
} from "@/server/auth/rbac";
import { submitMatchSheet } from "@/server/services/matchSheetService";

const matchSheetSchema = z.object({
  teamId: z.string().min(1),
  entries: z
    .array(
      z.object({
        playerId: z.string().min(1),
        isStarter: z.boolean(),
        shirtNumber: z.number().int().min(1).max(99).nullable().optional(),
      }),
    )
    .min(1),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: fixtureId } = await context.params;
    const body = matchSheetSchema.parse(await request.json());
    const user = await getCurrentUser();
    const authed = assertCaptainOfTeam(user, body.teamId);

    const saved = await submitMatchSheet({
      fixtureId,
      teamId: body.teamId,
      submittedById: authed.id,
      entries: body.entries,
    });

    return NextResponse.json({ matchSheet: saved }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
