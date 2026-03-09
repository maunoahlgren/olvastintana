import { describe, it, expect } from 'vitest';
import { resolvePossession, secondHalfKickoff, coinFlip } from '../../../src/engine/possession';
import { CARD } from '../../../src/engine/duel';

describe('secondHalfKickoff()', () => {
  it('home first half → away kicks off second half', () => {
    expect(secondHalfKickoff('home')).toBe('away');
  });
  it('away first half → home kicks off second half', () => {
    expect(secondHalfKickoff('away')).toBe('home');
  });
});

describe('coinFlip()', () => {
  it('returns either home or away', () => {
    const result = coinFlip();
    expect(['home', 'away']).toContain(result);
  });
});

describe('resolvePossession()', () => {
  it('null duel result → possession unchanged, no goal attempt', () => {
    const result = resolvePossession('home', null, 'home', CARD.PRESS);
    expect(result.possession).toBe('home');
    expect(result.goalAttempt).toBe(false);
  });

  it('attacker wins without ball → gains possession, no goal attempt', () => {
    const result = resolvePossession('away', 'attacker', 'home', CARD.PRESS);
    expect(result.possession).toBe('home');
    expect(result.goalAttempt).toBe(false);
  });

  it('defender wins → possession goes to defender side', () => {
    const result = resolvePossession('home', 'defender', 'home', CARD.PRESS);
    expect(result.possession).toBe('away');
    expect(result.goalAttempt).toBe(false);
  });

  it('attacker wins WITH ball AND Shot card → goal attempt', () => {
    const result = resolvePossession('home', 'attacker', 'home', CARD.SHOT);
    expect(result.possession).toBe('home');
    expect(result.goalAttempt).toBe(true);
  });

  it('attacker wins WITH ball but NOT Shot card → no goal attempt', () => {
    const result = resolvePossession('home', 'attacker', 'home', CARD.PRESS);
    expect(result.possession).toBe('home');
    expect(result.goalAttempt).toBe(false);
  });
});
