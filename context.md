# CONTEXT.md — Olvastin Tana FC: The Game
# Full project context for Claude Code.
# Updated after every significant decision or completed phase.
# Last updated: 2026-03-10 — rebuilt from CHANGELOG + git history after accidental deletion

---

## 🏟️ What This Is
A bilingual (Finnish/English) web-based football card game built for Olvastin Tana FC's 20th anniversary (2006–2026). The club is a tight group of childhood friends who play park football. The game is built around their real players, history, and inside jokes.

Two modes:
- **Solo mode** — play a 7-match season against real league opponents
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
| Version Control | GitHub — github.com/maunoahlgren/olvastintana |
| Testing | Vitest + React Testing Library |
| i18n | i18next (Finnish default, English toggle) |
| Language | TypeScript strict mode |

---

## 📁 Project Structure
```
/src
  /data
    players.json        ← 8 real players with abilities
    trivia.json         ← Club history questions (PLACEHOLDER — real questions not written yet)
    sattuma.json        ← 12 fortune deck card definitions
    opponents.json      ← 24 real league teams with strength scores and tiers
  /engine
    duel.ts             ← Card triangle (Press/Feint/Shot) + stat tiebreaks
    abilities.ts        ← Hot Streak, Try-Hard Mode, 44 minuutin paine, Estis, stamina penalty
    possession.ts       ← Possession transitions, coin flip, kickoff
    goalkeeper.ts       ← Save attempt logic + Brick Wall (once-per-half)
    sattuma.ts          ← Weighted deck builder (40/35/25%) + draw
    match.ts            ← Phase constants, match points (W=3/D=1/L=0), halftime options
    ai.ts               ← Computer opponent (Easy/Normal/Hard) — 9 pure functions
  /store
    matchStore.ts       ← Zustand match state + playerCardHistory
    squadStore.ts       ← Zustand squad state
    sessionStore.ts     ← Zustand session state (aiDifficulty etc.)
    seasonStore.ts      ← Zustand season state (fixtures, results, points)
  /components
    /match              ← DuelScreen, HalftimeScreen, ResultScreen, ScoreBoard, CardButton
    /squad              ← PlayerCard, LineupScreen
    /trivia             ← TriviaScreen
    /season             ← SeasonScreen, PreMatchScreen, SeasonCompleteScreen
    /shared             ← TitleScreen, shared UI
  /i18n
    en.json             ← English translations
    fi.json             ← Finnish translations
  /firebase
    config.ts
    room.ts
    sync.ts
  /media
    /players            ← Player photos (not yet added)
    /clips              ← Club video clips (not yet added)
/tests
  /unit/engine          ← Engine unit tests
  /functional           ← Full flow and ability interaction tests
  /integration          ← React Testing Library screen tests
/docs
  PLAYERS.md
  TRIVIA.md
  ARCHITECTURE.md
  FIREBASE.md
  CHANGELOG.md
```

---

## 🎮 Game Rules

### Format
- Park football: 6 outfield players + 1 goalkeeper per side (7 total)
- 44 minutes: two halves of 22 minutes each
- Card duels simulate key match moments

### The Three Cards
| Card | Finnish | Beats | Loses to |
|------|---------|-------|----------|
| ⚔️ Press | Riisto | Feint | Shot |
| 💨 Feint | Harhautus | Shot | Press |
| 🎯 Shot | Laukaus | Press | Feint |

### Duel Flow
1. Both players secretly pick a card
2. Reveal simultaneously
3. Reactive abilities trigger
4. Winner determined by triangle
5. Post-resolution abilities trigger
6. Sattuma drawn if ability requires it
7. Possession / goal resolved

### Possession
- Only the player with possession can attempt a goal
- Win duel without ball → gain possession (no goal)
- Win duel with ball + Shot card → goal attempt → keeper save check
- Win duel with ball + Press or Feint → keep possession (no shot)

### Goalkeeper
- Does not participate in duels
- Gets one save attempt when Shot wins a duel
- Save = stat check (keeper stats vs shooter Power)

### Match Structure
1. Trivia question → correct = first card auto-wins; wrong = opponent picks a player to get -1 all stats
2. Manager picks: 6 outfield + GK, tactics
3. First half duels
4. Halftime: swap one player OR change tactics (not both)
5. Second half duels (low Stamina = -1 all stats)
6. Full time → result → return to SeasonScreen

### Tactics
- Aggressive → boosts Shot
- Defensive → boosts Press
- Creative → boosts Feint

---

## 👥 Squad (8 players)

```json
[
  { "id": "alanen", "name": "Alanen", "position": ["MF","FW"],
    "stats": {"pace":4,"technique":5,"power":4,"iq":6,"stamina":4,"chaos":3},
    "ability": {"type":"boost","id":"hot_streak","name_en":"Hot Streak","name_fi":"Tulisarja",
      "description_en":"Can randomly explode for 6 points.",
      "description_fi":"Voi räjähtää satunnaisesti 6 pisteeseen."} },

  { "id": "mehtonen", "name": "Mehtonen", "position": ["MF","FW"],
    "stats": {"pace":4,"technique":4,"power":4,"iq":4,"stamina":5,"chaos":2},
    "ability": {"type":"boost","id":"box_to_box","name_en":"Box to Box","name_fi":"Edestakaisin",
      "description_en":"Counts as both MF and FW in the same duel.",
      "description_fi":"Lasketaan sekä MF että FW samassa duelissa."} },

  { "id": "mattila", "name": "Mattila", "position": ["MF","FW"],
    "stats": {"pace":3,"technique":3,"power":6,"iq":3,"stamina":4,"chaos":5},
    "ability": {"type":"boost","id":"any_body_part","name_en":"Any Body Part","name_fi":"Mikä tahansa ruumiinosa",
      "description_en":"Goals count regardless of how ugly.",
      "description_fi":"Maalit lasketaan riippumatta miten rumia."} },

  { "id": "mauno", "name": "Mauno", "position": ["FW","MF"],
    "stats": {"pace":6,"technique":3,"power":3,"iq":3,"stamina":5,"chaos":6},
    "ability": {"type":"chaos","id":"try_hard_mode","name_en":"Try-Hard Mode","name_fi":"Yrittäjä-moodi",
      "trigger":"on_duel_win","effect":"draw_sattuma",
      "description_en":"Win a duel → draw a Sattuma card. Glorious or disastrous.",
      "description_fi":"Voita dueli → nosta Sattuma. Loistava tai katastrofaalinen."} },

  { "id": "iiro", "name": "Iiro", "position": ["MF","FW"],
    "stats": {"pace":5,"technique":5,"power":4,"iq":4,"stamina":5,"chaos":4},
    "ability": {"type":"chaos","id":"ninja","name_en":"Ninja","name_fi":"Ninja",
      "description_en":"Unexpected moves, can launch from anywhere.",
      "description_fi":"Odottamattomat siirrot, laukaisu mistä tahansa."} },

  { "id": "estola", "name": "Estola", "position": ["MF","FW"],
    "stats": {"pace":3,"technique":5,"power":4,"iq":6,"stamina":3,"chaos":2},
    "ability": {"type":"reactive","id":"estis","name_en":"Estis","name_fi":"Estis",
      "trigger":"after_opponent_reveal","effect":"choose_press_or_shot",
      "description_en":"After seeing opponent's card, choose Press or Shot.",
      "description_fi":"Nähtyään vastustajan kortin, valitse Riisto tai Laukaus."} },

  { "id": "jyrki", "name": "Jyrki", "position": ["MF"],
    "stats": {"pace":3,"technique":3,"power":4,"iq":4,"stamina":6,"chaos":2},
    "ability": {"type":"restriction","id":"44_minuutin_paine","name_en":"44 Minutes of Pressure","name_fi":"44 minuutin paine",
      "trigger":"on_duel_win","effect":"block_feint_next_duel","duration":1,
      "description_en":"Win a duel → opponent can't play Feint next duel.",
      "description_fi":"Voita dueli → vastustaja ei voi pelata Harhautusta seuraavassa."} },

  { "id": "tommi", "name": "Tommi", "position": ["GK"],
    "stats": {"pace":3,"technique":3,"power":4,"iq":4,"stamina":4,"chaos":1},
    "ability": {"type":"boost","id":"brick_wall","name_en":"Brick Wall","name_fi":"Kivimuuri",
      "trigger":"on_shot_attempt","effect":"auto_save","uses_per_half":1,"resets_at_halftime":true,
      "description_en":"Once per half, auto-blocks a shot. Resets at halftime.",
      "description_fi":"Kerran per jakso torjuu automaattisesti. Palautuu puoliajalla."} }
]
```

### Players still needed
Tero, Jari, Kurkela, Kukko, Nissinen, Saravo, Kari, Ari — descriptions coming from the crew later.

---

## 🃏 Sattuma Deck

Distribution: 40% Hyvä (Good) / 35% Paha (Bad) / 25% Hyvin Paha (Very Bad)

| ID | Tier | Finnish | English | Effect |
|----|------|---------|---------|--------|
| selkatuulta | hyva | Tuulee selkätuulta | Tailwind | next_shot_auto_wins |
| ref_muualle | hyva | Ref katsoo muualle | Ref Looked Away | dirty_move_unblockable |
| maaginen_syotto | hyva | Maaginen syöttö | Magic Pass | gain_possession_regardless |
| tuplat | hyva | Tuplat | Doubles | next_goal_counts_double |
| liukas_kentta | paha | Liukas kenttä | Slippery Pitch | feint_disabled_this_half |
| ref_naki | paha | Ref näki kaiken | Ref Saw Everything | dirty_move_cancelled_revealed |
| krampit | paha | Krampit | Cramp | lowest_stamina_sits_out_next_duel |
| myohassa | paha | Myöhässä taas | Late Again | auto_lose_first_duel_next_half |
| punainen_kortti | hyvin_paha | Punainen kortti | Red Card | best_player_suspended_rest_of_half |
| mv_loukkautui | hyvin_paha | Maalivahti loukkautui | Keeper Injured | goalkeeper_save_disabled_match |
| nakivat_kortit | hyvin_paha | Vastustaja näki korttisi | They Saw Your Hand | opponent_sees_next_3_cards |
| oma_maali | hyvin_paha | Oma maali | Own Goal | opponent_scores_free_goal |

---

## ⚽ Opponent Teams

### Source
5 seasons of real league data (2021–2025). Strength score = win rate (40%) + PPG (30%) + GD/game (20%) + avg normalised position (10%).

### Tiers → AI difficulty
| Tier | Score | AI |
|------|-------|----|
| 🔴 Hard | 60–100 | Hard AI |
| 🟡 Normal | 35–59 | Normal AI |
| 🟢 Easy | 0–34 | Easy AI |

### Teams
| Name | Score | Tier | Titles |
|------|-------|------|--------|
| FC Kylmärinki | 84.0 | hard | 3 |
| MIAU-MIEHET | 74.8 | hard | 1 |
| Susiraja FC | 67.8 | hard | 0 |
| Idän Raivo | 58.7 | normal | 0 |
| Olympiakos Tampere | 52.2 | normal | 0 |
| FC Adonis | 42.8 | normal | 1 |
| FC Oluthuone | 40.5 | normal | 0 |
| Real Soar | 37.0 | normal | 0 |
| AC Darra Punapaidat | 34.6 | easy | 0 |
| NiPa | 34.4 | easy | 0 |
| FC Gullit | 32.3 | easy | 0 |
| AC Lokomo | 31.9 | easy | 0 |
| Jalkapallojoukkue JPJ | 28.5 | easy | 0 |
| FC Ohiveto | 28.4 | easy | 0 |
| AC Tenator | 23.4 | easy | 0 |
| TaHU | 20.5 | easy | 0 |
| Vastapuoli | 18.6 | easy | 0 |
| FC Aamukanuuna | 12.8 | easy | 0 |
| HT-Påsse | 10.4 | easy | 0 |
| Big Balls | 3.5 | easy | 0 |

Full data in `/src/data/opponents.json`.

---

## 🗓️ Solo Mode — Season Structure

- **7 matches per season**: 1 Hard + 3 Normal + 3 Easy opponents
- Ordered by strength ascending — easiest first, hardest last
- No promotion/relegation (planned for Phase 4)
- Season points: W=3, D=1, L=0
- After all 7 matches → SeasonCompleteScreen → new season generates fresh fixtures

---

## 📺 Screen Flow

```
TITLE → SEASON → PREMATCH → TRIVIA → LINEUP → FIRST_HALF → HALFTIME → SECOND_HALF → RESULT → SEASON
```

After 7 matches: SEASON → SEASON_COMPLETE → SEASON (new season)

### Screens
| Screen | Status | Notes |
|--------|--------|-------|
| TitleScreen | ✅ | Language toggle |
| SeasonScreen | ✅ | Fixture list, points tally, play next |
| PreMatchScreen | ✅ | OT vs opponent, tier badge, record, flavour text |
| TriviaScreen | ✅ | Question, two answers, apply effect |
| LineupScreen | ✅ | Pick 6 outfield + GK |
| DuelScreen | ✅ | Card selection, AI resolves instantly |
| HalftimeScreen | ✅ | Swap player OR change tactics |
| ResultScreen | ✅ | Score, winner, points earned |
| SeasonCompleteScreen | ✅ | Final standings, new season |

---

## 🏆 Build Status

### ✅ v0.1 — Scaffold
Vite/React/TS/Tailwind/Zustand/Vitest, full engine in pure TypeScript, data files, i18n skeleton.

### ✅ v0.2 — Solo Match UI
All 7 match screens, full match flow end-to-end.

### ✅ v0.3 — AI Opponent
3 difficulty levels. Easy = random. Normal = weighted by game state. Hard = counters card history + IQ mistakes.

### ✅ v0.3.1 — Rule Fix
Lineup corrected to 6 outfield + 1 GK (7 total).

### ✅ v0.4 — Season Structure
7-fixture season, SeasonScreen, PreMatchScreen, SeasonCompleteScreen, tier-driven AI, full routing loop.

**317 tests passing across unit, functional, and integration.**

---

## ❌ Not Yet Built

| Area | Notes |
|------|-------|
| Sattuma in-game | `sattuma.ts` exists but cards not drawn/applied during matches |
| Ability UI | `estis`, `44_minuutin_paine`, `hot_streak`, `try_hard_mode` in engine but not wired to UI |
| Trivia content | `trivia.json` is placeholder — real club history questions not written |
| Derby Night | Firebase multiplayer, dirty moves, simultaneous reveal — Phase 2 |
| Bet Slip | Season betting mechanic — Phase 2 |
| Action Cards | Manager-phase resources between matches — Phase 3 |
| Promotion/relegation | Phase 4 |
| Player photos | `/media/players` empty |
| Animations | Phase 4 |

---

## ❓ Open Questions
1. How many duels per half? → Suggested 5, not yet decided
2. Duel tie resolution: re-duel or specific rule?
3. Houkuttelu success rate: always or stat-based?
4. Season length expansion: home + away (14 games) in Phase 4?

---

## 📋 Standing Rules for Claude Code
*(Also in CLAUDE.md)*

- Every function needs JSDoc comments
- Every feature needs unit + functional + integration tests
- Tests written alongside code, never after
- No hardcoded strings — always use i18n (en.json + fi.json)
- No hardcoded player data — always read from players.json
- No hardcoded opponent data — always read from opponents.json
- Game engine must be pure functions, decoupled from React
- Update CHANGELOG.md with every commit
- Update CONTEXT.md when a phase completes
- Never push to main without passing full test suite
- Finnish is the default language

---

## 🔄 BREAKING CHANGE — Player data updated (2026-03-10)

### New stat system
Olli designed the complete squad. Stats have changed from the old system to match the three cards directly:

| Stat | Finnish | Maps to |
|------|---------|---------|
| riisto | Riisto | Press card strength |
| laukaus | Laukaus | Shot card strength |
| harhautus | Harhautus | Feint card strength |
| torjunta | Torjunta | Save ability (GK + defenders) |
| stamina | Stamina | Endurance, second half penalty |

**Old stats (pace, technique, power, iq, chaos) are removed. Update all engine references.**

### Player tiers
| Tier | Finnish | Count | Notes |
|------|---------|-------|-------|
| regular | Vakiokasvo | 16 | Core squad, always available |
| legend | Legenda | 9 | Club legends, special cards |
| reinforcement | Vahvistus | 15 | Squad depth |

### Goalkeepers
Mikko Ruokoranta (#2), Tommi Helminen (#1, legend), Tony Reima (#98), Jaakko Rantanen (#30)

### Full roster — 40 players
All data now in `/src/data/players.json`. Do not hardcode player data anywhere.

Key players with abilities defined:
- Olli Mehtonen #20 — Kapteeni: win duel → +2 to next card stats
- Mauno Ahlgren #15 — Kaaoksen lähettiläs: win duel → draw Sattuma card
- Tero Backman #17 — Fasilitaattori: win duel → draw Action card
- Kimmo Mattila #14 — Matigol: win duel with possession → automatic goal (skip save check)
- Iiro Mäkelä #13 — Ninja: win duel → attempt goal even without possession
- Jukka Estola #88 — Estis: play Press → can switch to Shot after seeing opponent's card
- Petri Alanen #83 — play Shot → can switch to Feint after seeing opponent's card
- Olli Nissinen #61 — score a goal → draw Sattuma card
- Jyrki Orjasniemi #5 — 44 minuutin paine: win duel → opponent can't play Feint next duel
- Jari Savela #8 — Dominoiva: win duel → cancel opponent's next ability
- Aki Tuokko #50 — Yllätyksellinen: win duel → opponent's next card -2 stats
- Olli Kurkela #21 — Laitanousu: win duel → opponent can't play Press next duel
- Antti Haritonov #19 — play Feint → can switch to Press after seeing opponent's card
- Ossi Nieminen #60 — Tuplablokki: win duel → opponent can't play Shot next duel
- Kari Virtanen #10 — Kokenut: win possession with Press → draw Action card
- Mikko Ruokoranta #2 (GK) — save attempt → draw Sattuma card
- Kimmo Lustila #7 (legend) — Maaginen kosketus: win all tiebreaks
- Tommi Helminen #1 (legend, GK) — Muuri: auto-block all shots regardless of abilities
- Kukko #4 (legend) — after shot attempt → draw Sattuma card
- Juho Saravo #9 (legend) — miss a goal → next card +2 stats
- Tomi Poukka #6 (legend) — if played after Petri Alanen → +2 stats
- Ville Salonen #3 (reinforcement) — Pelinohjaaja: save → next card +2 stats
