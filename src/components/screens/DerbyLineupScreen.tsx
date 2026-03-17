/**
 * @file DerbyLineupScreen.tsx
 * Derby Night lineup selection screen.
 *
 * Each manager picks 6 outfield players + 1 goalkeeper privately on their phone.
 * The big screen shows a waiting message until both lineups are submitted.
 *
 * Phone view flow:
 *   selecting → submitted (waiting for opponent)
 *
 * Big screen view:
 *   Waiting message + per-player ready badges → both ready → host advances phase
 *
 * Role mapping (from roomStore):
 *   'host'      → p1 (home team phone view)
 *   'player'    → p2 (away team phone view)
 *   'spectator' → big screen view
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomStore } from '../../store/roomStore';
import { useDerbyStore } from '../../store/derbyStore';
import { submitLineup, advanceDerbyPhase, type PlayerKey } from '../../firebase/derbyMatch';
import { DUELS_PER_HALF } from '../../engine/match';
import playersData from '../../data/players.json';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Player {
  id: string;
  name: string;
  number: number;
  position: string[];
  stats: {
    riisto: number;
    laukaus: number;
    harhautus: number;
    torjunta: number;
    stamina: number;
  };
}

/** Position filter tabs */
type PositionFilter = 'all' | 'outfield' | 'gk';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determine this client's player key based on their room role.
 *
 * @param role - Room role ('host' | 'player' | 'spectator' | null)
 * @returns 'p1' for host, 'p2' for player, null for spectator/unknown
 */
function roleToPlayerKey(role: string | null): PlayerKey | null {
  if (role === 'host') return 'p1';
  if (role === 'player') return 'p2';
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * DerbyLineupScreen — multiplayer lineup selection.
 *
 * Reads the current room role and derby match state to render the appropriate view.
 * Submits lineup to Firebase; host detects both ready and advances to trivia phase.
 *
 * @returns The lineup selection screen or big-screen waiting view
 */
export default function DerbyLineupScreen(): JSX.Element {
  const { t } = useTranslation();
  const role = useRoomStore((s) => s.role);
  const roomCode = useRoomStore((s) => s.roomCode);
  const p1LineupReady = useDerbyStore((s) => s.p1LineupReady);
  const p2LineupReady = useDerbyStore((s) => s.p2LineupReady);

  const playerKey = roleToPlayerKey(role);
  const isSpectator = role === 'spectator';
  const isHost = role === 'host';

  /** My own submitted state */
  const myReady = playerKey === 'p1' ? p1LineupReady : p2LineupReady;

  // Host auto-advances when both lineups are submitted
  const advancedRef = useRef(false);
  useEffect(() => {
    if (!isHost || !roomCode || advancedRef.current) return;
    if (p1LineupReady && p2LineupReady) {
      advancedRef.current = true;
      advanceDerbyPhase(roomCode, 'trivia').catch(console.error);
    }
  }, [isHost, roomCode, p1LineupReady, p2LineupReady]);

  if (isSpectator) {
    return <BigScreenView p1Ready={p1LineupReady} p2Ready={p2LineupReady} />;
  }

  if (myReady) {
    return <SubmittedView p1Ready={p1LineupReady} p2Ready={p2LineupReady} />;
  }

  return (
    <PhonePickView
      playerKey={playerKey ?? 'p1'}
      roomCode={roomCode ?? ''}
    />
  );
}

// ─── Phone Pick View ──────────────────────────────────────────────────────────

interface PhonePickViewProps {
  playerKey: PlayerKey;
  roomCode: string;
}

/**
 * Phone lineup picker — renders the player grid and submit button.
 *
 * @param playerKey - 'p1' or 'p2' for this client
 * @param roomCode  - Active room code for Firebase writes
 */
function PhonePickView({ playerKey, roomCode }: PhonePickViewProps): JSX.Element {
  const { t } = useTranslation();

  const allPlayers = playersData as Player[];
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<PositionFilter>('all');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const outfieldSelected = allPlayers
    .filter((p) => selected.has(p.id) && !p.position.includes('GK'))
    .length;
  const gkSelected = allPlayers
    .filter((p) => selected.has(p.id) && p.position.includes('GK'))
    .length;
  const canSubmit = outfieldSelected === 6 && gkSelected === 1;

  /** Filtered player list based on active position tab */
  const filtered = allPlayers.filter((p) => {
    if (filter === 'gk') return p.position.includes('GK');
    if (filter === 'outfield') return !p.position.includes('GK');
    return true;
  });

  /**
   * Toggle a player in/out of the selection.
   * Respects the 6 outfield + 1 GK constraint.
   *
   * @param player - The player to toggle
   */
  function togglePlayer(player: Player): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(player.id)) {
        next.delete(player.id);
        return next;
      }
      const isGk = player.position.includes('GK');
      if (isGk && gkSelected >= 1) return prev;
      if (!isGk && outfieldSelected >= 6) return prev;
      next.add(player.id);
      return next;
    });
  }

  /**
   * Submit the selected lineup to Firebase.
   */
  async function handleSubmit(): Promise<void> {
    if (!canSubmit || !roomCode) return;
    setSubmitting(true);
    setError(null);
    try {
      const ids = Array.from(selected);
      await submitLineup(roomCode, playerKey, ids);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  const filterBtnClass = (f: PositionFilter) =>
    `px-3 py-1 rounded text-sm font-medium transition-colors ${
      filter === f
        ? 'bg-[#FFE600] text-[#1A1A1A]'
        : 'bg-[#2A2A2A] text-[#A0A0A0] hover:bg-[#333]'
    }`;

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex flex-col p-4" data-testid="derby-lineup-phone">
      {/* Header */}
      <h1 className="text-xl font-bold text-[#FFE600] mb-1">
        {t('derby_match.lineup_title')}
      </h1>
      <p className="text-sm text-[#A0A0A0] mb-3">
        {t('derby_match.lineup_select_outfield')} + {t('derby_match.lineup_select_gk')}
      </p>

      {/* Selection summary */}
      <div className="flex gap-4 mb-3 text-sm">
        <span className={outfieldSelected === 6 ? 'text-green-400' : 'text-[#A0A0A0]'}>
          ⚽ {outfieldSelected}/6
        </span>
        <span className={gkSelected === 1 ? 'text-green-400' : 'text-[#A0A0A0]'}>
          🧤 {gkSelected}/1
        </span>
      </div>

      {/* Position filter */}
      <div className="flex gap-2 mb-3">
        <button className={filterBtnClass('all')} onClick={() => setFilter('all')} data-testid="filter-all">
          All
        </button>
        <button className={filterBtnClass('outfield')} onClick={() => setFilter('outfield')} data-testid="filter-outfield">
          Outfield
        </button>
        <button className={filterBtnClass('gk')} onClick={() => setFilter('gk')} data-testid="filter-gk">
          GK
        </button>
      </div>

      {/* Player grid */}
      <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 mb-4" data-testid="player-grid">
        {filtered.map((player) => {
          const isGk = player.position.includes('GK');
          const sel = selected.has(player.id);
          return (
            <button
              key={player.id}
              data-testid={`player-card-${player.id}`}
              onClick={() => togglePlayer(player)}
              className={`p-2 rounded border text-left transition-colors ${
                sel
                  ? 'border-[#FFE600] bg-[#FFE600]/10'
                  : 'border-[#333] bg-[#2A2A2A] hover:border-[#555]'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="font-semibold text-sm">{player.name}</span>
                {isGk && (
                  <span className="text-xs bg-[#FF8844] text-white px-1 rounded">
                    {t('derby_match.lineup_gk_label')}
                  </span>
                )}
              </div>
              <div className="text-xs text-[#A0A0A0] mt-1">
                #{player.number} · ⚔{player.stats.riisto} 💨{player.stats.harhautus} 🎯{player.stats.laukaus}
              </div>
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <p className="text-red-400 text-sm mb-2">{error}</p>
      )}

      {/* Validation hint */}
      {!canSubmit && (
        <p className="text-[#A0A0A0] text-xs mb-2">{t('derby_match.lineup_invalid')}</p>
      )}

      {/* Submit button */}
      <button
        data-testid="confirm-lineup-btn"
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className={`w-full py-3 rounded font-bold text-[#1A1A1A] transition-colors ${
          canSubmit && !submitting
            ? 'bg-[#FFE600] hover:bg-[#FFD000]'
            : 'bg-[#555] text-[#888] cursor-not-allowed'
        }`}
      >
        {submitting ? '...' : t('derby_match.lineup_confirm')}
      </button>
    </div>
  );
}

// ─── Submitted View ───────────────────────────────────────────────────────────

interface SubmittedViewProps {
  p1Ready: boolean;
  p2Ready: boolean;
}

/**
 * Shown on the phone after the player has submitted their lineup.
 * Displays waiting status for both teams.
 *
 * @param p1Ready - Has p1 submitted?
 * @param p2Ready - Has p2 submitted?
 */
function SubmittedView({ p1Ready, p2Ready }: SubmittedViewProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex flex-col items-center justify-center p-6 gap-6" data-testid="derby-lineup-submitted">
      <div className="text-4xl">✅</div>
      <p className="text-center text-[#A0A0A0]">{t('derby_match.lineup_submitted')}</p>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <ReadyBadge label={t('derby_match.lineup_p1_ready')} ready={p1Ready} />
        <ReadyBadge label={t('derby_match.lineup_p2_ready')} ready={p2Ready} />
      </div>
    </div>
  );
}

// ─── Big Screen View ──────────────────────────────────────────────────────────

interface BigScreenViewProps {
  p1Ready: boolean;
  p2Ready: boolean;
}

/**
 * Big screen waiting view — shows lineup selection progress for both teams.
 *
 * @param p1Ready - Has home team submitted?
 * @param p2Ready - Has away team submitted?
 */
function BigScreenView({ p1Ready, p2Ready }: BigScreenViewProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex flex-col items-center justify-center p-8 gap-8" data-testid="derby-lineup-bigscreen">
      <h1 className="text-3xl font-bold text-[#FFE600] text-center">
        {t('derby_match.lineup_waiting_big')}
      </h1>
      <div className="flex gap-8">
        <ReadyBadge label={t('derby_match.lineup_p1_ready')} ready={p1Ready} size="lg" />
        <ReadyBadge label={t('derby_match.lineup_p2_ready')} ready={p2Ready} size="lg" />
      </div>
      {/* Progress dots animation */}
      {!p1Ready || !p2Ready ? (
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-[#FFE600] animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      ) : (
        <p className="text-green-400 text-xl font-bold">{t('derby_match.both_ready', 'Both ready!')}</p>
      )}
    </div>
  );
}

// ─── Ready Badge ──────────────────────────────────────────────────────────────

interface ReadyBadgeProps {
  label: string;
  ready: boolean;
  size?: 'sm' | 'lg';
}

/**
 * Small badge indicating whether a player has completed an action.
 *
 * @param label - Label text
 * @param ready - Whether the player is ready
 * @param size  - 'sm' (default) or 'lg' for big screen
 */
function ReadyBadge({ label, ready, size = 'sm' }: ReadyBadgeProps): JSX.Element {
  const base = size === 'lg' ? 'px-6 py-3 text-lg rounded-lg' : 'px-3 py-2 text-sm rounded';
  return (
    <div
      data-testid={`ready-badge-${label.replace(/\s/g, '-').toLowerCase()}`}
      className={`${base} flex items-center gap-2 border ${
        ready
          ? 'border-green-500 bg-green-500/10 text-green-400'
          : 'border-[#444] bg-[#2A2A2A] text-[#666]'
      }`}
    >
      <span>{ready ? '✓' : '○'}</span>
      <span>{label}</span>
    </div>
  );
}
