import { describe, expect, it } from "vitest";
import { generateTeamIcal } from "@/domain/ical";

describe("generateTeamIcal", () => {
  it("generates valid RFC 5545 VCALENDAR with VEVENT entries and escaping", () => {
    const ics = generateTeamIcal(
      "Universitatea Craiova",
      "Sezon 2026/2027",
      [
        {
          id: "fx-1",
          roundNumber: 1,
          homeTeamName: "Universitatea Craiova",
          awayTeamName: "Rapid București",
          pitchName: "Stadion Ion Oblemenco, Craiova",
          scheduledAt: "2026-07-18T18:00:00.000Z",
          durationMinutes: 90,
          status: "SCHEDULED",
        },
        {
          id: "fx-2",
          roundNumber: 2,
          homeTeamName: "CFR Cluj",
          awayTeamName: "Universitatea Craiova",
          pitchName: "Stadion Dr. Constantin Rădulescu",
          scheduledAt: "2026-07-25T18:00:00.000Z",
          durationMinutes: 90,
          status: "POSTPONED",
        },
      ],
      "2026-07-01T00:00:00.000Z",
    );

    expect(ics).toContain("BEGIN:VCALENDAR\r\n");
    expect(ics).toContain("END:VCALENDAR\r\n");
    expect(ics).toContain("UID:p19-fixture-fx-1@superliga.local");
    expect(ics).toContain("DTSTART:20260718T180000Z");
    expect(ics).toContain("DTEND:20260718T193000Z");
    expect(ics).toContain("LOCATION:Stadion Ion Oblemenco\\, Craiova");
    expect(ics).toContain("STATUS:CONFIRMED");
    expect(ics).toContain("STATUS:TENTATIVE");
  });
});
