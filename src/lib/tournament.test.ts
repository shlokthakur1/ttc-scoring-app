import { describe, expect, it } from 'vitest';
import { FF_MATCHES, RR_MATCHES, SESSION_BY_KEY } from '../data/fixture';
import { simulateSessions } from './demo';
import { initialState, reducer } from './reducer';
import { scheduleStatus } from './schedule';
import { derive } from './tournament';
import type { TournamentState } from './types';

const T0 = new Date(2026, 10, 15, 13, 0).getTime();
const min = 60_000;

/** Scores every round robin match so that `ranking` is the final order (earlier = better). */
function playRoundRobin(ranking: string[], state = initialState()): TournamentState {
  let s = state;
  RR_MATCHES.forEach((m, i) => {
    const h = m.home.kind === 'player' ? m.home.id : '';
    const a = m.away.kind === 'player' ? m.away.id : '';
    const homeBetter = ranking.indexOf(h) < ranking.indexOf(a);
    s = reducer(s, {
      type: 'record',
      matchId: m.id,
      home: homeBetter ? 7 : 3,
      away: homeBetter ? 3 : 7,
      at: T0 + i * min,
    });
  });
  return s;
}

const RANKING = ['vik', 'tmog', 'shlok', 'savo', 'ritz', 'kuvindu', 'garch', 'fazz', 'ass', 'abi', 'abhi', 'hitesh'];

describe('derive / tournament flow', () => {
  it('starts on round 1 with Fazz v Shlok on court 1', () => {
    const d = derive(initialState());
    expect(d.current?.key).toBe('rr-1');
    expect(d.next?.key).toBe('rr-2');
    const m1 = d.matches[1];
    expect([m1.homeId, m1.awayId]).toEqual(['fazz', 'shlok']);
    expect(d.completed).toBe(0);
    expect(d.total).toBe(74);
  });

  it('gives every round robin match a resting line judge, 5 or 6 duties each', () => {
    const d = derive(initialState());
    for (const m of RR_MATCHES) {
      const rm = d.matches[m.id];
      expect(rm.judgeId).toBeTruthy();
      expect([rm.homeId, rm.awayId]).not.toContain(rm.judgeId);
      const sameRound = SESSION_BY_KEY[m.sessionKey].matchIds.map((id) => d.matches[id]);
      expect(sameRound.flatMap((x) => [x.homeId, x.awayId])).not.toContain(rm.judgeId);
      expect(sameRound.filter((x) => x.judgeId === rm.judgeId)).toHaveLength(1);
    }
    const rrDuties: Record<string, number> = {};
    for (const m of RR_MATCHES) rrDuties[d.matches[m.id].judgeId!] = (rrDuties[d.matches[m.id].judgeId!] ?? 0) + 1;
    expect(Object.keys(rrDuties)).toHaveLength(12);
    expect(Object.values(rrDuties).sort()).toEqual([...Array(6).fill(5), ...Array(6).fill(6)]);
  });

  it('keeps Final Four players provisional and refuses their scores until the round robin is done', () => {
    let s = initialState();
    s = reducer(s, { type: 'record', matchId: 1, home: 7, away: 2, at: T0 });
    const d = derive(s);
    expect(d.matches[67].provisional).toBe(true);
    const after = reducer(s, { type: 'record', matchId: 67, home: 11, away: 3, at: T0 });
    expect(after.results[67]).toBeUndefined();
  });

  it('seeds the Final Four from the ladder and plays it through to a champion', () => {
    let s = playRoundRobin(RANKING);
    let d = derive(s);
    expect(d.rrComplete).toBe(true);
    expect(d.rrSeeds).toMatchObject({ ids: ['vik', 'tmog', 'shlok', 'savo'], final: true });
    expect(d.current?.key).toBe('ff-1');
    expect([d.matches[67].homeId, d.matches[67].awayId]).toEqual(['vik', 'tmog']); // Q1 v Q2
    expect([d.matches[68].homeId, d.matches[68].awayId]).toEqual(['shlok', 'savo']); // Q3 v Q4
    expect(d.rrStandings.slice(0, 4).every((r) => r.status === 'clinched')).toBe(true);

    // Final Four: reverse order this time (Q4 best).
    const ffRank = ['savo', 'shlok', 'tmog', 'vik'];
    for (const m of FF_MATCHES) {
      const rm = derive(s).matches[m.id];
      const homeBetter = ffRank.indexOf(rm.homeId!) < ffRank.indexOf(rm.awayId!);
      s = reducer(s, { type: 'record', matchId: m.id, home: homeBetter ? 11 : 6, away: homeBetter ? 6 : 11, at: T0 });
    }
    d = derive(s);
    expect(s.seedOverrides.rr).toEqual(['vik', 'tmog', 'shlok', 'savo']); // locked once the FF began
    expect(d.ffSeeds).toMatchObject({ ids: ffRank, final: true });
    expect([d.matches[73].homeId, d.matches[73].awayId]).toEqual(['tmog', 'vik']); // F3 v F4
    expect([d.matches[74].homeId, d.matches[74].awayId]).toEqual(['savo', 'shlok']); // F1 v F2

    s = reducer(s, { type: 'record', matchId: 73, home: 11, away: 9, at: T0 });
    s = reducer(s, { type: 'record', matchId: 74, home: 9, away: 11, at: T0 });
    d = derive(s);
    expect(d.current).toBeNull();
    expect(d.podium).toEqual({ champion: 'shlok', runnerUp: 'savo', third: 'tmog', fourth: 'vik' });
  });

  it('does not reshuffle the Final Four if a round robin score is corrected after it starts', () => {
    let s = playRoundRobin(RANKING);
    s = reducer(s, { type: 'record', matchId: 67, home: 11, away: 4, at: T0 });
    // Hand savo (Q4) a heavy defeat that would drop them below ritz.
    const savoMatches = RR_MATCHES.filter((m) => [m.home, m.away].some((r) => r.kind === 'player' && r.id === 'savo'));
    for (const m of savoMatches) {
      const savoHome = m.home.kind === 'player' && m.home.id === 'savo';
      s = reducer(s, { type: 'record', matchId: m.id, home: savoHome ? 0 : 7, away: savoHome ? 7 : 0, at: T0 });
    }
    const d = derive(s);
    expect(d.rrStandings.slice(0, 4).map((r) => r.id)).not.toContain('savo');
    expect(d.rrSeeds.ids).toEqual(['vik', 'tmog', 'shlok', 'savo']);
  });

  it('flags an unbreakable tie across the Q4/Q5 line and waits for the admin to decide', () => {
    // Every match ends 7–5, so differential and points won follow wins exactly.
    // vik > tmog > shlok beat everyone else. savo, ritz and kuvindu beat the
    // bottom six and go round in a circle among themselves (7 wins each), so
    // they're level on every tiebreaker, straddling 4th place.
    const top = ['vik', 'tmog', 'shlok'];
    const circle: Record<string, string> = { savo: 'ritz', ritz: 'kuvindu', kuvindu: 'savo' }; // key beats value
    const tier = (id: string) => (top.includes(id) ? 0 : id in circle ? 1 : 2);
    const beats = (a: string, b: string) => {
      if (tier(a) !== tier(b)) return tier(a) < tier(b);
      if (tier(a) === 0) return top.indexOf(a) < top.indexOf(b);
      if (tier(a) === 1) return circle[a] === b;
      return a < b;
    };
    let s = initialState();
    for (const m of RR_MATCHES) {
      const h = m.home.kind === 'player' ? m.home.id : '';
      const a = m.away.kind === 'player' ? m.away.id : '';
      const homeWins = beats(h, a);
      s = reducer(s, { type: 'record', matchId: m.id, home: homeWins ? 7 : 5, away: homeWins ? 5 : 7, at: T0 });
    }
    const d = derive(s);
    expect(d.rrStandings.slice(0, 3).map((r) => r.id)).toEqual(top);
    expect(d.rrSeeds.tieAtCut.sort()).toEqual(['kuvindu', 'ritz', 'savo']);
    expect(d.rrStandings[3]).toMatchObject({ rank: 4, won: 7 });
    expect(d.rrStandings[3].status).toBeNull();
    expect(d.rrSeeds.final).toBe(false);
    expect(d.current?.key).toBe('ff-1');
    expect(d.matches[67].provisional).toBe(true);
    expect(reducer(s, { type: 'record', matchId: 67, home: 11, away: 2, at: T0 }).results[67]).toBeUndefined();

    // After a coin toss the admin locks the seeding and the Final Four can go ahead.
    s = reducer(s, { type: 'setSeeds', from: 'rr', ids: ['vik', 'tmog', 'shlok', 'ritz'], at: T0 });
    const after = derive(s);
    expect(after.rrSeeds).toMatchObject({ ids: ['vik', 'tmog', 'shlok', 'ritz'], final: true, locked: true });
    expect(after.matches[68]).toMatchObject({ homeId: 'shlok', awayId: 'ritz', provisional: false });
  });

  it('starts the next round automatically and undoes that if a score is removed', () => {
    let s = reducer(initialState(), { type: 'start', sessionKey: 'rr-1', at: T0 });
    s = reducer(s, { type: 'record', matchId: 1, home: 7, away: 2, at: T0 + 5 * min });
    s = reducer(s, { type: 'record', matchId: 2, home: 7, away: 2, at: T0 + 6 * min });
    expect(s.sessionTimes['rr-2']).toBeUndefined();
    s = reducer(s, { type: 'record', matchId: 3, home: 2, away: 7, at: T0 + 8 * min });
    expect(s.sessionTimes['rr-1']).toEqual({ start: T0, end: T0 + 8 * min, autoStarted: false });
    expect(s.sessionTimes['rr-2']).toEqual({ start: T0 + 8 * min, autoStarted: true });
    expect(derive(s).current?.key).toBe('rr-2');

    s = reducer(s, { type: 'clear', matchId: 3, at: T0 + 9 * min });
    expect(s.sessionTimes['rr-1'].end).toBeUndefined();
    expect(s.sessionTimes['rr-2']).toBeUndefined();
    expect(s.log[0].text).toContain('score removed');
  });

  it('logs corrections with the before and after score', () => {
    let s = reducer(initialState(), { type: 'record', matchId: 1, home: 7, away: 2, at: T0 });
    s = reducer(s, { type: 'record', matchId: 1, home: 5, away: 7, at: T0 });
    expect(s.log[0].text).toBe('#1 R1 · Court 1 corrected: Fazz 7–2 Shlok → Fazz 5–7 Shlok');
  });

  it('respects line judge overrides but ignores one that names a player on that court', () => {
    let s = reducer(initialState(), { type: 'setJudge', matchId: 1, playerId: 'vik', at: T0 });
    expect(derive(s).matches[1]).toMatchObject({ judgeId: 'vik', judgeOverridden: true });
    s = reducer(s, { type: 'setJudge', matchId: 1, playerId: 'fazz', at: T0 });
    expect(derive(s).matches[1].judgeOverridden).toBe(false);
    expect(derive(s).matches[1].judgeId).not.toBe('fazz');
  });

  it('can rehearse the whole day end to end', () => {
    const s = simulateSessions(initialState(), 99, 42);
    const d = derive(s);
    expect(d.completed).toBe(74);
    expect(d.podium.champion).toBeTruthy();
    expect(new Set(Object.values(d.podium)).size).toBe(4);
  });
});

describe('scheduleStatus', () => {
  it('reports on-plan when rounds run at the planned pace', () => {
    let s = reducer(initialState(), { type: 'start', sessionKey: 'rr-1', at: T0 });
    const planned = SESSION_BY_KEY['rr-1'].plannedMinutes;
    s = reducer(s, { type: 'record', matchId: 1, home: 7, away: 0, at: T0 + planned * min });
    s = reducer(s, { type: 'record', matchId: 2, home: 7, away: 0, at: T0 + planned * min });
    s = reducer(s, { type: 'record', matchId: 3, home: 7, away: 0, at: T0 + planned * min });
    const st = scheduleStatus(s, derive(s).current, T0 + planned * min + 30_000);
    expect(st.session?.key).toBe('rr-2');
    expect(Math.abs(st.slip)).toBeLessThan(0.5);
    expect(st.projectedRrEnd).toBeCloseTo(920, 0);
  });

  it('projects the slip when rounds take longer than planned', () => {
    let s = reducer(initialState(), { type: 'start', sessionKey: 'rr-1', at: T0 + 5 * min });
    for (const id of [1, 2, 3]) s = reducer(s, { type: 'record', matchId: id, home: 7, away: 0, at: T0 + 15 * min });
    const st = scheduleStatus(s, derive(s).current, T0 + 15 * min);
    // Started 5 late, and rounds are taking 10 min instead of ~6.4.
    expect(st.avgRrRound).toBeCloseTo(10);
    expect(st.slip).toBeGreaterThan(50);
    expect(st.projectedPresentation).toBeGreaterThan(16 * 60 + 30);
  });

  it('anchors the plan to the real start time in rehearsal mode', () => {
    const late = new Date(2026, 10, 8, 19, 0).getTime();
    const s = reducer(initialState(), { type: 'start', sessionKey: 'rr-1', at: late });
    const st = scheduleStatus(s, derive(s).current, late + min, true);
    expect(st.offset).toBeCloseTo(6 * 60);
    expect(Math.abs(st.slip)).toBeLessThan(1);
  });
});
