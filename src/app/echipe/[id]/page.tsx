import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { resolveSeason } from "@/server/queries/publicQueries";
import { getSeasonStandings } from "@/server/services/standingsService";
import { TeamCrest } from "@/components/TeamCrest";
import { FormStrip } from "@/components/FormStrip";
import {
  CardCountBadge,
  EligibilityBadge,
  FixtureStatusBadge,
} from "@/components/StatusBadges";

export const dynamic = "force-dynamic";

export default async function TeamProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const { id } = await params;
  const { season } = await searchParams;
  const { current } = await resolveSeason(season);

  const team = await prisma.team.findFirst({
    where: { OR: [{ slug: id }, { id }] },
    include: { homePitch: true },
  });

  if (!team || !current) notFound();

  const [standings, registrations, fixtures, teamEvents, allSeasonTeams] = await Promise.all([
    getSeasonStandings(current.id),
    prisma.playerSeasonRegistration.findMany({
      where: { seasonId: current.id, teamId: team.id, leftAt: null },
      include: {
        player: {
          include: {
            suspensions: { where: { remainingRounds: { gt: 0 } } },
          },
        },
      },
      orderBy: [{ isCaptain: "desc" }, { shirtNumber: "asc" }],
    }),
    prisma.fixture.findMany({
      where: {
        seasonId: current.id,
        OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
      },
      include: {
        homeTeam: {
          select: { id: true, name: true, shortName: true, slug: true, crestColorA: true, crestColorB: true },
        },
        awayTeam: {
          select: { id: true, name: true, shortName: true, slug: true, crestColorA: true, crestColorB: true },
        },
      },
      orderBy: [{ roundNumber: "asc" }, { scheduledAt: "asc" }],
    }),
    prisma.matchEvent.findMany({
      where: {
        teamId: team.id,
        fixture: { seasonId: current.id, status: "PLAYED" },
        isAnnulled: false,
      },
    }),
    prisma.seasonTeam.findMany({
      where: { seasonId: current.id },
      include: {
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
    }),
  ]);

  const row = standings.rows.find((r) => r.teamId === team.id);
  const captainReg = registrations.find((r) => r.isCaptain);
  const teamMetaMap = new Map(allSeasonTeams.map((st) => [st.team.id, st.team]));

  const statsByPlayer = new Map<string, { goals: number; yellows: number; reds: number }>();
  for (const ev of teamEvents) {
    const s = statsByPlayer.get(ev.playerId) ?? { goals: 0, yellows: 0, reds: 0 };
    if (ev.type === "GOAL") s.goals += 1;
    else if (ev.type === "YELLOW_CARD") s.yellows += 1;
    else if (ev.type === "SECOND_YELLOW_RED" || ev.type === "DIRECT_RED") s.reds += 1;
    statsByPlayer.set(ev.playerId, s);
  }

  return (
    <main className="container">
      {/* Team Hero Banner (DS-p19-team-profile) */}
      <section className="team-hero animate-enter" aria-labelledby="team-heading">
        <div className="team-hero-main">
          <TeamCrest
            slug={team.slug}
            shortName={team.shortName}
            colorA={team.crestColorA}
            colorB={team.crestColorB}
            size="lg"
          />
          <div>
            <h1 id="team-heading" className="page-title">
              {team.name}
            </h1>
            <p className="page-meta">
              {current.name}
              {team.homePitch ? ` · Teren gazdă: ${team.homePitch.name} (${team.homePitch.city})` : ""}
              {captainReg ? ` · Căpitan: ${captainReg.player.fullName}` : ""}
            </p>
          </div>
        </div>

        <div className="team-hero-controls">
          {row ? (
            <div className="team-kpi-row">
              <span className="kpi-chip tabular">
                Loc: <strong>#{row.position}</strong>
              </span>
              <span className="kpi-chip tabular">
                Puncte: <strong>{row.points} pct</strong>
              </span>
              <span className="kpi-chip tabular">
                Bilanț:{" "}
                <strong>
                  {row.won}V · {row.drawn}E · {row.lost}Î
                </strong>
              </span>
            </div>
          ) : null}
          <a
            href={`/api/ical/${encodeURIComponent(current.id)}/${encodeURIComponent(team.id)}`}
            className="btn btn-secondary"
          >
            <Calendar size={15} aria-hidden="true" />
            <span>Export iCal (.ics)</span>
          </a>
        </div>
      </section>

      <div className="main-grid">
        {/* Left Column: Squad + Fixtures */}
        <div style={{ display: "grid", gap: "var(--space-5)" }}>
          {/* Squad Table */}
          <section className="panel animate-enter" style={{ animationDelay: "40ms" }}>
            <div className="panel-header">
              <h2 className="panel-title">Lot sezon {current.name}</h2>
              <span className="demo-pill tabular">{registrations.length} jucători</span>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col" className="col-center" style={{ width: "48px" }}>#</th>
                    <th scope="col">Jucător</th>
                    <th scope="col" className="col-hide-sm">Post</th>
                    <th scope="col" className="col-num">Goluri</th>
                    <th scope="col" className="col-center col-hide-sm">Cartonașe</th>
                    <th scope="col" className="col-num">Eligibilitate</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg) => {
                    const st = statsByPlayer.get(reg.playerId) ?? { goals: 0, yellows: 0, reds: 0 };
                    const activeBan = reg.player.suspensions.reduce(
                      (acc, s) => acc + s.remainingRounds,
                      0,
                    );
                    return (
                      <tr key={reg.id}>
                        <td className="col-center">
                          <span className="jersey-num tabular">{reg.shirtNumber ?? "—"}</span>
                        </td>
                        <td>
                          <Link
                            href={`/jucatori/${reg.player.slug}`}
                            style={{ fontWeight: 600, color: "var(--text-primary)" }}
                          >
                            {reg.player.fullName}
                          </Link>
                          {reg.isCaptain ? <span className="captain-tag">C</span> : null}
                        </td>
                        <td className="col-hide-sm">{reg.player.position}</td>
                        <td className="col-num tabular" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {st.goals}
                        </td>
                        <td className="col-center col-hide-sm">
                          <span style={{ display: "inline-flex", gap: "6px" }}>
                            {st.yellows > 0 ? <CardCountBadge type="yellow" count={st.yellows} /> : null}
                            {st.reds > 0 ? <CardCountBadge type="red" count={st.reds} /> : null}
                            {st.yellows === 0 && st.reds === 0 ? "—" : null}
                          </span>
                        </td>
                        <td className="col-num">
                          <EligibilityBadge suspendedRounds={activeBan} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span>Suspendările se aplică automat pe server la depunerea foii de meci (D-005)</span>
              <span>C = Căpitan</span>
            </div>
          </section>

          {/* Team Fixtures */}
          <section className="panel animate-enter" style={{ animationDelay: "80ms" }}>
            <div className="panel-header">
              <h2 className="panel-title">Program &amp; rezultate</h2>
              <span className="demo-pill tabular">{fixtures.length} meciuri</span>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Etapă</th>
                    <th scope="col">Meci</th>
                    <th scope="col" className="col-center">Scor</th>
                    <th scope="col" className="col-num">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fixtures.map((fx) => {
                    const isPlayed =
                      fx.status === "PLAYED" &&
                      fx.homeGoals !== null &&
                      fx.awayGoals !== null;
                    return (
                      <tr key={fx.id}>
                        <td className="tabular" style={{ fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                          Etapa {fx.roundNumber}
                        </td>
                        <td>
                          <Link
                            href={`/meciuri/${fx.id}`}
                            className="team-cell"
                            style={{ fontWeight: 600, color: "var(--text-primary)", flexWrap: "wrap" }}
                          >
                            <TeamCrest
                              slug={fx.homeTeam.slug}
                              shortName={fx.homeTeam.shortName}
                              colorA={fx.homeTeam.crestColorA}
                              colorB={fx.homeTeam.crestColorB}
                              size="xs"
                            />
                            <span>{fx.homeTeam.name}</span>
                            <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>–</span>
                            <TeamCrest
                              slug={fx.awayTeam.slug}
                              shortName={fx.awayTeam.shortName}
                              colorA={fx.awayTeam.crestColorA}
                              colorB={fx.awayTeam.crestColorB}
                              size="xs"
                            />
                            <span>{fx.awayTeam.name}</span>
                          </Link>
                        </td>
                        <td className="col-center">
                          <span className={`score-pill tabular${!isPlayed ? " upcoming" : ""}`}>
                            {isPlayed ? `${fx.homeGoals} – ${fx.awayGoals}` : "vs"}
                          </span>
                        </td>
                        <td className="col-num">
                          <FixtureStatusBadge status={fx.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right Sidebar: Season Summary + Team Directory */}
        <aside className="side-stack">
          {row ? (
            <section className="panel animate-enter" style={{ animationDelay: "100ms" }}>
              <div className="panel-header">
                <h2 className="panel-title">Sumar sezon</h2>
                <span className="demo-pill tabular">#{row.position}</span>
              </div>
              <div className="summary-list">
                <div className="summary-row">
                  <span className="summary-label">Meciuri jucate</span>
                  <span className="summary-val tabular">{row.played}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Golaveraj</span>
                  <span className="summary-val tabular">
                    {row.goalsFor}:{row.goalsAgainst} (
                    {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference})
                  </span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Puncte</span>
                  <span className="summary-val tabular">{row.points}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Formă (5)</span>
                  <FormStrip teamId={team.id} teamName={team.name} entries={row.lastFiveForm} />
                </div>
              </div>
            </section>
          ) : null}

          <section className="panel animate-enter" style={{ animationDelay: "140ms" }}>
            <div className="panel-header">
              <h2 className="panel-title">Echipe {current.name}</h2>
              <span className="demo-pill tabular">{standings.rows.length}</span>
            </div>
            <div className="team-directory">
              {standings.rows.map((r) => {
                const tm = teamMetaMap.get(r.teamId);
                if (!tm) return null;
                const isSelected = r.teamId === team.id;
                return (
                  <Link
                    key={r.teamId}
                    href={`/echipe/${tm.slug}?season=${encodeURIComponent(current.slug)}`}
                    className={`team-dir-link${isSelected ? " is-selected" : ""}`}
                  >
                    <span className="team-cell">
                      <TeamCrest
                        slug={tm.slug}
                        shortName={tm.shortName}
                        colorA={tm.crestColorA}
                        colorB={tm.crestColorB}
                        size="xs"
                      />
                      <span className="team-name" style={{ fontWeight: 600 }}>
                        {tm.name}
                      </span>
                    </span>
                    <span className="tabular" style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)" }}>
                      #{r.position} · {r.points}p
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
