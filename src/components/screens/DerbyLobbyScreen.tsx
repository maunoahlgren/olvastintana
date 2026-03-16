/**
 * @file DerbyLobbyScreen.tsx
 * Derby Night lobby — room creation and join flow.
 *
 * Internal view states:
 *   'select'           → initial: Create Room / Join Room / Big Screen buttons
 *   'host_manager'     → host picks their manager before room is created
 *   'hosting'          → host view: code, QR, player list, Start button
 *   'joining_code'     → player/spectator entering a room code
 *   'joining_manager'  → player selecting a manager from managers.json
 *   'joined'           → player has joined; waiting for host to start
 *   'spectating'       → spectator (big screen) waiting for host to start
 *
 * Firebase integration:
 *   - createRoom / joinRoom / listenToRoom / leaveRoom from src/firebase/room.ts
 *   - initMatch / listenToMatch from src/firebase/derbyMatch.ts (Phase 3)
 *   - listenToRoom unsubscribed in useEffect cleanup
 *
 * URL param detection:
 *   ?room=CODE pre-fills the room code input and advances to 'joining_code' view
 *
 * Role mapping:
 *   'host'      → creates the room, initiates match
 *   'player'    → joins with a code and picks a manager
 *   'spectator' → joins with a code only (no manager), big screen view
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../store/matchStore';
import { useRoomStore } from '../../store/roomStore';
import managersData from '../../data/managers.json';
import triviaData from '../../data/trivia.json';
import {
  generateRoomCode,
  createRoom,
  joinRoom,
  roomExists,
  startRoom,
  listenToRoom,
  leaveRoom,
  type RoomSnapshot,
} from '../../firebase/room';
import { initMatch, type PlayerKey } from '../../firebase/derbyMatch';

// ─── Types ────────────────────────────────────────────────────────────────────

type LobbyView =
  | 'select'
  | 'host_manager'
  | 'hosting'
  | 'joining_code'
  | 'joining_manager'
  | 'joined'
  | 'spectating';

interface Manager {
  id: string;
  display_name: string;
  number: number;
  player_id: string;
  color: string;
}

const MANAGERS: Manager[] = managersData as Manager[];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Coin-flip for kickoff: returns 'p1' or 'p2' with equal probability.
 *
 * @returns 'p1' | 'p2'
 */
function coinFlipKickoff(): PlayerKey {
  return Math.random() < 0.5 ? 'p1' : 'p2';
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * DerbyLobbyScreen — multiplayer room creation and join flow.
 *
 * Handles host path (manager pick → create room → share code → start),
 * player path (enter code → pick manager → joined), and
 * spectator path (enter code → big screen waiting view).
 *
 * @returns The Derby Night lobby screen element
 */
export default function DerbyLobbyScreen(): JSX.Element {
  const { t } = useTranslation();
  const reset            = useMatchStore((s) => s.reset);
  const goToDerbyLineup  = useMatchStore((s) => s.goToDerbyLineup);

  const { setRoom, setConnectedPlayers, setLobbyStatus, reset: resetRoom } = useRoomStore();
  const connectedPlayers = useRoomStore((s) => s.connectedPlayers);
  const lobbyStatus      = useRoomStore((s) => s.lobbyStatus);
  const errorMessage     = useRoomStore((s) => s.errorMessage);
  const myManagerId      = useRoomStore((s) => s.myManagerId);
  const roomCode         = useRoomStore((s) => s.roomCode);

  const [view, setView]                       = useState<LobbyView>('select');
  const [codeInput, setCodeInput]             = useState('');
  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const [hostManager, setHostManager]         = useState<string | null>(null);
  const [copied, setCopied]                   = useState(false);

  /** Firebase room listener unsubscribe ref */
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
  const canStart = connectedPlayers.filter((p) => !p.isHost).length >= 1;

  // ─── Handlers ─────────────────────────────────────────────────────────────

  /**
   * Handle the actual room creation once the host has picked their manager.
   *
   * @param managerId   - The host's chosen manager ID
   * @param displayName - The host's display name
   */
  async function createRoomWithManager(managerId: string, displayName: string): Promise<void> {
    setLobbyStatus('creating');
    try {
      const code = generateRoomCode();
      await createRoom(code, managerId, displayName);
      setRoom(code, 'host', managerId);
      setLobbyStatus('joined');
      setView('hosting');

      unsubscribeRef.current = listenToRoom(code, (snap: RoomSnapshot) => {
        setConnectedPlayers(
          snap.players
            .filter((p) => p.managerId !== '__probe__')
            .map((p) => ({
              managerId: p.managerId,
              displayName: p.displayName,
              joinedAt: p.joinedAt,
              isHost: p.isHost,
            })),
        );
        if (snap.state === 'playing') {
          goToDerbyLineup();
        }
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLobbyStatus('error', msg);
    }
  }

  /**
   * Handle "Join" click on the code-entry view.
   * Validates the code exists, then routes to manager selection or spectating.
   *
   * @param asSpectator - True to join as spectator (big screen), false as player
   */
  async function handleJoinCode(asSpectator = false): Promise<void> {
    const code = codeInput.trim().toUpperCase();
    if (code.length !== 4) return;
    setLobbyStatus('joining');
    try {
      const exists = await roomExists(code);
      if (!exists) {
        setLobbyStatus('error', t('derby.enter_code'));
        return;
      }
      setLobbyStatus('idle');
      if (asSpectator) {
        // Spectator joins anonymously — no Firebase player entry, just listens
        setRoom(code, 'spectator', '');
        setView('spectating');
        unsubscribeRef.current = listenToRoom(code, (snap: RoomSnapshot) => {
          setConnectedPlayers(
            snap.players
              .filter((p) => p.managerId !== '__probe__')
              .map((p) => ({
                managerId: p.managerId,
                displayName: p.displayName,
                joinedAt: p.joinedAt,
                isHost: p.isHost,
              })),
          );
          if (snap.state === 'playing') {
            goToDerbyLineup();
          }
        });
      } else {
        setRoom(code, 'player', '');
        setView('joining_manager');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLobbyStatus('error', msg);
    }
  }

  /**
   * Handle final "Join" click after selecting a manager.
   * Writes the player's entry to Firebase and subscribes to updates.
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
      setLobbyStatus('idle');
      setView('joined');

      unsubscribeRef.current = listenToRoom(roomCode, (snap: RoomSnapshot) => {
        setConnectedPlayers(
          snap.players
            .filter((p) => p.managerId !== '__probe__')
            .map((p) => ({
              managerId: p.managerId,
              displayName: p.displayName,
              joinedAt: p.joinedAt,
              isHost: p.isHost,
            })),
        );
        if (snap.state === 'playing') {
          goToDerbyLineup();
        }
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
   * Handle "Start Game" click (host only).
   * Initialises the match document in Firebase, then sets room state to 'playing'.
   * All connected clients' listenToRoom callbacks detect 'playing' → goToDerbyLineup().
   */
  async function handleStartGame(): Promise<void> {
    if (!roomCode) return;
    try {
      const kickoff = coinFlipKickoff();
      const triviaIndex = Math.floor(Math.random() * (triviaData as unknown[]).length);
      // Write the match document first, then signal all clients to start
      await initMatch(roomCode, kickoff, triviaIndex);
      await startRoom(roomCode);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLobbyStatus('error', msg);
    }
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
          onClick={() => setView('host_manager')}
          className="w-full py-4 bg-[#FF44AA] text-white font-black text-lg uppercase tracking-widest rounded-xl hover:bg-[#FF44AA]/90 active:scale-95 transition-all"
        >
          {t('derby.create_room')}
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

        {/* Big Screen */}
        <button
          data-testid="big-screen-btn"
          onClick={() => { setView('joining_code'); }}
          className="w-full py-3 bg-transparent border border-[#F5F0E8]/20 text-[#F5F0E8]/50 text-sm uppercase tracking-widest rounded-xl hover:bg-[#F5F0E8]/5 active:scale-95 transition-all"
        >
          📺 {t('derby_match.big_screen')}
        </button>

        {errorMessage && (
          <p className="text-red-400 text-sm text-center">{errorMessage}</p>
        )}
      </div>
    );
  }

  function renderHostManagerView(): JSX.Element {
    return (
      <div className="flex flex-col gap-4 w-full">
        <p className="text-[#F5F0E8]/50 text-xs uppercase tracking-widest text-center">
          {t('derby.pick_manager')}
        </p>
        <div className="grid grid-cols-2 gap-3" data-testid="host-manager-grid">
          {MANAGERS.map((m) => (
            <button
              key={m.id}
              data-testid={`host-manager-card-${m.id}`}
              onClick={() => setHostManager(m.id)}
              style={{
                borderColor: hostManager === m.id ? m.color : 'transparent',
                boxShadow: hostManager === m.id ? `0 0 0 2px ${m.color}` : 'none',
              }}
              className="flex flex-col items-center gap-1 py-4 px-2 bg-[#F5F0E8]/5 rounded-xl border-2 hover:bg-[#F5F0E8]/10 active:scale-95 transition-all"
            >
              <span className="text-2xl font-black" style={{ color: m.color }}>
                #{m.number}
              </span>
              <span className="text-sm font-bold text-[#F5F0E8]">{m.display_name}</span>
            </button>
          ))}
        </div>
        <button
          data-testid="create-room-confirm-btn"
          onClick={() => {
            if (!hostManager) return;
            const m = MANAGERS.find((x) => x.id === hostManager)!;
            void createRoomWithManager(m.id, m.display_name);
          }}
          disabled={!hostManager || lobbyStatus === 'creating'}
          className="w-full py-4 bg-[#FF44AA] text-white font-black text-lg uppercase tracking-widest rounded-xl hover:bg-[#FF44AA]/90 active:scale-95 transition-all disabled:opacity-50"
        >
          {lobbyStatus === 'creating' ? '…' : t('derby.create_room')}
        </button>
        {errorMessage && <p className="text-red-400 text-sm text-center">{errorMessage}</p>}
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
                  <span className="text-[#FFE600] text-xs uppercase tracking-wider ml-auto">
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
          onClick={() => void handleStartGame()}
          disabled={!canStart}
          className="w-full py-4 bg-[#FFE600] text-[#1A1A1A] font-black text-lg uppercase tracking-widest rounded-xl hover:bg-[#FFE600]/90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {canStart ? t('derby.start_game') : t('derby.min_players')}
        </button>

        {errorMessage && <p className="text-red-400 text-sm text-center">{errorMessage}</p>}
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
          onClick={() => void handleJoinCode(false)}
          disabled={codeInput.length !== 4 || lobbyStatus === 'joining'}
          className="w-full py-4 bg-[#44AAFF] text-white font-black text-lg uppercase tracking-widest rounded-xl hover:bg-[#44AAFF]/90 active:scale-95 transition-all disabled:opacity-50"
        >
          {lobbyStatus === 'joining' ? '…' : t('derby.join_btn')}
        </button>
        {/* Big screen join option */}
        <button
          data-testid="spectator-join-btn"
          onClick={() => void handleJoinCode(true)}
          disabled={codeInput.length !== 4 || lobbyStatus === 'joining'}
          className="w-full py-3 bg-transparent border border-[#F5F0E8]/20 text-[#F5F0E8]/50 text-sm uppercase tracking-widest rounded-xl hover:bg-[#F5F0E8]/5 transition-all disabled:opacity-40"
        >
          📺 {t('derby_match.big_screen')}
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
        <div className="grid grid-cols-2 gap-3" data-testid="manager-grid">
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
              <span className="text-2xl font-black" style={{ color: m.color }}>
                #{m.number}
              </span>
              <span className="text-sm font-bold text-[#F5F0E8]">{m.display_name}</span>
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

  function renderSpectatingView(): JSX.Element {
    return (
      <div className="flex flex-col gap-6 w-full items-center" data-testid="spectating-view">
        <div className="text-4xl">📺</div>
        <p className="text-[#F5F0E8]/50 text-sm text-center">{t('derby.waiting')}</p>
        <div className="w-full">
          <p className="text-[#F5F0E8]/50 text-xs uppercase tracking-widest mb-2">
            {t('derby.players_connected')} ({connectedPlayers.length})
          </p>
          <ul className="flex flex-col gap-2">
            {connectedPlayers.map((p) => (
              <li
                key={p.managerId}
                className="flex items-center gap-3 bg-[#F5F0E8]/5 rounded-lg px-4 py-3"
              >
                <span className="font-bold text-[#F5F0E8]">{p.displayName}</span>
                {p.isHost && (
                  <span className="text-[#FFE600] text-xs uppercase tracking-wider ml-auto">Host</span>
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
        {view === 'host_manager'     && renderHostManagerView()}
        {view === 'hosting'          && renderHostView()}
        {view === 'joining_code'     && renderJoinCodeView()}
        {view === 'joining_manager'  && renderManagerPickerView()}
        {view === 'joined'           && renderJoinedView()}
        {view === 'spectating'       && renderSpectatingView()}
      </main>
    </div>
  );
}
