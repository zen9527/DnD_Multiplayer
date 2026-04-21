// ============================================================================
// DnD Offline Multiplayer - Chat Message Handler
// ============================================================================

import type { WebSocket } from 'ws';
import type { ChatMessagePayload } from '../../types/index.js';
import { safeValidate, chatMessageSchema } from '../../schemas/validation.js';
import { gameStore } from '../manager.js';
import { generateId } from '../../utils/id.js';

/**
 * Handle CHAT_MESSAGE message
 */
export function handleChatMessage(
  ws: WebSocket, 
  connectionId: string, 
  payload: ChatMessagePayload & { gameId: string; playerId: string; playerName: string; characterName: string }
): void {
  const validation = safeValidate(chatMessageSchema, payload);

  if (!validation.success) {
    console.log('[ChatHandler] Validation failed:', validation.error);
    ws.send(JSON.stringify({
      type: 'ERROR',
      payload: { message: validation.error },
    }));
    return;
  }

  try {
    const game = gameStore.getGame(payload.gameId);

    if (!game) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        payload: { message: 'Game not found' },
      }));
      return;
    }

    // Create chat message
    const message = {
      id: generateId(),
      playerId: payload.playerId,
      playerName: payload.playerName,
      characterName: payload.characterName,
      content: validation.data.content,
      type: validation.data.type || 'text',
      timestamp: Date.now(),
    };

    // Add to game state
    gameStore.addChatMessageToGame(game.id, message);

    // Broadcast to all players in the game
    ws.send(JSON.stringify({
      type: 'CHAT_MESSAGE',
      payload: {
        gameId: game.id,
        message,
      },
    }));

    console.log(`[ChatHandler] Message from ${payload.playerName}: "${validation.data.content.substring(0, 30)}..."`);

  } catch (error) {
    console.error('[ChatHandler] Failed to send message:', error);
    ws.send(JSON.stringify({
      type: 'ERROR',
      payload: { message: 'Failed to send message' },
    }));
  }
}
