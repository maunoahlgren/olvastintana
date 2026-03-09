/**
 * @file possession.ts
 * Possession state transitions — pure functions, no side effects.
 *
 * Rules:
 * - Only the player with possession can play Shot to score
 * - Winning a duel without the ball → gain possession
 * - Winning a duel with the ball + Shot card → goal attempt
 * - Null duel result → possession unchanged
 */

import { CARD, type Card } from './duel';

export type Side = 'home' | 'away';

/** Result of evaluating a duel outcome for possession purposes */
export interface PossessionOutcome {
  possession: Side;
  goalAttempt: boolean;
}

/**
 * Resolve possession after a duel.
 *
 * @param currentPossession - Which side currently has the ball
 * @param duelWinner - 'attacker' | 'defender' | null (null = no change)
 * @param attackerSide - Which match side played as attacker
 * @param attackerCard - Card the attacker played
 * @returns Updated possession and whether a goal attempt should be resolved
 *
 * @example
 * // Attacker wins without ball → gains possession, no shot
 * resolvePossession('away', 'attacker', 'home', CARD.PRESS)
 * // → { possession: 'home', goalAttempt: false }
 *
 * // Attacker wins with ball + Shot → goal attempt
 * resolvePossession('home', 'attacker', 'home', CARD.SHOT)
 * // → { possession: 'home', goalAttempt: true }
 */
export function resolvePossession(
  currentPossession: Side,
  duelWinner: 'attacker' | 'defender' | null,
  attackerSide: Side,
  attackerCard: Card,
): PossessionOutcome {
  // Null result — nothing changes
  if (duelWinner === null) {
    return { possession: currentPossession, goalAttempt: false };
  }

  const defenderSide: Side = attackerSide === 'home' ? 'away' : 'home';
  const winningSide = duelWinner === 'attacker' ? attackerSide : defenderSide;
  const winnerHadBall = currentPossession === winningSide;
  const winnerPlayedShot =
    (duelWinner === 'attacker' && attackerCard === CARD.SHOT) ||
    (duelWinner === 'defender' && attackerCard !== CARD.SHOT); // defender doesn't play a "card" type here

  // Winner with ball + Shot card → goal attempt
  const goalAttempt = winnerHadBall && winnerPlayedShot;

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
