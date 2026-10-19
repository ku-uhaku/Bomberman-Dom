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
│       ├── game.js      # Server game loop and post-game pause
│       ├── world.js     # Server simulation: movement, bombs, explosions, damage, powerups, win check
│       ├── Player.js    # Player movement, powerups, lives
│       ├── bomb.js      # Bomb fuse timer
│       └── map.js       # Fixed wall template + random destructible blocks
├── client/
│   ├── index.html       # Entry page
│   ├── app.js           # App root, routing guards (/ vs /game)
│   ├── pages/
│   │   ├── lobby.js     # Nickname form, player counter, chat
│   │   ├── game.js      # Game board, server-state rendering, input, HUD
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
                      (matchmaking/Room)              (file serving)
                                |
                ┌───────────────┼────────────────┐
                ▼               ▼                ▼
             lobby.js         chat.js          game.js
          (room phases)       (messages)      (match loop)
                                                   |
                                                   ▼
                                                world.js
                                    (movement, bombs, damage, etc.)
```

### Room
Container that owns the `Lobby`, `Chat`, and `Game`. The lobby state is the source of truth for the room phase (`idle` → `queue` → `countdown` → `playing`). When the countdown ends, `startMatch()` begins the match; when the game-over pause ends, `finishMatch()` returns the room to the lobby. The `Game` also tracks whether its current round is over.

### Lobby
Validates nicknames (1–12 chars, unique, max 4 players), tracks players, and broadcasts lobby state (player list, queue/countdown timers). Two players start a 20-second queue; when it expires, or when the room fills, a 10-second countdown begins. The queue deadline does not restart when another player joins. Disconnected players are removed immediately.

### Chat
Every chat message is broadcast by the server to all players in the room. History (last 50 messages) is replayed to a player when they join.

### Game
Server-authoritative match loop. `beginGame(players, sendAll)` spawns a `World` and sends the initial map + spawn positions to all clients. Runs a 60Hz fixed-tick loop (`loopTick`) that advances the simulation and broadcasts state snapshots. When only one player remains, it fires `gameOver` → waits `roundEndMs` → calls `onEnd()` to hand control back to the `Room`.

### World (server simulation)
Owns players, bombs, explosions, blocks, and powerups. Each 60Hz tick:
1. Places requested bombs
2. Moves players from collected input movements
3. Ticks bomb fuses; explodes bombs (blast range 2, 4 directions; walls block, blocks break)
4. Decays explosions; handles powerup drops (30% chance on block destroy: bombs / flames / speed)
5. Applies powerups; deals damage to players in explosions (with i-frames)
6. Checks win condition (≤1 alive → `game_over`)

### Client
Connects via WebSocket and sends movement directions and bomb requests. Receives authoritative state snapshots (~60Hz) and applies player positions when each snapshot arrives. The browser's `requestAnimationFrame` loop updates the FPS display and sprite animations; it does not simulate movement or interpolate player positions. The fixed 15×13 map is rendered as DOM cells (no canvas). Chat and HUD update from server messages.

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
| `state` | server→client | Simulation snapshot (~60Hz) |
| `game_over` | server→client | Winner declared |
| `round_end` | server→client | Round over, back to lobby |

The WebSocket endpoint requires a same-host `Origin`, caps messages at 4 KB and
active connections at 32, and closes clients that exceed 5 messages per second
per connection.

## Performance

- `requestAnimationFrame` client render loop (60fps target)
- 60Hz fixed-tick server simulation (`tickMs`)
- Throttled DOM writes — `textContent` only changes when text actually changes
- Player positions and game objects update from authoritative server snapshots
- No canvas / WebGL; DOM-based rendering keeps paint and layer count minimal

## Tests

```bash
# Unit tests live in .tests/ (chat, game, lobby, rooms, static, world)
```
