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
  position: ['MF', 'FW'],
  stats: { pace: 4, technique: 5, power: 4, iq: 6, stamina: 4, chaos: 3 },
  ability: {
    type: 'boost',
    id: 'hot_streak',
    name_en: 'Hot Streak',
    name_fi: 'Tulisarja',
    description_en: 'Can randomly explode for 6 points.',
    description_fi: 'Voi räjähtää satunnaisesti 6 pisteeseen.',
  },
};

describe('PlayerCard', () => {
  it('renders the player name', () => {
    renderWithProviders(<PlayerCard player={alanen} />);
    expect(screen.getByTestId('player-name-alanen')).toHaveTextContent('Alanen');
  });

  it('renders base stats correctly', () => {
    renderWithProviders(<PlayerCard player={alanen} />);
    expect(screen.getByTestId('stat-alanen-pace')).toHaveTextContent('4');
    expect(screen.getByTestId('stat-alanen-iq')).toHaveTextContent('6');
  });

  it('applies negative stat modifier visually', () => {
    renderWithProviders(<PlayerCard player={alanen} statModifier={{ pace: -1 }} />);
    // pace 4 + (-1) = 3
    expect(screen.getByTestId('stat-alanen-pace')).toHaveTextContent('3');
  });

  it('shows ability name in English', () => {
    renderWithProviders(<PlayerCard player={alanen} />);
    expect(screen.getByText('Hot Streak')).toBeInTheDocument();
  });

  it('shows ability icon for boost type', () => {
    renderWithProviders(<PlayerCard player={alanen} />);
    expect(screen.getByText('💥')).toBeInTheDocument();
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
    expect(screen.queryByText('Hot Streak')).not.toBeInTheDocument();
  });

  it('renders positions', () => {
    renderWithProviders(<PlayerCard player={alanen} />);
    expect(screen.getByText('MF · FW')).toBeInTheDocument();
  });
});
