/**
 * Unit tests for Terrain Manager
 */

import TerrainManager from '../TerrainManager.js';
import Matter from 'matter-js';

// Mock canvas for testing
const mockCanvas = {
  width: 1200,
  height: 800
};

// Mock camera for testing
const mockCamera = {
  x: 0,
  y: 0,
  canvas: mockCanvas,
  debug: false
};

describe('TerrainManager', () => {
  let terrainManager;
  let physicsWorld;
  
  beforeEach(() => {
    terrainManager = new TerrainManager({
      chunkSize: 1000,
      loadDistance: 2000,
      unloadDistance: 3000,
      maxLoadedChunks: 5,
      seed: 12345
    });
    
    physicsWorld = Matter.Engine.create().world;
    terrainManager.setPhysicsWorld(physicsWorld);
  });
  
  afterEach(() => {
    if (terrainManager) {
      terrainManager.dispose();
    }
  });
  
  describe('Initialization', () => {
    test('should initialize with default options', () => {
      const manager = new TerrainManager();
      
      expect(manager.options.chunkSize).toBe(1000);
      expect(manager.options.loadDistance).toBe(2000);
      expect(manager.options.unloadDistance).toBe(3000);
      expect(manager.options.maxLoadedChunks).toBe(10);
    });
    
    test('should initialize with custom options', () => {
      const customOptions = {
        chunkSize: 2000,
        loadDistance: 4000,
        unloadDistance: 6000,
        maxLoadedChunks: 8
      };
      
      const manager = new TerrainManager(customOptions);
      
      expect(manager.options.chunkSize).toBe(2000);
      expect(manager.options.loadDistance).toBe(4000);
      expect(manager.options.unloadDistance).toBe(6000);
      expect(manager.options.maxLoadedChunks).toBe(8);
    });
    
    test('should initialize terrain generator', () => {
      expect(terrainManager.terrainGenerator).toBeDefined();
      expect(terrainManager.loadedChunks).toBeDefined();
      expect(terrainManager.loadedChunks.size).toBe(0);
    });
  });
  
  describe('Physics World', () => {
    test('should set physics world', () => {
      const newPhysicsWorld = Matter.Engine.create().world;
      terrainManager.setPhysicsWorld(newPhysicsWorld);
      
      expect(terrainManager.physicsWorld).toBe(newPhysicsWorld);
    });
  });
  
  describe('Chunk Loading', () => {
    test('should load chunk when requested', () => {
      const chunk = terrainManager.loadChunk(0);
      
      expect(chunk).toBeDefined();
      expect(chunk.x).toBe(0);
      expect(terrainManager.loadedChunks.size).toBe(1);
      expect(terrainManager.loadedChunks.has('chunk_0')).toBe(true);
    });
    
    test('should not reload already loaded chunk', () => {
      const chunk1 = terrainManager.loadChunk(0);
      const chunk2 = terrainManager.loadChunk(0);
      
      expect(chunk1).toBe(chunk2);
      expect(terrainManager.loadedChunks.size).toBe(1);
    });
    
    test('should create physics bodies when loading chunk', () => {
      const initialBodyCount = physicsWorld.bodies.length;
      
      terrainManager.loadChunk(0);
      
      expect(physicsWorld.bodies.length).toBeGreaterThan(initialBodyCount);
    });
    
    test('should track loading statistics', () => {
      const initialStats = terrainManager.getStats();
      
      terrainManager.loadChunk(0);
      terrainManager.loadChunk(1);
      
      const finalStats = terrainManager.getStats();
      
      expect(finalStats.chunksLoaded).toBe(initialStats.chunksLoaded + 2);
      expect(finalStats.totalLoadTime).toBeGreaterThan(initialStats.totalLoadTime);
    });
  });
  
  describe('Chunk Unloading', () => {
    test('should unload chunk when requested', () => {
      terrainManager.loadChunk(0);
      expect(terrainManager.loadedChunks.size).toBe(1);
      
      terrainManager.unloadChunk(0);
      expect(terrainManager.loadedChunks.size).toBe(0);
    });
    
    test('should remove physics bodies when unloading chunk', () => {
      terrainManager.loadChunk(0);
      const loadedBodyCount = physicsWorld.bodies.length;
      
      terrainManager.unloadChunk(0);
      
      expect(physicsWorld.bodies.length).toBeLessThan(loadedBodyCount);
    });
    
    test('should handle unloading non-existent chunk gracefully', () => {
      expect(() => {
        terrainManager.unloadChunk(999);
      }).not.toThrow();
    });
    
    test('should track unloading statistics', () => {
      terrainManager.loadChunk(0);
      const initialStats = terrainManager.getStats();
      
      terrainManager.unloadChunk(0);
      
      const finalStats = terrainManager.getStats();
      
      expect(finalStats.chunksUnloaded).toBe(initialStats.chunksUnloaded + 1);
      expect(finalStats.totalUnloadTime).toBeGreaterThan(initialStats.totalUnloadTime);
    });
  });
  
  describe('Automatic Chunk Management', () => {
    test('should load chunks based on camera position', () => {
      // Camera at position 0 should load chunks around it
      terrainManager.update(0, 16);
      
      expect(terrainManager.loadedChunks.size).toBeGreaterThan(0);
      expect(terrainManager.loadedChunks.has('chunk_0')).toBe(true);
    });
    
    test('should load chunks ahead of camera', () => {
      // Camera moving forward should load chunks ahead
      terrainManager.update(1500, 16);
      
      expect(terrainManager.loadedChunks.has('chunk_1')).toBe(true);
      expect(terrainManager.loadedChunks.has('chunk_2')).toBe(true);
    });
    
    test('should unload distant chunks', () => {
      // Load initial chunks
      terrainManager.update(0, 16);
      const initialChunks = new Set(terrainManager.loadedChunks.keys());
      
      // Move camera far away
      terrainManager.update(5000, 16);
      
      // Some initial chunks should be unloaded
      let unloadedCount = 0;
      for (const chunkKey of initialChunks) {
        if (!terrainManager.loadedChunks.has(chunkKey)) {
          unloadedCount++;
        }
      }
      
      expect(unloadedCount).toBeGreaterThan(0);
    });
    
    test('should enforce maximum loaded chunks limit', () => {
      // Load many chunks by moving camera
      for (let x = 0; x < 10000; x += 1000) {
        terrainManager.update(x, 16);
      }
      
      expect(terrainManager.loadedChunks.size).toBeLessThanOrEqual(
        terrainManager.options.maxLoadedChunks
      );
    });
    
    test('should not update chunks if camera has not moved significantly', () => {
      terrainManager.update(0, 16);
      const initialChunkCount = terrainManager.loadedChunks.size;
      
      // Small camera movement should not trigger chunk updates
      terrainManager.update(50, 16);
      
      expect(terrainManager.loadedChunks.size).toBe(initialChunkCount);
    });
  });
  
  describe('Terrain Queries', () => {
    test('should get height at position', () => {
      terrainManager.loadChunk(0);
      
      const height = terrainManager.getHeightAtPosition(500);
      
      expect(typeof height).toBe('number');
      expect(height).toBeGreaterThan(0);
    });
    
    test('should check collision with terrain', () => {
      terrainManager.loadChunk(0);
      
      const collisions = terrainManager.checkCollision(500, 500, 80, 40);
      
      expect(Array.isArray(collisions)).toBe(true);
    });
    
    test('should get obstacles in range', () => {
      terrainManager.loadChunk(0);
      
      const obstacles = terrainManager.getObstaclesInRange(500, 300);
      
      expect(Array.isArray(obstacles)).toBe(true);
    });
    
    test('should get zombie spawns in range', () => {
      terrainManager.loadChunk(0);
      
      const spawns = terrainManager.getZombieSpawnsInRange(500, 300);
      
      expect(Array.isArray(spawns)).toBe(true);
    });
  });
  
  describe('Obstacle Management', () => {
    test('should damage obstacle by ID', () => {
      terrainManager.loadChunk(0);
      const obstacles = terrainManager.getObstaclesInRange(500, 1000);
      
      if (obstacles.length > 0) {
        const obstacle = obstacles[0];
        const initialHealth = obstacle.health;
        
        const damaged = terrainManager.damageObstacle(obstacle.id, 25);
        
        expect(obstacle.health).toBe(initialHealth - 25);
      }
    });
    
    test('should mark zombie spawn as used', () => {
      terrainManager.loadChunk(0);
      const spawns = terrainManager.getZombieSpawnsInRange(500, 1000);
      
      if (spawns.length > 0) {
        const spawn = spawns[0];
        expect(spawn.used).toBe(false);
        
        const marked = terrainManager.useZombieSpawn(spawn.id);
        
        expect(marked).toBe(true);
        expect(spawn.used).toBe(true);
      }
    });
  });
  
  describe('Rendering', () => {
    test('should render without errors', () => {
      terrainManager.loadChunk(0);
      
      // Mock canvas context
      const mockCtx = {
        save: jest.fn(),
        restore: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        closePath: jest.fn(),
        fill: jest.fn(),
        stroke: jest.fn(),
        fillRect: jest.fn(),
        strokeRect: jest.fn(),
        arc: jest.fn(),
        ellipse: jest.fn(),
        translate: jest.fn(),
        rotate: jest.fn(),
        scale: jest.fn(),
        setTransform: jest.fn(),
        createLinearGradient: jest.fn(() => ({
          addColorStop: jest.fn()
        })),
        fillText: jest.fn()
      };
      
      // Set mock properties
      Object.defineProperty(mockCtx, 'fillStyle', { writable: true });
      Object.defineProperty(mockCtx, 'strokeStyle', { writable: true });
      Object.defineProperty(mockCtx, 'lineWidth', { writable: true });
      Object.defineProperty(mockCtx, 'font', { writable: true });
      Object.defineProperty(mockCtx, 'textAlign', { writable: true });
      
      expect(() => {
        terrainManager.render(mockCtx, mockCamera);
      }).not.toThrow();
    });
    
    test('should render debug info when camera debug is enabled', () => {
      terrainManager.loadChunk(0);
      
      const mockCtx = {
        save: jest.fn(),
        restore: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        closePath: jest.fn(),
        fill: jest.fn(),
        stroke: jest.fn(),
        fillRect: jest.fn(),
        strokeRect: jest.fn(),
        arc: jest.fn(),
        ellipse: jest.fn(),
        translate: jest.fn(),
        rotate: jest.fn(),
        scale: jest.fn(),
        setTransform: jest.fn(),
        createLinearGradient: jest.fn(() => ({
          addColorStop: jest.fn()
        })),
        fillText: jest.fn()
      };
      
      Object.defineProperty(mockCtx, 'fillStyle', { writable: true });
      Object.defineProperty(mockCtx, 'strokeStyle', { writable: true });
      Object.defineProperty(mockCtx, 'lineWidth', { writable: true });
      Object.defineProperty(mockCtx, 'font', { writable: true });
      Object.defineProperty(mockCtx, 'textAlign', { writable: true });
      
      const debugCamera = { ...mockCamera, debug: true };
      
      terrainManager.render(mockCtx, debugCamera);
      
      // Should call fillText for debug info
      expect(mockCtx.fillText).toHaveBeenCalled();
    });
  });
  
  describe('Statistics', () => {
    test('should provide comprehensive statistics', () => {
      terrainManager.loadChunk(0);
      terrainManager.loadChunk(1);
      terrainManager.unloadChunk(0);
      
      const stats = terrainManager.getStats();
      
      expect(stats.chunksLoaded).toBeDefined();
      expect(stats.chunksUnloaded).toBeDefined();
      expect(stats.loadedChunks).toBeDefined();
      expect(stats.totalLoadTime).toBeDefined();
      expect(stats.totalUnloadTime).toBeDefined();
      expect(stats.averageLoadTime).toBeDefined();
      expect(stats.averageUnloadTime).toBeDefined();
      
      expect(stats.chunksLoaded).toBeGreaterThan(0);
      expect(stats.loadedChunks).toBeGreaterThan(0);
    });
    
    test('should calculate average times correctly', () => {
      terrainManager.loadChunk(0);
      terrainManager.loadChunk(1);
      
      const stats = terrainManager.getStats();
      
      expect(stats.averageLoadTime).toBe(stats.totalLoadTime / stats.chunksLoaded);
    });
  });
  
  describe('Disposal', () => {
    test('should dispose all resources', () => {
      terrainManager.loadChunk(0);
      terrainManager.loadChunk(1);
      terrainManager.loadChunk(2);
      
      const initialBodyCount = physicsWorld.bodies.length;
      expect(terrainManager.loadedChunks.size).toBe(3);
      
      terrainManager.dispose();
      
      expect(terrainManager.loadedChunks.size).toBe(0);
      expect(physicsWorld.bodies.length).toBeLessThan(initialBodyCount);
    });
    
    test('should handle disposal when no chunks loaded', () => {
      expect(() => {
        terrainManager.dispose();
      }).not.toThrow();
    });
  });
  
  describe('Color Utilities', () => {
    test('should darken color correctly', () => {
      const originalColor = '#ff0000';
      const darkenedColor = terrainManager.darkenColor(originalColor, 0.5);
      
      expect(darkenedColor).toBeDefined();
      expect(darkenedColor).not.toBe(originalColor);
    });
    
    test('should handle non-hex colors', () => {
      const color = 'red';
      const result = terrainManager.darkenColor(color, 0.5);
      
      expect(result).toBe(color); // Should return original for non-hex
    });
  });
  
  describe('Performance', () => {
    test('should handle rapid camera movement efficiently', () => {
      const startTime = performance.now();
      
      // Simulate rapid camera movement
      for (let x = 0; x < 5000; x += 200) {
        terrainManager.update(x, 16);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should complete in reasonable time (less than 100ms)
      expect(totalTime).toBeLessThan(100);
    });
    
    test('should maintain chunk limit under stress', () => {
      // Load many chunks rapidly
      for (let x = 0; x < 20000; x += 500) {
        terrainManager.update(x, 16);
      }
      
      expect(terrainManager.loadedChunks.size).toBeLessThanOrEqual(
        terrainManager.options.maxLoadedChunks
      );
    });
  });
});