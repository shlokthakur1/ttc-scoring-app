import { describe, expect, it } from 'vitest';
import { computeAwards } from './awards';
import { simulateSessions } from './demo';
import { initialState } from './reducer';
import { derive } from './tournament';

describe('computeAwards with excluded players', () => {
  const state = simulateSessions(initialState(), 99, 42);
  const d = derive(state);
  const ids = state.players.map((p) => p.id);
  const name = (id: string | null) => id ?? '?';
  const full = computeAwards(d, ids, name);
  const fun = (awards: typeof full) => awards.filter((a) => a.title !== 'Round Robin Winner');

  it('changes nothing when nobody is excluded', () => {
    expect(computeAwards(d, ids, name, [])).toEqual(full);
  });

  it('never gives a fun award to an excluded player, whoever it is', () => {
    for (const id of ids) {
      const awards = computeAwards(d, ids, name, [id]);
      for (const a of fun(awards)) expect(a.winners).not.toContain(id);
      // Awards the player wasn't winning anyway are untouched (Match of the Day drops their matches).
      for (const a of fun(full)) {
        if (a.winners.includes(id) || a.title === 'Match of the Day') continue;
        expect(awards.find((x) => x.title === a.title)).toEqual(a);
      }
    }
  });

  it('keeps the Round Robin Winner as the real ladder leader', () => {
    const leader = d.rrStandings[0].id;
    const awards = computeAwards(d, ids, name, [leader]);
    expect(awards.find((a) => a.title === 'Round Robin Winner')?.winners).toEqual([leader]);
    const diff = awards.find((a) => a.title === 'Best Point Differential')!;
    expect(diff.winners).not.toContain(leader);
  });

  it('copes with everyone excluded', () => {
    expect(fun(computeAwards(d, ids, name, ids))).toEqual([]);
  });
});
