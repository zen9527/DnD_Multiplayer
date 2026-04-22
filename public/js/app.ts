// ============================================================================
// DnD Offline Multiplayer - Main Application
// ============================================================================

import { wsManager } from './websocket.js';
import { gameState } from './game-state.js';
import DMPanel from './dm-panel.js';
import type { Player, ChatMessage, DiceRollResult, Event as EventType, Game } from '../../shared/index.js';

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
      const p = payload as { gameId: string; game: Game };
      this.gameId = p.gameId;
      
      // CRITICAL: Set game state and current player so setupGameUI can render
      if (p.game) {
        gameState.setGame(p.game);
        // Set DM as current player (first player in the game)
        const dmPlayer = p.game.players?.[0];
        if (dmPlayer) {
          gameState.setCurrentPlayer(dmPlayer);
        }
      }
      
      window.history.replaceState({}, '', `?game=${this.gameId}`);
      
      const shareUrl = `${window.location.origin}?game=${this.gameId}`;
      alert(`Game created! Share this link with players:\n\n${shareUrl}`);
      
      this.setupGameUI();
    });

    wsManager.on('GAME_STATE', (payload: unknown) => {
      const p = payload as { game: Game };
      if (p.game) {
        gameState.setGame(p.game);
        this.setupGameUI();
      }
    });

    wsManager.on('PLAYER_JOINED', (payload: unknown) => {
      const p = payload as { gameId: string; player: Player; gameState: Game };
      
      // CRITICAL: Set game state from server response
      if (p.gameState) {
        gameState.setGame(p.gameState);
      }
      
      if (p.player && !gameState.currentPlayer) {
        gameState.setCurrentPlayer(p.player);
      }
      
      this.setupGameUI();
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
              ${(game.players || []).map((p: Player) => `
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
    (game.chatHistory || []).forEach((msg: ChatMessage) => this.appendChatMessage(msg));
    
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
        ${result.count}d${result.diceType}${(result.modifier ?? 0) !== 0 ? ((result.modifier ?? 0) > 0 ? '+' : '') + (result.modifier ?? 0) : ''}
      </div>
      <div class="roll-details">
        Rolls: [${result.rolls.join(', ')}] 
        ${(result.modifier ?? 0) !== 0 ? `${(result.modifier ?? 0) > 0 ? '+' : ''}${result.modifier}` : ''} = 
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
  (window as unknown as { app: App }).app = new App();
});
