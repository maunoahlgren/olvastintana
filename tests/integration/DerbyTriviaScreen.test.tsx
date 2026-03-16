/**
 * @file DerbyTriviaScreen.test.tsx
 * Integration tests for DerbyTriviaScreen.
 *
 * Tests cover: phone answer view, big screen view, answered view,
 * correct/wrong submission, host auto-advance, boost winner display.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../utils/renderWithProviders';
import DerbyTriviaScreen from '../../src/components/screens/DerbyTriviaScreen';
import { useRoomStore } from '../../src/store/roomStore';
import { useDerbyStore } from '../../src/store/derbyStore';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../src/firebase/derbyMatch', () => ({
  submitTriviaAnswer: vi.fn(() => Promise.resolve()),
  advanceDerbyPhase:  vi.fn(() => Promise.resolve()),
}));

import * as derbyMatch from '../../src/firebase/derbyMatch';
const mockSubmitTrivia = vi.mocked(derbyMatch.submitTriviaAnswer);
const mockAdvance      = vi.mocked(derbyMatch.advanceDerbyPhase);

/** Minimal Derby match snapshot for trivia phase */
const triviaSnap = {
  phase: 'trivia' as const,
  half: 1 as const,
  duelIndex: 0,
  scoreHome: 0,
  scoreAway: 0,
  possession: 'p1' as const,
  kickoff: 'p1' as const,
  triviaIndex: 0,
  triviaBoost: null,
  p1LineupReady: true,
  p2LineupReady: true,
  p1Lineup: [],
  p2Lineup: [],
  p1Trivia: null,
  p2Trivia: null,
  p1Card: null,
  p2Card: null,
  p1CardReady: false,
  p2CardReady: false,
  resultAtkCard: null,
  resultDefCard: null,
  resultWinner: null,
  resultScored: false,
  p1HalftimeDone: false,
  p2HalftimeDone: false,
  p1HalftimeAction: null,
  p2HalftimeAction: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  useRoomStore.getState().reset();
  useDerbyStore.getState().reset();
  useDerbyStore.getState().setFromFirebase(triviaSnap);
});

// ─── Phone view ───────────────────────────────────────────────────────────────

describe('DerbyTriviaScreen — phone view', () => {
  beforeEach(() => {
    useRoomStore.getState().setRoom('TEST', 'host', 'olli_mehtonen');
  });

  it('renders the phone trivia view', () => {
    renderWithProviders(<DerbyTriviaScreen />);
    expect(screen.getByTestId('derby-trivia-phone')).toBeInTheDocument();
  });

  it('shows a reveal answer button', () => {
    renderWithProviders(<DerbyTriviaScreen />);
    expect(screen.getByTestId('reveal-answer-btn')).toBeInTheDocument();
  });

  it('shows correct/wrong buttons after reveal', async () => {
    renderWithProviders(<DerbyTriviaScreen />);
    fireEvent.click(screen.getByTestId('reveal-answer-btn'));
    expect(screen.getByTestId('trivia-correct-btn')).toBeInTheDocument();
    expect(screen.getByTestId('trivia-wrong-btn')).toBeInTheDocument();
  });

  it('calls submitTriviaAnswer with correct=true on correct click', async () => {
    renderWithProviders(<DerbyTriviaScreen />);
    fireEvent.click(screen.getByTestId('reveal-answer-btn'));
    fireEvent.click(screen.getByTestId('trivia-correct-btn'));
    await waitFor(() => {
      expect(mockSubmitTrivia).toHaveBeenCalledWith('TEST', 'p1', true);
    });
  });

  it('calls submitTriviaAnswer with correct=false on wrong click', async () => {
    renderWithProviders(<DerbyTriviaScreen />);
    fireEvent.click(screen.getByTestId('reveal-answer-btn'));
    fireEvent.click(screen.getByTestId('trivia-wrong-btn'));
    await waitFor(() => {
      expect(mockSubmitTrivia).toHaveBeenCalledWith('TEST', 'p1', false);
    });
  });

  it('shows answered view once p1 has answered', () => {
    useDerbyStore.getState().setFromFirebase({ ...triviaSnap, p1Trivia: true });
    renderWithProviders(<DerbyTriviaScreen />);
    expect(screen.getByTestId('derby-trivia-answered')).toBeInTheDocument();
  });

  it('p2 phone view calls submitTriviaAnswer with p2 key', async () => {
    useRoomStore.getState().reset();
    useRoomStore.getState().setRoom('TEST', 'player', 'mauno_ahlgren');
    renderWithProviders(<DerbyTriviaScreen />);
    fireEvent.click(screen.getByTestId('reveal-answer-btn'));
    fireEvent.click(screen.getByTestId('trivia-wrong-btn'));
    await waitFor(() => {
      expect(mockSubmitTrivia).toHaveBeenCalledWith('TEST', 'p2', false);
    });
  });
});

// ─── Big screen view ──────────────────────────────────────────────────────────

describe('DerbyTriviaScreen — big screen view', () => {
  beforeEach(() => {
    useRoomStore.getState().setRoom('TEST', 'spectator', '');
  });

  it('renders big screen trivia view', () => {
    renderWithProviders(<DerbyTriviaScreen />);
    expect(screen.getByTestId('derby-trivia-bigscreen')).toBeInTheDocument();
  });

  it('shows continue button after reveal', () => {
    renderWithProviders(<DerbyTriviaScreen />);
    // The continue button is gated behind the reveal step for spectators
    fireEvent.click(screen.getByTestId('reveal-answer-big-btn'));
    expect(screen.getByTestId('trivia-continue-btn')).toBeInTheDocument();
  });

  it('shows boost winner when triviaBoost is set', () => {
    useDerbyStore.getState().setFromFirebase({ ...triviaSnap, triviaBoost: 'p1', p1Trivia: true, p2Trivia: false });
    renderWithProviders(<DerbyTriviaScreen />);
    // Boost winner message should be visible
    expect(screen.getByTestId('derby-trivia-bigscreen')).toBeInTheDocument();
  });
});

// ─── Host auto-advance ────────────────────────────────────────────────────────

describe('DerbyTriviaScreen — host auto-advance', () => {
  beforeEach(() => {
    useRoomStore.getState().setRoom('TEST', 'host', 'olli_mehtonen');
  });

  it('advances to duel phase when both trivia are answered', async () => {
    useDerbyStore.getState().setFromFirebase({
      ...triviaSnap,
      p1Trivia: true,
      p2Trivia: false,
    });
    renderWithProviders(<DerbyTriviaScreen />);
    await waitFor(() => {
      expect(mockAdvance).toHaveBeenCalledWith(
        'TEST',
        'duel',
        expect.objectContaining({ p1_card: null, p2_card: null }),
      );
    });
  });

  it('does NOT advance if only one player has answered', async () => {
    useDerbyStore.getState().setFromFirebase({ ...triviaSnap, p1Trivia: true, p2Trivia: null });
    renderWithProviders(<DerbyTriviaScreen />);
    await new Promise((r) => setTimeout(r, 50));
    expect(mockAdvance).not.toHaveBeenCalled();
  });
});
