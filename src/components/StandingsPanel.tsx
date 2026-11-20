"use client";

import Link from "next/link";
import { useState } from "react";
import type { StandingsResult } from "@/domain/types";
import type { TopScorerItem } from "@/server/queries/publicQueries";
import { FormStrip } from "./FormStrip";
import { TeamCrest } from "./TeamCrest";
import { CardCountBadge } from "./StatusBadges";

interface StandingsPanelProps {
  seasonName: string;
  seasonStatus: "DRAFT" | "ACTIVE" | "COMPLETED";
  standings: StandingsResult;
  teamMeta: Record<string, { slug: string; crestColorA: string; crestColorB: string }>;
  topScorers: TopScorerItem[];
}

type ActiveTab = "CLASAMENT" | "FORMA" | "MARCATORI";

const COLUMN_TIPS: Record<string, string> = {
  MJ: "Meciuri jucate",
  V: "Victorii",
  E: "Egaluri",
  Î: "Înfrângeri",
  GM: "Goluri marcate",
  GP: "Goluri primite",
  DG: "Diferență de goluri",
  Pct: "Puncte acumulate",
};

export function StandingsPanel({
  seasonName,
  seasonStatus,
  standings,
  teamMeta,
  topScorers,
}: StandingsPanelProps) {
  const [tab, setTab] = useState<ActiveTab>("CLASAMENT");
  const [hoveredMatch, setHoveredMatch] = useState<{
    teamId: string | null;
    opponentId: string | null;
  }>({ teamId: null, opponentId: null });
  const [hoveredTieGroup, setHoveredTieGroup] = useState<string | null>(null);

  const d3Groups = standings.tieBreakGroups.filter((g) => g.teamIds.length >= 2);

  return (
    <section className="p19-panel" style={{ overflow: "hidden" }}>
      {/* Panel Header with Flashscore-style segmented tabs */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-3)",
          padding: "var(--space-3) var(--space-4)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            className="p19-pulse-dot"
            style={{
              background:
                seasonStatus === "ACTIVE"
                  ? "var(--accent-primary)"
                  : "var(--text-muted)",
            }}
            aria-hidden="true"
          />
          <h2
            className="font-display"
            style={{ margin: 0, fontSize: "20px", lineHeight: "26px", fontWeight: 600 }}
          >
            {seasonStatus === "COMPLETED" ? "Clasament final" : "Clasament live"} ·{" "}
            {seasonName}
          </h2>
        </div>

        <div
          role="tablist"
          aria-label="Vizualizare clasament"
          style={{
            display: "inline-flex",
            flexWrap: "wrap",
            gap: "4px",
            padding: "3px",
            borderRadius: "var(--radius-md)",
            background: "var(--bg-subtle)",
          }}
        >
          {(["CLASAMENT", "FORMA", "MARCATORI"] as ActiveTab[]).map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  background: active ? "var(--accent-primary)" : "transparent",
                  color: active ? "var(--accent-primary-fg)" : "var(--text-secondary)",
                  transition: "background-color var(--motion-fast), color var(--motion-fast)",
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: CLASAMENT & Tab 2: FORMA */}
      {tab !== "MARCATORI" ? (
        <>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
                lineHeight: "18px",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "var(--bg-subtle)",
                    color: "var(--text-muted)",
                    fontSize: "12px",
                    fontWeight: 600,
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <th style={{ padding: "8px 10px", textAlign: "center", width: "44px" }}>#</th>
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>Echipă</th>
                  <th title={COLUMN_TIPS.MJ} style={{ padding: "8px 8px", textAlign: "right" }}>MJ</th>
                  {tab === "CLASAMENT" ? (
                    <>
                      <th title={COLUMN_TIPS.V} style={{ padding: "8px 8px", textAlign: "right" }}>V</th>
                      <th title={COLUMN_TIPS.E} style={{ padding: "8px 8px", textAlign: "right" }}>E</th>
                      <th title={COLUMN_TIPS.Î} style={{ padding: "8px 8px", textAlign: "right" }}>Î</th>
                      <th title={COLUMN_TIPS.GM} style={{ padding: "8px 8px", textAlign: "right" }}>GM</th>
                      <th title={COLUMN_TIPS.GP} style={{ padding: "8px 8px", textAlign: "right" }}>GP</th>
                    </>
                  ) : null}
                  <th title={COLUMN_TIPS.DG} style={{ padding: "8px 8px", textAlign: "right" }}>DG</th>
                  <th title={COLUMN_TIPS.Pct} style={{ padding: "8px 10px", textAlign: "right", color: "var(--text-primary)" }}>
                    Pct
                  </th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Formă (5)</th>
                </tr>
              </thead>
              <tbody>
                {standings.rows.map((row) => {
                  const meta = teamMeta[row.teamId];
                  const isSelf = hoveredMatch.teamId === row.teamId;
                  const isOpp = hoveredMatch.opponentId === row.teamId;
                  const isTieHovered =
                    !hoveredMatch.teamId &&
                    hoveredTieGroup !== null &&
                    row.tieBreakGroupId === hoveredTieGroup;

                  const isLeader = row.position === 1;
                  const hasTieBreak = row.tieBreakGroupId !== null;

                  const rowClass = isSelf
                    ? "p19-row-hl-self"
                    : isOpp
                      ? "p19-row-hl-opp"
                      : "";

                  return (
                    <tr
                      key={row.teamId}
                      data-team={row.teamId}
                      className={rowClass}
                      style={{
                        height: "var(--row-height-dense)",
                        borderBottom: "1px solid var(--border-subtle)",
                        background: isTieHovered ? "var(--alert-retro-bg)" : undefined,
                        transition: "background-color var(--motion-fast)",
                      }}
                    >
                      <td style={{ padding: "6px 10px", textAlign: "center" }}>
                        <span
                          className="tabular-nums"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "24px",
                            height: "24px",
                            borderRadius: "var(--radius-md)",
                            fontSize: "12px",
                            fontWeight: 700,
                            background: isLeader
                              ? "var(--accent-primary)"
                              : hasTieBreak
                                ? "var(--alert-retro-border)"
                                : "transparent",
                            color: isLeader
                              ? "var(--accent-primary-fg)"
                              : hasTieBreak
                                ? "var(--alert-retro-btn-fg)"
                                : "var(--text-muted)",
                          }}
                        >
                          {row.position}
                        </span>
                      </td>

                      <td style={{ padding: "6px 10px" }}>
                        <Link
                          href={`/echipe/${meta?.slug ?? row.teamId}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            textDecoration: "none",
                            color: "var(--text-primary)",
                            fontWeight: 600,
                          }}
                        >
                          <TeamCrest
                            shortName={row.shortName}
                            colorA={meta?.crestColorA ?? "#156842"}
                            colorB={meta?.crestColorB ?? "#0F5132"}
                            size="sm"
                          />
                          <span>{row.teamName}</span>
                        </Link>
                      </td>

                      <td className="tabular-nums" style={{ padding: "6px 8px", textAlign: "right", color: "var(--text-secondary)" }}>
                        {row.played}
                      </td>

                      {tab === "CLASAMENT" ? (
                        <>
                          <td className="tabular-nums" style={{ padding: "6px 8px", textAlign: "right", color: "var(--text-secondary)" }}>
                            {row.won}
                          </td>
                          <td className="tabular-nums" style={{ padding: "6px 8px", textAlign: "right", color: "var(--text-secondary)" }}>
                            {row.drawn}
                          </td>
                          <td className="tabular-nums" style={{ padding: "6px 8px", textAlign: "right", color: "var(--text-secondary)" }}>
                            {row.lost}
                          </td>
                          <td className="tabular-nums" style={{ padding: "6px 8px", textAlign: "right", color: "var(--text-secondary)" }}>
                            {row.goalsFor}
                          </td>
                          <td className="tabular-nums" style={{ padding: "6px 8px", textAlign: "right", color: "var(--text-secondary)" }}>
                            {row.goalsAgainst}
                          </td>
                        </>
                      ) : null}

                      <td className="tabular-nums" style={{ padding: "6px 8px", textAlign: "right", fontWeight: 500 }}>
                        {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                      </td>

                      <td
                        className="tabular-nums"
                        style={{
                          padding: "6px 10px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "var(--text-primary)",
                        }}
                      >
                        {row.points}
                      </td>

                      <td style={{ padding: "6px 12px", textAlign: "right" }}>
                        <FormStrip
                          teamId={row.teamId}
                          entries={row.lastFiveForm}
                          onHoverMatch={(tid, oid) =>
                            setHoveredMatch({ teamId: tid, opponentId: oid })
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer legend + D3 tie-breaker callout */}
          <div
            style={{
              padding: "var(--space-3) var(--space-4)",
              background: "var(--bg-subtle)",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "var(--space-3)",
              fontSize: "12px",
              color: "var(--text-muted)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "3px",
                    background: "var(--accent-primary)",
                  }}
                />
                Lider sezon regular
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "3px",
                    background: "var(--alert-retro-border)",
                  }}
                />
                Departajare ROAF Art. 27 ({standings.mode === "final" ? "meciuri directe" : "golaveraj general"})
              </span>
            </div>

            {d3Groups.length > 0 ? (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {d3Groups.map((g) => (
                  <button
                    key={g.groupId}
                    type="button"
                    onMouseEnter={() => setHoveredTieGroup(g.groupId)}
                    onMouseLeave={() => setHoveredTieGroup(null)}
                    onFocus={() => setHoveredTieGroup(g.groupId)}
                    onBlur={() => setHoveredTieGroup(null)}
                    style={{
                      padding: "3px 8px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--alert-retro-border)",
                      background: "var(--alert-retro-bg)",
                      color: "var(--alert-retro-fg)",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Egalitate la {g.points} pct ({g.teamIds.length} echipe · criteriu {g.resolvedBy})
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </>
      ) : (
        /* Tab 3: MARCATORI */
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr
                style={{
                  background: "var(--bg-subtle)",
                  color: "var(--text-muted)",
                  fontSize: "12px",
                  fontWeight: 600,
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <th style={{ padding: "8px 10px", textAlign: "center", width: "44px" }}>#</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Jucător</th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>Echipă</th>
                <th style={{ padding: "8px 10px", textAlign: "right" }}>Cartonașe</th>
                <th style={{ padding: "8px 12px", textAlign: "right", color: "var(--text-primary)" }}>
                  Goluri
                </th>
              </tr>
            </thead>
            <tbody>
              {topScorers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}
                  >
                    Nu există marcatori înregistrați în acest sezon.
                  </td>
                </tr>
              ) : (
                topScorers.map((sc, idx) => {
                  const rank = idx + 1;
                  const rankBg =
                    rank === 1
                      ? "var(--scorer-rank-1)"
                      : rank === 2
                        ? "var(--scorer-rank-2)"
                        : rank === 3
                          ? "var(--scorer-rank-3)"
                          : "transparent";
                  const rankFg = rank <= 3 ? "var(--scorer-rank-fg)" : "var(--text-muted)";

                  return (
                    <tr
                      key={sc.playerId}
                      style={{
                        height: "var(--row-height-dense)",
                        borderBottom: "1px solid var(--border-subtle)",
                      }}
                    >
                      <td style={{ padding: "6px 10px", textAlign: "center" }}>
                        <span
                          className="tabular-nums"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "24px",
                            height: "24px",
                            borderRadius: "var(--radius-md)",
                            fontSize: "12px",
                            fontWeight: 700,
                            background: rankBg,
                            color: rankFg,
                            textShadow: rank === 3 ? "0 1px 2px rgba(0,0,0,0.45)" : undefined,
                          }}
                        >
                          {rank}
                        </span>
                      </td>
                      <td style={{ padding: "6px 10px" }}>
                        <Link
                          href={`/jucatori/${sc.playerSlug}`}
                          style={{
                            color: "var(--text-primary)",
                            fontWeight: 600,
                            textDecoration: "none",
                          }}
                        >
                          {sc.playerName}
                        </Link>
                      </td>
                      <td style={{ padding: "6px 10px" }}>
                        <Link
                          href={`/echipe/${sc.teamSlug}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            color: "var(--text-secondary)",
                            textDecoration: "none",
                          }}
                        >
                          <TeamCrest
                            shortName={sc.teamShortName}
                            colorA={sc.crestColorA}
                            colorB={sc.crestColorB}
                          />
                          <span>{sc.teamName}</span>
                        </Link>
                      </td>
                      <td style={{ padding: "6px 10px", textAlign: "right" }}>
                        <span style={{ display: "inline-flex", gap: "6px" }}>
                          {sc.yellowCards > 0 ? <CardCountBadge type="yellow" count={sc.yellowCards} /> : null}
                          {sc.redCards > 0 ? <CardCountBadge type="red" count={sc.redCards} /> : null}
                        </span>
                      </td>
                      <td
                        className="tabular-nums"
                        style={{
                          padding: "6px 12px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "var(--text-primary)",
                        }}
                      >
                        {sc.goals}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
