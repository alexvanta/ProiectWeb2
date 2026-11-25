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
      className={`card-count tabular ${isYellow ? "card-count-yellow" : "card-count-red"}`}
      aria-label={isYellow ? `${count} cartonașe galbene` : `${count} cartonașe roșii`}
    >
      <span
        aria-hidden="true"
        className={`card-glyph ${isYellow ? "card-glyph-yellow" : "card-glyph-red"}`}
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
    PLAYED: { label: "Jucat", cls: "status-badge status-played" },
    SCHEDULED: { label: "Programat", cls: "status-badge status-scheduled" },
    POSTPONED: { label: "Amânat", cls: "status-badge status-postponed" },
    INTERRUPTED_REPLAY: { label: "Rejucat", cls: "status-badge status-corrected" },
  }[status];

  return <span className={cfg.cls}>{cfg.label}</span>;
}

export function EligibilityBadge({
  suspendedRounds,
}: {
  suspendedRounds: number;
}) {
  if (suspendedRounds <= 0) {
    return <span className="status-badge status-played">Eligibil</span>;
  }

  return (
    <span className="status-badge status-suspended tabular">
      <Lock size={12} aria-hidden="true" />
      Suspendat · {suspendedRounds} {suspendedRounds === 1 ? "etapă" : "etape"}
    </span>
  );
}
