// public/js/llm-client.js

/**
 * LM Studio Client - AI-powered content generation
 */

class LLMClient {
  constructor() {
    this.baseUrl = localStorage.getItem('lmStudioUrl') || 'http://localhost:1234/v1/chat/completions';
  }

  setBaseUrl(url) {
    this.baseUrl = url;
    localStorage.setItem('lmStudioUrl', url);
  }

  async generateScene(prompt, context = {}) {
    try {
      const messages = [
        {
          role: 'system',
          content: `You are a D&D Dungeon Master assistant. Help create engaging scenes, NPCs, and events. 
                   Format your responses in markdown for better readability. Keep descriptions vivid but concise.`
        },
        {
          role: 'user',
          content: this.buildPrompt(prompt, context)
        }
      ];

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'local-model',
          messages,
          temperature: 0.8,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`LM Studio API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'No response generated';
    } catch (error) {
      console.error('LLM generation failed:', error);
      throw error;
    }
  }

  async generateNPC(prompt, context = {}) {
    try {
      const messages = [
        {
          role: 'system',
          content: `You are a D&D NPC generator. Create interesting NPCs with names, descriptions, and roles.
                   Return JSON format: { name: string, description: string, role: "friendly" | "neutral" | "hostile" }`
        },
        {
          role: 'user',
          content: `Generate an NPC based on this prompt: ${prompt}
                   Context: ${JSON.stringify(context)}
                   
                   Return ONLY valid JSON.`
        }
      ];

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'local-model',
          messages,
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`LM Studio API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      
      // Try to parse JSON from response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch (e) {
        console.error('Failed to parse NPC JSON:', e);
        return {};
      }
    } catch (error) {
      console.error('NPC generation failed:', error);
      throw error;
    }
  }

  async generateEvent(prompt, context = {}) {
    try {
      const messages = [
        {
          role: 'system',
          content: `You are a D&D event generator. Create exciting events and encounters for players.
                   Return JSON format: { title: string, description: string, difficulty: "easy" | "medium" | "hard" }`
        },
        {
          role: 'user',
          content: `Generate an event based on this prompt: ${prompt}
                   Context: ${JSON.stringify(context)}
                   
                   Return ONLY valid JSON.`
        }
      ];

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'local-model',
          messages,
          temperature: 0.8,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`LM Studio API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '{}';
      
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch (e) {
        console.error('Failed to parse event JSON:', e);
        return {};
      }
    } catch (error) {
      console.error('Event generation failed:', error);
      throw error;
    }
  }

  buildPrompt(prompt, context) {
    let fullPrompt = prompt;
    
    if (Object.keys(context).length > 0) {
      fullPrompt += `\n\nContext:\n`;
      fullPrompt += `- Current party: ${context.party?.join(', ') || 'Unknown'}`;
      fullPrompt += `\n- Location: ${context.location || 'Unknown'}`;
      fullPrompt += `\n- Previous events: ${context.previousEvents?.slice(-3).join('; ') || 'None'}`;
    }
    
    return fullPrompt;
  }

  isConnected() {
    // Test connection by making a simple request
    return fetch(this.baseUrl, { method: 'POST', body: '{}' })
      .then(() => true)
      .catch(() => false);
  }
}

export const llmClient = new LLMClient();
export default llmClient;