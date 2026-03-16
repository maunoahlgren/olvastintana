/**
 * @file derbyStore.ts
 * Zustand store for Derby Night live match state — display-only.
 *
 * This store is a client-side cache of the Firebase match document.
 * It is never written to directly by UI components; all writes go to Firebase.
 * The `useDerbyMatchSync` hook in App.tsx drives updates via `setFromFirebase`.
 *
 * Lifecycle:
 *   idle → (host inits match) → listening → reset on leave / room close
 *
 * Separation of concerns:
 *   Firebase  — canonical source of truth
 *   derbyStore — display cache (read by screens)
 *   matchStore  — phase routing (drives which screen is shown in App.tsx)
 */

import { create } from 'zustand';
import type { DerbyMatchSnapshot, DerbyMatchPhase, PlayerKey, HalftimeAction } from '../firebase/derbyMatch';
import type { Card } from '../engine/duel';

// ─── State ────────────────────────────────────────────────────────────────────

interface DerbyState {
  /** Current Firebase match phase (null before match has been initialised) */
  phase: DerbyMatchPhase | null;
  /** Active half: 1 = first half, 2 = second half */
  half: 1 | 2;
  /** Current duel index within the half (0–4) */
  duelIndex: number;
  /** Goals scored by p1 (host / home) */
  scoreHome: number;
  /** Goals scored by p2 (joining player / away) */
  scoreAway: number;
  /** Who is currently attacking */
  possession: PlayerKey | null;
  /** Who kicked off the first half */
  kickoff: PlayerKey | null;
  /** Index into trivia.json for this match's question */
  triviaIndex: number;
  /** Which player key won the trivia boost, or null */
  triviaBoost: PlayerKey | null;
  /** Has p1 submitted their lineup? */
  p1LineupReady: boolean;
  /** Has p2 submitted their lineup? */
  p2LineupReady: boolean;
  /** p1's submitted lineup (player IDs) */
  p1Lineup: string[];
  /** p2's submitted lineup (player IDs) */
  p2Lineup: string[];
  /** p1's trivia answer: null = not answered, true = correct, false = wrong */
  p1Trivia: boolean | null;
  /** p2's trivia answer */
  p2Trivia: boolean | null;
  /** Has p1 locked in their card this duel? */
  p1CardReady: boolean;
  /** Has p2 locked in their card this duel? */
  p2CardReady: boolean;
  /**
   * p1's chosen card — only visible after duel_result phase.
   * During 'duel' phase this is null for the opposing player (hidden).
   */
  p1Card: Card | null;
  /**
   * p2's chosen card — only visible after duel_result phase.
   */
  p2Card: Card | null;
  /** The attacker's revealed card (duel_result phase) */
  resultAtkCard: Card | null;
  /** The defender's revealed card (duel_result phase) */
  resultDefCard: Card | null;
  /** Duel outcome: 'attacker' | 'defender' | 'draw' | null */
  resultWinner: 'attacker' | 'defender' | 'draw' | null;
  /** True if the last duel resulted in a goal */
  resultScored: boolean;
  /** Has p1 submitted their halftime action? */
  p1HalftimeDone: boolean;
  /** Has p2 submitted their halftime action? */
  p2HalftimeDone: boolean;
  /** p1's halftime action (revealed after both done) */
  p1HalftimeAction: HalftimeAction | null;
  /** p2's halftime action (revealed after both done) */
  p2HalftimeAction: HalftimeAction | null;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

interface DerbyActions {
  /**
   * Bulk-update the store from a Firebase DerbyMatchSnapshot.
   * Called by the listenToMatch callback in useDerbyMatchSync (App.tsx).
   *
   * @param snap - Normalised snapshot returned by listenToMatch
   */
  setFromFirebase: (snap: DerbyMatchSnapshot) => void;

  /** Reset to initial state (on leave, room dissolve, or new match) */
  reset: () => void;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: DerbyState = {
  phase: null,
  half: 1,
  duelIndex: 0,
  scoreHome: 0,
  scoreAway: 0,
  possession: null,
  kickoff: null,
  triviaIndex: 0,
  triviaBoost: null,
  p1LineupReady: false,
  p2LineupReady: false,
  p1Lineup: [],
  p2Lineup: [],
  p1Trivia: null,
  p2Trivia: null,
  p1CardReady: false,
  p2CardReady: false,
  p1Card: null,
  p2Card: null,
  resultAtkCard: null,
  resultDefCard: null,
  resultWinner: null,
  resultScored: false,
  p1HalftimeDone: false,
  p2HalftimeDone: false,
  p1HalftimeAction: null,
  p2HalftimeAction: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDerbyStore = create<DerbyState & DerbyActions>((set) => ({
  ...initialState,

  setFromFirebase(snap) {
    set({
      phase: snap.phase,
      half: snap.half,
      duelIndex: snap.duelIndex,
      scoreHome: snap.scoreHome,
      scoreAway: snap.scoreAway,
      possession: snap.possession,
      kickoff: snap.kickoff,
      triviaIndex: snap.triviaIndex,
      triviaBoost: snap.triviaBoost,
      p1LineupReady: snap.p1LineupReady,
      p2LineupReady: snap.p2LineupReady,
      p1Lineup: snap.p1Lineup,
      p2Lineup: snap.p2Lineup,
      p1Trivia: snap.p1Trivia,
      p2Trivia: snap.p2Trivia,
      p1CardReady: snap.p1CardReady,
      p2CardReady: snap.p2CardReady,
      p1Card: snap.p1Card,
      p2Card: snap.p2Card,
      resultAtkCard: snap.resultAtkCard,
      resultDefCard: snap.resultDefCard,
      resultWinner: snap.resultWinner,
      resultScored: snap.resultScored,
      p1HalftimeDone: snap.p1HalftimeDone,
      p2HalftimeDone: snap.p2HalftimeDone,
      p1HalftimeAction: snap.p1HalftimeAction,
      p2HalftimeAction: snap.p2HalftimeAction,
    });
  },

  reset() {
    set(initialState);
  },
}));
