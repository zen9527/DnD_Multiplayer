import { WebSocket } from 'ws';
import type { MessageType } from '../types/index.js';
import { GameStore } from '../game/store.js';
/**
 * Global Game Store Instance
 */
export declare const gameStore: GameStore;
/**
 * Manages WebSocket connections and message routing
 */
export declare class WebSocketManager {
    private wss;
    private clients;
    private nextConnectionId;
    constructor(server: any);
    /**
     * Initialize WebSocket server event handlers
     */
    private initialize;
    /**
     * Handle incoming WebSocket messages
     */
    private handleMessage;
    /**
     * Route message to appropriate handler
     */
    private routeMessage;
    /**
     * Handle game-related messages (placeholder - will be filled by handlers)
     */
    private handleGameMessages;
    /**
     * Handle chat-related messages
     */
    private handleChatMessages;
    /**
     * Handle dice-related messages
     */
    private handleDiceMessages;
    /**
     * Handle DM-related messages
     */
    private handleDMMessages;
    /**
     * Send a message to a specific client
     */
    send(ws: WebSocket, type: MessageType, payload: unknown): void;
    /**
     * Broadcast a message to all connected clients
     */
    broadcast(type: MessageType, payload: unknown, excludeWs?: WebSocket): void;
    /**
     * Send error message to client
     */
    sendError(ws: WebSocket, errorMessage: string): void;
    /**
     * Get connection ID for a WebSocket
     */
    getConnectionId(ws: WebSocket): string | undefined;
    /**
     * Get total number of connected clients
     */
    getClientCount(): number;
    /**
     * Close all connections and shutdown
     */
    shutdown(): void;
}
//# sourceMappingURL=manager.d.ts.map