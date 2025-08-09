/**
 * Unit tests for 2D Desert Terrain Generator
 */

import TerrainGenerator2D from '../TerrainGenerator2D.js';
import Matter from 'matter-js';

describe('TerrainGenerator2D', () => {
  let terrainGenerator;
  let physicsWorld;
  
  beforeEach(() => {
    terrainGenerator = new TerrainGenerator2D({
      chunkSize: 1000,
      terrainHeight: 400,
      heightVariation: 100,
      pointSpacing: 10,
      seed: 12345 // Fixed seed for consistent tests
    });
    
    // Create physics world for testing
    physicsWorld = Matter.Engine.create().world;
  });
  
  afterEach(() => {
    if (terrainGenerator) {
      terrainGenerator.dispose(physicsWorld);
    }
  });
  
  describe('Initialization', () => {
    test('should initialize with default options', () => {
      const generator = new TerrainGenerator2D();
      
      expect(generator.options.chunkSize).toBe(1000);
      expect(generator.options.terrainHeight).toBe(400);
      expect(generator.options.heightVariation).toBe(100);
      expect(generator.options.pointSpacing).toBe(10);
      expect(generator.options.seed).toBeDefined();
    });
    
    test('should initialize with custom options', () => {
      const customOptions = {
        chunkSize: 2000,
        terrainHeight: 500,
        heightVariation: 150,
        pointSpacing: 20,
        seed: 54321
      };
      
      const generator = new TerrainGenerator2D(customOptions);
      
      expect(generator.options.chunkSize).toBe(2000);
      expect(generator.options.terrainHeight).toBe(500);
      expect(generator.options.heightVariation).toBe(150);
      expect(generator.options.pointSpacing).toBe(20);
      expect(generator.options.seed).toBe(54321);
    });
    
    test('should initialize obstacle types correctly', () => {
      expect(terrainGenerator.obstacleTypes).toBeDefined();
      expect(terrainGenerator.obstacleTypes.WRECKED_CAR).toBeDefined();
      expect(terrainGenerator.obstacleTypes.LARGE_ROCK).toBeDefined();
      expect(terrainGenerator.obstacleTypes.DEBRIS).toBeDefined();
      expect(terrainGenerator.obstacleTypes.SMALL_ROCK).toBeDefined();
      expect(terrainGenerator.obstacleTypes.CACTUS).toBeDefined();
    });
  });
  
  describe('Chunk Generation', () => {
    test('should generate a chunk with height map', () => {
      const chunk = terrainGenerator.generateChunk(0);
      
      expect(chunk).toBeDefined();
      expect(chunk.x).toBe(0);
      expect(chunk.worldX).toBe(0);
      expect(chunk.size).toBe(1000);
      expect(chunk.heightMap).toBeDefined();
      expect(Array.isArray(chunk.heightMap)).toBe(true);
      expect(chunk.heightMap.length).toBeGreaterThan(0);
    });
    
    test('should generate consistent terrain with same seed', () => {
      const chunk1 = terrainGenerator.generateChunk(0);
      const chunk2 = terrainGenerator.generateChunk(0);
      
      // Should return cached chunk
      expect(chunk1).toBe(chunk2);
      
      // Create new generator with same seed
      const generator2 = new TerrainGenerator2D({ seed: 12345 });
      const chunk3 = generator2.generateChunk(0);
      
      // Height maps should be similar (allowing for floating point differences)
      expect(chunk1.heightMap.length).toBe(chunk3.heightMap.length);
      
      for (let i = 0; i < Math.min(10, chunk1.heightMap.length); i++) {
        expect(Math.abs(chunk1.heightMap[i].y - chunk3.heightMap[i].y)).toBeLessThan(1);
      }
    });
    
    test('should generate obstacles in chunk', () => {
      const chunk = terrainGenerator.generateChunk(0);
      
      expect(chunk.obstacles).toBeDefined();
      expect(Array.isArray(chunk.obstacles)).toBe(true);
      expect(chunk.obstacles.length).toBeGreaterThan(0);
      
      // Check obstacle properties
      const obstacle = chunk.obstacles[0];
      expect(obstacle.id).toBeDefined();
      expect(obstacle.type).toBeDefined();
      expect(obstacle.x).toBeDefined();
      expect(obstacle.y).toBeDefined();
      expect(obstacle.width).toBeGreaterThan(0);
      expect(obstacle.height).toBeGreaterThan(0);
      expect(obstacle.health).toBeGreaterThan(0);
    });
    
    test('should generate zombie spawn points', () => {
      const chunk = terrainGenerator.generateChunk(0);
      
      expect(chunk.zombieSpawns).toBeDefined();
      expect(Array.isArray(chunk.zombieSpawns)).toBe(true);
      
      if (chunk.zombieSpawns.length > 0) {
        const spawn = chunk.zombieSpawns[0];
        expect(spawn.id).toBeDefined();
        expect(spawn.x).toBeDefined();
        expect(spawn.y).toBeDefined();
        expect(spawn.used).toBe(false);
      }
    });
    
    test('should create physics bodies when physics world provided', () => {
      const chunk = terrainGenerator.generateChunk(0, physicsWorld);
      
      expect(chunk.terrainBodies).toBeDefined();
      expect(Array.isArray(chunk.terrainBodies)).toBe(true);
      expect(chunk.terrainBodies.length).toBeGreaterThan(0);
      
      expect(chunk.obstacleBodies).toBeDefined();
      expect(Array.isArray(chunk.obstacleBodies)).toBe(true);
      expect(chunk.obstacleBodies.length).toBe(chunk.obstacles.length);
      
      // Check that bodies were added to physics world
      expect(physicsWorld.bodies.length).toBeGreaterThan(0);
    });
  });
  
  describe('Height Map Generation', () => {
    test('should generate height map with correct number of points', () => {
      const worldX = 0;
      const chunkSize = 1000;
      const heightMap = terrainGenerator.generateHeightMap(worldX, chunkSize);
      
      const expectedPoints = Math.ceil(chunkSize / terrainGenerator.options.pointSpacing) + 1;
      expect(heightMap.length).toBe(expectedPoints);
    });
    
    test('should generate height points with correct properties', () => {
      const heightMap = terrainGenerator.generateHeightMap(0, 1000);
      
      for (const point of heightMap) {
        expect(point.x).toBeDefined();
        expect(point.y).toBeDefined();
        expect(point.worldX).toBeDefined();
        expect(point.y).toBeGreaterThanOrEqual(100); // Minimum height
        expect(typeof point.x).toBe('number');
        expect(typeof point.y).toBe('number');
      }
    });
    
    test('should generate varying terrain heights', () => {
      const heightMap = terrainGenerator.generateHeightMap(0, 1000);
      
      // Check that terrain has variation
      const heights = heightMap.map(point => point.y);
      const minHeight = Math.min(...heights);
      const maxHeight = Math.max(...heights);
      
      expect(maxHeight - minHeight).toBeGreaterThan(50); // Should have significant variation
    });
    
    test('should generate smooth terrain transitions', () => {
      const heightMap = terrainGenerator.generateHeightMap(0, 1000);
      
      // Check that adjacent points don't have extreme differences
      for (let i = 1; i < heightMap.length; i++) {
        const heightDiff = Math.abs(heightMap[i].y - heightMap[i - 1].y);
        expect(heightDiff).toBeLessThan(100); // Reasonable slope
      }
    });
  });
  
  describe('Obstacle Generation', () => {
    test('should select obstacle types based on spawn chances', () => {
      const selectedTypes = new Set();
      
      // Generate multiple selections to test distribution
      for (let i = 0; i < 100; i++) {
        const type = terrainGenerator.selectObstacleType();
        selectedTypes.add(type);
        expect(terrainGenerator.obstacleTypes[type]).toBeDefined();
      }
      
      // Should select multiple different types
      expect(selectedTypes.size).toBeGreaterThan(1);
    });
    
    test('should generate obstacles with proper spacing', () => {
      const obstacles = terrainGenerator.generateObstacles(0, 1000, [
        { x: 0, y: 400 },
        { x: 1000, y: 400 }
      ]);
      
      // Check minimum spacing between obstacles
      for (let i = 1; i < obstacles.length; i++) {
        const distance = Math.abs(obstacles[i].x - obstacles[i - 1].x);
        expect(distance).toBeGreaterThan(50); // Reasonable minimum spacing
      }
    });
    
    test('should generate obstacles with valid properties', () => {
      const heightMap = [{ x: 0, y: 400 }, { x: 1000, y: 400 }];
      const obstacles = terrainGenerator.generateObstacles(0, 1000, heightMap);
      
      for (const obstacle of obstacles) {
        expect(obstacle.id).toMatch(/^obstacle_/);
        expect(obstacle.type).toBeDefined();
        expect(terrainGenerator.obstacleTypes[obstacle.type]).toBeDefined();
        expect(obstacle.x).toBeGreaterThanOrEqual(0);
        expect(obstacle.x).toBeLessThanOrEqual(1000);
        expect(obstacle.width).toBeGreaterThan(0);
        expect(obstacle.height).toBeGreaterThan(0);
        expect(obstacle.health).toBeGreaterThan(0);
        expect(obstacle.scale).toBeGreaterThan(0);
        expect(obstacle.destroyed).toBe(false);
      }
    });
  });
  
  describe('Zombie Spawn Generation', () => {
    test('should generate spawn points clear of obstacles', () => {
      const heightMap = [{ x: 0, y: 400 }, { x: 1000, y: 400 }];
      const obstacles = [
        { x: 200, y: 400, width: 50, height: 30 },
        { x: 600, y: 400, width: 40, height: 25 }
      ];
      
      const spawns = terrainGenerator.generateZombieSpawns(0, 1000, heightMap, obstacles);
      
      // Check that spawns are clear of obstacles
      for (const spawn of spawns) {
        for (const obstacle of obstacles) {
          const distance = Math.sqrt(
            Math.pow(spawn.x - obstacle.x, 2) + 
            Math.pow(spawn.y - obstacle.y, 2)
          );
          expect(distance).toBeGreaterThan(50); // Clearance radius
        }
      }
    });
    
    test('should generate spawn points with correct properties', () => {
      const heightMap = [{ x: 0, y: 400 }, { x: 1000, y: 400 }];
      const spawns = terrainGenerator.generateZombieSpawns(0, 1000, heightMap, []);
      
      for (const spawn of spawns) {
        expect(spawn.id).toMatch(/^spawn_/);
        expect(spawn.x).toBeGreaterThanOrEqual(0);
        expect(spawn.x).toBeLessThanOrEqual(1000);
        expect(spawn.y).toBeDefined();
        expect(spawn.used).toBe(false);
        expect(spawn.created).toBeDefined();
      }
    });
  });
  
  describe('Height Queries', () => {
    test('should get height at specific position', () => {
      const chunk = terrainGenerator.generateChunk(0);
      
      const height1 = terrainGenerator.getHeightAtPosition(100);
      const height2 = terrainGenerator.getHeightAtPosition(500);
      const height3 = terrainGenerator.getHeightAtPosition(900);
      
      expect(typeof height1).toBe('number');
      expect(typeof height2).toBe('number');
      expect(typeof height3).toBe('number');
      expect(height1).toBeGreaterThan(0);
      expect(height2).toBeGreaterThan(0);
      expect(height3).toBeGreaterThan(0);
    });
    
    test('should interpolate height between points', () => {
      const heightMap = [
        { x: 0, y: 400 },
        { x: 100, y: 500 },
        { x: 200, y: 300 }
      ];
      
      const height = terrainGenerator.getHeightAtPosition(50, heightMap);
      
      // Should be interpolated between 400 and 500
      expect(height).toBeGreaterThan(400);
      expect(height).toBeLessThan(500);
      expect(height).toBeCloseTo(450, 0); // Approximately halfway
    });
  });
  
  describe('Collision Detection', () => {
    test('should detect terrain collision', () => {
      const chunk = terrainGenerator.generateChunk(0);
      
      // Vehicle below terrain should collide
      const collisions = terrainGenerator.checkTerrainCollision(500, 500, 80, 40);
      
      expect(Array.isArray(collisions)).toBe(true);
      
      // Check if terrain collision detected
      const terrainCollision = collisions.find(c => c.type === 'terrain');
      if (terrainCollision) {
        expect(terrainCollision.penetration).toBeGreaterThan(0);
        expect(terrainCollision.normal).toBeDefined();
        expect(terrainCollision.point).toBeDefined();
      }
    });
    
    test('should detect obstacle collision', () => {
      const chunk = terrainGenerator.generateChunk(0);
      
      if (chunk.obstacles.length > 0) {
        const obstacle = chunk.obstacles[0];
        
        // Vehicle at obstacle position should collide
        const collisions = terrainGenerator.checkTerrainCollision(
          obstacle.x, obstacle.y, 80, 40
        );
        
        const obstacleCollision = collisions.find(c => c.type === 'obstacle');
        if (obstacleCollision) {
          expect(obstacleCollision.obstacle).toBe(obstacle);
          expect(obstacleCollision.penetration).toBeGreaterThan(0);
          expect(obstacleCollision.normal).toBeDefined();
        }
      }
    });
  });
  
  describe('Obstacle Damage', () => {
    test('should damage obstacle correctly', () => {
      const chunk = terrainGenerator.generateChunk(0);
      
      if (chunk.obstacles.length > 0) {
        const obstacle = chunk.obstacles[0];
        const initialHealth = obstacle.health;
        const damage = 25;
        
        const destroyed = terrainGenerator.damageObstacle(obstacle.id, damage);
        
        expect(obstacle.health).toBe(initialHealth - damage);
        expect(destroyed).toBe(obstacle.health <= 0);
        
        if (destroyed) {
          expect(obstacle.destroyed).toBe(true);
          expect(obstacle.destroyedAt).toBeDefined();
        }
      }
    });
    
    test('should destroy obstacle when health reaches zero', () => {
      const chunk = terrainGenerator.generateChunk(0);
      
      if (chunk.obstacles.length > 0) {
        const obstacle = chunk.obstacles[0];
        const damage = obstacle.health + 10; // More than current health
        
        const destroyed = terrainGenerator.damageObstacle(obstacle.id, damage);
        
        expect(destroyed).toBe(true);
        expect(obstacle.destroyed).toBe(true);
        expect(obstacle.health).toBeLessThanOrEqual(0);
      }
    });
  });
  
  describe('Range Queries', () => {
    test('should get obstacles in range', () => {
      const chunk = terrainGenerator.generateChunk(0);
      
      const obstacles = terrainGenerator.getObstaclesInRange(500, 300);
      
      expect(Array.isArray(obstacles)).toBe(true);
      
      // All returned obstacles should be within range
      for (const obstacle of obstacles) {
        expect(Math.abs(obstacle.x - 500)).toBeLessThanOrEqual(300);
        expect(obstacle.destroyed).toBe(false);
      }
    });
    
    test('should get zombie spawns in range', () => {
      const chunk = terrainGenerator.generateChunk(0);
      
      const spawns = terrainGenerator.getZombieSpawnsInRange(500, 300);
      
      expect(Array.isArray(spawns)).toBe(true);
      
      // All returned spawns should be within range and unused
      for (const spawn of spawns) {
        expect(Math.abs(spawn.x - 500)).toBeLessThanOrEqual(300);
        expect(spawn.used).toBe(false);
      }
    });
  });
  
  describe('Chunk Management', () => {
    test('should cache generated chunks', () => {
      const chunk1 = terrainGenerator.generateChunk(0);
      const chunk2 = terrainGenerator.generateChunk(0);
      
      // Should return same cached chunk
      expect(chunk1).toBe(chunk2);
      expect(terrainGenerator.chunks.size).toBe(1);
    });
    
    test('should clear chunk data', () => {
      const chunk = terrainGenerator.generateChunk(0, physicsWorld);
      const initialBodyCount = physicsWorld.bodies.length;
      
      expect(terrainGenerator.chunks.size).toBe(1);
      expect(initialBodyCount).toBeGreaterThan(0);
      
      terrainGenerator.clearChunk(0, physicsWorld);
      
      expect(terrainGenerator.chunks.size).toBe(0);
      expect(physicsWorld.bodies.length).toBeLessThan(initialBodyCount);
    });
    
    test('should track generation statistics', () => {
      const initialStats = terrainGenerator.getStats();
      
      terrainGenerator.generateChunk(0);
      terrainGenerator.generateChunk(1);
      
      const finalStats = terrainGenerator.getStats();
      
      expect(finalStats.chunksGenerated).toBe(initialStats.chunksGenerated + 2);
      expect(finalStats.chunksLoaded).toBe(2);
      expect(finalStats.totalObstacles).toBeGreaterThan(0);
      expect(finalStats.generationTime).toBeGreaterThan(initialStats.generationTime);
    });
  });
  
  describe('Pseudo-random Number Generation', () => {
    test('should generate consistent pseudo-random numbers', () => {
      const seed = 12345;
      const value1 = terrainGenerator.pseudoRandom(seed);
      const value2 = terrainGenerator.pseudoRandom(seed);
      
      expect(value1).toBe(value2);
      expect(value1).toBeGreaterThanOrEqual(0);
      expect(value1).toBeLessThan(1);
    });
    
    test('should generate different values for different seeds', () => {
      const value1 = terrainGenerator.pseudoRandom(12345);
      const value2 = terrainGenerator.pseudoRandom(54321);
      
      expect(value1).not.toBe(value2);
    });
  });
  
  describe('Disposal', () => {
    test('should dispose all resources', () => {
      terrainGenerator.generateChunk(0, physicsWorld);
      terrainGenerator.generateChunk(1, physicsWorld);
      
      const initialBodyCount = physicsWorld.bodies.length;
      expect(terrainGenerator.chunks.size).toBe(2);
      expect(initialBodyCount).toBeGreaterThan(0);
      
      terrainGenerator.dispose(physicsWorld);
      
      expect(terrainGenerator.chunks.size).toBe(0);
      expect(terrainGenerator.obstacles.size).toBe(0);
      expect(terrainGenerator.zombieSpawns.size).toBe(0);
      expect(physicsWorld.bodies.length).toBeLessThan(initialBodyCount);
    });
  });
});