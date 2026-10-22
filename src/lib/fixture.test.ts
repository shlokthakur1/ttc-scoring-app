import { describe, expect, it } from 'vitest';
import {
  FF_MATCHES,
  MATCHES,
  PLAYER_IDS,
  RR_MATCHES,
  RR_PRINTED_BYES,
  RR_SESSIONS,
  SESSIONS,
  SESSION_BY_KEY,
} from '../data/fixture';

const ids = (m: (typeof MATCHES)[number]) => [
  m.home.kind === 'player' ? m.home.id : '',
  m.away.kind === 'player' ? m.away.id : '',
];

describe('official fixture', () => {
  it('matches the program: 19 rounds, 55 round robin matches, 63 in total', () => {
    expect(RR_SESSIONS).toHaveLength(19);
    expect(RR_MATCHES).toHaveLength(55);
    expect(FF_MATCHES).toHaveLength(6);
    expect(MATCHES).toHaveLength(63);
    expect(MATCHES.map((m) => m.id)).toEqual(Array.from({ length: 63 }, (_, i) => i + 1));
    expect(SESSIONS).toHaveLength(19 + 3 + 2);
  });

  it('is a complete round robin: every pair of the 11 players meets exactly once', () => {
    const pairs = new Set(RR_MATCHES.map((m) => ids(m).sort().join('|')));
    expect(pairs.size).toBe((11 * 10) / 2);
    for (const id of PLAYER_IDS) {
      expect(RR_MATCHES.filter((m) => ids(m).includes(id))).toHaveLength(10);
    }
  });

  it('never has a player on two courts in one round, and the byes match the printed list', () => {
    RR_SESSIONS.forEach((s, i) => {
      const on = s.matchIds.flatMap((id) => ids(MATCHES[id - 1]));
      expect(new Set(on).size).toBe(on.length);
      const byes = PLAYER_IDS.filter((p) => !on.includes(p)).sort();
      expect(byes).toEqual([...RR_PRINTED_BYES[i]].sort());
    });
  });

  it('spot-checks courts and home players against the program', () => {
    const m1 = MATCHES[0];
    expect(m1).toMatchObject({ court: 1, sessionKey: 'rr-1', home: { id: 'fazz' }, away: { id: 'shlok' } });
    const m55 = MATCHES[54];
    expect(m55).toMatchObject({ court: 3, sessionKey: 'rr-19', home: { id: 'ass' }, away: { id: 'tmog' } });
    expect(SESSION_BY_KEY['rr-7'].matchIds).toEqual([19, 20]);
    expect(SESSION_BY_KEY['rr-13'].matchIds).toEqual([36, 37]);
    expect(MATCHES[61]).toMatchObject({ stage: 'bronze', court: 1, home: { from: 'ff', pos: 3 }, away: { from: 'ff', pos: 4 } });
    expect(MATCHES[62]).toMatchObject({ stage: 'final', court: 1, home: { from: 'ff', pos: 1 }, away: { from: 'ff', pos: 2 } });
  });

  it('uses race to 7 for the round robin and race to 11 after it', () => {
    expect(RR_MATCHES.every((m) => m.target === 7)).toBe(true);
    expect(MATCHES.filter((m) => m.stage !== 'rr').every((m) => m.target === 11)).toBe(true);
  });

  it('plans the round robin between 10:00 and 12:20', () => {
    expect(RR_SESSIONS[0].plannedStart).toBe(600);
    const last = RR_SESSIONS[18];
    expect(last.plannedStart + last.plannedMinutes).toBeCloseTo(740);
  });
});
