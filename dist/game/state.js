// ============================================================================
// DnD Offline Multiplayer - Single Game Runtime State
// ============================================================================
/**
 * Manages the runtime state of a single game session
 */
export class GameState {
    _game;
    constructor(gameData) {
        this._game = {
            ...gameData,
            createdAt: Date.now(),
        };
    }
    // ============================================================================
    // Getters (read-only access to game data)
    // ============================================================================
    get game() {
        // Return a deep copy to prevent external mutation
        return JSON.parse(JSON.stringify(this._game));
    }
    get id() {
        return this._game.id;
    }
    get name() {
        return this._game.name;
    }
    get maxPlayers() {
        return this._game.maxPlayers;
    }
    get players() {
        return [...this._game.players];
    }
    get chatHistory() {
        return [...this._game.chatHistory];
    }
    get npcs() {
        return [...this._game.npcs];
    }
    get events() {
        return [...this._game.events];
    }
    // ============================================================================
    // Player Management
    // ============================================================================
    /**
     * Add a player to the game
     * @throws Error if game is full or player already exists
     */
    addPlayer(player) {
        if (this._game.players.length >= this._game.maxPlayers) {
            throw new Error('Game is full');
        }
        if (this._game.players.some((p) => p.id === player.id)) {
            throw new Error('Player already in game');
        }
        this._game.players.push(player);
    }
    /**
     * Remove a player from the game
     * @throws Error if player not found
     */
    removePlayer(playerId) {
        const index = this._game.players.findIndex((p) => p.id === playerId);
        if (index === -1) {
            throw new Error('Player not found');
        }
        this._game.players.splice(index, 1);
    }
    /**
     * Get a player by ID
     */
    getPlayer(playerId) {
        return this._game.players.find((p) => p.id === playerId);
    }
    // ============================================================================
    // Chat Management
    // ============================================================================
    /**
     * Add a chat message to the history
     */
    addChatMessage(message) {
        this._game.chatHistory.push(message);
        // Keep only last 100 messages to prevent memory bloat
        if (this._game.chatHistory.length > 100) {
            this._game.chatHistory.shift();
        }
    }
    // ============================================================================
    // NPC Management
    // ============================================================================
    /**
     * Add an NPC to the game
     */
    addNPC(npc) {
        this._game.npcs.push(npc);
    }
    /**
     * Remove an NPC from the game
     */
    removeNPC(npcId) {
        const index = this._game.npcs.findIndex((n) => n.id === npcId);
        if (index !== -1) {
            this._game.npcs.splice(index, 1);
        }
    }
    // ============================================================================
    // Event Management
    // ============================================================================
    /**
     * Add an event to the game
     */
    addEvent(event) {
        this._game.events.push(event);
    }
    /**
     * Remove an event from the game
     */
    removeEvent(eventId) {
        const index = this._game.events.findIndex((e) => e.id === eventId);
        if (index !== -1) {
            this._game.events.splice(index, 1);
        }
    }
    // ============================================================================
    // Utility Methods
    // ============================================================================
    /**
     * Check if game has players
     */
    isEmpty() {
        return this._game.players.length === 0;
    }
    /**
     * Get player count
     */
    getPlayerCount() {
        return this._game.players.length;
    }
}
//# sourceMappingURL=state.js.map