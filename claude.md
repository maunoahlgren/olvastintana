# CLAUDE.md — Standing Instructions for Claude Code
# Olvastin Tana FC Game
# This file is read automatically by Claude Code at the start of every session.
# These rules are non-negotiable and apply to every coding session.

---

## 🏟️ Project Summary
Olvastin Tana FC: The Game is a bilingual (FI/EN) web-based football card game built for the club's 20th anniversary. Read CONTEXT.md for full game design, player data, and current build status.

---

## 🚨 Non-Negotiable Rules

### Every feature must have:
1. Working code
2. Unit tests
3. Functional tests (where applicable)
4. Integration tests (for UI flows)
5. JSDoc comments on all functions
6. Updated documentation

**A feature is NOT done until all five are complete.**

---

## 🧪 Test Requirements

### Unit Tests (Vitest) — /tests/unit/
Every game engine function tested in isolation:
- Duel resolution (all three matchups + draw)
- Every player ability individually
- Every Sattuma card effect
- Possession state transitions
- Stamina penalty logic
- Goalkeeper save attempt
- Dirty move application
- Trivia boost apply and expiry
- Halftime reset logic

### Functional Tests (Vitest) — /tests/functional/
Complete flows and ability interactions:
- Full match simulation from kickoff to final whistle
- All known ability interaction edge cases:
  - Estola's Estis + Jyrki's paine in the same duel
  - Sattuma Punainen kortti on a player already targeted by Sabotointi
  - Kivimuuri used in first half, verified reset at halftime
  - Mauno Sattuma draw triggering another ability
  - Tuplat Sattuma card + goalkeeper save — what takes priority?
- Dirty move full lifecycle: submit → reveal → apply → next match effect
- Trivia boost active in first duel, gone in second
- Bet Slip settlement at full time
- Season points accumulation across multiple matches

### Integration Tests (React Testing Library) — /tests/integration/
UI flows end to end:
- Complete solo match from trivia screen to result screen
- Language toggle switches all visible text EN ↔ FI
- Halftime: swap allowed, second swap blocked
- Derby Night: secret submission screen hides content until confirmed
- Derby Night: all dirty moves revealed simultaneously
- Firebase: room created, second player joins with code
- Firebase: game state syncs across two clients

### Rules
- Run the full test suite before every push to main
- No feature merged without passing tests at all levels
- Edge case interactions between abilities must each have a dedicated test
- Tests must be written alongside the code, not after
- Test names must be descriptive enough to serve as documentation

---

## 📝 Documentation Requirements

### Code Documentation
- Every function has a JSDoc comment: description, @param, @returns, @example
- Every player ability has an inline comment referencing its rulebook requirement ID (e.g. // SQ-06)
- Complex state transitions have a block comment explaining the flow
- Firebase listeners documented with connection lifecycle notes
- All i18n keys have context comments so translators understand usage

### File Documentation — update these when relevant:
| File | Update when |
|------|-------------|
| CONTEXT.md | Phase completed, major decision made |
| CHANGELOG.md | Every commit to main |
| PLAYERS.md | New player added or ability changed |
| TRIVIA.md | New trivia questions added |
| ARCHITECTURE.md | Folder structure or state shape changes |
| FIREBASE.md | Multiplayer config changes |
| README.md | Setup steps change |

### Documentation Standards
- CHANGELOG.md uses format: `## [version] - date` with Added / Changed / Fixed sections
- All docs written in English, Finnish translations noted where relevant
- Never leave a TODO comment without a GitHub issue number

---

## 🏗️ Code Standards

### General
- TypeScript strict mode — no `any` types
- Functional components only — no class components
- Pure functions for all game engine logic (no side effects)
- Game engine is completely decoupled from React — testable without UI

### File Structure
- Game logic lives in /src/engine/ — pure functions only
- State lives in /src/store/ — Zustand
- UI lives in /src/components/
- Data lives in /src/data/ (players.json, trivia.json, sattuma.json)
- Tests mirror source structure: /tests/unit/engine/, /tests/unit/store/ etc.

### Naming Conventions
- Components: PascalCase (MatchBoard.tsx)
- Functions: camelCase (resolveDuel)
- Constants: UPPER_SNAKE (MAX_DUELS_PER_HALF)
- Test files: [name].test.ts
- i18n keys: snake_case (trivia_correct_boost)

### Commit Convention
- feat: new feature
- fix: bug fix
- content: player data, trivia, translations
- docs: documentation only
- test: test additions or changes
- style: visual/UI changes only
- refactor: code restructure, no behaviour change

---

## 🌍 Internationalisation Rules
- Every string visible to the user must use i18next — no hardcoded strings in components
- Finnish is the default language
- All new i18n keys added to both en.json and fi.json at the same time
- Never ship a feature with missing translations in either language

---

## 🚀 Phase Awareness
Always check CONTEXT.md for the current phase before starting work.
Do not build Phase 2 features while Phase 1 is incomplete.
When a phase is completed:
1. Update CONTEXT.md — mark phase done, set next phase as current
2. Update CHANGELOG.md
3. Create a GitHub release tag (v0.1.0, v0.2.0 etc.)
4. Confirm all tests pass before tagging

---

## ⚠️ Things to Never Do
- Never hardcode player names or stats — always read from players.json
- Never hardcode strings — always use i18n
- Never push to main without passing tests
- Never consider a feature done without documentation
- Never add localStorage or sessionStorage (not supported in the artifact environment)
- Never build multiplayer features before solo mode is complete and tested
