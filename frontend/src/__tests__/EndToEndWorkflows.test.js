/**
 * End-to-end tests for complete user workflows
 * Tests complete user journeys from start to finish
 */

// Test fixes are handled by setupTests.js

import { GameEngine } from '../engine/GameEngine';
import { VehicleManager } from '../vehicles/VehicleManager';
import { ZombieManager } from '../zombies/ZombieManager';
import { ScoringSystem } from '../scoring/ScoringSystem';
import { UpgradeManager } from '../upgrades/UpgradeManager';
import LevelManager from '../levels/LevelManager';
import { SaveManager } from '../save/SaveManager';
import { AudioManager } from '../audio/AudioManager';

describe('End-to-End User Workflows', () => {
  let gameEngine;
  let vehicleManager;
  let zombieManager;
  let scoringSystem;
  let upgradeManager;
  let levelManager;
  let saveManager;
  let audioManager;

  beforeEach(() => {
    // Initialize all game systems
    gameEngine = new GameEngine();
    vehicleManager = new VehicleManager();
    zombieManager = new ZombieManager();
    scoringSystem = new ScoringSystem();
    upgradeManager = new UpgradeManager();
    levelManager = new LevelManager();
    saveManager = new SaveManager();
    audioManager = new AudioManager();

    // Mock DOM elements
    document.body.innerHTML = `
      <div id="game-container"></div>
      <div id="main-menu"></div>
      <div id="garage"></div>
      <div id="level-select"></div>
      <div id="game-hud"></div>
      <div id="pause-menu"></div>
      <div id="game-over"></div>
    `;

    // Mock API responses
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {}
        })
      })
    );
  });

  afterEach(() => {
    if (gameEngine) {
      gameEngine.dispose();
    }
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  describe('New Player Onboarding Workflow', () => {
    test('should complete full new player experience', async () => {
      // Step 1: Game initialization
      await gameEngine.initialize();
      vehicleManager.initialize(gameEngine.scene, gameEngine.physics);
      zombieManager.initialize(gameEngine.scene, gameEngine.physics);
      levelManager.initialize();
      saveManager.initialize();
      audioManager.initialize();

      expect(gameEngine.isInitialized()).toBe(true);

      // Step 2: First time player setup
      const isFirstTime = saveManager.isFirstTimePlayer();
      expect(isFirstTime).toBe(true);

      // Step 3: Tutorial level access
      const tutorialLevel = levelManager.getTutorialLevel();
      expect(tutorialLevel).toBeDefined();
      expect(tutorialLevel.id).toBe('tutorial');

      // Step 4: Default vehicle assignment
      const defaultVehicle = vehicleManager.getDefaultVehicle();
      expect(defaultVehicle).toBeDefined();
      expect(defaultVehicle.type).toBe('sedan');

      // Step 5: Tutorial completion
      scoringSystem.reset();
      levelManager.startLevel('tutorial');
      
      // Simulate tutorial gameplay
      const vehicle = vehicleManager.spawnVehicle('sedan', { x: 0, y: 0, z: 0 });
      
      // Simulate zombie encounters
      for (let i = 0; i < 5; i++) {
        const zombie = zombieManager.spawnZombie('walker', { x: i * 5, y: 0, z: 0 });
        scoringSystem.addZombieKill('walker', 1.0);
        zombieManager.removeZombie(zombie.id);
      }

      // Complete tutorial
      const tutorialResult = levelManager.completeLevel({
        levelId: 'tutorial',
        score: scoringSystem.getScore(),
        zombiesKilled: scoringSystem.getZombiesKilled(),
        timeElapsed: 60
      });

      expect(tutorialResult.completed).toBe(true);
      expect(levelManager.isLevelCompleted('tutorial')).toBe(true);

      // Step 6: First save
      const saveData = saveManager.createSaveData({
        playerLevel: 1,
        currency: scoringSystem.convertToCurrency(),
        completedLevels: ['tutorial'],
        ownedVehicles: [defaultVehicle.type]
      });

      await saveManager.saveGame(saveData);
      expect(saveManager.isFirstTimePlayer()).toBe(false);
    });

    test('should handle tutorial skip option', async () => {
      await gameEngine.initialize();
      levelManager.initialize();
      saveManager.initialize();

      // Player chooses to skip tutorial
      const skipResult = levelManager.skipTutorial();
      expect(skipResult.success).toBe(true);

      // Should unlock first real level
      expect(levelManager.canAccessLevel('level_1')).toBe(true);

      // Should provide basic starting resources
      const startingCurrency = scoringSystem.getStartingCurrency();
      expect(startingCurrency).toBeGreaterThan(0);
    });
  });

  describe('Complete Gameplay Session Workflow', () => {
    test('should complete full gameplay session from menu to game over', async () => {
      // Initialize game
      await gameEngine.initialize();
      vehicleManager.initialize(gameEngine.scene, gameEngine.physics);
      zombieManager.initialize(gameEngine.scene, gameEngine.physics);
      levelManager.initialize();
      scoringSystem.reset();

      // Step 1: Main menu navigation
      const mainMenu = document.getElementById('main-menu');
      expect(mainMenu).toBeTruthy();

      // Step 2: Level selection
      const availableLevels = levelManager.getAvailableLevels();
      expect(availableLevels.length).toBeGreaterThan(0);

      const selectedLevel = availableLevels[0];
      levelManager.selectLevel(selectedLevel.id);

      // Step 3: Vehicle selection
      const availableVehicles = vehicleManager.getAvailableVehicles();
      expect(availableVehicles.length).toBeGreaterThan(0);

      const selectedVehicle = availableVehicles[0];
      vehicleManager.selectVehicle(selectedVehicle.type);

      // Step 4: Game start
      levelManager.startLevel(selectedLevel.id);
      const vehicle = vehicleManager.spawnVehicle(selectedVehicle.type, { x: 0, y: 0, z: 0 });

      expect(vehicle).toBeDefined();
      expect(levelManager.getCurrentLevel().id).toBe(selectedLevel.id);

      // Step 5: Gameplay simulation
      let gameTime = 0;
      const maxGameTime = 120; // 2 minutes
      let zombiesKilled = 0;

      while (gameTime < maxGameTime && vehicle.health > 0) {
        const deltaTime = 0.016; // 60 FPS
        gameTime += deltaTime;

        // Update game systems
        gameEngine.update(deltaTime);
        vehicleManager.update(deltaTime);
        zombieManager.update(deltaTime);

        // Simulate zombie encounters
        if (Math.random() < 0.05) { // 5% chance per frame
          const zombie = zombieManager.spawnZombie('walker', {
            x: Math.random() * 50,
            y: 0,
            z: Math.random() * 50
          });

          // Simulate collision and elimination
          if (Math.random() < 0.8) { // 80% hit rate
            scoringSystem.addZombieKill('walker', 1.0);
            zombieManager.removeZombie(zombie.id);
            zombiesKilled++;
          }
        }

        // Simulate vehicle damage
        if (Math.random() < 0.01) { // 1% chance per frame
          vehicle.takeDamage(5);
        }
      }

      // Step 6: Game over or level completion
      const finalScore = scoringSystem.getScore();
      const currency = scoringSystem.convertToCurrency();

      expect(finalScore).toBeGreaterThan(0);
      expect(currency).toBeGreaterThan(0);
      expect(zombiesKilled).toBeGreaterThan(0);

      // Step 7: Results screen
      const gameResult = {
        score: finalScore,
        zombiesKilled: zombiesKilled,
        currency: currency,
        timeElapsed: gameTime,
        levelCompleted: vehicle.health > 0
      };

      expect(gameResult.score).toBe(finalScore);
      expect(gameResult.zombiesKilled).toBe(zombiesKilled);

      // Step 8: Save progress
      const saveData = saveManager.createSaveData({
        lastScore: finalScore,
        totalCurrency: currency,
        gamesPlayed: 1
      });

      await saveManager.saveGame(saveData);
      expect(saveData.lastScore).toBe(finalScore);
    });

    test('should handle pause and resume during gameplay', async () => {
      await gameEngine.initialize();
      vehicleManager.initialize(gameEngine.scene, gameEngine.physics);
      levelManager.initialize();

      // Start game
      levelManager.startLevel('level_1');
      const vehicle = vehicleManager.spawnVehicle('sedan', { x: 0, y: 0, z: 0 });

      // Simulate some gameplay
      for (let i = 0; i < 30; i++) {
        gameEngine.update(0.016);
      }

      const scoreBeforePause = scoringSystem.getScore();

      // Pause game
      gameEngine.pause();
      expect(gameEngine.isPaused()).toBe(true);

      // Simulate pause duration (no game updates)
      const pauseStartTime = performance.now();
      
      // Resume game
      gameEngine.resume();
      expect(gameEngine.isPaused()).toBe(false);

      // Continue gameplay
      for (let i = 0; i < 30; i++) {
        gameEngine.update(0.016);
      }

      // Game should continue normally after pause
      expect(vehicle.health).toBeGreaterThan(0);
      expect(scoringSystem.getScore()).toBeGreaterThanOrEqual(scoreBeforePause);
    });
  });

  describe('Vehicle Upgrade Workflow', () => {
    test('should complete vehicle purchase and upgrade workflow', async () => {
      await gameEngine.initialize();
      vehicleManager.initialize(gameEngine.scene, gameEngine.physics);
      upgradeManager.initialize();
      scoringSystem.setScore(10000); // Give player currency

      // Step 1: Access garage
      const garage = document.getElementById('garage');
      expect(garage).toBeTruthy();

      // Step 2: View available vehicles
      const availableVehicles = vehicleManager.getAvailableVehicles();
      const purchasableVehicles = vehicleManager.getPurchasableVehicles();

      expect(availableVehicles.length).toBeGreaterThan(0);
      expect(purchasableVehicles.length).toBeGreaterThan(0);

      // Step 3: Purchase new vehicle
      const vehicleToPurchase = purchasableVehicles[0];
      const purchaseResult = await vehicleManager.purchaseVehicle(vehicleToPurchase.type);

      expect(purchaseResult.success).toBe(true);
      expect(vehicleManager.ownsVehicle(vehicleToPurchase.type)).toBe(true);

      // Step 4: Select vehicle for upgrades
      const vehicle = vehicleManager.getVehicle(vehicleToPurchase.type);
      const baseStats = { ...vehicle.stats };

      // Step 5: View available upgrades
      const availableUpgrades = upgradeManager.getAvailableUpgrades(vehicle.id);
      expect(availableUpgrades.engine.length).toBeGreaterThan(0);
      expect(availableUpgrades.armor.length).toBeGreaterThan(0);

      // Step 6: Purchase upgrades
      const engineUpgradeResult = upgradeManager.purchaseUpgrade(vehicle.id, 'engine', 1);
      expect(engineUpgradeResult.success).toBe(true);

      const armorUpgradeResult = upgradeManager.purchaseUpgrade(vehicle.id, 'armor', 1);
      expect(armorUpgradeResult.success).toBe(true);

      // Step 7: Verify upgrades applied
      expect(vehicle.stats.speed).toBeGreaterThan(baseStats.speed);
      expect(vehicle.stats.armor).toBeGreaterThan(baseStats.armor);

      // Step 8: Test upgraded vehicle in game
      levelManager.startLevel('level_1');
      const spawnedVehicle = vehicleManager.spawnVehicle(vehicle.type, { x: 0, y: 0, z: 0 });

      expect(spawnedVehicle.stats.speed).toBe(vehicle.stats.speed);
      expect(spawnedVehicle.stats.armor).toBe(vehicle.stats.armor);
    });

    test('should handle insufficient funds for purchases', async () => {
      await gameEngine.initialize();
      vehicleManager.initialize();
      upgradeManager.initialize();
      scoringSystem.setScore(100); // Low currency

      const expensiveVehicles = vehicleManager.getPurchasableVehicles()
        .filter(v => v.cost > 100);

      if (expensiveVehicles.length > 0) {
        const purchaseResult = await vehicleManager.purchaseVehicle(expensiveVehicles[0].type);
        expect(purchaseResult.success).toBe(false);
        expect(purchaseResult.error).toContain('insufficient');
      }
    });
  });

  describe('Level Progression Workflow', () => {
    test('should complete level progression from 1 to 5', async () => {
      await gameEngine.initialize();
      vehicleManager.initialize(gameEngine.scene, gameEngine.physics);
      zombieManager.initialize(gameEngine.scene, gameEngine.physics);
      levelManager.initialize();
      scoringSystem.reset();

      let currentLevel = 1;
      let totalCurrency = 0;

      while (currentLevel <= 5) {
        // Step 1: Verify level access
        expect(levelManager.canAccessLevel(`level_${currentLevel}`)).toBe(true);

        // Step 2: Start level
        levelManager.startLevel(`level_${currentLevel}`);
        const level = levelManager.getCurrentLevel();

        expect(level.id).toBe(`level_${currentLevel}`);

        // Step 3: Simulate level completion
        scoringSystem.reset();
        const vehicle = vehicleManager.spawnVehicle('sedan', { x: 0, y: 0, z: 0 });

        // Simulate gameplay based on level difficulty
        const zombiesToKill = 10 + (currentLevel * 5);
        for (let i = 0; i < zombiesToKill; i++) {
          const zombieType = currentLevel <= 2 ? 'walker' : 
                           currentLevel <= 4 ? 'runner' : 'armored';
          scoringSystem.addZombieKill(zombieType, 1.0);
        }

        // Step 4: Complete level
        const completionResult = levelManager.completeLevel({
          levelId: `level_${currentLevel}`,
          score: scoringSystem.getScore(),
          zombiesKilled: scoringSystem.getZombiesKilled(),
          timeElapsed: 120 - (currentLevel * 10) // Faster completion = better score
        });

        expect(completionResult.completed).toBe(true);
        expect(completionResult.stars).toBeGreaterThan(0);

        // Step 5: Earn currency
        const levelCurrency = scoringSystem.convertToCurrency();
        totalCurrency += levelCurrency;

        // Step 6: Check next level unlock
        if (currentLevel < 5) {
          expect(levelManager.canAccessLevel(`level_${currentLevel + 1}`)).toBe(true);
        }

        currentLevel++;
      }

      // Verify progression
      expect(currentLevel).toBe(6);
      expect(totalCurrency).toBeGreaterThan(1000);
      expect(levelManager.getCompletedLevels().length).toBe(5);
    });

    test('should handle level failure and retry', async () => {
      await gameEngine.initialize();
      vehicleManager.initialize(gameEngine.scene, gameEngine.physics);
      levelManager.initialize();

      // Start level
      levelManager.startLevel('level_1');
      const vehicle = vehicleManager.spawnVehicle('sedan', { x: 0, y: 0, z: 0 });

      // Simulate failure (vehicle destroyed)
      vehicle.health = 0;

      const failureResult = levelManager.handleLevelFailure({
        levelId: 'level_1',
        score: 100,
        zombiesKilled: 2,
        timeElapsed: 30
      });

      expect(failureResult.failed).toBe(true);
      expect(levelManager.isLevelCompleted('level_1')).toBe(false);

      // Retry level
      const retryResult = levelManager.retryLevel('level_1');
      expect(retryResult.success).toBe(true);

      // Should be able to start again
      levelManager.startLevel('level_1');
      const newVehicle = vehicleManager.spawnVehicle('sedan', { x: 0, y: 0, z: 0 });
      expect(newVehicle.health).toBeGreaterThan(0);
    });
  });

  describe('Save and Load Workflow', () => {
    test('should save and restore complete game state', async () => {
      await gameEngine.initialize();
      vehicleManager.initialize(gameEngine.scene, gameEngine.physics);
      levelManager.initialize();
      upgradeManager.initialize();
      saveManager.initialize();

      // Create game state
      scoringSystem.setScore(5000);
      levelManager.completeLevel({
        levelId: 'level_1',
        score: 1000,
        zombiesKilled: 20,
        timeElapsed: 120
      });

      const vehicle = vehicleManager.getVehicle('sedan');
      upgradeManager.applyUpgrade(vehicle, 'engine', 2);

      // Save game
      const saveData = saveManager.createSaveData({
        playerLevel: 2,
        totalScore: scoringSystem.getScore(),
        currency: scoringSystem.convertToCurrency(),
        completedLevels: levelManager.getCompletedLevels(),
        ownedVehicles: vehicleManager.getOwnedVehicles(),
        vehicleUpgrades: upgradeManager.getAllUpgrades()
      });

      await saveManager.saveGame(saveData);

      // Reset game state
      scoringSystem.reset();
      levelManager.reset();
      vehicleManager.reset();
      upgradeManager.reset();

      // Load game
      const loadedData = await saveManager.loadFromLocalStorage();
      
      // Restore state
      scoringSystem.setScore(loadedData.totalScore);
      levelManager.restoreProgress(loadedData.completedLevels);
      vehicleManager.restoreVehicles(loadedData.ownedVehicles);
      upgradeManager.restoreUpgrades(loadedData.vehicleUpgrades);

      // Verify restoration
      expect(scoringSystem.getScore()).toBe(5000);
      expect(levelManager.isLevelCompleted('level_1')).toBe(true);
      expect(vehicleManager.ownsVehicle('sedan')).toBe(true);
      
      const restoredVehicle = vehicleManager.getVehicle('sedan');
      expect(upgradeManager.getUpgradeLevel(restoredVehicle.id, 'engine')).toBe(2);
    });

    test('should handle save corruption gracefully', async () => {
      saveManager.initialize();

      // Mock corrupted save data
      localStorage.setItem('zombie_car_game_save', 'corrupted_data');

      const loadResult = await saveManager.loadFromLocalStorage();
      
      // Should handle corruption gracefully and return false for corrupted data
      expect(loadResult).toBe(false);
      
      // SaveManager should still have default state
      expect(saveManager.saveState.player.level).toBe(1);
      expect(saveManager.saveState.player.currency).toBe(0);
      expect(saveManager.saveState.levels.completed).toEqual([]);
    });
  });

  describe('Audio Experience Workflow', () => {
    test('should provide complete audio experience during gameplay', async () => {
      await gameEngine.initialize();
      vehicleManager.initialize(gameEngine.scene, gameEngine.physics);
      zombieManager.initialize(gameEngine.scene, gameEngine.physics);
      audioManager.initialize();

      const playSoundSpy = jest.spyOn(audioManager, 'playSound');
      const playMusicSpy = jest.spyOn(audioManager, 'playMusic');

      // Start level - should play background music
      levelManager.startLevel('level_1');
      expect(playMusicSpy).toHaveBeenCalledWith('level_music');

      // Spawn vehicle - should play engine sound
      const vehicle = vehicleManager.spawnVehicle('sedan', { x: 0, y: 0, z: 0 });
      expect(playSoundSpy).toHaveBeenCalledWith('engine_start');

      // Zombie collision - should play impact sound
      const zombie = zombieManager.spawnZombie('walker', { x: 1, y: 0, z: 0 });
      
      // Simulate collision
      const collision = { vehicle, zombie, impact: { x: 0.5, y: 0, z: 0 } };
      audioManager.handleCollision(collision);
      
      expect(playSoundSpy).toHaveBeenCalledWith('zombie_impact');

      // Level completion - should play success sound
      levelManager.completeLevel({
        levelId: 'level_1',
        score: 1000,
        zombiesKilled: 10,
        timeElapsed: 120
      });

      expect(playSoundSpy).toHaveBeenCalledWith('level_complete');
    });

    test('should handle audio settings changes', async () => {
      audioManager.initialize();

      // Test volume controls
      audioManager.setVolume('master', 0.5);
      expect(audioManager.volumes.master).toBe(0.5);

      audioManager.setVolume('effects', 0.3);
      expect(audioManager.volumes.effects).toBe(0.3);

      audioManager.setVolume('music', 0.7);
      expect(audioManager.volumes.music).toBe(0.7);

      // Test mute functionality
      audioManager.muteAll();
      expect(audioManager.isMuted()).toBe(true);

      audioManager.unmuteAll();
      expect(audioManager.isMuted()).toBe(false);
    });
  });
});