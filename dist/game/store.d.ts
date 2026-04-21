import { GameState } from './state.js';
import type { Game, Player, ChatMessage, NPC, Event } from '../types/index.js';
/**
 * Manages all active game sessions in memory
 */
export declare class GameStore {
    private games;
    constructor();
    /**
     * Create a new game session
     */
    createGame(gameData: Omit<Game, 'id' | 'createdAt' | 'players' | 'chatHistory' | 'npcs' | 'events'>): GameState;
    /**
     * Get a game by ID
     */
    getGame(gameId: string): GameState | undefined;
    /**
     * Delete a game by ID
     */
    deleteGame(gameId: string): boolean;
    /**
     * Get all active games
     */
    getAllGames(): GameState[];
    /**
     * Add a player to a specific game
     */
    addPlayerToGame(gameId: string, player: Player): void;
    /**
     * Remove a player from a specific game
     */
    removePlayerFromGame(gameId: string, playerId: string): void;
    /**
     * Add a chat message to a specific game
     */
    addChatMessageToGame(gameId: string, message: ChatMessage): void;
    /**
     * Add an NPC to a specific game
     */
    addNPCToGame(gameId: string, npc: NPC): void;
    /**
     * Remove an NPC from a specific game
     */
    removeNPCFromGame(gameId: string, npcId: string): void;
    /**
     * Add an event to a specific game
     */
    addEventToGame(gameId: string, event: Event): void;
    /**
     * Remove an event from a specific game
     */
    removeEventFromGame(gameId: string, eventId: string): void;
    /**
     * Clean up empty games (older than specified time)
     */
    cleanupEmptyGames(olderThanMs?: number): number;
    /**
     * Get total number of active games
     */
    getGameCount(): number;
    /**
     * Get game name by ID (helper for logging)
     */
    private getGameName;
}
//# sourceMappingURL=store.d.ts.map