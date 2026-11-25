"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { FormEntry } from "@/domain/types";

interface FormStripProps {
  teamId: string;
  teamName?: string;
  entries: FormEntry[];
  onHoverMatch?: (teamId: string | null, opponentId: string | null) => void;
}

interface TooltipState {
  resultLine: string;
  metaLine: string;
  left: number;
  top: number;
  arrowX: number;
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
    month: "2-digit",
    year: "numeric",
  });
}

export function FormStrip({
  teamId,
  teamName,
  entries,
  onHoverMatch,
}: FormStripProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!tooltip) return;
    const dismiss = () => {
      setTooltip(null);
      onHoverMatch?.(null, null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("scroll", dismiss, { passive: true });
    window.addEventListener("resize", dismiss, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", dismiss);
      window.removeEventListener("resize", dismiss);
      document.removeEventListener("keydown", onKey);
    };
  }, [tooltip, onHoverMatch]);

  if (entries.length === 0) {
    return (
      <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>—</span>
    );
  }

  return (
    <div
      className="form-strip"
      aria-label={`Ultimele ${entries.length} meciuri: ${entries
        .map((e) => RESULT_LABEL_RO[e.result])
        .join(", ")}`}
    >
      {entries.map((entry) => {
        const tileCls =
          entry.result === "W"
            ? "form-tile form-w"
            : entry.result === "D"
              ? "form-tile form-d"
              : "form-tile form-l";

        const homeScore = entry.isHome ? entry.goalsFor : entry.goalsAgainst;
        const awayScore = entry.isHome ? entry.goalsAgainst : entry.goalsFor;
        const selfLabel = teamName ?? "Echipa";
        const matchLabel = entry.isHome
          ? `${homeScore}-${awayScore} (${selfLabel} - ${entry.opponentName})`
          : `${homeScore}-${awayScore} (${entry.opponentName} - ${selfLabel})`;
        const dateStr = formatShortDate(entry.date);
        const metaLine = `Etapa ${entry.roundNumber}${dateStr ? ` · ${dateStr}` : ""}`;
        const ariaLabel = `${RESULT_LABEL_RO[entry.result]}: ${matchLabel}, ${metaLine}`;

        const show = (el: HTMLElement) => {
          const rect = el.getBoundingClientRect();
          const approxWidth = Math.max(180, matchLabel.length * 6.8 + 24);
          const pad = 10;
          const centerX = rect.left + rect.width / 2;
          const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
          const left = Math.max(pad, Math.min(centerX - approxWidth / 2, vw - approxWidth - pad));
          const top = rect.bottom + 8;
          const arrowX = Math.max(12, Math.min(approxWidth - 12, centerX - left));

          setTooltip({
            resultLine: matchLabel,
            metaLine,
            left,
            top,
            arrowX,
          });
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
            className={tileCls}
            aria-label={ariaLabel}
            onMouseEnter={(e) => show(e.currentTarget)}
            onFocus={(e) => show(e.currentTarget)}
            onMouseLeave={hide}
            onBlur={hide}
          >
            {entry.result}
          </button>
        );
      })}

      {mounted && tooltip
        ? createPortal(
            <div
              role="tooltip"
              className="form-tooltip"
              style={
                {
                  left: `${tooltip.left}px`,
                  top: `${tooltip.top}px`,
                  "--arrow-x": `${tooltip.arrowX}px`,
                } as React.CSSProperties
              }
            >
              <span className="form-tooltip-result">{tooltip.resultLine}</span>
              <span className="form-tooltip-meta">{tooltip.metaLine}</span>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
