import { DEFAULT_PLAYERS, MATCH_BY_ID } from '../data/fixture';
import { initialState } from './reducer';
import type { TournamentState } from './types';

const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);

/** Rehearsal mode keeps its practice data under a different key. */
export const REHEARSAL = params.has('rehearsal');
export const REHEARSAL_PREFILL = Number(params.get('rehearsal')) || 0;

export const STORAGE_KEY = REHEARSAL ? 'ttc2026:rehearsal' : 'ttc2026:live';
/** Copy taken before a reset or import, so either can be undone. */
export const BACKUP_KEY = `${STORAGE_KEY}:before-last-reset`;

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** Accepts saved or imported JSON and returns a well-formed state, or null. */
export function parseState(raw: unknown): TournamentState | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<TournamentState>;
  if (s.version !== 1 || typeof s.results !== 'object' || !s.results) return null;
  const base = initialState(DEFAULT_PLAYERS);

  const players = Array.isArray(s.players)
    ? base.players.map((p) => {
        const saved = s.players!.find((x) => x && x.id === p.id);
        return saved && typeof saved.name === 'string' && saved.name.trim() ? { id: p.id, name: saved.name } : p;
      })
    : base.players;

  const results: TournamentState['results'] = {};
  for (const [k, v] of Object.entries(s.results)) {
    const id = Number(k);
    if (!MATCH_BY_ID[id] || !v || typeof v !== 'object') continue;
    const { home, away, walkover, at } = v as TournamentState['results'][number];
    if (!Number.isInteger(home) || !Number.isInteger(away) || home === away) continue;
    results[id] = { home, away, at: typeof at === 'number' ? at : Date.now(), ...(walkover ? { walkover: true } : {}) };
  }

  return {
    version: 1,
    players,
    results,
    sessionTimes: s.sessionTimes && typeof s.sessionTimes === 'object' ? s.sessionTimes : {},
    lineJudges: s.lineJudges && typeof s.lineJudges === 'object' ? s.lineJudges : {},
    seedOverrides: {
      rr: Array.isArray(s.seedOverrides?.rr) ? s.seedOverrides!.rr : null,
      ff: Array.isArray(s.seedOverrides?.ff) ? s.seedOverrides!.ff : null,
    },
    log: Array.isArray(s.log) ? s.log.filter((e) => e && typeof e.text === 'string').slice(0, 1000) : [],
  };
}

export function loadState(key = STORAGE_KEY): TournamentState | null {
  const raw = safeGet(key);
  if (!raw) return null;
  try {
    return parseState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveState(state: TournamentState, key = STORAGE_KEY): boolean {
  return safeSet(key, JSON.stringify(state));
}

export function saveBackup(state: TournamentState): void {
  safeSet(BACKUP_KEY, JSON.stringify({ savedAt: Date.now(), state }));
}

export function loadBackup(): { savedAt: number; state: TournamentState } | null {
  const raw = safeGet(BACKUP_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const state = parseState(parsed.state);
    return state ? { savedAt: Number(parsed.savedAt) || 0, state } : null;
  } catch {
    return null;
  }
}
