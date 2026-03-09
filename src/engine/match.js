/**
 * Match flow orchestration
 *
 * Manages the state machine for a single match:
 * - Trivia phase
 * - Two halves, each with DUELS_PER_HALF duels
 * - Halftime (swap player OR change tactics)
 * - Result
 */

export const DUELS_PER_HALF = 5; // Subject to playtesting

export const MATCH_PHASE = {
  TRIVIA: 'trivia',
  FIRST_HALF: 'first_half',
  HALFTIME: 'halftime',
  SECOND_HALF: 'second_half',
  RESULT: 'result',
};

/**
 * Determine the kickoff side for each half.
 * First half: coin flip. Second half: opposite team.
 *
 * @param {'home'|'away'} firstHalfKickoff
 * @returns {{ firstHalf: string, secondHalf: string }}
 */
export function determineKickoff(firstHalfKickoff) {
  return {
    firstHalf: firstHalfKickoff,
    secondHalf: firstHalfKickoff === 'home' ? 'away' : 'home',
  };
}

/**
 * Coin flip — returns 'home' or 'away'
 */
export function coinFlip() {
  return Math.random() < 0.5 ? 'home' : 'away';
}

/**
 * Evaluate halftime options.
 * Returns { canSwapPlayer: boolean, canChangeTactics: boolean }
 * (both always true — the constraint is you can only do ONE)
 */
export function halftimeOptions() {
  return { canSwapPlayer: true, canChangeTactics: true };
}

/**
 * Calculate season points from a match result.
 * Win=3, Draw=1, Loss=0
 */
export function matchPoints(homeGoals, awayGoals) {
  if (homeGoals > awayGoals) return { home: 3, away: 0 };
  if (awayGoals > homeGoals) return { home: 0, away: 3 };
  return { home: 1, away: 1 };
}
