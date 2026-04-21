// ============================================================================
// DnD Offline Multiplayer - Dice Roll Handler
// ============================================================================

import type { WebSocket } from 'ws';
import type { DiceRollPayload, DiceRollResult } from '../../types/index.js';
import { diceRollSchema } from '../../schemas/validation.js';
import { generateId } from '../../utils/id.js';

/**
 * Handle DICE_ROLL message (server-side rolling)
 */
export function handleDiceRoll(
  ws: WebSocket, 
  connectionId: string, 
  payload: DiceRollPayload & { gameId: string; playerId: string; playerName: string; characterName: string }
): void {
  // Convert diceType to string for Zod schema validation (schema expects string enum)
  const payloadForValidation = {
    ...payload,
    diceType: String(payload.diceType),
  };

  try {
    // Validate using Zod directly (bypasses safeValidate type issues with transform)
    const validatedData = diceRollSchema.parse(payloadForValidation);

    // Roll dice server-side (prevents client manipulation)
    const rolls: number[] = [];
    for (let i = 0; i < validatedData.count; i++) {
      const roll = Math.floor(Math.random() * validatedData.diceType) + 1;
      rolls.push(roll);
    }

    // Calculate total with modifier
    const total = rolls.reduce((sum, roll) => sum + roll, 0) + (validatedData.modifier || 0);

    // Create result object
    const result: DiceRollResult = {
      id: generateId(),
      playerId: payload.playerId,
      playerName: payload.playerName,
      characterName: payload.characterName,
      diceType: validatedData.diceType,
      count: validatedData.count,
      rolls,
      total,
      modifier: validatedData.modifier || 0,
      timestamp: Date.now(),
    };

    // Send result back to client
    ws.send(JSON.stringify({
      type: 'DICE_ROLL_RESULT',
      payload: {
        gameId: payload.gameId,
        result,
      },
    }));

    console.log(`[DiceHandler] ${payload.playerName} rolled ${validatedData.count}d${validatedData.diceType}: ${rolls.join(', ')} = ${total}`);

  } catch (error) {
    if (error instanceof Error) {
      console.error('[DiceHandler] Validation failed:', error.message);
      ws.send(JSON.stringify({
        type: 'ERROR',
        payload: { message: `Validation failed: ${error.message}` },
      }));
    } else {
      console.error('[DiceHandler] Failed to roll dice:', error);
      ws.send(JSON.stringify({
        type: 'ERROR',
        payload: { message: 'Failed to roll dice' },
      }));
    }
  }
}
