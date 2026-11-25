/**
 * Local crest file mapping for the 16 seeded SuperLiga României teams.
 * Keys match the exact `Team.slug` values from `prisma/seed.ts`,
 * pointing to the exact filenames in `public/crests/`.
 */
export const TEAM_CREST_FILES: Record<string, string> = {
  "universitatea-craiova": "/crests/universitatea-craiova.svg",
  "rapid-bucuresti": "/crests/rapid_bucuresti.svg",
  "universitatea-cluj": "/crests/universitatea-cluj.svg",
  "cfr-cluj": "/crests/cfr_cluj.svg",
  "dinamo-bucuresti": "/crests/dinamo-bucuresti.svg",
  "arges-pitesti": "/crests/arges-pitesti.svg",
  fcsb: "/crests/fcsb.svg",
  "uta-arad": "/crests/uta-arad.svg",
  botosani: "/crests/botosani.svg",
  "otelul-galati": "/crests/otelul-galati.svg",
  "farul-constanta": "/crests/farul-constanta.svg",
  "petrolul-ploiesti": "/crests/petrolul-ploiesti.svg",
  "csikszereda-miercurea-ciuc": "/crests/csikszereda-miercurea-ciuc.svg",
  "unirea-slobozia": "/crests/unirea-slobozia.png",
  hermannstadt: "/crests/hermannstadt.png",
  "metaloglobus-bucuresti": "/crests/metaloglobus-bucuresti.svg",
};

/**
 * Backup lookup by 3-letter `Team.shortName` when `slug` is omitted.
 */
export const TEAM_CREST_BY_SHORT_NAME: Record<string, string> = {
  UCV: "/crests/universitatea-craiova.svg",
  RAP: "/crests/rapid_bucuresti.svg",
  UCL: "/crests/universitatea-cluj.svg",
  CFR: "/crests/cfr_cluj.svg",
  DIN: "/crests/dinamo-bucuresti.svg",
  ARG: "/crests/arges-pitesti.svg",
  FCS: "/crests/fcsb.svg",
  UTA: "/crests/uta-arad.svg",
  BOT: "/crests/botosani.svg",
  OTE: "/crests/otelul-galati.svg",
  FAR: "/crests/farul-constanta.svg",
  PET: "/crests/petrolul-ploiesti.svg",
  CSI: "/crests/csikszereda-miercurea-ciuc.svg",
  SLB: "/crests/unirea-slobozia.png",
  HER: "/crests/hermannstadt.png",
  MET: "/crests/metaloglobus-bucuresti.svg",
};

export function resolveTeamCrestSrc(
  slug?: string | null,
  shortName?: string | null,
): string | null {
  if (slug) {
    return TEAM_CREST_FILES[slug.trim().toLowerCase()] ?? null;
  }
  if (shortName) {
    return TEAM_CREST_BY_SHORT_NAME[shortName.trim().toUpperCase()] ?? null;
  }
  return null;
}
