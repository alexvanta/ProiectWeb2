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
      {/* Segmented Tabs matching mockup */}
      <div className="panel-tabs" role="tablist" style={{ width: "fit-content" }}>
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
            className="panel-tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

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

      {tab === "SCHEDULE" ? (
        <section className="panel animate-enter">
          <div className="panel-header panel-header-subtle">
            <h2 className="panel-title">Generator program tur–retur (preview + confirmare)</h2>
          </div>

          <div style={{ padding: "var(--space-5)", display: "grid", gap: "var(--space-4)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
              <div className="field">
                <label htmlFor="adm-sched-season">Sezon</label>
                <select
                  id="adm-sched-season"
                  className="p19-select"
                  value={schedSeasonId}
                  onChange={(e) => setSchedSeasonId(e.target.value)}
                >
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.status})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="adm-sched-start">Dată start Etapa 1</label>
                <input
                  id="adm-sched-start"
                  type="date"
                  className="p19-input"
                  value={schedStartDate}
                  onChange={(e) => setSchedStartDate(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={busy}
                className="btn btn-secondary"
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
                className="btn btn-primary"
                onClick={() =>
                  runApi(
                    "/api/admin/schedule",
                    { seasonId: schedSeasonId, startDate: schedStartDate, confirm: true },
                    "Programul a fost confirmat și salvat în baza de date.",
                  )
                }
              >
                Confirmă &amp; salvează programul
              </button>
            </div>

            {previewSummary ? (
              <div className="audit-reason tabular" style={{ margin: 0 }}>
                Preview: <strong>{previewSummary.totalRounds}</strong> etape ·{" "}
                <strong>{previewSummary.matchesCount}</strong> meciuri ·{" "}
                <strong>{previewSummary.byesCount}</strong> etape libere (bye).
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {tab === "TRANSFERS" ? (
        <form
          className="panel animate-enter"
          onSubmit={(e) => {
            e.preventDefault();
            runApi(
              "/api/admin/transfers",
              { playerId: trPlayerId, seasonId: trSeasonId, toTeamId: trTeamId },
              "Transferul a fost înregistrat cu păstrarea istoricului sezonului anterior.",
            );
          }}
        >
          <div className="panel-header panel-header-subtle">
            <h2 className="panel-title">Înregistrare transfer jucător</h2>
          </div>

          <div style={{ padding: "var(--space-5)", display: "grid", gap: "var(--space-4)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
              <div className="field">
                <label htmlFor="adm-tr-player">Jucător</label>
                <select id="adm-tr-player" className="p19-select" value={trPlayerId} onChange={(e) => setTrPlayerId(e.target.value)}>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>{p.fullName}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="adm-tr-season">Sezon</label>
                <select id="adm-tr-season" className="p19-select" value={trSeasonId} onChange={(e) => setTrSeasonId(e.target.value)}>
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="adm-tr-team">Echipă destinație</label>
                <select id="adm-tr-team" className="p19-select" value={trTeamId} onChange={(e) => setTrTeamId(e.target.value)}>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" disabled={busy} className="btn btn-primary" style={{ width: "fit-content" }}>
              Salvează transferul
            </button>
          </div>
        </form>
      ) : null}

      {tab === "TEAMS_PITCHES" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-5)" }}>
          <form
            className="panel animate-enter"
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
            <div className="panel-header panel-header-subtle">
              <h2 className="panel-title">Adaugă echipă ({teams.length})</h2>
            </div>
            <div style={{ padding: "var(--space-5)", display: "grid", gap: "12px" }}>
              <input required className="p19-input" placeholder="Nume echipă" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
              <input required maxLength={4} className="p19-input" placeholder="Cod scurt (ex: UCV)" value={teamShort} onChange={(e) => setTeamShort(e.target.value)} />
              <button type="submit" disabled={busy} className="btn btn-primary">Adaugă echipă</button>
            </div>
          </form>

          <form
            className="panel animate-enter"
            style={{ animationDelay: "60ms" }}
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
            <div className="panel-header panel-header-subtle">
              <h2 className="panel-title">Adaugă teren ({pitches.length})</h2>
            </div>
            <div style={{ padding: "var(--space-5)", display: "grid", gap: "12px" }}>
              <input required className="p19-input" placeholder="Nume stadion / teren" value={pitchName} onChange={(e) => setPitchName(e.target.value)} />
              <input required className="p19-input" placeholder="Oraș" value={pitchCity} onChange={(e) => setPitchCity(e.target.value)} />
              <button type="submit" disabled={busy} className="btn btn-primary">Adaugă teren</button>
            </div>
          </form>
        </div>
      ) : null}

      {tab === "USERS" ? (
        <div style={{ display: "grid", gap: "var(--space-5)" }}>
          <form
            className="panel animate-enter"
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
            <div className="panel-header panel-header-subtle">
              <h2 className="panel-title">Creează cont utilizator (exclusiv Admin, D-002)</h2>
            </div>
            <div style={{ padding: "var(--space-5)", display: "grid", gap: "12px" }}>
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
              <button type="submit" disabled={busy} className="btn btn-primary" style={{ width: "fit-content" }}>
                Creează cont
              </button>
            </div>
          </form>

          <section className="panel animate-enter" style={{ animationDelay: "60ms" }}>
            <div className="panel-header">
              <h3 className="panel-title">Conturi existente</h3>
              <span className="demo-pill tabular">{users.length}</span>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Nume</th>
                    <th scope="col">Email</th>
                    <th scope="col" className="col-num">Rol</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{u.name}</td>
                      <td className="mono">{u.email}</td>
                      <td className="col-num">
                        <span className="status-badge status-neutral">{u.role}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
