/**
 * @file sattuma.ts
 * Sattuma (Fortune) deck engine — pure functions, no side effects.
 *
 * Tier weights: 40% Hyvä (good), 35% Paha (bad), 25% Hyvin Paha (very bad)
 * Deck is reshuffled after each match.
 */

import sattumaData from '../data/sattuma.json';

export type SattumaTier = 'hyva' | 'paha' | 'hyvin_paha';

export interface SattumaCard {
  id: string;
  tier: SattumaTier;
  name_fi: string;
  name_en: string;
  effect: string;
}

/** Multipliers used when building the weighted deck pool */
const TIER_REPEAT: Record<SattumaTier, number> = {
  hyva: 8,       // ~40%
  paha: 7,       // ~35%
  hyvin_paha: 5, // ~25%
};

/**
 * Build a weighted, shuffled Sattuma deck.
 * Cards are repeated proportionally to their tier weight, then shuffled.
 *
 * @returns Shuffled array of SattumaCard objects
 *
 * @example
 * const deck = buildDeck();
 * deck.length; // > 0
 */
export function buildDeck(): SattumaCard[] {
  const cards = sattumaData as SattumaCard[];
  const pool: SattumaCard[] = [];

  for (const tier of Object.keys(TIER_REPEAT) as SattumaTier[]) {
    const tierCards = cards.filter((c) => c.tier === tier);
    const repeat = TIER_REPEAT[tier];
    for (let i = 0; i < repeat; i++) {
      pool.push(...tierCards);
    }
  }

  return shuffle(pool);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Draw the top card from the deck.
 * If the deck is empty, a new deck is built first.
 *
 * @param deck - Current deck state
 * @returns The drawn card and the remaining deck
 *
 * @example
 * const { card, remainingDeck } = drawCard(deck);
 */
export function drawCard(deck: SattumaCard[]): {
  card: SattumaCard;
  remainingDeck: SattumaCard[];
} {
  const activeDeck = deck.length === 0 ? buildDeck() : [...deck];
  const card = activeDeck.shift()!;
  return { card, remainingDeck: activeDeck };
}
