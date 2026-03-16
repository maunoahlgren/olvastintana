/**
 * @file DerbyTriviaScreen.tsx
 * Derby Night trivia screen — shown to all devices.
 *
 * All devices see the trivia question. Players answer on their phones.
 * The first player to answer correctly wins the +1 stat boost for the next duel.
 *
 * Phone view:
 *   - Shows question + 4 answer choices
 *   - Tap to select, then confirm with Correct / Wrong buttons
 *   - After answering: shows waiting message
 *
 * Big screen view:
 *   - Shows question + answer choices (revealed on "Reveal Answer")
 *   - Shows who has answered
 *   - When both answered (or host skips): shows boost winner
 *   - Host can click "Continue to Match" to advance to duel phase
 *
 * Host orchestration:
 *   After both players have answered OR host presses continue → advanceDerbyPhase('duel')
 */

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoomStore } from '../../store/roomStore';
import { useDerbyStore } from '../../store/derbyStore';
import {
  submitTriviaAnswer,
  advanceDerbyPhase,
  type PlayerKey,
} from '../../firebase/derbyMatch';
import { DUELS_PER_HALF } from '../../engine/match';
import triviaData from '../../data/trivia.json';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TriviaQuestion {
  id: string;
  question: { en: string; fi: string };
  answers: { en: string[]; fi: string[] };
  correctIndex: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determine this client's player key based on their room role.
 *
 * @param role - Room role string
 * @returns 'p1' | 'p2' | null
 */
function roleToPlayerKey(role: string | null): PlayerKey | null {
  if (role === 'host') return 'p1';
  if (role === 'player') return 'p2';
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * DerbyTriviaScreen — multiplayer pre-match trivia.
 *
 * Routes to phone or big-screen view based on room role.
 *
 * @returns The trivia screen appropriate for this device's role
 */
export default function DerbyTriviaScreen(): JSX.Element {
  const role = useRoomStore((s) => s.role);
  const triviaIndex = useDerbyStore((s) => s.triviaIndex);
  const roomCode = useRoomStore((s) => s.roomCode);
  const p1Trivia = useDerbyStore((s) => s.p1Trivia);
  const p2Trivia = useDerbyStore((s) => s.p2Trivia);
  const triviaBoost = useDerbyStore((s) => s.triviaBoost);
  const isHost = role === 'host';
  const isSpectator = role === 'spectator';
  const playerKey = roleToPlayerKey(role);

  const questions = triviaData as TriviaQuestion[];
  const question = questions[triviaIndex % questions.length];

  // Host auto-advances when both answered
  const advancedRef = useRef(false);
  useEffect(() => {
    if (!isHost || !roomCode || advancedRef.current) return;
    if (p1Trivia !== null && p2Trivia !== null) {
      advancedRef.current = true;
      advanceDerbyPhase(roomCode, 'duel', {
        p1_card: null,
        p2_card: null,
        p1_card_ready: false,
        p2_card_ready: false,
        result_atk_card: null,
        result_def_card: null,
        result_winner: null,
        result_scored: false,
      }).catch(console.error);
    }
  }, [isHost, roomCode, p1Trivia, p2Trivia]);

  if (!question) return <div />;

  if (isSpectator) {
    return (
      <BigScreenTriviaView
        question={question}
        p1Answered={p1Trivia !== null}
        p2Answered={p2Trivia !== null}
        triviaBoost={triviaBoost}
        roomCode={roomCode ?? ''}
        isHost={false}
      />
    );
  }

  const myAnswered = playerKey === 'p1' ? p1Trivia !== null : p2Trivia !== null;

  if (myAnswered) {
    return (
      <AnsweredView
        p1Answered={p1Trivia !== null}
        p2Answered={p2Trivia !== null}
        triviaBoost={triviaBoost}
        playerKey={playerKey ?? 'p1'}
      />
    );
  }

  return (
    <PhoneTriviaView
      question={question}
      playerKey={playerKey ?? 'p1'}
      roomCode={roomCode ?? ''}
    />
  );
}

// ─── Phone Trivia View ────────────────────────────────────────────────────────

interface PhoneTriviaViewProps {
  question: TriviaQuestion;
  playerKey: PlayerKey;
  roomCode: string;
}

/**
 * Phone view — shows the question and buttons to answer correct/wrong.
 *
 * @param question   - The trivia question object
 * @param playerKey  - This client's player key
 * @param roomCode   - Active room code
 */
function PhoneTriviaView({ question, playerKey, roomCode }: PhoneTriviaViewProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'fi' ? 'fi' : 'en';
  const [revealed, setRevealed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Submit the player's trivia answer to Firebase.
   *
   * @param correct - Whether the answer was correct
   */
  async function handleAnswer(correct: boolean): Promise<void> {
    if (submitting) return;
    setSubmitting(true);
    try {
      await submitTriviaAnswer(roomCode, playerKey, correct);
    } catch (err) {
      console.error('[DerbyTrivia] submitTriviaAnswer failed:', err);
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex flex-col p-4" data-testid="derby-trivia-phone">
      {/* Header */}
      <h1 className="text-lg font-bold text-[#FFE600] mb-1">{t('derby_match.trivia_title')}</h1>
      <p className="text-xs text-[#A0A0A0] mb-4">{t('derby_match.trivia_boost_label')}</p>

      {/* Question */}
      <div className="bg-[#2A2A2A] rounded-lg p-4 mb-4">
        <p className="text-base font-semibold leading-snug">{question.question[lang]}</p>
      </div>

      {/* Answer choices */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {question.answers[lang].map((ans, i) => (
          <div
            key={i}
            className={`p-3 rounded border text-sm text-center ${
              revealed && i === question.correctIndex
                ? 'border-green-500 bg-green-500/20 text-green-300 font-bold'
                : 'border-[#333] bg-[#2A2A2A] text-[#A0A0A0]'
            }`}
            data-testid={`trivia-answer-${i}`}
          >
            {ans}
          </div>
        ))}
      </div>

      {/* Reveal button */}
      {!revealed && (
        <button
          data-testid="reveal-answer-btn"
          onClick={() => setRevealed(true)}
          className="w-full py-3 mb-3 rounded border border-[#FFE600] text-[#FFE600] font-semibold hover:bg-[#FFE600]/10 transition-colors"
        >
          {t('trivia.reveal_answer')}
        </button>
      )}

      {/* Answer buttons */}
      {revealed && (
        <div className="flex gap-3">
          <button
            data-testid="trivia-correct-btn"
            onClick={() => handleAnswer(true)}
            disabled={submitting}
            className="flex-1 py-3 rounded bg-green-600 hover:bg-green-500 text-white font-bold transition-colors disabled:opacity-50"
          >
            {t('derby_match.trivia_correct_btn')}
          </button>
          <button
            data-testid="trivia-wrong-btn"
            onClick={() => handleAnswer(false)}
            disabled={submitting}
            className="flex-1 py-3 rounded bg-red-700 hover:bg-red-600 text-white font-bold transition-colors disabled:opacity-50"
          >
            {t('derby_match.trivia_wrong_btn')}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Answered View ────────────────────────────────────────────────────────────

interface AnsweredViewProps {
  p1Answered: boolean;
  p2Answered: boolean;
  triviaBoost: PlayerKey | null;
  playerKey: PlayerKey;
}

/**
 * Shown on the phone after the player has submitted their answer.
 * Displays waiting status + boost winner if known.
 *
 * @param p1Answered  - Has p1 answered?
 * @param p2Answered  - Has p2 answered?
 * @param triviaBoost - Who won the boost, or null
 * @param playerKey   - This client's player key
 */
function AnsweredView({ p1Answered, p2Answered, triviaBoost, playerKey }: AnsweredViewProps): JSX.Element {
  const { t } = useTranslation();

  const boostLabel = triviaBoost
    ? t('derby_match.trivia_boost_winner', {
        player: triviaBoost === 'p1' ? t('derby_match.p1_label') : t('derby_match.p2_label'),
      })
    : null;

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex flex-col items-center justify-center p-6 gap-6" data-testid="derby-trivia-answered">
      <div className="text-4xl">🎯</div>
      <p className="text-center text-[#A0A0A0]">{t('derby_match.trivia_already_answered')}</p>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        <StatusRow label={t('derby_match.home_team')} done={p1Answered} />
        <StatusRow label={t('derby_match.away_team')} done={p2Answered} />
      </div>

      {boostLabel && (
        <div className="bg-[#FFE600]/10 border border-[#FFE600] rounded px-4 py-2 text-[#FFE600] text-center font-semibold">
          {boostLabel}
        </div>
      )}

      {!triviaBoost && p1Answered && p2Answered && (
        <p className="text-[#A0A0A0] text-sm">{t('derby_match.trivia_no_boost')}</p>
      )}
    </div>
  );
}

// ─── Big Screen View ──────────────────────────────────────────────────────────

interface BigScreenTriviaViewProps {
  question: TriviaQuestion;
  p1Answered: boolean;
  p2Answered: boolean;
  triviaBoost: PlayerKey | null;
  roomCode: string;
  isHost: boolean;
}

/**
 * Big screen trivia view — shows question, answer status, and boost winner.
 * Host can manually advance to the duel phase.
 *
 * @param question   - The trivia question
 * @param p1Answered - Has p1 answered?
 * @param p2Answered - Has p2 answered?
 * @param triviaBoost - Boost winner or null
 * @param roomCode   - Room code for Firebase writes
 * @param isHost     - Whether this device is the host (gets continue button)
 */
function BigScreenTriviaView({
  question,
  p1Answered,
  p2Answered,
  triviaBoost,
  roomCode,
  isHost,
}: BigScreenTriviaViewProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'fi' ? 'fi' : 'en';
  const [revealed, setRevealed] = useState(false);

  async function handleContinue(): Promise<void> {
    await advanceDerbyPhase(roomCode, 'duel', {
      p1_card: null,
      p2_card: null,
      p1_card_ready: false,
      p2_card_ready: false,
      result_atk_card: null,
      result_def_card: null,
      result_winner: null,
      result_scored: false,
    });
  }

  const boostLabel = triviaBoost
    ? t('derby_match.trivia_boost_winner', {
        player: triviaBoost === 'p1' ? t('derby_match.p1_label') : t('derby_match.p2_label'),
      })
    : t('derby_match.trivia_no_boost');

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex flex-col p-8" data-testid="derby-trivia-bigscreen">
      <h1 className="text-2xl font-bold text-[#FFE600] mb-2">{t('derby_match.trivia_title')}</h1>
      <p className="text-sm text-[#A0A0A0] mb-6">{t('derby_match.trivia_boost_label')}</p>

      {/* Question */}
      <div className="bg-[#2A2A2A] rounded-xl p-6 mb-6">
        <p className="text-xl font-semibold">{question.question[lang]}</p>
      </div>

      {/* Answer grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {question.answers[lang].map((ans, i) => (
          <div
            key={i}
            className={`p-4 rounded-lg border text-center ${
              revealed && i === question.correctIndex
                ? 'border-green-500 bg-green-500/20 text-green-300 font-bold text-lg'
                : 'border-[#333] bg-[#2A2A2A] text-[#A0A0A0]'
            }`}
            data-testid={`trivia-answer-big-${i}`}
          >
            {ans}
          </div>
        ))}
      </div>

      {/* Status */}
      <div className="flex gap-6 mb-6">
        <StatusRow label={t('derby_match.trivia_p1_answered')} done={p1Answered} />
        <StatusRow label={t('derby_match.trivia_p2_answered')} done={p2Answered} />
      </div>

      {/* Boost result */}
      {(triviaBoost || (p1Answered && p2Answered)) && (
        <div className="bg-[#FFE600]/10 border border-[#FFE600] rounded px-4 py-3 text-[#FFE600] font-semibold mb-4 text-center">
          {boostLabel}
        </div>
      )}

      {/* Reveal button */}
      {!revealed && (
        <button
          data-testid="reveal-answer-big-btn"
          onClick={() => setRevealed(true)}
          className="w-full py-3 mb-3 rounded border border-[#FFE600] text-[#FFE600] font-semibold hover:bg-[#FFE600]/10 transition-colors"
        >
          {t('trivia.reveal_answer')}
        </button>
      )}

      {/* Host continue button */}
      {(isHost || revealed) && (
        <button
          data-testid="trivia-continue-btn"
          onClick={handleContinue}
          className="w-full py-3 rounded bg-[#FFE600] text-[#1A1A1A] font-bold hover:bg-[#FFD000] transition-colors"
        >
          {t('derby_match.trivia_continue')}
        </button>
      )}
    </div>
  );
}

// ─── Shared Sub-component ─────────────────────────────────────────────────────

interface StatusRowProps {
  label: string;
  done: boolean;
}

/**
 * Simple status indicator row.
 *
 * @param label - Display label
 * @param done  - Whether the action is complete
 */
function StatusRow({ label, done }: StatusRowProps): JSX.Element {
  return (
    <div
      data-testid={`status-row-${label.replace(/\s/g, '-').toLowerCase()}`}
      className={`flex items-center gap-2 text-sm ${done ? 'text-green-400' : 'text-[#666]'}`}
    >
      <span>{done ? '✓' : '○'}</span>
      <span>{label}</span>
    </div>
  );
}
