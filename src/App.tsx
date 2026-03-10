/**
 * @file App.tsx
 * Application root and screen router.
 *
 * Reads `matchStore.phase` and renders the appropriate screen for the current
 * stage of the solo season flow:
 *
 *   TITLE → SEASON → PREMATCH → TRIVIA → LINEUP →
 *   FIRST_HALF → HALFTIME → SECOND_HALF → RESULT → SEASON (loop × 7)
 *   → SEASON_COMPLETE
 *
 * The LanguageToggle is rendered as a persistent overlay on every screen that
 * does not embed its own toggle (i.e. everything except TitleScreen).
 */

import './i18n/index.ts';
import { useMatchStore } from './store/matchStore';
import { MATCH_PHASE } from './engine/match';
import TitleScreen          from './components/screens/TitleScreen';
import SeasonScreen         from './components/screens/SeasonScreen';
import PreMatchScreen       from './components/screens/PreMatchScreen';
import TriviaScreen         from './components/screens/TriviaScreen';
import LineupScreen         from './components/screens/LineupScreen';
import DuelScreen           from './components/screens/DuelScreen';
import HalftimeScreen       from './components/screens/HalftimeScreen';
import ResultScreen         from './components/screens/ResultScreen';
import SeasonCompleteScreen from './components/screens/SeasonCompleteScreen';
import LanguageToggle       from './components/ui/LanguageToggle';

/**
 * App — top-level router component.
 *
 * Renders a single screen based on the current match phase. A floating
 * LanguageToggle is shown on all screens except TITLE (which has its own).
 *
 * @returns The active screen element
 */
export default function App(): JSX.Element {
  const phase = useMatchStore((s) => s.phase);

  /** Map each phase to its screen component */
  function renderScreen(): JSX.Element {
    switch (phase) {
      case MATCH_PHASE.TITLE:
        // TitleScreen embeds its own LanguageToggle
        return <TitleScreen />;
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

  const isTitleScreen = phase === MATCH_PHASE.TITLE;

  return (
    <div className="relative min-h-screen bg-[#1A1A1A] text-[#F5F0E8]" data-testid="app-root">
      {/* Floating language toggle — hidden on title since it renders its own */}
      {!isTitleScreen && (
        <div className="absolute top-4 right-4 z-50">
          <LanguageToggle />
        </div>
      )}

      {renderScreen()}
    </div>
  );
}
