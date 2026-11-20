export type TieBreakerCriterion =
  | "H2H_POINTS"
  | "H2H_GD"
  | "H2H_GF"
  | "H2H_AWAY_GF"
  | "OVERALL_GD"
  | "OVERALL_GF";

export interface SeasonRules {
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  matchDurationMinutes: number;
  minMatchSheetPlayers: number;
  maxMatchSheetStarters: number;
  intermediateTieBreakerOrder: TieBreakerCriterion[];
  tieBreakerOrder: TieBreakerCriterion[];
  yellowCardThresholds: number[];
  yellowCardRepeatFrom: number;
  indirectRedBanRounds: number;
  directRedMinRounds: number;
  directRedMaxRounds: number;
  directRedDefaultRounds: number;
}

export const SUPERLIGA_DEFAULT_RULES: SeasonRules = {
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  matchDurationMinutes: 90,
  minMatchSheetPlayers: 7,
  maxMatchSheetStarters: 11,
  intermediateTieBreakerOrder: ["OVERALL_GD", "OVERALL_GF"],
  tieBreakerOrder: [
    "H2H_POINTS",
    "H2H_GD",
    "H2H_GF",
    "H2H_AWAY_GF",
    "OVERALL_GD",
    "OVERALL_GF",
  ],
  yellowCardThresholds: [4, 7, 9],
  yellowCardRepeatFrom: 10,
  indirectRedBanRounds: 1,
  directRedMinRounds: 1,
  directRedMaxRounds: 24,
  directRedDefaultRounds: 2,
};

/* ---------------- Scheduler types ---------------- */

export interface SchedulerTeam {
  id: string;
  name: string;
  homePitchId?: string | null;
  /** Teams sharing the same stadium group alternate home/away rounds */
  sharedGroup?: string | null;
}

export interface PitchAvailabilitySlot {
  /** 0 = Sunday, 1 = Monday, ..., 6 = Saturday */
  dayOfWeek: number;
  /** HH:mm */
  startTime: string;
  /** HH:mm */
  endTime: string;
}

export interface SchedulerPitch {
  id: string;
  name: string;
  sharedGroup?: string | null;
  availabilities: PitchAvailabilitySlot[];
}

export interface ScheduleOptions {
  /** ISO date string (YYYY-MM-DD) for Round 1 anchor week */
  startDate: string;
  /** Days between consecutive rounds (default 7) */
  daysBetweenRounds?: number;
  /** Match duration in minutes (default 90) */
  matchDurationMinutes?: number;
}

export interface ScheduledMatch {
  roundNumber: number;
  leg: 1 | 2;
  homeTeamId: string;
  awayTeamId: string;
  pitchId: string;
  /** ISO timestamp (UTC) */
  scheduledAt: string;
  /** YYYY-MM-DD calendar day */
  dateKey: string;
}

export interface ByeAssignment {
  roundNumber: number;
  leg: 1 | 2;
  teamId: string;
}

export interface GeneratedSchedule {
  matches: ScheduledMatch[];
  byes: ByeAssignment[];
  roundsPerLeg: number;
  totalRounds: number;
}

/* ---------------- Standings types ---------------- */

export type StandingsMode = "intermediate" | "final";

export interface StandingsTeamInput {
  id: string;
  name: string;
  shortName?: string;
}

export interface PlayedFixtureInput {
  id: string;
  roundNumber: number;
  homeTeamId: string;
  awayTeamId: string;
  homeGoals: number | null;
  awayGoals: number | null;
  status: "SCHEDULED" | "PLAYED" | "POSTPONED" | "INTERRUPTED_REPLAY";
  isBye?: boolean;
  playedAt?: string | null;
  scheduledAt?: string | null;
}

export interface FormEntry {
  fixtureId: string;
  roundNumber: number;
  result: "W" | "D" | "L";
  opponentId: string;
  opponentName: string;
  goalsFor: number;
  goalsAgainst: number;
  isHome: boolean;
  date: string | null;
}

export interface TieBreakMiniTableRow {
  teamId: string;
  teamName: string;
  points: number;
  goalDifference: number;
  goalsFor: number;
  awayGoalsFor: number;
}

export interface StandingsRow {
  position: number;
  teamId: string;
  teamName: string;
  shortName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  lastFiveForm: FormEntry[];
  /** Non-null when this row was ranked via a 3+ team or H2H tie-breaker */
  tieBreakGroupId: string | null;
  tieBreakCriterion: TieBreakerCriterion | null;
}

export interface TieBreakGroupSummary {
  groupId: string;
  points: number;
  teamIds: string[];
  resolvedBy: TieBreakerCriterion | "ALPHABETICAL";
  miniTable: TieBreakMiniTableRow[];
}

export interface StandingsResult {
  mode: StandingsMode;
  rows: StandingsRow[];
  tieBreakGroups: TieBreakGroupSummary[];
}

/* ---------------- Suspensions types ---------------- */

export type DisciplineEventType =
  | "GOAL"
  | "OWN_GOAL"
  | "YELLOW_CARD"
  | "SECOND_YELLOW_RED"
  | "DIRECT_RED";

export interface DisciplineEventInput {
  id: string;
  fixtureId: string;
  playerId: string;
  teamId: string;
  type: DisciplineEventType;
  minute: number;
  /** RD Art. 41 alin. 2.2: yellows from an interrupted match replayed in full are annulled */
  isAnnulled?: boolean;
  /** Committee override for DIRECT_RED (clamped to [directRedMinRounds, directRedMaxRounds]) */
  committeeBanRounds?: number | null;
}

export interface DisciplineFixtureInput {
  id: string;
  seasonId: string;
  roundNumber: number;
  homeTeamId: string;
  awayTeamId: string;
  status: "SCHEDULED" | "PLAYED" | "POSTPONED" | "INTERRUPTED_REPLAY";
  isBye?: boolean;
  scheduledAt: string;
  /** Actual timestamp when the fixture was played (used for actual play order) */
  playedAt?: string | null;
  /** Player IDs who appeared on the submitted match sheets (both teams) */
  matchSheetPlayerIds?: string[];
}

export interface PlayerSeasonTeam {
  playerId: string;
  seasonId: string;
  teamId: string;
}

export interface CarryOverSuspensionInput {
  id: string;
  playerId: string;
  originSeasonId: string;
  originFixtureId?: string | null;
  reason: "YELLOW_ACCUMULATION" | "INDIRECT_RED" | "DIRECT_RED" | "COMMITTEE_DECISION";
  remainingRounds: number;
  carryOverToNextSeason: boolean;
}

export interface ComputedSuspension {
  id: string;
  playerId: string;
  originSeasonId: string;
  originFixtureId: string | null;
  reason: "YELLOW_ACCUMULATION" | "INDIRECT_RED" | "DIRECT_RED" | "COMMITTEE_DECISION";
  totalRounds: number;
  remainingRounds: number;
  consumedFixtureIds: string[];
  carryOverToNextSeason: boolean;
}

export interface PlayerDisciplineState {
  playerId: string;
  yellowCardsBySeason: Record<string, number>;
  redCardsTotal: number;
  activeSuspensionRounds: number;
  suspensions: ComputedSuspension[];
}

export interface SuspensionEvaluationResult {
  players: Record<string, PlayerDisciplineState>;
  /** Map of fixtureId -> set of playerIds who were ineligible entering that fixture */
  ineligibleByFixture: Record<string, string[]>;
}

export interface RetroactiveConflictAlert {
  fixtureId: string;
  roundNumber: number;
  playerId: string;
  teamId: string;
  description: string;
}

/* ---------------- iCal types ---------------- */

export interface IcalFixtureInput {
  id: string;
  roundNumber: number;
  homeTeamName: string;
  awayTeamName: string;
  pitchName: string | null;
  scheduledAt: string;
  durationMinutes: number;
  status: "SCHEDULED" | "PLAYED" | "POSTPONED" | "INTERRUPTED_REPLAY";
}
