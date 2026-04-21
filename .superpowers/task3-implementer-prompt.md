# Implementer Prompt for DnD MVP Task 3

## Context

You are implementing **Task 3: WebSocket Server Implementation** of the DnD Offline Multiplayer game. This is the CORE server that handles all real-time communication between players and DM.

## Goal

Create `server.js` - a Node.js server using Express + WebSocket (ws library) that:
1. Serves static files from `public/` directory
2. Manages WebSocket connections for real-time game state
3. Handles game creation, player joining, chat, dice rolls, NPCs, and events
4. Broadcasts messages to all players in a game

## File to Create

### server.js (Main Server)

The server must implement these message types:

| Type | Direction | Description |
|------|-----------|-------------|
| CREATE_GAME | Client → Server | DM creates new game |
| GAME_CREATED | Server → Client | Confirmation with gameId |
| JOIN_GAME | Client → Server | Player joins existing game |
| GAME_STATE | Server → Client | Full game state sent to new player |
| PLAYER_JOINED | Server → All | Notification when player joins |
| PLAYER_LEFT | Server → All | Notification when player leaves |
| CHAT_MESSAGE | Client → Server | Send chat message |
| CHAT_MESSAGE | Server → All | Broadcast chat message |
| DICE_ROLL | Client → Server | Request dice roll |
| DICE_ROLL_RESULT | Server → All | Broadcast roll result |
| NPC_CREATE | Client (DM) → Server | DM creates NPC |
| NPC_CREATED | Server → All | Broadcast new NPC |
| EVENT_CREATE | Client (DM) → Server | DM creates event |
| EVENT_CREATED | Server → All | Broadcast new event |
| ERROR | Server → Client | Error message |

## Implementation Requirements

### Core Structure

```javascript
// server.js
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Game state storage (in-memory)
const games = new Map(); // gameId -> game object
const players = new Map(); // ws -> player info

// Create Express app + HTTP server
const app = express();
const server = createServer(app);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/shared', express.static(path.join(__dirname, 'shared')));

// WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  // Handle connection, messages, disconnection
});

// Message handlers...

// Start server
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`DnD Game Server running at http://${HOST}:${PORT}`);
});
```

### Data Models

**Game Object:**
```javascript
{
  id: string,           // Generated ID
  name: string,         // Game name
  maxPlayers: number,   // Max player count
  players: Array,       // Player objects
  chatHistory: Array,   // Chat messages
  npcs: Array,          // NPCs created by DM
  events: Array,        // Events created by DM
  createdAt: number     // Timestamp
}
```

**Player Object:**
```javascript
{
  id: string,           // Player ID
  ws: WebSocket,        // WebSocket connection
  name: string,         // Real player name
  characterName: string,// Character name
  gameId: string,       // Current game ID
  isDM: boolean         // Is this the DM?
}
```

**Chat Message:**
```javascript
{
  id: string,
  playerId: string,
  playerName: string,
  characterName: string,
  content: string,
  type: 'text' | 'roll' | 'npc' | 'event',
  timestamp: number
}
```

### Key Functions to Implement

1. `handleMessage(ws, message)` - Route messages by type
2. `handleCreateGame(ws, payload)` - Create new game, DM joins automatically
3. `handleJoinGame(ws, payload)` - Join existing game, send game state
4. `handleChatMessage(ws, payload)` - Add to history, broadcast to all
5. `handleDiceRoll(ws, payload)` - Roll dice server-side, broadcast result
6. `handleNPCCreate(ws, npcData)` - DM-only, add NPC to game
7. `handleEventCreate(ws, eventData)` - DM-only, add event to game
8. `handlePlayerDisconnect(player)` - Remove player, clean up empty games
9. `broadcastToGame(gameId, message)` - Send to all players in game
10. `send(ws, message)` - Helper to send JSON message
11. `generateId()` - Generate unique IDs

### Dice Rolling Logic

Server-side dice rolling (NOT client-side):
```javascript
function handleDiceRoll(ws, { diceType, count, modifier = 0 }) {
  const rolls = [];
  let total = 0;
  
  for (let i = 0; i < count; i++) {
    const roll = Math.floor(Math.random() * diceType) + 1;
    rolls.push(roll);
    total += roll;
  }
  
  total += modifier;
  
  // Broadcast result to all players
  broadcastToGame(player.gameId, {
    type: 'DICE_ROLL_RESULT',
    payload: { result }
  });
}
```

### DM-Only Features

NPC and event creation should check if player is DM:
```javascript
function handleNPCCreate(ws, npcData) {
  const player = players.get(ws);
  if (!player || !player.isDM) return; // Only DM can create NPCs
  
  // ... create NPC
}
```

## Steps to Complete

- [ ] **Step 1:** Write complete `server.js` with all code above
- [ ] **Step 2:** Test server starts successfully with `npm start`
- [ ] **Step 3:** Verify static files are served (visit http://localhost:3000)
- [ ] **Step 4:** Test WebSocket connection (can use browser console)

## Testing

1. Start server: `npm start`
2. Expected output: "DnD Game Server running at http://0.0.0.0:3000"
3. Visit http://localhost:3000 - should show "Cannot GET /" (no index.html yet, that's Task 9)
4. Server should not crash on startup

## Acceptance Criteria

- ✅ File created at `server.js` with complete implementation
- ✅ Express server serves static files from `public/` and `shared/`
- ✅ WebSocket server accepts connections
- ✅ CREATE_GAME creates game, DM joins automatically
- ✅ JOIN_GAME adds player to existing game
- ✅ GAME_STATE sends full game state to new player
- ✅ CHAT_MESSAGE broadcasts to all players in game
- ✅ DICE_ROLL rolls dice server-side, broadcasts result
- ✅ NPC_CREATE and EVENT_CREATE are DM-only
- ✅ PLAYER_JOINED/PLAYER_LEFT notifications work
- ✅ Empty games are cleaned up when last player leaves
- ✅ Server starts without errors
- ✅ Uses ES modules syntax

## Important Notes

- Use in-memory storage (Maps) - no database needed for MVP
- All dice rolling happens SERVER-SIDE (prevents cheating)
- DM is automatically the first player who creates the game
- Message types must match exactly what client expects (Tasks 4-8)
- Game IDs should be unique (use random string generation)
- Timestamps use `Date.now()` for consistency

## Integration with Other Tasks

- **Task 1:** Uses dotenv from package.json dependencies
- **Task 2:** Can import schemas from `shared/schemas.js` for validation (optional but recommended)
- **Tasks 4-8:** Client will connect to this server via WebSocket
- **Task 9:** HTML file will be served from `public/index.html`

## Questions?

If anything is unclear about message flow, data structures, or server behavior, ask before proceeding.
