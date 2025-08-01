/**
 * Performance testing on various device specifications
 * Tests performance optimization and device-specific adjustments
 */

import { GameEngine } from '../engine/GameEngine';
import { PerformanceManager } from '../performance/PerformanceManager';
import { VehicleManager } from '../vehicles/VehicleManager';
import { ZombieManager } from '../zombies/ZombieManager';
import { ObjectPool } from '../performance/ObjectPool';
import { LODSystem } from '../performance/LODSystem';

describe('Performance Tests', () => {
  let gameEngine;
  let performanceManager;
  let vehicleManager;
  let zombieManager;

  beforeEach(() => {
    gameEngine = new GameEngine();
    performanceManager = new PerformanceManager();
    vehicleManager = new VehicleManager();
    zombieManager = new ZombieManager();

    gameEngine.initialize();
    performanceManager.initialize();
    vehicleManager.initialize(gameEngine.scene, gameEngine.physics);
    zombieManager.initialize(gameEngine.scene, gameEngine.physics);
  });

  afterEach(() => {
    if (gameEngine) {
      gameEngine.dispose();
    }
  });

  describe('Device Specification Testing', () => {
    test('should adjust settings for low-end devices', () => {
      // Mock low-end device characteristics
      const mockDeviceInfo = {
        gpu: 'Intel HD Graphics',
        memory: 2048, // 2GB RAM
        cores: 2,
        isMobile: false
      };

      performanceManager.detectDevice(mockDeviceInfo);
      const settings = performanceManager.getOptimalSettings();

      expect(settings.quality).toBe('low');
      expect(settings.maxZombies).toBeLessThanOrEqual(50);
      expect(settings.particleCount).toBeLessThanOrEqual(500);
      expect(settings.shadowQuality).toBe('off');
      expect(settings.textureQuality).toBe('low');
    });

    test('should adjust settings for mid-range devices', () => {
      const mockDeviceInfo = {
        gpu: 'NVIDIA GTX 1060',
        memory: 8192, // 8GB RAM
        cores: 4,
        isMobile: false
      };

      performanceManager.detectDevice(mockDeviceInfo);
      const settings = performanceManager.getOptimalSettings();

      expect(settings.quality).toBe('medium');
      expect(settings.maxZombies).toBeLessThanOrEqual(100);
      expect(settings.particleCount).toBeLessThanOrEqual(1000);
      expect(settings.shadowQuality).toBe('medium');
      expect(settings.textureQuality).toBe('medium');
    });

    test('should adjust settings for high-end devices', () => {
      const mockDeviceInfo = {
        gpu: 'NVIDIA RTX 3080',
        memory: 16384, // 16GB RAM
        cores: 8,
        isMobile: false
      };

      performanceManager.detectDevice(mockDeviceInfo);
      const settings = performanceManager.getOptimalSettings();

      expect(settings.quality).toBe('high');
      expect(settings.maxZombies).toBeLessThanOrEqual(200);
      expect(settings.particleCount).toBeLessThanOrEqual(2000);
      expect(settings.shadowQuality).toBe('high');
      expect(settings.textureQuality).toBe('high');
    });

    test('should adjust settings for mobile devices', () => {
      const mockDeviceInfo = {
        gpu: 'Adreno 640',
        memory: 4096, // 4GB RAM
        cores: 8,
        isMobile: true
      };

      performanceManager.detectDevice(mockDeviceInfo);
      const settings = performanceManager.getOptimalSettings();

      expect(settings.quality).toBe('low');
      expect(settings.maxZombies).toBeLessThanOrEqual(30);
      expect(settings.particleCount).toBeLessThanOrEqual(300);
      expect(settings.shadowQuality).toBe('off');
      expect(settings.renderScale).toBeLessThanOrEqual(0.8);
    });
  });

  describe('Frame Rate Performance', () => {
    test('should maintain 60 FPS with minimal load', () => {
      const frameRates = [];
      let lastTime = performance.now();

      // Run 60 frames with minimal load
      for (let i = 0; i < 60; i++) {
        const currentTime = performance.now();
        const deltaTime = (currentTime - lastTime) / 1000;

        gameEngine.update(deltaTime);

        if (deltaTime > 0) {
          frameRates.push(1 / deltaTime);
        }

        lastTime = currentTime;
      }

      const averageFrameRate = frameRates.reduce((a, b) => a + b) / frameRates.length;
      expect(averageFrameRate).toBeGreaterThan(55); // Allow some variance
    });

    test('should maintain acceptable FPS under moderate load', () => {
      // Spawn moderate number of zombies
      for (let i = 0; i < 50; i++) {
        zombieManager.spawnZombie('walker', {
          x: Math.random() * 100 - 50,
          y: 0,
          z: Math.random() * 100 - 50
        });
      }

      const frameRates = [];
      let lastTime = performance.now();

      // Run 60 frames with moderate load
      for (let i = 0; i < 60; i++) {
        const currentTime = performance.now();
        const deltaTime = (currentTime - lastTime) / 1000;

        gameEngine.update(deltaTime);
        zombieManager.update(deltaTime);

        if (deltaTime > 0) {
          frameRates.push(1 / deltaTime);
        }

        lastTime = currentTime;
      }

      const averageFrameRate = frameRates.reduce((a, b) => a + b) / frameRates.length;
      expect(averageFrameRate).toBeGreaterThan(30); // Should maintain at least 30 FPS
    });

    test('should adapt quality under heavy load', () => {
      // Spawn heavy load
      for (let i = 0; i < 200; i++) {
        zombieManager.spawnZombie('walker', {
          x: Math.random() * 200 - 100,
          y: 0,
          z: Math.random() * 200 - 100
        });
      }

      const initialSettings = performanceManager.getSettings();
      
      // Simulate performance monitoring
      performanceManager.startMonitoring();
      
      // Run frames and simulate low FPS
      for (let i = 0; i < 10; i++) {
        performanceManager.recordFrameTime(50); // 20 FPS
      }

      performanceManager.adjustSettings();
      const adjustedSettings = performanceManager.getSettings();

      // Settings should be reduced to maintain performance
      expect(adjustedSettings.quality).toBeLessThanOrEqual(initialSettings.quality);
      expect(adjustedSettings.maxZombies).toBeLessThanOrEqual(initialSettings.maxZombies);
    });
  });

  describe('Memory Performance', () => {
    test('should manage memory usage efficiently', () => {
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

      // Create and destroy many objects
      const zombies = [];
      for (let i = 0; i < 100; i++) {
        const zombie = zombieManager.spawnZombie('walker', {
          x: Math.random() * 100,
          y: 0,
          z: Math.random() * 100
        });
        zombies.push(zombie);
      }

      // Remove all zombies
      zombies.forEach(zombie => {
        zombieManager.removeZombie(zombie.id);
      });

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;

      // Memory usage should not grow significantly
      if (performance.memory) {
        const memoryGrowth = finalMemory - initialMemory;
        expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
      }
    });

    test('should use object pooling effectively', () => {
      const objectPool = new ObjectPool(() => ({ active: false }), 10);

      // Get objects from pool
      const objects = [];
      for (let i = 0; i < 20; i++) {
        objects.push(objectPool.get());
      }

      expect(objects.length).toBe(20);

      // Return objects to pool
      objects.forEach(obj => objectPool.return(obj));

      // Pool should reuse objects
      const newObjects = [];
      for (let i = 0; i < 10; i++) {
        newObjects.push(objectPool.get());
      }

      // Some objects should be reused from pool
      const reusedCount = newObjects.filter(obj => 
        objects.includes(obj)
      ).length;

      expect(reusedCount).toBeGreaterThan(0);
    });

    test('should handle memory pressure gracefully', () => {
      // Simulate memory pressure
      performanceManager.handleMemoryPressure();

      const settings = performanceManager.getSettings();

      // Should reduce memory-intensive settings
      expect(settings.maxZombies).toBeLessThan(100);
      expect(settings.particleCount).toBeLessThan(1000);
      expect(settings.textureQuality).toBeLessThanOrEqual('medium');
    });
  });

  describe('LOD System Performance', () => {
    test('should reduce detail for distant objects', () => {
      const lodSystem = new LODSystem();
      lodSystem.initialize();

      // Create objects at various distances
      const objects = [];
      for (let i = 0; i < 10; i++) {
        const distance = i * 50; // 0, 50, 100, 150, etc.
        const object = {
          position: { x: distance, y: 0, z: 0 },
          mesh: { geometry: { vertices: 1000 } }
        };
        objects.push(object);
      }

      const camera = { position: { x: 0, y: 0, z: 0 } };
      lodSystem.updateLOD(objects, camera);

      // Distant objects should have lower detail
      const distantObject = objects[9]; // Furthest object
      const nearObject = objects[0]; // Closest object

      expect(distantObject.lodLevel).toBeGreaterThan(nearObject.lodLevel);
    });

    test('should improve performance with LOD enabled', () => {
      const lodSystem = new LODSystem();
      
      // Create many objects
      const objects = [];
      for (let i = 0; i < 100; i++) {
        objects.push({
          position: { 
            x: Math.random() * 1000 - 500, 
            y: 0, 
            z: Math.random() * 1000 - 500 
          },
          mesh: { geometry: { vertices: 1000 } }
        });
      }

      const camera = { position: { x: 0, y: 0, z: 0 } };

      // Measure performance without LOD
      const startTime = performance.now();
      for (let i = 0; i < 60; i++) {
        // Simulate rendering all objects at full detail
        objects.forEach(obj => {
          // Simulate expensive rendering operation
          for (let j = 0; j < obj.mesh.geometry.vertices; j++) {
            // Dummy operation
          }
        });
      }
      const timeWithoutLOD = performance.now() - startTime;

      // Measure performance with LOD
      lodSystem.initialize();
      const startTimeLOD = performance.now();
      for (let i = 0; i < 60; i++) {
        lodSystem.updateLOD(objects, camera);
        objects.forEach(obj => {
          const vertices = obj.lodLevel ? 
            obj.mesh.geometry.vertices / (obj.lodLevel * 2) : 
            obj.mesh.geometry.vertices;
          
          for (let j = 0; j < vertices; j++) {
            // Dummy operation
          }
        });
      }
      const timeWithLOD = performance.now() - startTimeLOD;

      // LOD should improve performance
      expect(timeWithLOD).toBeLessThan(timeWithoutLOD);
    });
  });

  describe('Rendering Performance', () => {
    test('should optimize draw calls', () => {
      const renderer = gameEngine.renderer;
      const initialDrawCalls = renderer.info ? renderer.info.render.calls : 0;

      // Add many similar objects that can be batched
      for (let i = 0; i < 50; i++) {
        zombieManager.spawnZombie('walker', {
          x: i * 2,
          y: 0,
          z: 0
        });
      }

      gameEngine.render();

      const finalDrawCalls = renderer.info ? renderer.info.render.calls : 0;
      const drawCallIncrease = finalDrawCalls - initialDrawCalls;

      // Draw calls should not increase linearly with object count
      expect(drawCallIncrease).toBeLessThan(50);
    });

    test('should handle texture memory efficiently', () => {
      const textureManager = gameEngine.textureManager;
      
      // Load multiple textures
      const textures = [];
      for (let i = 0; i < 10; i++) {
        const texture = textureManager.loadTexture(`test_texture_${i}.jpg`);
        textures.push(texture);
      }

      // Textures should be cached and reused
      const cachedTexture = textureManager.loadTexture('test_texture_0.jpg');
      expect(cachedTexture).toBe(textures[0]);

      // Memory usage should be reasonable
      const memoryUsage = textureManager.getMemoryUsage();
      expect(memoryUsage).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });

    test('should cull objects outside camera frustum', () => {
      const camera = gameEngine.camera;
      camera.position.set(0, 0, 0);
      camera.lookAt(0, 0, -1);

      // Spawn zombies in and out of view
      const zombiesInView = [];
      const zombiesOutOfView = [];

      for (let i = 0; i < 10; i++) {
        // In view
        const zombieInView = zombieManager.spawnZombie('walker', {
          x: 0, y: 0, z: -10 - i
        });
        zombiesInView.push(zombieInView);

        // Out of view (behind camera)
        const zombieOutOfView = zombieManager.spawnZombie('walker', {
          x: 0, y: 0, z: 10 + i
        });
        zombiesOutOfView.push(zombieOutOfView);
      }

      // Update frustum culling
      gameEngine.updateFrustumCulling();

      // Objects out of view should be culled
      zombiesOutOfView.forEach(zombie => {
        expect(zombie.mesh.visible).toBe(false);
      });

      zombiesInView.forEach(zombie => {
        expect(zombie.mesh.visible).toBe(true);
      });
    });
  });

  describe('Network Performance', () => {
    test('should handle slow network connections', async () => {
      // Mock slow network
      global.fetch = jest.fn(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: () => Promise.resolve({ data: 'test' })
          }), 2000) // 2 second delay
        )
      );

      const { SaveManager } = require('../save/SaveManager');
      const saveManager = new SaveManager();

      const startTime = performance.now();
      
      // Should timeout and use fallback
      const result = await saveManager.saveToServer({ test: 'data' });
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should not wait indefinitely
      expect(duration).toBeLessThan(5000); // 5 second max
      expect(result).toBeDefined(); // Should have fallback result
    });

    test('should batch API requests efficiently', async () => {
      const { SaveManager } = require('../save/SaveManager');
      const saveManager = new SaveManager();

      let requestCount = 0;
      global.fetch = jest.fn(() => {
        requestCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });
      });

      // Make multiple save requests quickly
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(saveManager.saveToServer({ data: i }));
      }

      await Promise.all(promises);

      // Should batch requests to reduce network calls
      expect(requestCount).toBeLessThan(10);
    });
  });

  describe('Battery Performance (Mobile)', () => {
    test('should reduce performance on low battery', () => {
      // Mock battery API
      Object.defineProperty(navigator, 'getBattery', {
        value: () => Promise.resolve({
          level: 0.15, // 15% battery
          charging: false
        }),
        configurable: true
      });

      performanceManager.handleBatteryChange();
      const settings = performanceManager.getSettings();

      // Should reduce performance to save battery
      expect(settings.quality).toBeLessThanOrEqual('medium');
      expect(settings.targetFPS).toBeLessThanOrEqual(30);
    });

    test('should restore performance when charging', () => {
      // Mock battery API - charging
      Object.defineProperty(navigator, 'getBattery', {
        value: () => Promise.resolve({
          level: 0.15, // 15% battery but charging
          charging: true
        }),
        configurable: true
      });

      performanceManager.handleBatteryChange();
      const settings = performanceManager.getSettings();

      // Should maintain better performance when charging
      expect(settings.targetFPS).toBeGreaterThan(30);
    });
  });
});