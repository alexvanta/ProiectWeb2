"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Plus, Save, Trash2 } from "lucide-react";
import { AlertBanner } from "./AlertBanner";

export interface RefFixtureOption {
  id: string;
  roundNumber: number;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
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
          style={{
            padding: "12px 14px",
            borderRadius: "var(--radius-md)",
            background: "var(--card-red-bg)",
            color: "var(--card-red-fg)",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          role="status"
          style={{
            padding: "12px 14px",
            borderRadius: "var(--radius-md)",
            background: "var(--status-win-bg)",
            color: "var(--status-win-fg)",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          {success}
        </div>
      ) : null}

      {/* Retroactive Suspension Alerts (D-005) */}
      <section style={{ display: "grid", gap: "var(--space-3)" }}>
        <h2 className="font-display" style={{ margin: 0, fontSize: "20px" }}>
          Alerte suspendare retroactivă ({alerts.filter((a) => a.status === "OPEN").length} deschise)
        </h2>
        {alerts.length === 0 ? (
          <div className="p19-panel" style={{ padding: "var(--space-4)", color: "var(--text-muted)", fontSize: "13px" }}>
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
                      className="p19-btn-primary"
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

      {/* Result Entry & Audited Correction Form */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "var(--space-5)",
        }}
      >
        <form
          onSubmit={handleSaveResult}
          className="p19-panel"
          style={{ padding: "var(--space-5)", display: "grid", gap: "var(--space-4)" }}
        >
          <h2 className="font-display" style={{ margin: 0, fontSize: "20px" }}>
            Introducere / Corecție rezultat & evenimente
          </h2>

          <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
            Selectează meciul
            <select
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
          </label>

          {currentFx ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
                  Goluri {currentFx.homeTeamName}
                  <input
                    type="number"
                    min={0}
                    max={50}
                    className="p19-input tabular-nums"
                    value={homeGoals}
                    onChange={(e) => setHomeGoals(Number(e.target.value))}
                  />
                </label>
                <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
                  Goluri {currentFx.awayTeamName}
                  <input
                    type="number"
                    min={0}
                    max={50}
                    className="p19-input tabular-nums"
                    value={awayGoals}
                    onChange={(e) => setAwayGoals(Number(e.target.value))}
                  />
                </label>
              </div>

              {currentFx.status === "PLAYED" ? (
                <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "var(--alert-retro-fg)", fontWeight: 600 }}>
                  Motiv corecție (obligatoriu pentru audit D-005)
                  <textarea
                    required
                    rows={2}
                    className="p19-textarea"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Ex: Corecție cartonaș galben conform raportului de arbitraj..."
                  />
                </label>
              ) : null}

              {/* Events builder */}
              <div style={{ display: "grid", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>
                    Evenimente meci ({events.length})
                  </span>
                  <button type="button" onClick={addDraftEvent} className="p19-btn-secondary">
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
                      className="p19-input tabular-nums"
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
                      className="p19-btn-secondary"
                      style={{ padding: "6px" }}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>

              <button type="submit" disabled={busy} className="p19-btn-primary">
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
        </form>

        {/* Reschedule Form */}
        <form
          onSubmit={handleReschedule}
          className="p19-panel"
          style={{ padding: "var(--space-5)", display: "grid", gap: "var(--space-4)", alignContent: "start" }}
        >
          <h2 className="font-display" style={{ margin: 0, fontSize: "20px" }}>
            Reprogramare meci (notificări in-app)
          </h2>

          <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
            Dată & oră nouă
            <input
              type="datetime-local"
              required
              className="p19-input"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
            />
          </label>

          <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
            Teren
            <select
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
          </label>

          <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
            Mesaj notificare (opțional)
            <input
              type="text"
              className="p19-input"
              value={rescheduleMsg}
              onChange={(e) => setRescheduleMsg(e.target.value)}
              placeholder="Ex: Reprogramat din cauza condițiilor meteo"
            />
          </label>

          <button type="submit" disabled={busy || !currentFx} className="p19-btn-secondary">
            Reprogramează & trimite notificări
          </button>
        </form>
      </div>

      {/* Audit History */}
      <section className="p19-panel" style={{ padding: "var(--space-5)" }}>
        <h2 className="font-display" style={{ margin: "0 0 var(--space-3)", fontSize: "20px" }}>
          Jurnal imutabil corecții recente ({audits.length})
        </h2>
        {audits.length === 0 ? (
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px" }}>
            Nu există corecții înregistrate.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            {audits.map((a) => (
              <div
                key={a.id}
                style={{
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-subtle)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)" }}>
                  <span>
                    <strong style={{ color: "var(--text-primary)" }}>{a.fixtureLabel}</strong> · {a.actorName}
                  </span>
                  <span className="font-mono-audit">{a.createdAt.slice(0, 19).replace("T", " ")}</span>
                </div>
                <p style={{ margin: "4px 0 8px", fontSize: "13px", fontWeight: 600 }}>
                  Motiv: {a.reason}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <pre className="font-mono-audit" style={{ margin: 0, padding: "8px", background: "var(--bg-surface)", borderRadius: "4px", fontSize: "11px", overflowX: "auto" }}>
                    {`BEFORE: ${JSON.stringify(a.beforeSnapshot)}`}
                  </pre>
                  <pre className="font-mono-audit" style={{ margin: 0, padding: "8px", background: "var(--bg-surface)", borderRadius: "4px", fontSize: "11px", overflowX: "auto" }}>
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
