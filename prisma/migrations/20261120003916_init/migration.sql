-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'CAPTAIN', 'REFEREE_ORGANIZER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "FixtureStatus" AS ENUM ('SCHEDULED', 'PLAYED', 'POSTPONED', 'INTERRUPTED_REPLAY');

-- CreateEnum
CREATE TYPE "MatchEventType" AS ENUM ('GOAL', 'OWN_GOAL', 'YELLOW_CARD', 'SECOND_YELLOW_RED', 'DIRECT_RED');

-- CreateEnum
CREATE TYPE "SuspensionReason" AS ENUM ('YELLOW_ACCUMULATION', 'INDIRECT_RED', 'DIRECT_RED', 'COMMITTEE_DECISION');

-- CreateEnum
CREATE TYPE "RetroactiveAlertStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED');

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "SeasonStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "pointsWin" INTEGER NOT NULL DEFAULT 3,
    "pointsDraw" INTEGER NOT NULL DEFAULT 1,
    "pointsLoss" INTEGER NOT NULL DEFAULT 0,
    "matchDurationMinutes" INTEGER NOT NULL DEFAULT 90,
    "minMatchSheetPlayers" INTEGER NOT NULL DEFAULT 7,
    "maxMatchSheetStarters" INTEGER NOT NULL DEFAULT 11,
    "intermediateTieBreakerOrder" JSONB NOT NULL DEFAULT '["OVERALL_GD","OVERALL_GF"]',
    "tieBreakerOrder" JSONB NOT NULL DEFAULT '["H2H_POINTS","H2H_GD","H2H_GF","H2H_AWAY_GF","OVERALL_GD","OVERALL_GF"]',
    "yellowCardThresholds" JSONB NOT NULL DEFAULT '[4,7,9]',
    "yellowCardRepeatFrom" INTEGER NOT NULL DEFAULT 10,
    "indirectRedBanRounds" INTEGER NOT NULL DEFAULT 1,
    "directRedMinRounds" INTEGER NOT NULL DEFAULT 1,
    "directRedMaxRounds" INTEGER NOT NULL DEFAULT 24,
    "directRedDefaultRounds" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pitch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT,
    "sharedGroup" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pitch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PitchAvailability" (
    "id" TEXT NOT NULL,
    "pitchId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "PitchAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "crestColorA" TEXT NOT NULL DEFAULT '#156842',
    "crestColorB" TEXT NOT NULL DEFAULT '#0F5132',
    "homePitchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonTeam" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeasonTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "position" TEXT NOT NULL DEFAULT 'Mijlocaș',
    "birthYear" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerSeasonRegistration" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "shirtNumber" INTEGER,
    "isCaptain" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "PlayerSeasonRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fixture" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "leg" INTEGER NOT NULL DEFAULT 1,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "pitchId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "playedAt" TIMESTAMP(3),
    "status" "FixtureStatus" NOT NULL DEFAULT 'SCHEDULED',
    "homeGoals" INTEGER,
    "awayGoals" INTEGER,
    "isBye" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fixture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchSheet" (
    "id" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchSheetEntry" (
    "id" TEXT NOT NULL,
    "matchSheetId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "isStarter" BOOLEAN NOT NULL DEFAULT true,
    "shirtNumber" INTEGER,

    CONSTRAINT "MatchSheetEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchEvent" (
    "id" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "type" "MatchEventType" NOT NULL,
    "minute" INTEGER NOT NULL,
    "isAnnulled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResultCorrectionAudit" (
    "id" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "beforeSnapshot" JSONB NOT NULL,
    "afterSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResultCorrectionAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suspension" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "originSeasonId" TEXT NOT NULL,
    "originFixtureId" TEXT,
    "reason" "SuspensionReason" NOT NULL,
    "totalRounds" INTEGER NOT NULL,
    "remainingRounds" INTEGER NOT NULL,
    "carryOverToNextSeason" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suspension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuspensionConsumption" (
    "id" TEXT NOT NULL,
    "suspensionId" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuspensionConsumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetroactiveSuspensionAlert" (
    "id" TEXT NOT NULL,
    "correctionAuditId" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RetroactiveAlertStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "RetroactiveSuspensionAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RescheduleNotification" (
    "id" TEXT NOT NULL,
    "fixtureId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "oldScheduledAt" TIMESTAMP(3) NOT NULL,
    "newScheduledAt" TIMESTAMP(3) NOT NULL,
    "oldPitchName" TEXT,
    "newPitchName" TEXT,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RescheduleNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "teamId" TEXT,
    "playerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "League_slug_key" ON "League"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Season_slug_key" ON "Season"("slug");

-- CreateIndex
CREATE INDEX "Season_leagueId_isActive_idx" ON "Season"("leagueId", "isActive");

-- CreateIndex
CREATE INDEX "PitchAvailability_pitchId_dayOfWeek_idx" ON "PitchAvailability"("pitchId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "PitchAvailability_pitchId_dayOfWeek_startTime_endTime_key" ON "PitchAvailability"("pitchId", "dayOfWeek", "startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE INDEX "SeasonTeam_teamId_idx" ON "SeasonTeam"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonTeam_seasonId_teamId_key" ON "SeasonTeam"("seasonId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_slug_key" ON "Player"("slug");

-- CreateIndex
CREATE INDEX "PlayerSeasonRegistration_seasonId_teamId_idx" ON "PlayerSeasonRegistration"("seasonId", "teamId");

-- CreateIndex
CREATE INDEX "PlayerSeasonRegistration_playerId_seasonId_idx" ON "PlayerSeasonRegistration"("playerId", "seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSeasonRegistration_playerId_seasonId_teamId_key" ON "PlayerSeasonRegistration"("playerId", "seasonId", "teamId");

-- CreateIndex
CREATE INDEX "Fixture_seasonId_roundNumber_idx" ON "Fixture"("seasonId", "roundNumber");

-- CreateIndex
CREATE INDEX "Fixture_seasonId_status_idx" ON "Fixture"("seasonId", "status");

-- CreateIndex
CREATE INDEX "Fixture_homeTeamId_idx" ON "Fixture"("homeTeamId");

-- CreateIndex
CREATE INDEX "Fixture_awayTeamId_idx" ON "Fixture"("awayTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchSheet_fixtureId_teamId_key" ON "MatchSheet"("fixtureId", "teamId");

-- CreateIndex
CREATE INDEX "MatchSheetEntry_playerId_idx" ON "MatchSheetEntry"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchSheetEntry_matchSheetId_playerId_key" ON "MatchSheetEntry"("matchSheetId", "playerId");

-- CreateIndex
CREATE INDEX "MatchEvent_fixtureId_minute_idx" ON "MatchEvent"("fixtureId", "minute");

-- CreateIndex
CREATE INDEX "MatchEvent_playerId_type_idx" ON "MatchEvent"("playerId", "type");

-- CreateIndex
CREATE INDEX "ResultCorrectionAudit_fixtureId_createdAt_idx" ON "ResultCorrectionAudit"("fixtureId", "createdAt");

-- CreateIndex
CREATE INDEX "Suspension_playerId_remainingRounds_idx" ON "Suspension"("playerId", "remainingRounds");

-- CreateIndex
CREATE INDEX "Suspension_originSeasonId_idx" ON "Suspension"("originSeasonId");

-- CreateIndex
CREATE INDEX "SuspensionConsumption_fixtureId_idx" ON "SuspensionConsumption"("fixtureId");

-- CreateIndex
CREATE UNIQUE INDEX "SuspensionConsumption_suspensionId_fixtureId_key" ON "SuspensionConsumption"("suspensionId", "fixtureId");

-- CreateIndex
CREATE INDEX "RetroactiveSuspensionAlert_status_createdAt_idx" ON "RetroactiveSuspensionAlert"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RetroactiveSuspensionAlert_fixtureId_idx" ON "RetroactiveSuspensionAlert"("fixtureId");

-- CreateIndex
CREATE INDEX "RescheduleNotification_userId_readAt_createdAt_idx" ON "RescheduleNotification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_playerId_key" ON "User"("playerId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_teamId_idx" ON "User"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PitchAvailability" ADD CONSTRAINT "PitchAvailability_pitchId_fkey" FOREIGN KEY ("pitchId") REFERENCES "Pitch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_homePitchId_fkey" FOREIGN KEY ("homePitchId") REFERENCES "Pitch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonTeam" ADD CONSTRAINT "SeasonTeam_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonTeam" ADD CONSTRAINT "SeasonTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSeasonRegistration" ADD CONSTRAINT "PlayerSeasonRegistration_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSeasonRegistration" ADD CONSTRAINT "PlayerSeasonRegistration_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSeasonRegistration" ADD CONSTRAINT "PlayerSeasonRegistration_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_pitchId_fkey" FOREIGN KEY ("pitchId") REFERENCES "Pitch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSheet" ADD CONSTRAINT "MatchSheet_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSheet" ADD CONSTRAINT "MatchSheet_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSheet" ADD CONSTRAINT "MatchSheet_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSheetEntry" ADD CONSTRAINT "MatchSheetEntry_matchSheetId_fkey" FOREIGN KEY ("matchSheetId") REFERENCES "MatchSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchSheetEntry" ADD CONSTRAINT "MatchSheetEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultCorrectionAudit" ADD CONSTRAINT "ResultCorrectionAudit_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResultCorrectionAudit" ADD CONSTRAINT "ResultCorrectionAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suspension" ADD CONSTRAINT "Suspension_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suspension" ADD CONSTRAINT "Suspension_originSeasonId_fkey" FOREIGN KEY ("originSeasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suspension" ADD CONSTRAINT "Suspension_originFixtureId_fkey" FOREIGN KEY ("originFixtureId") REFERENCES "Fixture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuspensionConsumption" ADD CONSTRAINT "SuspensionConsumption_suspensionId_fkey" FOREIGN KEY ("suspensionId") REFERENCES "Suspension"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuspensionConsumption" ADD CONSTRAINT "SuspensionConsumption_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuspensionConsumption" ADD CONSTRAINT "SuspensionConsumption_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetroactiveSuspensionAlert" ADD CONSTRAINT "RetroactiveSuspensionAlert_correctionAuditId_fkey" FOREIGN KEY ("correctionAuditId") REFERENCES "ResultCorrectionAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetroactiveSuspensionAlert" ADD CONSTRAINT "RetroactiveSuspensionAlert_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetroactiveSuspensionAlert" ADD CONSTRAINT "RetroactiveSuspensionAlert_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetroactiveSuspensionAlert" ADD CONSTRAINT "RetroactiveSuspensionAlert_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetroactiveSuspensionAlert" ADD CONSTRAINT "RetroactiveSuspensionAlert_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescheduleNotification" ADD CONSTRAINT "RescheduleNotification_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescheduleNotification" ADD CONSTRAINT "RescheduleNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
