import { describe, expect, it } from 'vitest';
import { quickScores, scoreProblem } from './scoring';

describe('scoreProblem (first to N, win by 2)', () => {
  it.each([
    [7, 0],
    [7, 5],
    [5, 7],
    [8, 6],
    [9, 7],
    [14, 12],
  ])('accepts %i–%i in a race to 7', (h, a) => {
    expect(scoreProblem(h, a, 7)).toBeNull();
  });

  it.each([
    [7, 6, 'win by 2'],
    [8, 5, 'should be 7–5'],
    [6, 4, "isn't finished"],
    [9, 6, 'should be 8–6'],
    [7, 7, 'no draws'],
    [-1, 7, 'whole numbers'],
  ])('rejects %i–%i in a race to 7', (h, a, why) => {
    expect(scoreProblem(h, a, 7)).toContain(why);
  });

  it('handles the race to 11 used in the finals', () => {
    expect(scoreProblem(11, 9, 11)).toBeNull();
    expect(scoreProblem(12, 10, 11)).toBeNull();
    expect(scoreProblem(11, 10, 11)).not.toBeNull();
    expect(scoreProblem(7, 3, 11)).not.toBeNull();
  });

  it('offers only valid quick scores', () => {
    for (const target of [7, 11]) {
      const { regular, deuce } = quickScores(target);
      expect(regular).toHaveLength(target - 1);
      for (const [w, l] of [...regular, ...deuce]) expect(scoreProblem(w, l, target)).toBeNull();
    }
  });
});
