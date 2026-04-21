// public/js/game-state.js

/**
 * Game State - Local state management for the game client
 */

class GameState {
  constructor() {
    this.game = null;
    this.currentPlayer = null;
    this.listeners = [];
  }

  setGame(gameData) {
    this.game = gameData;
    this.notifyListeners();
  }

  setCurrentPlayer(playerData) {
    this.currentPlayer = playerData;
    this.notifyListeners();
  }

  addChatMessage(message) {
    if (this.game) {
      this.game.chatHistory = this.game.chatHistory || [];
      this.game.chatHistory.push(message);
      this.notifyListeners();
    }
  }

  addNPC(npc) {
    if (this.game) {
      this.game.npcs = this.game.npcs || [];
      this.game.npcs.push(npc);
      this.notifyListeners();
    }
  }

  addEvent(event) {
    if (this.game) {
      this.game.events = this.game.events || [];
      this.game.events.push(event);
      this.notifyListeners();
    }
  }

  getPlayerById(playerId) {
    return this.game?.players?.find(p => p.id === playerId);
  }

  isDM() {
    return this.currentPlayer?.isDM;
  }

  subscribe(callback) {
    this.listeners.push(callback);
    // Initial call
    callback({
      game: this.game,
      currentPlayer: this.currentPlayer,
    });
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  notifyListeners() {
    const state = {
      game: this.game,
      currentPlayer: this.currentPlayer,
    };
    
    this.listeners.forEach(callback => callback(state));
  }

  clear() {
    this.game = null;
    this.currentPlayer = null;
    this.notifyListeners();
  }
}

export const gameState = new GameState();
export default gameState;