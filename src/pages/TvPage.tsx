import { TOURNAMENT } from '../data/fixture';
import { formatClock, formatDuration, minutesOfDay } from '../lib/schedule';
import { restingInSession } from '../lib/tournament';
import { Score, Side, StandingsTable } from '../components/ui';
import { useNow, useStore } from '../store';
import { Podium } from './AwardsPage';

/** Big-screen view for a TV or projector. Updates live from the scoring tab. */
export function TvPage() {
  const { state, d, name } = useStore();
  const now = useNow(1000);
  const s = d.current;
  const start = s ? state.sessionTimes[s.key]?.start : undefined;

  if (!s) {
    return (
      <div className="tv tv-done">
        <div className="eyebrow">There can only be one</div>
        <h1 className="tv-champion">{name(d.podium.champion)}</h1>
        <div className="tv-sub">
          {TOURNAMENT.name} {TOURNAMENT.year} champion
        </div>
        <Podium />
      </div>
    );
  }

  const resting = restingInSession(d, s, state.players.map((p) => p.id));
  const showFf = s.stage !== 'rr' && d.rrSeeds.final;

  return (
    <div className="tv">
      <header className="tv-head">
        <div className="tv-brand">
          Tennis Tuesdays Cup <span>{TOURNAMENT.year}</span>
        </div>
        <div className="tv-round">
          {s.label}
          {s.stage === 'rr' && <span className="of"> of 19</span>}
          {start && <span className="tv-timer">{formatDuration(now - start)}</span>}
        </div>
        <div className="tv-clock">{formatClock(Math.floor(minutesOfDay(now)))}</div>
      </header>

      <main className="tv-main">
        <section>
          <h2 className="tv-h">Now on court · first to {s.target}</h2>
          <div className="tv-courts">
            {s.matchIds.map((id) => {
              const m = d.matches[id];
              return (
                <div key={id} className={`tv-court ${m.result ? 'tv-court-done' : ''}`}>
                  <div className="tv-court-no">Court {m.match.court}</div>
                  <div className="tv-court-players">
                    <Side m={m} side="home" />
                    <span className="vs">v</span>
                    <Side m={m} side="away" />
                  </div>
                  <div className="tv-court-meta">
                    {m.result ? <Score m={m} big /> : <span>Judge: {name(m.judgeId)}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {d.next && (
            <>
              <h2 className="tv-h">Up next · {d.next.label}</h2>
              <ul className="tv-next">
                {d.next.matchIds.map((id) => {
                  const m = d.matches[id];
                  return (
                    <li key={id}>
                      <span className="tv-next-court">Court {m.match.court}</span>
                      <Side m={m} side="home" showHome={false} /> <span className="vs">v</span>{' '}
                      <Side m={m} side="away" showHome={false} />
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {resting.length > 0 && (
            <p className="tv-resting">
              <strong>Resting:</strong> {resting.map((id) => name(id)).join(' · ')}
            </p>
          )}
        </section>

        <section className="tv-ladder">
          <h2 className="tv-h">{showFf ? 'Final Four table' : 'Ladder'}</h2>
          {showFf ? (
            <StandingsTable rows={d.ffStandings} cut={2} cutLabel="Into the Final" compact />
          ) : (
            <StandingsTable rows={d.rrStandings} cut={4} cutLabel="Final Four" compact />
          )}
        </section>
      </main>
      <footer className="tv-foot">Winners: report your score at the scoring laptop straight after your match.</footer>
    </div>
  );
}
