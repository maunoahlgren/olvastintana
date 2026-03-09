/**
 * Ability handlers
 *
 * Each handler receives relevant context and returns a modifier object
 * describing what changes as a result of the ability.
 *
 * Ability types: reactive ⚡, restriction 🔒, boost 💥, chaos 🎲, dominant 🏆
 *
 * Resolution priority (when multiple trigger simultaneously):
 * 🔒 Restriction → ⚡ Reactive → 🏆 Dominant → 💥 Boost / 🎲 Chaos
 */

/**
 * hot_streak (Alanen): can randomly explode for 6 points
 * Triggers: before duel stat comparison
 * Returns modified attacker stats
 */
export function hotStreak(stats) {
  if (Math.random() < 0.2) {
    return { ...stats, power: 6, technique: 6, pace: 6 };
  }
  return stats;
}

/**
 * try_hard_mode (Mauno): win a duel → draw a Sattuma card
 * This is signalled as a side effect; actual Sattuma draw handled by match engine
 */
export function tryHardMode(duelResult, playerId) {
  if (duelResult === 'attacker' && playerId === 'mauno') {
    return { drawSattuma: true };
  }
  return { drawSattuma: false };
}

/**
 * brick_wall (Tommi): once per half, auto-save
 * Returns { triggered: boolean, usedThisHalf: boolean }
 */
export function brickWall(usedThisHalf) {
  if (!usedThisHalf) {
    return { triggered: true, usedThisHalf: true };
  }
  return { triggered: false, usedThisHalf: true };
}

/**
 * pressure_44 (Jyrki): after Jyrki wins a duel, opponent cannot play Feint next duel
 * Returns restriction flag for match engine to enforce
 */
export function pressure44(duelResult, playerId) {
  return {
    restrictOpponentFeint: duelResult === 'attacker' && playerId === 'jyrki',
  };
}

/**
 * estis (Estola): reactive — after seeing opponent's card, play Press or Shot
 * The UI must handle revealing opponent card before Estola responds.
 * This is a marker function; logic lives in match flow.
 */
export function estis() {
  return { reactive: true };
}

/**
 * Apply low-stamina penalty: -1 to all stats in second half
 * Threshold: stamina <= 2 means penalty applies
 */
export function applyStaminaPenalty(stats, half) {
  if (half === 2 && stats.stamina <= 2) {
    return Object.fromEntries(
      Object.entries(stats).map(([k, v]) => [k, Math.max(1, v - 1)])
    );
  }
  return stats;
}
