/**
 * @file derbyStore.test.ts
 * Unit tests for store/derbyStore.ts.
 *
 * Tests cover:
 *   - Initial state defaults
 *   - setFromFirebase: bulk update from a DerbyMatchSnapshot
 *   - reset: restores all fields to initial state
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useDerbyStore } from '../../../src/store/derbyStore';
import type { DerbyMatchSnapshot } from '../../../src/firebase/derbyMatch';
import { CARD } from '../../../src/engine/duel';

beforeEach(() => {
  useDerbyStore.getState().reset();
});

// ─── Initial state ────────────────────────────────────────────────────────────

describe('initial state', () => {
  it('starts with null phase', () => {
    expect(useDerbyStore.getState().phase).toBeNull();
  });

  it('starts with half=1 and duelIndex=0', () => {
    const s = useDerbyStore.getState();
    expect(s.half).toBe(1);
    expect(s.duelIndex).toBe(0);
  });

  it('starts with 0-0 score', () => {
    const s = useDerbyStore.getState();
    expect(s.scoreHome).toBe(0);
    expect(s.scoreAway).toBe(0);
  });

  it('starts with empty lineups', () => {
    const s = useDerbyStore.getState();
    expect(s.p1Lineup).toEqual([]);
    expect(s.p2Lineup).toEqual([]);
  });

  it('starts with null possession and kickoff', () => {
    const s = useDerbyStore.getState();
    expect(s.possession).toBeNull();
    expect(s.kickoff).toBeNull();
  });

  it('starts with no ready flags set', () => {
    const s = useDerbyStore.getState();
    expect(s.p1LineupReady).toBe(false);
    expect(s.p2LineupReady).toBe(false);
    expect(s.p1CardReady).toBe(false);
    expect(s.p2CardReady).toBe(false);
    expect(s.p1HalftimeDone).toBe(false);
    expect(s.p2HalftimeDone).toBe(false);
  });
});

// ─── setFromFirebase ─────────────────────────────────────────────────────────

const sampleSnap: DerbyMatchSnapshot = {
  phase: 'duel',
  half: 1,
  duelIndex: 3,
  scoreHome: 2,
  scoreAway: 1,
  possession: 'p2',
  kickoff: 'p1',
  triviaIndex: 2,
  triviaBoost: 'p1',
  p1LineupReady: true,
  p2LineupReady: true,
  p1Lineup: ['a', 'b', 'c', 'd', 'e', 'gk1'],
  p2Lineup: ['f', 'g', 'h', 'i', 'j', 'gk2'],
  p1Trivia: true,
  p2Trivia: false,
  p1CardReady: false,
  p2CardReady: false,
  p1Card: null,
  p2Card: null,
  resultAtkCard: null,
  resultDefCard: null,
  resultWinner: null,
  resultScored: false,
  p1HalftimeDone: false,
  p2HalftimeDone: false,
  p1HalftimeAction: null,
  p2HalftimeAction: null,
};

describe('setFromFirebase()', () => {
  it('updates phase', () => {
    useDerbyStore.getState().setFromFirebase(sampleSnap);
    expect(useDerbyStore.getState().phase).toBe('duel');
  });

  it('updates score', () => {
    useDerbyStore.getState().setFromFirebase(sampleSnap);
    const s = useDerbyStore.getState();
    expect(s.scoreHome).toBe(2);
    expect(s.scoreAway).toBe(1);
  });

  it('updates possession and kickoff', () => {
    useDerbyStore.getState().setFromFirebase(sampleSnap);
    const s = useDerbyStore.getState();
    expect(s.possession).toBe('p2');
    expect(s.kickoff).toBe('p1');
  });

  it('updates duelIndex and half', () => {
    useDerbyStore.getState().setFromFirebase(sampleSnap);
    const s = useDerbyStore.getState();
    expect(s.duelIndex).toBe(3);
    expect(s.half).toBe(1);
  });

  it('updates lineups', () => {
    useDerbyStore.getState().setFromFirebase(sampleSnap);
    const s = useDerbyStore.getState();
    expect(s.p1Lineup).toEqual(['a', 'b', 'c', 'd', 'e', 'gk1']);
    expect(s.p2Lineup).toEqual(['f', 'g', 'h', 'i', 'j', 'gk2']);
  });

  it('updates trivia state', () => {
    useDerbyStore.getState().setFromFirebase(sampleSnap);
    const s = useDerbyStore.getState();
    expect(s.triviaBoost).toBe('p1');
    expect(s.p1Trivia).toBe(true);
    expect(s.p2Trivia).toBe(false);
  });

  it('updates to duel_result phase with result data', () => {
    const resultSnap: DerbyMatchSnapshot = {
      ...sampleSnap,
      phase: 'duel_result',
      resultAtkCard: CARD.SHOT,
      resultDefCard: CARD.PRESS,
      resultWinner: 'attacker',
      resultScored: true,
    };
    useDerbyStore.getState().setFromFirebase(resultSnap);
    const s = useDerbyStore.getState();
    expect(s.phase).toBe('duel_result');
    expect(s.resultAtkCard).toBe(CARD.SHOT);
    expect(s.resultDefCard).toBe(CARD.PRESS);
    expect(s.resultWinner).toBe('attacker');
    expect(s.resultScored).toBe(true);
  });

  it('updates halftime state', () => {
    const htSnap: DerbyMatchSnapshot = {
      ...sampleSnap,
      phase: 'halftime',
      p1HalftimeDone: true,
      p1HalftimeAction: { type: 'tactic', tactic: 'aggressive' },
    };
    useDerbyStore.getState().setFromFirebase(htSnap);
    const s = useDerbyStore.getState();
    expect(s.p1HalftimeDone).toBe(true);
    expect(s.p1HalftimeAction).toEqual({ type: 'tactic', tactic: 'aggressive' });
  });

  it('multiple calls reflect the latest snapshot', () => {
    useDerbyStore.getState().setFromFirebase(sampleSnap);
    useDerbyStore.getState().setFromFirebase({ ...sampleSnap, scoreHome: 5 });
    expect(useDerbyStore.getState().scoreHome).toBe(5);
  });
});

// ─── reset ────────────────────────────────────────────────────────────────────

describe('reset()', () => {
  it('restores initial state after setFromFirebase', () => {
    useDerbyStore.getState().setFromFirebase(sampleSnap);
    useDerbyStore.getState().reset();
    const s = useDerbyStore.getState();
    expect(s.phase).toBeNull();
    expect(s.scoreHome).toBe(0);
    expect(s.scoreAway).toBe(0);
    expect(s.p1Lineup).toEqual([]);
    expect(s.possession).toBeNull();
  });
});
