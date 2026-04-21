// ============================================================================
// Shared Types and Schemas for Frontend
// ============================================================================

// Re-export types from backend (these are just type definitions, no runtime cost)
export type {
  Player,
  ChatMessage,
  NPC,
  Event,
  Game,
  MessageType,
  WebSocketMessage,
  CreateGamePayload,
  JoinGamePayload,
  ChatMessagePayload,
  DiceRollPayload,
  DiceRollResult,
  NPCCreatePayload,
  EventCreatePayload,
} from '../src/types/index.js';

// Re-export Zod schemas (these work in both Node.js and browser)
export {
  createGameSchema,
  joinGameSchema,
  chatMessageSchema,
  diceRollSchema,
  npcSchema,
  eventSchema,
  safeValidate,
} from '../src/schemas/validation.js';

// Type imports (inferred from schemas)
export type {
  CreateGameInput,
  JoinGameInput,
  ChatMessageInput,
  DiceRollInput,
  NPCCreateInput,
  EventCreateInput,
} from '../src/schemas/validation.js';
