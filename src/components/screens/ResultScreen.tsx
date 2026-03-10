/**
 * @file ResultScreen.tsx
 * Full-time result screen.
 *
 * Displays final score, win/draw/loss message, and season points earned
 * for this match.
 *
 * On "Continue" click:
 *   1. Record the result in seasonStore (points + advance fixture index)
 *   2. If all 7 fixtures now complete → SEASON_COMPLETE phase
 *   3. Otherwise → return to SEASON hub
 *
 * Also shows the current opponent name from seasonStore when available.
 */

import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../store/matchStore';
import { useSeasonStore } from '../../store/seasonStore';
import { matchPoints } from '../../engine/match';

/**
 * ResultScreen — full-time summary.
 *
 * @returns The result screen element
 */
export default function ResultScreen(): JSX.Element {
  const { t } = useTranslation();
  const homeGoals         = useMatchStore((s) => s.homeGoals);
  const awayGoals         = useMatchStore((s) => s.awayGoals);
  const returnToSeason    = useMatchStore((s) => s.returnToSeason);
  const completeSeason    = useMatchStore((s) => s.completeSeason);
  const recordResult      = useSeasonStore((s) => s.recordFixtureResult);
  const isSeasonComplete  = useSeasonStore((s) => s.isSeasonComplete);
  const getCurrentFixture = useSeasonStore((s) => s.getCurrentFixture);

  const points = matchPoints(homeGoals, awayGoals);

  /** The opponent we just beat / drew / lost to */
  const currentFixture = getCurrentFixture();
  const opponentName   = currentFixture?.opponent.name ?? null;

  /** Determine result label from home side's perspective */
  const resultKey =
    homeGoals > awayGoals ? 'result.win' :
    homeGoals < awayGoals ? 'result.loss' :
                            'result.draw';

  /**
   * Record the match result then navigate:
   * - SEASON_COMPLETE if all 7 fixtures are now done
   * - SEASON hub otherwise
   *
   * Zustand set() is synchronous, so isSeasonComplete() reads the updated
   * state immediately after recordResult() returns.
   */
  function handleContinue(): void {
    recordResult(homeGoals, awayGoals);
    if (isSeasonComplete()) {
      completeSeason();
    } else {
      returnToSeason();
    }
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex flex-col items-center justify-center px-6 gap-8">
      {/* Result banner */}
      <div
        data-testid="result-banner"
        className="text-5xl font-black text-[#FFE600] text-center"
      >
        {t(resultKey)}
      </div>

      {/* Final score card */}
      <div className="flex flex-col items-center gap-3 px-8 py-6 rounded-2xl border-2 border-[#FFE600]/30 bg-[#1A1A1A]">
        {/* Team names */}
        <div className="flex items-center gap-4 w-full justify-around text-xs font-bold uppercase tracking-widest text-[#F5F0E8]/40">
          <span>{t('result.home_team')}</span>
          <span>{t('result.away_team')}{opponentName ? ` — ${opponentName}` : ''}</span>
        </div>

        <div className="text-xs font-bold uppercase tracking-widest text-[#F5F0E8]/40">
          {t('result.final_score')}
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <div
              data-testid="result-home-goals"
              className="text-6xl font-black tabular-nums text-[#FFE600]"
            >
              {homeGoals}
            </div>
          </div>
          <div className="text-3xl font-black text-[#F5F0E8]/30">–</div>
          <div className="text-center">
            <div
              data-testid="result-away-goals"
              className="text-6xl font-black tabular-nums text-[#FFE600]"
            >
              {awayGoals}
            </div>
          </div>
        </div>

        {/* Season points earned this match */}
        <div className="flex gap-8 mt-2">
          <div className="text-center">
            <div className="text-xs uppercase tracking-widest text-[#F5F0E8]/40">
              {t('result.home_team')}
            </div>
            <div
              data-testid="result-home-points"
              className="text-2xl font-black text-[#F5F0E8]"
            >
              +{points.home}
            </div>
            <div className="text-xs text-[#F5F0E8]/40">{t('result.points_earned')}</div>
          </div>
          <div className="text-center">
            <div className="text-xs uppercase tracking-widest text-[#F5F0E8]/40">
              {t('result.away_team')}
            </div>
            <div
              data-testid="result-away-points"
              className="text-2xl font-black text-[#F5F0E8]"
            >
              +{points.away}
            </div>
            <div className="text-xs text-[#F5F0E8]/40">{t('result.points_earned')}</div>
          </div>
        </div>
      </div>

      {/* Continue to Season button */}
      <button
        data-testid="continue-to-season-btn"
        onClick={handleContinue}
        className="px-8 py-4 bg-[#FFE600] text-[#1A1A1A] font-black text-lg uppercase tracking-widest rounded-xl hover:bg-[#FFE600]/90 active:scale-95 transition-all"
      >
        {t('actions.continue')}
      </button>
    </div>
  );
}
