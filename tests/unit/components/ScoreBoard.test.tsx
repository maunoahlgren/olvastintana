/**
 * @file ScoreBoard.test.tsx
 * Unit tests for the ScoreBoard component.
 */

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../utils/renderWithProviders';
import ScoreBoard from '../../../src/components/ui/ScoreBoard';

describe('ScoreBoard', () => {
  it('renders the score', () => {
    renderWithProviders(<ScoreBoard homeGoals={2} awayGoals={1} half={1} duelIndex={0} />);
    expect(screen.getByTestId('score-display')).toHaveTextContent('2 – 1');
  });

  it('renders 0–0 on a fresh match', () => {
    renderWithProviders(<ScoreBoard homeGoals={0} awayGoals={0} half={1} duelIndex={0} />);
    expect(screen.getByTestId('score-display')).toHaveTextContent('0 – 0');
  });

  it('displays the correct half number', () => {
    renderWithProviders(<ScoreBoard homeGoals={0} awayGoals={0} half={2} duelIndex={0} />);
    expect(screen.getByTestId('duel-info')).toHaveTextContent('2');
  });

  it('displays duel index + 1 (1-based display)', () => {
    renderWithProviders(<ScoreBoard homeGoals={0} awayGoals={0} half={1} duelIndex={2} />);
    // duelIndex=2 → displayed as 3
    expect(screen.getByTestId('duel-info')).toHaveTextContent('3');
  });

  it('renders the scoreboard container', () => {
    renderWithProviders(<ScoreBoard homeGoals={3} awayGoals={3} half={2} duelIndex={4} />);
    expect(screen.getByTestId('scoreboard')).toBeInTheDocument();
  });

  it('shows Home and Away labels', () => {
    renderWithProviders(<ScoreBoard homeGoals={0} awayGoals={0} half={1} duelIndex={0} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Away')).toBeInTheDocument();
  });
});
