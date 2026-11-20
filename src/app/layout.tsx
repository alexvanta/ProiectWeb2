import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SuperLiga României — Clasament, Program și Suspendări",
  description:
    "Platforma P19 pentru sezonul regular SuperLiga României: clasament live, program tur-retur, foi de meci, suspendări și statistici.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
