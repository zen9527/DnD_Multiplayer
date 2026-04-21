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
// WebSocket Setup
// ============================================================================

import { WebSocketManager } from './websocket/manager.js';

const wsManager = new WebSocketManager(server);

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
  console.log('Shutting down WebSocket connections...');
  wsManager.shutdown();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
