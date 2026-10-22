import {
  BRONZE_MATCH,
  FF_MATCHES,
  FINAL_MATCH,
  MATCHES,
  RR_MATCHES,
  SESSIONS,
  TOURNAMENT,
  type Match,
  type PlayerId,
  type Session,
  type SlotRef,
} from '../data/fixture';
import { autoLineJudges } from './lineJudges';
import { computeStandings, type PairedFixture, type StandingRow } from './standings';
import type { MatchResult, TournamentState } from './types';

export interface ResolvedMatch {
  match: Match;
  homeId: PlayerId | null;
  awayId: PlayerId | null;
  /** Players shown are a projection: the stage feeding this match isn't finished. */
  provisional: boolean;
  result: MatchResult | null;
  winnerId: PlayerId | null;
  loserId: PlayerId | null;
  judgeId: PlayerId | null;
  judgeOverridden: boolean;
}

export interface SeedInfo {
  /** Seeds 1–4 in order (may be fewer than 4 before anything is known). */
  ids: PlayerId[];
  /** Safe to play the matches that depend on these seeds. */
  final: boolean;
  /** Seeds were fixed by the admin, or locked automatically once the next stage began. */
  locked: boolean;
  /** Players level on every tiebreaker across the line that matters (Q4/Q5 or F2/F3). */
  tieAtCut: PlayerId[];
}

export type SessionStatus = 'done' | 'live' | 'upcoming';

export interface Derived {
  matches: Record<number, ResolvedMatch>;
  rrStandings: StandingRow[];
  ffStandings: StandingRow[];
  rrSeeds: SeedInfo;
  ffSeeds: SeedInfo;
  sessionStatus: Record<string, SessionStatus>;
  /** First session with a match still to play; null once the Final is in. */
  current: Session | null;
  next: Session | null;
  completed: number;
  total: number;
  rrComplete: boolean;
  ffComplete: boolean;
  podium: { champion: PlayerId | null; runnerUp: PlayerId | null; third: PlayerId | null; fourth: PlayerId | null };
  /** Line-judge duties per player (all stages). */
  duties: Record<PlayerId, number>;
}

export function playerIdsOf(state: TournamentState): PlayerId[] {
  return state.players.map((p) => p.id);
}

function paired(matches: ResolvedMatch[]): PairedFixture[] {
  return matches
    .filter((m) => m.homeId && m.awayId)
    .map((m) => ({ matchId: m.match.id, homeId: m.homeId!, awayId: m.awayId! }));
}

function seedsFrom(
  standings: StandingRow[],
  locked: PlayerId[] | null,
  complete: boolean,
  cutAfter: number,
): SeedInfo {
  if (locked && locked.length === 4) return { ids: locked, final: true, locked: true, tieAtCut: [] };
  const ids = standings.slice(0, 4).map((r) => r.id);
  const atCut = standings[cutAfter - 1];
  const below = new Set(standings.slice(cutAfter).map((r) => r.id));
  const tieAtCut = atCut && atCut.tiedWith.some((id) => below.has(id)) ? [atCut.id, ...atCut.tiedWith] : [];
  return { ids, final: complete && tieAtCut.length === 0 && ids.length === 4, locked: false, tieAtCut };
}

export function derive(state: TournamentState): Derived {
  const playerIds = playerIdsOf(state);
  const { results } = state;
  const matches: Record<number, ResolvedMatch> = {};

  const build = (m: Match, resolve: (ref: SlotRef) => { id: PlayerId | null; provisional: boolean }) => {
    const h = resolve(m.home);
    const a = resolve(m.away);
    const r = results[m.id] ?? null;
    const homeId = h.id;
    const awayId = a.id;
    const winnerId = r && homeId && awayId ? (r.home > r.away ? homeId : awayId) : null;
    const loserId = winnerId ? (winnerId === homeId ? awayId : homeId) : null;
    matches[m.id] = {
      match: m,
      homeId,
      awayId,
      provisional: h.provisional || a.provisional,
      result: r,
      winnerId,
      loserId,
      judgeId: null,
      judgeOverridden: false,
    };
  };

  // Round robin.
  for (const m of RR_MATCHES) build(m, (ref) => ({ id: ref.kind === 'player' ? ref.id : null, provisional: false }));
  const rrComplete = RR_MATCHES.every((m) => results[m.id]);
  const rrStandings = computeStandings(
    playerIds,
    paired(RR_MATCHES.map((m) => matches[m.id])),
    results,
    TOURNAMENT.qualifiers,
  );
  const rrSeeds = seedsFrom(rrStandings, state.seedOverrides.rr, rrComplete, TOURNAMENT.qualifiers);

  // Final Four: fresh standings among Q1–Q4.
  const fromSeeds = (seeds: SeedInfo) => (ref: SlotRef) => {
    if (ref.kind === 'player') return { id: ref.id, provisional: false };
    return { id: seeds.ids[ref.pos - 1] ?? null, provisional: !seeds.final };
  };
  for (const m of FF_MATCHES) build(m, fromSeeds(rrSeeds));
  const ffComplete = FF_MATCHES.every((m) => results[m.id]);
  const ffFixtures = rrSeeds.final ? paired(FF_MATCHES.map((m) => matches[m.id])) : [];
  const ffPlayers = rrSeeds.final ? rrSeeds.ids : [];
  const ffStandings = computeStandings(ffPlayers, ffFixtures, results, 2);
  const ffSeeds = rrSeeds.final
    ? seedsFrom(ffStandings, state.seedOverrides.ff, ffComplete, 2)
    : { ids: [], final: false, locked: false, tieAtCut: [] };

  // Podium matches.
  build(BRONZE_MATCH, fromSeeds(ffSeeds));
  build(FINAL_MATCH, fromSeeds(ffSeeds));

  // Session progress.
  const sessionStatus: Record<string, SessionStatus> = {};
  let current: Session | null = null;
  for (const s of SESSIONS) {
    const done = s.matchIds.every((id) => results[id]);
    if (done) sessionStatus[s.key] = 'done';
    else if (!current) {
      current = s;
      sessionStatus[s.key] = 'live';
    } else sessionStatus[s.key] = 'upcoming';
  }
  const next = current ? (SESSIONS[current.index + 1] ?? null) : null;

  // Line judges: automatic rota, then the admin's changes on top.
  const auto = autoLineJudges(
    SESSIONS.map((s) => {
      const ms = s.matchIds.map((id) => matches[id]);
      const known = ms.every((m) => m.homeId && m.awayId);
      return {
        stage: s.stage,
        matchIds: s.matchIds,
        playing: known ? ms.flatMap((m) => [m.homeId!, m.awayId!]) : null,
      };
    }),
    playerIds,
    rrSeeds.ids,
  );
  const duties: Record<PlayerId, number> = Object.fromEntries(playerIds.map((id) => [id, 0]));
  for (const m of MATCHES) {
    const rm = matches[m.id];
    const override = state.lineJudges[m.id];
    const valid = override && override !== rm.homeId && override !== rm.awayId && playerIds.includes(override);
    rm.judgeId = valid ? override : (auto[m.id] ?? null);
    rm.judgeOverridden = Boolean(valid);
    // Finals rotas only count once the players in them are confirmed.
    if (rm.judgeId && !rm.provisional) duties[rm.judgeId] = (duties[rm.judgeId] ?? 0) + 1;
  }

  const fin = matches[FINAL_MATCH.id];
  const bronze = matches[BRONZE_MATCH.id];

  return {
    matches,
    rrStandings,
    ffStandings,
    rrSeeds,
    ffSeeds,
    sessionStatus,
    current,
    next,
    completed: MATCHES.filter((m) => results[m.id]).length,
    total: MATCHES.length,
    rrComplete,
    ffComplete,
    podium: {
      champion: fin.winnerId,
      runnerUp: fin.loserId,
      third: bronze.winnerId,
      fourth: bronze.loserId,
    },
    duties,
  };
}

/** Players on court in a session (empty if not known yet). */
export function playersInSession(d: Derived, s: Session): PlayerId[] {
  return s.matchIds.flatMap((id) => {
    const m = d.matches[id];
    return m.homeId && m.awayId ? [m.homeId, m.awayId] : [];
  });
}

/** Players resting during a session, i.e. byes. */
export function restingInSession(d: Derived, s: Session, playerIds: PlayerId[]): PlayerId[] {
  const on = new Set(playersInSession(d, s));
  return playerIds.filter((id) => !on.has(id));
}

/** The next match a player has still to play, from the current session onwards. */
export function nextMatchFor(d: Derived, id: PlayerId): ResolvedMatch | null {
  for (const s of SESSIONS) {
    if (d.current && s.index < d.current.index) continue;
    for (const mid of s.matchIds) {
      const m = d.matches[mid];
      if (!m.result && (m.homeId === id || m.awayId === id)) return m;
    }
  }
  return null;
}

/** The next line-judge duty a player has, from the current session onwards. */
export function nextDutyFor(d: Derived, id: PlayerId): ResolvedMatch | null {
  for (const s of SESSIONS) {
    if (d.current && s.index < d.current.index) continue;
    for (const mid of s.matchIds) {
      const m = d.matches[mid];
      if (!m.result && m.judgeId === id) return m;
    }
  }
  return null;
}
