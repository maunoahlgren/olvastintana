import { describe, it, expect } from 'vitest';
import { pressure44, tryHardMode, applyStaminaPenalty } from '../../../src/engine/abilities';

// Note: brickWall tests moved to goalkeeper.test.ts

describe('pressure44()', () => {
  it('restricts opponent Feint when Jyrki wins (SQ-07)', () => {
    expect(pressure44('attacker', 'jyrki_orjasniemi').restrictOpponentFeint).toBe(true);
  });

  it('does not restrict when Jyrki loses', () => {
    expect(pressure44('defender', 'jyrki_orjasniemi').restrictOpponentFeint).toBe(false);
  });

  it('does not restrict for other players', () => {
    expect(pressure44('attacker', 'mauno_ahlgren').restrictOpponentFeint).toBe(false);
  });

  it('null result (tie) does not restrict', () => {
    expect(pressure44(null, 'jyrki_orjasniemi').restrictOpponentFeint).toBe(false);
  });
});

describe('tryHardMode()', () => {
  it('signals Sattuma draw when Mauno wins a duel (SQ-04)', () => {
    expect(tryHardMode('attacker', 'mauno_ahlgren').drawSattuma).toBe(true);
  });

  it('does not draw Sattuma when Mauno loses', () => {
    expect(tryHardMode('defender', 'mauno_ahlgren').drawSattuma).toBe(false);
  });

  it('does not draw Sattuma on null result', () => {
    expect(tryHardMode(null, 'mauno_ahlgren').drawSattuma).toBe(false);
  });

  it('does not draw Sattuma for other players', () => {
    expect(tryHardMode('attacker', 'alanen').drawSattuma).toBe(false);
  });
});

describe('applyStaminaPenalty()', () => {
  // stamina=1 → penalty applies in second half
  const stats = { riisto: 3, laukaus: 3, harhautus: 3, torjunta: 3, stamina: 1 };

  it('applies -1 to all card stats in second half when stamina = 1', () => {
    const result = applyStaminaPenalty(stats, 2);
    expect(result.riisto).toBe(2);
    expect(result.laukaus).toBe(2);
    expect(result.harhautus).toBe(2);
    expect(result.torjunta).toBe(2);
  });

  it('does not modify stamina stat itself', () => {
    const result = applyStaminaPenalty(stats, 2);
    expect(result.stamina).toBe(1);
  });

  it('does not apply penalty in first half', () => {
    const result = applyStaminaPenalty(stats, 1);
    expect(result.riisto).toBe(3);
  });

  it('does not apply penalty when stamina >= 2', () => {
    const result = applyStaminaPenalty({ ...stats, stamina: 2 }, 2);
    expect(result.riisto).toBe(3);
  });

  it('stats do not drop below 1', () => {
    const lowStats = { riisto: 1, laukaus: 1, harhautus: 1, torjunta: 1, stamina: 1 };
    const result = applyStaminaPenalty(lowStats, 2);
    expect(result.riisto).toBe(1);
    expect(result.torjunta).toBe(1);
  });
});
