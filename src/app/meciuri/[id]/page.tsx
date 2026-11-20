import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, MapPin } from "lucide-react";
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

  return (
    <main className="p19-container" style={{ display: "grid", gap: "var(--space-6)" }}>
      {/* Scoreboard Hero with stadium radial glow */}
      <section
        className="p19-panel"
        style={{
          padding: "var(--space-6)",
          backgroundImage: "var(--hero-glow)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            fontSize: "12px",
            color: "var(--text-muted)",
            marginBottom: "var(--space-4)",
          }}
        >
          <span>{fixture.season.name}</span>
          <span>·</span>
          <span>Etapa {fixture.roundNumber}</span>
          <span>·</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Calendar size={13} aria-hidden="true" />
            {fixture.scheduledAt.toLocaleString("ro-RO", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {fixture.pitch ? (
            <>
              <span>·</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <MapPin size={13} aria-hidden="true" />
                {fixture.pitch.name}
              </span>
            </>
          ) : null}
          <FixtureStatusBadge status={fixture.status} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            gap: "var(--space-4)",
          }}
        >
          <Link
            href={`/echipe/${fixture.homeTeam.slug}`}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              textDecoration: "none",
              color: "var(--text-primary)",
            }}
          >
            <TeamCrest
              shortName={fixture.homeTeam.shortName}
              colorA={fixture.homeTeam.crestColorA}
              colorB={fixture.homeTeam.crestColorB}
              size="lg"
            />
            <span className="font-display" style={{ fontSize: "20px", fontWeight: 700 }}>
              {fixture.homeTeam.name}
            </span>
          </Link>

          <h1
            className="font-display tabular-nums"
            style={{
              margin: 0,
              fontSize: "46px",
              lineHeight: "48px",
              fontWeight: 700,
              letterSpacing: "0.02em",
            }}
          >
            {fixture.status === "PLAYED" &&
            fixture.homeGoals !== null &&
            fixture.awayGoals !== null
              ? `${fixture.homeGoals} – ${fixture.awayGoals}`
              : "vs"}
          </h1>

          <Link
            href={`/echipe/${fixture.awayTeam.slug}`}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              textDecoration: "none",
              color: "var(--text-primary)",
            }}
          >
            <TeamCrest
              shortName={fixture.awayTeam.shortName}
              colorA={fixture.awayTeam.crestColorA}
              colorB={fixture.awayTeam.crestColorB}
              size="lg"
            />
            <span className="font-display" style={{ fontSize: "20px", fontWeight: 700 }}>
              {fixture.awayTeam.name}
            </span>
          </Link>
        </div>
      </section>

      {/* Open Retroactive Suspension Alerts (D-005) */}
      {fixture.retroactiveAlerts.map((alert) => (
        <AlertBanner
          key={alert.id}
          variant="retroactive"
          title={`Alertă suspendare retroactivă · ${alert.player.fullName}`}
          description={alert.description}
        />
      ))}

      {/* Chronological Event Timeline */}
      <section className="p19-panel" style={{ padding: "var(--space-5)" }}>
        <h2 className="font-display" style={{ margin: "0 0 var(--space-4)", fontSize: "20px" }}>
          Cronologia evenimentelor
        </h2>
        {fixture.events.length === 0 ? (
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px" }}>
            Nu există evenimente (goluri sau cartonașe) înregistrate pentru acest meci.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {fixture.events.map((ev) => {
              const isHome = ev.teamId === fixture.homeTeamId;
              const isYellow = ev.type === "YELLOW_CARD";
              const isRed = ev.type === "SECOND_YELLOW_RED" || ev.type === "DIRECT_RED";

              const eventBadge = (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "6px 10px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-subtle)",
                    fontSize: "13px",
                    opacity: ev.isAnnulled ? 0.55 : 1,
                    textDecoration: ev.isAnnulled ? "line-through" : "none",
                  }}
                >
                  {isYellow ? (
                    <span
                      aria-hidden="true"
                      style={{
                        width: "10px",
                        height: "13px",
                        borderRadius: "2px",
                        background: "var(--card-yellow-fill)",
                        border: "1px solid var(--card-yellow-border)",
                      }}
                    />
                  ) : isRed ? (
                    <span
                      aria-hidden="true"
                      style={{
                        width: "10px",
                        height: "13px",
                        borderRadius: "2px",
                        background: "var(--card-red-fill)",
                      }}
                    />
                  ) : (
                    <span aria-hidden="true">⚽</span>
                  )}
                  <Link
                    href={`/jucatori/${ev.player.slug}`}
                    style={{ fontWeight: 600, color: "var(--text-primary)", textDecoration: "none" }}
                  >
                    {ev.player.fullName}
                  </Link>
                  <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                    ({EVENT_LABELS[ev.type] ?? ev.type})
                  </span>
                </div>
              );

              return (
                <div
                  key={ev.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto 1fr",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div style={{ textAlign: "right" }}>{isHome ? eventBadge : null}</div>
                  <span
                    className="tabular-nums"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "40px",
                      height: "24px",
                      borderRadius: "var(--radius-full)",
                      background: "var(--accent-primary)",
                      color: "var(--accent-primary-fg)",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    {ev.minute}&apos;
                  </span>
                  <div style={{ textAlign: "left" }}>{!isHome ? eventBadge : null}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Match Sheets */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        {[
          { label: fixture.homeTeam.name, sheet: homeSheet },
          { label: fixture.awayTeam.name, sheet: awaySheet },
        ].map(({ label, sheet }) => (
          <div key={label} className="p19-panel" style={{ padding: "var(--space-4)" }}>
            <h2 className="font-display" style={{ margin: "0 0 var(--space-3)", fontSize: "18px" }}>
              Foaie de meci · {label}
            </h2>
            {!sheet || sheet.entries.length === 0 ? (
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px" }}>
                Foaia de meci nu a fost depusă încă.
              </p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "6px" }}>
                {sheet.entries.map((entry) => (
                  <li
                    key={entry.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 8px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-subtle)",
                      fontSize: "13px",
                    }}
                  >
                    <Link
                      href={`/jucatori/${entry.player.slug}`}
                      style={{ color: "var(--text-primary)", fontWeight: 600, textDecoration: "none" }}
                    >
                      {entry.shirtNumber ? `#${entry.shirtNumber} ` : ""}
                      {entry.player.fullName}
                    </Link>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {entry.isStarter ? "Titular" : "Rezervă"} · {entry.player.position}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>

      {/* Public Result Corrections Audit History (D-005) */}
      {fixture.correctionAudits.length > 0 ? (
        <section className="p19-panel" style={{ padding: "var(--space-5)" }}>
          <h2 className="font-display" style={{ margin: "0 0 var(--space-3)", fontSize: "20px" }}>
            Istoric corecții rezultat (audit imutabil)
          </h2>
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            {fixture.correctionAudits.map((audit) => (
              <div
                key={audit.id}
                style={{
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--bg-subtle)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "8px",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginBottom: "6px",
                  }}
                >
                  <span>
                    Autor: <strong style={{ color: "var(--text-primary)" }}>{audit.actor.name}</strong>
                  </span>
                  <span className="font-mono-audit">
                    {audit.createdAt.toISOString().replace("T", " ").slice(0, 19)} UTC
                  </span>
                </div>
                <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 600 }}>
                  Motiv: {audit.reason}
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "8px",
                  }}
                >
                  <pre
                    className="font-mono-audit"
                    style={{
                      margin: 0,
                      padding: "8px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-surface)",
                      fontSize: "11.5px",
                      overflowX: "auto",
                    }}
                  >
                    {`BEFORE: ${JSON.stringify(audit.beforeSnapshot, null, 2)}`}
                  </pre>
                  <pre
                    className="font-mono-audit"
                    style={{
                      margin: 0,
                      padding: "8px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--bg-surface)",
                      fontSize: "11.5px",
                      overflowX: "auto",
                    }}
                  >
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
