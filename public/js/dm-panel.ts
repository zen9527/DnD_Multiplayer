// ============================================================================
// DnD Offline Multiplayer - DM Control Panel
// ============================================================================

import { wsManager } from './websocket.js';
import { gameState } from './game-state.js';
import type { NPC, Event as EventType } from '../../shared/index.js';

/**
 * DM Control Panel - DM-specific controls for NPCs and events
 */
export default class DMPanel {
  private element: HTMLElement | null = null;

  constructor() {
    this.element = document.getElementById('dm-panel');
    if (!this.element) return;
    
    this.initUI();
    this.setupEventListeners();
  }

  private initUI(): void {
    if (!this.element) return;

    this.element.innerHTML = `
      <div class="dm-controls">
        <h3>DM Controls</h3>
        
        <!-- Manual NPC Creation -->
        <div class="manual-section">
          <h4>Create NPC (Manual)</h4>
          <input type="text" id="npc-name" placeholder="Name">
          <textarea id="npc-description" placeholder="Description"></textarea>
          <select id="npc-role">
            <option value="friendly">Friendly</option>
            <option value="neutral">Neutral</option>
            <option value="hostile">Hostile</option>
          </select>
          <button id="create-npc">Create</button>
        </div>

        <!-- Manual Event Creation -->
        <div class="manual-section">
          <h4>Create Event (Manual)</h4>
          <input type="text" id="event-title" placeholder="Title">
          <textarea id="event-description" placeholder="Description"></textarea>
          <button id="create-event">Create</button>
        </div>

        <!-- Content Lists -->
        <div class="content-list">
          <h4>NPCs</h4>
          <ul id="npc-list"></ul>
        </div>

        <div class="content-list">
          <h4>Events</h4>
          <ul id="event-list"></ul>
        </div>
      </div>
    `;
  }

  private setupEventListeners(): void {
    // Create NPC manually
    document.getElementById('create-npc')?.addEventListener('click', () => {
      const nameInput = document.getElementById('npc-name') as HTMLInputElement;
      const descInput = document.getElementById('npc-description') as HTMLTextAreaElement;
      const roleSelect = document.getElementById('npc-role') as HTMLSelectElement;

      const name = nameInput?.value.trim();
      if (!name) return;

      wsManager.send({
        type: 'NPC_CREATE',
        payload: { 
          name, 
          description: descInput?.value || '', 
          role: (roleSelect?.value as 'friendly' | 'neutral' | 'hostile') || 'neutral' 
        },
      });

      if (nameInput) nameInput.value = '';
      if (descInput) descInput.value = '';
    });

    // Create Event manually
    document.getElementById('create-event')?.addEventListener('click', () => {
      const titleInput = document.getElementById('event-title') as HTMLInputElement;
      const descInput = document.getElementById('event-description') as HTMLTextAreaElement;

      const title = titleInput?.value.trim();
      if (!title) return;

      wsManager.send({
        type: 'EVENT_CREATE',
        payload: { 
          title, 
          description: descInput?.value || '' 
        },
      });

      if (titleInput) titleInput.value = '';
      if (descInput) descInput.value = '';
    });

    // Subscribe to game state updates
    gameState.subscribe((state) => {
      this.updateNPCList(state.game?.npcs || []);
      this.updateEventList(state.game?.events || []);
    });
  }

  private updateNPCList(npcs: NPC[]): void {
    const list = document.getElementById('npc-list');
    if (!list) return;

    list.innerHTML = npcs.map(npc => `
      <li>
        <strong>${this.escapeHtml(npc.name)}</strong> (${npc.role})<br>
        ${this.escapeHtml(npc.description || '')}
      </li>
    `).join('');
  }

  private updateEventList(events: EventType[]): void {
    const list = document.getElementById('event-list');
    if (!list) return;

    list.innerHTML = events.map(event => `
      <li>
        <strong>${this.escapeHtml(event.title)}</strong><br>
        ${this.escapeHtml(event.description || '')}
      </li>
    `).join('');
  }

  private escapeHtml(text: string): string {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
