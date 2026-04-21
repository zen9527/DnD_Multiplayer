# Implementer Prompt for DnD MVP Task 2

## Context

You are implementing **Task 2: Shared Validation Schemas** of the DnD Offline Multiplayer game. This task creates a lightweight validation library that can be used by both server and client without external dependencies (Zod-like but zero-dependency).

## Goal

Create `shared/schemas.js` with a validation library that provides type checking, schema builders, and game-specific schemas for players, games, chat messages, dice rolls, and NPCs.

## File to Create

### shared/schemas.js

This file should contain:
1. **ValidationError class** - Custom error with path tracking
2. **Helper functions** - validateType, validateArray, validateObject
3. **Schema builders** - string(), number(), boolean(), enum(), array(), object()
4. **Game-specific schemas** - playerSchema, createGameSchema, chatMessageSchema, diceRollSchema, npcSchema
5. **validate() wrapper function** - Returns { success: true/false, data/error }

## Implementation Requirements

### Core Validation Functions

```javascript
// Error class with path tracking
class ValidationError extends Error {
  constructor(message, path) {
    super(message);
    this.name = 'ValidationError';
    this.path = path;
  }
}

// Type validation helper
function validateType(value, expectedType, path = 'root') { ... }

// Array validation helper  
function validateArray(value, validator, path = 'root') { ... }

// Object validation helper
function validateObject(value, schema, path = 'root') { ... }
```

### Schema Builders

Each builder returns a validation function:

- `string(options)` - options: { min?, max?, optional? }
- `number(options)` - options: { min?, max?, optional? }
- `boolean(options)` - options: { optional? }
- `enum(values, options)` - values array, options: { optional? }
- `array(validator)` - nested validator for items
- `object(schema)` - schema is object of field validators

### Game-Specific Schemas

```javascript
export const playerSchema = object({
  name: string({ min: 1, max: 50 }),
  characterName: string({ min: 1, max: 100 }),
  class: string({ optional: true }),
  level: number({ min: 1, max: 20 }).optional(),
});

export const createGameSchema = object({
  gameName: string({ min: 1, max: 100 }),
  maxPlayers: number({ min: 2, max: 8 }),
});

export const chatMessageSchema = object({
  content: string({ min: 1, max: 2000 }),
  type: enum(['text', 'roll', 'npc', 'event']),
});

export const diceRollSchema = object({
  diceType: enum([4, 6, 8, 10, 12, 20]),
  count: number({ min: 1, max: 10 }),
  modifier: number({ optional: true }),
});

export const npcSchema = object({
  name: string({ min: 1, max: 100 }),
  description: string({ optional: true }),
  role: enum(['friendly', 'neutral', 'hostile']),
});
```

### Validate Wrapper

```javascript
export function validate(schema, data) {
  try {
    schema(data);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, error: error.message };
    }
    throw error;
  }
}
```

### Export Default

```javascript
export default {
  string,
  number,
  boolean,
  enum,
  array,
  object,
  validate,
  playerSchema,
  createGameSchema,
  chatMessageSchema,
  diceRollSchema,
  npcSchema,
};
```

## Steps to Complete

- [ ] **Step 1:** Create `shared/` directory
- [ ] **Step 2:** Write complete `shared/schemas.js` with all code above
- [ ] **Step 3:** Test the module can be imported (create a quick test)

## Testing

Create a simple test to verify validation works:

```javascript
// Quick inline test
import schemas from './shared/schemas.js';

const result = schemas.validate(schemas.playerSchema, {
  name: 'Test Player',
  characterName: 'Aragorn'
});

console.log(result); // Should be { success: true, data: {...} }

const invalidResult = schemas.validate(schemas.playerSchema, {
  name: '', // Invalid - too short
  characterName: 'Aragorn'
});

console.log(invalidResult); // Should be { success: false, error: '...' }
```

Run this test with `node` to verify validation works correctly.

## Acceptance Criteria

- ✅ File created at `shared/schemas.js`
- ✅ All schema builders implemented (string, number, boolean, enum, array, object)
- ✅ All game-specific schemas defined
- ✅ validate() wrapper returns proper { success, data/error } format
- ✅ ValidationError includes path information
- ✅ Module can be imported and used
- ✅ Basic validation tests pass

## Important Notes

- Use ES modules syntax (`import/export`)
- No external dependencies - pure JavaScript
- Validation errors should include the field path for debugging
- Optional fields should not throw errors when undefined
- All game schemas must match exactly what's specified in Task 3 (server) and later tasks (client)

## Questions?

If anything is unclear about validation behavior, error formatting, or schema structure, ask before proceeding.
