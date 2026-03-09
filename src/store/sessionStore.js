import { create } from 'zustand';

/**
 * Session store — tracks current game mode and multiplayer state.
 * Firebase multiplayer integration comes in Phase 3.
 */
export const useSessionStore = create((set) => ({
  mode: null, // 'solo' | 'derby_night'
  language: 'en',
  roomId: null,      // Firebase room ID (Phase 3)
  playerId: null,    // local player identifier

  setMode(mode) {
    set({ mode });
    // Derby Night always starts in Finnish
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
    set({ mode: null, language: 'en', roomId: null, playerId: null });
  },
}));
