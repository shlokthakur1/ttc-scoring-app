import { PRESENTATION_TIME, RR_SESSIONS, SESSIONS, type Session } from '../data/fixture';
import type { TournamentState } from './types';

export function minutesOfDay(ts: number): number {
  const d = new Date(ts);
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

export function formatClock(minutes: number): string {
  const total = Math.round(minutes);
  const h24 = Math.floor(total / 60) % 24;
  const m = total % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function formatTime(ts: number): string {
  return formatClock(minutesOfDay(ts));
}

export const RR_PLANNED_END =RR_SESSIONS[RR_SESSIONS.length - 1].plannedStart + RR_SESSIONS[RR_SESSIONS.length - 1].plannedMinutes;

export interface ScheduleStatus {
  session: Session | null;
  startedAt: number | null;
  elapsedMs: number;
  /** Projected minutes behind plan (negative = ahead). */
  slip: number;
  projectedRrEnd: number | null;
  projectedPresentation: number;
  /** Average length of finished round robin rounds, in minutes. */
  avgRrRound: number | null;
  plannedRrRound: number;
  /** Minutes the plan was shifted by (rehearsal mode follows the actual start). */
  offset: number;
}

/**
 * Compares progress with "The Day" timetable. With `anchorToFirstStart` the
 * plan is shifted so Round 1 starts whenever it actually started (used for
 * rehearsals on other days and times).
 */
export function scheduleStatus(
  state: TournamentState,
  current: Session | null,
  now: number,
  anchorToFirstStart = false,
): ScheduleStatus {
  const plannedRrRound = RR_SESSIONS[0].plannedMinutes;
  const firstStart = state.sessionTimes[SESSIONS[0].key]?.start;
  const offset = anchorToFirstStart && firstStart ? minutesOfDay(firstStart) - SESSIONS[0].plannedStart : 0;

  const finishedRr = RR_SESSIONS.map((s) => state.sessionTimes[s.key]).filter(
    (t): t is { start: number; end: number } => Boolean(t?.start && t?.end),
  );
  const avgRrRound = finishedRr.length
    ? finishedRr.reduce((sum, t) => sum + (t.end - t.start) / 60000, 0) / finishedRr.length
    : null;

  if (!current) {
    return {
      session: null,
      startedAt: null,
      elapsedMs: 0,
      slip: 0,
      projectedRrEnd: null,
      projectedPresentation: PRESENTATION_TIME + offset,
      avgRrRound,
      plannedRrRound,
      offset,
    };
  }

  const startedAt = state.sessionTimes[current.key]?.start ?? null;
  const nowMin = minutesOfDay(now);
  const elapsedMs = startedAt ? now - startedAt : 0;
  const expectedLength = current.stage === 'rr' ? (avgRrRound ?? plannedRrRound) : current.plannedMinutes;
  const plannedStart = current.plannedStart + offset;

  const currentEnd = startedAt
    ? minutesOfDay(startedAt) + Math.max(expectedLength, elapsedMs / 60000)
    : Math.max(nowMin, plannedStart) + expectedLength;

  let slip = currentEnd - (plannedStart + current.plannedMinutes);
  let projectedRrEnd: number | null = null;
  if (current.stage === 'rr') {
    const roundsAfter = RR_SESSIONS.length - current.round;
    projectedRrEnd = currentEnd + roundsAfter * (avgRrRound ?? plannedRrRound);
    slip = projectedRrEnd - (RR_PLANNED_END + offset);
  }

  return {
    session: current,
    startedAt,
    elapsedMs,
    slip,
    projectedRrEnd,
    projectedPresentation: PRESENTATION_TIME + offset + Math.max(0, slip),
    avgRrRound,
    plannedRrRound,
    offset,
  };
}
