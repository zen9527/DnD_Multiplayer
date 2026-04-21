// ============================================================================
// Core Game Types
// ============================================================================

export interface Player {
  id: string;
  name: string;
  characterName: string;
  isDM: boolean;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  characterName: string;
  content: string;
  type: 'text' | 'roll' | 'npc' | 'event';
  timestamp: number;
}

export interface NPC {
  id: string;
  name: string;
  description: string;
  role: 'friendly' | 'neutral' | 'hostile';
  createdBy: string;
  createdAt: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: number;
}

export interface Game {
  id: string;
  name: string;
  maxPlayers: number;
  players: Player[];
  chatHistory: ChatMessage[];
  npcs: NPC[];
  events: Event[];
  createdAt: number;
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

export type MessageType = 
  // Client → Server
  | 'CREATE_GAME'
  | 'JOIN_GAME'
  | 'CHAT_MESSAGE'
  | 'DICE_ROLL'
  | 'NPC_CREATE'
  | 'EVENT_CREATE'
  // Server → Client
  | 'GAME_CREATED'
  | 'GAME_STATE'
  | 'PLAYER_JOINED'
  | 'PLAYER_LEFT'
  | 'CHAT_MESSAGE'
  | 'DICE_ROLL_RESULT'
  | 'NPC_CREATED'
  | 'EVENT_CREATED'
  | 'ERROR';

export interface WebSocketMessage<T = unknown> {
  type: MessageType;
  payload: T;
}

// ============================================================================
// Message Payload Types
// ============================================================================

export interface CreateGamePayload {
  gameName: string;
  maxPlayers: number;
  playerName?: string;
  characterName?: string;
}

export interface JoinGamePayload {
  gameId: string;
  playerName: string;
  characterName: string;
}

export interface ChatMessagePayload {
  content: string;
  type?: 'text' | 'roll' | 'npc' | 'event';
}

export interface DiceRollPayload {
  diceType: number;
  count: number;
  modifier?: number;
}

export interface DiceRollResult extends Omit<DiceRollPayload, 'diceType'> {
  id: string;
  playerId: string;
  playerName: string;
  characterName: string;
  diceType: number;
  rolls: number[];
  total: number;
  timestamp: number;
}

export interface NPCCreatePayload {
  name: string;
  description?: string;
  role: 'friendly' | 'neutral' | 'hostile';
}

export interface EventCreatePayload {
  title: string;
  description?: string;
}

export interface ErrorMessage {
  message: string;
}

// ============================================================================
// Helper Types
// ============================================================================

export type GameInput = Omit<Game, 'id' | 'createdAt' | 'players' | 'chatHistory' | 'npcs' | 'events'>;
