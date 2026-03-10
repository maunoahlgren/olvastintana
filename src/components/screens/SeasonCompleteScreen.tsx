/**
 * @file SeasonCompleteScreen.tsx
 * Season complete screen — shown after all 7 fixtures have been played.
 *
 * Displays:
 * - Final points tally
 * - W/D/L breakdown across all 7 matches
 * - "New Season" button → generates fresh fixture list, resets to SEASON
 *
 * i18n keys: season_complete.title, season_complete.points,
 *   season_complete.record, season_complete.new
 */

import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../store/matchStore';
import { useSeasonStore } from '../../store/seasonStore';
import opponentsData from '../../data/opponents.json';
import type { Opponent } from '../../engine/season';

/**
 * SeasonCompleteScreen — final standings after 7 matches.
 *
 * "New Season" regenerates fixtures (random new set) and returns to SEASON.
 *
 * @returns The season complete screen element
 */
export default function SeasonCompleteScreen(): JSX.Element {
  const { t } = useTranslation();
  const startSeason  = useMatchStore((s) => s.startSeason);
  const initSeason   = useSeasonStore((s) => s.initSeason);
  const getTotalPoints = useSeasonStore((s) => s.getTotalPoints);
  const getWins      = useSeasonStore((s) => s.getWins);
  const getDraws     = useSeasonStore((s) => s.getDraws);
  const getLosses    = useSeasonStore((s) => s.getLosses);

  const totalPoints = getTotalPoints();
  const wins   = getWins();
  const draws  = getDraws();
  const losses = getLosses();

  /**
   * Generate a new season from the opponents pool and navigate to SEASON hub.
   */
  function handleNewSeason(): void {
    initSeason(opponentsData as Opponent[]);
    startSeason();
  }

  /** Colour class for the final points based on performance (21 max) */
  const pointsColour =
    totalPoints >= 15 ? 'text-green-400' :
    totalPoints >= 9  ? 'text-yellow-400' :
                        'text-red-400';

  return (
    <div
      data-testid="season-complete-screen"
      className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex flex-col items-center justify-center px-6 gap-8"
    >
      {/* Title banner */}
      <div className="text-4xl font-black text-[#FFE600] text-center">
        {t('season_complete.title')}
      </div>

      {/* Points card */}
      <div className="w-full max-w-sm rounded-2xl border-2 border-[#FFE600]/30 bg-[#1A1A1A] px-8 py-8 flex flex-col items-center gap-6">
        {/* Final points */}
        <div className="flex flex-col items-center gap-1">
          <div className="text-xs font-bold uppercase tracking-widest text-[#F5F0E8]/40">
            {t('season_complete.points')}
          </div>
          <div
            data-testid="season-complete-points"
            className={['text-7xl font-black tabular-nums', pointsColour].join(' ')}
          >
            {totalPoints}
          </div>
          <div className="text-sm text-[#F5F0E8]/30">/ 21</div>
        </div>

        {/* W/D/L breakdown */}
        <div className="w-full border-t border-[#F5F0E8]/10 pt-4">
          <div className="text-xs font-bold uppercase tracking-widest text-[#F5F0E8]/40 text-center mb-3">
            {t('season_complete.record')}
          </div>
          <div
            data-testid="season-complete-record"
            className="flex justify-around text-center"
          >
            <div>
              <div className="text-3xl font-black text-green-400">{wins}</div>
              <div className="text-xs text-[#F5F0E8]/40 uppercase">{t('season.result_win')}</div>
            </div>
            <div>
              <div className="text-3xl font-black text-yellow-400">{draws}</div>
              <div className="text-xs text-[#F5F0E8]/40 uppercase">{t('season.result_draw')}</div>
            </div>
            <div>
              <div className="text-3xl font-black text-red-400">{losses}</div>
              <div className="text-xs text-[#F5F0E8]/40 uppercase">{t('season.result_loss')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* New Season button */}
      <button
        data-testid="season-new-btn"
        onClick={handleNewSeason}
        className="w-full max-w-sm py-4 bg-[#FFE600] text-[#1A1A1A] font-black text-lg uppercase tracking-widest rounded-xl hover:bg-[#FFE600]/90 active:scale-95 transition-all"
      >
        {t('season_complete.new')}
      </button>
    </div>
  );
}
