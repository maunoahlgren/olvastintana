/**
 * @file HalftimeScreen.test.tsx
 * Integration tests for HalftimeScreen.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../utils/renderWithProviders';
import HalftimeScreen from '../../src/components/screens/HalftimeScreen';
import { useMatchStore } from '../../src/store/matchStore';
import { useSquadStore } from '../../src/store/squadStore';
import { MATCH_PHASE } from '../../src/engine/match';
import playersData from '../../src/data/players.json';
import type { Player } from '../../src/store/squadStore';

const allPlayers = playersData as Player[];
const outfield = allPlayers.filter((p) => p.position.some((pos) => pos === 'MF' || pos === 'FW'));
const gk = allPlayers.find((p) => p.position.includes('GK'))!;

/** Set up a halftime state using only store actions (more reliable than setState) */
function setupHalftime() {
  useMatchStore.getState().reset();
  useMatchStore.getState().beginSoloMatch(); // TRIVIA, sets possession
  useMatchStore.getState().scoreGoal('home'); // homeGoals = 1, awayGoals = 0
  // Put store in HALFTIME phase
  useMatchStore.getState().advanceDuel(); // advances duelIndex from 0 to 1 (still FIRST_HALF)
  // Push directly to HALFTIME via internal state
  // Use advanceDuel 5 times from duelIndex=0 to hit HALFTIME
  useMatchStore.getState().startFirstHalf(); // FIRST_HALF
  // Advance 5 duels to reach HALFTIME
  for (let i = 0; i < 5; i++) {
    useMatchStore.getState().advanceDuel();
  }
  // Now in HALFTIME
  useSquadStore.getState().reset();
  useSquadStore.getState().setLineup('home', [...outfield.slice(0, 5), gk]);
  useSquadStore.getState().setLineup('away', [...outfield.slice(0, 5), gk]);
}

describe('HalftimeScreen', () => {
  beforeEach(setupHalftime);

  it('renders the halftime score', () => {
    renderWithProviders(<HalftimeScreen />);
    const score = screen.getByTestId('halftime-score');
    // homeGoals=1, awayGoals=0
    expect(score.textContent).toContain('1');
    expect(score.textContent).toContain('0');
  });

  it('renders action buttons', () => {
    renderWithProviders(<HalftimeScreen />);
    expect(screen.getByTestId('action-swap-btn')).toBeInTheDocument();
    expect(screen.getByTestId('action-tactic-btn')).toBeInTheDocument();
    expect(screen.getByTestId('action-skip-btn')).toBeInTheDocument();
  });

  it('renders the start second half button', () => {
    renderWithProviders(<HalftimeScreen />);
    expect(screen.getByTestId('start-second-half-btn')).toBeInTheDocument();
  });

  it('transitions to SECOND_HALF when start button clicked', () => {
    renderWithProviders(<HalftimeScreen />);
    fireEvent.click(screen.getByTestId('start-second-half-btn'));
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.SECOND_HALF);
  });

  it('shows swap sub-UI when swap button is clicked', () => {
    renderWithProviders(<HalftimeScreen />);
    fireEvent.click(screen.getByTestId('action-swap-btn'));
    expect(screen.getByTestId('swap-ui')).toBeInTheDocument();
  });

  it('shows tactic sub-UI when tactic button is clicked', () => {
    renderWithProviders(<HalftimeScreen />);
    fireEvent.click(screen.getByTestId('action-tactic-btn'));
    expect(screen.getByTestId('tactic-ui')).toBeInTheDocument();
  });

  it('can select and confirm a tactic', () => {
    renderWithProviders(<HalftimeScreen />);
    fireEvent.click(screen.getByTestId('action-tactic-btn'));
    fireEvent.click(screen.getByTestId('tactic-aggressive'));
    fireEvent.click(screen.getByTestId('confirm-tactic-btn'));
    expect(useMatchStore.getState().homeTactic).toBe('aggressive');
    expect(useMatchStore.getState().halftimeActionUsed).toBe(true);
  });

  it('shows "action used" notice after action is taken', () => {
    renderWithProviders(<HalftimeScreen />);
    fireEvent.click(screen.getByTestId('action-tactic-btn'));
    fireEvent.click(screen.getByTestId('tactic-defensive'));
    fireEvent.click(screen.getByTestId('confirm-tactic-btn'));
    expect(screen.getByTestId('action-used-notice')).toBeInTheDocument();
  });

  it('hides action buttons when halftimeActionUsed is true', () => {
    useMatchStore.getState().useHalftimeAction();
    renderWithProviders(<HalftimeScreen />);
    expect(screen.queryByTestId('action-swap-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('action-tactic-btn')).not.toBeInTheDocument();
  });

  it('performs a player swap and marks action used', () => {
    renderWithProviders(<HalftimeScreen />);
    fireEvent.click(screen.getByTestId('action-swap-btn'));
    const firstOutfieldPlayer = outfield[0];
    fireEvent.click(screen.getByTestId(`swap-out-${firstOutfieldPlayer.id}`));

    const swapInCandidate = allPlayers.find(
      (p) =>
        !outfield.slice(0, 5).some((op) => op.id === p.id) &&
        p.id !== gk.id &&
        p.position.some((pos) => pos === 'MF' || pos === 'FW'),
    );
    if (swapInCandidate) {
      fireEvent.click(screen.getByTestId(`swap-in-${swapInCandidate.id}`));
      fireEvent.click(screen.getByTestId('confirm-swap-btn'));
      expect(useMatchStore.getState().halftimeActionUsed).toBe(true);
    }
  });
});
