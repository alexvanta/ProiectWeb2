import fs from "fs";
import path from "path";
import {
  FixtureStatus,
  MatchEventType,
  PrismaClient,
  SeasonStatus,
  SuspensionReason,
  UserRole,
} from "@prisma/client";
import { generateRoundRobinSchedule } from "../src/domain/scheduler";
import { SUPERLIGA_DEFAULT_RULES } from "../src/domain/types";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

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
  stage: string;
  teams: string[];
  matches: SeedMatch[];
}

interface TeamMeta {
  name: string;
  shortName: string;
  slug: string;
  crestColorA: string;
  crestColorB: string;
  pitchName: string;
  city: string;
  sharedGroup?: string;
}

const TEAM_METADATA: TeamMeta[] = [
  {
    name: "Universitatea Craiova",
    shortName: "UCV",
    slug: "universitatea-craiova",
    crestColorA: "#1D4ED8",
    crestColorB: "#1E3A8A",
    pitchName: "Stadion Ion Oblemenco",
    city: "Craiova",
  },
  {
    name: "Rapid București",
    shortName: "RAP",
    slug: "rapid-bucuresti",
    crestColorA: "#881337",
    crestColorB: "#4C0519",
    pitchName: "Superbet Arena — Giulești",
    city: "București",
  },
  {
    name: "Universitatea Cluj",
    shortName: "UCL",
    slug: "universitatea-cluj",
    crestColorA: "#0F172A",
    crestColorB: "#334155",
    pitchName: "Cluj Arena",
    city: "Cluj-Napoca",
  },
  {
    name: "CFR Cluj",
    shortName: "CFR",
    slug: "cfr-cluj",
    crestColorA: "#7F1D1D",
    crestColorB: "#450A0A",
    pitchName: "Stadion Dr. Constantin Rădulescu",
    city: "Cluj-Napoca",
  },
  {
    name: "Dinamo București",
    shortName: "DIN",
    slug: "dinamo-bucuresti",
    crestColorA: "#B91C1C",
    crestColorB: "#7F1D1D",
    pitchName: "Arena Națională",
    city: "București",
    sharedGroup: "arena-nationala",
  },
  {
    name: "Argeș Pitești",
    shortName: "ARG",
    slug: "arges-pitesti",
    crestColorA: "#6D28D9",
    crestColorB: "#4C1D95",
    pitchName: "Stadion Orășenesc Mioveni",
    city: "Pitești",
  },
  {
    name: "FCSB",
    shortName: "FCS",
    slug: "fcsb",
    crestColorA: "#DC2626",
    crestColorB: "#1D4ED8",
    pitchName: "Arena Națională",
    city: "București",
    sharedGroup: "arena-nationala",
  },
  {
    name: "UTA Arad",
    shortName: "UTA",
    slug: "uta-arad",
    crestColorA: "#991B1B",
    crestColorB: "#7F1D1D",
    pitchName: "Arena Francisc Neuman",
    city: "Arad",
  },
  {
    name: "Botoșani",
    shortName: "BOT",
    slug: "botosani",
    crestColorA: "#1E40AF",
    crestColorB: "#B91C1C",
    pitchName: "Stadion Municipal Botoșani",
    city: "Botoșani",
  },
  {
    name: "Oțelul Galați",
    shortName: "OTE",
    slug: "otelul-galati",
    crestColorA: "#0369A1",
    crestColorB: "#991B1B",
    pitchName: "Stadion Oțelul",
    city: "Galați",
  },
  {
    name: "Farul Constanța",
    shortName: "FAR",
    slug: "farul-constanta",
    crestColorA: "#0284C7",
    crestColorB: "#0C4A6E",
    pitchName: "Stadion Central Academia Hagi",
    city: "Ovidiu",
  },
  {
    name: "Petrolul Ploiești",
    shortName: "PET",
    slug: "petrolul-ploiesti",
    crestColorA: "#CA8A04",
    crestColorB: "#1E3A8A",
    pitchName: "Stadion Ilie Oană",
    city: "Ploiești",
  },
  {
    name: "Csíkszereda Miercurea Ciuc",
    shortName: "CSI",
    slug: "csikszereda-miercurea-ciuc",
    crestColorA: "#991B1B",
    crestColorB: "#1E293B",
    pitchName: "Stadion Municipal Miercurea Ciuc",
    city: "Miercurea Ciuc",
  },
  {
    name: "Unirea Slobozia",
    shortName: "SLB",
    slug: "unirea-slobozia",
    crestColorA: "#1D4ED8",
    crestColorB: "#B45309",
    pitchName: "Stadion 1 Mai Slobozia",
    city: "Slobozia",
  },
  {
    name: "Hermannstadt",
    shortName: "HER",
    slug: "hermannstadt",
    crestColorA: "#B91C1C",
    crestColorB: "#1E293B",
    pitchName: "Stadion Municipal Sibiu",
    city: "Sibiu",
  },
  {
    name: "Metaloglobus București",
    shortName: "MET",
    slug: "metaloglobus-bucuresti",
    crestColorA: "#15803D",
    crestColorB: "#064E3B",
    pitchName: "Stadion Clinceni",
    city: "București",
  },
];

const FIRST_NAMES = [
  "Andrei",
  "Alexandru",
  "Mihai",
  "Vlad",
  "Cristian",
  "Radu",
  "Ștefan",
  "Bogdan",
  "Florin",
  "Ionuț",
  "Gabriel",
  "Cătălin",
  "Dan",
  "Răzvan",
];

const LAST_NAMES = [
  "Popescu",
  "Ionescu",
  "Dumitrescu",
  "Stoica",
  "Marin",
  "Tudor",
  "Nistor",
  "Bancu",
  "Mitriță",
  "Bîrligea",
  "Olaru",
  "Cîrjan",
  "Alibec",
  "Grozav",
  "Drăguș",
  "Munteanu",
];

const POSITIONS = [
  "Portar",
  "Fundaș",
  "Fundaș",
  "Fundaș",
  "Fundaș",
  "Mijlocaș",
  "Mijlocaș",
  "Mijlocaș",
  "Mijlocaș",
  "Atacant",
  "Atacant",
  "Portar",
  "Mijlocaș",
  "Atacant",
];

const STANDARD_AVAILABILITIES = [
  { dayOfWeek: 5, startTime: "17:00", endTime: "22:00" }, // Friday
  { dayOfWeek: 6, startTime: "14:00", endTime: "22:00" }, // Saturday
  { dayOfWeek: 0, startTime: "14:00", endTime: "22:00" }, // Sunday
  { dayOfWeek: 1, startTime: "17:00", endTime: "22:00" }, // Monday
];

async function main() {
  console.log("Seeding P19 SuperLiga României (2 seasons, 16 teams, 5 demo roles)...");

  const datasetPath = path.resolve(__dirname, "seed-data/superliga-2025-2026.json");
  const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf-8")) as SeedDataset;

  // Idempotent clean reset in reverse FK order
  await prisma.session.deleteMany();
  await prisma.rescheduleNotification.deleteMany();
  await prisma.retroactiveSuspensionAlert.deleteMany();
  await prisma.resultCorrectionAudit.deleteMany();
  await prisma.suspensionConsumption.deleteMany();
  await prisma.suspension.deleteMany();
  await prisma.matchEvent.deleteMany();
  await prisma.matchSheetEntry.deleteMany();
  await prisma.matchSheet.deleteMany();
  await prisma.fixture.deleteMany();
  await prisma.playerSeasonRegistration.deleteMany();
  await prisma.seasonTeam.deleteMany();
  await prisma.user.deleteMany();
  await prisma.player.deleteMany();
  await prisma.team.deleteMany();
  await prisma.pitchAvailability.deleteMany();
  await prisma.pitch.deleteMany();
  await prisma.season.deleteMany();
  await prisma.league.deleteMany();

  // 1. League
  const league = await prisma.league.create({
    data: {
      name: "SuperLiga României",
      slug: "superliga-romaniei",
    },
  });

  // 2. Pitches (deduplicating Arena Națională shared by FCSB & Dinamo)
  const pitchByKey = new Map<string, { id: string; name: string; sharedGroup: string | null }>();
  for (const meta of TEAM_METADATA) {
    const key = `${meta.pitchName}|${meta.city}`;
    if (pitchByKey.has(key)) continue;
    const pitch = await prisma.pitch.create({
      data: {
        name: meta.pitchName,
        city: meta.city,
        sharedGroup: meta.sharedGroup ?? null,
        availabilities: {
          create: STANDARD_AVAILABILITIES,
        },
      },
    });
    pitchByKey.set(key, {
      id: pitch.id,
      name: pitch.name,
      sharedGroup: pitch.sharedGroup,
    });
  }

  // 3. Teams
  const teamByName = new Map<string, { id: string; name: string; slug: string; homePitchId: string }>();
  for (const meta of TEAM_METADATA) {
    const pitch = pitchByKey.get(`${meta.pitchName}|${meta.city}`)!;
    const team = await prisma.team.create({
      data: {
        name: meta.name,
        shortName: meta.shortName,
        slug: meta.slug,
        crestColorA: meta.crestColorA,
        crestColorB: meta.crestColorB,
        homePitchId: pitch.id,
      },
    });
    teamByName.set(team.name, {
      id: team.id,
      name: team.name,
      slug: team.slug,
      homePitchId: pitch.id,
    });
  }

  // 4. Seasons (Season 1 COMPLETED real 2025/2026 + Season 2 ACTIVE generated 2026/2027)
  const season1 = await prisma.season.create({
    data: {
      leagueId: league.id,
      name: "Sezon 2025/2026",
      slug: "2025-2026",
      status: SeasonStatus.COMPLETED,
      isActive: false,
      pointsWin: SUPERLIGA_DEFAULT_RULES.pointsWin,
      pointsDraw: SUPERLIGA_DEFAULT_RULES.pointsDraw,
      pointsLoss: SUPERLIGA_DEFAULT_RULES.pointsLoss,
      matchDurationMinutes: SUPERLIGA_DEFAULT_RULES.matchDurationMinutes,
      minMatchSheetPlayers: SUPERLIGA_DEFAULT_RULES.minMatchSheetPlayers,
      maxMatchSheetStarters: SUPERLIGA_DEFAULT_RULES.maxMatchSheetStarters,
      intermediateTieBreakerOrder: SUPERLIGA_DEFAULT_RULES.intermediateTieBreakerOrder,
      tieBreakerOrder: SUPERLIGA_DEFAULT_RULES.tieBreakerOrder,
      yellowCardThresholds: SUPERLIGA_DEFAULT_RULES.yellowCardThresholds,
      yellowCardRepeatFrom: SUPERLIGA_DEFAULT_RULES.yellowCardRepeatFrom,
      indirectRedBanRounds: SUPERLIGA_DEFAULT_RULES.indirectRedBanRounds,
      directRedMinRounds: SUPERLIGA_DEFAULT_RULES.directRedMinRounds,
      directRedMaxRounds: SUPERLIGA_DEFAULT_RULES.directRedMaxRounds,
      directRedDefaultRounds: SUPERLIGA_DEFAULT_RULES.directRedDefaultRounds,
    },
  });

  const season2 = await prisma.season.create({
    data: {
      leagueId: league.id,
      name: "Sezon 2026/2027",
      slug: "2026-2027",
      status: SeasonStatus.ACTIVE,
      isActive: true,
      pointsWin: SUPERLIGA_DEFAULT_RULES.pointsWin,
      pointsDraw: SUPERLIGA_DEFAULT_RULES.pointsDraw,
      pointsLoss: SUPERLIGA_DEFAULT_RULES.pointsLoss,
      matchDurationMinutes: SUPERLIGA_DEFAULT_RULES.matchDurationMinutes,
      minMatchSheetPlayers: SUPERLIGA_DEFAULT_RULES.minMatchSheetPlayers,
      maxMatchSheetStarters: SUPERLIGA_DEFAULT_RULES.maxMatchSheetStarters,
      intermediateTieBreakerOrder: SUPERLIGA_DEFAULT_RULES.intermediateTieBreakerOrder,
      tieBreakerOrder: SUPERLIGA_DEFAULT_RULES.tieBreakerOrder,
      yellowCardThresholds: SUPERLIGA_DEFAULT_RULES.yellowCardThresholds,
      yellowCardRepeatFrom: SUPERLIGA_DEFAULT_RULES.yellowCardRepeatFrom,
      indirectRedBanRounds: SUPERLIGA_DEFAULT_RULES.indirectRedBanRounds,
      directRedMinRounds: SUPERLIGA_DEFAULT_RULES.directRedMinRounds,
      directRedMaxRounds: SUPERLIGA_DEFAULT_RULES.directRedMaxRounds,
      directRedDefaultRounds: SUPERLIGA_DEFAULT_RULES.directRedDefaultRounds,
    },
  });

  // Link the exact same 16 teams to both Season 1 and Season 2 via SeasonTeam
  for (const team of teamByName.values()) {
    await prisma.seasonTeam.createMany({
      data: [
        { seasonId: season1.id, teamId: team.id },
        { seasonId: season2.id, teamId: team.id },
      ],
    });
  }

  // 5. Players & Season 1 Registrations (14 players per team = 224 players)
  const playersByTeamSlug = new Map<string, Array<{ id: string; fullName: string; shirtNumber: number }>>();

  for (let tIdx = 0; tIdx < TEAM_METADATA.length; tIdx++) {
    const meta = TEAM_METADATA[tIdx]!;
    const team = teamByName.get(meta.name)!;
    const teamPlayers: Array<{ id: string; fullName: string; shirtNumber: number }> = [];

    for (let pIdx = 0; pIdx < 14; pIdx++) {
      const first = FIRST_NAMES[(tIdx + pIdx) % FIRST_NAMES.length]!;
      const last = LAST_NAMES[(tIdx * 3 + pIdx) % LAST_NAMES.length]!;
      const fullName = `${first} ${last}`;
      const shirtNumber = pIdx + 1;
      const slug = `${meta.slug}-${shirtNumber}-${first.toLowerCase().replace(/[^a-z0-9]/g, "")}-${last.toLowerCase().replace(/[^a-z0-9]/g, "")}`;

      const player = await prisma.player.create({
        data: {
          fullName,
          slug,
          position: POSITIONS[pIdx] ?? "Mijlocaș",
          birthYear: 1995 + ((tIdx + pIdx) % 10),
        },
      });

      await prisma.playerSeasonRegistration.create({
        data: {
          playerId: player.id,
          seasonId: season1.id,
          teamId: team.id,
          shirtNumber,
          isCaptain: pIdx === 0,
        },
      });

      teamPlayers.push({ id: player.id, fullName: player.fullName, shirtNumber });
    }

    playersByTeamSlug.set(meta.slug, teamPlayers);
  }

  // 6. Demo Users for all 4 authenticated roles (+ unauthenticated Visitor = 5 roles, D-002)
  const craiovaTeam = teamByName.get("Universitatea Craiova")!;
  const craiovaPlayers = playersByTeamSlug.get("universitatea-craiova")!;
  const craiovaCaptainPlayer = craiovaPlayers[0]!;
  const craiovaRegularPlayer = craiovaPlayers[9]!;

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@superliga.ro",
      passwordHash: hashPassword("Admin123!"),
      name: "Admin Competiții",
      role: UserRole.ADMIN,
    },
  });

  const refereeUser = await prisma.user.create({
    data: {
      email: "arbitru@superliga.ro",
      passwordHash: hashPassword("Arbitru123!"),
      name: "Arbitru / Organizator FRF",
      role: UserRole.REFEREE_ORGANIZER,
    },
  });

  const captainUser = await prisma.user.create({
    data: {
      email: "capitan@craiova.ro",
      passwordHash: hashPassword("Capitan123!"),
      name: `${craiovaCaptainPlayer.fullName} (Căpitan)`,
      role: UserRole.CAPTAIN,
      teamId: craiovaTeam.id,
      playerId: craiovaCaptainPlayer.id,
    },
  });

  const playerUser = await prisma.user.create({
    data: {
      email: "jucator@craiova.ro",
      passwordHash: hashPassword("Jucator123!"),
      name: craiovaRegularPlayer.fullName,
      role: UserRole.PLAYER,
      teamId: craiovaTeam.id,
      playerId: craiovaRegularPlayer.id,
    },
  });

  // 7. Import all 240 real SuperLiga 2025/2026 matches into Season 1
  const season1Fixtures: Array<{ id: string; roundNumber: number; homeTeamId: string; awayTeamId: string; homeGoals: number; awayGoals: number }> = [];

  for (const m of dataset.matches) {
    const home = teamByName.get(m.homeTeam)!;
    const away = teamByName.get(m.awayTeam)!;
    const ts = new Date(m.playedAt);

    const created = await prisma.fixture.create({
      data: {
        seasonId: season1.id,
        roundNumber: m.roundNumber,
        leg: m.leg,
        homeTeamId: home.id,
        awayTeamId: away.id,
        pitchId: home.homePitchId,
        scheduledAt: ts,
        playedAt: ts,
        status: FixtureStatus.PLAYED,
        homeGoals: m.homeGoals,
        awayGoals: m.awayGoals,
        isBye: false,
      },
    });

    season1Fixtures.push({
      id: created.id,
      roundNumber: m.roundNumber,
      homeTeamId: home.id,
      awayTeamId: away.id,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
    });
  }

  // Seed goal events for Season 1 matches (rounds 26..30) so top scorers & match timelines are populated
  const teamIdToSlug = new Map<string, string>(
    Array.from(teamByName.values()).map((t) => [t.id, t.slug]),
  );

  for (const fx of season1Fixtures.filter((f) => f.roundNumber >= 26)) {
    const homeSlug = teamIdToSlug.get(fx.homeTeamId)!;
    const awaySlug = teamIdToSlug.get(fx.awayTeamId)!;
    const homeSquad = playersByTeamSlug.get(homeSlug)!;
    const awaySquad = playersByTeamSlug.get(awaySlug)!;

    const eventsToCreate: Array<{
      fixtureId: string;
      teamId: string;
      playerId: string;
      type: MatchEventType;
      minute: number;
    }> = [];

    for (let g = 0; g < fx.homeGoals; g++) {
      const scorer = homeSquad[9 + (g % 2)]!;
      eventsToCreate.push({
        fixtureId: fx.id,
        teamId: fx.homeTeamId,
        playerId: scorer.id,
        type: MatchEventType.GOAL,
        minute: 14 + g * 21,
      });
    }
    for (let g = 0; g < fx.awayGoals; g++) {
      const scorer = awaySquad[9 + (g % 2)]!;
      eventsToCreate.push({
        fixtureId: fx.id,
        teamId: fx.awayTeamId,
        playerId: scorer.id,
        type: MatchEventType.GOAL,
        minute: 22 + g * 19,
      });
    }

    if (eventsToCreate.length > 0) {
      await prisma.matchEvent.createMany({ data: eventsToCreate });
    }
  }

  // 8. Season 2 Registrations with cross-season transfers (preserving Season 1 history)
  const rapidPlayers = playersByTeamSlug.get("rapid-bucuresti")!;
  const fcsbPlayers = playersByTeamSlug.get("fcsb")!;
  const transferredRapidPlayer = rapidPlayers[5]!; // Transfers Rapid -> Universitatea Craiova in Season 2

  const transferOverrides = new Map<string, string>([
    [transferredRapidPlayer.id, craiovaTeam.id], // Rapid -> Universitatea Craiova
    [fcsbPlayers[8]!.id, teamByName.get("CFR Cluj")!.id], // FCSB -> CFR Cluj
    [craiovaPlayers[8]!.id, teamByName.get("Rapid București")!.id], // Universitatea Craiova -> Rapid
    [playersByTeamSlug.get("cfr-cluj")![7]!.id, teamByName.get("FCSB")!.id], // CFR Cluj -> FCSB
  ]);

  const season2SquadByTeamId = new Map<
    string,
    Array<{ id: string; fullName: string; shirtNumber: number }>
  >();

  for (const meta of TEAM_METADATA) {
    const team = teamByName.get(meta.name)!;
    const squad = playersByTeamSlug.get(meta.slug)!;

    for (let pIdx = 0; pIdx < squad.length; pIdx++) {
      const p = squad[pIdx]!;
      const destTeamId = transferOverrides.get(p.id) ?? team.id;
      await prisma.playerSeasonRegistration.create({
        data: {
          playerId: p.id,
          seasonId: season2.id,
          teamId: destTeamId,
          shirtNumber: p.shirtNumber,
          isCaptain: destTeamId === team.id && pIdx === 0,
        },
      });
      const destList = season2SquadByTeamId.get(destTeamId) ?? [];
      destList.push(p);
      season2SquadByTeamId.set(destTeamId, destList);
    }
  }

  // 9. Generate Season 2 schedule using pure src/domain/scheduler.ts
  const allPitches = await prisma.pitch.findMany({ include: { availabilities: true } });
  const schedulerTeams = TEAM_METADATA.map((m) => {
    const t = teamByName.get(m.name)!;
    return {
      id: t.id,
      name: t.name,
      homePitchId: t.homePitchId,
      sharedGroup: m.sharedGroup ?? null,
    };
  });
  const schedulerPitches = allPitches.map((p) => ({
    id: p.id,
    name: p.name,
    sharedGroup: p.sharedGroup,
    availabilities: p.availabilities.map((a) => ({
      dayOfWeek: a.dayOfWeek,
      startTime: a.startTime,
      endTime: a.endTime,
    })),
  }));

  const generated = generateRoundRobinSchedule(schedulerTeams, schedulerPitches, {
    startDate: "2026-07-17",
    daysBetweenRounds: 7,
    matchDurationMinutes: 90,
  });

  // Seed Season 2 fixtures; mark rounds 1..11 as PLAYED with deterministic demo scores
  // so Season 2 has full 5-match FORMA strips, rich top scorers, and Round 12 as current SCHEDULED round
  const SEASON2_PLAYED_ROUNDS = 11;
  const SEASON2_CURRENT_ROUND = SEASON2_PLAYED_ROUNDS + 1;

  const season2Fixtures: Array<{
    id: string;
    roundNumber: number;
    homeTeamId: string;
    awayTeamId: string;
    scheduledAt: Date;
    homeGoals: number | null;
    awayGoals: number | null;
  }> = [];

  for (let idx = 0; idx < generated.matches.length; idx++) {
    const gm = generated.matches[idx]!;
    const isPlayed = gm.roundNumber <= SEASON2_PLAYED_ROUNDS;
    const homeGoals = isPlayed
      ? (idx * 3 + gm.roundNumber + (idx % 5 === 0 ? 1 : 0)) % 4
      : null;
    const awayGoals = isPlayed
      ? (idx * 2 + gm.roundNumber + (idx % 7 === 0 ? 1 : 0)) % 3
      : null;
    const scheduledAt = new Date(gm.scheduledAt);

    const fx = await prisma.fixture.create({
      data: {
        seasonId: season2.id,
        roundNumber: gm.roundNumber,
        leg: gm.leg,
        homeTeamId: gm.homeTeamId,
        awayTeamId: gm.awayTeamId,
        pitchId: gm.pitchId,
        scheduledAt,
        playedAt: isPlayed ? scheduledAt : null,
        status: isPlayed ? FixtureStatus.PLAYED : FixtureStatus.SCHEDULED,
        homeGoals,
        awayGoals,
        isBye: false,
      },
    });
    season2Fixtures.push({
      id: fx.id,
      roundNumber: gm.roundNumber,
      homeTeamId: gm.homeTeamId,
      awayTeamId: gm.awayTeamId,
      scheduledAt,
      homeGoals,
      awayGoals,
    });
  }

  // Seed GOAL and disciplinary (YELLOW_CARD / SECOND_YELLOW_RED / DIRECT_RED) events
  // for Season 2 played fixtures (rounds 1..11).
  // All active suspensions are triggered in Round 11 so no player ever plays/scores while suspended.
  const fcsbTeam = teamByName.get("FCSB")!;
  const rapidTeam = teamByName.get("Rapid București")!;

  const craiovaDirectRedPlayer = (season2SquadByTeamId.get(craiovaTeam.id) ?? [])[4]!;
  const fcsbYellowBanPlayer = (season2SquadByTeamId.get(fcsbTeam.id) ?? [])[5]!;
  const rapidIndirectRedPlayer = (season2SquadByTeamId.get(rapidTeam.id) ?? [])[3]!;

  const round11SuspendedIds = new Set<string>([
    craiovaDirectRedPlayer.id,
    fcsbYellowBanPlayer.id,
    rapidIndirectRedPlayer.id,
  ]);

  const teamOrderIndex = new Map<string, number>(
    TEAM_METADATA.map((m, i) => [teamByName.get(m.name)!.id, i]),
  );
  const season2YellowCount = new Map<string, number>();

  for (const fx of season2Fixtures.filter((f) => f.roundNumber <= SEASON2_PLAYED_ROUNDS)) {
    const homeSquad = season2SquadByTeamId.get(fx.homeTeamId) ?? [];
    const awaySquad = season2SquadByTeamId.get(fx.awayTeamId) ?? [];

    const homeAttackers = homeSquad.slice(-3);
    const awayAttackers = awaySquad.slice(-3);

    const eventsToCreate: Array<{
      fixtureId: string;
      teamId: string;
      playerId: string;
      type: MatchEventType;
      minute: number;
    }> = [];
    const bookedInMatch = new Set<string>();

    const pushYellow = (teamId: string, playerId: string, minute: number, maxYellows = 3) => {
      if (bookedInMatch.has(playerId)) return;
      const currentCount = season2YellowCount.get(playerId) ?? 0;
      if (currentCount >= maxYellows) return;
      bookedInMatch.add(playerId);
      season2YellowCount.set(playerId, currentCount + 1);
      eventsToCreate.push({
        fixtureId: fx.id,
        teamId,
        playerId,
        type: MatchEventType.YELLOW_CARD,
        minute,
      });
    };

    for (let g = 0; g < (fx.homeGoals ?? 0); g++) {
      const attackerIdx = g === 0 ? 0 : (g + fx.roundNumber) % homeAttackers.length;
      const scorer = homeAttackers[attackerIdx]!;
      eventsToCreate.push({
        fixtureId: fx.id,
        teamId: fx.homeTeamId,
        playerId: scorer.id,
        type: MatchEventType.GOAL,
        minute: 12 + g * 23,
      });
    }

    for (let g = 0; g < (fx.awayGoals ?? 0); g++) {
      const attackerIdx = g === 0 ? 0 : (g + fx.roundNumber) % awayAttackers.length;
      const scorer = awayAttackers[attackerIdx]!;
      eventsToCreate.push({
        fixtureId: fx.id,
        teamId: fx.awayTeamId,
        playerId: scorer.id,
        type: MatchEventType.GOAL,
        minute: 19 + g * 26,
      });
    }

    // Deterministic yellow cards across rounds 1..10 (strictly capped at 3 yellows for non-suspended players)
    if (fx.roundNumber <= 10) {
      const homeIdx = teamOrderIndex.get(fx.homeTeamId) ?? 0;
      const awayIdx = teamOrderIndex.get(fx.awayTeamId) ?? 0;

      // Defenders / midfielders (indices 1..7)
      if ((fx.roundNumber + homeIdx) % 3 !== 0) {
        const candidate = homeSquad[1 + ((fx.roundNumber + homeIdx) % 7)];
        if (candidate && !round11SuspendedIds.has(candidate.id)) {
          pushYellow(fx.homeTeamId, candidate.id, 28 + ((fx.roundNumber * 7 + homeIdx * 3) % 45), 3);
        }
      }
      if ((fx.roundNumber + awayIdx) % 3 !== 1) {
        const candidate = awaySquad[1 + ((fx.roundNumber * 2 + awayIdx) % 7)];
        if (candidate && !round11SuspendedIds.has(candidate.id)) {
          pushYellow(fx.awayTeamId, candidate.id, 33 + ((fx.roundNumber * 5 + awayIdx * 4) % 48), 3);
        }
      }

      // Realistic yellow cards for top scorers (max 2 yellows so they stay eligible in all rounds)
      const homeLeadScorer = homeAttackers[0];
      if (
        homeLeadScorer &&
        !round11SuspendedIds.has(homeLeadScorer.id) &&
        ((homeIdx % 2 === 0 && (fx.roundNumber === 3 || fx.roundNumber === 7)) ||
          (homeIdx % 2 === 1 && (fx.roundNumber === 4 || fx.roundNumber === 9)))
      ) {
        pushYellow(fx.homeTeamId, homeLeadScorer.id, 54 + (homeIdx % 20), 2);
      }

      const awayLeadScorer = awayAttackers[0];
      if (
        awayLeadScorer &&
        !round11SuspendedIds.has(awayLeadScorer.id) &&
        ((awayIdx % 2 === 0 && fx.roundNumber === 6) ||
          (awayIdx % 2 === 1 && fx.roundNumber === 8))
      ) {
        pushYellow(fx.awayTeamId, awayLeadScorer.id, 62 + (awayIdx % 18), 2);
      }
    }

    // FCSB midfielder accumulates 4 yellows in Rounds 2, 5, 8, and 11 -> 1-round suspension for Round 12
    if (
      (fx.homeTeamId === fcsbTeam.id || fx.awayTeamId === fcsbTeam.id) &&
      (fx.roundNumber === 2 || fx.roundNumber === 5 || fx.roundNumber === 8 || fx.roundNumber === 11)
    ) {
      const minuteByRound: Record<number, number> = { 2: 34, 5: 61, 8: 49, 11: 73 };
      pushYellow(fcsbTeam.id, fcsbYellowBanPlayer.id, minuteByRound[fx.roundNumber] ?? 60, 4);
    }

    // Universitatea Craiova defender receives DIRECT_RED in Round 11 -> 2-round suspension for Rounds 12..13
    if (
      fx.roundNumber === SEASON2_PLAYED_ROUNDS &&
      (fx.homeTeamId === craiovaTeam.id || fx.awayTeamId === craiovaTeam.id)
    ) {
      eventsToCreate.push({
        fixtureId: fx.id,
        teamId: craiovaTeam.id,
        playerId: craiovaDirectRedPlayer.id,
        type: MatchEventType.DIRECT_RED,
        minute: 78,
      });
    }

    // Rapid București defender receives 2nd yellow (INDIRECT_RED) in Round 11 -> 1-round suspension for Round 12
    if (
      fx.roundNumber === SEASON2_PLAYED_ROUNDS &&
      (fx.homeTeamId === rapidTeam.id || fx.awayTeamId === rapidTeam.id)
    ) {
      eventsToCreate.push(
        {
          fixtureId: fx.id,
          teamId: rapidTeam.id,
          playerId: rapidIndirectRedPlayer.id,
          type: MatchEventType.YELLOW_CARD,
          minute: 41,
        },
        {
          fixtureId: fx.id,
          teamId: rapidTeam.id,
          playerId: rapidIndirectRedPlayer.id,
          type: MatchEventType.SECOND_YELLOW_RED,
          minute: 82,
        },
      );
    }

    if (eventsToCreate.length > 0) {
      await prisma.matchEvent.createMany({ data: eventsToCreate });
    }
  }

  // Active suspensions generated strictly in Season 2026/2027 (Round 11 -> active for Round 12)
  const craiovaR11Fx = season2Fixtures.find(
    (f) =>
      f.roundNumber === SEASON2_PLAYED_ROUNDS &&
      (f.homeTeamId === craiovaTeam.id || f.awayTeamId === craiovaTeam.id),
  )!;
  const fcsbR11Fx = season2Fixtures.find(
    (f) =>
      f.roundNumber === SEASON2_PLAYED_ROUNDS &&
      (f.homeTeamId === fcsbTeam.id || f.awayTeamId === fcsbTeam.id),
  )!;
  const rapidR11Fx = season2Fixtures.find(
    (f) =>
      f.roundNumber === SEASON2_PLAYED_ROUNDS &&
      (f.homeTeamId === rapidTeam.id || f.awayTeamId === rapidTeam.id),
  )!;

  await prisma.suspension.createMany({
    data: [
      {
        playerId: craiovaDirectRedPlayer.id,
        originSeasonId: season2.id,
        originFixtureId: craiovaR11Fx.id,
        reason: SuspensionReason.DIRECT_RED,
        totalRounds: 2,
        remainingRounds: 2,
        carryOverToNextSeason: false,
        notes: "Cartonaș roșu direct în Etapa 11 (Sezon 2026/2027) — suspendat 2 etape începând cu Etapa 12.",
      },
      {
        playerId: fcsbYellowBanPlayer.id,
        originSeasonId: season2.id,
        originFixtureId: fcsbR11Fx.id,
        reason: SuspensionReason.YELLOW_ACCUMULATION,
        totalRounds: 1,
        remainingRounds: 1,
        carryOverToNextSeason: false,
        notes: "Cumul de 4 cartonașe galbene atins în Etapa 11 (Sezon 2026/2027) — suspendat pentru Etapa 12.",
      },
      {
        playerId: rapidIndirectRedPlayer.id,
        originSeasonId: season2.id,
        originFixtureId: rapidR11Fx.id,
        reason: SuspensionReason.INDIRECT_RED,
        totalRounds: 1,
        remainingRounds: 1,
        carryOverToNextSeason: false,
        notes: "Două cartonașe galbene (roșu indirect) în Etapa 11 (Sezon 2026/2027) — suspendat pentru Etapa 12.",
      },
    ],
  });

  // Add sample match sheet, audited correction, and reschedule notification in Season 2
  const samplePlayedFx = season2Fixtures.find(
    (f) => f.roundNumber === 1 && (f.homeTeamId === craiovaTeam.id || f.awayTeamId === craiovaTeam.id),
  );
  if (samplePlayedFx) {
    const craiovaSeason2Eligible = season2SquadByTeamId.get(craiovaTeam.id) ?? [];
    await prisma.matchSheet.create({
      data: {
        fixtureId: samplePlayedFx.id,
        teamId: craiovaTeam.id,
        submittedById: captainUser.id,
        entries: {
          create: craiovaSeason2Eligible.slice(0, 11).map((p) => ({
            playerId: p.id,
            isStarter: true,
            shirtNumber: p.shirtNumber,
          })),
        },
      },
    });

    await prisma.resultCorrectionAudit.create({
      data: {
        fixtureId: samplePlayedFx.id,
        actorId: refereeUser.id,
        reason: "Corecție minut marcator conform raportului suplimentar al arbitrului de rezervă.",
        beforeSnapshot: {
          homeGoals: samplePlayedFx.homeGoals ?? 0,
          awayGoals: samplePlayedFx.awayGoals ?? 0,
          note: "Minut gol 67",
        },
        afterSnapshot: {
          homeGoals: samplePlayedFx.homeGoals ?? 0,
          awayGoals: samplePlayedFx.awayGoals ?? 0,
          note: "Minut gol 68",
        },
      },
    });
  }

  const upcomingCraiovaFx = season2Fixtures.find(
    (f) =>
      f.roundNumber === SEASON2_CURRENT_ROUND &&
      (f.homeTeamId === craiovaTeam.id || f.awayTeamId === craiovaTeam.id),
  );
  if (upcomingCraiovaFx) {
    const newTime = new Date(upcomingCraiovaFx.scheduledAt.getTime() + 2 * 3_600_000);
    await prisma.rescheduleNotification.createMany({
      data: [captainUser.id, playerUser.id].map((uid) => ({
        fixtureId: upcomingCraiovaFx.id,
        userId: uid,
        oldScheduledAt: upcomingCraiovaFx.scheduledAt,
        newScheduledAt: newTime,
        oldPitchName: "Stadion Ion Oblemenco",
        newPitchName: "Stadion Ion Oblemenco",
        message: `Meciul din Etapa ${SEASON2_CURRENT_ROUND} a fost reprogramat cu 2 ore mai târziu din motive de televizare.`,
      })),
    });
  }

  console.log(
    `Seed complete: 1 league, 16 teams, 2 seasons (240 real 2025/2026 matches + ${generated.matches.length} generated 2026/2027 matches), 224 players, 4 transfers, 3 active Season 2026/2027 suspensions, 4 demo accounts (admin=${adminUser.email}).`,
  );
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
