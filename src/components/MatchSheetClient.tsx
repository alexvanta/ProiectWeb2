"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Send } from "lucide-react";
import { EligibilityBadge } from "./StatusBadges";

export interface SquadPlayerOption {
  playerId: string;
  fullName: string;
  position: string;
  shirtNumber: number | null;
  suspendedRounds: number;
  initiallySelected: boolean;
  initiallyStarter: boolean;
}

interface MatchSheetClientProps {
  fixtureId: string;
  teamId: string;
  teamName: string;
  minPlayers: number;
  maxStarters: number;
  squad: SquadPlayerOption[];
}

export function MatchSheetClient({
  fixtureId,
  teamId,
  teamName,
  minPlayers,
  maxStarters,
  squad,
}: MatchSheetClientProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, "STARTER" | "SUB" | "NONE">>(() => {
    const init: Record<string, "STARTER" | "SUB" | "NONE"> = {};
    for (const p of squad) {
      if (p.initiallySelected) {
        init[p.playerId] = p.initiallyStarter ? "STARTER" : "SUB";
      } else {
        init[p.playerId] = "NONE";
      }
    }
    return init;
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const chosenEntries = squad
    .filter((p) => selected[p.playerId] && selected[p.playerId] !== "NONE")
    .map((p) => ({
      playerId: p.playerId,
      isStarter: selected[p.playerId] === "STARTER",
      shirtNumber: p.shirtNumber,
    }));

  const startersCount = chosenEntries.filter((e) => e.isStarter).length;
  const subsCount = chosenEntries.length - startersCount;

  const submitEntries = async (
    entries: Array<{ playerId: string; isStarter: boolean; shirtNumber: number | null }>,
  ) => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(
        `/api/fixtures/${encodeURIComponent(fixtureId)}/match-sheet`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId, entries }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Depunerea foii de meci a fost respinsă de server.");
        return;
      }
      setSuccess(`Foaia de meci pentru ${teamName} a fost salvată (${entries.length} jucători).`);
      router.refresh();
    } catch {
      setError("Eroare de rețea la trimiterea foii de meci.");
    } finally {
      setSubmitting(false);
    }
  };

  const firstSuspended = squad.find((p) => p.suspendedRounds > 0);

  return (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
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

      <section className="p19-panel" style={{ overflow: "hidden" }}>
        <div
          style={{
            padding: "var(--space-3) var(--space-4)",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div className="tabular-nums" style={{ fontSize: "13px", fontWeight: 600 }}>
            Selecție curentă: <strong>{startersCount}</strong> / {maxStarters} titulari ·{" "}
            <strong>{subsCount}</strong> rezerve · Total <strong>{chosenEntries.length}</strong> (minim {minPlayers})
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {firstSuspended ? (
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  const eligibleSix = squad
                    .filter((p) => p.suspendedRounds === 0)
                    .slice(0, Math.max(minPlayers - 1, 6))
                    .map((p) => ({
                      playerId: p.playerId,
                      isStarter: true,
                      shirtNumber: p.shirtNumber,
                    }));
                  submitEntries([
                    ...eligibleSix,
                    {
                      playerId: firstSuspended.playerId,
                      isStarter: true,
                      shirtNumber: firstSuspended.shirtNumber,
                    },
                  ]);
                }}
                className="p19-btn-secondary"
              >
                <Lock size={14} aria-hidden="true" />
                <span>Testează respingere server (cu suspendat)</span>
              </button>
            ) : null}

            <button
              type="button"
              disabled={submitting}
              onClick={() => submitEntries(chosenEntries)}
              className="p19-btn-primary"
            >
              <Send size={14} aria-hidden="true" />
              <span>{submitting ? "Se validează..." : "Depune foaia de meci"}</span>
            </button>
          </div>
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
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Eligibilitate</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>Rol pe foaie</th>
              </tr>
            </thead>
            <tbody>
              {squad.map((p) => {
                const isSuspended = p.suspendedRounds > 0;
                const mode = selected[p.playerId] ?? "NONE";
                return (
                  <tr
                    key={p.playerId}
                    style={{
                      height: "var(--row-height-dense)",
                      borderBottom: "1px solid var(--border-subtle)",
                      background: isSuspended ? "var(--card-red-bg)" : undefined,
                      opacity: isSuspended ? 0.85 : 1,
                    }}
                  >
                    <td className="tabular-nums" style={{ padding: "6px 10px", textAlign: "center" }}>
                      {p.shirtNumber ?? "—"}
                    </td>
                    <td style={{ padding: "6px 10px", fontWeight: 600 }}>{p.fullName}</td>
                    <td style={{ padding: "6px 10px", color: "var(--text-secondary)" }}>
                      {p.position}
                    </td>
                    <td style={{ padding: "6px 10px" }}>
                      <EligibilityBadge suspendedRounds={p.suspendedRounds} />
                    </td>
                    <td style={{ padding: "6px 12px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "4px" }}>
                        {(["NONE", "STARTER", "SUB"] as const).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            disabled={isSuspended}
                            onClick={() =>
                              setSelected((prev) => ({ ...prev, [p.playerId]: opt }))
                            }
                            style={{
                              padding: "4px 8px",
                              borderRadius: "var(--radius-sm)",
                              border: "1px solid var(--border-strong)",
                              fontSize: "11.5px",
                              fontWeight: 600,
                              cursor: isSuspended ? "not-allowed" : "pointer",
                              background:
                                mode === opt && !isSuspended
                                  ? "var(--accent-primary)"
                                  : "var(--bg-surface)",
                              color:
                                mode === opt && !isSuspended
                                  ? "var(--accent-primary-fg)"
                                  : "var(--text-secondary)",
                            }}
                          >
                            {opt === "NONE" ? "Absent" : opt === "STARTER" ? "Titular" : "Rezervă"}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
