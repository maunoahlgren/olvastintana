# ARCHITECTURE.md — Technical Architecture

## Core Principle
The game engine is completely decoupled from React. All game logic lives in `/src/engine/` as pure functions with no side effects. This makes logic testable without any UI.

## Folder Structure

```
/src
  /data           — Static JSON data (players, trivia, sattuma)
  /engine         — Pure game logic functions
  /store          — Zustand state (connects engine to UI)
  /components     — React UI (reads from store, calls engine)
  /i18n           — Translation files (fi.json is the source of truth)
  /firebase       — Firebase config + sync (Phase 3)
  /media          — Player photos, video clips
/tests
  /unit/engine    — Unit tests for every engine function
  /unit/store     — Unit tests for store logic
  /functional     — Full flow and ability interaction tests
  /integration    — React Testing Library UI flow tests
/docs             — This file and friends
```

## Engine Modules

| File | Responsibility |
|------|---------------|
| `duel.ts` | Card triangle resolution, stat tiebreak |
| `goalkeeper.ts` | Save attempt, Kivimuuri state |
| `possession.ts` | Possession transitions, coin flip, kickoff |
| `abilities.ts` | Player ability handlers (pure signal functions) |
| `sattuma.ts` | Weighted deck build, card draw |
| `match.ts` | Phase constants, match points, halftime options |

## State Shape (Zustand)

| Store | Contents |
|-------|----------|
| `matchStore` | Phase, half, duelIndex, score, possession, tactic, effects |
| `squadStore` | Lineups, stat modifiers, suspensions |
| `sessionStore` | Game mode, language, Firebase room (Phase 3) |
| `seasonStore` | Standings, points, wins/draws/losses |

## Ability Resolution Priority
When multiple abilities trigger in the same duel:
1. 🔒 Restriction (Jyrki's 44 minuutin paine)
2. ⚡ Reactive (Estola's Estis)
3. 🏆 Dominant (future players)
4. 💥 Boost / 🎲 Chaos (Alanen's Hot Streak, Mauno's Try-Hard)

## Match Phase State Machine
```
TRIVIA → LINEUP → FIRST_HALF → HALFTIME → SECOND_HALF → RESULT
```
