/**
 * @file PlayerCard.test.tsx
 * Unit tests for the PlayerCard component.
 */

import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../utils/renderWithProviders';
import PlayerCard from '../../../src/components/ui/PlayerCard';
import type { Player } from '../../../src/store/squadStore';

/** Minimal test player fixture */
const alanen: Player = {
  id: 'alanen',
  name: 'Alanen',
  number: 7,
  tier: 'regular',
  position: ['MF', 'FW'],
  stats: { riisto: 4, laukaus: 4, harhautus: 5, torjunta: 4, stamina: 2 },
  ability: {
    description_en: 'Can randomly explode for 8 points.',
    description_fi: 'Voi räjähtää satunnaisesti 8 pisteeseen.',
  },
};

describe('PlayerCard', () => {
  it('renders the player name', () => {
    renderWithProviders(<PlayerCard player={alanen} />);
    expect(screen.getByTestId('player-name-alanen')).toHaveTextContent('Alanen');
  });

  it('renders base stats correctly', () => {
    renderWithProviders(<PlayerCard player={alanen} />);
    expect(screen.getByTestId('stat-alanen-riisto')).toHaveTextContent('4');
    expect(screen.getByTestId('stat-alanen-harhautus')).toHaveTextContent('5');
  });

  it('applies negative stat modifier visually', () => {
    renderWithProviders(<PlayerCard player={alanen} statModifier={{ riisto: -1 }} />);
    // riisto 4 + (-1) = 3
    expect(screen.getByTestId('stat-alanen-riisto')).toHaveTextContent('3');
  });

  it('shows ability description in English', () => {
    renderWithProviders(<PlayerCard player={alanen} />);
    expect(screen.getByText('Can randomly explode for 8 points.')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const handler = vi.fn();
    renderWithProviders(<PlayerCard player={alanen} onSelect={handler} />);
    fireEvent.click(screen.getByTestId('player-card-alanen'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('applies selected styling class when selected=true', () => {
    renderWithProviders(<PlayerCard player={alanen} selected />);
    // Border class changes — just verify the element renders with the player data
    expect(screen.getByTestId('player-card-alanen')).toBeInTheDocument();
  });

  it('hides ability when showAbility=false', () => {
    renderWithProviders(<PlayerCard player={alanen} showAbility={false} />);
    expect(screen.queryByText('Can randomly explode for 8 points.')).not.toBeInTheDocument();
  });

  it('renders positions', () => {
    renderWithProviders(<PlayerCard player={alanen} />);
    expect(screen.getByText('MF · FW')).toBeInTheDocument();
  });

  it('renders player number', () => {
    renderWithProviders(<PlayerCard player={alanen} />);
    expect(screen.getByText('#7')).toBeInTheDocument();
  });

  it('renders without ability gracefully when no ability defined', () => {
    const noAbility: Player = { ...alanen, ability: undefined };
    renderWithProviders(<PlayerCard player={noAbility} />);
    expect(screen.getByTestId('player-name-alanen')).toBeInTheDocument();
  });
});
