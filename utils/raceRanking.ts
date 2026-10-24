import type { RaceMode } from './raceReceipts';

export interface RaceRankingMeasurements {
  // Same unit as streamed text.length and LaneBuffer.chars: UTF-16 code units.
  outputCharacters?: unknown;
  totalMs?: number | null;
}

export function isOutputCharacterCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

// Callers supply comparable values. Equal values keep the original lane order;
// neither timing nor a formatted model identifier breaks a Time Trial tie.
export function compareRaceMeasurements(mode: RaceMode, a: RaceRankingMeasurements, b: RaceRankingMeasurements): number {
  if (mode === 'time_limit') return Number(b.outputCharacters) - Number(a.outputCharacters);
  const aMs = a.totalMs ?? Number.POSITIVE_INFINITY;
  const bMs = b.totalMs ?? Number.POSITIVE_INFINITY;
  return aMs === bMs ? 0 : aMs - bMs;
}

// Only eligible completed lanes belong in this input. Incomplete legacy evidence
// makes the whole Time Trial ranking unavailable, not a win for the known subset.
// History needs only a leader, so keep its selection linear without sorting.
export function selectRaceLeader<T>(mode: RaceMode, candidates: readonly T[], measurements: (lane: T) => RaceRankingMeasurements) {
  let leader: T | null = null;
  let best: RaceRankingMeasurements = {};
  for (const lane of candidates) {
    const current = measurements(lane);
    if (mode === 'time_limit' && !isOutputCharacterCount(current.outputCharacters)) {
      return { leader: null, unavailable: true };
    }
    if (leader === null || compareRaceMeasurements(mode, current, best) < 0) {
      leader = lane;
      best = current;
    }
  }
  return { leader, unavailable: false };
}

export function rankCompletedRace<T>(mode: RaceMode, candidates: readonly T[], measurements: (lane: T) => RaceRankingMeasurements) {
  const ranking = selectRaceLeader(mode, candidates, measurements);
  const lanes = [...candidates];
  if (!ranking.unavailable) lanes.sort((a, b) => compareRaceMeasurements(mode, measurements(a), measurements(b)));
  return { ...ranking, lanes };
}
