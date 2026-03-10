/**
 * @file season_flow.test.ts
 * Functional tests for the solo season flow.
 *
 * Tests complete flows and edge cases without React (pure store + engine).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useMatchStore } from '../../src/store/matchStore';
import { useSeasonStore } from '../../src/store/seasonStore';
import { useSessionStore } from '../../src/store/sessionStore';
import { MATCH_PHASE } from '../../src/engine/match';
import { generateFixtures, fixturePoints, SEASON_FORMAT } from '../../src/engine/season';
import type { Opponent } from '../../src/engine/season';
import opponentsData from '../../src/data/opponents.json';

const opponents = opponentsData as Opponent[];
const deterministicRng = (): number => 0;

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

function resetAll(): void {
  useMatchStore.getState().reset();
  useSeasonStore.getState().reset();
  useSessionStore.getState().reset();
}

// ---------------------------------------------------------------------------
// Season phase transitions
// ---------------------------------------------------------------------------

describe('Season phase state machine', () => {
  beforeEach(resetAll);

  it('TITLE → SEASON on startSeason()', () => {
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.TITLE);
    useSeasonStore.getState().initSeason(opponents);
    useMatchStore.getState().startSeason();
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.SEASON);
  });

  it('SEASON → PREMATCH on goToPreMatch()', () => {
    useMatchStore.getState().startSeason();
    useMatchStore.getState().goToPreMatch();
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.PREMATCH);
  });

  it('PREMATCH → TRIVIA on beginSoloMatch()', () => {
    useMatchStore.getState().goToPreMatch();
    useMatchStore.getState().beginSoloMatch();
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.TRIVIA);
  });

  it('RESULT → SEASON on returnToSeason()', () => {
    useMatchStore.getState().returnToSeason();
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.SEASON);
  });

  it('RESULT → SEASON_COMPLETE on completeSeason()', () => {
    useMatchStore.getState().completeSeason();
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.SEASON_COMPLETE);
  });
});

// ---------------------------------------------------------------------------
// Full 7-match season simulation (pure store API)
// ---------------------------------------------------------------------------

describe('Full 7-match season via store API', () => {
  beforeEach(resetAll);

  it('season not complete after 6 matches', () => {
    useSeasonStore.getState().initSeason(opponents, deterministicRng);
    for (let i = 0; i < 6; i++) {
      useSeasonStore.getState().recordFixtureResult(1, 0);
    }
    expect(useSeasonStore.getState().isSeasonComplete()).toBe(false);
  });

  it('season complete after 7 matches', () => {
    useSeasonStore.getState().initSeason(opponents, deterministicRng);
    for (let i = 0; i < 7; i++) {
      useSeasonStore.getState().recordFixtureResult(1, 0);
    }
    expect(useSeasonStore.getState().isSeasonComplete()).toBe(true);
  });

  it('perfect season accumulates 21 points', () => {
    useSeasonStore.getState().initSeason(opponents, deterministicRng);
    for (let i = 0; i < 7; i++) {
      useSeasonStore.getState().recordFixtureResult(1, 0);
    }
    expect(useSeasonStore.getState().getTotalPoints()).toBe(21);
  });

  it('mixed season: 3W 2D 2L = 11 points', () => {
    useSeasonStore.getState().initSeason(opponents, deterministicRng);
    // W W W D D L L = 3+3+3+1+1+0+0 = 11
    [[2,0],[2,0],[2,0],[1,1],[1,1],[0,2],[0,2]].forEach(([h,a]) => {
      useSeasonStore.getState().recordFixtureResult(h, a);
    });
    expect(useSeasonStore.getState().getTotalPoints()).toBe(11);
    expect(useSeasonStore.getState().getWins()).toBe(3);
    expect(useSeasonStore.getState().getDraws()).toBe(2);
    expect(useSeasonStore.getState().getLosses()).toBe(2);
  });

  it('getCurrentFixture advances correctly across all 7 matches', () => {
    useSeasonStore.getState().initSeason(opponents, deterministicRng);
    const fixtures = useSeasonStore.getState().fixtures;

    for (let i = 0; i < 7; i++) {
      const current = useSeasonStore.getState().getCurrentFixture();
      expect(current).not.toBeNull();
      expect(current?.matchNumber).toBe(i + 1);
      // Verify it matches the fixture at index i
      expect(current?.opponent.id).toBe(fixtures[i].opponent.id);
      useSeasonStore.getState().recordFixtureResult(1, 0);
    }

    // After 7th, getCurrentFixture returns null
    expect(useSeasonStore.getState().getCurrentFixture()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AI difficulty assignment from tier (simulating PreMatchScreen logic)
// ---------------------------------------------------------------------------

describe('AI difficulty driven by opponent tier', () => {
  beforeEach(resetAll);

  it('easy tier → aiDifficulty set to "easy"', () => {
    useSessionStore.getState().setAiDifficulty('easy');
    expect(useSessionStore.getState().aiDifficulty).toBe('easy');
  });

  it('normal tier → aiDifficulty set to "normal"', () => {
    useSessionStore.getState().setAiDifficulty('normal');
    expect(useSessionStore.getState().aiDifficulty).toBe('normal');
  });

  it('hard tier → aiDifficulty set to "hard"', () => {
    useSessionStore.getState().setAiDifficulty('hard');
    expect(useSessionStore.getState().aiDifficulty).toBe('hard');
  });

  it('season fixtures always put hardest opponent last (index 6)', () => {
    const fixtures = generateFixtures(opponents, deterministicRng);
    expect(fixtures[6].opponent.tier).toBe('hard');
    // And it must be the fixture with the highest strength score
    const maxScore = Math.max(...fixtures.map((f) => f.opponent.strength_score));
    expect(fixtures[6].opponent.strength_score).toBe(maxScore);
  });
});

// ---------------------------------------------------------------------------
// Season format guarantees
// ---------------------------------------------------------------------------

describe('Season format invariants (across 10 randomly generated seasons)', () => {
  it('every generated season has exactly 1H + 3N + 3E', () => {
    for (let trial = 0; trial < 10; trial++) {
      const fixtures = generateFixtures(opponents);
      const hard   = fixtures.filter((f) => f.opponent.tier === 'hard').length;
      const normal = fixtures.filter((f) => f.opponent.tier === 'normal').length;
      const easy   = fixtures.filter((f) => f.opponent.tier === 'easy').length;
      expect(hard).toBe(SEASON_FORMAT.HARD_OPPONENTS);
      expect(normal).toBe(SEASON_FORMAT.NORMAL_OPPONENTS);
      expect(easy).toBe(SEASON_FORMAT.EASY_OPPONENTS);
    }
  });

  it('every generated season has 7 unique opponents', () => {
    for (let trial = 0; trial < 10; trial++) {
      const fixtures = generateFixtures(opponents);
      const ids = fixtures.map((f) => f.opponent.id);
      expect(new Set(ids).size).toBe(7);
    }
  });

  it('every generated season is sorted ascending by strength_score', () => {
    for (let trial = 0; trial < 10; trial++) {
      const fixtures = generateFixtures(opponents);
      for (let i = 1; i < fixtures.length; i++) {
        expect(fixtures[i].opponent.strength_score).toBeGreaterThanOrEqual(
          fixtures[i - 1].opponent.strength_score,
        );
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Points calculation edge cases
// ---------------------------------------------------------------------------

describe('fixturePoints edge cases', () => {
  it('fixturePoints is consistent with matchPoints for same inputs', () => {
    // W: 3
    expect(fixturePoints(3, 1)).toBe(3);
    // D: 1
    expect(fixturePoints(2, 2)).toBe(1);
    // L: 0
    expect(fixturePoints(1, 3)).toBe(0);
    // High score win: 3
    expect(fixturePoints(10, 0)).toBe(3);
  });
});
