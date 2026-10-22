import { useState } from 'react';
import { SESSION_BY_KEY, type PlayerId } from '../data/fixture';
import { copyText, ladderText } from '../lib/share';
import { nextMatchFor } from '../lib/tournament';
import { H2HGrid } from '../components/H2HGrid';
import { Card, StandingsTable } from '../components/ui';
import { useStore, useToast } from '../store';

export function LadderPage() {
  const { d, name } = useStore();
  const toast = useToast();
  const [view, setView] = useState<'rr' | 'ff'>(d.rrComplete && d.rrSeeds.final ? 'ff' : 'rr');
  const ff = view === 'ff';
  const rows = ff ? d.ffStandings : d.rrStandings;

  const nextFor = (id: PlayerId) => {
    const m = nextMatchFor(d, id);
    if (!m || (ff ? m.match.stage === 'rr' : m.match.stage !== 'rr')) return <span className="muted">done</span>;
    const opp = m.homeId === id ? m.awayId : m.homeId;
    const s = SESSION_BY_KEY[m.match.sessionKey];
    const isNow = d.current?.key === s.key;
    return (
      <span className={isNow ? 'now' : ''}>
        {isNow ? 'Now' : s.shortLabel} · C{m.match.court} v {name(opp)}
      </span>
    );
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>Ladder</h1>
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={!ff} className={!ff ? 'on' : ''} onClick={() => setView('rr')}>
            Round robin
          </button>
          <button
            role="tab"
            aria-selected={ff}
            className={ff ? 'on' : ''}
            onClick={() => setView('ff')}
            disabled={!d.rrSeeds.final}
            title={d.rrSeeds.final ? '' : 'Available once the Final Four is set'}
          >
            Final Four
          </button>
        </div>
        <button
          className="btn btn-ghost"
          onClick={async () => {
            const heading = ff
              ? 'Final Four table'
              : d.rrComplete
                ? 'Final round robin ladder'
                : `Ladder after ${d.current ? SESSION_BY_KEY[d.current.key].label.toLowerCase() : 'the round robin'}`;
            const ok = await copyText(ladderText(rows, name, heading, ff ? 2 : 4));
            toast(ok ? 'Ladder copied, ready to paste in the group chat' : "Couldn't copy");
          }}
        >
          Copy for group chat
        </button>
      </div>

      <Card>
        <StandingsTable rows={rows} cut={ff ? 2 : 4} cutLabel={ff ? 'Into the Final' : 'Final Four'} nextFor={nextFor} />
        <p className="muted small legend">
          Order: <strong>1. match wins</strong> → 2. point differential → 3. head-to-head → 4. points won.{' '}
          “on +/−”, “on H2H” or “on pts” shows which tiebreaker split two players on the same wins.{' '}
          <span className="tag tag-q">Q</span> = mathematically through, <span className="tag tag-out">out</span> = can
          no longer make the top {ff ? 2 : 4}.{ff ? ' Fresh standings: round robin results don’t carry over.' : ''}
        </p>
      </Card>

      {!ff && (
        <Card title="Head to head" actions={<span className="muted small">row player’s score first · R# = still to play</span>}>
          <H2HGrid />
        </Card>
      )}
    </div>
  );
}
