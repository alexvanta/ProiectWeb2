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
      <form onSubmit={handleSubmit} className="panel animate-enter">
        <div
          className="panel-header"
          style={{ backgroundImage: "var(--hero-glow)", padding: "var(--space-5)" }}
        >
          <div>
            <h1 className="page-title" style={{ fontSize: "26px", lineHeight: "30px" }}>
              Autentificare platformă P19
            </h1>
            <p className="page-meta">
              Conturile sunt create exclusiv de Administrator (fără auto-înregistrare publică).
            </p>
          </div>
        </div>

        <div style={{ padding: "var(--space-5)", display: "grid", gap: "var(--space-4)" }}>
          {error ? (
            <div
              role="alert"
              className="status-badge status-suspended"
              style={{ padding: "10px 12px", whiteSpace: "normal", borderRadius: "var(--radius-md)" }}
            >
              {error}
            </div>
          ) : null}

          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              required
              className="p19-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ex: arbitru@superliga.ro"
            />
          </div>

          <div className="field">
            <label htmlFor="login-password">Parolă</label>
            <input
              id="login-password"
              type="password"
              required
              className="p19-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary">
            <LogIn size={15} aria-hidden="true" />
            <span>{loading ? "Se autentifică..." : "Intră în cont"}</span>
          </button>
        </div>
      </form>

      {/* Demo roles quick-fill panel */}
      <section className="panel animate-enter" style={{ animationDelay: "60ms" }}>
        <div className="panel-header">
          <h2 className="panel-title">Conturi demo pre-încărcate</h2>
          <span className="demo-pill">Click pentru completare</span>
        </div>
        <div className="team-directory">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              onClick={() => {
                setEmail(acc.email);
                setPassword(acc.pass);
              }}
              className="team-dir-link"
              style={{
                width: "100%",
                border: "none",
                borderBottom: "1px solid var(--border-subtle)",
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "var(--font-sans)",
              }}
            >
              <div>
                <span className="summary-name">{acc.role}</span>
                <span className="summary-sub">{acc.desc}</span>
              </div>
              <span className="mono" style={{ color: "var(--accent-primary)", fontWeight: 600 }}>
                {acc.email}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
