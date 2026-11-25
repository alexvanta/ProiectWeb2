"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { StandingsResult } from "@/domain/types";
import type { TopScorerItem } from "@/server/queries/publicQueries";
import { FormStrip } from "./FormStrip";
import { TeamCrest } from "./TeamCrest";
import { CardCountBadge } from "./StatusBadges";

interface StandingsPanelProps {
  seasonName: string;
  seasonStatus: "DRAFT" | "ACTIVE" | "COMPLETED";
  currentRound: number;
  totalRounds: number;
  standings: StandingsResult;
  teamMeta: Record<string, { slug: string; crestColorA: string; crestColorB: string }>;
  topScorers: TopScorerItem[];
}

type ActiveTab = "CLASAMENT" | "FORMA" | "MARCATORI";

const COLUMN_TIPS: Record<string, string> = {
  MJ: "Meciuri Jucate",
  V: "Victorii",
  E: "Egal",
  Î: "Înfrângeri",
  GM: "Goluri Marcate",
  GP: "Goluri Primite",
  DG: "Diferență Goluri",
  Pct: "Puncte",
};

interface HeaderTooltipState {
  label: string;
  left: number;
  top: number;
  arrowX: number;
}

export function StandingsPanel({
  seasonName,
  seasonStatus,
  currentRound,
  totalRounds,
  standings,
  teamMeta,
  topScorers,
}: StandingsPanelProps) {
  const [tab, setTab] = useState<ActiveTab>("CLASAMENT");
  const [hoveredMatch, setHoveredMatch] = useState<{
    teamId: string | null;
    opponentId: string | null;
  }>({ teamId: null, opponentId: null });
  const [hoveredTie, setHoveredTie] = useState<{
    groupId: string | null;
    teamId: string | null;
  }>({ groupId: null, teamId: null });
  const [headerTip, setHeaderTip] = useState<HeaderTooltipState | null>(null);
  const [mounted, setMounted] = useState(false);

  const tabListRef = useRef<HTMLDivElement | null>(null);
  const tabBtnRefs = useRef<Record<ActiveTab, HTMLButtonElement | null>>({
    CLASAMENT: null,
    FORMA: null,
    MARCATORI: null,
  });
  const [indicator, setIndicator] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    ready: boolean;
    animated: boolean;
  }>({ left: 0, top: 0, width: 0, height: 0, ready: false, animated: false });
  const d3PanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const update = (animate: boolean) => {
      const btn = tabBtnRefs.current[tab];
      if (!btn) return;
      setIndicator((prev) => ({
        left: btn.offsetLeft,
        top: btn.offsetTop,
        width: btn.offsetWidth,
        height: btn.offsetHeight,
        ready: true,
        animated: animate && prev.ready,
      }));
    };
    update(true);
    const onResize = () => update(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [tab]);

  const d3Groups = useMemo(
    () => standings.tieBreakGroups.filter((g) => g.teamIds.length >= 2),
    [standings.tieBreakGroups],
  );

  // Last-5 form table sorted by recent points -> GD -> GF
  const formRows = useMemo(() => {
    return standings.rows
      .map((row) => {
        const entries = row.lastFiveForm;
        let won = 0;
        let drawn = 0;
        let lost = 0;
        let goalsFor = 0;
        let goalsAgainst = 0;
        for (const e of entries) {
          if (e.result === "W") won += 1;
          else if (e.result === "D") drawn += 1;
          else lost += 1;
          goalsFor += e.goalsFor;
          goalsAgainst += e.goalsAgainst;
        }
        const points = won * 3 + drawn;
        const goalDifference = goalsFor - goalsAgainst;
        return {
          ...row,
          formPlayed: entries.length,
          formWon: won,
          formDrawn: drawn,
          formLost: lost,
          formGF: goalsFor,
          formGA: goalsAgainst,
          formGD: goalDifference,
          formPoints: points,
        };
      })
      .sort(
        (a, b) =>
          b.formPoints - a.formPoints ||
          b.formGD - a.formGD ||
          b.formGF - a.formGF ||
          a.position - b.position,
      );
  }, [standings.rows]);

  const showHeaderTip = (el: HTMLElement, key: string) => {
    const label = COLUMN_TIPS[key];
    if (!label) return;
    const rect = el.getBoundingClientRect();
    const approxWidth = Math.max(96, label.length * 7.2 + 24);
    const pad = 10;
    const centerX = rect.left + rect.width / 2;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
    const left = Math.max(pad, Math.min(centerX - approxWidth / 2, vw - approxWidth - pad));
    const top = rect.bottom + 8;
    const arrowX = Math.max(12, Math.min(approxWidth - 12, centerX - left));
    setHeaderTip({ label, left, top, arrowX });
  };

  const hideHeaderTip = () => setHeaderTip(null);

  const jumpToTieBreak = (groupId: string, teamId: string) => {
    setHoveredTie({ groupId, teamId });
    d3PanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const panelTitle =
    tab === "CLASAMENT"
      ? seasonStatus === "COMPLETED"
        ? "Clasament final"
        : "Clasament live"
      : tab === "FORMA"
        ? "Forma"
        : "Golgheteri";

  const rowById = useMemo(() => {
    const map = new Map(standings.rows.map((r) => [r.teamId, r]));
    return map;
  }, [standings.rows]);

  const activeRows = tab === "FORMA" ? formRows : standings.rows;

  return (
    <section aria-labelledby="standings-heading">
      <div className="panel animate-enter" style={{ animationDelay: "40ms" }}>
        {/* Panel Header with Flashscore-style sliding segmented tabs */}
        <div className="panel-header">
          <div className="panel-header-left">
            <h2 id="standings-heading" className="panel-title">
              {tab === "CLASAMENT" ? (
                <span
                  className={`pulse-dot${seasonStatus !== "ACTIVE" ? " pulse-dot-muted" : ""}`}
                  aria-hidden="true"
                />
              ) : null}
              <span>{panelTitle}</span>
            </h2>

            <div
              ref={tabListRef}
              className={`panel-tabs${indicator.ready ? " has-indicator" : ""}${indicator.animated ? " is-animated" : ""}`}
              role="tablist"
              aria-label="Vizualizare clasament"
            >
              <span
                className="panel-tabs-indicator"
                aria-hidden="true"
                style={{
                  width: `${indicator.width}px`,
                  height: `${indicator.height}px`,
                  transform: `translate3d(${indicator.left}px, ${indicator.top}px, 0)`,
                }}
              />
              {(["CLASAMENT", "FORMA", "MARCATORI"] as ActiveTab[]).map((t) => {
                const active = tab === t;
                return (
                  <button
                    key={t}
                    ref={(el) => {
                      tabBtnRefs.current[t] = el;
                    }}
                    type="button"
                    role="tab"
                    className="panel-tab"
                    aria-selected={active}
                    tabIndex={active ? 0 : -1}
                    onClick={() => {
                      setTab(t);
                      setHoveredMatch({ teamId: null, opponentId: null });
                      setHoveredTie({ groupId: null, teamId: null });
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <span className="demo-pill tabular">
            Etapa {currentRound} / {totalRounds}
          </span>
        </div>

        {/* Tab 1: CLASAMENT & Tab 2: FORMA */}
        {tab !== "MARCATORI" ? (
          <>
            <div className="table-wrap">
              <table className="standings">
                <thead>
                  <tr>
                    <th scope="col" className="col-pos">#</th>
                    <th scope="col" className="col-team">Echipă</th>
                    {(["MJ", "V", "E", "Î"] as const).map((col) => (
                      <th
                        key={col}
                        scope="col"
                        tabIndex={0}
                        data-col-tooltip={COLUMN_TIPS[col]}
                        aria-label={`${col} — ${COLUMN_TIPS[col]}`}
                        onMouseEnter={(e) => showHeaderTip(e.currentTarget, col)}
                        onMouseLeave={hideHeaderTip}
                        onFocus={(e) => showHeaderTip(e.currentTarget, col)}
                        onBlur={hideHeaderTip}
                      >
                        {col}
                      </th>
                    ))}
                    <th
                      scope="col"
                      className="col-gf"
                      tabIndex={0}
                      data-col-tooltip={COLUMN_TIPS.GM}
                      aria-label={`GM — ${COLUMN_TIPS.GM}`}
                      onMouseEnter={(e) => showHeaderTip(e.currentTarget, "GM")}
                      onMouseLeave={hideHeaderTip}
                      onFocus={(e) => showHeaderTip(e.currentTarget, "GM")}
                      onBlur={hideHeaderTip}
                    >
                      GM
                    </th>
                    <th
                      scope="col"
                      className="col-ga"
                      tabIndex={0}
                      data-col-tooltip={COLUMN_TIPS.GP}
                      aria-label={`GP — ${COLUMN_TIPS.GP}`}
                      onMouseEnter={(e) => showHeaderTip(e.currentTarget, "GP")}
                      onMouseLeave={hideHeaderTip}
                      onFocus={(e) => showHeaderTip(e.currentTarget, "GP")}
                      onBlur={hideHeaderTip}
                    >
                      GP
                    </th>
                    <th
                      scope="col"
                      tabIndex={0}
                      data-col-tooltip={COLUMN_TIPS.DG}
                      aria-label={`DG — ${COLUMN_TIPS.DG}`}
                      onMouseEnter={(e) => showHeaderTip(e.currentTarget, "DG")}
                      onMouseLeave={hideHeaderTip}
                      onFocus={(e) => showHeaderTip(e.currentTarget, "DG")}
                      onBlur={hideHeaderTip}
                    >
                      DG
                    </th>
                    <th
                      scope="col"
                      className="col-pts"
                      tabIndex={0}
                      data-col-tooltip={COLUMN_TIPS.Pct}
                      aria-label={`Pct — ${COLUMN_TIPS.Pct}`}
                      onMouseEnter={(e) => showHeaderTip(e.currentTarget, "Pct")}
                      onMouseLeave={hideHeaderTip}
                      onFocus={(e) => showHeaderTip(e.currentTarget, "Pct")}
                      onBlur={hideHeaderTip}
                    >
                      Pct
                    </th>
                    <th scope="col" className="col-form">Formă (5)</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRows.map((row, idx) => {
                    const meta = teamMeta[row.teamId];
                    const displayPos = tab === "FORMA" ? idx + 1 : row.position;
                    const isLeader = displayPos === 1;
                    const hasTieBreak = tab === "CLASAMENT" && row.tieBreakGroupId !== null;

                    const isSelf = hoveredMatch.teamId === row.teamId;
                    const isOpp = hoveredMatch.opponentId === row.teamId;
                    const showTie = !hoveredMatch.teamId && hoveredTie.groupId !== null;
                    const isTieActive = showTie && hoveredTie.teamId === row.teamId;
                    const isTieGroupHover =
                      showTie &&
                      !isTieActive &&
                      row.tieBreakGroupId === hoveredTie.groupId;

                    const classes = [
                      isLeader ? "rank-leader" : hasTieBreak ? "rank-tied" : "",
                      isSelf ? "form-pair-self" : isOpp ? "form-pair-opp" : "",
                      isTieActive ? "d3-team-active" : isTieGroupHover ? "d3-group-hover" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    const played = tab === "FORMA" ? (row as typeof formRows[number]).formPlayed : row.played;
                    const won = tab === "FORMA" ? (row as typeof formRows[number]).formWon : row.won;
                    const drawn = tab === "FORMA" ? (row as typeof formRows[number]).formDrawn : row.drawn;
                    const lost = tab === "FORMA" ? (row as typeof formRows[number]).formLost : row.lost;
                    const gf = tab === "FORMA" ? (row as typeof formRows[number]).formGF : row.goalsFor;
                    const ga = tab === "FORMA" ? (row as typeof formRows[number]).formGA : row.goalsAgainst;
                    const gd = tab === "FORMA" ? (row as typeof formRows[number]).formGD : row.goalDifference;
                    const pts = tab === "FORMA" ? (row as typeof formRows[number]).formPoints : row.points;

                    return (
                      <tr
                        key={row.teamId}
                        data-team={row.teamId}
                        className={classes || undefined}
                        onMouseEnter={() => {
                          if (hasTieBreak && row.tieBreakGroupId) {
                            setHoveredTie({ groupId: row.tieBreakGroupId, teamId: row.teamId });
                          }
                        }}
                        onMouseLeave={() => {
                          if (hasTieBreak) {
                            setHoveredTie({ groupId: null, teamId: null });
                          }
                        }}
                      >
                        <td className="col-pos">
                          <span className="pos-badge">{displayPos}</span>
                        </td>
                        <td className="col-team">
                          <div className="team-cell">
                            <Link
                              href={`/echipe/${meta?.slug ?? row.teamId}`}
                              className="team-cell"
                            >
                              <TeamCrest
                                shortName={row.shortName}
                                colorA={meta?.crestColorA ?? "#156842"}
                                colorB={meta?.crestColorB ?? "#0F5132"}
                                size="sm"
                              />
                              <span className="team-name">{row.teamName}</span>
                            </Link>
                            {hasTieBreak && row.tieBreakGroupId ? (
                              <button
                                type="button"
                                className="tie-tag"
                                onClick={() => jumpToTieBreak(row.tieBreakGroupId!, row.teamId)}
                                aria-label={`Vezi departajarea ROAF pentru ${row.teamName}`}
                              >
                                D3
                              </button>
                            ) : null}
                          </div>
                        </td>
                        <td className="tabular">{played}</td>
                        <td className="tabular">{won}</td>
                        <td className="tabular">{drawn}</td>
                        <td className="tabular">{lost}</td>
                        <td className="col-gf tabular">{gf}</td>
                        <td className="col-ga tabular">{ga}</td>
                        <td className="tabular">{gd > 0 ? `+${gd}` : gd}</td>
                        <td className="col-pts tabular">{pts}</td>
                        <td className="col-form">
                          <FormStrip
                            teamId={row.teamId}
                            teamName={row.teamName}
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

            <div className="table-footer">
              <div className="legend-group">
                <span className="legend-item">
                  <span className="legend-pos legend-pos-leader" aria-hidden="true">
                    1
                  </span>
                  {tab === "FORMA" ? "Cea mai bună formă (5 etape)" : "Locul 1 · Lider"}
                </span>
                {tab === "CLASAMENT" ? (
                  <span className="legend-item">
                    <span className="legend-pos legend-pos-tied" aria-hidden="true">
                      2
                    </span>
                    Departajare ROAF Art. 27 ({standings.mode === "final" ? "meciuri directe" : "golaveraj general"})
                  </span>
                ) : null}
              </div>
              <span>Formă: W = Victorie · D = Egal · L = Înfrângere</span>
            </div>
          </>
        ) : (
          /* Tab 3: MARCATORI (Top Scorers) */
          <>
            <div className="table-wrap">
              <table className="scorers">
                <thead>
                  <tr>
                    <th scope="col" className="col-pos">#</th>
                    <th scope="col" className="col-player">Jucător</th>
                    <th scope="col" style={{ textAlign: "left" }}>Echipă</th>
                    <th scope="col" style={{ textAlign: "right" }}>Cartonașe</th>
                    <th scope="col" className="col-goals">Goluri</th>
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
                      const rankCls =
                        rank === 1
                          ? "scorer-rank-1"
                          : rank === 2
                            ? "scorer-rank-2"
                            : rank === 3
                              ? "scorer-rank-3"
                              : "";
                      return (
                        <tr key={sc.playerId} className={rankCls || undefined}>
                          <td className="col-pos">
                            <span className="pos-badge">{rank}</span>
                          </td>
                          <td>
                            <Link
                              href={`/jucatori/${sc.playerSlug}`}
                              style={{ fontWeight: 600, color: "var(--text-primary)" }}
                            >
                              {sc.playerName}
                            </Link>
                          </td>
                          <td>
                            <Link
                              href={`/echipe/${sc.teamSlug}`}
                              className="team-cell"
                              style={{ color: "var(--text-secondary)", fontWeight: 500 }}
                            >
                              <TeamCrest
                                shortName={sc.teamShortName}
                                colorA={sc.crestColorA}
                                colorB={sc.crestColorB}
                                size="xs"
                              />
                              <span className="team-name">{sc.teamName}</span>
                            </Link>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <span style={{ display: "inline-flex", gap: "6px" }}>
                              {sc.yellowCards > 0 ? <CardCountBadge type="yellow" count={sc.yellowCards} /> : null}
                              {sc.redCards > 0 ? <CardCountBadge type="red" count={sc.redCards} /> : null}
                            </span>
                          </td>
                          <td className="col-goals tabular">{sc.goals}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <div className="legend-group">
                <span className="legend-item">
                  <span className="legend-pos legend-pos-s1" aria-hidden="true">1</span>
                  Locul 1
                </span>
                <span className="legend-item">
                  <span className="legend-pos legend-pos-s2" aria-hidden="true">2</span>
                  Locul 2
                </span>
                <span className="legend-item">
                  <span className="legend-pos legend-pos-s3" aria-hidden="true">3</span>
                  Locul 3
                </span>
              </div>
              <span>{seasonName} · Goluri oficiale</span>
            </div>
          </>
        )}
      </div>

      {/* D3 Tie-Breaker Callout Panel (below standings, using div grid to preserve single <table> on /) */}
      {tab === "CLASAMENT" && d3Groups.length > 0 ? (
        <div
          ref={d3PanelRef}
          className={`tiebreak-panel animate-enter${hoveredTie.groupId ? " d3-panel-active" : ""}`}
          style={{ animationDelay: "120ms" }}
        >
          <div className="tiebreak-head">
            <h3 className="tiebreak-title">
              Departajare activă · ROAF Art. 27 ({d3Groups.length}{" "}
              {d3Groups.length === 1 ? "grup" : "grupuri"} la egalitate)
            </h3>
            <span className="demo-pill">
              {standings.mode === "final" ? "Clasament final (H2H)" : "Clasament intermediar"}
            </span>
          </div>
          <p className="tiebreak-desc">
            Treci cu mouse-ul pe un rând pentru a evidenția echipele implicate în clasamentul general.
          </p>

          <div style={{ display: "grid", gap: "var(--space-3)" }}>
            {d3Groups.map((g) => (
              <div key={g.groupId} className="mini-grid">
                <div className="mini-grid-row mini-grid-head">
                  <div className="mini-grid-cell">
                    Egalitate la {g.points} pct · Criteriu: {g.resolvedBy}
                  </div>
                  <div className="mini-grid-cell">MJ</div>
                  <div className="mini-grid-cell">DG</div>
                  <div className="mini-grid-cell">Pct</div>
                </div>
                {g.teamIds.map((tid) => {
                  const r = rowById.get(tid);
                  if (!r) return null;
                  const meta = teamMeta[tid];
                  const isActive = hoveredTie.teamId === tid;
                  return (
                    <div
                      key={tid}
                      className={`mini-grid-row mini-grid-body${isActive ? " d3-team-active" : ""}`}
                      onMouseEnter={() => setHoveredTie({ groupId: g.groupId, teamId: tid })}
                      onMouseLeave={() => setHoveredTie({ groupId: null, teamId: null })}
                    >
                      <div className="mini-grid-cell">
                        <span className="team-cell">
                          <TeamCrest
                            shortName={r.shortName}
                            colorA={meta?.crestColorA ?? "#156842"}
                            colorB={meta?.crestColorB ?? "#0F5132"}
                            size="xs"
                          />
                          <span>
                            {r.position}. {r.teamName}
                          </span>
                        </span>
                      </div>
                      <div className="mini-grid-cell tabular">{r.played}</div>
                      <div className="mini-grid-cell tabular">
                        {r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}
                      </div>
                      <div className="mini-grid-cell tabular">
                        <strong>{r.points}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Column Header Portal Tooltip */}
      {mounted && headerTip
        ? createPortal(
            <div
              role="tooltip"
              className="form-tooltip"
              style={
                {
                  left: `${headerTip.left}px`,
                  top: `${headerTip.top}px`,
                  "--arrow-x": `${headerTip.arrowX}px`,
                } as React.CSSProperties
              }
            >
              <span className="form-tooltip-result">{headerTip.label}</span>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
