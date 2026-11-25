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
      <main className="container">
        <div className="panel" style={{ padding: "var(--space-6)" }}>
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
    <main className="container">
      <div className="page-head animate-enter">
        <div>
          <h1 className="page-title">Statistici &amp; Suspendări active · {current.name}</h1>
          <p className="page-meta">
            Top marcatori, situația cartonașelor și jucătorii suspendați activ (inclusiv suspendări reportate între sezoane).
          </p>
        </div>
        <span className="demo-pill tabular">
          {activeSuspensions.length} suspendări active
        </span>
      </div>

      <div style={{ display: "grid", gap: "var(--space-6)" }}>
        {/* Active Suspensions */}
        <section className="panel animate-enter" style={{ animationDelay: "40ms" }}>
          <div className="panel-header">
            <h2 className="panel-title">Suspendări active</h2>
            <span className="demo-pill tabular">{activeSuspensions.length} jucători</span>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Jucător</th>
                  <th scope="col">Echipă curentă</th>
                  <th scope="col">Motiv</th>
                  <th scope="col" className="col-hide-sm">Origine</th>
                  <th scope="col" className="col-num">Status</th>
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
                      <tr key={s.id}>
                        <td>
                          <Link
                            href={`/jucatori/${s.player.slug}`}
                            style={{ fontWeight: 600, color: "var(--text-primary)" }}
                          >
                            {s.player.fullName}
                          </Link>
                        </td>
                        <td>
                          {team ? (
                            <Link href={`/echipe/${team.slug}`} className="team-cell">
                              <TeamCrest
                                slug={team.slug}
                                shortName={team.shortName}
                                colorA={team.crestColorA}
                                colorB={team.crestColorB}
                                size="xs"
                              />
                              <span className="team-name">{team.name}</span>
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{REASON_LABELS[s.reason] ?? s.reason}</td>
                        <td className="col-hide-sm" style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                          {s.originSeason.name}
                          {s.originSeasonId !== current.id ? " (Reportată)" : ""}
                        </td>
                        <td className="col-num">
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
            alignItems: "start",
          }}
        >
          {/* Top Scorers */}
          <section className="panel animate-enter" style={{ animationDelay: "80ms" }}>
            <div className="panel-header">
              <h2 className="panel-title">Top marcatori</h2>
              <span className="demo-pill tabular">Top {topScorers.length}</span>
            </div>
            <div className="table-wrap">
              <table className="scorers">
                <thead>
                  <tr>
                    <th scope="col" className="col-pos">#</th>
                    <th scope="col" className="col-player">Jucător</th>
                    <th scope="col" style={{ textAlign: "left" }}>Echipă</th>
                    <th scope="col" className="col-goals">Goluri</th>
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
                      const rankCls =
                        rank === 1
                          ? "scorer-rank-1"
                          : rank === 2
                            ? "scorer-rank-2"
                            : rank === 3
                              ? "scorer-rank-3"
                              : "";
                      return (
                        <tr key={sc.playerId} className={rankCls || undefined}>
                          <td className="col-pos">
                            <span className="pos-badge">{rank}</span>
                          </td>
                          <td>
                            <Link
                              href={`/jucatori/${sc.playerSlug}`}
                              style={{ fontWeight: 600, color: "var(--text-primary)" }}
                            >
                              {sc.playerName}
                            </Link>
                          </td>
                          <td>
                            <Link
                              href={`/echipe/${sc.teamSlug}`}
                              className="team-cell"
                              style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                            >
                              <TeamCrest
                                slug={sc.teamSlug}
                                shortName={sc.teamShortName}
                                colorA={sc.crestColorA}
                                colorB={sc.crestColorB}
                                size="xs"
                              />
                              <span className="team-name">{sc.teamName}</span>
                            </Link>
                          </td>
                          <td className="col-goals tabular">{sc.goals}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Cards Leaderboard */}
          <section className="panel animate-enter" style={{ animationDelay: "120ms" }}>
            <div className="panel-header">
              <h2 className="panel-title">Disciplină &amp; cartonașe</h2>
              <span className="demo-pill tabular">{topCards.length} jucători</span>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Jucător</th>
                    <th scope="col">Echipă</th>
                    <th scope="col" className="col-num">Cartonașe</th>
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
                      <tr key={sc.playerId}>
                        <td>
                          <Link
                            href={`/jucatori/${sc.playerSlug}`}
                            style={{ fontWeight: 600, color: "var(--text-primary)" }}
                          >
                            {sc.playerName}
                          </Link>
                        </td>
                        <td>
                          <Link
                            href={`/echipe/${sc.teamSlug}`}
                            className="team-cell"
                            style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                          >
                            <TeamCrest
                              slug={sc.teamSlug}
                              shortName={sc.teamShortName}
                              colorA={sc.crestColorA}
                              colorB={sc.crestColorB}
                              size="xs"
                            />
                            <span className="team-name">{sc.teamName}</span>
                          </Link>
                        </td>
                        <td className="col-num">
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
      </div>
    </main>
  );
}
