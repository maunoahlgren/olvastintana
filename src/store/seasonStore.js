import { create } from 'zustand';

/**
 * Season store — tracks cumulative season standings.
 * Win=3, Draw=1, Loss=0
 */
export const useSeasonStore = create((set, get) => ({
  managers: [], // [{ id, name, points, wins, draws, losses, goalsFor, goalsAgainst }]

  addManager(manager) {
    set((s) => ({
      managers: [...s.managers, { ...manager, points: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 }],
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
    return [...get().managers].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst));
  },

  reset() {
    set({ managers: [] });
  },
}));

function calcPoints(goalsFor, goalsAgainst) {
  if (goalsFor > goalsAgainst) return { pts: 3, w: 1, d: 0, l: 0 };
  if (goalsFor === goalsAgainst) return { pts: 1, w: 0, d: 1, l: 0 };
  return { pts: 0, w: 0, d: 0, l: 1 };
}
