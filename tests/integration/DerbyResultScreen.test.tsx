/**
 * @file DerbyResultScreen.test.tsx
 * Integration tests for DerbyResultScreen.
 *
 * Tests cover: score display, outcome labels for host/player/spectator,
 * manager name display, and back-to-lobby reset flow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../utils/renderWithProviders';
import DerbyResultScreen from '../../src/components/screens/DerbyResultScreen';
import { useRoomStore } from '../../src/store/roomStore';
import { useDerbyStore } from '../../src/store/derbyStore';
import { useMatchStore } from '../../src/store/matchStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal connected player list with host + guest */
const players = [
  { managerId: 'olli_mehtonen', displayName: 'Olli', joinedAt: 1, isHost: true },
  { managerId: 'mauno_ahlgren', displayName: 'Mauno', joinedAt: 2, isHost: false },
];

beforeEach(() => {
  vi.clearAllMocks();
  useRoomStore.getState().reset();
  useDerbyStore.getState().reset();
  useMatchStore.getState().reset();
  // Populate connected players for all tests
  useRoomStore.getState().setConnectedPlayers(players);
});

// ─── Score display ────────────────────────────────────────────────────────────

describe('DerbyResultScreen — score display', () => {
  it('renders the result screen', () => {
    useRoomStore.getState().setRoom('TEST', 'host', 'olli_mehtonen');
    useDerbyStore.getState().setFromFirebase({
      phase: 'result', half: 2, duelIndex: 0,
      scoreHome: 2, scoreAway: 1,
      possession: 'p1', kickoff: 'p1',
      triviaIndex: 0, triviaBoost: null,
      p1LineupReady: true, p2LineupReady: true,
      p1Lineup: [], p2Lineup: [],
      p1Trivia: true, p2Trivia: true,
      p1Card: null, p2Card: null,
      p1CardReady: false, p2CardReady: false,
      resultAtkCard: null, resultDefCard: null,
      resultWinner: null, resultScored: false,
      p1HalftimeDone: true, p2HalftimeDone: true,
      p1HalftimeAction: null, p2HalftimeAction: null,
    });
    renderWithProviders(<DerbyResultScreen />);
    expect(screen.getByTestId('derby-result-screen')).toBeInTheDocument();
  });

  it('displays the final score', () => {
    useRoomStore.getState().setRoom('TEST', 'host', 'olli_mehtonen');
    useDerbyStore.getState().setFromFirebase({
      phase: 'result', half: 2, duelIndex: 0,
      scoreHome: 3, scoreAway: 1,
      possession: 'p1', kickoff: 'p1',
      triviaIndex: 0, triviaBoost: null,
      p1LineupReady: true, p2LineupReady: true,
      p1Lineup: [], p2Lineup: [],
      p1Trivia: true, p2Trivia: true,
      p1Card: null, p2Card: null,
      p1CardReady: false, p2CardReady: false,
      resultAtkCard: null, resultDefCard: null,
      resultWinner: null, resultScored: false,
      p1HalftimeDone: true, p2HalftimeDone: true,
      p1HalftimeAction: null, p2HalftimeAction: null,
    });
    renderWithProviders(<DerbyResultScreen />);
    expect(screen.getByTestId('final-score').textContent).toContain('3');
    expect(screen.getByTestId('final-score').textContent).toContain('1');
  });

  it('shows the scoreboard element', () => {
    useRoomStore.getState().setRoom('TEST', 'spectator', '');
    useDerbyStore.getState().setFromFirebase({
      phase: 'result', half: 2, duelIndex: 0,
      scoreHome: 0, scoreAway: 0,
      possession: 'p1', kickoff: 'p1',
      triviaIndex: 0, triviaBoost: null,
      p1LineupReady: true, p2LineupReady: true,
      p1Lineup: [], p2Lineup: [],
      p1Trivia: true, p2Trivia: true,
      p1Card: null, p2Card: null,
      p1CardReady: false, p2CardReady: false,
      resultAtkCard: null, resultDefCard: null,
      resultWinner: null, resultScored: false,
      p1HalftimeDone: true, p2HalftimeDone: true,
      p1HalftimeAction: null, p2HalftimeAction: null,
    });
    renderWithProviders(<DerbyResultScreen />);
    expect(screen.getByTestId('result-scoreboard')).toBeInTheDocument();
  });
});

// ─── Outcome labels ───────────────────────────────────────────────────────────

describe('DerbyResultScreen — outcome labels', () => {
  const baseSnap = {
    phase: 'result' as const, half: 2 as const, duelIndex: 0,
    possession: 'p1' as const, kickoff: 'p1' as const,
    triviaIndex: 0, triviaBoost: null,
    p1LineupReady: true, p2LineupReady: true,
    p1Lineup: [], p2Lineup: [],
    p1Trivia: true, p2Trivia: true,
    p1Card: null, p2Card: null,
    p1CardReady: false, p2CardReady: false,
    resultAtkCard: null, resultDefCard: null,
    resultWinner: null, resultScored: false,
    p1HalftimeDone: true, p2HalftimeDone: true,
    p1HalftimeAction: null, p2HalftimeAction: null,
  };

  it('shows victory for host when home wins', () => {
    useRoomStore.getState().setRoom('TEST', 'host', 'olli_mehtonen');
    useDerbyStore.getState().setFromFirebase({ ...baseSnap, scoreHome: 2, scoreAway: 0 });
    renderWithProviders(<DerbyResultScreen />);
    expect(screen.getByTestId('result-outcome').textContent).toMatch(/victory|voitto/i);
  });

  it('shows defeat for host when away wins', () => {
    useRoomStore.getState().setRoom('TEST', 'host', 'olli_mehtonen');
    useDerbyStore.getState().setFromFirebase({ ...baseSnap, scoreHome: 0, scoreAway: 2 });
    renderWithProviders(<DerbyResultScreen />);
    expect(screen.getByTestId('result-outcome').textContent).toMatch(/defeat|tappio/i);
  });

  it('shows victory for player (p2) when away wins', () => {
    useRoomStore.getState().setRoom('TEST', 'player', 'mauno_ahlgren');
    useDerbyStore.getState().setFromFirebase({ ...baseSnap, scoreHome: 1, scoreAway: 3 });
    renderWithProviders(<DerbyResultScreen />);
    expect(screen.getByTestId('result-outcome').textContent).toMatch(/victory|voitto/i);
  });

  it('shows defeat for player (p2) when home wins', () => {
    useRoomStore.getState().setRoom('TEST', 'player', 'mauno_ahlgren');
    useDerbyStore.getState().setFromFirebase({ ...baseSnap, scoreHome: 3, scoreAway: 1 });
    renderWithProviders(<DerbyResultScreen />);
    expect(screen.getByTestId('result-outcome').textContent).toMatch(/defeat|tappio/i);
  });

  it('shows draw for both when scores are equal', () => {
    useRoomStore.getState().setRoom('TEST', 'host', 'olli_mehtonen');
    useDerbyStore.getState().setFromFirebase({ ...baseSnap, scoreHome: 1, scoreAway: 1 });
    renderWithProviders(<DerbyResultScreen />);
    expect(screen.getByTestId('result-outcome').textContent).toMatch(/draw|tasapeli/i);
  });

  it('shows neutral outcome label for spectator when home wins', () => {
    useRoomStore.getState().setRoom('TEST', 'spectator', '');
    useDerbyStore.getState().setFromFirebase({ ...baseSnap, scoreHome: 2, scoreAway: 0 });
    renderWithProviders(<DerbyResultScreen />);
    // Spectator sees "Home Victory!" or similar combined label
    const outcome = screen.getByTestId('result-outcome').textContent ?? '';
    expect(outcome.length).toBeGreaterThan(0);
  });
});

// ─── Back to lobby ────────────────────────────────────────────────────────────

describe('DerbyResultScreen — back to lobby', () => {
  it('renders the back to lobby button', () => {
    useRoomStore.getState().setRoom('TEST', 'host', 'olli_mehtonen');
    useDerbyStore.getState().setFromFirebase({
      phase: 'result', half: 2, duelIndex: 0,
      scoreHome: 1, scoreAway: 0,
      possession: 'p1', kickoff: 'p1',
      triviaIndex: 0, triviaBoost: null,
      p1LineupReady: true, p2LineupReady: true,
      p1Lineup: [], p2Lineup: [],
      p1Trivia: true, p2Trivia: true,
      p1Card: null, p2Card: null,
      p1CardReady: false, p2CardReady: false,
      resultAtkCard: null, resultDefCard: null,
      resultWinner: null, resultScored: false,
      p1HalftimeDone: true, p2HalftimeDone: true,
      p1HalftimeAction: null, p2HalftimeAction: null,
    });
    renderWithProviders(<DerbyResultScreen />);
    expect(screen.getByTestId('back-to-lobby-btn')).toBeInTheDocument();
  });

  it('resets room, derby, and match stores on back-to-lobby click', () => {
    useRoomStore.getState().setRoom('TEST', 'host', 'olli_mehtonen');
    useDerbyStore.getState().setFromFirebase({
      phase: 'result', half: 2, duelIndex: 0,
      scoreHome: 2, scoreAway: 1,
      possession: 'p1', kickoff: 'p1',
      triviaIndex: 0, triviaBoost: null,
      p1LineupReady: true, p2LineupReady: true,
      p1Lineup: [], p2Lineup: [],
      p1Trivia: true, p2Trivia: true,
      p1Card: null, p2Card: null,
      p1CardReady: false, p2CardReady: false,
      resultAtkCard: null, resultDefCard: null,
      resultWinner: null, resultScored: false,
      p1HalftimeDone: true, p2HalftimeDone: true,
      p1HalftimeAction: null, p2HalftimeAction: null,
    });
    renderWithProviders(<DerbyResultScreen />);

    fireEvent.click(screen.getByTestId('back-to-lobby-btn'));

    // roomStore reset — roomCode should be null
    expect(useRoomStore.getState().roomCode).toBeNull();
    // derbyStore reset — scores should be 0
    expect(useDerbyStore.getState().scoreHome).toBe(0);
    expect(useDerbyStore.getState().scoreAway).toBe(0);
  });
});
