/**
 * @file seasonStore.ts
 * Zustand store for season standings.
 *
 * Tracks cumulative points, wins, draws, losses, and goals across matches.
 * Points: Win=3, Draw=1, Loss=0
 */

import { create } from 'zustand';

export interface ManagerRecord {
  id: string;
  name: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
}

interface SeasonState {
  managers: ManagerRecord[];
}

interface SeasonActions {
  addManager: (id: string, name: string) => void;
  recordResult: (homeId: string, awayId: string, homeGoals: number, awayGoals: number) => void;
  getStandings: () => ManagerRecord[];
  reset: () => void;
}

function calcPoints(
  gf: number,
  ga: number,
): { pts: number; w: number; d: number; l: number } {
  if (gf > ga) return { pts: 3, w: 1, d: 0, l: 0 };
  if (gf === ga) return { pts: 1, w: 0, d: 1, l: 0 };
  return { pts: 0, w: 0, d: 0, l: 1 };
}

export const useSeasonStore = create<SeasonState & SeasonActions>((set, get) => ({
  managers: [],

  addManager(id, name) {
    set((s) => ({
      managers: [
        ...s.managers,
        { id, name, points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 },
      ],
    }));
  },

  recordResult(homeId, awayId, homeGoals, awayGoals) {
    set((s) => ({
      managers: s.managers.map((m) => {
        if (m.id === homeId) {
          const { pts, w, d, l } = calcPoints(homeGoals, awayGoals);
          return { ...m, points: m.points + pts, wins: m.wins + w, draws: m.draws + d, losses: m.losses + l, goalsFor: m.goalsFor + homeGoals, goalsAgainst: m.goalsAgainst + awayGoals };
        }
        if (m.id === awayId) {
          const { pts, w, d, l } = calcPoints(awayGoals, homeGoals);
          return { ...m, points: m.points + pts, wins: m.wins + w, draws: m.draws + d, losses: m.losses + l, goalsFor: m.goalsFor + awayGoals, goalsAgainst: m.goalsAgainst + homeGoals };
        }
        return m;
      }),
    }));
  },

  getStandings() {
    return [...get().managers].sort(
      (a, b) =>
        b.points - a.points ||
        b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst),
    );
  },

  reset() {
    set({ managers: [] });
  },
}));
