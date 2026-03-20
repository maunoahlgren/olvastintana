/**
 * @file match_flow.test.tsx
 * Full solo match flow integration test.
 *
 * Covers the complete path through App routing:
 *   TITLE → SEASON → PREMATCH → TRIVIA → LINEUP → FIRST_HALF →
 *   HALFTIME → SECOND_HALF → RESULT → SEASON
 *
 * Tests that use beginSoloMatch() directly still bypass the season screens
 * and jump straight to TRIVIA — this is intentional for speed.
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
import { useSeasonStore } from '../../src/store/seasonStore';
import { MATCH_PHASE } from '../../src/engine/match';
import playersData from '../../src/data/players.json';
import type { Opponent } from '../../src/engine/season';
import opponentsData from '../../src/data/opponents.json';

// ---------------------------------------------------------------------------
// Player data helpers
// ---------------------------------------------------------------------------

type PlayerRow = { id: string; position: string[] };
const allPlayers = playersData as PlayerRow[];
const outfieldPlayers = allPlayers.filter((p) =>
  p.position.some((pos) => pos === 'MF' || pos === 'FW'),
);
const gkPlayer = allPlayers.find((p) => p.position.includes('GK'))!;

const opponents = opponentsData as Opponent[];

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
 * 1. Attacker picks a character
 * 2. Attacker picks a card
 * 3. Cover screen → continue
 * 4. Defender picks a character
 * 5. Defender picks a card
 * 6. Result panel → continue
 *
 * @param attackerCard - Card choice for the attacker
 * @param defenderCard - Card choice for the defender
 */
function playOneDuel(
  attackerCard: 'press' | 'feint' | 'shot' = 'press',
  defenderCard: 'press' | 'feint' | 'shot' = 'feint',
): void {
  expect(screen.getByTestId('attacker-char-pick-prompt')).toBeInTheDocument();
  // Pick first available character
  const atkCharBtns = document.querySelectorAll('[data-testid^="char-btn-"]');
  fireEvent.click(atkCharBtns[0]);

  expect(screen.getByTestId('attacker-pick-prompt')).toBeInTheDocument();
  fireEvent.click(screen.getByTestId(`card-btn-${attackerCard}`));

  expect(screen.getByTestId('cover-continue-btn')).toBeInTheDocument();
  fireEvent.click(screen.getByTestId('cover-continue-btn'));

  expect(screen.getByTestId('defender-char-pick-prompt')).toBeInTheDocument();
  const defCharBtns = document.querySelectorAll('[data-testid^="char-btn-"]');
  fireEvent.click(defCharBtns[0]);

  expect(screen.getByTestId('defender-pick-prompt')).toBeInTheDocument();
  fireEvent.click(screen.getByTestId(`card-btn-${defenderCard}`));

  expect(screen.getByTestId('duel-result-panel')).toBeInTheDocument();
  fireEvent.click(screen.getByTestId('duel-continue-btn'));
}

/**
 * Play all 5 duels of a half.
 * Dismisses the stamina warning panel if it is shown at the start of a half.
 */
function playFullHalf(): void {
  const staminaBtn = screen.queryByTestId('stamina-warning-continue-btn');
  if (staminaBtn) {
    fireEvent.click(staminaBtn);
  }
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
    useSeasonStore.getState().reset();
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

  // ── TITLE → SEASON ────────────────────────────────────────────────────────

  it('clicking Start Season advances to SeasonScreen', () => {
    renderWithProviders(<App />);
    fireEvent.click(screen.getByTestId('start-solo-btn'));
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.SEASON);
    expect(screen.getByTestId('season-screen')).toBeInTheDocument();
  });

  // ── SEASON → PREMATCH ─────────────────────────────────────────────────────

  it('clicking Play Next Match from SeasonScreen advances to PreMatchScreen', () => {
    useSeasonStore.getState().initSeason(opponents);
    useMatchStore.getState().startSeason();
    renderWithProviders(<App />);
    fireEvent.click(screen.getByTestId('season-play-next-btn'));
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.PREMATCH);
    expect(screen.getByTestId('prematch-screen')).toBeInTheDocument();
  });

  // ── PREMATCH → TRIVIA ─────────────────────────────────────────────────────

  it('clicking Kick Off from PreMatchScreen advances to TriviaScreen', () => {
    useSeasonStore.getState().initSeason(opponents);
    useMatchStore.getState().goToPreMatch();
    renderWithProviders(<App />);
    fireEvent.click(screen.getByTestId('prematch-kickoff-btn'));
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.TRIVIA);
    expect(screen.getByTestId('trivia-question-card')).toBeInTheDocument();
  });

  // ── Trivia screen (uses beginSoloMatch shortcut) ──────────────────────────

  it('floating language toggle visible on TriviaScreen', () => {
    useMatchStore.getState().beginSoloMatch();
    renderWithProviders(<App />);
    expect(screen.getByTestId('language-toggle')).toBeInTheDocument();
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

  it('answering trivia wrong shows penalty picker then advances to LineupScreen after confirm', () => {
    useMatchStore.getState().beginSoloMatch();
    renderWithProviders(<App />);
    fireEvent.click(screen.getByTestId('reveal-answer-btn'));
    fireEvent.click(screen.getByTestId('trivia-wrong-btn'));
    // Penalty picker appears — phase not advanced yet
    expect(screen.getByTestId('trivia-penalty-picker')).toBeInTheDocument();
    // Pick first available player
    const firstPenaltyBtn = document.querySelector('[data-testid^="penalty-pick-"]') as HTMLElement;
    fireEvent.click(firstPenaltyBtn);
    fireEvent.click(screen.getByTestId('penalty-confirm-btn'));
    // Now on lineup screen
    expect(screen.getByTestId('lineup-side-header')).toBeInTheDocument();
  });

  // ── LINEUP → FIRST HALF ───────────────────────────────────────────────────

  it('completing both lineups advances to DuelScreen (FIRST_HALF)', () => {
    useMatchStore.getState().beginSoloMatch();
    useMatchStore.getState().triviaCorrect();
    renderWithProviders(<App />);

    pickFullLineup();
    fireEvent.click(screen.getByTestId('confirm-lineup-btn'));
    pickFullLineup();
    fireEvent.click(screen.getByTestId('confirm-lineup-btn'));

    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.FIRST_HALF);
    expect(screen.getByTestId('attacker-char-pick-prompt')).toBeInTheDocument();
  });

  // ── FIRST HALF → HALFTIME ─────────────────────────────────────────────────

  it('after 5 duels in first half, shows HalftimeScreen', () => {
    useMatchStore.getState().beginSoloMatch();
    useMatchStore.getState().triviaCorrect();
    useMatchStore.getState().startFirstHalf();
    // Set lineups so char pick buttons are available in playOneDuel()
    useSquadStore.getState().setLineup('home', [...outfieldPlayers.slice(0, 6), gkPlayer]);
    useSquadStore.getState().setLineup('away', [...outfieldPlayers.slice(0, 6), gkPlayer]);

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
    expect(screen.getByTestId('start-second-half-btn')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('start-second-half-btn'));

    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.SECOND_HALF);
    // Second half starts — may show stamina_warning or char pick prompt
    const hasCharPick = screen.queryByTestId('attacker-char-pick-prompt');
    const hasStaminaWarning = screen.queryByTestId('stamina-warning-panel');
    expect(hasCharPick || hasStaminaWarning).toBeTruthy();
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
    // Set lineups so char pick buttons are available in playOneDuel()
    useSquadStore.getState().setLineup('home', [...outfieldPlayers.slice(0, 6), gkPlayer]);
    useSquadStore.getState().setLineup('away', [...outfieldPlayers.slice(0, 6), gkPlayer]);

    renderWithProviders(<App />);

    playFullHalf();

    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.RESULT);
    expect(screen.getByTestId('result-banner')).toBeInTheDocument();
    expect(screen.getByTestId('continue-to-season-btn')).toBeInTheDocument();
  });

  // ── RESULT → SEASON (Continue button) ────────────────────────────────────

  it('Continue on ResultScreen navigates to SeasonScreen', () => {
    // Initialize season first so Continue button works
    useSeasonStore.getState().initSeason(opponents);
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

    fireEvent.click(screen.getByTestId('continue-to-season-btn'));

    // Should be on SeasonScreen (phase = SEASON)
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.SEASON);
    expect(screen.getByTestId('season-screen')).toBeInTheDocument();
  });

  // ── LANGUAGE TOGGLE ───────────────────────────────────────────────────────

  it('language toggle switches text EN ↔ FI', () => {
    useMatchStore.getState().beginSoloMatch();
    renderWithProviders(<App />);

    const toggle = screen.getByTestId('language-toggle');
    const initialText = toggle.textContent;

    fireEvent.click(toggle);

    const afterText = toggle.textContent;
    expect(afterText).not.toBe(initialText);
  });
});
