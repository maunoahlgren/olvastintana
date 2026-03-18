/**
 * @file goalkeeper.ts
 * Goalkeeper save attempt logic — pure functions, no side effects.
 *
 * The goalkeeper does not participate in duels.
 * A save attempt is triggered whenever the possessing player wins a duel.
 * Save succeeds if keeper Torjunta >= max(shooter Laukaus, shooter Harhautus),
 * or if Kivimuuri (auto-save) is active.
 *
 * Using max(Laukaus, Harhautus) reflects that all three cards can produce a
 * goal attempt — the shooter uses their best applicable scoring stat.
 */

import type { PlayerStats } from './duel';

/** Result of a goalkeeper save attempt */
export type SaveResult = 'saved' | 'goal';

/**
 * Resolve a goalkeeper save attempt.
 *
 * Shot power is calculated as max(shooter.laukaus, shooter.harhautus),
 * reflecting that any card win by the possessing player can produce a goal
 * and the shooter exploits whichever stat is stronger.
 *
 * @param keeperStats  - Goalkeeper stat block (uses torjunta for save ability)
 * @param shooterStats - Shooting player stat block (uses laukaus and harhautus)
 * @param autosave     - True when Kivimuuri (brick_wall) ability triggers (SQ-08)
 * @returns 'saved' if the keeper stops the shot, 'goal' if it goes in
 *
 * @example
 * resolveGoalkeeping({ torjunta: 4 }, { laukaus: 3, harhautus: 2 }) // → 'saved'
 * resolveGoalkeeping({ torjunta: 3 }, { laukaus: 5, harhautus: 2 }) // → 'goal'
 * resolveGoalkeeping({ torjunta: 3 }, { laukaus: 2, harhautus: 5 }) // → 'goal' (harhautus wins)
 * resolveGoalkeeping({ torjunta: 1 }, { laukaus: 10, harhautus: 5 }, true) // → 'saved' (Kivimuuri)
 */
export function resolveGoalkeeping(
  keeperStats: Pick<PlayerStats, 'torjunta'>,
  shooterStats: Pick<PlayerStats, 'laukaus' | 'harhautus'>,
  autosave = false,
): SaveResult {
  if (autosave) return 'saved';
  const shotPower = Math.max(shooterStats.laukaus, shooterStats.harhautus);
  return keeperStats.torjunta >= shotPower ? 'saved' : 'goal';
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
