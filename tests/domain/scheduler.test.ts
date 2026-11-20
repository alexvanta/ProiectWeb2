import { describe, expect, it } from "vitest";
import { generateRoundRobinSchedule } from "@/domain/scheduler";
import type { SchedulerPitch, SchedulerTeam } from "@/domain/types";

function makeWeekendPitch(id: string, name: string, sharedGroup?: string): SchedulerPitch {
  return {
    id,
    name,
    sharedGroup: sharedGroup ?? null,
    availabilities: [
      { dayOfWeek: 5, startTime: "17:00", endTime: "22:00" }, // Friday
      { dayOfWeek: 6, startTime: "14:00", endTime: "22:00" }, // Saturday
      { dayOfWeek: 0, startTime: "14:00", endTime: "22:00" }, // Sunday
      { dayOfWeek: 1, startTime: "17:00", endTime: "22:00" }, // Monday
    ],
  };
}

describe("generateRoundRobinSchedule", () => {
  it("generates a 16-team 30-round SuperLiga home-and-away schedule preserving return-leg sequence (ROAF Art. 10 alin. 3)", () => {
    const pitches: SchedulerPitch[] = [];
    const teams: SchedulerTeam[] = [];

    // Pitch 0 is shared by Team 0 and Team 1 (e.g., Arena Nationala)
    pitches.push(makeWeekendPitch("pitch-shared", "Arena Națională", "arena-nationala"));
    teams.push({
      id: "team-0",
      name: "FCSB",
      homePitchId: "pitch-shared",
      sharedGroup: "arena-nationala",
    });
    teams.push({
      id: "team-1",
      name: "Dinamo București",
      homePitchId: "pitch-shared",
      sharedGroup: "arena-nationala",
    });

    for (let i = 2; i < 16; i++) {
      const pitchId = `pitch-${i}`;
      pitches.push(makeWeekendPitch(pitchId, `Stadion ${i}`));
      teams.push({ id: `team-${i}`, name: `Echipa ${i}`, homePitchId: pitchId });
    }

    const schedule = generateRoundRobinSchedule(teams, pitches, {
      startDate: "2026-07-17",
      daysBetweenRounds: 7,
      matchDurationMinutes: 90,
    });

    expect(schedule.roundsPerLeg).toBe(15);
    expect(schedule.totalRounds).toBe(30);
    expect(schedule.byes).toHaveLength(0);
    expect(schedule.matches).toHaveLength(240);

    // Every ordered pair (home, away) appears exactly once
    const pairSet = new Set<string>();
    const homeCount = new Map<string, number>();
    const awayCount = new Map<string, number>();

    for (const m of schedule.matches) {
      expect(m.homeTeamId).not.toBe(m.awayTeamId);
      const key = `${m.homeTeamId}->${m.awayTeamId}`;
      expect(pairSet.has(key)).toBe(false);
      pairSet.add(key);
      homeCount.set(m.homeTeamId, (homeCount.get(m.homeTeamId) ?? 0) + 1);
      awayCount.set(m.awayTeamId, (awayCount.get(m.awayTeamId) ?? 0) + 1);
    }

    expect(pairSet.size).toBe(240);
    for (const t of teams) {
      expect(homeCount.get(t.id)).toBe(15);
      expect(awayCount.get(t.id)).toBe(15);
    }

    // Return leg has identical round sequence with home/away swapped
    for (let r = 1; r <= 15; r++) {
      const leg1 = schedule.matches
        .filter((m) => m.roundNumber === r)
        .map((m) => `${m.homeTeamId}:${m.awayTeamId}`)
        .sort();
      const leg2Reversed = schedule.matches
        .filter((m) => m.roundNumber === r + 15)
        .map((m) => `${m.awayTeamId}:${m.homeTeamId}`)
        .sort();
      expect(leg2Reversed).toEqual(leg1);
    }
  });

  it("supports odd team counts with automatic bye assignments per round (D-003)", () => {
    const pitches = [makeWeekendPitch("p1", "Teren 1"), makeWeekendPitch("p2", "Teren 2")];
    const teams: SchedulerTeam[] = ["A", "B", "C", "D", "E"].map((id) => ({
      id,
      name: `Echipa ${id}`,
      homePitchId: "p1",
    }));

    const schedule = generateRoundRobinSchedule(teams, pitches, {
      startDate: "2026-08-01",
    });

    expect(schedule.roundsPerLeg).toBe(5);
    expect(schedule.totalRounds).toBe(10);
    expect(schedule.matches).toHaveLength(20);
    expect(schedule.byes).toHaveLength(10);

    // Every team gets exactly 1 bye per leg (2 total)
    for (const t of teams) {
      const leg1Byes = schedule.byes.filter((b) => b.leg === 1 && b.teamId === t.id);
      const leg2Byes = schedule.byes.filter((b) => b.leg === 2 && b.teamId === t.id);
      expect(leg1Byes).toHaveLength(1);
      expect(leg2Byes).toHaveLength(1);
    }
  });

  it("enforces no double matches per calendar day, no pitch slot collisions, and shared-stadium alternation", () => {
    const sharedPitch = makeWeekendPitch("arena", "Arena Națională", "arena-group");
    const otherPitch = makeWeekendPitch("other", "Stadion Secundar");

    const teams: SchedulerTeam[] = [
      { id: "fcsb", name: "FCSB", homePitchId: "arena", sharedGroup: "arena-group" },
      { id: "dinamo", name: "Dinamo", homePitchId: "arena", sharedGroup: "arena-group" },
      { id: "rapid", name: "Rapid", homePitchId: "other" },
      { id: "cfr", name: "CFR Cluj", homePitchId: "other" },
      { id: "craiova", name: "Universitatea Craiova", homePitchId: "other" },
      { id: "ucluj", name: "Universitatea Cluj", homePitchId: "other" },
    ];

    const schedule = generateRoundRobinSchedule(teams, [sharedPitch, otherPitch], {
      startDate: "2026-07-17",
    });

    const teamDays = new Set<string>();
    const pitchSlots = new Set<string>();

    for (const m of schedule.matches) {
      // No team plays twice on the same day
      const hDay = `${m.homeTeamId}|${m.dateKey}`;
      const aDay = `${m.awayTeamId}|${m.dateKey}`;
      expect(teamDays.has(hDay)).toBe(false);
      expect(teamDays.has(aDay)).toBe(false);
      teamDays.add(hDay);
      teamDays.add(aDay);

      // No pitch collision at same timestamp
      const pSlot = `${m.pitchId}|${m.scheduledAt}`;
      expect(pitchSlots.has(pSlot)).toBe(false);
      pitchSlots.add(pSlot);
    }

    // Shared-stadium alternation: FCSB and Dinamo never both play at home in the same round
    for (let r = 1; r <= schedule.totalRounds; r++) {
      const roundMatches = schedule.matches.filter((m) => m.roundNumber === r);
      const fcsbHome = roundMatches.some((m) => m.homeTeamId === "fcsb");
      const dinamoHome = roundMatches.some((m) => m.homeTeamId === "dinamo");
      expect(fcsbHome && dinamoHome).toBe(false);
    }
  });
});
