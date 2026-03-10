/**
 * @file SeasonCompleteScreen.test.tsx
 * Integration tests for SeasonCompleteScreen.
 *
 * Tests: final points display, W/D/L record, New Season navigation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../utils/renderWithProviders';
import SeasonCompleteScreen from '../../src/components/screens/SeasonCompleteScreen';
import { useMatchStore } from '../../src/store/matchStore';
import { useSeasonStore } from '../../src/store/seasonStore';
import { MATCH_PHASE } from '../../src/engine/match';
import type { Opponent } from '../../src/engine/season';
import opponentsData from '../../src/data/opponents.json';

const opponents = opponentsData as Opponent[];
const deterministicRng = (): number => 0;

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

/**
 * Play all 7 matches with the given result for each.
 * Results array: [homeGoals, awayGoals] for each fixture.
 */
function playFullSeason(results: Array<[number, number]>): void {
  useSeasonStore.getState().initSeason(opponents, deterministicRng);
  results.forEach(([h, a]) => useSeasonStore.getState().recordFixtureResult(h, a));
  useMatchStore.getState().completeSeason();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SeasonCompleteScreen', () => {
  beforeEach(() => {
    useMatchStore.getState().reset();
    useSeasonStore.getState().reset();
  });

  // ── Rendering ─────────────────────────────────────────────────────────────

  it('renders the season complete screen root', () => {
    playFullSeason([[1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0]]);
    renderWithProviders(<SeasonCompleteScreen />);
    expect(screen.getByTestId('season-complete-screen')).toBeInTheDocument();
  });

  it('shows the final points', () => {
    // 5 wins (15 pts) + 1 draw (1 pt) + 1 loss (0 pt) = 16 pts
    playFullSeason([[2, 0], [2, 0], [2, 0], [2, 0], [2, 0], [1, 1], [0, 2]]);
    renderWithProviders(<SeasonCompleteScreen />);
    expect(screen.getByTestId('season-complete-points')).toHaveTextContent('16');
  });

  it('shows perfect season 21 points', () => {
    playFullSeason([[3, 0], [3, 0], [3, 0], [3, 0], [3, 0], [3, 0], [3, 0]]);
    renderWithProviders(<SeasonCompleteScreen />);
    expect(screen.getByTestId('season-complete-points')).toHaveTextContent('21');
  });

  it('shows 0 points for all losses', () => {
    playFullSeason([[0, 1], [0, 1], [0, 1], [0, 1], [0, 1], [0, 1], [0, 1]]);
    renderWithProviders(<SeasonCompleteScreen />);
    expect(screen.getByTestId('season-complete-points')).toHaveTextContent('0');
  });

  it('renders the W/D/L record section', () => {
    playFullSeason([[1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0]]);
    renderWithProviders(<SeasonCompleteScreen />);
    expect(screen.getByTestId('season-complete-record')).toBeInTheDocument();
  });

  it('shows correct W/D/L breakdown', () => {
    // 3W, 2D, 2L
    playFullSeason([[2, 0], [2, 0], [2, 0], [1, 1], [1, 1], [0, 2], [0, 3]]);
    renderWithProviders(<SeasonCompleteScreen />);
    const record = screen.getByTestId('season-complete-record');
    expect(record.textContent).toContain('3'); // wins
    expect(record.textContent).toContain('2'); // draws and losses
  });

  it('renders the New Season button', () => {
    playFullSeason([[1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0]]);
    renderWithProviders(<SeasonCompleteScreen />);
    expect(screen.getByTestId('season-new-btn')).toBeInTheDocument();
  });

  // ── Navigation ────────────────────────────────────────────────────────────

  it('clicking New Season generates fresh fixtures and navigates to SEASON', () => {
    playFullSeason([[1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0]]);
    renderWithProviders(<SeasonCompleteScreen />);

    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.SEASON_COMPLETE);
    expect(useSeasonStore.getState().isSeasonComplete()).toBe(true);

    fireEvent.click(screen.getByTestId('season-new-btn'));

    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.SEASON);
    // New season: currentFixtureIndex reset to 0, no results
    expect(useSeasonStore.getState().currentFixtureIndex).toBe(0);
    expect(useSeasonStore.getState().fixtures).toHaveLength(7);
    expect(useSeasonStore.getState().getTotalPoints()).toBe(0);
  });
});
