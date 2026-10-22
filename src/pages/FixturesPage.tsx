import { Fragment, useState } from 'react';
import { SESSIONS, STAGE_LABEL, type PlayerId } from '../data/fixture';
import { formatClock, formatTime } from '../lib/schedule';
import { REHEARSAL } from '../lib/storage';
import { restingInSession } from '../lib/tournament';
import { JudgeSelect, ScoreButton, Score, Side } from '../components/ui';
import { useStore } from '../store';

export function FixturesPage() {
  const { state, d, name } = useStore();
  const [player, setPlayer] = useState<PlayerId | null>(null);
  const [hideDone, setHideDone] = useState(false);
  const ids = state.players.map((p) => p.id);

  const sessions = SESSIONS.filter((s) => !hideDone || d.sessionStatus[s.key] !== 'done');

  return (
    <div className="page">
      <div className="page-head no-print">
        <h1>Fixtures</h1>
        <label className="check">
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> Hide finished rounds
        </label>
        <button className="btn btn-ghost" onClick={() => window.print()} title="Paper backup with every match, court and line judge">
          🖨 Print
        </button>
      </div>
      <div className="chips no-print" role="group" aria-label="Filter by player">
        <button className={`chip chip-btn ${!player ? 'on' : ''}`} onClick={() => setPlayer(null)}>
          Everyone
        </button>
        {ids.map((id) => (
          <button key={id} className={`chip chip-btn ${player === id ? 'on' : ''}`} onClick={() => setPlayer(player === id ? null : id)}>
            {name(id)}
          </button>
        ))}
      </div>

      <div className="print-only print-title">Tennis Tuesdays Cup 2026: fixture & scoresheet</div>

      <div className="fixture-list">
        {sessions.map((s) => {
          const matches = s.matchIds
            .map((id) => d.matches[id])
            .filter(
              (m) => !player || (!m.provisional && (m.homeId === player || m.awayId === player || m.judgeId === player)),
            );
          if (player && !matches.length) return null;
          const status = d.sessionStatus[s.key];
          const t = state.sessionTimes[s.key];
          const resting = restingInSession(d, s, ids);
          const showStage = s.index === 0 || SESSIONS[s.index - 1].stage !== s.stage;
          return (
            <Fragment key={s.key}>
            {showStage && <h2 className="fx-stage">{STAGE_LABEL[s.stage]}</h2>}
            <section className={`fx-session fx-${status}`}>
              <header className="fx-head">
                <h3>{s.label}</h3>
                <span className="muted small">
                  plan {formatClock(s.plannedStart)}
                  {t?.start && ` · started ${formatTime(t.start)}`}
                  {t?.end && ` · finished ${formatTime(t.end)}`}
                </span>
                {status === 'live' && <span className="tag tag-live">Now</span>}
                {status === 'done' && <span className="tag tag-done">Done</span>}
              </header>
              <table className="list fx-table">
                <tbody>
                  {matches.map((m) => (
                    <tr key={m.match.id} className={player && m.judgeId === player && m.homeId !== player && m.awayId !== player ? 'fx-judging' : ''}>
                      <td className="num muted">#{m.match.id}</td>
                      <td className="court-cell">Court {m.match.court}</td>
                      <td className="fx-match">
                        <Side m={m} side="home" /> <span className="vs">vs</span> <Side m={m} side="away" />
                      </td>
                      <td className="fx-score">
                        {m.result ? <Score m={m} /> : <span className="print-only score-box">___ – ___</span>}
                      </td>
                      <td className="fx-judge">
                        <span className="muted small">Judge </span>
                        <span className="no-print">
                          <JudgeSelect m={m} compact />
                        </span>
                        <span className="print-only">{name(m.judgeId)}</span>
                      </td>
                      <td className="no-print fx-action">
                        <ScoreButton m={m} className={m.result ? 'btn btn-ghost btn-sm' : 'btn btn-sm'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {s.stage === 'rr' && !player && (
                <div className="muted small fx-bye">Bye: {resting.map((id) => name(id)).join(', ')}</div>
              )}
            </section>
            </Fragment>
          );
        })}
      </div>
      {REHEARSAL && <p className="muted small">Rehearsal data, not the real tournament.</p>}
    </div>
  );
}
