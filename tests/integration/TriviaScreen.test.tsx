/**
 * @file TriviaScreen.test.tsx
 * Integration tests for TriviaScreen.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../utils/renderWithProviders';
import TriviaScreen from '../../src/components/screens/TriviaScreen';
import { useMatchStore } from '../../src/store/matchStore';
import { MATCH_PHASE } from '../../src/engine/match';

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

  it('renders a question text (loaded from trivia.json)', () => {
    renderWithProviders(<TriviaScreen />);
    expect(screen.getByTestId('trivia-question-text')).toBeInTheDocument();
    // Must not be empty
    expect(screen.getByTestId('trivia-question-text').textContent?.length).toBeGreaterThan(0);
  });

  it('renders the reveal answer button before answer is shown', () => {
    renderWithProviders(<TriviaScreen />);
    expect(screen.getByTestId('reveal-answer-btn')).toBeInTheDocument();
  });

  it('shows the answer after clicking reveal', () => {
    renderWithProviders(<TriviaScreen />);
    fireEvent.click(screen.getByTestId('reveal-answer-btn'));
    expect(screen.getByTestId('trivia-answer-text')).toBeInTheDocument();
    expect(screen.getByTestId('trivia-answer-text').textContent).toBe('2005');
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
