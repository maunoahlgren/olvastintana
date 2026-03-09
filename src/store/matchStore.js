import { create } from 'zustand';
import { MATCH_PHASE, DUELS_PER_HALF, coinFlip, determineKickoff } from '../engine/match';

const initialState = {
  phase: MATCH_PHASE.TRIVIA,
  half: 1,
  duelIndex: 0,
  homeGoals: 0,
  awayGoals: 0,
  possession: null, // 'home' | 'away'
  kickoff: null,    // { firstHalf, secondHalf }
  // Halftime state
  halftimeActionUsed: false,
  // Active effects (from abilities / sattuma)
  effects: {
    home: [],
    away: [],
  },
};

export const useMatchStore = create((set, get) => ({
  ...initialState,

  startMatch() {
    const firstHalf = coinFlip();
    const kickoff = determineKickoff(firstHalf);
    set({
      ...initialState,
      phase: MATCH_PHASE.FIRST_HALF,
      possession: firstHalf,
      kickoff,
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
      if (half === 1) {
        set({ phase: MATCH_PHASE.HALFTIME, duelIndex: 0 });
      } else {
        set({ phase: MATCH_PHASE.RESULT });
      }
    } else {
      set({ duelIndex: next });
    }
  },

  startSecondHalf() {
    const { kickoff } = get();
    set({
      phase: MATCH_PHASE.SECOND_HALF,
      half: 2,
      duelIndex: 0,
      possession: kickoff.secondHalf,
      halftimeActionUsed: false,
    });
  },

  setPossession(side) {
    set({ possession: side });
  },

  useHalftimeAction() {
    set({ halftimeActionUsed: true });
  },

  addEffect(side, effect) {
    set((s) => ({
      effects: {
        ...s.effects,
        [side]: [...s.effects[side], effect],
      },
    }));
  },

  clearExpiredEffects(side) {
    set((s) => ({
      effects: {
        ...s.effects,
        [side]: s.effects[side].filter((e) => !e.expired),
      },
    }));
  },

  reset() {
    set(initialState);
  },
}));
