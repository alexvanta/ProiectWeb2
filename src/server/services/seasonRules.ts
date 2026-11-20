import {
  SUPERLIGA_DEFAULT_RULES,
  type SeasonRules,
  type TieBreakerCriterion,
} from "@/domain/types";
import type { Season } from "@prisma/client";

const VALID_CRITERIA = new Set<TieBreakerCriterion>([
  "H2H_POINTS",
  "H2H_GD",
  "H2H_GF",
  "H2H_AWAY_GF",
  "OVERALL_GD",
  "OVERALL_GF",
]);

function parseCriteriaArray(
  raw: unknown,
  fallback: TieBreakerCriterion[],
): TieBreakerCriterion[] {
  if (!Array.isArray(raw)) return fallback;
  const filtered = raw.filter(
    (item): item is TieBreakerCriterion =>
      typeof item === "string" && VALID_CRITERIA.has(item as TieBreakerCriterion),
  );
  return filtered.length > 0 ? filtered : fallback;
}

function parseNumberArray(raw: unknown, fallback: number[]): number[] {
  if (!Array.isArray(raw)) return fallback;
  const nums = raw.filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  return nums.length > 0 ? nums : fallback;
}

export function extractSeasonRules(
  season: Pick<
    Season,
    | "pointsWin"
    | "pointsDraw"
    | "pointsLoss"
    | "matchDurationMinutes"
    | "minMatchSheetPlayers"
    | "maxMatchSheetStarters"
    | "intermediateTieBreakerOrder"
    | "tieBreakerOrder"
    | "yellowCardThresholds"
    | "yellowCardRepeatFrom"
    | "indirectRedBanRounds"
    | "directRedMinRounds"
    | "directRedMaxRounds"
    | "directRedDefaultRounds"
  >,
): SeasonRules {
  return {
    pointsWin: season.pointsWin,
    pointsDraw: season.pointsDraw,
    pointsLoss: season.pointsLoss,
    matchDurationMinutes: season.matchDurationMinutes,
    minMatchSheetPlayers: season.minMatchSheetPlayers,
    maxMatchSheetStarters: season.maxMatchSheetStarters,
    intermediateTieBreakerOrder: parseCriteriaArray(
      season.intermediateTieBreakerOrder,
      SUPERLIGA_DEFAULT_RULES.intermediateTieBreakerOrder,
    ),
    tieBreakerOrder: parseCriteriaArray(
      season.tieBreakerOrder,
      SUPERLIGA_DEFAULT_RULES.tieBreakerOrder,
    ),
    yellowCardThresholds: parseNumberArray(
      season.yellowCardThresholds,
      SUPERLIGA_DEFAULT_RULES.yellowCardThresholds,
    ),
    yellowCardRepeatFrom: season.yellowCardRepeatFrom,
    indirectRedBanRounds: season.indirectRedBanRounds,
    directRedMinRounds: season.directRedMinRounds,
    directRedMaxRounds: season.directRedMaxRounds,
    directRedDefaultRounds: season.directRedDefaultRounds,
  };
}
