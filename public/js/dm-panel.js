// public/js/dm-panel.js

/**
 * DM Control Panel - DM-specific controls for NPCs, events, and AI generation
 */

import { wsManager } from './websocket.js';
import { gameState } from './game-state.js';
import { llmClient } from './llm-client.js';

class DMPanel {
  constructor() {
    this.element = document.getElementById('dm-panel');
    if (!this.element) return;
    
    this.initUI();
    this.setupEventListeners();
  }

  initUI() {
    // Create DM panel HTML structure
    this.element.innerHTML = `
      <div class="dm-controls">
        <h3>DM Controls</h3>
        
        <!-- LLM Settings -->
        <div class="llm-settings">
          <label for="lm-studio-url">LM Studio URL:</label>
          <input type="text" id="lm-studio-url" placeholder="http://localhost:1234/v1/chat/completions">
          <button id="test-llm">Test</button>
          <span id="llm-status"></span>
        </div>

        <!-- Generate NPC -->
        <div class="generate-section">
          <h4>Generate NPC (AI)</h4>
          <textarea id="npc-prompt" placeholder="Describe the NPC..."></textarea>
          <button id="generate-npc">Generate</button>
          <div id="npc-result" class="result-area"></div>
        </div>

        <!-- Generate Event -->
        <div class="generate-section">
          <h4>Generate Event (AI)</h4>
          <textarea id="event-prompt" placeholder="Describe the event..."></textarea>
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
          <select id="event-difficulty">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
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

  setupEventListeners() {
    // LLM URL settings
    const urlInput = document.getElementById('lm-studio-url');
    if (urlInput) {
      urlInput.value = localStorage.getItem('lmStudioUrl') || 'http://localhost:1234/v1/chat/completions';
      
      urlInput.addEventListener('change', (e) => {
        llmClient.setBaseUrl(e.target.value);
      });
    }

    // Test LLM connection
    document.getElementById('test-llm')?.addEventListener('click', async () => {
      const status = document.getElementById('llm-status');
      status.textContent = 'Testing...';
      
      try {
        await llmClient.generateScene('Test scene');
        status.textContent = '✓ Connected';
        status.className = 'status-connected';
      } catch (error) {
        status.textContent = '✗ Failed';
        status.className = 'status-disconnected';
      }
    });

    // Generate NPC
    document.getElementById('generate-npc')?.addEventListener('click', async () => {
      const prompt = document.getElementById('npc-prompt').value;
      if (!prompt.trim()) return;

      const resultDiv = document.getElementById('npc-result');
      resultDiv.innerHTML = '<div class="loading">Generating...</div>';

      try {
        const npc = await llmClient.generateNPC(prompt, this.getLLMContext());
        
        if (Object.keys(npc).length > 0) {
          resultDiv.innerHTML = `
            <div class="generated-npc">
              <strong>${npc.name}</strong> (${npc.role})<br>
              ${npc.description}
            </div>
          `;

          wsManager.send({
            type: 'NPC_CREATE',
            payload: npc,
          });
        } else {
          resultDiv.innerHTML = '<div class="error">Failed to generate NPC</div>';
        }
      } catch (error) {
        resultDiv.innerHTML = '<div class="error">Generation failed. Check LM Studio.</div>';
      }
    });

    // Generate Event
    document.getElementById('generate-event')?.addEventListener('click', async () => {
      const prompt = document.getElementById('event-prompt').value;
      if (!prompt.trim()) return;

      const resultDiv = document.getElementById('event-result');
      resultDiv.innerHTML = '<div class="loading">Generating...</div>';

      try {
        const event = await llmClient.generateEvent(prompt, this.getLLMContext());
        
        if (Object.keys(event).length > 0) {
          resultDiv.innerHTML = `
            <div class="generated-event">
              <strong>${event.title}</strong> (${event.difficulty})<br>
              ${event.description}
            </div>
          `;

          wsManager.send({
            type: 'EVENT_CREATE',
            payload: event,
          });
        } else {
          resultDiv.innerHTML = '<div class="error">Failed to generate event</div>';
        }
      } catch (error) {
        resultDiv.innerHTML = '<div class="error">Generation failed. Check LM Studio.</div>';
      }
    });

    // Create NPC manually
    document.getElementById('create-npc')?.addEventListener('click', () => {
      const name = document.getElementById('npc-name').value;
      const description = document.getElementById('npc-description').value;
      const role = document.getElementById('npc-role').value;

      if (!name.trim()) return;

      wsManager.send({
        type: 'NPC_CREATE',
        payload: { name, description, role },
      });

      document.getElementById('npc-name').value = '';
      document.getElementById('npc-description').value = '';
    });

    // Create Event manually
    document.getElementById('create-event')?.addEventListener('click', () => {
      const title = document.getElementById('event-title').value;
      const description = document.getElementById('event-description').value;
      const difficulty = document.getElementById('event-difficulty').value;

      if (!title.trim()) return;

      wsManager.send({
        type: 'EVENT_CREATE',
        payload: { title, description, difficulty },
      });

      document.getElementById('event-title').value = '';
      document.getElementById('event-description').value = '';
    });

    // Subscribe to game state updates
    gameState.subscribe((state) => {
      this.updateNPCList(state.game?.npcs || []);
      this.updateEventList(state.game?.events || []);
    });
  }

  getLLMContext() {
    const game = gameState.game;
    return {
      party: game?.players?.map(p => p.characterName),
      location: 'Unknown',
      previousEvents: game?.events?.slice(-3).map(e => e.title || e.name) || [],
    };
  }

  updateNPCList(npcs) {
    const list = document.getElementById('npc-list');
    if (!list) return;

    list.innerHTML = npcs.map(npc => `
      <li>
        <strong>${npc.name}</strong> (${npc.role})<br>
        ${npc.description || ''}
      </li>
    `).join('');
  }

  updateEventList(events) {
    const list = document.getElementById('event-list');
    if (!list) return;

    list.innerHTML = events.map(event => `
      <li>
        <strong>${event.title || event.name}</strong> (${event.difficulty || 'N/A'})<br>
        ${event.description || ''}
      </li>
    `).join('');
  }
}

export default DMPanel;