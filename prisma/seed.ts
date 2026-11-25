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

  // Seed late-season disciplinary events in Round 30 of Season 1 producing carry-over suspensions
  const round30Fixture = season1Fixtures.find((f) => f.roundNumber === 30)!;
  const rapidPlayers = playersByTeamSlug.get("rapid-bucuresti")!;
  const fcsbPlayers = playersByTeamSlug.get("fcsb")!;
  const transferredBannedPlayer = rapidPlayers[5]!; // Transfers Rapid -> Universitatea Craiova in Season 2 with 2-round direct red carry-over
  const craiovaBannedPlayer = craiovaPlayers[6]!; // 1-round yellow accumulation carry-over into Season 2

  await prisma.matchEvent.create({
    data: {
      fixtureId: round30Fixture.id,
      teamId: teamByName.get("Rapid București")!.id,
      playerId: transferredBannedPlayer.id,
      type: MatchEventType.DIRECT_RED,
      minute: 84,
    },
  });

  // 8. Season 2 Registrations with cross-season transfers (preserving Season 1 history)
  const transferOverrides = new Map<string, string>([
    [transferredBannedPlayer.id, craiovaTeam.id], // Rapid -> Universitatea Craiova
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

  // Carry-over suspensions from end of Season 1 into Season 2
  await prisma.suspension.createMany({
    data: [
      {
        playerId: transferredBannedPlayer.id,
        originSeasonId: season1.id,
        originFixtureId: round30Fixture.id,
        reason: SuspensionReason.DIRECT_RED,
        totalRounds: 2,
        remainingRounds: 2,
        carryOverToNextSeason: true,
        notes: "Cartonaș roșu direct în etapa 30 (Sezon 2025/2026) — reportat în Sezon 2026/2027 după transfer la Universitatea Craiova.",
      },
      {
        playerId: craiovaBannedPlayer.id,
        originSeasonId: season1.id,
        originFixtureId: round30Fixture.id,
        reason: SuspensionReason.YELLOW_ACCUMULATION,
        totalRounds: 1,
        remainingRounds: 1,
        carryOverToNextSeason: true,
        notes: "Cumul 4 cartonașe galbene în finalul Sezonului 2025/2026 — reportat pentru etapa 1 din Sezon 2026/2027.",
      },
    ],
  });

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

  // Seed Season 2 fixtures; mark rounds 1..3 as PLAYED with deterministic demo scores so Season 2 is visibly live
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
    const isPlayed = gm.roundNumber <= 3;
    const homeGoals = isPlayed ? (idx * 3 + gm.roundNumber) % 4 : null;
    const awayGoals = isPlayed ? (idx * 2 + gm.roundNumber) % 3 : null;
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

  // Seed GOAL events for Season 2 played fixtures (rounds 1..3), matching exact scores
  // and strictly excluding suspended players (transferredBannedPlayer, craiovaBannedPlayer)
  const season2SuspendedIds = new Set<string>([
    transferredBannedPlayer.id,
    craiovaBannedPlayer.id,
  ]);

  for (const fx of season2Fixtures.filter((f) => f.roundNumber <= 3)) {
    const homeEligible = (season2SquadByTeamId.get(fx.homeTeamId) ?? []).filter(
      (p) => !season2SuspendedIds.has(p.id),
    );
    const awayEligible = (season2SquadByTeamId.get(fx.awayTeamId) ?? []).filter(
      (p) => !season2SuspendedIds.has(p.id),
    );

    const homeAttackers = homeEligible.slice(-3);
    const awayAttackers = awayEligible.slice(-3);

    const eventsToCreate: Array<{
      fixtureId: string;
      teamId: string;
      playerId: string;
      type: MatchEventType;
      minute: number;
    }> = [];

    for (let g = 0; g < (fx.homeGoals ?? 0); g++) {
      const scorer = homeAttackers[(g + (fx.roundNumber % 2)) % homeAttackers.length]!;
      eventsToCreate.push({
        fixtureId: fx.id,
        teamId: fx.homeTeamId,
        playerId: scorer.id,
        type: MatchEventType.GOAL,
        minute: 12 + g * 23,
      });
    }

    for (let g = 0; g < (fx.awayGoals ?? 0); g++) {
      const scorer = awayAttackers[(g + (fx.roundNumber % 2)) % awayAttackers.length]!;
      eventsToCreate.push({
        fixtureId: fx.id,
        teamId: fx.awayTeamId,
        playerId: scorer.id,
        type: MatchEventType.GOAL,
        minute: 19 + g * 26,
      });
    }

    if (eventsToCreate.length > 0) {
      await prisma.matchEvent.createMany({ data: eventsToCreate });
    }
  }

  // Add sample match sheet, audited correction, and reschedule notification in Season 2
  const samplePlayedFx = season2Fixtures.find(
    (f) => f.roundNumber === 1 && (f.homeTeamId === craiovaTeam.id || f.awayTeamId === craiovaTeam.id),
  );
  if (samplePlayedFx) {
    await prisma.matchSheet.create({
      data: {
        fixtureId: samplePlayedFx.id,
        teamId: craiovaTeam.id,
        submittedById: captainUser.id,
        entries: {
          create: craiovaPlayers
            .filter((p) => p.id !== craiovaBannedPlayer.id)
            .slice(0, 11)
            .map((p) => ({
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
        beforeSnapshot: { homeGoals: 2, awayGoals: 1, note: "Minut gol 67" },
        afterSnapshot: { homeGoals: 2, awayGoals: 1, note: "Minut gol 68" },
      },
    });
  }

  const upcomingCraiovaFx = season2Fixtures.find(
    (f) => f.roundNumber === 4 && (f.homeTeamId === craiovaTeam.id || f.awayTeamId === craiovaTeam.id),
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
        message: "Meciul din Etapa 4 a fost reprogramat cu 2 ore mai târziu din motive de televizare.",
      })),
    });
  }

  console.log(
    `Seed complete: 1 league, 16 teams, 2 seasons (240 real 2025/2026 matches + ${generated.matches.length} generated 2026/2027 matches), 224 players, 4 transfers, 2 carry-over suspensions, 4 demo accounts (admin=${adminUser.email}).`,
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
