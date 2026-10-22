import type { PlayerId, Stage } from '../data/fixture';

export interface JudgeSessionInput {
  stage: Stage;
  /** Match ids in court order. */
  matchIds: number[];
  /** Everyone on court this session, or null if not known yet. */
  playing: PlayerId[] | null;
}

/**
 * "Every court will have one player (with a bye that round) providing a
 * second opinion." Picks one resting player per court, spreading the duty
 * evenly (the round robin works out at exactly 5 each). Among equally-loaded
 * players it goes to whoever has the fewest byes left to do it in, then
 * prefers someone who isn't on court next round (so they can warm up) and
 * didn't just come off court. In the finals it prefers players who are
 * already out of the tournament.
 */
export function autoLineJudges(
  sessions: JudgeSessionInput[],
  playerIds: PlayerId[],
  finalists: PlayerId[] = [],
): Record<number, PlayerId | null> {
  const duties: Record<PlayerId, number> = Object.fromEntries(playerIds.map((id) => [id, 0]));
  const out: Record<number, PlayerId | null> = {};

  sessions.forEach((s, i) => {
    if (!s.playing) {
      for (const id of s.matchIds) out[id] = null;
      return;
    }
    const playing = new Set(s.playing);
    const prev = new Set(sessions[i - 1]?.playing ?? []);
    const next = new Set(sessions[i + 1]?.playing ?? []);
    const finalistSet = new Set(s.stage === 'rr' ? [] : finalists);
    const used = new Set<PlayerId>();
    const sameGroup = (x: JudgeSessionInput) => (x.stage === 'rr') === (s.stage === 'rr');
    const later = sessions.slice(i).filter(sameGroup);
    const byesLeft = (id: PlayerId) => later.filter((x) => x.playing && !x.playing.includes(id)).length;

    for (const matchId of s.matchIds) {
      const candidates = playerIds.filter((id) => !playing.has(id) && !used.has(id));
      if (!candidates.length) {
        out[matchId] = null;
        continue;
      }
      const key = (id: PlayerId) => [
        finalistSet.has(id) ? 1 : 0,
        duties[id],
        byesLeft(id),
        next.has(id) ? 1 : 0,
        prev.has(id) ? 1 : 0,
        playerIds.indexOf(id),
      ];
      candidates.sort((a, b) => {
        const ka = key(a);
        const kb = key(b);
        for (let k = 0; k < ka.length; k++) if (ka[k] !== kb[k]) return ka[k] - kb[k];
        return 0;
      });
      const pick = candidates[0];
      used.add(pick);
      duties[pick]++;
      out[matchId] = pick;
    }
  });
  return out;
}
