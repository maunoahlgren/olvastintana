/**
 * @file TitleScreen.test.tsx
 * Integration tests for TitleScreen.
 *
 * v0.4.0 — AI difficulty selector removed; AI driven by opponent tier.
 * v0.8.0 — Added Derby Night button; Solo button now reads "Solo Season".
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

  // ── Solo Season button ────────────────────────────────────────────────────

  it('renders the Solo Season button', () => {
    renderWithProviders(<TitleScreen />);
    expect(screen.getByTestId('start-solo-btn')).toBeInTheDocument();
  });

  it('Solo Season button reads "Solo Season" (v0.8.0 rename)', () => {
    renderWithProviders(<TitleScreen />);
    expect(screen.getByTestId('start-solo-btn')).toHaveTextContent('Solo Season');
  });

  it('clicking Solo Season transitions to SEASON phase', () => {
    renderWithProviders(<TitleScreen />);
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.TITLE);

    fireEvent.click(screen.getByTestId('start-solo-btn'));

    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.SEASON);
  });

  it('clicking Solo Season populates 7 season fixtures', () => {
    renderWithProviders(<TitleScreen />);
    fireEvent.click(screen.getByTestId('start-solo-btn'));
    expect(useSeasonStore.getState().fixtures).toHaveLength(7);
  });

  it('clicking Solo Season resets fixture index to 0', () => {
    renderWithProviders(<TitleScreen />);
    fireEvent.click(screen.getByTestId('start-solo-btn'));
    expect(useSeasonStore.getState().currentFixtureIndex).toBe(0);
  });

  // ── Derby Night button ────────────────────────────────────────────────────

  it('renders the Derby Night button', () => {
    renderWithProviders(<TitleScreen />);
    expect(screen.getByTestId('derby-night-btn')).toBeInTheDocument();
  });

  it('Derby Night button reads "Derby Night"', () => {
    renderWithProviders(<TitleScreen />);
    expect(screen.getByTestId('derby-night-btn')).toHaveTextContent('Derby Night');
  });

  it('clicking Derby Night transitions to DERBY_LOBBY phase', () => {
    renderWithProviders(<TitleScreen />);
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.TITLE);

    fireEvent.click(screen.getByTestId('derby-night-btn'));

    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.DERBY_LOBBY);
  });

  it('clicking Derby Night does not generate season fixtures', () => {
    renderWithProviders(<TitleScreen />);
    fireEvent.click(screen.getByTestId('derby-night-btn'));
    expect(useSeasonStore.getState().fixtures).toHaveLength(0);
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
