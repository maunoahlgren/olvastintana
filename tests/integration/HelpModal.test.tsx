/**
 * @file HelpModal.test.tsx
 * Integration tests for the in-game help modal on DuelScreen and DerbyDuelScreen.
 *
 * Tests cover:
 *   - ? button is rendered on DuelScreen phone view
 *   - Clicking ? opens the help modal
 *   - Help modal shows card triangle
 *   - Clicking × closes the modal
 *   - Clicking backdrop closes the modal
 *   - DerbyDuelScreen phone view has ? button
 *   - Help modal opened from Derby shows triangle (no tactic section)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../utils/renderWithProviders';
import DuelScreen from '../../src/components/screens/DuelScreen';
import DerbyDuelScreen from '../../src/components/screens/DerbyDuelScreen';
import { useMatchStore } from '../../src/store/matchStore';
import { useSessionStore } from '../../src/store/sessionStore';
import { useRoomStore } from '../../src/store/roomStore';
import { useDerbyStore } from '../../src/store/derbyStore';
import { MATCH_PHASE } from '../../src/engine/match';

// ─── Mock firebase/derbyMatch ────────────────────────────────────────────────

vi.mock('../../src/firebase/derbyMatch', () => ({
  submitCard:         vi.fn(() => Promise.resolve()),
  writeDuelResult:    vi.fn(() => Promise.resolve()),
  advanceDerbyPhase:  vi.fn(() => Promise.resolve()),
  resetForNextDuel:   vi.fn(() => Promise.resolve()),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Minimal Derby duel snapshot with p1 attacking */
const duelSnap = {
  phase: 'duel' as const,
  half: 1 as const,
  duelIndex: 0,
  scoreHome: 0,
  scoreAway: 0,
  possession: 'p1' as const,
  kickoff: 'p1' as const,
  triviaIndex: 0,
  triviaBoost: null,
  p1LineupReady: true,
  p2LineupReady: true,
  p1Lineup: ['olli_mehtonen', 'mauno_ahlgren', 'tero_backman', 'kimmo_mattila', 'iiro_makela', 'juha_jokinen', 'tommi_helminen'],
  p2Lineup: ['olli_mehtonen', 'mauno_ahlgren', 'tero_backman', 'kimmo_mattila', 'iiro_makela', 'juha_jokinen', 'tommi_helminen'],
  p1Trivia: true,
  p2Trivia: true,
  p1Card: null,
  p2Card: null,
  p1CardReady: false,
  p2CardReady: false,
  resultAtkCard: null,
  resultDefCard: null,
  resultWinner: null,
  resultScored: false,
  p1HalftimeDone: false,
  p2HalftimeDone: false,
  p1HalftimeAction: null,
  p2HalftimeAction: null,
};

// ─── DuelScreen — help button ─────────────────────────────────────────────────

describe('DuelScreen — help button', () => {
  beforeEach(() => {
    useMatchStore.getState().reset();
    useSessionStore.getState().reset();
    // Put matchStore in FIRST_HALF phase via setDerbyPhase (accepts any phase string)
    useMatchStore.getState().setDerbyPhase(MATCH_PHASE.FIRST_HALF);
  });

  it('renders the ? help button', () => {
    renderWithProviders(<DuelScreen />);
    expect(screen.getByTestId('help-btn')).toBeInTheDocument();
  });

  it('opens the help modal when ? button is clicked', () => {
    renderWithProviders(<DuelScreen />);
    fireEvent.click(screen.getByTestId('help-btn'));
    expect(screen.getByTestId('help-modal')).toBeInTheDocument();
  });

  it('shows the card triangle in the modal', () => {
    renderWithProviders(<DuelScreen />);
    fireEvent.click(screen.getByTestId('help-btn'));
    expect(screen.getByTestId('help-triangle-section')).toBeInTheDocument();
  });

  it('closes the modal via × button', () => {
    renderWithProviders(<DuelScreen />);
    fireEvent.click(screen.getByTestId('help-btn'));
    fireEvent.click(screen.getByTestId('help-close-x'));
    expect(screen.queryByTestId('help-modal')).not.toBeInTheDocument();
  });

  it('closes the modal via backdrop click', () => {
    renderWithProviders(<DuelScreen />);
    fireEvent.click(screen.getByTestId('help-btn'));
    fireEvent.click(screen.getByTestId('help-modal-backdrop'));
    expect(screen.queryByTestId('help-modal')).not.toBeInTheDocument();
  });

  it('closes the modal via bottom close button', () => {
    renderWithProviders(<DuelScreen />);
    fireEvent.click(screen.getByTestId('help-btn'));
    fireEvent.click(screen.getByTestId('help-close-btn'));
    expect(screen.queryByTestId('help-modal')).not.toBeInTheDocument();
  });
});

// ─── DerbyDuelScreen — help button ───────────────────────────────────────────

describe('DerbyDuelScreen — help button', () => {
  beforeEach(() => {
    useRoomStore.getState().reset();
    useDerbyStore.getState().reset();
    useRoomStore.getState().setRoom('TEST', 'host', 'olli_mehtonen');
    useDerbyStore.getState().setFromFirebase(duelSnap);
  });

  it('renders the ? help button on phone view', () => {
    renderWithProviders(<DerbyDuelScreen />);
    expect(screen.getByTestId('help-btn')).toBeInTheDocument();
  });

  it('opens the help modal when ? is tapped', () => {
    renderWithProviders(<DerbyDuelScreen />);
    fireEvent.click(screen.getByTestId('help-btn'));
    expect(screen.getByTestId('help-modal')).toBeInTheDocument();
  });

  it('shows card triangle in Derby help modal', () => {
    renderWithProviders(<DerbyDuelScreen />);
    fireEvent.click(screen.getByTestId('help-btn'));
    expect(screen.getByTestId('help-triangle-section')).toBeInTheDocument();
  });

  it('does NOT show tactics section in Derby help modal (no tactic system)', () => {
    renderWithProviders(<DerbyDuelScreen />);
    fireEvent.click(screen.getByTestId('help-btn'));
    expect(screen.queryByTestId('help-tactics-section')).not.toBeInTheDocument();
  });

  it('closes Derby help modal via × button', () => {
    renderWithProviders(<DerbyDuelScreen />);
    fireEvent.click(screen.getByTestId('help-btn'));
    fireEvent.click(screen.getByTestId('help-close-x'));
    expect(screen.queryByTestId('help-modal')).not.toBeInTheDocument();
  });
});
