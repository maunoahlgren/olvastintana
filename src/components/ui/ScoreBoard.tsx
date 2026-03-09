/**
 * @file ScoreBoard.tsx
 * Displays the current match score, half, and duel index.
 *
 * @example
 * <ScoreBoard homeGoals={2} awayGoals={1} half={1} duelIndex={3} />
 */

import { useTranslation } from 'react-i18next';
import { DUELS_PER_HALF } from '../../engine/match';

interface ScoreBoardProps {
  /** Goals scored by the home side */
  homeGoals: number;
  /** Goals scored by the away side */
  awayGoals: number;
  /** Current half (1 or 2) */
  half: 1 | 2;
  /** Current zero-based duel index within the half */
  duelIndex: number;
}

/**
 * ScoreBoard — compact match score display.
 *
 * @param props - ScoreBoardProps
 * @returns A styled score panel
 */
export default function ScoreBoard({
  homeGoals,
  awayGoals,
  half,
  duelIndex,
}: ScoreBoardProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <div
      data-testid="scoreboard"
      className="flex flex-col items-center gap-1 px-6 py-3 rounded-xl bg-[#1A1A1A] border border-[#FFE600]/30"
    >
      {/* Score row */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-bold uppercase text-[#F5F0E8]/60">
          {t('result.home_team')}
        </span>
        <span
          data-testid="score-display"
          className="text-4xl font-black tabular-nums text-[#FFE600]"
        >
          {homeGoals} – {awayGoals}
        </span>
        <span className="text-sm font-bold uppercase text-[#F5F0E8]/60">
          {t('result.away_team')}
        </span>
      </div>

      {/* Half + duel info */}
      <div
        data-testid="duel-info"
        className="text-xs text-[#F5F0E8]/50 tracking-widest uppercase"
      >
        {t('duel.half')} {half} · {t('duel.duel_label')} {duelIndex + 1} {t('duel.of')}{' '}
        {DUELS_PER_HALF}
      </div>
    </div>
  );
}
