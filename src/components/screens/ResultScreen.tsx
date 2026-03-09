/**
 * @file ResultScreen.tsx
 * Full-time result screen.
 *
 * Displays final score, win/draw/loss message, and season points earned.
 * "Play Again" button resets the match state back to TITLE.
 *
 * Season store persistence (recordResult) is deferred to Phase 2 when
 * manager profiles and IDs are set up.
 */

import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../store/matchStore';
import { matchPoints } from '../../engine/match';

/**
 * ResultScreen — full-time summary.
 *
 * @returns The result screen element
 */
export default function ResultScreen(): JSX.Element {
  const { t } = useTranslation();
  const homeGoals = useMatchStore((s) => s.homeGoals);
  const awayGoals = useMatchStore((s) => s.awayGoals);
  const reset = useMatchStore((s) => s.reset);

  const points = matchPoints(homeGoals, awayGoals);

  /** Determine result label from home side's perspective */
  const resultKey =
    homeGoals > awayGoals ? 'result.win' : homeGoals < awayGoals ? 'result.loss' : 'result.draw';

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
        <div className="text-xs font-bold uppercase tracking-widest text-[#F5F0E8]/40">
          {t('result.final_score')}
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-xs uppercase tracking-widest text-[#F5F0E8]/50">
              {t('result.home_team')}
            </div>
            <div
              data-testid="result-home-goals"
              className="text-6xl font-black tabular-nums text-[#FFE600]"
            >
              {homeGoals}
            </div>
          </div>
          <div className="text-3xl font-black text-[#F5F0E8]/30">–</div>
          <div className="text-center">
            <div className="text-xs uppercase tracking-widest text-[#F5F0E8]/50">
              {t('result.away_team')}
            </div>
            <div
              data-testid="result-away-goals"
              className="text-6xl font-black tabular-nums text-[#FFE600]"
            >
              {awayGoals}
            </div>
          </div>
        </div>

        {/* Season points */}
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

      {/* Play again button */}
      <button
        data-testid="play-again-btn"
        onClick={reset}
        className="px-8 py-4 bg-[#FFE600] text-[#1A1A1A] font-black text-lg uppercase tracking-widest rounded-xl hover:bg-[#FFE600]/90 active:scale-95 transition-all"
      >
        {t('result.play_again')}
      </button>
    </div>
  );
}
