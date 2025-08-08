/**
 * Unit tests for GameEngine
 */

import GameEngine from '../engine/GameEngine.js';

// Mock Matter.js
jest.mock('matter-js', () => ({
  Engine: {
    create: jest.fn(() => ({
      world: {
        gravity: { x: 0, y: 0.8 },
        bodies: []
      }
    })),
    update: jest.fn(),
    clear: jest.fn()
  },
  World: {
    clear: jest.fn()
  }
}));

// Mock DOM elements
const mockCanvas = {
  getContext: jest.fn(() => ({
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    fillText: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    createLinearGradient: jest.fn(() => ({
      addColorStop: jest.fn()
    })),
    imageSmoothingEnabled: true,
    imageSmoothingQuality: 'high',
    textAlign: 'left',
    textBaseline: 'top',
    font: '16px "Courier New", monospace',
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1
  })),
  width: 1200,
  height: 800,
  addEventListener: jest.fn()
};

// Mock document methods
Object.defineProperty(document, 'getElementById', {
  value: jest.fn((id) => {
    if (id === 'gameCanvas') return mockCanvas;
    if (id === 'loadingScreen') return { style: { display: 'block' } };
    if (id === 'loadingProgress') return { style: { width: '0%' } };
    return null;
  })
});

Object.defineProperty(document, 'addEventListener', {
  value: jest.fn()
});

// Mock performance.now
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now())
  }
});

// Mock requestAnimationFrame
Object.defineProperty(window, 'requestAnimationFrame', {
  value: jest.fn(callback => setTimeout(callback, 16))
});

describe('GameEngine', () => {
  let gameEngine;
  
  beforeEach(() => {
    gameEngine = new GameEngine();
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    if (gameEngine) {
      gameEngine.dispose();
    }
  });
  
  describe('Constructor', () => {
    test('should initialize with default values', () => {
      expect(gameEngine.canvas).toBeNull();
      expect(gameEngine.ctx).toBeNull();
      expect(gameEngine.physics).toBeNull();
      expect(gameEngine.camera).toBeNull();
      expect(gameEngine.gameState).toBe('loading');
      expect(gameEngine.deltaTime).toBe(0);
      expect(gameEngine.targetFPS).toBe(60);
      expect(gameEngine.isRunning).toBe(false);
    });
    
    test('should initialize collections', () => {
      expect(gameEngine.systems).toBeInstanceOf(Map);
      expect(gameEngine.entities).toBeInstanceOf(Map);
      expect(gameEngine.assets).toBeInstanceOf(Map);
      expect(gameEngine.keys).toEqual({});
    });
  });
  
  describe('Initialization', () => {
    test('should initialize successfully with valid canvas', async () => {
      const result = await gameEngine.initialize();
      
      expect(result).toBe(true);
      expect(gameEngine.canvas).toBe(mockCanvas);
      expect(gameEngine.ctx).toBeTruthy();
      expect(gameEngine.physics).toBeTruthy();
      expect(gameEngine.gameState).toBe('menu');
    });
    
    test('should fail initialization without canvas', async () => {
      document.getElementById.mockReturnValue(null);
      
      const result = await gameEngine.initialize();
      
      expect(result).toBe(false);
    });
    
    test('should set up canvas properties', async () => {
      await gameEngine.initialize();
      
      expect(mockCanvas.width).toBe(1200);
      expect(mockCanvas.height).toBe(800);
      expect(gameEngine.ctx.imageSmoothingEnabled).toBe(true);
      expect(gameEngine.ctx.imageSmoothingQuality).toBe('high');
    });
    
    test('should initialize physics engine', async () => {
      const Matter = require('matter-js');
      
      await gameEngine.initialize();
      
      expect(Matter.Engine.create).toHaveBeenCalled();
      expect(gameEngine.physics.world.gravity.y).toBe(0.8);
    });
    
    test('should set up input handlers', async () => {
      await gameEngine.initialize();
      
      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(document.addEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
    });
  });
  
  describe('Game Loop', () => {
    beforeEach(async () => {
      await gameEngine.initialize();
    });
    
    test('should start game loop', () => {
      gameEngine.start();
      
      expect(gameEngine.isRunning).toBe(true);
    });
    
    test('should stop game loop', () => {
      gameEngine.start();
      gameEngine.stop();
      
      expect(gameEngine.isRunning).toBe(false);
    });
    
    test('should not start if already running', () => {
      gameEngine.start();
      const firstStart = gameEngine.isRunning;
      gameEngine.start();
      
      expect(firstStart).toBe(true);
      expect(gameEngine.isRunning).toBe(true);
    });
  });
  
  describe('System Management', () => {
    beforeEach(async () => {
      await gameEngine.initialize();
    });
    
    test('should register systems', () => {
      const mockSystem = { update: jest.fn(), render: jest.fn() };
      
      gameEngine.registerSystem('testSystem', mockSystem);
      
      expect(gameEngine.systems.has('testSystem')).toBe(true);
      expect(gameEngine.getSystem('testSystem')).toBe(mockSystem);
    });
    
    test('should unregister systems', () => {
      const mockSystem = { update: jest.fn(), render: jest.fn() };
      
      gameEngine.registerSystem('testSystem', mockSystem);
      gameEngine.unregisterSystem('testSystem');
      
      expect(gameEngine.systems.has('testSystem')).toBe(false);
      expect(gameEngine.getSystem('testSystem')).toBeUndefined();
    });
    
    test('should update registered systems', () => {
      const mockSystem = { update: jest.fn(), render: jest.fn() };
      gameEngine.registerSystem('testSystem', mockSystem);
      
      gameEngine.update(16);
      
      expect(mockSystem.update).toHaveBeenCalledWith(16);
    });
    
    test('should handle system update errors gracefully', () => {
      const mockSystem = { 
        update: jest.fn(() => { throw new Error('Test error'); }),
        render: jest.fn()
      };
      gameEngine.registerSystem('testSystem', mockSystem);
      
      // Should not throw
      expect(() => gameEngine.update(16)).not.toThrow();
    });
  });
  
  describe('Input Handling', () => {
    beforeEach(async () => {
      await gameEngine.initialize();
    });
    
    test('should track key states', () => {
      expect(gameEngine.isKeyPressed('Space')).toBe(false);
      
      gameEngine.keys['Space'] = true;
      
      expect(gameEngine.isKeyPressed('Space')).toBe(true);
    });
    
    test('should handle game state transitions', () => {
      gameEngine.gameState = 'menu';
      gameEngine.keys['Space'] = true;
      
      gameEngine.handleInput();
      
      expect(gameEngine.gameState).toBe('playing');
      expect(gameEngine.keys['Space']).toBe(false);
    });
    
    test('should handle pause/unpause', () => {
      gameEngine.gameState = 'playing';
      gameEngine.keys['Escape'] = true;
      
      gameEngine.handleInput();
      
      expect(gameEngine.gameState).toBe('paused');
      expect(gameEngine.keys['Escape']).toBe(false);
    });
  });
  
  describe('Asset Management', () => {
    beforeEach(async () => {
      await gameEngine.initialize();
    });
    
    test('should store loaded assets', () => {
      const mockImage = new Image();
      gameEngine.assets.set('testAsset', mockImage);
      
      expect(gameEngine.getAsset('testAsset')).toBe(mockImage);
    });
    
    test('should return undefined for non-existent assets', () => {
      expect(gameEngine.getAsset('nonExistent')).toBeUndefined();
    });
  });
  
  describe('FPS Monitoring', () => {
    beforeEach(async () => {
      await gameEngine.initialize();
    });
    
    test('should update FPS counter', () => {
      const initialFPS = gameEngine.fps;
      
      gameEngine.updateFPS(performance.now());
      gameEngine.frameCount = 60;
      gameEngine.updateFPS(performance.now() + 1000);
      
      expect(gameEngine.fps).toBe(60);
    });
  });
  
  describe('Game State Management', () => {
    beforeEach(async () => {
      await gameEngine.initialize();
    });
    
    test('should restart game', () => {
      const Matter = require('matter-js');
      gameEngine.gameState = 'gameOver';
      
      gameEngine.restart();
      
      expect(gameEngine.gameState).toBe('playing');
      expect(Matter.World.clear).toHaveBeenCalled();
      expect(Matter.Engine.clear).toHaveBeenCalled();
    });
  });
  
  describe('Rendering', () => {
    beforeEach(async () => {
      await gameEngine.initialize();
    });
    
    test('should clear canvas before rendering', () => {
      gameEngine.render();
      
      expect(gameEngine.ctx.clearRect).toHaveBeenCalledWith(0, 0, 1200, 800);
    });
    
    test('should render background', () => {
      gameEngine.render();
      
      expect(gameEngine.ctx.createLinearGradient).toHaveBeenCalled();
      expect(gameEngine.ctx.fillRect).toHaveBeenCalledWith(0, 0, 1200, 800);
    });
    
    test('should save and restore context for camera transforms', () => {
      gameEngine.render();
      
      expect(gameEngine.ctx.save).toHaveBeenCalled();
      expect(gameEngine.ctx.restore).toHaveBeenCalled();
    });
  });
  
  describe('Disposal', () => {
    test('should clean up resources', async () => {
      await gameEngine.initialize();
      gameEngine.start();
      
      gameEngine.dispose();
      
      expect(gameEngine.isRunning).toBe(false);
      expect(gameEngine.systems.size).toBe(0);
      expect(gameEngine.entities.size).toBe(0);
      expect(gameEngine.assets.size).toBe(0);
    });
  });
});