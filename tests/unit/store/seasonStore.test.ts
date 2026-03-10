/**
 * @file seasonStore.test.ts
 * Unit tests for the seasonStore Zustand store.
 *
 * Tests store actions in isolation using only store API (no React).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useSeasonStore } from '../../../src/store/seasonStore';
import type { Opponent } from '../../../src/engine/season';
import opponentsData from '../../../src/data/opponents.json';

const opponents = opponentsData as Opponent[];

/** Deterministic RNG — always picks first item after shuffle (no real randomness) */
const deterministicRng = (): number => 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Init a season with deterministic RNG so test results are consistent.
 */
function initDeterministicSeason(): void {
  useSeasonStore.getState().initSeason(opponents, deterministicRng);
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('seasonStore — initial state', () => {
  beforeEach(() => {
    useSeasonStore.getState().reset();
  });

  it('has no fixtures on reset', () => {
    expect(useSeasonStore.getState().fixtures).toHaveLength(0);
  });

  it('currentFixtureIndex is 0 on reset', () => {
    expect(useSeasonStore.getState().currentFixtureIndex).toBe(0);
  });

  it('getTotalPoints returns 0 when no fixtures', () => {
    expect(useSeasonStore.getState().getTotalPoints()).toBe(0);
  });

  it('isSeasonComplete returns false when no fixtures', () => {
    expect(useSeasonStore.getState().isSeasonComplete()).toBe(false);
  });

  it('getCurrentFixture returns null when no fixtures', () => {
    expect(useSeasonStore.getState().getCurrentFixture()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// initSeason
// ---------------------------------------------------------------------------

describe('seasonStore — initSeason()', () => {
  beforeEach(() => {
    useSeasonStore.getState().reset();
  });

  it('populates 7 fixtures', () => {
    initDeterministicSeason();
    expect(useSeasonStore.getState().fixtures).toHaveLength(7);
  });

  it('resets currentFixtureIndex to 0', () => {
    initDeterministicSeason();
    expect(useSeasonStore.getState().currentFixtureIndex).toBe(0);
  });

  it('all fixture results are null', () => {
    initDeterministicSeason();
    useSeasonStore.getState().fixtures.forEach((f) => expect(f.result).toBeNull());
  });

  it('getCurrentFixture returns fixture 0 after init', () => {
    initDeterministicSeason();
    const fix = useSeasonStore.getState().getCurrentFixture();
    expect(fix).not.toBeNull();
    expect(fix?.matchNumber).toBe(1);
  });

  it('re-calling initSeason resets a partially played season', () => {
    initDeterministicSeason();
    useSeasonStore.getState().recordFixtureResult(2, 1);
    expect(useSeasonStore.getState().currentFixtureIndex).toBe(1);

    initDeterministicSeason();
    expect(useSeasonStore.getState().currentFixtureIndex).toBe(0);
    expect(useSeasonStore.getState().getTotalPoints()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// recordFixtureResult
// ---------------------------------------------------------------------------

describe('seasonStore — recordFixtureResult()', () => {
  beforeEach(() => {
    useSeasonStore.getState().reset();
    initDeterministicSeason();
  });

  it('records a win: stores 3 points', () => {
    useSeasonStore.getState().recordFixtureResult(2, 0);
    expect(useSeasonStore.getState().fixtures[0].result?.points).toBe(3);
  });

  it('records a draw: stores 1 point', () => {
    useSeasonStore.getState().recordFixtureResult(1, 1);
    expect(useSeasonStore.getState().fixtures[0].result?.points).toBe(1);
  });

  it('records a loss: stores 0 points', () => {
    useSeasonStore.getState().recordFixtureResult(0, 3);
    expect(useSeasonStore.getState().fixtures[0].result?.points).toBe(0);
  });

  it('advances currentFixtureIndex after recording', () => {
    expect(useSeasonStore.getState().currentFixtureIndex).toBe(0);
    useSeasonStore.getState().recordFixtureResult(1, 0);
    expect(useSeasonStore.getState().currentFixtureIndex).toBe(1);
  });

  it('does not advance beyond fixture count', () => {
    // Play all 7 fixtures
    for (let i = 0; i < 7; i++) {
      useSeasonStore.getState().recordFixtureResult(1, 0);
    }
    expect(useSeasonStore.getState().currentFixtureIndex).toBe(7);
    // Extra call is a no-op
    useSeasonStore.getState().recordFixtureResult(1, 0);
    expect(useSeasonStore.getState().currentFixtureIndex).toBe(7);
  });

  it('stores homeGoals and awayGoals on the fixture', () => {
    useSeasonStore.getState().recordFixtureResult(3, 1);
    const result = useSeasonStore.getState().fixtures[0].result;
    expect(result?.homeGoals).toBe(3);
    expect(result?.awayGoals).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// getTotalPoints / getWins / getDraws / getLosses
// ---------------------------------------------------------------------------

describe('seasonStore — points and record aggregation', () => {
  beforeEach(() => {
    useSeasonStore.getState().reset();
    initDeterministicSeason();
  });

  it('getTotalPoints accumulates across played fixtures', () => {
    useSeasonStore.getState().recordFixtureResult(2, 0); // 3 pts
    useSeasonStore.getState().recordFixtureResult(1, 1); // 1 pt
    useSeasonStore.getState().recordFixtureResult(0, 2); // 0 pts
    expect(useSeasonStore.getState().getTotalPoints()).toBe(4);
  });

  it('getWins counts correctly', () => {
    useSeasonStore.getState().recordFixtureResult(2, 0);
    useSeasonStore.getState().recordFixtureResult(1, 0);
    useSeasonStore.getState().recordFixtureResult(0, 1);
    expect(useSeasonStore.getState().getWins()).toBe(2);
  });

  it('getDraws counts correctly', () => {
    useSeasonStore.getState().recordFixtureResult(1, 1);
    useSeasonStore.getState().recordFixtureResult(0, 0);
    useSeasonStore.getState().recordFixtureResult(2, 1);
    expect(useSeasonStore.getState().getDraws()).toBe(2);
  });

  it('getLosses counts correctly', () => {
    useSeasonStore.getState().recordFixtureResult(0, 3);
    useSeasonStore.getState().recordFixtureResult(1, 0);
    expect(useSeasonStore.getState().getLosses()).toBe(1);
  });

  it('perfect season: 7 wins = 21 points', () => {
    for (let i = 0; i < 7; i++) {
      useSeasonStore.getState().recordFixtureResult(3, 0);
    }
    expect(useSeasonStore.getState().getTotalPoints()).toBe(21);
    expect(useSeasonStore.getState().getWins()).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// isSeasonComplete
// ---------------------------------------------------------------------------

describe('seasonStore — isSeasonComplete()', () => {
  beforeEach(() => {
    useSeasonStore.getState().reset();
    initDeterministicSeason();
  });

  it('false when no fixtures played', () => {
    expect(useSeasonStore.getState().isSeasonComplete()).toBe(false);
  });

  it('false after 6 of 7 fixtures played', () => {
    for (let i = 0; i < 6; i++) {
      useSeasonStore.getState().recordFixtureResult(1, 0);
    }
    expect(useSeasonStore.getState().isSeasonComplete()).toBe(false);
  });

  it('true after all 7 fixtures played', () => {
    for (let i = 0; i < 7; i++) {
      useSeasonStore.getState().recordFixtureResult(1, 0);
    }
    expect(useSeasonStore.getState().isSeasonComplete()).toBe(true);
  });
});
