"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface AdminPanelClientProps {
  seasons: Array<{ id: string; name: string; status: string }>;
  teams: Array<{ id: string; name: string; shortName: string }>;
  players: Array<{ id: string; fullName: string }>;
  pitches: Array<{ id: string; name: string; city: string }>;
  users: Array<{ id: string; email: string; name: string; role: string }>;
}

type AdminTab = "SCHEDULE" | "TRANSFERS" | "TEAMS_PITCHES" | "USERS";

export function AdminPanelClient({
  seasons,
  teams,
  players,
  pitches,
  users,
}: AdminPanelClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<AdminTab>("SCHEDULE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Schedule generator state
  const [schedSeasonId, setSchedSeasonId] = useState(seasons[0]?.id ?? "");
  const [schedStartDate, setSchedStartDate] = useState("2026-07-17");
  const [previewSummary, setPreviewSummary] = useState<{
    totalRounds: number;
    matchesCount: number;
    byesCount: number;
  } | null>(null);

  // Transfer state
  const [trPlayerId, setTrPlayerId] = useState(players[0]?.id ?? "");
  const [trSeasonId, setTrSeasonId] = useState(seasons[0]?.id ?? "");
  const [trTeamId, setTrTeamId] = useState(teams[0]?.id ?? "");

  // New team state
  const [teamName, setTeamName] = useState("");
  const [teamShort, setTeamShort] = useState("");

  // New pitch state
  const [pitchName, setPitchName] = useState("");
  const [pitchCity, setPitchCity] = useState("");

  // New user state
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userPass, setUserPass] = useState("");
  const [userRole, setUserRole] = useState<"PLAYER" | "CAPTAIN" | "REFEREE_ORGANIZER" | "ADMIN">("CAPTAIN");
  const [userTeamId, setUserTeamId] = useState(teams[0]?.id ?? "");

  const runApi = async (url: string, body: unknown, okMessage: string) => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Operațiunea a eșuat.");
        return null;
      }
      setSuccess(okMessage);
      router.refresh();
      return data;
    } catch {
      setError("Eroare de rețea.");
      return null;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "var(--space-5)" }}>
      {/* Tabs */}
      <div
        role="tablist"
        style={{
          display: "inline-flex",
          flexWrap: "wrap",
          gap: "6px",
          padding: "4px",
          borderRadius: "var(--radius-md)",
          background: "var(--bg-subtle)",
          width: "fit-content",
        }}
      >
        {(
          [
            { id: "SCHEDULE", label: "Generator program" },
            { id: "TRANSFERS", label: "Transferuri între sezoane" },
            { id: "TEAMS_PITCHES", label: "Echipe & Terenuri" },
            { id: "USERS", label: "Conturi & Roluri" },
          ] as Array<{ id: AdminTab; label: string }>
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "7px 12px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              cursor: "pointer",
              fontSize: "12.5px",
              fontWeight: 700,
              background: tab === t.id ? "var(--accent-primary)" : "transparent",
              color: tab === t.id ? "var(--accent-primary-fg)" : "var(--text-secondary)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <div role="alert" style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--card-red-bg)", color: "var(--card-red-fg)", fontSize: "13px", fontWeight: 600 }}>
          {error}
        </div>
      ) : null}
      {success ? (
        <div role="status" style={{ padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--status-win-bg)", color: "var(--status-win-fg)", fontSize: "13px", fontWeight: 600 }}>
          {success}
        </div>
      ) : null}

      {tab === "SCHEDULE" ? (
        <section className="p19-panel" style={{ padding: "var(--space-5)", display: "grid", gap: "var(--space-4)" }}>
          <h2 className="font-display" style={{ margin: 0, fontSize: "20px" }}>
            Generator program tur–retur (preview + confirmare)
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
            <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
              Sezon
              <select className="p19-select" value={schedSeasonId} onChange={(e) => setSchedSeasonId(e.target.value)}>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
              Dată start Etapa 1
              <input type="date" className="p19-input" value={schedStartDate} onChange={(e) => setSchedStartDate(e.target.value)} />
            </label>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={busy}
              className="p19-btn-secondary"
              onClick={async () => {
                const data = await runApi(
                  "/api/admin/schedule",
                  { seasonId: schedSeasonId, startDate: schedStartDate, confirm: false },
                  "Preview generat cu succes.",
                );
                if (data?.schedule) {
                  setPreviewSummary({
                    totalRounds: data.schedule.totalRounds,
                    matchesCount: data.schedule.matches.length,
                    byesCount: data.schedule.byes.length,
                  });
                }
              }}
            >
              Generează preview
            </button>
            <button
              type="button"
              disabled={busy}
              className="p19-btn-primary"
              onClick={() =>
                runApi(
                  "/api/admin/schedule",
                  { seasonId: schedSeasonId, startDate: schedStartDate, confirm: true },
                  "Programul a fost confirmat și salvat în baza de date.",
                )
              }
            >
              Confirmă & salvează programul
            </button>
          </div>

          {previewSummary ? (
            <div style={{ padding: "12px", borderRadius: "var(--radius-md)", background: "var(--bg-subtle)", fontSize: "13px" }}>
              Preview: <strong>{previewSummary.totalRounds}</strong> etape ·{" "}
              <strong>{previewSummary.matchesCount}</strong> meciuri ·{" "}
              <strong>{previewSummary.byesCount}</strong> etape libere (bye).
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "TRANSFERS" ? (
        <form
          className="p19-panel"
          style={{ padding: "var(--space-5)", display: "grid", gap: "var(--space-4)" }}
          onSubmit={(e) => {
            e.preventDefault();
            runApi(
              "/api/admin/transfers",
              { playerId: trPlayerId, seasonId: trSeasonId, toTeamId: trTeamId },
              "Transferul a fost înregistrat cu păstrarea istoricului sezonului anterior.",
            );
          }}
        >
          <h2 className="font-display" style={{ margin: 0, fontSize: "20px" }}>
            Înregistrare transfer jucător
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
            <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
              Jucător
              <select className="p19-select" value={trPlayerId} onChange={(e) => setTrPlayerId(e.target.value)}>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>{p.fullName}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
              Sezon
              <select className="p19-select" value={trSeasonId} onChange={(e) => setTrSeasonId(e.target.value)}>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
              Echipă destinație
              <select className="p19-select" value={trTeamId} onChange={(e) => setTrTeamId(e.target.value)}>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" disabled={busy} className="p19-btn-primary" style={{ width: "fit-content" }}>
            Salvează transferul
          </button>
        </form>
      ) : null}

      {tab === "TEAMS_PITCHES" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-5)" }}>
          <form
            className="p19-panel"
            style={{ padding: "var(--space-5)", display: "grid", gap: "12px" }}
            onSubmit={async (e) => {
              e.preventDefault();
              const slug = teamName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
              const ok = await runApi(
                "/api/admin/teams",
                { name: teamName, shortName: teamShort, slug },
                `Echipa ${teamName} a fost adăugată.`,
              );
              if (ok) {
                setTeamName("");
                setTeamShort("");
              }
            }}
          >
            <h2 className="font-display" style={{ margin: 0, fontSize: "20px" }}>
              Adaugă echipă ({teams.length} existente)
            </h2>
            <input required className="p19-input" placeholder="Nume echipă" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            <input required maxLength={4} className="p19-input" placeholder="Cod scurt (ex: UCV)" value={teamShort} onChange={(e) => setTeamShort(e.target.value)} />
            <button type="submit" disabled={busy} className="p19-btn-primary">Adaugă echipă</button>
          </form>

          <form
            className="p19-panel"
            style={{ padding: "var(--space-5)", display: "grid", gap: "12px" }}
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await runApi(
                "/api/admin/pitches",
                {
                  name: pitchName,
                  city: pitchCity,
                  availabilities: [
                    { dayOfWeek: 6, startTime: "14:00", endTime: "22:00" },
                    { dayOfWeek: 0, startTime: "14:00", endTime: "22:00" },
                  ],
                },
                `Terenul ${pitchName} a fost adăugat.`,
              );
              if (ok) {
                setPitchName("");
                setPitchCity("");
              }
            }}
          >
            <h2 className="font-display" style={{ margin: 0, fontSize: "20px" }}>
              Adaugă teren ({pitches.length} existente)
            </h2>
            <input required className="p19-input" placeholder="Nume stadion / teren" value={pitchName} onChange={(e) => setPitchName(e.target.value)} />
            <input required className="p19-input" placeholder="Oraș" value={pitchCity} onChange={(e) => setPitchCity(e.target.value)} />
            <button type="submit" disabled={busy} className="p19-btn-primary">Adaugă teren</button>
          </form>
        </div>
      ) : null}

      {tab === "USERS" ? (
        <div style={{ display: "grid", gap: "var(--space-5)" }}>
          <form
            className="p19-panel"
            style={{ padding: "var(--space-5)", display: "grid", gap: "12px" }}
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await runApi(
                "/api/admin/users",
                {
                  email: userEmail,
                  name: userName,
                  password: userPass,
                  role: userRole,
                  teamId: userRole === "CAPTAIN" || userRole === "PLAYER" ? userTeamId : null,
                },
                `Contul ${userEmail} a fost creat.`,
              );
              if (ok) {
                setUserEmail("");
                setUserName("");
                setUserPass("");
              }
            }}
          >
            <h2 className="font-display" style={{ margin: 0, fontSize: "20px" }}>
              Creează cont utilizator (exclusiv Admin, D-002)
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
              <input required type="email" className="p19-input" placeholder="Email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
              <input required className="p19-input" placeholder="Nume complet" value={userName} onChange={(e) => setUserName(e.target.value)} />
              <input required type="password" minLength={6} className="p19-input" placeholder="Parolă (min 6)" value={userPass} onChange={(e) => setUserPass(e.target.value)} />
              <select className="p19-select" value={userRole} onChange={(e) => setUserRole(e.target.value as typeof userRole)}>
                <option value="PLAYER">Jucător</option>
                <option value="CAPTAIN">Căpitan</option>
                <option value="REFEREE_ORGANIZER">Arbitru / Organizator</option>
                <option value="ADMIN">Admin</option>
              </select>
              {userRole === "CAPTAIN" || userRole === "PLAYER" ? (
                <select className="p19-select" value={userTeamId} onChange={(e) => setUserTeamId(e.target.value)}>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              ) : null}
            </div>
            <button type="submit" disabled={busy} className="p19-btn-primary" style={{ width: "fit-content" }}>
              Creează cont
            </button>
          </form>

          <section className="p19-panel" style={{ overflow: "hidden" }}>
            <div style={{ padding: "var(--space-3) var(--space-4)", borderBottom: "1px solid var(--border-subtle)" }}>
              <h3 style={{ margin: 0, fontSize: "16px" }}>Conturi existente ({users.length})</h3>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ height: "var(--row-height-dense)", borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "6px 12px", fontWeight: 600 }}>{u.name}</td>
                    <td className="font-mono-audit" style={{ padding: "6px 12px", color: "var(--text-secondary)" }}>{u.email}</td>
                    <td style={{ padding: "6px 12px", textAlign: "right", fontWeight: 600 }}>{u.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      ) : null}
    </div>
  );
}
