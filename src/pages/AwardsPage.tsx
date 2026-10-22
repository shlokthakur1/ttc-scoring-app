import { useRef } from 'react';
import { TOURNAMENT } from '../data/fixture';
import { computeAwards } from '../lib/awards';
import { Card } from '../components/ui';
import { useStore } from '../store';

export function Podium() {
  const { d, name } = useStore();
  const { champion, runnerUp, third } = d.podium;
  return (
    <div className="podium" aria-label="Podium">
      <div className="podium-step podium-2">
        <div className="podium-medal">🥈</div>
        <div className="podium-name">{runnerUp ? name(runnerUp) : 'TBD'}</div>
        <div className="podium-block">#2</div>
      </div>
      <div className="podium-step podium-1">
        <div className="podium-medal">🏆</div>
        <div className="podium-name">{champion ? name(champion) : 'TBD'}</div>
        <div className="podium-block">#1</div>
      </div>
      <div className="podium-step podium-3">
        <div className="podium-medal">🥉</div>
        <div className="podium-name">{third ? name(third) : 'TBD'}</div>
        <div className="podium-block">#3</div>
      </div>
    </div>
  );
}

export function AwardsPage() {
  const { state, d, name } = useStore();
  const awards = computeAwards(d, state.players.map((p) => p.id), name);
  const stage = useRef<HTMLDivElement>(null);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Presentation</h1>
        <button
          className="btn btn-ghost"
          onClick={() => stage.current?.requestFullscreen?.().catch(() => {})}
          title="Show the podium and awards full screen"
        >
          ⛶ Full screen
        </button>
      </div>

      <div ref={stage} className="presentation">
        <div className="presentation-head">
          <div className="eyebrow">There can only be one</div>
          <h2>
            {TOURNAMENT.name} {TOURNAMENT.year}
          </h2>
        </div>
        <Podium />
        {!d.podium.champion && (
          <p className="muted center">The podium fills in as the Third Place Playoff and The Final are scored.</p>
        )}

        <div className="awards-grid">
          {awards.map((a) => (
            <div key={a.title} className="award">
              <div className="award-icon" aria-hidden>
                {a.icon}
              </div>
              <div className="award-title">
                {a.title}
                {a.provisional && <span className="tag">leader so far</span>}
              </div>
              <div className="award-winner">{a.winners.map((id) => name(id)).join(' & ')}</div>
              <div className="award-detail">{a.detail}</div>
            </div>
          ))}
        </div>
        {!awards.length && <Card>Awards appear once scores start coming in.</Card>}
      </div>
    </div>
  );
}
