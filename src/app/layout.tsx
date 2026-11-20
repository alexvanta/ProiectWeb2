import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AppHeader } from "@/components/AppHeader";
import { getCurrentUser } from "@/server/auth/rbac";
import {
  getAllSeasons,
  getUnreadNotificationCount,
  type SeasonOption,
} from "@/server/queries/publicQueries";
import type { SessionUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "SuperLiga României — Clasament, Program și Suspendări",
  description:
    "Platforma P19 pentru sezonul regular SuperLiga României: clasament live, program tur-retur, foi de meci, suspendări și statistici.",
};

const THEME_INIT_SCRIPT = `
(function(){
  try {
    var saved = localStorage.getItem('p19_theme');
    if (saved === 'dark' || saved === 'light') {
      document.documentElement.dataset.theme = saved;
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.dataset.theme = 'dark';
    }
  } catch(e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let seasons: SeasonOption[] = [];
  let user: SessionUser | null = null;
  let unreadCount = 0;

  try {
    [seasons, user] = await Promise.all([getAllSeasons(), getCurrentUser()]);
    if (user) {
      unreadCount = await getUnreadNotificationCount(user.id);
    }
  } catch {
    // Graceful fallback if DB is unreachable during static checks
  }

  return (
    <html lang="ro" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <Suspense fallback={null}>
          <AppHeader seasons={seasons} user={user} unreadCount={unreadCount} />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
