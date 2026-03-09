/**
 * @file sessionStore.ts
 * Zustand store for session state.
 *
 * Tracks game mode, active language, and Firebase room info (Phase 3).
 */

import { create } from 'zustand';

export type GameMode = 'solo' | 'derby_night';
export type Language = 'fi' | 'en';
/** AI difficulty; null = two-player (pass-and-play) mode */
export type AiDifficulty = 'easy' | 'normal' | 'hard';

interface SessionState {
  mode: GameMode | null;
  language: Language;
  roomId: string | null;
  playerId: string | null;
  /** Active AI difficulty. null = two-player pass-and-play (no AI). */
  aiDifficulty: AiDifficulty | null;
}

interface SessionActions {
  setMode: (mode: GameMode) => void;
  setLanguage: (lang: Language) => void;
  setRoom: (roomId: string, playerId: string) => void;
  /** Set or clear the AI difficulty. Pass null to revert to two-player mode. */
  setAiDifficulty: (difficulty: AiDifficulty | null) => void;
  reset: () => void;
}

const initialState: SessionState = {
  mode: null,
  language: 'fi', // Finnish is the default language
  roomId: null,
  playerId: null,
  aiDifficulty: 'normal', // default to Normal AI for solo matches
};

export const useSessionStore = create<SessionState & SessionActions>((set) => ({
  ...initialState,

  setMode(mode) {
    set({ mode });
    // Derby Night always uses Finnish
    if (mode === 'derby_night') {
      set({ language: 'fi' });
    }
  },

  setLanguage(lang) {
    set({ language: lang });
  },

  setRoom(roomId, playerId) {
    set({ roomId, playerId });
  },

  setAiDifficulty(difficulty) {
    set({ aiDifficulty: difficulty });
  },

  reset() {
    set(initialState);
  },
}));
