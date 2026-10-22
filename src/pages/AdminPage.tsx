import { useRef, useState } from 'react';
import { RR_SESSIONS, SESSIONS } from '../data/fixture';
import { simulateSessions } from '../lib/demo';
import { initialState } from '../lib/reducer';
import { formatTime } from '../lib/schedule';
import { download, resultsCsv } from '../lib/share';
import { loadBackup, parseState, REHEARSAL, saveBackup } from '../lib/storage';
import { Card } from '../components/ui';
import { useStore, useToast } from '../store';

export function AdminPage() {
  const { state, d, dispatch, name, saveFailed } = useStore();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState(loadBackup);
  const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

  const replace = (next: typeof state, reason: string) => {
    saveBackup(state);
    setBackup(loadBackup());
    dispatch({ type: 'replace', state: next, reason });
  };

  const rrLeft = RR_SESSIONS.filter((s) => d.sessionStatus[s.key] !== 'done').length;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Admin</h1>
        <span className={`tag ${saveFailed ? 'tag-warn' : 'tag-done'}`}>
          {saveFailed ? 'Not saving: export a backup now' : 'Saved automatically in this browser'}
        </span>
      </div>

      <div className="two-col">
        <Card title="Backup & export">
          <p className="muted small">
            Scores live in this browser on this laptop. Export a backup now and then (e.g. at the break) so a closed tab or
            a different laptop is no problem.
          </p>
          <div className="row-actions">
            <button
              className="btn"
              onClick={() => download(`ttc-2026-backup-${stamp()}.json`, JSON.stringify(state, null, 2), 'application/json')}
            >
              ⬇ Export backup (.json)
            </button>
            <button className="btn btn-ghost" onClick={() => fileInput.current?.click()}>
              ⬆ Import backup
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => download(`ttc-2026-results-${stamp()}.csv`, resultsCsv(state, d, name), 'text/csv')}
            >
              Results spreadsheet (.csv)
            </button>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              try {
                const parsed = parseState(JSON.parse(await file.text()));
                if (!parsed) throw new Error('bad');
                const n = Object.keys(parsed.results).length;
                if (!confirm(`Replace everything here with "${file.name}" (${n} scores)? The current data is kept as a restore point.`)) return;
                replace(parsed, `Imported backup ${file.name} (${n} scores)`);
                toast('Backup imported');
              } catch {
                toast("That file isn't a Tennis Tuesdays Cup backup");
              }
            }}
          />
          {backup && (
            <p className="small">
              Restore point from {formatTime(backup.savedAt)} ({Object.keys(backup.state.results).length} scores).{' '}
              <button
                className="link-btn"
                onClick={() => {
                  if (!confirm('Go back to the restore point? What is here now becomes the new restore point.')) return;
                  replace(backup.state, 'Restored the data from before the last reset/import');
                  toast('Restored');
                }}
              >
                Restore it
              </button>
            </p>
          )}
        </Card>

        <Card title="Offline copy">
          <p className="muted small">
            The whole app is one file. Keep a copy on the laptop and it opens without internet (double-click it). Note: a
            copy opened from disk keeps its own scores, so move them across with Export / Import backup.
          </p>
          {location.protocol.startsWith('http') ? (
            <button
              className="btn btn-ghost"
              onClick={async () => {
                try {
                  const html = await (await fetch(location.pathname, { cache: 'no-store' })).text();
                  download('tennis-tuesdays-cup-2026.html', html, 'text/html');
                } catch {
                  toast("Couldn't download: try Ctrl+S instead");
                }
              }}
            >
              ⬇ Download the app (.html)
            </button>
          ) : (
            <p className="small">You’re already running an offline copy.</p>
          )}
        </Card>

        <Card title="Player names">
          <p className="muted small">Fix a spelling or use full names for the presentation. Scores are unaffected.</p>
          <div className="rename-grid">
            {state.players.map((p) => (
              <input
                key={`${p.id}:${p.name}`}
                defaultValue={p.name}
                aria-label={`Name for ${p.name}`}
                onBlur={(e) => dispatch({ type: 'rename', id: p.id, name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              />
            ))}
          </div>
        </Card>

        <Card title={REHEARSAL ? 'Rehearsal tools' : 'Rehearsal mode'}>
          {REHEARSAL ? (
            <>
              <p className="muted small">Fill in made-up scores to see how the day plays out. Real tournament data is untouched.</p>
              <div className="row-actions">
                <button className="btn" disabled={!d.current} onClick={() => replace(simulateSessions(state, 1), 'Rehearsal: simulated a round')}>
                  Simulate next round
                </button>
                <button
                  className="btn btn-ghost"
                  disabled={!rrLeft}
                  onClick={() => replace(simulateSessions(state, rrLeft), 'Rehearsal: simulated the round robin')}
                >
                  Finish round robin
                </button>
                <button
                  className="btn btn-ghost"
                  disabled={!d.current}
                  onClick={() => replace(simulateSessions(state, SESSIONS.length), 'Rehearsal: simulated everything')}
                >
                  Finish everything
                </button>
                <button className="btn btn-ghost" onClick={() => replace(initialState(state.players), 'Rehearsal: cleared')}>
                  Clear rehearsal
                </button>
              </div>
              <p className="small">
                <a href={location.pathname}>Leave rehearsal mode →</a>
              </p>
            </>
          ) : (
            <>
              <p className="muted small">
                Practise before the day with a separate copy of the app. Nothing you do there touches the real scores.
              </p>
              <a className="btn btn-ghost" href="?rehearsal#/courts" target="_blank" rel="noopener">
                Open rehearsal in a new tab ↗
              </a>
            </>
          )}
        </Card>

        <Card title="Start over" className="danger-card">
          <p className="muted small">
            Clears every score, timer, line-judge change and seeding decision. Names are kept, and the current data is saved as
            a restore point.
          </p>
          <button
            className="btn btn-danger"
            onClick={() => {
              const typed = prompt('Type RESET to clear all scores');
              if (typed?.trim().toUpperCase() !== 'RESET') return;
              saveBackup(state);
              setBackup(loadBackup());
              dispatch({ type: 'reset' });
              toast('Tournament reset');
            }}
          >
            Reset tournament
          </button>
        </Card>
      </div>

      <Card title="Activity log" actions={<span className="muted small">{state.log.length} entries · newest first</span>}>
        {state.log.length ? (
          <ol className="log">
            {state.log.map((e, i) => (
              <li key={state.log.length - i}>
                <time>{formatTime(e.at)}</time> {e.text}
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">Every score, correction and change will be listed here, for settling any “that’s not what I said” moments.</p>
        )}
      </Card>
    </div>
  );
}
