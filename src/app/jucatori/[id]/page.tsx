import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TeamCrest } from "@/components/TeamCrest";
import { CardCountBadge, EligibilityBadge } from "@/components/StatusBadges";

export const dynamic = "force-dynamic";

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const player = await prisma.player.findFirst({
    where: { OR: [{ slug: id }, { id }] },
    include: {
      registrations: {
        include: {
          season: { select: { id: true, name: true, slug: true, status: true } },
          team: {
            select: {
              id: true,
              name: true,
              shortName: true,
              slug: true,
              crestColorA: true,
              crestColorB: true,
            },
          },
        },
        orderBy: { season: { createdAt: "desc" } },
      },
      matchEvents: {
        where: { isAnnulled: false },
        include: {
          fixture: { select: { seasonId: true, roundNumber: true } },
        },
      },
      suspensions: {
        include: {
          originSeason: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!player) notFound();

  const totalGoals = player.matchEvents.filter((e) => e.type === "GOAL").length;
  const totalYellows = player.matchEvents.filter((e) => e.type === "YELLOW_CARD").length;
  const totalReds = player.matchEvents.filter(
    (e) => e.type === "SECOND_YELLOW_RED" || e.type === "DIRECT_RED",
  ).length;
  const activeBanRounds = player.suspensions.reduce(
    (sum, s) => sum + s.remainingRounds,
    0,
  );

  return (
    <main className="container">
      {/* Player Hero */}
      <section className="team-hero animate-enter">
        <div>
          <h1 className="page-title">{player.fullName}</h1>
          <p className="page-meta">
            Post: {player.position}
            {player.birthYear ? ` · Născut ${player.birthYear}` : ""}
          </p>
        </div>

        <div className="team-hero-controls">
          <div className="team-kpi-row">
            <span className="kpi-chip tabular">
              Goluri: <strong>{totalGoals}</strong>
            </span>
            <CardCountBadge type="yellow" count={totalYellows} />
            <CardCountBadge type="red" count={totalReds} />
            <EligibilityBadge suspendedRounds={activeBanRounds} />
          </div>
        </div>
      </section>

      <div style={{ display: "grid", gap: "var(--space-5)" }}>
        {/* Transfer & Season History */}
        <section className="panel animate-enter" style={{ animationDelay: "40ms" }}>
          <div className="panel-header">
            <h2 className="panel-title">Istoric echipe &amp; transferuri pe sezoane</h2>
            <span className="demo-pill tabular">{player.registrations.length} înregistrări</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Sezon</th>
                  <th scope="col">Echipă</th>
                  <th scope="col" className="col-num">Nr. tricou</th>
                  <th scope="col" className="col-num">Status</th>
                </tr>
              </thead>
              <tbody>
                {player.registrations.map((reg) => (
                  <tr key={reg.id}>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {reg.season.name}
                    </td>
                    <td>
                      <Link
                        href={`/echipe/${reg.team.slug}`}
                        className="team-cell"
                        style={{ fontWeight: 600, color: "var(--text-primary)" }}
                      >
                        <TeamCrest
                          slug={reg.team.slug}
                          shortName={reg.team.shortName}
                          colorA={reg.team.crestColorA}
                          colorB={reg.team.crestColorB}
                          size="xs"
                        />
                        <span className="team-name">{reg.team.name}</span>
                      </Link>
                    </td>
                    <td className="col-num tabular">{reg.shirtNumber ?? "—"}</td>
                    <td className="col-num">
                      <span className="status-badge status-neutral">
                        {reg.leftAt ? "Transferat" : reg.isCaptain ? "Căpitan" : "Activ"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Suspensions History (including carry-over) */}
        <section className="panel animate-enter" style={{ animationDelay: "80ms" }}>
          <div className="panel-header">
            <h2 className="panel-title">Suspendări &amp; reportări</h2>
            <span className="demo-pill tabular">{player.suspensions.length}</span>
          </div>
          {player.suspensions.length === 0 ? (
            <div style={{ padding: "var(--space-4)", color: "var(--text-muted)", fontSize: "13px" }}>
              Jucătorul nu are suspendări înregistrate.
            </div>
          ) : (
            <div className="summary-list">
              {player.suspensions.map((s) => (
                <div
                  key={s.id}
                  className="summary-row"
                  style={{
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-subtle)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div>
                    <span className="summary-name">
                      {s.originSeason.name} · {s.reason}
                      {s.carryOverToNextSeason ? " (Reportabilă între sezoane)" : ""}
                    </span>
                    {s.notes ? <span className="summary-sub">{s.notes}</span> : null}
                  </div>
                  <EligibilityBadge suspendedRounds={s.remainingRounds} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
