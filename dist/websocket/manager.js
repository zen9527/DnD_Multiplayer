// ============================================================================
// DnD Offline Multiplayer - WebSocket Connection Manager
// ============================================================================
import { WebSocket, WebSocketServer } from 'ws';
import { GameStore } from '../game/store.js';
import { handleCreateGame, handleJoinGame } from './handlers/game.js';
import { handleChatMessage } from './handlers/chat.js';
import { handleDiceRoll } from './handlers/dice.js';
import { handleNPCCreate, handleEventCreate } from './handlers/dm.js';
/**
 * Global Game Store Instance
 */
export const gameStore = new GameStore();
/**
 * Manages WebSocket connections and message routing
 */
export class WebSocketManager {
    wss;
    clients; // ws -> connectionId
    nextConnectionId;
    constructor(server) {
        this.wss = new WebSocketServer({ server });
        this.clients = new Map();
        this.nextConnectionId = 1;
        this.initialize();
    }
    /**
     * Initialize WebSocket server event handlers
     */
    initialize() {
        this.wss.on('connection', (ws, req) => {
            const connectionId = `conn_${this.nextConnectionId++}`;
            this.clients.set(ws, connectionId);
            console.log(`[WebSocket] Client connected (${connectionId})`);
            ws.on('message', (data) => {
                this.handleMessage(ws, connectionId, data);
            });
            ws.on('close', () => {
                console.log(`[WebSocket] Client disconnected (${connectionId})`);
                this.clients.delete(ws);
            });
            ws.on('error', (error) => {
                console.error(`[WebSocket] Error for ${connectionId}:`, error.message);
            });
            // Send connection confirmation
            this.send(ws, 'GAME_STATE', {
                connectionId,
                message: 'Connected to DnD server'
            });
        });
        console.log('[WebSocket] WebSocket server initialized');
    }
    /**
     * Handle incoming WebSocket messages
     */
    handleMessage(ws, connectionId, data) {
        try {
            const message = JSON.parse(data.toString());
            console.log(`[WebSocket] Received ${message.type} from ${connectionId}`);
            // Route to appropriate handler synchronously
            this.routeMessage(ws, connectionId, message);
        }
        catch (error) {
            console.error('[WebSocket] Failed to parse message:', error);
            this.sendError(ws, 'Invalid message format');
        }
    }
    /**
     * Route message to appropriate handler (synchronous dispatch)
     */
    routeMessage(ws, connectionId, message) {
        const payload = message.payload;
        switch (message.type) {
            case 'CREATE_GAME':
                handleCreateGame(ws, payload);
                break;
            case 'JOIN_GAME':
                handleJoinGame(ws, connectionId, payload);
                break;
            case 'CHAT_MESSAGE':
                handleChatMessage(ws, connectionId, payload);
                break;
            case 'DICE_ROLL':
                handleDiceRoll(ws, connectionId, payload);
                break;
            case 'NPC_CREATE':
                handleNPCCreate(ws, connectionId, payload);
                break;
            case 'EVENT_CREATE':
                handleEventCreate(ws, connectionId, payload);
                break;
            default:
                console.log(`[WebSocket] Unknown message type: ${message.type}`);
                this.sendError(ws, `Unknown message type: ${message.type}`);
        }
    }
    /**
     * Send a message to a specific client
     */
    send(ws, type, payload) {
        if (ws.readyState === WebSocket.OPEN) {
            const message = { type, payload };
            ws.send(JSON.stringify(message));
        }
        else {
            console.log('[WebSocket] Cannot send - connection not open');
        }
    }
    /**
     * Broadcast a message to all connected clients
     */
    broadcast(type, payload, excludeWs) {
        this.clients.forEach((_, ws) => {
            if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
                const message = { type, payload };
                ws.send(JSON.stringify(message));
            }
        });
    }
    /**
     * Send error message to client
     */
    sendError(ws, errorMessage) {
        this.send(ws, 'ERROR', { message: errorMessage });
    }
    /**
     * Get connection ID for a WebSocket
     */
    getConnectionId(ws) {
        return this.clients.get(ws);
    }
    /**
     * Get total number of connected clients
     */
    getClientCount() {
        return this.clients.size;
    }
    /**
     * Close all connections and shutdown
     */
    shutdown() {
        console.log('[WebSocket] Shutting down...');
        this.clients.forEach((connectionId, ws) => {
            console.log(`[WebSocket] Closing connection ${connectionId}`);
            ws.close();
        });
        this.wss.close(() => {
            console.log('[WebSocket] WebSocket server closed');
        });
    }
}
//# sourceMappingURL=manager.js.map