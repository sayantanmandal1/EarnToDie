import { GameLoopIntegration } from '../GameLoopIntegration';
import { GameState } from '../GameStateManager';

// Mock GameEngine
const mockGameEngine = {
    start: jest.fn(),
    stop: jest.fn(),
    update: jest.fn(),
    render: jest.fn(),
    dispose: jest.fn()
};

// Mock system references
const mockSystems = {
    levelManager: {
        getLevelObjectives: jest.fn().mockReturnValue([
            { id: 'obj1', name: 'Test objective', bonusPoints: 100 }
        ]),
        getCurrentLevel: jest.fn().mockReturnValue({
            isCompleted: jest.fn().mockReturnValue(false)
        }),
        update: jest.fn()
    },
    vehicleManager: {
        getCurrentVehicle: jest.fn().mockReturnValue({
            getHealth: jest.fn().mockReturnValue(100),
            getFuel: jest.fn().mockReturnValue(100),
            getVelocity: jest.fn().mockReturnValue({ x: 0, z: 0 })
        }),
        getDistanceTraveled: jest.fn().mockReturnValue(0),
        update: jest.fn()
    },
    zombieManager: {
        update: jest.fn()
    },
    scoringSystem: {
        update: jest.fn()
    },
    combatSystem: {
        update: jest.fn()
    },
    audioManager: {
        playSound: jest.fn(),
        playMusic: jest.fn(),
        stopAll: jest.fn(),
        pauseAll: jest.fn(),
        resumeAll: jest.fn()
    }
};

// Mock window and document events
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
global.window = {
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener
};
global.document = {
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
    hidden: false
};

describe('GameLoopIntegration', () => {
    let gameLoopIntegration;

    beforeEach(() => {
        gameLoopIntegration = new GameLoopIntegration(mockGameEngine);
        jest.clearAllMocks();
    });

    afterEach(() => {
        gameLoopIntegration.dispose();
    });

    describe('Initialization', () => {
        test('should initialize correctly', async () => {
            await gameLoopIntegration.initialize();
            
            expect(gameLoopIntegration.isInitialized).toBe(true);
            expect(gameLoopIntegration.gameStateManager).toBeDefined();
            expect(gameLoopIntegration.gameLoop).toBeDefined();
        });

        test('should not initialize twice', async () => {
            await gameLoopIntegration.initialize();
            const firstStateManager = gameLoopIntegration.gameStateManager;
            
            await gameLoopIntegration.initialize();
            
            expect(gameLoopIntegration.gameStateManager).toBe(firstStateManager);
        });

        test('should set system references correctly', async () => {
            await gameLoopIntegration.initialize();
            gameLoopIntegration.setSystemReferences(mockSystems);
            
            expect(gameLoopIntegration.levelManager).toBe(mockSystems.levelManager);
            expect(gameLoopIntegration.vehicleManager).toBe(mockSystems.vehicleManager);
            expect(gameLoopIntegration.zombieManager).toBe(mockSystems.zombieManager);
            expect(gameLoopIntegration.scoringSystem).toBe(mockSystems.scoringSystem);
            expect(gameLoopIntegration.combatSystem).toBe(mockSystems.combatSystem);
            expect(gameLoopIntegration.audioManager).toBe(mockSystems.audioManager);
        });
    });

    describe('Game Loop Control', () => {
        beforeEach(async () => {
            await gameLoopIntegration.initialize();
        });

        test('should start game loop', () => {
            const startSpy = jest.spyOn(gameLoopIntegration.gameLoop, 'start');
            
            gameLoopIntegration.start();
            
            expect(startSpy).toHaveBeenCalled();
        });

        test('should stop game loop', () => {
            const stopSpy = jest.spyOn(gameLoopIntegration.gameLoop, 'stop');
            
            gameLoopIntegration.stop();
            
            expect(stopSpy).toHaveBeenCalled();
        });

        test('should not start if not initialized', () => {
            const uninitializedIntegration = new GameLoopIntegration(mockGameEngine);
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            uninitializedIntegration.start();
            
            expect(consoleSpy).toHaveBeenCalledWith('Cannot start - GameLoopIntegration not initialized');
            consoleSpy.mockRestore();
            uninitializedIntegration.dispose();
        });
    });

    describe('Game Session Management', () => {
        beforeEach(async () => {
            await gameLoopIntegration.initialize();
            gameLoopIntegration.setSystemReferences(mockSystems);
        });

        test('should start game session correctly', () => {
            const result = gameLoopIntegration.startGameSession('level1', 'sedan');
            
            expect(result).toBe(true);
            expect(gameLoopIntegration.gameSession).toBeDefined();
            expect(gameLoopIntegration.currentLevel).toBe('level1');
            expect(gameLoopIntegration.currentVehicle).toBe('sedan');
            expect(gameLoopIntegration.getCurrentState()).toBe(GameState.PLAYING);
        });

        test('should end current session when starting new one', () => {
            gameLoopIntegration.startGameSession('level1', 'sedan');
            const firstSession = gameLoopIntegration.gameSession;
            const endSpy = jest.spyOn(firstSession, 'end');
            
            gameLoopIntegration.startGameSession('level2', 'truck');
            
            expect(endSpy).toHaveBeenCalledWith('new_session_started', false);
            expect(gameLoopIntegration.currentLevel).toBe('level2');
            expect(gameLoopIntegration.currentVehicle).toBe('truck');
        });

        test('should end game session correctly', () => {
            gameLoopIntegration.startGameSession('level1', 'sedan');
            
            const results = gameLoopIntegration.endGameSession('manual', false);
            
            expect(results).toBeDefined();
            expect(results.completed).toBe(false);
            expect(results.reason).toBe('manual');
        });

        test('should return null when ending non-active session', () => {
            const results = gameLoopIntegration.endGameSession('manual', false);
            expect(results).toBeNull();
        });
    });

    describe('Pause/Resume Functionality', () => {
        beforeEach(async () => {
            await gameLoopIntegration.initialize();
            gameLoopIntegration.setSystemReferences(mockSystems);
            gameLoopIntegration.startGameSession('level1', 'sedan');
        });

        test('should pause game correctly', () => {
            const pauseLoopSpy = jest.spyOn(gameLoopIntegration.gameLoop, 'pause');
            const pauseGameSpy = jest.spyOn(gameLoopIntegration.gameStateManager, 'pauseGame');
            
            gameLoopIntegration.pauseGame();
            
            expect(pauseLoopSpy).toHaveBeenCalled();
            expect(pauseGameSpy).toHaveBeenCalled();
        });

        test('should resume game correctly', () => {
            gameLoopIntegration.pauseGame();
            
            const resumeLoopSpy = jest.spyOn(gameLoopIntegration.gameLoop, 'resume');
            const resumeGameSpy = jest.spyOn(gameLoopIntegration.gameStateManager, 'resumeGame');
            
            gameLoopIntegration.resumeGame();
            
            expect(resumeLoopSpy).toHaveBeenCalled();
            expect(resumeGameSpy).toHaveBeenCalled();
        });
    });

    describe('Level Management', () => {
        beforeEach(async () => {
            await gameLoopIntegration.initialize();
            gameLoopIntegration.setSystemReferences(mockSystems);
        });

        test('should restart level correctly', (done) => {
            gameLoopIntegration.startGameSession('level1', 'sedan');
            
            gameLoopIntegration.restartLevel();
            
            // Check that session was ended
            expect(gameLoopIntegration.gameSession.isActive).toBe(false);
            
            // Wait for restart to complete
            setTimeout(() => {
                expect(gameLoopIntegration.currentLevel).toBe('level1');
                expect(gameLoopIntegration.currentVehicle).toBe('sedan');
                expect(gameLoopIntegration.gameSession.isActive).toBe(true);
                done();
            }, 150);
        });

        test('should return to main menu correctly', () => {
            gameLoopIntegration.startGameSession('level1', 'sedan');
            
            gameLoopIntegration.returnToMainMenu();
            
            expect(gameLoopIntegration.getCurrentState()).toBe(GameState.MAIN_MENU);
            expect(gameLoopIntegration.currentLevel).toBeNull();
            expect(gameLoopIntegration.currentVehicle).toBeNull();
        });
    });

    describe('System Updates', () => {
        beforeEach(async () => {
            await gameLoopIntegration.initialize();
            gameLoopIntegration.setSystemReferences(mockSystems);
            gameLoopIntegration.startGameSession('level1', 'sedan');
        });

        test('should update all systems during gameplay', () => {
            // Simulate game loop update
            gameLoopIntegration.gameLoop.onUpdate(0.016);
            
            expect(mockSystems.levelManager.update).toHaveBeenCalledWith(0.016);
            expect(mockSystems.vehicleManager.update).toHaveBeenCalledWith(0.016);
            expect(mockSystems.zombieManager.update).toHaveBeenCalledWith(0.016);
            expect(mockSystems.combatSystem.update).toHaveBeenCalledWith(0.016);
            expect(mockSystems.scoringSystem.update).toHaveBeenCalledWith(0.016);
        });

        test('should not update systems when not playing', () => {
            gameLoopIntegration.pauseGame();
            jest.clearAllMocks();
            
            // Simulate game loop update
            gameLoopIntegration.gameLoop.onUpdate(0.016);
            
            expect(mockSystems.levelManager.update).not.toHaveBeenCalled();
            expect(mockSystems.vehicleManager.update).not.toHaveBeenCalled();
            expect(mockSystems.zombieManager.update).not.toHaveBeenCalled();
        });
    });

    describe('Game Event Checking', () => {
        beforeEach(async () => {
            await gameLoopIntegration.initialize();
            gameLoopIntegration.setSystemReferences(mockSystems);
            gameLoopIntegration.startGameSession('level1', 'sedan');
        });

        test('should check vehicle health and end game when destroyed', () => {
            // Mock vehicle with zero health
            mockSystems.vehicleManager.getCurrentVehicle.mockReturnValue({
                getHealth: jest.fn().mockReturnValue(0),
                getFuel: jest.fn().mockReturnValue(50),
                getVelocity: jest.fn().mockReturnValue({ x: 0, z: 0 })
            });
            
            const endSessionSpy = jest.spyOn(gameLoopIntegration, 'endGameSession');
            
            // Trigger game event check
            gameLoopIntegration._checkGameEvents();
            
            expect(endSessionSpy).toHaveBeenCalledWith('vehicle_destroyed', false);
        });

        test('should check fuel and end game when empty', () => {
            // Mock vehicle with zero fuel
            mockSystems.vehicleManager.getCurrentVehicle.mockReturnValue({
                getHealth: jest.fn().mockReturnValue(100),
                getFuel: jest.fn().mockReturnValue(0),
                getVelocity: jest.fn().mockReturnValue({ x: 0, z: 0 })
            });
            
            const endSessionSpy = jest.spyOn(gameLoopIntegration, 'endGameSession');
            
            // Trigger game event check
            gameLoopIntegration._checkGameEvents();
            
            expect(endSessionSpy).toHaveBeenCalledWith('out_of_fuel', false);
        });

        test('should update distance traveled', () => {
            mockSystems.vehicleManager.getDistanceTraveled.mockReturnValue(1500);
            
            const updateDistanceSpy = jest.spyOn(gameLoopIntegration.gameSession, 'updateDistance');
            
            // Trigger game event check
            gameLoopIntegration._checkGameEvents();
            
            expect(updateDistanceSpy).toHaveBeenCalledWith(1500);
        });
    });

    describe('State Change Handling', () => {
        beforeEach(async () => {
            await gameLoopIntegration.initialize();
            gameLoopIntegration.setSystemReferences(mockSystems);
        });

        test('should handle playing state correctly', () => {
            gameLoopIntegration._handlePlayingState();
            
            expect(mockSystems.audioManager.resumeAll).toHaveBeenCalled();
        });

        test('should handle paused state correctly', () => {
            gameLoopIntegration._handlePausedState();
            
            expect(mockSystems.audioManager.pauseAll).toHaveBeenCalled();
        });

        test('should handle game over state correctly', () => {
            gameLoopIntegration._handleGameOverState({});
            
            expect(mockSystems.audioManager.stopAll).toHaveBeenCalled();
            expect(mockSystems.audioManager.playSound).toHaveBeenCalledWith('game_over');
        });

        test('should handle level complete state correctly', () => {
            gameLoopIntegration._handleLevelCompleteState({});
            
            expect(mockSystems.audioManager.stopAll).toHaveBeenCalled();
            expect(mockSystems.audioManager.playSound).toHaveBeenCalledWith('level_complete');
        });

        test('should handle main menu state correctly', () => {
            gameLoopIntegration._handleMainMenuState();
            
            expect(mockSystems.audioManager.stopAll).toHaveBeenCalled();
            expect(mockSystems.audioManager.playMusic).toHaveBeenCalledWith('menu_music');
        });
    });

    describe('Performance Monitoring', () => {
        beforeEach(async () => {
            await gameLoopIntegration.initialize();
        });

        test('should provide performance statistics', () => {
            const stats = gameLoopIntegration.getPerformanceStats();
            
            expect(stats).toHaveProperty('fps');
            expect(stats).toHaveProperty('averageFrameTime');
            expect(stats).toHaveProperty('currentFrameTime');
            expect(stats).toHaveProperty('isRunning');
            expect(stats).toHaveProperty('isPaused');
            expect(stats).toHaveProperty('updateTime');
            expect(stats).toHaveProperty('renderTime');
        });

        test('should track update and render times', () => {
            // Mock performance.now for timing
            let mockTime = 0;
            const originalNow = performance.now;
            performance.now = jest.fn(() => mockTime);
            
            // Simulate update callback with timing
            mockTime = 0;
            gameLoopIntegration.gameLoop.onUpdate(0.016);
            mockTime = 5; // 5ms update time
            
            // The callback should have been called and timing recorded
            expect(gameLoopIntegration.performanceStats.updateTime).toBeGreaterThanOrEqual(0);
            
            // Simulate render callback with timing
            mockTime = 0;
            gameLoopIntegration.gameLoop.onRender(0.5);
            mockTime = 3; // 3ms render time
            
            expect(gameLoopIntegration.performanceStats.renderTime).toBeGreaterThanOrEqual(0);
            
            // Restore original performance.now
            performance.now = originalNow;
        });
    });

    describe('Session Data Access', () => {
        beforeEach(async () => {
            await gameLoopIntegration.initialize();
            gameLoopIntegration.setSystemReferences(mockSystems);
        });

        test('should return current session data', () => {
            gameLoopIntegration.startGameSession('level1', 'sedan');
            
            const sessionData = gameLoopIntegration.getCurrentSessionData();
            
            expect(sessionData).toBeDefined();
            expect(sessionData.levelId).toBe('level1');
            expect(sessionData.vehicleId).toBe('sedan');
            expect(sessionData.isActive).toBe(true);
        });

        test('should return null when no active session', () => {
            const sessionData = gameLoopIntegration.getCurrentSessionData();
            expect(sessionData).toBeNull();
        });
    });

    describe('Disposal', () => {
        test('should dispose correctly', async () => {
            await gameLoopIntegration.initialize();
            gameLoopIntegration.setSystemReferences(mockSystems);
            gameLoopIntegration.startGameSession('level1', 'sedan');
            
            gameLoopIntegration.dispose();
            
            expect(gameLoopIntegration.gameStateManager).toBeNull();
            expect(gameLoopIntegration.gameLoop).toBeNull();
            expect(gameLoopIntegration.gameSession).toBeNull();
            expect(gameLoopIntegration.gameEngine).toBeNull();
        });
    });
});