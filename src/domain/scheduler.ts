import type {
  ByeAssignment,
  GeneratedSchedule,
  PitchAvailabilitySlot,
  ScheduledMatch,
  ScheduleOptions,
  SchedulerPitch,
  SchedulerTeam,
} from "./types";

const BYE_ID = "__BYE__";

interface Pairing {
  homeTeamId: string;
  awayTeamId: string;
}

/**
 * Reorders teams so pairs sharing a `sharedGroup` (or same `homePitchId`)
 * occupy complementary Berger indices (k and m - 1 - k), guaranteeing they
 * never both play at home in the same round.
 */
function arrangeTeamsForSharedStadiums(teams: SchedulerTeam[], isOdd: boolean): string[] {
  const m = isOdd ? teams.length + 1 : teams.length;
  const slots: (string | null)[] = new Array(m).fill(null);

  const byGroup = new Map<string, SchedulerTeam[]>();
  const singles: SchedulerTeam[] = [];

  for (const team of teams) {
    const groupKey = team.sharedGroup ?? (team.homePitchId ? `pitch:${team.homePitchId}` : null);
    if (groupKey) {
      const list = byGroup.get(groupKey) ?? [];
      list.push(team);
      byGroup.set(groupKey, list);
    } else {
      singles.push(team);
    }
  }

  // Place complementary pairs from shared groups first (at indices k and m - 1 - k, skipping 0 for pivot)
  let pairIdx = 1;
  const leftovers: SchedulerTeam[] = [];

  for (const groupTeams of byGroup.values()) {
    let i = 0;
    while (i + 1 < groupTeams.length && pairIdx < Math.floor(m / 2)) {
      const t1 = groupTeams[i];
      const t2 = groupTeams[i + 1];
      if (t1 && t2) {
        slots[pairIdx] = t1.id;
        slots[m - 1 - pairIdx] = t2.id;
        pairIdx += 1;
      }
      i += 2;
    }
    while (i < groupTeams.length) {
      const t = groupTeams[i];
      if (t) leftovers.push(t);
      i += 1;
    }
  }

  const remaining = [...leftovers, ...singles];
  if (isOdd) {
    // Put BYE at the fixed pivot (index 0) or last free slot
    if (slots[0] === null) {
      slots[0] = BYE_ID;
    }
  }

  let remIdx = 0;
  for (let i = 0; i < m; i++) {
    if (slots[i] === null) {
      const nextTeam = remaining[remIdx];
      if (nextTeam) {
        slots[i] = nextTeam.id;
        remIdx += 1;
      } else {
        slots[i] = BYE_ID;
      }
    }
  }

  return slots.map((id) => id ?? BYE_ID);
}

/**
 * Generates first-leg round-robin pairings using the circle method with
 * home/away alternation.
 */
function generateFirstLegRounds(slots: string[]): Pairing[][] {
  const m = slots.length;
  const roundsCount = m - 1;
  const half = m / 2;

  const fixed = slots[0]!;
  const rotating = slots.slice(1);
  const rounds: Pairing[][] = [];

  for (let roundIdx = 0; roundIdx < roundsCount; roundIdx++) {
    const currentOrder = [fixed, ...rotating];
    const pairings: Pairing[] = [];

    for (let pairIdx = 0; pairIdx < half; pairIdx++) {
      const a = currentOrder[pairIdx]!;
      const b = currentOrder[m - 1 - pairIdx]!;

      // Alternate home/away for balance across rounds
      const flip = pairIdx === 0 ? roundIdx % 2 === 1 : (roundIdx + pairIdx) % 2 === 1;
      if (flip) {
        pairings.push({ homeTeamId: b, awayTeamId: a });
      } else {
        pairings.push({ homeTeamId: a, awayTeamId: b });
      }
    }

    rounds.push(pairings);

    // Rotate clockwise: last element moves to index 0 of rotating
    const last = rotating.pop()!;
    rotating.unshift(last);
  }

  return rounds;
}

function parseTimeToMinutes(hhmm: string): number {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr ?? 0);
  const m = Number(mStr ?? 0);
  return h * 60 + m;
}

function formatUtcDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

function expandPitchCandidateTimestamps(
  pitch: SchedulerPitch,
  weekStartUtc: Date,
  matchDurationMinutes: number,
): Array<{ pitchId: string; scheduledAt: string; dateKey: string; slotKey: string }> {
  const candidates: Array<{
    pitchId: string;
    scheduledAt: string;
    dateKey: string;
    slotKey: string;
  }> = [];

  // Consider the 7-day window starting at weekStartUtc
  for (let offset = 0; offset < 7; offset++) {
    const dayDate = new Date(weekStartUtc.getTime() + offset * 86_400_000);
    const dow = dayDate.getUTCDay();
    const matchingSlots: PitchAvailabilitySlot[] = pitch.availabilities.filter(
      (s) => s.dayOfWeek === dow,
    );

    for (const slot of matchingSlots) {
      const startMin = parseTimeToMinutes(slot.startTime);
      const endMin = parseTimeToMinutes(slot.endTime);
      const step = Math.max(matchDurationMinutes + 30, 120);

      for (let cursor = startMin; cursor + matchDurationMinutes <= endMin; cursor += step) {
        const hours = Math.floor(cursor / 60);
        const mins = cursor % 60;
        const ts = new Date(
          Date.UTC(
            dayDate.getUTCFullYear(),
            dayDate.getUTCMonth(),
            dayDate.getUTCDate(),
            hours,
            mins,
            0,
            0,
          ),
        );
        const dateKey = formatUtcDateKey(ts);
        const iso = ts.toISOString();
        candidates.push({
          pitchId: pitch.id,
          scheduledAt: iso,
          dateKey,
          slotKey: `${pitch.id}|${iso}`,
        });
      }
    }
  }

  return candidates;
}

/**
 * Pure constrained home-and-away round-robin schedule generator.
 * - Supports even (e.g. 16 teams -> 30 rounds) and odd team counts (with `bye`).
 * - Return leg preserves exact first-leg round order with swapped home/away (ROAF Art. 10 alin. 3).
 * - Enforces:
 *   1. No double match on the same calendar day for any team.
 *   2. Pitch day/time-slot availability with no pitch collisions.
 *   3. Balanced home/away alternation.
 *   4. Shared-stadium alternation (teams sharing a stadium do not collide).
 */
export function generateRoundRobinSchedule(
  teams: SchedulerTeam[],
  pitches: SchedulerPitch[],
  options: ScheduleOptions,
): GeneratedSchedule {
  if (teams.length < 2) {
    throw new Error("At least 2 teams are required to generate a round-robin schedule.");
  }
  if (pitches.length === 0) {
    throw new Error("At least 1 pitch with availability is required to generate a schedule.");
  }

  const isOdd = teams.length % 2 === 1;
  const slots = arrangeTeamsForSharedStadiums(teams, isOdd);
  const firstLeg = generateFirstLegRounds(slots);
  const roundsPerLeg = firstLeg.length;
  const totalRounds = roundsPerLeg * 2;

  const teamMap = new Map(teams.map((t) => [t.id, t]));

  // Guarantee shared-stadium alternation in BOTH legs:
  // for every round of leg 1, teams in the same sharedGroup must not both be HOME
  // AND must not both be AWAY (otherwise both would be HOME in leg 2).
  for (const roundPairings of firstLeg) {
    const usedSharedHome = new Set<string>();
    const usedSharedAway = new Set<string>();

    for (const pairing of roundPairings) {
      if (pairing.homeTeamId === BYE_ID || pairing.awayTeamId === BYE_ID) continue;

      const homeGroup = teamMap.get(pairing.homeTeamId)?.sharedGroup ?? null;
      const awayGroup = teamMap.get(pairing.awayTeamId)?.sharedGroup ?? null;

      // Playing each other already has one home and one away
      if (homeGroup && homeGroup === awayGroup) {
        usedSharedHome.add(homeGroup);
        usedSharedAway.add(homeGroup);
        continue;
      }

      const homeConflict = homeGroup !== null && usedSharedHome.has(homeGroup);
      const awayConflict = awayGroup !== null && usedSharedAway.has(awayGroup);

      if (homeConflict || awayConflict) {
        const prevHome = pairing.homeTeamId;
        pairing.homeTeamId = pairing.awayTeamId;
        pairing.awayTeamId = prevHome;
      }

      const finalHomeGroup = teamMap.get(pairing.homeTeamId)?.sharedGroup ?? null;
      const finalAwayGroup = teamMap.get(pairing.awayTeamId)?.sharedGroup ?? null;
      if (finalHomeGroup) usedSharedHome.add(finalHomeGroup);
      if (finalAwayGroup) usedSharedAway.add(finalAwayGroup);
    }
  }

  // Return leg: identical sequence with home/away reversed (ROAF Art. 10 alin. 3)
  const secondLeg: Pairing[][] = firstLeg.map((round) =>
    round.map((p) => ({ homeTeamId: p.awayTeamId, awayTeamId: p.homeTeamId })),
  );

  const allRounds: Array<{ roundNumber: number; leg: 1 | 2; pairings: Pairing[] }> = [
    ...firstLeg.map((pairings, idx) => ({ roundNumber: idx + 1, leg: 1 as const, pairings })),
    ...secondLeg.map((pairings, idx) => ({
      roundNumber: roundsPerLeg + idx + 1,
      leg: 2 as const,
      pairings,
    })),
  ];

  const pitchMap = new Map(pitches.map((p) => [p.id, p]));

  const daysBetweenRounds = options.daysBetweenRounds ?? 7;
  const matchDurationMinutes = options.matchDurationMinutes ?? 90;
  const startBase = new Date(`${options.startDate}T00:00:00.000Z`);
  if (Number.isNaN(startBase.getTime())) {
    throw new Error(`Invalid startDate: ${options.startDate}`);
  }

  const matches: ScheduledMatch[] = [];
  const byes: ByeAssignment[] = [];

  const usedPitchSlots = new Set<string>();
  const usedTeamDays = new Set<string>();

  for (const round of allRounds) {
    const roundWeekStart = new Date(
      startBase.getTime() + (round.roundNumber - 1) * daysBetweenRounds * 86_400_000,
    );

    for (const pairing of round.pairings) {
      if (pairing.homeTeamId === BYE_ID) {
        byes.push({
          roundNumber: round.roundNumber,
          leg: round.leg,
          teamId: pairing.awayTeamId,
        });
        continue;
      }
      if (pairing.awayTeamId === BYE_ID) {
        byes.push({
          roundNumber: round.roundNumber,
          leg: round.leg,
          teamId: pairing.homeTeamId,
        });
        continue;
      }

      const homeTeam = teamMap.get(pairing.homeTeamId);
      const preferredPitch =
        homeTeam?.homePitchId ? pitchMap.get(homeTeam.homePitchId) : undefined;

      // Try home team's preferred pitch first, then any other pitch with availability
      const pitchOrder: SchedulerPitch[] = preferredPitch
        ? [preferredPitch, ...pitches.filter((p) => p.id !== preferredPitch.id)]
        : pitches;

      let assigned: ScheduledMatch | null = null;

      for (const pitch of pitchOrder) {
        const candidates = expandPitchCandidateTimestamps(
          pitch,
          roundWeekStart,
          matchDurationMinutes,
        );
        for (const cand of candidates) {
          const homeDayKey = `${pairing.homeTeamId}|${cand.dateKey}`;
          const awayDayKey = `${pairing.awayTeamId}|${cand.dateKey}`;
          if (
            usedPitchSlots.has(cand.slotKey) ||
            usedTeamDays.has(homeDayKey) ||
            usedTeamDays.has(awayDayKey)
          ) {
            continue;
          }

          usedPitchSlots.add(cand.slotKey);
          usedTeamDays.add(homeDayKey);
          usedTeamDays.add(awayDayKey);

          assigned = {
            roundNumber: round.roundNumber,
            leg: round.leg,
            homeTeamId: pairing.homeTeamId,
            awayTeamId: pairing.awayTeamId,
            pitchId: cand.pitchId,
            scheduledAt: cand.scheduledAt,
            dateKey: cand.dateKey,
          };
          break;
        }
        if (assigned) break;
      }

      if (!assigned) {
        throw new Error(
          `Unable to allocate pitch/time slot for round ${round.roundNumber} (${pairing.homeTeamId} vs ${pairing.awayTeamId}). Add more pitch availability slots.`,
        );
      }

      matches.push(assigned);
    }
  }

  return {
    matches,
    byes,
    roundsPerLeg,
    totalRounds,
  };
}
