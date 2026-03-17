/**
 * @file HelpModal.test.tsx
 * Unit tests for HelpModal component.
 *
 * Tests cover:
 *   - Always-present content: triangle rules, possession rule, close buttons
 *   - Optional tactics section (rendered only when tactics provided)
 *   - Optional restrictions section (rendered only when a card is blocked)
 *   - Dismiss via backdrop click
 *   - Dismiss via × close button
 *   - Dismiss via bottom close button
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import HelpModal from '../../../src/components/ui/HelpModal';

// ─── Helper ───────────────────────────────────────────────────────────────────

function renderModal(props: React.ComponentProps<typeof HelpModal>) {
  return render(
    <I18nextProvider i18n={i18n}>
      <HelpModal {...props} />
    </I18nextProvider>,
  );
}

// ─── Always-present content ───────────────────────────────────────────────────

describe('HelpModal — always-present content', () => {
  it('renders the modal', () => {
    renderModal({ onClose: vi.fn() });
    expect(screen.getByTestId('help-modal')).toBeInTheDocument();
  });

  it('shows the card triangle section', () => {
    renderModal({ onClose: vi.fn() });
    expect(screen.getByTestId('help-triangle-section')).toBeInTheDocument();
  });

  it('shows press beats feint rule', () => {
    renderModal({ onClose: vi.fn() });
    expect(screen.getByTestId('help-press-beats-feint')).toBeInTheDocument();
  });

  it('shows feint beats shot rule', () => {
    renderModal({ onClose: vi.fn() });
    expect(screen.getByTestId('help-feint-beats-shot')).toBeInTheDocument();
  });

  it('shows shot beats press rule', () => {
    renderModal({ onClose: vi.fn() });
    expect(screen.getByTestId('help-shot-beats-press')).toBeInTheDocument();
  });

  it('shows the possession section', () => {
    renderModal({ onClose: vi.fn() });
    expect(screen.getByTestId('help-possession-section')).toBeInTheDocument();
  });
});

// ─── Dismiss behaviour ────────────────────────────────────────────────────────

describe('HelpModal — dismiss', () => {
  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByTestId('help-modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose when modal body is clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByTestId('help-modal'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when × button is clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByTestId('help-close-x'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when bottom close button is clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByTestId('help-close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ─── Tactics section (optional) ───────────────────────────────────────────────

describe('HelpModal — tactics section', () => {
  it('does NOT render tactics section when no tactics provided', () => {
    renderModal({ onClose: vi.fn() });
    expect(screen.queryByTestId('help-tactics-section')).not.toBeInTheDocument();
  });

  it('renders tactics section when homeTactic is provided', () => {
    renderModal({ onClose: vi.fn(), homeTactic: 'aggressive' });
    expect(screen.getByTestId('help-tactics-section')).toBeInTheDocument();
    expect(screen.getByTestId('help-home-tactic')).toBeInTheDocument();
  });

  it('renders tactics section when awayTactic is provided', () => {
    renderModal({ onClose: vi.fn(), awayTactic: 'defensive' });
    expect(screen.getByTestId('help-tactics-section')).toBeInTheDocument();
    expect(screen.getByTestId('help-away-tactic')).toBeInTheDocument();
  });

  it('renders both home and away tactics when both provided', () => {
    renderModal({ onClose: vi.fn(), homeTactic: 'creative', awayTactic: 'aggressive' });
    expect(screen.getByTestId('help-home-tactic')).toBeInTheDocument();
    expect(screen.getByTestId('help-away-tactic')).toBeInTheDocument();
  });
});

// ─── Restrictions section (optional) ─────────────────────────────────────────

describe('HelpModal — restrictions section', () => {
  it('does NOT render restrictions section when all false', () => {
    renderModal({ onClose: vi.fn(), restrictions: { press: false, feint: false, shot: false } });
    expect(screen.queryByTestId('help-restrictions-section')).not.toBeInTheDocument();
  });

  it('renders restrictions section when press is blocked', () => {
    renderModal({ onClose: vi.fn(), restrictions: { press: true, feint: false, shot: false } });
    expect(screen.getByTestId('help-restrictions-section')).toBeInTheDocument();
    expect(screen.getByTestId('help-press-blocked')).toBeInTheDocument();
  });

  it('renders restrictions section when feint is blocked', () => {
    renderModal({ onClose: vi.fn(), restrictions: { press: false, feint: true, shot: false } });
    expect(screen.getByTestId('help-feint-blocked')).toBeInTheDocument();
  });

  it('renders restrictions section when shot is blocked', () => {
    renderModal({ onClose: vi.fn(), restrictions: { press: false, feint: false, shot: true } });
    expect(screen.getByTestId('help-shot-blocked')).toBeInTheDocument();
  });

  it('does NOT show unrestricted cards in the restrictions list', () => {
    renderModal({ onClose: vi.fn(), restrictions: { press: true, feint: false, shot: false } });
    expect(screen.queryByTestId('help-feint-blocked')).not.toBeInTheDocument();
    expect(screen.queryByTestId('help-shot-blocked')).not.toBeInTheDocument();
  });
});
