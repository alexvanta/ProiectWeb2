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
      <main className="container">
        <div className="panel" style={{ padding: "var(--space-6)" }}>
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
    <main className="container">
      <div className="page-head animate-enter">
        <div>
          <h1 className="page-title">Panou Căpitan · Foi de meci</h1>
          <p className="page-meta">
            Selectează un meci pentru a completa și depune foaia de meci (minim 7 jucători, maxim 11 titulari; jucătorii suspendați sunt blocați pe server).
          </p>
        </div>
        <span className="demo-pill tabular">{fixtures.length} meciuri</span>
      </div>

      <section className="panel animate-enter" style={{ animationDelay: "40ms" }}>
        <div className="panel-header">
          <h2 className="panel-title">Meciuri eligibile pentru foaie de meci</h2>
          {activeSeason ? <span className="demo-pill">{activeSeason.name}</span> : null}
        </div>
        {fixtures.length === 0 ? (
          <div style={{ padding: "var(--space-5)", color: "var(--text-muted)" }}>
            Nu există meciuri programate în sezonul activ.
          </div>
        ) : (
          <div className="team-directory">
            {fixtures.map((fx) => (
              <Link
                key={fx.id}
                href={`/capitan/foaie-meci/${fx.id}`}
                className="team-dir-link"
                style={{ padding: "12px var(--space-4)" }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                  <span className="demo-pill tabular">Etapa {fx.roundNumber}</span>
                  <span className="team-name" style={{ fontWeight: 600 }}>
                    {fx.homeTeam.name} – {fx.awayTeam.name}
                  </span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                  <FixtureStatusBadge status={fx.status} />
                  <span className="detail-link">Completează foaia →</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
