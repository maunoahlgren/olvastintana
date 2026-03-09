import { describe, it, expect } from 'vitest';
import { buildDeck, drawCard } from '../../../src/engine/sattuma';

describe('buildDeck()', () => {
  it('returns a non-empty array', () => {
    expect(buildDeck().length).toBeGreaterThan(0);
  });

  it('contains cards of all three tiers', () => {
    const tiers = new Set(buildDeck().map((c) => c.tier));
    expect(tiers.has('hyva')).toBe(true);
    expect(tiers.has('paha')).toBe(true);
    expect(tiers.has('hyvin_paha')).toBe(true);
  });

  it('all cards have required fields (id, tier, name_fi, name_en, effect)', () => {
    for (const card of buildDeck()) {
      expect(card.id).toBeTruthy();
      expect(card.tier).toBeTruthy();
      expect(card.name_fi).toBeTruthy();
      expect(card.name_en).toBeTruthy();
      expect(card.effect).toBeTruthy();
    }
  });

  it('tier weights are approximately 40% / 35% / 25%', () => {
    const deck = buildDeck();
    const total = deck.length;
    const hyvaRatio = deck.filter((c) => c.tier === 'hyva').length / total;
    const pahaRatio = deck.filter((c) => c.tier === 'paha').length / total;
    const hyvinPahaRatio = deck.filter((c) => c.tier === 'hyvin_paha').length / total;

    expect(hyvaRatio).toBeGreaterThan(0.30);
    expect(pahaRatio).toBeGreaterThan(0.25);
    expect(hyvinPahaRatio).toBeGreaterThan(0.15);
  });
});

describe('drawCard()', () => {
  it('returns a card and a deck one shorter than before', () => {
    const deck = buildDeck();
    const { card, remainingDeck } = drawCard(deck);
    expect(card).toBeDefined();
    expect(card.id).toBeTruthy();
    expect(remainingDeck.length).toBe(deck.length - 1);
  });

  it('rebuilds deck automatically when called with empty deck', () => {
    const { card, remainingDeck } = drawCard([]);
    expect(card).toBeDefined();
    expect(remainingDeck.length).toBeGreaterThan(0);
  });
});
