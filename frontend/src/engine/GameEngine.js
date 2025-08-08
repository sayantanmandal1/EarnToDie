/**
 * Core 2D Game Engine for Desert Survival Zombie Car Game
 * Handles canvas rendering, game loop, and system coordination
 */

import Matter from 'matter-js';

class GameEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.physics = null;
    this.camera = null;
    this.gameState = 'loading'; // loading, menu, playing, paused, gameOver, victory
    this.deltaTime = 0;
    this.lastTime = 0;
    this.targetFPS = 60;
    this.frameTime = 1000 / this.targetFPS;
    
    // Game systems
    this.systems = new Map();
    this.entities = new Map();
    this.spriteRenderer = null;
    
    // Input handling
    this.keys = {};
    this.mouse = { x: 0, y: 0, pressed: false };
    
    // Performance monitoring
    this.fps = 60;
    this.frameCount = 0;
    this.fpsUpdateTime = 0;
    
    // Asset loading
    this.assets = new Map();
    this.loadingProgress = 0;
    
    this.isRunning = false;
  }
  
  /**
   * Initialize the game engine
   */
  async initialize() {
    try {
      console.log('Initializing Desert Survival Game Engine...');
      
      // Get canvas and context
      this.canvas = document.getElementById('gameCanvas');
      if (!this.canvas) {
        throw new Error('Game canvas not found');
      }
      
      this.ctx = this.canvas.getContext('2d');
      if (!this.ctx) {
        throw new Error('Could not get 2D rendering context');
      }
      
      // Set up canvas properties
      this.setupCanvas();
      
      // Initialize Matter.js physics
      this.initializePhysics();
      
      // Set up input handlers
      this.setupInputHandlers();
      
      // Initialize camera system
      await this.initializeCamera();
      
      // Initialize sprite rendering system
      await this.initializeSpriteRenderer();
      
      // Load initial assets
      await this.loadInitialAssets();
      
      console.log('Game engine initialized successfully');
      this.gameState = 'menu';
      
      return true;
    } catch (error) {
      console.error('Failed to initialize game engine:', error);
      this.handleInitializationError(error);
      return false;
    }
  }
  
  /**
   * Set up canvas properties and styling
   */
  setupCanvas() {
    // Set canvas size
    this.canvas.width = 1200;
    this.canvas.height = 800;
    
    // Set up rendering context properties
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    
    // Set default styles
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.font = '16px "Courier New", monospace';
  }
  
  /**
   * Initialize Matter.js physics engine
   */
  initializePhysics() {
    // Create physics engine
    this.physics = Matter.Engine.create();
    
    // Configure physics world
    this.physics.world.gravity.y = 0.8; // Desert gravity
    this.physics.world.gravity.x = 0;
    
    // Set up collision detection
    this.physics.enableSleeping = false;
    this.physics.constraintIterations = 2;
    this.physics.positionIterations = 6;
    this.physics.velocityIterations = 4;
    
    console.log('Physics engine initialized');
  }
  
  /**
   * Set up input event handlers
   */
  setupInputHandlers() {
    // Keyboard input
    document.addEventListener('keydown', (event) => {
      this.keys[event.code] = true;
      this.handleKeyDown(event);
    });
    
    document.addEventListener('keyup', (event) => {
      this.keys[event.code] = false;
      this.handleKeyUp(event);
    });
    
    // Mouse input
    this.canvas.addEventListener('mousedown', (event) => {
      this.mouse.pressed = true;
      this.updateMousePosition(event);
      this.handleMouseDown(event);
    });
    
    this.canvas.addEventListener('mouseup', (event) => {
      this.mouse.pressed = false;
      this.handleMouseUp(event);
    });
    
    this.canvas.addEventListener('mousemove', (event) => {
      this.updateMousePosition(event);
      this.handleMouseMove(event);
    });
    
    // Touch input for mobile
    this.canvas.addEventListener('touchstart', (event) => {
      event.preventDefault();
      const touch = event.touches[0];
      this.mouse.pressed = true;
      this.updateMousePositionFromTouch(touch);
      this.handleTouchStart(event);
    });
    
    this.canvas.addEventListener('touchend', (event) => {
      event.preventDefault();
      this.mouse.pressed = false;
      this.handleTouchEnd(event);
    });
    
    this.canvas.addEventListener('touchmove', (event) => {
      event.preventDefault();
      const touch = event.touches[0];
      this.updateMousePositionFromTouch(touch);
      this.handleTouchMove(event);
    });
  }
  
  /**
   * Initialize camera system
   */
  async initializeCamera() {
    const { default: Camera } = await import('./Camera.js');
    this.camera = new Camera(this.canvas);
    console.log('Camera system initialized');
  }
  
  /**
   * Initialize sprite rendering system
   */
  async initializeSpriteRenderer() {
    try {
      const { default: SpriteRenderer } = await import('./SpriteRenderer.js');
      this.spriteRenderer = new SpriteRenderer();
      this.registerSystem('spriteRenderer', this.spriteRenderer);
      console.log('Sprite rendering system initialized');
    } catch (error) {
      console.warn('Failed to initialize sprite renderer:', error);
      // Continue without sprite renderer for now
    }
  }
  
  /**
   * Load initial game assets
   */
  async loadInitialAssets() {
    const loadingScreen = document.getElementById('loadingScreen');
    const progressBar = document.getElementById('loadingProgress');
    
    // List of initial assets to load
    const assetList = [
      // Placeholder assets for now - will be replaced with actual sprites
      { type: 'image', name: 'starter_car', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjUwIiB2aWV3Qm94PSIwIDAgMTAwIDUwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iNTAiIGZpbGw9IiM4YjQ1MTMiLz48L3N2Zz4=' },
      { type: 'image', name: 'zombie_walker', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAzMCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAiIGhlaWdodD0iNDAiIGZpbGw9IiM0YTVkMjMiLz48L3N2Zz4=' },
      { type: 'image', name: 'desert_rock', url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iMzAiIHZpZXdCb3g9IjAgMCA0MCAzMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjE1IiByPSIxNSIgZmlsbD0iIzY5Njk2OSIvPjwvc3ZnPg==' }
    ];
    
    let loadedCount = 0;
    const totalAssets = assetList.length;
    
    for (const asset of assetList) {
      try {
        await this.loadAsset(asset);
        loadedCount++;
        
        // Update loading progress
        this.loadingProgress = (loadedCount / totalAssets) * 100;
        if (progressBar) {
          progressBar.style.width = `${this.loadingProgress}%`;
        }
        
        console.log(`Loaded asset: ${asset.name} (${loadedCount}/${totalAssets})`);
      } catch (error) {
        console.warn(`Failed to load asset ${asset.name}:`, error);
        // Continue loading other assets
      }
    }
    
    // Hide loading screen
    if (loadingScreen) {
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }
    
    console.log(`Asset loading complete: ${loadedCount}/${totalAssets} assets loaded`);
  }
  
  /**
   * Load a single asset
   */
  async loadAsset(asset) {
    return new Promise((resolve, reject) => {
      if (asset.type === 'image') {
        const img = new Image();
        img.onload = () => {
          this.assets.set(asset.name, img);
          resolve(img);
        };
        img.onerror = () => reject(new Error(`Failed to load image: ${asset.url}`));
        img.src = asset.url;
      } else {
        reject(new Error(`Unknown asset type: ${asset.type}`));
      }
    });
  }
  
  /**
   * Start the game loop
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();
    
    console.log('Game loop started');
  }
  
  /**
   * Stop the game loop
   */
  stop() {
    this.isRunning = false;
    console.log('Game loop stopped');
  }
  
  /**
   * Main game loop
   */
  gameLoop() {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    this.deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // Update FPS counter
    this.updateFPS(currentTime);
    
    // Update game systems
    this.update(this.deltaTime);
    
    // Render frame
    this.render();
    
    // Schedule next frame
    requestAnimationFrame(() => this.gameLoop());
  }
  
  /**
   * Update game systems
   */
  update(deltaTime) {
    // Update physics
    if (this.physics) {
      Matter.Engine.update(this.physics, deltaTime);
    }
    
    // Update camera
    if (this.camera) {
      this.camera.update(deltaTime);
    }
    
    // Update all registered systems
    for (const [name, system] of this.systems) {
      if (system.update && typeof system.update === 'function') {
        try {
          system.update(deltaTime);
        } catch (error) {
          console.error(`Error updating system ${name}:`, error);
        }
      }
    }
    
    // Handle input
    this.handleInput();
  }
  
  /**
   * Render the game
   */
  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Render background
    this.renderBackground();
    
    // Save context for camera transformations
    this.ctx.save();
    
    // Apply camera transformations
    if (this.camera) {
      this.camera.applyTransform(this.ctx);
    }
    
    // Render all registered systems
    for (const [name, system] of this.systems) {
      if (system.render && typeof system.render === 'function') {
        try {
          system.render(this.ctx);
        } catch (error) {
          console.error(`Error rendering system ${name}:`, error);
        }
      }
    }
    
    // Restore context
    this.ctx.restore();
    
    // Render UI elements (not affected by camera)
    this.renderUI();
    
    // Render debug info if enabled
    if (this.gameState === 'playing' && this.keys['F3']) {
      this.renderDebugInfo();
    }
  }
  
  /**
   * Render desert background
   */
  renderBackground() {
    // Create desert gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#ff8c42'); // Orange sky
    gradient.addColorStop(0.7, '#d4a574'); // Desert sand
    gradient.addColorStop(1, '#c49464'); // Darker sand
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  /**
   * Render UI elements
   */
  renderUI() {
    // Render game state specific UI
    switch (this.gameState) {
      case 'menu':
        this.renderMainMenu();
        break;
      case 'playing':
        this.renderGameHUD();
        break;
      case 'paused':
        this.renderPauseMenu();
        break;
      case 'gameOver':
        this.renderGameOverScreen();
        break;
      case 'victory':
        this.renderVictoryScreen();
        break;
    }
  }
  
  /**
   * Render main menu
   */
  renderMainMenu() {
    this.ctx.fillStyle = '#8b4513';
    this.ctx.font = '48px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('DESERT SURVIVAL', this.canvas.width / 2, 200);
    
    this.ctx.font = '24px "Courier New", monospace';
    this.ctx.fillText('Press SPACE to Start', this.canvas.width / 2, 400);
    this.ctx.fillText('Arrow Keys to Drive', this.canvas.width / 2, 450);
    this.ctx.fillText('Survive the Wasteland', this.canvas.width / 2, 500);
  }
  
  /**
   * Render game HUD
   */
  renderGameHUD() {
    // HUD background
    this.ctx.fillStyle = 'rgba(42, 42, 42, 0.8)';
    this.ctx.fillRect(10, 10, 300, 100);
    
    // HUD border
    this.ctx.strokeStyle = '#8b4513';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(10, 10, 300, 100);
    
    // HUD text
    this.ctx.fillStyle = '#d4a574';
    this.ctx.font = '16px "Courier New", monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('Fuel: 100%', 20, 30);
    this.ctx.fillText('Distance: 0m', 20, 50);
    this.ctx.fillText('Money: $0', 20, 70);
    this.ctx.fillText(`FPS: ${Math.round(this.fps)}`, 20, 90);
  }
  
  /**
   * Render pause menu
   */
  renderPauseMenu() {
    // Semi-transparent overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Pause text
    this.ctx.fillStyle = '#d4a574';
    this.ctx.font = '36px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
    
    this.ctx.font = '18px "Courier New", monospace';
    this.ctx.fillText('Press ESC to Resume', this.canvas.width / 2, this.canvas.height / 2 + 50);
  }
  
  /**
   * Render game over screen
   */
  renderGameOverScreen() {
    // Semi-transparent overlay
    this.ctx.fillStyle = 'rgba(139, 69, 19, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Game over text
    this.ctx.fillStyle = '#d4a574';
    this.ctx.font = '48px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);
    
    this.ctx.font = '24px "Courier New", monospace';
    this.ctx.fillText('Press R to Restart', this.canvas.width / 2, this.canvas.height / 2 + 50);
  }
  
  /**
   * Render victory screen
   */
  renderVictoryScreen() {
    // Victory overlay
    this.ctx.fillStyle = 'rgba(255, 140, 66, 0.9)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Victory text
    this.ctx.fillStyle = '#8b4513';
    this.ctx.font = '48px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('ESCAPED!', this.canvas.width / 2, this.canvas.height / 2 - 50);
    
    this.ctx.font = '24px "Courier New", monospace';
    this.ctx.fillText('You reached the evacuation point!', this.canvas.width / 2, this.canvas.height / 2 + 50);
  }
  
  /**
   * Render debug information
   */
  renderDebugInfo() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(this.canvas.width - 200, 10, 190, 150);
    
    this.ctx.fillStyle = '#00ff00';
    this.ctx.font = '12px "Courier New", monospace';
    this.ctx.textAlign = 'left';
    
    let y = 25;
    this.ctx.fillText(`FPS: ${Math.round(this.fps)}`, this.canvas.width - 190, y);
    y += 15;
    this.ctx.fillText(`Delta: ${this.deltaTime.toFixed(2)}ms`, this.canvas.width - 190, y);
    y += 15;
    this.ctx.fillText(`State: ${this.gameState}`, this.canvas.width - 190, y);
    y += 15;
    this.ctx.fillText(`Bodies: ${this.physics ? this.physics.world.bodies.length : 0}`, this.canvas.width - 190, y);
    y += 15;
    this.ctx.fillText(`Systems: ${this.systems.size}`, this.canvas.width - 190, y);
    y += 15;
    this.ctx.fillText(`Assets: ${this.assets.size}`, this.canvas.width - 190, y);
  }
  
  /**
   * Update FPS counter
   */
  updateFPS(currentTime) {
    this.frameCount++;
    
    if (currentTime - this.fpsUpdateTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
    }
  }
  
  /**
   * Handle input
   */
  handleInput() {
    // Global input handling
    if (this.keys['Escape']) {
      if (this.gameState === 'playing') {
        this.gameState = 'paused';
      } else if (this.gameState === 'paused') {
        this.gameState = 'playing';
      }
      this.keys['Escape'] = false; // Prevent key repeat
    }
    
    if (this.keys['Space'] && this.gameState === 'menu') {
      this.gameState = 'playing';
      this.keys['Space'] = false;
    }
    
    if (this.keys['KeyR'] && (this.gameState === 'gameOver' || this.gameState === 'victory')) {
      this.restart();
      this.keys['KeyR'] = false;
    }
  }
  
  /**
   * Handle key down events
   */
  handleKeyDown(event) {
    // Prevent default browser behavior for game keys
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
  }
  
  /**
   * Handle key up events
   */
  handleKeyUp(event) {
    // Additional key up handling if needed
  }
  
  /**
   * Handle mouse down events
   */
  handleMouseDown(event) {
    // Mouse interaction handling
  }
  
  /**
   * Handle mouse up events
   */
  handleMouseUp(event) {
    // Mouse interaction handling
  }
  
  /**
   * Handle mouse move events
   */
  handleMouseMove(event) {
    // Mouse movement handling
  }
  
  /**
   * Handle touch start events
   */
  handleTouchStart(event) {
    // Touch interaction handling
  }
  
  /**
   * Handle touch end events
   */
  handleTouchEnd(event) {
    // Touch interaction handling
  }
  
  /**
   * Handle touch move events
   */
  handleTouchMove(event) {
    // Touch movement handling
  }
  
  /**
   * Update mouse position from mouse event
   */
  updateMousePosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = event.clientX - rect.left;
    this.mouse.y = event.clientY - rect.top;
  }
  
  /**
   * Update mouse position from touch event
   */
  updateMousePositionFromTouch(touch) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = touch.clientX - rect.left;
    this.mouse.y = touch.clientY - rect.top;
  }
  
  /**
   * Register a game system
   */
  registerSystem(name, system) {
    this.systems.set(name, system);
    console.log(`Registered system: ${name}`);
  }
  
  /**
   * Unregister a game system
   */
  unregisterSystem(name) {
    this.systems.delete(name);
    console.log(`Unregistered system: ${name}`);
  }
  
  /**
   * Get a registered system
   */
  getSystem(name) {
    return this.systems.get(name);
  }
  
  /**
   * Restart the game
   */
  restart() {
    console.log('Restarting game...');
    
    // Reset physics world
    if (this.physics) {
      Matter.World.clear(this.physics.world);
      Matter.Engine.clear(this.physics);
    }
    
    // Reset camera
    if (this.camera) {
      this.camera.reset();
    }
    
    // Reset all systems
    for (const [name, system] of this.systems) {
      if (system.reset && typeof system.reset === 'function') {
        system.reset();
      }
    }
    
    // Reset game state
    this.gameState = 'playing';
  }
  
  /**
   * Handle initialization errors
   */
  handleInitializationError(error) {
    console.error('Game initialization failed:', error);
    
    // Show error message to user
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #8b4513;
      color: #d4a574;
      padding: 20px;
      border: 2px solid #d4a574;
      font-family: 'Courier New', monospace;
      text-align: center;
      z-index: 1000;
    `;
    errorDiv.innerHTML = `
      <h3>Game Initialization Failed</h3>
      <p>${error.message}</p>
      <p>Please refresh the page to try again.</p>
    `;
    
    document.body.appendChild(errorDiv);
  }
  
  /**
   * Get asset by name
   */
  getAsset(name) {
    return this.assets.get(name);
  }
  
  /**
   * Check if key is pressed
   */
  isKeyPressed(keyCode) {
    return !!this.keys[keyCode];
  }
  
  /**
   * Get mouse position
   */
  getMousePosition() {
    return { ...this.mouse };
  }
  
  /**
   * Dispose of the game engine
   */
  dispose() {
    this.stop();
    
    // Clear physics
    if (this.physics) {
      Matter.World.clear(this.physics.world);
      Matter.Engine.clear(this.physics);
    }
    
    // Clear systems
    this.systems.clear();
    this.entities.clear();
    this.assets.clear();
    
    console.log('Game engine disposed');
  }
}

export default GameEngine;