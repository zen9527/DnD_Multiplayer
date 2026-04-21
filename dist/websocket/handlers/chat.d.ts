import type { WebSocket } from 'ws';
import type { ChatMessagePayload } from '../../types/index.js';
/**
 * Handle CHAT_MESSAGE message
 */
export declare function handleChatMessage(ws: WebSocket, connectionId: string, payload: ChatMessagePayload & {
    gameId: string;
    playerId: string;
    playerName: string;
    characterName: string;
}): void;
//# sourceMappingURL=chat.d.ts.map