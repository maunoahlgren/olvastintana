/**
 * @file ai.ts
 * Computer opponent logic for solo matches.
 *
 * Three difficulty levels:
 *   🟢 Easy   — fully random; no game-state awareness
 *   🟡 Normal — weighted random; reads possession, score, and last player card
 *   🔴 Hard   — counter-based; tracks player card history, uses active player Stamina
 *
 * All functions are pure (no side effects) and decoupled from React.
 * Randomness is via Math.random() so tests should spy on it when determinism matters.
 *
 * Triangle reminder (for counter logic):
 *   Press beats Feint | Feint beats Shot | Shot beats Press
 */

import type { Card } from './duel';
import type { Tactic } from './match';
import type { Player } from '../store/squadStore';
import { DUELS_PER_HALF } from './match';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Card choice type — matches engine Card type */
export type CardChoice = 'press' | 'feint' | 'shot';

/** AI difficulty levels */
export type AiDifficulty = 'easy' | 'normal' | 'hard';

/**
 * Game state snapshot passed to AI card/tactic decision functions.
 * Always from the AI (away) side's perspective.
 */
export interface AiGameState {
  /** Current possession side */
  possession: 'home' | 'away';
  homeGoals: number;
  awayGoals: number;
  /** Current duel index within the half (0 = first duel) */
  duelIndex: number;
  half: 1 | 2;
  /** Total duels per half (from DUELS_PER_HALF constant) */
  duelsPerHalf: number;
  /** The last card played by the human player (home), for Normal AI */
  lastPlayerCard?: CardChoice;
  /** Stamina stat of the active AI (away) player, for Hard AI mistake rate */
  activePlayerStamina?: number;
}

/** Lineup selection returned by AI lineup functions */
export interface AiLineup {
  /** Ordered list of outfield player IDs */
  outfield: string[];
  /** Goalkeeper player ID */
  goalkeeper: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** All valid card choices */
const ALL_CARDS: CardChoice[] = ['press', 'feint', 'shot'];

/** All valid tactics */
const ALL_TACTICS: Tactic[] = ['aggressive', 'defensive', 'creative'];

/**
 * Return a weighted-random key from a weight map.
 * Weights must be positive; larger weight = higher probability.
 *
 * @param weights - Map of choice → weight
 * @returns The chosen key
 *
 * @example
 * weightedRandom({ press: 1, feint: 2, shot: 1 }) // feint 50%, others 25% each
 */
function weightedRandom(weights: Record<string, number>): string {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
  let rand = Math.random() * total;
  for (const [key, weight] of entries) {
    rand -= Math.max(0, weight);
    if (rand <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

/**
 * Sum all five stats for a player.
 *
 * @param player - Player to evaluate
 * @returns Total stat points
 */
function totalStats(player: Player): number {
  const { riisto, laukaus, harhautus, torjunta, stamina } = player.stats;
  return riisto + laukaus + harhautus + torjunta + stamina;
}

/**
 * Find the most frequent element in an array.
 * If there's a tie, returns the first element that achieved the max count.
 *
 * @param arr - Array to search
 * @returns Most frequent element, or the last card if empty
 */
function mostFrequent(arr: CardChoice[]): CardChoice {
  if (arr.length === 0) return 'press';
  const counts: Record<CardChoice, number> = { press: 0, feint: 0, shot: 0 };
  for (const c of arr) counts[c]++;
  return (Object.keys(counts) as CardChoice[]).reduce(
    (best, key) => (counts[key] > counts[best] ? key : best),
    'press' as CardChoice,
  );
}

// ─── Card decision functions ───────────────────────────────────────────────────

/**
 * Easy AI card selection — uniformly random across all three cards.
 * No game-state awareness.
 *
 * @returns A random CardChoice
 *
 * @example
 * easyAiCard() // → 'press' | 'feint' | 'shot' (random)
 */
export function easyAiCard(): CardChoice {
  return ALL_CARDS[Math.floor(Math.random() * ALL_CARDS.length)];
}

/**
 * Normal AI card selection — weighted random based on game state.
 *
 * Rules:
 * - AI has possession → +2 weight on Shot (wants to score)
 * - AI is losing and ≤ 2 duels remain in the half → +2 weight on Shot
 * - Human's last card was Press → +2 weight on Feint (counter)
 * - Otherwise balanced (all weights = 1)
 *
 * @param gameState - Current match state snapshot
 * @returns A weighted-random CardChoice
 *
 * @example
 * normalAiCard({ possession: 'away', homeGoals: 0, awayGoals: 0, duelIndex: 4, half: 1, duelsPerHalf: 5 })
 */
export function normalAiCard(gameState: AiGameState): CardChoice {
  const { possession, homeGoals, awayGoals, duelIndex, duelsPerHalf, lastPlayerCard } = gameState;
  const weights: Record<CardChoice, number> = { press: 1, feint: 1, shot: 1 };

  // Has possession → want to shoot
  if (possession === 'away') {
    weights.shot += 2;
  }

  // Losing with little time left → desperate shot
  const duelsLeft = duelsPerHalf - duelIndex;
  if (awayGoals < homeGoals && duelsLeft <= 2) {
    weights.shot += 2;
  }

  // Counter last player card (press → play feint to win the next press)
  if (lastPlayerCard === 'press') {
    weights.feint += 2;
  }

  return weightedRandom(weights) as CardChoice;
}

/**
 * Hard AI card selection — counter-based with IQ-driven imperfection.
 *
 * Strategy:
 * 1. Count the player's last 3 cards; play the counter to the most frequent.
 * 2. If AI has possession and player rarely plays Feint, override to Shot.
 * 3. Apply a small random mistake rate based on active player's Stamina
 *    (Stamina=1 → 25% mistake chance; Stamina=2 → 0%). Models fatigue:
 *    a tired player won't always pick optimally.
 *
 * Counter table (X most frequent → play Y to beat X):
 *   Press → Shot  (Shot beats Press)
 *   Feint → Press (Press beats Feint)
 *   Shot  → Feint (Feint beats Shot)
 *
 * Falls back to normalAiCard if history is empty.
 *
 * @param gameState - Current match state snapshot
 * @param cardHistory - The player's (home's) card history (last ≤ 3 cards)
 * @returns A CardChoice
 *
 * @example
 * hardAiCard(state, ['press', 'press', 'shot']) // → 'shot' (counters Press)
 */
export function hardAiCard(gameState: AiGameState, cardHistory: CardChoice[]): CardChoice {
  if (cardHistory.length === 0) return normalAiCard(gameState);

  const recent = cardHistory.slice(-3);
  const playerMostFrequent = mostFrequent(recent);

  // Play the counter to the most frequent human card
  const counterMap: Record<CardChoice, CardChoice> = {
    press: 'shot',  // Shot beats Press
    feint: 'press', // Press beats Feint
    shot: 'feint',  // Feint beats Shot
  };
  let choice: CardChoice = counterMap[playerMostFrequent];

  // Possession override: if AI has ball and player doesn't often play Feint (which beats Shot),
  // override to Shot for the goal attempt
  if (gameState.possession === 'away') {
    const feintCount = recent.filter((c) => c === 'feint').length;
    const feintFreq = feintCount / recent.length;
    if (feintFreq < 0.5) {
      choice = 'shot';
    }
  }

  // Stamina-based mistake: lower stamina → higher chance of a random card instead
  // Formula: stamina=1 → 1/4 = 25%, stamina=2 → 0%
  const stamina = gameState.activePlayerStamina ?? 2;
  const mistakeChance = Math.max(0, (2 - stamina) / 4);
  if (Math.random() < mistakeChance) {
    return easyAiCard();
  }

  return choice;
}

// ─── Lineup decision functions ─────────────────────────────────────────────────

/**
 * Easy AI lineup selection — randomly shuffle outfield, take first 6.
 *
 * @param squad - Full available player pool
 * @returns AiLineup with random outfield and first available GK
 *
 * @example
 * easyAiLineup(players) // → { outfield: ['mauno', 'alanen', ...], goalkeeper: 'tommi' }
 */
export function easyAiLineup(squad: Player[]): AiLineup {
  const outfield = squad.filter((p) => !p.position.includes('GK'));
  const goalkeepers = squad.filter((p) => p.position.includes('GK'));

  // Fisher-Yates shuffle on outfield
  const shuffled = [...outfield];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return {
    outfield: shuffled.slice(0, 6).map((p) => p.id),
    goalkeeper: goalkeepers[0]?.id ?? '',
  };
}

/**
 * Normal AI lineup selection — picks the 6 outfield players with highest total stats.
 *
 * @param squad - Full available player pool
 * @param _playerLineup - Human player's lineup IDs (unused at Normal, reserved for future)
 * @returns AiLineup with stat-optimal outfield and first available GK
 *
 * @example
 * normalAiLineup(players, ['alanen', 'mauno']) // → top 6 by stats
 */
export function normalAiLineup(squad: Player[], _playerLineup: string[]): AiLineup {
  const outfield = squad.filter((p) => !p.position.includes('GK'));
  const goalkeepers = squad.filter((p) => p.position.includes('GK'));

  const sorted = [...outfield].sort((a, b) => totalStats(b) - totalStats(a));

  return {
    outfield: sorted.slice(0, 6).map((p) => p.id),
    goalkeeper: goalkeepers[0]?.id ?? '',
  };
}

/**
 * Hard AI lineup selection — picks the 6 outfield players who maximise advantage
 * against the player's chosen tactic.
 *
 * Counter-stat mapping:
 *   Aggressive (boosts Shot) → prioritise Harhautus (Feint counters Shot)
 *   Defensive  (boosts Press) → prioritise Laukaus  (Shot counters Press)
 *   Creative   (boosts Feint) → prioritise Riisto   (Press counters Feint)
 *
 * Within same counter-stat, falls back to total stats.
 *
 * @param squad - Full available player pool
 * @param _playerLineup - Human player's lineup IDs (reserved for future matchup comparison)
 * @param playerTactic - The human's currently chosen tactic (or default 'aggressive')
 * @returns AiLineup optimised against the player's tactic
 *
 * @example
 * hardAiLineup(players, homeIds, 'aggressive') // → picks high-Harhautus players
 */
export function hardAiLineup(
  squad: Player[],
  _playerLineup: string[],
  playerTactic: Tactic,
): AiLineup {
  const outfield = squad.filter((p) => !p.position.includes('GK'));
  const goalkeepers = squad.filter((p) => p.position.includes('GK'));

  // Counter-stat: the stat that wins against the tactic's preferred card
  const counterStat: Record<Tactic, keyof Player['stats']> = {
    aggressive: 'harhautus', // Feint (harhautus) beats Shot (aggressive)
    defensive: 'laukaus',    // Shot (laukaus) beats Press (defensive)
    creative: 'riisto',      // Press (riisto) beats Feint (creative)
  };
  const key = counterStat[playerTactic];

  const sorted = [...outfield].sort((a, b) => {
    const counterDiff = b.stats[key] - a.stats[key];
    if (counterDiff !== 0) return counterDiff;
    return totalStats(b) - totalStats(a);
  });

  return {
    outfield: sorted.slice(0, 6).map((p) => p.id),
    goalkeeper: goalkeepers[0]?.id ?? '',
  };
}

// ─── Tactics decision functions ────────────────────────────────────────────────

/**
 * Easy AI tactics selection — uniformly random.
 *
 * @returns A random Tactic
 *
 * @example
 * easyAiTactics() // → 'aggressive' | 'defensive' | 'creative' (random)
 */
export function easyAiTactics(): Tactic {
  return ALL_TACTICS[Math.floor(Math.random() * ALL_TACTICS.length)];
}

/**
 * Normal AI tactics selection — reads current score.
 *
 * Rules:
 * - AI is ahead → 'defensive' (protect the lead)
 * - AI is behind → 'aggressive' (chase the game)
 * - Draw → random
 *
 * @param gameState - Current match state snapshot
 * @returns A Tactic based on score
 *
 * @example
 * normalAiTactics({ awayGoals: 2, homeGoals: 1, ... }) // → 'defensive'
 */
export function normalAiTactics(gameState: AiGameState): Tactic {
  const { homeGoals, awayGoals } = gameState;
  if (awayGoals > homeGoals) return 'defensive';
  if (awayGoals < homeGoals) return 'aggressive';
  return easyAiTactics();
}

/**
 * Hard AI tactics selection — counters the player's chosen tactic.
 *
 * Counter table (player tactic → AI tactic to win):
 *   Aggressive → Creative  (Feint beats Shot)
 *   Defensive  → Aggressive (Shot beats Press)
 *   Creative   → Defensive  (Press beats Feint)
 *
 * @param _gameState - Match state (unused at Hard, reserved for future score considerations)
 * @param playerTactic - The human's chosen tactic
 * @returns The tactic that counters the player's choice
 *
 * @example
 * hardAiTactics(state, 'aggressive') // → 'creative'
 */
export function hardAiTactics(_gameState: AiGameState, playerTactic: Tactic): Tactic {
  const counterMap: Record<Tactic, Tactic> = {
    aggressive: 'creative',   // Feint beats Shot
    defensive: 'aggressive',  // Shot beats Press
    creative: 'defensive',    // Press beats Feint
  };
  return counterMap[playerTactic];
}

// ─── Convenience dispatcher ────────────────────────────────────────────────────

/**
 * Dispatch to the correct card function based on difficulty.
 *
 * @param difficulty - AI difficulty level
 * @param gameState - Current match state
 * @param cardHistory - Human player's recent card history (for Hard AI)
 * @returns CardChoice for the AI this duel
 *
 * @example
 * pickAiCard('hard', state, ['press', 'press']) // → 'shot'
 */
export function pickAiCard(
  difficulty: AiDifficulty,
  gameState: AiGameState,
  cardHistory: CardChoice[],
): CardChoice {
  switch (difficulty) {
    case 'easy': return easyAiCard();
    case 'normal': return normalAiCard(gameState);
    case 'hard': return hardAiCard(gameState, cardHistory);
  }
}

/**
 * Dispatch to the correct lineup function based on difficulty.
 *
 * @param difficulty - AI difficulty level
 * @param squad - Full player pool
 * @param playerLineup - Human player's lineup IDs
 * @param playerTactic - Human player's current tactic
 * @returns AiLineup for the AI side
 *
 * @example
 * pickAiLineup('normal', players, homeIds, 'aggressive')
 */
export function pickAiLineup(
  difficulty: AiDifficulty,
  squad: Player[],
  playerLineup: string[],
  playerTactic: Tactic,
): AiLineup {
  switch (difficulty) {
    case 'easy': return easyAiLineup(squad);
    case 'normal': return normalAiLineup(squad, playerLineup);
    case 'hard': return hardAiLineup(squad, playerLineup, playerTactic);
  }
}

/**
 * Dispatch to the correct tactics function based on difficulty.
 *
 * @param difficulty - AI difficulty level
 * @param gameState - Current match state
 * @param playerTactic - Human player's current tactic
 * @returns Tactic for the AI side
 *
 * @example
 * pickAiTactics('hard', state, 'aggressive') // → 'creative'
 */
export function pickAiTactics(
  difficulty: AiDifficulty,
  gameState: AiGameState,
  playerTactic: Tactic,
): Tactic {
  switch (difficulty) {
    case 'easy': return easyAiTactics();
    case 'normal': return normalAiTactics(gameState);
    case 'hard': return hardAiTactics(gameState, playerTactic);
  }
}

// ─── Character pick per duel ───────────────────────────────────────────────────

/**
 * AI picks one outfield player to use for this duel.
 *
 * Difficulty rules:
 *   Easy   — fully random from outfield lineup
 *   Normal — highest relevant stat (attacking: max(laukaus, harhautus); defending: torjunta)
 *   Hard   — same as Normal but factors in second-half stamina penalty (-1 all stats for
 *             players whose stamina stat === 1), so a tired star may not be the best pick
 *
 * @param difficulty    - AI difficulty level
 * @param outfieldLineup - The AI's current outfield players (no GK)
 * @param isAttacking   - True if the AI has possession (attacker role)
 * @param half          - Current half (1 or 2) — used to compute stamina penalty
 * @returns The chosen Player object
 *
 * @example
 * pickAiCharacter('normal', outfield, true, 1) // → player with highest max(laukaus, harhautus)
 */
export function pickAiCharacter(
  difficulty: AiDifficulty,
  outfieldLineup: Player[],
  isAttacking: boolean,
  half: 1 | 2,
): Player {
  if (outfieldLineup.length === 0) return outfieldLineup[0];

  switch (difficulty) {
    case 'easy':
      return outfieldLineup[Math.floor(Math.random() * outfieldLineup.length)];

    case 'normal': {
      if (isAttacking) {
        return [...outfieldLineup].sort(
          (a, b) =>
            Math.max(b.stats.laukaus, b.stats.harhautus) -
            Math.max(a.stats.laukaus, a.stats.harhautus),
        )[0];
      }
      return [...outfieldLineup].sort((a, b) => b.stats.torjunta - a.stats.torjunta)[0];
    }

    case 'hard': {
      /**
       * Effective stat in second half: if stamina === 1 the player gets -1 to all stats.
       * We clamp the result to min 1 to match runtime behaviour.
       */
      const effectiveStat = (p: Player): number => {
        const penalty = half === 2 && p.stats.stamina === 1 ? -1 : 0;
        if (isAttacking) {
          return Math.max(
            1,
            Math.max(p.stats.laukaus, p.stats.harhautus) + penalty,
          );
        }
        return Math.max(1, p.stats.torjunta + penalty);
      };
      return [...outfieldLineup].sort((a, b) => effectiveStat(b) - effectiveStat(a))[0];
    }
  }
}

// Re-export Card type alias for consumers that only import from ai.ts
export type { Card };
export { DUELS_PER_HALF };
