/**
 * @file matchStore.ts
 * Zustand store for match state.
 *
 * Tracks the active match phase, score, possession, duel index,
 * halftime actions, trivia result, and active card effects.
 *
 * Phase flow:
 *   TITLE → TRIVIA → LINEUP → FIRST_HALF → HALFTIME → SECOND_HALF → RESULT
 */

import { create } from 'zustand';
import { MATCH_PHASE, DUELS_PER_HALF, type MatchPhase, type Tactic } from '../engine/match';
import { coinFlip, secondHalfKickoff, type Side } from '../engine/possession';
import type { CardChoice } from '../engine/ai';
import type { PlayerStats } from '../engine/duel';

/** An active effect applied to one side (from abilities or Sattuma) */
export interface ActiveEffect {
  id: string;
  source: string;
  expiresAfterDuel?: number; // duel index at which this expires
  expiresAtHalftime?: boolean;
  expired: boolean;
  /**
   * Optional stat modifier carried by this effect (e.g. Kapteeni +2 boost).
   * Applied additively to the affected side's stats in the next duel.
   */
  statMod?: Partial<PlayerStats>;
}

interface MatchState {
  phase: MatchPhase;
  half: 1 | 2;
  duelIndex: number;
  homeGoals: number;
  awayGoals: number;
  possession: Side | null;
  firstHalfKickoff: Side | null;
  halftimeActionUsed: boolean;
  homeTactic: Tactic | null;
  awayTactic: Tactic | null;
  effects: { home: ActiveEffect[]; away: ActiveEffect[] };
  /** Result of the pre-match trivia question */
  triviaResult: 'correct' | 'wrong' | null;
  /** True when the home side's first card of the match auto-wins (trivia correct) */
  triviaBoostActive: boolean;
  /**
   * Rolling history of the last 3 cards played by the human player (home side).
   * Used by the Hard AI to identify and counter the player's tendencies.
   */
  playerCardHistory: CardChoice[];
}

interface MatchActions {
  /**
   * TITLE → SEASON: generate season fixtures and navigate to the season hub.
   * Called when "Start Season" is clicked on TitleScreen.
   */
  startSeason: () => void;
  /**
   * SEASON → PREMATCH: navigate to the pre-match screen for the next fixture.
   * Called when "Play Next Match" is clicked on SeasonScreen.
   */
  goToPreMatch: () => void;
  /**
   * RESULT → SEASON: return to the season hub after a match.
   * Called from ResultScreen when there are still fixtures left to play.
   */
  returnToSeason: () => void;
  /**
   * RESULT → SEASON_COMPLETE: transition to season-complete screen.
   * Called from ResultScreen when all 7 fixtures have been played.
   */
  completeSeason: () => void;
  /** TITLE → TRIVIA: coin flip to decide first-half kickoff side */
  beginSoloMatch: () => void;
  /** Trivia answered correctly: activate first-duel boost, advance to LINEUP */
  triviaCorrect: () => void;
  /** Trivia answered incorrectly: skip boost, advance to LINEUP */
  triviaWrong: () => void;
  /** LINEUP → FIRST_HALF */
  startFirstHalf: () => void;
  /** Legacy: kept for backward compat — goes straight to LINEUP with a coin flip */
  startMatch: () => void;
  scoreGoal: (side: Side) => void;
  advanceDuel: () => void;
  startSecondHalf: () => void;
  setPossession: (side: Side) => void;
  useHalftimeAction: () => void;
  setTactic: (side: Side, tactic: Tactic) => void;
  /**
   * Append a card to the human player's (home) card history.
   * Keeps only the most recent 3 entries.
   */
  recordPlayerCard: (card: CardChoice) => void;
  addEffect: (side: Side, effect: ActiveEffect) => void;
  expireEffect: (side: Side, effectId: string) => void;
  clearHalftimeEffects: (side: Side) => void;
  reset: () => void;
}

const initialState: MatchState = {
  phase: MATCH_PHASE.TITLE,
  half: 1,
  duelIndex: 0,
  homeGoals: 0,
  awayGoals: 0,
  possession: null,
  firstHalfKickoff: null,
  halftimeActionUsed: false,
  homeTactic: null,
  awayTactic: null,
  effects: { home: [], away: [] },
  triviaResult: null,
  triviaBoostActive: false,
  playerCardHistory: [],
};

export const useMatchStore = create<MatchState & MatchActions>((set, get) => ({
  ...initialState,

  startSeason() {
    set({ phase: MATCH_PHASE.SEASON });
  },

  goToPreMatch() {
    set({ phase: MATCH_PHASE.PREMATCH });
  },

  returnToSeason() {
    set({ phase: MATCH_PHASE.SEASON });
  },

  completeSeason() {
    set({ phase: MATCH_PHASE.SEASON_COMPLETE });
  },

  beginSoloMatch() {
    const kick = coinFlip();
    set({
      ...initialState,
      phase: MATCH_PHASE.TRIVIA,
      possession: kick,
      firstHalfKickoff: kick,
    });
  },

  triviaCorrect() {
    set({ triviaResult: 'correct', triviaBoostActive: true, phase: MATCH_PHASE.LINEUP });
  },

  triviaWrong() {
    set({ triviaResult: 'wrong', triviaBoostActive: false, phase: MATCH_PHASE.LINEUP });
  },

  startFirstHalf() {
    set({ phase: MATCH_PHASE.FIRST_HALF });
  },

  startMatch() {
    const kick = coinFlip();
    set({
      ...initialState,
      phase: MATCH_PHASE.LINEUP,
      possession: kick,
      firstHalfKickoff: kick,
    });
  },

  scoreGoal(side) {
    set((s) => ({
      homeGoals: side === 'home' ? s.homeGoals + 1 : s.homeGoals,
      awayGoals: side === 'away' ? s.awayGoals + 1 : s.awayGoals,
    }));
  },

  advanceDuel() {
    const { duelIndex, half, triviaBoostActive } = get();
    const next = duelIndex + 1;
    // Trivia boost expires after the first duel of the match
    const boostClear = triviaBoostActive ? { triviaBoostActive: false } : {};
    if (next >= DUELS_PER_HALF) {
      set({ phase: half === 1 ? MATCH_PHASE.HALFTIME : MATCH_PHASE.RESULT, duelIndex: 0, ...boostClear });
    } else {
      set({ duelIndex: next, ...boostClear });
    }
  },

  startSecondHalf() {
    const { firstHalfKickoff } = get();
    set({
      phase: MATCH_PHASE.SECOND_HALF,
      half: 2,
      duelIndex: 0,
      possession: firstHalfKickoff ? secondHalfKickoff(firstHalfKickoff) : 'away',
      halftimeActionUsed: false,
    });
  },

  setPossession(side) {
    set({ possession: side });
  },

  useHalftimeAction() {
    set({ halftimeActionUsed: true });
  },

  setTactic(side, tactic) {
    set(side === 'home' ? { homeTactic: tactic } : { awayTactic: tactic });
  },

  recordPlayerCard(card) {
    set((s) => ({
      playerCardHistory: [...s.playerCardHistory, card].slice(-3),
    }));
  },

  addEffect(side, effect) {
    set((s) => ({
      effects: { ...s.effects, [side]: [...s.effects[side], effect] },
    }));
  },

  expireEffect(side, effectId) {
    set((s) => ({
      effects: {
        ...s.effects,
        [side]: s.effects[side].map((e) =>
          e.id === effectId ? { ...e, expired: true } : e,
        ),
      },
    }));
  },

  clearHalftimeEffects(side) {
    set((s) => ({
      effects: {
        ...s.effects,
        [side]: s.effects[side].filter((e) => !e.expiresAtHalftime),
      },
    }));
  },

  reset() {
    set(initialState);
  },
}));
