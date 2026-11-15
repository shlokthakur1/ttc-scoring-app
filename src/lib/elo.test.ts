import { describe, expect, it } from 'vitest';
import { simulateSessions } from './demo';
import { computeElo, ELO_K, ELO_START, expectedShare, predictedScore, winChance } from './elo';
import { initialState, reducer } from './reducer';
import { derive } from './tournament';

const T0 = new Date(2026, 10, 15, 13, 0).getTime();

describe('elo building blocks', () => {
  it('expects an even split between equals and more for the higher-rated player', () => {
    expect(expectedShare(1000, 1000)).toBe(0.5);
    expect(expectedShare(1100, 1000)).toBeGreaterThan(0.5);
    expect(expectedShare(1100, 1000) + expectedShare(1000, 1100)).toBeCloseTo(1);
  });

  it('turns a share of points into a legal scoreline', () => {
    expect(predictedScore(0.5, 7)).toEqual([7, 5]);
    expect(predictedScore(0.7, 7)).toEqual([7, 3]);
    expect(predictedScore(0.3, 11)).toEqual([5, 11]);
    expect(predictedScore(0.99, 7)).toEqual([7, 0]);
  });

  it('gives sensible match-win chances', () => {
    expect(winChance(0.5, 7)).toBeCloseTo(0.5);
    expect(winChance(0.6, 7) + winChance(0.4, 7)).toBeCloseTo(1);
    expect(winChance(0.6, 11)).toBeGreaterThan(winChance(0.6, 7)); // longer matches favour the better player
    expect(winChance(1, 7)).toBe(1);
  });
});

describe('computeElo', () => {
  const ids = initialState().players.map((p) => p.id);

  it('starts everyone on 1000 and predicts 7–5 coin flips', () => {
    const t = computeElo(derive(initialState()), ids);
    expect(t.rows.every((r) => r.rating === ELO_START && r.played === 0)).toBe(true);
    expect(t.matches).toEqual([]);
    expect(t.upcoming).toHaveLength(3);
    expect(t.upcoming[0]).toMatchObject({ expected: 0.5, predicted: [7, 5], delta: null });
  });

  it('moves both players by the same amount, scaled by the margin', () => {
    const play = (home: number, away: number) =>
      computeElo(derive(reducer(initialState(), { type: 'record', matchId: 1, home, away, at: T0 })), ids);
    const big = play(7, 0);
    const fazz = big.rows.find((r) => r.id === 'fazz')!;
    const shlok = big.rows.find((r) => r.id === 'shlok')!;
    expect(fazz.rating).toBeCloseTo(ELO_START + ELO_K * 0.5);
    expect(shlok.rating).toBeCloseTo(ELO_START - ELO_K * 0.5);
    expect(fazz.pointsVsExpected).toBeCloseTo(3.5);
    const close = play(9, 7).rows.find((r) => r.id === 'fazz')!;
    expect(close.rating).toBeGreaterThan(ELO_START);
    expect(close.rating).toBeLessThan(fazz.rating);
  });

  it('ignores walkovers', () => {
    const s = reducer(initialState(), { type: 'record', matchId: 1, home: 7, away: 0, walkover: true, at: T0 });
    expect(derive(s).matches[1].result?.walkover).toBe(true);
    expect(computeElo(derive(s), ids).matches).toEqual([]);
  });

  it('rates a full day: zero-sum, every match counted, history per round', () => {
    const d = derive(simulateSessions(initialState(), 99, 42));
    const t = computeElo(d, ids);
    expect(t.matches).toHaveLength(74);
    expect(t.upcoming).toEqual([]);
    expect(t.rows.reduce((sum, r) => sum + r.rating, 0)).toBeCloseTo(ELO_START * 12);
    expect(t.rows.reduce((sum, r) => sum + r.pointsVsExpected, 0)).toBeCloseTo(0);
    expect(t.rows.map((r) => r.rating)).toEqual([...t.rows.map((r) => r.rating)].sort((a, b) => b - a));
    for (const r of t.rows) expect(r.history).toHaveLength(1 + 27);
    // The unbeaten round robin winner should come out on top.
    expect(t.rows[0].id).toBe(d.rrStandings[0].id);
  });
});
