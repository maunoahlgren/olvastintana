/**
 * @file abilities.ts
 * Player ability handlers — pure functions, no side effects.
 *
 * Ability types: reactive ⚡, restriction 🔒, boost 💥, chaos 🎲, dominant 🏆
 *
 * Resolution priority when multiple abilities trigger simultaneously:
 * 🔒 Restriction → ⚡ Reactive → 🏆 Dominant → 💥 Boost / 🎲 Chaos
 */

import type { PlayerStats } from './duel';

/**
 * Apply the low-stamina second-half penalty.
 * Players with Stamina ≤ 2 get -1 to all stats in the second half.
 * No stat drops below 1.
 *
 * @param stats - Player stat block
 * @param half - Current match half (1 or 2)
 * @returns Potentially modified stat block (original if no penalty applies)
 *
 * @example
 * applyStaminaPenalty({ pace: 3, technique: 3, power: 3, iq: 3, stamina: 2, chaos: 3 }, 2)
 * // → { pace: 2, technique: 2, power: 2, iq: 2, stamina: 2, chaos: 2 }
 */
export function applyStaminaPenalty(stats: PlayerStats, half: 1 | 2): PlayerStats {
  if (half !== 2 || stats.stamina > 2) return stats;
  return {
    pace: Math.max(1, stats.pace - 1),
    technique: Math.max(1, stats.technique - 1),
    power: Math.max(1, stats.power - 1),
    iq: Math.max(1, stats.iq - 1),
    stamina: stats.stamina,
    chaos: Math.max(1, stats.chaos - 1),
  };
}

/**
 * hot_streak ability (Alanen — SQ-01).
 * 20% chance to explode: all combat stats become 6.
 *
 * @param stats - Alanen's base stat block
 * @returns Potentially boosted stat block
 *
 * @example
 * hotStreak({ pace: 4, technique: 5, power: 4, iq: 6, stamina: 4, chaos: 3 })
 * // 20% chance → { pace: 6, technique: 6, power: 6, iq: 6, stamina: 4, chaos: 6 }
 */
export function hotStreak(stats: PlayerStats): PlayerStats {
  if (Math.random() < 0.2) {
    return { ...stats, pace: 6, technique: 6, power: 6, chaos: 6 };
  }
  return stats;
}

/**
 * try_hard_mode ability (Mauno — SQ-04).
 * After Mauno wins a duel, signal that a Sattuma card should be drawn.
 * Actual draw is handled by match flow.
 *
 * @param duelResult - Result of the duel
 * @param playerId - ID of the player who won the duel
 * @returns Whether a Sattuma card should be drawn
 *
 * @example
 * tryHardMode('attacker', 'mauno') // → { drawSattuma: true }
 * tryHardMode('defender', 'mauno') // → { drawSattuma: false }
 */
export function tryHardMode(
  duelResult: 'attacker' | 'defender' | null,
  playerId: string,
): { drawSattuma: boolean } {
  return { drawSattuma: duelResult === 'attacker' && playerId === 'mauno' };
}

/**
 * pressure_44 ability (Jyrki — SQ-07).
 * After Jyrki wins a duel, opponent cannot play Feint in the next duel.
 *
 * @param duelResult - Result of the duel
 * @param playerId - ID of the player who won
 * @returns Whether the opponent's Feint is restricted next duel
 *
 * @example
 * pressure44('attacker', 'jyrki') // → { restrictOpponentFeint: true }
 */
export function pressure44(
  duelResult: 'attacker' | 'defender' | null,
  playerId: string,
): { restrictOpponentFeint: boolean } {
  return {
    restrictOpponentFeint: duelResult === 'attacker' && playerId === 'jyrki',
  };
}

/**
 * estis ability (Estola — SQ-06).
 * Marker function: after seeing the opponent's card, Estola may choose Press or Shot.
 * The UI must reveal the opponent card before Estola responds.
 * Actual card choice is handled by match flow / UI interaction.
 *
 * @returns Reactive ability marker
 */
export function estis(): { reactive: true } {
  return { reactive: true };
}
