/**
 * @file TitleScreen.tsx
 * The opening title screen of the game.
 *
 * Shows the club name, tagline, anniversary badge, and the "Start Season" button.
 * On click, generates a 7-match season from opponents.json and transitions
 * to the SeasonScreen (SEASON phase).
 *
 * AI difficulty is no longer set manually here — it is driven automatically by
 * the opponent's tier (hard/normal/easy) when each match kicks off in PreMatchScreen.
 */

import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../store/matchStore';
import { useSeasonStore } from '../../store/seasonStore';
import LanguageToggle from '../ui/LanguageToggle';
import opponentsData from '../../data/opponents.json';
import type { Opponent } from '../../engine/season';

/**
 * TitleScreen — game entry point.
 *
 * Generates a fresh season on "Start Season" click and navigates to SEASON phase.
 *
 * @returns The title screen element
 */
export default function TitleScreen(): JSX.Element {
  const { t } = useTranslation();
  const startSeason = useMatchStore((s) => s.startSeason);
  const initSeason  = useSeasonStore((s) => s.initSeason);

  /**
   * Generate a fresh season from the opponents pool and navigate to SEASON hub.
   */
  function handleStart(): void {
    initSeason(opponentsData as Opponent[]);
    startSeason();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#1A1A1A] text-[#F5F0E8]">
      <header className="w-full flex justify-end p-4 absolute top-0">
        <LanguageToggle />
      </header>

      <main className="flex flex-col items-center gap-6 text-center px-6 w-full max-w-sm">
        {/* Club title */}
        <div className="text-7xl font-black tracking-tight leading-none text-[#FFE600]">
          {t('app.title')}
        </div>

        {/* Tagline */}
        <div className="text-lg font-semibold tracking-widest uppercase text-[#F5F0E8]/60">
          {t('app.tagline')}
        </div>

        {/* Anniversary badge */}
        <div className="text-sm text-[#F5F0E8]/40 tracking-widest">
          2005 – 2025
        </div>

        {/* Start Season button */}
        <button
          data-testid="start-solo-btn"
          onClick={handleStart}
          className="w-full py-4 bg-[#FFE600] text-[#1A1A1A] font-black text-lg uppercase tracking-widest rounded-xl hover:bg-[#FFE600]/90 active:scale-95 transition-all mt-2"
        >
          {t('title.start_solo')}
        </button>
      </main>
    </div>
  );
}
