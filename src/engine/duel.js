/**
 * Duel resolution engine
 *
 * Triangle: Press > Feint > Shot > Press
 * Tie-break: Riisto/Press tie → Pace, Harhautus/Feint tie → Technique, Laukaus/Shot tie → Power
 * Equal stats on tie → null (nothing happens, possession unchanged)
 */

export const CARD = {
  PRESS: 'press',   // Riisto
  FEINT: 'feint',   // Harhautus
  SHOT: 'shot',     // Laukaus
};

// Which stat breaks a tie for each card type
const TIE_STAT = {
  [CARD.PRESS]: 'pace',
  [CARD.FEINT]: 'technique',
  [CARD.SHOT]: 'power',
};

/**
 * Returns 'attacker' | 'defender' | null
 * null = draw with equal tiebreak stats (possession unchanged)
 *
 * @param {string} attackerCard  - CARD enum value
 * @param {string} defenderCard  - CARD enum value
 * @param {object} attackerStats - { pace, technique, power, iq, stamina, chaos }
 * @param {object} defenderStats - { pace, technique, power, iq, stamina, chaos }
 */
export function resolveDuel(attackerCard, defenderCard, attackerStats, defenderStats) {
  // Straight wins from the triangle
  if (beats(attackerCard, defenderCard)) return 'attacker';
  if (beats(defenderCard, attackerCard)) return 'defender';

  // Same card — resolve by tiebreak stat
  const stat = TIE_STAT[attackerCard];
  const aStat = attackerStats[stat] ?? 0;
  const dStat = defenderStats[stat] ?? 0;

  if (aStat > dStat) return 'attacker';
  if (dStat > aStat) return 'defender';
  return null; // equal — nothing happens
}

/**
 * Returns true if cardA beats cardB in the triangle
 */
export function beats(cardA, cardB) {
  return (
    (cardA === CARD.PRESS && cardB === CARD.FEINT) ||
    (cardA === CARD.FEINT && cardB === CARD.SHOT) ||
    (cardA === CARD.SHOT && cardB === CARD.PRESS)
  );
}

/**
 * Resolve a goalkeeper save attempt.
 * Returns 'saved' | 'goal'
 *
 * @param {object} keeperStats  - goalkeeper stats
 * @param {object} shooterStats - shooting player stats
 * @param {boolean} autosave    - true if Kivimuuri triggered
 */
export function resolveGoalkeeping(keeperStats, shooterStats, autosave = false) {
  if (autosave) return 'saved';
  // Keeper saves if their Power >= shooter's Power
  return keeperStats.power >= shooterStats.power ? 'saved' : 'goal';
}
