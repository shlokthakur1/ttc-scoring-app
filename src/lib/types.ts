import type { Player, PlayerId } from '../data/fixture';

export interface MatchResult {
  home: number;
  away: number;
  /** Awarded without a full match (injury, no-show). */
  walkover?: boolean;
  /** When the score was entered (epoch ms). */
  at: number;
}

export interface SessionTime {
  start?: number;
  end?: number;
  /** Started automatically when the previous round finished. */
  autoStarted?: boolean;
}

export interface LogEntry {
  at: number;
  text: string;
}

export interface TournamentState {
  version: 1;
  players: Player[];
  results: Record<number, MatchResult>;
  sessionTimes: Record<string, SessionTime>;
  /** Admin overrides of the auto-assigned line judge, per match. */
  lineJudges: Record<number, PlayerId>;
  /** Admin overrides for Q1–Q4 / F1–F4 (e.g. after a coin toss or withdrawal). */
  seedOverrides: { rr: PlayerId[] | null; ff: PlayerId[] | null };
  log: LogEntry[];
}
