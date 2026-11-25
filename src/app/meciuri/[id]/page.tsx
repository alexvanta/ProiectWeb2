import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TeamCrest } from "@/components/TeamCrest";
import { FixtureStatusBadge } from "@/components/StatusBadges";
import { AlertBanner } from "@/components/AlertBanner";

export const dynamic = "force-dynamic";

const EVENT_LABELS: Record<string, string> = {
  GOAL: "Gol",
  OWN_GOAL: "Autogol",
  YELLOW_CARD: "Cartonaș galben",
  SECOND_YELLOW_RED: "Al doilea galben (Roșu indirect)",
  DIRECT_RED: "Cartonaș roșu direct",
};

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const fixture = await prisma.fixture.findUnique({
    where: { id },
    include: {
      season: { select: { id: true, name: true, slug: true } },
      homeTeam: true,
      awayTeam: true,
      pitch: true,
      events: {
        include: {
          player: { select: { id: true, fullName: true, slug: true } },
        },
        orderBy: [{ minute: "asc" }, { createdAt: "asc" }],
      },
      matchSheets: {
        include: {
          team: { select: { id: true, name: true } },
          entries: {
            include: {
              player: { select: { id: true, fullName: true, slug: true, position: true } },
            },
            orderBy: [{ isStarter: "desc" }, { shirtNumber: "asc" }],
          },
        },
      },
      correctionAudits: {
        include: { actor: { select: { name: true, role: true } } },
        orderBy: { createdAt: "desc" },
      },
      retroactiveAlerts: {
        where: { status: "OPEN" },
        include: { player: { select: { fullName: true } } },
      },
    },
  });

  if (!fixture) notFound();

  const homeSheet = fixture.matchSheets.find((ms) => ms.teamId === fixture.homeTeamId);
  const awaySheet = fixture.matchSheets.find((ms) => ms.teamId === fixture.awayTeamId);
  const isPlayed =
    fixture.status === "PLAYED" &&
    fixture.homeGoals !== null &&
    fixture.awayGoals !== null;

  const firstHalfEvents = fixture.events.filter((e) => e.minute <= 45);
  const secondHalfEvents = fixture.events.filter((e) => e.minute > 45);

  const renderEventItem = (ev: (typeof fixture.events)[number]) => {
    const isHome = ev.teamId === fixture.homeTeamId;
    const isYellow = ev.type === "YELLOW_CARD";
    const isRed = ev.type === "SECOND_YELLOW_RED" || ev.type === "DIRECT_RED";

    const card = (
      <div
        className="tl-card"
        style={{
          opacity: ev.isAnnulled ? 0.55 : 1,
          textDecoration: ev.isAnnulled ? "line-through" : "none",
        }}
      >
        {isYellow ? (
          <span className="card-glyph card-glyph-yellow" aria-label="Cartonaș galben" />
        ) : isRed ? (
          <span className="card-glyph card-glyph-red" aria-label="Cartonaș roșu" />
        ) : (
          <span className="goal-dot" aria-label="Gol">
            G
          </span>
        )}
        <div>
          <Link href={`/jucatori/${ev.player.slug}`} className="tl-player">
            {ev.player.fullName}
          </Link>
          <span className="tl-sub">{EVENT_LABELS[ev.type] ?? ev.type}</span>
        </div>
      </div>
    );

    return (
      <li key={ev.id} className="tl-item">
        <div className="tl-slot-home">{isHome ? card : null}</div>
        <span className="tl-min tabular">{ev.minute}&apos;</span>
        <div className="tl-slot-away">{!isHome ? card : null}</div>
      </li>
    );
  };

  return (
    <main className="container" style={{ display: "grid", gap: "var(--space-5)" }}>
      <nav className="breadcrumb animate-enter" aria-label="Cale de navigare" style={{ marginBottom: 0 }}>
        <Link href={`/program?season=${encodeURIComponent(fixture.season.slug)}`}>
          Program meciuri
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/program?season=${encodeURIComponent(fixture.season.slug)}&round=${fixture.roundNumber}`}
        >
          Etapa {fixture.roundNumber}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">
          {fixture.homeTeam.name} – {fixture.awayTeam.name}
        </span>
      </nav>

      {/* Scoreboard Hero with stadium radial glow (DS-p19-match-detail) */}
      <section className="scoreboard animate-enter" style={{ animationDelay: "40ms" }} aria-label="Rezumat scor meci">
        <div className="scoreboard-top">
          <span className="tabular">
            {fixture.season.name} · Etapa {fixture.roundNumber} ·{" "}
            {fixture.scheduledAt.toLocaleString("ro-RO", {
              weekday: "long",
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {fixture.pitch ? ` · ${fixture.pitch.name}` : ""}
          </span>
          <div className="scoreboard-badges">
            <FixtureStatusBadge status={fixture.status} />
            {fixture.correctionAudits.length > 0 ? (
              <span className="status-badge status-corrected tabular">
                {fixture.correctionAudits.length}{" "}
                {fixture.correctionAudits.length === 1 ? "corecție rezultat" : "corecții rezultat"}
              </span>
            ) : null}
          </div>
        </div>

        <div className="scoreboard-main">
          <div className="sb-team sb-team-home">
            <Link href={`/echipe/${fixture.homeTeam.slug}`} className="sb-team-row">
              <span className="sb-team-name">{fixture.homeTeam.name}</span>
              <TeamCrest
                slug={fixture.homeTeam.slug}
                shortName={fixture.homeTeam.shortName}
                colorA={fixture.homeTeam.crestColorA}
                colorB={fixture.homeTeam.crestColorB}
                size="sb"
              />
            </Link>
          </div>

          <div className="sb-score-block">
            <h1 className="sb-score tabular">
              {isPlayed ? (
                <>
                  {fixture.homeGoals} <span className="sb-score-sep">–</span> {fixture.awayGoals}
                </>
              ) : (
                "vs"
              )}
            </h1>
          </div>

          <div className="sb-team sb-team-away">
            <Link href={`/echipe/${fixture.awayTeam.slug}`} className="sb-team-row">
              <TeamCrest
                slug={fixture.awayTeam.slug}
                shortName={fixture.awayTeam.shortName}
                colorA={fixture.awayTeam.crestColorA}
                colorB={fixture.awayTeam.crestColorB}
                size="sb"
              />
              <span className="sb-team-name">{fixture.awayTeam.name}</span>
            </Link>
          </div>
        </div>

        <div className="scoreboard-foot">
          <span>
            Competiție: <strong>SuperLiga României · {fixture.season.name}</strong>
          </span>
          <span className="mono">
            Actualizat: {fixture.updatedAt.toISOString().replace("T", " ").slice(0, 19)} UTC
          </span>
        </div>
      </section>

      {/* Open Retroactive Suspension Alerts (D-005) */}
      {fixture.retroactiveAlerts.map((alert) => (
        <AlertBanner
          key={alert.id}
          variant="retroactive"
          title={`Alertă suspendare retroactivă · ${alert.player.fullName}`}
          roleChip="Vizibil: Arbitru / Organizator & Admin"
          description={alert.description}
          action={
            fixture.correctionAudits.length > 0 ? (
              <a href="#istoric-corectii" className="btn btn-alert">
                Vezi istoricul corecțiilor
              </a>
            ) : undefined
          }
        />
      ))}

      {/* Vertical Centered Timeline + Validated Match Sheets */}
      <div className="detail-grid">
        <section className="panel animate-enter" style={{ animationDelay: "100ms" }}>
          <div className="panel-header panel-header-subtle">
            <h2 className="panel-title">Evenimente de meci</h2>
            <span className="status-badge status-neutral tabular">
              {fixture.events.length} evenimente
            </span>
          </div>

          {fixture.events.length === 0 ? (
            <div style={{ padding: "var(--space-5)", color: "var(--text-muted)", fontSize: "13px" }}>
              Nu există evenimente (goluri sau cartonașe) înregistrate pentru acest meci.
            </div>
          ) : (
            <>
              <div className="timeline-header" aria-hidden="true">
                <span className="tl-head-home">{fixture.homeTeam.name}</span>
                <span>Min.</span>
                <span className="tl-head-away">{fixture.awayTeam.name}</span>
              </div>
              <ol className="timeline">
                {firstHalfEvents.map(renderEventItem)}
                {firstHalfEvents.length > 0 && secondHalfEvents.length > 0 ? (
                  <li className="tl-divider">
                    <span className="tl-divider-pill">PAUZĂ</span>
                  </li>
                ) : null}
                {secondHalfEvents.map(renderEventItem)}
              </ol>
            </>
          )}
        </section>

        <section className="panel animate-enter" style={{ animationDelay: "140ms" }}>
          <div className="panel-header panel-header-subtle">
            <h2 className="panel-title">Foi de meci validate</h2>
            <span className="status-badge status-played">Eligibilitate verificată pe server</span>
          </div>

          <div className="sheets-grid">
            {[
              { team: fixture.homeTeam, sheet: homeSheet },
              { team: fixture.awayTeam, sheet: awaySheet },
            ].map(({ team, sheet }) => (
              <div key={team.id} className="sheet-col">
                <div className="sheet-team-head">
                  <span className="sheet-team-label">
                    <TeamCrest
                      slug={team.slug}
                      shortName={team.shortName}
                      colorA={team.crestColorA}
                      colorB={team.crestColorB}
                      size="md"
                    />
                    <span>{team.name}</span>
                  </span>
                  <span className="status-badge status-neutral tabular">
                    {sheet?.entries.length ?? 0} jucători
                  </span>
                </div>

                {!sheet || sheet.entries.length === 0 ? (
                  <div style={{ padding: "var(--space-4)", color: "var(--text-muted)", fontSize: "13px" }}>
                    Foaia de meci nu a fost depusă încă.
                  </div>
                ) : (
                  <table className="roster">
                    <tbody>
                      {sheet.entries.map((entry) => (
                        <tr key={entry.id}>
                          <td className="jersey tabular">{entry.shirtNumber ?? "—"}</td>
                          <td>
                            <Link
                              href={`/jucatori/${entry.player.slug}`}
                              style={{ fontWeight: 500, color: "var(--text-primary)" }}
                            >
                              {entry.player.fullName}
                            </Link>
                          </td>
                          <td style={{ textAlign: "right", fontSize: "11.5px", color: "var(--text-muted)" }}>
                            {entry.isStarter ? "Titular" : "Rezervă"} · {entry.player.position}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Public Result Corrections Audit History (D-005) */}
      {fixture.correctionAudits.length > 0 ? (
        <section id="istoric-corectii" className="panel animate-enter" style={{ animationDelay: "180ms" }}>
          <div className="panel-header panel-header-subtle">
            <h2 className="panel-title">Istoric corecții rezultat</h2>
            <span className="status-badge status-corrected">Audit imutabil (before / after)</span>
          </div>

          <div className="audit-body" style={{ display: "grid", gap: "var(--space-4)" }}>
            {fixture.correctionAudits.map((audit, idx) => (
              <div key={audit.id}>
                <div className="audit-meta">
                  <span>
                    <strong>Corecție #{fixture.correctionAudits.length - idx}</strong> · Autor:{" "}
                    <strong>{audit.actor.name}</strong>
                  </span>
                  <span className="mono">
                    {audit.createdAt.toISOString().replace("T", " ").slice(0, 19)} UTC
                  </span>
                </div>
                <p className="audit-reason">
                  <strong>Motiv:</strong> {audit.reason}
                </p>
                <div className="diff-grid">
                  <pre className="mono diff-box diff-before">
                    {`BEFORE: ${JSON.stringify(audit.beforeSnapshot, null, 2)}`}
                  </pre>
                  <pre className="mono diff-box diff-after">
                    {`AFTER: ${JSON.stringify(audit.afterSnapshot, null, 2)}`}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
