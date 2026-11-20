import { Lock } from "lucide-react";

export function CardCountBadge({
  type,
  count,
}: {
  type: "yellow" | "red";
  count: number;
}) {
  const isYellow = type === "yellow";
  return (
    <span
      className="tabular-nums"
      aria-label={isYellow ? `${count} cartonașe galbene` : `${count} cartonașe roșii`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "2px 7px",
        borderRadius: "var(--radius-sm)",
        background: isYellow ? "var(--card-yellow-bg)" : "var(--card-red-bg)",
        color: isYellow ? "var(--card-yellow-fg)" : "var(--card-red-fg)",
        fontSize: "12px",
        fontWeight: 600,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          width: "9px",
          height: "12px",
          borderRadius: "2px",
          background: isYellow ? "var(--card-yellow-fill)" : "var(--card-red-fill)",
          border: isYellow ? "1px solid var(--card-yellow-border)" : "1px solid transparent",
        }}
      />
      {count}
    </span>
  );
}

export function FixtureStatusBadge({
  status,
}: {
  status: "SCHEDULED" | "PLAYED" | "POSTPONED" | "INTERRUPTED_REPLAY";
}) {
  const cfg = {
    PLAYED: {
      label: "Jucat",
      bg: "var(--status-win-bg)",
      fg: "var(--status-win-fg)",
    },
    SCHEDULED: {
      label: "Programat",
      bg: "var(--info-bg)",
      fg: "var(--info-fg)",
    },
    POSTPONED: {
      label: "Amânat",
      bg: "var(--status-draw-bg)",
      fg: "var(--status-draw-fg)",
    },
    INTERRUPTED_REPLAY: {
      label: "Rejucat",
      bg: "var(--alert-retro-bg)",
      fg: "var(--alert-retro-fg)",
    },
  }[status];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: "var(--radius-md)",
        background: cfg.bg,
        color: cfg.fg,
        fontSize: "11px",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}

export function EligibilityBadge({
  suspendedRounds,
}: {
  suspendedRounds: number;
}) {
  if (suspendedRounds <= 0) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "2px 8px",
          borderRadius: "var(--radius-md)",
          background: "var(--status-win-bg)",
          color: "var(--status-win-fg)",
          fontSize: "12px",
          fontWeight: 600,
        }}
      >
        Eligibil
      </span>
    );
  }

  return (
    <span
      className="tabular-nums"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "2px 8px",
        borderRadius: "var(--radius-md)",
        background: "var(--card-red-bg)",
        color: "var(--card-red-fg)",
        fontSize: "12px",
        fontWeight: 600,
      }}
    >
      <Lock size={12} aria-hidden="true" />
      Suspendat · {suspendedRounds} {suspendedRounds === 1 ? "etapă" : "etape"}
    </span>
  );
}
