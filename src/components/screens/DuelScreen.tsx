/**
 * @file DuelScreen.tsx
 * The main duel gameplay screen, supporting both two-player and AI modes.
 *
 * ── Two-player mode (aiDifficulty === null) ──────────────────────────────────
 * UI state machine:
 *   [stamina_warning?]
 *   → attacker_char_pick → attacker_card_pick
 *   → cover
 *   → defender_char_pick → defender_card_pick
 *   → [reactive_check?] → show_result
 *
 * ── AI mode (aiDifficulty !== null) ─────────────────────────────────────────
 * Human always controls the Home (left) side. Away side is the AI.
 * UI state machine:
 *   [stamina_warning?] → human_char_pick → human_card_pick → [reactive_check?] → show_result
 *
 *   If home has possession (human is attacker):
 *     1. Human picks char, then card
 *     2. AI picks char + card simultaneously
 *     3. [reactive_check if applicable]
 *     4. Resolve → show result
 *
 *   If away has possession (AI is attacker):
 *     1. Human picks char, then card (as defender)
 *     2. AI picks char + card simultaneously
 *     3. [reactive_check if applicable]
 *     4. Resolve → show result
 *
 * ── Goal attempt (no dedicated GK) ───────────────────────────────────────────
 * Each side picks one outfield player (the "chosen character") before picking a card.
 * When an attacker wins with possession:
 *   attacker_char.max(laukaus, harhautus) vs defender_char.torjunta → goal or save
 * The chosen characters' stats are also used for the card duel itself.
 *
 * ── Stamina penalty (second half) ────────────────────────────────────────────
 * Players with stamina === 1 receive -1 to riisto, laukaus, harhautus, torjunta
 * (min 1 each) in the second half.  A warning panel is shown at duel 0 of half 2
 * listing the affected players.
 *
 * ── Ability system ────────────────────────────────────────────────────────────
 * After both cards are chosen, reactive abilities are checked first:
 *   - Estola (#88): played Press → can switch to Shot
 *   - Alanen (#83): played Shot  → can switch to Feint
 *   - Haritonov (#19): played Feint → can switch to Press
 *
 * Post-win abilities trigger after resolution:
 *   - Kapteeni (Mehtonen #20): +2 all card stats next duel (shown as notification)
 *   - Kaaoksen lähettiläs (Mauno #15): draw Sattuma card (notification only in Phase 1)
 *   - 44 min paine (Jyrki #5): opponent can't play Feint next duel
 *   - Dominoiva (Savela #8): opponent's next ability cancelled
 *   - Tuplablokki (Nieminen #60): opponent can't play Shot next duel
 *   - Laitanousu (Kurkela #21): opponent can't play Press next duel
 *   - Matigol (Mattila #14): auto-goal when winning as attacker
 *   - Ninja (Mäkelä #13): goal attempt when winning as defender
 *
 * In AI mode the cover screen is skipped — no second human needs to be shielded.
 * The human's card is always recorded in matchStore.playerCardHistory for Hard AI.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../store/matchStore';
import { useSquadStore, type SquadSlot } from '../../store/squadStore';
import { useSessionStore } from '../../store/sessionStore';
import { resolveDuel, CARD, type Card, type PlayerStats } from '../../engine/duel';
import { resolvePossession, type Side } from '../../engine/possession';
import { resolveGoalkeeping } from '../../engine/goalkeeper';
import { pickAiCard, pickAiCharacter, DUELS_PER_HALF, type CardChoice } from '../../engine/ai';
import {
  kapteeni,
  kaaoksenLahettilas,
  matigol,
  ninja,
  tuplablokki,
  laitanousu,
  dominoiva,
  checkReactiveSwitch,
} from '../../engine/abilities';
import type { ActiveEffect } from '../../store/matchStore';
import type { Player } from '../../store/squadStore';
import CardButton from '../ui/CardButton';
import ScoreBoard from '../ui/ScoreBoard';
import HelpModal from '../ui/HelpModal';
import QuitMatchButton from '../ui/QuitMatchButton';
import PlayerCard from '../ui/PlayerCard';

// ─── Types ─────────────────────────────────────────────────────────────────────

/** Phase names for two-player mode */
type TwoPlayerUiPhase =
  | 'attacker_char_pick'
  | 'attacker_card_pick'
  | 'cover'
  | 'defender_char_pick'
  | 'defender_card_pick'
  | 'reactive_check'
  | 'show_result';

/** Phase names for AI mode */
type AiUiPhase = 'human_char_pick' | 'human_card_pick' | 'reactive_check' | 'show_result';

/** Phase shown at the start of the second half when stamina-penalised players exist */
type StaminaUiPhase = 'stamina_warning';

type DuelUiPhase = TwoPlayerUiPhase | AiUiPhase | StaminaUiPhase;

/**
 * A triggered ability notification shown in the result panel.
 */
interface AbilityNotification {
  /** Display name of the player whose ability triggered */
  playerName: string;
  /** i18n key under the `ability` namespace describing the effect */
  effectKey: string;
}

/**
 * Info about a reactive switch opportunity, shown during `reactive_check` phase.
 */
interface ReactiveInfo {
  /** Whether the reactive player is the attacker or defender */
  side: 'attacker' | 'defender';
  /** The card the reactive player can switch to */
  switchTo: Card;
  /** Display name of the reactive player */
  playerName: string;
  /** The opponent's card (shown to the reactive player to inform their decision) */
  opponentCard: Card;
}

/**
 * Result of a resolved duel, stored until the Continue button is pressed.
 */
interface DuelResult {
  winner: 'attacker' | 'defender' | null;
  goalAttempt: boolean;
  goalScored: boolean;
  triviaBoostUsed: boolean;
  /** All ability notifications to display in the result panel */
  triggeredAbilities: AbilityNotification[];
  /** Player name of the goal scorer (null if no goal) */
  scorerName: string | null;
  /** Defender name when a save was made (null if no save or goal scored) */
  keeperName: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fallback stats when no lineup slot is present (should not occur in normal play) */
const FALLBACK_STATS: PlayerStats = { riisto: 3, laukaus: 3, harhautus: 3, torjunta: 3, stamina: 3 };

/**
 * Apply a partial stat modifier to a base stat block, clamping each stat to min 1.
 *
 * @param base - The base stat block
 * @param mod - Partial modifier to add (e.g. Kapteeni +2 boost)
 * @returns Modified stat block
 */
function applyStatMod(base: PlayerStats, mod: Partial<PlayerStats> | undefined): PlayerStats {
  if (!mod) return base;
  return {
    riisto: Math.max(1, base.riisto + (mod.riisto ?? 0)),
    laukaus: Math.max(1, base.laukaus + (mod.laukaus ?? 0)),
    harhautus: Math.max(1, base.harhautus + (mod.harhautus ?? 0)),
    torjunta: Math.max(1, base.torjunta + (mod.torjunta ?? 0)),
    stamina: Math.max(1, base.stamina + (mod.stamina ?? 0)),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * DuelScreen — handles character pick, card selection, duel resolution, possession,
 * and ability notifications.
 *
 * Second-half stamina penalty (-1 all stats for stamina=1 players) is applied
 * dynamically via computeCharStats() — no persistent state mutation required.
 *
 * @returns The duel screen element
 */
export default function DuelScreen(): JSX.Element {
  const { t } = useTranslation();

  // ── Store selectors (individual to avoid infinite re-renders) ──────────────
  const half = useMatchStore((s) => s.half);
  const duelIndex = useMatchStore((s) => s.duelIndex);
  const homeGoals = useMatchStore((s) => s.homeGoals);
  const awayGoals = useMatchStore((s) => s.awayGoals);
  const possession = useMatchStore((s) => s.possession);
  const triviaBoostActive = useMatchStore((s) => s.triviaBoostActive);
  const playerCardHistory = useMatchStore((s) => s.playerCardHistory);
  const effects = useMatchStore((s) => s.effects);
  const homeTactic = useMatchStore((s) => s.homeTactic);
  const awayTactic = useMatchStore((s) => s.awayTactic);
  const scoreGoal = useMatchStore((s) => s.scoreGoal);
  const advanceDuel = useMatchStore((s) => s.advanceDuel);
  const setPossession = useMatchStore((s) => s.setPossession);
  const recordPlayerCard = useMatchStore((s) => s.recordPlayerCard);
  const addEffect = useMatchStore((s) => s.addEffect);
  const expireEffect = useMatchStore((s) => s.expireEffect);
  const homeLineup = useSquadStore((s) => s.homeLineup);
  const awayLineup = useSquadStore((s) => s.awayLineup);
  const aiDifficulty = useSessionStore((s) => s.aiDifficulty);

  const isAiMatch = aiDifficulty !== null;

  // ── Derived lineup data ───────────────────────────────────────────────────
  const attackerSide: Side = possession ?? 'home';
  const defenderSide: Side = attackerSide === 'home' ? 'away' : 'home';

  const attackerLineup = attackerSide === 'home' ? homeLineup : awayLineup;
  const defenderLineup = defenderSide === 'home' ? homeLineup : awayLineup;

  /** Outfield slots for each side (no GK) */
  const attackerOutfield = attackerLineup.filter((s) => !s.player.position.includes('GK'));
  const defenderOutfield = defenderLineup.filter((s) => !s.player.position.includes('GK'));

  // ── Stamina-affected players (computed once on mount) ─────────────────────
  /**
   * Players with stamina === 1 who will be penalised in the second half.
   * Only computed at the start of the second half (half === 2, duelIndex === 0).
   */
  const [staminaAffected] = useState<Player[]>(() => {
    if (half !== 2 || duelIndex !== 0) return [];
    const seen = new Set<string>();
    return [...homeLineup, ...awayLineup]
      .filter((s) => !s.player.position.includes('GK'))
      .filter((s) => {
        if (seen.has(s.player.id)) return false;
        seen.add(s.player.id);
        return true;
      })
      .filter((s) => s.player.stats.stamina === 1)
      .map((s) => s.player);
  });

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [uiPhase, setUiPhase] = useState<DuelUiPhase>(() => {
    // Show stamina warning at the start of the second half if any players are affected
    if (half === 2 && duelIndex === 0) {
      const hasStaminaPenalty = [...homeLineup, ...awayLineup].some(
        (s) => !s.player.position.includes('GK') && s.player.stats.stamina === 1,
      );
      if (hasStaminaPenalty) return 'stamina_warning';
    }
    return isAiMatch ? 'human_char_pick' : 'attacker_char_pick';
  });

  const [attackerChar, setAttackerChar] = useState<SquadSlot | null>(null);
  const [defenderChar, setDefenderChar] = useState<SquadSlot | null>(null);
  const [attackerCard, setAttackerCard] = useState<Card | null>(null);
  const [defenderCard, setDefenderCard] = useState<Card | null>(null);
  const [reactiveInfo, setReactiveInfo] = useState<ReactiveInfo | null>(null);
  const [duelResult, setDuelResult] = useState<DuelResult | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // ── Active effect lookups ─────────────────────────────────────────────────

  /** Non-expired effects on the attacker's side */
  const attackerActiveEffects = effects[attackerSide].filter((e) => !e.expired);
  /** Non-expired effects on the defender's side */
  const defenderActiveEffects = effects[defenderSide].filter((e) => !e.expired);

  /** Kapteeni boost on attacker's side (adds to stats next duel) */
  const attackerKapteeniBoost = attackerActiveEffects.find((e) => e.id === 'kapteeni_boost')?.statMod;
  /** Kapteeni boost on defender's side */
  const defenderKapteeniBoost = defenderActiveEffects.find((e) => e.id === 'kapteeni_boost')?.statMod;

  /** Card restrictions on attacker's side */
  const attackerPressRestricted = attackerActiveEffects.some((e) => e.id === 'restrict_press');
  const attackerFeintRestricted = attackerActiveEffects.some((e) => e.id === 'restrict_feint');
  const attackerShotRestricted = attackerActiveEffects.some((e) => e.id === 'restrict_shot');

  /** Card restrictions on defender's side */
  const defenderPressRestricted = defenderActiveEffects.some((e) => e.id === 'restrict_press');
  const defenderFeintRestricted = defenderActiveEffects.some((e) => e.id === 'restrict_feint');
  const defenderShotRestricted = defenderActiveEffects.some((e) => e.id === 'restrict_shot');

  // ── Stat computation ──────────────────────────────────────────────────────

  /**
   * Compute effective stats for a chosen character slot, applying:
   *   1. Slot stat modifier (from abilities/halftime changes)
   *   2. Stamina penalty in second half (if stamina === 1: -1 to all stats, min 1)
   *   3. Kapteeni boost
   *
   * @param slot          - The chosen SquadSlot
   * @param kapteeniBoost - Optional Kapteeni boost modifier for this side
   * @returns The effective PlayerStats for this duel
   */
  function computeCharStats(
    slot: SquadSlot,
    kapteeniBoost?: Partial<PlayerStats>,
  ): PlayerStats {
    const base: PlayerStats = {
      riisto: slot.player.stats.riisto + (slot.statModifier.riisto ?? 0),
      laukaus: slot.player.stats.laukaus + (slot.statModifier.laukaus ?? 0),
      harhautus: slot.player.stats.harhautus + (slot.statModifier.harhautus ?? 0),
      torjunta: slot.player.stats.torjunta + (slot.statModifier.torjunta ?? 0),
      stamina: slot.player.stats.stamina + (slot.statModifier.stamina ?? 0),
    };

    if (half === 2 && base.stamina === 1) {
      const penalised: PlayerStats = {
        riisto: Math.max(1, base.riisto - 1),
        laukaus: Math.max(1, base.laukaus - 1),
        harhautus: Math.max(1, base.harhautus - 1),
        torjunta: Math.max(1, base.torjunta - 1),
        stamina: base.stamina,
      };
      return applyStatMod(penalised, kapteeniBoost);
    }

    return applyStatMod(base, kapteeniBoost);
  }

  /** Effective stats for the chosen attacker character (or fallback) */
  const attackerStats = attackerChar
    ? computeCharStats(attackerChar, attackerKapteeniBoost)
    : FALLBACK_STATS;

  /** Effective stats for the chosen defender character (or fallback) */
  const defenderStats = defenderChar
    ? computeCharStats(defenderChar, defenderKapteeniBoost)
    : FALLBACK_STATS;

  // In AI mode, the human is always the home side
  const humanIsAttacker = isAiMatch ? attackerSide === 'home' : true;

  // ── Display characters (for the active-players-row preview) ──────────────
  /** Default to first outfield player as preview before char is chosen */
  const displayAttackerChar = attackerChar ?? attackerOutfield[0] ?? null;
  const displayDefenderChar = defenderChar ?? defenderOutfield[0] ?? null;

  // ── AI helpers ──────────────────────────────────────────────────────────────

  /**
   * Ask the AI to pick its character for this duel.
   * The AI is always the away side.
   *
   * @param aiIsAttacking - True when AI has possession
   * @returns A SquadSlot representing the AI's chosen character
   */
  function getAiCharacterSlot(aiIsAttacking: boolean): SquadSlot {
    const aiOutfield = awayLineup.filter((s) => !s.player.position.includes('GK'));
    const aiPlayers = aiOutfield.map((s) => s.player);
    const picked = pickAiCharacter(aiDifficulty!, aiPlayers, aiIsAttacking, half);
    return aiOutfield.find((s) => s.player.id === picked.id) ?? aiOutfield[0];
  }

  /**
   * Ask the AI to pick a card given the current game state.
   *
   * @returns A Card value chosen by the AI
   */
  function getAiCard(): Card {
    const aiChar = attackerSide === 'away' ? attackerChar : defenderChar;
    const activePlayerStamina = aiChar?.player.stats.stamina ?? 2;

    const lastPlayerCard =
      playerCardHistory.length > 0
        ? playerCardHistory[playerCardHistory.length - 1]
        : undefined;

    return pickAiCard(
      aiDifficulty!,
      {
        possession: possession ?? 'home',
        homeGoals,
        awayGoals,
        duelIndex,
        half,
        duelsPerHalf: DUELS_PER_HALF,
        lastPlayerCard,
        activePlayerStamina,
      },
      playerCardHistory,
    ) as Card;
  }

  // ── Reactive ability check ─────────────────────────────────────────────────

  /**
   * Check if either player has a reactive ability that can trigger given the chosen cards.
   * Attacker is checked first; only one reactive panel is shown per duel.
   * Uses the chosen character slots for ability ID lookup.
   *
   * @param atkCard - Card chosen by the attacker
   * @param defCard - Card chosen by the defender
   * @returns ReactiveInfo if a reactive switch is possible, null otherwise
   */
  function findReactivePlayer(atkCard: Card, defCard: Card): ReactiveInfo | null {
    // Check attacker first
    const attackerCancelled = attackerActiveEffects.some((e) => e.id === 'ability_cancelled');
    if (!attackerCancelled && attackerChar) {
      const { canSwitch, switchTo } = checkReactiveSwitch(attackerChar.player.id, atkCard);
      if (canSwitch && switchTo) {
        return {
          side: 'attacker',
          switchTo,
          playerName: attackerChar.player.name,
          opponentCard: defCard,
        };
      }
    }

    // Then check defender
    const defenderCancelled = defenderActiveEffects.some((e) => e.id === 'ability_cancelled');
    if (!defenderCancelled && defenderChar) {
      const { canSwitch, switchTo } = checkReactiveSwitch(defenderChar.player.id, defCard);
      if (canSwitch && switchTo) {
        return {
          side: 'defender',
          switchTo,
          playerName: defenderChar.player.name,
          opponentCard: atkCard,
        };
      }
    }

    return null;
  }

  // ── Post-win ability triggers ──────────────────────────────────────────────

  /**
   * Trigger all post-win abilities for the winner, add effects to the store,
   * and return a list of notifications to display.
   *
   * @param effectiveWinnerId - Winner's player ID, or null if ability is cancelled
   * @param winnerSide - The side that won (or null on draw)
   * @param loserSide - The side that lost (or null on draw)
   * @param winnerPlayerName - Display name for notifications
   * @returns Array of ability notifications
   */
  function triggerPostWinAbilities(
    effectiveWinnerId: string | null,
    winnerSide: Side | null,
    loserSide: Side | null,
    winnerPlayerName: string,
  ): AbilityNotification[] {
    if (!effectiveWinnerId || !winnerSide || !loserSide) return [];

    const notifications: AbilityNotification[] = [];

    // ── Kapteeni (Mehtonen #20) — +2 all card stats next duel ──────────────
    const { applyBoost } = kapteeni(effectiveWinnerId);
    if (applyBoost) {
      const boost: ActiveEffect = {
        id: 'kapteeni_boost',
        source: 'olli_mehtonen',
        expiresAfterDuel: duelIndex + 1,
        expired: false,
        statMod: { riisto: 2, laukaus: 2, harhautus: 2 },
      };
      addEffect(winnerSide, boost);
      notifications.push({ playerName: winnerPlayerName, effectKey: 'ability.kapteeni_triggered' });
    }

    // ── Kaaoksen lähettiläs (Mauno #15) — draw Sattuma (notification only) ─
    const { drawSattuma } = kaaoksenLahettilas(effectiveWinnerId);
    if (drawSattuma) {
      notifications.push({ playerName: winnerPlayerName, effectKey: 'ability.mauno_triggered' });
    }

    // ── 44 min paine (Jyrki #5) — restrict opponent Feint ──────────────────
    if (effectiveWinnerId === 'jyrki_orjasniemi') {
      addEffect(loserSide, {
        id: 'restrict_feint',
        source: 'jyrki_orjasniemi',
        expiresAfterDuel: duelIndex + 1,
        expired: false,
      });
      notifications.push({ playerName: winnerPlayerName, effectKey: 'ability.pressure44_triggered' });
    }

    // ── Dominoiva (Savela #8) — cancel opponent's next ability ─────────────
    const { cancelOpponentAbility } = dominoiva(effectiveWinnerId);
    if (cancelOpponentAbility) {
      addEffect(loserSide, {
        id: 'ability_cancelled',
        source: 'jari_savela',
        expiresAfterDuel: duelIndex + 1,
        expired: false,
      });
      notifications.push({ playerName: winnerPlayerName, effectKey: 'ability.dominoiva_triggered' });
    }

    // ── Tuplablokki (Nieminen #60) — restrict opponent Shot ─────────────────
    const { restrictOpponentShot } = tuplablokki(effectiveWinnerId);
    if (restrictOpponentShot) {
      addEffect(loserSide, {
        id: 'restrict_shot',
        source: 'ossi_nieminen',
        expiresAfterDuel: duelIndex + 1,
        expired: false,
      });
      notifications.push({ playerName: winnerPlayerName, effectKey: 'ability.tuplablokki_triggered' });
    }

    // ── Laitanousu (Kurkela #21) — restrict opponent Press ──────────────────
    const { restrictOpponentPress } = laitanousu(effectiveWinnerId);
    if (restrictOpponentPress) {
      addEffect(loserSide, {
        id: 'restrict_press',
        source: 'olli_kurkela',
        expiresAfterDuel: duelIndex + 1,
        expired: false,
      });
      notifications.push({ playerName: winnerPlayerName, effectKey: 'ability.laitanousu_triggered' });
    }

    return notifications;
  }

  // ── Duel resolution ────────────────────────────────────────────────────────

  /**
   * Resolve the duel after both cards are known (and any reactive switch applied).
   * Uses the chosen character stats for both the card duel and the goal attempt:
   *   - Normal goal: attacker char's laukaus/harhautus vs defender char's torjunta
   *   - Ninja counter: defender char's laukaus/harhautus vs attacker char's torjunta
   *
   * @param atkCard - Final card played by the attacker
   * @param defCard - Final card played by the defender
   */
  function resolveCurrent(atkCard: Card, defCard: Card) {
    const triviaBoostUsed = triviaBoostActive && attackerSide === 'home';
    const winner: 'attacker' | 'defender' | null = triviaBoostUsed
      ? 'attacker'
      : resolveDuel(atkCard, defCard, attackerStats, defenderStats);

    // Winner identity
    const winnerSide: Side | null =
      winner === 'attacker' ? attackerSide : winner === 'defender' ? defenderSide : null;
    const loserSide: Side | null =
      winnerSide === 'home' ? 'away' : winnerSide === 'away' ? 'home' : null;
    const winnerPlayerId: string | null =
      winner === 'attacker'
        ? (attackerChar?.player.id ?? null)
        : winner === 'defender'
          ? (defenderChar?.player.id ?? null)
          : null;
    const winnerPlayerName: string =
      winner === 'attacker'
        ? (attackerChar?.player.name ?? '')
        : winner === 'defender'
          ? (defenderChar?.player.name ?? '')
          : '';

    // Check if winner's own ability is cancelled by Dominoiva
    const winnerAbilityCancelled =
      winnerSide !== null &&
      effects[winnerSide].some((e) => e.id === 'ability_cancelled' && !e.expired);
    const effectiveWinnerId = winnerAbilityCancelled ? null : winnerPlayerId;

    // ── Special goal abilities ─────────────────────────────────────────────
    const winnerHasPossession = winnerSide === attackerSide;

    const { autoGoal } = matigol(effectiveWinnerId, winnerHasPossession);
    const { attemptGoal: ninjaGoal } = ninja(effectiveWinnerId, winnerHasPossession);

    // Normal possession + goal attempt logic
    const { possession: newPossession, goalAttempt: normalGoalAttempt } = resolvePossession(
      attackerSide,
      winner,
      attackerSide,
      atkCard,
    );

    const finalGoalAttempt = autoGoal || normalGoalAttempt || ninjaGoal;
    let goalScored = false;
    let scorerName: string | null = null;
    let keeperName: string | null = null;
    const notifications: AbilityNotification[] = [];

    if (autoGoal) {
      // Matigol: auto-goal, no torjunta check
      goalScored = true;
      scorerName = winnerPlayerName;
      scoreGoal(winnerSide!);
      notifications.push({
        playerName: winnerPlayerName,
        effectKey: 'ability.matigol_triggered',
      });
    } else if (finalGoalAttempt) {
      const isNinjaAttempt = ninjaGoal && !normalGoalAttempt;

      // Ninja: defender counter-attacks → defender is shooter, attacker torjunta blocks
      // Normal: attacker shoots → defender torjunta blocks
      const shooterStats = isNinjaAttempt ? defenderStats : attackerStats;
      const targetTorjunta = isNinjaAttempt ? attackerStats.torjunta : defenderStats.torjunta;
      const scoringSide: Side = isNinjaAttempt ? defenderSide : attackerSide;

      const potentialScorerName = isNinjaAttempt
        ? (defenderChar?.player.name ?? '')
        : (attackerChar?.player.name ?? '');
      const targetBlockerName = isNinjaAttempt
        ? (attackerChar?.player.name ?? '')
        : (defenderChar?.player.name ?? '');

      if (isNinjaAttempt) {
        notifications.push({
          playerName: defenderChar?.player.name ?? '',
          effectKey: 'ability.ninja_triggered',
        });
      }

      // Goal check: chosen defender's torjunta vs chosen attacker's shooting stats
      const saveResult = resolveGoalkeeping({ torjunta: targetTorjunta }, shooterStats);

      if (saveResult === 'saved') {
        keeperName = targetBlockerName;
      } else {
        goalScored = true;
        scorerName = potentialScorerName;
        scoreGoal(scoringSide);
      }
    }

    // Post-win ability effects (restrictions, boosts, cancellations)
    const postWinNotifications = triggerPostWinAbilities(
      effectiveWinnerId,
      winnerSide,
      loserSide,
      winnerPlayerName,
    );
    notifications.push(...postWinNotifications);

    setPossession(newPossession);
    setDuelResult({
      winner,
      goalAttempt: finalGoalAttempt,
      goalScored,
      triviaBoostUsed,
      triggeredAbilities: notifications,
      scorerName,
      keeperName,
    });
    setUiPhase('show_result');
  }

  // ── Card-pick flow helpers ─────────────────────────────────────────────────

  /**
   * Called when both cards have been chosen (before reactive check).
   * Checks for reactive ability; if found, shows reactive_check panel.
   * Otherwise resolves immediately.
   *
   * @param atkCard - Attacker's chosen card
   * @param defCard - Defender's chosen card
   */
  function handleBothCardsPicked(atkCard: Card, defCard: Card) {
    setAttackerCard(atkCard);
    setDefenderCard(defCard);

    const reactive = findReactivePlayer(atkCard, defCard);
    if (reactive) {
      setReactiveInfo(reactive);
      setUiPhase('reactive_check');
    } else {
      resolveCurrent(atkCard, defCard);
    }
  }

  // ── Two-player handlers ────────────────────────────────────────────────────

  /**
   * Attacker picks their character → advance to card pick (two-player mode).
   *
   * @param slot - The chosen SquadSlot for the attacker
   */
  function handleAttackerCharPick(slot: SquadSlot) {
    setAttackerChar(slot);
    setUiPhase('attacker_card_pick');
  }

  /**
   * Attacker picks card → go to cover screen (two-player mode).
   *
   * @param card - Card chosen by the attacker
   */
  function handleAttackerPick(card: Card) {
    setAttackerCard(card);
    setUiPhase('cover');
  }

  /** From cover screen — show defender char pick (two-player mode) */
  function handleCoverContinue() {
    setUiPhase('defender_char_pick');
  }

  /**
   * Defender picks their character → advance to card pick (two-player mode).
   *
   * @param slot - The chosen SquadSlot for the defender
   */
  function handleDefenderCharPick(slot: SquadSlot) {
    setDefenderChar(slot);
    setUiPhase('defender_card_pick');
  }

  /**
   * Defender picks card → check reactive abilities then resolve (two-player mode).
   *
   * @param card - Card chosen by the defender
   */
  function handleDefenderPick(card: Card) {
    handleBothCardsPicked(attackerCard!, card);
  }

  // ── AI mode handler ────────────────────────────────────────────────────────

  /**
   * Human picks their character in AI mode.
   * AI simultaneously picks its character. Both chars are stored before advancing.
   *
   * @param slot - Character chosen by the human player
   */
  function handleHumanCharPick(slot: SquadSlot) {
    const aiIsAttacking = attackerSide === 'away';
    const aiSlot = getAiCharacterSlot(aiIsAttacking);

    if (humanIsAttacker) {
      setAttackerChar(slot);
      setDefenderChar(aiSlot);
    } else {
      setDefenderChar(slot);
      setAttackerChar(aiSlot);
    }

    setUiPhase('human_card_pick');
  }

  /**
   * Human picks their card in AI mode (as either attacker or defender).
   * The AI's card is determined simultaneously.
   * The human's card is recorded in playerCardHistory for Hard AI.
   *
   * @param humanCard - Card chosen by the human player
   */
  function handleHumanPickAi(humanCard: Card) {
    recordPlayerCard(humanCard as CardChoice);
    const aiCard = getAiCard();
    const atkCard = humanIsAttacker ? humanCard : aiCard;
    const defCard = humanIsAttacker ? aiCard : humanCard;
    handleBothCardsPicked(atkCard, defCard);
  }

  // ── Reactive switch handler ────────────────────────────────────────────────

  /**
   * Called from the reactive_check panel when the reactive player decides.
   * Replaces the player's card with switchTo if they choose to switch.
   *
   * @param keepOriginal - True if the player keeps their original card
   */
  function handleReactiveDecision(keepOriginal: boolean) {
    if (!reactiveInfo || !attackerCard || !defenderCard) return;

    let finalAtk = attackerCard;
    let finalDef = defenderCard;

    if (!keepOriginal) {
      if (reactiveInfo.side === 'attacker') {
        finalAtk = reactiveInfo.switchTo;
      } else {
        finalDef = reactiveInfo.switchTo;
      }
    }

    setReactiveInfo(null);
    resolveCurrent(finalAtk, finalDef);
  }

  // ── Continue after result ──────────────────────────────────────────────────

  /**
   * Expire any effects that were scheduled to expire at this duel index,
   * reset character choices, then advance to the next duel.
   */
  function handleContinue() {
    // Expire effects whose window has closed
    (['home', 'away'] as Side[]).forEach((side) => {
      effects[side].forEach((e) => {
        if (!e.expired && e.expiresAfterDuel !== undefined && e.expiresAfterDuel <= duelIndex) {
          expireEffect(side, e.id);
        }
      });
    });

    setAttackerChar(null);
    setDefenderChar(null);
    setAttackerCard(null);
    setDefenderCard(null);
    setReactiveInfo(null);
    setDuelResult(null);
    setUiPhase(isAiMatch ? 'human_char_pick' : 'attacker_char_pick');
    advanceDuel();
  }

  // ── Display names ──────────────────────────────────────────────────────────
  const attackerName = t(attackerSide === 'home' ? 'duel.home_team' : 'duel.away_team');
  const defenderName = t(defenderSide === 'home' ? 'duel.home_team' : 'duel.away_team');

  // ── Card label helper ──────────────────────────────────────────────────────
  /**
   * Get a translated card label for display in reactive panel.
   *
   * @param card - The card to label
   * @returns Translated card name
   */
  function cardLabel(card: Card): string {
    if (card === CARD.PRESS) return t('cards.press');
    if (card === CARD.FEINT) return t('cards.feint');
    return t('cards.shot');
  }

  // Active restrictions for the current picker's side (helps modal know what to show)
  const isDefenderCardPick =
    uiPhase === 'defender_card_pick' ||
    (uiPhase === 'human_card_pick' && !humanIsAttacker);
  const currentRestrictions = isDefenderCardPick
    ? { press: defenderPressRestricted, feint: defenderFeintRestricted, shot: defenderShotRestricted }
    : { press: attackerPressRestricted, feint: attackerFeintRestricted, shot: attackerShotRestricted };

  // ── Char pick grid ─────────────────────────────────────────────────────────

  /**
   * Render a grid of character pick buttons for the given outfield slots.
   *
   * @param slots    - Outfield SquadSlots to render as buttons
   * @param onPick   - Callback when a slot is selected
   * @returns Character pick grid element
   */
  function renderCharPickGrid(
    slots: SquadSlot[],
    onPick: (slot: SquadSlot) => void,
  ): JSX.Element {
    return (
      <div className="grid grid-cols-2 gap-3 w-full">
        {slots.map((slot) => (
          <button
            key={slot.player.id}
            data-testid={`char-btn-${slot.player.id}`}
            onClick={() => onPick(slot)}
            className="p-3 rounded-xl border-2 border-[#333] bg-[#2A2A2A] text-left hover:border-[#FFE600] hover:bg-[#FFE600]/5 active:scale-95 transition-all"
          >
            <div className="font-bold text-sm text-[#F5F0E8]">{slot.player.name}</div>
            <div className="text-xs text-[#A0A0A0] mt-1">
              ⚔{slot.player.stats.riisto} 💨{slot.player.stats.harhautus} 🎯{slot.player.stats.laukaus} 🛡{slot.player.stats.torjunta}
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <>
    {/* Help modal overlay */}
    {showHelp && (
      <HelpModal
        onClose={() => setShowHelp(false)}
        homeTactic={homeTactic}
        awayTactic={awayTactic}
        restrictions={currentRestrictions}
      />
    )}

    <div
      data-testid="duel-screen"
      className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex flex-col items-center px-4 py-6 gap-6 max-w-lg mx-auto"
    >
      {/* Top-left controls: help ? + quit */}
      <div className="fixed top-3 left-3 z-40 flex items-center gap-2">
        <button
          data-testid="help-btn"
          onClick={() => setShowHelp(true)}
          className="w-9 h-9 rounded-full border-2 border-[#555] text-[#A0A0A0] font-black text-base hover:border-[#FFE600] hover:text-[#FFE600] transition-colors bg-[#1A1A1A]"
          aria-label="Help"
        >
          ?
        </button>
        <QuitMatchButton />
      </div>

      {/* ScoreBoard */}
      <ScoreBoard
        homeGoals={homeGoals}
        awayGoals={awayGoals}
        half={half}
        duelIndex={duelIndex}
      />

      {/* Possession badge */}
      <div
        data-testid="possession-badge"
        className="text-sm font-bold uppercase tracking-widest text-[#FFE600]"
      >
        {attackerSide === 'home' ? t('possession.home_attack') : t('possession.away_attack')}
      </div>

      {/* Active player cards — show chosen chars (or first outfield as preview) */}
      {(displayAttackerChar || displayDefenderChar) && (
        <div
          data-testid="active-players-row"
          className="flex gap-3 w-full"
        >
          <div
            data-testid="attacker-player-card-wrapper"
            className="flex-1 flex flex-col gap-1"
          >
            <span className="text-xs font-black text-[#FFE600] text-center uppercase tracking-widest">
              {t('duel.attacker_badge')}
            </span>
            {displayAttackerChar && (
              <PlayerCard
                player={displayAttackerChar.player}
                statModifier={displayAttackerChar.statModifier}
                showAbility
              />
            )}
          </div>
          <div
            data-testid="defender-player-card-wrapper"
            className="flex-1 flex flex-col gap-1"
          >
            <span className="text-xs font-black text-[#F5F0E8]/40 text-center uppercase tracking-widest">
              {t('duel.defender_badge')}
            </span>
            {displayDefenderChar && (
              <PlayerCard
                player={displayDefenderChar.player}
                statModifier={displayDefenderChar.statModifier}
                showAbility
              />
            )}
          </div>
        </div>
      )}

      {/* Trivia boost banner */}
      {triviaBoostActive && (
        <div
          data-testid="trivia-boost-banner"
          className="text-xs font-bold uppercase tracking-widest text-green-400 border border-green-400/30 px-4 py-2 rounded-lg"
        >
          ⚡ {t('duel.trivia_boost_active')}
        </div>
      )}

      {/* ─── Stamina warning (start of second half) ─── */}
      {uiPhase === 'stamina_warning' && (
        <div
          data-testid="stamina-warning-panel"
          className="flex flex-col items-center gap-4 text-center w-full"
        >
          <h2 className="text-xl font-black text-[#FFE600]">
            ⚠️ {t('duel.stamina_warning_title')}
          </h2>
          <p className="text-sm text-[#F5F0E8]/70">
            {t('duel.stamina_penalty_applied')}
          </p>
          <ul className="flex flex-col gap-2 w-full">
            {staminaAffected.map((p) => (
              <li
                key={p.id}
                data-testid={`stamina-affected-${p.id}`}
                className="px-4 py-2 rounded border border-red-500/30 bg-red-500/5 text-sm font-bold text-red-400"
              >
                {p.name}
              </li>
            ))}
          </ul>
          <button
            data-testid="stamina-warning-continue-btn"
            onClick={() => setUiPhase(isAiMatch ? 'human_char_pick' : 'attacker_char_pick')}
            className="px-8 py-3 bg-[#FFE600] text-[#1A1A1A] font-black uppercase tracking-widest rounded-xl hover:bg-[#FFE600]/90 active:scale-95 transition-all"
          >
            {t('duel.continue')}
          </button>
        </div>
      )}

      {/* ─── Two-player: Attacker picks character ─── */}
      {uiPhase === 'attacker_char_pick' && (
        <div className="flex flex-col items-center gap-4 w-full">
          <p
            data-testid="attacker-char-pick-prompt"
            className="text-lg font-bold text-[#F5F0E8]"
          >
            {attackerName}, {t('duel.attacker_pick_char')}
          </p>
          {renderCharPickGrid(attackerOutfield, handleAttackerCharPick)}
        </div>
      )}

      {/* ─── Two-player: Attacker picks card ─── */}
      {uiPhase === 'attacker_card_pick' && (
        <div className="flex flex-col items-center gap-4 w-full">
          <p
            data-testid="attacker-pick-prompt"
            className="text-lg font-bold text-[#F5F0E8]"
          >
            {attackerName}, {t('duel.choose_card')}
          </p>
          <div className="flex gap-4 justify-center">
            <CardButton
              card={CARD.PRESS}
              onClick={() => handleAttackerPick(CARD.PRESS)}
              disabled={attackerPressRestricted}
            />
            <CardButton
              card={CARD.FEINT}
              onClick={() => handleAttackerPick(CARD.FEINT)}
              disabled={attackerFeintRestricted}
            />
            <CardButton
              card={CARD.SHOT}
              onClick={() => handleAttackerPick(CARD.SHOT)}
              disabled={attackerShotRestricted}
            />
          </div>
        </div>
      )}

      {/* ─── Two-player: Cover screen ─── */}
      {uiPhase === 'cover' && (
        <div className="flex flex-col items-center gap-6 text-center">
          <p className="text-base font-bold text-[#F5F0E8]/70">
            {t('duel.pass_device')} {defenderName}
          </p>
          <button
            data-testid="cover-continue-btn"
            onClick={handleCoverContinue}
            className="px-8 py-3 border-2 border-[#FFE600] text-[#FFE600] font-bold uppercase tracking-widest rounded-xl hover:bg-[#FFE600] hover:text-[#1A1A1A] transition-all"
          >
            {t('duel.tap_to_continue')}
          </button>
        </div>
      )}

      {/* ─── Two-player: Defender picks character ─── */}
      {uiPhase === 'defender_char_pick' && (
        <div className="flex flex-col items-center gap-4 w-full">
          <p
            data-testid="defender-char-pick-prompt"
            className="text-lg font-bold text-[#F5F0E8]"
          >
            {defenderName}, {t('duel.defender_pick_char')}
          </p>
          {renderCharPickGrid(defenderOutfield, handleDefenderCharPick)}
        </div>
      )}

      {/* ─── Two-player: Defender picks card ─── */}
      {uiPhase === 'defender_card_pick' && (
        <div className="flex flex-col items-center gap-4 w-full">
          <p
            data-testid="defender-pick-prompt"
            className="text-lg font-bold text-[#F5F0E8]"
          >
            {defenderName}, {t('duel.choose_card')}
          </p>
          <div className="flex gap-4 justify-center">
            <CardButton
              card={CARD.PRESS}
              onClick={() => handleDefenderPick(CARD.PRESS)}
              disabled={defenderPressRestricted}
            />
            <CardButton
              card={CARD.FEINT}
              onClick={() => handleDefenderPick(CARD.FEINT)}
              disabled={defenderFeintRestricted}
            />
            <CardButton
              card={CARD.SHOT}
              onClick={() => handleDefenderPick(CARD.SHOT)}
              disabled={defenderShotRestricted}
            />
          </div>
        </div>
      )}

      {/* ─── AI mode: Human picks character ─── */}
      {uiPhase === 'human_char_pick' && (
        <div className="flex flex-col items-center gap-4 w-full">
          <p
            data-testid="attacker-char-pick-prompt"
            className="text-lg font-bold text-[#F5F0E8]"
          >
            {t('duel.human_pick_char')}
          </p>
          {renderCharPickGrid(
            humanIsAttacker ? attackerOutfield : defenderOutfield,
            handleHumanCharPick,
          )}
        </div>
      )}

      {/* ─── AI mode: Human picks card ─── */}
      {uiPhase === 'human_card_pick' && (
        <div className="flex flex-col items-center gap-4 w-full">
          <p
            data-testid="attacker-pick-prompt"
            className="text-lg font-bold text-[#F5F0E8]"
          >
            {humanIsAttacker
              ? `${t('duel.home_team')}, ${t('duel.choose_card')}`
              : t('difficulty.ai_attacking')}
          </p>
          <div className="flex gap-4 justify-center">
            <CardButton
              card={CARD.PRESS}
              onClick={() => handleHumanPickAi(CARD.PRESS)}
              disabled={
                humanIsAttacker ? attackerPressRestricted : defenderPressRestricted
              }
            />
            <CardButton
              card={CARD.FEINT}
              onClick={() => handleHumanPickAi(CARD.FEINT)}
              disabled={
                humanIsAttacker ? attackerFeintRestricted : defenderFeintRestricted
              }
            />
            <CardButton
              card={CARD.SHOT}
              onClick={() => handleHumanPickAi(CARD.SHOT)}
              disabled={
                humanIsAttacker ? attackerShotRestricted : defenderShotRestricted
              }
            />
          </div>
        </div>
      )}

      {/* ─── Reactive check panel (both modes) ─── */}
      {uiPhase === 'reactive_check' && reactiveInfo && (
        <div
          data-testid="reactive-check-panel"
          className="flex flex-col items-center gap-6 text-center w-full"
        >
          {/* Opponent card reveal */}
          <div className="text-xs uppercase tracking-widest text-[#F5F0E8]/40">
            {t('ability.reactive_opponent_played')}:{' '}
            <span className="text-[#FFE600] font-bold">
              {cardLabel(reactiveInfo.opponentCard)}
            </span>
          </div>

          {/* Reactive player info */}
          <div className="border-2 border-[#FFE600]/40 rounded-2xl px-6 py-4 w-full bg-[#1A1A1A]">
            <p className="text-base font-bold text-[#FFE600] mb-1">
              ⚡ {reactiveInfo.playerName}
            </p>
            <p className="text-sm text-[#F5F0E8]/70">
              {t('ability.reactive_can_switch')}:{' '}
              <span className="font-bold text-[#F5F0E8]">
                {cardLabel(reactiveInfo.switchTo)}
              </span>
            </p>
          </div>

          {/* Keep / Switch buttons */}
          <div className="flex gap-4">
            <button
              data-testid="reactive-keep-btn"
              onClick={() => handleReactiveDecision(true)}
              className="px-6 py-3 border-2 border-[#F5F0E8]/40 text-[#F5F0E8]/80 font-bold uppercase tracking-widest rounded-xl hover:border-[#F5F0E8] hover:text-[#F5F0E8] transition-all"
            >
              {t('ability.reactive_keep')}
            </button>
            <button
              data-testid="reactive-switch-btn"
              onClick={() => handleReactiveDecision(false)}
              className="px-6 py-3 bg-[#FFE600] text-[#1A1A1A] font-black uppercase tracking-widest rounded-xl hover:bg-[#FFE600]/90 active:scale-95 transition-all"
            >
              {t('ability.reactive_switch')} → {cardLabel(reactiveInfo.switchTo)}
            </button>
          </div>
        </div>
      )}

      {/* ─── Show result (both modes) ─── */}
      {uiPhase === 'show_result' && duelResult && (
        <div
          data-testid="duel-result-panel"
          className="flex flex-col items-center gap-4 text-center"
        >
          {/* Goal attempt banner — shown before the goal/save result */}
          {duelResult.goalAttempt && (
            <div
              data-testid="goal-attempt-banner"
              className="text-2xl font-black text-[#FFE600] tracking-widest"
            >
              {t('duel.goal_attempt')}
            </div>
          )}

          {duelResult.goalAttempt ? (
            duelResult.goalScored ? (
              <div
                data-testid="goal-result"
                className="flex flex-col items-center gap-1"
              >
                <span className="text-4xl font-black text-[#FFE600]">
                  {t('duel.goal_scored_by')}
                </span>
                {duelResult.scorerName && (
                  <span
                    data-testid="goal-scorer-name"
                    className="text-lg font-bold text-[#FFE600]/80"
                  >
                    {duelResult.scorerName}
                  </span>
                )}
              </div>
            ) : (
              <div
                data-testid="saved-result"
                className="flex flex-col items-center gap-1"
              >
                <span className="text-3xl font-black text-[#F5F0E8]/60">
                  {t('duel.shot_saved_by')}
                </span>
                {duelResult.keeperName && (
                  <span
                    data-testid="saved-keeper-name"
                    className="text-base font-bold text-[#A0A0A0]"
                  >
                    {duelResult.keeperName}
                  </span>
                )}
              </div>
            )
          ) : (
            <div
              data-testid="duel-outcome-text"
              className="text-xl font-bold text-[#F5F0E8]"
            >
              {duelResult.triviaBoostUsed
                ? t('duel.trivia_boost_active')
                : duelResult.winner === 'attacker'
                  ? t('duel.got_ball')
                  : duelResult.winner === 'defender'
                    ? t('duel.defended_ball')
                    : t('duel.draw_result')}
            </div>
          )}

          {/* Ability notifications */}
          {duelResult.triggeredAbilities.length > 0 && (
            <ul
              data-testid="ability-notifications"
              className="flex flex-col gap-2 w-full mt-2"
            >
              {duelResult.triggeredAbilities.map((n, i) => (
                <li
                  key={i}
                  data-testid="ability-notification"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#FFE600]/30 bg-[#FFE600]/5 text-sm"
                >
                  <span className="font-bold text-[#FFE600]">{n.playerName}</span>
                  <span className="text-[#F5F0E8]/70">{t(n.effectKey)}</span>
                </li>
              ))}
            </ul>
          )}

          <button
            data-testid="duel-continue-btn"
            onClick={handleContinue}
            className="px-8 py-3 bg-[#FFE600] text-[#1A1A1A] font-black uppercase tracking-widest rounded-xl hover:bg-[#FFE600]/90 active:scale-95 transition-all"
          >
            {t('duel.continue')}
          </button>
        </div>
      )}
    </div>
    </>
  );
}
