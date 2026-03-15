import { describe, it, expect } from 'vitest';
import {
  pressure44,
  tryHardMode,
  applyStaminaPenalty,
  kapteeni,
  kaaoksenLahettilas,
  matigol,
  ninja,
  tuplablokki,
  laitanousu,
  dominoiva,
  checkReactiveSwitch,
} from '../../../src/engine/abilities';
import { CARD } from '../../../src/engine/duel';

// Note: brickWall tests moved to goalkeeper.test.ts

describe('pressure44()', () => {
  it('restricts opponent Feint when Jyrki wins (SQ-07)', () => {
    expect(pressure44('attacker', 'jyrki_orjasniemi').restrictOpponentFeint).toBe(true);
  });

  it('does not restrict when Jyrki loses', () => {
    expect(pressure44('defender', 'jyrki_orjasniemi').restrictOpponentFeint).toBe(false);
  });

  it('does not restrict for other players', () => {
    expect(pressure44('attacker', 'mauno_ahlgren').restrictOpponentFeint).toBe(false);
  });

  it('null result (tie) does not restrict', () => {
    expect(pressure44(null, 'jyrki_orjasniemi').restrictOpponentFeint).toBe(false);
  });
});

describe('tryHardMode()', () => {
  it('signals Sattuma draw when Mauno wins a duel (SQ-04)', () => {
    expect(tryHardMode('attacker', 'mauno_ahlgren').drawSattuma).toBe(true);
  });

  it('does not draw Sattuma when Mauno loses', () => {
    expect(tryHardMode('defender', 'mauno_ahlgren').drawSattuma).toBe(false);
  });

  it('does not draw Sattuma on null result', () => {
    expect(tryHardMode(null, 'mauno_ahlgren').drawSattuma).toBe(false);
  });

  it('does not draw Sattuma for other players', () => {
    expect(tryHardMode('attacker', 'alanen').drawSattuma).toBe(false);
  });
});

describe('applyStaminaPenalty()', () => {
  // stamina=1 → penalty applies in second half
  const stats = { riisto: 3, laukaus: 3, harhautus: 3, torjunta: 3, stamina: 1 };

  it('applies -1 to all card stats in second half when stamina = 1', () => {
    const result = applyStaminaPenalty(stats, 2);
    expect(result.riisto).toBe(2);
    expect(result.laukaus).toBe(2);
    expect(result.harhautus).toBe(2);
    expect(result.torjunta).toBe(2);
  });

  it('does not modify stamina stat itself', () => {
    const result = applyStaminaPenalty(stats, 2);
    expect(result.stamina).toBe(1);
  });

  it('does not apply penalty in first half', () => {
    const result = applyStaminaPenalty(stats, 1);
    expect(result.riisto).toBe(3);
  });

  it('does not apply penalty when stamina >= 2', () => {
    const result = applyStaminaPenalty({ ...stats, stamina: 2 }, 2);
    expect(result.riisto).toBe(3);
  });

  it('stats do not drop below 1', () => {
    const lowStats = { riisto: 1, laukaus: 1, harhautus: 1, torjunta: 1, stamina: 1 };
    const result = applyStaminaPenalty(lowStats, 2);
    expect(result.riisto).toBe(1);
    expect(result.torjunta).toBe(1);
  });
});

// ─── New ability unit tests (v0.7.0) ──────────────────────────────────────────

describe('kapteeni() — Olli Mehtonen #20 (SQ-10)', () => {
  it('applies boost when Mehtonen wins', () => {
    expect(kapteeni('olli_mehtonen').applyBoost).toBe(true);
  });

  it('does not apply boost for other players', () => {
    expect(kapteeni('mauno_ahlgren').applyBoost).toBe(false);
    expect(kapteeni('jyrki_orjasniemi').applyBoost).toBe(false);
  });

  it('does not apply boost on draw (null winner)', () => {
    expect(kapteeni(null).applyBoost).toBe(false);
  });
});

describe('kaaoksenLahettilas() — Mauno Ahlgren #15 (SQ-04)', () => {
  it('signals Sattuma draw when Mauno wins regardless of role', () => {
    expect(kaaoksenLahettilas('mauno_ahlgren').drawSattuma).toBe(true);
  });

  it('does not draw Sattuma for other players', () => {
    expect(kaaoksenLahettilas('olli_mehtonen').drawSattuma).toBe(false);
  });

  it('does not draw Sattuma on draw (null winner)', () => {
    expect(kaaoksenLahettilas(null).drawSattuma).toBe(false);
  });
});

describe('matigol() — Kimmo Mattila #14 (SQ-05)', () => {
  it('auto-goal when Mattila wins with possession', () => {
    expect(matigol('kimmo_mattila', true).autoGoal).toBe(true);
  });

  it('no auto-goal when Mattila wins WITHOUT possession (defending)', () => {
    expect(matigol('kimmo_mattila', false).autoGoal).toBe(false);
  });

  it('no auto-goal for other players even with possession', () => {
    expect(matigol('olli_mehtonen', true).autoGoal).toBe(false);
  });

  it('no auto-goal on draw', () => {
    expect(matigol(null, true).autoGoal).toBe(false);
  });
});

describe('ninja() — Iiro Mäkelä #13 (SQ-08)', () => {
  it('goal attempt when Makela wins WITHOUT possession (defending)', () => {
    expect(ninja('iiro_makela', false).attemptGoal).toBe(true);
  });

  it('no goal attempt when Makela wins WITH possession (normal attack)', () => {
    expect(ninja('iiro_makela', true).attemptGoal).toBe(false);
  });

  it('no goal attempt for other players without possession', () => {
    expect(ninja('olli_mehtonen', false).attemptGoal).toBe(false);
  });

  it('no goal attempt on draw', () => {
    expect(ninja(null, false).attemptGoal).toBe(false);
  });
});

describe('tuplablokki() — Ossi Nieminen #60 (SQ-11)', () => {
  it('restricts opponent Shot when Nieminen wins', () => {
    expect(tuplablokki('ossi_nieminen').restrictOpponentShot).toBe(true);
  });

  it('does not restrict for other players', () => {
    expect(tuplablokki('mauno_ahlgren').restrictOpponentShot).toBe(false);
  });

  it('does not restrict on draw', () => {
    expect(tuplablokki(null).restrictOpponentShot).toBe(false);
  });
});

describe('laitanousu() — Olli Kurkela #21 (SQ-12)', () => {
  it('restricts opponent Press when Kurkela wins', () => {
    expect(laitanousu('olli_kurkela').restrictOpponentPress).toBe(true);
  });

  it('does not restrict for other players', () => {
    expect(laitanousu('olli_mehtonen').restrictOpponentPress).toBe(false);
  });

  it('does not restrict on draw', () => {
    expect(laitanousu(null).restrictOpponentPress).toBe(false);
  });
});

describe('dominoiva() — Jari Savela #8 (SQ-09)', () => {
  it('cancels opponent ability when Savela wins', () => {
    expect(dominoiva('jari_savela').cancelOpponentAbility).toBe(true);
  });

  it('does not cancel for other players', () => {
    expect(dominoiva('mauno_ahlgren').cancelOpponentAbility).toBe(false);
  });

  it('does not cancel on draw', () => {
    expect(dominoiva(null).cancelOpponentAbility).toBe(false);
  });
});

describe('checkReactiveSwitch()', () => {
  // ── Estola (#88) ──────────────────────────────────────────────────────────

  it('Estola: played Press → can switch to Shot (SQ-06)', () => {
    const result = checkReactiveSwitch('jukka_estola', CARD.PRESS);
    expect(result.canSwitch).toBe(true);
    expect(result.switchTo).toBe(CARD.SHOT);
  });

  it('Estola: played Feint → no reactive switch', () => {
    const result = checkReactiveSwitch('jukka_estola', CARD.FEINT);
    expect(result.canSwitch).toBe(false);
    expect(result.switchTo).toBeNull();
  });

  it('Estola: played Shot → no reactive switch', () => {
    const result = checkReactiveSwitch('jukka_estola', CARD.SHOT);
    expect(result.canSwitch).toBe(false);
    expect(result.switchTo).toBeNull();
  });

  // ── Alanen (#83) ──────────────────────────────────────────────────────────

  it('Alanen: played Shot → can switch to Feint (SQ-13)', () => {
    const result = checkReactiveSwitch('petri_alanen', CARD.SHOT);
    expect(result.canSwitch).toBe(true);
    expect(result.switchTo).toBe(CARD.FEINT);
  });

  it('Alanen: played Press → no reactive switch', () => {
    const result = checkReactiveSwitch('petri_alanen', CARD.PRESS);
    expect(result.canSwitch).toBe(false);
    expect(result.switchTo).toBeNull();
  });

  it('Alanen: played Feint → no reactive switch', () => {
    const result = checkReactiveSwitch('petri_alanen', CARD.FEINT);
    expect(result.canSwitch).toBe(false);
    expect(result.switchTo).toBeNull();
  });

  // ── Haritonov (#19) ───────────────────────────────────────────────────────

  it('Haritonov: played Feint → can switch to Press (SQ-14)', () => {
    const result = checkReactiveSwitch('antti_haritonov', CARD.FEINT);
    expect(result.canSwitch).toBe(true);
    expect(result.switchTo).toBe(CARD.PRESS);
  });

  it('Haritonov: played Shot → no reactive switch', () => {
    const result = checkReactiveSwitch('antti_haritonov', CARD.SHOT);
    expect(result.canSwitch).toBe(false);
    expect(result.switchTo).toBeNull();
  });

  it('Haritonov: played Press → no reactive switch', () => {
    const result = checkReactiveSwitch('antti_haritonov', CARD.PRESS);
    expect(result.canSwitch).toBe(false);
    expect(result.switchTo).toBeNull();
  });

  // ── Other players ─────────────────────────────────────────────────────────

  it('non-reactive player always returns canSwitch false', () => {
    const result = checkReactiveSwitch('mauno_ahlgren', CARD.PRESS);
    expect(result.canSwitch).toBe(false);
    expect(result.switchTo).toBeNull();
  });

  it('unknown player ID returns canSwitch false', () => {
    const result = checkReactiveSwitch('unknown_player_id', CARD.FEINT);
    expect(result.canSwitch).toBe(false);
    expect(result.switchTo).toBeNull();
  });
});
