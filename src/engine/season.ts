/**
 * @file season.ts
 * Solo season fixture generation — pure functions.
 *
 * Generates the 7-match season schedule from the full opponents pool.
 * Always picks 1 Hard + 3 Normal + 3 Easy opponents, sorted ascending by
 * strength_score so the season has a natural difficulty curve (easy first,
 * hard last).
 *
 * Phase flow:
 *   TITLE → SEASON → PREMATCH → TRIVIA → ... → RESULT → SEASON (repeat × 7)
 *   After 7th result → SEASON_COMPLETE
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Opponent tier — maps directly to AI difficulty */
export type OpponentTier = 'hard' | 'normal' | 'easy';

/**
 * A single opponent team from opponents.json.
 * Stats are derived from 5 seasons of real league data (2021–2025).
 */
export interface Opponent {
  id: string;
  name: string;
  tier: OpponentTier;
  strength_score: number;
  seasons: number;
  titles: number;
  record: { w: number; d: number; l: number };
  goals: { for: number; against: number };
  ppg: number;
  win_rate: number;
}

/**
 * Result of a played fixture from Olvastin Tana's perspective.
 * homeGoals = goals scored by Olvastin Tana, awayGoals = opponent goals.
 */
export interface FixtureResult {
  homeGoals: number;
  awayGoals: number;
  /** 3 = win, 1 = draw, 0 = loss */
  points: number;
}

/** One fixture in the season schedule */
export interface Fixture {
  /** 1-based match number in the season */
  matchNumber: number;
  /** The opposing team */
  opponent: Opponent;
  /** null until the match has been played */
  result: FixtureResult | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Season fixture format constants */
export const SEASON_FORMAT = {
  /** Number of Hard-tier opponents per season */
  HARD_OPPONENTS: 1,
  /** Number of Normal-tier opponents per season */
  NORMAL_OPPONENTS: 3,
  /** Number of Easy-tier opponents per season */
  EASY_OPPONENTS: 3,
  /** Total matches per season */
  TOTAL_MATCHES: 7,
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Shuffle an array using Fisher-Yates in-place algorithm.
 *
 * @param arr - The array to shuffle
 * @param rng - Optional RNG function (default: Math.random) for deterministic tests
 * @returns A new shuffled array (original is not mutated)
 *
 * @example
 * shuffleArray([1, 2, 3, 4]) // → [3, 1, 4, 2] (random order)
 */
function shuffleArray<T>(arr: T[], rng: () => number = Math.random): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Pick exactly n random items from an array without replacement.
 *
 * @param arr - Source array
 * @param n - Number of items to pick
 * @param rng - Optional RNG for deterministic tests
 * @returns Array of n randomly selected items
 *
 * @example
 * pickN([1, 2, 3, 4, 5], 2) // → [4, 1] (random)
 */
function pickN<T>(arr: T[], n: number, rng: () => number = Math.random): T[] {
  return shuffleArray(arr, rng).slice(0, n);
}

// ---------------------------------------------------------------------------
// Exported functions
// ---------------------------------------------------------------------------

/**
 * Generate a 7-match season fixture list from the full opponents pool.
 *
 * Selection:
 *   - 1 Hard opponent  (Hard AI)
 *   - 3 Normal opponents (Normal AI)
 *   - 3 Easy opponents  (Easy AI)
 *
 * Fixtures are sorted ascending by strength_score so the season ramps
 * naturally from easy to hard.
 *
 * @param opponents - Full opponents pool (all 20+ teams from opponents.json)
 * @param rng - Optional RNG for deterministic testing (default: Math.random)
 * @returns Array of 7 Fixture objects with result: null
 *
 * @example
 * import opponentsData from '../data/opponents.json';
 * import type { Opponent } from './season';
 * const fixtures = generateFixtures(opponentsData as Opponent[]);
 * // fixtures.length === 7
 * // fixtures[0].opponent.tier — weakest opponent
 * // fixtures[6].opponent.tier === 'hard' — hardest last
 */
export function generateFixtures(
  opponents: Opponent[],
  rng: () => number = Math.random,
): Fixture[] {
  const hard   = opponents.filter((o) => o.tier === 'hard');
  const normal = opponents.filter((o) => o.tier === 'normal');
  const easy   = opponents.filter((o) => o.tier === 'easy');

  const selected: Opponent[] = [
    ...pickN(hard,   SEASON_FORMAT.HARD_OPPONENTS,   rng),
    ...pickN(normal, SEASON_FORMAT.NORMAL_OPPONENTS, rng),
    ...pickN(easy,   SEASON_FORMAT.EASY_OPPONENTS,   rng),
  ];

  // Sort ascending so weakest opponents come first, hardest last
  selected.sort((a, b) => a.strength_score - b.strength_score);

  return selected.map((opponent, i) => ({
    matchNumber: i + 1,
    opponent,
    result: null,
  }));
}

/**
 * Calculate season points earned by Olvastin Tana from a single fixture result.
 *
 * @param homeGoals - Goals scored by Olvastin Tana
 * @param awayGoals - Goals scored by the opponent
 * @returns 3 (win), 1 (draw), or 0 (loss)
 *
 * @example
 * fixturePoints(2, 1) // → 3
 * fixturePoints(1, 1) // → 1
 * fixturePoints(0, 2) // → 0
 */
export function fixturePoints(homeGoals: number, awayGoals: number): number {
  if (homeGoals > awayGoals) return 3;
  if (homeGoals === awayGoals) return 1;
  return 0;
}
