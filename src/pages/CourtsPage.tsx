import { COURTS_VACATED_BY, PRESENTATION_TIME, RR_SESSIONS, SESSIONS, STAGE_LABEL, TOURNAMENT, type Session } from '../data/fixture';
import { scheduleStatus, formatClock, formatDuration, formatTime, RR_PLANNED_END } from '../lib/schedule';
import { REHEARSAL } from '../lib/storage';
import { copyText, sessionText } from '../lib/share';
import { playersInSession, restingInSession, type ResolvedMatch } from '../lib/tournament';
import { Card, JudgeSelect, ScoreButton, Score, Side, StandingsTable, speak } from '../components/ui';
import { useNow, useStore, useToast } from '../store';

export function CourtsPage() {
  const { d } = useStore();
  if (!d.current) return <AllDone />;
  const s = d.current;
  const inFinals = s.stage !== 'rr';

  return (
    <div className="courts-layout">
      <div className="courts-main">
        <SessionHeader session={s} />
        {s.key === 'ff-1' && !d.rrSeeds.final && <SeedingBlocked />}
        <div className={`court-grid court-grid-${Math.max(s.matchIds.length, s.stage === 'rr' ? 3 : 1)}`}>
          {s.matchIds.map((id) => (
            <CourtCard key={id} m={d.matches[id]} />
          ))}
          {s.stage === 'rr' &&
            Array.from({ length: TOURNAMENT.courts - s.matchIds.length }, (_, i) => (
              <div key={i} className="court court-free">
                <div className="court-label">Court {s.matchIds.length + i + 1}</div>
                <div className="court-free-text">Free this round</div>
              </div>
            ))}
        </div>
        <Resting session={s} />
        {d.next && <UpNext session={d.next} current={s} />}
      </div>
      <aside className="courts-side">
        {inFinals && d.rrSeeds.final ? (
          <Card title="Final Four table" actions={<a href="#/finals">Finals →</a>}>
            <StandingsTable rows={d.ffStandings} cut={2} cutLabel="Into the Final" compact />
          </Card>
        ) : (
          <Card title="Ladder" actions={<a href="#/ladder">Full ladder →</a>}>
            <StandingsTable rows={d.rrStandings} cut={4} cutLabel="Final Four" compact />
          </Card>
        )}
        <RecentResults />
      </aside>
    </div>
  );
}

function SessionHeader({ session }: { session: Session }) {
  const { state, d, dispatch, name } = useStore();
  const toast = useToast();
  const now = useNow(1000);
  const sched = scheduleStatus(state, session, now, REHEARSAL);
  const times = state.sessionTimes[session.key];
  const doneInSession = session.matchIds.filter((id) => state.results[id]).length;
  const behind = sched.slip > 1.5;
  const ahead = sched.slip < -1.5;
  const late = sched.projectedPresentation > COURTS_VACATED_BY - 5 && sched.slip > 3;

  const announce = () => {
    const parts = [`${session.label}.`];
    for (const id of session.matchIds) {
      const m = d.matches[id];
      parts.push(
        `Court ${m.match.court}: ${name(m.homeId)} versus ${name(m.awayId)}.` +
          (m.judgeId ? ` Line judge, ${name(m.judgeId)}.` : ''),
      );
    }
    if (!speak(parts.join(' '))) toast("This browser can't do text-to-speech");
  };

  return (
    <section className="session-head">
      <div className="session-title">
        <div className="eyebrow">
          {STAGE_LABEL[session.stage]} · first to {session.target}
        </div>
        <h1>
          {session.stage === 'rr' || session.stage === 'ff' ? (
            <>
              Round {session.round} <span className="of">of {session.stage === 'rr' ? RR_SESSIONS.length : 3}</span>
            </>
          ) : (
            session.label
          )}
        </h1>
        <div className="progress" aria-label={`${d.completed} of ${d.total} matches played`}>
          <div className="progress-bar" style={{ width: `${(d.completed / d.total) * 100}%` }} />
        </div>
        <div className="muted small">
          {d.completed} of {d.total} matches played · {doneInSession}/{session.matchIds.length} done this round
        </div>
      </div>

      <div className="session-clock">
        {times?.start ? (
          <>
            <div className="clock">{formatDuration(sched.elapsedMs)}</div>
            <div className="muted small">
              started {formatTime(times.start)}
              {times.autoStarted ? ' (auto)' : ''}
            </div>
          </>
        ) : (
          <button className="btn btn-primary btn-lg" onClick={() => dispatch({ type: 'start', sessionKey: session.key })}>
            ▶ {startLabel(session)}
          </button>
        )}
      </div>

      <div className={`schedule ${late ? 'schedule-late' : behind ? 'schedule-behind' : ''}`}>
        <div className="schedule-chip">
          {behind ? `${Math.round(sched.slip)} min behind` : ahead ? `${Math.round(-sched.slip)} min ahead` : 'On schedule'}
        </div>
        <div className="small">
          {sched.projectedRrEnd !== null && (
            <div>
              Round robin ends ~<strong>{formatClock(sched.projectedRrEnd)}</strong>{' '}
              <span className="muted">(plan {formatClock(RR_PLANNED_END + sched.offset)})</span>
            </div>
          )}
          <div>
            Presentation ~<strong>{formatClock(sched.projectedPresentation)}</strong>{' '}
            <span className="muted">(plan {formatClock(PRESENTATION_TIME + sched.offset)})</span>
          </div>
          {sched.avgRrRound !== null && session.stage === 'rr' && (
            <div className="muted">
              Avg round {formatDuration(sched.avgRrRound * 60000)} vs plan {formatDuration(sched.plannedRrRound * 60000)}
            </div>
          )}
          {late && <div className="late-note">Courts must be vacated by {formatClock(COURTS_VACATED_BY + sched.offset)}</div>}
        </div>
      </div>

      <div className="session-actions">
        <button className="btn btn-ghost" onClick={announce} title="Read the court list out loud">
          📣 Call players
        </button>
        <button
          className="btn btn-ghost"
          onClick={async () => {
            const prev = SESSIONS[session.index - 1];
            const text = sessionText(d, prev && doneInSession === 0 ? prev : session, name, prev && doneInSession === 0 ? session : d.next);
            toast((await copyText(text)) ? 'Round summary copied, ready to paste in the group chat' : "Couldn't copy");
          }}
        >
          Copy round summary
        </button>
      </div>
    </section>
  );
}

function startLabel(s: Session): string {
  if (s.key === 'rr-1') return 'Start tournament';
  if (s.key === 'ff-1') return 'Start Final Four';
  if (s.stage === 'bronze') return 'Start 3rd place playoff';
  if (s.stage === 'final') return 'Start The Final';
  return 'Start round clock';
}

function CourtCard({ m }: { m: ResolvedMatch }) {
  return (
    <div className={`court ${m.result ? 'court-done' : 'court-live'}`}>
      <div className="court-top">
        <div className="court-label">Court {m.match.court}</div>
        <div className="muted small">#{m.match.id}</div>
      </div>
      <div className="court-players">
        <Side m={m} side="home" />
        <span className="vs">vs</span>
        <Side m={m} side="away" />
      </div>
      <div className="court-judge">
        <span className="muted small">Line judge</span>
        <JudgeSelect m={m} />
      </div>
      <div className="court-foot">
        {m.result ? (
          <>
            <Score m={m} big />
            <ScoreButton m={m} className="btn btn-ghost btn-sm" />
          </>
        ) : (
          <ScoreButton m={m} className="btn btn-primary btn-block" />
        )}
      </div>
    </div>
  );
}

function Resting({ session }: { session: Session }) {
  const { state, d, name } = useStore();
  const resting = restingInSession(d, session, state.players.map((p) => p.id));
  const judging = new Set(session.matchIds.map((id) => d.matches[id].judgeId));
  if (!resting.length) return null;
  return (
    <div className="resting">
      <span className="label-inline">Resting</span>
      {resting.map((id) => (
        <span key={id} className={`chip ${judging.has(id) ? 'chip-judge' : ''}`}>
          {name(id)}
          {judging.has(id) && <span className="chip-note">judging</span>}
        </span>
      ))}
    </div>
  );
}

function UpNext({ session, current }: { session: Session; current: Session }) {
  const { d, name } = useStore();
  const onNow = new Set(playersInSession(d, current));
  return (
    <Card
      title={
        <>
          Up next · <span className="accent">{session.label}</span>
        </>
      }
      className="upnext"
      actions={session.stage === 'rr' ? <span className="muted small">get warmed up</span> : null}
    >
      <table className="list">
        <tbody>
          {session.matchIds.map((id) => {
            const m = d.matches[id];
            // In the Final Four everyone plays every round, so only flag it in the round robin.
            const b2b =
              session.stage === 'rr'
                ? [m.homeId, m.awayId].filter((p): p is string => Boolean(p && onNow.has(p)))
                : [];
            return (
              <tr key={id}>
                <td className="court-cell">Court {m.match.court}</td>
                <td>
                  <Side m={m} side="home" /> <span className="vs">vs</span> <Side m={m} side="away" />
                </td>
                <td className="small">
                  {b2b.length > 0 && (
                    <span className="tag tag-b2b" title="Playing in the current round too: may need a moment">
                      back-to-back: {b2b.map((p) => name(p)).join(', ')}
                    </span>
                  )}
                </td>
                <td className="small muted upnext-judge">Judge: {m.judgeId ? name(m.judgeId) : 'TBC'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {session.matchIds.some((id) => d.matches[id].provisional) && (
        <p className="muted small">Names in italics are provisional: they depend on how the current stage finishes.</p>
      )}
    </Card>
  );
}

function SeedingBlocked() {
  const { d, name } = useStore();
  return (
    <div className="alert">
      <strong>Final Four seeding needs a decision.</strong>{' '}
      {d.rrSeeds.tieAtCut.length
        ? `${d.rrSeeds.tieAtCut.map((id) => name(id)).join(', ')} are level on every tiebreaker across the top-4 line. `
        : 'The round robin is not finished. '}
      <a href="#/finals">Set the seeding on the Finals page →</a>
    </div>
  );
}

function RecentResults() {
  const { state, d } = useStore();
  const recent = Object.entries(state.results)
    .sort((a, b) => b[1].at - a[1].at)
    .slice(0, 6)
    .map(([id]) => d.matches[Number(id)]);
  if (!recent.length) return null;
  return (
    <Card title="Latest results">
      <ul className="recent">
        {recent.map((m) => (
          <li key={m.match.id}>
            <span className="muted small">#{m.match.id}</span> <Side m={m} side="home" showHome={false} />{' '}
            <Score m={m} /> <Side m={m} side="away" showHome={false} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AllDone() {
  const { d, name } = useStore();
  return (
    <div className="all-done">
      <div className="trophy" aria-hidden>
        🏆
      </div>
      <div className="eyebrow">There can only be one</div>
      <h1>{name(d.podium.champion)}</h1>
      <p className="lead">
        Champion of the {TOURNAMENT.name} {TOURNAMENT.year}
      </p>
      <p>
        Runner-up: <strong>{name(d.podium.runnerUp)}</strong> · Bronze: <strong>{name(d.podium.third)}</strong>
      </p>
      <p>
        <a className="btn btn-primary btn-lg" href="#/awards">
          Go to the presentation →
        </a>
      </p>
    </div>
  );
}
