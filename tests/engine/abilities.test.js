import { describe, it, expect } from 'vitest';
import { brickWall, pressure44, tryHardMode, applyStaminaPenalty } from '../../src/engine/abilities';

describe('brickWall()', () => {
  it('triggers when not used this half', () => {
    const result = brickWall(false);
    expect(result.triggered).toBe(true);
    expect(result.usedThisHalf).toBe(true);
  });

  it('does not trigger when already used', () => {
    const result = brickWall(true);
    expect(result.triggered).toBe(false);
  });
});

describe('pressure44()', () => {
  it('restricts opponent feint when Jyrki wins', () => {
    expect(pressure44('attacker', 'jyrki').restrictOpponentFeint).toBe(true);
  });

  it('does not restrict when Jyrki loses', () => {
    expect(pressure44('defender', 'jyrki').restrictOpponentFeint).toBe(false);
  });

  it('does not restrict for other players', () => {
    expect(pressure44('attacker', 'mauno').restrictOpponentFeint).toBe(false);
  });
});

describe('tryHardMode()', () => {
  it('draws Sattuma when Mauno wins', () => {
    expect(tryHardMode('attacker', 'mauno').drawSattuma).toBe(true);
  });

  it('does not draw Sattuma when Mauno loses', () => {
    expect(tryHardMode('defender', 'mauno').drawSattuma).toBe(false);
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
  });

  it('does not apply penalty in first half', () => {
    const result = applyStaminaPenalty(stats, 1);
    expect(result.pace).toBe(3);
  });

  it('does not apply penalty if stamina > 2', () => {
    const highStamina = { ...stats, stamina: 3 };
    const result = applyStaminaPenalty(highStamina, 2);
    expect(result.pace).toBe(3);
  });

  it('stats do not drop below 1', () => {
    const lowStats = { pace: 1, technique: 1, power: 1, iq: 1, stamina: 1, chaos: 1 };
    const result = applyStaminaPenalty(lowStats, 2);
    expect(result.pace).toBe(1);
  });
});
