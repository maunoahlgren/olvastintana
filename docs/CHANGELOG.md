# CHANGELOG

All notable changes to this project are documented here.
Format: `## [version] — date` with Added / Changed / Fixed sections.

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
