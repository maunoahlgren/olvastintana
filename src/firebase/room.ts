/**
 * @file firebase/room.ts
 * Firebase Realtime Database helpers for Derby Night rooms.
 *
 * Room structure:
 *   rooms/{code}/state          — 'lobby' | 'playing' | 'finished'
 *   rooms/{code}/host           — managerId of the host
 *   rooms/{code}/created_at     — server timestamp (ms)
 *   rooms/{code}/players/{managerId}/display_name
 *   rooms/{code}/players/{managerId}/joined_at
 *   rooms/{code}/players/{managerId}/is_host
 *   rooms/{code}/match/         — reserved for live match state (Phase 3)
 *
 * All functions guard against db === null (Firebase not configured).
 */

import { db } from './config';
import {
  ref,
  set,
  get,
  onValue,
  remove,
  type DataSnapshot,
} from 'firebase/database';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RoomPlayerSnapshot {
  /** Manager ID (matches managers.json id field) */
  managerId: string;
  /** Human-readable display name */
  displayName: string;
  /** Unix ms timestamp of when the player joined */
  joinedAt: number;
  /** True if this player created the room */
  isHost: boolean;
}

export interface RoomSnapshot {
  /** Current room lifecycle state */
  state: 'lobby' | 'playing' | 'finished';
  /** All connected players */
  players: RoomPlayerSnapshot[];
}

// ─── Room Code Generation ────────────────────────────────────────────────────

/**
 * Character set for room codes — excludes visually ambiguous chars (0, O, 1, I).
 * 32 characters → 32^4 ≈ 1 048 576 combinations for a 4-character code.
 */
const ROOM_CODE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generate a random 4-character alphanumeric room code.
 * Excludes visually ambiguous characters (0, O, 1, I).
 *
 * @returns A 4-character uppercase room code, e.g. "G7KP"
 *
 * @example
 * generateRoomCode() // → "G7KP"
 */
export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += ROOM_CODE_CHARSET[Math.floor(Math.random() * ROOM_CODE_CHARSET.length)];
  }
  return code;
}

// ─── Room Operations ─────────────────────────────────────────────────────────

/**
 * Create a new room in Firebase and register the host player.
 *
 * @param code - The 4-character room code (from generateRoomCode)
 * @param managerId - Manager ID of the host (matches managers.json)
 * @param displayName - Display name shown in the lobby
 * @throws If Firebase is not configured or the write fails
 *
 * @example
 * await createRoom('G7KP', 'olli_mehtonen', 'OlliM');
 */
export async function createRoom(
  code: string,
  managerId: string,
  displayName: string,
): Promise<void> {
  if (!db) throw new Error('[Firebase] Not configured — cannot create room.');

  const now = Date.now();
  const roomRef = ref(db, `rooms/${code}`);

  await set(roomRef, {
    state: 'lobby',
    host: managerId,
    created_at: now,
    players: {
      [managerId]: {
        display_name: displayName,
        joined_at: now,
        is_host: true,
      },
    },
    match: null,
  });
}

/**
 * Join an existing room as a non-host player.
 *
 * @param code - The 4-character room code to join
 * @param managerId - Manager ID of the joining player
 * @param displayName - Display name shown in the lobby
 * @returns True if the room exists and was joined; false if the room does not exist
 * @throws If Firebase is not configured or the write fails
 *
 * @example
 * const joined = await joinRoom('G7KP', 'mauno_ahlgren', 'Mauno');
 * if (!joined) console.error('Room not found');
 */
export async function joinRoom(
  code: string,
  managerId: string,
  displayName: string,
): Promise<boolean> {
  if (!db) throw new Error('[Firebase] Not configured — cannot join room.');

  const stateRef = ref(db, `rooms/${code}/state`);
  const snapshot = await get(stateRef);

  if (!snapshot.exists()) return false;

  const playerRef = ref(db, `rooms/${code}/players/${managerId}`);
  await set(playerRef, {
    display_name: displayName,
    joined_at: Date.now(),
    is_host: false,
  });

  return true;
}

/**
 * Subscribe to real-time updates for a room.
 * Calls `onUpdate` immediately with the current state, then on every change.
 *
 * @param code - The 4-character room code to listen to
 * @param onUpdate - Callback invoked with the current RoomSnapshot on every change
 * @returns Unsubscribe function — call this in useEffect cleanup to stop listening
 *
 * @example
 * const unsubscribe = listenToRoom('G7KP', (snap) => {
 *   setPlayers(snap.players);
 * });
 * // In useEffect cleanup:
 * return () => unsubscribe();
 */
export function listenToRoom(
  code: string,
  onUpdate: (snap: RoomSnapshot) => void,
): () => void {
  if (!db) {
    console.warn('[Firebase] Not configured — listenToRoom is a no-op.');
    return () => {};
  }

  const roomRef = ref(db, `rooms/${code}`);

  const unsubscribe = onValue(roomRef, (snapshot: DataSnapshot) => {
    if (!snapshot.exists()) return;

    const data = snapshot.val() as {
      state: 'lobby' | 'playing' | 'finished';
      players?: Record<
        string,
        { display_name: string; joined_at: number; is_host: boolean }
      >;
    };

    const players: RoomPlayerSnapshot[] = Object.entries(data.players ?? {}).map(
      ([managerId, p]) => ({
        managerId,
        displayName: p.display_name,
        joinedAt: p.joined_at,
        isHost: p.is_host,
      }),
    );

    onUpdate({ state: data.state, players });
  });

  return unsubscribe;
}

/**
 * Remove a player from a room. If the departing player is the host,
 * the entire room document is deleted.
 *
 * @param code - The 4-character room code
 * @param managerId - Manager ID of the departing player
 * @param isHost - True if the departing player is the host
 *
 * @example
 * await leaveRoom('G7KP', 'mauno_ahlgren', false);
 */
export async function leaveRoom(
  code: string,
  managerId: string,
  isHost: boolean,
): Promise<void> {
  if (!db) return;

  if (isHost) {
    // Host leaving dissolves the entire room
    await remove(ref(db, `rooms/${code}`));
  } else {
    await remove(ref(db, `rooms/${code}/players/${managerId}`));
  }
}
