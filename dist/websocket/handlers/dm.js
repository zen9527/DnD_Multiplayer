// ============================================================================
// DnD Offline Multiplayer - DM-Specific Handlers
// ============================================================================
import { safeValidate, npcSchema, eventSchema } from '../../schemas/validation.js';
import { gameStore } from '../manager.js';
import { generateId } from '../../utils/id.js';
/**
 * Handle NPC_CREATE message (DM only)
 */
export function handleNPCCreate(ws, connectionId, payload) {
    const validation = safeValidate(npcSchema, payload);
    if (!validation.success) {
        console.log('[DMHandler] NPC validation failed:', validation.error);
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
        // Verify player is DM (simplified - in production, check player.isDM)
        const player = game.getPlayer(payload.playerId);
        if (!player?.isDM) {
            ws.send(JSON.stringify({
                type: 'ERROR',
                payload: { message: 'Only DM can create NPCs' },
            }));
            return;
        }
        // Create NPC
        const npc = {
            id: generateId(),
            name: validation.data.name,
            description: validation.data.description || '',
            role: validation.data.role,
            createdBy: payload.playerId,
            createdAt: Date.now(),
        };
        gameStore.addNPCToGame(game.id, npc);
        // Broadcast to all players
        ws.send(JSON.stringify({
            type: 'NPC_CREATED',
            payload: {
                gameId: game.id,
                npc,
            },
        }));
        console.log(`[DMHandler] NPC created: "${npc.name}" in game ${game.id}`);
    }
    catch (error) {
        console.error('[DMHandler] Failed to create NPC:', error);
        ws.send(JSON.stringify({
            type: 'ERROR',
            payload: { message: 'Failed to create NPC' },
        }));
    }
}
/**
 * Handle EVENT_CREATE message (DM only)
 */
export function handleEventCreate(ws, connectionId, payload) {
    const validation = safeValidate(eventSchema, payload);
    if (!validation.success) {
        console.log('[DMHandler] Event validation failed:', validation.error);
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
        // Verify player is DM
        const player = game.getPlayer(payload.playerId);
        if (!player?.isDM) {
            ws.send(JSON.stringify({
                type: 'ERROR',
                payload: { message: 'Only DM can create events' },
            }));
            return;
        }
        // Create event
        const event = {
            id: generateId(),
            title: validation.data.title,
            description: validation.data.description || '',
            createdBy: payload.playerId,
            createdAt: Date.now(),
        };
        gameStore.addEventToGame(game.id, event);
        // Broadcast to all players
        ws.send(JSON.stringify({
            type: 'EVENT_CREATED',
            payload: {
                gameId: game.id,
                event,
            },
        }));
        console.log(`[DMHandler] Event created: "${event.title}" in game ${game.id}`);
    }
    catch (error) {
        console.error('[DMHandler] Failed to create event:', error);
        ws.send(JSON.stringify({
            type: 'ERROR',
            payload: { message: 'Failed to create event' },
        }));
    }
}
//# sourceMappingURL=dm.js.map