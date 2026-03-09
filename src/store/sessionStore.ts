/**
 * @file sessionStore.ts
 * Zustand store for session state.
 *
 * Tracks game mode, active language, and Firebase room info (Phase 3).
 */

import { create } from 'zustand';

export type GameMode = 'solo' | 'derby_night';
export type Language = 'fi' | 'en';

interface SessionState {
  mode: GameMode | null;
  language: Language;
  roomId: string | null;
  playerId: string | null;
}

interface SessionActions {
  setMode: (mode: GameMode) => void;
  setLanguage: (lang: Language) => void;
  setRoom: (roomId: string, playerId: string) => void;
  reset: () => void;
}

const initialState: SessionState = {
  mode: null,
  language: 'fi', // Finnish is the default language
  roomId: null,
  playerId: null,
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

  reset() {
    set(initialState);
  },
}));
