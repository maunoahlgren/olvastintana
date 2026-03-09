import { describe, it, expect } from 'vitest';
import { pressure44, tryHardMode, applyStaminaPenalty } from '../../../src/engine/abilities';

// Note: brickWall tests moved to goalkeeper.test.ts

describe('pressure44()', () => {
  it('restricts opponent Feint when Jyrki wins (SQ-07)', () => {
    expect(pressure44('attacker', 'jyrki').restrictOpponentFeint).toBe(true);
  });

  it('does not restrict when Jyrki loses', () => {
    expect(pressure44('defender', 'jyrki').restrictOpponentFeint).toBe(false);
  });

  it('does not restrict for other players', () => {
    expect(pressure44('attacker', 'mauno').restrictOpponentFeint).toBe(false);
  });

  it('null result (tie) does not restrict', () => {
    expect(pressure44(null, 'jyrki').restrictOpponentFeint).toBe(false);
  });
});

describe('tryHardMode()', () => {
  it('signals Sattuma draw when Mauno wins a duel (SQ-04)', () => {
    expect(tryHardMode('attacker', 'mauno').drawSattuma).toBe(true);
  });

  it('does not draw Sattuma when Mauno loses', () => {
    expect(tryHardMode('defender', 'mauno').drawSattuma).toBe(false);
  });

  it('does not draw Sattuma on null result', () => {
    expect(tryHardMode(null, 'mauno').drawSattuma).toBe(false);
  });

  it('does not draw Sattuma for other players', () => {
    expect(tryHardMode('attacker', 'alanen').drawSattuma).toBe(false);
  });
});

describe('applyStaminaPenalty()', () => {
  const stats = { pace: 3, technique: 3, power: 3, iq: 3, stamina: 2, chaos: 3 };

  it('applies -1 to all stats in second half when stamina <= 2', () => {
    const result = applyStaminaPenalty(stats, 2);
    expect(result.pace).toBe(2);
    expect(result.technique).toBe(2);
    expect(result.power).toBe(2);
    expect(result.iq).toBe(2);
    expect(result.chaos).toBe(2);
  });

  it('does not modify stamina stat itself', () => {
    const result = applyStaminaPenalty(stats, 2);
    expect(result.stamina).toBe(2);
  });

  it('does not apply penalty in first half', () => {
    const result = applyStaminaPenalty(stats, 1);
    expect(result.pace).toBe(3);
  });

  it('does not apply penalty when stamina > 2', () => {
    const result = applyStaminaPenalty({ ...stats, stamina: 3 }, 2);
    expect(result.pace).toBe(3);
  });

  it('stats do not drop below 1', () => {
    const lowStats = { pace: 1, technique: 1, power: 1, iq: 1, stamina: 1, chaos: 1 };
    const result = applyStaminaPenalty(lowStats, 2);
    expect(result.pace).toBe(1);
    expect(result.chaos).toBe(1);
  });
});
