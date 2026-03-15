/**
 * @file roomStore.ts
 * Zustand store for Derby Night room state.
 *
 * Tracks the current room code, local player role, manager selection,
 * and the live list of connected players received from Firebase.
 *
 * Lifecycle:
 *   idle → creating / joining_code → joined → (reset on leave)
 */

import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────

/** A player as seen in the lobby, normalised from Firebase snapshot */
export interface ConnectedPlayer {
  /** Manager ID (matches managers.json id field) */
  managerId: string;
  /** Human-readable display name */
  displayName: string;
  /** Unix ms timestamp of when the player joined */
  joinedAt: number;
  /** True if this player created the room */
  isHost: boolean;
}

/** The local client's role in the room */
export type RoomRole = 'host' | 'player' | 'spectator';

/** Lobby lifecycle status for the local client */
export type LobbyStatus = 'idle' | 'creating' | 'joining' | 'joined' | 'error';

// ─── State ───────────────────────────────────────────────────────────────────

interface RoomState {
  /** 4-character room code (null when not in a room) */
  roomCode: string | null;
  /** This client's role in the room */
  role: RoomRole | null;
  /** Manager ID chosen by this client */
  myManagerId: string | null;
  /** All players currently in the room lobby */
  connectedPlayers: ConnectedPlayer[];
  /** Current lobby lifecycle status */
  lobbyStatus: LobbyStatus;
  /** Human-readable error message (set on 'error' status) */
  errorMessage: string | null;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

interface RoomActions {
  /**
   * Set room code and role after creating or joining.
   *
   * @param code - 4-character room code
   * @param role - This client's role
   * @param managerId - Manager ID chosen by this client
   */
  setRoom: (code: string, role: RoomRole, managerId: string) => void;

  /**
   * Replace the entire connected player list (from Firebase snapshot).
   *
   * @param players - Updated player list
   */
  setConnectedPlayers: (players: ConnectedPlayer[]) => void;

  /**
   * Add or update a single player in the connected list.
   * If a player with the same managerId already exists, replaces them.
   *
   * @param player - Player to upsert
   */
  addPlayer: (player: ConnectedPlayer) => void;

  /**
   * Remove a player from the connected list by managerId.
   *
   * @param managerId - Manager ID of the player to remove
   */
  removePlayer: (managerId: string) => void;

  /**
   * Update the lobby lifecycle status.
   *
   * @param status - New status
   * @param errorMessage - Optional error message (only relevant for 'error' status)
   */
  setLobbyStatus: (status: LobbyStatus, errorMessage?: string) => void;

  /** Reset to initial state (called on leave or room dissolved) */
  reset: () => void;
}

// ─── Initial State ────────────────────────────────────────────────────────────

const initialState: RoomState = {
  roomCode: null,
  role: null,
  myManagerId: null,
  connectedPlayers: [],
  lobbyStatus: 'idle',
  errorMessage: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useRoomStore = create<RoomState & RoomActions>((set) => ({
  ...initialState,

  setRoom(code, role, managerId) {
    set({ roomCode: code, role, myManagerId: managerId });
  },

  setConnectedPlayers(players) {
    set({ connectedPlayers: players });
  },

  addPlayer(player) {
    set((s) => ({
      connectedPlayers: [
        ...s.connectedPlayers.filter((p) => p.managerId !== player.managerId),
        player,
      ],
    }));
  },

  removePlayer(managerId) {
    set((s) => ({
      connectedPlayers: s.connectedPlayers.filter((p) => p.managerId !== managerId),
    }));
  },

  setLobbyStatus(status, errorMessage = null) {
    set({ lobbyStatus: status, errorMessage: errorMessage ?? null });
  },

  reset() {
    set(initialState);
  },
}));
