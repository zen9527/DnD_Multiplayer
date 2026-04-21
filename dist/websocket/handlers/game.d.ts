import type { WebSocket } from 'ws';
import type { CreateGamePayload, JoinGamePayload } from '../../types/index.js';
/**
 * Handle CREATE_GAME message
 */
export declare function handleCreateGame(ws: WebSocket, payload: CreateGamePayload): void;
/**
 * Handle JOIN_GAME message
 */
export declare function handleJoinGame(ws: WebSocket, connectionId: string, payload: JoinGamePayload): void;
//# sourceMappingURL=game.d.ts.map