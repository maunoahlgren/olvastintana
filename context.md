# CONTEXT.md — Olvastin Tana FC: The Game
# Full project context for Claude Code.
# Updated after every significant decision or completed phase.
# Last updated: 2026-03-09 — Phase 1 complete, AI opponent added before Phase 2

---

## 🏟️ What This Is
A bilingual (Finnish/English) web-based football card game built for Olvastin Tana FC's 20th anniversary (2005–2025). The club is a tight group of childhood friends who play park football. The game is built around their real players, history, and inside jokes.

Two modes:
- **Solo mode** — manage the club through a season alone
- **Derby Night** — party mode for 2–6 players at get-togethers, everyone on their own phone

---

## 🛠️ Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Multiplayer | Firebase Realtime Database |
| Hosting | Vercel |
| Version Control | GitHub |
| Testing | Vitest + React Testing Library |
| i18n | i18next (Finnish default, English toggle) |
| Language | TypeScript strict mode |

---

## 📁 Project Structure
```
/src
  /data
    players.json        ← All player cards
    trivia.json         ← Club history questions (EN + FI)
    sattuma.json        ← Fortune deck card definitions
  /engine
    duel.ts             ← Duel resolution logic (pure functions)
    abilities.ts        ← Player ability handlers
    possession.ts       ← Possession state logic
    goalkeeper.ts       ← Save attempt logic
    sattuma.ts          ← Sattuma deck draw and apply
    dirtyMoves.ts       ← Dirty move logic
    match.ts            ← Full match orchestration
    season.ts           ← Season tracking
    ai.ts               ← Computer opponent logic (NEW — see Phase 1.5)
  /store
    matchStore.ts       ← Zustand match state
    squadStore.ts       ← Zustand squad state
    sessionStore.ts     ← Zustand session/multiplayer state
    seasonStore.ts      ← Zustand season state
  /components
    /match              ← Match UI components
    /squad              ← Squad/player card components
    /trivia             ← Trivia screen components
    /lobby              ← Derby Night lobby components
    /season             ← Season tracker components
    /shared             ← Shared UI (buttons, banners, logo)
  /i18n
    en.json             ← English translations
    fi.json             ← Finnish translations
  /firebase
    config.ts           ← Firebase setup
    room.ts             ← Room creation and joining
    sync.ts             ← Real-time state sync
  /media
    /players            ← Player photos
    /clips              ← Club video clips for celebrations
/tests
  /unit
    /engine             ← Unit tests for all engine functions
  /functional           ← Full flow and ability interaction tests
  /integration          ← React Testing Library UI flow tests
/docs
  PLAYERS.md
  TRIVIA.md
  ARCHITECTURE.md
  FIREBASE.md
  CHANGELOG.md
  CONTRIBUTING.md
```

---

## 🎮 Game Rules Summary

### Format
- Park football: 5 outfield players + 1 goalkeeper per side
- 44 minutes: two halves of 22 minutes each
- Card duels simulate key match moments

### The Three Cards (Rock-Paper-Scissors)
| Card | Finnish | Beats | Loses to |
|------|---------|-------|----------|
| ⚔️ Press | Riisto | Feint | Shot |
| 💨 Feint | Harhautus | Shot | Press |
| 🎯 Shot | Laukaus | Press | Feint |

### Duel Flow
1. Both players secretly pick a card
2. Reveal simultaneously
3. Reactive abilities trigger (before resolution)
4. Winner determined by triangle above
5. Post-resolution abilities trigger
6. Sattuma drawn if ability requires it
7. Possession / goal resolved

### Possession
- Only the player with possession can shoot
- Winning a duel without the ball = gain possession
- Winning a duel with the ball + Shot card = goal attempt

### Goalkeeper
- Does not participate in duels
- Gets one save attempt when Shot wins a duel
- Save = stat check (keeper stats vs shooter Power)

### Match Structure
1. Trivia question → correct = first card auto-wins, wrong = opponent picks player to get -1 all stats
2. Manager picks: 5 players + keeper, tactics, dirty move (Derby Night)
3. Dirty moves revealed simultaneously
4. First half duels
5. Halftime: swap one player OR change tactics (not both)
6. Second half duels (low Stamina players get -1 all stats)
7. Full time: count goals, settle Bet Slip wagers

### Tactics
- Aggressive → boosts Shot cards
- Defensive → boosts Press cards
- Creative → boosts Feint cards

---

## 👥 Squad Data

### Known Players
```json
[
  {
    "id": "alanen",
    "name": "Alanen",
    "position": ["MF", "FW"],
    "stats": { "pace": 4, "technique": 5, "power": 4, "iq": 6, "stamina": 4, "chaos": 3 },
    "ability": {
      "type": "boost",
      "id": "hot_streak",
      "name_en": "Hot Streak",
      "name_fi": "Tulisarja",
      "description_en": "Can randomly explode for 6 points. On a roll, cannot be stopped.",
      "description_fi": "Voi räjähtää satunnaisesti 6 pisteeseen. Vauhdissa ei voi pysäyttää."
    }
  },
  {
    "id": "mehtonen",
    "name": "Mehtonen",
    "position": ["MF", "FW"],
    "stats": { "pace": 4, "technique": 4, "power": 4, "iq": 4, "stamina": 5, "chaos": 2 },
    "ability": {
      "type": "boost",
      "id": "box_to_box",
      "name_en": "Box to Box",
      "name_fi": "Edestakaisin",
      "description_en": "Counts as both midfielder and forward in the same duel.",
      "description_fi": "Lasketaan sekä keskikenttäpelaajana että hyökkääjänä samassa duelissa."
    }
  },
  {
    "id": "mattila",
    "name": "Mattila",
    "position": ["MF", "FW"],
    "stats": { "pace": 3, "technique": 3, "power": 6, "iq": 3, "stamina": 4, "chaos": 5 },
    "ability": {
      "type": "boost",
      "id": "any_body_part",
      "name_en": "Any Body Part",
      "name_fi": "Mikä tahansa ruumiinosa",
      "description_en": "Goals count regardless of how ugly.",
      "description_fi": "Maalit lasketaan riippumatta siitä miten ruma se on."
    }
  },
  {
    "id": "mauno",
    "name": "Mauno",
    "position": ["FW", "MF"],
    "stats": { "pace": 6, "technique": 3, "power": 3, "iq": 3, "stamina": 5, "chaos": 6 },
    "ability": {
      "type": "chaos",
      "id": "try_hard_mode",
      "name_en": "Try-Hard Mode",
      "name_fi": "Yrittäjä-moodi",
      "description_en": "When Mauno wins a duel, draw a Sattuma card. Could be glorious. Could be a disaster.",
      "description_fi": "Kun Mauno voittaa duelin, nosta Sattuma-kortti. Voi olla loistava tai katastrofaalinen.",
      "trigger": "on_duel_win",
      "effect": "draw_sattuma"
    }
  },
  {
    "id": "iiro",
    "name": "Iiro",
    "position": ["MF", "FW"],
    "stats": { "pace": 5, "technique": 5, "power": 4, "iq": 4, "stamina": 5, "chaos": 4 },
    "ability": {
      "type": "chaos",
      "id": "ninja",
      "name_en": "Ninja",
      "name_fi": "Ninja",
      "description_en": "Unexpected moves, can launch the ball from anywhere.",
      "description_fi": "Odottamattomat siirrot, voi laukaista pallon mistä tahansa."
    }
  },
  {
    "id": "estola",
    "name": "Estola",
    "position": ["MF", "FW"],
    "stats": { "pace": 3, "technique": 5, "power": 4, "iq": 6, "stamina": 3, "chaos": 2 },
    "ability": {
      "type": "reactive",
      "id": "estis",
      "name_en": "Estis",
      "name_fi": "Estis",
      "description_en": "After seeing the opponent's card, choose to play either Press or Shot in response.",
      "description_fi": "Nähtyään vastustajan kortin, valitsee pelaako Riistoa vai Laukausta vastaukseksi.",
      "trigger": "after_opponent_reveal",
      "effect": "choose_press_or_shot"
    }
  },
  {
    "id": "jyrki",
    "name": "Jyrki",
    "position": ["MF"],
    "stats": { "pace": 3, "technique": 3, "power": 4, "iq": 4, "stamina": 6, "chaos": 2 },
    "ability": {
      "type": "restriction",
      "id": "44_minuutin_paine",
      "name_en": "44 Minutes of Pressure",
      "name_fi": "44 minuutin paine",
      "description_en": "After Jyrki wins a duel, the opponent cannot play Feint in the next duel.",
      "description_fi": "Kun Jyrki voittaa duelin, vastustaja ei voi pelata Harhautusta seuraavassa duelissa.",
      "trigger": "on_duel_win",
      "effect": "block_feint_next_duel",
      "duration": 1
    }
  },
  {
    "id": "tommi",
    "name": "Tommi",
    "position": ["GK"],
    "stats": { "pace": 3, "technique": 3, "power": 4, "iq": 4, "stamina": 4, "chaos": 1 },
    "ability": {
      "type": "boost",
      "id": "brick_wall",
      "name_en": "Brick Wall",
      "name_fi": "Kivimuuri",
      "description_en": "Once per half, automatically blocks a shot. Resets at halftime.",
      "description_fi": "Kerran per jakso torjuu automaattisesti laukauksen. Palautuu puoliajalla.",
      "trigger": "on_shot_attempt",
      "effect": "auto_save",
      "uses_per_half": 1,
      "resets_at_halftime": true
    }
  }
]
```

### Players Still Needed (descriptions from the crew)
Tero, Jari, Kurkela, Kukko, Nissinen, Saravo, Kari, Ari

---

## 🃏 Sattuma Deck

### Distribution
- 40% Hyvä (Good)
- 35% Paha (Bad)
- 25% Hyvin Paha (Very Bad)

### Cards
```json
[
  { "id": "selkatuulta", "tier": "hyva", "name_fi": "Tuulee selkätuulta", "name_en": "Tailwind", "effect": "next_shot_auto_wins" },
  { "id": "ref_muualle", "tier": "hyva", "name_fi": "Ref katsoo muualle", "name_en": "Ref Looked Away", "effect": "dirty_move_unblockable" },
  { "id": "maaginen_syotto", "tier": "hyva", "name_fi": "Maaginen syöttö", "name_en": "Magic Pass", "effect": "gain_possession_regardless" },
  { "id": "tuplat", "tier": "hyva", "name_fi": "Tuplat", "name_en": "Doubles", "effect": "next_goal_counts_double" },
  { "id": "liukas_kentta", "tier": "paha", "name_fi": "Liukas kenttä", "name_en": "Slippery Pitch", "effect": "feint_disabled_this_half" },
  { "id": "ref_naki", "tier": "paha", "name_fi": "Ref näki kaiken", "name_en": "Ref Saw Everything", "effect": "dirty_move_cancelled_revealed" },
  { "id": "krampit", "tier": "paha", "name_fi": "Krampit", "name_en": "Cramp", "effect": "lowest_stamina_sits_out_next_duel" },
  { "id": "myohassa", "tier": "paha", "name_fi": "Myöhässä taas", "name_en": "Late Again", "effect": "auto_lose_first_duel_next_half" },
  { "id": "punainen_kortti", "tier": "hyvin_paha", "name_fi": "Punainen kortti", "name_en": "Red Card", "effect": "best_player_suspended_rest_of_half" },
  { "id": "mv_loukkautui", "tier": "hyvin_paha", "name_fi": "Maalivahti loukkautui", "name_en": "Keeper Injured", "effect": "goalkeeper_save_disabled_match" },
  { "id": "nakivat_kortit", "tier": "hyvin_paha", "name_fi": "Vastustaja näki korttisi", "name_en": "They Saw Your Hand", "effect": "opponent_sees_next_3_cards" },
  { "id": "oma_maali", "tier": "hyvin_paha", "name_fi": "Oma maali", "name_en": "Own Goal", "effect": "opponent_scores_free_goal" }
]
```

---

## 🎯 Dirty Moves
| Move | Finnish | Effect |
|------|---------|--------|
| Sabotage | Sabotointi | Target player -1 all stats next match |
| Tap Up | Houkuttelu | Target player unavailable for one round |
| Bet Slip | Vedonlyönti | Bet on result — correct = bonus points, wrong = deduction |

---

## 🏆 Current Build Status

### ✅ Phase 1 — Foundation (Solo Mode MVP)
**Status: COMPLETE (v0.2.0 — 2026-03-09)**
**Repo:** github.com/maunoahlgren/olvastintana
**Dev server:** :5173 (dev) and :4173 (preview) — configured in `.claude/launch.json`

#### ✅ Everything delivered
- Project scaffold: React + Vite + TypeScript strict + Tailwind CSS v4
- **Game engine** (pure TypeScript, fully decoupled from React):
  - `duel.ts` — card triangle (Press/Feint/Shot) + stat tiebreak resolution
  - `goalkeeper.ts` — save attempt logic + Kivimuuri state per half
  - `possession.ts` — possession transitions, coin flip, kickoff rules
  - `abilities.ts` — Hot Streak, Try-Hard Mode, 44 minuutin paine, Estis, stamina penalty
  - `sattuma.ts` — weighted deck builder (40/35/25%) + card draw
  - `match.ts` — phase constants, match points (W=3/D=1/L=0), halftime options
- **Zustand stores:** matchStore, squadStore, sessionStore, seasonStore
- **Data files:** players.json (8 players), sattuma.json (12 cards), trivia.json
- **i18n** — Finnish default, English toggle, all UI keys in both languages
- **Full solo match UI** (phase router: TITLE → TRIVIA → LINEUP → FIRST_HALF → HALFTIME → SECOND_HALF → RESULT):
  - TitleScreen, TriviaScreen, LineupScreen, DuelScreen, HalftimeScreen, ResultScreen
  - UI components: CardButton, ScoreBoard, PlayerCard
- **App.tsx** — phase-driven screen router
- **148 passing tests:** unit (engine), functional (match), integration (all screens + full flow)

---

### 🔄 Phase 1.5 — AI Opponent
**Status: TO BUILD NOW — before Phase 2**

Solo mode currently requires the player to control both sides manually. A computer opponent must be added so solo mode is actually playable against something.

#### New file: `/src/engine/ai.ts`
Pure TypeScript functions only. Fully decoupled from React. Three difficulty levels:

**🟢 Helppo (Easy)**
- Picks cards randomly (equal 33% chance each)
- No awareness of game state
- Good for learning the game

**🟡 Normaali (Normal)**
- Weighted random based on game state:
  - Has possession → higher weight on Laukaus (Shot)
  - Losing with fewer than 2 duels left in half → higher weight on Laukaus
  - Opponent just played Riisto → higher weight on Harhautus
  - Otherwise balanced weights
- Picks lineup based on highest combined stats
- Picks tactics randomly

**🔴 Vaikea (Hard)**
- Reads full game state:
  - Tracks which cards the player has played in the last 3 duels
  - Counters the player's most frequent recent card
  - If possession: plays Shot unless player likely to counter with Press
  - Picks lineup to maximise stat advantage over player's chosen lineup
  - Picks tactics to counter player's chosen tactics
  - Uses IQ stat of active player to add occasional intentional mistakes (not perfectly predictable)

#### AI function signatures
```typescript
type CardChoice = 'press' | 'feint' | 'shot'
type Tactic = 'aggressive' | 'defensive' | 'creative'

// Card decisions
function easyAiCard(): CardChoice
function normalAiCard(gameState: GameState): CardChoice
function hardAiCard(gameState: GameState, cardHistory: CardChoice[]): CardChoice

// Lineup decisions
function easyAiLineup(squad: Player[]): { outfield: string[], goalkeeper: string }
function normalAiLineup(squad: Player[], playerLineup: string[]): { outfield: string[], goalkeeper: string }
function hardAiLineup(squad: Player[], playerLineup: string[], playerTactic: Tactic): { outfield: string[], goalkeeper: string }

// Tactics decisions
function easyAiTactics(): Tactic
function normalAiTactics(gameState: GameState): Tactic
function hardAiTactics(gameState: GameState, playerTactic: Tactic): Tactic
```

#### UI changes needed
- Add difficulty selector to TitleScreen (or a new DifficultyScreen after title)
- Store selected difficulty in sessionStore
- DuelScreen reads difficulty from sessionStore, calls correct AI function for opponent's card
- LineupScreen: AI auto-selects its own lineup based on difficulty, not shown to player
- i18n keys to add: `difficulty_easy`, `difficulty_normal`, `difficulty_hard`, `difficulty_select` (EN + FI)

#### Tests required
- `/tests/unit/engine/ai.test.ts` — unit tests for all 9 functions:
  - Easy: always returns a valid card / lineup / tactic
  - Normal: possession state increases Shot weight, losing late increases Shot weight
  - Hard: counters player's most frequent recent card correctly
- `/tests/functional/ai_match.test.ts` — full match simulation at all 3 difficulties completes without errors

---

### ⏳ Phase 2 — Derby Night Local (NOT STARTED)
**Depends on:** Phase 1.5 complete and playtested

#### What Phase 2 adds
- 2–6 managers taking turns on one device (pass-and-play)
- Manager avatar selection — each player picks a real club member as their avatar
- Secret submission screen — content hidden until player confirms
- Simultaneous dirty move reveal — all submitted → all revealed at once
- Trivia shown before each match
- Bet Slip settlement at full time
- Derby Night lobby screen — room setup, manager avatars
- Derby Night result screen — leaderboard across all managers

### ⏳ Phase 3 — Live Multiplayer + Sattuma (NOT STARTED)
### ⏳ Phase 4 — Season Mode + Polish (NOT STARTED)

---

## 🎨 Design & Branding
- **Primary background:** Deep charcoal `#1A1A1A`
- **Accent:** Club yellow `#FFE600`
- **Text:** Off-white `#F5F0E8`
- **Logo:** Black running figure on yellow background (OT letterform)
- **Feel:** Dark stadium at night, floodlights, yellow kit flashing

---

## ❓ Open Questions (decide before building)
1. How many duels per half? → Suggested: 5 (needs playtesting)
2. Duel tie resolution: re-duel or specific rule?
3. Houkuttelu success rate: always or stat-based?
4. Season length: how many matches?
5. Dirty move counter mechanics (Phase 3)

---

## 📋 Standing Rules for Claude Code
*(Also in CLAUDE.md — enforced every session)*

- Every function needs JSDoc comments
- Every feature needs unit + functional + integration tests
- Tests written alongside code, never after
- No hardcoded strings — always use i18n (en.json + fi.json)
- No hardcoded player data — always read from players.json
- Game engine must be pure functions, decoupled from React
- Update CHANGELOG.md with every commit
- Update CONTEXT.md when a phase completes
- Never push to main without passing full test suite
- Finnish is the default language


---

## ⚽ Opponent Teams Database

### Source
Derived from 5 seasons of real league data (2021–2025). Strength score calculated from win rate (40%), points per game (30%), goal difference per game (20%), and average normalised league position (10%). Score range: 0–100.

### File: `/src/data/opponents.json`
24 real teams from the league. Olvastin Tana is the home team and does NOT appear in this file.

### Tiers
| Tier | Score range | AI difficulty | Teams |
|------|-------------|---------------|-------|
| 🔴 Hard | 60–100 | Hard AI | FC Kylmärinki (84), MIAU-MIEHET (74.8), Susiraja FC (67.8) |
| 🟡 Normal | 35–59 | Normal AI | Idän Raivo, Olympiakos Tampere, FC Adonis, FC Oluthuone, Real Soar |
| 🟢 Easy | 0–34 | Easy AI | AC Darra Punapaidat, NiPa, FC Gullit, AC Lokomo, Jalkapallojoukkue JPJ, FC Ohiveto, AC Tenator, TaHU, Vastapuoli, FC Aamukanuuna, HT-Påsse, Big Balls |

---

## 🗓️ Solo Mode — Season Structure

### Format
- **7 matches per season** — one home match against each of 7 opponents
- No away matches, no promotion or relegation (planned for Phase 4)
- Season fixture list is generated at season start and fixed for that season

### Fixture generation
Pick 7 opponents from `opponents.json` to form the season schedule:
- 1 Hard team
- 3 Normal teams
- 3 Easy teams

Order them by strength score ascending — you face easier opponents first, hardest last. This gives the season a natural difficulty curve.

### Season points
- Win = 3 pts | Draw = 1 pt | Loss = 0 pts
- Final standing shown on season result screen after all 7 matches

### AI difficulty
Tier maps directly to AI difficulty — no manual difficulty picker needed anymore:
- Hard team → Hard AI
- Normal team → Normal AI
- Easy team → Easy AI

**Remove the difficulty selector from TitleScreen** — it is replaced by the season/opponent system.

---

## 📺 New Screens Required

### SeasonScreen (season hub)
Shown between matches. Displays:
- Current season fixture list (7 matches)
- Each fixture: opponent name, tier badge, result (if played) or "upcoming"
- Season points tally so far
- "Play next match" button → navigates to PreMatchScreen
- i18n keys: `season_title`, `season_fixtures`, `season_points`, `season_play_next`, `season_complete`

### PreMatchScreen (pre-match)
Shown before each match kicks off. Displays:
- Home team (Olvastin Tana) vs Away team (opponent name)
- Opponent tier badge: 🔴 Kova / 🟡 Normaali / 🟢 Helppo
- Opponent historical record from opponents.json: seasons, titles, W/D/L, goals
- Flavour line based on tier:
  - Hard: "Varoitus: tämä joukkue on vaarallinen." / "Warning: this team means business."
  - Normal: "Tasainen ottelu odotettavissa." / "Expect a close match."
  - Easy: "Teidän pitäisi selvitä tästä." / "You should handle this one."
- "Aloita ottelu" / "Kick off" button → navigates to TriviaScreen
- i18n keys: `prematch_vs`, `prematch_tier_hard`, `prematch_tier_normal`, `prematch_tier_easy`, `prematch_warning_hard`, `prematch_warning_normal`, `prematch_warning_easy`, `prematch_kickoff`

### Updated App routing
```
TITLE → SEASON → PREMATCH → TRIVIA → LINEUP → FIRST_HALF → HALFTIME → SECOND_HALF → RESULT → SEASON (next match)
```
After ResultScreen, return to SeasonScreen. When all 7 matches played → SeasonCompleteScreen.

### SeasonCompleteScreen
- Final points tally
- W/D/L breakdown across all 7 matches
- "Uusi kausi" / "New season" button → generates a fresh fixture list and resets season state
- i18n keys: `season_complete_title`, `season_complete_points`, `season_complete_record`, `season_new`
