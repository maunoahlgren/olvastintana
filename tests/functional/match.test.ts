/**
 * Functional tests — full flow and ability interaction edge cases.
 * These tests will be expanded as Phase 1 game logic is completed.
 *
 * See CLAUDE.md for the full list of flows to cover.
 */

import { describe, it, expect } from 'vitest';
import { matchPoints } from '../../src/engine/match';

describe('matchPoints()', () => {
  it('home win → home gets 3, away gets 0', () => {
    expect(matchPoints(2, 1)).toEqual({ home: 3, away: 0 });
  });
  it('away win → home gets 0, away gets 3', () => {
    expect(matchPoints(0, 1)).toEqual({ home: 0, away: 3 });
  });
  it('draw → both get 1', () => {
    expect(matchPoints(2, 2)).toEqual({ home: 1, away: 1 });
  });
  it('0-0 draw → both get 1', () => {
    expect(matchPoints(0, 0)).toEqual({ home: 1, away: 1 });
  });
});

// TODO: Full match simulation (kickoff → halftime → full time) — Phase 1 #issue
// TODO: Kivimuuri used first half, verified reset at halftime — Phase 1 #issue
// TODO: Estola's Estis + Jyrki's paine in the same duel — Phase 1 #issue
// TODO: Mauno Sattuma draw triggering on duel win — Phase 1 #issue
