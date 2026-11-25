import { AlertTriangle, Info } from "lucide-react";

interface AlertBannerProps {
  variant: "retroactive" | "reschedule";
  title: string;
  description: string;
  roleChip?: string;
  action?: React.ReactNode;
}

export function AlertBanner({
  variant,
  title,
  description,
  roleChip,
  action,
}: AlertBannerProps) {
  const isRetro = variant === "retroactive";

  if (isRetro) {
    return (
      <section className="alert-retro animate-enter" role="alert">
        <div className="alert-retro-content">
          <AlertTriangle
            size={20}
            aria-hidden="true"
            style={{ marginTop: "2px", flexShrink: 0 }}
          />
          <div>
            <div className="alert-retro-title">
              <span className="pulse-alert-dot" aria-hidden="true" />
              <span>{title}</span>
              {roleChip ? <span className="role-chip">{roleChip}</span> : null}
            </div>
            <p style={{ margin: 0, fontSize: "13px", lineHeight: "19px" }}>
              {description}
            </p>
          </div>
        </div>
        {action ? <div style={{ flexShrink: 0 }}>{action}</div> : null}
      </section>
    );
  }

  return (
    <div className="alert-banner alert-info animate-enter" role="status">
      <div className="alert-body">
        <Info
          size={18}
          aria-hidden="true"
          style={{ marginTop: "2px", flexShrink: 0 }}
        />
        <div>
          <span className="alert-title">{title}</span>
          <span>{description}</span>
        </div>
      </div>
      {action ? <div style={{ flexShrink: 0 }}>{action}</div> : null}
    </div>
  );
}
