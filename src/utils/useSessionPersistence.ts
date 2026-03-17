/**
 * @file useSessionPersistence.ts
 * React hook that persists and restores match session across page refreshes.
 *
 * ## Behaviour
 *
 * **Saving**: Whenever `phase`, `roomCode`, `role`, or `myManagerId` change,
 * the current session is serialised to localStorage under key `ot_session`.
 * When the phase returns to TITLE the key is removed (session is over).
 *
 * **Restoring** (on mount):
 * - If the persisted phase is a Derby match phase AND roomCode / role /
 *   myManagerId are present → `roomStore.setRoom()` is called to reconnect
 *   and `matchStore.setDerbyPhase()` advances the UI to the saved screen.
 *   `useDerbyMatchSync` (App.tsx) then auto-subscribes to Firebase and
 *   re-downloads all live match state.
 * - If the persisted phase is a solo phase (non-TITLE, non-Derby) → the
 *   UI is restored to that phase.  Match-state (scores, lineup etc.) is
 *   reset because it lives only in memory; the player may tap Back to start
 *   over if needed.
 * - If the stored data is malformed the key is silently removed.
 *
 * ## Usage
 * Call once at the App root — it runs as a side-effect only.
 *
 * @example
 * // In App.tsx
 * useSessionPersistence();
 */

import { useEffect } from 'react';
import { useMatchStore } from '../store/matchStore';
import { useRoomStore } from '../store/roomStore';
import { MATCH_PHASE } from '../engine/match';
import type { RoomRole } from '../store/roomStore';

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'ot_session';

/**
 * Derby match phases that can be fully restored via Firebase on reload.
 * DERBY_LOBBY is intentionally excluded — it has no Firebase match state
 * and the user should re-enter the room code / create a new room.
 */
const DERBY_RESTORABLE_PHASES: ReadonlySet<string> = new Set([
  MATCH_PHASE.DERBY_LINEUP,
  MATCH_PHASE.DERBY_TRIVIA,
  MATCH_PHASE.DERBY_DUEL,
  MATCH_PHASE.DERBY_HALFTIME,
  MATCH_PHASE.DERBY_RESULT,
]);

/** Valid room roles (for type-safe validation of persisted data) */
const VALID_ROLES: ReadonlySet<string> = new Set(['host', 'player', 'spectator']);

// ─── Persisted shape ─────────────────────────────────────────────────────────

interface PersistedSession {
  phase: string;
  roomCode: string | null;
  role: string | null;
  myManagerId: string | null;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * useSessionPersistence — saves and restores phase + room session.
 *
 * Must be called at the App root so it runs before any screen renders.
 * Has no return value — all side effects are applied to stores.
 */
export function useSessionPersistence(): void {
  const phase = useMatchStore((s) => s.phase);
  const roomCode = useRoomStore((s) => s.roomCode);
  const role = useRoomStore((s) => s.role);
  const myManagerId = useRoomStore((s) => s.myManagerId);

  // ── Restore on mount ───────────────────────────────────────────────────────
  useEffect(() => {
    // Only restore when the app is at the default TITLE phase.
    // If something already advanced the phase (e.g. tests set up state before
    // rendering) we must not override it — doing so would break solo match
    // flow tests and any deep-linked navigation.
    if (useMatchStore.getState().phase !== MATCH_PHASE.TITLE) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const session = JSON.parse(raw) as PersistedSession;
      if (!session?.phase) return;

      if (DERBY_RESTORABLE_PHASES.has(session.phase)) {
        // Restore Derby Night — reconnect to room then set phase.
        // useDerbyMatchSync (App.tsx) will auto-subscribe to Firebase once
        // phase is in DERBY_MATCH_PHASES and roomCode is populated.
        if (
          session.roomCode &&
          session.role &&
          VALID_ROLES.has(session.role) &&
          session.myManagerId !== undefined
        ) {
          useRoomStore.getState().setRoom(
            session.roomCode,
            session.role as RoomRole,
            session.myManagerId ?? '',
          );
        }
        useMatchStore.getState().setDerbyPhase(session.phase);
      } else if (session.phase !== MATCH_PHASE.TITLE) {
        // Restore solo phase (match state is lost but screen is shown)
        useMatchStore.getState().setDerbyPhase(session.phase);
      }
      // TITLE phase → do nothing (default state is already TITLE)
    } catch {
      // Malformed data — clear and start fresh
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist on change ──────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === MATCH_PHASE.TITLE) {
      // Session ended — wipe persisted state
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const session: PersistedSession = {
      phase,
      roomCode: roomCode ?? null,
      role: role ?? null,
      myManagerId: myManagerId ?? null,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Storage quota exceeded or private browsing — ignore silently
    }
  }, [phase, roomCode, role, myManagerId]);
}
