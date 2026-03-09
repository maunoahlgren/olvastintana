import { describe, it, expect } from 'vitest';
import { resolveDuel, beats, resolveGoalkeeping, CARD } from '../../src/engine/duel';

const BASE_STATS = { pace: 3, technique: 3, power: 3, iq: 3, stamina: 3, chaos: 3 };

// --- Triangle ---

describe('beats()', () => {
  it('Press beats Feint', () => expect(beats(CARD.PRESS, CARD.FEINT)).toBe(true));
  it('Feint beats Shot', () => expect(beats(CARD.FEINT, CARD.SHOT)).toBe(true));
  it('Shot beats Press', () => expect(beats(CARD.SHOT, CARD.PRESS)).toBe(true));

  it('Feint does not beat Press', () => expect(beats(CARD.FEINT, CARD.PRESS)).toBe(false));
  it('Shot does not beat Feint', () => expect(beats(CARD.SHOT, CARD.FEINT)).toBe(false));
  it('Press does not beat Shot', () => expect(beats(CARD.PRESS, CARD.SHOT)).toBe(false));
});

// --- resolveDuel straight wins ---

describe('resolveDuel() — straight wins', () => {
  it('attacker Press vs defender Feint → attacker wins', () => {
    expect(resolveDuel(CARD.PRESS, CARD.FEINT, BASE_STATS, BASE_STATS)).toBe('attacker');
  });
  it('attacker Feint vs defender Shot → attacker wins', () => {
    expect(resolveDuel(CARD.FEINT, CARD.SHOT, BASE_STATS, BASE_STATS)).toBe('attacker');
  });
  it('attacker Shot vs defender Press → attacker wins', () => {
    expect(resolveDuel(CARD.SHOT, CARD.PRESS, BASE_STATS, BASE_STATS)).toBe('attacker');
  });

  it('attacker Feint vs defender Press → defender wins', () => {
    expect(resolveDuel(CARD.FEINT, CARD.PRESS, BASE_STATS, BASE_STATS)).toBe('defender');
  });
  it('attacker Shot vs defender Feint → defender wins', () => {
    expect(resolveDuel(CARD.SHOT, CARD.FEINT, BASE_STATS, BASE_STATS)).toBe('defender');
  });
  it('attacker Press vs defender Shot → defender wins', () => {
    expect(resolveDuel(CARD.PRESS, CARD.SHOT, BASE_STATS, BASE_STATS)).toBe('defender');
  });
});

// --- resolveDuel ties (same card) ---

describe('resolveDuel() — ties with stat tiebreak', () => {
  it('Press tie: higher attacker Pace wins', () => {
    const aStats = { ...BASE_STATS, pace: 5 };
    const dStats = { ...BASE_STATS, pace: 3 };
    expect(resolveDuel(CARD.PRESS, CARD.PRESS, aStats, dStats)).toBe('attacker');
  });

  it('Press tie: higher defender Pace wins', () => {
    const aStats = { ...BASE_STATS, pace: 2 };
    const dStats = { ...BASE_STATS, pace: 4 };
    expect(resolveDuel(CARD.PRESS, CARD.PRESS, aStats, dStats)).toBe('defender');
  });

  it('Feint tie: higher attacker Technique wins', () => {
    const aStats = { ...BASE_STATS, technique: 5 };
    const dStats = { ...BASE_STATS, technique: 3 };
    expect(resolveDuel(CARD.FEINT, CARD.FEINT, aStats, dStats)).toBe('attacker');
  });

  it('Shot tie: higher attacker Power wins', () => {
    const aStats = { ...BASE_STATS, power: 4 };
    const dStats = { ...BASE_STATS, power: 2 };
    expect(resolveDuel(CARD.SHOT, CARD.SHOT, aStats, dStats)).toBe('attacker');
  });

  it('equal stats on tie → null (nothing happens)', () => {
    expect(resolveDuel(CARD.PRESS, CARD.PRESS, BASE_STATS, BASE_STATS)).toBeNull();
    expect(resolveDuel(CARD.FEINT, CARD.FEINT, BASE_STATS, BASE_STATS)).toBeNull();
    expect(resolveDuel(CARD.SHOT, CARD.SHOT, BASE_STATS, BASE_STATS)).toBeNull();
  });
});

// --- Goalkeeping ---

describe('resolveGoalkeeping()', () => {
  it('autosave always saves', () => {
    expect(resolveGoalkeeping({ power: 1 }, { power: 10 }, true)).toBe('saved');
  });

  it('keeper power >= shooter power → saved', () => {
    expect(resolveGoalkeeping({ power: 4 }, { power: 4 })).toBe('saved');
    expect(resolveGoalkeeping({ power: 5 }, { power: 3 })).toBe('saved');
  });

  it('keeper power < shooter power → goal', () => {
    expect(resolveGoalkeeping({ power: 3 }, { power: 5 })).toBe('goal');
  });
});
