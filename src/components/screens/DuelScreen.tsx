/**
 * @file DuelScreen.tsx
 * The main duel gameplay screen for Phase 1.
 *
 * UI state machine (local):
 *   attacker_pick → cover → defender_pick → show_result
 *
 * Flow per duel:
 * 1. Possession holder (attacker) picks a card
 * 2. Cover screen — players pass the device to the other side
 * 3. Defender picks a card
 * 4. Duel resolves:
 *    - If attacker wins with Shot → goalkeeper save check → goal or saved
 *    - Possession updates via resolvePossession()
 * 5. Show result, then advanceDuel()
 *
 * Special case: triviaBoostActive → first duel auto-wins for home (no card pick needed).
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../store/matchStore';
import { useSquadStore } from '../../store/squadStore';
import { resolveDuel, CARD, type Card } from '../../engine/duel';
import { resolvePossession } from '../../engine/possession';
import { resolveGoalkeeping, resetBrickWall, type BrickWallState } from '../../engine/goalkeeper';
import CardButton from '../ui/CardButton';
import ScoreBoard from '../ui/ScoreBoard';

type DuelUiPhase = 'attacker_pick' | 'cover' | 'defender_pick' | 'show_result';

interface DuelResult {
  winner: 'attacker' | 'defender' | null;
  goalAttempt: boolean;
  goalScored: boolean;
  triviaBoostUsed: boolean;
}

/**
 * DuelScreen — handles card selection, duel resolution, and possession for both halves.
 * Brick Wall state uses local component state so it resets naturally when the
 * component unmounts at halftime and remounts for the second half.
 *
 * @returns The duel screen element
 */
export default function DuelScreen(): JSX.Element {
  const { t } = useTranslation();

  // Store selectors — individual to avoid infinite re-renders
  const half = useMatchStore((s) => s.half);
  const duelIndex = useMatchStore((s) => s.duelIndex);
  const homeGoals = useMatchStore((s) => s.homeGoals);
  const awayGoals = useMatchStore((s) => s.awayGoals);
  const possession = useMatchStore((s) => s.possession);
  const triviaBoostActive = useMatchStore((s) => s.triviaBoostActive);
  const scoreGoal = useMatchStore((s) => s.scoreGoal);
  const advanceDuel = useMatchStore((s) => s.advanceDuel);
  const setPossession = useMatchStore((s) => s.setPossession);
  const homeLineup = useSquadStore((s) => s.homeLineup);
  const awayLineup = useSquadStore((s) => s.awayLineup);

  // Local duel UI state
  const [uiPhase, setUiPhase] = useState<DuelUiPhase>('attacker_pick');
  const [attackerCard, setAttackerCard] = useState<Card | null>(null);
  const [duelResult, setDuelResult] = useState<DuelResult | null>(null);

  // Brick Wall resets when this component remounts (at halftime the screen unmounts)
  const [brickWall, setBrickWall] = useState<BrickWallState>(resetBrickWall);

  const attackerSide = possession ?? 'home';
  const defenderSide = attackerSide === 'home' ? 'away' : 'home';

  /** Slot index for this duel's players (outfield players cycle through positions) */
  const outfieldSlot = duelIndex % 5;
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

  /**
   * Resolve the duel after both cards are chosen.
   * Handles trivia boost, possession, goalkeeper save, and scoring.
   *
   * @param atkCard - Card played by the attacker
   * @param defCard - Card played by the defender
   */
  function resolveCurrent(atkCard: Card, defCard: Card) {
    // Trivia boost: home's first card auto-wins
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
      // Check if keeper has Brick Wall ability and it hasn't been used this half
      const keeperHasBrickWall =
        goalkeeperSlot?.player.ability.id === 'brick_wall' && !brickWall.usedThisHalf;

      const saveResult = resolveGoalkeeping(keeperStats, attackerStats, keeperHasBrickWall);

      if (saveResult === 'saved') {
        // If Brick Wall triggered, mark it as used
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

  /** Attacker picks card → go to cover screen */
  function handleAttackerPick(card: Card) {
    setAttackerCard(card);
    setUiPhase('cover');
  }

  /** From cover screen — show defender pick */
  function handleCoverContinue() {
    setUiPhase('defender_pick');
  }

  /** Defender picks card → resolve */
  function handleDefenderPick(card: Card) {
    resolveCurrent(attackerCard!, card);
  }

  /** Advance to next duel after showing result */
  function handleContinue() {
    setAttackerCard(null);
    setDuelResult(null);
    setUiPhase('attacker_pick');
    advanceDuel();
  }

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

      {/* ─── Phase: Attacker picks ─── */}
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

      {/* ─── Phase: Cover screen ─── */}
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

      {/* ─── Phase: Defender picks ─── */}
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

      {/* ─── Phase: Show result ─── */}
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
