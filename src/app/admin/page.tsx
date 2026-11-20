import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth/rbac";
import { AdminPanelClient } from "@/components/AdminPanelClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") {
    return (
      <main className="p19-container">
        <div className="p19-panel" style={{ padding: "var(--space-6)" }}>
          Acces restricționat: Panoul Admin este disponibil exclusiv rolului ADMIN.
        </div>
      </main>
    );
  }

  const [seasons, teams, players, pitches, users] = await Promise.all([
    prisma.season.findMany({
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      select: { id: true, name: true, status: true },
    }),
    prisma.team.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, shortName: true },
    }),
    prisma.player.findMany({
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
      take: 100,
    }),
    prisma.pitch.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, city: true },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, name: true, role: true },
    }),
  ]);

  return (
    <main className="p19-container" style={{ display: "grid", gap: "var(--space-5)" }}>
      <div>
        <h1 className="font-display" style={{ margin: 0, fontSize: "28px" }}>
          Panou Admin · SuperLiga României
        </h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "13px" }}>
          Administrare sezoane & reguli, echipe, transferuri între sezoane, terenuri, generator program round-robin și conturi.
        </p>
      </div>

      <AdminPanelClient
        seasons={seasons}
        teams={teams}
        players={players}
        pitches={pitches}
        users={users}
      />
    </main>
  );
}
