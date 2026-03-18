/**
 * @file QuitMatchButton.test.tsx
 * Unit tests for QuitMatchButton component.
 *
 * Tests cover:
 *   - Trigger button renders
 *   - Dialog does NOT show initially
 *   - Clicking trigger opens the dialog
 *   - Dialog shows confirmation message
 *   - Cancel button closes the dialog without resetting state
 *   - Clicking the overlay backdrop closes the dialog without resetting
 *   - Confirm button resets matchStore and clears localStorage
 *   - Phase becomes TITLE after confirm
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import QuitMatchButton from '../../../src/components/ui/QuitMatchButton';
import { useMatchStore } from '../../../src/store/matchStore';
import { MATCH_PHASE } from '../../../src/engine/match';

// ─── Mock localStorage ────────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderBtn() {
  return render(
    <I18nextProvider i18n={i18n}>
      <QuitMatchButton />
    </I18nextProvider>,
  );
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
  useMatchStore.getState().reset();
  // Simulate being mid-match
  useMatchStore.getState().setDerbyPhase(MATCH_PHASE.FIRST_HALF);
});

// ─── Render ───────────────────────────────────────────────────────────────────

describe('QuitMatchButton — render', () => {
  it('renders the trigger button', () => {
    renderBtn();
    expect(screen.getByTestId('quit-match-btn')).toBeInTheDocument();
  });

  it('does NOT show confirm dialog initially', () => {
    renderBtn();
    expect(screen.queryByTestId('quit-confirm-dialog')).not.toBeInTheDocument();
  });
});

// ─── Open / Close dialog ─────────────────────────────────────────────────────

describe('QuitMatchButton — dialog open/close', () => {
  it('opens confirm dialog when trigger is clicked', () => {
    renderBtn();
    fireEvent.click(screen.getByTestId('quit-match-btn'));
    expect(screen.getByTestId('quit-confirm-dialog')).toBeInTheDocument();
  });

  it('shows the confirmation message in the dialog', () => {
    renderBtn();
    fireEvent.click(screen.getByTestId('quit-match-btn'));
    expect(screen.getByTestId('quit-confirm-message')).toBeInTheDocument();
  });

  it('cancel button closes the dialog', () => {
    renderBtn();
    fireEvent.click(screen.getByTestId('quit-match-btn'));
    fireEvent.click(screen.getByTestId('quit-cancel-btn'));
    expect(screen.queryByTestId('quit-confirm-dialog')).not.toBeInTheDocument();
  });

  it('clicking the backdrop closes the dialog', () => {
    renderBtn();
    fireEvent.click(screen.getByTestId('quit-match-btn'));
    fireEvent.click(screen.getByTestId('quit-confirm-overlay'));
    expect(screen.queryByTestId('quit-confirm-dialog')).not.toBeInTheDocument();
  });

  it('cancel does NOT reset matchStore', () => {
    renderBtn();
    fireEvent.click(screen.getByTestId('quit-match-btn'));
    fireEvent.click(screen.getByTestId('quit-cancel-btn'));
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.FIRST_HALF);
  });
});

// ─── Confirm action ───────────────────────────────────────────────────────────

describe('QuitMatchButton — confirm action', () => {
  it('confirm button resets matchStore phase to TITLE', () => {
    renderBtn();
    fireEvent.click(screen.getByTestId('quit-match-btn'));
    fireEvent.click(screen.getByTestId('quit-confirm-btn'));
    expect(useMatchStore.getState().phase).toBe(MATCH_PHASE.TITLE);
  });

  it('confirm button removes session from localStorage', () => {
    localStorageMock.setItem('ot_session', JSON.stringify({ phase: MATCH_PHASE.FIRST_HALF }));
    renderBtn();
    fireEvent.click(screen.getByTestId('quit-match-btn'));
    fireEvent.click(screen.getByTestId('quit-confirm-btn'));
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('ot_session');
  });
});
