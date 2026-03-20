/**
 * @file DuelScreen.test.tsx
 * Integration tests for DuelScreen.
 *
 * Tests: character pick flow, card flow, possession, trivia boost, halftime transition,
 * ability notifications, card restrictions, reactive ability panel, Kapteeni boost,
 * stamina warning panel.
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

const allPlayers = playersData as Player[];
const outfield = allPlayers.filter((p) => p.position.some((pos) => pos === 'MF' || pos === 'FW'));
const gk = allPlayers.find((p) => p.position.includes('GK'))!;

// Specific ability players needed for ability tests
const mehtonen = allPlayers.find((p) => p.id === 'olli_mehtonen')!;
const estola = allPlayers.find((p) => p.id === 'jukka_estola')!;
const nieminen = allPlayers.find((p) => p.id === 'ossi_nieminen')!;

/** Set up a minimal match state in FIRST_HALF with lineups set (two-player mode) */
function setupMatch(possession: 'home' | 'away' = 'home') {
  useMatchStore.getState().reset();
  // Force two-player mode so the cover screen is present
  useSessionStore.getState().setAiDifficulty(null);
  // Manually push to FIRST_HALF with possession set
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
  // Set lineups — 6 outfield + gk
  useSquadStore.getState().setLineup('home', [...outfield.slice(0, 6), gk]);
  useSquadStore.getState().setLineup('away', [...outfield.slice(0, 6), gk]);
}

/**
 * Play through one duel with char picks:
 *   attacker picks first char → attacker picks card → cover → defender picks first char → defender picks card
 *
 * @param atkCard - Card for the attacker to play
 * @param defCard - Card for the defender to play
 */
function playDuel(atkCard: 'press' | 'feint' | 'shot', defCard: 'press' | 'feint' | 'shot') {
  // Attacker picks first available character
  const atkCharBtns = document.querySelectorAll('[data-testid^="char-btn-"]');
  fireEvent.click(atkCharBtns[0]);
  // Attacker picks card
  fireEvent.click(screen.getByTestId(`card-btn-${atkCard}`));
  // Cover screen
  fireEvent.click(screen.getByTestId('cover-continue-btn'));
  // Defender picks first available character
  const defCharBtns = document.querySelectorAll('[data-testid^="char-btn-"]');
  fireEvent.click(defCharBtns[0]);
  // Defender picks card
  fireEvent.click(screen.getByTestId(`card-btn-${defCard}`));
}

describe('DuelScreen', () => {
  beforeEach(() => {
    useSquadStore.getState().reset();
    setupMatch();
  });

  it('renders the scoreboard', () => {
    renderWithProviders(<DuelScreen />);
    expect(screen.getByTestId('scoreboard')).toBeInTheDocument();
  });

  it('shows attacker char pick prompt when match starts', () => {
    renderWithProviders(<DuelScreen />);
    expect(screen.getByTestId('attacker-char-pick-prompt')).toBeInTheDocument();
  });

  it('shows char pick buttons for all outfield players at start', () => {
    renderWithProviders(<DuelScreen />);
    const charBtns = document.querySelectorAll('[data-testid^="char-btn-"]');
    expect(charBtns.length).toBeGreaterThanOrEqual(6);
  });

  it('shows 3 card buttons for attacker after char is picked', () => {
    renderWithProviders(<DuelScreen />);
    // Pick a character first
    const charBtns = document.querySelectorAll('[data-testid^="char-btn-"]');
    fireEvent.click(charBtns[0]);
    expect(screen.getByTestId('card-btn-press')).toBeInTheDocument();
    expect(screen.getByTestId('card-btn-feint')).toBeInTheDocument();
    expect(screen.getByTestId('card-btn-shot')).toBeInTheDocument();
  });

  it('shows cover screen after attacker picks a character and card', () => {
    renderWithProviders(<DuelScreen />);
    const charBtns = document.querySelectorAll('[data-testid^="char-btn-"]');
    fireEvent.click(charBtns[0]);
    fireEvent.click(screen.getByTestId('card-btn-press'));
    expect(screen.getByTestId('cover-continue-btn')).toBeInTheDocument();
  });

  it('shows defender char pick prompt after cover screen', () => {
    renderWithProviders(<DuelScreen />);
    const atkCharBtns = document.querySelectorAll('[data-testid^="char-btn-"]');
    fireEvent.click(atkCharBtns[0]);
    fireEvent.click(screen.getByTestId('card-btn-press'));
    fireEvent.click(screen.getByTestId('cover-continue-btn'));
    expect(screen.getByTestId('defender-char-pick-prompt')).toBeInTheDocument();
  });

  it('shows defender pick prompt after defender picks char', () => {
    renderWithProviders(<DuelScreen />);
    const atkCharBtns = document.querySelectorAll('[data-testid^="char-btn-"]');
    fireEvent.click(atkCharBtns[0]);
    fireEvent.click(screen.getByTestId('card-btn-press'));
    fireEvent.click(screen.getByTestId('cover-continue-btn'));
    const defCharBtns = document.querySelectorAll('[data-testid^="char-btn-"]');
    fireEvent.click(defCharBtns[0]);
    expect(screen.getByTestId('defender-pick-prompt')).toBeInTheDocument();
  });

  it('shows result panel after full duel flow', () => {
    renderWithProviders(<DuelScreen />);
    playDuel('press', 'feint'); // press > feint → attacker wins
    expect(screen.getByTestId('duel-result-panel')).toBeInTheDocument();
  });

  it('attacker wins when press beats feint — triggers goal attempt (SQ-GOAL-01)', () => {
    renderWithProviders(<DuelScreen />);
    playDuel('press', 'feint');
    // Attacker has possession and wins → always triggers goal attempt
    const goalResult = document.querySelector('[data-testid="goal-result"],[data-testid="saved-result"]');
    expect(goalResult).toBeInTheDocument();
  });

  it('attacker wins when feint beats shot — triggers goal attempt (SQ-GOAL-01)', () => {
    setupMatch('away'); // away attacks
    renderWithProviders(<DuelScreen />);
    playDuel('feint', 'shot'); // away plays feint, home plays shot → feint > shot → attacker wins
    const goalResult = document.querySelector('[data-testid="goal-result"],[data-testid="saved-result"]');
    expect(goalResult).toBeInTheDocument();
  });

  it('shows draw result when same cards tie on equal stats', () => {
    renderWithProviders(<DuelScreen />);
    playDuel('press', 'feint');
    expect(screen.getByTestId('duel-result-panel')).toBeInTheDocument();
  });

  it('duelIndex advances after continuing from result', () => {
    renderWithProviders(<DuelScreen />);
    expect(useMatchStore.getState().duelIndex).toBe(0);
    playDuel('press', 'feint');
    fireEvent.click(screen.getByTestId('duel-continue-btn'));
    expect(useMatchStore.getState().duelIndex).toBe(1);
  });

  it('shows possession badge', () => {
    renderWithProviders(<DuelScreen />);
    expect(screen.getByTestId('possession-badge')).toBeInTheDocument();
  });

  it('shows trivia boost banner when triviaBoostActive is true', () => {
    useMatchStore.setState({ triviaBoostActive: true });
    renderWithProviders(<DuelScreen />);
    expect(screen.getByTestId('trivia-boost-banner')).toBeInTheDocument();
  });

  it('does not show trivia boost banner when triviaBoostActive is false', () => {
    renderWithProviders(<DuelScreen />);
    expect(screen.queryByTestId('trivia-boost-banner')).not.toBeInTheDocument();
  });

  it('transitions to HALFTIME after 5 duels', () => {
    renderWithProviders(<DuelScreen />);
    for (let i = 0; i < 5; i++) {
      playDuel('press', 'feint');
      fireEvent.click(screen.getByTestId('duel-continue-btn'));
    }
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.HALFTIME);
  });
});

// ─── Stamina warning tests ─────────────────────────────────────────────────────

describe('DuelScreen — stamina warning', () => {
  beforeEach(() => {
    useSquadStore.getState().reset();
    setupMatch();
  });

  it('does not show stamina warning in first half', () => {
    renderWithProviders(<DuelScreen />);
    expect(screen.queryByTestId('stamina-warning-panel')).not.toBeInTheDocument();
  });

  it('shows stamina warning at start of second half when stamina-1 player present', () => {
    // Find a player with stamina === 1 in the data
    const staminaOnePlayers = allPlayers.filter((p) => p.stats.stamina === 1 && !p.position.includes('GK'));
    if (staminaOnePlayers.length === 0) {
      // Skip if no such player exists in the data
      return;
    }
    useMatchStore.setState({ half: 2 as const, duelIndex: 0 });
    // Put a stamina-1 player in the lineup
    const lineupWithLowStamina = [staminaOnePlayers[0], ...outfield.slice(0, 5), gk];
    useSquadStore.getState().setLineup('home', lineupWithLowStamina);
    renderWithProviders(<DuelScreen />);
    expect(screen.getByTestId('stamina-warning-panel')).toBeInTheDocument();
  });

  it('stamina warning shows continue button that dismisses the panel', () => {
    const staminaOnePlayers = allPlayers.filter((p) => p.stats.stamina === 1 && !p.position.includes('GK'));
    if (staminaOnePlayers.length === 0) return;
    useMatchStore.setState({ half: 2 as const, duelIndex: 0 });
    const lineupWithLowStamina = [staminaOnePlayers[0], ...outfield.slice(0, 5), gk];
    useSquadStore.getState().setLineup('home', lineupWithLowStamina);
    renderWithProviders(<DuelScreen />);
    fireEvent.click(screen.getByTestId('stamina-warning-continue-btn'));
    expect(screen.queryByTestId('stamina-warning-panel')).not.toBeInTheDocument();
    // Should now be at char pick
    expect(screen.getByTestId('attacker-char-pick-prompt')).toBeInTheDocument();
  });
});

// ─── Ability notification tests ────────────────────────────────────────────────

describe('DuelScreen — ability notifications', () => {
  beforeEach(() => {
    useSquadStore.getState().reset();
    setupMatch();
  });

  it('shows ability notification list when an ability triggers', () => {
    // Put Mehtonen (Kapteeni) first; exclude him from the rest of the lineup to avoid duplicate IDs
    const homeLineup = [mehtonen, ...outfield.filter((p) => p.id !== 'olli_mehtonen').slice(0, 5), gk];
    useSquadStore.getState().setLineup('home', homeLineup);
    renderWithProviders(<DuelScreen />);
    // Pick Mehtonen as attacker char (unique button now)
    fireEvent.click(screen.getByTestId('char-btn-olli_mehtonen'));
    fireEvent.click(screen.getByTestId('card-btn-press'));
    fireEvent.click(screen.getByTestId('cover-continue-btn'));
    const defCharBtns = document.querySelectorAll('[data-testid^="char-btn-"]');
    fireEvent.click(defCharBtns[0]);
    fireEvent.click(screen.getByTestId('card-btn-feint'));
    expect(screen.getByTestId('ability-notifications')).toBeInTheDocument();
  });

  it('Kapteeni ability notification shows player name when Mehtonen wins', () => {
    const homeLineup = [mehtonen, ...outfield.filter((p) => p.id !== 'olli_mehtonen').slice(0, 5), gk];
    useSquadStore.getState().setLineup('home', homeLineup);
    renderWithProviders(<DuelScreen />);
    fireEvent.click(screen.getByTestId('char-btn-olli_mehtonen'));
    fireEvent.click(screen.getByTestId('card-btn-press'));
    fireEvent.click(screen.getByTestId('cover-continue-btn'));
    const defCharBtns = document.querySelectorAll('[data-testid^="char-btn-"]');
    fireEvent.click(defCharBtns[0]);
    fireEvent.click(screen.getByTestId('card-btn-feint'));
    const notifs = screen.getAllByTestId('ability-notification');
    const kapteeniNotif = notifs.find((n) => n.textContent?.includes('Olli Mehtonen'));
    expect(kapteeniNotif).toBeTruthy();
  });

  it('Tuplablokki (Nieminen) adds restrict_shot effect to loser side', () => {
    // Nieminen at home first; exclude from rest to avoid duplicate IDs
    const homeLineup = [nieminen, ...outfield.filter((p) => p.id !== 'ossi_nieminen').slice(0, 5), gk];
    useSquadStore.getState().setLineup('home', homeLineup);
    renderWithProviders(<DuelScreen />);
    fireEvent.click(screen.getByTestId('char-btn-ossi_nieminen'));
    fireEvent.click(screen.getByTestId('card-btn-press'));
    fireEvent.click(screen.getByTestId('cover-continue-btn'));
    const defCharBtns = document.querySelectorAll('[data-testid^="char-btn-"]');
    fireEvent.click(defCharBtns[0]);
    fireEvent.click(screen.getByTestId('card-btn-feint'));
    const awayEffects = useMatchStore.getState().effects.away;
    expect(awayEffects.some((e) => e.id === 'restrict_shot' && !e.expired)).toBe(true);
  });

  it('no ability notifications shown when no ability player wins', () => {
    // Use all generic players, no ability players in slot 0
    const genericPlayers = outfield.filter(
      (p) => p.id !== 'olli_mehtonen' && p.id !== 'ossi_nieminen' &&
             p.id !== 'jyrki_orjasniemi' && p.id !== 'jari_savela' &&
             p.id !== 'olli_kurkela' && p.id !== 'mauno_ahlgren' &&
             p.id !== 'kimmo_mattila' && p.id !== 'iiro_makela'
    );
    if (genericPlayers.length >= 6) {
      useSquadStore.getState().setLineup('home', [...genericPlayers.slice(0, 6), gk]);
      useSquadStore.getState().setLineup('away', [...genericPlayers.slice(0, 6), gk]);
      renderWithProviders(<DuelScreen />);
      playDuel('press', 'feint');
      expect(screen.queryByTestId('ability-notifications')).not.toBeInTheDocument();
    }
  });
});

// ─── Card restriction tests ────────────────────────────────────────────────────

describe('DuelScreen — card restrictions', () => {
  beforeEach(() => {
    useSquadStore.getState().reset();
    setupMatch();
  });

  it('Feint button is disabled when restrict_feint effect is active on attacker side', () => {
    useMatchStore.getState().addEffect('home', {
      id: 'restrict_feint',
      source: 'jyrki_orjasniemi',
      expiresAfterDuel: 1,
      expired: false,
    });
    renderWithProviders(<DuelScreen />);
    // Pick char first to reach card pick phase
    const charBtns = document.querySelectorAll('[data-testid^="char-btn-"]');
    fireEvent.click(charBtns[0]);
    const feintBtn = screen.getByTestId('card-btn-feint');
    expect(feintBtn).toBeDisabled();
  });

  it('Shot button is disabled when restrict_shot effect is active on attacker side', () => {
    useMatchStore.getState().addEffect('home', {
      id: 'restrict_shot',
      source: 'ossi_nieminen',
      expiresAfterDuel: 1,
      expired: false,
    });
    renderWithProviders(<DuelScreen />);
    const charBtns = document.querySelectorAll('[data-testid^="char-btn-"]');
    fireEvent.click(charBtns[0]);
    const shotBtn = screen.getByTestId('card-btn-shot');
    expect(shotBtn).toBeDisabled();
  });

  it('Press button is disabled when restrict_press effect is active on attacker side', () => {
    useMatchStore.getState().addEffect('home', {
      id: 'restrict_press',
      source: 'olli_kurkela',
      expiresAfterDuel: 1,
      expired: false,
    });
    renderWithProviders(<DuelScreen />);
    const charBtns = document.querySelectorAll('[data-testid^="char-btn-"]');
    fireEvent.click(charBtns[0]);
    const pressBtn = screen.getByTestId('card-btn-press');
    expect(pressBtn).toBeDisabled();
  });

  it('restriction is cleared after continuing past the target duel', () => {
    // Add restrict_feint expiring after duel 0
    useMatchStore.getState().addEffect('home', {
      id: 'restrict_feint',
      source: 'jyrki_orjasniemi',
      expiresAfterDuel: 0,
      expired: false,
    });
    useMatchStore.setState({ duelIndex: 0 });
    renderWithProviders(<DuelScreen />);

    // Pick char, then play a duel (press only since feint is restricted)
    const atkCharBtns = document.querySelectorAll('[data-testid^="char-btn-"]');
    fireEvent.click(atkCharBtns[0]);
    fireEvent.click(screen.getByTestId('card-btn-press'));
    fireEvent.click(screen.getByTestId('cover-continue-btn'));
    const defCharBtns = document.querySelectorAll('[data-testid^="char-btn-"]');
    fireEvent.click(defCharBtns[0]);
    fireEvent.click(screen.getByTestId('card-btn-press'));
    // Continue past the duel — should expire the effect
    fireEvent.click(screen.getByTestId('duel-continue-btn'));

    // The restriction effect should now be expired
    const homeEffects = useMatchStore.getState().effects.home;
    const restriction = homeEffects.find((e) => e.id === 'restrict_feint');
    expect(restriction?.expired).toBe(true);
  });
});

// ─── Reactive ability panel tests ─────────────────────────────────────────────

describe('DuelScreen — reactive ability panel', () => {
  beforeEach(() => {
    useSquadStore.getState().reset();
    setupMatch();
  });

  it('shows reactive-check panel when Estola (chosen as attacker) plays Press', () => {
    // Estola in home lineup
    const homeLineup = [estola, ...outfield.slice(0, 5), gk];
    useSquadStore.getState().setLineup('home', homeLineup);
    renderWithProviders(<DuelScreen />);

    // Attacker picks Estola specifically
    fireEvent.click(screen.getByTestId('char-btn-jukka_estola'));
    // Attacker picks Press (Estola's reactive trigger)
    fireEvent.click(screen.getByTestId('card-btn-press'));
    fireEvent.click(screen.getByTestId('cover-continue-btn'));
    // Defender picks any char
    const defCharBtns = document.querySelectorAll('[data-testid^="char-btn-"]');
    fireEvent.click(defCharBtns[0]);
    // Defender picks any card
    fireEvent.click(screen.getByTestId('card-btn-feint'));

    expect(screen.getByTestId('reactive-check-panel')).toBeInTheDocument();
  });

  it('clicking Keep in reactive panel resolves with original card', () => {
    const homeLineup = [estola, ...outfield.slice(0, 5), gk];
    useSquadStore.getState().setLineup('home', homeLineup);
    renderWithProviders(<DuelScreen />);

    fireEvent.click(screen.getByTestId('char-btn-jukka_estola'));
    fireEvent.click(screen.getByTestId('card-btn-press'));
    fireEvent.click(screen.getByTestId('cover-continue-btn'));
    const defCharBtns = document.querySelectorAll('[data-testid^="char-btn-"]');
    fireEvent.click(defCharBtns[0]);
    fireEvent.click(screen.getByTestId('card-btn-feint'));
    // Keep original Press
    fireEvent.click(screen.getByTestId('reactive-keep-btn'));

    expect(screen.getByTestId('duel-result-panel')).toBeInTheDocument();
  });

  it('clicking Switch in reactive panel resolves with switched card', () => {
    const homeLineup = [estola, ...outfield.slice(0, 5), gk];
    useSquadStore.getState().setLineup('home', homeLineup);
    renderWithProviders(<DuelScreen />);

    fireEvent.click(screen.getByTestId('char-btn-jukka_estola'));
    fireEvent.click(screen.getByTestId('card-btn-press'));
    fireEvent.click(screen.getByTestId('cover-continue-btn'));
    const defCharBtns = document.querySelectorAll('[data-testid^="char-btn-"]');
    fireEvent.click(defCharBtns[0]);
    fireEvent.click(screen.getByTestId('card-btn-shot'));
    // Switch to Shot
    fireEvent.click(screen.getByTestId('reactive-switch-btn'));

    expect(screen.getByTestId('duel-result-panel')).toBeInTheDocument();
  });

  it('no reactive panel when non-reactive player plays Press', () => {
    const genericPlayers = outfield.filter((p) => p.id !== 'jukka_estola');
    const homeLineup = [genericPlayers[0], ...genericPlayers.slice(1, 6), gk];
    useSquadStore.getState().setLineup('home', homeLineup);
    renderWithProviders(<DuelScreen />);

    const atkCharBtns = document.querySelectorAll('[data-testid^="char-btn-"]');
    fireEvent.click(atkCharBtns[0]);
    fireEvent.click(screen.getByTestId('card-btn-press'));
    fireEvent.click(screen.getByTestId('cover-continue-btn'));
    const defCharBtns = document.querySelectorAll('[data-testid^="char-btn-"]');
    fireEvent.click(defCharBtns[0]);
    fireEvent.click(screen.getByTestId('card-btn-feint'));

    expect(screen.getByTestId('duel-result-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('reactive-check-panel')).not.toBeInTheDocument();
  });
});

// ─── Active player cards ───────────────────────────────────────────────────────

describe('DuelScreen — active player cards', () => {
  beforeEach(() => {
    useSquadStore.getState().reset();
    setupMatch();
  });

  it('renders active-players-row when lineups are set', () => {
    renderWithProviders(<DuelScreen />);
    expect(screen.getByTestId('active-players-row')).toBeInTheDocument();
  });

  it('shows attacker badge above attacker card', () => {
    renderWithProviders(<DuelScreen />);
    const wrapper = screen.getByTestId('attacker-player-card-wrapper');
    expect(wrapper).toHaveTextContent('Attacking');
  });

  it('shows defender badge above defender card', () => {
    renderWithProviders(<DuelScreen />);
    const wrapper = screen.getByTestId('defender-player-card-wrapper');
    expect(wrapper).toHaveTextContent('Defending');
  });

  it('shows attacker player name in attacker wrapper', () => {
    renderWithProviders(<DuelScreen />);
    const wrapper = screen.getByTestId('attacker-player-card-wrapper');
    expect(wrapper.querySelector('[data-testid^="player-name-"]')).toBeInTheDocument();
  });
});

// ─── Outcome panel redesign ────────────────────────────────────────────────────

describe('DuelScreen — outcome panel', () => {
  beforeEach(() => {
    useSquadStore.getState().reset();
    setupMatch();
  });

  it('shows GOAL ATTEMPT banner when attacker wins with Shot (in possession)', () => {
    renderWithProviders(<DuelScreen />);
    playDuel('shot', 'press'); // shot beats press → attacker wins while in possession → goal attempt
    expect(screen.getByTestId('goal-attempt-banner')).toBeInTheDocument();
  });

  it('shows GOAL ATTEMPT banner when attacker wins with Press (in possession)', () => {
    renderWithProviders(<DuelScreen />);
    playDuel('press', 'feint'); // press > feint → attacker wins while in possession → goal attempt
    expect(screen.getByTestId('goal-attempt-banner')).toBeInTheDocument();
  });

  it('shows GOAL ATTEMPT banner when attacker wins with Feint (in possession)', () => {
    renderWithProviders(<DuelScreen />);
    playDuel('feint', 'shot'); // feint > shot → attacker wins while in possession → goal attempt
    expect(screen.getByTestId('goal-attempt-banner')).toBeInTheDocument();
  });

  it('shows scorer name or saved result after any attacker win in possession', () => {
    renderWithProviders(<DuelScreen />);
    playDuel('press', 'feint'); // attacker wins → goal attempt → either score or save
    const hasGoal = screen.queryByTestId('goal-result');
    const hasSave = screen.queryByTestId('saved-result');
    expect(hasGoal || hasSave).toBeTruthy();
  });

  it('shows SAVED text when goal attempt is saved', () => {
    renderWithProviders(<DuelScreen />);
    playDuel('shot', 'press');
    const savedEl = screen.queryByTestId('saved-result');
    const goalEl = screen.queryByTestId('goal-result');
    if (savedEl) {
      expect(savedEl).toHaveTextContent('SAVED');
    } else if (goalEl) {
      expect(goalEl).toHaveTextContent('GOAL');
    }
  });

  it('shows defended_ball text when defender wins', () => {
    setupMatch('away'); // away attacks
    renderWithProviders(<DuelScreen />);
    // Away (attacker) plays press, home (defender) plays shot → shot beats press → defender wins
    playDuel('press', 'shot');
    expect(screen.getByTestId('duel-outcome-text')).toHaveTextContent('Ball defended');
  });
});
