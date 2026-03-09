/**
 * @file match_flow.test.tsx
 * Full solo match flow integration test.
 *
 * Covers the complete path from TitleScreen → TriviaScreen → LineupScreen →
 * DuelScreen (10 duels) → HalftimeScreen → DuelScreen (10 duels) →
 * ResultScreen, verifying that App renders the correct screen at each phase
 * and all navigation works end-to-end.
 *
 * Uses store actions exclusively for setup; never sets store state directly.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../utils/renderWithProviders';
import App from '../../src/App';
import { useMatchStore } from '../../src/store/matchStore';
import { useSquadStore } from '../../src/store/squadStore';
import { useSessionStore } from '../../src/store/sessionStore';
import { MATCH_PHASE } from '../../src/engine/match';
import playersData from '../../src/data/players.json';

// ---------------------------------------------------------------------------
// Player data helpers
// ---------------------------------------------------------------------------

type PlayerRow = { id: string; position: string[] };
const allPlayers = playersData as PlayerRow[];
const outfieldPlayers = allPlayers.filter((p) =>
  p.position.some((pos) => pos === 'MF' || pos === 'FW'),
);
const gkPlayer = allPlayers.find((p) => p.position.includes('GK'))!;

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

/**
 * Select 6 outfield + 1 GK from whichever grid is currently visible.
 */
function pickFullLineup(): void {
  const outfieldGrid = screen.getByTestId('outfield-grid');
  const cards = outfieldGrid.querySelectorAll('[data-testid^="player-card-"]');
  for (let i = 0; i < 6; i++) {
    fireEvent.click(cards[i]);
  }
  fireEvent.click(screen.getByTestId(`player-card-${gkPlayer.id}`));
}

/**
 * Play a single duel through the DuelScreen UI:
 * 1. Attacker picks a card
 * 2. Cover screen → continue
 * 3. Defender picks a card
 * 4. Result panel → continue
 *
 * @param attackerCard - CSS selector suffix for the attacker's card button (press/feint/shot)
 * @param defenderCard - CSS selector suffix for the defender's card button
 */
function playOneDuel(
  attackerCard: 'press' | 'feint' | 'shot' = 'press',
  defenderCard: 'press' | 'feint' | 'shot' = 'feint',
): void {
  // Attacker picks
  expect(screen.getByTestId('attacker-pick-prompt')).toBeInTheDocument();
  fireEvent.click(screen.getByTestId(`card-btn-${attackerCard}`));

  // Cover screen
  expect(screen.getByTestId('cover-continue-btn')).toBeInTheDocument();
  fireEvent.click(screen.getByTestId('cover-continue-btn'));

  // Defender picks
  expect(screen.getByTestId('defender-pick-prompt')).toBeInTheDocument();
  fireEvent.click(screen.getByTestId(`card-btn-${defenderCard}`));

  // Result → advance
  expect(screen.getByTestId('duel-result-panel')).toBeInTheDocument();
  fireEvent.click(screen.getByTestId('duel-continue-btn'));
}

/**
 * Play all 5 duels of a half.
 */
function playFullHalf(): void {
  for (let i = 0; i < 5; i++) {
    playOneDuel();
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Full solo match flow (App routing)', () => {
  beforeEach(() => {
    useMatchStore.getState().reset();
    useSquadStore.getState().reset();
    // Force two-player mode so the cover screen is present in playOneDuel()
    useSessionStore.getState().setAiDifficulty(null);
  });

  // ── TITLE SCREEN ──────────────────────────────────────────────────────────

  it('renders TitleScreen on TITLE phase', () => {
    renderWithProviders(<App />);
    expect(screen.getByTestId('start-solo-btn')).toBeInTheDocument();
  });

  it('language toggle is present on TitleScreen', () => {
    renderWithProviders(<App />);
    // TitleScreen embeds its own toggle; current lang is FI so toggle shows EN
    expect(screen.getByText('EN')).toBeInTheDocument();
  });

  // ── TITLE → TRIVIA ────────────────────────────────────────────────────────

  it('clicking Start Solo Match advances to TriviaScreen', () => {
    renderWithProviders(<App />);
    fireEvent.click(screen.getByTestId('start-solo-btn'));
    expect(screen.getByTestId('trivia-question-card')).toBeInTheDocument();
  });

  it('floating language toggle visible on TriviaScreen', () => {
    useMatchStore.getState().beginSoloMatch();
    renderWithProviders(<App />);
    // Phase is now TRIVIA; App renders floating toggle
    expect(screen.getByText('EN')).toBeInTheDocument();
    expect(screen.getByTestId('trivia-question-card')).toBeInTheDocument();
  });

  // ── TRIVIA → LINEUP ───────────────────────────────────────────────────────

  it('answering trivia correctly advances to LineupScreen', () => {
    useMatchStore.getState().beginSoloMatch();
    renderWithProviders(<App />);
    fireEvent.click(screen.getByTestId('reveal-answer-btn'));
    fireEvent.click(screen.getByTestId('trivia-correct-btn'));
    expect(screen.getByTestId('lineup-side-header')).toBeInTheDocument();
  });

  it('answering trivia wrong also advances to LineupScreen', () => {
    useMatchStore.getState().beginSoloMatch();
    renderWithProviders(<App />);
    fireEvent.click(screen.getByTestId('reveal-answer-btn'));
    fireEvent.click(screen.getByTestId('trivia-wrong-btn'));
    expect(screen.getByTestId('lineup-side-header')).toBeInTheDocument();
  });

  // ── LINEUP → FIRST HALF ───────────────────────────────────────────────────

  it('completing both lineups advances to DuelScreen (FIRST_HALF)', () => {
    useMatchStore.getState().beginSoloMatch();
    useMatchStore.getState().triviaCorrect();
    renderWithProviders(<App />);

    // Home lineup
    pickFullLineup();
    fireEvent.click(screen.getByTestId('confirm-lineup-btn'));
    // Away lineup
    pickFullLineup();
    fireEvent.click(screen.getByTestId('confirm-lineup-btn'));

    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.FIRST_HALF);
    expect(screen.getByTestId('attacker-pick-prompt')).toBeInTheDocument();
  });

  // ── FIRST HALF → HALFTIME ─────────────────────────────────────────────────

  it('after 5 duels in first half, shows HalftimeScreen', () => {
    // Drive to FIRST_HALF via store actions
    useMatchStore.getState().beginSoloMatch();
    useMatchStore.getState().triviaCorrect();
    useMatchStore.getState().startFirstHalf();

    renderWithProviders(<App />);

    playFullHalf();

    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.HALFTIME);
    expect(screen.getByTestId('halftime-score')).toBeInTheDocument();
    expect(screen.getByTestId('start-second-half-btn')).toBeInTheDocument();
  });

  // ── HALFTIME → SECOND HALF ────────────────────────────────────────────────

  it('clicking Start Second Half advances to DuelScreen (SECOND_HALF)', () => {
    useMatchStore.getState().beginSoloMatch();
    useMatchStore.getState().triviaCorrect();
    useMatchStore.getState().startFirstHalf();
    for (let i = 0; i < 5; i++) {
      useMatchStore.getState().advanceDuel();
    }

    renderWithProviders(<App />);
    // Should be on HalftimeScreen
    expect(screen.getByTestId('start-second-half-btn')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('start-second-half-btn'));

    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.SECOND_HALF);
    expect(screen.getByTestId('attacker-pick-prompt')).toBeInTheDocument();
  });

  // ── SECOND HALF → RESULT ──────────────────────────────────────────────────

  it('after 5 duels in second half, shows ResultScreen', () => {
    useMatchStore.getState().beginSoloMatch();
    useMatchStore.getState().triviaCorrect();
    useMatchStore.getState().startFirstHalf();
    for (let i = 0; i < 5; i++) {
      useMatchStore.getState().advanceDuel();
    }
    useMatchStore.getState().startSecondHalf();

    renderWithProviders(<App />);

    playFullHalf();

    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.RESULT);
    expect(screen.getByTestId('result-banner')).toBeInTheDocument();
    expect(screen.getByTestId('play-again-btn')).toBeInTheDocument();
  });

  // ── RESULT → TITLE (Play Again) ───────────────────────────────────────────

  it('Play Again on ResultScreen resets to TitleScreen', () => {
    // Drive directly to RESULT using store actions
    useMatchStore.getState().beginSoloMatch();
    useMatchStore.getState().triviaCorrect();
    useMatchStore.getState().startFirstHalf();
    for (let i = 0; i < 5; i++) {
      useMatchStore.getState().advanceDuel();
    }
    useMatchStore.getState().startSecondHalf();
    for (let i = 0; i < 5; i++) {
      useMatchStore.getState().advanceDuel();
    }

    renderWithProviders(<App />);
    expect(screen.getByTestId('result-banner')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('play-again-btn'));

    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.TITLE);
    expect(screen.getByTestId('start-solo-btn')).toBeInTheDocument();
  });

  // ── LANGUAGE TOGGLE ───────────────────────────────────────────────────────

  it('language toggle switches text EN ↔ FI', () => {
    // TriviaScreen is a stable screen for this test
    useMatchStore.getState().beginSoloMatch();
    renderWithProviders(<App />);

    // Starts in EN (test env default), toggle button says 'FI' (switch to Finnish)
    const toggle = screen.getByRole('button', { name: /FI|EN/i });
    const initialText = toggle.textContent;

    fireEvent.click(toggle);

    const afterText = toggle.textContent;
    expect(afterText).not.toBe(initialText);
  });
});
