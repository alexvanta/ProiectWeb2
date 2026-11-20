"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check } from "lucide-react";
import { AlertBanner } from "./AlertBanner";

export interface NotificationItem {
  id: string;
  fixtureId: string;
  matchLabel: string;
  roundNumber: number;
  oldScheduledAt: string;
  newScheduledAt: string;
  oldPitchName: string | null;
  newPitchName: string | null;
  message: string;
  readAt: string | null;
}

export function NotificationsClient({
  items,
}: {
  items: NotificationItem[];
}) {
  const router = useRouter();
  const [list, setList] = useState(items);
  const [busyId, setBusyId] = useState<string | null>(null);

  const markAsRead = async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: "PATCH",
      });
      if (res.ok) {
        setList((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
          ),
        );
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  if (list.length === 0) {
    return (
      <div className="p19-panel" style={{ padding: "var(--space-6)", color: "var(--text-muted)" }}>
        Nu ai notificări de reprogramare în acest moment.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      {list.map((n) => {
        const oldStr = new Date(n.oldScheduledAt).toLocaleString("ro-RO", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        const newStr = new Date(n.newScheduledAt).toLocaleString("ro-RO", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <div key={n.id} style={{ opacity: n.readAt ? 0.68 : 1 }}>
            <AlertBanner
              variant="reschedule"
              title={`Etapa ${n.roundNumber} · ${n.matchLabel} ${n.readAt ? "(Citită)" : "(Nouă)"}`}
              description={`${n.message} Program vechi: ${oldStr}${n.oldPitchName ? ` (${n.oldPitchName})` : ""} → Program nou: ${newStr}${n.newPitchName ? ` (${n.newPitchName})` : ""}.`}
              action={
                !n.readAt ? (
                  <button
                    type="button"
                    disabled={busyId === n.id}
                    onClick={() => markAsRead(n.id)}
                    className="p19-btn-secondary"
                  >
                    <Check size={14} aria-hidden="true" />
                    <span>{busyId === n.id ? "Se salvează..." : "Marchează citită"}</span>
                  </button>
                ) : null
              }
            />
          </div>
        );
      })}
    </div>
  );
}
