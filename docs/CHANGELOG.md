# CHANGELOG

All notable changes to this project are documented here.
Format: `## [version] — date` with Added / Changed / Fixed sections.

---

## [1.2.1] — 2026-03-18

### Fixed
- **No quit button on SeasonScreen / PreMatchScreen** — `QuitMatchButton` added to both screens. On `SeasonScreen` it sits inline in the header row beside the title. On `PreMatchScreen` it is positioned `absolute top-4 left-4` over the centred content. The loading-guard fallback in `PreMatchScreen` also shows the quit button.
- **Browser-back → "Loading..." stuck on PREMATCH** — `useSessionPersistence` now detects when restoring a `PREMATCH` session with an empty `seasonStore` (memory-only; lost after navigation-away) and falls back to `MATCH_PHASE.SEASON` instead. The player lands on the season hub and can click "Play Next Match" to continue their season — no more stuck loading screen.
- **Total: 609 tests, all passing** (6 new tests across `useSessionPersistence`, `SeasonScreen`, and `PreMatchScreen` suites)

---

## [1.2.0] — 2026-03-18

### Added
- **LineupScreen redesign** — Goalkeeper section now appears above outfield. Composite counter (`X/6 kenttäpelaajaa • Y/1 maalivahti`) replaces separate section labels. Both grids are responsive (`grid-cols-2 sm:grid-cols-3`). Unselected cards dim (`opacity-50`) once a slot is full.
- **Duel outcome panel** — Result panel now shows a dedicated `MAALIYRITYS! 🎯` banner on any goal attempt, followed by `MAALI! 🟡` + scorer's name on goals or `TORJUTTU! 🧤` + keeper's name on saves. Possession wins show `Sait pallon ⚽` / `Puolustit pallon 🛡️` instead of generic win/lose text. `DuelResult` interface extended with `scorerName` and `keeperName` fields.
- **Active player cards in solo DuelScreen** — A persistent side-by-side row of `PlayerCard` components (with `Hyökkää ⚽` / `Puolustaa 🛡️` badges) is always visible during a duel, showing the active outfield player for each side including stats and ability.
- **BigScreen Derby player cards** — `BigScreenDuelView` now shows both managers' active player cards side by side, cycling by duel index via new `getActivePlayerByIndex()` helper. Attacker/defender badges reflect current possession.
- **Permanent instruction sidebar on big screen** — `InstructionSidebar` component added to `DerbyDuelScreen`. Always visible on the right side of `BigScreenDuelView`: shows the card triangle rules (⚔️/💨/🎯), current possession, current score, and current half. Never a modal.
- `i18n` — 10 new keys across `lineup`, `duel`, and `derby_match` namespaces (both `fi.json` and `en.json`).
- **Total: 603 tests, all passing** (18 new tests across `DuelScreen`, `LineupScreen`, `DerbyDuelScreen` integration suites)

---

## [1.1.1] — 2026-03-18

### Fixed
- **Stuck loading screen on reload** — `useSessionPersistence` now records a `savedAt` Unix timestamp whenever a session is written to localStorage. On restore, Derby Night sessions older than 6 hours are silently discarded (the Firebase room will have expired). Sessions with no `savedAt` field (legacy data saved before this fix) are also discarded. Solo match sessions are unaffected — they have no Firebase dependency and are still restored regardless of age. This prevents the app rendering a Derby screen that spins forever waiting for a dead Firebase room.
- **Total: 583 tests, all passing**

---

## [1.1.0] — 2026-03-18

### Added
- **Quit match button** — `src/components/ui/QuitMatchButton.tsx` adds a small "← Etusivu / ← Home" button to every solo match screen except ResultScreen (TriviaScreen, LineupScreen, DuelScreen, HalftimeScreen). Tapping opens a confirmation dialog ("Haluatko varmasti lopettaa ottelun? Edistyminen menetetään."). Confirming clears the `ot_session` localStorage key and calls `matchStore.reset()`, returning the player to the title screen. Cancelling or tapping the backdrop dismisses the dialog without any side effects.
- `i18n/fi.json` and `i18n/en.json` — 5 new keys under `quit.*` namespace (`btn`, `title`, `message`, `confirm`, `cancel`).
- Tests: `tests/unit/ui/QuitMatchButton.test.tsx` (9 tests covering render, dialog open/close, cancel safety, backdrop close, confirm reset, and localStorage removal).
- **Total: 580 tests, all passing**

---

## [1.0.0] — 2026-03-16

### Added
- **Refresh protection** — `src/utils/useSessionPersistence.ts` hook saves match phase, room code, role, and manager ID to `localStorage` on every state change. On page reload the correct screen is restored. Derby Night players rejoin their room automatically (Firebase match state re-syncs via `useDerbyMatchSync`). Hook is safe: only restores when the store is at the default TITLE phase, so test setup is never overridden.
- **In-game help modal** — `src/components/ui/HelpModal.tsx` shows the card triangle (Press beats Feint, Feint beats Shot, Shot beats Press), possession rule, active tactic (solo DuelScreen only), and active card restrictions (solo DuelScreen only). A persistent `?` button is now present on `DuelScreen` and `DerbyDuelScreen` phone view. Modal dismissable by tapping backdrop, `×` button, or bottom close button. Bilingual (FI default, EN toggle) via new `help.*` i18n namespace.
- `i18n/fi.json` and `i18n/en.json` — 15 new keys under `help.*` namespace for the in-game help modal.
- Tests: `tests/unit/ui/HelpModal.test.tsx` (18 tests), `tests/integration/HelpModal.test.tsx` (11 tests), `tests/unit/utils/useSessionPersistence.test.ts` (10 tests).
- **Total: 571 tests, all passing**

### Fixed
- **Derby lineup bug** — `DerbyLineupScreen.tsx` incorrectly required 5 outfield players instead of 6. Validation logic (`canSubmit`, `outfieldSelected >= 5` cap), selection counter display (`/5`), and JSDoc all corrected to 6. `i18n` keys `derby_match.lineup_select_outfield` and `derby_match.lineup_invalid` updated to say "6" in both languages. AI lineup functions (`easyAiLineup`, `normalAiLineup`, `hardAiLineup` in `ai.ts`) were already correct (`.slice(0, 6)`).

---

## [0.9.0] — 2026-03-16

### Added
- **Derby Night — synced match flow across devices** (Session 2)
- `src/firebase/derbyMatch.ts` — full Firebase match state schema and all write helpers: `initMatch`, `submitLineup`, `submitTriviaAnswer`, `submitCard`, `writeDuelResult`, `advanceDerbyPhase`, `resetForNextDuel`, `submitHalftimeAction`, `listenToMatch`
- `src/store/derbyStore.ts` — display-only Zustand store; synced from Firebase via `setFromFirebase(snap)`; never written by UI directly
- Five new `MATCH_PHASE` constants: `DERBY_LINEUP`, `DERBY_TRIVIA`, `DERBY_DUEL`, `DERBY_HALFTIME`, `DERBY_RESULT`
- `matchStore.setDerbyPhase(phase)` and `matchStore.goToDerbyLineup()` — new phase transition actions
- `App.tsx` — `useDerbyMatchSync` hook subscribes to Firebase `rooms/{code}/match/` for all DERBY_ match phases; `DERBY_PHASE_MAP` maps Firebase phases to local constants; language toggle hidden on all DERBY_ phases
- `DerbyLineupScreen.tsx` — host/player phone view (player grid, 5 outfield + 1 GK validation, submit); big screen waiting view; host auto-advances to trivia when both lineups ready
- `DerbyTriviaScreen.tsx` — all devices see question; phone view with reveal + correct/wrong buttons; first correct answer wins stat boost (atomic Firebase `get()` check); big screen continue button (gated by reveal); host auto-advances to duel when both answered
- `DerbyDuelScreen.tsx` — phone card picker (Shot disabled when not attacking); big screen status badges with 3-2-1 countdown; `duel_result` phase view shows cards and outcome on all devices; host resolves via `resolveDuel()` + `resolveGoalkeeping()` and writes result; host advances to halftime/result after display timeout
- `DerbyHalftimeScreen.tsx` — phone choose view (swap / tactic / skip); swap flow (select out + bench pick); tactic flow (aggressive / defensive / creative); submitted + big screen waiting views; host calls `resetForNextDuel` when both done (second-half kickoff = opposite of first half)
- `DerbyResultScreen.tsx` — full-time score with manager avatars; contextual win/loss/draw label per role; "Back to Lobby" resets all three stores
- `DerbyLobbyScreen.tsx` updated — two-step host flow (manager picker → create room); spectator join path; host selects manager before room creation; `initMatch()` called before `startRoom()`; all three Firebase listener callbacks call `goToDerbyLineup()`
- i18n `derby_match.*` namespace (~60 keys) in both `en.json` and `fi.json`
- Tests: `tests/unit/firebase/derbyMatch.test.ts` (15 tests), `tests/unit/store/derbyStore.test.ts` (12 tests), `tests/integration/DerbyLineupScreen.test.tsx`, `DerbyTriviaScreen.test.tsx`, `DerbyDuelScreen.test.tsx`, `DerbyHalftimeScreen.test.tsx`, `DerbyResultScreen.test.tsx`
- **Total: 532 tests, all passing**

### Changed
- `DerbyLobbyScreen.tsx` — "Create Room" button now goes to host manager picker first, then creates room on confirm
- `DerbyLobbyScreen.tsx` — `startRoom` mock in integration tests updated to include `derbyMatch.initMatch` mock

### Fixed
- `DerbyLobbyScreen` test: added `firebase/derbyMatch` mock and two-step create-room helper
- `derbyMatch.test.ts`: removed stale `mockGet.mockResolvedValueOnce` from wrong-answer test; `onValue` mock now returns unsubscribe function
- `DerbyTriviaScreen.test.tsx`: spectator continue button test now clicks reveal first

---

## [0.8.0] — 2026-03-15

### Added
- **Derby Night — Firebase room system** (Session 1)
- `src/data/managers.json` — 10 manager profiles (OlliM #20, Mauno #15, Tero #17, Kimmo #14, Iiro #13, OlliN #61, Jyrki #5, Jukka #88, Jari #8, Petri #83) each with `id`, `display_name`, `number`, `player_id`, `color`
- `src/firebase/config.ts` — safe Firebase initialization from VITE_ env vars; `db = null` fallback when unconfigured
- `src/firebase/room.ts` — `generateRoomCode` (32-char safe charset, 4 chars), `createRoom`, `joinRoom`, `listenToRoom`, `leaveRoom`; Firebase path: `rooms/{code}/state|host|created_at|players/{managerId}`
- `src/store/roomStore.ts` — Zustand store: `roomCode`, `role`, `myManagerId`, `connectedPlayers`, `lobbyStatus`, `errorMessage`; actions: `setRoom`, `setConnectedPlayers`, `addPlayer`, `removePlayer`, `setLobbyStatus`, `reset`
- `MATCH_PHASE.DERBY_LOBBY` — new phase constant in `match.ts`
- `matchStore.goToDerbyLobby()` — transitions to DERBY_LOBBY phase
- `DerbyLobbyScreen.tsx` — host view (room code, QR code via api.qrserver.com, player list, Start button) + player view (code entry, manager picker grid); URL param `?room=CODE` pre-fills code input; Firebase unsubscribed on unmount
- **TitleScreen** — two buttons: "Solo Season" (primary) + "Derby Night" (secondary pink); solo button renamed from "Start Season" → "Solo Season"
- `App.tsx` — DERBY_LOBBY phase routes to DerbyLobbyScreen; language toggle hidden on lobby screen
- i18n `derby.*` namespace — 15 keys in both `en.json` and `fi.json`
- `title.derby_night` key added to both locale files; `title.start_solo` renamed "Solo Season" / "Solo kausi"
- Unit tests: `tests/unit/store/roomStore.test.ts` (27 tests), `tests/unit/firebase/room.test.ts` (20 tests)
- Integration tests: `tests/integration/DerbyLobbyScreen.test.tsx` (18 tests), `TitleScreen.test.tsx` updated (4 new tests for Derby Night button)

### Changed
- `TitleScreen` button label "Start Season" → "Solo Season"
- `App.tsx` — LanguageToggle hidden on both TITLE and DERBY_LOBBY phases (DerbyLobbyScreen manages its own chrome)

---

## [0.7.0] — 2026-03-15

### Added
- **Player ability system wired to DuelScreen** — 11 abilities now trigger during duels
- **Ability notifications overlay** in result panel — shows player name + effect text when ability fires
  - `data-testid="ability-notifications"` list; each item `data-testid="ability-notification"`
- **Reactive ability panel** (`reactive_check` phase) — after both cards are chosen, Estola / Alanen / Haritonov see opponent's card and can switch their card
  - `data-testid="reactive-check-panel"`, `reactive-keep-btn`, `reactive-switch-btn`
  - Estola (#88): played Press → can switch to Shot
  - Petri Alanen (#83): played Shot → can switch to Feint
  - Antti Haritonov (#19): played Feint → can switch to Press
- **Card restrictions** — buttons disabled when restriction effect active on attacker's side
  - `restrict_press`, `restrict_feint`, `restrict_shot` effects from Laitanousu, Jyrki, Tuplablokki
- **Post-win abilities** — trigger after duel winner is determined:
  - Kapteeni (Mehtonen #20): adds `kapteeni_boost` effect with `statMod: +2 riisto/laukaus/harhautus` next duel
  - Kaaoksen lähettiläs (Mauno #15): notification (Sattuma draw deferred to Phase 2)
  - 44 min paine (Jyrki #5): adds `restrict_feint` to loser side
  - Dominoiva (Savela #8): adds `ability_cancelled` to loser side
  - Tuplablokki (Nieminen #60): adds `restrict_shot` to loser side
  - Laitanousu (Kurkela #21): adds `restrict_press` to loser side
  - Matigol (Mattila #14): auto-goal when winning as attacker — goalkeeper skipped
  - Ninja (Mäkelä #13): counter-goal attempt when winning as defender
- **Effect expiry in `handleContinue`** — effects with `expiresAfterDuel <= duelIndex` are expired before advancing
- **Kapteeni stat boost applied** — active `kapteeni_boost` effect adds stat modifier to winning side in next duel
- **`ActiveEffect.statMod`** — optional `Partial<PlayerStats>` field for stat-modifying effects (Kapteeni)
- 8 new ability functions in `src/engine/abilities.ts`: `kapteeni`, `kaaoksenLahettilas`, `matigol`, `ninja`, `tuplablokki`, `laitanousu`, `dominoiva`, `checkReactiveSwitch`
- i18n keys: `ability.*` namespace added to both `en.json` and `fi.json` (12 keys each)

### Fixed
- `DuelScreen.tsx`: AI `getAiCard()` was reading non-existent `player.stats.iq` — corrected to `player.stats.stamina`
- `DuelScreen.tsx`: `AiGameState` object had `activePlayerIq` property — corrected to `activePlayerStamina`
- `DuelScreen.tsx`: Brick Wall check used `goalkeeperSlot?.player.ability.id === 'brick_wall'` — `PlayerAbility` has no `id` field; corrected to check `player.id === 'tommi_helminen'`
- `DuelScreen.tsx`: fallback stats used old `{ pace, technique, power, iq, chaos }` shape — corrected to `{ riisto, laukaus, harhautus, torjunta, stamina }`

### Tests
- `tests/unit/engine/abilities.test.ts` — 36 new unit tests for the 8 new ability functions (47 total in file)
- `tests/integration/DuelScreen.test.tsx` — 12 new integration tests: notification display, card restriction disabled state, reactive panel show/keep/switch, non-reactive player path
- All **369 tests passing**

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
