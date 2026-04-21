# DnD Offline Multiplayer Refactor - Plan 1: Infrastructure

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up TypeScript + Vite project structure with shared Zod schemas and type definitions.

**Architecture:** Create a clean project skeleton with proper TypeScript configuration for both backend (Node.js) and frontend (browser), plus shared validation schemas using Zod that can be imported by both sides.

**Tech Stack:** Node.js 18+, TypeScript 5.x, Vite 5.x, Zod 3.x, ws, Express

---

## File Structure

```
src/
├── server.ts              # Backend entry point (minimal)
├── types/index.ts         # All TypeScript interfaces
├── schemas/validation.ts  # Zod schemas + type exports
└── utils/id.ts            # ID generation utility

shared/
└── index.ts               # Re-export shared types/schemas for frontend

public/                    # Frontend source (TypeScript)
├── index.html
├── css/style.css
└── js/
    ├── app.ts
    ├── websocket.ts
    ├── game-state.ts
    ├── dm-panel.ts
    └── llm-client.ts

Config files:
├── package.json           # Updated with scripts
├── tsconfig.json          # TypeScript config (backend)
├── tsconfig.frontend.json # TypeScript config (frontend)
└── vite.config.ts         # Vite build config
```

---

## Task Decomposition

### Task 1: Project Configuration Files

**Files:**
- Create: `tsconfig.json`
- Create: `tsconfig.frontend.json`
- Create: `vite.config.ts`
- Modify: `package.json` (add scripts and dependencies)

- [ ] **Step 1.1: Write tsconfig.json (backend)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 1.2: Write tsconfig.frontend.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["public/js"],
  "references": [{ "path": "./tsconfig.json" }]
}
```

- [ ] **Step 1.3: Write vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'public',
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
```

- [ ] **Step 1.4: Update package.json**

```json
{
  "name": "dnd-offline-multiplayer",
  "version": "0.1.0",
  "description": "Offline multiplayer D&D game with DM-hosted server and LLM assistance",
  "type": "module",
  "main": "dist/server.js",
  "scripts": {
    "build:backend": "tsc",
    "build:frontend": "vite build",
    "build": "npm run build:backend && npm run build:frontend",
    "dev:backend": "tsc --watch",
    "start": "node dist/server.js",
    "dev": "concurrently \"npm run dev:backend\" \"vite\""
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.14.2",
    "dotenv": "^16.3.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "@types/ws": "^8.5.10",
    "concurrently": "^8.2.2",
    "typescript": "^5.3.2",
    "vite": "^5.0.8"
  }
}
```

- [ ] **Step 1.5: Install dependencies**

Run: `npm install`
Expected: All dependencies installed successfully, including zod and TypeScript

---

### Task 2: Type Definitions

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 2.1: Write type definitions**

```typescript
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
```

---

### Task 3: Zod Validation Schemas

**Files:**
- Create: `src/schemas/validation.ts`

- [ ] **Step 3.1: Write Zod schemas with type exports**

```typescript
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
```

---

### Task 4: Utility Functions

**Files:**
- Create: `src/utils/id.ts`

- [ ] **Step 4.1: Write ID generation utility**

```typescript
/**
 * Generate a unique ID using timestamp + random string
 * @returns Unique identifier string
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `${timestamp}${randomPart}`;
}

/**
 * Generate a short, readable game ID (e.g., "abc123")
 * @returns Short unique ID
 */
export function generateGameId(): string {
  return Math.random().toString(36).substring(2, 8);
}
```

---

### Task 5: Shared Module Export

**Files:**
- Create: `shared/index.ts`

- [ ] **Step 5.1: Write shared module re-exports**

```typescript
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
} from '../src/types';

// Re-export Zod schemas (these work in both Node.js and browser)
export {
  createGameSchema,
  joinGameSchema,
  chatMessageSchema,
  diceRollSchema,
  npcSchema,
  eventSchema,
  safeValidate,
} from '../src/schemas/validation';

// Type exports
export type {
  CreateGameInput,
  JoinGameInput,
  ChatMessageInput,
  DiceRollInput,
  NPCCreateInput,
  EventCreateInput,
} from '../src/schemas/validation';
```

---

### Task 6: Backend Entry Point (Skeleton)

**Files:**
- Create: `src/server.ts`

- [ ] **Step 6.1: Write minimal server entry point**

```typescript
// ============================================================================
// DnD Offline Multiplayer - Server Entry Point
// ============================================================================

import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Express Setup (Static Files Only for Now)
// ============================================================================

const app = express();
const server = createServer(app);

// Serve static files from dist/public (built frontend)
app.use(express.static(path.join(__dirname, '../dist/public')));

// API routes will be added later
app.use('/api', express.json());

// ============================================================================
// WebSocket Setup (Placeholder for now)
// ============================================================================

// TODO: Import and initialize WebSocket manager in Plan 2

// ============================================================================
// Server Startup
// ============================================================================

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, () => {
  console.log(`============================================`);
  console.log(`DnD Game Server running at http://${HOST}:${PORT}`);
  console.log(`TypeScript build: dist/`);
  console.log(`Press Ctrl+C to stop`);
  console.log(`============================================`);
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
```

---

### Task 7: Frontend HTML Entry Point

**Files:**
- Modify: `public/index.html` (update script type)

- [ ] **Step 7.1: Update index.html for Vite**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DnD Offline Multiplayer</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <div id="app"></div>

  <script type="module" src="/js/app.ts"></script>
</body>
</html>
```

---

### Task 8: TypeScript Compilation Test

**Files:**
- No file changes, just verification

- [ ] **Step 8.1: Run backend TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors (all types check out)

- [ ] **Step 8.2: Verify project structure**

Run: `ls -la src/ shared/ public/js/`
Expected: All files created as specified

---

## Acceptance Criteria for Plan 1

✅ **Configuration**
- `tsconfig.json` and `tsconfig.frontend.json` created
- `vite.config.ts` configured correctly
- `package.json` updated with all scripts and dependencies

✅ **Type System**
- All game types defined in `src/types/index.ts`
- TypeScript compiles without errors (`tsc --noEmit`)

✅ **Validation Layer**
- Zod schemas created in `src/schemas/validation.ts`
- Types inferred correctly from schemas
- Shared module exports work for frontend

✅ **Project Structure**
- Backend skeleton (`src/server.ts`) compiles and runs
- Frontend structure ready for TypeScript migration
- All utility functions implemented

---

## Testing Plan 1

```bash
# 1. Install dependencies
npm install

# 2. Check backend types
npx tsc --noEmit

# 3. Try building frontend (will fail until app.ts exists, but config should work)
npm run build:frontend

# 4. Start server (should show "Server running" message)
npm start
```

Expected: Server starts and shows startup message on http://localhost:3000

---

**Plan 1 Complete:** This plan produces a working TypeScript project skeleton with shared types and schemas, ready for Plan 2 (WebSocket implementation).
