/**
 * @file PreMatchScreen.tsx
 * Pre-match screen — shown just before a match kicks off.
 *
 * Displays:
 * - Home (Olvastin Tana) vs Away (opponent name)
 * - Tier badge: 🔴 Hard / 🟡 Normal / 🟢 Easy
 * - Opponent historical record (seasons, titles, W/D/L, goals, ppg)
 * - Flavour line based on tier
 * - "Kick Off" button → sets AI difficulty from tier, calls beginSoloMatch()
 *
 * The tier maps directly to AI difficulty (no manual selector needed):
 *   hard → Hard AI | normal → Normal AI | easy → Easy AI
 *
 * i18n keys: prematch.vs, prematch.tier_hard/normal/easy,
 *   prematch.warning_hard/normal/easy, prematch.kickoff,
 *   prematch.record_label, prematch.seasons_label, prematch.titles_label,
 *   prematch.goals_label, prematch.ppg_label
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../store/matchStore';
import { useSeasonStore } from '../../store/seasonStore';
import { useSessionStore, type AiDifficulty } from '../../store/sessionStore';
import QuitMatchButton from '../ui/QuitMatchButton';
import type { OpponentTier } from '../../engine/season';
import flavourData from '../../data/flavour_texts.json';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Shape of a single prematch flavour line from flavour_texts.json */
interface FlavourLine {
  id: string;
  text_fi: string;
  text_en: string;
}

const flavourLines = (flavourData as { prematch_flavour: FlavourLine[] }).prematch_flavour;

/** Maps opponent tier to the i18n key for the tier badge label */
const TIER_LABEL_KEY: Record<OpponentTier, string> = {
  hard:   'prematch.tier_hard',
  normal: 'prematch.tier_normal',
  easy:   'prematch.tier_easy',
};

/** Flavour text colour per tier */
const FLAVOUR_COLOUR: Record<OpponentTier, string> = {
  hard:   'text-red-400',
  normal: 'text-yellow-400',
  easy:   'text-green-400',
};

// ---------------------------------------------------------------------------
// PreMatchScreen
// ---------------------------------------------------------------------------

/**
 * PreMatchScreen — pre-match briefing before each fixture.
 *
 * Sets AI difficulty from the opponent's tier and calls beginSoloMatch()
 * when the player taps "Kick Off".
 *
 * @returns The pre-match screen element
 */
export default function PreMatchScreen(): JSX.Element {
  const { t, i18n } = useTranslation();
  const beginSoloMatch  = useMatchStore((s) => s.beginSoloMatch);
  const setAiDifficulty = useSessionStore((s) => s.setAiDifficulty);
  const getCurrentFixture = useSeasonStore((s) => s.getCurrentFixture);

  const fixture = getCurrentFixture();

  /** Pick a random flavour line — stable for the lifetime of this screen mount */
  const flavourLine = useMemo(() => {
    const idx = Math.floor(Math.random() * flavourLines.length);
    return flavourLines[idx] ?? flavourLines[0];
  }, []);

  /**
   * Kick off the match:
   *  1. Map opponent tier → AI difficulty and store it in sessionStore
   *  2. Call beginSoloMatch() which flips the coin and sets phase to TRIVIA
   */
  function handleKickOff(): void {
    if (!fixture) return;
    const difficultyMap: Record<OpponentTier, AiDifficulty> = {
      hard:   'hard',
      normal: 'normal',
      easy:   'easy',
    };
    setAiDifficulty(difficultyMap[fixture.opponent.tier]);
    beginSoloMatch();
  }

  // Guard: no fixture available — can happen if sessionStore is empty after
  // browser-back. The restore hook now redirects to SEASON in this case, so
  // this guard is a final safety net only.
  if (!fixture) {
    return (
      <div
        data-testid="prematch-screen"
        className="relative min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex items-center justify-center"
      >
        <div className="absolute top-4 left-4">
          <QuitMatchButton />
        </div>
        <span className="text-[#F5F0E8]/40">Loading...</span>
      </div>
    );
  }

  const { opponent } = fixture;
  const flavourText =
    i18n.language === 'fi' ? flavourLine.text_fi : flavourLine.text_en;

  return (
    <div
      data-testid="prematch-screen"
      className="relative min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex flex-col items-center justify-center px-6 gap-8"
    >
      {/* Quit button */}
      <div className="absolute top-4 left-4">
        <QuitMatchButton />
      </div>

      {/* Match header: Home vs Away */}
      <div className="w-full max-w-sm flex flex-col items-center gap-2">
        <div className="flex items-center gap-4 text-center">
          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-widest text-[#F5F0E8]/40">
              {t('result.home_team')}
            </div>
            <div className="text-xl font-black text-[#FFE600]">Olvastin Tana FC</div>
          </div>
          <div
            data-testid="prematch-vs"
            className="text-2xl font-black text-[#F5F0E8]/40"
          >
            {t('prematch.vs')}
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-widest text-[#F5F0E8]/40">
              {t('result.away_team')}
            </div>
            <div
              data-testid="prematch-opponent-name"
              className="text-xl font-black text-[#F5F0E8]"
            >
              {opponent.name}
            </div>
          </div>
        </div>
      </div>

      {/* Tier badge */}
      <div
        data-testid="prematch-tier-badge"
        className="px-4 py-2 rounded-full border-2 border-[#F5F0E8]/20 text-sm font-bold tracking-widest"
      >
        {t(TIER_LABEL_KEY[opponent.tier])}
      </div>

      {/* Opponent record card */}
      <div className="w-full max-w-sm rounded-2xl border border-[#F5F0E8]/10 bg-[#F5F0E8]/3 px-6 py-5 flex flex-col gap-4">
        <div className="text-xs font-bold uppercase tracking-widest text-[#F5F0E8]/40">
          {t('prematch.record_label')}
        </div>

        {/* Key stats row */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-black text-[#F5F0E8]">{opponent.seasons}</div>
            <div className="text-xs text-[#F5F0E8]/40 uppercase tracking-widest">
              {t('prematch.seasons_label')}
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-[#FFE600]">{opponent.titles}</div>
            <div className="text-xs text-[#F5F0E8]/40 uppercase tracking-widest">
              {t('prematch.titles_label')}
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-[#F5F0E8]">{opponent.ppg.toFixed(2)}</div>
            <div className="text-xs text-[#F5F0E8]/40 uppercase tracking-widest">
              {t('prematch.ppg_label')}
            </div>
          </div>
        </div>

        {/* W/D/L row */}
        <div
          data-testid="prematch-record"
          className="flex justify-center gap-6 text-center"
        >
          <div>
            <div className="text-xl font-black text-green-400">{opponent.record.w}</div>
            <div className="text-xs text-[#F5F0E8]/40 uppercase">{t('season.result_win')}</div>
          </div>
          <div>
            <div className="text-xl font-black text-yellow-400">{opponent.record.d}</div>
            <div className="text-xs text-[#F5F0E8]/40 uppercase">{t('season.result_draw')}</div>
          </div>
          <div>
            <div className="text-xl font-black text-red-400">{opponent.record.l}</div>
            <div className="text-xs text-[#F5F0E8]/40 uppercase">{t('season.result_loss')}</div>
          </div>
        </div>

        {/* Goals */}
        <div className="text-center text-sm text-[#F5F0E8]/40">
          {t('prematch.goals_label')}: {opponent.goals.for}–{opponent.goals.against}
        </div>
      </div>

      {/* Flavour line — random pick from flavour_texts.json, language-aware */}
      <div
        data-testid="prematch-flavour"
        className={['text-sm italic font-semibold text-center', FLAVOUR_COLOUR[opponent.tier]].join(' ')}
      >
        {flavourText}
      </div>

      {/* Kick Off button */}
      <button
        data-testid="prematch-kickoff-btn"
        onClick={handleKickOff}
        className="w-full max-w-sm py-4 bg-[#FFE600] text-[#1A1A1A] font-black text-lg uppercase tracking-widest rounded-xl hover:bg-[#FFE600]/90 active:scale-95 transition-all"
      >
        {t('prematch.kickoff')}
      </button>
    </div>
  );
}
