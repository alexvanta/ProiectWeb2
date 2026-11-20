import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DomainValidationError,
  handleApiError,
  requireRole,
} from "@/server/auth/rbac";

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole([
      "PLAYER",
      "CAPTAIN",
      "REFEREE_ORGANIZER",
      "ADMIN",
    ]);
    const { id } = await context.params;

    const existing = await prisma.rescheduleNotification.findUnique({
      where: { id },
    });
    if (!existing || existing.userId !== user.id) {
      throw new DomainValidationError(404, "Notificarea nu a fost găsită.");
    }

    const updated = await prisma.rescheduleNotification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ notification: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
