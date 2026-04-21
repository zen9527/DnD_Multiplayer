// ============================================================================
// DnD Offline Multiplayer - Game Lifecycle Handlers
// ============================================================================
import { safeValidate, createGameSchema, joinGameSchema } from '../../schemas/validation.js';
import { gameStore } from '../manager.js';
import { generateId } from '../../utils/id.js';
/**
 * Handle CREATE_GAME message
 */
export function handleCreateGame(ws, payload) {
    const validation = safeValidate(createGameSchema, payload);
    if (!validation.success) {
        console.log('[GameHandler] Validation failed:', validation.error);
        ws.send(JSON.stringify({
            type: 'ERROR',
            payload: { message: validation.error },
        }));
        return;
    }
    try {
        const game = gameStore.createGame({
            name: validation.data.gameName,
            maxPlayers: validation.data.maxPlayers,
        });
        // Add creator as first player (DM)
        const dmPlayer = {
            id: generateId(),
            name: payload.playerName || 'DM',
            characterName: payload.characterName || 'Dungeon Master',
            isDM: true,
        };
        game.addPlayer(dmPlayer);
        // Send confirmation to creator
        ws.send(JSON.stringify({
            type: 'GAME_CREATED',
            payload: {
                gameId: game.id,
                game: game.game,
            },
        }));
        console.log(`[GameHandler] Game created successfully: ${game.id}`);
    }
    catch (error) {
        console.error('[GameHandler] Failed to create game:', error);
        ws.send(JSON.stringify({
            type: 'ERROR',
            payload: { message: 'Failed to create game' },
        }));
    }
}
/**
 * Handle JOIN_GAME message
 */
export function handleJoinGame(ws, connectionId, payload) {
    const validation = safeValidate(joinGameSchema, payload);
    if (!validation.success) {
        console.log('[GameHandler] Validation failed:', validation.error);
        ws.send(JSON.stringify({
            type: 'ERROR',
            payload: { message: validation.error },
        }));
        return;
    }
    try {
        const game = gameStore.getGame(validation.data.gameId);
        if (!game) {
            ws.send(JSON.stringify({
                type: 'ERROR',
                payload: { message: 'Game not found' },
            }));
            return;
        }
        // Create new player
        const newPlayer = {
            id: generateId(),
            name: validation.data.playerName,
            characterName: validation.data.characterName,
            isDM: false,
        };
        game.addPlayer(newPlayer);
        // Broadcast to all players in the game
        ws.send(JSON.stringify({
            type: 'PLAYER_JOINED',
            payload: {
                gameId: game.id,
                player: newPlayer,
                gameState: game.game,
            },
        }));
        console.log(`[GameHandler] Player joined game: ${newPlayer.name} -> ${game.id}`);
    }
    catch (error) {
        console.error('[GameHandler] Failed to join game:', error);
        ws.send(JSON.stringify({
            type: 'ERROR',
            payload: { message: 'Failed to join game' },
        }));
    }
}
//# sourceMappingURL=game.js.map