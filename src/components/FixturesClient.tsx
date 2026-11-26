"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Calendar, CheckCircle2, MapPin, RotateCcw, X } from "lucide-react";
import { TeamCrest } from "./TeamCrest";
import { FixtureStatusBadge } from "./StatusBadges";

export interface FixtureListItem {
  id: string;
  roundNumber: number;
  leg: number;
  scheduledAt: string;
  status: "SCHEDULED" | "PLAYED" | "POSTPONED" | "INTERRUPTED_REPLAY";
  homeGoals: number | null;
  awayGoals: number | null;
  homeTeam: {
    id: string;
    name: string;
    shortName: string;
    slug: string;
    crestColorA: string;
    crestColorB: string;
  };
  awayTeam: {
    id: string;
    name: string;
    shortName: string;
    slug: string;
    crestColorA: string;
    crestColorB: string;
  };
  pitch: { id: string; name: string } | null;
}

interface FixturesClientProps {
  seasonId: string;
  seasonName: string;
  fixtures: FixtureListItem[];
  teams: Array<{ id: string; name: string }>;
  pitches: Array<{ id: string; name: string }>;
  initialRound?: string;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ro-RO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRoundDateSpan(items: FixtureListItem[]): string {
  if (items.length === 0) return "";
  const first = new Date(items[0]!.scheduledAt);
  const last = new Date(items[items.length - 1]!.scheduledAt);
  const fStr = first.toLocaleDateString("ro-RO", { day: "2-digit", month: "short" });
  const lStr = last.toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" });
  return fStr === last.toLocaleDateString("ro-RO", { day: "2-digit", month: "short" })
    ? lStr
    : `${fStr} – ${lStr}`;
}

export function FixturesClient({
  seasonId,
  seasonName,
  fixtures,
  teams,
  pitches,
  initialRound = "",
}: FixturesClientProps) {
  const [roundFilter, setRoundFilter] = useState(initialRound);
  const [teamFilter, setTeamFilter] = useState("");
  const [pitchFilter, setPitchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const rounds = useMemo(() => {
    return Array.from(new Set(fixtures.map((f) => f.roundNumber))).sort((a, b) => a - b);
  }, [fixtures]);

  const activeRoundNumber = useMemo(() => {
    const firstScheduled = fixtures.find((f) => f.status === "SCHEDULED");
    return firstScheduled?.roundNumber ?? null;
  }, [fixtures]);

  const filtered = useMemo(() => {
    return fixtures.filter((f) => {
      if (roundFilter && String(f.roundNumber) !== roundFilter) return false;
      if (teamFilter && f.homeTeam.id !== teamFilter && f.awayTeam.id !== teamFilter) {
        return false;
      }
      if (pitchFilter && f.pitch?.id !== pitchFilter) return false;
      if (statusFilter && f.status !== statusFilter) return false;
      return true;
    });
  }, [fixtures, roundFilter, teamFilter, pitchFilter, statusFilter]);

  const groupedByRound = useMemo(() => {
    const map = new Map<number, FixtureListItem[]>();
    for (const fx of filtered) {
      const list = map.get(fx.roundNumber) ?? [];
      list.push(fx);
      map.set(fx.roundNumber, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [filtered]);

  const exportTeamId = teamFilter || teams[0]?.id || "";
  const exportTeamName = teams.find((t) => t.id === exportTeamId)?.name ?? "echipă";

  const handleReset = () => {
    setRoundFilter("");
    setTeamFilter("");
    setPitchFilter("");
    setStatusFilter("");
  };

  const handleIcalExport = () => {
    if (!exportTeamId) return;
    window.location.href = `/api/ical/${encodeURIComponent(seasonId)}/${encodeURIComponent(exportTeamId)}`;
    setToast(`Fișierul iCal (.ics) pentru ${exportTeamName} a fost generat.`);
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <>
      <div className="page-head animate-enter">
        <div>
          <h1 className="page-title">Program &amp; rezultate · {seasonName}</h1>
          <p className="page-meta">
            Etape în ordine crescătoare, filtre după etapă, echipă, teren sau status și export iCal per echipă.
          </p>
        </div>
        <button
          type="button"
          onClick={handleIcalExport}
          disabled={!exportTeamId}
          className="btn btn-secondary"
        >
          <Calendar size={16} aria-hidden="true" />
          <span>Export iCal (.ics)</span>
        </button>
      </div>

      {/* DS-p19-filter-bar */}
      <section
        className="filter-bar animate-enter"
        style={{ animationDelay: "40ms" }}
        aria-label="Filtre program meciuri"
      >
        <div className="filter-grid">
          <div className="field">
            <label htmlFor="f-round">Etapă</label>
            <select
              id="f-round"
              className="select-control"
              value={roundFilter}
              onChange={(e) => setRoundFilter(e.target.value)}
            >
              <option value="">Toate etapele</option>
              {rounds.map((r) => (
                <option key={r} value={String(r)}>
                  Etapa {r}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="f-team">Echipă</label>
            <select
              id="f-team"
              className="select-control"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="">Toate echipele</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="f-pitch">Teren</label>
            <select
              id="f-pitch"
              className="select-control"
              value={pitchFilter}
              onChange={(e) => setPitchFilter(e.target.value)}
            >
              <option value="">Toate terenurile</option>
              {pitches.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="f-status">Status</label>
            <select
              id="f-status"
              className="select-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Toate statusurile</option>
              <option value="SCHEDULED">Programat</option>
              <option value="PLAYED">Jucat</option>
              <option value="POSTPONED">Amânat</option>
            </select>
          </div>

          <button type="button" onClick={handleReset} className="btn btn-ghost">
            <RotateCcw size={14} aria-hidden="true" />
            <span>Resetează</span>
          </button>
        </div>

        <div className="filter-summary">
          <span className="tabular">
            Afișate <strong>{filtered.length}</strong> meciuri în{" "}
            <strong>{groupedByRound.length}</strong>{" "}
            {groupedByRound.length === 1 ? "etapă" : "etape"}
          </span>
          <span>
            Export iCal activ pentru: <strong>{exportTeamName}</strong>
          </span>
        </div>
      </section>

      {/* Rounds List (ascending order) */}
      <div className="rounds-stack">
        {groupedByRound.length === 0 ? (
          <div className="panel" style={{ padding: "var(--space-8) var(--space-4)", textAlign: "center" }}>
            <h2 className="panel-title" style={{ justifyContent: "center", marginBottom: "var(--space-2)" }}>
              Niciun meci găsit
            </h2>
            <p className="page-meta" style={{ marginBottom: "var(--space-4)" }}>
              Nu există meciuri care să corespundă filtrelor selectate.
            </p>
            <button type="button" onClick={handleReset} className="btn btn-secondary">
              Resetează filtrele
            </button>
          </div>
        ) : (
          groupedByRound.map(([roundNum, items]) => (
            <section key={roundNum} className="round-panel animate-enter">
              <div className="round-header">
                <h2 className="round-title">
                  <span>
                    Etapa {roundNum} {roundNum <= 15 ? "· Tur" : "· Retur"}
                  </span>
                  <span className="round-tag">{items.length} meciuri</span>
                  {activeRoundNumber === roundNum ? (
                    <span className="round-active-pill">
                      <span className="ping-indicator ping-indicator-live" aria-hidden="true">
                        <span className="ping-ring animate-ping" />
                        <span className="ping-core" />
                      </span>
                      Etapa curentă
                    </span>
                  ) : null}
                </h2>
                <span className="round-dates tabular">{formatRoundDateSpan(items)}</span>
              </div>

              <div>
                {items.map((fx) => {
                  const isPlayed =
                    fx.status === "PLAYED" &&
                    fx.homeGoals !== null &&
                    fx.awayGoals !== null;
                  const homeWon = isPlayed && fx.homeGoals! > fx.awayGoals!;
                  const awayWon = isPlayed && fx.awayGoals! > fx.homeGoals!;

                  return (
                    <div key={fx.id} className="match-row">
                      <div className="cell-dt tabular">{formatDateTime(fx.scheduledAt)}</div>

                      <div className="cell-pitch">
                        <MapPin size={13} aria-hidden="true" style={{ flexShrink: 0 }} />
                        <span>{fx.pitch?.name ?? "Teren nealocat"}</span>
                      </div>

                      <div
                        className={`team-side cell-home${homeWon ? " is-winner" : awayWon ? " is-loser" : ""}`}
                      >
                        {homeWon ? <span className="win-dot" aria-hidden="true" /> : null}
                        <span className="team-text">{fx.homeTeam.name}</span>
                        <TeamCrest
                          slug={fx.homeTeam.slug}
                          shortName={fx.homeTeam.shortName}
                          colorA={fx.homeTeam.crestColorA}
                          colorB={fx.homeTeam.crestColorB}
                          size="md"
                        />
                      </div>

                      <div className={`score-box tabular${!isPlayed ? " upcoming" : ""}`}>
                        {isPlayed ? (
                          <>
                            <span className={awayWon ? "score-num-lose" : undefined}>
                              {fx.homeGoals}
                            </span>
                            <span className="score-sep">–</span>
                            <span className={homeWon ? "score-num-lose" : undefined}>
                              {fx.awayGoals}
                            </span>
                          </>
                        ) : (
                          formatTime(fx.scheduledAt)
                        )}
                      </div>

                      <div
                        className={`team-side cell-away${awayWon ? " is-winner" : homeWon ? " is-loser" : ""}`}
                      >
                        <TeamCrest
                          slug={fx.awayTeam.slug}
                          shortName={fx.awayTeam.shortName}
                          colorA={fx.awayTeam.crestColorA}
                          colorB={fx.awayTeam.crestColorB}
                          size="md"
                        />
                        <span className="team-text">{fx.awayTeam.name}</span>
                        {awayWon ? <span className="win-dot" aria-hidden="true" /> : null}
                      </div>

                      <div className="cell-status">
                        <FixtureStatusBadge status={fx.status} />
                        <Link href={`/meciuri/${fx.id}`} className="detail-link">
                          Detalii{" "}
                          <span className="arrow-glide" aria-hidden="true">
                            →
                          </span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Animated Floating Toast (never pushes layout) */}
      {toast ? (
        <div className="toast-region" aria-live="polite">
          <div className="toast" role="status">
            <CheckCircle2
              size={18}
              aria-hidden="true"
              style={{ color: "var(--accent-primary)", marginTop: "2px", flexShrink: 0 }}
            />
            <div>
              <span className="toast-title">Export iCal pregătit</span>
              <span>{toast}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Închide notificarea"
              className="btn btn-ghost"
              style={{ minHeight: "28px", padding: "4px", marginLeft: "auto" }}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
