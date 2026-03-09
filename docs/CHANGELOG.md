# CHANGELOG

All notable changes to this project are documented here.
Format: `## [version] — date` with Added / Changed / Fixed sections.

---

## [0.3.0] — 2026-03-09

### Added
- Phase 1.5: AI opponent for solo mode at three difficulty levels
  - `src/engine/ai.ts` — 9 pure AI decision functions + 3 dispatcher helpers
    - `easyAiCard` — uniformly random card pick
    - `normalAiCard` — weighted random; prefers Shot when in possession or losing late; counters Press with Feint
    - `hardAiCard` — counter-based on player's last 3 cards; IQ-driven mistake rate (`(6-iq)/12`); possession override to Shot
    - `easyAiLineup` — random Fisher-Yates shuffle, takes first 5 outfield
    - `normalAiLineup` — picks 5 outfield players by highest total stats
    - `hardAiLineup` — picks players by counter-stat (Technique vs Aggressive, Power vs Defensive, Pace vs Creative)
    - `easyAiTactics` — random tactic
    - `normalAiTactics` — Defensive when ahead, Aggressive when behind, random on draw
    - `hardAiTactics` — counters player's tactic (Aggressive→Creative, Defensive→Aggressive, Creative→Defensive)
    - `pickAiCard`, `pickAiLineup`, `pickAiTactics` — dispatcher convenience functions
  - `sessionStore`: `aiDifficulty: AiDifficulty | null` state (default `'normal'`), `setAiDifficulty()` action
  - `matchStore`: `playerCardHistory: CardChoice[]` state, `recordPlayerCard()` action (rolling last-3 window)
  - `TitleScreen`: difficulty selector (Easy / Normal / Hard) with emoji indicators and descriptions
  - `LineupScreen`: AI mode auto-selects away lineup via `pickAiLineup()` and starts FIRST_HALF immediately
  - `DuelScreen`: AI mode `human_pick` state — no cover screen, human picks card, AI resolves instantly
- i18n: `difficulty.*` keys added to both `en.json` and `fi.json`
  - `select`, `easy`, `easy_desc`, `normal`, `normal_desc`, `hard`, `hard_desc`, `ai_attacking`, `ai_thinking`
- **48 unit tests** in `tests/unit/engine/ai.test.ts`
- **20 functional tests** in `tests/functional/ai_match.test.tsx`
- **11 new integration tests** in `tests/integration/TitleScreen.test.tsx` (difficulty selector)
- Total: **227 passing tests** (up from 148)

### Changed
- `TitleScreen` — difficulty selector replaces plain start button; `setAiDifficulty()` called before `beginSoloMatch()`
- `LineupScreen` — AI mode skips the away-side manual pick; two-player mode unchanged
- `DuelScreen` — `initialUiPhase` is `'human_pick'` in AI mode; no cover screen; `recordPlayerCard()` called on every human pick

### Fixed
- All existing tests broken by `sessionStore.aiDifficulty` defaulting to `'normal'` — added `setAiDifficulty(null)` to `beforeEach` in `DuelScreen.test.tsx`, `LineupScreen.test.tsx`, and `match_flow.test.tsx`

---

## [0.2.0] — 2026-03-09

### Added
- Phase 1 UI: all solo match screens implemented and tested
  - `TitleScreen` — club branding, "Start Solo Match" button, language toggle
  - `TriviaScreen` — random question from trivia.json, self-report Correct/Wrong, trivia boost
  - `LineupScreen` — two-step home/away picker (5 outfield + 1 GK), trivia penalty picker
  - `DuelScreen` — card triangle UI with cover screen, possession badge, trivia boost banner, Brick Wall keeper logic
  - `HalftimeScreen` — score display, player swap or tactic change (one action per halftime)
  - `ResultScreen` — win/draw/loss banner, final score, season points earned, Play Again
- `App.tsx` — phase-driven screen router (`TITLE → TRIVIA → LINEUP → FIRST_HALF → HALFTIME → SECOND_HALF → RESULT`)
- UI components: `CardButton`, `ScoreBoard`, `PlayerCard`
- Test infrastructure: `tests/setup.ts` (i18n English init), `tests/utils/renderWithProviders.tsx`
- Integration test: `match_flow.test.tsx` — full solo match from TitleScreen to ResultScreen
- i18n: all screen strings added to `en.json` and `fi.json` (`title.*`, `trivia.*`, `lineup.*`, `duel.*`, `halftime.*`, `tactic.*`, `result.*`)
- `matchStore`: new actions `beginSoloMatch`, `triviaCorrect`, `triviaWrong`, `startFirstHalf`; `TITLE` phase; `triviaBoostActive` state
- `trivia.json`: field names normalised (`question_en`, `question_fi`), `wrong_answers` array added
- `match.ts`: `MATCH_PHASE.TITLE` constant added

### Changed
- `App.tsx` rewritten from static placeholder to full screen router
- `matchStore` initial phase changed from `TRIVIA` to `TITLE`
- `vite.config.js` test setup file updated from `setup.js` → `setup.ts`

### Fixed
- Infinite re-render in `LineupScreen` caused by object selector pattern in Zustand v5 — replaced with individual selectors throughout all screen components
- `BrickWallState.available` reference error in `DuelScreen` — corrected to `!brickWall.usedThisHalf` using `useState`
- `HalftimeScreen` score display issue when using `setState` with numeric values — test setup now uses only store actions

---

## [0.1.0] — 2026-03-09

### Added
- React + Vite project scaffold with TypeScript strict mode
- Tailwind CSS v4 via @tailwindcss/vite
- Zustand stores: matchStore, sessionStore, seasonStore, squadStore
- Game engine (pure functions, fully decoupled from React):
  - `duel.ts` — triangle resolution + stat tiebreak
  - `goalkeeper.ts` — save attempt logic + Kivimuuri state
  - `possession.ts` — possession transitions + coin flip
  - `abilities.ts` — ability handlers (hot_streak, try_hard_mode, pressure_44, estis, applyStaminaPenalty)
  - `sattuma.ts` — weighted deck build + draw
  - `match.ts` — phase constants, match points, halftime options
- Data files: `players.json` (8 players), `sattuma.json` (12 cards), `trivia.json` (placeholder)
- i18n: EN and FI translations — Finnish is the default language
- Component placeholders for all screens and shared UI
- `App.tsx`: club title screen with language toggle, club colours (#1A1A1A / #FFE600)
- Unit tests: duel, goalkeeper, abilities, sattuma, possession (tests/unit/engine/)
- Functional test scaffold (tests/functional/)
- tsconfig.json with strict mode
- Docs: CHANGELOG.md, PLAYERS.md, TRIVIA.md, ARCHITECTURE.md, FIREBASE.md
