/**
 * @file PreMatchScreen.test.tsx
 * Integration tests for PreMatchScreen.
 *
 * Tests: opponent info display, tier badge, flavour text, kick-off navigation,
 * AI difficulty mapped from opponent tier.
 *
 * flavour_texts.json is mocked with a single entry for deterministic output.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../utils/renderWithProviders';
import PreMatchScreen from '../../src/components/screens/PreMatchScreen';
import { useMatchStore } from '../../src/store/matchStore';
import { useSeasonStore } from '../../src/store/seasonStore';
import { useSessionStore } from '../../src/store/sessionStore';
import { MATCH_PHASE } from '../../src/engine/match';
import type { Opponent, Fixture } from '../../src/engine/season';

vi.mock('../../src/data/flavour_texts.json', () => ({
  default: {
    prematch_flavour: [
      {
        id: 'test_flavour',
        text_fi: 'Testilauseke suomeksi.',
        text_en: 'Test flavour text in English.',
      },
    ],
  },
}));

// ---------------------------------------------------------------------------
// Fixture helpers — inject synthetic fixtures into the store
// ---------------------------------------------------------------------------

/** Build a minimal Fixture with a specific tier */
function makeFixture(tier: 'hard' | 'normal' | 'easy', name: string): Fixture {
  const opponent: Opponent = {
    id: `test_${tier}`,
    name,
    tier,
    strength_score: tier === 'hard' ? 80 : tier === 'normal' ? 50 : 20,
    seasons: 3,
    titles: 1,
    record: { w: 20, d: 5, l: 10 },
    goals: { for: 80, against: 40 },
    ppg: 1.8,
    win_rate: 0.57,
  };
  return { matchNumber: 1, opponent, result: null };
}

/**
 * Inject a single fixture as the current fixture (at index 0).
 */
function setCurrentFixture(fixture: Fixture): void {
  useSeasonStore.setState({ fixtures: [fixture], currentFixtureIndex: 0 });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PreMatchScreen', () => {
  beforeEach(() => {
    useMatchStore.getState().reset();
    useSeasonStore.getState().reset();
    useSessionStore.getState().reset();
  });

  // ── Rendering ─────────────────────────────────────────────────────────────

  it('renders the prematch screen root', () => {
    setCurrentFixture(makeFixture('normal', 'Test FC'));
    renderWithProviders(<PreMatchScreen />);
    expect(screen.getByTestId('prematch-screen')).toBeInTheDocument();
  });

  it('shows the opponent name', () => {
    setCurrentFixture(makeFixture('normal', 'FC Oluthuone'));
    renderWithProviders(<PreMatchScreen />);
    expect(screen.getByTestId('prematch-opponent-name')).toHaveTextContent('FC Oluthuone');
  });

  it('shows the tier badge', () => {
    setCurrentFixture(makeFixture('hard', 'FC Kylmärinki'));
    renderWithProviders(<PreMatchScreen />);
    expect(screen.getByTestId('prematch-tier-badge')).toBeInTheDocument();
  });

  it('shows the kick off button', () => {
    setCurrentFixture(makeFixture('easy', 'Big Balls'));
    renderWithProviders(<PreMatchScreen />);
    expect(screen.getByTestId('prematch-kickoff-btn')).toBeInTheDocument();
  });

  it('shows the opponent record (W/D/L)', () => {
    setCurrentFixture(makeFixture('normal', 'Test FC'));
    renderWithProviders(<PreMatchScreen />);
    expect(screen.getByTestId('prematch-record')).toBeInTheDocument();
  });

  // ── Tier badge content ─────────────────────────────────────────────────────

  it('hard tier shows hard label', () => {
    setCurrentFixture(makeFixture('hard', 'Hard FC'));
    renderWithProviders(<PreMatchScreen />);
    expect(screen.getByTestId('prematch-tier-badge').textContent).toContain('Hard');
  });

  it('normal tier shows normal label', () => {
    setCurrentFixture(makeFixture('normal', 'Normal FC'));
    renderWithProviders(<PreMatchScreen />);
    expect(screen.getByTestId('prematch-tier-badge').textContent).toContain('Normal');
  });

  it('easy tier shows easy label', () => {
    setCurrentFixture(makeFixture('easy', 'Easy FC'));
    renderWithProviders(<PreMatchScreen />);
    expect(screen.getByTestId('prematch-tier-badge').textContent).toContain('Easy');
  });

  // ── Flavour text ───────────────────────────────────────────────────────────

  it('shows a flavour text from flavour_texts.json (English locale)', () => {
    setCurrentFixture(makeFixture('normal', 'Test FC'));
    renderWithProviders(<PreMatchScreen />);
    // Test environment defaults to English — expect English flavour text
    expect(screen.getByTestId('prematch-flavour').textContent).toBe(
      'Test flavour text in English.'
    );
  });

  it('flavour element is present', () => {
    setCurrentFixture(makeFixture('hard', 'Hard FC'));
    renderWithProviders(<PreMatchScreen />);
    expect(screen.getByTestId('prematch-flavour')).toBeInTheDocument();
  });

  // ── Quit button ───────────────────────────────────────────────────────────

  it('renders the quit match button', () => {
    setCurrentFixture(makeFixture('normal', 'Test FC'));
    renderWithProviders(<PreMatchScreen />);
    expect(screen.getByTestId('quit-match-btn')).toBeInTheDocument();
  });

  it('shows quit button even when fixture is missing (loading guard state)', () => {
    // No fixture set — renders the loading guard
    renderWithProviders(<PreMatchScreen />);
    expect(screen.getByTestId('quit-match-btn')).toBeInTheDocument();
  });

  // ── Kick Off navigation ───────────────────────────────────────────────────

  it('clicking Kick Off sets phase to TRIVIA', () => {
    setCurrentFixture(makeFixture('normal', 'Test FC'));
    renderWithProviders(<PreMatchScreen />);
    fireEvent.click(screen.getByTestId('prematch-kickoff-btn'));
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.TRIVIA);
  });

  // ── AI difficulty mapped from tier ────────────────────────────────────────

  it('hard opponent → sets aiDifficulty="hard"', () => {
    setCurrentFixture(makeFixture('hard', 'Hard FC'));
    renderWithProviders(<PreMatchScreen />);
    fireEvent.click(screen.getByTestId('prematch-kickoff-btn'));
    expect(useSessionStore.getState().aiDifficulty).toBe('hard');
  });

  it('normal opponent → sets aiDifficulty="normal"', () => {
    setCurrentFixture(makeFixture('normal', 'Normal FC'));
    renderWithProviders(<PreMatchScreen />);
    fireEvent.click(screen.getByTestId('prematch-kickoff-btn'));
    expect(useSessionStore.getState().aiDifficulty).toBe('normal');
  });

  it('easy opponent → sets aiDifficulty="easy"', () => {
    setCurrentFixture(makeFixture('easy', 'Easy FC'));
    renderWithProviders(<PreMatchScreen />);
    fireEvent.click(screen.getByTestId('prematch-kickoff-btn'));
    expect(useSessionStore.getState().aiDifficulty).toBe('easy');
  });
});
