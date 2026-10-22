import { MATCHES, SESSION_BY_KEY, TOURNAMENT, type PlayerId, type Session } from '../data/fixture';
import type { StandingRow } from './standings';
import type { Derived } from './tournament';
import type { TournamentState } from './types';

type Name = (id: PlayerId | null) => string;

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Plain-text ladder for pasting into the group chat. */
export function ladderText(rows: StandingRow[], name: Name, heading: string, cut: number): string {
  const lines = [`🎾 ${TOURNAMENT.name} ${TOURNAMENT.year} · ${heading}`, ''];
  rows.forEach((r, i) => {
    if (cut && i === cut) lines.push(`— — — top ${cut} — — —`);
    const tag = r.status === 'clinched' ? ' ✅' : '';
    lines.push(`${r.rank}${r.tiedWith.length ? '=' : '.'} ${name(r.id)}  ${r.won}–${r.lost}  (${signed(r.diff)})${tag}`);
  });
  return lines.join('\n');
}

/** Results of one session, plus who's on next. */
export function sessionText(d: Derived, session: Session, name: Name, next: Session | null): string {
  const lines = [`🎾 ${session.label} results`];
  for (const id of session.matchIds) {
    const m = d.matches[id];
    const r = m.result;
    lines.push(
      r
        ? `Court ${m.match.court}: ${name(m.homeId)} ${r.home}–${r.away} ${name(m.awayId)}${r.walkover ? ' (W/O)' : ''}`
        : `Court ${m.match.court}: ${name(m.homeId)} vs ${name(m.awayId)} (in progress)`,
    );
  }
  if (next) {
    lines.push('', `Up next: ${next.label}`);
    for (const id of next.matchIds) {
      const m = d.matches[id];
      lines.push(`Court ${m.match.court}: ${name(m.homeId)} vs ${name(m.awayId)}`);
    }
  }
  return lines.join('\n');
}

export function resultsCsv(state: TournamentState, d: Derived, name: Name): string {
  const rows = [['Match', 'Stage', 'Round', 'Court', 'Home', 'Away', 'Home score', 'Away score', 'Winner', 'Walkover', 'Line judge']];
  for (const m of MATCHES) {
    const rm = d.matches[m.id];
    const r = state.results[m.id];
    const s = SESSION_BY_KEY[m.sessionKey];
    rows.push([
      String(m.id),
      s.stage,
      s.label,
      String(m.court),
      name(rm.homeId),
      name(rm.awayId),
      r ? String(r.home) : '',
      r ? String(r.away) : '',
      rm.winnerId ? name(rm.winnerId) : '',
      r?.walkover ? 'yes' : '',
      rm.judgeId ? name(rm.judgeId) : '',
    ]);
  }
  return rows.map((row) => row.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n');
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export function download(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
