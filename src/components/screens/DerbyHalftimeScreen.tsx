/**
 * @file DerbyHalftimeScreen.tsx
 * Derby Night halftime screen — each manager makes their change privately.
 *
 * Phone view:
 *   - Shows current score
 *   - Offers: Swap player / Change tactic / Skip
 *   - After submitting: "Waiting for opponent..." view
 *
 * Big screen view:
 *   - "Both managers are making their changes..."
 *   - Ready badges as each submits
 *
 * Host orchestration:
 *   Both halftime_done → host calls resetForNextDuel to start second half
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomStore } from '../../store/roomStore';
import { useDerbyStore } from '../../store/derbyStore';
import {
  submitHalftimeAction,
  resetForNextDuel,
  type PlayerKey,
  type HalftimeAction,
} from '../../firebase/derbyMatch';
import { TACTIC } from '../../engine/match';
import playersData from '../../data/players.json';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Player {
  id: string;
  name: string;
  number: number;
  position: string[];
}

type HalftimeView = 'choose' | 'swap' | 'tactic' | 'submitted';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determine this client's player key from room role.
 *
 * @param role - Room role string
 * @returns 'p1' | 'p2' | null
 */
function roleToPlayerKey(role: string | null): PlayerKey | null {
  if (role === 'host') return 'p1';
  if (role === 'player') return 'p2';
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * DerbyHalftimeScreen — multiplayer halftime management.
 *
 * Routes to phone or big-screen view based on role.
 *
 * @returns Halftime screen for this device
 */
export default function DerbyHalftimeScreen(): JSX.Element {
  const role = useRoomStore((s) => s.role);
  const roomCode = useRoomStore((s) => s.roomCode);
  const p1HalftimeDone = useDerbyStore((s) => s.p1HalftimeDone);
  const p2HalftimeDone = useDerbyStore((s) => s.p2HalftimeDone);
  const possession = useDerbyStore((s) => s.possession);
  const kickoff = useDerbyStore((s) => s.kickoff);

  const isHost = role === 'host';
  const isSpectator = role === 'spectator';
  const playerKey = roleToPlayerKey(role);
  const myDone = playerKey === 'p1' ? p1HalftimeDone : p2HalftimeDone;

  // Second half kickoff: the team that did NOT kick off first half
  const secondHalfKickoff: PlayerKey = kickoff === 'p1' ? 'p2' : 'p1';

  // Host advances to second half when both done
  const advancedRef = useRef(false);
  useEffect(() => {
    if (!isHost || !roomCode || advancedRef.current) return;
    if (!p1HalftimeDone || !p2HalftimeDone) return;
    advancedRef.current = true;
    resetForNextDuel(roomCode, 0, true, secondHalfKickoff).catch(console.error);
  }, [isHost, roomCode, p1HalftimeDone, p2HalftimeDone, secondHalfKickoff]);

  if (isSpectator) {
    return <BigScreenHalftimeView p1Done={p1HalftimeDone} p2Done={p2HalftimeDone} />;
  }

  if (myDone) {
    return <SubmittedHalftimeView p1Done={p1HalftimeDone} p2Done={p2HalftimeDone} />;
  }

  return (
    <PhoneHalftimeView
      playerKey={playerKey ?? 'p1'}
      roomCode={roomCode ?? ''}
    />
  );
}

// ─── Phone Halftime View ──────────────────────────────────────────────────────

interface PhoneHalftimeViewProps {
  playerKey: PlayerKey;
  roomCode: string;
}

/**
 * Phone halftime view — choose action and submit to Firebase.
 *
 * @param playerKey - This client's player key
 * @param roomCode  - Active room code
 */
function PhoneHalftimeView({ playerKey, roomCode }: PhoneHalftimeViewProps): JSX.Element {
  const { t } = useTranslation();
  const scoreHome = useDerbyStore((s) => s.scoreHome);
  const scoreAway = useDerbyStore((s) => s.scoreAway);
  const p1Lineup = useDerbyStore((s) => s.p1Lineup);
  const p2Lineup = useDerbyStore((s) => s.p2Lineup);

  const [view, setView] = useState<HalftimeView>('choose');
  const [swapOut, setSwapOut] = useState<string | null>(null);
  const [swapIn, setSwapIn] = useState<string | null>(null);
  const [tactic, setTactic] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myLineup = playerKey === 'p1' ? p1Lineup : p2Lineup;
  const allPlayers = playersData as Player[];

  // Players not in current lineup (available for swap in)
  const bench = allPlayers.filter(
    (p) => !myLineup.includes(p.id) && !p.position.includes('GK'),
  );

  /**
   * Submit the chosen halftime action to Firebase.
   *
   * @param action - The action to submit
   */
  async function handleSubmit(action: HalftimeAction): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      await submitHalftimeAction(roomCode, playerKey, action);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  const tacticOptions = [
    { key: TACTIC.AGGRESSIVE, label: t('halftime.tactic_aggressive') },
    { key: TACTIC.DEFENSIVE, label: t('halftime.tactic_defensive') },
    { key: TACTIC.CREATIVE, label: t('halftime.tactic_creative') },
  ];

  // ── Choose view ──────────────────────────────────────────────────────────
  if (view === 'choose') {
    return (
      <div className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex flex-col p-4" data-testid="derby-halftime-choose">
        <h1 className="text-xl font-bold text-[#FFE600] mb-1">{t('derby_match.halftime_title')}</h1>
        <div className="text-2xl font-black text-center my-3">{scoreHome} – {scoreAway}</div>

        <p className="text-sm text-[#A0A0A0] mb-4">{t('derby_match.halftime_choose')}</p>

        <div className="flex flex-col gap-3">
          <button
            data-testid="halftime-swap-btn"
            onClick={() => setView('swap')}
            className="py-4 rounded-lg border border-[#555] bg-[#2A2A2A] text-[#F5F0E8] font-semibold hover:border-[#FFE600] transition-colors"
          >
            🔄 {t('derby_match.halftime_swap')}
          </button>
          <button
            data-testid="halftime-tactic-btn"
            onClick={() => setView('tactic')}
            className="py-4 rounded-lg border border-[#555] bg-[#2A2A2A] text-[#F5F0E8] font-semibold hover:border-[#FFE600] transition-colors"
          >
            🧠 {t('derby_match.halftime_tactic')}
          </button>
          <button
            data-testid="halftime-skip-btn"
            onClick={() => handleSubmit({ type: 'skip' })}
            disabled={submitting}
            className="py-4 rounded-lg border border-[#333] bg-[#2A2A2A] text-[#A0A0A0] hover:border-[#555] transition-colors disabled:opacity-50"
          >
            ⏭️ {t('derby_match.halftime_skip')}
          </button>
        </div>

        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      </div>
    );
  }

  // ── Swap view ────────────────────────────────────────────────────────────
  if (view === 'swap') {
    return (
      <div className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex flex-col p-4" data-testid="derby-halftime-swap">
        <button onClick={() => setView('choose')} className="text-[#A0A0A0] text-sm mb-4">← {t('derby.back')}</button>
        <h2 className="text-lg font-bold mb-3">{t('derby_match.halftime_swap')}</h2>

        <p className="text-sm text-[#A0A0A0] mb-2">{t('derby_match.halftime_swap_out')}</p>
        <div className="flex flex-col gap-2 mb-4">
          {myLineup
            .filter((id) => {
              const p = allPlayers.find((pl) => pl.id === id);
              return p && !p.position.includes('GK');
            })
            .map((id) => {
              const p = allPlayers.find((pl) => pl.id === id);
              return (
                <button
                  key={id}
                  data-testid={`swap-out-${id}`}
                  onClick={() => setSwapOut(id)}
                  className={`p-2 rounded border text-sm text-left transition-colors ${
                    swapOut === id ? 'border-[#FFE600] bg-[#FFE600]/10' : 'border-[#333] bg-[#2A2A2A]'
                  }`}
                >
                  {p?.name ?? id} #{p?.number}
                </button>
              );
            })}
        </div>

        {swapOut && (
          <>
            <p className="text-sm text-[#A0A0A0] mb-2">{t('derby_match.halftime_swap_in')}</p>
            <div className="flex flex-col gap-2 mb-4 max-h-48 overflow-y-auto">
              {bench.slice(0, 8).map((p) => (
                <button
                  key={p.id}
                  data-testid={`swap-in-${p.id}`}
                  onClick={() => setSwapIn(p.id)}
                  className={`p-2 rounded border text-sm text-left transition-colors ${
                    swapIn === p.id ? 'border-[#FFE600] bg-[#FFE600]/10' : 'border-[#333] bg-[#2A2A2A]'
                  }`}
                >
                  {p.name} #{p.number}
                </button>
              ))}
            </div>
          </>
        )}

        <button
          data-testid="confirm-swap-btn"
          onClick={() => swapOut && swapIn && handleSubmit({ type: 'swap', swapOut, swapIn })}
          disabled={!swapOut || !swapIn || submitting}
          className="w-full py-3 rounded bg-[#FFE600] text-[#1A1A1A] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('derby_match.halftime_confirm')}
        </button>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  // ── Tactic view ──────────────────────────────────────────────────────────
  if (view === 'tactic') {
    return (
      <div className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex flex-col p-4" data-testid="derby-halftime-tactic">
        <button onClick={() => setView('choose')} className="text-[#A0A0A0] text-sm mb-4">← {t('derby.back')}</button>
        <h2 className="text-lg font-bold mb-3">{t('derby_match.halftime_tactic')}</h2>
        <p className="text-sm text-[#A0A0A0] mb-3">{t('derby_match.halftime_tactic_label')}</p>

        <div className="flex flex-col gap-3 mb-4">
          {tacticOptions.map(({ key, label }) => (
            <button
              key={key}
              data-testid={`tactic-${key}`}
              onClick={() => setTactic(key)}
              className={`py-3 rounded border font-semibold transition-colors ${
                tactic === key
                  ? 'border-[#FFE600] bg-[#FFE600]/10 text-[#FFE600]'
                  : 'border-[#333] bg-[#2A2A2A] text-[#F5F0E8] hover:border-[#555]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          data-testid="confirm-tactic-btn"
          onClick={() => tactic && handleSubmit({ type: 'tactic', tactic })}
          disabled={!tactic || submitting}
          className="w-full py-3 rounded bg-[#FFE600] text-[#1A1A1A] font-bold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('derby_match.halftime_confirm')}
        </button>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  return <div />;
}

// ─── Submitted View ───────────────────────────────────────────────────────────

interface SubmittedHalftimeViewProps {
  p1Done: boolean;
  p2Done: boolean;
}

/**
 * Shown on the phone after halftime action has been submitted.
 *
 * @param p1Done - Has p1 submitted?
 * @param p2Done - Has p2 submitted?
 */
function SubmittedHalftimeView({ p1Done, p2Done }: SubmittedHalftimeViewProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex flex-col items-center justify-center p-6 gap-6" data-testid="derby-halftime-submitted">
      <div className="text-4xl">✅</div>
      <p className="text-center text-[#A0A0A0]">{t('derby_match.halftime_submitted')}</p>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <StatusRow label={t('derby_match.halftime_p1_ready')} done={p1Done} />
        <StatusRow label={t('derby_match.halftime_p2_ready')} done={p2Done} />
      </div>
    </div>
  );
}

// ─── Big Screen View ──────────────────────────────────────────────────────────

interface BigScreenHalftimeViewProps {
  p1Done: boolean;
  p2Done: boolean;
}

/**
 * Big screen halftime waiting view.
 *
 * @param p1Done - Has home team submitted?
 * @param p2Done - Has away team submitted?
 */
function BigScreenHalftimeView({ p1Done, p2Done }: BigScreenHalftimeViewProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex flex-col items-center justify-center p-8 gap-8" data-testid="derby-halftime-bigscreen">
      <h1 className="text-3xl font-bold text-[#FFE600]">{t('derby_match.halftime_title')}</h1>
      <p className="text-[#A0A0A0]">{t('derby_match.halftime_waiting_big')}</p>
      <div className="flex gap-8">
        <StatusRow label={t('derby_match.halftime_p1_ready')} done={p1Done} large />
        <StatusRow label={t('derby_match.halftime_p2_ready')} done={p2Done} large />
      </div>
    </div>
  );
}

// ─── Shared Sub-component ─────────────────────────────────────────────────────

interface StatusRowProps {
  label: string;
  done: boolean;
  large?: boolean;
}

/**
 * Status indicator row, with optional large size for big screen.
 *
 * @param label - Display label
 * @param done  - Whether the action is complete
 * @param large - Use larger size for big screen display
 */
function StatusRow({ label, done, large = false }: StatusRowProps): JSX.Element {
  const cls = large ? 'text-base px-6 py-3 rounded-lg' : 'text-sm px-3 py-2 rounded';
  return (
    <div
      data-testid={`halftime-status-${label.replace(/\s/g, '-').toLowerCase()}`}
      className={`${cls} flex items-center gap-2 border ${
        done
          ? 'border-green-500 bg-green-500/10 text-green-400'
          : 'border-[#444] bg-[#2A2A2A] text-[#666]'
      }`}
    >
      <span>{done ? '✓' : '○'}</span>
      <span>{label}</span>
    </div>
  );
}
