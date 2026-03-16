/**
 * @file derbyMatch.test.ts
 * Unit tests for firebase/derbyMatch.ts — all Firebase ops mocked.
 *
 * Tests cover:
 *   - initMatch: writes correct flat schema to Firebase
 *   - submitLineup: writes JSON lineup + ready flag for correct player key
 *   - submitTriviaAnswer: writes answer flag; awards boost only to first correct
 *   - submitCard: writes card + ready flag
 *   - writeDuelResult: writes result + advances phase to 'duel_result'
 *   - advanceDerbyPhase: calls update with new phase + extra fields
 *   - resetForNextDuel: resets cards and advances duel_index
 *   - submitHalftimeAction: writes action JSON + done flag
 *   - listenToMatch: normalises raw Firebase data into DerbyMatchSnapshot
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('firebase/database', () => ({
  ref:     vi.fn((_db: unknown, path: string) => ({ path })),
  set:     vi.fn(() => Promise.resolve()),
  get:     vi.fn(),
  update:  vi.fn(() => Promise.resolve()),
  // onValue returns an unsubscribe function (mirrors Firebase Realtime Database API)
  onValue: vi.fn(() => vi.fn()),
}));

vi.mock('../../../src/firebase/config', () => ({
  db: { _isMock: true },
}));

import * as firebaseDb from 'firebase/database';
import {
  initMatch,
  submitLineup,
  submitTriviaAnswer,
  submitCard,
  writeDuelResult,
  advanceDerbyPhase,
  resetForNextDuel,
  submitHalftimeAction,
  listenToMatch,
} from '../../../src/firebase/derbyMatch';
import { CARD } from '../../../src/engine/duel';

const mockRef    = vi.mocked(firebaseDb.ref);
const mockSet    = vi.mocked(firebaseDb.set);
const mockGet    = vi.mocked(firebaseDb.get);
const mockUpdate = vi.mocked(firebaseDb.update);
const mockOnVal  = vi.mocked(firebaseDb.onValue);

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── initMatch ────────────────────────────────────────────────────────────────

describe('initMatch()', () => {
  it('calls set with correct initial phase and scores', async () => {
    await initMatch('ABCD', 'p1', 3);
    expect(mockSet).toHaveBeenCalledOnce();
    const [, data] = mockSet.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data.phase).toBe('lineup');
    expect(data.half).toBe(1);
    expect(data.duel_index).toBe(0);
    expect(data.score_home).toBe(0);
    expect(data.score_away).toBe(0);
    expect(data.possession).toBe('p1');
    expect(data.kickoff).toBe('p1');
    expect(data.trivia_index).toBe(3);
    expect(data.trivia_boost).toBeNull();
  });

  it('sets all ready flags to false', async () => {
    await initMatch('ABCD', 'p2', 0);
    const [, data] = mockSet.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data.p1_lineup_ready).toBe(false);
    expect(data.p2_lineup_ready).toBe(false);
    expect(data.p1_card_ready).toBe(false);
    expect(data.p2_card_ready).toBe(false);
    expect(data.p1_halftime_done).toBe(false);
    expect(data.p2_halftime_done).toBe(false);
  });

  it('throws if db is null', async () => {
    vi.mocked(firebaseDb.ref).mockImplementationOnce(() => { throw new Error('no db'); });
    await expect(initMatch('ABCD', 'p1', 0)).rejects.toThrow();
  });
});

// ─── submitLineup ─────────────────────────────────────────────────────────────

describe('submitLineup()', () => {
  it('writes p1 lineup as JSON string and sets p1_lineup_ready', async () => {
    const ids = ['olli_mehtonen', 'mauno_ahlgren', 'tero_backman', 'kimmo_mattila', 'iiro_makela', 'juha_jokinen'];
    await submitLineup('ABCD', 'p1', ids);
    expect(mockUpdate).toHaveBeenCalledOnce();
    const [, data] = mockUpdate.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data['p1_lineup']).toBe(JSON.stringify(ids));
    expect(data['p1_lineup_ready']).toBe(true);
  });

  it('writes p2 lineup with p2_ prefix', async () => {
    const ids = ['id1', 'id2', 'id3', 'id4', 'id5', 'gk_id'];
    await submitLineup('ABCD', 'p2', ids);
    const [, data] = mockUpdate.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data['p2_lineup']).toBe(JSON.stringify(ids));
    expect(data['p2_lineup_ready']).toBe(true);
    expect(data['p1_lineup']).toBeUndefined();
  });
});

// ─── submitTriviaAnswer ───────────────────────────────────────────────────────

describe('submitTriviaAnswer()', () => {
  it('writes player trivia answer as boolean', async () => {
    // correct=false → get() is never called, no mock needed
    await submitTriviaAnswer('ABCD', 'p1', false);
    const [, data] = mockUpdate.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data['p1_trivia']).toBe(false);
  });

  it('awards trivia_boost to first correct answerer', async () => {
    // boost not yet set
    mockGet.mockResolvedValueOnce({ exists: () => false, val: () => null } as ReturnType<typeof mockGet>);
    await submitTriviaAnswer('ABCD', 'p2', true);
    const [, data] = mockUpdate.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data['trivia_boost']).toBe('p2');
  });

  it('does NOT award boost if someone already won it', async () => {
    // boost already set to p1
    mockGet.mockResolvedValueOnce({ exists: () => true, val: () => 'p1' } as ReturnType<typeof mockGet>);
    await submitTriviaAnswer('ABCD', 'p2', true);
    const [, data] = mockUpdate.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data['trivia_boost']).toBeUndefined();
  });

  it('does NOT award boost for wrong answer', async () => {
    await submitTriviaAnswer('ABCD', 'p1', false);
    const [, data] = mockUpdate.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data['trivia_boost']).toBeUndefined();
  });
});

// ─── submitCard ───────────────────────────────────────────────────────────────

describe('submitCard()', () => {
  it('writes card and sets ready flag for p1', async () => {
    await submitCard('ABCD', 'p1', CARD.SHOT);
    const [, data] = mockUpdate.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data['p1_card']).toBe('shot');
    expect(data['p1_card_ready']).toBe(true);
  });

  it('writes card and sets ready flag for p2', async () => {
    await submitCard('ABCD', 'p2', CARD.FEINT);
    const [, data] = mockUpdate.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data['p2_card']).toBe('feint');
    expect(data['p2_card_ready']).toBe(true);
  });
});

// ─── writeDuelResult ──────────────────────────────────────────────────────────

describe('writeDuelResult()', () => {
  it('writes duel result fields and advances to duel_result phase', async () => {
    await writeDuelResult('ABCD', CARD.SHOT, CARD.PRESS, 'attacker', true, 1, 0, 'p2');
    const [, data] = mockUpdate.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data.phase).toBe('duel_result');
    expect(data.result_atk_card).toBe('shot');
    expect(data.result_def_card).toBe('press');
    expect(data.result_winner).toBe('attacker');
    expect(data.result_scored).toBe(true);
    expect(data.score_home).toBe(1);
    expect(data.score_away).toBe(0);
    expect(data.possession).toBe('p2');
  });
});

// ─── advanceDerbyPhase ────────────────────────────────────────────────────────

describe('advanceDerbyPhase()', () => {
  it('writes new phase', async () => {
    await advanceDerbyPhase('ABCD', 'trivia');
    const [, data] = mockUpdate.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data.phase).toBe('trivia');
  });

  it('merges additional updates atomically', async () => {
    await advanceDerbyPhase('ABCD', 'duel', { duel_index: 2, p1_card: null });
    const [, data] = mockUpdate.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data.phase).toBe('duel');
    expect(data.duel_index).toBe(2);
    expect(data.p1_card).toBeNull();
  });
});

// ─── resetForNextDuel ─────────────────────────────────────────────────────────

describe('resetForNextDuel()', () => {
  it('resets card fields and advances duel_index', async () => {
    await resetForNextDuel('ABCD', 3, false, 'p1');
    const [, data] = mockUpdate.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data.phase).toBe('duel');
    expect(data.duel_index).toBe(3);
    expect(data.p1_card).toBeNull();
    expect(data.p2_card).toBeNull();
    expect(data.p1_card_ready).toBe(false);
    expect(data.p2_card_ready).toBe(false);
    expect(data.result_winner).toBeNull();
    expect(data.possession).toBe('p1');
  });

  it('sets half=2 and resets halftime flags when newHalf is true', async () => {
    await resetForNextDuel('ABCD', 0, true, 'p2');
    const [, data] = mockUpdate.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data.half).toBe(2);
    expect(data.p1_halftime_done).toBe(false);
    expect(data.p2_halftime_done).toBe(false);
    expect(data.possession).toBe('p2');
  });
});

// ─── submitHalftimeAction ─────────────────────────────────────────────────────

describe('submitHalftimeAction()', () => {
  it('writes halftime action as JSON and sets done flag', async () => {
    const action = { type: 'tactic' as const, tactic: 'aggressive' };
    await submitHalftimeAction('ABCD', 'p1', action);
    const [, data] = mockUpdate.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data['p1_halftime_done']).toBe(true);
    expect(JSON.parse(data['p1_halftime_action'] as string)).toEqual(action);
  });

  it('writes skip action for p2', async () => {
    await submitHalftimeAction('ABCD', 'p2', { type: 'skip' });
    const [, data] = mockUpdate.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data['p2_halftime_done']).toBe(true);
    expect(data['p1_halftime_done']).toBeUndefined();
  });
});

// ─── listenToMatch ────────────────────────────────────────────────────────────

describe('listenToMatch()', () => {
  it('normalises raw Firebase data into DerbyMatchSnapshot', () => {
    const rawData = {
      phase: 'duel',
      half: 1,
      duel_index: 2,
      score_home: 1,
      score_away: 0,
      possession: 'p1',
      kickoff: 'p1',
      trivia_index: 0,
      trivia_boost: 'p1',
      p1_lineup_ready: true,
      p2_lineup_ready: false,
      p1_lineup: JSON.stringify(['a', 'b', 'c', 'd', 'e', 'gk']),
      p2_lineup: null,
      p1_trivia: true,
      p2_trivia: null,
      p1_card: 'shot',
      p2_card: null,
      p1_card_ready: true,
      p2_card_ready: false,
      result_atk_card: null,
      result_def_card: null,
      result_winner: null,
      result_scored: false,
      p1_halftime_done: false,
      p2_halftime_done: false,
      p1_halftime_action: null,
      p2_halftime_action: null,
    };

    mockOnVal.mockImplementationOnce((_ref, callback) => {
      callback({ exists: () => true, val: () => rawData });
      return vi.fn();
    });

    let received: ReturnType<typeof listenToMatch> extends (() => void) ? never : Parameters<Parameters<typeof listenToMatch>[1]>[0] | null = null;

    listenToMatch('ABCD', (snap) => { received = snap; });

    expect(received).not.toBeNull();
    if (received) {
      expect((received as { phase: string }).phase).toBe('duel');
      expect((received as { half: number }).half).toBe(1);
      expect((received as { duelIndex: number }).duelIndex).toBe(2);
      expect((received as { scoreHome: number }).scoreHome).toBe(1);
      expect((received as { p1LineupReady: boolean }).p1LineupReady).toBe(true);
      expect((received as { p2LineupReady: boolean }).p2LineupReady).toBe(false);
      expect((received as { p1Lineup: string[] }).p1Lineup).toEqual(['a', 'b', 'c', 'd', 'e', 'gk']);
      expect((received as { p2Lineup: string[] }).p2Lineup).toEqual([]);
      expect((received as { triviaBoost: string }).triviaBoost).toBe('p1');
    }
  });

  it('returns an unsubscribe function', () => {
    // onValue mock returns vi.fn() (an unsubscribe fn); listenToMatch must forward it
    const unsub = listenToMatch('ABCD', vi.fn());
    expect(typeof unsub).toBe('function');
  });
});
