/**
 * @file roomStore.test.ts
 * Unit tests for the roomStore Zustand store.
 *
 * Tests all store actions in isolation using only the store API (no React, no Firebase).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useRoomStore } from '../../../src/store/roomStore';
import type { ConnectedPlayer } from '../../../src/store/roomStore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePlayer(managerId: string, isHost = false): ConnectedPlayer {
  return {
    managerId,
    displayName: managerId,
    joinedAt: 1_000_000,
    isHost,
  };
}

// ─── Initial state ────────────────────────────────────────────────────────────

describe('roomStore — initial state', () => {
  beforeEach(() => useRoomStore.getState().reset());

  it('roomCode is null', () => {
    expect(useRoomStore.getState().roomCode).toBeNull();
  });

  it('role is null', () => {
    expect(useRoomStore.getState().role).toBeNull();
  });

  it('myManagerId is null', () => {
    expect(useRoomStore.getState().myManagerId).toBeNull();
  });

  it('connectedPlayers is empty', () => {
    expect(useRoomStore.getState().connectedPlayers).toHaveLength(0);
  });

  it('lobbyStatus is idle', () => {
    expect(useRoomStore.getState().lobbyStatus).toBe('idle');
  });

  it('errorMessage is null', () => {
    expect(useRoomStore.getState().errorMessage).toBeNull();
  });
});

// ─── setRoom ─────────────────────────────────────────────────────────────────

describe('setRoom()', () => {
  beforeEach(() => useRoomStore.getState().reset());

  it('sets roomCode', () => {
    useRoomStore.getState().setRoom('G7KP', 'host', 'olli_mehtonen');
    expect(useRoomStore.getState().roomCode).toBe('G7KP');
  });

  it('sets role', () => {
    useRoomStore.getState().setRoom('G7KP', 'player', 'mauno_ahlgren');
    expect(useRoomStore.getState().role).toBe('player');
  });

  it('sets myManagerId', () => {
    useRoomStore.getState().setRoom('G7KP', 'host', 'olli_mehtonen');
    expect(useRoomStore.getState().myManagerId).toBe('olli_mehtonen');
  });
});

// ─── setConnectedPlayers ──────────────────────────────────────────────────────

describe('setConnectedPlayers()', () => {
  beforeEach(() => useRoomStore.getState().reset());

  it('replaces entire player list', () => {
    useRoomStore.getState().setConnectedPlayers([makePlayer('p1'), makePlayer('p2')]);
    expect(useRoomStore.getState().connectedPlayers).toHaveLength(2);
  });

  it('replaces previous list on second call', () => {
    useRoomStore.getState().setConnectedPlayers([makePlayer('p1')]);
    useRoomStore.getState().setConnectedPlayers([makePlayer('p2'), makePlayer('p3')]);
    const ids = useRoomStore.getState().connectedPlayers.map((p) => p.managerId);
    expect(ids).not.toContain('p1');
    expect(ids).toContain('p2');
    expect(ids).toContain('p3');
  });

  it('stores full player data', () => {
    const player = makePlayer('mauno_ahlgren', true);
    useRoomStore.getState().setConnectedPlayers([player]);
    expect(useRoomStore.getState().connectedPlayers[0]).toMatchObject(player);
  });
});

// ─── addPlayer ────────────────────────────────────────────────────────────────

describe('addPlayer()', () => {
  beforeEach(() => useRoomStore.getState().reset());

  it('adds a player to an empty list', () => {
    useRoomStore.getState().addPlayer(makePlayer('p1'));
    expect(useRoomStore.getState().connectedPlayers).toHaveLength(1);
  });

  it('appends a player to existing list', () => {
    useRoomStore.getState().addPlayer(makePlayer('p1'));
    useRoomStore.getState().addPlayer(makePlayer('p2'));
    expect(useRoomStore.getState().connectedPlayers).toHaveLength(2);
  });

  it('replaces an existing player with the same managerId (upsert)', () => {
    useRoomStore.getState().addPlayer({ ...makePlayer('p1'), displayName: 'Old' });
    useRoomStore.getState().addPlayer({ ...makePlayer('p1'), displayName: 'New' });
    const players = useRoomStore.getState().connectedPlayers;
    expect(players).toHaveLength(1);
    expect(players[0].displayName).toBe('New');
  });
});

// ─── removePlayer ─────────────────────────────────────────────────────────────

describe('removePlayer()', () => {
  beforeEach(() => useRoomStore.getState().reset());

  it('removes player by managerId', () => {
    useRoomStore.getState().setConnectedPlayers([makePlayer('p1'), makePlayer('p2')]);
    useRoomStore.getState().removePlayer('p1');
    const ids = useRoomStore.getState().connectedPlayers.map((p) => p.managerId);
    expect(ids).not.toContain('p1');
    expect(ids).toContain('p2');
  });

  it('is a no-op for unknown managerId', () => {
    useRoomStore.getState().setConnectedPlayers([makePlayer('p1')]);
    useRoomStore.getState().removePlayer('unknown');
    expect(useRoomStore.getState().connectedPlayers).toHaveLength(1);
  });

  it('results in empty list when last player removed', () => {
    useRoomStore.getState().setConnectedPlayers([makePlayer('p1')]);
    useRoomStore.getState().removePlayer('p1');
    expect(useRoomStore.getState().connectedPlayers).toHaveLength(0);
  });
});

// ─── setLobbyStatus ───────────────────────────────────────────────────────────

describe('setLobbyStatus()', () => {
  beforeEach(() => useRoomStore.getState().reset());

  it('sets lobbyStatus to creating', () => {
    useRoomStore.getState().setLobbyStatus('creating');
    expect(useRoomStore.getState().lobbyStatus).toBe('creating');
  });

  it('sets lobbyStatus to joined', () => {
    useRoomStore.getState().setLobbyStatus('joined');
    expect(useRoomStore.getState().lobbyStatus).toBe('joined');
  });

  it('sets error status with message', () => {
    useRoomStore.getState().setLobbyStatus('error', 'Something went wrong');
    expect(useRoomStore.getState().lobbyStatus).toBe('error');
    expect(useRoomStore.getState().errorMessage).toBe('Something went wrong');
  });

  it('clears error message when status is not error', () => {
    useRoomStore.getState().setLobbyStatus('error', 'oops');
    useRoomStore.getState().setLobbyStatus('joined');
    expect(useRoomStore.getState().errorMessage).toBeNull();
  });
});

// ─── reset ────────────────────────────────────────────────────────────────────

describe('reset()', () => {
  beforeEach(() => useRoomStore.getState().reset());

  it('resets all fields to initial state', () => {
    useRoomStore.getState().setRoom('ABCD', 'host', 'olli_mehtonen');
    useRoomStore.getState().addPlayer(makePlayer('olli_mehtonen', true));
    useRoomStore.getState().setLobbyStatus('joined');

    useRoomStore.getState().reset();

    const s = useRoomStore.getState();
    expect(s.roomCode).toBeNull();
    expect(s.role).toBeNull();
    expect(s.myManagerId).toBeNull();
    expect(s.connectedPlayers).toHaveLength(0);
    expect(s.lobbyStatus).toBe('idle');
    expect(s.errorMessage).toBeNull();
  });
});
