import { DEFAULT_PLAYERS, MATCH_BY_ID, SESSION_BY_KEY, SESSIONS, type PlayerId } from '../data/fixture';
import { derive, type ResolvedMatch } from './tournament';
import type { LogEntry, MatchResult, TournamentState } from './types';

export type Action =
  | { type: 'record'; matchId: number; home: number; away: number; walkover?: boolean; at: number }
  | { type: 'clear'; matchId: number; at: number }
  | { type: 'start'; sessionKey: string; at: number }
  | { type: 'setJudge'; matchId: number; playerId: PlayerId | null; at: number }
  | { type: 'setSeeds'; from: 'rr' | 'ff'; ids: PlayerId[] | null; at: number }
  | { type: 'rename'; id: PlayerId; name: string; at: number }
  | { type: 'replace'; state: TournamentState; reason: string; at: number }
  | { type: 'reset'; at: number }
  /** State arriving from another tab: applied as-is, not logged. */
  | { type: 'hydrate'; state: TournamentState };

const MAX_LOG = 1000;

export function initialState(players = DEFAULT_PLAYERS): TournamentState {
  return {
    version: 1,
    players: players.map((p) => ({ ...p })),
    results: {},
    sessionTimes: {},
    lineJudges: {},
    seedOverrides: { rr: null, ff: null },
    log: [],
  };
}

function withLog(state: TournamentState, at: number, text: string): TournamentState {
  const log: LogEntry[] = [{ at, text }, ...state.log].slice(0, MAX_LOG);
  return { ...state, log };
}

function nameOf(state: TournamentState, id: PlayerId | null): string {
  if (!id) return 'TBC';
  return state.players.find((p) => p.id === id)?.name ?? id;
}

export function describeScore(state: TournamentState, m: ResolvedMatch, r: Pick<MatchResult, 'home' | 'away' | 'walkover'>): string {
  const wo = r.walkover ? ' (walkover)' : '';
  return `${nameOf(state, m.homeId)} ${r.home}–${r.away} ${nameOf(state, m.awayId)}${wo}`;
}

export function matchLabel(m: ResolvedMatch): string {
  const s = SESSION_BY_KEY[m.match.sessionKey];
  return `#${m.match.id} ${s.shortLabel} · Court ${m.match.court}`;
}

export function reducer(state: TournamentState, action: Action): TournamentState {
  switch (action.type) {
    case 'record': {
      const match = MATCH_BY_ID[action.matchId];
      if (!match) return state;
      const d = derive(state);
      const rm = d.matches[match.id];
      // Never attach a score to a match whose players aren't settled.
      if (!rm.homeId || !rm.awayId || rm.provisional) return state;

      const prev = state.results[match.id];
      const result: MatchResult = { home: action.home, away: action.away, at: action.at };
      if (action.walkover) result.walkover = true;
      const results = { ...state.results, [match.id]: result };

      // Once a later stage starts, freeze the seeding it was drawn from so a
      // correction to an earlier score can't silently swap players around.
      let seedOverrides = state.seedOverrides;
      if (match.stage === 'ff' && !seedOverrides.rr) seedOverrides = { ...seedOverrides, rr: d.rrSeeds.ids };
      if ((match.stage === 'bronze' || match.stage === 'final') && !seedOverrides.ff) {
        seedOverrides = { ...seedOverrides, ff: d.ffSeeds.ids };
      }

      // "Once all matches in the round are completed, the next round begins immediately."
      const session = SESSION_BY_KEY[match.sessionKey];
      const sessionTimes = { ...state.sessionTimes };
      const complete = session.matchIds.every((id) => results[id]);
      if (complete && !sessionTimes[session.key]?.end) {
        sessionTimes[session.key] = { ...sessionTimes[session.key], end: action.at };
        const next = SESSIONS[session.index + 1];
        if (next?.autoStart && !sessionTimes[next.key]?.start && !next.matchIds.some((id) => results[id])) {
          sessionTimes[next.key] = { start: action.at, autoStarted: true };
        }
      }

      const text = prev
        ? `${matchLabel(rm)} corrected: ${describeScore(state, rm, prev)} → ${describeScore(state, rm, result)}`
        : `${matchLabel(rm)}: ${describeScore(state, rm, result)}`;
      return withLog({ ...state, results, seedOverrides, sessionTimes }, action.at, text);
    }

    case 'clear': {
      const prev = state.results[action.matchId];
      if (!prev) return state;
      const rm = derive(state).matches[action.matchId];
      const results = { ...state.results };
      delete results[action.matchId];
      const session = SESSION_BY_KEY[rm.match.sessionKey];
      const sessionTimes = { ...state.sessionTimes };
      if (sessionTimes[session.key]?.end) {
        const { end: _end, ...rest } = sessionTimes[session.key];
        sessionTimes[session.key] = rest;
      }
      const next = SESSIONS[session.index + 1];
      if (next && sessionTimes[next.key]?.autoStarted && !next.matchIds.some((id) => results[id])) {
        delete sessionTimes[next.key];
      }
      return withLog(
        { ...state, results, sessionTimes },
        action.at,
        `${matchLabel(rm)} score removed (was ${describeScore(state, rm, prev)})`,
      );
    }

    case 'start': {
      const s = SESSION_BY_KEY[action.sessionKey];
      if (!s) return state;
      const existing = state.sessionTimes[s.key];
      const sessionTimes = { ...state.sessionTimes, [s.key]: { ...existing, start: action.at, autoStarted: false } };
      return withLog({ ...state, sessionTimes }, action.at, `${s.label} ${existing?.start ? 'clock restarted' : 'started'}`);
    }

    case 'setJudge': {
      const rm = derive(state).matches[action.matchId];
      if (!rm) return state;
      const lineJudges = { ...state.lineJudges };
      if (action.playerId) lineJudges[action.matchId] = action.playerId;
      else delete lineJudges[action.matchId];
      const who = action.playerId ? nameOf(state, action.playerId) : 'automatic rota';
      return withLog({ ...state, lineJudges }, action.at, `${matchLabel(rm)} line judge set to ${who}`);
    }

    case 'setSeeds': {
      const seedOverrides = { ...state.seedOverrides, [action.from]: action.ids };
      const stage = action.from === 'rr' ? 'Final Four seeding (Q1–Q4)' : 'Final placings (F1–F4)';
      const text = action.ids
        ? `${stage} locked: ${action.ids.map((id, i) => `${i + 1}. ${nameOf(state, id)}`).join(', ')}`
        : `${stage} unlocked: back to automatic from the ladder`;
      return withLog({ ...state, seedOverrides }, action.at, text);
    }

    case 'rename': {
      const name = action.name.trim();
      const old = nameOf(state, action.id);
      if (!name || name === old) return state;
      const players = state.players.map((p) => (p.id === action.id ? { ...p, name } : p));
      return withLog({ ...state, players }, action.at, `Renamed ${old} to ${name}`);
    }

    case 'replace':
      return withLog(action.state, action.at, action.reason);

    case 'reset':
      return withLog(initialState(state.players), action.at, 'Tournament reset: all scores cleared');

    case 'hydrate':
      return action.state;
  }
}
