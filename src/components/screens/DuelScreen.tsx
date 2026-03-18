/**
 * @file DuelScreen.tsx
 * The main duel gameplay screen, supporting both two-player and AI modes.
 *
 * ── Two-player mode (aiDifficulty === null) ──────────────────────────────────
 * UI state machine:
 *   attacker_pick → cover → defender_pick → [reactive_check?] → show_result
 *
 * ── AI mode (aiDifficulty !== null) ─────────────────────────────────────────
 * Human always controls the Home (left) side. Away side is the AI.
 * UI state machine:
 *   human_pick → [reactive_check?] → show_result
 *
 *   If home has possession (human is attacker):
 *     1. Human picks attacker card
 *     2. AI auto-picks defender card
 *     3. [reactive_check if applicable]
 *     4. Resolve → show result
 *
 *   If away has possession (AI is attacker):
 *     1. Human sees "AI is attacking" prompt and picks their defender card
 *     2. AI attacker card is auto-generated simultaneously
 *     3. [reactive_check if applicable]
 *     4. Resolve → show result
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
import { useSquadStore } from '../../store/squadStore';
import { useSessionStore } from '../../store/sessionStore';
import { resolveDuel, CARD, type Card, type PlayerStats } from '../../engine/duel';
import { resolvePossession, type Side } from '../../engine/possession';
import { resolveGoalkeeping, resetBrickWall, type BrickWallState } from '../../engine/goalkeeper';
import { pickAiCard, DUELS_PER_HALF, type CardChoice } from '../../engine/ai';
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
import CardButton from '../ui/CardButton';
import ScoreBoard from '../ui/ScoreBoard';
import HelpModal from '../ui/HelpModal';
import QuitMatchButton from '../ui/QuitMatchButton';
import PlayerCard from '../ui/PlayerCard';

// ─── Types ─────────────────────────────────────────────────────────────────────

/** Phase names for two-player mode */
type TwoPlayerUiPhase = 'attacker_pick' | 'cover' | 'defender_pick' | 'reactive_check' | 'show_result';
/** Phase names for AI mode */
type AiUiPhase = 'human_pick' | 'reactive_check' | 'show_result';
type DuelUiPhase = TwoPlayerUiPhase | AiUiPhase;

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
  /** Goalkeeper name when a save was made (null if no save or goal scored) */
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
 * DuelScreen — handles card selection, duel resolution, possession, and ability notifications.
 *
 * Brick Wall state uses local component state so it resets naturally when the
 * component unmounts at halftime and remounts for the second half.
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

  // ── Local UI state ─────────────────────────────────────────────────────────
  const initialUiPhase: DuelUiPhase = isAiMatch ? 'human_pick' : 'attacker_pick';
  const [uiPhase, setUiPhase] = useState<DuelUiPhase>(initialUiPhase);
  const [attackerCard, setAttackerCard] = useState<Card | null>(null);
  const [defenderCard, setDefenderCard] = useState<Card | null>(null);
  const [reactiveInfo, setReactiveInfo] = useState<ReactiveInfo | null>(null);
  const [duelResult, setDuelResult] = useState<DuelResult | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  // Brick Wall resets when this component remounts (at halftime the screen unmounts)
  const [brickWall, setBrickWall] = useState<BrickWallState>(resetBrickWall);

  // ── Derived values ─────────────────────────────────────────────────────────
  const attackerSide: Side = possession ?? 'home';
  const defenderSide: Side = attackerSide === 'home' ? 'away' : 'home';

  /** Slot index for this duel's players (outfield players cycle through positions) */
  const outfieldSlot = duelIndex % 6;
  const attackerLineup = attackerSide === 'home' ? homeLineup : awayLineup;
  const defenderLineup = defenderSide === 'home' ? homeLineup : awayLineup;

  const attackerSlot = attackerLineup[outfieldSlot];
  const defenderSlot = defenderLineup[outfieldSlot];

  /** Goalkeeper defending the ATTACKER's shots (on defenderSide) */
  const goalkeeperSlot =
    defenderSide === 'home'
      ? homeLineup.find((s) => s.player.position.includes('GK'))
      : awayLineup.find((s) => s.player.position.includes('GK'));

  /** Goalkeeper on the ATTACKER's side (used when Ninja counter-attacks) */
  const attackerGoalkeeperSlot =
    attackerSide === 'home'
      ? homeLineup.find((s) => s.player.position.includes('GK'))
      : awayLineup.find((s) => s.player.position.includes('GK'));

  // ── Active effect lookups ─────────────────────────────────────────────────

  /** Non-expired effects on the attacker's side */
  const attackerActiveEffects = effects[attackerSide].filter((e) => !e.expired);
  /** Non-expired effects on the defender's side */
  const defenderActiveEffects = effects[defenderSide].filter((e) => !e.expired);

  /** Kapteeni boost on attacker's side (adds to stats next duel) */
  const attackerKapteeniBoost = attackerActiveEffects.find((e) => e.id === 'kapteeni_boost')?.statMod;
  /** Kapteeni boost on defender's side */
  const defenderKapteeniBoost = defenderActiveEffects.find((e) => e.id === 'kapteeni_boost')?.statMod;

  /** Card restrictions on attacker's side (from opponent's previous abilities) */
  const attackerPressRestricted = attackerActiveEffects.some((e) => e.id === 'restrict_press');
  const attackerFeintRestricted = attackerActiveEffects.some((e) => e.id === 'restrict_feint');
  const attackerShotRestricted = attackerActiveEffects.some((e) => e.id === 'restrict_shot');

  /** Card restrictions on defender's side */
  const defenderPressRestricted = defenderActiveEffects.some((e) => e.id === 'restrict_press');
  const defenderFeintRestricted = defenderActiveEffects.some((e) => e.id === 'restrict_feint');
  const defenderShotRestricted = defenderActiveEffects.some((e) => e.id === 'restrict_shot');

  // ── Stat computation ──────────────────────────────────────────────────────

  /** Base stats merged with slot modifier, then with any Kapteeni boost */
  const attackerBaseStats = attackerSlot
    ? { ...attackerSlot.player.stats, ...attackerSlot.statModifier }
    : FALLBACK_STATS;
  const attackerStats = applyStatMod(attackerBaseStats, attackerKapteeniBoost);

  const defenderBaseStats = defenderSlot
    ? { ...defenderSlot.player.stats, ...defenderSlot.statModifier }
    : FALLBACK_STATS;
  const defenderStats = applyStatMod(defenderBaseStats, defenderKapteeniBoost);

  const keeperStats = goalkeeperSlot
    ? { ...goalkeeperSlot.player.stats, ...goalkeeperSlot.statModifier }
    : FALLBACK_STATS;

  const attackerKeeperStats = attackerGoalkeeperSlot
    ? { ...attackerGoalkeeperSlot.player.stats, ...attackerGoalkeeperSlot.statModifier }
    : FALLBACK_STATS;

  // In AI mode, the human is always the home side
  const humanIsAttacker = isAiMatch ? attackerSide === 'home' : true;

  // ── AI card picker helper ───────────────────────────────────────────────────

  /**
   * Ask the AI to pick a card given the current game state.
   * The active AI player's Stamina is used for Hard AI mistake-rate calculations.
   *
   * @returns A Card value chosen by the AI
   */
  function getAiCard(): Card {
    const aiSlot = awayLineup[outfieldSlot];
    const activePlayerStamina = aiSlot?.player.stats.stamina ?? 2;

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
   * A player whose ability has been cancelled by Dominoiva cannot use reactive abilities.
   *
   * @param atkCard - Card chosen by the attacker
   * @param defCard - Card chosen by the defender
   * @returns ReactiveInfo if a reactive switch is possible, null otherwise
   */
  function findReactivePlayer(atkCard: Card, defCard: Card): ReactiveInfo | null {
    // Check attacker first
    const attackerCancelled = attackerActiveEffects.some((e) => e.id === 'ability_cancelled');
    if (!attackerCancelled && attackerSlot) {
      const { canSwitch, switchTo } = checkReactiveSwitch(attackerSlot.player.id, atkCard);
      if (canSwitch && switchTo) {
        return {
          side: 'attacker',
          switchTo,
          playerName: attackerSlot.player.name,
          opponentCard: defCard,
        };
      }
    }

    // Then check defender
    const defenderCancelled = defenderActiveEffects.some((e) => e.id === 'ability_cancelled');
    if (!defenderCancelled && defenderSlot) {
      const { canSwitch, switchTo } = checkReactiveSwitch(defenderSlot.player.id, defCard);
      if (canSwitch && switchTo) {
        return {
          side: 'defender',
          switchTo,
          playerName: defenderSlot.player.name,
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
   * A cancelled winner has effectiveWinnerId = null, so no ability triggers.
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

    // ── Kaaoksen lähettiläs (Mauno #15) — draw Sattuma (notification only, Phase 1) ──
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
   * Handles trivia boost, Matigol auto-goal, Ninja counter-goal, possession,
   * goalkeeper save, scoring, and post-win ability effects.
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
        ? (attackerSlot?.player.id ?? null)
        : winner === 'defender'
          ? (defenderSlot?.player.id ?? null)
          : null;
    const winnerPlayerName: string =
      winner === 'attacker'
        ? (attackerSlot?.player.name ?? '')
        : winner === 'defender'
          ? (defenderSlot?.player.name ?? '')
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
      // Matigol: skip goalkeeper entirely
      goalScored = true;
      scorerName = winnerPlayerName;
      scoreGoal(winnerSide!);
      notifications.push({
        playerName: winnerPlayerName,
        effectKey: 'ability.matigol_triggered',
      });
    } else if (finalGoalAttempt) {
      // Normal or Ninja goal attempt — select correct shooter/keeper
      const isNinjaAttempt = ninjaGoal && !normalGoalAttempt;
      const shooterStats = isNinjaAttempt ? defenderStats : attackerStats;
      const targetKeeperStats = isNinjaAttempt ? attackerKeeperStats : keeperStats;
      const scoringSide: Side = isNinjaAttempt ? defenderSide : attackerSide;

      const potentialScorerName = isNinjaAttempt
        ? (defenderSlot?.player.name ?? '')
        : (attackerSlot?.player.name ?? '');
      const targetKeeperName = isNinjaAttempt
        ? (attackerGoalkeeperSlot?.player.name ?? '')
        : (goalkeeperSlot?.player.name ?? '');

      if (isNinjaAttempt) {
        notifications.push({
          playerName: defenderSlot?.player.name ?? '',
          effectKey: 'ability.ninja_triggered',
        });
      }

      // Brick wall: check the keeper on the TARGET side
      const targetGoalkeeperSlot = isNinjaAttempt ? attackerGoalkeeperSlot : goalkeeperSlot;
      const keeperHasBrickWall =
        targetGoalkeeperSlot?.player.id === 'tommi_helminen' && !brickWall.usedThisHalf;

      const saveResult = resolveGoalkeeping(targetKeeperStats, shooterStats, keeperHasBrickWall);

      if (saveResult === 'saved') {
        if (keeperHasBrickWall) {
          setBrickWall({ usedThisHalf: true });
        }
        keeperName = targetKeeperName;
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

  /** Attacker picks card → go to cover screen (two-player mode) */
  function handleAttackerPick(card: Card) {
    setAttackerCard(card);
    setUiPhase('cover');
  }

  /** From cover screen — show defender pick (two-player mode) */
  function handleCoverContinue() {
    setUiPhase('defender_pick');
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
   * then advance to the next duel.
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

    setAttackerCard(null);
    setDefenderCard(null);
    setReactiveInfo(null);
    setDuelResult(null);
    setUiPhase(isAiMatch ? 'human_pick' : 'attacker_pick');
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
  const currentRestrictions =
    uiPhase === 'defender_pick'
      ? { press: defenderPressRestricted, feint: defenderFeintRestricted, shot: defenderShotRestricted }
      : uiPhase === 'human_pick' && !humanIsAttacker
        ? { press: defenderPressRestricted, feint: defenderFeintRestricted, shot: defenderShotRestricted }
        : { press: attackerPressRestricted, feint: attackerFeintRestricted, shot: attackerShotRestricted };

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
      className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8] flex flex-col items-center px-4 py-6 gap-6"
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

      {/* Active player cards — always visible */}
      {(attackerSlot || defenderSlot) && (
        <div
          data-testid="active-players-row"
          className="flex gap-3 w-full max-w-sm"
        >
          <div
            data-testid="attacker-player-card-wrapper"
            className="flex-1 flex flex-col gap-1"
          >
            <span className="text-xs font-black text-[#FFE600] text-center uppercase tracking-widest">
              {t('duel.attacker_badge')}
            </span>
            {attackerSlot && (
              <PlayerCard
                player={attackerSlot.player}
                statModifier={attackerSlot.statModifier}
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
            {defenderSlot && (
              <PlayerCard
                player={defenderSlot.player}
                statModifier={defenderSlot.statModifier}
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

      {/* ─── Two-player: Attacker picks ─── */}
      {uiPhase === 'attacker_pick' && (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
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
        <div className="flex flex-col items-center gap-6 text-center max-w-sm">
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

      {/* ─── Two-player: Defender picks ─── */}
      {uiPhase === 'defender_pick' && (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
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

      {/* ─── AI mode: Human picks (attacker or defender) ─── */}
      {uiPhase === 'human_pick' && (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
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
          className="flex flex-col items-center gap-6 text-center max-w-sm w-full"
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
          className="flex flex-col items-center gap-4 text-center max-w-sm"
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
