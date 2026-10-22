import { SESSIONS } from '../data/fixture';
import { reducer } from './reducer';
import { derive } from './tournament';
import type { TournamentState } from './types';

/** Small deterministic PRNG so a rehearsal is repeatable. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Plays a rally-point match: first to `target`, win by 2. */
export function simulateMatch(pHome: number, target: number, rand: () => number): [number, number] {
  let h = 0;
  let a = 0;
  while (!((h >= target || a >= target) && Math.abs(h - a) >= 2)) {
    if (rand() < pHome) h++;
    else a++;
  }
  return [h, a];
}

/**
 * Plays out the next `count` sessions with made-up scores, as if they had
 * happened in the last few minutes. Only used in rehearsal mode.
 */
export function simulateSessions(state: TournamentState, count: number, seed = Date.now()): TournamentState {
  const rand = mulberry32(seed);
  const skill: Record<string, number> = {};
  state.players.forEach((p, i) => (skill[p.id] = 0.35 + ((i * 7919 + seed) % 100) / 300 + rand() * 0.1));

  const todo = SESSIONS.filter((s) => !s.matchIds.every((id) => state.results[id])).slice(0, count);
  const roundMs = 7.5 * 60_000;
  let t = Date.now() - todo.length * roundMs;
  let s = state;

  for (const session of todo) {
    if (!s.sessionTimes[session.key]?.start) s = reducer(s, { type: 'start', sessionKey: session.key, at: t });
    const d = derive(s);
    for (const id of session.matchIds) {
      const m = d.matches[id];
      if (m.result || !m.homeId || !m.awayId || m.provisional) continue;
      const ph = 0.5 + (skill[m.homeId] - skill[m.awayId]);
      const [home, away] = simulateMatch(Math.min(0.8, Math.max(0.2, ph)), m.match.target, rand);
      t += roundMs / session.matchIds.length;
      s = reducer(s, { type: 'record', matchId: id, home, away, at: Math.min(t, Date.now()) });
    }
  }
  return s;
}
