/**
 * @file ai_match.test.tsx
 * Functional tests for AI mode match flows.
 *
 * Verifies:
 * - All three difficulty levels complete a full half without errors
 * - AI mode skips the cover screen (no second human)
 * - attacker-pick-prompt appears even when AI is the attacker (away possession)
 * - Human card is recorded in playerCardHistory for Hard AI countering
 * - duelIndex advances correctly in AI mode
 *
 * Uses renderWithProviders + store actions; never directly mutates store state
 * for numeric fields.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../utils/renderWithProviders';
import DuelScreen from '../../src/components/screens/DuelScreen';
import { useMatchStore } from '../../src/store/matchStore';
import { useSquadStore } from '../../src/store/squadStore';
import { useSessionStore } from '../../src/store/sessionStore';
import { MATCH_PHASE } from '../../src/engine/match';
import playersData from '../../src/data/players.json';
import type { Player } from '../../src/store/squadStore';
import type { AiDifficulty } from '../../src/store/sessionStore';

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

const allPlayers = playersData as Player[];
const outfield = allPlayers.filter((p) =>
  p.position.some((pos) => pos === 'MF' || pos === 'FW'),
);
const gk = allPlayers.find((p) => p.position.includes('GK'))!;

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

/**
 * Set up a minimal FIRST_HALF match in AI mode.
 *
 * @param difficulty - AI difficulty level (default 'normal')
 * @param possession - Which side starts with the ball (default 'home')
 */
function setupAiMatch(
  difficulty: AiDifficulty = 'normal',
  possession: 'home' | 'away' = 'home',
): void {
  useMatchStore.getState().reset();
  useSquadStore.getState().reset();
  useSessionStore.getState().setAiDifficulty(difficulty);
  useMatchStore.setState({
    phase: MATCH_PHASE.FIRST_HALF,
    half: 1,
    duelIndex: 0,
    possession,
    firstHalfKickoff: possession,
    homeGoals: 0,
    awayGoals: 0,
    triviaBoostActive: false,
  });
  useSquadStore.getState().setLineup('home', [...outfield.slice(0, 5), gk]);
  useSquadStore.getState().setLineup('away', [...outfield.slice(0, 5), gk]);
}

/**
 * Play one duel in AI mode: human picks a card, AI resolves instantly.
 * Clicks continue after the result panel appears.
 *
 * @param card - Card the human plays (default 'press')
 */
function playAiDuel(card: 'press' | 'feint' | 'shot' = 'press'): void {
  expect(screen.getByTestId('attacker-pick-prompt')).toBeInTheDocument();
  fireEvent.click(screen.getByTestId(`card-btn-${card}`));
  expect(screen.getByTestId('duel-result-panel')).toBeInTheDocument();
  fireEvent.click(screen.getByTestId('duel-continue-btn'));
}

// ---------------------------------------------------------------------------
// DuelScreen — AI mode UI
// ---------------------------------------------------------------------------

describe('DuelScreen — AI mode UI', () => {
  beforeEach(() => {
    setupAiMatch('normal', 'home');
  });

  it('shows attacker-pick-prompt on first render', () => {
    renderWithProviders(<DuelScreen />);
    expect(screen.getByTestId('attacker-pick-prompt')).toBeInTheDocument();
  });

  it('does NOT show cover-continue-btn after human picks', () => {
    renderWithProviders(<DuelScreen />);
    fireEvent.click(screen.getByTestId('card-btn-press'));
    // In AI mode there is no cover screen — result appears immediately
    expect(screen.queryByTestId('cover-continue-btn')).not.toBeInTheDocument();
    expect(screen.getByTestId('duel-result-panel')).toBeInTheDocument();
  });

  it('shows duel-result-panel immediately after human picks any card', () => {
    renderWithProviders(<DuelScreen />);
    fireEvent.click(screen.getByTestId('card-btn-feint'));
    expect(screen.getByTestId('duel-result-panel')).toBeInTheDocument();
  });

  it('shows duel-continue-btn after result', () => {
    renderWithProviders(<DuelScreen />);
    fireEvent.click(screen.getByTestId('card-btn-feint'));
    expect(screen.getByTestId('duel-continue-btn')).toBeInTheDocument();
  });

  it('advances duelIndex by 1 after continuing', () => {
    renderWithProviders(<DuelScreen />);
    expect(useMatchStore.getState().duelIndex).toBe(0);
    playAiDuel('press');
    expect(useMatchStore.getState().duelIndex).toBe(1);
  });

  it('shows scoreboard', () => {
    renderWithProviders(<DuelScreen />);
    expect(screen.getByTestId('scoreboard')).toBeInTheDocument();
  });

  it('shows possession badge', () => {
    renderWithProviders(<DuelScreen />);
    expect(screen.getByTestId('possession-badge')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// DuelScreen — AI attacks (away possession)
// ---------------------------------------------------------------------------

describe('DuelScreen — away possession (AI is attacker)', () => {
  beforeEach(() => {
    setupAiMatch('normal', 'away');
  });

  it('still shows attacker-pick-prompt when AI is attacking', () => {
    renderWithProviders(<DuelScreen />);
    // In AI mode the human always sees the pick prompt (for defender card selection)
    expect(screen.getByTestId('attacker-pick-prompt')).toBeInTheDocument();
  });

  it('resolves and shows result when human picks defender card', () => {
    renderWithProviders(<DuelScreen />);
    fireEvent.click(screen.getByTestId('card-btn-feint'));
    expect(screen.getByTestId('duel-result-panel')).toBeInTheDocument();
  });

  it('no cover-continue-btn when AI is attacker', () => {
    renderWithProviders(<DuelScreen />);
    fireEvent.click(screen.getByTestId('card-btn-press'));
    expect(screen.queryByTestId('cover-continue-btn')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Full half simulation — all three difficulties
// ---------------------------------------------------------------------------

describe('Full half simulation at each AI difficulty', () => {
  it('Easy AI: 5 duels complete, transitions to HALFTIME', () => {
    setupAiMatch('easy');
    renderWithProviders(<DuelScreen />);
    for (let i = 0; i < 5; i++) {
      playAiDuel('press');
    }
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.HALFTIME);
  });

  it('Normal AI: 5 duels complete, transitions to HALFTIME', () => {
    setupAiMatch('normal');
    renderWithProviders(<DuelScreen />);
    for (let i = 0; i < 5; i++) {
      playAiDuel('feint');
    }
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.HALFTIME);
  });

  it('Hard AI: 5 duels complete, transitions to HALFTIME', () => {
    setupAiMatch('hard');
    renderWithProviders(<DuelScreen />);
    for (let i = 0; i < 5; i++) {
      playAiDuel('shot');
    }
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.HALFTIME);
  });

  it('Hard AI with away possession: 5 duels complete, transitions to HALFTIME', () => {
    setupAiMatch('hard', 'away');
    renderWithProviders(<DuelScreen />);
    for (let i = 0; i < 5; i++) {
      playAiDuel('press');
    }
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.HALFTIME);
  });

  it('Easy AI alternating cards: 5 duels complete without errors', () => {
    setupAiMatch('easy');
    renderWithProviders(<DuelScreen />);
    const cards = ['press', 'feint', 'shot', 'press', 'feint'] as const;
    for (const card of cards) {
      playAiDuel(card);
    }
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.HALFTIME);
  });
});

// ---------------------------------------------------------------------------
// playerCardHistory tracking (Hard AI)
// ---------------------------------------------------------------------------

describe('playerCardHistory tracking in AI mode', () => {
  beforeEach(() => {
    setupAiMatch('hard');
  });

  it('starts with empty history', () => {
    expect(useMatchStore.getState().playerCardHistory).toHaveLength(0);
  });

  it('records human card after first pick', () => {
    renderWithProviders(<DuelScreen />);
    fireEvent.click(screen.getByTestId('card-btn-press'));
    fireEvent.click(screen.getByTestId('duel-continue-btn'));
    expect(useMatchStore.getState().playerCardHistory).toContain('press');
  });

  it('history grows with each duel (up to 3)', () => {
    renderWithProviders(<DuelScreen />);
    playAiDuel('press');
    expect(useMatchStore.getState().playerCardHistory).toHaveLength(1);
    playAiDuel('feint');
    expect(useMatchStore.getState().playerCardHistory).toHaveLength(2);
    playAiDuel('shot');
    expect(useMatchStore.getState().playerCardHistory).toHaveLength(3);
  });

  it('history never exceeds 3 entries', () => {
    renderWithProviders(<DuelScreen />);
    const cards = ['press', 'feint', 'shot', 'press', 'feint'] as const;
    for (const card of cards) {
      playAiDuel(card);
      expect(useMatchStore.getState().playerCardHistory.length).toBeLessThanOrEqual(3);
    }
  });

  it('history retains the most recent cards', () => {
    renderWithProviders(<DuelScreen />);
    // Play 4 duels; last 3 should be shot, shot, shot
    playAiDuel('press'); // slot out
    playAiDuel('shot');
    playAiDuel('shot');
    playAiDuel('shot');
    const history = useMatchStore.getState().playerCardHistory;
    expect(history).toEqual(['shot', 'shot', 'shot']);
  });
});
