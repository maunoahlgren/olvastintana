/**
 * @file DerbyDuelScreen.tsx
 * Derby Night duel screen — covers both 'duel' and 'duel_result' Firebase phases.
 *
 * Phone view ('duel' phase):
 *   - Shows possession info (are you attacking or defending?)
 *   - Shows 3 card buttons: Riisto / Harhautus / Laukaus
 *   - After picking: "Waiting for opponent..." overlay
 *   - Shot is highlighted only when you are the attacker (have possession)
 *
 * Big screen view ('duel' phase):
 *   - Shows both manager status badges ("Choosing..." / "Ready ✓")
 *   - When both ready → 3-2-1 countdown → host writes result to Firebase
 *
 * All views ('duel_result' phase):
 *   - Revealed cards for both players
 *   - Win/draw/goal/save animation
 *   - Score update
 *   - Host auto-advances after RESULT_DISPLAY_MS delay
 *
 * Host orchestration:
 *   Both card_ready → host resolves duel (resolveDuel + goalkeeper) → writeDuelResult
 *   After result display → host calls resetForNextDuel or advances to halftime/result
 *
 * Player stats used: first outfield player from each team's lineup.
 * GK stats used only for goalkeeper save check on Shot duels.
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import HelpModal from '../ui/HelpModal';
import PlayerCard from '../ui/PlayerCard';
import { useRoomStore } from '../../store/roomStore';
import { useDerbyStore } from '../../store/derbyStore';
import type { Player as SquadPlayer } from '../../store/squadStore';
import {
  submitCard,
  writeDuelResult,
  advanceDerbyPhase,
  resetForNextDuel,
  type PlayerKey,
} from '../../firebase/derbyMatch';
import { resolveDuel, CARD, type Card, type PlayerStats } from '../../engine/duel';
import { resolveGoalkeeping } from '../../engine/goalkeeper';
import { DUELS_PER_HALF } from '../../engine/match';
import playersData from '../../data/players.json';

// ─── Constants ────────────────────────────────────────────────────────────────

/** How long (ms) to show the duel result before advancing */
const RESULT_DISPLAY_MS = 3000;

/** How long (ms) each countdown step is displayed */
const COUNTDOWN_STEP_MS = 900;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Player {
  id: string;
  name: string;
  number: number;
  position: string[];
  stats: PlayerStats;
  tier?: string;
  ability?: { description_fi: string; description_en?: string | null };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determine this client's player key from their room role.
 *
 * @param role - Room role string
 * @returns 'p1' | 'p2' | null
 */
function roleToPlayerKey(role: string | null): PlayerKey | null {
  if (role === 'host') return 'p1';
  if (role === 'player') return 'p2';
  return null;
}

/**
 * Look up a player by ID from players.json.
 * Returns a fallback stats block if not found.
 *
 * @param id - Player ID string
 * @returns Player object or fallback
 */
function getPlayer(id: string): Player {
  const all = playersData as Player[];
  return all.find((p) => p.id === id) ?? {
    id,
    name: id,
    number: 0,
    position: ['MF'],
    stats: { riisto: 3, laukaus: 3, harhautus: 3, torjunta: 3, stamina: 2 },
  };
}

/**
 * Get the active outfield player (first non-GK) from a lineup array.
 *
 * @param lineup - Array of player IDs
 * @returns The first outfield player, or fallback
 */
function getActivePlayer(lineup: string[]): Player {
  const all = playersData as Player[];
  const outfield = lineup.find((id) => {
    const p = all.find((pl) => pl.id === id);
    return p && !p.position.includes('GK');
  });
  return getPlayer(outfield ?? lineup[0] ?? '');
}

/**
 * Get the goalkeeper (first GK) from a lineup array.
 *
 * @param lineup - Array of player IDs
 * @returns The GK player, or fallback
 */
function getGoalkeeper(lineup: string[]): Player {
  const all = playersData as Player[];
  const gkId = lineup.find((id) => {
    const p = all.find((pl) => pl.id === id);
    return p?.position.includes('GK');
  });
  return getPlayer(gkId ?? '');
}

/**
 * Get the active outfield player cycling by duel index (matches solo DuelScreen behaviour).
 *
 * @param lineup   - Array of player IDs
 * @param duelIndex - Current duel index for cycling
 * @returns The active outfield player for this duel slot
 */
function getActivePlayerByIndex(lineup: string[], duelIndex: number): Player {
  const all = playersData as Player[];
  const outfield = lineup.filter((id) => {
    const p = all.find((pl) => pl.id === id);
    return p && !p.position.includes('GK');
  });
  if (outfield.length === 0) return getPlayer(lineup[0] ?? '');
  const slot = duelIndex % outfield.length;
  return getPlayer(outfield[slot] ?? '');
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * DerbyDuelScreen — multiplayer duel phase controller.
 *
 * Routes to phone view, big-screen view, or result view depending on
 * the current Firebase phase and this device's role.
 *
 * @returns The appropriate duel view for this device
 */
export default function DerbyDuelScreen(): JSX.Element {
  const role = useRoomStore((s) => s.role);
  const roomCode = useRoomStore((s) => s.roomCode);
  const phase = useDerbyStore((s) => s.phase);
  const p1CardReady = useDerbyStore((s) => s.p1CardReady);
  const p2CardReady = useDerbyStore((s) => s.p2CardReady);
  const p1Lineup = useDerbyStore((s) => s.p1Lineup);
  const p2Lineup = useDerbyStore((s) => s.p2Lineup);
  const possession = useDerbyStore((s) => s.possession);
  const duelIndex = useDerbyStore((s) => s.duelIndex);
  const half = useDerbyStore((s) => s.half);
  const triviaBoost = useDerbyStore((s) => s.triviaBoost);
  const scoreHome = useDerbyStore((s) => s.scoreHome);
  const scoreAway = useDerbyStore((s) => s.scoreAway);
  const kickoff = useDerbyStore((s) => s.kickoff);

  const isHost = role === 'host';
  const isSpectator = role === 'spectator';
  const playerKey = roleToPlayerKey(role);

  // ── Host orchestration: both cards ready → resolve + write result ──────────
  const resolvedRef = useRef(false);
  useEffect(() => {
    if (!isHost || !roomCode || phase !== 'duel' || resolvedRef.current) return;
    if (!p1CardReady || !p2CardReady) return;

    resolvedRef.current = true;

    const snap = useDerbyStore.getState();
    const p1Player = getActivePlayer(snap.p1Lineup);
    const p2Player = getActivePlayer(snap.p2Lineup);
    const p1Gk = getGoalkeeper(snap.p1Lineup);
    const p2Gk = getGoalkeeper(snap.p2Lineup);

    const atkKey = snap.possession;
    const defKey: PlayerKey = atkKey === 'p1' ? 'p2' : 'p1';
    const atkCard = (atkKey === 'p1' ? snap.p1Card : snap.p2Card) ?? CARD.PRESS;
    const defCard = (defKey === 'p1' ? snap.p1Card : snap.p2Card) ?? CARD.PRESS;
    const atkStats = atkKey === 'p1' ? p1Player.stats : p2Player.stats;
    const defStats = defKey === 'p1' ? p1Player.stats : p2Player.stats;

    // Apply trivia boost (+1 all stats) if applicable for this first duel
    const boostMod = (key: PlayerKey): PlayerStats => {
      if (triviaBoost === key && duelIndex === 0 && half === 1) {
        const s = atkKey === key ? atkStats : defStats;
        return { ...s, riisto: s.riisto + 1, laukaus: s.laukaus + 1, harhautus: s.harhautus + 1 };
      }
      return atkKey === key ? atkStats : defStats;
    };

    const atkStatsFinal = boostMod(atkKey);
    const defStatsFinal = boostMod(defKey);

    const winner = resolveDuel(atkCard, defCard, atkStatsFinal, defStatsFinal);
    const duelWinner = winner ?? 'draw';

    let scored = false;
    let newScoreHome = snap.scoreHome;
    let newScoreAway = snap.scoreAway;
    let newPossession: PlayerKey = snap.possession;

    if (winner === 'attacker') {
      // Any attacker win triggers a goal attempt — SQ-GOAL-01
      const defGk = defKey === 'p1' ? p1Gk : p2Gk;
      const save = resolveGoalkeeping(defGk.stats, atkStatsFinal);
      if (save === 'goal') {
        scored = true;
        if (atkKey === 'p1') newScoreHome++;
        else newScoreAway++;
        // After goal, other team kicks off
        newPossession = defKey;
      } else {
        // Save → attacker wins the duel, keeps possession
        newPossession = atkKey;
      }
    } else if (winner === 'defender') {
      // Defender wins → takes possession
      newPossession = defKey;
    }
    // draw → possession unchanged

    writeDuelResult(
      roomCode,
      atkCard,
      defCard,
      duelWinner,
      scored,
      newScoreHome,
      newScoreAway,
      newPossession,
    ).catch(console.error);
  }, [isHost, roomCode, phase, p1CardReady, p2CardReady]);

  // Reset resolver flag when entering a new duel
  useEffect(() => {
    resolvedRef.current = false;
  }, [duelIndex, half]);

  // ── Host orchestration: advance after result display ──────────────────────
  const advancedRef = useRef(false);
  useEffect(() => {
    if (!isHost || !roomCode || phase !== 'duel_result') return;
    if (advancedRef.current) return;
    advancedRef.current = true;

    const timer = setTimeout(() => {
      const snap = useDerbyStore.getState();
      const nextDuelIndex = snap.duelIndex + 1;

      if (nextDuelIndex >= DUELS_PER_HALF) {
        if (snap.half === 1) {
          // Go to halftime
          advanceDerbyPhase(roomCode, 'halftime').catch(console.error);
        } else {
          // End of match
          advanceDerbyPhase(roomCode, 'result').catch(console.error);
        }
      } else {
        resetForNextDuel(roomCode, nextDuelIndex, false, snap.possession).catch(console.error);
      }
    }, RESULT_DISPLAY_MS);

    return () => clearTimeout(timer);
  }, [isHost, roomCode, phase]);

  // Reset advance flag when leaving duel_result phase
  useEffect(() => {
    advancedRef.current = false;
  }, [duelIndex, half]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (phase === 'duel_result') {
    return <DuelResultView />;
  }

  if (isSpectator) {
    return <BigScreenDuelView />;
  }

  return (
    <PhoneDuelView
      playerKey={playerKey ?? 'p1'}
      roomCode={roomCode ?? ''}
    />
  );
}

// ─── Phone Duel View ──────────────────────────────────────────────────────────

interface PhoneDuelViewProps {
  playerKey: PlayerKey;
  roomCode: string;
}

/**
 * Phone duel view — shows 3 card buttons and possession context.
 *
 * @param playerKey - This client's player key
 * @param roomCode  - Active room code
 */
function PhoneDuelView({ playerKey, roomCode }: PhoneDuelViewProps): JSX.Element {
  const { t } = useTranslation();
  const possession = useDerbyStore((s) => s.possession);
  const duelIndex = useDerbyStore((s) => s.duelIndex);
  const half = useDerbyStore((s) => s.half);
  const p1CardReady = useDerbyStore((s) => s.p1CardReady);
  const p2CardReady = useDerbyStore((s) => s.p2CardReady);
  const scoreHome = useDerbyStore((s) => s.scoreHome);
  const scoreAway = useDerbyStore((s) => s.scoreAway);

  const myCardReady = playerKey === 'p1' ? p1CardReady : p2CardReady;
  const isAttacker = possession === playerKey;
  const [submitting, setSubmitting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  /**
   * Submit the chosen card to Firebase.
   *
   * @param card - Card the player chose
   */
  async function handleCard(card: Card): Promise<void> {
    if (myCardReady || submitting) return;
    setSubmitting(true);
    try {
      await submitCard(roomCode, playerKey, card);
    } catch (err) {
      console.error('[DerbyDuel] submitCard failed:', err);
      setSubmitting(false);
    }
  }

  const cards: { card: Card; label: string; emoji: string; testId: string }[] = [
    { card: CARD.PRESS, label: t('cards.press_fi'), emoji: '⚔️', testId: 'card-press' },
    { card: CARD.FEINT, label: t('cards.feint_fi'), emoji: '💨', testId: 'card-feint' },
    { card: CARD.SHOT, label: t('cards.shot_fi'), emoji: '🎯', testId: 'card-shot' },
  ];

  if (myCardReady) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex flex-col items-center justify-center p-6 gap-6" data-testid="derby-duel-waiting">
        <div className="text-4xl">✅</div>
        <p className="text-center text-[#A0A0A0]">{t('derby_match.duel_waiting')}</p>
        <ScoreBadge home={scoreHome} away={scoreAway} />
      </div>
    );
  }

  return (
    <>
    {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

    <div className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex flex-col p-4" data-testid="derby-duel-phone">
      {/* Help button */}
      <button
        data-testid="help-btn"
        onClick={() => setShowHelp(true)}
        className="fixed top-4 left-4 z-40 w-9 h-9 rounded-full border-2 border-[#555] text-[#A0A0A0] font-black text-base hover:border-[#FFE600] hover:text-[#FFE600] transition-colors bg-[#1A1A1A]"
        aria-label="Help"
      >
        ?
      </button>

      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-[#A0A0A0]">
          {t('derby_match.duel_half', { half })} · {t('derby_match.duel_title', { number: duelIndex + 1, total: DUELS_PER_HALF })}
        </span>
        <ScoreBadge home={scoreHome} away={scoreAway} />
      </div>

      {/* Possession indicator */}
      <div className={`rounded-lg p-3 mb-4 text-center text-sm font-semibold ${
        isAttacker ? 'bg-[#FFE600]/10 border border-[#FFE600] text-[#FFE600]' : 'bg-[#2A2A2A] text-[#A0A0A0]'
      }`}>
        {isAttacker ? `⚽ ${t('derby_match.duel_attacker_label')}` : `🛡️ ${t('derby_match.duel_defender_label')}`}
      </div>

      {/* Instruction */}
      <p className="text-center text-[#F5F0E8] font-semibold mb-4">{t('derby_match.duel_choose_card')}</p>

      {/* Card buttons */}
      <div className="flex flex-col gap-3" data-testid="card-buttons">
        {cards.map(({ card, label, emoji, testId }) => (
          <button
            key={card}
            data-testid={testId}
            onClick={() => handleCard(card)}
            disabled={submitting}
            className="py-4 rounded-lg font-bold text-lg transition-all bg-[#2A2A2A] border border-[#555] text-[#F5F0E8] hover:border-[#FFE600] hover:bg-[#FFE600]/10 active:scale-95"
          >
            {emoji} {label}
          </button>
        ))}
      </div>
    </div>
    </>
  );
}

// ─── Big Screen Duel View ─────────────────────────────────────────────────────

/**
 * Big screen duel view — shows both manager status and drives the countdown.
 * When both cards are ready, performs a 3-2-1 local countdown.
 *
 * @returns The big screen duel status display
 */
function BigScreenDuelView(): JSX.Element {
  const { t } = useTranslation();
  const p1CardReady = useDerbyStore((s) => s.p1CardReady);
  const p2CardReady = useDerbyStore((s) => s.p2CardReady);
  const possession = useDerbyStore((s) => s.possession);
  const duelIndex = useDerbyStore((s) => s.duelIndex);
  const half = useDerbyStore((s) => s.half);
  const scoreHome = useDerbyStore((s) => s.scoreHome);
  const scoreAway = useDerbyStore((s) => s.scoreAway);
  const p1Lineup = useDerbyStore((s) => s.p1Lineup);
  const p2Lineup = useDerbyStore((s) => s.p2Lineup);

  const [countdown, setCountdown] = useState<number | null>(null);

  // Trigger countdown when both are ready
  useEffect(() => {
    if (!p1CardReady || !p2CardReady) {
      setCountdown(null);
      return;
    }
    setCountdown(3);
    const t1 = setTimeout(() => setCountdown(2), COUNTDOWN_STEP_MS);
    const t2 = setTimeout(() => setCountdown(1), COUNTDOWN_STEP_MS * 2);
    const t3 = setTimeout(() => setCountdown(null), COUNTDOWN_STEP_MS * 3);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [p1CardReady, p2CardReady]);

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex flex-row" data-testid="derby-duel-bigscreen">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
        {/* Score */}
        <div className="text-xl font-bold">
          <ScoreBadge home={scoreHome} away={scoreAway} large />
        </div>

        {/* Duel info */}
        <p className="text-[#A0A0A0]">
          {t('derby_match.duel_half', { half })} · {t('derby_match.duel_title', { number: duelIndex + 1, total: DUELS_PER_HALF })}
        </p>

        {/* Possession */}
        <div className="text-sm text-[#FFE600]">
          ⚽ {t('derby_match.duel_possession_label')}: {possession === 'p1' ? t('derby_match.p1_label') : t('derby_match.p2_label')}
        </div>

        {/* Manager status */}
        <div className="flex gap-12">
          <ManagerStatus
            label={t('derby_match.duel_p1_ready')}
            waitingLabel={t('derby_match.duel_p1_choosing')}
            ready={p1CardReady}
          />
          <ManagerStatus
            label={t('derby_match.duel_p2_ready')}
            waitingLabel={t('derby_match.duel_p2_choosing')}
            ready={p2CardReady}
          />
        </div>

        {/* Active player cards side by side */}
        {p1Lineup.length > 0 && p2Lineup.length > 0 && (
          <div
            data-testid="bigscreen-player-cards"
            className="flex gap-8 w-full max-w-2xl"
          >
            <div className="flex-1 flex flex-col gap-2">
              <span className={`text-xs font-black text-center uppercase tracking-widest ${
                possession === 'p1' ? 'text-[#FFE600]' : 'text-[#F5F0E8]/40'
              }`}>
                {possession === 'p1' ? t('duel.attacker_badge') : t('duel.defender_badge')}
              </span>
              <PlayerCard
                player={getActivePlayerByIndex(p1Lineup, duelIndex) as unknown as SquadPlayer}
                showAbility
              />
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <span className={`text-xs font-black text-center uppercase tracking-widest ${
                possession === 'p2' ? 'text-[#FFE600]' : 'text-[#F5F0E8]/40'
              }`}>
                {possession === 'p2' ? t('duel.attacker_badge') : t('duel.defender_badge')}
              </span>
              <PlayerCard
                player={getActivePlayerByIndex(p2Lineup, duelIndex) as unknown as SquadPlayer}
                showAbility
              />
            </div>
          </div>
        )}

        {/* Countdown */}
        {countdown !== null && (
          <div
            data-testid="countdown-display"
            className="text-8xl font-black text-[#FFE600] animate-ping"
            style={{ animationDuration: `${COUNTDOWN_STEP_MS}ms` }}
          >
            {countdown}
          </div>
        )}
      </div>
      <InstructionSidebar />
    </div>
  );
}

// ─── Instruction Sidebar ──────────────────────────────────────────────────────

/**
 * InstructionSidebar — always-visible panel on the big screen.
 * Shows the card triangle rules, current possession, score, and half.
 *
 * @returns Sidebar element
 */
function InstructionSidebar(): JSX.Element {
  const { t } = useTranslation();
  const possession = useDerbyStore((s) => s.possession);
  const scoreHome = useDerbyStore((s) => s.scoreHome);
  const scoreAway = useDerbyStore((s) => s.scoreAway);
  const half = useDerbyStore((s) => s.half);

  return (
    <aside
      data-testid="instruction-sidebar"
      className="w-72 shrink-0 border-l border-[#333] bg-[#0F0F0F] p-6 flex flex-col gap-6 overflow-y-auto self-stretch"
    >
      {/* Card triangle */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#F5F0E8]/40 mb-3">
          {t('derby_match.rules_title')}
        </h3>
        <ul className="flex flex-col gap-2 text-sm text-[#F5F0E8]">
          <li>⚔️ {t('help.press_beats_feint')}</li>
          <li>💨 {t('help.feint_beats_shot')}</li>
          <li>🎯 {t('help.shot_beats_press')}</li>
        </ul>
      </section>

      {/* Match info */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#F5F0E8]/40 mb-3">
          {t('derby_match.match_info_title')}
        </h3>
        <div className="flex flex-col gap-2 text-sm">
          <div>
            <span className="text-[#F5F0E8]/50">{t('derby_match.duel_possession_label')}: </span>
            <span className="text-[#FFE600] font-bold">
              ⚽ {possession === 'p1' ? t('derby_match.p1_label') : t('derby_match.p2_label')}
            </span>
          </div>
          <div>
            <span className="text-[#F5F0E8]/50">{t('derby_match.duel_score')}: </span>
            <span className="text-[#FFE600] font-bold">{scoreHome} – {scoreAway}</span>
          </div>
          <div className="text-[#F5F0E8]/70">
            {t('derby_match.duel_half', { half })}
          </div>
        </div>
      </section>
    </aside>
  );
}

// ─── Duel Result View ─────────────────────────────────────────────────────────

/**
 * Duel result view — shown on ALL devices during 'duel_result' phase.
 * Displays the revealed cards, winner, goal/save info, and updated score.
 *
 * @returns The result animation view
 */
function DuelResultView(): JSX.Element {
  const { t } = useTranslation();
  const resultAtkCard = useDerbyStore((s) => s.resultAtkCard);
  const resultDefCard = useDerbyStore((s) => s.resultDefCard);
  const resultWinner = useDerbyStore((s) => s.resultWinner);
  const resultScored = useDerbyStore((s) => s.resultScored);
  const scoreHome = useDerbyStore((s) => s.scoreHome);
  const scoreAway = useDerbyStore((s) => s.scoreAway);
  const possession = useDerbyStore((s) => s.possession);

  const cardLabel = (card: Card | null): string => {
    if (!card) return '?';
    if (card === CARD.PRESS) return `⚔️ ${t('cards.press_fi')}`;
    if (card === CARD.FEINT) return `💨 ${t('cards.feint_fi')}`;
    return `🎯 ${t('cards.shot_fi')}`;
  };

  const winnerText =
    resultWinner === 'attacker'
      ? t('derby_match.duel_attacker_wins')
      : resultWinner === 'defender'
      ? t('derby_match.duel_defender_wins')
      : t('derby_match.duel_draw');

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex flex-col items-center justify-center p-6 gap-6" data-testid="derby-duel-result">
      {/* Score */}
      <ScoreBadge home={scoreHome} away={scoreAway} large />

      {/* Cards revealed */}
      <div className="flex gap-8 items-center">
        <div className="text-center">
          <p className="text-xs text-[#A0A0A0] mb-1">{t('derby_match.p1_label')}</p>
          <div className="bg-[#2A2A2A] rounded-lg px-6 py-4 text-lg font-bold">
            {cardLabel(resultAtkCard)}
          </div>
        </div>
        <div className="text-2xl">⚡</div>
        <div className="text-center">
          <p className="text-xs text-[#A0A0A0] mb-1">{t('derby_match.p2_label')}</p>
          <div className="bg-[#2A2A2A] rounded-lg px-6 py-4 text-lg font-bold">
            {cardLabel(resultDefCard)}
          </div>
        </div>
      </div>

      {/* Winner banner */}
      <div className="text-xl font-bold text-[#FFE600]">{winnerText}</div>

      {/* Goal / Saved */}
      {resultScored && (
        <div className="text-4xl font-black animate-bounce text-green-400">
          {t('derby_match.duel_goal')}
        </div>
      )}
      {resultWinner === 'attacker' && !resultScored && (
        <div className="text-2xl text-[#A0A0A0]">
          {t('derby_match.duel_saved')}
        </div>
      )}
    </div>
  );
}

// ─── Shared Sub-components ────────────────────────────────────────────────────

interface ScoreBadgeProps {
  home: number;
  away: number;
  large?: boolean;
}

/**
 * Score badge showing home – away goal tally.
 *
 * @param home  - Home team goals
 * @param away  - Away team goals
 * @param large - Use larger font for big screen
 */
function ScoreBadge({ home, away, large = false }: ScoreBadgeProps): JSX.Element {
  const { t } = useTranslation();
  const cls = large ? 'text-3xl font-black' : 'text-sm font-bold';
  return (
    <div data-testid="score-badge" className={`${cls} text-[#FFE600]`}>
      {home} – {away}
    </div>
  );
}

interface ManagerStatusProps {
  label: string;
  waitingLabel: string;
  ready: boolean;
}

/**
 * Manager status card showing "Choosing..." or "Ready ✓".
 *
 * @param label        - Ready label
 * @param waitingLabel - Waiting label
 * @param ready        - Whether this manager has submitted their card
 */
function ManagerStatus({ label, waitingLabel, ready }: ManagerStatusProps): JSX.Element {
  return (
    <div
      data-testid={`manager-status-${label.replace(/\s/g, '-').toLowerCase()}`}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border ${
        ready ? 'border-green-500 bg-green-500/10' : 'border-[#444] bg-[#2A2A2A]'
      }`}
    >
      <div className={`text-3xl ${ready ? 'text-green-400' : 'text-[#666]'}`}>
        {ready ? '✓' : '○'}
      </div>
      <div className={`text-sm font-semibold ${ready ? 'text-green-400' : 'text-[#A0A0A0]'}`}>
        {ready ? label : waitingLabel}
      </div>
    </div>
  );
}
