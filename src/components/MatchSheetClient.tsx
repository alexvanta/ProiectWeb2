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

      <section className="panel animate-enter">
        <div className="panel-header">
          <div className="tabular" style={{ fontSize: "13px", fontWeight: 600 }}>
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
                className="btn btn-secondary"
              >
                <Lock size={14} aria-hidden="true" />
                <span>Testează respingere server (cu suspendat)</span>
              </button>
            ) : null}

            <button
              type="button"
              disabled={submitting}
              onClick={() => submitEntries(chosenEntries)}
              className="btn btn-primary"
            >
              <Send size={14} aria-hidden="true" />
              <span>{submitting ? "Se validează..." : "Depune foaia de meci"}</span>
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col" className="col-center" style={{ width: "48px" }}>Nr.</th>
                <th scope="col">Jucător</th>
                <th scope="col" className="col-hide-sm">Post</th>
                <th scope="col">Eligibilitate</th>
                <th scope="col" className="col-num">Rol pe foaie</th>
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
                      background: isSuspended ? "var(--card-red-bg)" : undefined,
                      opacity: isSuspended ? 0.88 : 1,
                    }}
                  >
                    <td className="col-center">
                      <span className="jersey-num tabular">{p.shirtNumber ?? "—"}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.fullName}</td>
                    <td className="col-hide-sm">{p.position}</td>
                    <td>
                      <EligibilityBadge suspendedRounds={p.suspendedRounds} />
                    </td>
                    <td className="col-num">
                      <div className="panel-tabs" style={{ padding: "2px" }}>
                        {(["NONE", "STARTER", "SUB"] as const).map((opt) => {
                          const isSelected = mode === opt && !isSuspended;
                          return (
                            <button
                              key={opt}
                              type="button"
                              disabled={isSuspended}
                              onClick={() =>
                                setSelected((prev) => ({ ...prev, [p.playerId]: opt }))
                              }
                              className="panel-tab"
                              aria-pressed={isSelected}
                              style={{
                                minHeight: "24px",
                                padding: "3px 8px",
                                fontSize: "11px",
                                background: isSelected ? "var(--accent-primary)" : "transparent",
                                color: isSelected
                                  ? "var(--accent-primary-fg)"
                                  : "var(--text-secondary)",
                                opacity: isSuspended ? 0.5 : 1,
                                cursor: isSuspended ? "not-allowed" : "pointer",
                              }}
                            >
                              {opt === "NONE" ? "Absent" : opt === "STARTER" ? "Titular" : "Rezervă"}
                            </button>
                          );
                        })}
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
