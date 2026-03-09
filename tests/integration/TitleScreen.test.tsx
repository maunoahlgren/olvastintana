/**
 * @file TitleScreen.test.tsx
 * Integration tests for TitleScreen.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../utils/renderWithProviders';
import TitleScreen from '../../src/components/screens/TitleScreen';
import { useMatchStore } from '../../src/store/matchStore';
import { MATCH_PHASE } from '../../src/engine/match';

describe('TitleScreen', () => {
  beforeEach(() => {
    // Reset Zustand store before each test
    useMatchStore.getState().reset();
  });

  it('renders the club title', () => {
    renderWithProviders(<TitleScreen />);
    expect(screen.getByText('Olvastin Tana FC')).toBeInTheDocument();
  });

  it('renders the tagline', () => {
    renderWithProviders(<TitleScreen />);
    expect(screen.getByText('20 Years of Beautiful Chaos')).toBeInTheDocument();
  });

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

  it('renders the language toggle', () => {
    renderWithProviders(<TitleScreen />);
    // LanguageToggle renders a language button or selector
    expect(screen.getByText("EN")).toBeInTheDocument();
  });
});
