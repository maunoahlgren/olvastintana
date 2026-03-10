/**
 * @file goalkeeper.ts
 * Goalkeeper save attempt logic — pure functions, no side effects.
 *
 * The goalkeeper does not participate in duels.
 * A save attempt is triggered when Shot wins a duel.
 * Save succeeds if keeper Torjunta >= shooter Laukaus, or if Kivimuuri (auto-save) is active.
 */

import type { PlayerStats } from './duel';

/** Result of a goalkeeper save attempt */
export type SaveResult = 'saved' | 'goal';

/**
 * Resolve a goalkeeper save attempt.
 *
 * @param keeperStats - Goalkeeper stat block (uses torjunta for save ability)
 * @param shooterStats - Shooting player stat block (uses laukaus for shot power)
 * @param autosave - True when Kivimuuri (brick_wall) ability triggers (SQ-08)
 * @returns 'saved' if the keeper stops the shot, 'goal' if it goes in
 *
 * @example
 * resolveGoalkeeping({ torjunta: 4 }, { laukaus: 3 }) // → 'saved'
 * resolveGoalkeeping({ torjunta: 3 }, { laukaus: 5 }) // → 'goal'
 * resolveGoalkeeping({ torjunta: 1 }, { laukaus: 10 }, true) // → 'saved' (Kivimuuri)
 */
export function resolveGoalkeeping(
  keeperStats: Pick<PlayerStats, 'torjunta'>,
  shooterStats: Pick<PlayerStats, 'laukaus'>,
  autosave = false,
): SaveResult {
  if (autosave) return 'saved';
  return keeperStats.torjunta >= shooterStats.laukaus ? 'saved' : 'goal';
}

/**
 * State for tracking the Kivimuuri (Brick Wall) ability per half.
 * The ability auto-saves once per half and resets at halftime.
 */
export interface BrickWallState {
  usedThisHalf: boolean;
}

/**
 * Attempt to use the Kivimuuri auto-save.
 * Returns whether it triggered and the updated state.
 *
 * @param state - Current Kivimuuri state
 * @returns Object with triggered flag and updated state
 *
 * @example
 * useBrickWall({ usedThisHalf: false }) // → { triggered: true, state: { usedThisHalf: true } }
 * useBrickWall({ usedThisHalf: true })  // → { triggered: false, state: { usedThisHalf: true } }
 */
export function useBrickWall(state: BrickWallState): {
  triggered: boolean;
  state: BrickWallState;
} {
  if (!state.usedThisHalf) {
    return { triggered: true, state: { usedThisHalf: true } };
  }
  return { triggered: false, state };
}

/**
 * Reset Kivimuuri state at halftime.
 *
 * @returns Fresh BrickWallState ready for second half
 */
export function resetBrickWall(): BrickWallState {
  return { usedThisHalf: false };
}
