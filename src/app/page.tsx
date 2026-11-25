import Link from "next/link";
import { getHomePageData } from "@/server/queries/publicQueries";
import { StandingsPanel } from "@/components/StandingsPanel";
import { TeamCrest } from "@/components/TeamCrest";
import { FixtureStatusBadge } from "@/components/StatusBadges";

export const dynamic = "force-dynamic";

const REASON_LABELS: Record<string, string> = {
  YELLOW_ACCUMULATION: "Cumul cartonașe galbene",
  INDIRECT_RED: "Al doilea galben (roșu indirect)",
  DIRECT_RED: "Cartonaș roșu direct",
  COMMITTEE_DECISION: "Decizie Comisie de Disciplină",
};

function formatMatchDate(d: Date): string {
  return d.toLocaleString("ro-RO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season } = await searchParams;
  const data = await getHomePageData(season);

  if (!data.current || !data.standings) {
    return (
      <main className="container">
        <div className="panel" style={{ padding: "var(--space-6)" }}>
          <h1 className="page-title">SuperLiga României — Sezon regular</h1>
          <p className="page-meta" style={{ marginTop: "var(--space-2)" }}>
            Nu există sezoane configurate încă. Rulează migrările și seed-ul (`npm run db:seed`) pentru a încărca datele SuperLigii.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="page-head animate-enter">
        <div>
          <h1 className="page-title">
            SuperLiga României · {data.current.name}
          </h1>
          <p className="page-meta">
            Format tur–retur (16 echipe, {data.totalRounds} etape) · Etapa curentă: {data.currentRound}
          </p>
        </div>
        <span className="demo-pill">
          {data.current.status === "COMPLETED"
            ? "Sezon încheiat · Clasament oficial"
            : "Sezon activ · Clasament live"}
        </span>
      </div>

      <div className="main-grid">
        {/* Coloana stângă: Clasament + Tab-uri + Departajare D3 */}
        <StandingsPanel
          seasonName={data.current.name}
          seasonStatus={data.current.status}
          currentRound={data.currentRound}
          totalRounds={data.totalRounds}
          standings={data.standings}
          teamMeta={data.teamMeta}
          topScorers={data.topScorers}
        />

        {/* Coloana dreaptă: Etapa curentă + Suspendări active */}
        <aside className="side-stack" aria-label="Etapa curentă și rezumat disciplină">
          <section
            className="panel animate-enter"
            style={{ animationDelay: "80ms" }}
            aria-labelledby="round-heading"
          >
            <div className="panel-header">
              <h2 id="round-heading" className="panel-title">
                Etapa {data.currentRound}
              </h2>
              <Link
                className="panel-link"
                href={`/program?season=${encodeURIComponent(data.current.slug)}&round=${data.currentRound}`}
              >
                Tot programul{" "}
                <span className="arrow-glide" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>

            <div className="match-list">
              {data.roundFixtures.map((fx) => {
                const isPlayed =
                  fx.status === "PLAYED" &&
                  fx.homeGoals !== null &&
                  fx.awayGoals !== null;
                const homeLost = isPlayed && fx.homeGoals! < fx.awayGoals!;
                const awayLost = isPlayed && fx.awayGoals! < fx.homeGoals!;

                return (
                  <Link
                    key={fx.id}
                    href={`/meciuri/${fx.id}`}
                    className="match-item"
                  >
                    <div className="match-meta">
                      <span className="tabular">{formatMatchDate(fx.scheduledAt)}</span>
                      <FixtureStatusBadge status={fx.status} />
                    </div>

                    <div className="match-teams">
                      <span className="match-side match-side-home">
                        <span
                          className={`match-team-label${homeLost ? " muted-loser" : ""}`}
                        >
                          {fx.homeTeam.name}
                        </span>
                        <TeamCrest
                          slug={fx.homeTeam.slug}
                          shortName={fx.homeTeam.shortName}
                          colorA={fx.homeTeam.crestColorA}
                          colorB={fx.homeTeam.crestColorB}
                          size="xs"
                        />
                      </span>

                      <span
                        className={`score-pill tabular${!isPlayed ? " upcoming" : ""}`}
                      >
                        {isPlayed
                          ? `${fx.homeGoals} – ${fx.awayGoals}`
                          : formatTime(fx.scheduledAt)}
                      </span>

                      <span className="match-side match-side-away">
                        <TeamCrest
                          slug={fx.awayTeam.slug}
                          shortName={fx.awayTeam.shortName}
                          colorA={fx.awayTeam.crestColorA}
                          colorB={fx.awayTeam.crestColorB}
                          size="xs"
                        />
                        <span
                          className={`match-team-label${awayLost ? " muted-loser" : ""}`}
                        >
                          {fx.awayTeam.name}
                        </span>
                      </span>
                    </div>

                    <div className="match-foot">
                      <span>{fx.pitch?.name ?? "Teren nealocat"}</span>
                      <span className="match-cta">
                        Detalii{" "}
                        <span className="arrow-glide" aria-hidden="true">
                          →
                        </span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section
            className="panel animate-enter"
            style={{ animationDelay: "160ms" }}
            aria-labelledby="suspensions-heading"
          >
            <div className="panel-header">
              <h2 id="suspensions-heading" className="panel-title">
                Suspendări active
              </h2>
              <span className="demo-pill tabular">
                {data.activeSuspensions.length}{" "}
                {data.activeSuspensions.length === 1 ? "jucător" : "jucători"}
              </span>
            </div>

            {data.activeSuspensions.length === 0 ? (
              <div className="summary-list">
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  Niciun jucător suspendat activ în acest moment.
                </span>
              </div>
            ) : (
              <div className="summary-list">
                {data.activeSuspensions.map((s) => (
                  <div key={s.id} className="summary-row">
                    <div>
                      <Link href={`/jucatori/${s.playerSlug}`} className="summary-name">
                        {s.playerName}
                      </Link>
                      <span className="summary-sub">
                        {s.teamName ? `${s.teamName} · ` : ""}
                        {REASON_LABELS[s.reason] ?? s.reason}
                      </span>
                    </div>
                    <span className="status-badge status-suspended tabular">
                      {s.remainingRounds}{" "}
                      {s.remainingRounds === 1 ? "etapă" : "etape"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
