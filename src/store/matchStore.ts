/**
 * @file matchStore.ts
 * Zustand store for match state.
 *
 * Tracks the active match phase, score, possession, duel index,
 * halftime actions, and active card effects.
 */

import { create } from 'zustand';
import { MATCH_PHASE, DUELS_PER_HALF, type MatchPhase, type Tactic } from '../engine/match';
import { coinFlip, secondHalfKickoff, type Side } from '../engine/possession';

/** An active effect applied to one side (from abilities or Sattuma) */
export interface ActiveEffect {
  id: string;
  source: string;
  expiresAfterDuel?: number; // duel index at which this expires
  expiresAtHalftime?: boolean;
  expired: boolean;
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
}

interface MatchActions {
  startMatch: () => void;
  scoreGoal: (side: Side) => void;
  advanceDuel: () => void;
  startSecondHalf: () => void;
  setPossession: (side: Side) => void;
  useHalftimeAction: () => void;
  setTactic: (side: Side, tactic: Tactic) => void;
  addEffect: (side: Side, effect: ActiveEffect) => void;
  expireEffect: (side: Side, effectId: string) => void;
  clearHalftimeEffects: (side: Side) => void;
  reset: () => void;
}

const initialState: MatchState = {
  phase: MATCH_PHASE.TRIVIA,
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
};

export const useMatchStore = create<MatchState & MatchActions>((set, get) => ({
  ...initialState,

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
    const { duelIndex, half } = get();
    const next = duelIndex + 1;
    if (next >= DUELS_PER_HALF) {
      set({ phase: half === 1 ? MATCH_PHASE.HALFTIME : MATCH_PHASE.RESULT, duelIndex: 0 });
    } else {
      set({ duelIndex: next });
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
