# Olvastin Tana FC — Claude Code Context

> This file is the single source of truth for Claude Code sessions.
> Read this at the start of every session before writing any code.
> It is maintained in the brainstorm chat and updated before each coding session.

---

## What This Project Is

A web-based football card game built for Olvastin Tana FC's 20th anniversary (2005–2025).
Real players, real history, real inside jokes. Playable solo or as a party game at Derby Night.

**Repo:** https://github.com/maunoahlgren/Olvastintana
**Hosting:** Vercel (to be set up)
**Design docs:** /docs/ folder in this repo

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Multiplayer | Firebase Realtime Database |
| Hosting | Vercel |
| Testing | Vitest + React Testing Library |
| i18n | i18next |

---

## Current Status

**Phase:** 0 — Project scaffold (nothing built yet)
**Last session:** N/A — first session
**Next task:** Build the Phase 1 scaffold (see below)

---

## What To Build This Session (Phase 1 Scaffold)

Set up the full project structure so we can start building game logic immediately.

### Steps

1. `npm create vite@latest . -- --template react` (in repo root)
2. Install dependencies:
   - `npm install tailwindcss @tailwindcss/vite`
   - `npm install zustand`
   - `npm install i18next react-i18next`
   - `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`
3. Create the folder structure (see below)
4. Create all placeholder data files (players.json, trivia.json, sattuma.json)
5. Set up i18n with EN and FI language files
6. Create a basic App.jsx that shows the club name and language toggle
7. Write the first unit tests for duel resolution logic
8. Push everything to main

### Folder Structure To Create

```
/src
  /data
    players.json         ← squad data
    trivia.json          ← club history questions
    sattuma.json         ← fortune deck
  /engine
    duel.js              ← duel resolution logic
    abilities.js         ← character ability handlers
    match.js             ← match flow orchestration
    sattuma.js           ← fortune deck logic
  /store
    matchStore.js        ← Zustand match state
    sessionStore.js      ← Zustand session/multiplayer state
    seasonStore.js       ← Zustand season tracking
  /components
    /screens
      TitleScreen.jsx
      LineupScreen.jsx
      TriviaScreen.jsx
      DuelScreen.jsx
      HalftimeScreen.jsx
      ResultScreen.jsx
    /ui
      PlayerCard.jsx
      CardButton.jsx
      LanguageToggle.jsx
      ScoreBoard.jsx
  /i18n
    en.json
    fi.json
    index.js
  /firebase
    config.js            ← placeholder, filled in Phase 3
  /media
    .gitkeep             ← placeholder for club photos/clips
/tests
  /engine
    duel.test.js
    abilities.test.js
    sattuma.test.js
  /integration
    match.test.jsx
/docs
  CONTEXT.md             ← this file
  PLAYERS.md
  TRIVIA.md
  ARCHITECTURE.md
```

---

## Game Rules Summary (for implementing logic)

### Core Duel Triangle
- Riisto (Press) beats Harhautus (Feint)
- Harhautus (Feint) beats Laukaus (Shot)
- Laukaus (Shot) beats Riisto (Press)

### Match Structure
- 5 outfield players + 1 goalkeeper per side
- 44 minutes = two halves of 22 minutes each
- Each half = series of card duels
- At halftime: swap one player OR change tactics (not both)
- Low stamina players get -1 all stats in second half

### Possession
- Only possessing player can play Laukaus to score
- Win duel without ball = gain possession
- Win duel with ball + Laukaus = trigger goalkeeper save attempt

### Goalkeeper
- Does not participate in duels
- Gets one save attempt when Shot wins a duel
- Tommi's Kivimuuri: once per half, save auto-succeeds. Resets at halftime.

### Trivia (before match)
- Correct answer: first card wins automatically
- Wrong answer: opponent picks one player to get -1 all stats

### Sattuma Deck
- Drawn when a "Nosta Sattuma" ability triggers
- Weighted: 40% Hyvä (good), 35% Paha (bad), 25% Hyvin Paha (very bad)
- Reshuffled after each match

---

## Known Players (data for players.json)

```json
[
  {
    "id": "alanen",
    "name": "Alanen",
    "positions": ["MF", "FW"],
    "stats": { "pace": 3, "technique": 4, "power": 3, "iq": 5, "stamina": 3, "chaos": 4 },
    "ability": {
      "id": "hot_streak",
      "type": "boost",
      "nameEN": "Hot Streak",
      "nameFI": "Tulisarja",
      "descEN": "Can randomly explode for 6 points. On a roll, he cannot be stopped.",
      "descFI": "Voi räjähtää satunnaisesti 6 pisteeseen. Vauhdissa häntä ei voi pysäyttää."
    }
  },
  {
    "id": "mehtonen",
    "name": "Mehtonen",
    "positions": ["MF", "FW"],
    "stats": { "pace": 3, "technique": 3, "power": 3, "iq": 3, "stamina": 4, "chaos": 2 },
    "ability": {
      "id": "box_to_box",
      "type": "boost",
      "nameEN": "Box to Box",
      "nameFI": "Edestakaisin",
      "descEN": "Counts as both a midfielder and forward in the same duel.",
      "descFI": "Lasketaan sekä keskikenttäpelaajana että hyökkääjänä samassa duelissa."
    }
  },
  {
    "id": "mattila",
    "name": "Mattila",
    "positions": ["MF", "FW"],
    "stats": { "pace": 3, "technique": 2, "power": 5, "iq": 2, "stamina": 4, "chaos": 5 },
    "ability": {
      "id": "any_body_part",
      "type": "boost",
      "nameEN": "Any Body Part",
      "nameFI": "Mikä tahansa ruumiinosa",
      "descEN": "Goals count regardless of how ugly. Ear, ass, belly — it all counts.",
      "descFI": "Maalit lasketaan riippumatta siitä miten ruma se on. Korva, peppu, vatsa — kaikki käy."
    }
  },
  {
    "id": "mauno",
    "name": "Mauno",
    "positions": ["FW", "MF"],
    "stats": { "pace": 5, "technique": 3, "power": 3, "iq": 3, "stamina": 5, "chaos": 5 },
    "ability": {
      "id": "try_hard_mode",
      "type": "chaos",
      "nameEN": "Try-Hard Mode",
      "nameFI": "Yrittäjä-moodi",
      "descEN": "When Mauno wins a duel, draw a Sattuma card. Could be glorious. Could be a disaster.",
      "descFI": "Kun Mauno voittaa duelin, nosta Sattuma-kortti. Voi olla loistava tai katastrofaalinen."
    }
  },
  {
    "id": "iiro",
    "name": "Iiro",
    "positions": ["MF", "FW"],
    "stats": { "pace": 4, "technique": 4, "power": 3, "iq": 3, "stamina": 4, "chaos": 3 },
    "ability": {
      "id": "ninja",
      "type": "chaos",
      "nameEN": "Ninja",
      "nameFI": "Ninja",
      "descEN": "Unexpected moves, can launch the ball from anywhere. Martial arts background.",
      "descFI": "Odottamattomat siirrot, voi laukaista pallon mistä tahansa. Kamppailutausta."
    }
  },
  {
    "id": "estola",
    "name": "Estola",
    "positions": ["MF", "FW"],
    "stats": { "pace": 3, "technique": 4, "power": 3, "iq": 5, "stamina": 3, "chaos": 2 },
    "ability": {
      "id": "estis",
      "type": "reactive",
      "nameEN": "Estis",
      "nameFI": "Estis",
      "descEN": "After seeing the opponent's card, choose to play either Press or Shot in response.",
      "descFI": "Nähtyään vastustajan kortin, valitsee pelaako Riistoa vai Laukausta vastaukseksi."
    }
  },
  {
    "id": "jyrki",
    "name": "Jyrki",
    "positions": ["MF"],
    "stats": { "pace": 3, "technique": 3, "power": 4, "iq": 3, "stamina": 5, "chaos": 2 },
    "ability": {
      "id": "pressure_44",
      "type": "restriction",
      "nameEN": "44 minuutin paine",
      "nameFI": "44 minuutin paine",
      "descEN": "After Jyrki wins a duel, the opponent cannot play a Feint card in the next duel.",
      "descFI": "Kun Jyrki voittaa duelin, vastustaja ei voi pelata Harhautus-korttia seuraavassa duelissa."
    }
  },
  {
    "id": "tommi",
    "name": "Tommi",
    "positions": ["GK"],
    "stats": { "pace": 2, "technique": 3, "power": 4, "iq": 4, "stamina": 4, "chaos": 1 },
    "ability": {
      "id": "brick_wall",
      "type": "boost",
      "nameEN": "Brick Wall",
      "nameFI": "Kivimuuri",
      "descEN": "Once per half, automatically blocks a shot. Resets at halftime.",
      "descFI": "Kerran per jakso torjuu automaattisesti laukauksen. Nollautuu puoliajalla."
    }
  }
]
```

*Remaining players to be added: Tero, Jari, Kurkela, Kukko, Nissinen, Saravo, Kari, Ari, Estola*

---

## Sattuma Cards (data for sattuma.json)

```json
[
  { "id": "tailwind", "tier": "hyva", "nameEN": "Tailwind", "nameFI": "Tuulee selkätuulta", "descEN": "Your next Shot card automatically wins.", "descFI": "Seuraava Laukaus-korttisi voittaa automaattisesti." },
  { "id": "ref_away", "tier": "hyva", "nameEN": "Ref Looked Away", "nameFI": "Ref katsoo muualle", "descEN": "Your dirty move this round cannot be blocked.", "descFI": "Likaista siirtoasi ei voi torjua tällä kierroksella." },
  { "id": "magic_pass", "tier": "hyva", "nameEN": "Magic Pass", "nameFI": "Maaginen syöttö", "descEN": "You gain possession regardless of the duel result.", "descFI": "Saat pallonhallinnan riippumatta duelin tuloksesta." },
  { "id": "doubles", "tier": "hyva", "nameEN": "Doubles", "nameFI": "Tuplat", "descEN": "Your next goal counts as two.", "descFI": "Seuraava maalisi lasketaan kahtena." },
  { "id": "slippery", "tier": "paha", "nameEN": "Slippery Pitch", "nameFI": "Liukas kenttä", "descEN": "Your Feint cards don't work for the rest of this half.", "descFI": "Harhautus-korttisi eivät toimi loppujakson ajan." },
  { "id": "ref_saw", "tier": "paha", "nameEN": "Ref Saw Everything", "nameFI": "Ref näki kaiken", "descEN": "Your dirty move this round is cancelled and revealed.", "descFI": "Likainen siirtosi peruuntuu ja paljastetaan kaikille." },
  { "id": "cramp", "tier": "paha", "nameEN": "Cramp", "nameFI": "Krampit", "descEN": "Your lowest Stamina player sits out the next duel.", "descFI": "Matalin Kestävyys -pelaajasi jää sivuun seuraavasta duelista." },
  { "id": "late_again", "tier": "paha", "nameEN": "Late Again", "nameFI": "Myöhässä taas", "descEN": "You automatically lose the first duel of the next half.", "descFI": "Häviät automaattisesti seuraavan jakson ensimmäisen duelin." },
  { "id": "red_card", "tier": "hyvin_paha", "nameEN": "Red Card", "nameFI": "Punainen kortti", "descEN": "Your best player is suspended for the rest of the half.", "descFI": "Paras pelaajasi on suspensoitu loppujakson ajan." },
  { "id": "keeper_injured", "tier": "hyvin_paha", "nameEN": "Keeper Injured", "nameFI": "Maalivahti loukkautui", "descEN": "Your goalkeeper's save ability is disabled for this match.", "descFI": "Maalivahdin torjuntakyky on poistettu käytöstä." },
  { "id": "they_saw", "tier": "hyvin_paha", "nameEN": "They Saw Your Hand", "nameFI": "Vastustaja näki korttisi", "descEN": "Your opponent sees your next three cards before choosing theirs.", "descFI": "Vastustajasi näkee seuraavat kolme korttiasi." },
  { "id": "own_goal", "tier": "hyvin_paha", "nameEN": "Own Goal", "nameFI": "Oma maali", "descEN": "Your opponent scores a free goal. No duel, no save attempt.", "descFI": "Vastustajasi saa ilmaismaalin. Ei dueliä, ei torjuntaa." }
]
```

---

## i18n Keys To Create (en.json / fi.json)

Key areas to translate from day one:
- App title, tagline
- Screen titles (Lineup, Trivia, Duel, Halftime, Result)
- Card types (Press/Riisto, Feint/Harhautus, Shot/Laukaus)
- Game modes (Solo, Derby Night)
- Action buttons (Confirm, Continue, Swap, Change Tactics)
- Stat names (Pace, Technique, Power, IQ, Stamina, Chaos)
- Result messages (Win, Loss, Draw, Halftime)

---

## Decisions Made In Brainstorm Chat

- **Duels per half:** TBD — needs playtesting, start with 5
- **Tie resolution:** Stat-based — tie goes to player with higher relevant stat (Riisto tie → Pace wins, Harhautus tie → Technique wins, Laukaus tie → Power wins). If stats also equal → pallo pysyy hallussa, nothing happens. Unless a card ability says otherwise.
- **Derby Night defaults to Finnish**
- **Sattuma deck reshuffled after every match**
- **Goalkeeper mechanic:** stat check (keeper stats vs shooter Power)
- **Halftime:** one player swap OR one card swap, not both
- **Season points:** Win=3, Draw=1, Loss=0
- **Ability types:** Reactive ⚡, Restriction 🔒, Boost 💥, Chaos 🎲, Dominant 🏆 (wins all ties regardless of stats)
- **Dominant ability example:** "Maaginen kosketus" — Lustila / Haritonov wins every tie.
- **Action Cards (revised concept):** Not played during duels. Instead they are a separate manager-layer resource played between matches during the manager phase. Each manager starts with 2. Effects target the next match — sabotage, self-boost, protection. Deliberately scarce — hard to get more is a feature. Can be earned via certain character abilities (e.g. Tero Backman "Fasilitaattori" — win a duel → draw a new Action Card) or possibly via Sattuma or season rewards.
- **Deck size:** 8 cards (down from 10). Manager picks 6 to bring into the match.
- **Deck composition:** 5 vakiokasvot (named legends) + 3 vahvistukset (wildcards/reinforcements).
- **Shared players:** Same player card can appear in multiple managers' decks. No need for 100+ unique cards.
- **Legend pool:** ~20–25 named players total. Each deck gets 5 of these as its core.
- **Reinforcements:** 3 random wildcard slots per deck. If events knock out too many players, the game generates a random vahvari replacement with appropriate stats.
- **Between-game events (Tapahtumat):** Random events fire before a match, potentially removing a player from a deck for that game. Max 3 events per match so no deck loses too many players. Flavour text in the voice of real club stories.
- **Kickoff rules:** First half — decided by coin flip or pre-agreed. Second half — opposite team always starts. Fair and simple.
- **Markkanen-kortti (Sattuma — Hyvin Paha 💀):** "Markkasen erikoinen" — the second half kickoff goes to the wrong team. Markkanen strikes again.

---

## Open Questions (decide before implementing relevant feature)

1. How many duels per half? (start with 5, adjust after playtest)
2. Dirty move counter mechanics — not yet designed
3. Houkuttelu success rate: always or stat-based?
4. Season length: how many matches?
5. Media gallery: file format and upload method?
6. **Card balance:** All players should bring enough value that no hand feels unwinnable. Design guideline: every player should have a clear situation where they're the right pick.
7. **Hot Streak / Kuuma pelaaja:** Earned by scoring in a match. Threshold TBD — one goal or two? Effect TBD — stat boost, extra card? Decide before Phase 4 season mode.
8. **Taktiikka-systeemi:** Was discussed (aggressive/defensive/creative) but quietly dropped. Decide: remove entirely, or keep as a simple 3-option modifier?
9. **Stamina 2 jakson valinta:** Must the manager declare which half a low-stamina player appears in during the manager phase, or can it be decided at halftime?
10. **Vahvistus selection:** Are the 3 reinforcement slots fully random, or can the manager choose within some constraints?
11. **Between-game event cap:** Max 3 events confirmed — but what is the minimum? Always at least 1, or can a match have 0 events?
12. **Action Cards vs Dirty Moves — same system or separate?** Both are played in the manager phase between matches and affect the next game. Options: (A) same system — Action Cards are rarer, more powerful Dirty Moves. (B) separate layers — Dirty Moves are always available chaos, Action Cards are scarce tactical resources. Decide before Phase 2.
13. **Ability resolution priority order:** When multiple abilities trigger simultaneously, what fires first? Suggested order: 🔒 Restriction → ⚡ Reactive → 🏆 Dominant → 💥 Boost / 🎲 Chaos. Lock this before the engine is built.

---

## Assets Required

### Graphic Style
Cartoon chibi caricature style — big head, expressive face, yellow/black football jersey, medal around neck, tactics clipboard. Three expressions per player: angry/intense (duel loss, bad Sattuma), happy/winner (duel win, goal, good Sattuma), nervous/sweating (critical moment, very bad Sattuma). Clean white outline, vibrant colors, blue sky football pitch background.

**Midjourney base prompt:**
> Cartoon chibi caricature of a Finnish football player, male, [DESCRIBE PLAYER], wearing yellow and black football jersey with a medal around their neck, holding a tactics clipboard, three-panel comic style showing three expressions: left panel angry/intense with lightning bolts, center panel happy winner with thumbs up, right panel nervous/sweating. Clean white outline, vibrant colors, comic book style, blue sky football pitch background. High quality digital illustration. --niji 6

### Graphics Needed

**Player cards (per player, ~20–25 total)**
- Cartoon portrait: 3 expressions (angry / happy / nervous)

**Duel cards**
- Riisto card illustration
- Harhautus card illustration
- Laukaus card illustration

**UI — match view**
- Pitch background (minimal, club colors)
- Possession indicator (ball moves side to side)
- Score / timer display
- Halftime banner

**Sattuma deck**
- Card back design
- Hyvä / Paha / Hyvin Paha category visual (color-coded)
- Markkasen erikoinen — own special visual

**UI — general**
- Club logo (already exists: black running figure on yellow)
- Dirty move icons: ⚔️ sabotointi, 💰 houkuttelu, 🎲 vedonlyönti
- Button bases, card browser, modal backgrounds
- Vahvari card (generic, used when player is missing)
- Kuuma pelaaja badge 🔥
- AI opponent avatar (3 difficulty levels — different expression?)

---

### Sounds Needed

**Duel events**
- Riisto success — tackle / collision sound
- Harhautus success — movement whoosh
- Laukaus — kick / shot sound
- Goal — celebration, goal horn
- Save success (Kivimuuri) — impact, crowd "ohh"
- Save fail (goal through) — net rustle

**Cards**
- Card drawn from hand — paper/cardboard whoosh
- Cards revealed simultaneously — flip sound
- Card consumed (spent) — soft click or fade-out sound

**Sattuma deck**
- Deck draw — tension build-up
- Hyvä Sattuma — positive fanfare
- Paha Sattuma — unfortunate sound
- Hyvin Paha Sattuma — dramatic sting
- Markkasen erikoinen — its own signature sound

**Match flow**
- Kickoff — referee whistle
- Halftime — longer whistle
- Full time win — celebration
- Full time loss — sad tone
- Possession change — subtle swoosh

**Derby Night**
- Dirty move reveal — secretive, tense
- Vedonlyönti won — cash register
- Trivia correct — positive ping
- Trivia wrong — fail sound

**UI**
- Button press — neutral click
- Menu navigation
- Error / invalid action

---

## How To Use This File

**At the start of every Claude Code session:**
> "Read CONTEXT.md and let's continue building the Olvastin Tana game"

**After a brainstorm chat session:**
> Update the "Current Status" and "What To Build This Session" sections before switching to Claude Code

**When a decision is made:**
> Add it to "Decisions Made" so it's never re-debated
