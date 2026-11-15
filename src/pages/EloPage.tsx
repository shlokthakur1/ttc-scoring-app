import { SESSION_BY_KEY } from '../data/fixture';
import { computeElo, ELO_K, ELO_START, type EloMatch } from '../lib/elo';
import { Card } from '../components/ui';
import { useStore } from '../store';

const signed = (n: number, digits = 0) => {
  const v = n.toFixed(digits);
  if (Number(v) === 0) return (0).toFixed(digits);
  return Number(v) > 0 ? `+${v}` : v.replace('-', '−');
};
const cls = (n: number) => (Math.round(n) > 0 ? 'pos-diff' : Math.round(n) < 0 ? 'neg-diff' : '');

/** Rating after each round, against the 1000 starting line. */
function Trend({ history, lo, hi }: { history: number[]; lo: number; hi: number }) {
  const w = 120;
  const h = 28;
  const span = Math.max(1, hi - lo);
  const y = (v: number) => 2 + (h - 4) * (1 - (v - lo) / span);
  const x = (i: number) => (history.length > 1 ? (i / (history.length - 1)) * w : 0);
  const last = history[history.length - 1];
  return (
    <svg className="elo-trend" width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Rating over the day, now ${Math.round(last)}`}>
      <line x1={0} x2={w} y1={y(ELO_START)} y2={y(ELO_START)} className="elo-trend-base" />
      <polyline points={history.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')} className="elo-trend-line" />
    </svg>
  );
}

export function EloPage() {
  const { state, d, name } = useStore();
  const elo = computeElo(d, state.players.map((p) => p.id));
  const all = elo.rows.flatMap((r) => r.history);
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const started = elo.matches.length > 0;

  const matchup = (e: EloMatch) => (
    <>
      {name(e.m.homeId)} <span className="muted">({Math.round(e.homeBefore)})</span> v {name(e.m.awayId)}{' '}
      <span className="muted">({Math.round(e.awayBefore)})</span>
    </>
  );
  const expectedText = (e: EloMatch) => {
    const homeFav = e.expected >= 0.5;
    const chance = Math.round(100 * (homeFav ? e.homeWinChance : 1 - e.homeWinChance));
    if (Math.abs(e.expected - 0.5) < 0.005) return `${e.predicted[0]}–${e.predicted[1]} either way (50/50)`;
    return `${name(homeFav ? e.m.homeId : e.m.awayId)} ${Math.max(...e.predicted)}–${Math.min(...e.predicted)} (${chance}% to win)`;
  };
  const label = (e: EloMatch) => `${SESSION_BY_KEY[e.m.match.sessionKey].shortLabel} · C${e.m.match.court}`;

  // Results furthest from what the ratings said beforehand.
  const surprises = [...elo.matches].sort((a, b) => Math.abs(b.surprise!) - Math.abs(a.surprise!)).slice(0, 6);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Elo ratings</h1>
        <span className="muted">
          Form guide from today’s scores · {elo.matches.length} match{elo.matches.length === 1 ? '' : 'es'} counted
        </span>
      </div>

      <Card>
        <table className="ladder elo-table">
          <thead>
            <tr>
              <th className="num">#</th>
              <th>Player</th>
              <th className="num" title="Rating now (everyone starts on 1000)">Elo</th>
              <th className="num" title="Change since the start of the day">+/−</th>
              <th className="num" title="Matches counted">P</th>
              <th className="num" title="Won–lost">W–L</th>
              <th className="num" title="Points won above or below what the ratings predicted">Pts v exp.</th>
              <th className="num" title="Highest rating of the day">Peak</th>
              <th className="num" title="Change from their latest match">Last</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {elo.rows.map((r, i) => (
              <tr key={r.id}>
                <td className="num pos">{started ? i + 1 : '–'}</td>
                <td className="player">
                  <span className="pname">{name(r.id)}</span>
                </td>
                <td className="num strong elo-rating">{Math.round(r.rating)}</td>
                <td className={`num ${cls(r.rating - ELO_START)}`}>{signed(r.rating - ELO_START)}</td>
                <td className="num">{r.played}</td>
                <td className="num">
                  {r.won}–{r.played - r.won}
                </td>
                <td className={`num ${cls(r.pointsVsExpected)}`}>{signed(r.pointsVsExpected)}</td>
                <td className="num">{Math.round(r.peak)}</td>
                <td className={`num ${cls(r.lastDelta)}`}>{r.played ? signed(r.lastDelta) : '–'}</td>
                <td>
                  <Trend history={r.history} lo={lo} hi={hi} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small legend">
          Everyone starts on {ELO_START}. Before each match the two ratings give an expected score; afterwards both players
          move by how far the real score was from it, so a 7–0 counts for more than a 9–7 and an upset counts for more than a
          routine win. <strong>Pts v exp.</strong> is the points a player won above (+) or below (−) those expectations.
          The dotted line on the trend is {ELO_START}. With only a dozen or so matches each, read it as today’s form, not a
          precise number.
        </p>
      </Card>

      {elo.upcoming.length > 0 && (
        <Card title={`Predictions · ${d.current!.label}`}>
          <table className="ladder elo-matches">
            <thead>
              <tr>
                <th>Court</th>
                <th>Matchup (rating)</th>
                <th>Expected</th>
              </tr>
            </thead>
            <tbody>
              {elo.upcoming.map((e) => (
                <tr key={e.m.match.id}>
                  <td>Court {e.m.match.court}</td>
                  <td>{matchup(e)}</td>
                  <td>{expectedText(e)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {started && (
        <Card title="Biggest surprises" actions={<span className="muted small">furthest from the expected score</span>}>
          <ResultsTable rows={surprises} matchup={matchup} expectedText={expectedText} label={label} name={name} />
        </Card>
      )}

      {started && (
        <Card title="Every match" actions={<span className="muted small">in playing order · ratings shown are before the match</span>}>
          <ResultsTable rows={elo.matches} matchup={matchup} expectedText={expectedText} label={label} name={name} />
        </Card>
      )}

      {!started && <Card>Ratings start moving once the first score is in.</Card>}

      <p className="muted small">
        The maths: expected share of points = 1 / (1 + 10^((opponent − player) / 400)); rating change = {ELO_K} × (actual
        share − expected share). Walkovers aren’t counted. This is for fun and has no effect on the ladder or seeding.
      </p>
    </div>
  );
}

function ResultsTable({
  rows,
  matchup,
  expectedText,
  label,
  name,
}: {
  rows: EloMatch[];
  matchup: (e: EloMatch) => React.ReactNode;
  expectedText: (e: EloMatch) => string;
  label: (e: EloMatch) => string;
  name: (id: string | null) => string;
}) {
  return (
    <div className="table-scroll">
      <table className="ladder elo-matches">
        <thead>
          <tr>
            <th>Round</th>
            <th>Matchup (rating before)</th>
            <th>Expected</th>
            <th>Actual</th>
            <th className="num">Rating change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => {
            const r = e.m.result!;
            const delta = e.delta!;
            const upset = (e.expected - 0.5) * (r.home - r.away) < 0;
            return (
              <tr key={e.m.match.id}>
                <td className="nowrap">{label(e)}</td>
                <td>{matchup(e)}</td>
                <td>{expectedText(e)}</td>
                <td className="nowrap">
                  <strong>
                    {name(e.m.winnerId)} {Math.max(r.home, r.away)}–{Math.min(r.home, r.away)}
                  </strong>
                  {upset && <span className="tag tag-warn">upset</span>}
                </td>
                <td className="num nowrap">
                  {name(e.m.homeId)} <span className={cls(delta)}>{signed(delta)}</span> · {name(e.m.awayId)}{' '}
                  <span className={cls(-delta)}>{signed(-delta)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
