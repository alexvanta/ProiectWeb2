import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, requireRole } from "@/server/auth/rbac";

export async function GET() {
  try {
    const user = await requireRole([
      "PLAYER",
      "CAPTAIN",
      "REFEREE_ORGANIZER",
      "ADMIN",
    ]);

    const notifications = await prisma.rescheduleNotification.findMany({
      where: { userId: user.id },
      include: {
        fixture: {
          include: {
            homeTeam: { select: { name: true, shortName: true } },
            awayTeam: { select: { name: true, shortName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ notifications });
  } catch (err) {
    return handleApiError(err);
  }
}
