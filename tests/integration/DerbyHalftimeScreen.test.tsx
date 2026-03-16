/**
 * @file DerbyHalftimeScreen.test.tsx
 * Integration tests for DerbyHalftimeScreen.
 *
 * Tests cover: choose view, swap flow, tactic flow, skip,
 * submitted view, big screen view, and host advance.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../utils/renderWithProviders';
import DerbyHalftimeScreen from '../../src/components/screens/DerbyHalftimeScreen';
import { useRoomStore } from '../../src/store/roomStore';
import { useDerbyStore } from '../../src/store/derbyStore';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../src/firebase/derbyMatch', () => ({
  submitHalftimeAction: vi.fn(() => Promise.resolve()),
  resetForNextDuel:     vi.fn(() => Promise.resolve()),
}));

import * as derbyMatch from '../../src/firebase/derbyMatch';
const mockSubmitAction = vi.mocked(derbyMatch.submitHalftimeAction);
const mockResetNext    = vi.mocked(derbyMatch.resetForNextDuel);

/** Minimal halftime snapshot */
const halftimeSnap = {
  phase: 'halftime' as const,
  half: 1 as const,
  duelIndex: 0,
  scoreHome: 1,
  scoreAway: 0,
  possession: 'p1' as const,
  kickoff: 'p1' as const,
  triviaIndex: 0,
  triviaBoost: null,
  p1LineupReady: true,
  p2LineupReady: true,
  p1Lineup: ['olli_mehtonen', 'mauno_ahlgren', 'tero_backman', 'kimmo_mattila', 'iiro_makela', 'juha_jokinen'],
  p2Lineup: ['olli_mehtonen', 'mauno_ahlgren', 'tero_backman', 'kimmo_mattila', 'iiro_makela', 'juha_jokinen'],
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

beforeEach(() => {
  vi.clearAllMocks();
  useRoomStore.getState().reset();
  useDerbyStore.getState().reset();
  useDerbyStore.getState().setFromFirebase(halftimeSnap);
});

// ─── Choose view ──────────────────────────────────────────────────────────────

describe('DerbyHalftimeScreen — choose view', () => {
  beforeEach(() => {
    useRoomStore.getState().setRoom('TEST', 'host', 'olli_mehtonen');
  });

  it('renders halftime choose view', () => {
    renderWithProviders(<DerbyHalftimeScreen />);
    expect(screen.getByTestId('derby-halftime-choose')).toBeInTheDocument();
  });

  it('shows Swap, Tactic and Skip buttons', () => {
    renderWithProviders(<DerbyHalftimeScreen />);
    expect(screen.getByTestId('halftime-swap-btn')).toBeInTheDocument();
    expect(screen.getByTestId('halftime-tactic-btn')).toBeInTheDocument();
    expect(screen.getByTestId('halftime-skip-btn')).toBeInTheDocument();
  });

  it('skip submits action with type=skip', async () => {
    renderWithProviders(<DerbyHalftimeScreen />);
    fireEvent.click(screen.getByTestId('halftime-skip-btn'));
    await waitFor(() => {
      expect(mockSubmitAction).toHaveBeenCalledWith('TEST', 'p1', { type: 'skip' });
    });
  });

  it('navigates to tactic view on tactic button click', () => {
    renderWithProviders(<DerbyHalftimeScreen />);
    fireEvent.click(screen.getByTestId('halftime-tactic-btn'));
    expect(screen.getByTestId('derby-halftime-tactic')).toBeInTheDocument();
  });

  it('navigates to swap view on swap button click', () => {
    renderWithProviders(<DerbyHalftimeScreen />);
    fireEvent.click(screen.getByTestId('halftime-swap-btn'));
    expect(screen.getByTestId('derby-halftime-swap')).toBeInTheDocument();
  });
});

// ─── Tactic view ──────────────────────────────────────────────────────────────

describe('DerbyHalftimeScreen — tactic selection', () => {
  beforeEach(() => {
    useRoomStore.getState().setRoom('TEST', 'host', 'olli_mehtonen');
  });

  it('shows tactic options', () => {
    renderWithProviders(<DerbyHalftimeScreen />);
    fireEvent.click(screen.getByTestId('halftime-tactic-btn'));
    expect(screen.getByTestId('tactic-aggressive')).toBeInTheDocument();
    expect(screen.getByTestId('tactic-defensive')).toBeInTheDocument();
    expect(screen.getByTestId('tactic-creative')).toBeInTheDocument();
  });

  it('confirm is disabled until tactic selected', () => {
    renderWithProviders(<DerbyHalftimeScreen />);
    fireEvent.click(screen.getByTestId('halftime-tactic-btn'));
    expect(screen.getByTestId('confirm-tactic-btn')).toBeDisabled();
  });

  it('submits tactic action after selecting and confirming', async () => {
    renderWithProviders(<DerbyHalftimeScreen />);
    fireEvent.click(screen.getByTestId('halftime-tactic-btn'));
    fireEvent.click(screen.getByTestId('tactic-aggressive'));
    fireEvent.click(screen.getByTestId('confirm-tactic-btn'));
    await waitFor(() => {
      expect(mockSubmitAction).toHaveBeenCalledWith('TEST', 'p1', {
        type: 'tactic',
        tactic: 'aggressive',
      });
    });
  });
});

// ─── Submitted view ───────────────────────────────────────────────────────────

describe('DerbyHalftimeScreen — submitted view', () => {
  it('shows submitted view when own halftime_done is true (p1)', () => {
    useRoomStore.getState().setRoom('TEST', 'host', 'olli_mehtonen');
    useDerbyStore.getState().setFromFirebase({ ...halftimeSnap, p1HalftimeDone: true });
    renderWithProviders(<DerbyHalftimeScreen />);
    expect(screen.getByTestId('derby-halftime-submitted')).toBeInTheDocument();
  });

  it('shows submitted view for p2', () => {
    useRoomStore.getState().setRoom('TEST', 'player', 'mauno_ahlgren');
    useDerbyStore.getState().setFromFirebase({ ...halftimeSnap, p2HalftimeDone: true });
    renderWithProviders(<DerbyHalftimeScreen />);
    expect(screen.getByTestId('derby-halftime-submitted')).toBeInTheDocument();
  });
});

// ─── Big screen view ──────────────────────────────────────────────────────────

describe('DerbyHalftimeScreen — big screen view', () => {
  it('renders big screen halftime view for spectator', () => {
    useRoomStore.getState().setRoom('TEST', 'spectator', '');
    renderWithProviders(<DerbyHalftimeScreen />);
    expect(screen.getByTestId('derby-halftime-bigscreen')).toBeInTheDocument();
  });
});

// ─── Host orchestration ───────────────────────────────────────────────────────

describe('DerbyHalftimeScreen — host advances to second half', () => {
  it('calls resetForNextDuel when both halftime done', async () => {
    useRoomStore.getState().setRoom('TEST', 'host', 'olli_mehtonen');
    useDerbyStore.getState().setFromFirebase({
      ...halftimeSnap,
      p1HalftimeDone: true,
      p2HalftimeDone: true,
    });
    renderWithProviders(<DerbyHalftimeScreen />);
    await waitFor(() => {
      expect(mockResetNext).toHaveBeenCalledWith('TEST', 0, true, 'p2');
    });
  });

  it('does NOT advance when only p1 done', async () => {
    useRoomStore.getState().setRoom('TEST', 'host', 'olli_mehtonen');
    useDerbyStore.getState().setFromFirebase({ ...halftimeSnap, p1HalftimeDone: true });
    renderWithProviders(<DerbyHalftimeScreen />);
    await new Promise((r) => setTimeout(r, 50));
    expect(mockResetNext).not.toHaveBeenCalled();
  });
});
