import type { IcalFixtureInput } from "./types";

function escapeIcalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatIcalUtc(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}${mo}${day}T${h}${mi}${s}Z`;
}

/**
 * Pure RFC 5545 iCalendar (.ics) generator for a team's season fixtures.
 */
export function generateTeamIcal(
  teamName: string,
  seasonName: string,
  fixtures: IcalFixtureInput[],
  nowIso: string = "2026-07-01T00:00:00.000Z",
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//P19 SuperLiga Romania//Fixtures//RO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcalText(`${teamName} — ${seasonName}`)}`,
  ];

  const dtStamp = formatIcalUtc(nowIso);

  const sorted = [...fixtures].sort((a, b) =>
    a.scheduledAt.localeCompare(b.scheduledAt) || a.roundNumber - b.roundNumber,
  );

  for (const fx of sorted) {
    const startMs = new Date(fx.scheduledAt).getTime();
    const endIso = new Date(startMs + fx.durationMinutes * 60_000).toISOString();
    const summary = `Etapa ${fx.roundNumber}: ${fx.homeTeamName} vs ${fx.awayTeamName}`;
    const status = fx.status === "POSTPONED" ? "TENTATIVE" : "CONFIRMED";

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:p19-fixture-${fx.id}@superliga.local`);
    lines.push(`DTSTAMP:${dtStamp}`);
    lines.push(`DTSTART:${formatIcalUtc(fx.scheduledAt)}`);
    lines.push(`DTEND:${formatIcalUtc(endIso)}`);
    lines.push(`SUMMARY:${escapeIcalText(summary)}`);
    if (fx.pitchName) {
      lines.push(`LOCATION:${escapeIcalText(fx.pitchName)}`);
    }
    lines.push(`STATUS:${status}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
