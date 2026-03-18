/**
 * @file DerbyDuelScreen.test.tsx
 * Integration tests for DerbyDuelScreen.
 *
 * Tests cover: phone card picker, possession indicator, card submission,
 * big screen status view, result view, and host phase orchestration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../utils/renderWithProviders';
import DerbyDuelScreen from '../../src/components/screens/DerbyDuelScreen';
import { useRoomStore } from '../../src/store/roomStore';
import { useDerbyStore } from '../../src/store/derbyStore';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../src/firebase/derbyMatch', () => ({
  submitCard:       vi.fn(() => Promise.resolve()),
  writeDuelResult:  vi.fn(() => Promise.resolve()),
  advanceDerbyPhase: vi.fn(() => Promise.resolve()),
  resetForNextDuel:  vi.fn(() => Promise.resolve()),
}));

import * as derbyMatch from '../../src/firebase/derbyMatch';
const mockSubmitCard   = vi.mocked(derbyMatch.submitCard);
const mockWriteResult  = vi.mocked(derbyMatch.writeDuelResult);
const mockAdvance      = vi.mocked(derbyMatch.advanceDerbyPhase);
const mockResetNext    = vi.mocked(derbyMatch.resetForNextDuel);

/** Minimal duel-phase snapshot */
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
  useDerbyStore.getState().setFromFirebase(duelSnap);
});

// ─── Phone view — p1 attacking ────────────────────────────────────────────────

describe('DerbyDuelScreen — phone view (p1 attacking)', () => {
  beforeEach(() => {
    useRoomStore.getState().setRoom('TEST', 'host', 'olli_mehtonen');
  });

  it('renders phone duel view', () => {
    renderWithProviders(<DerbyDuelScreen />);
    expect(screen.getByTestId('derby-duel-phone')).toBeInTheDocument();
  });

  it('shows 3 card buttons', () => {
    renderWithProviders(<DerbyDuelScreen />);
    expect(screen.getByTestId('card-press')).toBeInTheDocument();
    expect(screen.getByTestId('card-feint')).toBeInTheDocument();
    expect(screen.getByTestId('card-shot')).toBeInTheDocument();
  });

  it('calls submitCard when a card is clicked', async () => {
    renderWithProviders(<DerbyDuelScreen />);
    fireEvent.click(screen.getByTestId('card-press'));
    await waitFor(() => {
      expect(mockSubmitCard).toHaveBeenCalledWith('TEST', 'p1', 'press');
    });
  });

  it('shows waiting view after card submitted', async () => {
    useDerbyStore.getState().setFromFirebase({ ...duelSnap, p1CardReady: true });
    renderWithProviders(<DerbyDuelScreen />);
    expect(screen.getByTestId('derby-duel-waiting')).toBeInTheDocument();
  });
});

// ─── Phone view — p2 (defender) ──────────────────────────────────────────────

describe('DerbyDuelScreen — phone view (p2 defending)', () => {
  beforeEach(() => {
    useRoomStore.getState().setRoom('TEST', 'player', 'mauno_ahlgren');
  });

  it('all three card buttons are enabled when defending — SQ-GOAL-01', () => {
    // Shot is no longer restricted to attackers; all cards available to both sides
    renderWithProviders(<DerbyDuelScreen />);
    expect(screen.getByTestId('card-press')).not.toBeDisabled();
    expect(screen.getByTestId('card-feint')).not.toBeDisabled();
    expect(screen.getByTestId('card-shot')).not.toBeDisabled();
  });

  it('calls submitCard with p2 key for press card', async () => {
    renderWithProviders(<DerbyDuelScreen />);
    fireEvent.click(screen.getByTestId('card-press'));
    await waitFor(() => {
      expect(mockSubmitCard).toHaveBeenCalledWith('TEST', 'p2', 'press');
    });
  });
});

// ─── Big screen view ──────────────────────────────────────────────────────────

describe('DerbyDuelScreen — big screen view', () => {
  beforeEach(() => {
    useRoomStore.getState().setRoom('TEST', 'spectator', '');
  });

  it('renders big screen duel view', () => {
    renderWithProviders(<DerbyDuelScreen />);
    expect(screen.getByTestId('derby-duel-bigscreen')).toBeInTheDocument();
  });

  it('shows score badge', () => {
    renderWithProviders(<DerbyDuelScreen />);
    expect(screen.getByTestId('score-badge')).toBeInTheDocument();
  });
});

// ─── Result view ──────────────────────────────────────────────────────────────

describe('DerbyDuelScreen — result view (duel_result phase)', () => {
  beforeEach(() => {
    useRoomStore.getState().setRoom('TEST', 'host', 'olli_mehtonen');
    useDerbyStore.getState().setFromFirebase({
      ...duelSnap,
      phase: 'duel_result',
      resultAtkCard: 'shot',
      resultDefCard: 'press',
      resultWinner: 'attacker',
      resultScored: true,
      scoreHome: 1,
    });
  });

  it('renders result view during duel_result phase', () => {
    renderWithProviders(<DerbyDuelScreen />);
    expect(screen.getByTestId('derby-duel-result')).toBeInTheDocument();
  });

  it('shows score badge in result view', () => {
    renderWithProviders(<DerbyDuelScreen />);
    expect(screen.getByTestId('score-badge')).toBeInTheDocument();
  });
});

// ─── Big screen — player cards ────────────────────────────────────────────────

describe('DerbyDuelScreen — big screen player cards', () => {
  beforeEach(() => {
    useRoomStore.getState().setRoom('TEST', 'spectator', '');
  });

  it('renders bigscreen-player-cards when lineups are set', () => {
    renderWithProviders(<DerbyDuelScreen />);
    expect(screen.getByTestId('bigscreen-player-cards')).toBeInTheDocument();
  });

  it('shows p1 player name on big screen', () => {
    renderWithProviders(<DerbyDuelScreen />);
    // p1Lineup[0] is 'olli_mehtonen' — player name "Olli Mehtonen"
    const cards = screen.getByTestId('bigscreen-player-cards');
    expect(cards.querySelector('[data-testid="player-name-olli_mehtonen"]')).toBeInTheDocument();
  });
});

// ─── Big screen — instruction sidebar ─────────────────────────────────────────

describe('DerbyDuelScreen — instruction sidebar', () => {
  beforeEach(() => {
    useRoomStore.getState().setRoom('TEST', 'spectator', '');
  });

  it('renders instruction sidebar on big screen', () => {
    renderWithProviders(<DerbyDuelScreen />);
    expect(screen.getByTestId('instruction-sidebar')).toBeInTheDocument();
  });

  it('sidebar contains card triangle rules', () => {
    renderWithProviders(<DerbyDuelScreen />);
    const sidebar = screen.getByTestId('instruction-sidebar');
    expect(sidebar).toHaveTextContent('Press beats Feint');
    expect(sidebar).toHaveTextContent('Feint beats Shot');
    expect(sidebar).toHaveTextContent('Shot beats Press');
  });

  it('sidebar shows current possession', () => {
    renderWithProviders(<DerbyDuelScreen />);
    const sidebar = screen.getByTestId('instruction-sidebar');
    // p1 has possession in duelSnap (setup above)
    expect(sidebar).toHaveTextContent('Home');
  });

  it('sidebar shows current score', () => {
    renderWithProviders(<DerbyDuelScreen />);
    const sidebar = screen.getByTestId('instruction-sidebar');
    expect(sidebar).toHaveTextContent('0 – 0');
  });

  it('sidebar shows current half', () => {
    renderWithProviders(<DerbyDuelScreen />);
    const sidebar = screen.getByTestId('instruction-sidebar');
    expect(sidebar).toHaveTextContent('Half 1');
  });
});
