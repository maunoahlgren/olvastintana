# CHANGELOG

All notable changes to this project are documented here.
Format: `## [version] — date` with Added / Changed / Fixed sections.

---

## [0.6.1] — 2026-03-15

### Fixed
- **Founding year corrected to 2006** — anniversary badge in `TitleScreen.tsx` was showing `2005 – 2025`; corrected to `2006 – 2026` (club founded 2006, 20th anniversary 2026)
- `context.md` — year range updated to `(2006–2026)`
- `TriviaScreen` random selection confirmed correct: `Math.floor(Math.random() * questions.length)` picks uniformly across all N questions on mount

### Tests
- `TitleScreen.test.tsx` — anniversary badge assertion updated to `2006 – 2026`
- All **323 tests passing**

---

## [0.6.0] — 2026-03-10

### Added
- **TriviaScreen: bilingual question display with language toggle**
  - New trivia.json schema: `id`, `sport`, `era`, `question: {en, fi}`, `answers: {en, fi}`, `correctIndex` (always 0 in source; game shuffles at runtime)
  - `TriviaQuestion` interface updated in `TriviaScreen.tsx`
  - Finnish shown by default; `trivia-lang-toggle` button switches to English and back
  - Correct answer shown on reveal uses the active display language
  - i18n: `trivia.lang_en` = "EN", `trivia.lang_fi` = "FI" added to both locale files
- **PreMatchScreen: random flavour text from `flavour_texts.json`**
  - `src/data/flavour_texts.json` — 10 prematch flavour lines (club anecdotes); structure `{ prematch_flavour: [{ id, text_fi, text_en }] }`
  - `PreMatchScreen` picks a random line with `useMemo` on mount, language-aware (follows global i18n)
  - Tier-based colour accent preserved; tier-based static i18n flavour keys removed
- **`LanguageToggle`** component gains `data-testid="language-toggle"` for unambiguous test queries

### Changed
- `src/data/trivia.json` — replaced invalid markdown content with valid JSON array using new bilingual schema (2 sample questions; real questions TBD)
- `src/components/screens/TriviaScreen.tsx` — full rewrite of data handling for new schema
- `src/components/screens/PreMatchScreen.tsx` — imports `flavour_texts.json`, removes static `FLAVOUR_KEY` constant

### Fixed
- `src/data/trivia.json` — file contained TRIVIA.md documentation text (not valid JSON) after accidental commit; replaced with correct JSON structure
- `tests/integration/match_flow.test.tsx` — "floating language toggle visible" and "language toggle switches" tests updated to use `data-testid="language-toggle"` to avoid ambiguity with trivia screen's per-question toggle

### Tests
- `tests/integration/TriviaScreen.test.tsx` — mocks `trivia.json`, adds 6 new tests (Finnish default, EN toggle, toggle button label, answer language correctness)
- `tests/integration/PreMatchScreen.test.tsx` — mocks `flavour_texts.json`, 3 tier-specific flavour text content tests replaced with deterministic English locale test
- Total: **323 passing tests** (up from 318)

---

## [0.5.0] — 2026-03-10

### Changed (BREAKING)
- **Stat system fully migrated** from `pace / technique / power / iq / chaos` to `riisto / laukaus / harhautus / torjunta / stamina`
  - `src/engine/duel.ts` — `PlayerStats` interface now `{ riisto, laukaus, harhautus, torjunta, stamina }`; `TIE_STAT` updated: Press→`riisto`, Feint→`harhautus`, Shot→`laukaus`
  - `src/engine/goalkeeper.ts` — save check now `keeper.torjunta >= shooter.laukaus`
  - `src/engine/abilities.ts` — `applyStaminaPenalty` applies -1 to `riisto/laukaus/harhautus/torjunta` in H2 when `stamina < 2`; `hotStreak` boosts `riisto/laukaus/harhautus` to 8; player IDs updated to `mauno_ahlgren` / `jyrki_orjasniemi`
  - `src/engine/ai.ts` — `totalStats` sums 5 new stats; `AiGameState.activePlayerIq` renamed to `activePlayerStamina`; `hardAiCard` mistake formula updated to `(2 - stamina) / 4`; `hardAiLineup` counter-stat map: aggressive→`harhautus`, defensive→`laukaus`, creative→`riisto`
  - `src/store/squadStore.ts` — `PlayerAbility` simplified to `{ description_fi, description_en }` (no `type/id/name_en/name_fi`); `Player` gains `number: number` and `tier: PlayerTier` fields; `ability` is now optional
  - `src/components/ui/PlayerCard.tsx` — `STAT_KEYS` updated; ability shows description only (no name/icon); player number shown
  - `src/components/screens/LineupScreen.tsx` — trivia penalty mod uses new stat names
  - `src/i18n/en.json` & `fi.json` — `stats` section: old 6-key block replaced with `riisto/laukaus/harhautus/torjunta/stamina`

### Added
- `PlayerTier` type (`regular | legend | reinforcement`) exported from `squadStore.ts`
- Player `number` field displayed in `PlayerCard`
- Graceful rendering when `Player.ability` is undefined

### Fixed
- All unit and integration tests updated to use new stat names and player IDs — **318 tests passing**

---

## [0.4.0] — 2026-03-09

### Added
- **Season structure — 7-fixture solo season mode**
  - `src/engine/season.ts` — pure functions for season management
    - Types: `OpponentTier`, `Opponent`, `FixtureResult`, `Fixture`
    - `SEASON_FORMAT` constant: 1 hard + 3 normal + 3 easy = 7 total fixtures
    - `generateFixtures(opponents, rng?)` — picks & sorts by strength_score ascending; optional RNG for deterministic tests
    - `fixturePoints(homeGoals, awayGoals)` — returns 3 / 1 / 0
  - `src/data/opponents.json` — 20 opponent clubs in 3 tiers (hard / normal / easy)
- **Three new screens**
  - `SeasonScreen` — fixture list (7 rows), points tally, "Play Next Match" button; `data-testid="season-screen"`
  - `PreMatchScreen` — opponent name, tier badge, flavour text, W/D/L record, stats, "Kick Off" button; tier auto-sets AI difficulty; `data-testid="prematch-screen"`
  - `SeasonCompleteScreen` — final points (colour-coded green/yellow/red), W/D/L breakdown, "New Season" button; `data-testid="season-complete-screen"`
- **Routing extended**: `TITLE → SEASON → PREMATCH → TRIVIA → LINEUP → FIRST_HALF → HALFTIME → SECOND_HALF → RESULT → SEASON` (×7) `→ SEASON_COMPLETE`
- **New MATCH_PHASE constants** in `src/engine/match.ts`: `SEASON`, `PREMATCH`, `SEASON_COMPLETE`
- **New matchStore actions**: `startSeason()`, `goToPreMatch()`, `returnToSeason()`, `completeSeason()`
- **seasonStore** completely rewritten for solo season tracking
  - State: `fixtures: Fixture[]`, `currentFixtureIndex: number`
  - Actions: `initSeason`, `recordFixtureResult`, `getCurrentFixture`, `getTotalPoints`, `getWins`, `getDraws`, `getLosses`, `isSeasonComplete`, `reset`
- **i18n** — new keys in both `en.json` and `fi.json`: `season.*`, `prematch.*`, `season_complete.*`
- **New tests** (90 total across 5 new files):
  - `tests/unit/engine/season.test.ts` — 18 tests: fixture generation, format invariants, deterministic RNG, points calculation
  - `tests/unit/store/seasonStore.test.ts` — 24 tests: initSeason, recordFixtureResult, aggregation functions, guard behaviour
  - `tests/integration/SeasonScreen.test.tsx` — 11 tests: fixture rows, result badges, points tally, navigation
  - `tests/integration/PreMatchScreen.test.tsx` — 15 tests: opponent display, tier badge, flavour text, AI difficulty mapping, kick off navigation
  - `tests/integration/SeasonCompleteScreen.test.tsx` — 8 tests: points display, W/D/L record, new season flow
  - `tests/functional/season_flow.test.ts` — 18 tests: phase transitions, full 7-match season via store, format invariants across 10 random seasons
- Total: **317 passing tests** (up from 227)

### Changed
- `TitleScreen` — difficulty selector **removed**; "Start Season" button generates 7-fixture season and navigates to `SEASON` phase; i18n key `title.start_solo` updated
- `ResultScreen` — "Play Again" replaced by **"Continue"** button (`data-testid="continue-to-season-btn"`); clicking Continue records result in `seasonStore` and navigates to `SEASON` (or `SEASON_COMPLETE` if last fixture)
- `App.tsx` — 3 new phase cases: `SEASON → SeasonScreen`, `PREMATCH → PreMatchScreen`, `SEASON_COMPLETE → SeasonCompleteScreen`
- `PreMatchScreen` — maps opponent tier to `sessionStore.aiDifficulty` before calling `beginSoloMatch()`

### Fixed
- Updated existing tests to match new routing and button renames:
  - `TitleScreen.test.tsx` — removed difficulty selector tests; "Start Season" now goes to `SEASON` not `TRIVIA`; season fixture population tests added
  - `ResultScreen.test.tsx` — `play-again-btn` → `continue-to-season-btn`; phase after click `TITLE` → `SEASON`; SEASON_COMPLETE test for last fixture
  - `match_flow.test.tsx` — `beforeEach` resets `seasonStore`; "Start Season → SeasonScreen" and "Continue → SEASON" tests updated

---

## [0.3.1] — 2026-03-09

### Fixed
- **Critical rule correction: lineup is 6 outfield + 1 GK (7 total), not 5+1**
  - `LineupScreen` — validation updated to require exactly 6 outfield; counter display `/5` → `/6`; max selection cap 5 → 6; file-header comment updated
  - `DuelScreen` — `duelIndex % 5` → `duelIndex % 6` (cycles through 6 outfield slots)
  - `HalftimeScreen` — `homeLineup.slice(0, 5)` → `slice(0, 6)` for swap candidate list
  - `ai.ts` — all three lineup functions (`easyAiLineup`, `normalAiLineup`, `hardAiLineup`) changed from `slice(0, 5)` → `slice(0, 6)`; JSDoc comments updated to reflect 6 outfield
  - `en.json` / `fi.json` — `select_5_outfield` string values updated from 5 → 6
- **All test fixtures updated to 6 outfield + 1 GK lineups**
  - `DuelScreen.test.tsx`, `ai_match.test.tsx`, `HalftimeScreen.test.tsx` — lineup setup `slice(0, 5)` → `slice(0, 6)`
  - `HalftimeScreen.test.tsx` — swap-candidate filter `slice(0, 5)` → `slice(0, 6)`
  - `LineupScreen.test.tsx` — `selectFullLineup()` clicks 6 cards; lineup length assertion 6 → 7 (6+GK); description updated
  - `match_flow.test.tsx` — `pickFullLineup()` clicks 6 cards
  - `ai.test.ts` — `TEST_SQUAD` gains `p7` (total=5) as the new lowest-stat player; all `toHaveLength(5)` → `toHaveLength(6)`; exclusion assertion `not.toContain('p5')` → `not.toContain('p7')`; custom power/pace squads gain a 7th outfield player
- All 227 tests still pass

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
