"use client";

import { useState } from "react";
import type { FormEntry } from "@/domain/types";

interface FormStripProps {
  teamId: string;
  entries: FormEntry[];
  onHoverMatch?: (teamId: string | null, opponentId: string | null) => void;
}

interface TooltipState {
  entry: FormEntry;
  x: number;
  y: number;
}

const RESULT_LABEL_RO: Record<"W" | "D" | "L", string> = {
  W: "Victorie",
  D: "Egal",
  L: "Înfrângere",
};

function formatShortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function FormStrip({ teamId, entries, onHoverMatch }: FormStripProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  if (entries.length === 0) {
    return (
      <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>—</span>
    );
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        position: "relative",
      }}
    >
      {entries.map((entry) => {
        const bg =
          entry.result === "W"
            ? "var(--status-win-solid)"
            : entry.result === "D"
              ? "var(--status-draw-solid)"
              : "var(--status-loss-solid)";
        const fg =
          entry.result === "W"
            ? "var(--status-win-solid-fg)"
            : entry.result === "D"
              ? "var(--status-draw-solid-fg)"
              : "var(--status-loss-solid-fg)";

        const scoreLabel = `${entry.goalsFor}–${entry.goalsAgainst}`;
        const ariaLabel = `${RESULT_LABEL_RO[entry.result]} ${scoreLabel} ${entry.isHome ? "acasă cu" : "în deplasare la"} ${entry.opponentName}, Etapa ${entry.roundNumber}`;

        const show = (el: HTMLElement) => {
          const rect = el.getBoundingClientRect();
          const clampedX = Math.min(
            Math.max(rect.left + rect.width / 2, 110),
            typeof window !== "undefined" ? window.innerWidth - 110 : 800,
          );
          setTooltip({ entry, x: clampedX, y: rect.top - 8 });
          onHoverMatch?.(teamId, entry.opponentId);
        };

        const hide = () => {
          setTooltip(null);
          onHoverMatch?.(null, null);
        };

        return (
          <button
            key={entry.fixtureId}
            type="button"
            className="p19-form-tile"
            aria-label={ariaLabel}
            style={{ background: bg, color: fg }}
            onMouseEnter={(e) => show(e.currentTarget)}
            onFocus={(e) => show(e.currentTarget)}
            onMouseLeave={hide}
            onBlur={hide}
          >
            {entry.result}
          </button>
        );
      })}

      {tooltip ? (
        <div
          role="tooltip"
          style={{
            position: "fixed",
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: "translate(-50%, -100%)",
            zIndex: 60,
            pointerEvents: "none",
            background: "var(--tooltip-bg)",
            color: "var(--tooltip-fg)",
            border: "1px solid var(--tooltip-border)",
            borderRadius: "var(--radius-md)",
            padding: "6px 10px",
            boxShadow: "var(--shadow-md)",
            whiteSpace: "nowrap",
            textAlign: "left",
          }}
        >
          <div className="tabular-nums" style={{ fontSize: "12px", fontWeight: 600 }}>
            {tooltip.entry.isHome ? "vs" : "@"} {tooltip.entry.opponentName} ·{" "}
            {tooltip.entry.goalsFor}–{tooltip.entry.goalsAgainst}
          </div>
          <div style={{ fontSize: "10.5px", color: "var(--tooltip-muted)" }}>
            Etapa {tooltip.entry.roundNumber}
            {tooltip.entry.date ? ` · ${formatShortDate(tooltip.entry.date)}` : ""}
          </div>
        </div>
      ) : null}
    </div>
  );
}
