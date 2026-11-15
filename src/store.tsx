import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import type { PlayerId } from './data/fixture';
import { simulateSessions } from './lib/demo';
import { initialState, reducer, type Action } from './lib/reducer';
import { hasScores, loadState, PUBLISHED, REHEARSAL, REHEARSAL_PREFILL, saveState, STORAGE_KEY } from './lib/storage';
import { derive, type Derived } from './lib/tournament';
import type { TournamentState } from './lib/types';

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
export type Command = DistributiveOmit<Exclude<Action, { type: 'hydrate' }>, 'at'>;

interface Store {
  state: TournamentState;
  d: Derived;
  dispatch: (c: Command) => void;
  name: (id: PlayerId | null | undefined) => string;
  saveFailed: boolean;
  /** Showing the results published with the site, not scores entered in this browser. */
  published: boolean;
}

const StoreContext = createContext<Store | null>(null);

function boot(): TournamentState {
  const saved = loadState();
  // The scoring laptop keeps its own scores; everyone else sees the published results.
  if (!REHEARSAL && PUBLISHED && !hasScores(saved)) return PUBLISHED;
  if (saved) return saved;
  if (REHEARSAL && REHEARSAL_PREFILL > 0) return simulateSessions(initialState(), REHEARSAL_PREFILL, 7);
  return initialState();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, undefined, boot);
  const [saveFailed, setSaveFailed] = useState(false);
  const fromOtherTab = useRef(false);

  useEffect(() => {
    if (fromOtherTab.current) {
      fromOtherTab.current = false;
      return;
    }
    // Don't copy the published results into this browser until something is changed,
    // so a later re-publish still reaches people who have already looked.
    if (state === PUBLISHED) return;
    setSaveFailed(!saveState(state));
  }, [state]);

  // Keep the TV display (or any other open tab) in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = loadState();
      if (next) {
        fromOtherTab.current = true;
        rawDispatch({ type: 'hydrate', state: next });
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const dispatch = useCallback((c: Command) => rawDispatch({ ...c, at: Date.now() } as Action), []);
  const d = useMemo(() => derive(state), [state]);
  const name = useCallback(
    (id: PlayerId | null | undefined) => (id ? (state.players.find((p) => p.id === id)?.name ?? id) : 'TBC'),
    [state.players],
  );

  const published = state === PUBLISHED;
  const value = useMemo(
    () => ({ state, d, dispatch, name, saveFailed, published }),
    [state, d, dispatch, name, saveFailed, published],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}

/** Re-renders every `ms` so clocks and timers tick. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

// ── Toasts ────────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  text: string;
  undo?: () => void;
}

const ToastContext = createContext<(text: string, undo?: () => void) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((text: string, undo?: () => void) => {
    const id = nextId.current++;
    setToasts((t) => [...t.slice(-2), { id, text, undo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), undo ? 8000 : 4000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <span>{t.text}</span>
            {t.undo && (
              <button
                className="toast-undo"
                onClick={() => {
                  t.undo!();
                  setToasts((all) => all.filter((x) => x.id !== t.id));
                }}
              >
                Undo
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// ── Routing ───────────────────────────────────────────────────────────────

export function useHashRoute(): [string, URLSearchParams] {
  const read = () => {
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, query = ''] = raw.split('?');
    return [path || 'courts', query] as const;
  };
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return [route[0], new URLSearchParams(route[1])];
}
