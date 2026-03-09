/**
 * @file HalftimeScreen.tsx
 * Halftime screen — shows the half-time score and allows one management action.
 *
 * Rules:
 * - Manager may do exactly ONE of: swap a player OR change tactics
 * - Or skip and take no action
 * - "Start Second Half" button triggers startSecondHalf()
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../store/matchStore';
import { useSquadStore, type Player } from '../../store/squadStore';
import { TACTIC, type Tactic } from '../../engine/match';
import playersData from '../../data/players.json';

const ALL_PLAYERS = playersData as Player[];

type HalftimeAction = 'none' | 'swap' | 'tactic';

/**
 * HalftimeScreen — management decision point between halves.
 *
 * @returns The halftime screen element
 */
export default function HalftimeScreen(): JSX.Element {
  const { t } = useTranslation();

  const homeGoals = useMatchStore((s) => s.homeGoals);
  const awayGoals = useMatchStore((s) => s.awayGoals);
  const halftimeActionUsed = useMatchStore((s) => s.halftimeActionUsed);
  const useHalftimeAction = useMatchStore((s) => s.useHalftimeAction);
  const setTactic = useMatchStore((s) => s.setTactic);
  const startSecondHalf = useMatchStore((s) => s.startSecondHalf);
  const homeLineup = useSquadStore((s) => s.homeLineup);
  const swapPlayer = useSquadStore((s) => s.swapPlayer);

  const [action, setAction] = useState<HalftimeAction>('none');
  const [swapOutIndex, setSwapOutIndex] = useState<number | null>(null);
  const [swapInPlayer, setSwapInPlayer] = useState<Player | null>(null);
  const [selectedTactic, setSelectedTactic] = useState<Tactic | null>(null);

  /** Outfield players currently in the home lineup (indices 0–5) */
  const homOutfield = homeLineup.slice(0, 6);

  /** Players available to swap in: not already in home lineup */
  const homeLineupIds = new Set(homeLineup.map((s) => s.player.id));
  const swapCandidates = ALL_PLAYERS.filter(
    (p) => !homeLineupIds.has(p.id) && p.position.some((pos) => pos === 'MF' || pos === 'FW'),
  );

  function selectAction(a: HalftimeAction) {
    if (halftimeActionUsed) return;
    setAction(a);
    setSwapOutIndex(null);
    setSwapInPlayer(null);
    setSelectedTactic(null);
  }

  function confirmSwap() {
    if (swapOutIndex === null || !swapInPlayer) return;
    swapPlayer('home', swapOutIndex, swapInPlayer);
    useHalftimeAction();
    setAction('none');
  }

  function confirmTactic() {
    if (!selectedTactic) return;
    setTactic('home', selectedTactic);
    useHalftimeAction();
    setAction('none');
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex flex-col items-center px-4 py-8 gap-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="text-xs font-bold uppercase tracking-widest text-[#F5F0E8]/40">
          {t('halftime.title')}
        </div>
        <div
          data-testid="halftime-score"
          className="text-5xl font-black text-[#FFE600] mt-2 tabular-nums"
        >
          {homeGoals} – {awayGoals}
        </div>
        <div className="text-xs uppercase tracking-widest text-[#F5F0E8]/40 mt-1">
          {t('halftime.score_label')}
        </div>
      </div>

      {/* Management actions */}
      <div className="w-full">
        {halftimeActionUsed ? (
          <div
            data-testid="action-used-notice"
            className="text-center text-sm text-[#F5F0E8]/50 py-4"
          >
            {t('halftime.action_used')}
          </div>
        ) : (
          <>
            <div className="text-sm font-bold uppercase tracking-widest text-[#F5F0E8]/60 mb-3 text-center">
              {t('halftime.choose_action')}
            </div>
            <div className="flex flex-col gap-3">
              {/* Swap */}
              <button
                data-testid="action-swap-btn"
                onClick={() => selectAction(action === 'swap' ? 'none' : 'swap')}
                className={[
                  'w-full py-3 rounded-xl font-bold uppercase tracking-widest border-2 transition-all',
                  action === 'swap'
                    ? 'border-[#FFE600] bg-[#FFE600]/10 text-[#FFE600]'
                    : 'border-[#F5F0E8]/20 text-[#F5F0E8]/70',
                ].join(' ')}
              >
                {t('halftime.swap_player')}
              </button>

              {/* Swap sub-UI */}
              {action === 'swap' && (
                <div
                  data-testid="swap-ui"
                  className="rounded-xl border border-[#FFE600]/20 p-4 flex flex-col gap-3"
                >
                  <div className="text-xs uppercase tracking-widest text-[#F5F0E8]/50">
                    {t('halftime.swap_label')}
                  </div>
                  <div className="flex flex-col gap-2">
                    {homOutfield.map((slot, idx) => (
                      <button
                        key={slot.player.id}
                        data-testid={`swap-out-${slot.player.id}`}
                        onClick={() => setSwapOutIndex(idx)}
                        className={[
                          'py-2 px-3 rounded-lg text-sm font-bold border text-left transition-all',
                          swapOutIndex === idx
                            ? 'border-[#FFE600] text-[#FFE600]'
                            : 'border-[#F5F0E8]/20 text-[#F5F0E8]/70',
                        ].join(' ')}
                      >
                        {slot.player.name}
                      </button>
                    ))}
                  </div>

                  {swapOutIndex !== null && (
                    <>
                      <div className="text-xs uppercase tracking-widest text-[#F5F0E8]/50">
                        {t('halftime.swap_in_label')}
                      </div>
                      <div className="flex flex-col gap-2">
                        {swapCandidates.map((p) => (
                          <button
                            key={p.id}
                            data-testid={`swap-in-${p.id}`}
                            onClick={() => setSwapInPlayer(p)}
                            className={[
                              'py-2 px-3 rounded-lg text-sm font-bold border text-left transition-all',
                              swapInPlayer?.id === p.id
                                ? 'border-[#FFE600] text-[#FFE600]'
                                : 'border-[#F5F0E8]/20 text-[#F5F0E8]/70',
                            ].join(' ')}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                      <button
                        data-testid="confirm-swap-btn"
                        onClick={confirmSwap}
                        disabled={swapInPlayer === null}
                        className="py-2 px-4 bg-[#FFE600] text-[#1A1A1A] font-black uppercase rounded-lg disabled:opacity-30"
                      >
                        {t('halftime.confirm_swap')}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Change Tactics */}
              <button
                data-testid="action-tactic-btn"
                onClick={() => selectAction(action === 'tactic' ? 'none' : 'tactic')}
                className={[
                  'w-full py-3 rounded-xl font-bold uppercase tracking-widest border-2 transition-all',
                  action === 'tactic'
                    ? 'border-[#FFE600] bg-[#FFE600]/10 text-[#FFE600]'
                    : 'border-[#F5F0E8]/20 text-[#F5F0E8]/70',
                ].join(' ')}
              >
                {t('halftime.change_tactics')}
              </button>

              {/* Tactic sub-UI */}
              {action === 'tactic' && (
                <div
                  data-testid="tactic-ui"
                  className="rounded-xl border border-[#FFE600]/20 p-4 flex flex-col gap-3"
                >
                  <div className="text-xs uppercase tracking-widest text-[#F5F0E8]/50">
                    {t('halftime.tactic_label')}
                  </div>
                  <div className="flex gap-2">
                    {([TACTIC.AGGRESSIVE, TACTIC.DEFENSIVE, TACTIC.CREATIVE] as Tactic[]).map((tac) => (
                      <button
                        key={tac}
                        data-testid={`tactic-${tac}`}
                        onClick={() => setSelectedTactic(tac)}
                        className={[
                          'flex-1 py-2 rounded-lg text-sm font-bold border transition-all',
                          selectedTactic === tac
                            ? 'border-[#FFE600] text-[#FFE600] bg-[#FFE600]/10'
                            : 'border-[#F5F0E8]/20 text-[#F5F0E8]/70',
                        ].join(' ')}
                      >
                        {t(`tactic.${tac}`)}
                      </button>
                    ))}
                  </div>
                  <button
                    data-testid="confirm-tactic-btn"
                    onClick={confirmTactic}
                    disabled={selectedTactic === null}
                    className="py-2 px-4 bg-[#FFE600] text-[#1A1A1A] font-black uppercase rounded-lg disabled:opacity-30"
                  >
                    {t('halftime.confirm_tactic')}
                  </button>
                </div>
              )}

              {/* No action */}
              <button
                data-testid="action-skip-btn"
                onClick={() => selectAction('none')}
                className="w-full py-2 rounded-xl font-bold uppercase tracking-widest text-[#F5F0E8]/40 text-sm hover:text-[#F5F0E8]/70 transition-all"
              >
                {t('halftime.no_action')}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Start second half */}
      <button
        data-testid="start-second-half-btn"
        onClick={startSecondHalf}
        className="w-full py-4 bg-[#FFE600] text-[#1A1A1A] font-black text-lg uppercase tracking-widest rounded-xl hover:bg-[#FFE600]/90 active:scale-95 transition-all"
      >
        {t('halftime.start_second_half')}
      </button>
    </div>
  );
}
