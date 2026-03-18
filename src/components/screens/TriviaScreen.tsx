/**
 * @file TriviaScreen.tsx
 * Pre-match trivia screen — a random club history question is asked.
 *
 * Flow:
 * 1. Question is displayed in Finnish by default (toggle to English available)
 * 2. Players discuss and one side answers
 * 3. "Reveal Answer" button shows the correct answer
 * 4. "Correct ✓" or "Wrong ✗" buttons self-report the result
 *    - Correct → triviaCorrect() → triviaBoostActive, advance to LINEUP
 *    - Wrong   → show penalty picker → player selects ONE player for -1 penalty
 *                → confirm → triviaPenaltySelected() + triviaWrong() → advance to LINEUP
 *
 * In Phase 1, trivia boost always applies to the home side.
 * The trivia penalty always applies to the home side (home manager answers).
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../store/matchStore';
import triviaRaw from '../../data/trivia.json';
import playersData from '../../data/players.json';
import type { Player } from '../../store/squadStore';
import QuitMatchButton from '../ui/QuitMatchButton';

/** Shape of a single trivia question as stored in trivia.json */
interface TriviaQuestion {
  id: string;
  sport: string;
  era: 'early' | 'middle' | 'recent';
  question: { en: string; fi: string };
  answers: { en: string[]; fi: string[] };
  correctIndex: number;
}

const questions = triviaRaw as TriviaQuestion[];

/** All outfield players (MF / FW) — penalty picker candidates */
const ALL_PLAYERS = playersData as Player[];
const OUTFIELD_PLAYERS = ALL_PLAYERS.filter((p) =>
  p.position.some((pos) => pos === 'MF' || pos === 'FW'),
);

/**
 * TriviaScreen — pre-match trivia question.
 *
 * @returns The trivia screen element
 */
export default function TriviaScreen(): JSX.Element {
  const { t } = useTranslation();
  const triviaCorrect = useMatchStore((s) => s.triviaCorrect);
  const triviaWrong = useMatchStore((s) => s.triviaWrong);
  const triviaPenaltySelected = useMatchStore((s) => s.triviaPenaltySelected);

  const [revealed, setRevealed] = useState(false);
  /** When true, the correct/wrong buttons are replaced by the penalty picker */
  const [showPenaltyPicker, setShowPenaltyPicker] = useState(false);
  /** ID of the player the home manager has chosen to receive the -1 penalty */
  const [penaltyPlayerId, setPenaltyPlayerId] = useState<string | null>(null);

  /**
   * Language shown on the question card.
   * Finnish is the default; the player can toggle to English.
   */
  const [showLang, setShowLang] = useState<'fi' | 'en'>('fi');

  /** Pick a random question — stable for the lifetime of this screen mount */
  const question = useMemo(() => {
    const idx = Math.floor(Math.random() * questions.length);
    return questions[idx];
  }, []);

  const questionText =
    showLang === 'fi' ? question.question.fi : question.question.en;

  const correctAnswer =
    showLang === 'fi'
      ? question.answers.fi[question.correctIndex]
      : question.answers.en[question.correctIndex];

  /**
   * Confirm the penalty selection: store the chosen player ID then advance to LINEUP.
   */
  function confirmPenalty() {
    if (!penaltyPlayerId) return;
    triviaPenaltySelected(penaltyPlayerId);
    triviaWrong();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#1A1A1A] text-[#F5F0E8] px-6 gap-8">
      {/* Top-left quit button */}
      <div className="absolute top-4 left-4">
        <QuitMatchButton />
      </div>

      {/* Screen header */}
      <div className="text-xs font-bold uppercase tracking-widest text-[#F5F0E8]/40">
        {t('screens.trivia')}
      </div>

      {/* Question card */}
      <div
        data-testid="trivia-question-card"
        className="w-full max-w-lg rounded-2xl border-2 border-[#FFE600]/40 bg-[#1A1A1A] p-8 flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-[#F5F0E8]/40">
            {t('trivia.question_label')}
          </div>
          {/* Language toggle — Finnish default, toggle to English */}
          <button
            data-testid="trivia-lang-toggle"
            onClick={() => setShowLang((l) => (l === 'fi' ? 'en' : 'fi'))}
            className="px-3 py-1 text-xs font-bold border border-[#F5F0E8]/20 rounded-full hover:border-[#FFE600]/60 text-[#F5F0E8]/60 hover:text-[#FFE600] transition-all"
          >
            {showLang === 'fi' ? t('trivia.lang_en') : t('trivia.lang_fi')}
          </button>
        </div>
        <p
          data-testid="trivia-question-text"
          className="text-xl font-bold text-[#F5F0E8] leading-snug"
        >
          {questionText}
        </p>
      </div>

      {/* Answer reveal section */}
      {!revealed ? (
        <button
          data-testid="reveal-answer-btn"
          onClick={() => setRevealed(true)}
          className="px-8 py-3 border-2 border-[#F5F0E8]/40 text-[#F5F0E8]/80 font-bold uppercase tracking-widest rounded-xl hover:border-[#FFE600] hover:text-[#FFE600] transition-all"
        >
          {t('trivia.reveal_answer')}
        </button>
      ) : showPenaltyPicker ? (
        /* ── Penalty picker (wrong answer) ─────────────────────────────── */
        <div
          data-testid="trivia-penalty-picker"
          className="w-full max-w-lg flex flex-col gap-5"
        >
          <div className="rounded-xl border border-red-500/40 bg-red-900/20 p-4 text-sm text-red-400">
            {t('lineup.penalty_info')}
          </div>

          <div className="text-xs font-bold uppercase tracking-widest text-[#F5F0E8]/50">
            {t('lineup.apply_penalty')}
          </div>

          {/* Player selection grid — single-select only */}
          <div
            data-testid="penalty-player-grid"
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          >
            {OUTFIELD_PLAYERS.map((player) => {
              const isSelected = penaltyPlayerId === player.id;
              const isDisabled = penaltyPlayerId !== null && !isSelected;
              return (
                <button
                  key={player.id}
                  data-testid={`penalty-pick-${player.id}`}
                  onClick={() =>
                    setPenaltyPlayerId(isSelected ? null : player.id)
                  }
                  disabled={isDisabled}
                  className={[
                    'py-3 px-2 rounded-lg font-bold text-sm border transition-all text-left',
                    isSelected
                      ? 'bg-red-700 border-red-600 text-white'
                      : isDisabled
                        ? 'opacity-30 border-[#555] text-[#F5F0E8]/30 bg-[#2A2A2A] cursor-not-allowed'
                        : 'bg-[#2A2A2A] border-[#555] text-[#F5F0E8] hover:border-red-400 hover:text-red-300',
                  ].join(' ')}
                >
                  {player.name}
                </button>
              );
            })}
          </div>

          {/* Confirm button — appears only once a player is chosen */}
          {penaltyPlayerId && (
            <button
              data-testid="penalty-confirm-btn"
              onClick={confirmPenalty}
              className="w-full py-4 bg-[#FFE600] text-[#1A1A1A] font-black uppercase tracking-widest rounded-xl hover:bg-[#FFE600]/90 active:scale-95 transition-all"
            >
              {t('trivia.continue_to_lineup')}
            </button>
          )}
        </div>
      ) : (
        /* ── Correct / Wrong buttons ───────────────────────────────────── */
        <div className="flex flex-col items-center gap-6 w-full max-w-lg">
          {/* The answer */}
          <div className="text-center">
            <div className="text-xs uppercase tracking-widest text-[#F5F0E8]/40 mb-1">
              {t('trivia.the_answer_was')}
            </div>
            <div
              data-testid="trivia-answer-text"
              className="text-3xl font-black text-[#FFE600]"
            >
              {correctAnswer}
            </div>
          </div>

          {/* Self-report buttons */}
          <div className="flex gap-4">
            <button
              data-testid="trivia-correct-btn"
              onClick={triviaCorrect}
              className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-widest rounded-xl active:scale-95 transition-all"
            >
              {t('trivia.correct_button')} ✓
            </button>
            <button
              data-testid="trivia-wrong-btn"
              onClick={() => setShowPenaltyPicker(true)}
              className="px-6 py-3 bg-red-700 hover:bg-red-600 text-white font-black uppercase tracking-widest rounded-xl active:scale-95 transition-all"
            >
              {t('trivia.wrong_button')} ✗
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
