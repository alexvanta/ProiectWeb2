import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireRole } from "@/server/auth/rbac";

const alertReviewSchema = z.object({
  status: z.enum(["REVIEWED", "DISMISSED"]),
  reviewNote: z.string().min(3, "Nota de revizuire este obligatorie.").max(500),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole(["REFEREE_ORGANIZER", "ADMIN"]);
    const { id } = await context.params;
    const body = alertReviewSchema.parse(await request.json());

    const updated = await prisma.retroactiveSuspensionAlert.update({
      where: { id },
      data: {
        status: body.status,
        reviewNote: body.reviewNote.trim(),
        reviewedById: actor.id,
        reviewedAt: new Date(),
      },
    });

    return NextResponse.json({ alert: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
