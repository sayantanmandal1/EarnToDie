/**
 * Main entry point for Desert Survival - 2D Side-Scrolling Zombie Car Game
 * Initializes and coordinates all game systems
 */

import GameEngine from './engine/GameEngine.js';

class DesertSurvivalGame {
  constructor() {
    this.engine = null;
    this.initialized = false;
    
    console.log('Desert Survival Game created');
  }
  
  /**
   * Initialize the game
   */
  async initialize() {
    try {
      console.log('Initializing Desert Survival Game...');
      
      // Create and initialize game engine
      this.engine = new GameEngine();
      const success = await this.engine.initialize();
      
      if (!success) {
        throw new Error('Failed to initialize game engine');
      }
      
      // Initialize game systems (will be added in subsequent tasks)
      await this.initializeGameSystems();
      
      // Set up error handling
      this.setupErrorHandling();
      
      this.initialized = true;
      console.log('Desert Survival Game initialized successfully');
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Desert Survival Game:', error);
      this.handleInitializationError(error);
      return false;
    }
  }
  
  /**
   * Initialize all game systems
   */
  async initializeGameSystems() {
    console.log('Initializing game systems...');
    
    // Systems will be initialized in subsequent tasks:
    // - SaveManager (Task 2)
    // - Vehicle System (Task 6)
    // - Terrain Generator (Task 5)
    // - Zombie Manager (Task 7)
    // - Upgrade Shop (Task 8)
    // - Distance Tracker (Task 9)
    // - Audio Manager (Task 12)
    // - etc.
    
    console.log('Game systems initialization complete');
  }
  
  /**
   * Start the game
   */
  start() {
    if (!this.initialized) {
      console.error('Cannot start game - not initialized');
      return false;
    }
    
    console.log('Starting Desert Survival Game...');
    this.engine.start();
    return true;
  }
  
  /**
   * Stop the game
   */
  stop() {
    if (this.engine) {
      console.log('Stopping Desert Survival Game...');
      this.engine.stop();
    }
  }
  
  /**
   * Restart the game
   */
  restart() {
    if (this.engine) {
      console.log('Restarting Desert Survival Game...');
      this.engine.restart();
    }
  }
  
  /**
   * Set up global error handling
   */
  setupErrorHandling() {
    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      console.error('Uncaught error:', event.error);
      this.handleRuntimeError(event.error);
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.handleRuntimeError(event.reason);
    });
    
    console.log('Error handling set up');
  }
  
  /**
   * Handle initialization errors
   */
  handleInitializationError(error) {
    console.error('Initialization error:', error);
    
    // Show user-friendly error message
    this.showErrorMessage(
      'Game Initialization Failed',
      `The game failed to start: ${error.message}`,
      'Please refresh the page to try again.'
    );
  }
  
  /**
   * Handle runtime errors
   */
  handleRuntimeError(error) {
    console.error('Runtime error:', error);
    
    // For now, just log the error
    // In a production game, you might want to:
    // - Save the game state
    // - Show a recovery dialog
    // - Report the error to analytics
  }
  
  /**
   * Show error message to user
   */
  showErrorMessage(title, message, suggestion) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(45deg, #3a3a3a, #2a2a2a);
      color: #d4a574;
      padding: 30px;
      border: 3px solid #8b4513;
      border-radius: 10px;
      font-family: 'Courier New', monospace;
      text-align: center;
      z-index: 10000;
      box-shadow: 0 0 20px rgba(139, 69, 19, 0.5);
      max-width: 500px;
    `;
    
    errorDiv.innerHTML = `
      <h2 style="color: #ff8c42; margin-top: 0;">${title}</h2>
      <p style="margin: 20px 0;">${message}</p>
      <p style="font-style: italic; color: #c49464;">${suggestion}</p>
      <button onclick="location.reload()" style="
        background: linear-gradient(45deg, #8b4513, #d4a574);
        color: white;
        border: none;
        padding: 10px 20px;
        font-family: 'Courier New', monospace;
        font-size: 16px;
        cursor: pointer;
        border-radius: 5px;
        margin-top: 20px;
      ">Reload Game</button>
    `;
    
    document.body.appendChild(errorDiv);
  }
  
  /**
   * Get game engine instance
   */
  getEngine() {
    return this.engine;
  }
  
  /**
   * Check if game is initialized
   */
  isInitialized() {
    return this.initialized;
  }
  
  /**
   * Dispose of the game
   */
  dispose() {
    if (this.engine) {
      this.engine.dispose();
      this.engine = null;
    }
    
    this.initialized = false;
    console.log('Desert Survival Game disposed');
  }
}

// Create and initialize the game when the page loads
let game = null;

async function initializeGame() {
  try {
    console.log('Page loaded, initializing Desert Survival Game...');
    
    game = new DesertSurvivalGame();
    const success = await game.initialize();
    
    if (success) {
      game.start();
      console.log('Desert Survival Game is running!');
    } else {
      console.error('Failed to initialize game');
    }
  } catch (error) {
    console.error('Error during game initialization:', error);
  }
}

// Initialize game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGame);
} else {
  initializeGame();
}

// Make game globally accessible for debugging
window.desertSurvivalGame = game;

export default DesertSurvivalGame;