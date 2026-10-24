import { describe, expect, it } from 'vitest';
import { compareRaceMeasurements, isOutputCharacterCount, rankCompletedRace } from './raceRanking';

describe('pure race ranking', () => {
  it.each([undefined, null, -1, 0.1, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, '4', {}, true])('rejects non-comparable output evidence %s', value => { expect(isOutputCharacterCount(value)).toBe(false); });
  it.each([0, 1, Number.MAX_SAFE_INTEGER])('accepts safe output count %s', value => { expect(isOutputCharacterCount(value)).toBe(true); });
  it('preserves original object/raw ID identity and order on ties without mutating input', () => {
    const first = Object.freeze({ id: 'model\u202e-A', outputCharacters: 2, totalMs: 5000 });
    const second = Object.freeze({ id: 'model-A', outputCharacters: 2, totalMs: 1 });
    const input = Object.freeze([first, second]); const ranking = rankCompletedRace('time_limit', input, lane => lane);
    expect(ranking.leader).toBe(first); expect(ranking.lanes).toEqual(input); expect(ranking.lanes).not.toBe(input); expect(ranking.unavailable).toBe(false);
  });
  it('does not rank a known subset ahead of an unknown lane', () => {
    const input = [{ outputCharacters: undefined }, { outputCharacters: Number.MAX_SAFE_INTEGER }];
    const ranking = rankCompletedRace('time_limit', input, lane => lane);
    expect(ranking).toEqual({ lanes: input, leader: null, unavailable: true });
  });
  it.each(['drag', 'token_limit', 'free_for_all'] as const)('retains %s first-completed fallback for missing finish times', mode => {
    const first = { totalMs: null }; const second = { totalMs: null };
    expect(rankCompletedRace(mode, [first, second], lane => lane).leader).toBe(first);
    const measured = { totalMs: 0 }; expect(rankCompletedRace(mode, [first, measured], lane => lane).leader).toBe(measured);
  });
  it('reports an empty eligible field without claiming missing evidence', () => { expect(rankCompletedRace('time_limit', [], lane => lane)).toEqual({ lanes: [], leader: null, unavailable: false }); });
  it('compares more output independently of time and uses time in the other modes', () => {
    const early = { outputCharacters: 1, totalMs: 1000 }; const more = { outputCharacters: 100, totalMs: 5000 };
    expect(compareRaceMeasurements('time_limit', early, more)).toBeGreaterThan(0);
    expect(compareRaceMeasurements('drag', early, more)).toBeLessThan(0);
  });
});

it('selects a history leader in one linear scan without sorting or copying candidates', async () => {
  const module = await import('./raceRanking');
  expect(typeof module.selectRaceLeader).toBe('function');
  let visits = 0;
  const input = Object.freeze(Array.from({ length: 1000 }, (_, i) => ({ totalMs: 1000 - i, outputCharacters: i })));
  const ranking = module.selectRaceLeader('time_limit', input, lane => { visits++; return lane; });
  expect(ranking).toEqual({ leader: input[999], unavailable: false });
  expect(visits).toBe(input.length);
  expect(Object.keys(ranking).sort()).toEqual(['leader', 'unavailable']);
});
