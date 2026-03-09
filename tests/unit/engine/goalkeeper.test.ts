import { describe, it, expect } from 'vitest';
import { resolveGoalkeeping, useBrickWall, resetBrickWall } from '../../../src/engine/goalkeeper';

describe('resolveGoalkeeping()', () => {
  it('autosave (Kivimuuri) always saves regardless of power', () => {
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
