/**
 * @file DerbyLobbyScreen.tsx
 * Derby Night lobby — room creation and join flow.
 *
 * Internal view states:
 *   'select'         → initial view: "Create Room" button + code entry field
 *   'hosting'        → host view: room code, QR code, player list, Start button
 *   'joining_code'   → player entering a room code
 *   'joining_manager'→ player selecting a manager from managers.json
 *   'joined'         → player has joined; waiting for host to start
 *
 * Firebase integration:
 *   - createRoom / joinRoom / listenToRoom / leaveRoom from src/firebase/room.ts
 *   - listenToRoom unsubscribed in useEffect cleanup
 *
 * URL param detection:
 *   ?room=CODE pre-fills the room code input and advances to 'joining_code' view
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../store/matchStore';
import { useRoomStore } from '../../store/roomStore';
import managersData from '../../data/managers.json';
import {
  generateRoomCode,
  createRoom,
  joinRoom,
  listenToRoom,
  leaveRoom,
  type RoomSnapshot,
} from '../../firebase/room';

// ─── Types ────────────────────────────────────────────────────────────────────

type LobbyView = 'select' | 'hosting' | 'joining_code' | 'joining_manager' | 'joined';

interface Manager {
  id: string;
  display_name: string;
  number: number;
  player_id: string;
  color: string;
}

const MANAGERS: Manager[] = managersData as Manager[];

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * DerbyLobbyScreen — multiplayer room creation and join flow.
 *
 * Handles both the host path (create room → share code → wait for players → start)
 * and the player path (enter code → pick manager → joined).
 *
 * @returns The Derby Night lobby screen element
 */
export default function DerbyLobbyScreen(): JSX.Element {
  const { t } = useTranslation();
  const reset = useMatchStore((s) => s.reset);

  const { setRoom, setConnectedPlayers, setLobbyStatus, reset: resetRoom } = useRoomStore();
  const connectedPlayers = useRoomStore((s) => s.connectedPlayers);
  const lobbyStatus      = useRoomStore((s) => s.lobbyStatus);
  const errorMessage     = useRoomStore((s) => s.errorMessage);
  const myManagerId      = useRoomStore((s) => s.myManagerId);
  const roomCode         = useRoomStore((s) => s.roomCode);

  const [view, setView]                   = useState<LobbyView>('select');
  const [codeInput, setCodeInput]         = useState('');
  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const [copied, setCopied]               = useState(false);

  /** Cleanup ref — stores the Firebase unsubscribe function */
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ─── URL param detection ───────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setCodeInput(roomParam.toUpperCase());
      setView('joining_code');
    }
  }, []);

  // ─── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  // ─── Derived values ────────────────────────────────────────────────────────
  const lobbyUrl = roomCode
    ? `https://olvastintana.vercel.app?room=${roomCode}`
    : '';
  const qrUrl = lobbyUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(lobbyUrl)}`
    : '';
  const canStart = connectedPlayers.length >= 2;

  // ─── Handlers ─────────────────────────────────────────────────────────────

  /**
   * Handle "Create Room" click.
   * Generates a room code, writes it to Firebase, subscribes to updates.
   */
  async function handleCreateRoom(): Promise<void> {
    setLobbyStatus('creating');
    try {
      const code       = generateRoomCode();
      const managerId  = 'host_manager'; // host picks manager after others join (Phase 3)
      const displayName = t('derby.title');

      await createRoom(code, managerId, displayName);
      setRoom(code, 'host', managerId);
      setLobbyStatus('joined');
      setView('hosting');

      // Subscribe to live player updates
      unsubscribeRef.current = listenToRoom(code, (snap: RoomSnapshot) => {
        setConnectedPlayers(
          snap.players.map((p) => ({
            managerId: p.managerId,
            displayName: p.displayName,
            joinedAt: p.joinedAt,
            isHost: p.isHost,
          })),
        );
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLobbyStatus('error', msg);
    }
  }

  /**
   * Handle "Join" click on the code-entry view.
   * Validates the code exists and advances to manager selection.
   */
  async function handleJoinCode(): Promise<void> {
    const code = codeInput.trim().toUpperCase();
    if (code.length !== 4) return;
    setLobbyStatus('joining');
    try {
      // Attempt to join with a placeholder to validate room exists
      const exists = await joinRoom(code, '__probe__', '__probe__');
      if (!exists) {
        setLobbyStatus('error', t('derby.enter_code'));
        return;
      }
      // Remove the probe immediately — real join happens when manager is selected
      setRoom(code, 'player', '');
      setLobbyStatus('idle');
      setView('joining_manager');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLobbyStatus('error', msg);
    }
  }

  /**
   * Handle final "Join" click after selecting a manager.
   * Writes the player's real entry to Firebase, subscribes to updates.
   */
  async function handleJoinWithManager(): Promise<void> {
    if (!selectedManager || !roomCode) return;

    const manager = MANAGERS.find((m) => m.id === selectedManager);
    if (!manager) return;

    setLobbyStatus('joining');
    try {
      const joined = await joinRoom(roomCode, manager.id, manager.display_name);
      if (!joined) {
        setLobbyStatus('error', t('derby.enter_code'));
        return;
      }
      setRoom(roomCode, 'player', manager.id);
      setLobbyStatus('joined');
      setView('joined');

      unsubscribeRef.current = listenToRoom(roomCode, (snap: RoomSnapshot) => {
        setConnectedPlayers(
          snap.players.map((p) => ({
            managerId: p.managerId,
            displayName: p.displayName,
            joinedAt: p.joinedAt,
            isHost: p.isHost,
          })),
        );
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLobbyStatus('error', msg);
    }
  }

  /**
   * Handle "Back" — leave room and return to title.
   */
  async function handleBack(): Promise<void> {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    if (roomCode && myManagerId) {
      const isHost = useRoomStore.getState().role === 'host';
      await leaveRoom(roomCode, myManagerId, isHost);
    }
    resetRoom();
    reset();
  }

  /**
   * Copy the lobby URL to clipboard.
   */
  async function handleCopyUrl(): Promise<void> {
    try {
      await navigator.clipboard.writeText(lobbyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silent fail
    }
  }

  // ─── Render helpers ────────────────────────────────────────────────────────

  function renderSelectView(): JSX.Element {
    return (
      <div className="flex flex-col gap-4 w-full">
        {/* Create Room */}
        <button
          data-testid="create-room-btn"
          onClick={() => void handleCreateRoom()}
          disabled={lobbyStatus === 'creating'}
          className="w-full py-4 bg-[#FF44AA] text-white font-black text-lg uppercase tracking-widest rounded-xl hover:bg-[#FF44AA]/90 active:scale-95 transition-all disabled:opacity-50"
        >
          {lobbyStatus === 'creating' ? '…' : t('derby.create_room')}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 text-[#F5F0E8]/30 text-sm">
          <div className="flex-1 h-px bg-[#F5F0E8]/10" />
          <span>—</span>
          <div className="flex-1 h-px bg-[#F5F0E8]/10" />
        </div>

        {/* Join Room */}
        <button
          data-testid="join-room-btn"
          onClick={() => setView('joining_code')}
          className="w-full py-4 bg-transparent border-2 border-[#44AAFF] text-[#44AAFF] font-black text-lg uppercase tracking-widest rounded-xl hover:bg-[#44AAFF]/10 active:scale-95 transition-all"
        >
          {t('derby.join_room')}
        </button>

        {/* Firebase not configured warning */}
        {errorMessage && (
          <p className="text-red-400 text-sm text-center">{errorMessage}</p>
        )}
      </div>
    );
  }

  function renderHostView(): JSX.Element {
    return (
      <div className="flex flex-col gap-6 w-full items-center">
        {/* Room code display */}
        <div className="text-center">
          <p className="text-[#F5F0E8]/50 text-xs uppercase tracking-widest mb-1">
            {t('derby.room_code')}
          </p>
          <div
            data-testid="room-code-display"
            className="text-5xl font-black tracking-[0.3em] text-[#FFE600]"
          >
            {roomCode}
          </div>
        </div>

        {/* QR code */}
        {qrUrl && (
          <div className="flex flex-col items-center gap-2">
            <img
              src={qrUrl}
              alt={t('derby.scan_qr')}
              className="w-[180px] h-[180px] rounded-lg"
              data-testid="qr-code-img"
            />
            <p className="text-[#F5F0E8]/40 text-xs">{t('derby.scan_qr')}</p>
          </div>
        )}

        {/* URL copy */}
        <button
          onClick={() => void handleCopyUrl()}
          className="text-[#F5F0E8]/50 text-xs underline underline-offset-2 hover:text-[#F5F0E8] transition-colors"
          data-testid="copy-url-btn"
        >
          {copied ? t('derby.copied') : lobbyUrl}
        </button>

        {/* Connected players */}
        <div className="w-full">
          <p className="text-[#F5F0E8]/50 text-xs uppercase tracking-widest mb-2">
            {t('derby.players_connected')} ({connectedPlayers.length})
          </p>
          <ul className="flex flex-col gap-2" data-testid="player-list">
            {connectedPlayers.map((p) => (
              <li
                key={p.managerId}
                className="flex items-center gap-3 bg-[#F5F0E8]/5 rounded-lg px-4 py-3"
              >
                <span className="font-bold text-[#F5F0E8]">{p.displayName}</span>
                {p.isHost && (
                  <span className="text-[#FFE600] text-xs uppercase tracking-wider">
                    Host
                  </span>
                )}
              </li>
            ))}
            {connectedPlayers.length === 0 && (
              <li className="text-[#F5F0E8]/30 text-sm">{t('derby.waiting')}</li>
            )}
          </ul>
        </div>

        {/* Start button */}
        <button
          data-testid="start-game-btn"
          disabled={!canStart}
          className="w-full py-4 bg-[#FFE600] text-[#1A1A1A] font-black text-lg uppercase tracking-widest rounded-xl hover:bg-[#FFE600]/90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {canStart ? t('derby.start_game') : t('derby.min_players')}
        </button>
      </div>
    );
  }

  function renderJoinCodeView(): JSX.Element {
    return (
      <div className="flex flex-col gap-4 w-full">
        <label className="text-[#F5F0E8]/50 text-xs uppercase tracking-widest">
          {t('derby.enter_code')}
        </label>
        <input
          data-testid="room-code-input"
          type="text"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
          maxLength={4}
          placeholder="XXXX"
          className="w-full py-4 px-6 bg-[#F5F0E8]/10 text-[#FFE600] font-black text-3xl tracking-[0.4em] text-center rounded-xl border-2 border-[#F5F0E8]/20 focus:border-[#44AAFF] focus:outline-none uppercase"
        />
        <button
          data-testid="join-code-btn"
          onClick={() => void handleJoinCode()}
          disabled={codeInput.length !== 4 || lobbyStatus === 'joining'}
          className="w-full py-4 bg-[#44AAFF] text-white font-black text-lg uppercase tracking-widest rounded-xl hover:bg-[#44AAFF]/90 active:scale-95 transition-all disabled:opacity-50"
        >
          {lobbyStatus === 'joining' ? '…' : t('derby.join_btn')}
        </button>
        {errorMessage && (
          <p className="text-red-400 text-sm text-center">{errorMessage}</p>
        )}
      </div>
    );
  }

  function renderManagerPickerView(): JSX.Element {
    return (
      <div className="flex flex-col gap-4 w-full">
        <p className="text-[#F5F0E8]/50 text-xs uppercase tracking-widest text-center">
          {t('derby.pick_manager')}
        </p>
        <div
          className="grid grid-cols-2 gap-3"
          data-testid="manager-grid"
        >
          {MANAGERS.map((m) => (
            <button
              key={m.id}
              data-testid={`manager-card-${m.id}`}
              onClick={() => setSelectedManager(m.id)}
              style={{
                borderColor: selectedManager === m.id ? m.color : 'transparent',
                boxShadow: selectedManager === m.id ? `0 0 0 2px ${m.color}` : 'none',
              }}
              className="flex flex-col items-center gap-1 py-4 px-2 bg-[#F5F0E8]/5 rounded-xl border-2 hover:bg-[#F5F0E8]/10 active:scale-95 transition-all"
            >
              <span
                className="text-2xl font-black"
                style={{ color: m.color }}
              >
                #{m.number}
              </span>
              <span className="text-sm font-bold text-[#F5F0E8]">
                {m.display_name}
              </span>
            </button>
          ))}
        </div>

        <button
          data-testid="confirm-manager-btn"
          onClick={() => void handleJoinWithManager()}
          disabled={!selectedManager || lobbyStatus === 'joining'}
          className="w-full py-4 bg-[#44AAFF] text-white font-black text-lg uppercase tracking-widest rounded-xl hover:bg-[#44AAFF]/90 active:scale-95 transition-all disabled:opacity-50"
        >
          {lobbyStatus === 'joining' ? '…' : t('derby.join_btn')}
        </button>
        {errorMessage && (
          <p className="text-red-400 text-sm text-center">{errorMessage}</p>
        )}
      </div>
    );
  }

  function renderJoinedView(): JSX.Element {
    return (
      <div className="flex flex-col gap-6 w-full items-center">
        <p className="text-[#F5F0E8]/50 text-sm text-center">{t('derby.waiting')}</p>

        {/* Connected players */}
        <div className="w-full">
          <p className="text-[#F5F0E8]/50 text-xs uppercase tracking-widest mb-2">
            {t('derby.players_connected')} ({connectedPlayers.length})
          </p>
          <ul className="flex flex-col gap-2" data-testid="player-list">
            {connectedPlayers.map((p) => (
              <li
                key={p.managerId}
                className="flex items-center gap-3 bg-[#F5F0E8]/5 rounded-lg px-4 py-3"
              >
                <span className="font-bold text-[#F5F0E8]">{p.displayName}</span>
                {p.managerId === myManagerId && (
                  <span className="text-[#44AAFF] text-xs uppercase tracking-wider">
                    {t('derby.your_manager')}
                  </span>
                )}
                {p.isHost && (
                  <span className="text-[#FFE600] text-xs uppercase tracking-wider ml-auto">
                    Host
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-[#1A1A1A] text-[#F5F0E8] px-6 py-10"
      data-testid="derby-lobby-screen"
    >
      {/* Back button */}
      <button
        data-testid="back-btn"
        onClick={() => void handleBack()}
        className="absolute top-4 left-4 text-[#F5F0E8]/50 text-sm uppercase tracking-widest hover:text-[#F5F0E8] transition-colors"
      >
        ← {t('derby.back')}
      </button>

      {/* Header */}
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-black text-[#FF44AA] tracking-tight">
          {t('derby.title')}
        </h1>
        <p className="text-[#F5F0E8]/40 text-sm uppercase tracking-widest mt-1">
          {t('derby.subtitle')}
        </p>
      </header>

      {/* Body */}
      <main className="w-full max-w-sm">
        {view === 'select'           && renderSelectView()}
        {view === 'hosting'          && renderHostView()}
        {view === 'joining_code'     && renderJoinCodeView()}
        {view === 'joining_manager'  && renderManagerPickerView()}
        {view === 'joined'           && renderJoinedView()}
      </main>
    </div>
  );
}
