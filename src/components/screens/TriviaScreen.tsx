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
 *    - Wrong   → triviaWrong() → advance to LINEUP
 *
 * In Phase 1, trivia boost always applies to the home side.
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../store/matchStore';
import triviaRaw from '../../data/trivia.json';

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

/**
 * TriviaScreen — pre-match trivia question.
 *
 * @returns The trivia screen element
 */
export default function TriviaScreen(): JSX.Element {
  const { t } = useTranslation();
  const triviaCorrect = useMatchStore((s) => s.triviaCorrect);
  const triviaWrong = useMatchStore((s) => s.triviaWrong);

  const [revealed, setRevealed] = useState(false);

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#1A1A1A] text-[#F5F0E8] px-6 gap-8">
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
      ) : (
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
              onClick={triviaWrong}
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
