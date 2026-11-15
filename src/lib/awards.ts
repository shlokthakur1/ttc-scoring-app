import { MATCHES, SESSIONS, SESSION_BY_KEY, type PlayerId } from '../data/fixture';
import type { Derived, ResolvedMatch } from './tournament';

export interface Award {
  icon: string;
  title: string;
  winners: PlayerId[];
  detail: string;
  /** Still being decided: the tournament stage it depends on isn't over. */
  provisional: boolean;
}

type Name = (id: PlayerId | null) => string;

function played(d: Derived): ResolvedMatch[] {
  const order = new Map(SESSIONS.map((s) => [s.key, s.index]));
  return MATCHES.map((m) => d.matches[m.id])
    .filter((m) => m.result && m.homeId && m.awayId && !m.result.walkover)
    .sort((a, b) => order.get(a.match.sessionKey)! - order.get(b.match.sessionKey)! || a.match.court - b.match.court);
}

function scoreLine(m: ResolvedMatch, name: Name): string {
  const r = m.result!;
  const w = r.home > r.away;
  const hi = Math.max(r.home, r.away);
  const lo = Math.min(r.home, r.away);
  return `${name(w ? m.homeId : m.awayId)} ${hi}–${lo} ${name(w ? m.awayId : m.homeId)} (${SESSION_BY_KEY[m.match.sessionKey].shortLabel})`;
}

/**
 * Leaders in each category, used on the Awards page for the presentation.
 * Players in `exclude` can't win the fun awards (their matches still count
 * towards everyone else's numbers). The Round Robin Winner is the real ladder
 * result, so it ignores `exclude`.
 */
export function computeAwards(d: Derived, allPlayerIds: PlayerId[], name: Name, exclude: PlayerId[] = []): Award[] {
  const awards: Award[] = [];
  const all = played(d);
  if (!all.length) return awards;
  const out = new Set(exclude);
  const playerIds = allPlayerIds.filter((id) => !out.has(id));
  const rows = d.rrStandings.filter((r) => !out.has(r.id));
  const rrOver = d.rrComplete;
  const allOver = !d.current;

  const top = <T,>(items: T[], value: (x: T) => number) => {
    const best = Math.max(...items.map(value));
    return { best, items: items.filter((x) => value(x) === best) };
  };

  // Round robin winner.
  const leader = d.rrStandings[0];
  if (leader.played) {
    awards.push({
      icon: '🥇',
      title: 'Round Robin Winner',
      winners: [leader.id],
      detail: `${leader.won}–${leader.lost}, ${leader.diff >= 0 ? '+' : ''}${leader.diff} points`,
      provisional: !rrOver,
    });
  }

  // Best point differential across the round robin.
  const diff = top(rows.filter((r) => r.played), (r) => r.diff);
  if (diff.items.length) awards.push({
    icon: '📈',
    title: 'Best Point Differential',
    winners: diff.items.map((r) => r.id),
    detail: `${diff.best >= 0 ? '+' : ''}${diff.best} in the round robin`,
    provisional: !rrOver,
  });

  // Most points won across the whole day.
  const pts: Record<PlayerId, number> = Object.fromEntries(allPlayerIds.map((id) => [id, 0]));
  for (const m of all) {
    pts[m.homeId!] += m.result!.home;
    pts[m.awayId!] += m.result!.away;
  }
  const mostPts = top(playerIds, (id) => pts[id]);
  if (mostPts.items.length) awards.push({
    icon: '💪',
    title: 'Most Points Won',
    winners: mostPts.items,
    detail: `${mostPts.best} points across the day`,
    provisional: !allOver,
  });

  // Biggest win: the latest of the widest margins (a finals thrashing beats an early one).
  const margin = (m: ResolvedMatch) => Math.abs(m.result!.home - m.result!.away);
  const biggest = top(all.filter((m) => !out.has(m.winnerId!)), margin);
  const headline = biggest.items[biggest.items.length - 1];
  const others = biggest.items.length - 1;
  if (headline) awards.push({
    icon: '💥',
    title: 'Biggest Win',
    winners: [headline.winnerId!],
    detail: `${scoreLine(headline, name)}${others ? ` · +${others} more by ${biggest.best}` : ''}`,
    provisional: !allOver,
  });

  // Bagels.
  const bagels: Record<PlayerId, number> = {};
  for (const m of all) {
    if (Math.min(m.result!.home, m.result!.away) === 0) bagels[m.winnerId!] = (bagels[m.winnerId!] ?? 0) + 1;
  }
  const baker = Object.keys(bagels).filter((id) => !out.has(id));
  if (baker.length) {
    const most = top(baker, (id) => bagels[id]);
    awards.push({
      icon: '🥯',
      title: 'Bagel Baker',
      winners: most.items,
      detail: `${most.best} win${most.best > 1 ? 's' : ''} to love`,
      provisional: !allOver,
    });
  }

  // Epic match: the longest deuce battle.
  const total = (m: ResolvedMatch) => m.result!.home + m.result!.away;
  const epic = top(all.filter((m) => !out.has(m.homeId!) && !out.has(m.awayId!)), total);
  const epicMatch = epic.items[epic.items.length - 1];
  if (epicMatch && Math.min(epicMatch.result!.home, epicMatch.result!.away) >= epicMatch.match.target - 1) {
    awards.push({
      icon: '⚔️',
      title: 'Match of the Day',
      winners: [epicMatch.homeId!, epicMatch.awayId!],
      detail: `${scoreLine(epicMatch, name)}: ${total(epicMatch)} points`,
      provisional: !allOver,
    });
  }

  // Longest winning streak (all stages, in draw order).
  const streak: Record<PlayerId, { cur: number; best: number }> = Object.fromEntries(
    allPlayerIds.map((id) => [id, { cur: 0, best: 0 }]),
  );
  for (const m of all) {
    streak[m.winnerId!].cur++;
    streak[m.winnerId!].best = Math.max(streak[m.winnerId!].best, streak[m.winnerId!].cur);
    streak[m.loserId!].cur = 0;
  }
  const longest = top(playerIds, (id) => streak[id].best);
  if (longest.best >= 3) {
    awards.push({
      icon: '🔥',
      title: 'Longest Win Streak',
      winners: longest.items,
      detail: `${longest.best} wins in a row`,
      provisional: !allOver,
    });
  }

  // Stingiest defence: fewest points conceded per round robin match.
  const eligible = rows.filter((r) => r.played >= 3);
  if (eligible.length) {
    const wall = top(eligible, (r) => -r.pa / r.played);
    awards.push({
      icon: '🧱',
      title: 'Brick Wall',
      winners: wall.items.map((r) => r.id),
      detail: `${(-wall.best).toFixed(1)} points conceded per match (round robin)`,
      provisional: !rrOver,
    });
  }

  return awards;
}
