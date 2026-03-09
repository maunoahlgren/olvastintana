import { describe, it, expect } from 'vitest';
import { buildDeck, drawCard } from '../../src/engine/sattuma';

describe('buildDeck()', () => {
  it('returns a non-empty array', () => {
    const deck = buildDeck();
    expect(deck.length).toBeGreaterThan(0);
  });

  it('contains cards of all three tiers', () => {
    const deck = buildDeck();
    const tiers = new Set(deck.map((c) => c.tier));
    expect(tiers.has('hyva')).toBe(true);
    expect(tiers.has('paha')).toBe(true);
    expect(tiers.has('hyvin_paha')).toBe(true);
  });

  it('roughly maintains tier weights (smoke test over 1000 draws)', () => {
    const deck = buildDeck();
    const total = deck.length;
    const hyvaCount = deck.filter((c) => c.tier === 'hyva').length;
    const pahaCount = deck.filter((c) => c.tier === 'paha').length;
    const hyvinPahaCount = deck.filter((c) => c.tier === 'hyvin_paha').length;

    // Rough checks — weights should be approximately 40/35/25
    expect(hyvaCount / total).toBeGreaterThan(0.30);
    expect(pahaCount / total).toBeGreaterThan(0.25);
    expect(hyvinPahaCount / total).toBeGreaterThan(0.15);
  });
});

describe('drawCard()', () => {
  it('returns a card and a shorter deck', () => {
    const deck = buildDeck();
    const { card, remainingDeck } = drawCard(deck);
    expect(card).toBeDefined();
    expect(card.id).toBeDefined();
    expect(remainingDeck.length).toBe(deck.length - 1);
  });

  it('rebuilds deck when empty', () => {
    const { card, remainingDeck } = drawCard([]);
    expect(card).toBeDefined();
    expect(remainingDeck.length).toBeGreaterThan(0);
  });
});
