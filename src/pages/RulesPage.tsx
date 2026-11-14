import { DAY_PLAN, DEFAULT_PLAYERS, RR_SESSIONS, TOURNAMENT } from '../data/fixture';
import { formatClock } from '../lib/schedule';
import { Card } from '../components/ui';

export function RulesPage() {
  return (
    <div className="page rules">
      <div className="page-head">
        <h1>Rules &amp; format</h1>
        <span className="muted">
          {TOURNAMENT.date} · {TOURNAMENT.venue}
        </span>
      </div>

      <div className="two-col">
        <Card title="Match format">
          <p>
            <strong>Round robin:</strong> first to 7 points, win by 2.
            <br />
            <strong>Final Four + podium matches:</strong> first to 11 points, win by 2.
            <br />
            Every rally = one point.
          </p>
        </Card>
        <Card title="Starting the point">
          <p>
            Each fixture designates a <strong>Home</strong> player (listed first, marked <span className="tag tag-home">H</span>
            ). The Home player chooses <strong>FEED</strong> or <strong>RECEIVE</strong> first. Players alternate every point
            thereafter.
          </p>
          <p>
            The ball must be fed by the Feeder, with the first bounce in the <strong>back half of the court</strong>. It’s the
            Receiver’s right to call a replay if the feed is incorrect or too wide. The Feeder is allowed{' '}
            <strong>one fault per point</strong>. An incorrect feed is considered a fault.
          </p>
        </Card>
        <Card title="Line calls">
          <p>Players call their own side.</p>
          <p>
            Every court has one player (with a bye that round) providing a second opinion in case of any dispute. In this
            scenario, <strong>their call is final</strong>. The app assigns these line judges automatically and evenly.
          </p>
        </Card>
        <Card title="Scoring">
          <p>Both players are responsible for knowing the score.</p>
          <p>The winner reports the final score immediately after the match, at the scoring laptop.</p>
        </Card>
        <Card title="Rest & rounds">
          <p>Each round has 3 matches; the remaining 6 players have byes.</p>
          <p>Once all matches in the round are completed, the next round begins immediately.</p>
        </Card>
        <Card title="Round robin standings">
          <ol>
            <li>Match wins</li>
            <li>Point differential</li>
            <li>Head-to-head</li>
            <li>Points won</li>
          </ol>
          <p className="muted small">
            {DEFAULT_PLAYERS.length} players, everyone plays everyone once ({DEFAULT_PLAYERS.length - 1} matches each over{' '}
            {RR_SESSIONS.length} rounds). Top 4 advance to the Final Four. Each of the Final Four plays the others once (fresh standings); the top 2 play The
            Final, the bottom 2 play the Third Place Playoff.
          </p>
        </Card>
      </div>

      <Card title="The day">
        <ol className="timeline">
          {DAY_PLAN.map((e) => (
            <li key={e.time}>
              <span className="tl-time">{formatClock(e.time)}</span>
              <span className="tl-title">{e.title}</span>
              {e.detail && <span className="tl-detail">{e.detail}</span>}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
