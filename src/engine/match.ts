/**
 * @file match.ts
 * Match flow orchestration constants and helpers — pure functions.
 *
 * Manages phases, halftime logic, and season points.
 * Duel resolution, possession, and goalkeeper logic live in their own modules.
 */

/** Number of duels played per half. Subject to playtesting. */
export const DUELS_PER_HALF = 5;

/** Match phase state machine */
export const MATCH_PHASE = {
  TITLE: 'title',
  TRIVIA: 'trivia',
  LINEUP: 'lineup',
  FIRST_HALF: 'first_half',
  HALFTIME: 'halftime',
  SECOND_HALF: 'second_half',
  RESULT: 'result',
} as const;

export type MatchPhase = (typeof MATCH_PHASE)[keyof typeof MATCH_PHASE];

/** Tactics available to each manager */
export const TACTIC = {
  AGGRESSIVE: 'aggressive',   // Boosts Shot cards
  DEFENSIVE: 'defensive',     // Boosts Press cards
  CREATIVE: 'creative',       // Boosts Feint cards
} as const;

export type Tactic = (typeof TACTIC)[keyof typeof TACTIC];

/** Season points for a match outcome */
export const SEASON_POINTS = {
  WIN: 3,
  DRAW: 1,
  LOSS: 0,
} as const;

/**
 * Calculate season points for both sides from a match result.
 *
 * @param homeGoals - Goals scored by home side
 * @param awayGoals - Goals scored by away side
 * @returns Points awarded to home and away
 *
 * @example
 * matchPoints(3, 1) // → { home: 3, away: 0 }
 * matchPoints(2, 2) // → { home: 1, away: 1 }
 */
export function matchPoints(
  homeGoals: number,
  awayGoals: number,
): { home: number; away: number } {
  if (homeGoals > awayGoals) return { home: SEASON_POINTS.WIN, away: SEASON_POINTS.LOSS };
  if (awayGoals > homeGoals) return { home: SEASON_POINTS.LOSS, away: SEASON_POINTS.WIN };
  return { home: SEASON_POINTS.DRAW, away: SEASON_POINTS.DRAW };
}

/**
 * Halftime options available to the manager.
 * Only ONE action is allowed per halftime: swap a player OR change tactics.
 *
 * @returns Available halftime action types
 */
export function halftimeOptions(): { canSwapPlayer: true; canChangeTactics: true } {
  return { canSwapPlayer: true, canChangeTactics: true };
}
