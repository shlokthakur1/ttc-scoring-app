import { useState, type ReactNode } from 'react';
import { SESSION_BY_KEY, type PlayerId, type SlotRef } from '../data/fixture';
import type { StandingRow } from '../lib/standings';
import { restingInSession, type ResolvedMatch } from '../lib/tournament';
import { useStore } from '../store';
import { ScoreDialog } from './ScoreDialog';

export function slotLabel(ref: SlotRef): string {
  if (ref.kind === 'player') return '';
  return `${ref.from === 'rr' ? 'Q' : 'F'}${ref.pos}`;
}

/** Name of one side of a match, with its seed label when it comes from a placing. */
export function Side({ m, side, showHome = true }: { m: ResolvedMatch; side: 'home' | 'away'; showHome?: boolean }) {
  const { name } = useStore();
  const id = side === 'home' ? m.homeId : m.awayId;
  const ref = side === 'home' ? m.match.home : m.match.away;
  const seed = slotLabel(ref);
  const won = m.winnerId && m.winnerId === id;
  return (
    <span className={`side ${won ? 'side-won' : ''} ${m.result && !won ? 'side-lost' : ''}`}>
      {seed && <span className="seed">{seed}</span>}
      <span className={m.provisional ? 'provisional' : ''}>{id ? name(id) : 'TBC'}</span>
      {showHome && side === 'home' && <span className="tag tag-home" title="Home player: chooses to FEED or RECEIVE first">H</span>}
    </span>
  );
}

export function Score({ m, big = false }: { m: ResolvedMatch; big?: boolean }) {
  if (!m.result) return null;
  return (
    <span className={`score ${big ? 'score-big' : ''}`}>
      {m.result.home}–{m.result.away}
      {m.result.walkover && <span className="tag tag-wo">W/O</span>}
    </span>
  );
}

/** Opens the score dialog for a match. */
export function ScoreButton({ m, label, className = 'btn' }: { m: ResolvedMatch; label?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const blocked = !m.homeId || !m.awayId || m.provisional;
  return (
    <>
      <button
        className={className}
        disabled={blocked}
        title={blocked ? 'Players not confirmed yet' : undefined}
        onClick={() => setOpen(true)}
      >
        {label ?? (m.result ? 'Edit' : 'Enter score')}
      </button>
      {open && <ScoreDialog matchId={m.match.id} onClose={() => setOpen(false)} />}
    </>
  );
}

export function JudgeSelect({ m, compact = false }: { m: ResolvedMatch; compact?: boolean }) {
  const { state, d, dispatch, name } = useStore();
  const session = SESSION_BY_KEY[m.match.sessionKey];
  const ids = state.players.map((p) => p.id);
  if (!m.homeId || !m.awayId) return <span className="muted">TBC</span>;
  const resting = restingInSession(d, session, ids);
  // Players already judging another court this session.
  const busy = new Set(
    session.matchIds.filter((id) => id !== m.match.id).map((id) => d.matches[id].judgeId),
  );
  return (
    <select
      className={`judge-select ${compact ? 'compact' : ''} ${m.judgeOverridden ? 'overridden' : ''}`}
      value={m.judgeOverridden ? m.judgeId ?? '' : ''}
      aria-label={`Line judge for match ${m.match.id}`}
      onChange={(e) => dispatch({ type: 'setJudge', matchId: m.match.id, playerId: e.target.value || null })}
    >
      <option value="">{m.judgeOverridden ? 'Back to rota' : name(m.judgeId)}</option>
      {resting
        .filter((id) => id !== m.judgeId || m.judgeOverridden)
        .map((id) => (
          <option key={id} value={id}>
            {name(id)}
            {busy.has(id) ? ' (also judging)' : ''}
          </option>
        ))}
    </select>
  );
}

export function Form({ form, n = 5 }: { form: ('W' | 'L')[]; n?: number }) {
  const recent = form.slice(-n);
  return (
    <span className="form" aria-label={`Last ${recent.length}: ${recent.join(' ')}`}>
      {recent.map((r, i) => (
        <span key={i} className={`form-dot ${r === 'W' ? 'form-w' : 'form-l'}`}>
          {r}
        </span>
      ))}
    </span>
  );
}

const SPLIT_LABEL = { wins: '', diff: '+/−', h2h: 'H2H', pf: 'pts' } as const;

export function StandingsTable({
  rows,
  cut,
  cutLabel,
  compact = false,
  nextFor,
}: {
  rows: StandingRow[];
  cut: number;
  cutLabel: string;
  compact?: boolean;
  nextFor?: (id: PlayerId) => ReactNode;
}) {
  const { name } = useStore();
  return (
    <table className={`ladder ${compact ? 'ladder-compact' : ''}`}>
      <thead>
        <tr>
          <th className="num">#</th>
          <th>Player</th>
          <th className="num" title="Played">P</th>
          <th className="num" title="Won">W</th>
          <th className="num" title="Lost">L</th>
          {!compact && <th className="num col-pts" title="Points won">PF</th>}
          {!compact && <th className="num col-pts" title="Points lost">PA</th>}
          <th className="num" title="Point differential">+/−</th>
          {!compact && <th>Form</th>}
          {!compact && <th className="num" title="Matches left">Left</th>}
          {nextFor && !compact && <th>Next</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          // Before a ball is hit everyone is "level"; that isn't worth flagging.
          const tied = r.tiedWith.length > 0 && r.played > 0;
          return (
          <tr key={r.id} className={[i < cut ? 'in' : '', i === cut - 1 ? 'cut' : '', r.status ?? ''].join(' ')}>
            <td className="num pos" data-cut-label={i === cut - 1 ? cutLabel : undefined}>
              {r.played ? r.rank : i + 1}
              {tied ? '=' : ''}
            </td>
            <td className="player">
              <span className="pname">{name(r.id)}</span>
              {r.status === 'clinched' && (
                <span className="tag tag-q" title="Mathematically through">
                  Q
                </span>
              )}
              {r.status === 'eliminated' && (
                <span className="tag tag-out" title="Can no longer qualify">
                  out
                </span>
              )}
              {r.splitBy && r.splitBy !== 'wins' && (
                <span className="split" title={`Separated from the player above on ${r.splitBy}`}>
                  on {SPLIT_LABEL[r.splitBy]}
                </span>
              )}
              {tied && (
                <span className="split split-tie" title="Level on every tiebreaker">
                  tied
                </span>
              )}
            </td>
            <td className="num">{r.played}</td>
            <td className="num strong">{r.won}</td>
            <td className="num">{r.lost}</td>
            {!compact && <td className="num col-pts">{r.pf}</td>}
            {!compact && <td className="num col-pts">{r.pa}</td>}
            <td className={`num ${r.diff > 0 ? 'pos-diff' : r.diff < 0 ? 'neg-diff' : ''}`}>
              {r.diff > 0 ? '+' : ''}
              {r.diff}
            </td>
            {!compact && (
              <td>
                <Form form={r.form} />
              </td>
            )}
            {!compact && <td className="num">{r.remaining}</td>}
            {nextFor && !compact && <td className="next-cell">{nextFor(r.id)}</td>}
          </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function Card({ title, actions, children, className = '' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          {title && <h2>{title}</h2>}
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function speak(text: string): boolean {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  u.lang = 'en-AU';
  window.speechSynthesis.speak(u);
  return true;
}
