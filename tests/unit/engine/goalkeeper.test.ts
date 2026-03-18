import { describe, it, expect } from 'vitest';
import { resolveGoalkeeping, useBrickWall, resetBrickWall } from '../../../src/engine/goalkeeper';

describe('resolveGoalkeeping()', () => {
  it('autosave (Kivimuuri) always saves regardless of stats', () => {
    expect(resolveGoalkeeping({ torjunta: 1 }, { laukaus: 10, harhautus: 8 }, true)).toBe('saved');
  });

  it('keeper torjunta >= max(laukaus, harhautus) → saved', () => {
    expect(resolveGoalkeeping({ torjunta: 4 }, { laukaus: 4, harhautus: 2 })).toBe('saved');
    expect(resolveGoalkeeping({ torjunta: 5 }, { laukaus: 3, harhautus: 1 })).toBe('saved');
    // harhautus is higher — torjunta must beat max
    expect(resolveGoalkeeping({ torjunta: 5 }, { laukaus: 3, harhautus: 5 })).toBe('saved');
  });

  it('keeper torjunta < max(laukaus, harhautus) → goal', () => {
    expect(resolveGoalkeeping({ torjunta: 3 }, { laukaus: 5, harhautus: 2 })).toBe('goal');
  });

  it('harhautus higher than laukaus → uses harhautus for shot power', () => {
    // laukaus=2 would be saved (torjunta=4 >= 2), but harhautus=5 → goal
    expect(resolveGoalkeeping({ torjunta: 4 }, { laukaus: 2, harhautus: 5 })).toBe('goal');
  });

  it('laukaus higher than harhautus → uses laukaus for shot power', () => {
    // harhautus=1 would be saved (torjunta=4 >= 1), laukaus=6 → goal
    expect(resolveGoalkeeping({ torjunta: 4 }, { laukaus: 6, harhautus: 1 })).toBe('goal');
  });

  it('equal laukaus and harhautus → uses that value for shot power', () => {
    expect(resolveGoalkeeping({ torjunta: 3 }, { laukaus: 3, harhautus: 3 })).toBe('saved');
    expect(resolveGoalkeeping({ torjunta: 2 }, { laukaus: 3, harhautus: 3 })).toBe('goal');
  });
});

describe('useBrickWall()', () => {
  it('triggers and marks used when not used this half', () => {
    const result = useBrickWall({ usedThisHalf: false });
    expect(result.triggered).toBe(true);
    expect(result.state.usedThisHalf).toBe(true);
  });

  it('does not trigger when already used this half', () => {
    const result = useBrickWall({ usedThisHalf: true });
    expect(result.triggered).toBe(false);
    expect(result.state.usedThisHalf).toBe(true);
  });
});

describe('resetBrickWall()', () => {
  it('returns fresh state with usedThisHalf = false', () => {
    expect(resetBrickWall()).toEqual({ usedThisHalf: false });
  });
});
