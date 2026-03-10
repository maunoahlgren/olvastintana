/**
 * @file ResultScreen.test.tsx
 * Integration tests for ResultScreen.
 *
 * Updated in v0.4.0: "Play Again" replaced by "Continue" button.
 * Continue records the result in seasonStore and navigates to SEASON
 * (or SEASON_COMPLETE if all 7 fixtures done).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../utils/renderWithProviders';
import ResultScreen from '../../src/components/screens/ResultScreen';
import { useMatchStore } from '../../src/store/matchStore';
import { useSeasonStore } from '../../src/store/seasonStore';
import { MATCH_PHASE } from '../../src/engine/match';
import type { Opponent } from '../../src/engine/season';
import opponentsData from '../../src/data/opponents.json';

const opponents = opponentsData as Opponent[];
const deterministicRng = (): number => 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Drive the store to RESULT phase with the given goal counts.
 * Also initializes a season so the Continue button can record results.
 *
 * @param homeGoals - Goals to score for the home side
 * @param awayGoals - Goals to score for the away side
 */
function setupResult(homeGoals: number, awayGoals: number): void {
  useMatchStore.getState().reset();
  useSeasonStore.getState().initSeason(opponents, deterministicRng);
  useMatchStore.getState().beginSoloMatch();
  for (let i = 0; i < homeGoals; i++) {
    useMatchStore.getState().scoreGoal('home');
  }
  for (let i = 0; i < awayGoals; i++) {
    useMatchStore.getState().scoreGoal('away');
  }
  useMatchStore.getState().startFirstHalf();
  for (let i = 0; i < 5; i++) {
    useMatchStore.getState().advanceDuel();
  }
  useMatchStore.getState().startSecondHalf();
  for (let i = 0; i < 5; i++) {
    useMatchStore.getState().advanceDuel();
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ResultScreen', () => {
  beforeEach(() => {
    useMatchStore.getState().reset();
    useSeasonStore.getState().reset();
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

  // ── Continue button ───────────────────────────────────────────────────────

  it('renders the continue button', () => {
    setupResult(1, 0);
    renderWithProviders(<ResultScreen />);
    expect(screen.getByTestId('continue-to-season-btn')).toBeInTheDocument();
  });

  it('clicking Continue records the match result in seasonStore', () => {
    setupResult(2, 1);
    renderWithProviders(<ResultScreen />);
    expect(useSeasonStore.getState().fixtures[0].result).toBeNull();

    fireEvent.click(screen.getByTestId('continue-to-season-btn'));

    const result = useSeasonStore.getState().fixtures[0].result;
    expect(result).not.toBeNull();
    expect(result?.homeGoals).toBe(2);
    expect(result?.awayGoals).toBe(1);
    expect(result?.points).toBe(3);
  });

  it('clicking Continue goes to SEASON phase when fixtures remain', () => {
    setupResult(1, 0); // only 1 of 7 played
    renderWithProviders(<ResultScreen />);

    fireEvent.click(screen.getByTestId('continue-to-season-btn'));

    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.SEASON);
  });

  it('clicking Continue goes to SEASON_COMPLETE after last fixture', () => {
    // Pre-play the first 6 fixtures via store
    useSeasonStore.getState().initSeason(opponents, deterministicRng);
    for (let i = 0; i < 6; i++) {
      useSeasonStore.getState().recordFixtureResult(1, 0);
    }
    // Now simulate being on the result screen of fixture 7
    useMatchStore.getState().beginSoloMatch();
    useMatchStore.getState().scoreGoal('home');
    useMatchStore.getState().startFirstHalf();
    for (let i = 0; i < 5; i++) useMatchStore.getState().advanceDuel();
    useMatchStore.getState().startSecondHalf();
    for (let i = 0; i < 5; i++) useMatchStore.getState().advanceDuel();

    renderWithProviders(<ResultScreen />);
    fireEvent.click(screen.getByTestId('continue-to-season-btn'));

    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.SEASON_COMPLETE);
  });
});
