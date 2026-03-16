/**
 * @file DerbyLineupScreen.test.tsx
 * Integration tests for DerbyLineupScreen.
 *
 * Tests cover phone view, big screen view, submission, host orchestration,
 * and position filtering.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../utils/renderWithProviders';
import DerbyLineupScreen from '../../src/components/screens/DerbyLineupScreen';
import { useRoomStore } from '../../src/store/roomStore';
import { useDerbyStore } from '../../src/store/derbyStore';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../src/firebase/derbyMatch', () => ({
  submitLineup:       vi.fn(() => Promise.resolve()),
  advanceDerbyPhase:  vi.fn(() => Promise.resolve()),
}));

import * as derbyMatch from '../../src/firebase/derbyMatch';
const mockSubmitLineup = vi.mocked(derbyMatch.submitLineup);
const mockAdvance      = vi.mocked(derbyMatch.advanceDerbyPhase);

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useRoomStore.getState().reset();
  useDerbyStore.getState().reset();
});

// ─── Phone view — host ────────────────────────────────────────────────────────

describe('DerbyLineupScreen — phone view (host)', () => {
  beforeEach(() => {
    useRoomStore.getState().setRoom('TEST', 'host', 'olli_mehtonen');
  });

  it('renders the lineup picker', () => {
    renderWithProviders(<DerbyLineupScreen />);
    expect(screen.getByTestId('derby-lineup-phone')).toBeInTheDocument();
  });

  it('confirm button is disabled when no players selected', () => {
    renderWithProviders(<DerbyLineupScreen />);
    expect(screen.getByTestId('confirm-lineup-btn')).toBeDisabled();
  });

  it('shows position filter buttons', () => {
    renderWithProviders(<DerbyLineupScreen />);
    expect(screen.getByTestId('filter-all')).toBeInTheDocument();
    expect(screen.getByTestId('filter-outfield')).toBeInTheDocument();
    expect(screen.getByTestId('filter-gk')).toBeInTheDocument();
  });

  it('shows player grid', () => {
    renderWithProviders(<DerbyLineupScreen />);
    expect(screen.getByTestId('player-grid')).toBeInTheDocument();
  });

  it('shows the submitted view after lineup is ready', () => {
    useDerbyStore.getState().setFromFirebase({
      phase: 'lineup', half: 1, duelIndex: 0, scoreHome: 0, scoreAway: 0,
      possession: 'p1', kickoff: 'p1', triviaIndex: 0, triviaBoost: null,
      p1LineupReady: true, p2LineupReady: false,
      p1Lineup: [], p2Lineup: [], p1Trivia: null, p2Trivia: null,
      p1Card: null, p2Card: null, p1CardReady: false, p2CardReady: false,
      resultAtkCard: null, resultDefCard: null, resultWinner: null, resultScored: false,
      p1HalftimeDone: false, p2HalftimeDone: false,
      p1HalftimeAction: null, p2HalftimeAction: null,
    });
    renderWithProviders(<DerbyLineupScreen />);
    expect(screen.getByTestId('derby-lineup-submitted')).toBeInTheDocument();
  });
});

// ─── Big screen view — spectator ─────────────────────────────────────────────

describe('DerbyLineupScreen — big screen view (spectator)', () => {
  beforeEach(() => {
    useRoomStore.getState().setRoom('TEST', 'spectator', '');
  });

  it('renders the big screen waiting view', () => {
    renderWithProviders(<DerbyLineupScreen />);
    expect(screen.getByTestId('derby-lineup-bigscreen')).toBeInTheDocument();
  });

  it('shows both ready badges as not ready initially', () => {
    renderWithProviders(<DerbyLineupScreen />);
    // Both lineups not ready → badges show ○
    const badges = screen.getAllByText('○');
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });

  it('shows p1 badge as ready when p1 lineup submitted', () => {
    useDerbyStore.getState().setFromFirebase({
      phase: 'lineup', half: 1, duelIndex: 0, scoreHome: 0, scoreAway: 0,
      possession: 'p1', kickoff: 'p1', triviaIndex: 0, triviaBoost: null,
      p1LineupReady: true, p2LineupReady: false,
      p1Lineup: [], p2Lineup: [], p1Trivia: null, p2Trivia: null,
      p1Card: null, p2Card: null, p1CardReady: false, p2CardReady: false,
      resultAtkCard: null, resultDefCard: null, resultWinner: null, resultScored: false,
      p1HalftimeDone: false, p2HalftimeDone: false,
      p1HalftimeAction: null, p2HalftimeAction: null,
    });
    renderWithProviders(<DerbyLineupScreen />);
    // p1 ready should show ✓
    expect(screen.getAllByText('✓').length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Host orchestration ───────────────────────────────────────────────────────

describe('DerbyLineupScreen — host advances phase when both ready', () => {
  it('calls advanceDerbyPhase("trivia") when both p1 and p2 lineup are ready', async () => {
    useRoomStore.getState().setRoom('TEST', 'host', 'olli_mehtonen');
    useDerbyStore.getState().setFromFirebase({
      phase: 'lineup', half: 1, duelIndex: 0, scoreHome: 0, scoreAway: 0,
      possession: 'p1', kickoff: 'p1', triviaIndex: 0, triviaBoost: null,
      p1LineupReady: true, p2LineupReady: true,
      p1Lineup: [], p2Lineup: [], p1Trivia: null, p2Trivia: null,
      p1Card: null, p2Card: null, p1CardReady: false, p2CardReady: false,
      resultAtkCard: null, resultDefCard: null, resultWinner: null, resultScored: false,
      p1HalftimeDone: false, p2HalftimeDone: false,
      p1HalftimeAction: null, p2HalftimeAction: null,
    });
    renderWithProviders(<DerbyLineupScreen />);
    await waitFor(() => {
      expect(mockAdvance).toHaveBeenCalledWith('TEST', 'trivia');
    });
  });

  it('does NOT advance when only one player is ready', async () => {
    useRoomStore.getState().setRoom('TEST', 'host', 'olli_mehtonen');
    useDerbyStore.getState().setFromFirebase({
      phase: 'lineup', half: 1, duelIndex: 0, scoreHome: 0, scoreAway: 0,
      possession: 'p1', kickoff: 'p1', triviaIndex: 0, triviaBoost: null,
      p1LineupReady: true, p2LineupReady: false,
      p1Lineup: [], p2Lineup: [], p1Trivia: null, p2Trivia: null,
      p1Card: null, p2Card: null, p1CardReady: false, p2CardReady: false,
      resultAtkCard: null, resultDefCard: null, resultWinner: null, resultScored: false,
      p1HalftimeDone: false, p2HalftimeDone: false,
      p1HalftimeAction: null, p2HalftimeAction: null,
    });
    renderWithProviders(<DerbyLineupScreen />);
    // Brief delay to check no call
    await new Promise((r) => setTimeout(r, 50));
    expect(mockAdvance).not.toHaveBeenCalled();
  });
});
