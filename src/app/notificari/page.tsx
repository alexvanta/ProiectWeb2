import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth/rbac";
import { NotificationsClient } from "@/components/NotificationsClient";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const notifications = await prisma.rescheduleNotification.findMany({
    where: { userId: user.id },
    include: {
      fixture: {
        include: {
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main className="p19-container" style={{ display: "grid", gap: "var(--space-5)" }}>
      <div>
        <h1 className="font-display" style={{ margin: 0, fontSize: "28px" }}>
          Centru notificări in-app
        </h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "13px" }}>
          Notificări automate primite la reprogramarea meciurilor echipei tale ({user.name}).
        </p>
      </div>

      <NotificationsClient
        items={notifications.map((n) => ({
          id: n.id,
          fixtureId: n.fixtureId,
          matchLabel: `${n.fixture.homeTeam.name} – ${n.fixture.awayTeam.name}`,
          roundNumber: n.fixture.roundNumber,
          oldScheduledAt: n.oldScheduledAt.toISOString(),
          newScheduledAt: n.newScheduledAt.toISOString(),
          oldPitchName: n.oldPitchName,
          newPitchName: n.newPitchName,
          message: n.message,
          readAt: n.readAt?.toISOString() ?? null,
        }))}
      />
    </main>
  );
}
