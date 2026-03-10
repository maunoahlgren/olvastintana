import { describe, it, expect } from 'vitest';
import { resolveGoalkeeping, useBrickWall, resetBrickWall } from '../../../src/engine/goalkeeper';

describe('resolveGoalkeeping()', () => {
  it('autosave (Kivimuuri) always saves regardless of stats', () => {
    expect(resolveGoalkeeping({ torjunta: 1 }, { laukaus: 10 }, true)).toBe('saved');
  });

  it('keeper torjunta >= shooter laukaus → saved', () => {
    expect(resolveGoalkeeping({ torjunta: 4 }, { laukaus: 4 })).toBe('saved');
    expect(resolveGoalkeeping({ torjunta: 5 }, { laukaus: 3 })).toBe('saved');
  });

  it('keeper torjunta < shooter laukaus → goal', () => {
    expect(resolveGoalkeeping({ torjunta: 3 }, { laukaus: 5 })).toBe('goal');
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
