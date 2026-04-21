// ============================================================================
// DnD Offline Multiplayer - WebSocket Connection Manager
// ============================================================================

import { WebSocket, WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { MessageType, WebSocketMessage } from '../types/index.js';
import { GameStore } from '../game/store.js';

/**
 * Global Game Store Instance
 */
export const gameStore = new GameStore();

/**
 * Manages WebSocket connections and message routing
 */
export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, string>; // ws -> connectionId
  private nextConnectionId: number;

  constructor(server: any) {
    this.wss = new WebSocketServer({ server });
    this.clients = new Map();
    this.nextConnectionId = 1;

    this.initialize();
  }

  /**
   * Initialize WebSocket server event handlers
   */
  private initialize(): void {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const connectionId = `conn_${this.nextConnectionId++}`;
      this.clients.set(ws, connectionId);

      console.log(`[WebSocket] Client connected (${connectionId})`);

      ws.on('message', (data: Buffer) => {
        this.handleMessage(ws, connectionId, data);
      });

      ws.on('close', () => {
        console.log(`[WebSocket] Client disconnected (${connectionId})`);
        this.clients.delete(ws);
      });

      ws.on('error', (error: Error) => {
        console.error(`[WebSocket] Error for ${connectionId}:`, error.message);
      });

      // Send connection confirmation
      this.send(ws, 'GAME_STATE', { 
        connectionId,
        message: 'Connected to DnD server'
      } as any);
    });

    console.log('[WebSocket] WebSocket server initialized');
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(ws: WebSocket, connectionId: string, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString()) as WebSocketMessage;
      
      console.log(`[WebSocket] Received ${message.type} from ${connectionId}`);

      // Route to appropriate handler (will be implemented in Plan 2 tasks)
      this.routeMessage(ws, connectionId, message);

    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
      this.sendError(ws, 'Invalid message format');
    }
  }

  /**
   * Route message to appropriate handler
   */
  private routeMessage(ws: WebSocket, connectionId: string, message: WebSocketMessage): void {
    // Import handlers dynamically to avoid circular dependencies
    import('./handlers/game.js').then(({ handleCreateGame, handleJoinGame }) => 
      this.handleGameMessages(ws, connectionId, message, { handleCreateGame, handleJoinGame })
    ).then(() => import('./handlers/chat.js'))
      .then(({ handleChatMessage }) => 
        this.handleChatMessages(ws, connectionId, message, { handleChatMessage })
      )
      .then(() => import('./handlers/dice.js'))
      .then(({ handleDiceRoll }) => 
        this.handleDiceMessages(ws, connectionId, message, { handleDiceRoll })
      )
      .then(() => import('./handlers/dm.js'))
      .then(({ handleNPCCreate, handleEventCreate }) => 
        this.handleDMMessages(ws, connectionId, message, { handleNPCCreate, handleEventCreate })
      )
      .catch((error) => {
        console.error('[WebSocket] Handler import error:', error);
        this.sendError(ws, 'Internal server error');
      });
  }

  /**
   * Handle game-related messages (placeholder - will be filled by handlers)
   */
  private handleGameMessages(
    ws: WebSocket, 
    connectionId: string, 
    message: WebSocketMessage,
    handlers: any
  ): void {
    if (message.type === 'CREATE_GAME') {
      handlers.handleCreateGame(ws, message.payload);
    } else if (message.type === 'JOIN_GAME') {
      handlers.handleJoinGame(ws, connectionId, message.payload);
    }
  }

  /**
   * Handle chat-related messages
   */
  private handleChatMessages(
    ws: WebSocket, 
    connectionId: string, 
    message: WebSocketMessage,
    handlers: any
  ): void {
    if (message.type === 'CHAT_MESSAGE') {
      handlers.handleChatMessage(ws, connectionId, message.payload);
    }
  }

  /**
   * Handle dice-related messages
   */
  private handleDiceMessages(
    ws: WebSocket, 
    connectionId: string, 
    message: WebSocketMessage,
    handlers: any
  ): void {
    if (message.type === 'DICE_ROLL') {
      handlers.handleDiceRoll(ws, connectionId, message.payload);
    }
  }

  /**
   * Handle DM-related messages
   */
  private handleDMMessages(
    ws: WebSocket, 
    connectionId: string, 
    message: WebSocketMessage,
    handlers: any
  ): void {
    if (message.type === 'NPC_CREATE') {
      handlers.handleNPCCreate(ws, connectionId, message.payload);
    } else if (message.type === 'EVENT_CREATE') {
      handlers.handleEventCreate(ws, connectionId, message.payload);
    }
  }

  /**
   * Send a message to a specific client
   */
  send(ws: WebSocket, type: MessageType, payload: unknown): void {
    if (ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = { type, payload };
      ws.send(JSON.stringify(message));
    } else {
      console.log('[WebSocket] Cannot send - connection not open');
    }
  }

  /**
   * Broadcast a message to all connected clients
   */
  broadcast(type: MessageType, payload: unknown, excludeWs?: WebSocket): void {
    this.clients.forEach((_, ws) => {
      if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        const message: WebSocketMessage = { type, payload };
        ws.send(JSON.stringify(message));
      }
    });
  }

  /**
   * Send error message to client
   */
  sendError(ws: WebSocket, errorMessage: string): void {
    this.send(ws, 'ERROR', { message: errorMessage });
  }

  /**
   * Get connection ID for a WebSocket
   */
  getConnectionId(ws: WebSocket): string | undefined {
    return this.clients.get(ws);
  }

  /**
   * Get total number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Close all connections and shutdown
   */
  shutdown(): void {
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
