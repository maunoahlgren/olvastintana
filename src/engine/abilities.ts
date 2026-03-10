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
 * Players with Stamina = 1 get -1 to all card stats (riisto, laukaus, harhautus, torjunta)
 * in the second half. No stat drops below 1. Stamina itself is not penalised.
 *
 * @param stats - Player stat block
 * @param half - Current match half (1 or 2)
 * @returns Potentially modified stat block (original if no penalty applies)
 *
 * @example
 * applyStaminaPenalty({ riisto: 3, laukaus: 3, harhautus: 3, torjunta: 3, stamina: 1 }, 2)
 * // → { riisto: 2, laukaus: 2, harhautus: 2, torjunta: 2, stamina: 1 }
 */
export function applyStaminaPenalty(stats: PlayerStats, half: 1 | 2): PlayerStats {
  if (half !== 2 || stats.stamina >= 2) return stats;
  return {
    riisto: Math.max(1, stats.riisto - 1),
    laukaus: Math.max(1, stats.laukaus - 1),
    harhautus: Math.max(1, stats.harhautus - 1),
    torjunta: Math.max(1, stats.torjunta - 1),
    stamina: stats.stamina,
  };
}

/**
 * hot_streak ability (legacy — SQ-01).
 * 20% chance to explode: all three card stats become 8.
 *
 * @param stats - Player's base stat block
 * @returns Potentially boosted stat block
 *
 * @example
 * hotStreak({ riisto: 3, laukaus: 8, harhautus: 9, torjunta: 4, stamina: 1 })
 * // 20% chance → { riisto: 8, laukaus: 8, harhautus: 8, torjunta: 4, stamina: 1 }
 */
export function hotStreak(stats: PlayerStats): PlayerStats {
  if (Math.random() < 0.2) {
    return { ...stats, riisto: 8, laukaus: 8, harhautus: 8 };
  }
  return stats;
}

/**
 * try_hard_mode ability (Mauno Ahlgren #15 — SQ-04).
 * After Mauno wins a duel, signal that a Sattuma card should be drawn.
 * Actual draw is handled by match flow.
 *
 * @param duelResult - Result of the duel
 * @param playerId - ID of the player who won the duel
 * @returns Whether a Sattuma card should be drawn
 *
 * @example
 * tryHardMode('attacker', 'mauno_ahlgren') // → { drawSattuma: true }
 * tryHardMode('defender', 'mauno_ahlgren') // → { drawSattuma: false }
 */
export function tryHardMode(
  duelResult: 'attacker' | 'defender' | null,
  playerId: string,
): { drawSattuma: boolean } {
  return { drawSattuma: duelResult === 'attacker' && playerId === 'mauno_ahlgren' };
}

/**
 * pressure_44 ability (Jyrki Orjasniemi #5 — SQ-07).
 * After Jyrki wins a duel, opponent cannot play Feint in the next duel.
 *
 * @param duelResult - Result of the duel
 * @param playerId - ID of the player who won
 * @returns Whether the opponent's Feint is restricted next duel
 *
 * @example
 * pressure44('attacker', 'jyrki_orjasniemi') // → { restrictOpponentFeint: true }
 */
export function pressure44(
  duelResult: 'attacker' | 'defender' | null,
  playerId: string,
): { restrictOpponentFeint: boolean } {
  return {
    restrictOpponentFeint: duelResult === 'attacker' && playerId === 'jyrki_orjasniemi',
  };
}

/**
 * estis ability (Jukka Estola #88 — SQ-06).
 * Marker function: after playing Press, Estola may switch to Shot after seeing the opponent's card.
 * The UI must reveal the opponent card before Estola responds.
 * Actual card choice is handled by match flow / UI interaction.
 *
 * @returns Reactive ability marker
 */
export function estis(): { reactive: true } {
  return { reactive: true };
}
