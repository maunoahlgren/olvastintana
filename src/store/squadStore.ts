/**
 * @file squadStore.ts
 * Zustand store for squad selection state.
 *
 * Tracks which players are in each manager's active lineup,
 * dirty move selections, and any active player suspensions/penalties.
 */

import { create } from 'zustand';
import type { PlayerStats } from '../engine/duel';

export type Position = 'GK' | 'MF' | 'FW' | 'DF';

export interface PlayerAbility {
  type: 'boost' | 'chaos' | 'reactive' | 'restriction' | 'dominant';
  id: string;
  name_en: string;
  name_fi: string;
  description_en: string;
  description_fi: string;
  trigger?: string;
  effect?: string;
  duration?: number;
  uses_per_half?: number;
  resets_at_halftime?: boolean;
}

export interface Player {
  id: string;
  name: string;
  position: Position[];
  stats: PlayerStats;
  ability: PlayerAbility;
}

export interface SquadSlot {
  player: Player;
  /** Stat overrides applied to this player this match (e.g. trivia penalty, Sattuma) */
  statModifier: Partial<PlayerStats>;
  suspended: boolean;
}

interface SquadState {
  homeLineup: SquadSlot[];
  awayLineup: SquadSlot[];
}

interface SquadActions {
  setLineup: (side: 'home' | 'away', players: Player[]) => void;
  swapPlayer: (side: 'home' | 'away', outIndex: number, inPlayer: Player) => void;
  applyStatModifier: (side: 'home' | 'away', playerId: string, modifier: Partial<PlayerStats>) => void;
  suspendPlayer: (side: 'home' | 'away', playerId: string) => void;
  unsuspendAll: (side: 'home' | 'away') => void;
  reset: () => void;
}

function toSlot(player: Player): SquadSlot {
  return { player, statModifier: {}, suspended: false };
}

export const useSquadStore = create<SquadState & SquadActions>((set) => ({
  homeLineup: [],
  awayLineup: [],

  setLineup(side, players) {
    set({ [`${side}Lineup`]: players.map(toSlot) });
  },

  swapPlayer(side, outIndex, inPlayer) {
    const key = `${side}Lineup` as 'homeLineup' | 'awayLineup';
    set((s) => ({
      [key]: s[key].map((slot, i) => (i === outIndex ? toSlot(inPlayer) : slot)),
    }));
  },

  applyStatModifier(side, playerId, modifier) {
    const key = `${side}Lineup` as 'homeLineup' | 'awayLineup';
    set((s) => ({
      [key]: s[key].map((slot) =>
        slot.player.id === playerId
          ? { ...slot, statModifier: { ...slot.statModifier, ...modifier } }
          : slot,
      ),
    }));
  },

  suspendPlayer(side, playerId) {
    const key = `${side}Lineup` as 'homeLineup' | 'awayLineup';
    set((s) => ({
      [key]: s[key].map((slot) =>
        slot.player.id === playerId ? { ...slot, suspended: true } : slot,
      ),
    }));
  },

  unsuspendAll(side) {
    const key = `${side}Lineup` as 'homeLineup' | 'awayLineup';
    set((s) => ({
      [key]: s[key].map((slot) => ({ ...slot, suspended: false })),
    }));
  },

  reset() {
    set({ homeLineup: [], awayLineup: [] });
  },
}));
