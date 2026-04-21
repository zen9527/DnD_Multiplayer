# DnD Offline Multiplayer Refactor - Plan 3: Frontend TypeScript Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate frontend JavaScript code to TypeScript with Vite build system and integrate shared Zod schemas.

**Architecture:** Convert all `.js` files in `public/js/` to `.ts`, add type definitions using shared types from backend, configure Vite to properly bundle and serve the application during development.

**Tech Stack:** TypeScript 5.x, Vite 5.x, WebSocket API, Zod (shared schemas)

---

## File Structure

```
public/
├── index.html                    # Update script type
├── css/style.css                 # Keep existing styles
└── js/
    ├── app.ts                    # Main application (from .js)
    ├── websocket.ts              # WebSocket client (from .js)
    ├── game-state.ts             # State management (from .js)
    ├── dm-panel.ts               # DM controls (from .js)
    └── llm-client.ts             # LLM API client (from .js, if exists)

shared/
└── index.ts                      # Already created in Plan 1
```

---

## Task Decomposition

### Task 1: Update Vite Configuration

**Files:**
- Modify: `vite.config.ts` (ensure proper TypeScript support)

- [ ] **Step 1.1: Verify/update vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: 'public',
  base: '/',
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    },
  },
});
```

---

### Task 2: Update TypeScript Configuration for Frontend

**Files:**
- Modify: `tsconfig.frontend.json` (ensure proper browser types)

- [ ] **Step 2.1: Verify/update tsconfig.frontend.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["public/js"],
  "references": [{ "path": "./tsconfig.json" }]
}
```

---

### Task 3: Create TypeScript WebSocket Client

**Files:**
- Create: `public/js/websocket.ts`
- Delete: `public/js/websocket.js` (after migration)

- [ ] **Step 3.1: Write WebSocketManager in TypeScript**

```typescript
// ============================================================================
// DnD Offline Multiplayer - WebSocket Client
// ============================================================================

import type { MessageType, WebSocketMessage } from '@shared/index';

interface EventHandler {
  (payload: unknown): void;
}

/**
 * WebSocket Manager - Client connection handling with reconnection logic
 */
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 1000;
  private messageQueue: unknown[] = [];
  private eventHandlers: Record<string, EventHandler[]> = {};
  private connected = false;

  connect(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      
      // Process queued messages
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (message) this.send(message as { type: MessageType; payload: unknown });
      }
      
      this.triggerHandlers('open', undefined);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        console.log('Received:', message.type, message.payload);
        
        // Trigger handlers for this message type
        if (this.eventHandlers[message.type]) {
          this.eventHandlers[message.type].forEach(handler => handler(message.payload));
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.connected = false;
      
      // Attempt reconnection
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => this.connect(), delay);
      } else {
        console.error('Max reconnection attempts reached');
        this.triggerHandlers('disconnect', { maxAttemptsReached: true });
      }
    };

    this.ws.onerror = (error: Event) => {
      console.error('WebSocket error:', error);
      this.triggerHandlers('error', error);
    };
  }

  send(message: { type: MessageType; payload: unknown }): void {
    if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for later
      this.messageQueue.push(message);
    }
  }

  on(type: string, handler: EventHandler): void {
    if (!this.eventHandlers[type]) {
      this.eventHandlers[type] = [];
    }
    this.eventHandlers[type].push(handler);
  }

  off(type: string, handler: EventHandler): void {
    if (this.eventHandlers[type]) {
      const index = this.eventHandlers[type].indexOf(handler);
      if (index > -1) {
        this.eventHandlers[type].splice(index, 1);
      }
    }
  }

  private triggerHandlers(event: string, data: unknown): void {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => handler(data));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Export singleton instance
export const wsManager = new WebSocketManager();
```

---

### Task 4: Create TypeScript Game State Manager

**Files:**
- Create: `public/js/game-state.ts`
- Delete: `public/js/game-state.js` (after migration)

- [ ] **Step 4.1: Write GameState in TypeScript**

```typescript
// ============================================================================
// DnD Offline Multiplayer - Game State Management
// ============================================================================

import type { Game, Player, ChatMessage, NPC, Event } from '@shared/index';

interface GameStateListener {
  (state: { game: Game | null; currentPlayer: Player | null }): void;
}

/**
 * Manages local state for the game client
 */
export class GameState {
  private _game: Game | null = null;
  private _currentPlayer: Player | null = null;
  private listeners: GameStateListener[] = [];

  get game(): Game | null {
    return this._game;
  }

  get currentPlayer(): Player | null {
    return this._currentPlayer;
  }

  setGame(gameData: Game): void {
    this._game = gameData;
    this.notifyListeners();
  }

  setCurrentPlayer(playerData: Player): void {
    this._currentPlayer = playerData;
    this.notifyListeners();
  }

  addChatMessage(message: ChatMessage): void {
    if (this._game) {
      if (!this._game.chatHistory) {
        this._game.chatHistory = [];
      }
      this._game.chatHistory.push(message);
      this.notifyListeners();
    }
  }

  addNPC(npc: NPC): void {
    if (this._game) {
      if (!this._game.npcs) {
        this._game.npcs = [];
      }
      this._game.npcs.push(npc);
      this.notifyListeners();
    }
  }

  addEvent(event: Event): void {
    if (this._game) {
      if (!this._game.events) {
        this._game.events = [];
      }
      this._game.events.push(event);
      this.notifyListeners();
    }
  }

  getPlayerById(playerId: string): Player | undefined {
    return this._game?.players?.find(p => p.id === playerId);
  }

  isDM(): boolean {
    return this._currentPlayer?.isDM ?? false;
  }

  subscribe(callback: GameStateListener): () => void {
    this.listeners.push(callback);
    // Initial call
    callback({
      game: this._game,
      currentPlayer: this._currentPlayer,
    });
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    const state = {
      game: this._game,
      currentPlayer: this._currentPlayer,
    };
    
    this.listeners.forEach(callback => callback(state));
  }

  clear(): void {
    this._game = null;
    this._currentPlayer = null;
    this.notifyListeners();
  }
}

export const gameState = new GameState();
```

---

### Task 5: Create TypeScript DM Panel Component

**Files:**
- Create: `public/js/dm-panel.ts`
- Delete: `public/js/dm-panel.js` (after migration)

- [ ] **Step 5.1: Write DMPanel in TypeScript**

```typescript
// ============================================================================
// DnD Offline Multiplayer - DM Control Panel
// ============================================================================

import { wsManager } from './websocket.js';
import { gameState } from './game-state.js';
import type { NPC, Event as EventType } from '@shared/index';

interface GeneratedNPC {
  name: string;
  description?: string;
  role: 'friendly' | 'neutral' | 'hostile';
}

interface GeneratedEvent {
  title: string;
  description?: string;
  difficulty?: string;
}

/**
 * DM Control Panel - DM-specific controls for NPCs and events
 */
export default class DMPanel {
  private element: HTMLElement | null = null;

  constructor() {
    this.element = document.getElementById('dm-panel');
    if (!this.element) return;
    
    this.initUI();
    this.setupEventListeners();
  }

  private initUI(): void {
    if (!this.element) return;

    this.element.innerHTML = `
      <div class="dm-controls">
        <h3>DM Controls</h3>
        
        <!-- Manual NPC Creation -->
        <div class="manual-section">
          <h4>Create NPC (Manual)</h4>
          <input type="text" id="npc-name" placeholder="Name">
          <textarea id="npc-description" placeholder="Description"></textarea>
          <select id="npc-role">
            <option value="friendly">Friendly</option>
            <option value="neutral">Neutral</option>
            <option value="hostile">Hostile</option>
          </select>
          <button id="create-npc">Create</button>
        </div>

        <!-- Manual Event Creation -->
        <div class="manual-section">
          <h4>Create Event (Manual)</h4>
          <input type="text" id="event-title" placeholder="Title">
          <textarea id="event-description" placeholder="Description"></textarea>
          <button id="create-event">Create</button>
        </div>

        <!-- Content Lists -->
        <div class="content-list">
          <h4>NPCs</h4>
          <ul id="npc-list"></ul>
        </div>

        <div class="content-list">
          <h4>Events</h4>
          <ul id="event-list"></ul>
        </div>
      </div>
    `;
  }

  private setupEventListeners(): void {
    // Create NPC manually
    document.getElementById('create-npc')?.addEventListener('click', () => {
      const nameInput = document.getElementById('npc-name') as HTMLInputElement;
      const descInput = document.getElementById('npc-description') as HTMLTextAreaElement;
      const roleSelect = document.getElementById('npc-role') as HTMLSelectElement;

      const name = nameInput?.value.trim();
      if (!name) return;

      wsManager.send({
        type: 'NPC_CREATE',
        payload: { 
          name, 
          description: descInput?.value || '', 
          role: (roleSelect?.value as 'friendly' | 'neutral' | 'hostile') || 'neutral' 
        },
      });

      if (nameInput) nameInput.value = '';
      if (descInput) descInput.value = '';
    });

    // Create Event manually
    document.getElementById('create-event')?.addEventListener('click', () => {
      const titleInput = document.getElementById('event-title') as HTMLInputElement;
      const descInput = document.getElementById('event-description') as HTMLTextAreaElement;

      const title = titleInput?.value.trim();
      if (!title) return;

      wsManager.send({
        type: 'EVENT_CREATE',
        payload: { 
          title, 
          description: descInput?.value || '' 
        },
      });

      if (titleInput) titleInput.value = '';
      if (descInput) descInput.value = '';
    });

    // Subscribe to game state updates
    gameState.subscribe((state) => {
      this.updateNPCList(state.game?.npcs || []);
      this.updateEventList(state.game?.events || []);
    });
  }

  private updateNPCList(npcs: NPC[]): void {
    const list = document.getElementById('npc-list');
    if (!list) return;

    list.innerHTML = npcs.map(npc => `
      <li>
        <strong>${this.escapeHtml(npc.name)}</strong> (${npc.role})<br>
        ${this.escapeHtml(npc.description || '')}
      </li>
    `).join('');
  }

  private updateEventList(events: EventType[]): void {
    const list = document.getElementById('event-list');
    if (!list) return;

    list.innerHTML = events.map(event => `
      <li>
        <strong>${this.escapeHtml(event.title)}</strong><br>
        ${this.escapeHtml(event.description || '')}
      </li>
    `).join('');
  }

  private escapeHtml(text: string): string {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
```

---

### Task 6: Create TypeScript Main Application

**Files:**
- Create: `public/js/app.ts`
- Delete: `public/js/app.js` (after migration)

- [ ] **Step 6.1: Write App in TypeScript**

```typescript
// ============================================================================
// DnD Offline Multiplayer - Main Application
// ============================================================================

import { wsManager } from './websocket.js';
import { gameState } from './game-state.js';
import DMPanel from './dm-panel.js';
import type { Player, ChatMessage, DiceRollResult, NPC, Event as EventType } from '@shared/index';

class App {
  private gameId: string | null = null;
  private playerName = '';
  private characterName = '';
  private dmPanel: DMPanel | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    // Check URL params for game ID
    const urlParams = new URLSearchParams(window.location.search);
    this.gameId = urlParams.get('game');
    
    if (this.gameId) {
      this.showJoinForm();
    } else {
      this.showCreateOrJoinScreen();
    }

    // Setup WebSocket event handlers
    this.setupWebSocketHandlers();

    // Connect to WebSocket
    wsManager.connect();
  }

  private showCreateOrJoinScreen(): void {
    const container = document.getElementById('app');
    if (!container) return;

    container.innerHTML = `
      <div class="welcome-screen">
        <h1>DnD Offline Multiplayer</h1>
        
        <div class="options">
          <button id="create-game-btn" class="primary">Create New Game</button>
          
          <div class="divider">OR</div>
          
          <div class="join-form">
            <input type="text" id="game-id-input" placeholder="Enter Game ID">
            <button id="join-game-btn">Join Game</button>
          </div>
        </div>

        <div class="instructions">
          <h3>How to use:</h3>
          <ol>
            <li>DM creates a game and shares the Game ID with players</li>
            <li>Players enter the Game ID to join</li>
            <li>All players connect via browser - no installation needed!</li>
          </ol>
        </div>
      </div>
    `;

    document.getElementById('create-game-btn')?.addEventListener('click', () => {
      this.showCreateGameForm();
    });

    document.getElementById('join-game-btn')?.addEventListener('click', () => {
      const gameIdInput = document.getElementById('game-id-input') as HTMLInputElement;
      const gameId = gameIdInput.value.trim();
      if (gameId) {
        window.location.href = `?game=${gameId}`;
      }
    });
  }

  private showCreateGameForm(): void {
    const container = document.getElementById('app');
    if (!container) return;

    container.innerHTML = `
      <div class="welcome-screen">
        <h2>Create New Game</h2>
        
        <div class="join-form">
          <input type="text" id="game-name" placeholder="Game Name">
          <select id="max-players">
            <option value="2">2 Players</option>
            <option value="3">3 Players</option>
            <option value="4" selected>4 Players</option>
            <option value="5">5 Players</option>
            <option value="6">6 Players</option>
            <option value="7">7 Players</option>
            <option value="8">8 Players</option>
          </select>
          <button id="create-game-btn" class="primary">Create Game</button>
          <button id="cancel-btn">Cancel</button>
        </div>
      </div>
    `;

    document.getElementById('create-game-btn')?.addEventListener('click', () => {
      const nameInput = document.getElementById('game-name') as HTMLInputElement;
      const maxPlayersSelect = document.getElementById('max-players') as HTMLSelectElement;
      
      const gameName = nameInput.value.trim();
      const maxPlayers = parseInt(maxPlayersSelect?.value || '4');

      if (!gameName) {
        alert('Please enter a game name');
        return;
      }

      wsManager.send({
        type: 'CREATE_GAME',
        payload: { gameName, maxPlayers },
      });
    });

    document.getElementById('cancel-btn')?.addEventListener('click', () => {
      this.showCreateOrJoinScreen();
    });
  }

  private showJoinForm(): void {
    const container = document.getElementById('app');
    if (!container) return;

    container.innerHTML = `
      <div class="welcome-screen">
        <h2>Join Game</h2>
        
        <div class="join-form">
          <input type="text" id="player-name" placeholder="Your Name">
          <input type="text" id="character-name" placeholder="Character Name">
          <button id="join-btn" class="primary">Join Game</button>
        </div>
      </div>
    `;

    document.getElementById('join-btn')?.addEventListener('click', () => {
      const nameInput = document.getElementById('player-name') as HTMLInputElement;
      const charInput = document.getElementById('character-name') as HTMLInputElement;
      
      this.playerName = nameInput.value.trim();
      this.characterName = charInput.value.trim();

      if (!this.playerName || !this.characterName) {
        alert('Please fill in all fields');
        return;
      }

      wsManager.send({
        type: 'JOIN_GAME',
        payload: {
          gameId: this.gameId!,
          playerName: this.playerName,
          characterName: this.characterName,
        },
      });
    });
  }

  private setupWebSocketHandlers(): void {
    // Connection events
    wsManager.on('open', () => {
      console.log('Connected to server');
      
      if (this.gameId && !gameState.currentPlayer) {
        this.showJoinForm();
      }
    });

    wsManager.on('disconnect', () => {
      alert('Disconnected from server. Please refresh to reconnect.');
    });

    // Game events
    wsManager.on('GAME_CREATED', (payload: unknown) => {
      const p = payload as { gameId: string; game: unknown };
      this.gameId = p.gameId;
      window.history.replaceState({}, '', `?game=${this.gameId}`);
      
      const shareUrl = `${window.location.origin}?game=${this.gameId}`;
      alert(`Game created! Share this link with players:\n\n${shareUrl}`);
      
      this.setupGameUI();
    });

    wsManager.on('GAME_STATE', (payload: unknown) => {
      const p = payload as { game: unknown };
      gameState.setGame(p.game as typeof gameState.game);
      this.setupGameUI();
    });

    wsManager.on('PLAYER_JOINED', (payload: unknown) => {
      const p = payload as { gameId: string; player?: Player; gameState?: unknown };
      
      if (p.player && !gameState.currentPlayer) {
        gameState.setCurrentPlayer(p.player);
        this.setupGameUI();
      }
    });

    // Chat events
    wsManager.on('CHAT_MESSAGE', (payload: unknown) => {
      const message = payload as ChatMessage;
      gameState.addChatMessage(message);
      this.appendChatMessage(message);
    });

    // Dice roll events
    wsManager.on('DICE_ROLL_RESULT', (payload: unknown) => {
      const result = payload as { result: DiceRollResult };
      this.appendDiceRoll(result.result);
    });

    // NPC events
    wsManager.on('NPC_CREATED', () => {
      // State updated via gameState.subscribe in DMPanel
    });

    // Event events
    wsManager.on('EVENT_CREATED', () => {
      // State updated via gameState.subscribe in DMPanel
    });

    // Error handling
    wsManager.on('ERROR', (payload: unknown) => {
      const p = payload as { message: string };
      alert(`Error: ${p.message}`);
    });
  }

  private setupGameUI(): void {
    const container = document.getElementById('app');
    if (!container) return;

    const game = gameState.game;
    const player = gameState.currentPlayer || game?.players?.[0];

    if (!game || !player) return;

    gameState.setCurrentPlayer(player);

    container.innerHTML = `
      <div class="game-interface">
        <header class="game-header">
          <h2>${this.escapeHtml(game.name)}</h2>
          <span class="game-id">ID: ${this.escapeHtml(game.id)}</span>
          <button id="copy-link-btn" title="Copy link">📋</button>
        </header>

        <div class="main-content">
          <!-- Players Panel -->
          <aside class="players-panel">
            <h3>Players (${game.players?.length || 0}/${game.maxPlayers})</h3>
            <ul id="players-list">
              ${(game.players || []).map(p => `
                <li class="${p.isDM ? 'dm' : ''}">
                  ${p.isDM ? '👑 ' : ''}${this.escapeHtml(p.name)} (${this.escapeHtml(p.characterName)})
                </li>
              `).join('')}
            </ul>
          </aside>

          <!-- Chat Area -->
          <main class="chat-area">
            <div id="chat-messages" class="chat-messages"></div>
            
            <form id="chat-form" class="chat-input">
              <input type="text" id="chat-input" placeholder="Type a message..." autocomplete="off">
              <button type="submit" class="send-btn">Send</button>
            </form>

            <!-- Dice Roller -->
            <div class="dice-roller">
              <select id="dice-type">
                <option value="4">d4</option>
                <option value="6">d6</option>
                <option value="8">d8</option>
                <option value="10">d10</option>
                <option value="12">d12</option>
                <option value="20" selected>d20</option>
              </select>
              <input type="number" id="dice-count" value="1" min="1" max="10" style="width: 60px;">
              <input type="number" id="dice-modifier" value="0" placeholder="Mod">
              <button id="roll-btn" class="primary">Roll</button>
            </div>
          </main>

          <!-- DM Panel (only for DM) -->
          ${player.isDM ? '<aside id="dm-panel" class="dm-panel"></aside>' : ''}
        </div>
      </div>
    `;

    // Setup chat form
    document.getElementById('chat-form')?.addEventListener('submit', (e: Event) => {
      e.preventDefault();
      const input = document.getElementById('chat-input') as HTMLInputElement;
      const content = input.value.trim();
      
      if (content) {
        wsManager.send({
          type: 'CHAT_MESSAGE',
          payload: { content, type: 'text' },
        });
        input.value = '';
      }
    });

    // Setup dice roller
    document.getElementById('roll-btn')?.addEventListener('click', () => {
      const diceTypeSelect = document.getElementById('dice-type') as HTMLSelectElement;
      const countInput = document.getElementById('dice-count') as HTMLInputElement;
      const modInput = document.getElementById('dice-modifier') as HTMLInputElement;
      
      const diceType = parseInt(diceTypeSelect?.value || '20');
      const count = parseInt(countInput?.value || '1');
      const modifier = parseInt(modInput?.value || '0') || 0;

      wsManager.send({
        type: 'DICE_ROLL',
        payload: { diceType, count, modifier },
      });
    });

    // Copy link button
    document.getElementById('copy-link-btn')?.addEventListener('click', () => {
      const url = window.location.href;
      navigator.clipboard.writeText(url).then(() => {
        alert('Link copied to clipboard!');
      }).catch(() => {
        prompt('Copy this link:', url);
      });
    });

    // Load chat history
    (game.chatHistory || []).forEach(msg => this.appendChatMessage(msg));
    
    // Initialize DM panel if DM
    if (player.isDM && !this.dmPanel) {
      this.dmPanel = new DMPanel();
    }
  }

  private appendChatMessage(message: ChatMessage): void {
    const messagesDiv = document.getElementById('chat-messages');
    if (!messagesDiv) return;

    const messageEl = document.createElement('div');
    messageEl.className = `message ${message.type} ${message.playerId === gameState.currentPlayer?.id ? 'own' : ''}`;
    
    messageEl.innerHTML = `
      <div class="message-header">
        <strong class="player-name">${this.escapeHtml(message.playerName)}</strong>
        <span class="character-name">${this.escapeHtml(message.characterName)}</span>
        <span class="timestamp">${this.formatTime(message.timestamp)}</span>
      </div>
      <div class="message-content">${this.escapeHtml(message.content)}</div>
    `;

    messagesDiv.appendChild(messageEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  private appendDiceRoll(result: DiceRollResult): void {
    const messagesDiv = document.getElementById('chat-messages');
    if (!messagesDiv) return;

    const rollEl = document.createElement('div');
    rollEl.className = 'dice-roll';
    
    const highlightColor = result.total >= 15 ? '#4caf50' : result.total <= 5 ? '#f44336' : '';
    
    rollEl.innerHTML = `
      <div class="roll-header">
        <strong>${this.escapeHtml(result.playerName)}</strong> rolled
        ${result.count}d${result.diceType}${result.modifier !== 0 ? (result.modifier > 0 ? '+' : '') + result.modifier : ''}
      </div>
      <div class="roll-details">
        Rolls: [${result.rolls.join(', ')}] 
        ${result.modifier !== 0 ? `${result.modifier > 0 ? '+' : ''}${result.modifier}` : ''} = 
        <strong style="color: ${highlightColor}">${result.total}</strong>
      </div>
    `;

    messagesDiv.appendChild(rollEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  private escapeHtml(text: string): string {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
```

---

### Task 7: Update HTML Entry Point

**Files:**
- Modify: `public/index.html` (already correct, just verify)

- [ ] **Step 7.1: Verify index.html uses TypeScript module**

Already correct from Plan 1:
```html
<script type="module" src="/js/app.ts"></script>
```

---

### Task 8: Delete Old JavaScript Files

**Files:**
- Delete: `public/js/app.js`
- Delete: `public/js/websocket.js`
- Delete: `public/js/game-state.js`
- Delete: `public/js/dm-panel.js`

- [ ] **Step 8.1: Remove old JavaScript files**

```bash
rm public/js/app.js
rm public/js/websocket.js
rm public/js/game-state.js
rm public/js/dm-panel.js
```

---

### Task 9: Build and Test Frontend

**Files:**
- No file changes, just verification

- [ ] **Step 9.1: Run TypeScript type check for frontend**

Run: `npx tsc --noEmit -p tsconfig.frontend.json`
Expected: No errors

- [ ] **Step 9.2: Build frontend with Vite**

Run: `npm run build:frontend`
Expected: Build succeeds, output in `dist/public/`

- [ ] **Step 9.3: Test full build**

Run: `npm run build`
Expected: Both backend and frontend build successfully

---

### Task 10: Development Mode Test

**Files:**
- No file changes, just verification

- [ ] **Step 10.1: Start development server**

Run: `timeout 5 npx vite` (in background) or manually test
Expected: Vite dev server starts on port 5173

---

## Acceptance Criteria for Plan 3

✅ **TypeScript Migration**
- All `.js` files converted to `.ts`
- Type imports from `@shared/index` working
- No TypeScript compilation errors

✅ **Vite Integration**
- Vite dev server runs correctly
- Build produces output in `dist/public/`
- Hot module replacement works (optional)

✅ **Functionality**
- WebSocket connection established
- Game creation/joining works
- Chat messages display
- Dice rolling functional
- DM panel shows for DMs only

---

## Testing Plan 3

```bash
# 1. Type check frontend
npx tsc --noEmit -p tsconfig.frontend.json

# 2. Build both backend and frontend
npm run build

# 3. Start server
timeout 5 npm start

# Expected: Server starts, serves built frontend on port 3000
```

---

**Plan 3 Complete:** This plan produces a fully TypeScript frontend with Vite build system, ready for production deployment.
