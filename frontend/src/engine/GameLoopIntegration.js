import { GameStateManager, GameState } from './GameStateManager';
import { GameLoop } from './GameLoop';
import { GameSession } from './GameSession';

/**
 * Integration class that brings together game loop, state management, and session handling
 */
export class GameLoopIntegration {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        
        // Core systems
        this.gameStateManager = new GameStateManager(gameEngine);
        this.gameLoop = new GameLoop(gameEngine, this.gameStateManager);
        this.gameSession = null;
        
        // System references
        this.levelManager = null;
        this.vehicleManager = null;
        this.zombieManager = null;
        this.scoringSystem = null;
        this.combatSystem = null;
        this.audioManager = null;
        
        // Integration state
        this.isInitialized = false;
        this.currentLevel = null;
        this.currentVehicle = null;
        
        // Performance monitoring
        this.performanceStats = {
            fps: 0,
            frameTime: 0,
            updateTime: 0,
            renderTime: 0
        };
        
        this._setupEventHandlers();
    }

    /**
     * Initialize the integration system
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Initialize state manager
            this.gameStateManager.initialize();
            
            // Setup game loop callbacks
            this._setupGameLoopCallbacks();
            
            // Setup state change handlers
            this._setupStateChangeHandlers();
            
            this.isInitialized = true;
            console.log('GameLoopIntegration initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize GameLoopIntegration:', error);
            throw error;
        }
    }

    /**
     * Set system references for integration
     */
    setSystemReferences(systems) {
        this.levelManager = systems.levelManager;
        this.vehicleManager = systems.vehicleManager;
        this.zombieManager = systems.zombieManager;
        this.scoringSystem = systems.scoringSystem;
        this.combatSystem = systems.combatSystem;
        this.audioManager = systems.audioManager;
        
        // Pass references to state manager
        this.gameStateManager.setSystemReferences(systems);
        
        console.log('System references set for GameLoopIntegration');
    }

    /**
     * Start the game loop
     */
    start() {
        if (!this.isInitialized) {
            console.error('Cannot start - GameLoopIntegration not initialized');
            return;
        }
        
        this.gameLoop.start();
        console.log('Game loop started');
    }

    /**
     * Stop the game loop
     */
    stop() {
        if (this.gameLoop) {
            this.gameLoop.stop();
        }
        console.log('Game loop stopped');
    }

    /**
     * Start a new game session
     */
    startGameSession(levelId, vehicleId) {
        // End current session if active
        if (this.gameSession && this.gameSession.isActive) {
            this.gameSession.end('new_session_started', false);
        }

        // Create new session
        this.gameSession = new GameSession(this.gameStateManager, this.scoringSystem);
        this._setupSessionEventHandlers();

        // Get level objectives
        const objectives = this.levelManager ? this.levelManager.getLevelObjectives(levelId) : [];

        // Start the session
        if (this.gameSession.start(levelId, vehicleId, objectives)) {
            this.currentLevel = levelId;
            this.currentVehicle = vehicleId;
            
            // Start game state manager session
            this.gameStateManager.startGame(levelId, vehicleId);
            
            // Transition to playing state
            this.gameStateManager.setState(GameState.PLAYING);
            
            console.log(`Game session started: Level ${levelId}, Vehicle ${vehicleId}`);
            return true;
        }
        
        return false;
    }

    /**
     * End the current game session
     */
    endGameSession(reason = 'manual', completed = false) {
        if (this.gameSession && this.gameSession.isActive) {
            const results = this.gameSession.end(reason, completed);
            this.gameStateManager.endGame(reason, completed);
            return results;
        }
        return null;
    }

    /**
     * Pause the game
     */
    pauseGame() {
        this.gameLoop.pause();
        this.gameStateManager.pauseGame();
    }

    /**
     * Resume the game
     */
    resumeGame() {
        this.gameLoop.resume();
        this.gameStateManager.resumeGame();
    }

    /**
     * Restart the current level
     */
    restartLevel() {
        if (this.currentLevel && this.currentVehicle) {
            this.endGameSession('restart', false);
            
            // Small delay to allow cleanup
            setTimeout(() => {
                this.startGameSession(this.currentLevel, this.currentVehicle);
            }, 100);
        }
    }

    /**
     * Return to main menu
     */
    returnToMainMenu() {
        this.endGameSession('return_to_menu', false);
        this.gameStateManager.returnToMainMenu();
        this.currentLevel = null;
        this.currentVehicle = null;
    }

    /**
     * Get current game state
     */
    getCurrentState() {
        return this.gameStateManager.getCurrentState();
    }

    /**
     * Get current session data
     */
    getCurrentSessionData() {
        return this.gameSession ? this.gameSession.getSessionData() : null;
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return {
            ...this.gameLoop.getPerformanceStats(),
            ...this.performanceStats
        };
    }

    /**
     * Setup game loop callbacks
     */
    _setupGameLoopCallbacks() {
        // Update callback
        this.gameLoop.onUpdate = (deltaTime) => {
            const updateStart = performance.now();
            
            // Update all game systems based on current state
            this._updateGameSystems(deltaTime);
            
            this.performanceStats.updateTime = performance.now() - updateStart;
        };

        // Render callback
        this.gameLoop.onRender = (interpolation) => {
            const renderStart = performance.now();
            
            // Custom render logic can go here
            this._renderGameSystems(interpolation);
            
            this.performanceStats.renderTime = performance.now() - renderStart;
        };

        // FPS update callback
        this.gameLoop.onFpsUpdate = (fps, frameTime) => {
            this.performanceStats.fps = fps;
            this.performanceStats.frameTime = frameTime;
        };
    }

    /**
     * Setup state change handlers
     */
    _setupStateChangeHandlers() {
        this.gameStateManager.on('stateChanged', (newState, oldState, stateData) => {
            this._handleStateChange(newState, oldState, stateData);
        });

        this.gameStateManager.on('gameSessionStarted', (sessionData) => {
            console.log('Game session started:', sessionData);
        });

        this.gameStateManager.on('gameSessionEnded', (sessionData) => {
            console.log('Game session ended:', sessionData);
        });
    }

    /**
     * Setup session event handlers
     */
    _setupSessionEventHandlers() {
        if (!this.gameSession) return;

        this.gameSession.on('zombieKilled', (data) => {
            // Update UI, play sounds, etc.
            if (this.audioManager) {
                this.audioManager.playSound('zombie_kill');
            }
        });

        this.gameSession.on('checkpointReached', (checkpoint) => {
            // Save progress, play checkpoint sound
            if (this.audioManager) {
                this.audioManager.playSound('checkpoint');
            }
        });

        this.gameSession.on('objectiveCompleted', (data) => {
            // Show objective completion UI
            console.log('Objective completed:', data);
        });

        this.gameSession.on('levelCompleted', (data) => {
            // Handle level completion
            this.endGameSession('level_completed', true);
        });

        this.gameSession.on('comboBreak', () => {
            // Handle combo break
            if (this.audioManager) {
                this.audioManager.playSound('combo_break');
            }
        });
    }

    /**
     * Setup event handlers
     */
    _setupEventHandlers() {
        // Handle window focus/blur for automatic pause/resume
        window.addEventListener('blur', () => {
            if (this.getCurrentState() === GameState.PLAYING) {
                this.pauseGame();
            }
        });

        window.addEventListener('focus', () => {
            if (this.getCurrentState() === GameState.PAUSED) {
                // Don't auto-resume, let player choose
            }
        });

        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.getCurrentState() === GameState.PLAYING) {
                this.pauseGame();
            }
        });
    }

    /**
     * Handle state changes
     */
    _handleStateChange(newState, oldState, stateData) {
        console.log(`State changed: ${oldState} -> ${newState}`);

        switch (newState) {
            case GameState.PLAYING:
                this._handlePlayingState();
                break;
            case GameState.PAUSED:
                this._handlePausedState();
                break;
            case GameState.GAME_OVER:
                this._handleGameOverState(stateData);
                break;
            case GameState.LEVEL_COMPLETE:
                this._handleLevelCompleteState(stateData);
                break;
            case GameState.MAIN_MENU:
                this._handleMainMenuState();
                break;
        }
    }

    /**
     * Handle playing state
     */
    _handlePlayingState() {
        // Resume all game systems
        if (this.audioManager) {
            this.audioManager.resumeAll();
        }
    }

    /**
     * Handle paused state
     */
    _handlePausedState() {
        // Pause audio and other systems
        if (this.audioManager) {
            this.audioManager.pauseAll();
        }
    }

    /**
     * Handle game over state
     */
    _handleGameOverState(stateData) {
        // Stop all game systems
        if (this.audioManager) {
            this.audioManager.stopAll();
            this.audioManager.playSound('game_over');
        }
    }

    /**
     * Handle level complete state
     */
    _handleLevelCompleteState(stateData) {
        // Play victory sound
        if (this.audioManager) {
            this.audioManager.stopAll();
            this.audioManager.playSound('level_complete');
        }
    }

    /**
     * Handle main menu state
     */
    _handleMainMenuState() {
        // Reset all systems
        if (this.audioManager) {
            this.audioManager.stopAll();
            this.audioManager.playMusic('menu_music');
        }
    }

    /**
     * Update method for external use (called by tests)
     */
    update(deltaTime) {
        this._updateGameSystems(deltaTime);
    }

    /**
     * Update all game systems
     */
    _updateGameSystems(deltaTime) {
        const currentState = this.getCurrentState();
        
        // Only update game systems during gameplay
        if (currentState === GameState.PLAYING) {
            // Update level
            if (this.levelManager) {
                this.levelManager.update(deltaTime);
            }

            // Update vehicle
            if (this.vehicleManager) {
                this.vehicleManager.update(deltaTime);
            }

            // Update zombies
            if (this.zombieManager) {
                this.zombieManager.update(deltaTime);
            }

            // Update combat system
            if (this.combatSystem) {
                this.combatSystem.update(deltaTime);
            }

            // Update scoring
            if (this.scoringSystem) {
                this.scoringSystem.update(deltaTime);
            }

            // Check for game events
            this._checkGameEvents();
        }
    }

    /**
     * Render all game systems
     */
    _renderGameSystems(interpolation) {
        // Custom rendering logic can be added here
        // Most rendering is handled by the game engine itself
    }

    /**
     * Check for game events and conditions
     */
    _checkGameEvents() {
        if (!this.gameSession || !this.gameSession.isActive) return;

        // Check vehicle status
        if (this.vehicleManager) {
            const vehicle = this.vehicleManager.getCurrentVehicle();
            if (vehicle) {
                const health = vehicle.getHealth();
                const fuel = vehicle.getFuel();
                
                this.gameSession.updateVehicleStatus(health, fuel);
                
                // Check for game over conditions
                if (health <= 0) {
                    this.endGameSession('vehicle_destroyed', false);
                } else if (fuel <= 0) {
                    this.endGameSession('out_of_fuel', false);
                }
            }
        }

        // Check level completion
        if (this.levelManager) {
            const level = this.levelManager.getCurrentLevel();
            if (level && level.isCompleted()) {
                this.gameSession.completeObjective('level_completion');
            }
        }

        // Update distance traveled
        if (this.vehicleManager) {
            const distance = this.vehicleManager.getDistanceTraveled();
            this.gameSession.updateDistance(distance);
        }
    }

    /**
     * Dispose of the integration system
     */
    dispose() {
        // Stop the game loop
        this.stop();

        // End current session
        if (this.gameSession) {
            this.gameSession.dispose();
            this.gameSession = null;
        }

        // Dispose of systems
        if (this.gameStateManager) {
            this.gameStateManager.dispose();
            this.gameStateManager = null;
        }

        if (this.gameLoop) {
            this.gameLoop.dispose();
            this.gameLoop = null;
        }

        // Clear references
        this.gameEngine = null;
        this.levelManager = null;
        this.vehicleManager = null;
        this.zombieManager = null;
        this.scoringSystem = null;
        this.combatSystem = null;
        this.audioManager = null;

        console.log('GameLoopIntegration disposed');
    }
}