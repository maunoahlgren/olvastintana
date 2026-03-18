/**
 * @file LineupScreen.tsx
 * Lineup selection screen — home manager picks their squad; in AI mode the
 * away lineup is automatically selected by the AI.
 *
 * Rules:
 * - Select exactly 6 outfield players (MF / FW)
 * - Select exactly 1 goalkeeper (GK)
 * - If triviaResult === 'wrong', the penalty player is stored in matchStore.triviaPenaltyPlayerId
 *   and the -1 stat modifier is applied here on confirm (if the player is in the lineup)
 * - Once home confirms, AI selects away lineup (AI mode) or away picks manually (two-player)
 * - startFirstHalf() moves to FIRST_HALF
 *
 * AI mode (aiDifficulty !== null):
 *   After home confirms, pickAiLineup() is called based on difficulty.
 *   The away picking step is skipped entirely — the AI's selection is not shown.
 *
 * Two-player mode (aiDifficulty === null):
 *   Original pass-and-play flow: home picks → pass device → away picks.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../store/matchStore';
import { useSquadStore, type Player } from '../../store/squadStore';
import { useSessionStore } from '../../store/sessionStore';
import { pickAiLineup } from '../../engine/ai';
import PlayerCard from '../ui/PlayerCard';
import QuitMatchButton from '../ui/QuitMatchButton';
import playersData from '../../data/players.json';

const ALL_PLAYERS = playersData as Player[];

const OUTFIELD = ALL_PLAYERS.filter((p) => p.position.some((pos) => pos === 'MF' || pos === 'FW'));
const GOALKEEPERS = ALL_PLAYERS.filter((p) => p.position.includes('GK'));

type PickStep = 'home' | 'away';

/**
 * LineupScreen — squad selection.
 *
 * @returns The lineup screen element
 */
export default function LineupScreen(): JSX.Element {
  const { t } = useTranslation();

  // Individual selectors to avoid infinite re-render from object identity changes
  const triviaResult = useMatchStore((s) => s.triviaResult);
  const triviaPenaltyPlayerId = useMatchStore((s) => s.triviaPenaltyPlayerId);
  const homeTactic = useMatchStore((s) => s.homeTactic);
  const startFirstHalf = useMatchStore((s) => s.startFirstHalf);
  const setLineup = useSquadStore((s) => s.setLineup);
  const applyStatModifier = useSquadStore((s) => s.applyStatModifier);
  const aiDifficulty = useSessionStore((s) => s.aiDifficulty);

  const isAiMatch = aiDifficulty !== null;

  const [step, setStep] = useState<PickStep>('home');

  // --- Home lineup state ---
  const [homeOutfield, setHomeOutfield] = useState<Player[]>([]);
  const [homeGk, setHomeGk] = useState<Player | null>(null);

  // --- Away lineup state (two-player only) ---
  const [awayOutfield, setAwayOutfield] = useState<Player[]>([]);
  const [awayGk, setAwayGk] = useState<Player | null>(null);

  const isHome = step === 'home';

  const outfield = isHome ? homeOutfield : awayOutfield;
  const setOutfield = isHome ? setHomeOutfield : setAwayOutfield;
  const gk = isHome ? homeGk : awayGk;
  const setGk = isHome ? setHomeGk : setAwayGk;

  /** Toggle an outfield player selection (max 6) */
  function toggleOutfield(player: Player) {
    if (outfield.some((p) => p.id === player.id)) {
      setOutfield(outfield.filter((p) => p.id !== player.id));
    } else if (outfield.length < 6) {
      setOutfield([...outfield, player]);
    }
  }

  /** Toggle goalkeeper selection */
  function toggleGk(player: Player) {
    setGk(gk?.id === player.id ? null : player);
  }

  const outfieldComplete = outfield.length === 6;
  const gkComplete = gk !== null;
  const canConfirm = outfieldComplete && gkComplete;

  function confirmStep() {
    if (!gk) return;
    const side = isHome ? 'home' : 'away';
    setLineup(side, [...outfield, gk]);

    // Apply trivia -1 penalty to the player chosen during TriviaScreen (home only)
    if (isHome && triviaPenaltyPlayerId) {
      const penaltyMod = {
        riisto: -1 as const,
        laukaus: -1 as const,
        harhautus: -1 as const,
        torjunta: -1 as const,
        stamina: -1 as const,
      };
      applyStatModifier('home', triviaPenaltyPlayerId, penaltyMod);
    }

    if (isHome) {
      if (isAiMatch) {
        // AI mode: auto-select away lineup and start immediately
        const homeLineupIds = [...homeOutfield, gk].map((p) => p.id);
        const aiResult = pickAiLineup(
          aiDifficulty,
          ALL_PLAYERS,
          homeLineupIds,
          homeTactic ?? 'aggressive',
        );
        // Convert AI lineup IDs back to Player objects
        const awayPlayers = [
          ...aiResult.outfield.map((id) => ALL_PLAYERS.find((p) => p.id === id)).filter(Boolean),
          ALL_PLAYERS.find((p) => p.id === aiResult.goalkeeper),
        ].filter((p): p is Player => p !== undefined);
        setLineup('away', awayPlayers);
        startFirstHalf();
      } else {
        // Two-player mode: proceed to away picks
        setStep('away');
      }
    } else {
      startFirstHalf();
    }
  }

  const sideLabel = isHome ? t('duel.home_team') : t('duel.away_team');

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8] px-4 py-6 flex flex-col gap-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="relative text-center">
        <div className="absolute left-0 top-0">
          <QuitMatchButton />
        </div>
        <div className="text-xs font-bold uppercase tracking-widest text-[#F5F0E8]/40">
          {t('screens.lineup')}
        </div>
        <h1
          data-testid="lineup-side-header"
          className="text-2xl font-black text-[#FFE600] mt-1"
        >
          {sideLabel} — {t('lineup.pick_your_team')}
        </h1>
      </div>

      {/* Composite counter */}
      <div
        data-testid="lineup-counter"
        className="text-center text-sm font-bold text-[#FFE600]"
      >
        {t('lineup.counter', { outfield: outfield.length, gk: gk ? 1 : 0 })}
      </div>

      {/* Trivia wrong penalty notice (home only) — informational, penalty already chosen */}
      {isHome && triviaResult === 'wrong' && (
        <div
          data-testid="trivia-penalty-notice"
          className="rounded-xl border border-red-500/40 bg-red-900/20 p-4 text-sm text-red-400"
        >
          {t('lineup.penalty_info')}
        </div>
      )}

      {/* Goalkeeper section */}
      <section>
        <div className="text-sm font-bold uppercase tracking-widest text-[#F5F0E8]/60 mb-3">
          {t('lineup.goalkeeper')} ({gk ? '1' : '0'}/1)
        </div>
        <div data-testid="goalkeeper-grid" className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {GOALKEEPERS.map((player) => (
            <div
              key={player.id}
              className={gkComplete && gk?.id !== player.id ? 'opacity-50' : ''}
            >
              <PlayerCard
                player={player}
                selected={gk?.id === player.id}
                onSelect={() => toggleGk(player)}
                showAbility={false}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Outfield section */}
      <section>
        <div className="text-sm font-bold uppercase tracking-widest text-[#F5F0E8]/60 mb-3">
          {t('lineup.outfield')} ({outfield.length}/6)
        </div>
        <div
          data-testid="outfield-grid"
          className="grid grid-cols-2 sm:grid-cols-3 gap-3"
        >
          {OUTFIELD.map((player) => {
            const isSelected = outfield.some((p) => p.id === player.id);
            return (
              <div
                key={player.id}
                className={`relative ${outfieldComplete && !isSelected ? 'opacity-50' : ''}`}
              >
                <PlayerCard
                  player={player}
                  selected={isSelected}
                  onSelect={() => toggleOutfield(player)}
                  showAbility={false}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Confirm button */}
      <button
        data-testid="confirm-lineup-btn"
        onClick={confirmStep}
        disabled={!canConfirm}
        className={[
          'w-full py-4 font-black text-lg uppercase tracking-widest rounded-xl transition-all',
          canConfirm
            ? 'bg-[#FFE600] text-[#1A1A1A] hover:bg-[#FFE600]/90 active:scale-95'
            : 'bg-[#F5F0E8]/10 text-[#F5F0E8]/30 cursor-not-allowed',
        ].join(' ')}
      >
        {t('lineup.confirm_lineup')}
      </button>
    </div>
  );
}
