import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth/rbac";
import { FixtureStatusBadge } from "@/components/StatusBadges";

export const dynamic = "force-dynamic";

export default async function CaptainIndexPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "CAPTAIN" && user.role !== "ADMIN") {
    return (
      <main className="p19-container">
        <div className="p19-panel" style={{ padding: "var(--space-6)" }}>
          Acces restricționat: această pagină este disponibilă doar pentru rolul Căpitan sau Admin.
        </div>
      </main>
    );
  }

  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
  });

  const fixtures = activeSeason
    ? await prisma.fixture.findMany({
        where: {
          seasonId: activeSeason.id,
          ...(user.role === "CAPTAIN" && user.teamId
            ? { OR: [{ homeTeamId: user.teamId }, { awayTeamId: user.teamId }] }
            : {}),
        },
        include: {
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } },
        },
        orderBy: [{ roundNumber: "asc" }, { scheduledAt: "asc" }],
        take: 15,
      })
    : [];

  return (
    <main className="p19-container" style={{ display: "grid", gap: "var(--space-5)" }}>
      <div>
        <h1 className="font-display" style={{ margin: 0, fontSize: "28px" }}>
          Panou Căpitan · Foi de meci
        </h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "13px" }}>
          Selectează un meci pentru a completa și depune foaia de meci (minim 7 jucători, maxim 11 titulari; jucătorii suspendați sunt blocați pe server).
        </p>
      </div>

      <section className="p19-panel" style={{ overflow: "hidden" }}>
        {fixtures.length === 0 ? (
          <div style={{ padding: "var(--space-5)", color: "var(--text-muted)" }}>
            Nu există meciuri programate în sezonul activ.
          </div>
        ) : (
          fixtures.map((fx) => (
            <Link
              key={fx.id}
              href={`/capitan/foaie-meci/${fx.id}`}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                padding: "12px var(--space-4)",
                borderBottom: "1px solid var(--border-subtle)",
                textDecoration: "none",
                color: "var(--text-primary)",
                fontSize: "13px",
              }}
            >
              <span className="tabular-nums" style={{ color: "var(--text-muted)" }}>
                Etapa {fx.roundNumber}
              </span>
              <span style={{ fontWeight: 600, flex: 1 }}>
                {fx.homeTeam.name} – {fx.awayTeam.name}
              </span>
              <FixtureStatusBadge status={fx.status} />
              <span style={{ color: "var(--accent-primary)", fontWeight: 600 }}>
                Completează foaia →
              </span>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
