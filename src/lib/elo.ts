import { SESSIONS, type PlayerId } from '../data/fixture';
import type { Derived, ResolvedMatch } from './tournament';

/** Everyone starts the day here. */
export const ELO_START = 1000;
/** How far one match can move a rating. High, because there are only 11–15 matches each. */
export const ELO_K = 80;
const ELO_SCALE = 400;

/** Share of the points the first player is expected to win. */
export function expectedShare(rating: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - rating) / ELO_SCALE));
}

/** The most likely-looking scoreline for a given share of points: the favourite reaches `target`. */
export function predictedScore(homeShare: number, target: number): [number, number] {
  const fav = Math.max(homeShare, 1 - homeShare);
  const loser = Math.min(target - 2, Math.round((target * (1 - fav)) / fav));
  return homeShare >= 0.5 ? [target, loser] : [loser, target];
}

/** Chance of winning a first-to-`target`, win-by-2 match when winning each point with probability `p`. */
export function winChance(p: number, target: number): number {
  const q = 1 - p;
  let total = 0;
  let ways = 1; // C(target - 1 + k, k)
  for (let k = 0; k <= target - 2; k++) {
    total += ways * p ** target * q ** k;
    ways = (ways * (target + k)) / (k + 1);
  }
  // `ways` is now C(2·target − 2, target − 1): level at target−1 all, then win by two.
  return total + ways * (p * q) ** (target - 1) * ((p * p) / (p * p + q * q));
}

export interface EloMatch {
  m: ResolvedMatch;
  homeBefore: number;
  awayBefore: number;
  /** Expected share of points for the home player, 0–1. */
  expected: number;
  predicted: [number, number];
  homeWinChance: number;
  /** Rating change for the home player (the away player gets the opposite); null if not played. */
  delta: number | null;
  /** Home player's actual share of points minus the expected share; null if not played. */
  surprise: number | null;
}

export interface EloRow {
  id: PlayerId;
  rating: number;
  played: number;
  won: number;
  peak: number;
  low: number;
  /** Points won above (+) or below (−) what the ratings predicted, across the day. */
  pointsVsExpected: number;
  /** Change from the player's most recent match. */
  lastDelta: number;
  /** Rating at the start, then after every round that has a score in it. */
  history: number[];
}

export interface EloTable {
  rows: EloRow[];
  matches: EloMatch[];
  /** Predictions for unplayed matches in the current round. */
  upcoming: EloMatch[];
}

function preview(m: ResolvedMatch, home: number, away: number): Omit<EloMatch, 'delta' | 'surprise'> {
  const expected = expectedShare(home, away);
  return {
    m,
    homeBefore: home,
    awayBefore: away,
    expected,
    predicted: predictedScore(expected, m.match.target),
    homeWinChance: winChance(expected, m.match.target),
  };
}

/**
 * Elo ratings from the day's results, taken in the order the rounds were
 * played. Each match is scored on the share of points won rather than just
 * win/loss, so 7–0 moves ratings more than 9–7, and beating a strong player
 * is worth more than beating a weak one. Walkovers are ignored.
 */
export function computeElo(d: Derived, playerIds: PlayerId[]): EloTable {
  const rows: Record<PlayerId, EloRow> = Object.fromEntries(
    playerIds.map((id) => [
      id,
      { id, rating: ELO_START, played: 0, won: 0, peak: ELO_START, low: ELO_START, pointsVsExpected: 0, lastDelta: 0, history: [ELO_START] },
    ]),
  );
  const matches: EloMatch[] = [];

  for (const s of SESSIONS) {
    let any = false;
    for (const id of s.matchIds) {
      const m = d.matches[id];
      const r = m.result;
      if (!r || r.walkover || !m.homeId || !m.awayId || !rows[m.homeId] || !rows[m.awayId]) continue;
      const total = r.home + r.away;
      if (total <= 0) continue;
      any = true;
      const home = rows[m.homeId];
      const away = rows[m.awayId];
      const pre = preview(m, home.rating, away.rating);
      const surprise = r.home / total - pre.expected;
      const delta = ELO_K * surprise;
      matches.push({ ...pre, delta, surprise });

      home.rating += delta;
      away.rating -= delta;
      home.lastDelta = delta;
      away.lastDelta = -delta;
      home.pointsVsExpected += surprise * total;
      away.pointsVsExpected -= surprise * total;
      for (const p of [home, away]) {
        p.played++;
        p.peak = Math.max(p.peak, p.rating);
        p.low = Math.min(p.low, p.rating);
      }
      (r.home > r.away ? home : away).won++;
    }
    if (any) for (const id of playerIds) rows[id].history.push(rows[id].rating);
  }

  const upcoming: EloMatch[] = [];
  if (d.current) {
    for (const id of d.current.matchIds) {
      const m = d.matches[id];
      if (m.result || m.provisional || !m.homeId || !m.awayId || !rows[m.homeId] || !rows[m.awayId]) continue;
      upcoming.push({ ...preview(m, rows[m.homeId].rating, rows[m.awayId].rating), delta: null, surprise: null });
    }
  }

  const order = new Map(playerIds.map((id, i) => [id, i]));
  return {
    rows: Object.values(rows).sort((a, b) => b.rating - a.rating || order.get(a.id)! - order.get(b.id)!),
    matches,
    upcoming,
  };
}
