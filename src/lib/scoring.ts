/**
 * Checks a final score against "first to `target`, win by 2".
 * Returns null when valid, otherwise a short reason.
 */
export function scoreProblem(home: number, away: number, target: number): string | null {
  if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
    return 'Scores must be whole numbers.';
  }
  if (home === away) return 'There are no draws: someone has to win by 2.';
  const win = Math.max(home, away);
  const lose = Math.min(home, away);
  if (win < target) return `The match isn't finished: it's first to ${target}.`;
  if (lose <= target - 2) {
    return win === target ? null : `The match ends as soon as someone reaches ${target}, so this should be ${target}–${lose}.`;
  }
  return win === lose + 2
    ? null
    : `From ${target - 1}–${target - 1} it's win by 2, so this should be ${lose + 2}–${lose}.`;
}

/** Quick-pick final scores as [winner points, loser points]. */
export function quickScores(target: number): { regular: [number, number][]; deuce: [number, number][] } {
  const regular: [number, number][] = [];
  for (let l = 0; l <= target - 2; l++) regular.push([target, l]);
  const deuce: [number, number][] = [];
  for (let l = target - 1; l <= target + 2; l++) deuce.push([l + 2, l]);
  return { regular, deuce };
}
