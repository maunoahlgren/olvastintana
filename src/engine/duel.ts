/**
 * @file duel.ts
 * Duel resolution engine — pure functions, no side effects.
 *
 * Triangle: Press > Feint > Shot > Press
 * Tie-break by stat: Press tie → Riisto, Feint tie → Harhautus, Shot tie → Laukaus
 * Equal stats on tie → null (possession unchanged, nothing happens)
 */

/** The three duel card types */
export const CARD = {
  PRESS: 'press',  // Riisto ⚔️
  FEINT: 'feint',  // Harhautus 💨
  SHOT: 'shot',    // Laukaus 🎯
} as const;

export type Card = (typeof CARD)[keyof typeof CARD];

/**
 * Player stat block — maps directly to the three card types plus save and endurance.
 *
 * | Stat     | Finnish   | Card/role                        |
 * |----------|-----------|----------------------------------|
 * | riisto   | Riisto    | Press card strength + Press tiebreak  |
 * | laukaus  | Laukaus   | Shot card strength + Shot tiebreak    |
 * | harhautus| Harhautus | Feint card strength + Feint tiebreak  |
 * | torjunta | Torjunta  | Save ability (GK + defenders)        |
 * | stamina  | Stamina   | Endurance; stamina=1 → -1 all in H2  |
 */
export interface PlayerStats {
  riisto: number;
  laukaus: number;
  harhautus: number;
  torjunta: number;
  stamina: number;
}

/** Stat used to break a tie for each card type */
const TIE_STAT: Record<Card, keyof PlayerStats> = {
  [CARD.PRESS]: 'riisto',
  [CARD.FEINT]: 'harhautus',
  [CARD.SHOT]: 'laukaus',
};

/**
 * Resolve a duel between two players.
 *
 * @param attackerCard - Card played by the attacker
 * @param defenderCard - Card played by the defender
 * @param attackerStats - Stat block for the attacker (after all modifiers applied)
 * @param defenderStats - Stat block for the defender (after all modifiers applied)
 * @returns 'attacker' | 'defender' | null — null means equal stats on tie (nothing happens)
 *
 * @example
 * resolveDuel(CARD.PRESS, CARD.FEINT, statsA, statsB) // → 'attacker'
 * resolveDuel(CARD.PRESS, CARD.PRESS, { riisto: 3 }, { riisto: 3 }) // → null
 */
export function resolveDuel(
  attackerCard: Card,
  defenderCard: Card,
  attackerStats: PlayerStats,
  defenderStats: PlayerStats,
): 'attacker' | 'defender' | null {
  if (beats(attackerCard, defenderCard)) return 'attacker';
  if (beats(defenderCard, attackerCard)) return 'defender';

  // Same card — resolve by tiebreak stat
  const stat = TIE_STAT[attackerCard];
  const aStat = attackerStats[stat];
  const dStat = defenderStats[stat];

  if (aStat > dStat) return 'attacker';
  if (dStat > aStat) return 'defender';
  return null;
}

/**
 * Returns true if cardA beats cardB in the triangle.
 *
 * @param cardA - First card
 * @param cardB - Second card
 * @returns Whether cardA beats cardB
 *
 * @example
 * beats(CARD.PRESS, CARD.FEINT) // → true
 * beats(CARD.FEINT, CARD.PRESS) // → false
 */
export function beats(cardA: Card, cardB: Card): boolean {
  return (
    (cardA === CARD.PRESS && cardB === CARD.FEINT) ||
    (cardA === CARD.FEINT && cardB === CARD.SHOT) ||
    (cardA === CARD.SHOT && cardB === CARD.PRESS)
  );
}
