import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { getHomePageData } from "@/server/queries/publicQueries";
import { StandingsPanel } from "@/components/StandingsPanel";
import { TeamCrest } from "@/components/TeamCrest";
import { FixtureStatusBadge } from "@/components/StatusBadges";

export const dynamic = "force-dynamic";

function formatMatchDate(d: Date): string {
  return d.toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
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
      <main className="p19-container">
        <div className="p19-panel" style={{ padding: "var(--space-6)" }}>
          <h1 className="font-display" style={{ margin: 0, fontSize: "28px" }}>
            SuperLiga României — Sezon regular
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "var(--space-2)" }}>
            Nu există sezoane configurate încă. Rulează migrările și seed-ul (`npm run db:seed`) pentru a încărca datele SuperLigii.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="p19-container" style={{ display: "grid", gap: "var(--space-6)" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "var(--space-3)",
        }}
      >
        <div>
          <h1
            className="font-display"
            style={{ margin: 0, fontSize: "28px", lineHeight: "32px", fontWeight: 700 }}
          >
            SuperLiga României · {data.current.name}
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "13px" }}>
            Sezon regular (16 echipe, 30 etape tur–retur) · Regulament ROAF FRF & RD FRF
          </p>
        </div>

        <Link
          href={`/program?season=${encodeURIComponent(data.current.slug)}`}
          className="p19-btn-secondary"
          style={{ textDecoration: "none" }}
        >
          <Calendar size={14} aria-hidden="true" />
          <span>Vezi tot programul</span>
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {/* Main Standings / Form / Top Scorers panel */}
      <StandingsPanel
        seasonName={data.current.name}
        seasonStatus={data.current.status}
        standings={data.standings}
        teamMeta={data.teamMeta}
        topScorers={data.topScorers}
      />

      {/* Current Round Fixtures */}
      <section className="p19-panel" style={{ overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--space-3) var(--space-4)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <h2
            className="font-display"
            style={{ margin: 0, fontSize: "20px", lineHeight: "26px", fontWeight: 600 }}
          >
            Etapa {data.currentRound} · Meciuri
          </h2>
          <Link
            href={`/program?season=${encodeURIComponent(data.current.slug)}&round=${data.currentRound}`}
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--accent-primary)",
              textDecoration: "none",
            }}
          >
            Filtrează etapa →
          </Link>
        </div>

        <div style={{ display: "grid" }}>
          {data.roundFixtures.map((fx) => {
            const homeWon =
              fx.status === "PLAYED" &&
              fx.homeGoals !== null &&
              fx.awayGoals !== null &&
              fx.homeGoals > fx.awayGoals;
            const awayWon =
              fx.status === "PLAYED" &&
              fx.homeGoals !== null &&
              fx.awayGoals !== null &&
              fx.awayGoals > fx.homeGoals;

            return (
              <Link
                key={fx.id}
                href={`/meciuri/${fx.id}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto 1fr auto",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px var(--space-4)",
                  borderBottom: "1px solid var(--border-subtle)",
                  textDecoration: "none",
                  color: "var(--text-primary)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: "8px",
                    textAlign: "right",
                    fontWeight: homeWon ? 700 : 500,
                  }}
                >
                  <span>{fx.homeTeam.name}</span>
                  <TeamCrest
                    shortName={fx.homeTeam.shortName}
                    colorA={fx.homeTeam.crestColorA}
                    colorB={fx.homeTeam.crestColorB}
                  />
                </div>

                <div
                  className="tabular-nums"
                  style={{
                    minWidth: "68px",
                    textAlign: "center",
                    padding: "4px 8px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg-subtle)",
                    fontSize: "15px",
                    fontWeight: 700,
                  }}
                >
                  {fx.status === "PLAYED" && fx.homeGoals !== null && fx.awayGoals !== null
                    ? `${fx.homeGoals} – ${fx.awayGoals}`
                    : "vs"}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontWeight: awayWon ? 700 : 500,
                  }}
                >
                  <TeamCrest
                    shortName={fx.awayTeam.shortName}
                    colorA={fx.awayTeam.crestColorA}
                    colorB={fx.awayTeam.crestColorB}
                  />
                  <span>{fx.awayTeam.name}</span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                  }}
                >
                  <span className="tabular-nums">{formatMatchDate(fx.scheduledAt)}</span>
                  <FixtureStatusBadge status={fx.status} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
