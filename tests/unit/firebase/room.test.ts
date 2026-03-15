/**
 * @file room.test.ts
 * Unit tests for firebase/room.ts — pure functions and mocked Firebase operations.
 *
 * Firebase SDK is mocked entirely so these tests run without any network.
 * Only generateRoomCode() is tested as a true pure function.
 * createRoom / joinRoom / listenToRoom / leaveRoom are tested via mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock firebase/database ───────────────────────────────────────────────────
// Must be hoisted before any import of the module under test.

vi.mock('firebase/database', () => ({
  ref:     vi.fn((_db: unknown, path: string) => ({ path })),
  set:     vi.fn(() => Promise.resolve()),
  get:     vi.fn(),
  onValue: vi.fn(),
  remove:  vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../src/firebase/config', () => ({
  // Provide a non-null db so guards don't short-circuit
  db: { _isMock: true },
}));

import * as firebaseDb from 'firebase/database';
import {
  generateRoomCode,
  createRoom,
  joinRoom,
  listenToRoom,
  leaveRoom,
} from '../../../src/firebase/room';

const mockRef     = vi.mocked(firebaseDb.ref);
const mockSet     = vi.mocked(firebaseDb.set);
const mockGet     = vi.mocked(firebaseDb.get);
const mockOnValue = vi.mocked(firebaseDb.onValue);
const mockRemove  = vi.mocked(firebaseDb.remove);

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── generateRoomCode ─────────────────────────────────────────────────────────

describe('generateRoomCode()', () => {
  it('returns a 4-character string', () => {
    expect(generateRoomCode()).toHaveLength(4);
  });

  it('returns only uppercase alphanumeric characters from the safe charset', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/);
    }
  });

  it('does not contain ambiguous chars (0, O, 1, I)', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateRoomCode();
      expect(code).not.toMatch(/[0O1I]/);
    }
  });

  it('generates different codes on repeated calls (probabilistic)', () => {
    const codes = new Set(Array.from({ length: 20 }, generateRoomCode));
    // With 32^4 ≈ 1M combinations, 20 calls should almost certainly yield > 1 unique
    expect(codes.size).toBeGreaterThan(1);
  });
});

// ─── createRoom ──────────────────────────────────────────────────────────────

describe('createRoom()', () => {
  it('calls set with the correct room path', async () => {
    await createRoom('G7KP', 'olli_mehtonen', 'OlliM');
    expect(mockRef).toHaveBeenCalledWith(expect.anything(), 'rooms/G7KP');
    expect(mockSet).toHaveBeenCalledTimes(1);
  });

  it('writes state: lobby', async () => {
    await createRoom('G7KP', 'olli_mehtonen', 'OlliM');
    const written = mockSet.mock.calls[0][1] as Record<string, unknown>;
    expect(written.state).toBe('lobby');
  });

  it('writes host managerId', async () => {
    await createRoom('G7KP', 'olli_mehtonen', 'OlliM');
    const written = mockSet.mock.calls[0][1] as Record<string, unknown>;
    expect(written.host).toBe('olli_mehtonen');
  });

  it('includes player entry with is_host: true', async () => {
    await createRoom('G7KP', 'olli_mehtonen', 'OlliM');
    const written = mockSet.mock.calls[0][1] as {
      players: Record<string, { is_host: boolean }>;
    };
    expect(written.players['olli_mehtonen'].is_host).toBe(true);
  });
});

// ─── joinRoom ────────────────────────────────────────────────────────────────

describe('joinRoom()', () => {
  it('returns true when room state exists', async () => {
    mockGet.mockResolvedValueOnce({ exists: () => true } as never);
    const result = await joinRoom('G7KP', 'mauno_ahlgren', 'Mauno');
    expect(result).toBe(true);
  });

  it('returns false when room does not exist', async () => {
    mockGet.mockResolvedValueOnce({ exists: () => false } as never);
    const result = await joinRoom('XXXX', 'mauno_ahlgren', 'Mauno');
    expect(result).toBe(false);
  });

  it('calls set with player path when room exists', async () => {
    mockGet.mockResolvedValueOnce({ exists: () => true } as never);
    await joinRoom('G7KP', 'mauno_ahlgren', 'Mauno');
    expect(mockRef).toHaveBeenCalledWith(
      expect.anything(),
      'rooms/G7KP/players/mauno_ahlgren',
    );
    expect(mockSet).toHaveBeenCalledTimes(1);
  });

  it('does not call set when room does not exist', async () => {
    mockGet.mockResolvedValueOnce({ exists: () => false } as never);
    await joinRoom('XXXX', 'mauno_ahlgren', 'Mauno');
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('writes is_host: false for joining player', async () => {
    mockGet.mockResolvedValueOnce({ exists: () => true } as never);
    await joinRoom('G7KP', 'mauno_ahlgren', 'Mauno');
    const written = mockSet.mock.calls[0][1] as { is_host: boolean };
    expect(written.is_host).toBe(false);
  });
});

// ─── listenToRoom ────────────────────────────────────────────────────────────

describe('listenToRoom()', () => {
  it('returns an unsubscribe function', () => {
    const mockUnsubscribe = vi.fn();
    mockOnValue.mockReturnValueOnce(mockUnsubscribe as never);
    const unsub = listenToRoom('G7KP', vi.fn());
    expect(typeof unsub).toBe('function');
  });

  it('calls onValue with the correct room ref', () => {
    mockOnValue.mockReturnValueOnce(vi.fn() as never);
    listenToRoom('G7KP', vi.fn());
    expect(mockRef).toHaveBeenCalledWith(expect.anything(), 'rooms/G7KP');
    expect(mockOnValue).toHaveBeenCalledTimes(1);
  });

  it('calls onUpdate when Firebase snapshot arrives', () => {
    const onUpdate = vi.fn();
    mockOnValue.mockImplementationOnce((_ref, cb) => {
      // Simulate an immediate snapshot
      cb({
        exists: () => true,
        val: () => ({
          state: 'lobby',
          players: {
            olli_mehtonen: {
              display_name: 'OlliM',
              joined_at: 1000,
              is_host: true,
            },
          },
        }),
      });
      return vi.fn();
    });

    listenToRoom('G7KP', onUpdate);

    expect(onUpdate).toHaveBeenCalledWith({
      state: 'lobby',
      players: [
        {
          managerId: 'olli_mehtonen',
          displayName: 'OlliM',
          joinedAt: 1000,
          isHost: true,
        },
      ],
    });
  });
});

// ─── leaveRoom ───────────────────────────────────────────────────────────────

describe('leaveRoom()', () => {
  it('removes entire room when host leaves', async () => {
    await leaveRoom('G7KP', 'olli_mehtonen', true);
    expect(mockRef).toHaveBeenCalledWith(expect.anything(), 'rooms/G7KP');
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });

  it('removes only the player entry when non-host leaves', async () => {
    await leaveRoom('G7KP', 'mauno_ahlgren', false);
    expect(mockRef).toHaveBeenCalledWith(
      expect.anything(),
      'rooms/G7KP/players/mauno_ahlgren',
    );
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
