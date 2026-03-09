/**
 * @file TitleScreen.tsx
 * The opening title screen of the game.
 *
 * Shows the club name, tagline, and the "Start Solo Match" button.
 * Calls beginSoloMatch() from matchStore to transition to the TRIVIA phase.
 */

import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../store/matchStore';
import LanguageToggle from '../ui/LanguageToggle';

/**
 * TitleScreen — game entry point.
 *
 * @returns The title screen element
 */
export default function TitleScreen(): JSX.Element {
  const { t } = useTranslation();
  const beginSoloMatch = useMatchStore((s) => s.beginSoloMatch);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#1A1A1A] text-[#F5F0E8]">
      <header className="w-full flex justify-end p-4 absolute top-0">
        <LanguageToggle />
      </header>

      <main className="flex flex-col items-center gap-6 text-center px-6">
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

        {/* Start button */}
        <button
          data-testid="start-solo-btn"
          onClick={beginSoloMatch}
          className="mt-4 px-8 py-4 bg-[#FFE600] text-[#1A1A1A] font-black text-lg uppercase tracking-widest rounded-xl hover:bg-[#FFE600]/90 active:scale-95 transition-all"
        >
          {t('title.start_solo')}
        </button>
      </main>
    </div>
  );
}
