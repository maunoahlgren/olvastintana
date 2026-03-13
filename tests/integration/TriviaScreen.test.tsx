/**
 * @file TriviaScreen.test.tsx
 * Integration tests for TriviaScreen.
 *
 * trivia.json is mocked with a single known question so random selection
 * is deterministic (Math.floor(random * 1) === 0 always).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../utils/renderWithProviders';
import TriviaScreen from '../../src/components/screens/TriviaScreen';
import { useMatchStore } from '../../src/store/matchStore';
import { MATCH_PHASE } from '../../src/engine/match';

vi.mock('../../src/data/trivia.json', () => ({
  default: [
    {
      id: 'first_goal_ever',
      sport: 'football',
      era: 'early',
      question: {
        en: 'Who scored the very first goal in Olvastin Tana history?',
        fi: 'Kuka teki Olvastin Tanan historian ensimmäisen maalin?',
      },
      answers: {
        en: ['Mattila', 'Alanen', 'Mauno', 'Mehtonen'],
        fi: ['Mattila', 'Alanen', 'Mauno', 'Mehtonen'],
      },
      correctIndex: 0,
    },
  ],
}));

describe('TriviaScreen', () => {
  beforeEach(() => {
    useMatchStore.getState().reset();
    useMatchStore.getState().beginSoloMatch();
  });

  it('renders the trivia screen header', () => {
    renderWithProviders(<TriviaScreen />);
    expect(screen.getByText('Trivia')).toBeInTheDocument();
  });

  it('renders the question card', () => {
    renderWithProviders(<TriviaScreen />);
    expect(screen.getByTestId('trivia-question-card')).toBeInTheDocument();
  });

  it('renders a question text — Finnish by default', () => {
    renderWithProviders(<TriviaScreen />);
    expect(screen.getByTestId('trivia-question-text').textContent).toBe(
      'Kuka teki Olvastin Tanan historian ensimmäisen maalin?'
    );
  });

  it('renders the reveal answer button before answer is shown', () => {
    renderWithProviders(<TriviaScreen />);
    expect(screen.getByTestId('reveal-answer-btn')).toBeInTheDocument();
  });

  it('shows the language toggle button', () => {
    renderWithProviders(<TriviaScreen />);
    expect(screen.getByTestId('trivia-lang-toggle')).toBeInTheDocument();
  });

  it('language toggle button shows EN when in Finnish mode', () => {
    renderWithProviders(<TriviaScreen />);
    expect(screen.getByTestId('trivia-lang-toggle').textContent).toBe('EN');
  });

  it('clicking language toggle switches question to English', () => {
    renderWithProviders(<TriviaScreen />);
    fireEvent.click(screen.getByTestId('trivia-lang-toggle'));
    expect(screen.getByTestId('trivia-question-text').textContent).toBe(
      'Who scored the very first goal in Olvastin Tana history?'
    );
  });

  it('language toggle button shows FI after switching to English', () => {
    renderWithProviders(<TriviaScreen />);
    fireEvent.click(screen.getByTestId('trivia-lang-toggle'));
    expect(screen.getByTestId('trivia-lang-toggle').textContent).toBe('FI');
  });

  it('clicking language toggle twice returns to Finnish', () => {
    renderWithProviders(<TriviaScreen />);
    fireEvent.click(screen.getByTestId('trivia-lang-toggle'));
    fireEvent.click(screen.getByTestId('trivia-lang-toggle'));
    expect(screen.getByTestId('trivia-question-text').textContent).toBe(
      'Kuka teki Olvastin Tanan historian ensimmäisen maalin?'
    );
  });

  it('shows the Finnish answer after clicking reveal (default language)', () => {
    renderWithProviders(<TriviaScreen />);
    fireEvent.click(screen.getByTestId('reveal-answer-btn'));
    expect(screen.getByTestId('trivia-answer-text').textContent).toBe('Mattila');
  });

  it('shows the English answer after toggling to English then revealing', () => {
    renderWithProviders(<TriviaScreen />);
    fireEvent.click(screen.getByTestId('trivia-lang-toggle'));
    fireEvent.click(screen.getByTestId('reveal-answer-btn'));
    expect(screen.getByTestId('trivia-answer-text').textContent).toBe('Mattila');
  });

  it('shows correct and wrong buttons after revealing', () => {
    renderWithProviders(<TriviaScreen />);
    fireEvent.click(screen.getByTestId('reveal-answer-btn'));
    expect(screen.getByTestId('trivia-correct-btn')).toBeInTheDocument();
    expect(screen.getByTestId('trivia-wrong-btn')).toBeInTheDocument();
  });

  it('does not show correct/wrong buttons before reveal', () => {
    renderWithProviders(<TriviaScreen />);
    expect(screen.queryByTestId('trivia-correct-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('trivia-wrong-btn')).not.toBeInTheDocument();
  });

  it('transitions to LINEUP and sets triviaBoostActive on correct answer', () => {
    renderWithProviders(<TriviaScreen />);
    fireEvent.click(screen.getByTestId('reveal-answer-btn'));
    fireEvent.click(screen.getByTestId('trivia-correct-btn'));

    const state = useMatchStore.getState();
    expect(state.phase).toBe(MATCH_PHASE.LINEUP);
    expect(state.triviaBoostActive).toBe(true);
    expect(state.triviaResult).toBe('correct');
  });

  it('transitions to LINEUP with no boost on wrong answer', () => {
    renderWithProviders(<TriviaScreen />);
    fireEvent.click(screen.getByTestId('reveal-answer-btn'));
    fireEvent.click(screen.getByTestId('trivia-wrong-btn'));

    const state = useMatchStore.getState();
    expect(state.phase).toBe(MATCH_PHASE.LINEUP);
    expect(state.triviaBoostActive).toBe(false);
    expect(state.triviaResult).toBe('wrong');
  });
});
