# FIREBASE.md — Multiplayer Setup

Firebase Realtime Database is used for Derby Night multiplayer (Phase 3).
Do not implement any Firebase features before Phase 2 (local Derby Night) is complete.

## Setup (Phase 3)
1. Create a Firebase project at https://console.firebase.google.com
2. Enable Realtime Database
3. Copy config values into `src/firebase/config.ts`
4. Set up security rules (players can only write to their own room)

## Room Structure (planned)
```
rooms/
  {roomId}/
    state/          — Shared match state
    home/           — Home manager's private selections
    away/           — Away manager's private selections
    chat/           — Optional real-time chat
```

## Current Status
Phase 3 — NOT STARTED. Config file is a placeholder stub.
