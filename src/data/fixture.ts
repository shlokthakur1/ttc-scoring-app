// The official draw for the Tennis Tuesdays Cup 2026, transcribed from
// "Tennis_Tuesdays_Cup_2026_FINAL.pdf" (pages "The Fixture", "The Fixture (cont.)",
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
  /** Match number as printed in the program (1–74). */
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
  date: 'Sunday, 15 November 2026',
  venue: 'Eildon Park Tennis Club, Rowville',
  courts: 3,
  rrTarget: 7,
  finalsTarget: 11,
  qualifiers: 4,
} as const;

const hm = (h: number, m: number) => h * 60 + m;

export const DAY_PLAN = [
  { time: hm(12, 30), title: 'Arrival & warm-up', detail: '' },
  // The program's timetable still says "19 rounds, 55 matches"; the 12-player draw is 22 rounds, 66 matches.
  { time: hm(13, 0), title: 'Round robin begins', detail: '22 rounds. 3 courts. 66 matches. Race to 7.' },
  { time: hm(15, 20), title: 'Round robin ends', detail: 'Final standings confirmed. Top 4 advance. Short break.' },
  { time: hm(15, 30), title: 'The Final Four', detail: 'Six matches. Fresh standings. Race to 11.' },
  { time: hm(16, 5), title: 'Third-place playoff', detail: '#3 vs #4.' },
  { time: hm(16, 15), title: 'The Final', detail: '#1 vs #2. Winner takes all.' },
  { time: hm(16, 30), title: 'Presentation', detail: 'Champion crowned. Courts booked until 5:00 PM.' },
] as const;

// The courts are booked 12:30 PM – 5:00 PM.
export const COURTS_VACATED_BY = hm(17, 0);

export const DEFAULT_PLAYERS: Player[] = [
  { id: 'abhi', name: 'Abhi' },
  { id: 'abi', name: 'Abi' },
  { id: 'ass', name: 'Ass' },
  { id: 'fazz', name: 'Fazz' },
  { id: 'garch', name: 'Garch' },
  { id: 'hitesh', name: 'Hitesh' },
  { id: 'kuvindu', name: 'Kuvindu' },
  { id: 'ritz', name: 'Ritz' },
  { id: 'savo', name: 'Savo' },
  { id: 'shlok', name: 'Shlok' },
  { id: 'tmog', name: 'Tmog' },
  { id: 'vik', name: 'Vik' },
];

export const PLAYER_IDS: PlayerId[] = DEFAULT_PLAYERS.map((p) => p.id);

// Round robin draw: [home, away] per court, in court order.
const RR_DRAW: [PlayerId, PlayerId][][] = [
  /* R1 */ [['fazz', 'shlok'], ['ritz', 'tmog'], ['savo', 'abhi']],
  /* R2 */ [['hitesh', 'garch'], ['ass', 'vik'], ['abi', 'kuvindu']],
  /* R3 */ [['hitesh', 'fazz'], ['ritz', 'vik'], ['kuvindu', 'ass']],
  /* R4 */ [['shlok', 'tmog'], ['abhi', 'fazz'], ['abi', 'savo']],
  /* R5 */ [['abi', 'garch'], ['hitesh', 'ritz'], ['tmog', 'kuvindu']],
  /* R6 */ [['ass', 'fazz'], ['abhi', 'kuvindu'], ['vik', 'savo']],
  /* R7 */ [['garch', 'tmog'], ['vik', 'shlok'], ['hitesh', 'ass']],
  /* R8 */ [['kuvindu', 'garch'], ['savo', 'ritz'], ['abi', 'fazz']],
  /* R9 */ [['ass', 'abhi'], ['tmog', 'savo'], ['hitesh', 'shlok']],
  /* R10 */ [['garch', 'shlok'], ['hitesh', 'kuvindu'], ['tmog', 'vik']],
  /* R11 */ [['fazz', 'garch'], ['kuvindu', 'ritz'], ['abi', 'vik']],
  /* R12 */ [['shlok', 'abhi'], ['fazz', 'ritz'], ['savo', 'ass']],
  /* R13 */ [['garch', 'ass'], ['abhi', 'tmog'], ['hitesh', 'savo']],
  /* R14 */ [['kuvindu', 'shlok'], ['tmog', 'abi'], ['vik', 'fazz']],
  /* R15 */ [['vik', 'garch'], ['shlok', 'ritz'], ['kuvindu', 'savo']],
  /* R16 */ [['ritz', 'abhi'], ['ass', 'abi'], ['hitesh', 'tmog']],
  /* R17 */ [['shlok', 'abi'], ['abhi', 'vik'], ['fazz', 'savo']],
  /* R18 */ [['garch', 'ritz'], ['shlok', 'ass'], ['vik', 'kuvindu']],
  /* R19 */ [['hitesh', 'abhi'], ['ritz', 'abi'], ['ass', 'tmog']],
  /* R20 */ [['fazz', 'kuvindu'], ['abhi', 'abi'], ['savo', 'garch']],
  /* R21 */ [['savo', 'shlok'], ['ritz', 'ass'], ['hitesh', 'vik']],
  /* R22 */ [['garch', 'abhi'], ['tmog', 'fazz'], ['hitesh', 'abi']],
];

// Byes exactly as printed, used by the tests to check the transcription.
// (Round 3's printed list also named Fazz, a misprint: Fazz plays Hitesh on Court 1.)
export const RR_PRINTED_BYES: PlayerId[][] = [
  ['garch', 'ass', 'abi', 'vik', 'kuvindu', 'hitesh'],
  ['shlok', 'ritz', 'abhi', 'tmog', 'fazz', 'savo'],
  ['garch', 'shlok', 'abhi', 'tmog', 'abi', 'savo'],
  ['garch', 'ritz', 'ass', 'vik', 'kuvindu', 'hitesh'],
  ['shlok', 'ass', 'abhi', 'vik', 'fazz', 'savo'],
  ['garch', 'shlok', 'ritz', 'tmog', 'abi', 'hitesh'],
  ['ritz', 'abhi', 'abi', 'fazz', 'kuvindu', 'savo'],
  ['shlok', 'ass', 'abhi', 'tmog', 'vik', 'hitesh'],
  ['garch', 'ritz', 'abi', 'vik', 'fazz', 'kuvindu'],
  ['ritz', 'ass', 'abhi', 'abi', 'fazz', 'savo'],
  ['shlok', 'ass', 'abhi', 'tmog', 'savo', 'hitesh'],
  ['garch', 'tmog', 'abi', 'vik', 'kuvindu', 'hitesh'],
  ['shlok', 'ritz', 'abi', 'vik', 'fazz', 'kuvindu'],
  ['garch', 'ritz', 'ass', 'abhi', 'savo', 'hitesh'],
  ['ass', 'abhi', 'tmog', 'abi', 'fazz', 'hitesh'],
  ['garch', 'shlok', 'vik', 'fazz', 'kuvindu', 'savo'],
  ['garch', 'ritz', 'ass', 'tmog', 'kuvindu', 'hitesh'],
  ['abhi', 'tmog', 'abi', 'fazz', 'savo', 'hitesh'],
  ['garch', 'shlok', 'vik', 'fazz', 'kuvindu', 'savo'],
  ['shlok', 'ritz', 'ass', 'tmog', 'vik', 'hitesh'],
  ['garch', 'abhi', 'tmog', 'abi', 'fazz', 'kuvindu'],
  ['shlok', 'ritz', 'ass', 'vik', 'kuvindu', 'savo'],
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

  // 22 rounds between 1:00 PM and ~3:20 PM.
  const rrMinutes = (hm(15, 20) - hm(13, 0)) / RR_DRAW.length;
  RR_DRAW.forEach((round, i) =>
    addSession(
      {
        key: `rr-${i + 1}`,
        stage: 'rr',
        round: i + 1,
        label: `Round ${i + 1}`,
        shortLabel: `R${i + 1}`,
        target: TOURNAMENT.rrTarget,
        plannedStart: hm(13, 0) + i * rrMinutes,
        plannedMinutes: rrMinutes,
        autoStart: i > 0,
      },
      round.map((pair) => [p(pair[0]), p(pair[1])]),
    ),
  );

  // Final Four: 3:30 PM to ~4:05 PM.
  const ffMinutes = (hm(16, 5) - hm(15, 30)) / FF_DRAW.length;
  FF_DRAW.forEach((round, i) =>
    addSession(
      {
        key: `ff-${i + 1}`,
        stage: 'ff',
        round: i + 1,
        label: `Final Four · Round ${i + 1}`,
        shortLabel: `FF${i + 1}`,
        target: TOURNAMENT.finalsTarget,
        plannedStart: hm(15, 30) + i * ffMinutes,
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
      plannedStart: hm(16, 5),
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
      plannedStart: hm(16, 15),
      plannedMinutes: 15,
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
export const PRESENTATION_TIME = hm(16, 30);

export const STAGE_LABEL: Record<Stage, string> = {
  rr: 'Round Robin',
  ff: 'Final Four',
  bronze: 'Third Place Playoff',
  final: 'The Final',
};
