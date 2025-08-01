import { GameStateManager, GameState } from '../GameStateManager';

// Mock GameEngine
const mockGameEngine = {
    start: jest.fn(),
    stop: jest.fn(),
    update: jest.fn(),
    render: jest.fn()
};

describe('GameStateManager', () => {
    let gameStateManager;

    beforeEach(() => {
        gameStateManager = new GameStateManager(mockGameEngine);
        gameStateManager.initialize();
        jest.clearAllMocks();
    });

    afterEach(() => {
        gameStateManager.dispose();
    });

    describe('Initialization', () => {
        test('should initialize with main menu state', () => {
            expect(gameStateManager.getCurrentState()).toBe(GameState.MAIN_MENU);
        });

        test('should emit stateChanged event on initialization', () => {
            const stateChangedSpy = jest.fn();
            const newManager = new GameStateManager(mockGameEngine);
            newManager.on('stateChanged', stateChangedSpy);
            
            newManager.initialize();
            
            expect(stateChangedSpy).toHaveBeenCalledWith(GameState.MAIN_MENU, null);
            newManager.dispose();
        });
    });

    describe('State Transitions', () => {
        test('should transition between states correctly', () => {
            gameStateManager.setState(GameState.PLAYING);
            expect(gameStateManager.getCurrentState()).toBe(GameState.PLAYING);
            expect(gameStateManager.getPreviousState()).toBe(GameState.MAIN_MENU);
        });

        test('should not transition to same state', () => {
            const stateChangedSpy = jest.fn();
            gameStateManager.on('stateChanged', stateChangedSpy);
            
            gameStateManager.setState(GameState.MAIN_MENU);
            
            expect(stateChangedSpy).not.toHaveBeenCalled();
        });

        test('should emit stateChanged event on transition', () => {
            const stateChangedSpy = jest.fn();
            gameStateManager.on('stateChanged', stateChangedSpy);
            
            gameStateManager.setState(GameState.PLAYING, { test: 'data' });
            
            expect(stateChangedSpy).toHaveBeenCalledWith(
                GameState.PLAYING,
                GameState.MAIN_MENU,
                { test: 'data' }
            );
        });
    });

    describe('Game Session Management', () => {
        test('should start game session correctly', () => {
            const sessionStartedSpy = jest.fn();
            gameStateManager.on('gameSessionStarted', sessionStartedSpy);
            
            gameStateManager.startGame('level1', 'sedan');
            
            expect(gameStateManager.gameSession).toBeDefined();
            expect(gameStateManager.gameSession.levelId).toBe('level1');
            expect(gameStateManager.gameSession.vehicleId).toBe('sedan');
            expect(sessionStartedSpy).toHaveBeenCalled();
        });

        test('should end game session correctly', () => {
            const sessionEndedSpy = jest.fn();
            gameStateManager.on('gameSessionEnded', sessionEndedSpy);
            
            gameStateManager.startGame('level1', 'sedan');
            gameStateManager.endGame('manual', false);
            
            expect(gameStateManager.gameSession.endTime).toBeDefined();
            expect(gameStateManager.gameSession.completed).toBe(false);
            expect(sessionEndedSpy).toHaveBeenCalled();
        });

        test('should transition to game over state on failure', () => {
            gameStateManager.startGame('level1', 'sedan');
            gameStateManager.endGame('vehicle_destroyed', false);
            
            expect(gameStateManager.getCurrentState()).toBe(GameState.GAME_OVER);
        });

        test('should transition to level complete state on success', () => {
            gameStateManager.startGame('level1', 'sedan');
            gameStateManager.endGame('level_completed', true);
            
            expect(gameStateManager.getCurrentState()).toBe(GameState.LEVEL_COMPLETE);
        });
    });

    describe('Pause/Resume Functionality', () => {
        test('should pause game from playing state', () => {
            gameStateManager.setState(GameState.PLAYING);
            gameStateManager.pauseGame();
            
            expect(gameStateManager.getCurrentState()).toBe(GameState.PAUSED);
        });

        test('should resume game from paused state', () => {
            gameStateManager.setState(GameState.PLAYING);
            gameStateManager.pauseGame();
            gameStateManager.resumeGame();
            
            expect(gameStateManager.getCurrentState()).toBe(GameState.PLAYING);
        });

        test('should not pause if not in playing state', () => {
            gameStateManager.setState(GameState.MAIN_MENU);
            gameStateManager.pauseGame();
            
            expect(gameStateManager.getCurrentState()).toBe(GameState.MAIN_MENU);
        });
    });

    describe('Game Statistics', () => {
        test('should update game statistics', () => {
            const statsUpdatedSpy = jest.fn();
            gameStateManager.on('gameStatsUpdated', statsUpdatedSpy);
            
            gameStateManager.updateGameStats({ score: 1000, zombiesKilled: 10 });
            
            expect(gameStateManager.gameStats.score).toBe(1000);
            expect(gameStateManager.gameStats.zombiesKilled).toBe(10);
            expect(statsUpdatedSpy).toHaveBeenCalledWith(gameStateManager.gameStats);
        });

        test('should update session data when stats are updated', () => {
            gameStateManager.startGame('level1', 'sedan');
            gameStateManager.updateGameStats({ score: 1500, distanceTraveled: 500 });
            
            expect(gameStateManager.gameSession.score).toBe(1500);
            expect(gameStateManager.gameSession.distanceTraveled).toBe(500);
        });
    });

    describe('Level Completion Detection', () => {
        test('should detect level completion when all objectives are met', () => {
            const mockLevelManager = {
                getCurrentLevel: jest.fn().mockReturnValue({
                    getObjectives: jest.fn().mockReturnValue([
                        { isCompleted: jest.fn().mockReturnValue(true) },
                        { isCompleted: jest.fn().mockReturnValue(true) }
                    ])
                })
            };
            
            gameStateManager.setSystemReferences({ levelManager: mockLevelManager });
            gameStateManager.currentLevel = 'level1';
            
            const result = gameStateManager.checkLevelCompletion();
            
            expect(result).toBe(true);
            expect(gameStateManager.getCurrentState()).toBe(GameState.LEVEL_COMPLETE);
        });

        test('should not complete level when objectives are not met', () => {
            const mockLevelManager = {
                getCurrentLevel: jest.fn().mockReturnValue({
                    getObjectives: jest.fn().mockReturnValue([
                        { isCompleted: jest.fn().mockReturnValue(true) },
                        { isCompleted: jest.fn().mockReturnValue(false) }
                    ])
                })
            };
            
            gameStateManager.setSystemReferences({ levelManager: mockLevelManager });
            gameStateManager.currentLevel = 'level1';
            
            const result = gameStateManager.checkLevelCompletion();
            
            expect(result).toBe(false);
        });
    });

    describe('Game Over Conditions', () => {
        test('should detect game over when vehicle health is zero', () => {
            const mockVehicleManager = {
                getCurrentVehicle: jest.fn().mockReturnValue({
                    getHealth: jest.fn().mockReturnValue(0),
                    getFuel: jest.fn().mockReturnValue(50),
                    getVelocity: jest.fn().mockReturnValue({ x: 0, z: 0 })
                })
            };
            
            gameStateManager.setSystemReferences({ vehicleManager: mockVehicleManager });
            gameStateManager.currentVehicle = 'sedan';
            
            const result = gameStateManager.checkGameOverConditions();
            
            expect(result).toBe(true);
            expect(gameStateManager.getCurrentState()).toBe(GameState.GAME_OVER);
        });

        test('should detect game over when vehicle is out of fuel', () => {
            const mockVehicleManager = {
                getCurrentVehicle: jest.fn().mockReturnValue({
                    getHealth: jest.fn().mockReturnValue(100),
                    getFuel: jest.fn().mockReturnValue(0),
                    getVelocity: jest.fn().mockReturnValue({ x: 0, z: 0 })
                })
            };
            
            gameStateManager.setSystemReferences({ vehicleManager: mockVehicleManager });
            gameStateManager.currentVehicle = 'sedan';
            
            const result = gameStateManager.checkGameOverConditions();
            
            expect(result).toBe(true);
            expect(gameStateManager.getCurrentState()).toBe(GameState.GAME_OVER);
        });
    });

    describe('Restart Functionality', () => {
        test('should restart level with same parameters', () => {
            gameStateManager.startGame('level1', 'sedan');
            gameStateManager.restartLevel();
            
            expect(gameStateManager.getCurrentState()).toBe(GameState.LOADING);
            expect(gameStateManager.getStateData().action).toBe('restart');
            expect(gameStateManager.getStateData().levelId).toBe('level1');
            expect(gameStateManager.getStateData().vehicleId).toBe('sedan');
        });
    });

    describe('Return to Main Menu', () => {
        test('should return to main menu and clear session data', () => {
            gameStateManager.startGame('level1', 'sedan');
            gameStateManager.returnToMainMenu();
            
            expect(gameStateManager.getCurrentState()).toBe(GameState.MAIN_MENU);
            expect(gameStateManager.gameSession).toBeNull();
            expect(gameStateManager.currentLevel).toBeNull();
            expect(gameStateManager.currentVehicle).toBeNull();
        });
    });

    describe('Update Loop', () => {
        test('should update playing state correctly', () => {
            gameStateManager.setState(GameState.PLAYING);
            gameStateManager.startGame('level1', 'sedan');
            
            const checkLevelCompletionSpy = jest.spyOn(gameStateManager, 'checkLevelCompletion');
            const checkGameOverSpy = jest.spyOn(gameStateManager, 'checkGameOverConditions');
            
            gameStateManager.update(0.016);
            
            expect(checkLevelCompletionSpy).toHaveBeenCalled();
            expect(checkGameOverSpy).toHaveBeenCalled();
        });

        test('should not update game logic when paused', () => {
            gameStateManager.setState(GameState.PAUSED);
            
            const checkLevelCompletionSpy = jest.spyOn(gameStateManager, 'checkLevelCompletion');
            const checkGameOverSpy = jest.spyOn(gameStateManager, 'checkGameOverConditions');
            
            gameStateManager.update(0.016);
            
            expect(checkLevelCompletionSpy).not.toHaveBeenCalled();
            expect(checkGameOverSpy).not.toHaveBeenCalled();
        });
    });
});