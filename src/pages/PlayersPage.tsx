import { MATCHES, SESSION_BY_KEY, type PlayerId } from '../data/fixture';
import { nextDutyFor, nextMatchFor, type ResolvedMatch } from '../lib/tournament';
import { useStore } from '../store';

function roundsAway(current: number | undefined, m: ResolvedMatch): string {
  const s = SESSION_BY_KEY[m.match.sessionKey];
  if (current === undefined) return '';
  const n = s.index - current;
  if (n <= 0) return 'now';
  if (n === 1) return 'next round';
  return `in ${n} rounds`;
}

export function PlayersPage() {
  const { state, d } = useStore();
  return (
    <div className="page">
      <div className="page-head">
        <h1>Players</h1>
        <span className="muted">Where everyone is, and when they’re on next.</span>
      </div>
      <div className="player-grid">
        {d.rrStandings.map((r) => (
          <PlayerCard key={r.id} id={r.id} />
        ))}
      </div>
      {!state.players.length && <p>No players.</p>}
    </div>
  );
}

function PlayerCard({ id }: { id: PlayerId }) {
  const { d, name } = useStore();
  const row = d.rrStandings.find((r) => r.id === id)!;
  const cur = d.current;
  const curMatches = cur ? cur.matchIds.map((mid) => d.matches[mid]) : [];
  const playingNow = curMatches.find((m) => !m.result && (m.homeId === id || m.awayId === id));
  const judgingNow = curMatches.find((m) => !m.result && m.judgeId === id);
  const next = nextMatchFor(d, id);
  const duty = nextDutyFor(d, id);
  const qualified = d.rrSeeds.ids.includes(id) && d.rrSeeds.final;

  const matches = MATCHES.map((m) => d.matches[m.id]).filter(
    (m) => !m.provisional && (m.homeId === id || m.awayId === id),
  );
  const played = matches.filter((m) => m.result);

  let status: { cls: string; text: string };
  if (playingNow) {
    const opp = playingNow.homeId === id ? playingNow.awayId : playingNow.homeId;
    status = { cls: 'st-playing', text: `On Court ${playingNow.match.court} vs ${name(opp)}` };
  } else if (judgingNow) {
    status = { cls: 'st-judging', text: `Line judge, Court ${judgingNow.match.court}` };
  } else if (!next) {
    status = { cls: 'st-done', text: d.podium.champion === id ? 'Champion 🏆' : 'All matches played' };
  } else {
    status = { cls: 'st-resting', text: 'Resting' };
  }

  return (
    <article className="pcard">
      <header className="pcard-head">
        <span className="pcard-rank">#{row.rank}</span>
        <h2>{name(id)}</h2>
        {qualified && <span className="tag tag-q">Final Four</span>}
        {d.podium.champion === id && <span className="tag tag-gold">Champion</span>}
      </header>
      <div className="pcard-stats">
        <span>
          <strong>
            {row.won}–{row.lost}
          </strong>{' '}
          W–L
        </span>
        <span>
          <strong>
            {row.diff > 0 ? '+' : ''}
            {row.diff}
          </strong>{' '}
          +/−
        </span>
        <span>
          <strong>{d.duties[id] ?? 0}</strong> judge duties
        </span>
      </div>
      <div className={`pcard-status ${status.cls}`}>{status.text}</div>
      <dl className="pcard-next">
        <dt>Next match</dt>
        <dd>
          {next ? (
            <>
              {SESSION_BY_KEY[next.match.sessionKey].shortLabel} · Court {next.match.court} vs{' '}
              <strong>{name(next.homeId === id ? next.awayId : next.homeId)}</strong>
              {next.homeId === id && <span className="tag tag-home">H</span>}{' '}
              <span className="muted">({roundsAway(cur?.index, next)})</span>
            </>
          ) : (
            <span className="muted">none scheduled</span>
          )}
        </dd>
        <dt>Next judging</dt>
        <dd>
          {duty ? (
            <>
              {SESSION_BY_KEY[duty.match.sessionKey].shortLabel} · Court {duty.match.court}{' '}
              <span className="muted">({roundsAway(cur?.index, duty)})</span>
            </>
          ) : (
            <span className="muted">none</span>
          )}
        </dd>
      </dl>
      <details>
        <summary>
          Results ({played.length}/{matches.length})
        </summary>
        <ul className="pcard-results">
          {matches.map((m) => {
            const isHome = m.homeId === id;
            const opp = isHome ? m.awayId : m.homeId;
            const s = SESSION_BY_KEY[m.match.sessionKey];
            if (!m.result)
              return (
                <li key={m.match.id} className="muted">
                  <span className="pr-round">{s.shortLabel}</span> vs {name(opp)} · Court {m.match.court}
                </li>
              );
            const mine = isHome ? m.result.home : m.result.away;
            const theirs = isHome ? m.result.away : m.result.home;
            const won = mine > theirs;
            return (
              <li key={m.match.id}>
                <span className="pr-round">{s.shortLabel}</span>
                <span className={`form-dot ${won ? 'form-w' : 'form-l'}`}>{won ? 'W' : 'L'}</span> {mine}–{theirs} vs {name(opp)}
                {m.result.walkover && <span className="tag tag-wo">W/O</span>}
              </li>
            );
          })}
        </ul>
      </details>
    </article>
  );
}
