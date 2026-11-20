import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { computeStandings } from "@/domain/standings";
import {
  SUPERLIGA_DEFAULT_RULES,
  type PlayedFixtureInput,
  type StandingsTeamInput,
} from "@/domain/types";

interface SeedMatch {
  roundNumber: number;
  leg: 1 | 2;
  date: string;
  time: string;
  playedAt: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
}

interface SeedDataset {
  league: string;
  season: string;
  teams: string[];
  matches: SeedMatch[];
}

interface OfficialRow {
  position: number;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

function parseOfficialStandings(filePath: string): OfficialRow[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Skip header row
  return lines.slice(1).map((line) => {
    const cols = line.split("\t").map((c) => c.trim());
    // Handle Unicode minus sign (−) in goal difference column
    const gdStr = (cols[8] ?? "0").replace("−", "-").replace("+", "");
    return {
      position: Number(cols[0]),
      teamName: cols[1] ?? "",
      played: Number(cols[2]),
      won: Number(cols[3]),
      drawn: Number(cols[4]),
      lost: Number(cols[5]),
      goalsFor: Number(cols[6]),
      goalsAgainst: Number(cols[7]),
      goalDifference: Number(gdStr),
      points: Number(cols[9]),
    };
  });
}

describe("Real SuperLiga 2025/2026 regular season validation", () => {
  it("produces standings 100% identical to official-standings-2025-2026.txt (including the 32-pt tie-breaker)", () => {
    const jsonPath = path.resolve(
      __dirname,
      "../../prisma/seed-data/superliga-2025-2026.json",
    );
    const officialPath = path.resolve(
      __dirname,
      "../../prisma/seed-data/official-standings-2025-2026.txt",
    );

    const dataset = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as SeedDataset;
    const official = parseOfficialStandings(officialPath);

    expect(dataset.teams).toHaveLength(16);
    expect(dataset.matches).toHaveLength(240);
    expect(official).toHaveLength(16);

    const teams: StandingsTeamInput[] = dataset.teams.map((name) => ({
      id: name,
      name,
    }));

    const fixtures: PlayedFixtureInput[] = dataset.matches.map((m, idx) => ({
      id: `s2526-${idx + 1}`,
      roundNumber: m.roundNumber,
      homeTeamId: m.homeTeam,
      awayTeamId: m.awayTeam,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
      status: "PLAYED",
      playedAt: m.playedAt,
    }));

    const computed = computeStandings(teams, fixtures, SUPERLIGA_DEFAULT_RULES, "final");

    expect(computed.rows).toHaveLength(16);

    const actualNormalized: OfficialRow[] = computed.rows.map((r) => ({
      position: r.position,
      teamName: r.teamName,
      played: r.played,
      won: r.won,
      drawn: r.drawn,
      lost: r.lost,
      goalsFor: r.goalsFor,
      goalsAgainst: r.goalsAgainst,
      goalDifference: r.goalDifference,
      points: r.points,
    }));

    expect(actualNormalized).toEqual(official);

    // Explicit assertion on the real 32-point tie-breaker (#12 vs #13)
    const rank12 = computed.rows[11];
    const rank13 = computed.rows[12];
    expect(rank12?.teamName).toBe("Petrolul Ploiești");
    expect(rank12?.points).toBe(32);
    expect(rank13?.teamName).toBe("Csíkszereda Miercurea Ciuc");
    expect(rank13?.points).toBe(32);
  });
});
