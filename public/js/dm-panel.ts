// ============================================================================
// DnD Offline Multiplayer - DM Control Panel
// ============================================================================

import { wsManager } from './websocket.js';
import { gameState } from './game-state.js';
import { llmClient } from './llm-client.js';
import type { NPC, Event as EventType } from '../../shared/index.js';

/**
 * DM Control Panel - DM-specific controls for NPCs and events (with AI generation)
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
        
        <!-- LLM Settings -->
        <div class="llm-settings">
          <label for="lm-studio-url">LM Studio URL:</label>
          <input type="text" id="lm-studio-url" placeholder="http://localhost:1234/v1/chat/completions">
          
          <label for="lm-studio-token">API Token (optional):</label>
          <input type="password" id="lm-studio-token" placeholder="Enter API token if required">
          
          <label for="lm-studio-model">Model:</label>
          <select id="lm-studio-model">
            <option value="local-model">Local Model (default)</option>
          </select>
          <button id="refresh-models">Refresh Models</button>
          
          <button id="test-llm">Test Connection</button>
          <span id="llm-status"></span>
        </div>

        <!-- Generate NPC (AI) -->
        <div class="generate-section">
          <h4>Generate NPC (AI)</h4>
          <textarea id="npc-prompt" placeholder="Describe the NPC... (e.g., 'A wise old wizard in a forest')"></textarea>
          <button id="generate-npc">Generate</button>
          <div id="npc-result" class="result-area"></div>
        </div>

        <!-- Generate Event (AI) -->
        <div class="generate-section">
          <h4>Generate Event (AI)</h4>
          <textarea id="event-prompt" placeholder="Describe the event... (e.g., 'Ambush by bandits on the road')"></textarea>
          <button id="generate-event">Generate</button>
          <div id="event-result" class="result-area"></div>
        </div>

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
    // LLM URL settings
    const urlInput = document.getElementById('lm-studio-url') as HTMLInputElement;
    if (urlInput) {
      urlInput.value = llmClient.getBaseUrl();
      
      urlInput.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        llmClient.setBaseUrl(target.value);
      });
    }

    // API Token settings
    const tokenInput = document.getElementById('lm-studio-token') as HTMLInputElement;
    if (tokenInput) {
      tokenInput.value = llmClient.getApiToken() || '';
      
      tokenInput.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        llmClient.setApiToken(target.value);
      });
    }

    // Model selection
    const modelSelect = document.getElementById('lm-studio-model') as HTMLSelectElement;
    if (modelSelect) {
      modelSelect.value = llmClient.getModel();
      
      modelSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        llmClient.setModel(target.value);
      });
    }

    // Refresh models button
    const refreshBtn = document.getElementById('refresh-models') as HTMLButtonElement;
    refreshBtn?.addEventListener('click', async () => {
      refreshBtn.textContent = 'Loading...';
      refreshBtn.disabled = true;
      
      try {
        const models = await llmClient.refreshModels();
        
        // Update model dropdown
        if (modelSelect) {
          modelSelect.innerHTML = models.map(m => 
            `<option value="${m}" ${m === llmClient.getModel() ? 'selected' : ''}>${this.escapeHtml(m)}</option>`
          ).join('');
        }
        
        alert(`Loaded ${models.length} model(s)`);
      } catch (error) {
        alert('Failed to load models. Check LM Studio connection.');
      } finally {
        refreshBtn.textContent = 'Refresh Models';
        refreshBtn.disabled = false;
      }
    });

    // Test LLM connection
    document.getElementById('test-llm')?.addEventListener('click', async () => {
      const status = document.getElementById('llm-status');
      if (!status) return;
      
      status.textContent = 'Testing...';
      
      try {
        const connected = await llmClient.isConnected();
        if (connected) {
          status.textContent = '✓ Connected';
          status.className = 'status-connected';
          
          // Also show current model
          const modelInfo = document.createElement('div');
          modelInfo.style.fontSize = '0.8em';
          modelInfo.textContent = `Model: ${llmClient.getModel()}`;
          status.parentNode?.appendChild(modelInfo);
        } else {
          status.textContent = '✗ Failed';
          status.className = 'status-disconnected';
        }
      } catch (error) {
        status.textContent = '✗ Failed';
        status.className = 'status-disconnected';
      }
    });

    // Generate NPC (AI)
    document.getElementById('generate-npc')?.addEventListener('click', async () => {
      const promptInput = document.getElementById('npc-prompt') as HTMLTextAreaElement;
      const prompt = promptInput?.value.trim();
      if (!prompt) return;

      const resultDiv = document.getElementById('npc-result');
      if (!resultDiv) return;
      
      resultDiv.innerHTML = '<div class="loading">Generating...</div>';

      try {
        const npc = await llmClient.generateNPC(prompt, this.getLLMContext());
        
        if (npc.name && npc.name !== 'Unknown') {
          resultDiv.innerHTML = `
            <div class="generated-npc">
              <strong>${this.escapeHtml(npc.name)}</strong> (${npc.role})<br>
              ${this.escapeHtml(npc.description || '')}
            </div>
          `;

          wsManager.send({
            type: 'NPC_CREATE',
            payload: npc,
          });
          
          // Clear prompt after successful generation
          if (promptInput) promptInput.value = '';
        } else {
          resultDiv.innerHTML = '<div class="error">Failed to generate NPC. Check LM Studio.</div>';
        }
      } catch (error) {
        resultDiv.innerHTML = '<div class="error">Generation failed. Check LM Studio connection.</div>';
      }
    });

    // Generate Event (AI)
    document.getElementById('generate-event')?.addEventListener('click', async () => {
      const promptInput = document.getElementById('event-prompt') as HTMLTextAreaElement;
      const prompt = promptInput?.value.trim();
      if (!prompt) return;

      const resultDiv = document.getElementById('event-result');
      if (!resultDiv) return;
      
      resultDiv.innerHTML = '<div class="loading">Generating...</div>';

      try {
        const event = await llmClient.generateEvent(prompt, this.getLLMContext());
        
        if (event.title && event.title !== 'Unknown Event') {
          resultDiv.innerHTML = `
            <div class="generated-event">
              <strong>${this.escapeHtml(event.title)}</strong><br>
              ${this.escapeHtml(event.description || '')}
            </div>
          `;

          wsManager.send({
            type: 'EVENT_CREATE',
            payload: event,
          });
          
          // Clear prompt after successful generation
          if (promptInput) promptInput.value = '';
        } else {
          resultDiv.innerHTML = '<div class="error">Failed to generate event. Check LM Studio.</div>';
        }
      } catch (error) {
        resultDiv.innerHTML = '<div class="error">Generation failed. Check LM Studio connection.</div>';
      }
    });

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

  private getLLMContext(): Record<string, unknown> {
    const game = gameState.game;
    return {
      party: game?.players?.map(p => p.characterName) || [],
      location: 'Unknown',
      previousEvents: game?.events?.slice(-3).map(e => e.title || '') || [],
    };
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
