// ============================================================================
// DnD Offline Multiplayer - WebSocket Server
// ============================================================================
// Main server handling real-time game communication between players and DM.
// Uses Express for static file serving and ws (WebSocket) for real-time updates.
// ============================================================================

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// ES module __dirname compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// In-Memory Data Storage
// ============================================================================

/** @type {Map<string, Game>} - gameId -> game object */
const games = new Map();

/** @type {Map<WebSocket, Player>} - WebSocket connection -> player info */
const players = new Map();

// ============================================================================
// Express + HTTP Server Setup
// ============================================================================

const app = express();
const server = createServer(app);

// Middleware
app.use(express.json());

// Serve static files from public/ directory (for client HTML/CSS/JS)
app.use(express.static(path.join(__dirname, 'public')));

// Serve shared resources (schemas, common JS)
app.use('/shared', express.static(path.join(__dirname, 'shared')));

// ============================================================================
// WebSocket Server Setup
// ============================================================================

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection established');

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(ws, message);
    } catch (error) {
      console.error('Error parsing message:', error);
      send(ws, { type: 'ERROR', payload: { message: 'Invalid message format' } });
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    const player = players.get(ws);
    if (player) {
      console.log(`Player disconnected: ${player.name} (${player.characterName})`);
      handlePlayerDisconnect(player);
    }
    players.delete(ws);
  });

  // Handle errors
  ws.on('error', (error) => {
    const player = players.get(ws);
    if (player) {
      console.error(`WebSocket error for ${player.name}:`, error);
    } else {
      console.error('WebSocket error:', error);
    }
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique ID
 * @returns {string} Unique identifier
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Send JSON message to WebSocket client
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} message - Message object to send
 */
function send(ws, message) {
  if (ws.readyState === 1) { // WebSocket.OPEN
    ws.send(JSON.stringify(message));
  }
}

/**
 * Broadcast message to all players in a game
 * @param {string} gameId - Game ID
 * @param {Object} message - Message to broadcast
 * @param {WebSocket} excludeWs - Optional WebSocket to exclude from broadcast
 */
function broadcastToGame(gameId, message, excludeWs = null) {
  const game = games.get(gameId);
  if (!game) return;

  for (const player of game.players) {
    if (player.ws && player.ws !== excludeWs && player.ws.readyState === 1) {
      send(player.ws, message);
    }
  }
}

/**
 * Get player by WebSocket connection
 * @param {WebSocket} ws - WebSocket connection
 * @returns {Player|undefined} Player object or undefined
 */
function getPlayerByWs(ws) {
  return players.get(ws);
}

// ============================================================================
// Message Handlers
// ============================================================================

/**
 * Route incoming messages to appropriate handlers
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} message - Parsed message object
 */
function handleMessage(ws, message) {
  const { type, payload } = message;

  if (!type) {
    send(ws, { type: 'ERROR', payload: { message: 'Message type is required' } });
    return;
  }

  switch (type) {
    case 'CREATE_GAME':
      handleCreateGame(ws, payload);
      break;
    case 'JOIN_GAME':
      handleJoinGame(ws, payload);
      break;
    case 'CHAT_MESSAGE':
      handleChatMessage(ws, payload);
      break;
    case 'DICE_ROLL':
      handleDiceRoll(ws, payload);
      break;
    case 'NPC_CREATE':
      handleNPCCreate(ws, payload);
      break;
    case 'EVENT_CREATE':
      handleEventCreate(ws, payload);
      break;
    default:
      send(ws, { type: 'ERROR', payload: { message: `Unknown message type: ${type}` } });
  }
}

/**
 * Handle CREATE_GAME message - DM creates a new game
 * @param {WebSocket} ws - WebSocket connection (DM)
 * @param {Object} payload - { gameName, maxPlayers }
 */
function handleCreateGame(ws, payload) {
  const { gameName, maxPlayers = 4 } = payload;

  // Validate input
  if (!gameName || typeof gameName !== 'string' || gameName.trim().length === 0) {
    send(ws, { type: 'ERROR', payload: { message: 'Game name is required' } });
    return;
  }

  if (typeof maxPlayers !== 'number' || maxPlayers < 2 || maxPlayers > 8) {
    send(ws, { type: 'ERROR', payload: { message: 'Max players must be between 2 and 8' } });
    return;
  }

  // Generate unique game ID
  const gameId = generateId();

  // Create DM player entry
  const dmPlayer = {
    id: generateId(),
    ws,
    name: payload.playerName || 'DM',
    characterName: payload.characterName || 'Dungeon Master',
    gameId,
    isDM: true
  };

  // Create new game
  const game = {
    id: gameId,
    name: gameName.trim(),
    maxPlayers,
    players: [dmPlayer],
    chatHistory: [],
    npcs: [],
    events: [],
    createdAt: Date.now()
  };

  // Store game and player
  games.set(gameId, game);
  players.set(ws, dmPlayer);

  console.log(`Game created: ${gameName} (ID: ${gameId}) by DM ${dmPlayer.name}`);

  // Send confirmation to DM with full game state
  send(ws, {
    type: 'GAME_CREATED',
    payload: {
      gameId,
      game: {
        id: game.id,
        name: game.name,
        maxPlayers: game.maxPlayers,
        players: game.players.map(p => ({
          id: p.id,
          name: p.name,
          characterName: p.characterName,
          isDM: p.isDM
        })),
        chatHistory: game.chatHistory,
        npcs: game.npcs,
        events: game.events,
        createdAt: game.createdAt
      }
    }
  });

  // Add system message to chat history
  const systemMessage = {
    id: generateId(),
    playerId: dmPlayer.id,
    playerName: 'System',
    characterName: '',
    content: `Game "${game.name}" created. Waiting for players to join...`,
    type: 'text',
    timestamp: Date.now()
  };
  game.chatHistory.push(systemMessage);
}

/**
 * Handle JOIN_GAME message - Player joins an existing game
 * @param {WebSocket} ws - WebSocket connection (Player)
 * @param {Object} payload - { gameId, playerName, characterName }
 */
function handleJoinGame(ws, payload) {
  const { gameId, playerName, characterName } = payload;

  // Validate input
  if (!gameId || typeof gameId !== 'string') {
    send(ws, { type: 'ERROR', payload: { message: 'Game ID is required' } });
    return;
  }

  if (!playerName || typeof playerName !== 'string' || playerName.trim().length === 0) {
    send(ws, { type: 'ERROR', payload: { message: 'Player name is required' } });
    return;
  }

  if (!characterName || typeof characterName !== 'string' || characterName.trim().length === 0) {
    send(ws, { type: 'ERROR', payload: { message: 'Character name is required' } });
    return;
  }

  // Check if game exists
  const game = games.get(gameId);
  if (!game) {
    send(ws, { type: 'ERROR', payload: { message: 'Game not found' } });
    return;
  }

  // Check if game is full
  if (game.players.length >= game.maxPlayers) {
    send(ws, { type: 'ERROR', payload: { message: 'Game is full' } });
    return;
  }

  // Create player entry
  const newPlayer = {
    id: generateId(),
    ws,
    name: playerName.trim(),
    characterName: characterName.trim(),
    gameId,
    isDM: false
  };

  // Add player to game
  game.players.push(newPlayer);
  players.set(ws, newPlayer);

  console.log(`Player joined: ${newPlayer.name} (${newPlayer.characterName}) to game ${gameId}`);

  // Send full game state to the joining player
  send(ws, {
    type: 'GAME_STATE',
    payload: {
      game: {
        id: game.id,
        name: game.name,
        maxPlayers: game.maxPlayers,
        players: game.players.map(p => ({
          id: p.id,
          name: p.name,
          characterName: p.characterName,
          isDM: p.isDM
        })),
        chatHistory: game.chatHistory,
        npcs: game.npcs,
        events: game.events,
        createdAt: game.createdAt
      }
    }
  });

  // Notify all players that a new player joined
  const joinMessage = {
    id: generateId(),
    playerId: newPlayer.id,
    playerName: 'System',
    characterName: '',
    content: `${newPlayer.name} (${newPlayer.characterName}) has joined the game.`,
    type: 'text',
    timestamp: Date.now()
  };

  broadcastToGame(gameId, {
    type: 'PLAYER_JOINED',
    payload: {
      player: {
        id: newPlayer.id,
        name: newPlayer.name,
        characterName: newPlayer.characterName,
        isDM: false
      },
      game: {
        players: game.players.map(p => ({
          id: p.id,
          name: p.name,
          characterName: p.characterName,
          isDM: p.isDM
        }))
      }
    }
  });

  // Also send the join message as chat history
  game.chatHistory.push(joinMessage);
}

/**
 * Handle CHAT_MESSAGE - Send chat message to all players in game
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} payload - { content, type }
 */
function handleChatMessage(ws, payload) {
  const player = getPlayerByWs(ws);
  
  if (!player || !player.gameId) {
    send(ws, { type: 'ERROR', payload: { message: 'Not in a game' } });
    return;
  }

  const { content, type = 'text' } = payload;

  // Validate input
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    send(ws, { type: 'ERROR', payload: { message: 'Message content is required' } });
    return;
  }

  const game = games.get(player.gameId);
  if (!game) {
    send(ws, { type: 'ERROR', payload: { message: 'Game not found' } });
    return;
  }

  // Create chat message
  const chatMessage = {
    id: generateId(),
    playerId: player.id,
    playerName: player.name,
    characterName: player.characterName,
    content: content.trim(),
    type,
    timestamp: Date.now()
  };

  // Add to game history
  game.chatHistory.push(chatMessage);

  console.log(`[${game.name}] ${player.characterName}: ${content}`);

  // Broadcast to all players in the game
  broadcastToGame(player.gameId, {
    type: 'CHAT_MESSAGE',
    payload: chatMessage
  });
}

/**
 * Handle DICE_ROLL - Server-side dice rolling for fairness
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} payload - { diceType, count, modifier }
 */
function handleDiceRoll(ws, payload) {
  const player = getPlayerByWs(ws);
  
  if (!player || !player.gameId) {
    send(ws, { type: 'ERROR', payload: { message: 'Not in a game' } });
    return;
  }

  const { diceType, count = 1, modifier = 0 } = payload;

  // Validate input
  if (!diceType || ![4, 6, 8, 10, 12, 20].includes(diceType)) {
    send(ws, { type: 'ERROR', payload: { message: 'Invalid dice type. Use d4, d6, d8, d10, d12, or d20' } });
    return;
  }

  if (typeof count !== 'number' || count < 1 || count > 10) {
    send(ws, { type: 'ERROR', payload: { message: 'Count must be between 1 and 10' } });
    return;
  }

  const game = games.get(player.gameId);
  if (!game) {
    send(ws, { type: 'ERROR', payload: { message: 'Game not found' } });
    return;
  }

  // Server-side dice rolling (prevents cheating)
  const rolls = [];
  let total = 0;

  for (let i = 0; i < count; i++) {
    const roll = Math.floor(Math.random() * diceType) + 1;
    rolls.push(roll);
    total += roll;
  }

  total += modifier;

  // Create result object
  const result = {
    id: generateId(),
    playerId: player.id,
    playerName: player.name,
    characterName: player.characterName,
    diceType,
    count,
    rolls,
    modifier,
    total,
    timestamp: Date.now()
  };

  console.log(`[${game.name}] ${player.characterName} rolled ${count}d${diceType}${modifier !== 0 ? (modifier > 0 ? '+' : '') + modifier : ''}: ${rolls.join(', ')} = ${total}`);

  // Broadcast result to all players in the game
  broadcastToGame(player.gameId, {
    type: 'DICE_ROLL_RESULT',
    payload: result
  });

  // Also add to chat history as a roll message
  const chatMessage = {
    id: generateId(),
    playerId: player.id,
    playerName: player.name,
    characterName: player.characterName,
    content: `Rolled ${count}d${diceType}${modifier !== 0 ? (modifier > 0 ? '+' : '') + modifier : ''}: ${rolls.join(', ')} = ${total}`,
    type: 'roll',
    timestamp: Date.now()
  };
  game.chatHistory.push(chatMessage);
}

/**
 * Handle NPC_CREATE - DM creates a new NPC (DM-only)
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} payload - { name, description, role }
 */
function handleNPCCreate(ws, payload) {
  const player = getPlayerByWs(ws);
  
  if (!player || !player.gameId) {
    send(ws, { type: 'ERROR', payload: { message: 'Not in a game' } });
    return;
  }

  // DM-only feature
  if (!player.isDM) {
    send(ws, { type: 'ERROR', payload: { message: 'Only the DM can create NPCs' } });
    return;
  }

  const { name, description = '', role = 'neutral' } = payload;

  // Validate input
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    send(ws, { type: 'ERROR', payload: { message: 'NPC name is required' } });
    return;
  }

  const game = games.get(player.gameId);
  if (!game) {
    send(ws, { type: 'ERROR', payload: { message: 'Game not found' } });
    return;
  }

  // Create NPC object
  const npc = {
    id: generateId(),
    name: name.trim(),
    description: description.trim(),
    role,
    createdBy: player.id,
    createdAt: Date.now()
  };

  // Add to game NPCs
  game.npcs.push(npc);

  console.log(`[${game.name}] DM created NPC: ${npc.name} (${role})`);

  // Broadcast to all players in the game
  broadcastToGame(player.gameId, {
    type: 'NPC_CREATED',
    payload: npc
  });

  // Add to chat history
  const chatMessage = {
    id: generateId(),
    playerId: player.id,
    playerName: player.name,
    characterName: player.characterName,
    content: `Created NPC: ${npc.name} - ${description || 'No description'}`,
    type: 'npc',
    timestamp: Date.now()
  };
  game.chatHistory.push(chatMessage);
}

/**
 * Handle EVENT_CREATE - DM creates a new event (DM-only)
 * @param {WebSocket} ws - WebSocket connection
 * @param {Object} payload - { title, description }
 */
function handleEventCreate(ws, payload) {
  const player = getPlayerByWs(ws);
  
  if (!player || !player.gameId) {
    send(ws, { type: 'ERROR', payload: { message: 'Not in a game' } });
    return;
  }

  // DM-only feature
  if (!player.isDM) {
    send(ws, { type: 'ERROR', payload: { message: 'Only the DM can create events' } });
    return;
  }

  const { title, description = '' } = payload;

  // Validate input
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    send(ws, { type: 'ERROR', payload: { message: 'Event title is required' } });
    return;
  }

  const game = games.get(player.gameId);
  if (!game) {
    send(ws, { type: 'ERROR', payload: { message: 'Game not found' } });
    return;
  }

  // Create event object
  const event = {
    id: generateId(),
    title: title.trim(),
    description: description.trim(),
    createdBy: player.id,
    createdAt: Date.now()
  };

  // Add to game events
  game.events.push(event);

  console.log(`[${game.name}] DM created event: ${event.title}`);

  // Broadcast to all players in the game
  broadcastToGame(player.gameId, {
    type: 'EVENT_CREATED',
    payload: event
  });

  // Add to chat history
  const chatMessage = {
    id: generateId(),
    playerId: player.id,
    playerName: player.name,
    characterName: player.characterName,
    content: `Event: ${event.title} - ${description || 'No description'}`,
    type: 'event',
    timestamp: Date.now()
  };
  game.chatHistory.push(chatMessage);
}

/**
 * Handle player disconnect - Clean up and notify other players
 * @param {Player} player - Player who disconnected
 */
function handlePlayerDisconnect(player) {
  const game = games.get(player.gameId);
  
  if (!game) return;

  // Remove player from game
  const playerIndex = game.players.findIndex(p => p.id === player.id);
  if (playerIndex !== -1) {
    game.players.splice(playerIndex, 1);
  }

  console.log(`Player left: ${player.name} (${player.characterName}) from game ${game.id}`);

  // Notify remaining players
  broadcastToGame(player.gameId, {
    type: 'PLAYER_LEFT',
    payload: {
      player: {
        id: player.id,
        name: player.name,
        characterName: player.characterName
      },
      game: {
        players: game.players.map(p => ({
          id: p.id,
          name: p.name,
          characterName: p.characterName,
          isDM: p.isDM
        }))
      }
    }
  });

  // Add to chat history
  const leaveMessage = {
    id: generateId(),
    playerId: player.id,
    playerName: 'System',
    characterName: '',
    content: `${player.name} (${player.characterName}) has left the game.`,
    type: 'text',
    timestamp: Date.now()
  };
  game.chatHistory.push(leaveMessage);

  // Clean up empty games (no players remaining)
  if (game.players.length === 0) {
    console.log(`Game deleted (empty): ${game.id} (${game.name})`);
    games.delete(player.gameId);
  }
}

// ============================================================================
// Server Startup
// ============================================================================

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`============================================`);
  console.log(`DnD Game Server running at http://${HOST}:${PORT}`);
  console.log(`WebSocket server ready for connections`);
  console.log(`Static files served from: public/ and shared/`);
  console.log(`============================================`);
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  
  // Close all WebSocket connections
  for (const [ws, player] of players) {
    ws.close(1001, 'Server shutting down');
  }
  
  // Close WebSocket server
  wss.close(() => {
    console.log('WebSocket server closed');
    
    // Close HTTP server
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down...');
  process.emit('SIGINT');
});
