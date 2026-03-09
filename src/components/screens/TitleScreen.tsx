/**
 * @file TitleScreen.tsx
 * The opening title screen of the game.
 *
 * Shows the club name, tagline, difficulty selector, and the "Start Solo Match" button.
 * Player selects a difficulty (Easy / Normal / Hard) before starting.
 * The selection is written to sessionStore and then beginSoloMatch() transitions to TRIVIA.
 *
 * Default difficulty: Normal.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../store/matchStore';
import { useSessionStore, type AiDifficulty } from '../../store/sessionStore';
import LanguageToggle from '../ui/LanguageToggle';

/** Difficulty option metadata for the selector UI */
interface DifficultyOption {
  value: AiDifficulty;
  /** i18n key for the label */
  labelKey: string;
  /** i18n key for the short description */
  descKey: string;
  /** Emoji indicator */
  emoji: string;
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  { value: 'easy',   labelKey: 'difficulty.easy',   descKey: 'difficulty.easy_desc',   emoji: '🟢' },
  { value: 'normal', labelKey: 'difficulty.normal',  descKey: 'difficulty.normal_desc', emoji: '🟡' },
  { value: 'hard',   labelKey: 'difficulty.hard',    descKey: 'difficulty.hard_desc',   emoji: '🔴' },
];

/**
 * TitleScreen — game entry point with difficulty selector.
 *
 * @returns The title screen element
 */
export default function TitleScreen(): JSX.Element {
  const { t } = useTranslation();
  const beginSoloMatch = useMatchStore((s) => s.beginSoloMatch);
  const setAiDifficulty = useSessionStore((s) => s.setAiDifficulty);

  /** Locally tracked difficulty before confirming — default Normal */
  const [selected, setSelected] = useState<AiDifficulty>('normal');

  function handleStart() {
    setAiDifficulty(selected);
    beginSoloMatch();
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

        {/* Difficulty selector */}
        <div className="w-full flex flex-col gap-2 mt-2">
          <div
            data-testid="difficulty-label"
            className="text-xs font-bold uppercase tracking-widest text-[#F5F0E8]/40"
          >
            {t('difficulty.select')}
          </div>
          <div className="flex gap-2 justify-center">
            {DIFFICULTY_OPTIONS.map((opt) => {
              const isSelected = selected === opt.value;
              return (
                <button
                  key={opt.value}
                  data-testid={`difficulty-btn-${opt.value}`}
                  onClick={() => setSelected(opt.value)}
                  aria-pressed={isSelected}
                  className={[
                    'flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all',
                    isSelected
                      ? 'border-[#FFE600] bg-[#FFE600]/10 text-[#FFE600]'
                      : 'border-[#F5F0E8]/10 text-[#F5F0E8]/50 hover:border-[#F5F0E8]/30',
                  ].join(' ')}
                >
                  <span className="text-lg">{opt.emoji}</span>
                  <span className="text-xs font-black uppercase tracking-wider">
                    {t(opt.labelKey)}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Description of currently selected difficulty */}
          <div
            data-testid="difficulty-desc"
            className="text-xs text-[#F5F0E8]/40 italic"
          >
            {t(DIFFICULTY_OPTIONS.find((o) => o.value === selected)!.descKey)}
          </div>
        </div>

        {/* Start button */}
        <button
          data-testid="start-solo-btn"
          onClick={handleStart}
          className="w-full py-4 bg-[#FFE600] text-[#1A1A1A] font-black text-lg uppercase tracking-widest rounded-xl hover:bg-[#FFE600]/90 active:scale-95 transition-all"
        >
          {t('title.start_solo')}
        </button>
      </main>
    </div>
  );
}
