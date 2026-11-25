"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Plus, Save, Trash2 } from "lucide-react";
import { AlertBanner } from "./AlertBanner";
import { TeamCrest } from "./TeamCrest";

export interface RefFixtureOption {
  id: string;
  roundNumber: number;
  homeTeamId: string;
  homeTeamName: string;
  homeTeamShortName: string;
  homeTeamSlug: string;
  homeTeamColorA: string;
  homeTeamColorB: string;
  awayTeamId: string;
  awayTeamName: string;
  awayTeamShortName: string;
  awayTeamSlug: string;
  awayTeamColorA: string;
  awayTeamColorB: string;
  status: "SCHEDULED" | "PLAYED" | "POSTPONED" | "INTERRUPTED_REPLAY";
  homeGoals: number | null;
  awayGoals: number | null;
  scheduledAt: string;
  pitchId: string | null;
}

export interface RefPlayerOption {
  id: string;
  fullName: string;
  teamId: string;
}

export interface RefAuditItem {
  id: string;
  fixtureLabel: string;
  actorName: string;
  reason: string;
  beforeSnapshot: unknown;
  afterSnapshot: unknown;
  createdAt: string;
}

export interface RefAlertItem {
  id: string;
  fixtureLabel: string;
  playerName: string;
  description: string;
  status: "OPEN" | "REVIEWED" | "DISMISSED";
}

interface RefereePanelClientProps {
  fixtures: RefFixtureOption[];
  players: RefPlayerOption[];
  pitches: Array<{ id: string; name: string }>;
  audits: RefAuditItem[];
  alerts: RefAlertItem[];
}

interface DraftEvent {
  playerId: string;
  teamId: string;
  type: "GOAL" | "OWN_GOAL" | "YELLOW_CARD" | "SECOND_YELLOW_RED" | "DIRECT_RED";
  minute: number;
  committeeBanRounds?: number;
}

export function RefereePanelClient({
  fixtures,
  players,
  pitches,
  audits,
  alerts,
}: RefereePanelClientProps) {
  const router = useRouter();
  const [selectedFixtureId, setSelectedFixtureId] = useState(fixtures[0]?.id ?? "");
  const currentFx = fixtures.find((f) => f.id === selectedFixtureId);

  const [homeGoals, setHomeGoals] = useState<number>(currentFx?.homeGoals ?? 0);
  const [awayGoals, setAwayGoals] = useState<number>(currentFx?.awayGoals ?? 0);
  const [reason, setReason] = useState("");
  const [events, setEvents] = useState<DraftEvent[]>([]);
  const [rescheduleDate, setRescheduleDate] = useState(
    currentFx ? currentFx.scheduledAt.slice(0, 16) : "",
  );
  const [reschedulePitchId, setReschedulePitchId] = useState(currentFx?.pitchId ?? "");
  const [rescheduleMsg, setRescheduleMsg] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fixturePlayers = currentFx
    ? players.filter(
        (p) => p.teamId === currentFx.homeTeamId || p.teamId === currentFx.awayTeamId,
      )
    : [];

  const handleSelectFixture = (id: string) => {
    setSelectedFixtureId(id);
    const fx = fixtures.find((f) => f.id === id);
    if (fx) {
      setHomeGoals(fx.homeGoals ?? 0);
      setAwayGoals(fx.awayGoals ?? 0);
      setRescheduleDate(fx.scheduledAt.slice(0, 16));
      setReschedulePitchId(fx.pitchId ?? "");
      setEvents([]);
      setReason("");
    }
  };

  const addDraftEvent = () => {
    const firstP = fixturePlayers[0];
    if (!firstP) return;
    setEvents((prev) => [
      ...prev,
      {
        playerId: firstP.id,
        teamId: firstP.teamId,
        type: "GOAL",
        minute: 45,
      },
    ]);
  };

  const handleSaveResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFx) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const method = currentFx.status === "PLAYED" ? "PATCH" : "POST";
      const res = await fetch(`/api/fixtures/${encodeURIComponent(currentFx.id)}/result`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeGoals: Number(homeGoals),
          awayGoals: Number(awayGoals),
          reason: reason.trim() || undefined,
          events,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Salvarea rezultatului a eșuat.");
        return;
      }
      const alertInfo =
        data.retroactiveAlerts?.length > 0
          ? ` Atenție: ${data.retroactiveAlerts.length} alerte retroactive generate (scorurile ulterioare nu au fost modificate).`
          : "";
      setSuccess(
        `${data.isCorrection ? "Corecția a fost salvată cu audit" : "Rezultatul a fost salvat"} și cache-ul sezonului a fost invalidat.${alertInfo}`,
      );
      setReason("");
      router.refresh();
    } catch {
      setError("Eroare de rețea la salvarea rezultatului.");
    } finally {
      setBusy(false);
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFx || !rescheduleDate) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(
        `/api/fixtures/${encodeURIComponent(currentFx.id)}/reschedule`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduledAt: new Date(rescheduleDate).toISOString(),
            pitchId: reschedulePitchId || null,
            message: rescheduleMsg.trim() || undefined,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Reprogramarea a eșuat.");
        return;
      }
      setSuccess(
        `Meci reprogramat cu succes. ${data.notifiedCount} notificări in-app au fost trimise jucătorilor și căpitanilor.`,
      );
      setRescheduleMsg("");
      router.refresh();
    } catch {
      setError("Eroare de rețea la reprogramare.");
    } finally {
      setBusy(false);
    }
  };

  const handleResolveAlert = async (alertId: string, status: "REVIEWED" | "DISMISSED") => {
    const note = reviewNotes[alertId]?.trim() || "Revizuit de Departamentul Competiții.";
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/alerts/${encodeURIComponent(alertId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNote: note }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Actualizarea alertei a eșuat.");
        return;
      }
      setSuccess("Alerta retroactivă a fost actualizată.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "var(--space-6)" }}>
      {error ? (
        <div
          role="alert"
          className="alert-retro"
          style={{
            background: "var(--card-red-bg)",
            color: "var(--card-red-fg)",
            borderColor: "var(--card-red-fill)",
          }}
        >
          <strong>{error}</strong>
        </div>
      ) : null}

      {success ? (
        <div
          role="status"
          className="alert-banner"
          style={{
            background: "var(--status-win-bg)",
            color: "var(--status-win-fg)",
            borderLeft: "4px solid var(--accent-primary)",
          }}
        >
          <strong>{success}</strong>
        </div>
      ) : null}

      {/* Retroactive Suspension Alerts (D-005) */}
      <section style={{ display: "grid", gap: "var(--space-3)" }}>
        <h2 className="panel-title">
          Alerte suspendare retroactivă ({alerts.filter((a) => a.status === "OPEN").length} deschise)
        </h2>
        {alerts.length === 0 ? (
          <div className="panel" style={{ padding: "var(--space-4)", color: "var(--text-muted)", fontSize: "13px" }}>
            Nu există alerte retroactive în așteptare.
          </div>
        ) : (
          alerts.map((alert) => (
            <AlertBanner
              key={alert.id}
              variant="retroactive"
              title={`${alert.playerName} · ${alert.fixtureLabel} (${alert.status})`}
              description={alert.description}
              action={
                alert.status === "OPEN" ? (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      type="text"
                      className="p19-input"
                      placeholder="Notă revizuire..."
                      value={reviewNotes[alert.id] ?? ""}
                      onChange={(e) =>
                        setReviewNotes((prev) => ({ ...prev, [alert.id]: e.target.value }))
                      }
                      style={{ width: "180px" }}
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleResolveAlert(alert.id, "REVIEWED")}
                      className="btn btn-alert"
                    >
                      <CheckCircle2 size={14} aria-hidden="true" />
                      <span>Marchează revizuită</span>
                    </button>
                  </div>
                ) : null
              }
            />
          ))
        )}
      </section>

      {/* Result Entry & Reschedule Forms */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "var(--space-5)",
          alignItems: "start",
        }}
      >
        <form onSubmit={handleSaveResult} className="panel animate-enter">
          <div className="panel-header panel-header-subtle">
            <h2 className="panel-title">Introducere / Corecție rezultat</h2>
          </div>

          <div style={{ padding: "var(--space-5)", display: "grid", gap: "var(--space-4)" }}>
            <div className="field">
              <label htmlFor="ref-fixture">Selectează meciul</label>
              <select
                id="ref-fixture"
                className="p19-select"
                value={selectedFixtureId}
                onChange={(e) => handleSelectFixture(e.target.value)}
              >
                {fixtures.map((f) => (
                  <option key={f.id} value={f.id}>
                    Et. {f.roundNumber}: {f.homeTeamName} – {f.awayTeamName} ({f.status})
                  </option>
                ))}
              </select>
            </div>

            {currentFx ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="field">
                    <label htmlFor="ref-home-goals" className="team-cell">
                      <TeamCrest
                        slug={currentFx.homeTeamSlug}
                        shortName={currentFx.homeTeamShortName}
                        colorA={currentFx.homeTeamColorA}
                        colorB={currentFx.homeTeamColorB}
                        size="xs"
                      />
                      <span>Goluri {currentFx.homeTeamName}</span>
                    </label>
                    <input
                      id="ref-home-goals"
                      type="number"
                      min={0}
                      max={50}
                      className="p19-input tabular"
                      value={homeGoals}
                      onChange={(e) => setHomeGoals(Number(e.target.value))}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="ref-away-goals" className="team-cell">
                      <TeamCrest
                        slug={currentFx.awayTeamSlug}
                        shortName={currentFx.awayTeamShortName}
                        colorA={currentFx.awayTeamColorA}
                        colorB={currentFx.awayTeamColorB}
                        size="xs"
                      />
                      <span>Goluri {currentFx.awayTeamName}</span>
                    </label>
                    <input
                      id="ref-away-goals"
                      type="number"
                      min={0}
                      max={50}
                      className="p19-input tabular"
                      value={awayGoals}
                      onChange={(e) => setAwayGoals(Number(e.target.value))}
                    />
                  </div>
                </div>

                {currentFx.status === "PLAYED" ? (
                  <div className="field">
                    <label htmlFor="ref-reason" style={{ color: "var(--alert-retro-fg)" }}>
                      Motiv corecție (obligatoriu pentru audit D-005)
                    </label>
                    <textarea
                      id="ref-reason"
                      required
                      rows={2}
                      className="p19-textarea"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Ex: Corecție cartonaș galben conform raportului de arbitraj..."
                    />
                  </div>
                ) : null}

                {/* Events builder */}
                <div style={{ display: "grid", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                      Evenimente meci ({events.length})
                    </span>
                    <button type="button" onClick={addDraftEvent} className="btn btn-secondary">
                      <Plus size={13} aria-hidden="true" />
                      <span>Adaugă eveniment</span>
                    </button>
                  </div>

                  {events.map((ev, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 64px auto",
                        gap: "6px",
                        alignItems: "center",
                      }}
                    >
                      <select
                        className="p19-select"
                        value={ev.playerId}
                        onChange={(e) => {
                          const p = fixturePlayers.find((x) => x.id === e.target.value);
                          if (!p) return;
                          setEvents((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, playerId: p.id, teamId: p.teamId } : item,
                            ),
                          );
                        }}
                      >
                        {fixturePlayers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.fullName}
                          </option>
                        ))}
                      </select>

                      <select
                        className="p19-select"
                        value={ev.type}
                        onChange={(e) =>
                          setEvents((prev) =>
                            prev.map((item, i) =>
                              i === idx
                                ? { ...item, type: e.target.value as DraftEvent["type"] }
                                : item,
                            ),
                          )
                        }
                      >
                        <option value="GOAL">Gol</option>
                        <option value="OWN_GOAL">Autogol</option>
                        <option value="YELLOW_CARD">Galben</option>
                        <option value="SECOND_YELLOW_RED">2 Galbene (Roșu indirect)</option>
                        <option value="DIRECT_RED">Roșu direct</option>
                      </select>

                      <input
                        type="number"
                        min={1}
                        max={120}
                        className="p19-input tabular"
                        value={ev.minute}
                        onChange={(e) =>
                          setEvents((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, minute: Number(e.target.value) } : item,
                            ),
                          )
                        }
                      />

                      <button
                        type="button"
                        aria-label="Șterge eveniment"
                        onClick={() => setEvents((prev) => prev.filter((_, i) => i !== idx))}
                        className="btn btn-secondary"
                        style={{ padding: "0 8px" }}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>

                <button type="submit" disabled={busy} className="btn btn-primary">
                  <Save size={14} aria-hidden="true" />
                  <span>
                    {busy
                      ? "Se salvează..."
                      : currentFx.status === "PLAYED"
                        ? "Salvează corecția (cu audit)"
                        : "Salvează rezultatul"}
                  </span>
                </button>
              </>
            ) : null}
          </div>
        </form>

        {/* Reschedule Form */}
        <form onSubmit={handleReschedule} className="panel animate-enter" style={{ animationDelay: "60ms" }}>
          <div className="panel-header panel-header-subtle">
            <h2 className="panel-title">Reprogramare meci (notificări in-app)</h2>
          </div>

          <div style={{ padding: "var(--space-5)", display: "grid", gap: "var(--space-4)" }}>
            <div className="field">
              <label htmlFor="ref-reschedule-dt">Dată &amp; oră nouă</label>
              <input
                id="ref-reschedule-dt"
                type="datetime-local"
                required
                className="p19-input"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="ref-reschedule-pitch">Teren</label>
              <select
                id="ref-reschedule-pitch"
                className="p19-select"
                value={reschedulePitchId}
                onChange={(e) => setReschedulePitchId(e.target.value)}
              >
                <option value="">Păstrează terenul actual</option>
                {pitches.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="ref-reschedule-msg">Mesaj notificare (opțional)</label>
              <input
                id="ref-reschedule-msg"
                type="text"
                className="p19-input"
                value={rescheduleMsg}
                onChange={(e) => setRescheduleMsg(e.target.value)}
                placeholder="Ex: Reprogramat din cauza condițiilor meteo"
              />
            </div>

            <button type="submit" disabled={busy || !currentFx} className="btn btn-secondary">
              Reprogramează &amp; trimite notificări
            </button>
          </div>
        </form>
      </div>

      {/* Audit History */}
      <section className="panel animate-enter" style={{ animationDelay: "100ms" }}>
        <div className="panel-header panel-header-subtle">
          <h2 className="panel-title">Jurnal imutabil corecții recente</h2>
          <span className="status-badge status-corrected tabular">{audits.length} înregistrări</span>
        </div>

        {audits.length === 0 ? (
          <div style={{ padding: "var(--space-4)", color: "var(--text-muted)", fontSize: "13px" }}>
            Nu există corecții înregistrate.
          </div>
        ) : (
          <div className="audit-body" style={{ display: "grid", gap: "var(--space-4)" }}>
            {audits.map((a) => (
              <div key={a.id}>
                <div className="audit-meta">
                  <span>
                    <strong>{a.fixtureLabel}</strong> · Autor: <strong>{a.actorName}</strong>
                  </span>
                  <span className="mono">{a.createdAt.slice(0, 19).replace("T", " ")} UTC</span>
                </div>
                <p className="audit-reason">
                  <strong>Motiv:</strong> {a.reason}
                </p>
                <div className="diff-grid">
                  <pre className="mono diff-box diff-before">
                    {`BEFORE: ${JSON.stringify(a.beforeSnapshot)}`}
                  </pre>
                  <pre className="mono diff-box diff-after">
                    {`AFTER: ${JSON.stringify(a.afterSnapshot)}`}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
