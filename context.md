# CONTEXT.md — Olvastin Tana FC: The Game
# Full project context for Claude Code.
# Updated after every significant decision or completed phase.
# Last updated: 2026-03-09 — Phase 1 complete

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
Goals:
- ✅ Project scaffold (React + Vite + Tailwind + i18n)
- ✅ players.json loaded and displayed
- ✅ Basic duel resolution engine
- ✅ Complete match flow: trivia → lineup → duels → halftime → result
- ✅ Goalkeeper save mechanic
- ✅ Finnish/English toggle
- ✅ Unit + functional + integration tests for all of the above (148 tests passing)

### ⏳ Phase 2 — Derby Night Local (NOT STARTED)
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
