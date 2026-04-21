import type { WebSocket } from 'ws';
import type { NPCCreatePayload, EventCreatePayload } from '../../types/index.js';
/**
 * Handle NPC_CREATE message (DM only)
 */
export declare function handleNPCCreate(ws: WebSocket, connectionId: string, payload: NPCCreatePayload & {
    gameId: string;
    playerId: string;
}): void;
/**
 * Handle EVENT_CREATE message (DM only)
 */
export declare function handleEventCreate(ws: WebSocket, connectionId: string, payload: EventCreatePayload & {
    gameId: string;
    playerId: string;
}): void;
//# sourceMappingURL=dm.d.ts.map