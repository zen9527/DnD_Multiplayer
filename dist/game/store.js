// ============================================================================
// DnD Offline Multiplayer - Global Game Storage
// ============================================================================
import { GameState } from './state.js';
import { generateGameId } from '../utils/id.js';
/**
 * Manages all active game sessions in memory
 */
export class GameStore {
    games;
    constructor() {
        this.games = new Map();
    }
    // ============================================================================
    // Game Lifecycle
    // ============================================================================
    /**
     * Create a new game session
     */
    createGame(gameData) {
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
    getGame(gameId) {
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
    deleteGame(gameId) {
        const deleted = this.games.delete(gameId);
        if (deleted) {
            console.log(`[GameStore] Deleted game: ${gameId}`);
        }
        else {
            console.log(`[GameStore] Game not found for deletion: ${gameId}`);
        }
        return deleted;
    }
    /**
     * Get all active games
     */
    getAllGames() {
        return Array.from(this.games.values());
    }
    // ============================================================================
    // Player Operations (delegated to GameState)
    // ============================================================================
    /**
     * Add a player to a specific game
     */
    addPlayerToGame(gameId, player) {
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
    removePlayerFromGame(gameId, playerId) {
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
    addChatMessageToGame(gameId, message) {
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
    addNPCToGame(gameId, npc) {
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
    removeNPCFromGame(gameId, npcId) {
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
    addEventToGame(gameId, event) {
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
    removeEventFromGame(gameId, eventId) {
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
    cleanupEmptyGames(olderThanMs = 3600000) {
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
    getGameCount() {
        return this.games.size;
    }
    // ============================================================================
    // Helper Methods
    // ============================================================================
    /**
     * Get game name by ID (helper for logging)
     */
    getGameName(gameId) {
        const game = this.getGame(gameId);
        return game ? game.name : 'Unknown';
    }
}
//# sourceMappingURL=store.js.map