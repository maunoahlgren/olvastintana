/**
 * @file TitleScreen.test.tsx
 * Integration tests for TitleScreen.
 *
 * The difficulty selector was removed in v0.4.0.
 * AI difficulty is now driven automatically by opponent tier (PreMatchScreen).
 * TitleScreen now generates a season and navigates to SEASON phase.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../utils/renderWithProviders';
import TitleScreen from '../../src/components/screens/TitleScreen';
import { useMatchStore } from '../../src/store/matchStore';
import { useSeasonStore } from '../../src/store/seasonStore';
import { MATCH_PHASE } from '../../src/engine/match';

describe('TitleScreen', () => {
  beforeEach(() => {
    useMatchStore.getState().reset();
    useSeasonStore.getState().reset();
  });

  // ── Branding ──────────────────────────────────────────────────────────────

  it('renders the club title', () => {
    renderWithProviders(<TitleScreen />);
    expect(screen.getByText('Olvastin Tana FC')).toBeInTheDocument();
  });

  it('renders the tagline', () => {
    renderWithProviders(<TitleScreen />);
    expect(screen.getByText('20 Years of Beautiful Chaos')).toBeInTheDocument();
  });

  it('renders the anniversary years', () => {
    renderWithProviders(<TitleScreen />);
    expect(screen.getByText('2006 – 2026')).toBeInTheDocument();
  });

  // ── Start button ──────────────────────────────────────────────────────────

  it('renders the start season button', () => {
    renderWithProviders(<TitleScreen />);
    expect(screen.getByTestId('start-solo-btn')).toBeInTheDocument();
    expect(screen.getByTestId('start-solo-btn')).toHaveTextContent('Start Season');
  });

  it('clicking Start Season transitions to SEASON phase', () => {
    renderWithProviders(<TitleScreen />);
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.TITLE);

    fireEvent.click(screen.getByTestId('start-solo-btn'));

    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.SEASON);
  });

  it('clicking Start Season populates 7 season fixtures', () => {
    renderWithProviders(<TitleScreen />);
    fireEvent.click(screen.getByTestId('start-solo-btn'));
    expect(useSeasonStore.getState().fixtures).toHaveLength(7);
  });

  it('clicking Start Season resets fixture index to 0', () => {
    renderWithProviders(<TitleScreen />);
    fireEvent.click(screen.getByTestId('start-solo-btn'));
    expect(useSeasonStore.getState().currentFixtureIndex).toBe(0);
  });

  // ── Language toggle ───────────────────────────────────────────────────────

  it('renders the language toggle', () => {
    renderWithProviders(<TitleScreen />);
    // LanguageToggle renders EN when language is FI (test env default)
    expect(screen.getByText('EN')).toBeInTheDocument();
  });

  // ── No difficulty selector ────────────────────────────────────────────────

  it('difficulty selector is NOT present (removed in v0.4.0)', () => {
    renderWithProviders(<TitleScreen />);
    expect(screen.queryByTestId('difficulty-label')).not.toBeInTheDocument();
    expect(screen.queryByTestId('difficulty-btn-easy')).not.toBeInTheDocument();
    expect(screen.queryByTestId('difficulty-btn-normal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('difficulty-btn-hard')).not.toBeInTheDocument();
  });
});
