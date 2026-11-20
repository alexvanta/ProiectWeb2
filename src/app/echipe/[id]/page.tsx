import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, MapPin } from "lucide-react";
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

  const [standings, registrations, fixtures, teamEvents] = await Promise.all([
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
        homeTeam: { select: { id: true, name: true, shortName: true } },
        awayTeam: { select: { id: true, name: true, shortName: true } },
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
  ]);

  const row = standings.rows.find((r) => r.teamId === team.id);
  const statsByPlayer = new Map<string, { goals: number; yellows: number; reds: number }>();
  for (const ev of teamEvents) {
    const s = statsByPlayer.get(ev.playerId) ?? { goals: 0, yellows: 0, reds: 0 };
    if (ev.type === "GOAL") s.goals += 1;
    else if (ev.type === "YELLOW_CARD") s.yellows += 1;
    else if (ev.type === "SECOND_YELLOW_RED" || ev.type === "DIRECT_RED") s.reds += 1;
    statsByPlayer.set(ev.playerId, s);
  }

  return (
    <main className="p19-container" style={{ display: "grid", gap: "var(--space-6)" }}>
      {/* Team Header */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
            <TeamCrest
              shortName={team.shortName}
              colorA={team.crestColorA}
              colorB={team.crestColorB}
              size="lg"
            />
            <div>
              <h1 className="font-display" style={{ margin: 0, fontSize: "28px", lineHeight: "32px" }}>
                {team.name}
              </h1>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "12px",
                  marginTop: "6px",
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                }}
              >
                <span>{current.name}</span>
                {team.homePitch ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <MapPin size={13} aria-hidden="true" />
                    {team.homePitch.name} ({team.homePitch.city})
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <a
            href={`/api/ical/${encodeURIComponent(current.id)}/${encodeURIComponent(team.id)}`}
            className="p19-btn-primary"
            style={{ textDecoration: "none" }}
          >
            <Download size={15} aria-hidden="true" />
            <span>Export iCal (.ics)</span>
          </a>
        </div>

        {row ? (
          <div
            style={{
              marginTop: "var(--space-4)",
              paddingTop: "var(--space-4)",
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-4)",
            }}
          >
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
              {[
                { label: "Poziție", val: `#${row.position}` },
                { label: "Puncte", val: String(row.points) },
                { label: "MJ", val: String(row.played) },
                { label: "V-E-Î", val: `${row.won}-${row.drawn}-${row.lost}` },
                { label: "Golaveraj", val: `${row.goalsFor}:${row.goalsAgainst} (${row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference})` },
              ].map((kpi) => (
                <div key={kpi.label}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{kpi.label}</div>
                  <div className="tabular-nums font-display" style={{ fontSize: "20px", fontWeight: 700 }}>
                    {kpi.val}
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
                Formă ultimele 5 meciuri
              </div>
              <FormStrip teamId={team.id} entries={row.lastFiveForm} />
            </div>
          </div>
        ) : null}
      </section>

      {/* Squad Table */}
      <section className="p19-panel" style={{ overflow: "hidden" }}>
        <div style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--border-subtle)" }}>
          <h2 className="font-display" style={{ margin: 0, fontSize: "20px" }}>
            Lot sezon {current.name} ({registrations.length} jucători)
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
                <th style={{ padding: "8px 10px", textAlign: "center", width: "44px" }}>Nr.</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Jucător</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Post</th>
                <th style={{ padding: "8px 10px", textAlign: "right" }}>Goluri</th>
                <th style={{ padding: "8px 10px", textAlign: "right" }}>Cartonașe</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>Eligibilitate</th>
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
                  <tr
                    key={reg.id}
                    style={{
                      height: "var(--row-height-dense)",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <td className="tabular-nums" style={{ padding: "6px 10px", textAlign: "center", color: "var(--text-muted)" }}>
                      {reg.shirtNumber ?? "—"}
                    </td>
                    <td style={{ padding: "6px 10px" }}>
                      <Link
                        href={`/jucatori/${reg.player.slug}`}
                        style={{ fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}
                      >
                        {reg.player.fullName}
                      </Link>
                      {reg.isCaptain ? (
                        <span
                          style={{
                            marginLeft: "6px",
                            padding: "1px 5px",
                            borderRadius: "4px",
                            background: "var(--bg-subtle)",
                            fontSize: "10.5px",
                            fontWeight: 700,
                            color: "var(--accent-primary)",
                          }}
                        >
                          C
                        </span>
                      ) : null}
                    </td>
                    <td style={{ padding: "6px 10px", color: "var(--text-secondary)" }}>
                      {reg.player.position}
                    </td>
                    <td className="tabular-nums" style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600 }}>
                      {st.goals}
                    </td>
                    <td style={{ padding: "6px 10px", textAlign: "right" }}>
                      <span style={{ display: "inline-flex", gap: "6px" }}>
                        {st.yellows > 0 ? <CardCountBadge type="yellow" count={st.yellows} /> : null}
                        {st.reds > 0 ? <CardCountBadge type="red" count={st.reds} /> : null}
                        {st.yellows === 0 && st.reds === 0 ? "—" : null}
                      </span>
                    </td>
                    <td style={{ padding: "6px 12px", textAlign: "right" }}>
                      <EligibilityBadge suspendedRounds={activeBan} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Team Fixtures */}
      <section className="p19-panel" style={{ overflow: "hidden" }}>
        <div style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--border-subtle)" }}>
          <h2 className="font-display" style={{ margin: 0, fontSize: "20px" }}>
            Program & rezultate ({fixtures.length} meciuri)
          </h2>
        </div>
        <div>
          {fixtures.map((fx) => (
            <Link
              key={fx.id}
              href={`/meciuri/${fx.id}`}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                padding: "9px var(--space-4)",
                borderBottom: "1px solid var(--border-subtle)",
                textDecoration: "none",
                color: "var(--text-primary)",
                fontSize: "13px",
              }}
            >
              <span className="tabular-nums" style={{ color: "var(--text-muted)", minWidth: "70px" }}>
                Etapa {fx.roundNumber}
              </span>
              <span style={{ flex: 1, fontWeight: 600 }}>
                {fx.homeTeam.name} – {fx.awayTeam.name}
              </span>
              <span className="tabular-nums" style={{ fontWeight: 700, minWidth: "56px", textAlign: "center" }}>
                {fx.status === "PLAYED" && fx.homeGoals !== null && fx.awayGoals !== null
                  ? `${fx.homeGoals} – ${fx.awayGoals}`
                  : "vs"}
              </span>
              <FixtureStatusBadge status={fx.status} />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
