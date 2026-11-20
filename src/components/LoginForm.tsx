"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogIn } from "lucide-react";

const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@superliga.ro", pass: "Admin123!", desc: "Sezoane, echipe, transferuri, program, conturi" },
  { role: "Arbitru / Organizator", email: "arbitru@superliga.ro", pass: "Arbitru123!", desc: "Rezultate, corecții audit, reprogramări, alerte" },
  { role: "Căpitan (Univ. Craiova)", email: "capitan@craiova.ro", pass: "Capitan123!", desc: "Depunere foaie de meci + notificări" },
  { role: "Jucător (Univ. Craiova)", email: "jucator@craiova.ro", pass: "Jucator123!", desc: "Status personal + notificări reprogramare" },
];

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Autentificare eșuată.");
        return;
      }
      const role = data.user?.role;
      if (role === "ADMIN") router.push("/admin");
      else if (role === "REFEREE_ORGANIZER") router.push("/arbitru");
      else if (role === "CAPTAIN") router.push("/capitan");
      else router.push("/notificari");
      router.refresh();
    } catch {
      setError("Eroare de rețea la autentificare.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "var(--space-5)", maxWidth: "560px", margin: "0 auto" }}>
      <form
        onSubmit={handleSubmit}
        className="p19-panel"
        style={{ padding: "var(--space-6)", display: "grid", gap: "var(--space-4)" }}
      >
        <div>
          <h1 className="font-display" style={{ margin: 0, fontSize: "26px" }}>
            Autentificare platformă P19
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
            Conturile sunt create exclusiv de Administrator (fără auto-înregistrare publică).
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            style={{
              padding: "10px 12px",
              borderRadius: "var(--radius-md)",
              background: "var(--card-red-bg)",
              color: "var(--card-red-fg)",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        ) : null}

        <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
          Email
          <input
            type="email"
            required
            className="p19-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ex: arbitru@superliga.ro"
          />
        </label>

        <label style={{ display: "grid", gap: "6px", fontSize: "13px", fontWeight: 600 }}>
          Parolă
          <input
            type="password"
            required
            className="p19-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        <button type="submit" disabled={loading} className="p19-btn-primary">
          <LogIn size={15} aria-hidden="true" />
          <span>{loading ? "Se autentifică..." : "Intră în cont"}</span>
        </button>
      </form>

      {/* Demo roles quick-fill panel */}
      <section className="p19-panel" style={{ padding: "var(--space-4)" }}>
        <h2 className="font-display" style={{ margin: "0 0 var(--space-3)", fontSize: "18px" }}>
          Conturi demo pre-încărcate (click pentru completare rapidă)
        </h2>
        <div style={{ display: "grid", gap: "8px" }}>
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => {
                setEmail(acc.email);
                setPassword(acc.pass);
              }}
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-subtle)",
                color: "var(--text-primary)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: "13px" }}>{acc.role}</div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{acc.desc}</div>
              </div>
              <span className="font-mono-audit" style={{ fontSize: "11.5px", color: "var(--accent-primary)" }}>
                {acc.email}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
