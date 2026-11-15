import { useEffect } from 'react';
import { REHEARSAL } from './lib/storage';
import { AdminPage } from './pages/AdminPage';
import { AwardsPage } from './pages/AwardsPage';
import { CourtsPage } from './pages/CourtsPage';
import { EloPage } from './pages/EloPage';
import { FinalsPage } from './pages/FinalsPage';
import { FixturesPage } from './pages/FixturesPage';
import { LadderPage } from './pages/LadderPage';
import { PlayersPage } from './pages/PlayersPage';
import { RulesPage } from './pages/RulesPage';
import { TvPage } from './pages/TvPage';
import { useHashRoute, useStore } from './store';

const PAGES = [
  { path: 'courts', label: 'Courts', component: CourtsPage },
  { path: 'ladder', label: 'Ladder', component: LadderPage },
  { path: 'elo', label: 'Elo', component: EloPage },
  { path: 'fixtures', label: 'Fixtures', component: FixturesPage },
  { path: 'players', label: 'Players', component: PlayersPage },
  { path: 'finals', label: 'Finals', component: FinalsPage },
  { path: 'awards', label: 'Awards', component: AwardsPage },
  { path: 'rules', label: 'Rules', component: RulesPage },
  { path: 'admin', label: 'Admin', component: AdminPage },
] as const;

export function App() {
  const [route] = useHashRoute();
  const { d, saveFailed, published } = useStore();

  useEffect(() => {
    document.title = `${REHEARSAL ? '[Rehearsal] ' : ''}${route === 'tv' ? 'TV · ' : ''}Tennis Tuesdays Cup 2026`;
  }, [route]);

  if (route === 'tv') {
    return (
      <>
        {REHEARSAL && <div className="rehearsal-banner">Rehearsal</div>}
        <TvPage />
      </>
    );
  }

  const page = PAGES.find((p) => p.path === route) ?? PAGES[0];
  const Page = page.component;

  return (
    <div className="app">
      {REHEARSAL && (
        <div className="rehearsal-banner">
          Rehearsal mode: practice data only, kept separate from the real tournament. <a href={location.pathname}>Exit</a>
        </div>
      )}
      {published && (
        <div className="published-banner">
          Results from the day, as published from the scoring laptop. Changes made here stay on this device only.
        </div>
      )}
      {saveFailed && (
        <div className="save-banner">
          This browser isn’t saving changes (private window or storage full?). Export a backup from Admin now.
        </div>
      )}
      <header className="topbar">
        <a className="brand" href="#/courts">
          <span className="brand-ball" aria-hidden />
          <span className="brand-text">
            Tennis Tuesdays Cup <span className="brand-year">2026</span>
          </span>
        </a>
        <nav className="nav" aria-label="Sections">
          {PAGES.map((p) => (
            <a key={p.path} href={`#/${p.path}`} className={p === page ? 'active' : ''} aria-current={p === page ? 'page' : undefined}>
              {p.label}
              {p.path === 'courts' && d.current && <span className="nav-pill">{d.current.shortLabel}</span>}
            </a>
          ))}
        </nav>
        <a className="btn btn-tv" href={`${location.search}#/tv`} target="ttc-tv" title="Open the big-screen view in a new window (drag it to the TV)">
          📺 TV display
        </a>
      </header>
      <main className="main">
        <Page />
      </main>
    </div>
  );
}
