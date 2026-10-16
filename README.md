# Zoneberman — Bomberman-like Multiplayer Game

2–4 players, 3 lives each, last player standing wins. Built with a custom mini-framework (no canvas, no WebGL) and real-time multiplayer over WebSockets.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Server | Node.js (native `http` + `ws` WebSocket server), ES modules |
| Client | Vanilla JS, custom mini-framework (`client/framework/`), static assets served by the server |
| Shared | `shared/global.js` (constants, message types) + `shared/util.js` (grid math), imported by both sides |

## How to Run

```bash
cd Bomberman-Dom
npm install
npm start          # node server/server.js  -> http://localhost:3000
```

Open the URL in two or more browsers, enter a nickname, and join the lobby. The game auto-starts a countdown once 2+ players are present (or after the queue window). Three lives per player; last one alive wins.

> **Note for teammates:** git history was force-rewritten on `main` (authors normalized, `roadmap.md` purged). Please **re-clone** the repo rather than pulling on top of an old checkout.

## File Structure

```
Bomberman-Dom/
├── server/
│   ├── server.js        # HTTP + WS entry point; dispatches JSON messages
│   ├── static.js        # Static file server for client HTML/CSS/JS/assets
│   ├── lobby.js         # Player join/leave, roster broadcast
│   ├── rooms.js         # Room creation & matchmaking (one lobby+chat+game per room)
│   ├── chat.js          # Chat history + broadcast to room
│   └── game/
│       ├── game.js      # Game state machine: idle→queue→countdown→playing→over; 30Hz loop
│       ├── world.js     # Server simulation: movement, bombs, explosions, damage, powerups, win check
│       ├── Player.js    # Player movement, powerups, lives
│       ├── bomb.js      # Bomb fuse timer
│       └── map.js       # Fixed wall template + random destructible blocks
├── client/
│   ├── index.html       # Entry page
│   ├── app.js           # App root, routing guards (/ vs /game)
│   ├── pages/
│   │   ├── lobby.js     # Nickname form, player counter, chat
│   │   ├── game.js      # Game board, snapshot interpolation, input, HUD
│   │   └── notFound.js
│   ├── components/
│   │   ├── chat.js      # Chat UI
│   │   ├── playerStats.js
│   │   └── animatedImage.js
│   ├── global/
│   │   ├── webSocket.js # WS client with replay cache (lobby, chat_history, start)
│   │   └── sound.js
│   ├── assets/          # CSS, images, sounds
│   └── framework/       # Mini-framework: vdom, component, router, state, main
├── shared/
│   ├── global.js        # Constants (grid, timing, msg types) — shared client+server
│   └── util.js          # Grid index/col/row math, shuffle
└── package.json         # "start": "node server/server.js", dep: ws
```

## Project Structure — How Systems Interact

```
Client (browser)  <--WebSocket JSON-->  server/server.js
                                             |
                                ┌───────────┴───────────┐
                                ▼                       ▼
                           rooms.js                  static.js
                           (matchmaking)              (file serving)
                                |
                      ┌─────────┴─────────┐
                      ▼                   ▼
                   lobby.js             chat.js
                   (roster)              (chat history/broadcast)
                      |
                   game.js
                   (state machine: idle→queue→countdown→playing→over)
                      |
                   world.js
                   (30Hz simulation: movement, bombs, explosions, damage, powerups, win check)
```

### Room
One `Lobby` + one `Chat` + one `Game` per room. `findOrCreateRoom` puts new joiners into the first room still gathering players (`idle`, `queue`, or `countdown`); otherwise it creates a new room.

### Lobby
Validates nicknames (1–12 chars, unique, max 4 players). Tracks active players and broadcasts lobby state (player list, queue/countdown timers) to everyone in the room. Disconnected players are removed immediately.

### Chat
Every chat message is broadcast by the server to all players in the room. History (last 50 messages) is replayed to a player when they join.

### Game (state machine)
Server-authoritative. States:
- `idle` — waiting for players
- `queue` — 2+ players present, waiting for the queue window to close
- `countdown` — 10-second "get ready" before the match
- `playing` — match in progress; 30Hz simulation loop
- `over` — one player left; round-end timer then back to lobby

When `countdown` finishes, `beginGame()` spawns a `World` and sends the initial map + spawn positions to all clients.

### World (server simulation)
Owns players, bombs, explosions, blocks, and powerups. Each 30Hz tick:
1. Places requested bombs
2. Moves players from collected input movements
3. Ticks bomb fuses; explodes bombs (blast range 2, 4 directions; walls block, blocks break)
4. Decays explosions; handles powerup drops (30% chance on block destroy: bombs / flames / speed)
5. Applies powerups; deals damage to players in explosions (with i-frames)
6. Checks win condition (≤1 alive → `game_over`)

### Client
Connects via WebSocket, sends `input` (movement) and `bomb` requests. Receives state snapshots (~30Hz) and interpolates between buffered snapshots (`requestAnimationFrame` render loop) for smooth movement. Renders the fixed 15×13 map as DOM cells (no canvas). Chat and HUD update live from server messages.

## Game Mechanics

- **Players:** 2–4, starting in the 4 map corners with safe zones (no trap-on-spawn)
- **Lives:** 3 per player; hit by explosion = lose 1 life; 0 lives = out
- **Map:** Fixed indestructible walls + randomly placed destructible blocks (~50% density)
- **Bombs:** Blast range 2 tiles in 4 directions; fuse 2s; max bombs per player starts at 1
- **Powerups:** `bombs` (+1 max bomb), `flames` (+1 range), `speed` (+speed step); dropped when a block is destroyed
- **Win:** Last player alive wins the round; then returns to lobby for the next round

## WebSocket Message Types (`shared/global.js`)

| Type | Direction | Meaning |
|------|-----------|---------|
| `join` | client→server | Join with nickname |
| `chat` | client→server | Send a chat message |
| `input` | client→server | Movement `{x, y}` |
| `bomb` | client→server | Request to place a bomb |
| `joined` | server→client | Confirmed join, assigns `playerId` |
| `error` | server→client | Rejection reason |
| `lobby` | server→client | Roster + queue/countdown timers |
| `chat_history` | server→client | Recent chat messages on join |
| `chat` | server→client | New chat message broadcast |
| `start` | server→client | Match beginning: map + spawn positions |
| `state` | server→client | Simulation snapshot (~30Hz) |
| `game_over` | server→client | Winner declared |
| `round_end` | server→client | Round over, back to lobby |

## Performance

- `requestAnimationFrame` client render loop (60fps target)
- 30Hz fixed-tick server simulation (`tickMs`)
- Throttled DOM writes — `textContent` only changes when text actually changes
- Snapshot interpolation — client buffers server states and interpolates player positions between them
- No canvas / WebGL; DOM-based rendering keeps paint and layer count minimal

## Tests

```bash
# Unit tests live in .tests/ (chat, game, lobby, rooms, static, world)
```

