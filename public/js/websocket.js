// public/js/websocket.js

/**
 * WebSocket Manager - Client connection handling with reconnection logic
 */

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.messageQueue = [];
    this.eventHandlers = {};
    this.connected = false;
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      
      // Process queued messages
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        this.send(message);
      }
      
      this.triggerHandlers('open');
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received:', message.type, message.payload);
        
        // Trigger handlers for this message type
        if (this.eventHandlers[message.type]) {
          this.eventHandlers[message.type].forEach(handler => handler(message.payload));
        }
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.connected = false;
      
      // Attempt reconnection
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => this.connect(), delay);
      } else {
        console.error('Max reconnection attempts reached');
        this.triggerHandlers('disconnect', { maxAttemptsReached: true });
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.triggerHandlers('error', error);
    };
  }

  send(message) {
    if (this.connected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for later
      this.messageQueue.push(message);
    }
  }

  on(type, handler) {
    if (!this.eventHandlers[type]) {
      this.eventHandlers[type] = [];
    }
    this.eventHandlers[type].push(handler);
  }

  off(type, handler) {
    if (this.eventHandlers[type]) {
      const index = this.eventHandlers[type].indexOf(handler);
      if (index > -1) {
        this.eventHandlers[type].splice(index, 1);
      }
    }
  }

  triggerHandlers(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => handler(data));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }

  isConnected() {
    return this.connected;
  }
}

// Export singleton instance
export const wsManager = new WebSocketManager();
export default wsManager;