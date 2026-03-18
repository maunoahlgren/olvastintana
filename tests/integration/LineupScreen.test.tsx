/**
 * @file LineupScreen.test.tsx
 * Integration tests for LineupScreen.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../utils/renderWithProviders';
import LineupScreen from '../../src/components/screens/LineupScreen';
import { useMatchStore } from '../../src/store/matchStore';
import { useSquadStore } from '../../src/store/squadStore';
import { useSessionStore } from '../../src/store/sessionStore';
import { MATCH_PHASE } from '../../src/engine/match';
import playersData from '../../src/data/players.json';

const outfieldPlayers = (playersData as { id: string; position: string[] }[]).filter(
  (p) => p.position.some((pos) => pos === 'MF' || pos === 'FW'),
);
const gkPlayer = (playersData as { id: string; position: string[] }[]).find((p) =>
  p.position.includes('GK'),
)!;

/** Select 6 outfield players and the GK */
function selectFullLineup() {
  // Click first 6 outfield players
  const outfieldGrid = screen.getByTestId('outfield-grid');
  const cards = outfieldGrid.querySelectorAll('[data-testid^="player-card-"]');
  for (let i = 0; i < 6; i++) {
    fireEvent.click(cards[i]);
  }
  // Click the GK
  fireEvent.click(screen.getByTestId(`player-card-${gkPlayer.id}`));
}

describe('LineupScreen', () => {
  beforeEach(() => {
    useMatchStore.getState().reset();
    useMatchStore.getState().beginSoloMatch();
    useSquadStore.getState().reset();
    // Force two-player mode so the away lineup step is presented manually
    useSessionStore.getState().setAiDifficulty(null);
  });

  it('renders the lineup header', () => {
    renderWithProviders(<LineupScreen />);
    expect(screen.getByTestId('lineup-side-header')).toBeInTheDocument();
    expect(screen.getByTestId('lineup-side-header')).toHaveTextContent('Home');
  });

  it('renders outfield player grid', () => {
    renderWithProviders(<LineupScreen />);
    expect(screen.getByTestId('outfield-grid')).toBeInTheDocument();
    // Should show at least 6 outfield players (alanen, mehtonen, etc.)
    expect(outfieldPlayers.length).toBeGreaterThanOrEqual(6);
  });

  it('renders goalkeeper grid', () => {
    renderWithProviders(<LineupScreen />);
    expect(screen.getByTestId('goalkeeper-grid')).toBeInTheDocument();
    expect(screen.getByTestId(`player-card-${gkPlayer.id}`)).toBeInTheDocument();
  });

  it('confirm button is disabled before full lineup is selected', () => {
    renderWithProviders(<LineupScreen />);
    expect(screen.getByTestId('confirm-lineup-btn')).toBeDisabled();
  });

  it('confirm button enabled when 6 outfield + 1 GK selected', () => {
    renderWithProviders(<LineupScreen />);
    selectFullLineup();
    expect(screen.getByTestId('confirm-lineup-btn')).not.toBeDisabled();
  });

  it('home confirming advances to away lineup step', () => {
    renderWithProviders(<LineupScreen />);
    selectFullLineup();
    fireEvent.click(screen.getByTestId('confirm-lineup-btn'));
    expect(screen.getByTestId('lineup-side-header')).toHaveTextContent('Away');
  });

  it('after both lineups confirmed, transitions to FIRST_HALF', () => {
    renderWithProviders(<LineupScreen />);
    // Home picks
    selectFullLineup();
    fireEvent.click(screen.getByTestId('confirm-lineup-btn'));
    // Away picks (same pool available)
    selectFullLineup();
    fireEvent.click(screen.getByTestId('confirm-lineup-btn'));
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.FIRST_HALF);
  });

  it('sets home lineup in squadStore after confirmation', () => {
    renderWithProviders(<LineupScreen />);
    selectFullLineup();
    fireEvent.click(screen.getByTestId('confirm-lineup-btn'));
    expect(useSquadStore.getState().homeLineup).toHaveLength(7);
  });

  it('shows trivia penalty notice when triviaResult is wrong', () => {
    useMatchStore.getState().triviaWrong();
    renderWithProviders(<LineupScreen />);
    expect(screen.getByTestId('trivia-penalty-notice')).toBeInTheDocument();
  });

  it('does not show trivia penalty notice when triviaResult is correct', () => {
    useMatchStore.getState().triviaCorrect();
    renderWithProviders(<LineupScreen />);
    expect(screen.queryByTestId('trivia-penalty-notice')).not.toBeInTheDocument();
  });
});

describe('LineupScreen — redesign features', () => {
  beforeEach(() => {
    useMatchStore.getState().reset();
    useMatchStore.getState().beginSoloMatch();
    useSquadStore.getState().reset();
    useSessionStore.getState().setAiDifficulty(null);
  });

  it('shows composite counter with initial 0/6 and 0/1', () => {
    renderWithProviders(<LineupScreen />);
    const counter = screen.getByTestId('lineup-counter');
    expect(counter).toHaveTextContent('0/6');
    expect(counter).toHaveTextContent('0/1');
  });

  it('counter updates as players are selected', () => {
    renderWithProviders(<LineupScreen />);
    // Click first outfield player in the outfield-grid
    const outfieldGrid = screen.getByTestId('outfield-grid');
    const cards = outfieldGrid.querySelectorAll('[data-testid^="player-card-"]');
    fireEvent.click(cards[0]);
    const counter = screen.getByTestId('lineup-counter');
    expect(counter).toHaveTextContent('1/6');
  });

  it('goalkeeper-grid appears in DOM before outfield-grid', () => {
    renderWithProviders(<LineupScreen />);
    const gkGrid = screen.getByTestId('goalkeeper-grid');
    const outfieldGrid = screen.getByTestId('outfield-grid');
    // compareDocumentPosition: if GK is before outfield, position should include DOCUMENT_POSITION_FOLLOWING
    const position = gkGrid.compareDocumentPosition(outfieldGrid);
    // DOCUMENT_POSITION_FOLLOWING = 4, meaning outfield comes AFTER gkGrid
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('unselected outfield cards have opacity-50 class when outfield is full', () => {
    renderWithProviders(<LineupScreen />);
    const outfieldGrid = screen.getByTestId('outfield-grid');
    const cards = outfieldGrid.querySelectorAll('[data-testid^="player-card-"]');
    // Select 6 outfield players
    for (let i = 0; i < 6; i++) {
      fireEvent.click(cards[i]);
    }
    // The 7th+ outfield card wrappers should be dimmed
    // The wrapper divs around player cards have opacity-50 when slot full and not selected
    const allCardWrappers = outfieldGrid.querySelectorAll('div.relative');
    const dimmedWrappers = Array.from(allCardWrappers).filter(
      (el) => el.className.includes('opacity-50')
    );
    expect(dimmedWrappers.length).toBeGreaterThan(0);
  });
});
