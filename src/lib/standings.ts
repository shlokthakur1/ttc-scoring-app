import type { PlayerId } from '../data/fixture';
import type { MatchResult } from './types';

/** A fixture whose two players are known. */
export interface PairedFixture {
  matchId: number;
  homeId: PlayerId;
  awayId: PlayerId;
}

export type Tiebreak = 'wins' | 'diff' | 'h2h' | 'pf';

export const TIEBREAK_LABEL: Record<Tiebreak, string> = {
  wins: 'Match wins',
  diff: 'Point differential',
  h2h: 'Head-to-head',
  pf: 'Points won',
};

export interface StandingRow {
  id: PlayerId;
  /** 1-based. Players still level after every tiebreaker share a rank. */
  rank: number;
  played: number;
  won: number;
  lost: number;
  pf: number;
  pa: number;
  diff: number;
  /** W/L in the order the matches appear in the draw. */
  form: ('W' | 'L')[];
  remaining: number;
  /** Players this one is still level with after every tiebreaker. */
  tiedWith: PlayerId[];
  /** The tiebreaker that put this player below the row above, if wins were level. */
  splitBy: Tiebreak | null;
  /** Mathematically sure of finishing inside / outside the qualifying places. */
  status: 'clinched' | 'eliminated' | null;
}

interface Stats {
  played: number;
  won: number;
  lost: number;
  pf: number;
  pa: number;
  form: ('W' | 'L')[];
  remaining: number;
}

/**
 * Ladder using the official order: 1. match wins, 2. point differential,
 * 3. head-to-head, 4. points won. Head-to-head between three or more level
 * players is a mini-ladder of wins in the matches between just those players;
 * if it splits the group, the players still level are compared again among
 * themselves.
 */
export function computeStandings(
  playerIds: PlayerId[],
  fixtures: PairedFixture[],
  results: Record<number, MatchResult>,
  qualifiers = 0,
): StandingRow[] {
  const stats: Record<PlayerId, Stats> = {};
  for (const id of playerIds) {
    stats[id] = { played: 0, won: 0, lost: 0, pf: 0, pa: 0, form: [], remaining: 0 };
  }
  const played: { homeId: PlayerId; awayId: PlayerId; r: MatchResult }[] = [];

  for (const f of fixtures) {
    const r = results[f.matchId];
    const h = stats[f.homeId];
    const a = stats[f.awayId];
    if (!h || !a) continue;
    if (!r) {
      h.remaining++;
      a.remaining++;
      continue;
    }
    played.push({ homeId: f.homeId, awayId: f.awayId, r });
    const homeWon = r.home > r.away;
    h.played++;
    a.played++;
    h.pf += r.home;
    h.pa += r.away;
    a.pf += r.away;
    a.pa += r.home;
    (homeWon ? h : a).won++;
    (homeWon ? a : h).lost++;
    h.form.push(homeWon ? 'W' : 'L');
    a.form.push(homeWon ? 'L' : 'W');
  }

  const h2hWins = (id: PlayerId, group: PlayerId[]) => {
    const set = new Set(group);
    let wins = 0;
    for (const m of played) {
      if (!set.has(m.homeId) || !set.has(m.awayId)) continue;
      const winner = m.r.home > m.r.away ? m.homeId : m.awayId;
      if (winner === id) wins++;
    }
    return wins;
  };

  const levels: { key: Tiebreak; value: (id: PlayerId, group: PlayerId[]) => number }[] = [
    { key: 'wins', value: (id) => stats[id].won },
    { key: 'diff', value: (id) => stats[id].pf - stats[id].pa },
    { key: 'h2h', value: h2hWins },
    { key: 'pf', value: (id) => stats[id].pf },
  ];

  interface Entry {
    id: PlayerId;
    tieGroup: PlayerId[];
    splitBy: Tiebreak | null;
  }

  const order = (id: PlayerId) => playerIds.indexOf(id);

  const rank = (group: PlayerId[], level: number): Entry[] => {
    if (group.length === 1) return [{ id: group[0], tieGroup: [], splitBy: null }];
    if (level >= levels.length) {
      const sorted = [...group].sort((x, y) => order(x) - order(y));
      return sorted.map((id) => ({ id, tieGroup: sorted, splitBy: null }));
    }
    const { key, value } = levels[level];
    const buckets = new Map<number, PlayerId[]>();
    for (const id of group) {
      const v = value(id, group);
      buckets.set(v, [...(buckets.get(v) ?? []), id]);
    }
    if (buckets.size === 1) return rank(group, level + 1);
    const sortedBuckets = [...buckets.entries()].sort((x, y) => y[0] - x[0]).map(([, ids]) => ids);
    return sortedBuckets.flatMap((bucket, i) => {
      const ranked = rank(bucket, level);
      if (i > 0) ranked[0] = { ...ranked[0], splitBy: key };
      return ranked;
    });
  };

  const entries = rank([...playerIds], 0);
  const allDone = fixtures.every((f) => results[f.matchId]);

  const rows: StandingRow[] = entries.map((e, i) => {
    const s = stats[e.id];
    const firstOfTie = e.tieGroup.length ? entries.findIndex((x) => e.tieGroup.includes(x.id)) : i;
    return {
      id: e.id,
      rank: firstOfTie + 1,
      played: s.played,
      won: s.won,
      lost: s.lost,
      pf: s.pf,
      pa: s.pa,
      diff: s.pf - s.pa,
      form: s.form,
      remaining: s.remaining,
      tiedWith: e.tieGroup.filter((id) => id !== e.id),
      splitBy: i === 0 ? null : e.splitBy,
      status: null,
    };
  });

  if (qualifiers > 0) {
    for (const row of rows) {
      row.status = qualificationStatus(row, rows, qualifiers, allDone);
    }
  }
  return rows;
}

function qualificationStatus(
  row: StandingRow,
  rows: StandingRow[],
  qualifiers: number,
  allDone: boolean,
): StandingRow['status'] {
  if (allDone) {
    const lastIn = row.rank + row.tiedWith.length;
    if (lastIn <= qualifiers) return 'clinched';
    if (row.rank > qualifiers) return 'eliminated';
    return null; // straddles the cut on an unbreakable tie
  }
  const maxWins = row.won + row.remaining;
  const others = rows.filter((r) => r.id !== row.id);
  // Even losing every remaining match, at most qualifiers-1 others can catch up.
  if (others.filter((r) => r.won + r.remaining >= row.won).length <= qualifiers - 1) return 'clinched';
  // At least `qualifiers` others already have more wins than this player can reach.
  if (others.filter((r) => r.won > maxWins).length >= qualifiers) return 'eliminated';
  return null;
}

/** Result of a vs b from a's point of view, if they have played. */
export function headToHead(
  a: PlayerId,
  b: PlayerId,
  fixtures: PairedFixture[],
  results: Record<number, MatchResult>,
): { matchId: number; for: number; against: number; walkover?: boolean } | { matchId: number; pending: true } | null {
  const f = fixtures.find((x) => (x.homeId === a && x.awayId === b) || (x.homeId === b && x.awayId === a));
  if (!f) return null;
  const r = results[f.matchId];
  if (!r) return { matchId: f.matchId, pending: true };
  const aIsHome = f.homeId === a;
  return {
    matchId: f.matchId,
    for: aIsHome ? r.home : r.away,
    against: aIsHome ? r.away : r.home,
    walkover: r.walkover,
  };
}
