# FIREBASE.md — Multiplayer Setup

Firebase Realtime Database is used for Derby Night multiplayer.

## Current Status
**v0.8.0 — Derby Night Session 1 — Room lobby implemented.**
`src/firebase/config.ts` initialises Firebase from env vars.
`src/firebase/room.ts` provides room CRUD + live listener.
Match state sync (card play, duel results) is deferred to Derby Night Session 2.

---

## Environment Variables

Add these to `.env.local` (never commit to git):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

If `VITE_FIREBASE_DATABASE_URL` is absent, the app runs in offline mode:
- `db` is exported as `null`
- Room functions throw/warn gracefully
- `DerbyLobbyScreen` shows "Firebase not configured — contact the host"

Add the same variables to the Vercel project's Environment Variables dashboard for production.

---

## Firebase Console Setup

1. Create a project at https://console.firebase.google.com
2. Enable **Realtime Database** (not Firestore)
3. Choose a region near your users (e.g. `europe-west1`)
4. Copy the config object from Project Settings → Your apps → Firebase SDK snippet
5. Paste values into `.env.local`

---

## Security Rules

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": true,
        ".write": true,
        "players": {
          "$managerId": {
            ".write": "auth == null || $managerId == auth.uid"
          }
        }
      }
    }
  }
}
```

> Note: Authentication is not yet implemented (Phase 3). Rules allow unauthenticated writes
> for the lobby prototype. Tighten before production multiplayer launch.

---

## Room Structure

```
rooms/
  {code}/                     ← 4-char safe alphanumeric code (e.g. G7KP)
    state                     ← 'lobby' | 'playing' | 'finished'
    host                      ← managerId of the room creator
    created_at                ← Unix ms timestamp
    players/
      {managerId}/
        display_name          ← e.g. "OlliM"
        joined_at             ← Unix ms timestamp
        is_host               ← boolean
    match/                    ← Reserved for Derby Night Session 2 (live match state)
```

---

## Room Code Generation

Characters: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (32 chars, excludes `0/O/1/I`)
Length: 4 characters → 32^4 = 1 048 576 combinations

---

## Functions (src/firebase/room.ts)

| Function | Description |
|----------|-------------|
| `generateRoomCode()` | Pure — returns a 4-char code from the safe charset |
| `createRoom(code, managerId, displayName)` | Writes full room doc, marks caller as host |
| `joinRoom(code, managerId, displayName)` | Checks room exists, adds player entry; returns false if not found |
| `listenToRoom(code, onUpdate)` | Subscribes to live updates; returns unsubscribe fn |
| `leaveRoom(code, managerId, isHost)` | Host leave → removes entire room; player leave → removes player entry |
