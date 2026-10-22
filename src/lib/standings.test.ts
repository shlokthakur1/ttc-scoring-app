import { describe, expect, it } from 'vitest';
import { computeStandings, headToHead, type PairedFixture } from './standings';
import type { MatchResult } from './types';

function league(games: [string, string, number, number][], players = ['a', 'b', 'c', 'd', 'e']) {
  const fixtures: PairedFixture[] = [];
  const results: Record<number, MatchResult> = {};
  games.forEach(([h, a, hs, as], i) => {
    fixtures.push({ matchId: i + 1, homeId: h, awayId: a });
    if (hs >= 0) results[i + 1] = { home: hs, away: as, at: 0 };
  });
  return { players, fixtures, results };
}

const order = (rows: { id: string }[]) => rows.map((r) => r.id);

describe('computeStandings', () => {
  it('ranks by match wins first, then point differential', () => {
    const { players, fixtures, results } = league([
      ['a', 'b', 7, 5],
      ['c', 'd', 7, 0],
      ['a', 'c', 7, 1],
      ['b', 'd', 7, 3],
    ]);
    const rows = computeStandings(players, fixtures, results);
    // b: lost 5–7, won 7–3 → +2. c: won 7–0, lost 1–7 → +1. e hasn't played (0, +0) so sits above d (0, −11).
    expect(order(rows)).toEqual(['a', 'b', 'c', 'e', 'd']);
    expect(rows[0]).toMatchObject({ won: 2, lost: 0, pf: 14, pa: 6, diff: 8 });
    expect(rows[1]).toMatchObject({ id: 'b', won: 1, diff: 2, splitBy: 'wins' });
    expect(rows[2]).toMatchObject({ id: 'c', won: 1, diff: 1, splitBy: 'diff' });
  });

  it('uses head-to-head when wins and differential are level', () => {
    // b and c both 1–1 with +0; c beat b.
    const { players, fixtures, results } = league(
      [
        ['b', 'c', 5, 7],
        ['b', 'x', 7, 5],
        ['c', 'y', 5, 7],
      ],
      ['b', 'c', 'x', 'y'],
    );
    const rows = computeStandings(players, fixtures, results);
    expect(rows.find((r) => r.id === 'b')!.diff).toBe(rows.find((r) => r.id === 'c')!.diff);
    expect(order(rows).indexOf('c')).toBeLessThan(order(rows).indexOf('b'));
    expect(rows.find((r) => r.id === 'b')!.splitBy).toBe('h2h');
  });

  it('falls back to points won when a three-way head-to-head is circular', () => {
    // a>b, b>c, c>a, all by 2, so wins, diff and h2h are level; points won decides.
    const { players, fixtures, results } = league(
      [
        ['a', 'b', 7, 5],
        ['b', 'c', 9, 7],
        ['c', 'a', 11, 9],
      ],
      ['a', 'b', 'c'],
    );
    const rows = computeStandings(players, fixtures, results);
    expect(rows.map((r) => [r.id, r.pf])).toEqual([
      ['c', 18],
      ['a', 16],
      ['b', 14],
    ]);
    expect(rows[1].splitBy).toBe('pf');
  });

  it('re-applies head-to-head among the players still level after a partial split', () => {
    // a, b, c, d all finish 3–2 with +2. Inside the group: a beat b and d,
    // b beat c and d, c beat a. Group h2h wins: a 2, b 2, c 1, d 0, which
    // leaves a and b level, so their own match decides it: a beat b.
    const games: [string, string, number, number][] = [
      ['a', 'b', 7, 5],
      ['a', 'd', 7, 5],
      ['b', 'c', 7, 5],
      ['b', 'd', 7, 5],
      ['c', 'a', 7, 5],
      ['a', 'o1', 7, 5],
      ['o2', 'a', 7, 5],
      ['b', 'o3', 7, 5],
      ['o4', 'b', 7, 5],
      ['c', 'o5', 7, 5],
      ['c', 'o6', 7, 5],
      ['o7', 'c', 7, 5],
      ['d', 'o8', 7, 5],
      ['d', 'o9', 7, 5],
      ['d', 'o10', 7, 5],
    ];
    const players = ['d', 'c', 'b', 'a', 'o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o8', 'o9', 'o10'];
    const { fixtures, results } = league(games, players);
    const rows = computeStandings(players, fixtures, results);
    expect(rows.slice(0, 4).map((r) => [r.id, r.won, r.lost, r.diff])).toEqual([
      ['a', 3, 2, 2],
      ['b', 3, 2, 2],
      ['c', 3, 2, 2],
      ['d', 3, 2, 2],
    ]);
    expect(rows.slice(1, 4).map((r) => r.splitBy)).toEqual(['h2h', 'h2h', 'h2h']);
  });

  it('splits a three-way tie with h2h and keeps a genuine tie flagged', () => {
    // b, c and x all finish 1–1, +0, 12 points won. Within that group only
    // b v x was played (b won), so b goes first; c and x never met and are
    // identical on everything, so they stay flagged as tied.
    const { players, fixtures, results } = league(
      [
        ['a', 'b', 7, 5],
        ['a', 'c', 7, 5],
        ['b', 'x', 7, 5],
        ['c', 'y', 7, 5],
        ['x', 'a', 7, 5],
      ],
      ['a', 'b', 'c', 'x', 'y'],
    );
    const rows = computeStandings(players, fixtures, results);
    expect(order(rows)).toEqual(['a', 'b', 'c', 'x', 'y']);
    expect(rows[1]).toMatchObject({ rank: 2, splitBy: 'wins', tiedWith: [] }); // below a on wins
    expect(rows[2]).toMatchObject({ rank: 3, splitBy: 'h2h', tiedWith: ['x'] });
    expect(rows[3]).toMatchObject({ rank: 3, tiedWith: ['c'] });
  });

  it('marks players clinched or eliminated for the qualifying places', () => {
    const players = ['a', 'b', 'c', 'd', 'e', 'f'];
    const games: [string, string, number, number][] = [];
    for (let i = 0; i < players.length; i++)
      for (let j = i + 1; j < players.length; j++) games.push([players[i], players[j], -1, -1]);
    // a wins all 5 of its matches; f loses all 5.
    games.forEach((g) => {
      if (g[0] === 'a') [g[2], g[3]] = [7, 0];
      else if (g[1] === 'f') [g[2], g[3]] = [7, 0];
    });
    const { fixtures, results } = league(games, players);
    const rows = computeStandings(players, fixtures, results, 2);
    expect(rows.find((r) => r.id === 'a')!.status).toBe('clinched');
    expect(rows.find((r) => r.id === 'f')!.status).toBe('eliminated');
    expect(rows.find((r) => r.id === 'b')!.status).toBeNull();
  });

  it('counts remaining matches and reports head-to-head from either side', () => {
    const { players, fixtures, results } = league([
      ['a', 'b', 7, 3],
      ['a', 'c', -1, -1],
    ]);
    const rows = computeStandings(players, fixtures, results);
    expect(rows.find((r) => r.id === 'a')!.remaining).toBe(1);
    expect(headToHead('b', 'a', fixtures, results)).toMatchObject({ for: 3, against: 7 });
    expect(headToHead('a', 'c', fixtures, results)).toMatchObject({ pending: true });
    expect(headToHead('b', 'c', fixtures, results)).toBeNull();
  });
});
