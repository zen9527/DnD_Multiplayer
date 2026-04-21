import type { Game, Player, ChatMessage, NPC, Event } from '../types/index.js';
/**
 * Manages the runtime state of a single game session
 */
export declare class GameState {
    private _game;
    constructor(gameData: Omit<Game, 'createdAt'>);
    get game(): Game;
    get id(): string;
    get name(): string;
    get maxPlayers(): number;
    get players(): Player[];
    get chatHistory(): ChatMessage[];
    get npcs(): NPC[];
    get events(): Event[];
    /**
     * Add a player to the game
     * @throws Error if game is full or player already exists
     */
    addPlayer(player: Player): void;
    /**
     * Remove a player from the game
     * @throws Error if player not found
     */
    removePlayer(playerId: string): void;
    /**
     * Get a player by ID
     */
    getPlayer(playerId: string): Player | undefined;
    /**
     * Add a chat message to the history
     */
    addChatMessage(message: ChatMessage): void;
    /**
     * Add an NPC to the game
     */
    addNPC(npc: NPC): void;
    /**
     * Remove an NPC from the game
     */
    removeNPC(npcId: string): void;
    /**
     * Add an event to the game
     */
    addEvent(event: Event): void;
    /**
     * Remove an event from the game
     */
    removeEvent(eventId: string): void;
    /**
     * Check if game has players
     */
    isEmpty(): boolean;
    /**
     * Get player count
     */
    getPlayerCount(): number;
}
//# sourceMappingURL=state.d.ts.map