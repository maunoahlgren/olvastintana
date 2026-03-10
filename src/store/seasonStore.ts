/**
 * @file seasonStore.ts
 * Zustand store for solo season state.
 *
 * Tracks the 7-match season: fixture list, current fixture index,
 * and results for all played fixtures.
 *
 * Season format:
 *   1 Hard + 3 Normal + 3 Easy opponents, sorted easy → hard.
 *   Points: Win=3, Draw=1, Loss=0
 *
 * State transitions:
 *   initSeason() → fixtures populated, index = 0
 *   recordFixtureResult() → stores result at current index, advances index
 *   isSeasonComplete() → true when all 7 fixtures have results
 *
 * Note: Derby Night multi-manager standings will be tracked separately (Phase 2).
 */

import { create } from 'zustand';
import {
  generateFixtures,
  fixturePoints,
  type Fixture,
  type Opponent,
  type FixtureResult,
} from '../engine/season';

// ---------------------------------------------------------------------------
// State + Actions interfaces
// ---------------------------------------------------------------------------

interface SeasonState {
  /** The 7 fixtures for the current season. Empty array = no active season. */
  fixtures: Fixture[];
  /** Index of the next fixture to be played (0–6). Equals fixtures.length when all done. */
  currentFixtureIndex: number;
}

interface SeasonActions {
  /**
   * Generate a fresh 7-match season from the opponents pool and reset all state.
   * Called when the player clicks "Start Season" or "New Season".
   *
   * @param opponents - Full opponents pool from opponents.json
   * @param rng - Optional RNG for deterministic testing
   *
   * @example
   * import opponentsData from '../data/opponents.json';
   * useSeasonStore.getState().initSeason(opponentsData as Opponent[]);
   */
  initSeason: (opponents: Opponent[], rng?: () => number) => void;

  /**
   * Record the result of the current fixture and advance the index.
   * Must be called from ResultScreen after a match concludes.
   *
   * @param homeGoals - Goals scored by Olvastin Tana
   * @param awayGoals - Goals scored by the opponent
   *
   * @example
   * useSeasonStore.getState().recordFixtureResult(2, 1); // win, 3 pts
   */
  recordFixtureResult: (homeGoals: number, awayGoals: number) => void;

  /**
   * Return the current (next to play) fixture, or null if the season is complete.
   *
   * @returns Current Fixture or null
   *
   * @example
   * const fix = useSeasonStore.getState().getCurrentFixture();
   * fix?.opponent.tier // 'easy' | 'normal' | 'hard'
   */
  getCurrentFixture: () => Fixture | null;

  /**
   * Return total season points accumulated from all played fixtures.
   *
   * @returns Sum of fixture result points (0–21)
   */
  getTotalPoints: () => number;

  /**
   * Return the number of wins from played fixtures.
   * @returns Win count (0–7)
   */
  getWins: () => number;

  /**
   * Return the number of draws from played fixtures.
   * @returns Draw count (0–7)
   */
  getDraws: () => number;

  /**
   * Return the number of losses from played fixtures.
   * @returns Loss count (0–7)
   */
  getLosses: () => number;

  /**
   * True when the season has 7 fixtures and all have been played.
   *
   * @returns boolean
   */
  isSeasonComplete: () => boolean;

  /** Reset all season state. */
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: SeasonState = {
  fixtures: [],
  currentFixtureIndex: 0,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSeasonStore = create<SeasonState & SeasonActions>((set, get) => ({
  ...initialState,

  initSeason(opponents, rng) {
    const fixtures = generateFixtures(opponents, rng);
    set({ fixtures, currentFixtureIndex: 0 });
  },

  recordFixtureResult(homeGoals, awayGoals) {
    const { fixtures, currentFixtureIndex } = get();
    if (currentFixtureIndex >= fixtures.length) return; // guard: no active fixture

    const pts = fixturePoints(homeGoals, awayGoals);
    const updated: Fixture[] = fixtures.map((f, i) =>
      i === currentFixtureIndex
        ? { ...f, result: { homeGoals, awayGoals, points: pts } }
        : f,
    );
    set({
      fixtures: updated,
      currentFixtureIndex: currentFixtureIndex + 1,
    });
  },

  getCurrentFixture() {
    const { fixtures, currentFixtureIndex } = get();
    return fixtures[currentFixtureIndex] ?? null;
  },

  getTotalPoints() {
    return get().fixtures.reduce((sum, f) => sum + (f.result?.points ?? 0), 0);
  },

  getWins() {
    return get().fixtures.filter(
      (f) => f.result !== null && f.result.homeGoals > f.result.awayGoals,
    ).length;
  },

  getDraws() {
    return get().fixtures.filter(
      (f) => f.result !== null && f.result.homeGoals === f.result.awayGoals,
    ).length;
  },

  getLosses() {
    return get().fixtures.filter(
      (f) => f.result !== null && f.result.homeGoals < f.result.awayGoals,
    ).length;
  },

  isSeasonComplete() {
    const { fixtures } = get();
    return fixtures.length > 0 && fixtures.every((f) => f.result !== null);
  },

  reset() {
    set(initialState);
  },
}));

// Re-export engine types so consumers can import from one place
export type { Opponent, Fixture, FixtureResult };
