// ============================================================================
// DnD Offline Multiplayer - WebSocket Connection Manager
// ============================================================================

import { WebSocket, WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { MessageType, WebSocketMessage } from '../types/index.js';
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

      // Route to appropriate handler synchronously
      this.routeMessage(ws, connectionId, message);

    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
      this.sendError(ws, 'Invalid message format');
    }
  }

  /**
   * Route message to appropriate handler (synchronous dispatch)
   */
  private routeMessage(ws: WebSocket, connectionId: string, message: WebSocketMessage): void {
    const payload = message.payload;
    
    switch (message.type) {
      case 'CREATE_GAME':
        handleCreateGame(ws, payload as any);
        break;
      case 'JOIN_GAME':
        handleJoinGame(ws, connectionId, payload as any);
        break;
      case 'CHAT_MESSAGE':
        handleChatMessage(ws, connectionId, payload as any);
        break;
      case 'DICE_ROLL':
        handleDiceRoll(ws, connectionId, payload as any);
        break;
      case 'NPC_CREATE':
        handleNPCCreate(ws, connectionId, payload as any);
        break;
      case 'EVENT_CREATE':
        handleEventCreate(ws, connectionId, payload as any);
        break;
      default:
        console.log(`[WebSocket] Unknown message type: ${message.type}`);
        this.sendError(ws, `Unknown message type: ${message.type}`);
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
