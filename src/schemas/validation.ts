import { z } from 'zod';

// ============================================================================
// Input Validation Schemas
// ============================================================================

export const createGameSchema = z.object({
  gameName: z.string().min(1, 'Game name is required').max(100, 'Game name too long'),
  maxPlayers: z.number().int().min(2, 'Minimum 2 players').max(8, 'Maximum 8 players'),
});

export const joinGameSchema = z.object({
  gameId: z.string().min(1, 'Game ID is required'),
  playerName: z.string().min(1, 'Player name is required').max(50, 'Name too long'),
  characterName: z.string().min(1, 'Character name is required').max(100, 'Character name too long'),
});

export const chatMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
  type: z.enum(['text', 'roll', 'npc', 'event']).optional(),
});

export const diceRollSchema = z.object({
  diceType: z.enum(['4', '6', '8', '10', '12', '20']).transform((val) => parseInt(val)),
  count: z.number().int().min(1, 'At least 1 die').max(10, 'Maximum 10 dice'),
  modifier: z.number().optional(),
});

export const npcSchema = z.object({
  name: z.string().min(1, 'NPC name is required').max(100, 'Name too long'),
  description: z.string().optional(),
  role: z.enum(['friendly', 'neutral', 'hostile']),
});

export const eventSchema = z.object({
  title: z.string().min(1, 'Event title is required').max(100, 'Title too long'),
  description: z.string().optional(),
});

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

export type CreateGameInput = z.infer<typeof createGameSchema>;
export type JoinGameInput = z.infer<typeof joinGameSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type DiceRollInput = z.infer<typeof diceRollSchema>;
export type NPCCreateInput = z.infer<typeof npcSchema>;
export type EventCreateInput = z.infer<typeof eventSchema>;

// ============================================================================
// Validation Helper
// ============================================================================

/**
 * Safely validate data against a schema
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns { success: boolean, data?: T, error?: string }
 */
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    // Flatten errors to get a readable message
    const errors = result.error.flatten();
    const messages = Object.values(errors.fieldErrors)
      .flat()
      .join('; ');
    
    return { 
      success: false, 
      error: messages || 'Validation failed' 
    };
  }
}
