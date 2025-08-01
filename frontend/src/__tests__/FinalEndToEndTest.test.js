/**
 * Final End-to-End Integration Test
 * This test ensures the complete game works from start to finish
 */

import ZombieCarGame from '../ZombieCarGame.js';

// Mock the main game class dependencies
jest.mock('../engine/GameEngine.js', () => {
    return jest.fn().mockImplementation(() => ({
        scene: {
            add: jest.fn(),
            remove: jest.fn(),
            traverse: jest.fn()
        },
        renderer: {
            setSize: jest.fn(),
            render: jest.fn(),
            domElement: {}
        },
        camera: {
            position: { set: jest.fn() },
            lookAt: jest.fn()
        },
        physics: {
            step: jest.fn(),
            add: jest.fn(),
            remove: jest.fn()
        },
        // Event emitter interface
        on: jest.fn(),
        emit: jest.fn(),
        off: jest.fn(),
        // Additional methods
        initialize: jest.fn().mockResolvedValue(),
        dispose: jest.fn(),
        update: jest.fn(),
        render: jest.fn()
    }));
});

describe('Final End-to-End Integration Test', () => {
    let game;
    let mockContainer;
    let mockLocalStorage;

    beforeEach(() => {
        // Setup enhanced localStorage mock
        const storage = {};
        mockLocalStorage = {
            getItem: jest.fn((key) => storage[key] || null),
            setItem: jest.fn((key, value) => {
                storage[key] = value;
            }),
            removeItem: jest.fn((key) => {
                delete storage[key];
            }),
            clear: jest.fn(() => {
                Object.keys(storage).forEach(key => delete storage[key]);
            })
        };
        Object.defineProperty(global, 'localStorage', {
            value: mockLocalStorage,
            writable: true
        });

        // Mock DOM container
        mockContainer = document.createElement('div');
        mockContainer.id = 'game-container';
        document.body.appendChild(mockContainer);

        // Mock fetch for API calls
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ success: true, data: {} })
            })
        );

        // Mock performance API
        global.performance = {
            now: jest.fn(() => Date.now()),
            memory: {
                usedJSHeapSize: 50000000,
                totalJSHeapSize: 100000000,
                jsHeapSizeLimit: 200000000
            }
        };

        // Mock audio context
        global.AudioContext = jest.fn(() => ({
            createGain: jest.fn(() => ({
                connect: jest.fn(),
                gain: { value: 1 }
            })),
            createBufferSource: jest.fn(() => ({
                connect: jest.fn(),
                start: jest.fn(),
                stop: jest.fn()
            })),
            decodeAudioData: jest.fn(() => Promise.resolve({})),
            close: jest.fn(() => Promise.resolve()),
            destination: {}
        }));

        // Mock canvas and WebGL
        const mockCanvas = document.createElement('canvas');
        mockCanvas.getContext = jest.fn((type) => {
            if (type === 'webgl' || type === 'experimental-webgl') {
                return {
                    getExtension: jest.fn(() => null),
                    getParameter: jest.fn(() => 'Mock GPU'),
                    createBuffer: jest.fn(),
                    bindBuffer: jest.fn(),
                    bufferData: jest.fn(),
                    viewport: jest.fn(),
                    clearColor: jest.fn(),
                    clear: jest.fn()
                };
            }
            return null;
        });

        document.createElement = jest.fn((tagName) => {
            if (tagName === 'canvas') {
                return mockCanvas;
            }
            return document.createElement.call(document, tagName);
        });
    });

    afterEach(() => {
        if (game) {
            game.dispose();
        }
        document.body.removeChild(mockContainer);
        jest.clearAllMocks();
    });

    test('should initialize complete game system', async () => {
        // Initialize the game
        game = new ZombieCarGame(mockContainer);
        
        expect(game).toBeDefined();
        expect(game.gameEngine).toBeDefined();
        expect(game.gameStateManager).toBeDefined();
        expect(game.vehicleManager).toBeDefined();
        expect(game.zombieManager).toBeDefined();
        expect(game.scoringSystem).toBeDefined();
        expect(game.upgradeManager).toBeDefined();
        expect(game.levelManager).toBeDefined();
        expect(game.audioManager).toBeDefined();
        expect(game.saveManager).toBeDefined();
        expect(game.performanceManager).toBeDefined();
        expect(game.errorHandler).toBeDefined();
    });

    test('should handle complete gameplay session', async () => {
        game = new ZombieCarGame(mockContainer);
        
        // Start a new game session
        await game.startNewGame();
        
        expect(game.gameStateManager.getCurrentState()).toBe('playing');
        
        // Simulate some gameplay
        game.update(0.016); // 60 FPS frame
        game.render();
        
        // Simulate zombie kill
        game.scoringSystem.handleZombieKill({
            zombie: { type: 'walker', stats: { pointValue: 10 } },
            vehicle: { type: 'sedan' },
            killMethod: 'impact',
            damage: 50
        });
        
        expect(game.scoringSystem.getSessionStats().zombiesKilled).toBe(1);
        expect(game.scoringSystem.getSessionStats().totalPoints).toBeGreaterThan(0);
        
        // End the session
        await game.endSession();
        
        expect(game.gameStateManager.getCurrentState()).toBe('menu');
    });

    test('should handle vehicle upgrade workflow', async () => {
        game = new ZombieCarGame(mockContainer);
        
        // Set some currency for upgrades
        game.saveManager.updatePlayerData({ currency: 1000 });
        
        // Get upgrade info
        const upgradeInfo = game.upgradeManager.getUpgradeInfo('sedan', 'engine');
        expect(upgradeInfo).toBeDefined();
        expect(upgradeInfo.cost).toBeGreaterThan(0);
        
        // Purchase upgrade
        const result = await game.upgradeManager.purchaseUpgrade('sedan', 'engine');
        expect(result).toBe(true);
        
        // Verify upgrade was applied
        const vehicleUpgrades = game.upgradeManager.getVehicleUpgrades('sedan');
        expect(vehicleUpgrades.engine).toBe(1);
    });

    test('should handle save and load operations', async () => {
        game = new ZombieCarGame(mockContainer);
        
        // Update game state
        game.saveManager.updatePlayerData({
            currency: 500,
            level: 3
        });
        
        game.saveManager.updateVehicleData({
            owned: ['sedan', 'suv'],
            selected: 'suv'
        });
        
        // Save the game
        await game.saveManager.saveToLocalStorage();
        
        // Verify data was saved
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
            'zombie_car_game_save',
            expect.any(String)
        );
        
        // Create new game instance and load
        const newGame = new ZombieCarGame(mockContainer);
        await newGame.saveManager.loadFromLocalStorage();
        
        expect(newGame.saveManager.saveState.player.currency).toBe(500);
        expect(newGame.saveManager.saveState.player.level).toBe(3);
        expect(newGame.saveManager.saveState.vehicles.owned).toContain('sedan');
        expect(newGame.saveManager.saveState.vehicles.owned).toContain('suv');
        
        newGame.dispose();
    });

    test('should handle level progression', async () => {
        game = new ZombieCarGame(mockContainer);
        
        // Start level 1
        await game.startLevel('level_1');
        
        expect(game.levelManager.getCurrentLevel().id).toBe('level_1');
        expect(game.gameStateManager.getCurrentState()).toBe('playing');
        
        // Simulate level completion
        game.levelManager.completeLevel('level_1', {
            score: 1000,
            zombiesKilled: 50,
            timeElapsed: 120
        });
        
        // Check if next level is unlocked
        const levelProgress = game.saveManager.saveState.levels.progress;
        expect(levelProgress['level_1']).toBeDefined();
        expect(levelProgress['level_1'].completed).toBe(true);
    });

    test('should handle error scenarios gracefully', async () => {
        game = new ZombieCarGame(mockContainer);
        
        // Test network error handling
        global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));
        
        // Should not crash when API calls fail
        const result = await game.upgradeManager.purchaseUpgrade('sedan', 'engine').catch(() => false);
        expect(result).toBe(false);
        
        // Test invalid operations
        expect(() => game.vehicleManager.spawnVehicle('invalid_type')).not.toThrow();
        expect(() => game.zombieManager.spawnZombie('invalid_type')).not.toThrow();
    });

    test('should handle performance optimization', async () => {
        game = new ZombieCarGame(mockContainer);
        
        // Simulate low performance
        game.performanceManager.currentFps = 30;
        game.performanceManager._autoAdjustQuality();
        
        expect(game.performanceManager.currentQualityLevel).not.toBe('ultra');
        
        // Simulate good performance
        game.performanceManager.currentFps = 60;
        game.performanceManager._autoAdjustQuality();
        
        // Quality should improve or stay stable
        expect(['medium', 'high', 'ultra']).toContain(game.performanceManager.currentQualityLevel);
    });

    test('should handle audio system', async () => {
        game = new ZombieCarGame(mockContainer);
        
        // Test audio initialization
        expect(game.audioManager).toBeDefined();
        
        // Test audio settings
        game.audioManager.setMasterVolume(0.5);
        expect(game.audioManager.masterVolume).toBe(0.5);
        
        // Test sound playing (should not crash)
        expect(() => game.audioManager.playSound('engine_start')).not.toThrow();
        expect(() => game.audioManager.playMusic('background_music')).not.toThrow();
    });

    test('should handle complete disposal', async () => {
        game = new ZombieCarGame(mockContainer);
        
        // Initialize all systems
        await game.startNewGame();
        
        // Dispose the game
        game.dispose();
        
        // Verify cleanup
        expect(game.isDisposed).toBe(true);
        
        // Should not crash when calling methods after disposal
        expect(() => game.update(0.016)).not.toThrow();
        expect(() => game.render()).not.toThrow();
    });

    test('should maintain consistent state throughout gameplay', async () => {
        game = new ZombieCarGame(mockContainer);
        
        // Track state changes
        const stateChanges = [];
        game.gameStateManager.on('stateChanged', (newState) => {
            stateChanges.push(newState);
        });
        
        // Go through typical game flow
        await game.startNewGame();
        expect(stateChanges).toContain('playing');
        
        game.gameStateManager.pauseGame();
        expect(stateChanges).toContain('paused');
        
        game.gameStateManager.resumeGame();
        expect(stateChanges).toContain('playing');
        
        await game.endSession();
        expect(stateChanges).toContain('menu');
        
        // Verify final state is consistent
        expect(game.gameStateManager.getCurrentState()).toBe('menu');
    });

    test('should handle concurrent operations safely', async () => {
        game = new ZombieCarGame(mockContainer);
        
        // Start multiple operations concurrently
        const promises = [
            game.saveManager.saveToLocalStorage(),
            game.upgradeManager.purchaseUpgrade('sedan', 'engine'),
            game.scoringSystem.updateSessionScore(100),
            game.levelManager.loadLevel('level_1')
        ];
        
        // Should not crash or cause race conditions
        await Promise.allSettled(promises);
        
        // Game should still be in a valid state
        expect(game.gameStateManager).toBeDefined();
        expect(game.saveManager.saveState).toBeDefined();
    });
});