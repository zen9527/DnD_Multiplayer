import type { WebSocket } from 'ws';
import type { DiceRollPayload } from '../../types/index.js';
/**
 * Handle DICE_ROLL message (server-side rolling)
 */
export declare function handleDiceRoll(ws: WebSocket, connectionId: string, payload: DiceRollPayload & {
    gameId: string;
    playerId: string;
    playerName: string;
    characterName: string;
}): void;
//# sourceMappingURL=dice.d.ts.map