import { AlertTriangle, CalendarClock } from "lucide-react";

interface AlertBannerProps {
  variant: "retroactive" | "reschedule";
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function AlertBanner({
  variant,
  title,
  description,
  action,
}: AlertBannerProps) {
  const isRetro = variant === "retroactive";

  return (
    <div
      role={isRetro ? "alert" : "status"}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "var(--space-3)",
        padding: "var(--space-3) var(--space-4)",
        borderRadius: "var(--radius-lg)",
        background: isRetro ? "var(--alert-retro-bg)" : "var(--info-bg)",
        color: isRetro ? "var(--alert-retro-fg)" : "var(--info-fg)",
        borderLeft: `4px solid ${isRetro ? "var(--alert-retro-border)" : "var(--info-fg)"}`,
      }}
    >
      <div style={{ display: "flex", gap: "var(--space-3)", flex: "1 1 260px" }}>
        <span style={{ marginTop: "2px", flexShrink: 0 }}>
          {isRetro ? (
            <AlertTriangle size={18} aria-hidden="true" />
          ) : (
            <CalendarClock size={18} aria-hidden="true" />
          )}
        </span>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "13px" }}>
            {isRetro && (
              <span
                className="p19-pulse-dot"
                style={{ background: "var(--alert-retro-border)" }}
                aria-hidden="true"
              />
            )}
            <span>{title}</span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: "13px", lineHeight: "18px" }}>
            {description}
          </p>
        </div>
      </div>
      {action ? <div style={{ flexShrink: 0 }}>{action}</div> : null}
    </div>
  );
}
