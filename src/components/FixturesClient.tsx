"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, RotateCcw } from "lucide-react";
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

  // Group by ascending roundNumber
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

  const handleReset = () => {
    setRoundFilter("");
    setTeamFilter("");
    setPitchFilter("");
    setStatusFilter("");
  };

  const handleIcalExport = () => {
    if (!exportTeamId) return;
    const teamName = teams.find((t) => t.id === exportTeamId)?.name ?? "echipă";
    window.location.href = `/api/ical/${encodeURIComponent(seasonId)}/${encodeURIComponent(exportTeamId)}`;
    setToast(`Fișierul iCal (.ics) pentru ${teamName} a fost generat.`);
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <div style={{ display: "grid", gap: "var(--space-5)" }}>
      {/* Filter Bar (DS-p19-filter-bar) */}
      <section className="p19-panel" style={{ padding: "var(--space-4)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "var(--space-3)",
            alignItems: "end",
          }}
        >
          <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
            Etapă
            <select
              className="p19-select"
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
          </label>

          <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
            Echipă
            <select
              className="p19-select"
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
          </label>

          <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
            Teren
            <select
              className="p19-select"
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
          </label>

          <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
            Status
            <select
              className="p19-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Toate statusurile</option>
              <option value="SCHEDULED">Programat</option>
              <option value="PLAYED">Jucat</option>
              <option value="POSTPONED">Amânat</option>
            </select>
          </label>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button type="button" onClick={handleReset} className="p19-btn-secondary">
              <RotateCcw size={14} aria-hidden="true" />
              <span>Resetează</span>
            </button>
            <button
              type="button"
              onClick={handleIcalExport}
              disabled={!exportTeamId}
              className="p19-btn-primary"
            >
              <Download size={14} aria-hidden="true" />
              <span>Export iCal (.ics)</span>
            </button>
          </div>
        </div>
        <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
          {seasonName} · {filtered.length} meciuri afișate
          {teamFilter
            ? ` · Exportul iCal va descărca calendarul echipei selectate.`
            : ` · Selectează o echipă pentru export iCal dedicat (implicit: ${teams[0]?.name ?? "prima echipă"}).`}
        </div>
      </section>

      {/* Rounds List (ascending order) */}
      {groupedByRound.length === 0 ? (
        <div className="p19-panel" style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--text-muted)" }}>
          Nu există meciuri care să corespundă filtrelor selectate.
        </div>
      ) : (
        groupedByRound.map(([roundNum, items]) => (
          <section key={roundNum} className="p19-panel" style={{ overflow: "hidden" }}>
            <div
              style={{
                padding: "8px var(--space-4)",
                background: "var(--bg-subtle)",
                borderBottom: "1px solid var(--border-subtle)",
                fontFamily: "var(--font-display)",
                fontWeight: 600,
                fontSize: "16px",
              }}
            >
              Etapa {roundNum} {roundNum <= 15 ? "· Tur" : "· Retur"}
            </div>
            <div>
              {items.map((fx) => {
                const dateStr = new Date(fx.scheduledAt).toLocaleString("ro-RO", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
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
                        fontWeight:
                          fx.status === "PLAYED" && (fx.homeGoals ?? 0) > (fx.awayGoals ?? 0)
                            ? 700
                            : 500,
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
                        minWidth: "66px",
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
                        fontWeight:
                          fx.status === "PLAYED" && (fx.awayGoals ?? 0) > (fx.homeGoals ?? 0)
                            ? 700
                            : 500,
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
                      <span className="tabular-nums">{dateStr}</span>
                      {fx.pitch ? <span>· {fx.pitch.name}</span> : null}
                      <FixtureStatusBadge status={fx.status} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))
      )}

      {/* Transient bottom-right toast */}
      {toast ? (
        <div
          role="status"
          style={{
            position: "fixed",
            right: "20px",
            bottom: "20px",
            zIndex: 70,
            padding: "12px 16px",
            borderRadius: "var(--radius-lg)",
            background: "var(--tooltip-bg)",
            color: "var(--tooltip-fg)",
            boxShadow: "var(--shadow-md)",
            fontSize: "13px",
            fontWeight: 500,
          }}
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
