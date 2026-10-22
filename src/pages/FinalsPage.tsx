import { useState } from 'react';
import { BRONZE_MATCH, FF_MATCHES, FINAL_MATCH, SESSIONS, type PlayerId } from '../data/fixture';
import type { SeedInfo } from '../lib/tournament';
import { Card, JudgeSelect, ScoreButton, Score, Side, StandingsTable } from '../components/ui';
import { useStore } from '../store';
import { Podium } from './AwardsPage';

export function FinalsPage() {
  const { d } = useStore();
  const ffSessions = SESSIONS.filter((s) => s.stage === 'ff');

  return (
    <div className="page">
      <div className="page-head">
        <h1>The Finals</h1>
        <span className="muted">Final Four (first to 11) → Third Place Playoff &amp; The Final</span>
      </div>

      <div className="two-col">
        <SeedPanel from="rr" />
        <SeedPanel from="ff" />
      </div>

      <Card title="Final Four table" actions={<span className="muted small">fresh standings · top 2 into The Final</span>}>
        {d.rrSeeds.final ? (
          <StandingsTable rows={d.ffStandings} cut={2} cutLabel="Into the Final" />
        ) : (
          <p className="muted">Appears once the Final Four is confirmed.</p>
        )}
      </Card>

      <Card title="Final Four matches">
        <table className="list">
          <tbody>
            {ffSessions.map((s) =>
              s.matchIds.map((id, i) => {
                const m = d.matches[id];
                return (
                  <tr key={id} className={d.current?.key === s.key ? 'row-live' : ''}>
                    <td className="muted small">{i === 0 ? `Round ${s.round}` : ''}</td>
                    <td className="num muted">#{id}</td>
                    <td className="court-cell">Court {m.match.court}</td>
                    <td>
                      <Side m={m} side="home" /> <span className="vs">vs</span> <Side m={m} side="away" />
                    </td>
                    <td className="fx-score">
                      <Score m={m} />
                    </td>
                    <td className="small">
                      <span className="muted">Judge </span>
                      <JudgeSelect m={m} compact />
                    </td>
                    <td className="fx-action">
                      <ScoreButton m={m} className={m.result ? 'btn btn-ghost btn-sm' : 'btn btn-sm'} />
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
        {FF_MATCHES.some((m) => d.matches[m.id].provisional) && (
          <p className="muted small">Names in italics are provisional until the round robin is complete.</p>
        )}
      </Card>

      <div className="two-col">
        {[BRONZE_MATCH, FINAL_MATCH].map((match) => {
          const m = d.matches[match.id];
          const isFinal = match.id === FINAL_MATCH.id;
          return (
            <Card key={match.id} title={isFinal ? '🏆 The Final' : '🥉 Third Place Playoff'} className={isFinal ? 'card-final' : ''}>
              <div className="podium-match">
                <div className="muted small">
                  #{match.id} · Court {match.court} · {isFinal ? 'F1 vs F2 · winner takes all' : 'F3 vs F4 · bronze medal'}
                </div>
                <div className="court-players">
                  <Side m={m} side="home" />
                  <span className="vs">vs</span>
                  <Side m={m} side="away" />
                </div>
                <div className="court-foot">
                  {m.result && <Score m={m} big />}
                  <ScoreButton m={m} className={m.result ? 'btn btn-ghost btn-sm' : 'btn btn-primary'} />
                </div>
                <div className="small">
                  <span className="muted">Line judge </span>
                  <JudgeSelect m={m} compact />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {d.podium.champion && (
        <Card title="Podium">
          <Podium />
        </Card>
      )}
    </div>
  );
}

function SeedPanel({ from }: { from: 'rr' | 'ff' }) {
  const { state, d, dispatch, name } = useStore();
  const seeds: SeedInfo = from === 'rr' ? d.rrSeeds : d.ffSeeds;
  const [editing, setEditing] = useState(false);
  const pool: PlayerId[] = from === 'rr' ? state.players.map((p) => p.id) : d.rrSeeds.final ? d.rrSeeds.ids : [];
  const [draft, setDraft] = useState<PlayerId[]>(seeds.ids);
  const prefix = from === 'rr' ? 'Q' : 'F';
  const stageDone = from === 'rr' ? d.rrComplete : d.ffComplete;
  const laterStarted =
    from === 'rr'
      ? FF_MATCHES.some((m) => state.results[m.id])
      : Boolean(state.results[BRONZE_MATCH.id] || state.results[FINAL_MATCH.id]);

  let statusText: string;
  let statusCls = '';
  if (seeds.locked) {
    statusText = laterStarted ? 'Locked: the next stage has started' : 'Set manually';
    statusCls = 'tag-done';
  } else if (seeds.tieAtCut.length && stageDone) {
    statusText = 'Tie across the line: decide manually';
    statusCls = 'tag-warn';
  } else if (seeds.final) {
    statusText = 'Confirmed';
    statusCls = 'tag-done';
  } else {
    statusText = pool.length ? 'Provisional: still being played' : 'Waiting for the Final Four';
  }

  const valid = draft.length === 4 && new Set(draft).size === 4 && draft.every(Boolean);

  return (
    <Card
      title={from === 'rr' ? 'Final Four seeding (Q1–Q4)' : 'Final placings (F1–F4)'}
      actions={<span className={`tag ${statusCls}`}>{statusText}</span>}
    >
      {seeds.tieAtCut.length > 0 && stageDone && !seeds.locked && (
        <div className="alert">
          {seeds.tieAtCut.map((id) => name(id)).join(', ')} are level on wins, point differential, head-to-head and points
          won. Settle it (coin toss or a quick tiebreak point), then set the order below.
        </div>
      )}
      {!editing ? (
        <>
          <ol className="seeds">
            {[0, 1, 2, 3].map((i) => (
              <li key={i}>
                <span className="seed">
                  {prefix}
                  {i + 1}
                </span>
                <span className={seeds.final ? '' : 'provisional'}>{seeds.ids[i] ? name(seeds.ids[i]) : 'TBC'}</span>
                {from === 'ff' && <span className="muted small">{i < 2 ? 'The Final' : 'Third Place Playoff'}</span>}
              </li>
            ))}
          </ol>
          <div className="row-actions">
            <button
              className="btn btn-ghost btn-sm"
              disabled={!pool.length}
              onClick={() => {
                setDraft(seeds.ids.length === 4 ? seeds.ids : pool.slice(0, 4));
                setEditing(true);
              }}
            >
              Set manually
            </button>
            {seeds.locked && (
              <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'setSeeds', from, ids: null })}>
                Unlock (follow the table)
              </button>
            )}
          </div>
          {laterStarted && seeds.locked && (
            <p className="muted small">
              Locked automatically when the next stage began, so a corrected score can’t swap players mid-stage.
            </p>
          )}
        </>
      ) : (
        <form
          className="seed-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            dispatch({ type: 'setSeeds', from, ids: draft });
            setEditing(false);
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <label key={i}>
              <span className="seed">
                {prefix}
                {i + 1}
              </span>
              <select value={draft[i] ?? ''} onChange={(e) => setDraft(Object.assign([...draft], { [i]: e.target.value }))}>
                <option value="">Choose…</option>
                {pool.map((id) => (
                  <option key={id} value={id}>
                    {name(id)}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {!valid && <div className="warn small">Pick four different players.</div>}
          <div className="row-actions">
            <button className="btn btn-primary btn-sm" type="submit" disabled={!valid}>
              Lock seeding
            </button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
          <p className="muted small">
            Use this for an unbreakable tie or if a player has to withdraw. It overrides the table until you unlock it.
          </p>
        </form>
      )}
    </Card>
  );
}
