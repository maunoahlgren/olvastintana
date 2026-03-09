/**
 * @file DuelScreen.tsx
 * The main duel gameplay screen, supporting both two-player and AI modes.
 *
 * ── Two-player mode (aiDifficulty === null) ──────────────────────────────────
 * UI state machine: attacker_pick → cover → defender_pick → show_result
 *
 * ── AI mode (aiDifficulty !== null) ─────────────────────────────────────────
 * Human always controls the Home (left) side. Away side is the AI.
 * UI state machine: human_pick → show_result
 *
 *   If home has possession (human is attacker):
 *     1. Human picks attacker card
 *     2. AI auto-picks defender card
 *     3. Resolve → show result
 *
 *   If away has possession (AI is attacker):
 *     1. Human sees "AI is attacking" prompt and picks their defender card
 *     2. AI attacker card is auto-generated simultaneously
 *     3. Resolve → show result
 *
 * In AI mode the cover screen is skipped — no second human needs to be shielded.
 * The human's card is always recorded in matchStore.playerCardHistory for Hard AI.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../store/matchStore';
import { useSquadStore } from '../../store/squadStore';
import { useSessionStore } from '../../store/sessionStore';
import { resolveDuel, CARD, type Card } from '../../engine/duel';
import { resolvePossession } from '../../engine/possession';
import { resolveGoalkeeping, resetBrickWall, type BrickWallState } from '../../engine/goalkeeper';
import { pickAiCard, DUELS_PER_HALF, type CardChoice } from '../../engine/ai';
import CardButton from '../ui/CardButton';
import ScoreBoard from '../ui/ScoreBoard';

/** Phase names for two-player mode */
type TwoPlayerUiPhase = 'attacker_pick' | 'cover' | 'defender_pick' | 'show_result';
/** Phase names for AI mode */
type AiUiPhase = 'human_pick' | 'show_result';
type DuelUiPhase = TwoPlayerUiPhase | AiUiPhase;

interface DuelResult {
  winner: 'attacker' | 'defender' | null;
  goalAttempt: boolean;
  goalScored: boolean;
  triviaBoostUsed: boolean;
}

/**
 * DuelScreen — handles card selection, duel resolution, and possession for both halves.
 *
 * Brick Wall state uses local component state so it resets naturally when the
 * component unmounts at halftime and remounts for the second half.
 *
 * @returns The duel screen element
 */
export default function DuelScreen(): JSX.Element {
  const { t } = useTranslation();

  // ── Store selectors (individual to avoid infinite re-renders) ──────────────
  const half = useMatchStore((s) => s.half);
  const duelIndex = useMatchStore((s) => s.duelIndex);
  const homeGoals = useMatchStore((s) => s.homeGoals);
  const awayGoals = useMatchStore((s) => s.awayGoals);
  const possession = useMatchStore((s) => s.possession);
  const triviaBoostActive = useMatchStore((s) => s.triviaBoostActive);
  const playerCardHistory = useMatchStore((s) => s.playerCardHistory);
  const scoreGoal = useMatchStore((s) => s.scoreGoal);
  const advanceDuel = useMatchStore((s) => s.advanceDuel);
  const setPossession = useMatchStore((s) => s.setPossession);
  const recordPlayerCard = useMatchStore((s) => s.recordPlayerCard);
  const homeLineup = useSquadStore((s) => s.homeLineup);
  const awayLineup = useSquadStore((s) => s.awayLineup);
  const aiDifficulty = useSessionStore((s) => s.aiDifficulty);

  const isAiMatch = aiDifficulty !== null;

  // ── Local UI state ─────────────────────────────────────────────────────────
  const initialUiPhase: DuelUiPhase = isAiMatch ? 'human_pick' : 'attacker_pick';
  const [uiPhase, setUiPhase] = useState<DuelUiPhase>(initialUiPhase);
  const [attackerCard, setAttackerCard] = useState<Card | null>(null);
  const [duelResult, setDuelResult] = useState<DuelResult | null>(null);

  // Brick Wall resets when this component remounts (at halftime the screen unmounts)
  const [brickWall, setBrickWall] = useState<BrickWallState>(resetBrickWall);

  // ── Derived values ─────────────────────────────────────────────────────────
  const attackerSide = possession ?? 'home';
  const defenderSide = attackerSide === 'home' ? 'away' : 'home';

  /** Slot index for this duel's players (outfield players cycle through positions) */
  const outfieldSlot = duelIndex % 6;
  const attackerLineup = attackerSide === 'home' ? homeLineup : awayLineup;
  const defenderLineup = defenderSide === 'home' ? homeLineup : awayLineup;

  const attackerSlot = attackerLineup[outfieldSlot];
  const defenderSlot = defenderLineup[outfieldSlot];
  const goalkeeperSlot =
    defenderSide === 'home'
      ? homeLineup.find((s) => s.player.position.includes('GK'))
      : awayLineup.find((s) => s.player.position.includes('GK'));

  // Merge base stats with any active modifiers
  const attackerStats = attackerSlot
    ? { ...attackerSlot.player.stats, ...attackerSlot.statModifier }
    : { pace: 3, technique: 3, power: 3, iq: 3, stamina: 3, chaos: 3 };

  const defenderStats = defenderSlot
    ? { ...defenderSlot.player.stats, ...defenderSlot.statModifier }
    : { pace: 3, technique: 3, power: 3, iq: 3, stamina: 3, chaos: 3 };

  const keeperStats = goalkeeperSlot
    ? { ...goalkeeperSlot.player.stats, ...goalkeeperSlot.statModifier }
    : { pace: 3, technique: 3, power: 4, iq: 4, stamina: 4, chaos: 1 };

  // In AI mode, the human is always the home side
  const humanIsAttacker = isAiMatch ? attackerSide === 'home' : true;

  // ── AI card picker helper ───────────────────────────────────────────────────

  /**
   * Ask the AI to pick a card given the current game state.
   * The active AI player's IQ is taken from whichever away slot is playing.
   *
   * @returns A Card value chosen by the AI
   */
  function getAiCard(): Card {
    const aiSlot = awayLineup[outfieldSlot];
    const activeIq = aiSlot?.player.stats.iq ?? 4;

    const lastPlayerCard =
      playerCardHistory.length > 0
        ? playerCardHistory[playerCardHistory.length - 1]
        : undefined;

    return pickAiCard(
      aiDifficulty!,
      {
        possession: possession ?? 'home',
        homeGoals,
        awayGoals,
        duelIndex,
        half,
        duelsPerHalf: DUELS_PER_HALF,
        lastPlayerCard,
        activePlayerIq: activeIq,
      },
      playerCardHistory,
    ) as Card;
  }

  // ── Duel resolution ────────────────────────────────────────────────────────

  /**
   * Resolve the duel after both cards are chosen.
   * Handles trivia boost, possession, goalkeeper save, and scoring.
   *
   * @param atkCard - Card played by the attacker
   * @param defCard - Card played by the defender
   */
  function resolveCurrent(atkCard: Card, defCard: Card) {
    const triviaBoostUsed = triviaBoostActive && attackerSide === 'home';
    const winner: 'attacker' | 'defender' | null = triviaBoostUsed
      ? 'attacker'
      : resolveDuel(atkCard, defCard, attackerStats, defenderStats);

    const { possession: newPossession, goalAttempt } = resolvePossession(
      attackerSide,
      winner,
      attackerSide,
      atkCard,
    );

    let goalScored = false;

    if (goalAttempt) {
      const keeperHasBrickWall =
        goalkeeperSlot?.player.ability.id === 'brick_wall' && !brickWall.usedThisHalf;

      const saveResult = resolveGoalkeeping(keeperStats, attackerStats, keeperHasBrickWall);

      if (saveResult === 'saved') {
        if (keeperHasBrickWall) {
          setBrickWall({ usedThisHalf: true });
        }
      } else {
        goalScored = true;
        scoreGoal(attackerSide);
      }
    }

    setPossession(newPossession);
    setDuelResult({ winner, goalAttempt, goalScored, triviaBoostUsed });
    setUiPhase('show_result');
  }

  // ── Two-player handlers ────────────────────────────────────────────────────

  /** Attacker picks card → go to cover screen (two-player mode) */
  function handleAttackerPick(card: Card) {
    setAttackerCard(card);
    setUiPhase('cover');
  }

  /** From cover screen — show defender pick (two-player mode) */
  function handleCoverContinue() {
    setUiPhase('defender_pick');
  }

  /** Defender picks card → resolve (two-player mode) */
  function handleDefenderPick(card: Card) {
    resolveCurrent(attackerCard!, card);
  }

  // ── AI mode handler ────────────────────────────────────────────────────────

  /**
   * Human picks their card in AI mode (as either attacker or defender).
   * The AI's card is determined simultaneously.
   * The human's card is recorded in playerCardHistory for Hard AI.
   *
   * @param humanCard - Card chosen by the human player
   */
  function handleHumanPickAi(humanCard: Card) {
    recordPlayerCard(humanCard as CardChoice);
    const aiCard = getAiCard();
    const atkCard = humanIsAttacker ? humanCard : aiCard;
    const defCard = humanIsAttacker ? aiCard : humanCard;
    resolveCurrent(atkCard, defCard);
  }

  // ── Continue after result ──────────────────────────────────────────────────

  /** Advance to the next duel after showing the result */
  function handleContinue() {
    setAttackerCard(null);
    setDuelResult(null);
    setUiPhase(isAiMatch ? 'human_pick' : 'attacker_pick');
    advanceDuel();
  }

  // ── Display names ──────────────────────────────────────────────────────────
  const attackerName = t(attackerSide === 'home' ? 'duel.home_team' : 'duel.away_team');
  const defenderName = t(defenderSide === 'home' ? 'duel.home_team' : 'duel.away_team');

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex flex-col items-center px-4 py-6 gap-6">
      {/* ScoreBoard */}
      <ScoreBoard
        homeGoals={homeGoals}
        awayGoals={awayGoals}
        half={half}
        duelIndex={duelIndex}
      />

      {/* Possession badge */}
      <div
        data-testid="possession-badge"
        className="text-sm font-bold uppercase tracking-widest text-[#FFE600]"
      >
        {attackerSide === 'home' ? t('possession.home_attack') : t('possession.away_attack')}
      </div>

      {/* Trivia boost banner */}
      {triviaBoostActive && (
        <div
          data-testid="trivia-boost-banner"
          className="text-xs font-bold uppercase tracking-widest text-green-400 border border-green-400/30 px-4 py-2 rounded-lg"
        >
          ⚡ {t('duel.trivia_boost_active')}
        </div>
      )}

      {/* ─── Two-player: Attacker picks ─── */}
      {uiPhase === 'attacker_pick' && (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          <p
            data-testid="attacker-pick-prompt"
            className="text-lg font-bold text-[#F5F0E8]"
          >
            {attackerName}, {t('duel.choose_card')}
          </p>
          <div className="flex gap-4 justify-center">
            <CardButton card={CARD.PRESS} onClick={() => handleAttackerPick(CARD.PRESS)} />
            <CardButton card={CARD.FEINT} onClick={() => handleAttackerPick(CARD.FEINT)} />
            <CardButton card={CARD.SHOT} onClick={() => handleAttackerPick(CARD.SHOT)} />
          </div>
        </div>
      )}

      {/* ─── Two-player: Cover screen ─── */}
      {uiPhase === 'cover' && (
        <div className="flex flex-col items-center gap-6 text-center max-w-sm">
          <p className="text-base font-bold text-[#F5F0E8]/70">
            {t('duel.pass_device')} {defenderName}
          </p>
          <button
            data-testid="cover-continue-btn"
            onClick={handleCoverContinue}
            className="px-8 py-3 border-2 border-[#FFE600] text-[#FFE600] font-bold uppercase tracking-widest rounded-xl hover:bg-[#FFE600] hover:text-[#1A1A1A] transition-all"
          >
            {t('duel.tap_to_continue')}
          </button>
        </div>
      )}

      {/* ─── Two-player: Defender picks ─── */}
      {uiPhase === 'defender_pick' && (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          <p
            data-testid="defender-pick-prompt"
            className="text-lg font-bold text-[#F5F0E8]"
          >
            {defenderName}, {t('duel.choose_card')}
          </p>
          <div className="flex gap-4 justify-center">
            <CardButton card={CARD.PRESS} onClick={() => handleDefenderPick(CARD.PRESS)} />
            <CardButton card={CARD.FEINT} onClick={() => handleDefenderPick(CARD.FEINT)} />
            <CardButton card={CARD.SHOT} onClick={() => handleDefenderPick(CARD.SHOT)} />
          </div>
        </div>
      )}

      {/* ─── AI mode: Human picks (attacker or defender) ─── */}
      {uiPhase === 'human_pick' && (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          <p
            data-testid="attacker-pick-prompt"
            className="text-lg font-bold text-[#F5F0E8]"
          >
            {humanIsAttacker
              ? `${t('duel.home_team')}, ${t('duel.choose_card')}`
              : t('difficulty.ai_attacking')}
          </p>
          <div className="flex gap-4 justify-center">
            <CardButton card={CARD.PRESS} onClick={() => handleHumanPickAi(CARD.PRESS)} />
            <CardButton card={CARD.FEINT} onClick={() => handleHumanPickAi(CARD.FEINT)} />
            <CardButton card={CARD.SHOT} onClick={() => handleHumanPickAi(CARD.SHOT)} />
          </div>
        </div>
      )}

      {/* ─── Show result (both modes) ─── */}
      {uiPhase === 'show_result' && duelResult && (
        <div
          data-testid="duel-result-panel"
          className="flex flex-col items-center gap-4 text-center max-w-sm"
        >
          {duelResult.goalAttempt ? (
            <div
              data-testid={duelResult.goalScored ? 'goal-result' : 'saved-result'}
              className={`text-4xl font-black ${duelResult.goalScored ? 'text-[#FFE600]' : 'text-[#F5F0E8]/60'}`}
            >
              {duelResult.goalScored ? t('duel.goal_scored') : t('duel.shot_saved')}
            </div>
          ) : (
            <div
              data-testid="duel-outcome-text"
              className="text-xl font-bold text-[#F5F0E8]"
            >
              {duelResult.triviaBoostUsed
                ? t('duel.trivia_boost_active')
                : duelResult.winner === 'attacker'
                  ? t('duel.attacker_wins')
                  : duelResult.winner === 'defender'
                    ? t('duel.defender_wins')
                    : t('duel.draw_result')}
            </div>
          )}

          <button
            data-testid="duel-continue-btn"
            onClick={handleContinue}
            className="px-8 py-3 bg-[#FFE600] text-[#1A1A1A] font-black uppercase tracking-widest rounded-xl hover:bg-[#FFE600]/90 active:scale-95 transition-all"
          >
            {t('duel.continue')}
          </button>
        </div>
      )}
    </div>
  );
}
