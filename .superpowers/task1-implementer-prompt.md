# Implementer Prompt for DnD MVP Task 1

## Context

You are implementing **Task 1: Project Setup and Dependencies** of the DnD Offline Multiplayer game. This is the foundation task that sets up the Node.js project structure.

## Goal

Create the basic project configuration files needed to run a Node.js WebSocket server with Express.

## Files to Create

### 1. package.json
```json
{
  "name": "dnd-offline-multiplayer",
  "version": "0.1.0",
  "description": "Offline multiplayer D&D game with DM-hosted server and LLM assistance",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.14.2",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

**Note:** Added `"type": "module"` to enable ES modules (import/export syntax).

### 2. .env.example
```env
# Server configuration
PORT=3000
HOST=0.0.0.0

# LM Studio configuration (optional)
LM_STUDIO_URL=http://localhost:1234/v1/chat/completions

# Session secret for future auth (placeholder)
SESSION_SECRET=change-this-in-production
```

### 3. .gitignore
```
node_modules/
.env
*.log
.DS_Store
```

## Steps to Complete

- [ ] **Step 1:** Create `package.json` with the exact content above
- [ ] **Step 2:** Create `.env.example` with the exact content above  
- [ ] **Step 3:** Create `.gitignore` with the exact content above
- [ ] **Step 4:** Run `npm install` to install all dependencies
- [ ] **Step 5:** Verify installation by checking that `node_modules/` folder exists

## Testing

After completing:
1. Run `npm start` - should show error about missing server.js (expected, we'll create it in Task 3)
2. Server should attempt to start but fail gracefully with module not found error

## Acceptance Criteria

- ✅ All three files created with exact content specified
- ✅ `npm install` completes successfully
- ✅ Dependencies installed: express, ws, dotenv, nodemon
- ✅ Can run `npm start` (even if it fails due to missing server.js)

## Important Notes

- Work in the root directory: `/C:/Users/Flex/Desktop/Codes/DnD/`
- Use ES modules syntax (`import/export`) - not CommonJS
- This task does NOT create the server yet - that's Task 3
- Keep files minimal and focused on setup only

## Questions?

If anything is unclear about file locations, dependencies, or expected behavior, ask before proceeding.
