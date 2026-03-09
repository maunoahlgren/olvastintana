/**
 * @file TitleScreen.test.tsx
 * Integration tests for TitleScreen.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../utils/renderWithProviders';
import TitleScreen from '../../src/components/screens/TitleScreen';
import { useMatchStore } from '../../src/store/matchStore';
import { useSessionStore } from '../../src/store/sessionStore';
import { MATCH_PHASE } from '../../src/engine/match';

describe('TitleScreen', () => {
  beforeEach(() => {
    useMatchStore.getState().reset();
    useSessionStore.getState().reset();
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

  // ── Start button ──────────────────────────────────────────────────────────

  it('renders the start solo button', () => {
    renderWithProviders(<TitleScreen />);
    expect(screen.getByTestId('start-solo-btn')).toBeInTheDocument();
    expect(screen.getByTestId('start-solo-btn')).toHaveTextContent('Start Solo Match');
  });

  it('transitions to TRIVIA phase when start button is clicked', () => {
    renderWithProviders(<TitleScreen />);
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.TITLE);

    fireEvent.click(screen.getByTestId('start-solo-btn'));

    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.TRIVIA);
  });

  it('sets possession after clicking start', () => {
    renderWithProviders(<TitleScreen />);
    fireEvent.click(screen.getByTestId('start-solo-btn'));
    const { possession } = useMatchStore.getState();
    expect(['home', 'away']).toContain(possession);
  });

  // ── Language toggle ───────────────────────────────────────────────────────

  it('renders the language toggle', () => {
    renderWithProviders(<TitleScreen />);
    // LanguageToggle renders EN when language is FI (test env default)
    expect(screen.getByText('EN')).toBeInTheDocument();
  });

  // ── Difficulty selector — presence ────────────────────────────────────────

  it('renders the difficulty selector label', () => {
    renderWithProviders(<TitleScreen />);
    expect(screen.getByTestId('difficulty-label')).toBeInTheDocument();
  });

  it('renders all three difficulty buttons', () => {
    renderWithProviders(<TitleScreen />);
    expect(screen.getByTestId('difficulty-btn-easy')).toBeInTheDocument();
    expect(screen.getByTestId('difficulty-btn-normal')).toBeInTheDocument();
    expect(screen.getByTestId('difficulty-btn-hard')).toBeInTheDocument();
  });

  it('renders a difficulty description', () => {
    renderWithProviders(<TitleScreen />);
    expect(screen.getByTestId('difficulty-desc')).toBeInTheDocument();
  });

  // ── Difficulty selector — default selection ───────────────────────────────

  it('Normal is selected by default (aria-pressed="true")', () => {
    renderWithProviders(<TitleScreen />);
    expect(screen.getByTestId('difficulty-btn-normal')).toHaveAttribute('aria-pressed', 'true');
  });

  it('Easy and Hard are NOT selected by default (aria-pressed="false")', () => {
    renderWithProviders(<TitleScreen />);
    expect(screen.getByTestId('difficulty-btn-easy')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('difficulty-btn-hard')).toHaveAttribute('aria-pressed', 'false');
  });

  // ── Difficulty selector — interaction ─────────────────────────────────────

  it('clicking Easy selects Easy and deselects Normal', () => {
    renderWithProviders(<TitleScreen />);
    fireEvent.click(screen.getByTestId('difficulty-btn-easy'));
    expect(screen.getByTestId('difficulty-btn-easy')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('difficulty-btn-normal')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('difficulty-btn-hard')).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking Hard selects Hard and deselects Normal', () => {
    renderWithProviders(<TitleScreen />);
    fireEvent.click(screen.getByTestId('difficulty-btn-hard'));
    expect(screen.getByTestId('difficulty-btn-hard')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('difficulty-btn-normal')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('difficulty-btn-easy')).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking Easy then Hard leaves only Hard selected', () => {
    renderWithProviders(<TitleScreen />);
    fireEvent.click(screen.getByTestId('difficulty-btn-easy'));
    fireEvent.click(screen.getByTestId('difficulty-btn-hard'));
    expect(screen.getByTestId('difficulty-btn-hard')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('difficulty-btn-easy')).toHaveAttribute('aria-pressed', 'false');
  });

  // ── Difficulty selector — sessionStore write-through ─────────────────────

  it('clicking Start with default (Normal) sets aiDifficulty="normal" in sessionStore', () => {
    renderWithProviders(<TitleScreen />);
    fireEvent.click(screen.getByTestId('start-solo-btn'));
    expect(useSessionStore.getState().aiDifficulty).toBe('normal');
  });

  it('clicking Easy then Start sets aiDifficulty="easy" in sessionStore', () => {
    renderWithProviders(<TitleScreen />);
    fireEvent.click(screen.getByTestId('difficulty-btn-easy'));
    fireEvent.click(screen.getByTestId('start-solo-btn'));
    expect(useSessionStore.getState().aiDifficulty).toBe('easy');
  });

  it('clicking Hard then Start sets aiDifficulty="hard" in sessionStore', () => {
    renderWithProviders(<TitleScreen />);
    fireEvent.click(screen.getByTestId('difficulty-btn-hard'));
    fireEvent.click(screen.getByTestId('start-solo-btn'));
    expect(useSessionStore.getState().aiDifficulty).toBe('hard');
  });
});
