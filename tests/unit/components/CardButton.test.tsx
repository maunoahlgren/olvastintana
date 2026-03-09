/**
 * @file CardButton.test.tsx
 * Unit tests for the CardButton component.
 */

import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../utils/renderWithProviders';
import CardButton from '../../../src/components/ui/CardButton';

describe('CardButton', () => {
  it('renders the card label for press', () => {
    renderWithProviders(<CardButton card="press" onClick={() => {}} />);
    expect(screen.getByText('Press')).toBeInTheDocument();
  });

  it('renders the card label for feint', () => {
    renderWithProviders(<CardButton card="feint" onClick={() => {}} />);
    expect(screen.getByText('Feint')).toBeInTheDocument();
  });

  it('renders the card label for shot', () => {
    renderWithProviders(<CardButton card="shot" onClick={() => {}} />);
    expect(screen.getByText('Shot')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handler = vi.fn();
    renderWithProviders(<CardButton card="press" onClick={handler} />);
    fireEvent.click(screen.getByTestId('card-btn-press'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handler = vi.fn();
    renderWithProviders(<CardButton card="feint" onClick={handler} disabled />);
    fireEvent.click(screen.getByTestId('card-btn-feint'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('has disabled attribute when disabled prop is true', () => {
    renderWithProviders(<CardButton card="shot" onClick={() => {}} disabled />);
    expect(screen.getByTestId('card-btn-shot')).toBeDisabled();
  });

  it('shows the correct emoji for each card type', () => {
    const { rerender } = renderWithProviders(<CardButton card="press" onClick={() => {}} />);
    expect(screen.getByText('⚔️')).toBeInTheDocument();

    rerender(<CardButton card="feint" onClick={() => {}} />);
    expect(screen.getByText('💨')).toBeInTheDocument();

    rerender(<CardButton card="shot" onClick={() => {}} />);
    expect(screen.getByText('🎯')).toBeInTheDocument();
  });
});
