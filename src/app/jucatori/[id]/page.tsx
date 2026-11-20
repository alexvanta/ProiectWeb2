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
    <main className="p19-container" style={{ display: "grid", gap: "var(--space-6)" }}>
      {/* Player Header */}
      <section className="p19-panel" style={{ padding: "var(--space-5)" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-4)",
          }}
        >
          <div>
            <h1 className="font-display" style={{ margin: 0, fontSize: "28px", lineHeight: "32px" }}>
              {player.fullName}
            </h1>
            <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "13px" }}>
              Post: {player.position}
              {player.birthYear ? ` · Născut ${player.birthYear}` : ""}
            </p>
          </div>
          <EligibilityBadge suspendedRounds={activeBanRounds} />
        </div>

        <div
          style={{
            marginTop: "var(--space-4)",
            paddingTop: "var(--space-4)",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            flexWrap: "wrap",
            gap: "24px",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Goluri totale</div>
            <div className="font-display tabular-nums" style={{ fontSize: "24px", fontWeight: 700 }}>
              {totalGoals}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
              Cartonașe galbene
            </div>
            <CardCountBadge type="yellow" count={totalYellows} />
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
              Cartonașe roșii
            </div>
            <CardCountBadge type="red" count={totalReds} />
          </div>
        </div>
      </section>

      {/* Transfer & Season History */}
      <section className="p19-panel" style={{ overflow: "hidden" }}>
        <div style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--border-subtle)" }}>
          <h2 className="font-display" style={{ margin: 0, fontSize: "20px" }}>
            Istoric echipe & transferuri pe sezoane
          </h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr
                style={{
                  background: "var(--bg-subtle)",
                  color: "var(--text-muted)",
                  fontSize: "12px",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <th style={{ padding: "8px 12px", textAlign: "left" }}>Sezon</th>
                <th style={{ padding: "8px 12px", textAlign: "left" }}>Echipă</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>Nr. tricou</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {player.registrations.map((reg) => (
                <tr
                  key={reg.id}
                  style={{
                    height: "var(--row-height-dense)",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <td style={{ padding: "6px 12px", fontWeight: 600 }}>{reg.season.name}</td>
                  <td style={{ padding: "6px 12px" }}>
                    <Link
                      href={`/echipe/${reg.team.slug}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        color: "var(--text-primary)",
                        textDecoration: "none",
                        fontWeight: 600,
                      }}
                    >
                      <TeamCrest
                        shortName={reg.team.shortName}
                        colorA={reg.team.crestColorA}
                        colorB={reg.team.crestColorB}
                      />
                      <span>{reg.team.name}</span>
                    </Link>
                  </td>
                  <td className="tabular-nums" style={{ padding: "6px 12px", textAlign: "right" }}>
                    {reg.shirtNumber ?? "—"}
                  </td>
                  <td style={{ padding: "6px 12px", textAlign: "right", color: "var(--text-muted)" }}>
                    {reg.leftAt ? "Transferat" : reg.isCaptain ? "Căpitan" : "Activ"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Suspensions History (including carry-over) */}
      <section className="p19-panel" style={{ padding: "var(--space-5)" }}>
        <h2 className="font-display" style={{ margin: "0 0 var(--space-3)", fontSize: "20px" }}>
          Suspendări & reportări
        </h2>
        {player.suspensions.length === 0 ? (
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px" }}>
            Jucătorul nu are suspendări înregistrate.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            {player.suspensions.map((s) => (
              <div
                key={s.id}
                style={{
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-subtle)",
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "13px" }}>
                    {s.originSeason.name} · {s.reason}
                    {s.carryOverToNextSeason ? " (Reportabilă între sezoane)" : ""}
                  </div>
                  {s.notes ? (
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "3px" }}>
                      {s.notes}
                    </div>
                  ) : null}
                </div>
                <EligibilityBadge suspendedRounds={s.remainingRounds} />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
