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
import { type Card, CARD } from './duel';

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

// ─── New ability functions (v0.7.0) ────────────────────────────────────────────

/**
 * kapteeni ability (Olli Mehtonen #20 — SQ-10).
 * After Olli wins a duel, his side gets +2 to all card stats in the next duel.
 *
 * @param winnerPlayerId - ID of the player who won (null = draw)
 * @returns Whether the Kapteeni stat boost should be applied
 *
 * @example
 * kapteeni('olli_mehtonen') // → { applyBoost: true }
 * kapteeni('mauno_ahlgren') // → { applyBoost: false }
 * kapteeni(null)            // → { applyBoost: false }
 */
export function kapteeni(winnerPlayerId: string | null): { applyBoost: boolean } {
  return { applyBoost: winnerPlayerId === 'olli_mehtonen' };
}

/**
 * kaaoksenLahettilas ability (Mauno Ahlgren #15 — SQ-04).
 * Role-agnostic version: signals Sattuma draw whenever Mauno wins, regardless of attacker/defender.
 *
 * @param winnerPlayerId - ID of the winning player (null = draw)
 * @returns Whether a Sattuma card should be drawn
 *
 * @example
 * kaaoksenLahettilas('mauno_ahlgren') // → { drawSattuma: true }
 * kaaoksenLahettilas('jyrki_orjasniemi') // → { drawSattuma: false }
 */
export function kaaoksenLahettilas(winnerPlayerId: string | null): { drawSattuma: boolean } {
  return { drawSattuma: winnerPlayerId === 'mauno_ahlgren' };
}

/**
 * matigol ability (Kimmo Mattila #14 — SQ-05).
 * When Kimmo wins a duel AND his side has possession → automatic goal, goalkeeper check skipped.
 *
 * @param winnerPlayerId - ID of the winning player (null = draw)
 * @param winnerHasPossession - True if the winning player's side is the current attacker
 * @returns Whether an automatic goal should be scored
 *
 * @example
 * matigol('kimmo_mattila', true)  // → { autoGoal: true }
 * matigol('kimmo_mattila', false) // → { autoGoal: false } (Kimmo defending)
 * matigol('olli_mehtonen', true)  // → { autoGoal: false }
 */
export function matigol(
  winnerPlayerId: string | null,
  winnerHasPossession: boolean,
): { autoGoal: boolean } {
  return { autoGoal: winnerPlayerId === 'kimmo_mattila' && winnerHasPossession };
}

/**
 * ninja ability (Iiro Mäkelä #13 — SQ-08).
 * When Iiro wins a duel WITHOUT possession (as defender) → attempt a goal against the attacker.
 *
 * @param winnerPlayerId - ID of the winning player (null = draw)
 * @param winnerHasPossession - True if the winning player's side is the current attacker
 * @returns Whether Iiro should attempt a goal despite not being the attacker
 *
 * @example
 * ninja('iiro_makela', false) // → { attemptGoal: true } (Iiro defending, wins, counter-attacks)
 * ninja('iiro_makela', true)  // → { attemptGoal: false } (Iiro attacking, handled normally)
 * ninja('jari_savela', false) // → { attemptGoal: false }
 */
export function ninja(
  winnerPlayerId: string | null,
  winnerHasPossession: boolean,
): { attemptGoal: boolean } {
  return { attemptGoal: winnerPlayerId === 'iiro_makela' && !winnerHasPossession };
}

/**
 * tuplablokki ability (Ossi Nieminen #60 — SQ-11).
 * After Ossi wins a duel → opponent cannot play Shot in the next duel.
 *
 * @param winnerPlayerId - ID of the winning player (null = draw)
 * @returns Whether the opponent's Shot card should be restricted
 *
 * @example
 * tuplablokki('ossi_nieminen') // → { restrictOpponentShot: true }
 * tuplablokki(null)            // → { restrictOpponentShot: false }
 */
export function tuplablokki(winnerPlayerId: string | null): { restrictOpponentShot: boolean } {
  return { restrictOpponentShot: winnerPlayerId === 'ossi_nieminen' };
}

/**
 * laitanousu ability (Olli Kurkela #21 — SQ-12).
 * After Olli K. wins a duel → opponent cannot play Press in the next duel.
 *
 * @param winnerPlayerId - ID of the winning player (null = draw)
 * @returns Whether the opponent's Press card should be restricted
 *
 * @example
 * laitanousu('olli_kurkela') // → { restrictOpponentPress: true }
 * laitanousu('olli_mehtonen') // → { restrictOpponentPress: false }
 */
export function laitanousu(winnerPlayerId: string | null): { restrictOpponentPress: boolean } {
  return { restrictOpponentPress: winnerPlayerId === 'olli_kurkela' };
}

/**
 * dominoiva ability (Jari Savela #8 — SQ-09).
 * After Jari wins a duel → opponent's next ability is cancelled.
 *
 * @param winnerPlayerId - ID of the winning player (null = draw)
 * @returns Whether the opponent's next ability should be cancelled
 *
 * @example
 * dominoiva('jari_savela')    // → { cancelOpponentAbility: true }
 * dominoiva('ossi_nieminen')  // → { cancelOpponentAbility: false }
 */
export function dominoiva(winnerPlayerId: string | null): { cancelOpponentAbility: boolean } {
  return { cancelOpponentAbility: winnerPlayerId === 'jari_savela' };
}

/**
 * checkReactiveSwitch — checks if a player has a reactive ability for the card they played.
 *
 * Reactive map:
 * - Jukka Estola (#88, Estis): played Press → can switch to Shot   (SQ-06)
 * - Petri Alanen (#83):        played Shot  → can switch to Feint  (SQ-13)
 * - Antti Haritonov (#19):     played Feint → can switch to Press  (SQ-14)
 *
 * @param playerId - ID of the player being checked
 * @param playedCard - The card the player chose
 * @returns { canSwitch, switchTo } — canSwitch is true and switchTo is set when reactive triggers
 *
 * @example
 * checkReactiveSwitch('jukka_estola', CARD.PRESS) // → { canSwitch: true, switchTo: 'shot' }
 * checkReactiveSwitch('jukka_estola', CARD.FEINT) // → { canSwitch: false, switchTo: null }
 * checkReactiveSwitch('petri_alanen', CARD.SHOT)  // → { canSwitch: true, switchTo: 'feint' }
 */
export function checkReactiveSwitch(
  playerId: string,
  playedCard: Card,
): { canSwitch: boolean; switchTo: Card | null } {
  if (playerId === 'jukka_estola' && playedCard === CARD.PRESS) {
    return { canSwitch: true, switchTo: CARD.SHOT };
  }
  if (playerId === 'petri_alanen' && playedCard === CARD.SHOT) {
    return { canSwitch: true, switchTo: CARD.FEINT };
  }
  if (playerId === 'antti_haritonov' && playedCard === CARD.FEINT) {
    return { canSwitch: true, switchTo: CARD.PRESS };
  }
  return { canSwitch: false, switchTo: null };
}
