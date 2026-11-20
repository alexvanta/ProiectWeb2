import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  getSeasonTopScorers,
  resolveSeason,
} from "@/server/queries/publicQueries";
import { TeamCrest } from "@/components/TeamCrest";
import { CardCountBadge, EligibilityBadge } from "@/components/StatusBadges";

export const dynamic = "force-dynamic";

const REASON_LABELS: Record<string, string> = {
  YELLOW_ACCUMULATION: "Cumul cartonașe galbene",
  INDIRECT_RED: "Două galbene (roșu indirect)",
  DIRECT_RED: "Cartonaș roșu direct",
  COMMITTEE_DECISION: "Decizie Comisie de Disciplină",
};

export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season } = await searchParams;
  const { current } = await resolveSeason(season);

  if (!current) {
    return (
      <main className="p19-container">
        <div className="p19-panel" style={{ padding: "var(--space-6)" }}>
          Nu există sezoane disponibile.
        </div>
      </main>
    );
  }

  const [scorers, activeSuspensions] = await Promise.all([
    getSeasonTopScorers(current.id),
    prisma.suspension.findMany({
      where: { remainingRounds: { gt: 0 } },
      include: {
        player: {
          include: {
            registrations: {
              where: { seasonId: current.id },
              include: {
                team: {
                  select: {
                    name: true,
                    shortName: true,
                    slug: true,
                    crestColorA: true,
                    crestColorB: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
        originSeason: { select: { name: true } },
      },
      orderBy: [{ remainingRounds: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const topScorers = scorers.filter((s) => s.goals > 0).slice(0, 20);
  const topCards = [...scorers]
    .filter((s) => s.yellowCards > 0 || s.redCards > 0)
    .sort((a, b) => b.redCards - a.redCards || b.yellowCards - a.yellowCards)
    .slice(0, 20);

  return (
    <main className="p19-container" style={{ display: "grid", gap: "var(--space-6)" }}>
      <div>
        <h1 className="font-display" style={{ margin: 0, fontSize: "28px", lineHeight: "32px" }}>
          Statistici & Suspendări active · {current.name}
        </h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "13px" }}>
          Top marcatori, situația cartonașelor și jucătorii suspendați activ (inclusiv suspendări reportate între sezoane).
        </p>
      </div>

      {/* Active Suspensions */}
      <section className="p19-panel" style={{ overflow: "hidden" }}>
        <div
          style={{
            padding: "var(--space-3) var(--space-4)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <h2 className="font-display" style={{ margin: 0, fontSize: "20px" }}>
            Suspendări active ({activeSuspensions.length})
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
                <th style={{ padding: "8px 12px", textAlign: "left" }}>Jucător</th>
                <th style={{ padding: "8px 12px", textAlign: "left" }}>Echipă curentă</th>
                <th style={{ padding: "8px 12px", textAlign: "left" }}>Motiv</th>
                <th style={{ padding: "8px 12px", textAlign: "left" }}>Origine</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeSuspensions.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
                    Nu există jucători suspendați activ în acest moment.
                  </td>
                </tr>
              ) : (
                activeSuspensions.map((s) => {
                  const team = s.player.registrations[0]?.team;
                  return (
                    <tr
                      key={s.id}
                      style={{
                        height: "var(--row-height-dense)",
                        borderBottom: "1px solid var(--border-subtle)",
                      }}
                    >
                      <td style={{ padding: "6px 12px" }}>
                        <Link
                          href={`/jucatori/${s.player.slug}`}
                          style={{ fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}
                        >
                          {s.player.fullName}
                        </Link>
                      </td>
                      <td style={{ padding: "6px 12px" }}>
                        {team ? (
                          <Link
                            href={`/echipe/${team.slug}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "8px",
                              color: "var(--text-secondary)",
                              textDecoration: "none",
                            }}
                          >
                            <TeamCrest
                              shortName={team.shortName}
                              colorA={team.crestColorA}
                              colorB={team.crestColorB}
                            />
                            <span>{team.name}</span>
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ padding: "6px 12px", color: "var(--text-secondary)" }}>
                        {REASON_LABELS[s.reason] ?? s.reason}
                      </td>
                      <td style={{ padding: "6px 12px", color: "var(--text-muted)", fontSize: "12px" }}>
                        {s.originSeason.name}
                        {s.originSeasonId !== current.id ? " (Reportată)" : ""}
                      </td>
                      <td style={{ padding: "6px 12px", textAlign: "right" }}>
                        <EligibilityBadge suspendedRounds={s.remainingRounds} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Top Scorers + Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "var(--space-5)",
        }}
      >
        {/* Top Scorers */}
        <section className="p19-panel" style={{ overflow: "hidden" }}>
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <h2 className="font-display" style={{ margin: 0, fontSize: "20px" }}>
              Top marcatori
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
                  <th style={{ padding: "8px 10px", textAlign: "center", width: "40px" }}>#</th>
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>Jucător</th>
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>Echipă</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Goluri</th>
                </tr>
              </thead>
              <tbody>
                {topScorers.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "18px", textAlign: "center", color: "var(--text-muted)" }}>
                      Niciun gol înregistrat încă.
                    </td>
                  </tr>
                ) : (
                  topScorers.map((sc, i) => {
                    const rank = i + 1;
                    const bg =
                      rank === 1
                        ? "var(--scorer-rank-1)"
                        : rank === 2
                          ? "var(--scorer-rank-2)"
                          : rank === 3
                            ? "var(--scorer-rank-3)"
                            : "transparent";
                    return (
                      <tr
                        key={sc.playerId}
                        style={{
                          height: "var(--row-height-dense)",
                          borderBottom: "1px solid var(--border-subtle)",
                        }}
                      >
                        <td style={{ padding: "6px 10px", textAlign: "center" }}>
                          <span
                            className="tabular-nums"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "24px",
                              height: "24px",
                              borderRadius: "var(--radius-md)",
                              fontSize: "12px",
                              fontWeight: 700,
                              background: bg,
                              color: rank <= 3 ? "var(--scorer-rank-fg)" : "var(--text-muted)",
                            }}
                          >
                            {rank}
                          </span>
                        </td>
                        <td style={{ padding: "6px 10px" }}>
                          <Link
                            href={`/jucatori/${sc.playerSlug}`}
                            style={{ fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}
                          >
                            {sc.playerName}
                          </Link>
                        </td>
                        <td style={{ padding: "6px 10px", color: "var(--text-secondary)" }}>
                          {sc.teamName}
                        </td>
                        <td className="tabular-nums" style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700 }}>
                          {sc.goals}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Cards Leaderboard */}
        <section className="p19-panel" style={{ overflow: "hidden" }}>
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <h2 className="font-display" style={{ margin: 0, fontSize: "20px" }}>
              Disciplină & cartonașe
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
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>Jucător</th>
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>Echipă</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Cartonașe</th>
                </tr>
              </thead>
              <tbody>
                {topCards.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ padding: "18px", textAlign: "center", color: "var(--text-muted)" }}>
                      Niciun cartonaș înregistrat în acest sezon.
                    </td>
                  </tr>
                ) : (
                  topCards.map((sc) => (
                    <tr
                      key={sc.playerId}
                      style={{
                        height: "var(--row-height-dense)",
                        borderBottom: "1px solid var(--border-subtle)",
                      }}
                    >
                      <td style={{ padding: "6px 10px" }}>
                        <Link
                          href={`/jucatori/${sc.playerSlug}`}
                          style={{ fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}
                        >
                          {sc.playerName}
                        </Link>
                      </td>
                      <td style={{ padding: "6px 10px", color: "var(--text-secondary)" }}>
                        {sc.teamName}
                      </td>
                      <td style={{ padding: "6px 10px", textAlign: "right" }}>
                        <span style={{ display: "inline-flex", gap: "6px" }}>
                          {sc.yellowCards > 0 ? <CardCountBadge type="yellow" count={sc.yellowCards} /> : null}
                          {sc.redCards > 0 ? <CardCountBadge type="red" count={sc.redCards} /> : null}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
