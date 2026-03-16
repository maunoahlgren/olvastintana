/**
 * @file firebase/derbyMatch.ts
 * Firebase Realtime Database helpers for Derby Night live match state.
 *
 * Match state lives at: rooms/{code}/match/
 *
 * Schema (flat keys for Firebase reliability):
 *   phase            — 'lineup' | 'trivia' | 'duel' | 'duel_result' | 'halftime' | 'result'
 *   half             — 1 | 2
 *   duel_index       — 0–4 (index within the current half)
 *   score_home       — integer goals for p1 (host / home team)
 *   score_away       — integer goals for p2 (joining player / away team)
 *   possession       — 'p1' | 'p2'  (who is currently attacking)
 *   kickoff          — 'p1' | 'p2'  (who kicked off the first half)
 *   trivia_index     — index into trivia.json
 *   trivia_boost     — 'p1' | 'p2' | null  (first correct trivia answer wins +1 boost)
 *   p1_lineup_ready  — boolean
 *   p2_lineup_ready  — boolean
 *   p1_lineup        — JSON-stringified string[] of player IDs (5 outfield + 1 GK)
 *   p2_lineup        — JSON-stringified string[] of player IDs
 *   p1_trivia        — boolean | null  (null = not answered yet)
 *   p2_trivia        — boolean | null
 *   p1_card          — 'press' | 'feint' | 'shot' | null
 *   p2_card          — 'press' | 'feint' | 'shot' | null
 *   p1_card_ready    — boolean
 *   p2_card_ready    — boolean
 *   result_atk_card  — the attacker's revealed card after duel resolution
 *   result_def_card  — the defender's revealed card
 *   result_winner    — 'attacker' | 'defender' | 'draw' | null
 *   result_scored    — boolean (true if a goal was scored on this duel)
 *   p1_halftime_done — boolean
 *   p2_halftime_done — boolean
 *   p1_halftime_action — JSON-stringified HalftimeAction | null
 *   p2_halftime_action — JSON-stringified HalftimeAction | null
 *
 * Role → playerKey mapping:
 *   role='host'      → 'p1'   (home team, creates the room)
 *   role='player'    → 'p2'   (away team, joins with code)
 *   role='spectator' → null   (big screen — read-only)
 *
 * Only the host writes phase transitions; both players write their own moves.
 * All functions guard against db === null (Firebase not configured).
 */

import { db } from './config';
import {
  ref,
  set,
  get,
  onValue,
  update,
  type DataSnapshot,
} from 'firebase/database';
import type { Card } from '../engine/duel';

// ─── Types ───────────────────────────────────────────────────────────────────

/** The live phase within a Derby Night match (stored in Firebase) */
export type DerbyMatchPhase =
  | 'lineup'
  | 'trivia'
  | 'duel'
  | 'duel_result'
  | 'halftime'
  | 'result';

/** Which player key this client maps to */
export type PlayerKey = 'p1' | 'p2';

/**
 * A halftime action submitted by a manager.
 * Only one of the optional fields is populated depending on type.
 */
export interface HalftimeAction {
  /** Type of halftime action */
  type: 'swap' | 'tactic' | 'skip';
  /** Player ID to remove from the lineup (swap only) */
  swapOut?: string;
  /** Player ID to bring in from the bench (swap only) */
  swapIn?: string;
  /** New tactic to adopt (tactic only) */
  tactic?: string;
}

/** Normalised match snapshot returned by listenToMatch */
export interface DerbyMatchSnapshot {
  phase: DerbyMatchPhase;
  half: 1 | 2;
  duelIndex: number;
  scoreHome: number;
  scoreAway: number;
  /** Which team is attacking */
  possession: PlayerKey;
  /** Who kicked off the first half */
  kickoff: PlayerKey;
  triviaIndex: number;
  triviaBoost: PlayerKey | null;
  p1LineupReady: boolean;
  p2LineupReady: boolean;
  /** Parsed lineup player IDs for p1 */
  p1Lineup: string[];
  /** Parsed lineup player IDs for p2 */
  p2Lineup: string[];
  /** null = not yet answered */
  p1Trivia: boolean | null;
  p2Trivia: boolean | null;
  p1Card: Card | null;
  p2Card: Card | null;
  p1CardReady: boolean;
  p2CardReady: boolean;
  resultAtkCard: Card | null;
  resultDefCard: Card | null;
  resultWinner: 'attacker' | 'defender' | 'draw' | null;
  resultScored: boolean;
  p1HalftimeDone: boolean;
  p2HalftimeDone: boolean;
  p1HalftimeAction: HalftimeAction | null;
  p2HalftimeAction: HalftimeAction | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse a JSON-stringified lineup from Firebase into a string array.
 * Returns an empty array if the value is null/undefined/invalid.
 *
 * @param raw - Raw Firebase value (string, null, or undefined)
 * @returns Parsed player ID array
 */
function parseLineup(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; }
  catch { return []; }
}

/**
 * Parse a JSON-stringified HalftimeAction from Firebase.
 * Returns null if the value is missing or invalid.
 *
 * @param raw - Raw Firebase value
 * @returns Parsed HalftimeAction or null
 */
function parseHalftimeAction(raw: string | null | undefined): HalftimeAction | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as HalftimeAction; }
  catch { return null; }
}

// ─── Match Initialisation ─────────────────────────────────────────────────────

/**
 * Initialise a fresh match document in Firebase when the host starts the game.
 * Sets phase to 'lineup' and seeds all fields to their default values.
 *
 * Only the host should call this. Called from DerbyLobbyScreen before
 * transitioning the room state to 'playing'.
 *
 * @param code        - 4-character room code
 * @param kickoff     - Which player key kicks off the first half (coin flip result)
 * @param triviaIndex - Index into trivia.json for the pre-match question
 * @throws If Firebase is not configured or the write fails
 *
 * @example
 * await initMatch('G7KP', 'p1', 2);
 */
export async function initMatch(
  code: string,
  kickoff: PlayerKey,
  triviaIndex: number,
): Promise<void> {
  if (!db) throw new Error('[Firebase] Not configured — cannot init match.');

  const matchRef = ref(db, `rooms/${code}/match`);
  await set(matchRef, {
    phase: 'lineup',
    half: 1,
    duel_index: 0,
    score_home: 0,
    score_away: 0,
    possession: kickoff,
    kickoff,
    trivia_index: triviaIndex,
    trivia_boost: null,
    p1_lineup_ready: false,
    p2_lineup_ready: false,
    p1_lineup: null,
    p2_lineup: null,
    p1_trivia: null,
    p2_trivia: null,
    p1_card: null,
    p2_card: null,
    p1_card_ready: false,
    p2_card_ready: false,
    result_atk_card: null,
    result_def_card: null,
    result_winner: null,
    result_scored: false,
    p1_halftime_done: false,
    p2_halftime_done: false,
    p1_halftime_action: null,
    p2_halftime_action: null,
  });
}

// ─── Lineup ───────────────────────────────────────────────────────────────────

/**
 * Submit a player's lineup to Firebase.
 * Each player calls this independently with their chosen 6 player IDs.
 *
 * @param code      - 4-character room code
 * @param playerKey - 'p1' (host) or 'p2' (joining player)
 * @param playerIds - Array of exactly 6 player IDs (5 outfield + 1 GK)
 * @throws If Firebase is not configured
 *
 * @example
 * await submitLineup('G7KP', 'p1', ['olli_mehtonen', ..., 'juha_jokinen_gk']);
 */
export async function submitLineup(
  code: string,
  playerKey: PlayerKey,
  playerIds: string[],
): Promise<void> {
  if (!db) throw new Error('[Firebase] Not configured — cannot submit lineup.');

  const matchRef = ref(db, `rooms/${code}/match`);
  await update(matchRef, {
    [`${playerKey}_lineup`]: JSON.stringify(playerIds),
    [`${playerKey}_lineup_ready`]: true,
  });
}

// ─── Trivia ───────────────────────────────────────────────────────────────────

/**
 * Submit a trivia answer for one player.
 * The first player to answer correctly gets the +1 stat boost (trivia_boost).
 * Only sets trivia_boost if the answer is correct AND no one has won it yet.
 *
 * @param code      - 4-character room code
 * @param playerKey - 'p1' or 'p2'
 * @param correct   - Whether the answer was correct
 * @throws If Firebase is not configured
 *
 * @example
 * await submitTriviaAnswer('G7KP', 'p2', true);
 */
export async function submitTriviaAnswer(
  code: string,
  playerKey: PlayerKey,
  correct: boolean,
): Promise<void> {
  if (!db) throw new Error('[Firebase] Not configured — cannot submit trivia.');

  const matchRef = ref(db, `rooms/${code}/match`);
  const updates: Record<string, unknown> = {
    [`${playerKey}_trivia`]: correct,
  };

  if (correct) {
    // Only award boost to first correct answerer
    const boostRef = ref(db, `rooms/${code}/match/trivia_boost`);
    const snap = await get(boostRef);
    if (!snap.exists() || snap.val() === null) {
      updates['trivia_boost'] = playerKey;
    }
  }

  await update(matchRef, updates);
}

// ─── Card Selection ───────────────────────────────────────────────────────────

/**
 * Submit a player's duel card choice to Firebase.
 * Cards are hidden from the opponent until both are ready (read by the big screen only).
 *
 * @param code      - 4-character room code
 * @param playerKey - 'p1' or 'p2'
 * @param card      - The card chosen: 'press' | 'feint' | 'shot'
 * @throws If Firebase is not configured
 *
 * @example
 * await submitCard('G7KP', 'p1', 'shot');
 */
export async function submitCard(
  code: string,
  playerKey: PlayerKey,
  card: Card,
): Promise<void> {
  if (!db) throw new Error('[Firebase] Not configured — cannot submit card.');

  const matchRef = ref(db, `rooms/${code}/match`);
  await update(matchRef, {
    [`${playerKey}_card`]: card,
    [`${playerKey}_card_ready`]: true,
  });
}

// ─── Duel Resolution ─────────────────────────────────────────────────────────

/**
 * Write the duel result to Firebase and advance to 'duel_result' phase.
 * Only the host should call this after detecting both cards are ready.
 *
 * @param code      - 4-character room code
 * @param atkCard   - The attacker's card
 * @param defCard   - The defender's card
 * @param winner    - Result of resolveDuel()
 * @param scored    - True if a goal was scored on this duel
 * @param scoreHome - Updated home score
 * @param scoreAway - Updated away score
 * @param possession - Possession after this duel
 * @throws If Firebase is not configured
 *
 * @example
 * await writeDuelResult('G7KP', 'shot', 'press', 'attacker', true, 1, 0, 'p1');
 */
export async function writeDuelResult(
  code: string,
  atkCard: Card,
  defCard: Card,
  winner: 'attacker' | 'defender' | 'draw',
  scored: boolean,
  scoreHome: number,
  scoreAway: number,
  possession: PlayerKey,
): Promise<void> {
  if (!db) throw new Error('[Firebase] Not configured — cannot write duel result.');

  const matchRef = ref(db, `rooms/${code}/match`);
  await update(matchRef, {
    phase: 'duel_result',
    result_atk_card: atkCard,
    result_def_card: defCard,
    result_winner: winner,
    result_scored: scored,
    score_home: scoreHome,
    score_away: scoreAway,
    possession,
  });
}

// ─── Phase Advancement ────────────────────────────────────────────────────────

/**
 * Advance the Firebase match phase to the next stage.
 * Only the host should call this — it is the single source of truth for phase transitions.
 *
 * @param code    - 4-character room code
 * @param phase   - The new DerbyMatchPhase to write
 * @param updates - Optional additional field updates to apply atomically
 * @throws If Firebase is not configured
 *
 * @example
 * await advanceDerbyPhase('G7KP', 'trivia');
 * await advanceDerbyPhase('G7KP', 'duel', { duel_index: 1, p1_card: null, p2_card: null });
 */
export async function advanceDerbyPhase(
  code: string,
  phase: DerbyMatchPhase,
  updates: Record<string, unknown> = {},
): Promise<void> {
  if (!db) throw new Error('[Firebase] Not configured — cannot advance phase.');

  const matchRef = ref(db, `rooms/${code}/match`);
  await update(matchRef, { phase, ...updates });
}

/**
 * Reset card state for the next duel.
 * Called by the host after the duel_result display has finished.
 *
 * @param code          - 4-character room code
 * @param nextDuelIndex - The duel_index for the next duel (0-based within the half)
 * @param newHalf       - True when this also starts the second half
 * @param possession    - Possession at the start of the next duel
 * @throws If Firebase is not configured
 *
 * @example
 * await resetForNextDuel('G7KP', 2, false, 'p2');
 */
export async function resetForNextDuel(
  code: string,
  nextDuelIndex: number,
  newHalf: boolean,
  possession: PlayerKey,
): Promise<void> {
  if (!db) throw new Error('[Firebase] Not configured — cannot reset for next duel.');

  const matchRef = ref(db, `rooms/${code}/match`);
  await update(matchRef, {
    phase: 'duel',
    duel_index: nextDuelIndex,
    ...(newHalf ? { half: 2, p1_halftime_done: false, p2_halftime_done: false } : {}),
    possession,
    p1_card: null,
    p2_card: null,
    p1_card_ready: false,
    p2_card_ready: false,
    result_atk_card: null,
    result_def_card: null,
    result_winner: null,
    result_scored: false,
  });
}

// ─── Halftime ────────────────────────────────────────────────────────────────

/**
 * Submit a halftime action for one player.
 *
 * @param code      - 4-character room code
 * @param playerKey - 'p1' or 'p2'
 * @param action    - The halftime action chosen
 * @throws If Firebase is not configured
 *
 * @example
 * await submitHalftimeAction('G7KP', 'p1', { type: 'tactic', tactic: 'aggressive' });
 */
export async function submitHalftimeAction(
  code: string,
  playerKey: PlayerKey,
  action: HalftimeAction,
): Promise<void> {
  if (!db) throw new Error('[Firebase] Not configured — cannot submit halftime action.');

  const matchRef = ref(db, `rooms/${code}/match`);
  await update(matchRef, {
    [`${playerKey}_halftime_done`]: true,
    [`${playerKey}_halftime_action`]: JSON.stringify(action),
  });
}

// ─── Listener ─────────────────────────────────────────────────────────────────

/**
 * Subscribe to real-time Derby Night match state updates.
 * Fires immediately with current state, then on every change.
 *
 * @param code     - 4-character room code
 * @param onUpdate - Callback invoked with normalised DerbyMatchSnapshot on each change
 * @returns Unsubscribe function — call this in useEffect cleanup
 *
 * @example
 * const unsub = listenToMatch('G7KP', (snap) => {
 *   setDerbyState(snap);
 * });
 * return () => unsub();
 */
export function listenToMatch(
  code: string,
  onUpdate: (snap: DerbyMatchSnapshot) => void,
): () => void {
  if (!db) {
    console.warn('[Firebase] Not configured — listenToMatch is a no-op.');
    return () => {};
  }

  const matchRef = ref(db, `rooms/${code}/match`);

  const unsubscribe = onValue(matchRef, (snapshot: DataSnapshot) => {
    if (!snapshot.exists()) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = snapshot.val() as Record<string, any>;

    onUpdate({
      phase: (d.phase ?? 'lineup') as DerbyMatchPhase,
      half: (d.half ?? 1) as 1 | 2,
      duelIndex: d.duel_index ?? 0,
      scoreHome: d.score_home ?? 0,
      scoreAway: d.score_away ?? 0,
      possession: (d.possession ?? 'p1') as PlayerKey,
      kickoff: (d.kickoff ?? 'p1') as PlayerKey,
      triviaIndex: d.trivia_index ?? 0,
      triviaBoost: (d.trivia_boost ?? null) as PlayerKey | null,
      p1LineupReady: d.p1_lineup_ready ?? false,
      p2LineupReady: d.p2_lineup_ready ?? false,
      p1Lineup: parseLineup(d.p1_lineup),
      p2Lineup: parseLineup(d.p2_lineup),
      p1Trivia: d.p1_trivia ?? null,
      p2Trivia: d.p2_trivia ?? null,
      p1Card: (d.p1_card ?? null) as Card | null,
      p2Card: (d.p2_card ?? null) as Card | null,
      p1CardReady: d.p1_card_ready ?? false,
      p2CardReady: d.p2_card_ready ?? false,
      resultAtkCard: (d.result_atk_card ?? null) as Card | null,
      resultDefCard: (d.result_def_card ?? null) as Card | null,
      resultWinner: (d.result_winner ?? null) as 'attacker' | 'defender' | 'draw' | null,
      resultScored: d.result_scored ?? false,
      p1HalftimeDone: d.p1_halftime_done ?? false,
      p2HalftimeDone: d.p2_halftime_done ?? false,
      p1HalftimeAction: parseHalftimeAction(d.p1_halftime_action),
      p2HalftimeAction: parseHalftimeAction(d.p2_halftime_action),
    });
  });

  return unsubscribe;
}
