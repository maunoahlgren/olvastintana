/**
 * @file season.test.ts
 * Unit tests for the season engine pure functions.
 *
 * Tests: generateFixtures, fixturePoints
 * All functions are pure — no React or Zustand required.
 */

import { describe, it, expect } from 'vitest';
import {
  generateFixtures,
  fixturePoints,
  SEASON_FORMAT,
  type Opponent,
} from '../../../src/engine/season';
import opponentsData from '../../../src/data/opponents.json';

// ---------------------------------------------------------------------------
// Test fixtures / helpers
// ---------------------------------------------------------------------------

const opponents = opponentsData as Opponent[];

/** Deterministic RNG that always returns 0 (first element in every shuffle) */
const deterministicRng = (): number => 0;

// ---------------------------------------------------------------------------
// generateFixtures
// ---------------------------------------------------------------------------

describe('generateFixtures()', () => {
  it('returns exactly 7 fixtures', () => {
    const fixtures = generateFixtures(opponents);
    expect(fixtures).toHaveLength(SEASON_FORMAT.TOTAL_MATCHES);
  });

  it('includes exactly 1 hard opponent', () => {
    const fixtures = generateFixtures(opponents);
    const hard = fixtures.filter((f) => f.opponent.tier === 'hard');
    expect(hard).toHaveLength(SEASON_FORMAT.HARD_OPPONENTS);
  });

  it('includes exactly 3 normal opponents', () => {
    const fixtures = generateFixtures(opponents);
    const normal = fixtures.filter((f) => f.opponent.tier === 'normal');
    expect(normal).toHaveLength(SEASON_FORMAT.NORMAL_OPPONENTS);
  });

  it('includes exactly 3 easy opponents', () => {
    const fixtures = generateFixtures(opponents);
    const easy = fixtures.filter((f) => f.opponent.tier === 'easy');
    expect(easy).toHaveLength(SEASON_FORMAT.EASY_OPPONENTS);
  });

  it('fixtures are sorted ascending by strength_score (easiest first)', () => {
    const fixtures = generateFixtures(opponents);
    for (let i = 1; i < fixtures.length; i++) {
      expect(fixtures[i].opponent.strength_score).toBeGreaterThanOrEqual(
        fixtures[i - 1].opponent.strength_score,
      );
    }
  });

  it('hard opponent is always last (highest strength_score)', () => {
    const fixtures = generateFixtures(opponents);
    expect(fixtures[fixtures.length - 1].opponent.tier).toBe('hard');
  });

  it('all results are null (no match played yet)', () => {
    const fixtures = generateFixtures(opponents);
    fixtures.forEach((f) => expect(f.result).toBeNull());
  });

  it('matchNumber is 1-indexed from 1 to 7', () => {
    const fixtures = generateFixtures(opponents);
    fixtures.forEach((f, i) => expect(f.matchNumber).toBe(i + 1));
  });

  it('all selected opponents are from the provided pool', () => {
    const fixtures = generateFixtures(opponents);
    const poolIds = new Set(opponents.map((o) => o.id));
    fixtures.forEach((f) => expect(poolIds.has(f.opponent.id)).toBe(true));
  });

  it('no duplicate opponents in one season', () => {
    const fixtures = generateFixtures(opponents);
    const ids = fixtures.map((f) => f.opponent.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(7);
  });

  it('works with deterministic RNG', () => {
    const f1 = generateFixtures(opponents, deterministicRng);
    const f2 = generateFixtures(opponents, deterministicRng);
    // Same RNG should produce same selection
    expect(f1.map((f) => f.opponent.id)).toEqual(f2.map((f) => f.opponent.id));
  });

  it('works with real Math.random (smoke test — no errors)', () => {
    expect(() => generateFixtures(opponents)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// fixturePoints
// ---------------------------------------------------------------------------

describe('fixturePoints()', () => {
  it('home win → 3 points', () => {
    expect(fixturePoints(3, 1)).toBe(3);
  });

  it('draw → 1 point', () => {
    expect(fixturePoints(2, 2)).toBe(1);
  });

  it('0–0 draw → 1 point', () => {
    expect(fixturePoints(0, 0)).toBe(1);
  });

  it('home loss → 0 points', () => {
    expect(fixturePoints(1, 4)).toBe(0);
  });

  it('1–0 home win → 3 points', () => {
    expect(fixturePoints(1, 0)).toBe(3);
  });

  it('0–1 home loss → 0 points', () => {
    expect(fixturePoints(0, 1)).toBe(0);
  });
});
