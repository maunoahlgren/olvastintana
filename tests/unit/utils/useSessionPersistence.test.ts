/**
 * @file useSessionPersistence.test.ts
 * Unit tests for useSessionPersistence hook.
 *
 * localStorage is mocked via vitest's built-in fake-environment support.
 * Store state is reset before each test.
 *
 * Tests cover:
 *   - Saves session to localStorage on phase/roomCode changes
 *   - Clears localStorage when phase returns to TITLE
 *   - Restores Derby Night session (room + phase) on mount
 *   - Restores solo phase on mount
 *   - Does NOT restore TITLE from localStorage (redundant)
 *   - Silently clears malformed localStorage data on mount
 *   - Discards stale Derby sessions (> 6 hours) instead of restoring them
 *   - Restores fresh Derby sessions (< 6 hours) normally
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionPersistence } from '../../../src/utils/useSessionPersistence';
import { useMatchStore } from '../../../src/store/matchStore';
import { useRoomStore } from '../../../src/store/roomStore';
import { useSeasonStore } from '../../../src/store/seasonStore';
import { MATCH_PHASE } from '../../../src/engine/match';

const STORAGE_KEY = 'ot_session';

// ─── Mock localStorage ────────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
  useMatchStore.getState().reset();
  useRoomStore.getState().reset();
  useSeasonStore.getState().reset();
});

// ─── Save behaviour ───────────────────────────────────────────────────────────

describe('useSessionPersistence — save', () => {
  it('writes session to localStorage when in a non-TITLE phase', () => {
    // Put store in a Derby phase before mounting
    useMatchStore.getState().goToDerbyLobby();
    useRoomStore.getState().setRoom('TEST', 'host', 'olli_mehtonen');

    renderHook(() => useSessionPersistence());

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.stringContaining('TEST'),
    );
  });

  it('removes localStorage entry when phase transitions to TITLE', () => {
    // Start in Derby lobby, then reset to title
    useMatchStore.getState().goToDerbyLobby();
    renderHook(() => useSessionPersistence());

    act(() => {
      useMatchStore.getState().reset(); // resets to TITLE
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });
});

// ─── Restore — Derby phases ────────────────────────────────────────────────────

describe('useSessionPersistence — restore Derby session', () => {
  it('restores roomStore and matchStore from a Derby session', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      phase: MATCH_PHASE.DERBY_DUEL,
      roomCode: 'G7KP',
      role: 'host',
      myManagerId: 'olli_mehtonen',
      savedAt: Date.now(),
    }));

    renderHook(() => useSessionPersistence());

    expect(useRoomStore.getState().roomCode).toBe('G7KP');
    expect(useRoomStore.getState().role).toBe('host');
    expect(useRoomStore.getState().myManagerId).toBe('olli_mehtonen');
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.DERBY_DUEL);
  });

  it('restores all Derby match phases correctly', () => {
    const derbyPhases = [
      MATCH_PHASE.DERBY_LINEUP,
      MATCH_PHASE.DERBY_TRIVIA,
      MATCH_PHASE.DERBY_DUEL,
      MATCH_PHASE.DERBY_HALFTIME,
      MATCH_PHASE.DERBY_RESULT,
    ];

    for (const phase of derbyPhases) {
      useMatchStore.getState().reset();
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        phase,
        roomCode: 'ABCD',
        role: 'player',
        myManagerId: 'mauno_ahlgren',
        savedAt: Date.now(),
      }));

      renderHook(() => useSessionPersistence());

      expect(useMatchStore.getState().phase).toBe(phase);
      useMatchStore.getState().reset();
      useRoomStore.getState().reset();
    }
  });

  it('does NOT restore room state if roomCode is missing', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      phase: MATCH_PHASE.DERBY_DUEL,
      roomCode: null,
      role: 'host',
      myManagerId: 'olli_mehtonen',
      savedAt: Date.now(),
    }));

    renderHook(() => useSessionPersistence());

    // Phase should still restore (so user sees the right screen)
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.DERBY_DUEL);
    // But room state should remain empty
    expect(useRoomStore.getState().roomCode).toBeNull();
  });
});

// ─── Restore — solo phases ─────────────────────────────────────────────────────

describe('useSessionPersistence — restore solo phase', () => {
  it('restores solo FIRST_HALF phase', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      phase: MATCH_PHASE.FIRST_HALF,
      roomCode: null,
      role: null,
      myManagerId: null,
    }));

    renderHook(() => useSessionPersistence());

    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.FIRST_HALF);
  });

  it('restores solo LINEUP phase', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      phase: MATCH_PHASE.LINEUP,
      roomCode: null,
      role: null,
      myManagerId: null,
    }));

    renderHook(() => useSessionPersistence());

    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.LINEUP);
  });
});

// ─── Stale Derby session expiry ────────────────────────────────────────────────

describe('useSessionPersistence — Derby session expiry', () => {
  it('discards a Derby session older than 6 hours and stays on TITLE', () => {
    const staleAge = 7 * 60 * 60 * 1000; // 7 hours ago
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      phase: MATCH_PHASE.DERBY_DUEL,
      roomCode: 'OLD1',
      role: 'host',
      myManagerId: 'olli_mehtonen',
      savedAt: Date.now() - staleAge,
    }));

    renderHook(() => useSessionPersistence());

    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.TITLE);
    expect(useRoomStore.getState().roomCode).toBeNull();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });

  it('restores a Derby session younger than 6 hours normally', () => {
    const freshAge = 2 * 60 * 60 * 1000; // 2 hours ago
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      phase: MATCH_PHASE.DERBY_DUEL,
      roomCode: 'LIVE',
      role: 'host',
      myManagerId: 'olli_mehtonen',
      savedAt: Date.now() - freshAge,
    }));

    renderHook(() => useSessionPersistence());

    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.DERBY_DUEL);
    expect(useRoomStore.getState().roomCode).toBe('LIVE');
  });

  it('discards a Derby session with no savedAt timestamp (legacy data) — treats as stale', () => {
    // Sessions saved before this fix had no savedAt field; treat as expired
    // so old stale sessions don't block users on existing deployments.
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      phase: MATCH_PHASE.DERBY_DUEL,
      roomCode: 'NOTS',
      role: 'player',
      myManagerId: 'mauno_ahlgren',
      // no savedAt field
    }));

    renderHook(() => useSessionPersistence());

    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.TITLE);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
  });
});

// ─── PREMATCH safety guard ─────────────────────────────────────────────────────

describe('useSessionPersistence — PREMATCH safety guard', () => {
  it('falls back to SEASON when restoring PREMATCH with no fixture (empty seasonStore)', () => {
    // Simulate browser-back: session saved as PREMATCH but seasonStore is empty
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      phase: MATCH_PHASE.PREMATCH,
      roomCode: null,
      role: null,
      myManagerId: null,
    }));
    // seasonStore is already reset in beforeEach — getCurrentFixture returns null

    renderHook(() => useSessionPersistence());

    // Should restore to SEASON, not PREMATCH (avoids stuck "Loading..." screen)
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.SEASON);
  });

  it('restores PREMATCH normally when seasonStore has a current fixture', () => {
    // Pre-populate seasonStore with a fixture so getCurrentFixture is non-null
    useSeasonStore.setState({
      fixtures: [{
        matchNumber: 1,
        opponent: {
          id: 'test_opp',
          name: 'Test FC',
          tier: 'normal',
          strength_score: 50,
          seasons: 2,
          titles: 0,
          record: { w: 10, d: 5, l: 8 },
          goals: { for: 30, against: 25 },
          ppg: 1.2,
          win_rate: 0.43,
        },
        result: null,
      }],
      currentFixtureIndex: 0,
    });

    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      phase: MATCH_PHASE.PREMATCH,
      roomCode: null,
      role: null,
      myManagerId: null,
    }));

    renderHook(() => useSessionPersistence());

    // Fixture is available — PREMATCH should restore as-is
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.PREMATCH);
  });
});

// ─── Malformed data ────────────────────────────────────────────────────────────

describe('useSessionPersistence — malformed data', () => {
  it('clears storage and stays on TITLE if JSON is invalid', () => {
    localStorageMock.getItem.mockReturnValue('not-valid-json{{');

    renderHook(() => useSessionPersistence());

    expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.TITLE);
  });

  it('does nothing if localStorage is empty', () => {
    localStorageMock.getItem.mockReturnValue(null);

    renderHook(() => useSessionPersistence());

    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.TITLE);
    expect(useRoomStore.getState().roomCode).toBeNull();
  });
});
