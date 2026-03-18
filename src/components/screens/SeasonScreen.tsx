/**
 * @file SeasonScreen.tsx
 * Season hub — shown between matches.
 *
 * Displays:
 * - Current season fixture list (7 matches) with tier badge and result/upcoming
 * - Cumulative season points tally
 * - "Play Next Match" button → navigates to PreMatchScreen
 *
 * i18n keys used: season.title, season.fixtures, season.points_label,
 *   season.play_next, season.match_number, season.upcoming,
 *   season.tier_hard, season.tier_normal, season.tier_easy,
 *   season.result_win, season.result_draw, season.result_loss
 */

import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../store/matchStore';
import { useSeasonStore } from '../../store/seasonStore';
import QuitMatchButton from '../ui/QuitMatchButton';
import type { Fixture } from '../../engine/season';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** i18n key suffix for a tier badge */
const TIER_KEY: Record<string, string> = {
  hard:   'season.tier_hard',
  normal: 'season.tier_normal',
  easy:   'season.tier_easy',
};

/** Emoji for a tier */
const TIER_EMOJI: Record<string, string> = {
  hard:   '🔴',
  normal: '🟡',
  easy:   '🟢',
};

// ---------------------------------------------------------------------------
// Sub-component: FixtureRow
// ---------------------------------------------------------------------------

interface FixtureRowProps {
  fixture: Fixture;
  isNext: boolean;
}

/**
 * Single fixture row in the season fixture list.
 *
 * @param fixture - The fixture to display
 * @param isNext - True if this is the next match to be played
 * @returns Fixture row element
 */
function FixtureRow({ fixture, isNext }: FixtureRowProps): JSX.Element {
  const { t } = useTranslation();
  const { opponent, result, matchNumber } = fixture;

  /**
   * Result badge: shows W/D/L with colour and the score.
   * Returns null when the fixture hasn't been played.
   */
  function ResultBadge(): JSX.Element | null {
    if (!result) return null;
    const isWin  = result.homeGoals > result.awayGoals;
    const isDraw = result.homeGoals === result.awayGoals;
    const label  = isWin ? t('season.result_win') : isDraw ? t('season.result_draw') : t('season.result_loss');
    const colour = isWin  ? 'text-green-400'
                 : isDraw ? 'text-yellow-400'
                 :          'text-red-400';
    return (
      <div className="flex items-center gap-2 text-sm font-bold">
        <span className={colour}>{label}</span>
        <span className="text-[#F5F0E8]/50 tabular-nums">
          {result.homeGoals}–{result.awayGoals}
        </span>
        <span className="text-[#F5F0E8]/40 text-xs">+{result.points}pts</span>
      </div>
    );
  }

  const rowBorder = isNext
    ? 'border-[#FFE600]/60 bg-[#FFE600]/5'
    : 'border-[#F5F0E8]/10';

  return (
    <div
      data-testid={`season-fixture-${matchNumber}`}
      className={[
        'flex items-center justify-between px-4 py-3 rounded-xl border transition-all',
        rowBorder,
      ].join(' ')}
    >
      {/* Left: match number + opponent */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-[#F5F0E8]/30 font-bold w-5 text-right">
          {matchNumber}
        </span>
        <span className="text-lg">{TIER_EMOJI[opponent.tier]}</span>
        <div>
          <div className="font-bold text-[#F5F0E8] text-sm">{opponent.name}</div>
          <div className="text-xs text-[#F5F0E8]/40">{t(TIER_KEY[opponent.tier])}</div>
        </div>
      </div>

      {/* Right: result or "upcoming" */}
      <div>
        {result ? (
          <ResultBadge />
        ) : (
          <span
            data-testid={`season-fixture-${matchNumber}-upcoming`}
            className={[
              'text-xs font-bold uppercase tracking-widest',
              isNext ? 'text-[#FFE600]' : 'text-[#F5F0E8]/30',
            ].join(' ')}
          >
            {t('season.upcoming')}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SeasonScreen
// ---------------------------------------------------------------------------

/**
 * SeasonScreen — season hub displayed between matches.
 *
 * @returns The season screen element
 */
export default function SeasonScreen(): JSX.Element {
  const { t } = useTranslation();
  const goToPreMatch   = useMatchStore((s) => s.goToPreMatch);
  const fixtures       = useSeasonStore((s) => s.fixtures);
  const currentIndex   = useSeasonStore((s) => s.currentFixtureIndex);
  const getTotalPoints = useSeasonStore((s) => s.getTotalPoints);

  const totalPoints = getTotalPoints();
  const allPlayed   = fixtures.length > 0 && fixtures.every((f) => f.result !== null);

  return (
    <div
      data-testid="season-screen"
      className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex flex-col items-center px-4 py-8 gap-6"
    >
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <QuitMatchButton />
          <h1 className="text-2xl font-black tracking-tight text-[#FFE600]">
            {t('season.title')}
          </h1>
        </div>
        <div
          data-testid="season-points-total"
          className="flex flex-col items-end"
        >
          <span className="text-3xl font-black tabular-nums text-[#FFE600]">
            {totalPoints}
          </span>
          <span className="text-xs text-[#F5F0E8]/40 uppercase tracking-widest">
            {t('season.points_label')}
          </span>
        </div>
      </div>

      {/* Fixture list */}
      <div className="w-full max-w-md flex flex-col gap-2">
        <div className="text-xs font-bold uppercase tracking-widest text-[#F5F0E8]/40 mb-1">
          {t('season.fixtures')}
        </div>
        {fixtures.map((fixture, i) => (
          <FixtureRow
            key={fixture.opponent.id}
            fixture={fixture}
            isNext={i === currentIndex && !allPlayed}
          />
        ))}
      </div>

      {/* Play Next Match button — hidden when all fixtures played */}
      {!allPlayed && (
        <button
          data-testid="season-play-next-btn"
          onClick={goToPreMatch}
          className="w-full max-w-md py-4 bg-[#FFE600] text-[#1A1A1A] font-black text-lg uppercase tracking-widest rounded-xl hover:bg-[#FFE600]/90 active:scale-95 transition-all"
        >
          {t('season.play_next')}
        </button>
      )}
    </div>
  );
}
