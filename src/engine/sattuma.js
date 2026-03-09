/**
 * Sattuma (Fortune) deck engine
 *
 * Weights: 40% Hyvä (good), 35% Paha (bad), 25% Hyvin Paha (very bad)
 * Deck reshuffled after each match.
 */

import sattumaData from '../data/sattuma.json';

const TIER_WEIGHTS = {
  hyva: 0.40,
  paha: 0.35,
  hyvin_paha: 0.25,
};

/**
 * Build a weighted deck array and shuffle it.
 * Returns array of sattuma card objects.
 */
export function buildDeck() {
  const hyva = sattumaData.filter((c) => c.tier === 'hyva');
  const paha = sattumaData.filter((c) => c.tier === 'paha');
  const hyvinPaha = sattumaData.filter((c) => c.tier === 'hyvin_paha');

  // Build weighted pool: repeat cards proportionally
  const pool = [
    ...repeat(hyva, 8),
    ...repeat(paha, 7),
    ...repeat(hyvinPaha, 5),
  ];

  return shuffle(pool);
}

function repeat(arr, times) {
  return Array.from({ length: times }, () => arr).flat();
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Draw the top card from a deck array.
 * Returns { card, remainingDeck }
 * If deck is empty, rebuilds it first.
 */
export function drawCard(deck) {
  const activeDeck = deck.length === 0 ? buildDeck() : [...deck];
  const card = activeDeck.shift();
  return { card, remainingDeck: activeDeck };
}
