import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, requireRole } from "@/server/auth/rbac";
import { rescheduleFixture } from "@/server/services/rescheduleService";

const rescheduleSchema = z.object({
  scheduledAt: z.string().datetime(),
  pitchId: z.string().min(1).nullable().optional(),
  status: z
    .enum(["SCHEDULED", "PLAYED", "POSTPONED", "INTERRUPTED_REPLAY"])
    .optional(),
  message: z.string().max(400).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["REFEREE_ORGANIZER", "ADMIN"]);
    const { id: fixtureId } = await context.params;
    const body = rescheduleSchema.parse(await request.json());

    const result = await rescheduleFixture({
      fixtureId,
      scheduledAt: new Date(body.scheduledAt),
      pitchId: body.pitchId,
      status: body.status,
      message: body.message,
    });

    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
