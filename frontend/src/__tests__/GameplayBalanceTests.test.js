/**
 * Automated gameplay testing for balance and progression
 * Tests game balance, difficulty curves, and progression systems
 */

import { GameEngine } from '../engine/GameEngine';
import { VehicleManager } from '../vehicles/VehicleManager';
import { ZombieManager } from '../zombies/ZombieManager';
import { ScoringSystem } from '../scoring/ScoringSystem';
import { UpgradeManager } from '../upgrades/UpgradeManager';
import LevelManager from '../levels/LevelManager';

describe('Gameplay Balance and Progression Tests', () => {
  let gameEngine;
  let vehicleManager;
  let zombieManager;
  let scoringSystem;
  let upgradeManager;
  let levelManager;

  beforeEach(() => {
    gameEngine = new GameEngine();
    vehicleManager = new VehicleManager();
    zombieManager = new ZombieManager();
    scoringSystem = new ScoringSystem();
    upgradeManager = new UpgradeManager();
    levelManager = new LevelManager();

    gameEngine.initialize();
    vehicleManager.initialize(gameEngine.scene, gameEngine.physics);
    zombieManager.initialize(gameEngine.scene, gameEngine.physics);
  });

  describe('Vehicle Balance Testing', () => {
    test('should have balanced vehicle stats across types', () => {
      const vehicleTypes = ['sedan', 'suv', 'truck', 'sports_car', 'monster_truck'];
      const vehicles = vehicleTypes.map(type => 
        vehicleManager.spawnVehicle(type, { x: 0, y: 0, z: 0 })
      );

      // Calculate total stat points for each vehicle
      const statTotals = vehicles.map(vehicle => {
        const stats = vehicle.stats;
        return stats.speed + stats.acceleration + stats.armor + 
               stats.fuelCapacity + stats.damage + stats.handling;
      });

      // Check that stat totals are within reasonable range (±20% of average)
      const average = statTotals.reduce((a, b) => a + b) / statTotals.length;
      const tolerance = average * 0.2;

      statTotals.forEach(total => {
        expect(total).toBeGreaterThan(average - tolerance);
        expect(total).toBeLessThan(average + tolerance);
      });
    });

    test('should have meaningful differences between vehicle types', () => {
      const sedan = vehicleManager.spawnVehicle('sedan', { x: 0, y: 0, z: 0 });
      const sportsCar = vehicleManager.spawnVehicle('sports_car', { x: 0, y: 0, z: 0 });
      const truck = vehicleManager.spawnVehicle('truck', { x: 0, y: 0, z: 0 });

      // Sports car should be faster but less armored than sedan
      expect(sportsCar.stats.speed).toBeGreaterThan(sedan.stats.speed);
      expect(sportsCar.stats.armor).toBeLessThan(sedan.stats.armor);

      // Truck should be more armored but slower than sedan
      expect(truck.stats.armor).toBeGreaterThan(sedan.stats.armor);
      expect(truck.stats.speed).toBeLessThan(sedan.stats.speed);
    });
  });

  describe('Zombie Difficulty Progression', () => {
    test('should have appropriate difficulty scaling across zombie types', () => {
      const basicZombies = ['walker', 'runner', 'crawler'];
      const advancedZombies = ['armored', 'giant', 'exploder'];
      const bossZombies = ['boss_tyrant', 'boss_abomination'];

      const basicStats = basicZombies.map(type => {
        const zombie = zombieManager.spawnZombie(type, { x: 0, y: 0, z: 0 });
        return zombie.health + zombie.speed + zombie.pointValue;
      });

      const advancedStats = advancedZombies.map(type => {
        const zombie = zombieManager.spawnZombie(type, { x: 0, y: 0, z: 0 });
        return zombie.health + zombie.speed + zombie.pointValue;
      });

      const bossStats = bossZombies.map(type => {
        const zombie = zombieManager.spawnZombie(type, { x: 0, y: 0, z: 0 });
        return zombie.health + zombie.speed + zombie.pointValue;
      });

      // Advanced zombies should be stronger than basic
      const avgBasic = basicStats.reduce((a, b) => a + b) / basicStats.length;
      const avgAdvanced = advancedStats.reduce((a, b) => a + b) / advancedStats.length;
      const avgBoss = bossStats.reduce((a, b) => a + b) / bossStats.length;

      expect(avgAdvanced).toBeGreaterThan(avgBasic);
      expect(avgBoss).toBeGreaterThan(avgAdvanced);
    });

    test('should spawn appropriate zombie mix for each level', () => {
      for (let levelId = 1; levelId <= 10; levelId++) {
        const level = levelManager.getLevel(levelId);
        const zombieSpawns = zombieManager.generateSpawnsForLevel(level);

        // Early levels should have more basic zombies
        if (levelId <= 3) {
          const basicCount = zombieSpawns.filter(spawn => 
            ['walker', 'runner', 'crawler'].includes(spawn.type)
          ).length;
          expect(basicCount / zombieSpawns.length).toBeGreaterThan(0.7);
        }

        // Later levels should have more advanced zombies
        if (levelId >= 8) {
          const advancedCount = zombieSpawns.filter(spawn => 
            ['armored', 'giant', 'exploder', 'boss_tyrant'].includes(spawn.type)
          ).length;
          expect(advancedCount / zombieSpawns.length).toBeGreaterThan(0.3);
        }
      }
    });
  });

  describe('Scoring and Currency Balance', () => {
    test('should provide appropriate currency rewards for progression', () => {
      const testScenarios = [
        { zombiesKilled: 10, expectedCurrency: 100 },
        { zombiesKilled: 50, expectedCurrency: 500 },
        { zombiesKilled: 100, expectedCurrency: 1000 }
      ];

      testScenarios.forEach(scenario => {
        scoringSystem.reset();
        
        // Simulate killing zombies
        for (let i = 0; i < scenario.zombiesKilled; i++) {
          scoringSystem.addZombieKill('walker', 1.0); // No combo multiplier
        }

        const currency = scoringSystem.convertToCurrency();
        expect(currency).toBeGreaterThanOrEqual(scenario.expectedCurrency * 0.8);
        expect(currency).toBeLessThanOrEqual(scenario.expectedCurrency * 1.2);
      });
    });

    test('should have balanced upgrade costs relative to earning potential', () => {
      const vehicle = vehicleManager.spawnVehicle('sedan', { x: 0, y: 0, z: 0 });
      const upgradeCosts = upgradeManager.getUpgradeCosts(vehicle.id);

      // First level upgrades should be affordable after 1-2 levels
      const level1Revenue = 500; // Estimated revenue from completing level 1
      expect(upgradeCosts.engine[1]).toBeLessThan(level1Revenue * 2);
      expect(upgradeCosts.armor[1]).toBeLessThan(level1Revenue * 2);

      // Max level upgrades should require significant progression
      const maxLevelRevenue = 10000; // Estimated revenue from completing 10 levels
      const maxEngineLevel = upgradeCosts.engine.length - 1;
      expect(upgradeCosts.engine[maxEngineLevel]).toBeLessThan(maxLevelRevenue);
    });
  });

  describe('Level Progression Balance', () => {
    test('should have appropriate difficulty curve across levels', () => {
      const levels = [];
      for (let i = 1; i <= 10; i++) {
        levels.push(levelManager.getLevel(i));
      }

      // Calculate difficulty metrics for each level
      const difficultyMetrics = levels.map(level => {
        const zombieCount = level.zombieSpawns.length;
        const obstacleCount = level.terrain.obstacles.length;
        const distance = level.terrain.length;
        
        return zombieCount + obstacleCount + (distance / 100);
      });

      // Difficulty should generally increase with level
      for (let i = 1; i < difficultyMetrics.length; i++) {
        const currentDifficulty = difficultyMetrics[i];
        const previousDifficulty = difficultyMetrics[i - 1];
        
        // Allow for some variation but overall trend should be upward
        expect(currentDifficulty).toBeGreaterThanOrEqual(previousDifficulty * 0.9);
      }
    });

    test('should require reasonable progression to unlock new levels', () => {
      levelManager.initialize();
      
      // Test unlock requirements for each level
      for (let levelId = 2; levelId <= 10; levelId++) {
        const requirements = levelManager.getUnlockRequirements(levelId);
        
        // Requirements should be achievable with reasonable effort
        expect(requirements.minScore).toBeLessThan(levelId * 2000);
        expect(requirements.minLevel).toBeLessThan(levelId);
        
        if (requirements.requiredVehicles) {
          expect(requirements.requiredVehicles.length).toBeLessThan(3);
        }
      }
    });
  });

  describe('Upgrade Progression Balance', () => {
    test('should provide meaningful improvements per upgrade level', () => {
      const vehicle = vehicleManager.spawnVehicle('sedan', { x: 0, y: 0, z: 0 });
      const baseStats = { ...vehicle.stats };

      // Test engine upgrades
      for (let level = 1; level <= 5; level++) {
        upgradeManager.applyUpgrade(vehicle, 'engine', level);
        
        const improvement = (vehicle.stats.speed - baseStats.speed) / baseStats.speed;
        expect(improvement).toBeGreaterThan(level * 0.05); // At least 5% per level
        expect(improvement).toBeLessThan(level * 0.25); // Not more than 25% per level
      }
    });

    test('should have diminishing returns for higher upgrade levels', () => {
      const vehicle = vehicleManager.spawnVehicle('sedan', { x: 0, y: 0, z: 0 });
      const improvements = [];

      for (let level = 1; level <= 5; level++) {
        const beforeStats = { ...vehicle.stats };
        upgradeManager.applyUpgrade(vehicle, 'armor', level);
        const afterStats = { ...vehicle.stats };
        
        const improvement = afterStats.armor - beforeStats.armor;
        improvements.push(improvement);
      }

      // Later improvements should be smaller than earlier ones
      for (let i = 1; i < improvements.length; i++) {
        expect(improvements[i]).toBeLessThanOrEqual(improvements[i - 1] * 1.1);
      }
    });
  });

  describe('Automated Gameplay Simulation', () => {
    test('should simulate complete level playthrough', () => {
      const level = levelManager.getLevel(1);
      const vehicle = vehicleManager.spawnVehicle('sedan', { x: 0, y: 0, z: 0 });
      
      scoringSystem.reset();
      let gameTime = 0;
      const maxGameTime = 300; // 5 minutes max
      
      // Simulate gameplay loop
      while (gameTime < maxGameTime && !levelManager.isLevelCompleted(level.id)) {
        const deltaTime = 0.016; // 60 FPS
        gameTime += deltaTime;
        
        // Simulate zombie encounters
        if (Math.random() < 0.1) { // 10% chance per frame
          const zombieType = Math.random() < 0.7 ? 'walker' : 'runner';
          scoringSystem.addZombieKill(zombieType, 1.0);
        }
        
        // Check level completion conditions
        if (scoringSystem.getZombiesKilled() >= level.objectives.zombiesToKill) {
          levelManager.completeLevel({
            levelId: level.id,
            score: scoringSystem.getScore(),
            zombiesKilled: scoringSystem.getZombiesKilled(),
            timeElapsed: gameTime
          });
        }
      }
      
      // Level should be completable within reasonable time
      expect(levelManager.isLevelCompleted(level.id)).toBe(true);
      expect(gameTime).toBeLessThan(maxGameTime);
    });

    test('should simulate progression through multiple levels', () => {
      let currentLevel = 1;
      let totalCurrency = 0;
      const vehicle = vehicleManager.spawnVehicle('sedan', { x: 0, y: 0, z: 0 });

      // Simulate progression through first 5 levels
      while (currentLevel <= 5) {
        const level = levelManager.getLevel(currentLevel);
        scoringSystem.reset();
        
        // Simulate level completion
        const simulatedScore = 500 + (currentLevel * 200);
        const simulatedZombies = 20 + (currentLevel * 10);
        
        scoringSystem.setScore(simulatedScore);
        scoringSystem.setZombiesKilled(simulatedZombies);
        
        levelManager.completeLevel({
          levelId: currentLevel,
          score: simulatedScore,
          zombiesKilled: simulatedZombies,
          timeElapsed: 120
        });
        
        totalCurrency += scoringSystem.convertToCurrency();
        
        // Apply upgrades if affordable
        const upgradeCost = upgradeManager.getUpgradeCost(vehicle.id, 'engine', 1);
        if (totalCurrency >= upgradeCost) {
          upgradeManager.applyUpgrade(vehicle, 'engine', 1);
          totalCurrency -= upgradeCost;
        }
        
        currentLevel++;
      }
      
      // Should be able to progress through levels and afford some upgrades
      expect(currentLevel).toBe(6);
      expect(vehicle.stats.speed).toBeGreaterThan(60); // Base sedan speed
      expect(totalCurrency).toBeGreaterThan(0); // Should have some currency left
    });
  });
});