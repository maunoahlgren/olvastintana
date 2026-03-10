/**
 * @file SeasonScreen.test.tsx
 * Integration tests for SeasonScreen.
 *
 * Tests: fixture list rendering, upcoming/result display,
 * points tally, play-next-match navigation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../utils/renderWithProviders';
import SeasonScreen from '../../src/components/screens/SeasonScreen';
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
 * Initialize a deterministic season so the fixture list is consistent.
 */
function initSeason(): void {
  useSeasonStore.getState().initSeason(opponents, deterministicRng);
  useMatchStore.getState().startSeason();
}

describe('SeasonScreen', () => {
  beforeEach(() => {
    useMatchStore.getState().reset();
    useSeasonStore.getState().reset();
  });

  // ── Rendering ────────────────────────────────────────────────────────────

  it('renders the season screen root', () => {
    initSeason();
    renderWithProviders(<SeasonScreen />);
    expect(screen.getByTestId('season-screen')).toBeInTheDocument();
  });

  it('renders 7 fixture rows', () => {
    initSeason();
    renderWithProviders(<SeasonScreen />);
    for (let i = 1; i <= 7; i++) {
      expect(screen.getByTestId(`season-fixture-${i}`)).toBeInTheDocument();
    }
  });

  it('shows points tally (0 at start)', () => {
    initSeason();
    renderWithProviders(<SeasonScreen />);
    const pointsEl = screen.getByTestId('season-points-total');
    expect(pointsEl).toHaveTextContent('0');
  });

  it('renders "Play Next Match" button', () => {
    initSeason();
    renderWithProviders(<SeasonScreen />);
    expect(screen.getByTestId('season-play-next-btn')).toBeInTheDocument();
  });

  // ── Upcoming fixtures ─────────────────────────────────────────────────────

  it('all 7 fixtures show "Upcoming" before any match played', () => {
    initSeason();
    renderWithProviders(<SeasonScreen />);
    for (let i = 1; i <= 7; i++) {
      expect(screen.getByTestId(`season-fixture-${i}-upcoming`)).toBeInTheDocument();
    }
  });

  // ── After a result ────────────────────────────────────────────────────────

  it('shows W and score after a win', () => {
    initSeason();
    useSeasonStore.getState().recordFixtureResult(3, 1);
    renderWithProviders(<SeasonScreen />);
    // First fixture should now show W and score
    const row = screen.getByTestId('season-fixture-1');
    expect(row.textContent).toContain('W');
    expect(row.textContent).toContain('3');
    expect(row.textContent).toContain('1');
  });

  it('shows D after a draw', () => {
    initSeason();
    useSeasonStore.getState().recordFixtureResult(1, 1);
    renderWithProviders(<SeasonScreen />);
    const row = screen.getByTestId('season-fixture-1');
    expect(row.textContent).toContain('D');
  });

  it('shows L after a loss', () => {
    initSeason();
    useSeasonStore.getState().recordFixtureResult(0, 2);
    renderWithProviders(<SeasonScreen />);
    const row = screen.getByTestId('season-fixture-1');
    expect(row.textContent).toContain('L');
  });

  it('points tally updates after recording results', () => {
    initSeason();
    useSeasonStore.getState().recordFixtureResult(2, 0); // +3
    useSeasonStore.getState().recordFixtureResult(1, 1); // +1
    renderWithProviders(<SeasonScreen />);
    expect(screen.getByTestId('season-points-total')).toHaveTextContent('4');
  });

  // ── Navigation ────────────────────────────────────────────────────────────

  it('clicking Play Next Match sets phase to PREMATCH', () => {
    initSeason();
    renderWithProviders(<SeasonScreen />);
    fireEvent.click(screen.getByTestId('season-play-next-btn'));
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.PREMATCH);
  });

  it('Play Next Match button hidden when all 7 fixtures complete', () => {
    initSeason();
    for (let i = 0; i < 7; i++) {
      useSeasonStore.getState().recordFixtureResult(1, 0);
    }
    renderWithProviders(<SeasonScreen />);
    expect(screen.queryByTestId('season-play-next-btn')).not.toBeInTheDocument();
  });
});
