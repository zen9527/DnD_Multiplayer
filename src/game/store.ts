// ============================================================================
// DnD Offline Multiplayer - Global Game Storage
// ============================================================================

import { GameState } from './state.js';
import { generateGameId } from '../utils/id.js';
import type { Game, Player, ChatMessage, NPC, Event } from '../types/index.js';

/**
 * Manages all active game sessions in memory
 */
export class GameStore {
  private games: Map<string, GameState>;

  constructor() {
    this.games = new Map();
  }

  // ============================================================================
  // Game Lifecycle
  // ============================================================================

  /**
   * Create a new game session
   */
  createGame(gameData: Omit<Game, 'id' | 'createdAt' | 'players' | 'chatHistory' | 'npcs' | 'events'>): GameState {
    const gameId = generateGameId();
    
    const gameState = new GameState({
      id: gameId,
      ...gameData,
      players: [],
      chatHistory: [],
      npcs: [],
      events: [],
    });

    this.games.set(gameId, gameState);
    
    console.log(`[GameStore] Created game "${gameData.name}" (ID: ${gameId})`);
    
    return gameState;
  }

  /**
   * Get a game by ID
   */
  getGame(gameId: string): GameState | undefined {
    const game = this.games.get(gameId);
    
    if (!game) {
      console.log(`[GameStore] Game not found: ${gameId}`);
      return undefined;
    }

    return game;
  }

  /**
   * Delete a game by ID
   */
  deleteGame(gameId: string): boolean {
    const deleted = this.games.delete(gameId);
    
    if (deleted) {
      console.log(`[GameStore] Deleted game: ${gameId}`);
    } else {
      console.log(`[GameStore] Game not found for deletion: ${gameId}`);
    }

    return deleted;
  }

  /**
   * Get all active games
   */
  getAllGames(): GameState[] {
    return Array.from(this.games.values());
  }

  // ============================================================================
  // Player Operations (delegated to GameState)
  // ============================================================================

  /**
   * Add a player to a specific game
   */
  addPlayerToGame(gameId: string, player: Player): void {
    const game = this.getGame(gameId);
    
    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }

    game.addPlayer(player);
    console.log(`[GameStore] Player "${player.name}" joined game "${this.getGameName(gameId)}"`);
  }

  /**
   * Remove a player from a specific game
   */
  removePlayerFromGame(gameId: string, playerId: string): void {
    const game = this.getGame(gameId);
    
    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }

    game.removePlayer(playerId);
    console.log(`[GameStore] Player "${playerId}" left game "${this.getGameName(gameId)}"`);
  }

  // ============================================================================
  // Chat Operations (delegated to GameState)
  // ============================================================================

  /**
   * Add a chat message to a specific game
   */
  addChatMessageToGame(gameId: string, message: ChatMessage): void {
    const game = this.getGame(gameId);
    
    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }

    game.addChatMessage(message);
  }

  // ============================================================================
  // NPC Operations (delegated to GameState)
  // ============================================================================

  /**
   * Add an NPC to a specific game
   */
  addNPCToGame(gameId: string, npc: NPC): void {
    const game = this.getGame(gameId);
    
    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }

    game.addNPC(npc);
    console.log(`[GameStore] NPC "${npc.name}" created in game "${this.getGameName(gameId)}"`);
  }

  /**
   * Remove an NPC from a specific game
   */
  removeNPCFromGame(gameId: string, npcId: string): void {
    const game = this.getGame(gameId);
    
    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }

    game.removeNPC(npcId);
  }

  // ============================================================================
  // Event Operations (delegated to GameState)
  // ============================================================================

  /**
   * Add an event to a specific game
   */
  addEventToGame(gameId: string, event: Event): void {
    const game = this.getGame(gameId);
    
    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }

    game.addEvent(event);
    console.log(`[GameStore] Event "${event.title}" created in game "${this.getGameName(gameId)}"`);
  }

  /**
   * Remove an event from a specific game
   */
  removeEventFromGame(gameId: string, eventId: string): void {
    const game = this.getGame(gameId);
    
    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }

    game.removeEvent(eventId);
  }

  // ============================================================================
  // Cleanup Operations
  // ============================================================================

  /**
   * Clean up empty games (older than specified time)
   */
  cleanupEmptyGames(olderThanMs: number = 3600000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [gameId, gameState] of this.games.entries()) {
      if (gameState.isEmpty() && (now - gameState.game.createdAt > olderThanMs)) {
        this.games.delete(gameId);
        cleaned++;
        console.log(`[GameStore] Cleaned up empty game: ${gameId}`);
      }
    }

    return cleaned;
  }

  /**
   * Get total number of active games
   */
  getGameCount(): number {
    return this.games.size;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Get game name by ID (helper for logging)
   */
  private getGameName(gameId: string): string {
    const game = this.getGame(gameId);
    return game ? game.name : 'Unknown';
  }
}
