/**
 * @file possession.ts
 * Possession state transitions — pure functions, no side effects.
 *
 * Rules:
 * - Only the player with possession can trigger a goal attempt
 * - Winning a duel without the ball → gain possession only (no goal attempt)
 * - Winning a duel WITH the ball → always triggers a goal attempt (any card)
 * - Null duel result → possession unchanged
 */

import { type Card } from './duel';

export type Side = 'home' | 'away';

/** Result of evaluating a duel outcome for possession purposes */
export interface PossessionOutcome {
  possession: Side;
  goalAttempt: boolean;
}

/**
 * Resolve possession after a duel.
 *
 * Any win by the possessing player (attacker) triggers a goal attempt,
 * regardless of which card was played. The card type only matters for
 * the duel triangle resolution — goal attempts follow from possession, not card choice.
 *
 * @param currentPossession - Which side currently has the ball
 * @param duelWinner - 'attacker' | 'defender' | null (null = no change)
 * @param attackerSide - Which match side played as attacker
 * @param _attackerCard - Card played by attacker (unused; retained for API compatibility)
 * @returns Updated possession and whether a goal attempt should be resolved
 *
 * @example
 * // Attacker wins without ball → gains possession, no goal attempt
 * resolvePossession('away', 'attacker', 'home', CARD.PRESS)
 * // → { possession: 'home', goalAttempt: false }
 *
 * // Attacker wins with ball (any card) → goal attempt
 * resolvePossession('home', 'attacker', 'home', CARD.PRESS)
 * // → { possession: 'home', goalAttempt: true }
 *
 * resolvePossession('home', 'attacker', 'home', CARD.SHOT)
 * // → { possession: 'home', goalAttempt: true }
 */
export function resolvePossession(
  currentPossession: Side,
  duelWinner: 'attacker' | 'defender' | null,
  attackerSide: Side,
  _attackerCard: Card,
): PossessionOutcome {
  // Null result — nothing changes
  if (duelWinner === null) {
    return { possession: currentPossession, goalAttempt: false };
  }

  const defenderSide: Side = attackerSide === 'home' ? 'away' : 'home';
  const winningSide = duelWinner === 'attacker' ? attackerSide : defenderSide;
  const winnerHadBall = currentPossession === winningSide;

  // Any win by the possessing player → goal attempt (SQ-GOAL-01)
  const goalAttempt = winnerHadBall;

  return { possession: winningSide, goalAttempt };
}

/**
 * Determine which side kicks off for each half.
 * First half: decided externally (coin flip). Second half: opposite team.
 *
 * @param firstHalfSide - Side that kicked off first half
 * @returns Kickoff side for second half
 *
 * @example
 * secondHalfKickoff('home') // → 'away'
 */
export function secondHalfKickoff(firstHalfSide: Side): Side {
  return firstHalfSide === 'home' ? 'away' : 'home';
}

/**
 * Coin flip for first-half kickoff.
 *
 * @returns Randomly 'home' or 'away'
 */
export function coinFlip(): Side {
  return Math.random() < 0.5 ? 'home' : 'away';
}
