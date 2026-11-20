"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  LogIn,
  LogOut,
  Moon,
  Shield,
  Sun,
  Trophy,
} from "lucide-react";
import type { SeasonOption } from "@/server/queries/publicQueries";
import type { SessionUser } from "@/server/auth/session";

interface AppHeaderProps {
  seasons: SeasonOption[];
  user: SessionUser | null;
  unreadCount: number;
}

const ROLE_LABELS: Record<string, string> = {
  PLAYER: "Jucător",
  CAPTAIN: "Căpitan",
  REFEREE_ORGANIZER: "Arbitru / Organizator",
  ADMIN: "Admin",
};

export function AppHeader({ seasons, user, unreadCount }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [loggingOut, setLoggingOut] = useState(false);

  const selectedSeason =
    searchParams.get("season") ??
    seasons.find((s) => s.isActive)?.slug ??
    seasons[0]?.slug ??
    "";

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    if (current === "dark") setTheme("dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("p19_theme", next);
    } catch {
      // ignore storage errors
    }
  };

  const handleSeasonChange = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("season", slug);
    const targetPath =
      pathname === "/" || pathname === "/program" || pathname === "/statistici"
        ? pathname
        : "/";
    router.push(`${targetPath}?${params.toString()}`);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  const seasonQuery = selectedSeason ? `?season=${encodeURIComponent(selectedSeason)}` : "";

  const navItems: Array<{ href: string; label: string; active: boolean }> = [
    { href: `/${seasonQuery}`, label: "Clasament", active: pathname === "/" },
    {
      href: `/program${seasonQuery}`,
      label: "Program",
      active: pathname.startsWith("/program"),
    },
    {
      href: `/statistici${seasonQuery}`,
      label: "Statistici",
      active: pathname.startsWith("/statistici"),
    },
  ];

  if (user?.role === "CAPTAIN" || user?.role === "ADMIN") {
    navItems.push({
      href: "/capitan",
      label: "Foaie de meci",
      active: pathname.startsWith("/capitan"),
    });
  }
  if (user?.role === "REFEREE_ORGANIZER" || user?.role === "ADMIN") {
    navItems.push({
      href: "/arbitru",
      label: "Panou Arbitru",
      active: pathname.startsWith("/arbitru"),
    });
  }
  if (user?.role === "ADMIN") {
    navItems.push({
      href: "/admin",
      label: "Panou Admin",
      active: pathname.startsWith("/admin"),
    });
  }

  return (
    <header
      className="p19-header-glass"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <div
        style={{
          maxWidth: "var(--container-max)",
          margin: "0 auto",
          padding: "10px var(--space-4)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-3)",
        }}
      >
        {/* Brand + Navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)", flexWrap: "wrap" }}>
          <Link
            href={`/${seasonQuery}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              textDecoration: "none",
              color: "var(--text-primary)",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: "20px",
              letterSpacing: "-0.01em",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "28px",
                height: "28px",
                borderRadius: "var(--radius-md)",
                background: "var(--accent-primary)",
                color: "var(--accent-primary-fg)",
              }}
            >
              <Trophy size={16} aria-hidden="true" />
            </span>
            <span>SuperLiga P19</span>
          </Link>

          <nav
            aria-label="Navigare principală"
            style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "6px 10px",
                  borderRadius: "var(--radius-md)",
                  fontSize: "13px",
                  fontWeight: item.active ? 700 : 500,
                  textDecoration: "none",
                  color: item.active ? "var(--accent-primary)" : "var(--text-secondary)",
                  background: item.active ? "var(--bg-subtle)" : "transparent",
                  borderBottom: item.active
                    ? "2px solid var(--accent-primary)"
                    : "2px solid transparent",
                  transition: "background-color var(--motion-fast), color var(--motion-fast)",
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Controls: Season selector, Theme toggle, Notifications, Auth */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {seasons.length > 0 ? (
            <label style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <span className="sr-only">Selectează sezon</span>
              <select
                aria-label="Selectează sezon"
                className="p19-select"
                value={selectedSeason}
                onChange={(e) => handleSeasonChange(e.target.value)}
                style={{ width: "auto", minWidth: "160px", padding: "6px 10px" }}
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.slug}>
                    {s.name} ({s.status === "COMPLETED" ? "Încheiat" : s.status === "ACTIVE" ? "Activ" : "Draft"})
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <button
            type="button"
            onClick={toggleTheme}
            className="p19-btn-secondary"
            aria-label={theme === "dark" ? "Comută pe tema deschisă" : "Comută pe tema întunecată"}
            style={{ width: "36px", height: "36px", padding: 0 }}
          >
            {theme === "dark" ? (
              <Sun size={16} aria-hidden="true" />
            ) : (
              <Moon size={16} aria-hidden="true" />
            )}
          </button>

          {user ? (
            <>
              <Link
                href="/notificari"
                className="p19-btn-secondary"
                aria-label={`Notificări reprogramare (${unreadCount} necitite)`}
                style={{
                  position: "relative",
                  width: "36px",
                  height: "36px",
                  padding: 0,
                  textDecoration: "none",
                }}
              >
                <Bell size={16} aria-hidden="true" />
                {unreadCount > 0 ? (
                  <span
                    className="tabular-nums"
                    style={{
                      position: "absolute",
                      top: "-4px",
                      right: "-4px",
                      minWidth: "18px",
                      height: "18px",
                      padding: "0 4px",
                      borderRadius: "var(--radius-full)",
                      background: "var(--card-red-fill)",
                      color: "#FFFFFF",
                      fontSize: "10px",
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {unreadCount}
                  </span>
                ) : null}
              </Link>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-subtle)",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                }}
              >
                <Shield size={13} aria-hidden="true" />
                <strong style={{ color: "var(--text-primary)" }}>{user.name}</strong>
                <span>· {ROLE_LABELS[user.role] ?? user.role}</span>
              </span>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="p19-btn-secondary"
                aria-label="Deconectare"
              >
                <LogOut size={14} aria-hidden="true" />
                <span>Ieșire</span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="p19-btn-primary"
              style={{ textDecoration: "none" }}
            >
              <LogIn size={14} aria-hidden="true" />
              <span>Autentificare</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
