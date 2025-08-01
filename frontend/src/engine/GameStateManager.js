import { EventEmitter } from 'events';

/**
 * Game states enumeration
 */
export const GameState = {
    MAIN_MENU: 'main_menu',
    LEVEL_SELECT: 'level_select',
    GARAGE: 'garage',
    LOADING: 'loading',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'game_over',
    LEVEL_COMPLETE: 'level_complete',
    SETTINGS: 'settings'
};

/**
 * Game State Manager handles all game state transitions and logic
 */
export class GameStateManager extends EventEmitter {
    constructor(gameEngine) {
        super();
        this.gameEngine = gameEngine;
        this.currentState = GameState.MAIN_MENU;
        this.previousState = null;
        this.stateData = {};
        this.gameSession = null;
        this.levelManager = null;
        this.scoringSystem = null;
        this.vehicleManager = null;
        this.zombieManager = null;
        
        // Game session data
        this.sessionStartTime = null;
        this.currentLevel = null;
        this.currentVehicle = null;
        this.gameStats = this._initializeGameStats();
        
        // State transition handlers
        this.stateHandlers = new Map();
        this._initializeStateHandlers();
    }

    /**
     * Initialize the state manager
     */
    initialize() {
        console.log('GameStateManager initialized');
        this.emit('stateChanged', this.currentState, null);
    }

    /**
     * Update the state manager (called each frame)
     */
    update(deltaTime) {
        // Update current state logic
        switch (this.currentState) {
            case GameState.PLAYING:
                this._updatePlayingState(deltaTime);
                break;
            case GameState.PAUSED:
                this._updatePausedState(deltaTime);
                break;
            case GameState.LOADING:
                this._updateLoadingState(deltaTime);
                break;
        }
    }

    /**
     * Transition to a new game state
     */
    setState(newState, stateData = {}) {
        if (newState === this.currentState) return;

        const oldState = this.currentState;
        this.previousState = oldState;
        
        console.log(`State transition: ${oldState} -> ${newState}`);

        // Exit current state
        this._exitState(oldState);

        // Update state
        this.currentState = newState;
        this.stateData = { ...stateData };

        // Enter new state
        this._enterState(newState);

        // Emit state change event
        this.emit('stateChanged', newState, oldState, stateData);
    }

    /**
     * Get current game state
     */
    getCurrentState() {
        return this.currentState;
    }

    /**
     * Get previous game state
     */
    getPreviousState() {
        return this.previousState;
    }

    /**
     * Get state data
     */
    getStateData() {
        return this.stateData;
    }

    /**
     * Start a new game session
     */
    startGame(levelId, vehicleId) {
        this.gameSession = {
            id: this._generateSessionId(),
            levelId,
            vehicleId,
            startTime: Date.now(),
            endTime: null,
            score: 0,
            zombiesKilled: 0,
            distanceTraveled: 0,
            timeElapsed: 0,
            completed: false,
            gameOverReason: null
        };

        this.sessionStartTime = performance.now();
        this.currentLevel = levelId;
        this.currentVehicle = vehicleId;
        this.gameStats = this._initializeGameStats();

        console.log('Game session started:', this.gameSession);
        this.emit('gameSessionStarted', this.gameSession);
    }

    /**
     * End the current game session
     */
    endGame(reason = 'manual', completed = false) {
        if (!this.gameSession) return;

        this.gameSession.endTime = Date.now();
        this.gameSession.timeElapsed = (performance.now() - this.sessionStartTime) / 1000;
        this.gameSession.completed = completed;
        this.gameSession.gameOverReason = reason;

        console.log('Game session ended:', this.gameSession);
        this.emit('gameSessionEnded', this.gameSession);

        // Transition to appropriate state
        if (completed) {
            this.setState(GameState.LEVEL_COMPLETE, { 
                sessionData: this.gameSession,
                stats: this.gameStats 
            });
        } else {
            this.setState(GameState.GAME_OVER, { 
                sessionData: this.gameSession,
                stats: this.gameStats,
                reason 
            });
        }
    }

    /**
     * Pause the game
     */
    pauseGame() {
        if (this.currentState === GameState.PLAYING) {
            this.setState(GameState.PAUSED);
        }
    }

    /**
     * Resume the game
     */
    resumeGame() {
        if (this.currentState === GameState.PAUSED) {
            this.setState(GameState.PLAYING);
        }
    }

    /**
     * Restart the current level
     */
    restartLevel() {
        if (this.gameSession) {
            const { levelId, vehicleId } = this.gameSession;
            this.setState(GameState.LOADING, { 
                action: 'restart',
                levelId,
                vehicleId 
            });
        }
    }

    /**
     * Return to main menu
     */
    returnToMainMenu() {
        this.gameSession = null;
        this.currentLevel = null;
        this.currentVehicle = null;
        this.setState(GameState.MAIN_MENU);
    }

    /**
     * Update game statistics
     */
    updateGameStats(stats) {
        Object.assign(this.gameStats, stats);
        
        if (this.gameSession) {
            this.gameSession.score = this.gameStats.score;
            this.gameSession.zombiesKilled = this.gameStats.zombiesKilled;
            this.gameSession.distanceTraveled = this.gameStats.distanceTraveled;
        }

        this.emit('gameStatsUpdated', this.gameStats);
    }

    /**
     * Check for level completion conditions
     */
    checkLevelCompletion() {
        if (!this.currentLevel || !this.levelManager) return false;

        const level = this.levelManager.getCurrentLevel();
        if (!level) return false;

        // Check if all objectives are completed
        const objectives = level.getObjectives();
        const allCompleted = objectives.every(objective => objective.isCompleted());

        if (allCompleted) {
            this.endGame('level_completed', true);
            return true;
        }

        return false;
    }

    /**
     * Check for game over conditions
     */
    checkGameOverConditions() {
        if (!this.currentVehicle || !this.vehicleManager) return false;

        const vehicle = this.vehicleManager.getCurrentVehicle();
        if (!vehicle) return false;

        // Check vehicle health
        if (vehicle.getHealth() <= 0) {
            this.endGame('vehicle_destroyed', false);
            return true;
        }

        // Check fuel
        if (vehicle.getFuel() <= 0) {
            this.endGame('out_of_fuel', false);
            return true;
        }

        // Check if vehicle is stuck or out of bounds
        if (this._isVehicleStuck(vehicle)) {
            this.endGame('vehicle_stuck', false);
            return true;
        }

        return false;
    }

    /**
     * Set system references
     */
    setSystemReferences(systems) {
        this.levelManager = systems.levelManager;
        this.scoringSystem = systems.scoringSystem;
        this.vehicleManager = systems.vehicleManager;
        this.zombieManager = systems.zombieManager;
    }

    /**
     * Initialize state handlers
     */
    _initializeStateHandlers() {
        this.stateHandlers.set(GameState.MAIN_MENU, {
            enter: () => this._enterMainMenu(),
            exit: () => this._exitMainMenu(),
            update: (deltaTime) => this._updateMainMenu(deltaTime)
        });

        this.stateHandlers.set(GameState.PLAYING, {
            enter: () => this._enterPlaying(),
            exit: () => this._exitPlaying(),
            update: (deltaTime) => this._updatePlaying(deltaTime)
        });

        this.stateHandlers.set(GameState.PAUSED, {
            enter: () => this._enterPaused(),
            exit: () => this._exitPaused(),
            update: (deltaTime) => this._updatePaused(deltaTime)
        });

        this.stateHandlers.set(GameState.LOADING, {
            enter: () => this._enterLoading(),
            exit: () => this._exitLoading(),
            update: (deltaTime) => this._updateLoading(deltaTime)
        });

        this.stateHandlers.set(GameState.GAME_OVER, {
            enter: () => this._enterGameOver(),
            exit: () => this._exitGameOver(),
            update: (deltaTime) => this._updateGameOver(deltaTime)
        });

        this.stateHandlers.set(GameState.LEVEL_COMPLETE, {
            enter: () => this._enterLevelComplete(),
            exit: () => this._exitLevelComplete(),
            update: (deltaTime) => this._updateLevelComplete(deltaTime)
        });
    }

    /**
     * Enter a state
     */
    _enterState(state) {
        const handler = this.stateHandlers.get(state);
        if (handler && handler.enter) {
            handler.enter();
        }
    }

    /**
     * Exit a state
     */
    _exitState(state) {
        const handler = this.stateHandlers.get(state);
        if (handler && handler.exit) {
            handler.exit();
        }
    }

    /**
     * Update playing state
     */
    _updatePlayingState(deltaTime) {
        // Check for level completion
        this.checkLevelCompletion();
        
        // Check for game over conditions
        this.checkGameOverConditions();
        
        // Update game time
        if (this.sessionStartTime) {
            const currentTime = performance.now();
            const timeElapsed = (currentTime - this.sessionStartTime) / 1000;
            this.updateGameStats({ timeElapsed });
        }
    }

    /**
     * Update paused state
     */
    _updatePausedState(deltaTime) {
        // Paused state doesn't update game logic
    }

    /**
     * Update loading state
     */
    _updateLoadingState(deltaTime) {
        // Handle loading progress
        const action = this.stateData.action;
        
        if (action === 'restart') {
            // Simulate loading time for restart
            setTimeout(() => {
                if (this.currentState === GameState.LOADING) {
                    this.startGame(this.stateData.levelId, this.stateData.vehicleId);
                    this.setState(GameState.PLAYING);
                }
            }, 1000);
        }
    }

    /**
     * State handler implementations
     */
    _enterMainMenu() {
        console.log('Entered main menu state');
    }

    _exitMainMenu() {
        console.log('Exited main menu state');
    }

    _updateMainMenu(deltaTime) {
        // Main menu update logic
    }

    _enterPlaying() {
        console.log('Entered playing state');
        if (this.gameEngine) {
            this.gameEngine.start();
        }
    }

    _exitPlaying() {
        console.log('Exited playing state');
    }

    _updatePlaying(deltaTime) {
        // Playing state update logic is handled in _updatePlayingState
    }

    _enterPaused() {
        console.log('Entered paused state');
        if (this.gameEngine) {
            this.gameEngine.stop();
        }
    }

    _exitPaused() {
        console.log('Exited paused state');
        if (this.gameEngine) {
            this.gameEngine.start();
        }
    }

    _updatePaused(deltaTime) {
        // Paused state update logic
    }

    _enterLoading() {
        console.log('Entered loading state');
    }

    _exitLoading() {
        console.log('Exited loading state');
    }

    _updateLoading(deltaTime) {
        // Loading state update logic is handled in _updateLoadingState
    }

    _enterGameOver() {
        console.log('Entered game over state');
        if (this.gameEngine) {
            this.gameEngine.stop();
        }
    }

    _exitGameOver() {
        console.log('Exited game over state');
    }

    _updateGameOver(deltaTime) {
        // Game over state update logic
    }

    _enterLevelComplete() {
        console.log('Entered level complete state');
        if (this.gameEngine) {
            this.gameEngine.stop();
        }
    }

    _exitLevelComplete() {
        console.log('Exited level complete state');
    }

    _updateLevelComplete(deltaTime) {
        // Level complete state update logic
    }

    /**
     * Initialize game statistics
     */
    _initializeGameStats() {
        return {
            score: 0,
            zombiesKilled: 0,
            distanceTraveled: 0,
            timeElapsed: 0,
            comboMultiplier: 1,
            maxCombo: 0,
            vehicleHealth: 100,
            vehicleFuel: 100,
            checkpointsReached: 0,
            bonusPoints: 0
        };
    }

    /**
     * Generate a unique session ID
     */
    _generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Check if vehicle is stuck
     */
    _isVehicleStuck(vehicle) {
        // Simple stuck detection - can be enhanced
        const velocity = vehicle.getVelocity();
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
        
        // If vehicle has been moving very slowly for too long, consider it stuck
        if (speed < 0.1) {
            if (!this._stuckTimer) {
                this._stuckTimer = performance.now();
            } else if (performance.now() - this._stuckTimer > 10000) { // 10 seconds
                return true;
            }
        } else {
            this._stuckTimer = null;
        }

        return false;
    }

    /**
     * Dispose of the state manager
     */
    dispose() {
        this.removeAllListeners();
        this.gameSession = null;
        this.levelManager = null;
        this.scoringSystem = null;
        this.vehicleManager = null;
        this.zombieManager = null;
        console.log('GameStateManager disposed');
    }
}