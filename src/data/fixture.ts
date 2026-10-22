// The official draw for the Tennis Tuesdays Cup 2026, transcribed from
// "Tennis Tuesday Cup 2026.pdf" (pages "The Fixture", "The Fixture (cont.)",
// "The Finals" and "The Day").

export type PlayerId = string;

export interface Player {
  id: PlayerId;
  name: string;
}

export type Stage = 'rr' | 'ff' | 'bronze' | 'final';

/** A fixture slot is either a named player or a placing from an earlier stage. */
export type SlotRef =
  | { kind: 'player'; id: PlayerId }
  /** Q1–Q4 = round robin placing, F1–F4 = Final Four placing. */
  | { kind: 'seed'; from: 'rr' | 'ff'; pos: 1 | 2 | 3 | 4 };

export interface Match {
  /** Match number as printed in the program (1–63). */
  id: number;
  sessionKey: string;
  stage: Stage;
  court: number;
  /** The first-named player is the Home player and picks FEED or RECEIVE. */
  home: SlotRef;
  away: SlotRef;
  /** Points needed to win (win by 2). */
  target: number;
}

export interface Session {
  key: string;
  index: number;
  stage: Stage;
  /** Round number within the stage. */
  round: number;
  label: string;
  shortLabel: string;
  matchIds: number[];
  target: number;
  /** Planned start, minutes after midnight on the day. */
  plannedStart: number;
  plannedMinutes: number;
  /**
   * Sessions that kick off by themselves the moment the previous one
   * finishes ("the next round begins immediately"). The others are started
   * by the admin, e.g. after the break before the Final Four.
   */
  autoStart: boolean;
}

export const TOURNAMENT = {
  name: 'Tennis Tuesdays Cup',
  year: 2026,
  date: 'Saturday, 31 October 2026',
  venue: 'Eildon Park Tennis Club, Rowville',
  courts: 3,
  rrTarget: 7,
  finalsTarget: 11,
  qualifiers: 4,
} as const;

const hm = (h: number, m: number) => h * 60 + m;

export const DAY_PLAN = [
  { time: hm(9, 30), title: 'Arrival & warm-up', detail: '' },
  { time: hm(10, 0), title: 'Round robin begins', detail: '19 rounds. 3 courts. 55 matches. Race to 7.' },
  { time: hm(12, 20), title: 'Round robin ends', detail: 'Final standings confirmed. Top 4 advance. Short break.' },
  { time: hm(12, 30), title: 'The Final Four', detail: 'Six matches. Fresh standings. Race to 11.' },
  { time: hm(13, 5), title: 'Third-place playoff', detail: '#3 vs #4.' },
  { time: hm(13, 15), title: 'The Final', detail: '#1 vs #2. Winner takes all.' },
  { time: hm(13, 25), title: 'Presentation', detail: 'Champion crowned. Courts vacated by 1:30 PM.' },
] as const;

export const COURTS_VACATED_BY = hm(13, 30);

export const DEFAULT_PLAYERS: Player[] = [
  { id: 'abhi', name: 'Abhi' },
  { id: 'abi', name: 'Abi' },
  { id: 'ass', name: 'Ass' },
  { id: 'fazz', name: 'Fazz' },
  { id: 'garch', name: 'Garch' },
  { id: 'kuvindu', name: 'Kuvindu' },
  { id: 'ritz', name: 'Ritz' },
  { id: 'savo', name: 'Savo' },
  { id: 'shlok', name: 'Shlok' },
  { id: 'tmog', name: 'Tmog' },
  { id: 'vik', name: 'Vik' },
];

export const PLAYER_IDS: PlayerId[] = DEFAULT_PLAYERS.map((p) => p.id);

// Round robin draw: [home, away] per court, in court order. `null` = court unused.
const RR_DRAW: ([PlayerId, PlayerId] | null)[][] = [
  /* R1 */ [['fazz', 'shlok'], ['ritz', 'tmog'], ['savo', 'abhi']],
  /* R2 */ [['savo', 'shlok'], ['ass', 'vik'], ['abi', 'kuvindu']],
  /* R3 */ [['garch', 'abhi'], ['ritz', 'vik'], ['kuvindu', 'ass']],
  /* R4 */ [['shlok', 'tmog'], ['abhi', 'fazz'], ['abi', 'savo']],
  /* R5 */ [['abi', 'garch'], ['ritz', 'ass'], ['tmog', 'kuvindu']],
  /* R6 */ [['ass', 'fazz'], ['abhi', 'kuvindu'], ['vik', 'savo']],
  /* R7 */ [['garch', 'tmog'], ['vik', 'shlok'], null],
  /* R8 */ [['kuvindu', 'garch'], ['savo', 'ritz'], ['abi', 'fazz']],
  /* R9 */ [['ass', 'abhi'], ['tmog', 'savo'], ['fazz', 'kuvindu']],
  /* R10 */ [['garch', 'shlok'], ['abhi', 'abi'], ['tmog', 'vik']],
  /* R11 */ [['fazz', 'garch'], ['kuvindu', 'ritz'], ['abi', 'vik']],
  /* R12 */ [['shlok', 'abhi'], ['fazz', 'ritz'], ['savo', 'ass']],
  /* R13 */ [['garch', 'ass'], ['abhi', 'tmog'], null],
  /* R14 */ [['kuvindu', 'shlok'], ['tmog', 'abi'], ['vik', 'fazz']],
  /* R15 */ [['vik', 'garch'], ['shlok', 'ritz'], ['kuvindu', 'savo']],
  /* R16 */ [['ritz', 'abhi'], ['ass', 'abi'], ['tmog', 'fazz']],
  /* R17 */ [['shlok', 'abi'], ['abhi', 'vik'], ['fazz', 'savo']],
  /* R18 */ [['garch', 'ritz'], ['shlok', 'ass'], ['vik', 'kuvindu']],
  /* R19 */ [['savo', 'garch'], ['ritz', 'abi'], ['ass', 'tmog']],
];

// Byes exactly as printed, used by the tests to check the transcription.
export const RR_PRINTED_BYES: PlayerId[][] = [
  ['garch', 'ass', 'abi', 'vik', 'kuvindu'],
  ['garch', 'ritz', 'abhi', 'tmog', 'fazz'],
  ['shlok', 'tmog', 'abi', 'fazz', 'savo'],
  ['garch', 'ritz', 'ass', 'vik', 'kuvindu'],
  ['shlok', 'abhi', 'vik', 'fazz', 'savo'],
  ['garch', 'shlok', 'ritz', 'tmog', 'abi'],
  ['ritz', 'ass', 'abhi', 'abi', 'fazz', 'kuvindu', 'savo'],
  ['shlok', 'ass', 'abhi', 'tmog', 'vik'],
  ['garch', 'shlok', 'ritz', 'abi', 'vik'],
  ['ritz', 'ass', 'fazz', 'kuvindu', 'savo'],
  ['shlok', 'ass', 'abhi', 'tmog', 'savo'],
  ['garch', 'tmog', 'abi', 'vik', 'kuvindu'],
  ['shlok', 'ritz', 'abi', 'vik', 'fazz', 'kuvindu', 'savo'],
  ['garch', 'ritz', 'ass', 'abhi', 'savo'],
  ['ass', 'abhi', 'tmog', 'abi', 'fazz'],
  ['garch', 'shlok', 'vik', 'kuvindu', 'savo'],
  ['garch', 'ritz', 'ass', 'tmog', 'kuvindu'],
  ['abhi', 'tmog', 'abi', 'fazz', 'savo'],
  ['shlok', 'abhi', 'vik', 'fazz', 'kuvindu'],
];

const q = (pos: 1 | 2 | 3 | 4): SlotRef => ({ kind: 'seed', from: 'rr', pos });
const f = (pos: 1 | 2 | 3 | 4): SlotRef => ({ kind: 'seed', from: 'ff', pos });
const p = (id: PlayerId): SlotRef => ({ kind: 'player', id });

const FF_DRAW: [SlotRef, SlotRef][][] = [
  [[q(1), q(2)], [q(3), q(4)]],
  [[q(1), q(3)], [q(2), q(4)]],
  [[q(1), q(4)], [q(2), q(3)]],
];

function buildSchedule(): { sessions: Session[]; matches: Match[] } {
  const sessions: Session[] = [];
  const matches: Match[] = [];
  let matchId = 1;

  const addSession = (s: Omit<Session, 'index' | 'matchIds'>, pairs: ([SlotRef, SlotRef] | null)[]) => {
    const session: Session = { ...s, index: sessions.length, matchIds: [] };
    pairs.forEach((pair, i) => {
      if (!pair) return;
      const m: Match = {
        id: matchId++,
        sessionKey: s.key,
        stage: s.stage,
        court: i + 1,
        home: pair[0],
        away: pair[1],
        target: s.target,
      };
      matches.push(m);
      session.matchIds.push(m.id);
    });
    sessions.push(session);
  };

  // 19 rounds between 10:00 and ~12:20.
  const rrMinutes = (hm(12, 20) - hm(10, 0)) / RR_DRAW.length;
  RR_DRAW.forEach((round, i) =>
    addSession(
      {
        key: `rr-${i + 1}`,
        stage: 'rr',
        round: i + 1,
        label: `Round ${i + 1}`,
        shortLabel: `R${i + 1}`,
        target: TOURNAMENT.rrTarget,
        plannedStart: hm(10, 0) + i * rrMinutes,
        plannedMinutes: rrMinutes,
        autoStart: i > 0,
      },
      round.map((pair) => (pair ? [p(pair[0]), p(pair[1])] : null)),
    ),
  );

  // Final Four: 12:30 to ~1:05.
  const ffMinutes = (hm(13, 5) - hm(12, 30)) / FF_DRAW.length;
  FF_DRAW.forEach((round, i) =>
    addSession(
      {
        key: `ff-${i + 1}`,
        stage: 'ff',
        round: i + 1,
        label: `Final Four · Round ${i + 1}`,
        shortLabel: `FF${i + 1}`,
        target: TOURNAMENT.finalsTarget,
        plannedStart: hm(12, 30) + i * ffMinutes,
        plannedMinutes: ffMinutes,
        autoStart: i > 0,
      },
      round,
    ),
  );

  addSession(
    {
      key: 'bronze',
      stage: 'bronze',
      round: 1,
      label: 'Third Place Playoff',
      shortLabel: '3rd',
      target: TOURNAMENT.finalsTarget,
      plannedStart: hm(13, 5),
      plannedMinutes: 10,
      autoStart: false,
    },
    [[f(3), f(4)]],
  );

  addSession(
    {
      key: 'final',
      stage: 'final',
      round: 1,
      label: 'The Final',
      shortLabel: 'Final',
      target: TOURNAMENT.finalsTarget,
      plannedStart: hm(13, 15),
      plannedMinutes: 10,
      autoStart: false,
    },
    [[f(1), f(2)]],
  );

  return { sessions, matches };
}

const built = buildSchedule();

export const SESSIONS: Session[] = built.sessions;
export const MATCHES: Match[] = built.matches;
export const MATCH_BY_ID: Record<number, Match> = Object.fromEntries(MATCHES.map((m) => [m.id, m]));
export const SESSION_BY_KEY: Record<string, Session> = Object.fromEntries(SESSIONS.map((s) => [s.key, s]));
export const RR_SESSIONS = SESSIONS.filter((s) => s.stage === 'rr');
export const RR_MATCHES = MATCHES.filter((m) => m.stage === 'rr');
export const FF_MATCHES = MATCHES.filter((m) => m.stage === 'ff');
export const BRONZE_MATCH = MATCHES.find((m) => m.stage === 'bronze')!;
export const FINAL_MATCH = MATCHES.find((m) => m.stage === 'final')!;
export const PRESENTATION_TIME = hm(13, 25);

export const STAGE_LABEL: Record<Stage, string> = {
  rr: 'Round Robin',
  ff: 'Final Four',
  bronze: 'Third Place Playoff',
  final: 'The Final',
};
