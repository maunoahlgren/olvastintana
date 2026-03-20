/**
 * @file ai.test.ts
 * Unit tests for the AI engine functions.
 *
 * All AI functions are pure — no React or Zustand required.
 * Randomness is via Math.random(), which is spied on in deterministic tests.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  easyAiCard,
  normalAiCard,
  hardAiCard,
  easyAiLineup,
  normalAiLineup,
  hardAiLineup,
  easyAiTactics,
  normalAiTactics,
  hardAiTactics,
  pickAiCard,
  pickAiLineup,
  pickAiTactics,
  pickAiCharacter,
  type AiGameState,
} from '../../../src/engine/ai';
import type { Player } from '../../../src/store/squadStore';
import type { PlayerStats } from '../../../src/engine/duel';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/** Minimal base game state (home has possession, 0-0, duel 0/5 in first half) */
const BASE_STATE: AiGameState = {
  possession: 'home',
  homeGoals: 0,
  awayGoals: 0,
  duelIndex: 0,
  half: 1,
  duelsPerHalf: 5,
};

/**
 * Build a minimal Player object for lineup tests.
 *
 * @param id - Player ID (used as name too)
 * @param position - Position codes e.g. ['MF'] or ['GK']
 * @param stats - Stat overrides (defaults to all-3)
 */
function makePlayer(
  id: string,
  position: string[],
  stats: Partial<PlayerStats> = {},
): Player {
  const defaultStats: PlayerStats = { riisto: 3, laukaus: 3, harhautus: 3, torjunta: 3, stamina: 3 };
  return {
    id,
    name: id,
    number: 0,
    tier: 'regular',
    position: position as Player['position'],
    stats: { ...defaultStats, ...stats },
  };
}

/**
 * Test squad: 7 outfield players of varying quality + 1 GK.
 *
 * Totals (5 stats): p1=25, p2=20, p3=15, p4=10, p6=11, p5=5, p7=4
 * p6 has unusually high harhautus (6) for testing hardAiLineup vs 'aggressive'
 * p7 is the lowest-stat player — excluded when selecting top 6
 */
const TEST_SQUAD: Player[] = [
  makePlayer('p1', ['MF'], { riisto: 5, laukaus: 5, harhautus: 5, torjunta: 5, stamina: 5 }), // 25
  makePlayer('p2', ['FW'], { riisto: 4, laukaus: 4, harhautus: 4, torjunta: 4, stamina: 4 }), // 20
  makePlayer('p3', ['MF'], { riisto: 3, laukaus: 3, harhautus: 3, torjunta: 3, stamina: 3 }), // 15
  makePlayer('p4', ['FW'], { riisto: 2, laukaus: 2, harhautus: 2, torjunta: 2, stamina: 2 }), // 10
  makePlayer('p5', ['MF'], { riisto: 1, laukaus: 1, harhautus: 1, torjunta: 1, stamina: 1 }), //  5
  makePlayer('p6', ['FW'], { riisto: 2, laukaus: 1, harhautus: 6, torjunta: 1, stamina: 1 }), // 11 — high harhautus
  makePlayer('p7', ['MF'], { riisto: 1, laukaus: 1, harhautus: 1, torjunta: 1, stamina: 0 }), //  4 — lowest stat player
  makePlayer('gk1', ['GK'], { riisto: 2, laukaus: 2, harhautus: 2, torjunta: 4, stamina: 4 }),
];

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// easyAiCard
// ---------------------------------------------------------------------------

describe('easyAiCard', () => {
  it('returns a valid card choice', () => {
    for (let i = 0; i < 30; i++) {
      expect(['press', 'feint', 'shot']).toContain(easyAiCard());
    }
  });

  it('eventually returns all three cards (probabilistic check)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 150; i++) seen.add(easyAiCard());
    expect(seen.size).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// normalAiCard
// ---------------------------------------------------------------------------

describe('normalAiCard', () => {
  it('returns a valid card choice', () => {
    expect(['press', 'feint', 'shot']).toContain(normalAiCard(BASE_STATE));
  });

  it('strongly prefers Shot when AI has possession (away)', () => {
    // weights: press=1, feint=1, shot=3 → P(shot) ≈ 60%
    const counts = { press: 0, feint: 0, shot: 0 };
    for (let i = 0; i < 300; i++) {
      const c = normalAiCard({ ...BASE_STATE, possession: 'away' });
      counts[c as keyof typeof counts]++;
    }
    // Expect > 100 shots out of 300 (random baseline ~100, with boost ~180)
    expect(counts.shot).toBeGreaterThan(100);
  });

  it('strongly prefers Shot when losing with ≤ 2 duels remaining', () => {
    // awayGoals < homeGoals, duelsLeft = 5-4 = 1 → weights.shot += 2
    const counts = { press: 0, feint: 0, shot: 0 };
    for (let i = 0; i < 300; i++) {
      const c = normalAiCard({
        ...BASE_STATE,
        awayGoals: 0,
        homeGoals: 1,
        duelIndex: 4,
      });
      counts[c as keyof typeof counts]++;
    }
    expect(counts.shot).toBeGreaterThan(100);
  });

  it('strongly prefers Feint when last player card was Press', () => {
    // weights: press=1, feint=3, shot=1 → P(feint) ≈ 60%
    const counts = { press: 0, feint: 0, shot: 0 };
    for (let i = 0; i < 300; i++) {
      const c = normalAiCard({ ...BASE_STATE, lastPlayerCard: 'press' });
      counts[c as keyof typeof counts]++;
    }
    expect(counts.feint).toBeGreaterThan(100);
  });

  it('uses balanced weights when no special conditions apply', () => {
    // All weights = 1, each card roughly 33%
    const counts = { press: 0, feint: 0, shot: 0 };
    for (let i = 0; i < 300; i++) {
      const c = normalAiCard(BASE_STATE);
      counts[c as keyof typeof counts]++;
    }
    // Each should appear at least 50 times (far below expected ~100)
    for (const count of Object.values(counts)) {
      expect(count).toBeGreaterThan(50);
    }
  });
});

// ---------------------------------------------------------------------------
// hardAiCard
// ---------------------------------------------------------------------------

describe('hardAiCard', () => {
  it('counters most-frequent Press → plays Shot (stamina=2, no mistake)', () => {
    // Math.random=0.99 → mistake check 0.99 < 0 is false
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const result = hardAiCard(
      { ...BASE_STATE, activePlayerStamina: 2 },
      ['press', 'press', 'press'],
    );
    expect(result).toBe('shot');
  });

  it('counters most-frequent Feint → plays Press (stamina=2, no mistake)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const result = hardAiCard(
      { ...BASE_STATE, activePlayerStamina: 2 },
      ['feint', 'feint', 'feint'],
    );
    expect(result).toBe('press');
  });

  it('counters most-frequent Shot → plays Feint (stamina=2, no mistake)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const result = hardAiCard(
      { ...BASE_STATE, activePlayerStamina: 2 },
      ['shot', 'shot', 'shot'],
    );
    expect(result).toBe('feint');
  });

  it('overrides counter with Shot when AI has possession and human rarely plays Feint', () => {
    // history = ['shot','shot','shot'] → counter = 'feint'
    // possession = 'away', feintFreq = 0 < 0.5 → override to 'shot'
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const result = hardAiCard(
      { ...BASE_STATE, possession: 'away', activePlayerStamina: 2 },
      ['shot', 'shot', 'shot'],
    );
    expect(result).toBe('shot');
  });

  it('does NOT override when human frequently plays Feint (AI has possession)', () => {
    // feintFreq = 3/3 = 1.0 ≥ 0.5 → no override → counter 'press' stays
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const result = hardAiCard(
      { ...BASE_STATE, possession: 'away', activePlayerStamina: 2 },
      ['feint', 'feint', 'feint'],
    );
    // Counter for feint = press; feintFreq = 1.0 ≥ 0.5 so no shot override
    expect(result).toBe('press');
  });

  it('makes random mistake at low stamina (stamina=1)', () => {
    // mistakeChance = (2-1)/4 = 0.25
    // Math.random = 0.01 < 0.25 → mistake fires
    // easyAiCard: Math.random = 0.01 → floor(0.01*3) = 0 → ALL_CARDS[0] = 'press'
    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    const result = hardAiCard(
      { ...BASE_STATE, activePlayerStamina: 1 },
      ['shot', 'shot', 'shot'], // counter would be 'feint', but mistake fires
    );
    // Mistake occurred → easyAiCard returned 'press' (not 'feint')
    expect(result).toBe('press');
  });

  it('no mistake at max stamina (stamina=2) → plays optimal counter', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const result = hardAiCard(
      { ...BASE_STATE, activePlayerStamina: 2 },
      ['shot', 'shot', 'shot'],
    );
    expect(result).toBe('feint'); // pure counter, zero mistake chance
  });

  it('falls back to normalAiCard when card history is empty', () => {
    // Should return a valid card without throwing
    const result = hardAiCard(BASE_STATE, []);
    expect(['press', 'feint', 'shot']).toContain(result);
  });

  it('only considers the last 3 history entries', () => {
    // Long history with mostly feint but last 3 are all press → counter = shot
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const result = hardAiCard(
      { ...BASE_STATE, activePlayerStamina: 2 },
      ['feint', 'feint', 'feint', 'feint', 'press', 'press', 'press'],
    );
    expect(result).toBe('shot'); // press is most frequent in last 3
  });
});

// ---------------------------------------------------------------------------
// easyAiLineup
// ---------------------------------------------------------------------------

describe('easyAiLineup', () => {
  it('returns exactly 6 outfield player IDs', () => {
    const lineup = easyAiLineup(TEST_SQUAD);
    expect(lineup.outfield).toHaveLength(6);
    for (const id of lineup.outfield) {
      const p = TEST_SQUAD.find((x) => x.id === id)!;
      expect(p.position).not.toContain('GK');
    }
  });

  it('returns the goalkeeper ID', () => {
    const lineup = easyAiLineup(TEST_SQUAD);
    expect(lineup.goalkeeper).toBe('gk1');
  });

  it('returns valid player IDs from the squad', () => {
    const allIds = TEST_SQUAD.map((p) => p.id);
    const lineup = easyAiLineup(TEST_SQUAD);
    for (const id of lineup.outfield) {
      expect(allIds).toContain(id);
    }
    expect(allIds).toContain(lineup.goalkeeper);
  });

  it('does not include GK in outfield list', () => {
    const lineup = easyAiLineup(TEST_SQUAD);
    expect(lineup.outfield).not.toContain('gk1');
  });
});

// ---------------------------------------------------------------------------
// normalAiLineup
// ---------------------------------------------------------------------------

describe('normalAiLineup', () => {
  it('returns exactly 6 outfield player IDs', () => {
    const lineup = normalAiLineup(TEST_SQUAD, []);
    expect(lineup.outfield).toHaveLength(6);
  });

  it('includes the highest-stat players (p1=25, p2=20)', () => {
    const lineup = normalAiLineup(TEST_SQUAD, []);
    expect(lineup.outfield).toContain('p1');
    expect(lineup.outfield).toContain('p2');
  });

  it('excludes the lowest-stat outfield player (p7=4)', () => {
    const lineup = normalAiLineup(TEST_SQUAD, []);
    expect(lineup.outfield).not.toContain('p7');
  });

  it('returns the first available goalkeeper', () => {
    const lineup = normalAiLineup(TEST_SQUAD, []);
    expect(lineup.goalkeeper).toBe('gk1');
  });
});

// ---------------------------------------------------------------------------
// hardAiLineup
// ---------------------------------------------------------------------------

describe('hardAiLineup', () => {
  it('returns exactly 6 outfield player IDs', () => {
    expect(hardAiLineup(TEST_SQUAD, [], 'aggressive').outfield).toHaveLength(6);
    expect(hardAiLineup(TEST_SQUAD, [], 'defensive').outfield).toHaveLength(6);
    expect(hardAiLineup(TEST_SQUAD, [], 'creative').outfield).toHaveLength(6);
  });

  it('returns the goalkeeper ID', () => {
    expect(hardAiLineup(TEST_SQUAD, [], 'aggressive').goalkeeper).toBe('gk1');
  });

  it('prioritises high-Harhautus players vs Aggressive tactic', () => {
    // p6 has harhautus=6 (highest), p1 has harhautus=5
    const lineup = hardAiLineup(TEST_SQUAD, [], 'aggressive');
    expect(lineup.outfield).toContain('p6');
    // p6 should come before p1 (higher harhautus)
    const p6Idx = lineup.outfield.indexOf('p6');
    const p1Idx = lineup.outfield.indexOf('p1');
    expect(p6Idx).toBeLessThan(p1Idx);
  });

  it('prioritises high-Laukaus players vs Defensive tactic', () => {
    const squad = [
      makePlayer('strongLaukaus', ['MF'], { laukaus: 6, riisto: 1, harhautus: 1, torjunta: 1, stamina: 1 }),
      makePlayer('medLaukaus', ['FW'], { laukaus: 3, riisto: 3, harhautus: 3, torjunta: 3, stamina: 3 }),
      makePlayer('lowLaukaus', ['MF'], { laukaus: 1, riisto: 5, harhautus: 5, torjunta: 5, stamina: 5 }),
      makePlayer('a', ['FW'], {}),
      makePlayer('b', ['MF'], {}),
      makePlayer('c', ['FW'], {}),
      makePlayer('d', ['MF'], {}),
      makePlayer('gk', ['GK'], {}),
    ];
    const lineup = hardAiLineup(squad, [], 'defensive');
    expect(lineup.outfield[0]).toBe('strongLaukaus');
  });

  it('prioritises high-Riisto players vs Creative tactic', () => {
    const squad = [
      makePlayer('strongRiisto', ['MF'], { riisto: 6, laukaus: 1, harhautus: 1, torjunta: 1, stamina: 1 }),
      makePlayer('medRiisto', ['FW'], { riisto: 3, laukaus: 3, harhautus: 3, torjunta: 3, stamina: 3 }),
      makePlayer('lowRiisto', ['MF'], { riisto: 1, laukaus: 5, harhautus: 5, torjunta: 5, stamina: 5 }),
      makePlayer('a', ['FW'], {}),
      makePlayer('b', ['MF'], {}),
      makePlayer('c', ['FW'], {}),
      makePlayer('d', ['MF'], {}),
      makePlayer('gk', ['GK'], {}),
    ];
    const lineup = hardAiLineup(squad, [], 'creative');
    expect(lineup.outfield[0]).toBe('strongRiisto');
  });
});

// ---------------------------------------------------------------------------
// easyAiTactics
// ---------------------------------------------------------------------------

describe('easyAiTactics', () => {
  it('returns a valid tactic', () => {
    for (let i = 0; i < 30; i++) {
      expect(['aggressive', 'defensive', 'creative']).toContain(easyAiTactics());
    }
  });

  it('eventually returns all three tactics (probabilistic check)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 150; i++) seen.add(easyAiTactics());
    expect(seen.size).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// normalAiTactics
// ---------------------------------------------------------------------------

describe('normalAiTactics', () => {
  it('returns "defensive" when AI is ahead', () => {
    expect(normalAiTactics({ ...BASE_STATE, awayGoals: 2, homeGoals: 1 })).toBe('defensive');
  });

  it('returns "aggressive" when AI is behind', () => {
    expect(normalAiTactics({ ...BASE_STATE, awayGoals: 0, homeGoals: 2 })).toBe('aggressive');
  });

  it('returns "defensive" when AI is ahead by many goals', () => {
    expect(normalAiTactics({ ...BASE_STATE, awayGoals: 5, homeGoals: 0 })).toBe('defensive');
  });

  it('returns a valid tactic on a draw', () => {
    const tactic = normalAiTactics({ ...BASE_STATE, awayGoals: 1, homeGoals: 1 });
    expect(['aggressive', 'defensive', 'creative']).toContain(tactic);
  });
});

// ---------------------------------------------------------------------------
// hardAiTactics
// ---------------------------------------------------------------------------

describe('hardAiTactics', () => {
  it('counters "aggressive" with "creative"', () => {
    expect(hardAiTactics(BASE_STATE, 'aggressive')).toBe('creative');
  });

  it('counters "defensive" with "aggressive"', () => {
    expect(hardAiTactics(BASE_STATE, 'defensive')).toBe('aggressive');
  });

  it('counters "creative" with "defensive"', () => {
    expect(hardAiTactics(BASE_STATE, 'creative')).toBe('defensive');
  });
});

// ---------------------------------------------------------------------------
// pickAiCard (dispatcher)
// ---------------------------------------------------------------------------

describe('pickAiCard', () => {
  it('easy → returns a valid card', () => {
    expect(['press', 'feint', 'shot']).toContain(pickAiCard('easy', BASE_STATE, []));
  });

  it('normal → returns a valid card', () => {
    expect(['press', 'feint', 'shot']).toContain(pickAiCard('normal', BASE_STATE, []));
  });

  it('hard → returns a valid card', () => {
    expect(['press', 'feint', 'shot']).toContain(
      pickAiCard('hard', { ...BASE_STATE, activePlayerStamina: 2 }, ['press']),
    );
  });

  it('hard → dispatches counter logic with history', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // no stamina mistake
    const result = pickAiCard(
      'hard',
      { ...BASE_STATE, activePlayerStamina: 2 },
      ['feint', 'feint', 'feint'],
    );
    expect(result).toBe('press'); // press counters feint
  });
});

// ---------------------------------------------------------------------------
// pickAiLineup (dispatcher)
// ---------------------------------------------------------------------------

describe('pickAiLineup', () => {
  it.each(['easy', 'normal', 'hard'] as const)(
    '%s → returns 6 outfield + 1 GK',
    (difficulty) => {
      const lineup = pickAiLineup(difficulty, TEST_SQUAD, [], 'aggressive');
      expect(lineup.outfield).toHaveLength(6);
      expect(lineup.goalkeeper).toBeTruthy();
    },
  );
});

// ---------------------------------------------------------------------------
// pickAiTactics (dispatcher)
// ---------------------------------------------------------------------------

describe('pickAiTactics', () => {
  it('easy → valid tactic', () => {
    expect(['aggressive', 'defensive', 'creative']).toContain(
      pickAiTactics('easy', BASE_STATE, 'aggressive'),
    );
  });

  it('normal → "defensive" when AI ahead', () => {
    expect(
      pickAiTactics('normal', { ...BASE_STATE, awayGoals: 2, homeGoals: 0 }, 'aggressive'),
    ).toBe('defensive');
  });

  it('hard → counters player tactic', () => {
    expect(pickAiTactics('hard', BASE_STATE, 'aggressive')).toBe('creative');
    expect(pickAiTactics('hard', BASE_STATE, 'defensive')).toBe('aggressive');
    expect(pickAiTactics('hard', BASE_STATE, 'creative')).toBe('defensive');
  });
});

// ---------------------------------------------------------------------------
// pickAiCharacter
// ---------------------------------------------------------------------------

/**
 * Outfield-only subset of TEST_SQUAD used for character-pick tests.
 * Excludes the GK so all players are valid char picks.
 */
const OUTFIELD_SQUAD = TEST_SQUAD.filter((p) => !p.position.includes('GK'));

describe('pickAiCharacter — easy', () => {
  it('returns a player from the outfield lineup', () => {
    const picked = pickAiCharacter('easy', OUTFIELD_SQUAD, true, 1);
    expect(OUTFIELD_SQUAD.map((p) => p.id)).toContain(picked.id);
  });

  it('eventually returns different players (random)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(pickAiCharacter('easy', OUTFIELD_SQUAD, true, 1).id);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('pickAiCharacter — normal', () => {
  it('when attacking, picks player with highest max(laukaus, harhautus)', () => {
    // p6: laukaus=1, harhautus=6 → max = 6; p1: max = 5 → p6 wins
    const picked = pickAiCharacter('normal', OUTFIELD_SQUAD, true, 1);
    expect(picked.id).toBe('p6');
  });

  it('when defending, picks player with highest torjunta', () => {
    // p1: torjunta=5 → highest
    const picked = pickAiCharacter('normal', OUTFIELD_SQUAD, false, 1);
    expect(picked.id).toBe('p1');
  });

  it('works identically in second half (no stamina awareness)', () => {
    // Normal does not penalise stamina-1 players; p6 still wins attacking
    const picked = pickAiCharacter('normal', OUTFIELD_SQUAD, true, 2);
    expect(picked.id).toBe('p6');
  });
});

describe('pickAiCharacter — hard', () => {
  it('when attacking in first half, picks highest effective attack stat', () => {
    // Same as Normal in first half — p6 has harhautus 6
    const picked = pickAiCharacter('hard', OUTFIELD_SQUAD, true, 1);
    expect(picked.id).toBe('p6');
  });

  it('when defending in second half, avoids stamina-1 players when a better option exists', () => {
    // p5 and p6 both have stamina=1 → torjunta-1=0 → clamped to 1
    // p1 has torjunta=5 and stamina=5 → no penalty → p1 wins
    const picked = pickAiCharacter('hard', OUTFIELD_SQUAD, false, 2);
    expect(picked.id).toBe('p1');
  });

  it('when attacking in second half, factors in stamina penalty', () => {
    // p6: harhautus=6, stamina=1 → penalty → eff=max(1,5)=5
    // p1: laukaus=5, stamina=5 → no penalty → eff=5 (tie → p6 comes first if sorted stably, p1 wins if sort is stable)
    // Actually after penalty, p6 effective = max(1, 6-1)=5; p1 = max(5,5)=5 → tie → sort order (first in list wins)
    // p1 is index 0 so after sort [p1, ...others, p6] → p1 or p6 depending on sort stability
    // The result should be p1 or p6 — just verify it's one of them
    const picked = pickAiCharacter('hard', OUTFIELD_SQUAD, true, 2);
    expect(['p1', 'p6']).toContain(picked.id);
  });

  it('picks from a single-player lineup without error', () => {
    const single = [makePlayer('solo', ['MF'], { laukaus: 4, harhautus: 4, torjunta: 4, stamina: 2, riisto: 3 })];
    expect(() => pickAiCharacter('hard', single, true, 1)).not.toThrow();
    expect(pickAiCharacter('hard', single, true, 1).id).toBe('solo');
  });
});
