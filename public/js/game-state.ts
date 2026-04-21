// ============================================================================
// DnD Offline Multiplayer - Game State Management
// ============================================================================

import type { Game, Player, ChatMessage, NPC, Event } from '../../shared/index.js';

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
