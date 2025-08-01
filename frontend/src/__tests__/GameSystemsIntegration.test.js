/**
 * Comprehensive integration tests covering all game systems and mechanics
 * Tests the interaction between different game components
 */

import { GameEngine } from '../engine/GameEngine';
import { VehicleManager } from '../vehicles/VehicleManager';
import { ZombieManager } from '../zombies/ZombieManager';
import { CombatSystem } from '../combat/CombatSystem';
import { ScoringSystem } from '../scoring/ScoringSystem';
import { UpgradeManager } from '../upgrades/UpgradeManager';
import { LevelManager } from '../levels/LevelManager';
import { AudioManager } from '../audio/AudioManager';
import { SaveManager } from '../save/SaveManager';

describe('Game Systems Integration', () => {
  let gameEngine;
  let vehicleManager;
  let zombieManager;
  let combatSystem;
  let scoringSystem;
  let upgradeManager;
  let levelManager;
  let audioManager;
  let saveManager;

  beforeEach(() => {
    // Initialize all game systems
    gameEngine = new GameEngine();
    
    // Add physics mock to gameEngine
    gameEngine.physics = {
      world: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        step: jest.fn(),
        addBody: jest.fn(),
        removeBody: jest.fn()
      },
      createBox: jest.fn(() => ({ body: {}, shape: {} })),
      createSphere: jest.fn(() => ({ body: {}, shape: {} })),
      createCylinder: jest.fn(() => ({ body: {}, shape: {} }))
    };
    
    vehicleManager = new VehicleManager();
    zombieManager = new ZombieManager();
    combatSystem = new CombatSystem(gameEngine);
    scoringSystem = new ScoringSystem();
    upgradeManager = new UpgradeManager();
    levelManager = new LevelManager();
    audioManager = new AudioManager();
    saveManager = new SaveManager();

    // Mock DOM element for renderer
    document.body.innerHTML = '<div id="game-container"></div>';
  });

  afterEach(() => {
    // Clean up after each test
    if (gameEngine) {
      gameEngine.dispose();
    }
    document.body.innerHTML = '';
  });

  describe('Core Game Loop Integration', () => {
    test('should initialize all systems correctly', async () => {
      await gameEngine.initialize();
      
      expect(gameEngine.scene).toBeDefined();
      expect(gameEngine.camera).toBeDefined();
      expect(gameEngine.renderer).toBeDefined();
      expect(gameEngine.physics).toBeDefined();
    });

    test('should handle complete game update cycle', () => {
      const deltaTime = 0.016; // 60 FPS
      
      gameEngine.initialize();
      vehicleManager.initialize(gameEngine.scene, gameEngine.physics);
      zombieManager.initialize(gameEngine.scene, gameEngine.physics);
      
      // Simulate game update cycle
      expect(() => {
        gameEngine.update(deltaTime);
        vehicleManager.update(deltaTime);
        zombieManager.update(deltaTime);
        combatSystem.update(deltaTime);
        scoringSystem.update(deltaTime);
      }).not.toThrow();
    });
  });

  describe('Vehicle-Zombie Combat Integration', () => {
    test('should handle vehicle-zombie collision and scoring', () => {
      gameEngine.initialize();
      vehicleManager.initialize(gameEngine.scene, gameEngine.physics);
      zombieManager.initialize(gameEngine.scene, gameEngine.physics);
      
      // Spawn a vehicle and zombie
      const vehicle = vehicleManager.spawnVehicle('sedan', { x: 0, y: 0, z: 0 });
      const zombie = zombieManager.spawnZombie('walker', { x: 1, y: 0, z: 0 });
      
      // Simulate collision
      const collision = {
        vehicle: vehicle,
        zombie: zombie,
        impact: { x: 0.5, y: 0, z: 0 }
      };
      
      const initialScore = scoringSystem.getScore();
      combatSystem.handleCollision(collision);
      
      // Verify zombie is eliminated and score increased
      expect(zombie.health).toBeLessThanOrEqual(0);
      expect(scoringSystem.getScore()).toBeGreaterThan(initialScore);
    });

    test('should apply vehicle upgrades to combat effectiveness', () => {
      gameEngine.initialize();
      vehicleManager.initialize(gameEngine.scene, gameEngine.physics);
      
      const vehicle = vehicleManager.spawnVehicle('sedan', { x: 0, y: 0, z: 0 });
      const baseStats = { ...vehicle.stats };
      
      // Apply engine upgrade
      upgradeManager.applyUpgrade(vehicle, 'engine', 1);
      
      expect(vehicle.stats.speed).toBeGreaterThan(baseStats.speed);
      expect(vehicle.stats.acceleration).toBeGreaterThan(baseStats.acceleration);
    });
  });

  describe('Level Progression Integration', () => {
    test('should handle level completion and progression', () => {
      levelManager.initialize();
      const level = levelManager.getCurrentLevel();
      
      // Simulate level completion
      const completionData = {
        score: 1000,
        zombiesKilled: 50,
        distanceTraveled: 500,
        timeElapsed: 120
      };
      
      levelManager.completeLevel(completionData);
      
      expect(levelManager.isLevelCompleted(level.id)).toBe(true);
      expect(levelManager.canAccessLevel(level.id + 1)).toBe(true);
    });

    test('should unlock vehicles based on level progression', () => {
      levelManager.initialize();
      vehicleManager.initialize();
      
      // Complete multiple levels
      for (let i = 1; i <= 5; i++) {
        levelManager.completeLevel({
          levelId: i,
          score: 1000 * i,
          zombiesKilled: 50 * i
        });
      }
      
      const availableVehicles = vehicleManager.getAvailableVehicles();
      expect(availableVehicles.length).toBeGreaterThan(1);
    });
  });

  describe('Save System Integration', () => {
    test('should save and restore complete game state', async () => {
      // Initialize game state
      gameEngine.initialize();
      vehicleManager.initialize(gameEngine.scene, gameEngine.physics);
      scoringSystem.setScore(5000);
      
      const vehicle = vehicleManager.spawnVehicle('suv', { x: 0, y: 0, z: 0 });
      upgradeManager.applyUpgrade(vehicle, 'engine', 2);
      
      // Save game state
      const saveData = saveManager.createSaveData({
        score: scoringSystem.getScore(),
        vehicle: vehicle,
        upgrades: upgradeManager.getUpgrades(vehicle.id),
        levelProgress: levelManager.getProgress()
      });
      
      await saveManager.saveGame(saveData);
      
      // Reset and restore
      scoringSystem.setScore(0);
      const restoredData = await saveManager.loadGame();
      
      expect(restoredData.score).toBe(5000);
      expect(restoredData.vehicle.type).toBe('suv');
      expect(restoredData.upgrades.engine).toBe(2);
    });
  });

  describe('Audio System Integration', () => {
    test('should play appropriate sounds for game events', () => {
      audioManager.initialize();
      
      const playSoundSpy = jest.spyOn(audioManager, 'playSound');
      
      // Simulate various game events
      combatSystem.on('zombieHit', () => {
        audioManager.playSound('zombie_impact');
      });
      
      vehicleManager.on('engineStart', () => {
        audioManager.playSound('engine_start');
      });
      
      // Trigger events
      combatSystem.emit('zombieHit');
      vehicleManager.emit('engineStart');
      
      expect(playSoundSpy).toHaveBeenCalledWith('zombie_impact');
      expect(playSoundSpy).toHaveBeenCalledWith('engine_start');
    });
  });

  describe('Performance Integration', () => {
    test('should maintain stable performance under load', () => {
      gameEngine.initialize();
      vehicleManager.initialize(gameEngine.scene, gameEngine.physics);
      zombieManager.initialize(gameEngine.scene, gameEngine.physics);
      
      const startTime = performance.now();
      
      // Spawn many zombies to test performance
      for (let i = 0; i < 100; i++) {
        zombieManager.spawnZombie('walker', {
          x: Math.random() * 100 - 50,
          y: 0,
          z: Math.random() * 100 - 50
        });
      }
      
      // Run multiple update cycles
      for (let i = 0; i < 60; i++) {
        gameEngine.update(0.016);
        zombieManager.update(0.016);
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should complete 60 frames in reasonable time (less than 2 seconds)
      expect(totalTime).toBeLessThan(2000);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle system failures gracefully', () => {
      gameEngine.initialize();
      
      // Simulate various error conditions
      expect(() => {
        vehicleManager.spawnVehicle('invalid_type', { x: 0, y: 0, z: 0 });
      }).not.toThrow();
      
      expect(() => {
        zombieManager.spawnZombie('invalid_type', { x: 0, y: 0, z: 0 });
      }).not.toThrow();
      
      expect(() => {
        upgradeManager.applyUpgrade(null, 'engine', 1);
      }).not.toThrow();
    });

    test('should recover from physics simulation errors', () => {
      gameEngine.initialize();
      vehicleManager.initialize(gameEngine.scene, gameEngine.physics);
      
      const vehicle = vehicleManager.spawnVehicle('sedan', { x: 0, y: 0, z: 0 });
      
      // Simulate physics error by setting invalid position
      vehicle.body.position.set(NaN, NaN, NaN);
      
      expect(() => {
        gameEngine.update(0.016);
      }).not.toThrow();
      
      // Vehicle should be reset to valid position
      expect(isNaN(vehicle.body.position.x)).toBe(false);
    });
  });
});