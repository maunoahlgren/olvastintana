/**
 * @file App.tsx
 * Application root, screen router, and Derby Night Firebase sync.
 *
 * Reads `matchStore.phase` and renders the appropriate screen for the current
 * stage of the flow:
 *
 *   Solo:  TITLE → SEASON → PREMATCH → TRIVIA → LINEUP →
 *          FIRST_HALF → HALFTIME → SECOND_HALF → RESULT → SEASON (loop × 7)
 *          → SEASON_COMPLETE
 *
 *   Derby: TITLE → DERBY_LOBBY → DERBY_LINEUP → DERBY_TRIVIA →
 *          DERBY_DUEL → DERBY_HALFTIME → DERBY_RESULT
 *
 * The `useDerbyMatchSync` hook runs whenever the client is in any DERBY_
 * (non-lobby) phase. It subscribes to `rooms/{code}/match/` via Firebase
 * and:
 *   1. Syncs all match data to `derbyStore` (display cache)
 *   2. Maps the Firebase match phase to the local MATCH_PHASE constant
 *      and calls `matchStore.setDerbyPhase()` to drive screen routing
 *
 * The LanguageToggle is rendered as a persistent overlay on every screen that
 * does not embed its own toggle (everything except TitleScreen and DerbyLobbyScreen).
 */

import './i18n/index.ts';
import { useEffect } from 'react';
import { useMatchStore } from './store/matchStore';
import { useRoomStore } from './store/roomStore';
import { useDerbyStore } from './store/derbyStore';
import { MATCH_PHASE } from './engine/match';
import { listenToMatch, type DerbyMatchPhase } from './firebase/derbyMatch';

import TitleScreen            from './components/screens/TitleScreen';
import SeasonScreen           from './components/screens/SeasonScreen';
import PreMatchScreen         from './components/screens/PreMatchScreen';
import TriviaScreen           from './components/screens/TriviaScreen';
import LineupScreen           from './components/screens/LineupScreen';
import DuelScreen             from './components/screens/DuelScreen';
import HalftimeScreen         from './components/screens/HalftimeScreen';
import ResultScreen           from './components/screens/ResultScreen';
import SeasonCompleteScreen   from './components/screens/SeasonCompleteScreen';
import DerbyLobbyScreen       from './components/screens/DerbyLobbyScreen';
import DerbyLineupScreen      from './components/screens/DerbyLineupScreen';
import DerbyTriviaScreen      from './components/screens/DerbyTriviaScreen';
import DerbyDuelScreen        from './components/screens/DerbyDuelScreen';
import DerbyHalftimeScreen    from './components/screens/DerbyHalftimeScreen';
import DerbyResultScreen      from './components/screens/DerbyResultScreen';
import LanguageToggle         from './components/ui/LanguageToggle';

// ─── Firebase → MATCH_PHASE mapping ─────────────────────────────────────────

/**
 * Maps a Firebase DerbyMatchPhase string to the local MATCH_PHASE constant.
 * 'duel' and 'duel_result' both map to DERBY_DUEL (same screen, different state).
 */
const DERBY_PHASE_MAP: Record<DerbyMatchPhase, string> = {
  lineup:      MATCH_PHASE.DERBY_LINEUP,
  trivia:      MATCH_PHASE.DERBY_TRIVIA,
  duel:        MATCH_PHASE.DERBY_DUEL,
  duel_result: MATCH_PHASE.DERBY_DUEL,
  halftime:    MATCH_PHASE.DERBY_HALFTIME,
  result:      MATCH_PHASE.DERBY_RESULT,
};

/** Derby match phases (all DERBY_ except DERBY_LOBBY) */
const DERBY_MATCH_PHASES: ReadonlySet<string> = new Set([
  MATCH_PHASE.DERBY_LINEUP,
  MATCH_PHASE.DERBY_TRIVIA,
  MATCH_PHASE.DERBY_DUEL,
  MATCH_PHASE.DERBY_HALFTIME,
  MATCH_PHASE.DERBY_RESULT,
]);

// ─── Sync Hook ────────────────────────────────────────────────────────────────

/**
 * useDerbyMatchSync — persistent Firebase match listener for Derby Night.
 *
 * Runs whenever the local phase is in a DERBY_ match phase (not DERBY_LOBBY).
 * Subscribes to `rooms/{code}/match/`, syncs data to `derbyStore`, and drives
 * `matchStore.phase` transitions via the DERBY_PHASE_MAP.
 *
 * The hook automatically unsubscribes when the phase leaves DERBY_ territory
 * or the component unmounts.
 */
function useDerbyMatchSync(): void {
  const phase = useMatchStore((s) => s.phase);
  const roomCode = useRoomStore((s) => s.roomCode);
  const setDerbyPhase = useMatchStore((s) => s.setDerbyPhase);
  const setFromFirebase = useDerbyStore((s) => s.setFromFirebase);

  const isActiveMatchPhase = DERBY_MATCH_PHASES.has(phase);

  useEffect(() => {
    if (!isActiveMatchPhase || !roomCode) return;

    const unsubscribe = listenToMatch(roomCode, (snap) => {
      // 1. Sync all display data to derbyStore
      setFromFirebase(snap);

      // 2. Map Firebase phase → local MATCH_PHASE and update router
      const localPhase = DERBY_PHASE_MAP[snap.phase];
      if (localPhase) {
        setDerbyPhase(localPhase);
      }
    });

    return unsubscribe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActiveMatchPhase, roomCode]);
}

// ─── App ──────────────────────────────────────────────────────────────────────

/**
 * App — top-level router component.
 *
 * Renders a single screen based on the current match phase. A floating
 * LanguageToggle is shown on all screens except TITLE and DERBY_LOBBY
 * (both of which manage their own chrome).
 *
 * @returns The active screen element
 */
export default function App(): JSX.Element {
  const phase = useMatchStore((s) => s.phase);

  // Firebase match sync — active for all Derby match phases
  useDerbyMatchSync();

  /** Map each phase to its screen component */
  function renderScreen(): JSX.Element {
    switch (phase) {
      case MATCH_PHASE.TITLE:
        // TitleScreen embeds its own LanguageToggle
        return <TitleScreen />;

      case MATCH_PHASE.DERBY_LOBBY:
        // DerbyLobbyScreen manages its own chrome
        return <DerbyLobbyScreen />;

      // ── Derby Night match phases ───────────────────────────────────────────
      case MATCH_PHASE.DERBY_LINEUP:
        return <DerbyLineupScreen />;

      case MATCH_PHASE.DERBY_TRIVIA:
        return <DerbyTriviaScreen />;

      case MATCH_PHASE.DERBY_DUEL:
        return <DerbyDuelScreen />;

      case MATCH_PHASE.DERBY_HALFTIME:
        return <DerbyHalftimeScreen />;

      case MATCH_PHASE.DERBY_RESULT:
        return <DerbyResultScreen />;

      // ── Solo Season phases ─────────────────────────────────────────────────
      case MATCH_PHASE.SEASON:
        return <SeasonScreen />;

      case MATCH_PHASE.PREMATCH:
        return <PreMatchScreen />;

      case MATCH_PHASE.TRIVIA:
        return <TriviaScreen />;

      case MATCH_PHASE.LINEUP:
        return <LineupScreen />;

      case MATCH_PHASE.FIRST_HALF:
      case MATCH_PHASE.SECOND_HALF:
        return <DuelScreen />;

      case MATCH_PHASE.HALFTIME:
        return <HalftimeScreen />;

      case MATCH_PHASE.RESULT:
        return <ResultScreen />;

      case MATCH_PHASE.SEASON_COMPLETE:
        return <SeasonCompleteScreen />;

      default:
        return <TitleScreen />;
    }
  }

  const hideToggle =
    phase === MATCH_PHASE.TITLE ||
    phase === MATCH_PHASE.DERBY_LOBBY ||
    DERBY_MATCH_PHASES.has(phase);

  return (
    <div className="relative min-h-screen bg-[#1A1A1A] text-[#F5F0E8]" data-testid="app-root">
      {/* Floating language toggle — hidden on title/derby screens */}
      {!hideToggle && (
        <div className="absolute top-4 right-4 z-50">
          <LanguageToggle />
        </div>
      )}

      {renderScreen()}
    </div>
  );
}
