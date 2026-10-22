import { useEffect, useRef, useState } from 'react';
import { SESSION_BY_KEY } from '../data/fixture';
import { quickScores, scoreProblem } from '../lib/scoring';
import { useStore, useToast } from '../store';

export function ScoreDialog({ matchId, onClose }: { matchId: number; onClose: () => void }) {
  const { state, d, dispatch, name } = useStore();
  const toast = useToast();
  const m = d.matches[matchId];
  const existing = state.results[matchId];
  const target = m.match.target;
  const session = SESSION_BY_KEY[m.match.sessionKey];

  const [winner, setWinner] = useState<'home' | 'away' | null>(
    existing ? (existing.home > existing.away ? 'home' : 'away') : null,
  );
  const [custom, setCustom] = useState({ home: existing ? String(existing.home) : '', away: existing ? String(existing.away) : '' });
  const [force, setForce] = useState(false);
  const firstButton = useRef<HTMLButtonElement>(null);

  const home = name(m.homeId);
  const away = name(m.awayId);
  const { regular, deuce } = quickScores(target);

  const save = (h: number, a: number, walkover = false) => {
    const prev = existing;
    dispatch({ type: 'record', matchId, home: h, away: a, walkover });
    toast(`Saved #${matchId}: ${home} ${h}–${a} ${away}${walkover ? ' (walkover)' : ''}`, () =>
      prev
        ? dispatch({ type: 'record', matchId, home: prev.home, away: prev.away, walkover: prev.walkover })
        : dispatch({ type: 'clear', matchId }),
    );
    onClose();
  };

  const pick = (w: number, l: number) => (winner === 'home' ? save(w, l) : save(l, w));

  useEffect(() => {
    firstButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'h') setWinner('home');
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'a') setWinner('away');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // With a winner picked, typing the loser's points saves a regular score.
  useEffect(() => {
    if (!winner) return;
    const onDigit = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      const n = Number(e.key);
      if (e.key.length === 1 && Number.isInteger(n) && n <= target - 2) pick(target, n);
    };
    window.addEventListener('keydown', onDigit);
    return () => window.removeEventListener('keydown', onDigit);
  });

  const ch = Number(custom.home);
  const ca = Number(custom.away);
  const customFilled = custom.home !== '' && custom.away !== '';
  const problem = customFilled ? scoreProblem(ch, ca, target) : null;
  const hardInvalid = customFilled && (ch === ca || ch < 0 || ca < 0 || !Number.isInteger(ch) || !Number.isInteger(ca));

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="score-title">
        <header className="modal-head">
          <div>
            <div className="eyebrow">
              Match #{matchId} · {session.label} · Court {m.match.court}
            </div>
            <h2 id="score-title">Enter score</h2>
            <div className="muted small">
              First to {target}, win by 2. {existing && <strong>Currently {existing.home}–{existing.away}.</strong>}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="modal-body">
          <div className="label">Who won?</div>
          <div className="who-won">
            <button
              ref={firstButton}
              className={`pick ${winner === 'home' ? 'selected' : ''}`}
              onClick={() => setWinner('home')}
              aria-pressed={winner === 'home'}
            >
              <span className="pick-name">{home}</span>
              <span className="tag tag-home">Home</span>
            </button>
            <span className="vs">vs</span>
            <button
              className={`pick ${winner === 'away' ? 'selected' : ''}`}
              onClick={() => setWinner('away')}
              aria-pressed={winner === 'away'}
            >
              <span className="pick-name">{away}</span>
            </button>
          </div>

          {winner && (
            <>
              <div className="label">
                Final score <span className="muted">· {winner === 'home' ? home : away} won · tap to save</span>
              </div>
              <div className="score-grid">
                {regular.map(([w, l]) => (
                  <button key={l} className="score-btn" onClick={() => pick(w, l)}>
                    {w}–{l}
                  </button>
                ))}
              </div>
              <div className="label">Went past {target - 1}–{target - 1}</div>
              <div className="score-grid">
                {deuce.map(([w, l]) => (
                  <button key={l} className="score-btn score-btn-deuce" onClick={() => pick(w, l)}>
                    {w}–{l}
                  </button>
                ))}
              </div>
            </>
          )}

          <details className="custom" open={Boolean(existing && scoreProblem(existing.home, existing.away, target))}>
            <summary>Other score or walkover</summary>
            <form
              className="custom-row"
              onSubmit={(e) => {
                e.preventDefault();
                if (customFilled && !hardInvalid && (!problem || force)) save(ch, ca);
              }}
            >
              <label>
                <span>{home}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={custom.home}
                  onChange={(e) => setCustom({ ...custom, home: e.target.value })}
                />
              </label>
              <span className="dash">–</span>
              <label>
                <span>{away}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={custom.away}
                  onChange={(e) => setCustom({ ...custom, away: e.target.value })}
                />
              </label>
              <button className="btn" type="submit" disabled={!customFilled || hardInvalid || Boolean(problem && !force)}>
                Save
              </button>
            </form>
            {problem && (
              <div className="warn">
                {problem}
                {!hardInvalid && (
                  <label className="check">
                    <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} /> Save it anyway
                    (e.g. the match was cut short)
                  </label>
                )}
              </div>
            )}
            <div className="walkover">
              <span className="muted small">Walkover (injury / no-show) counts as {target}–0:</span>
              <button className="btn btn-ghost" onClick={() => save(target, 0, true)}>
                W/O to {home}
              </button>
              <button className="btn btn-ghost" onClick={() => save(0, target, true)}>
                W/O to {away}
              </button>
            </div>
          </details>
        </div>

        <footer className="modal-foot">
          {existing ? (
            <button
              className="btn btn-danger-ghost"
              onClick={() => {
                dispatch({ type: 'clear', matchId });
                toast(`Removed the score for #${matchId}`, () =>
                  dispatch({ type: 'record', matchId, home: existing.home, away: existing.away, walkover: existing.walkover }),
                );
                onClose();
              }}
            >
              Remove score
            </button>
          ) : (
            <span className="muted small">Tip: H/A or ←/→ picks the winner, then type the loser's points.</span>
          )}
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </footer>
      </div>
    </div>
  );
}
