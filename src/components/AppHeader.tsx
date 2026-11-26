"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, LogOut, Moon, Shield, Sun } from "lucide-react";
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
  const [iconRotation, setIconRotation] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const logoRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = logoRef.current;
    if (!logoFailed && img && img.complete && img.naturalWidth === 0) {
      setLogoFailed(true);
    }
  }, [logoFailed]);

  const selectedSeason =
    searchParams.get("season") ??
    seasons.find((s) => s.isActive)?.slug ??
    seasons[0]?.slug ??
    "";
  const selectedSeasonObj = seasons.find((s) => s.slug === selectedSeason) ?? seasons[0];
  const isSelectedSeasonActive = selectedSeasonObj?.status === "ACTIVE";

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    if (current === "dark") setTheme("dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setIconRotation((r) => r + 180);
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
    <header className="app-header">
      <div className="header-inner">
        <Link
          href={`/${seasonQuery}`}
          className="brand-group"
          aria-label="SuperLiga României — Acasă"
        >
          {logoFailed ? (
            <span className="brand-mark" aria-hidden="true">
              SL
            </span>
          ) : (
            <span className="brand-logo-wrap" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={logoRef}
                src="/superliga-logo.svg"
                alt=""
                className="brand-logo-img"
                decoding="async"
                onError={() => setLogoFailed(true)}
              />
            </span>
          )}
          <span>
            <span className="brand-title">SuperLiga României</span>
            <span className="brand-sub">Sezon regular</span>
          </span>
        </Link>

        <nav className="main-nav" aria-label="Navigație principală">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link${item.active ? " active" : ""}`}
              aria-current={item.active ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          {seasons.length > 0 ? (
            <div className="season-select-wrap">
              {isSelectedSeasonActive ? (
                <span className="ping-indicator ping-indicator-live" aria-hidden="true">
                  <span className="ping-ring animate-ping" />
                  <span className="ping-core" />
                </span>
              ) : null}
              <select
                aria-label="Selectează sezon"
                className="select-control"
                value={selectedSeason}
                onChange={(e) => handleSeasonChange(e.target.value)}
              >
                {seasons.map((s) => (
                  <option key={s.id} value={s.slug}>
                    {s.name} ({s.status === "COMPLETED" ? "Încheiat" : s.status === "ACTIVE" ? "Activ" : "Draft"})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {user ? (
            <>
              <Link
                href="/notificari"
                className="btn btn-secondary"
                aria-label={`Notificări reprogramare (${unreadCount} necitite)`}
                style={{ position: "relative", padding: "0 10px" }}
              >
                <Bell size={16} aria-hidden="true" />
                {unreadCount > 0 ? (
                  <span
                    className="tabular"
                    style={{
                      position: "absolute",
                      top: "-5px",
                      right: "-5px",
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

              <span className="demo-pill">
                <Shield size={13} aria-hidden="true" />
                <strong style={{ color: "var(--text-primary)" }}>{user.name}</strong>
                <span>· {ROLE_LABELS[user.role] ?? user.role}</span>
              </span>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="btn btn-secondary"
                aria-label="Deconectare"
              >
                <LogOut size={14} aria-hidden="true" />
                <span>Ieșire</span>
              </button>
            </>
          ) : (
            <Link href="/login" className="btn btn-primary">
              Autentificare
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className="btn btn-secondary theme-toggle-btn"
          aria-pressed={theme === "dark"}
          aria-label={theme === "dark" ? "Comută pe tema deschisă" : "Comută pe tema întunecată"}
        >
          <span
            className="theme-icon"
            style={{
              display: "inline-flex",
              transform: `rotate(${iconRotation}deg)`,
            }}
            aria-hidden="true"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </span>
          <span>{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
      </div>
    </header>
  );
}
