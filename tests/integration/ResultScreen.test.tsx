/**
 * @file ResultScreen.test.tsx
 * Integration tests for ResultScreen.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../utils/renderWithProviders';
import ResultScreen from '../../src/components/screens/ResultScreen';
import { useMatchStore } from '../../src/store/matchStore';
import { MATCH_PHASE } from '../../src/engine/match';

/**
 * Drive the store to RESULT phase with the given goal counts.
 * Uses only store actions (never direct setState) to avoid Zustand v5
 * re-render quirks with numeric values.
 *
 * @param homeGoals - Goals to score for the home side
 * @param awayGoals - Goals to score for the away side
 */
function setupResult(homeGoals: number, awayGoals: number): void {
  useMatchStore.getState().reset();
  useMatchStore.getState().beginSoloMatch();
  // Score goals before advancing to FIRST_HALF so counts are registered
  for (let i = 0; i < homeGoals; i++) {
    useMatchStore.getState().scoreGoal('home');
  }
  for (let i = 0; i < awayGoals; i++) {
    useMatchStore.getState().scoreGoal('away');
  }
  useMatchStore.getState().startFirstHalf();
  // Advance through 5 duels → HALFTIME
  for (let i = 0; i < 5; i++) {
    useMatchStore.getState().advanceDuel();
  }
  // Start second half, advance 5 duels → RESULT
  useMatchStore.getState().startSecondHalf();
  for (let i = 0; i < 5; i++) {
    useMatchStore.getState().advanceDuel();
  }
}

describe('ResultScreen', () => {
  beforeEach(() => {
    useMatchStore.getState().reset();
  });

  it('renders the result banner', () => {
    setupResult(2, 1);
    renderWithProviders(<ResultScreen />);
    expect(screen.getByTestId('result-banner')).toBeInTheDocument();
  });

  it('shows Victory! when home wins', () => {
    setupResult(3, 1);
    renderWithProviders(<ResultScreen />);
    expect(screen.getByTestId('result-banner')).toHaveTextContent('Victory!');
  });

  it('shows Defeat when home loses', () => {
    setupResult(0, 2);
    renderWithProviders(<ResultScreen />);
    expect(screen.getByTestId('result-banner')).toHaveTextContent('Defeat');
  });

  it('shows Draw when scores are equal', () => {
    setupResult(1, 1);
    renderWithProviders(<ResultScreen />);
    expect(screen.getByTestId('result-banner')).toHaveTextContent('Draw');
  });

  it('displays final home goals', () => {
    setupResult(3, 0);
    renderWithProviders(<ResultScreen />);
    expect(screen.getByTestId('result-home-goals')).toHaveTextContent('3');
  });

  it('displays final away goals', () => {
    setupResult(0, 2);
    renderWithProviders(<ResultScreen />);
    expect(screen.getByTestId('result-away-goals')).toHaveTextContent('2');
  });

  it('shows +3 home points for a home win', () => {
    setupResult(2, 0);
    renderWithProviders(<ResultScreen />);
    expect(screen.getByTestId('result-home-points').textContent).toContain('3');
  });

  it('shows +0 away points for a home win', () => {
    setupResult(2, 0);
    renderWithProviders(<ResultScreen />);
    expect(screen.getByTestId('result-away-points').textContent).toContain('0');
  });

  it('shows +1 points for both sides on a draw', () => {
    setupResult(1, 1);
    renderWithProviders(<ResultScreen />);
    expect(screen.getByTestId('result-home-points').textContent).toContain('1');
    expect(screen.getByTestId('result-away-points').textContent).toContain('1');
  });

  it('shows play again button', () => {
    setupResult(1, 0);
    renderWithProviders(<ResultScreen />);
    expect(screen.getByTestId('play-again-btn')).toBeInTheDocument();
    expect(screen.getByTestId('play-again-btn')).toHaveTextContent('Play Again');
  });

  it('clicking play again resets phase to TITLE', () => {
    setupResult(1, 0);
    renderWithProviders(<ResultScreen />);
    fireEvent.click(screen.getByTestId('play-again-btn'));
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.TITLE);
  });
});
