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

  it('clicking wrong button shows penalty picker instead of advancing immediately', () => {
    renderWithProviders(<TriviaScreen />);
    fireEvent.click(screen.getByTestId('reveal-answer-btn'));
    fireEvent.click(screen.getByTestId('trivia-wrong-btn'));

    expect(screen.getByTestId('trivia-penalty-picker')).toBeInTheDocument();
    // Phase must NOT have advanced yet
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.TRIVIA);
  });

  it('penalty picker shows player buttons', () => {
    renderWithProviders(<TriviaScreen />);
    fireEvent.click(screen.getByTestId('reveal-answer-btn'));
    fireEvent.click(screen.getByTestId('trivia-wrong-btn'));

    expect(screen.getByTestId('penalty-player-grid')).toBeInTheDocument();
    // At least one penalty-pick button exists
    const firstBtn = document.querySelector('[data-testid^="penalty-pick-"]');
    expect(firstBtn).toBeInTheDocument();
  });

  it('penalty confirm button is hidden until a player is selected', () => {
    renderWithProviders(<TriviaScreen />);
    fireEvent.click(screen.getByTestId('reveal-answer-btn'));
    fireEvent.click(screen.getByTestId('trivia-wrong-btn'));

    expect(screen.queryByTestId('penalty-confirm-btn')).not.toBeInTheDocument();
  });

  it('selecting a player shows the confirm button', () => {
    renderWithProviders(<TriviaScreen />);
    fireEvent.click(screen.getByTestId('reveal-answer-btn'));
    fireEvent.click(screen.getByTestId('trivia-wrong-btn'));

    const firstBtn = document.querySelector('[data-testid^="penalty-pick-"]') as HTMLElement;
    fireEvent.click(firstBtn);

    expect(screen.getByTestId('penalty-confirm-btn')).toBeInTheDocument();
  });

  it('once a player is selected, other players are disabled', () => {
    renderWithProviders(<TriviaScreen />);
    fireEvent.click(screen.getByTestId('reveal-answer-btn'));
    fireEvent.click(screen.getByTestId('trivia-wrong-btn'));

    const allBtns = Array.from(
      document.querySelectorAll('[data-testid^="penalty-pick-"]'),
    ) as HTMLButtonElement[];
    fireEvent.click(allBtns[0]);

    // All other buttons should be disabled
    const otherBtns = allBtns.slice(1);
    expect(otherBtns.every((btn) => btn.disabled)).toBe(true);
    // The selected button itself is not disabled
    expect(allBtns[0].disabled).toBe(false);
  });

  it('confirming penalty advances to LINEUP with wrong result', () => {
    renderWithProviders(<TriviaScreen />);
    fireEvent.click(screen.getByTestId('reveal-answer-btn'));
    fireEvent.click(screen.getByTestId('trivia-wrong-btn'));

    const firstBtn = document.querySelector('[data-testid^="penalty-pick-"]') as HTMLElement;
    fireEvent.click(firstBtn);
    fireEvent.click(screen.getByTestId('penalty-confirm-btn'));

    const state = useMatchStore.getState();
    expect(state.phase).toBe(MATCH_PHASE.LINEUP);
    expect(state.triviaBoostActive).toBe(false);
    expect(state.triviaResult).toBe('wrong');
    expect(state.triviaPenaltyPlayerId).not.toBeNull();
  });

  it('only one player can be selected as penalty target at a time', () => {
    renderWithProviders(<TriviaScreen />);
    fireEvent.click(screen.getByTestId('reveal-answer-btn'));
    fireEvent.click(screen.getByTestId('trivia-wrong-btn'));

    const allBtns = Array.from(
      document.querySelectorAll('[data-testid^="penalty-pick-"]'),
    ) as HTMLButtonElement[];
    // Select first player
    fireEvent.click(allBtns[0]);
    // The other buttons are disabled — cannot click them to add more selections
    // Deselect first by clicking again
    fireEvent.click(allBtns[0]);
    expect(screen.queryByTestId('penalty-confirm-btn')).not.toBeInTheDocument();
  });
});
