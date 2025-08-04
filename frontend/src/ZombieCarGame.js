import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './engine/GameEngine';
import { GameStateManager } from './engine/GameStateManager';
import { VehicleManager } from './vehicles/VehicleManager';
import { ZombieManager } from './zombies/ZombieManager';
import LevelManager from './levels/LevelManager';
import { UpgradeManager } from './upgrades/UpgradeManager';
import { ScoringSystem } from './scoring/ScoringSystem';
import { CombatSystem } from './combat/CombatSystem';
import { SaveManager } from './save/SaveManager';
import { ErrorHandler } from './error/ErrorHandler';
import { PerformanceManager } from './performance/PerformanceManager';
import { FinalIntegration } from './integration/FinalIntegration';
import { electronIntegration } from './electron/ElectronIntegration';
import ApiClient from './utils/ApiClient';

// UI Components
import MainMenu from './components/MainMenu';
import GameHUD from './components/GameHUD';
import PauseMenu from './components/PauseMenu';
import GarageUI from './components/GarageUI';
import SettingsMenu from './components/SettingsMenu';
import LevelSelection from './components/LevelSelection';

import './styles/ZombieCarGame.css';

/**
 * Main Zombie Car Game Application
 * Integrates all game systems and manages the overall game state
 */
export class ZombieCarGame extends React.Component {
    constructor(props) {
        super(props);
        
        this.canvasRef = React.createRef();
        this.gameEngine = null;
        this.gameStateManager = null;
        this.vehicleManager = null;
        this.zombieManager = null;
        this.levelManager = null;
        this.upgradeManager = null;
        this.scoringSystem = null;
        this.combatSystem = null;
        this.saveManager = null;
        this.errorHandler = null;
        this.performanceManager = null;
        this.finalIntegration = null;
        this.electronIntegration = electronIntegration;

        this.state = {
            gameState: 'MAIN_MENU', // MAIN_MENU, GARAGE, LEVEL_SELECT, PLAYING, PAUSED, GAME_OVER, SETTINGS
            isLoading: true,
            loadingProgress: 0,
            loadingMessage: 'Initializing...',
            error: null,
            gameData: {
                player: null,
                currentLevel: null,
                currentVehicle: null,
                score: 0,
                currency: 0,
                health: 100,
                fuel: 100,
                zombiesKilled: 0,
                distance: 0,
                combo: 0
            },
            settings: {
                graphics: 'medium',
                audio: {
                    master: 0.8,
                    effects: 0.7,
                    music: 0.6
                },
                controls: {
                    sensitivity: 1.0,
                    invertY: false
                }
            }
        };

        // Bind methods
        this.handleGameStateChange = this.handleGameStateChange.bind(this);
        this.handleGameUpdate = this.handleGameUpdate.bind(this);
        this.handleError = this.handleError.bind(this);
    }

    async componentDidMount() {
        try {
            // Setup Electron integration first
            this.setupElectronIntegration();
            
            // Add user interaction handler for audio context
            this.setupAudioContextHandler();
            
            await this.initializeGame();
        } catch (error) {
            this.handleError(error);
        }
    }

    componentWillUnmount() {
        this.cleanup();
    }

    /**
     * Setup audio context handler for user interaction
     */
    setupAudioContextHandler() {
        const resumeAudioContext = () => {
            if (this.gameEngine && this.gameEngine.audioIntegration && 
                this.gameEngine.audioIntegration.audioManager && 
                this.gameEngine.audioIntegration.audioManager.audioContext) {
                const audioContext = this.gameEngine.audioIntegration.audioManager.audioContext;
                if (audioContext.state === 'suspended') {
                    audioContext.resume().catch(error => {
                        console.warn('Could not resume audio context:', error.message);
                    });
                }
            }
        };

        // Add listeners for user interactions
        ['click', 'keydown', 'touchstart'].forEach(eventType => {
            document.addEventListener(eventType, resumeAudioContext, { once: true });
        });
    }

    /**
     * Setup Electron integration and menu handlers
     */
    setupElectronIntegration() {
        if (!this.electronIntegration.isElectron) {
            console.log('Running in web mode - Electron integration disabled');
            return;
        }

        console.log('Setting up Electron integration...');

        // Register menu handlers
        this.electronIntegration.registerMenuHandler('new-game', () => {
            this.startNewGame();
        });

        this.electronIntegration.registerMenuHandler('save-game', () => {
            this.saveGame();
        });

        this.electronIntegration.registerMenuHandler('load-game', () => {
            this.loadGame();
        });

        this.electronIntegration.registerMenuHandler('toggle-pause', () => {
            this.togglePause();
        });

        this.electronIntegration.registerMenuHandler('restart-level', () => {
            this.restartLevel();
        });

        this.electronIntegration.registerMenuHandler('settings', () => {
            this.setState({ gameState: 'SETTINGS' });
        });

        this.electronIntegration.registerMenuHandler('zoom-in', () => {
            this.adjustZoom(1.1);
        });

        this.electronIntegration.registerMenuHandler('zoom-out', () => {
            this.adjustZoom(0.9);
        });

        this.electronIntegration.registerMenuHandler('reset-zoom', () => {
            this.resetZoom();
        });

        this.electronIntegration.registerMenuHandler('show-controls', () => {
            this.showControlsHelp();
        });

        console.log('Electron integration setup complete');
    }

    /**
     * Initialize all game systems
     */
    async initializeGame() {
        this.updateLoadingState(10, 'Creating game engine...');
        
        // Initialize core game engine
        this.gameEngine = new GameEngine(this.canvasRef.current);
        await this.gameEngine.initialize();

        this.updateLoadingState(20, 'Initializing error handling...');
        
        // Initialize error handling system
        this.errorHandler = new ErrorHandler({
            enableReporting: false // Disable error reporting in development
        });

        this.updateLoadingState(30, 'Loading save data...');
        
        // Initialize save system
        // Create real API client for backend connection
        const apiClient = new ApiClient(process.env.REACT_APP_API_URL || 'http://localhost:8080');
        
        this.saveManager = new SaveManager(apiClient);
        await this.saveManager.initialize();

        this.updateLoadingState(40, 'Setting up game state management...');
        
        // Initialize game state manager
        this.gameStateManager = new GameStateManager(this.gameEngine);
        this.gameStateManager.onStateChange = this.handleGameStateChange;

        this.updateLoadingState(50, 'Loading vehicles and upgrades...');
        
        // Initialize vehicle and upgrade systems
        this.vehicleManager = new VehicleManager(this.gameEngine);
        this.upgradeManager = new UpgradeManager(this.gameEngine, apiClient);
        await this.vehicleManager.initialize();
        await this.upgradeManager.initialize();

        this.updateLoadingState(60, 'Spawning zombies...');
        
        // Initialize zombie system
        this.zombieManager = new ZombieManager(this.gameEngine);
        await this.zombieManager.initialize();

        this.updateLoadingState(70, 'Generating levels...');
        
        // Initialize level system
        this.levelManager = new LevelManager(this.gameEngine);
        await this.levelManager.initialize();

        this.updateLoadingState(80, 'Setting up combat and scoring...');
        
        // Initialize combat and scoring systems
        this.combatSystem = new CombatSystem(this.gameEngine);
        this.scoringSystem = new ScoringSystem();
        await this.combatSystem.initialize();
        await this.scoringSystem.initialize();

        this.updateLoadingState(90, 'Optimizing performance...');
        
        // Initialize performance management
        this.performanceManager = new PerformanceManager(this.gameEngine);
        await this.performanceManager.initialize();

        this.updateLoadingState(95, 'Finalizing integration...');
        
        // Initialize final integration system
        this.finalIntegration = new FinalIntegration(this.gameEngine);
        await this.finalIntegration.initialize();

        this.updateLoadingState(98, 'Loading player data...');
        
        // Load player data
        const playerData = await this.saveManager.loadPlayerData();
        
        this.updateLoadingState(100, 'Ready to play!');
        
        // Setup game engine callbacks
        this.gameEngine.onUpdate = this.handleGameUpdate;
        
        // Connect all systems
        this.connectSystems();
        
        // Load initial game state
        this.setState({
            isLoading: false,
            gameData: {
                ...this.state.gameData,
                player: playerData,
                currency: playerData?.currency || 0
            }
        });

        console.log('Zombie Car Game initialized successfully');
    }

    /**
     * Connect all game systems together
     */
    connectSystems() {
        // Connect combat system to vehicle and zombie managers
        this.combatSystem.setVehicleManager(this.vehicleManager);
        this.combatSystem.setZombieManager(this.zombieManager);
        
        // Connect scoring system to combat events
        this.combatSystem.onZombieKilled = (zombie, vehicle) => {
            const points = this.scoringSystem.calculateZombieKillPoints(zombie, vehicle);
            this.updateScore(points);
            this.updateGameData({ zombiesKilled: this.state.gameData.zombiesKilled + 1 });
        };

        // Connect vehicle damage to HUD updates
        this.combatSystem.onVehicleDamaged = (vehicle, damage) => {
            const newHealth = Math.max(0, this.state.gameData.health - damage);
            this.updateGameData({ health: newHealth });
            
            if (newHealth <= 0) {
                this.handleGameOver();
            }
        };

        // Connect level progression
        this.levelManager.onLevelComplete = (level, stats) => {
            this.handleLevelComplete(level, stats);
        };

        // Connect performance monitoring
        this.performanceManager.onPerformanceChange = (metrics) => {
            this.handlePerformanceUpdate(metrics);
        };

        // Connect final integration events
        this.connectFinalIntegrationEvents();

        // Connect save system to game events
        this.gameStateManager.onGameSave = () => {
            this.saveGameProgress();
        };
    }

    /**
     * Connect final integration events
     */
    connectFinalIntegrationEvents() {
        if (!this.finalIntegration) return;

        // Connect combat events to particle effects
        this.combatSystem.onExplosion = (position, intensity) => {
            this.finalIntegration.triggerEvent('vehicle_explosion', { position, intensity });
        };

        this.combatSystem.onZombieHit = (position, direction) => {
            this.finalIntegration.triggerEvent('zombie_hit', { position, direction });
        };

        this.combatSystem.onZombieKilled = (zombie, vehicle) => {
            this.finalIntegration.triggerEvent('zombie_death', {
                position: zombie.position,
                direction: vehicle.velocity.normalize(),
                intensity: 1.0
            });

            // Trigger camera shake for dramatic effect
            this.finalIntegration.triggerEvent('camera_shake', {
                intensity: 0.5,
                duration: 0.3
            });

            // Update scoring with balance system
            const balance = this.finalIntegration.getGameBalance();
            const points = balance.calculateScore('zombie_kill', {
                zombie: zombie,
                combo: this.state.gameData.combo
            });
            this.updateScore(points);
        };

        // Connect vehicle events
        this.vehicleManager.onVehicleDamage = (position, direction, intensity) => {
            this.finalIntegration.triggerEvent('vehicle_damage', { position, direction, intensity });
            
            // Screen shake on damage
            this.finalIntegration.triggerEvent('camera_shake', {
                intensity: intensity * 0.3,
                duration: 0.2
            });
        };

        this.vehicleManager.onEngineSmoke = (position, velocity, intensity) => {
            this.finalIntegration.triggerEvent('vehicle_engine_smoke', { position, velocity, intensity });
        };

        // Connect level events
        this.levelManager.onLevelComplete = (level, stats) => {
            this.finalIntegration.triggerEvent('level_complete', {
                level,
                zombiesKilled: this.state.gameData.zombiesKilled,
                timeAlive: stats.timeAlive,
                damageReceived: 100 - this.state.gameData.health,
                accuracy: stats.accuracy || 0.7
            });

            this.handleLevelComplete(level, stats);
        };

        // Connect UI events
        this.finalIntegration.addEventHandler('score_update', (data) => {
            // Animate score display
            const scoreElement = document.querySelector('.score-display');
            if (scoreElement) {
                this.finalIntegration.triggerEvent('score_popup', {
                    element: scoreElement,
                    onComplete: () => {
                        // Reset element state
                        scoreElement.style.transform = 'scale(1)';
                        scoreElement.style.opacity = '1';
                    }
                });
            }
        });
    }

    /**
     * Update loading state
     */
    updateLoadingState(progress, message) {
        this.setState({
            loadingProgress: progress,
            loadingMessage: message
        });
    }

    /**
     * Handle game state changes
     */
    handleGameStateChange(newState, data) {
        this.setState({ gameState: newState });
        
        switch (newState) {
            case 'PLAYING':
                this.startGameplay();
                break;
            case 'PAUSED':
                this.pauseGameplay();
                break;
            case 'GAME_OVER':
                this.handleGameOver();
                break;
            default:
                break;
        }
    }

    /**
     * Handle game updates
     */
    handleGameUpdate(deltaTime) {
        if (this.state.gameState !== 'PLAYING') return;

        // Update all game systems
        this.vehicleManager.update(deltaTime);
        this.zombieManager.update(deltaTime);
        this.combatSystem.update(deltaTime);
        this.levelManager.update(deltaTime);
        this.scoringSystem.update(deltaTime);

        // Update final integration system
        if (this.finalIntegration) {
            this.finalIntegration.update(deltaTime);
        }

        // Update game data
        const vehicle = this.vehicleManager.getCurrentVehicle();
        if (vehicle) {
            this.updateGameData({
                fuel: vehicle.fuel,
                distance: vehicle.distanceTraveled
            });
        }
    }

    /**
     * Handle errors
     */
    handleError(error) {
        console.error('Game Error:', error);
        this.setState({ error: error.message });
        
        if (this.errorHandler) {
            this.errorHandler.handleError(error);
        }
    }

    /**
     * Update game data
     */
    updateGameData(updates) {
        this.setState({
            gameData: { ...this.state.gameData, ...updates }
        });
    }

    /**
     * Update score
     */
    updateScore(points) {
        const newScore = this.state.gameData.score + points;
        const currency = this.scoringSystem.convertPointsToCurrency(points);
        
        this.updateGameData({
            score: newScore,
            currency: this.state.gameData.currency + currency
        });
    }

    /**
     * Start gameplay
     */
    startGameplay() {
        this.gameEngine.start();
        
        // Initialize level
        if (this.state.gameData.currentLevel) {
            this.levelManager.loadLevel(this.state.gameData.currentLevel);
        }
        
        // Spawn player vehicle
        if (this.state.gameData.currentVehicle) {
            this.vehicleManager.spawnVehicle(this.state.gameData.currentVehicle);
        }
        
        // Start zombie spawning
        this.zombieManager.startSpawning();
    }

    /**
     * Pause gameplay
     */
    pauseGameplay() {
        this.gameEngine.stop();
        this.zombieManager.pauseSpawning();
    }

    /**
     * Handle game over
     */
    handleGameOver() {
        this.gameEngine.stop();
        this.zombieManager.stopSpawning();
        
        // Calculate final score and save progress
        this.saveGameProgress();
        
        this.setState({ gameState: 'GAME_OVER' });
    }

    /**
     * Handle level completion
     */
    handleLevelComplete(level, stats) {
        const bonusPoints = this.scoringSystem.calculateLevelBonusPoints(stats);
        this.updateScore(bonusPoints);
        
        // Unlock next level
        this.levelManager.unlockNextLevel(level.id);
        
        // Save progress
        this.saveGameProgress();
    }

    /**
     * Handle performance updates
     */
    handlePerformanceUpdate(metrics) {
        // Auto-adjust graphics settings if performance is poor
        if (metrics.fps < 30 && this.state.settings.graphics !== 'low') {
            this.updateSettings({
                graphics: this.state.settings.graphics === 'high' ? 'medium' : 'low'
            });
        }
    }

    /**
     * Save game progress
     */
    async saveGameProgress() {
        try {
            const saveData = {
                player: this.state.gameData.player,
                currency: this.state.gameData.currency,
                score: this.state.gameData.score,
                vehicles: this.vehicleManager.getOwnedVehicles(),
                upgrades: this.upgradeManager.getAllUpgrades(),
                levelProgress: this.levelManager.getLevelProgress(),
                settings: this.state.settings
            };
            
            await this.saveManager.savePlayerData(saveData);
        } catch (error) {
            console.error('Failed to save game progress:', error);
        }
    }

    /**
     * Update settings
     */
    updateSettings(newSettings) {
        const updatedSettings = { ...this.state.settings, ...newSettings };
        this.setState({ settings: updatedSettings });
        
        // Apply settings to game systems
        this.applySettings(updatedSettings);
    }

    /**
     * Apply settings to game systems
     */
    applySettings(settings) {
        // Apply graphics settings
        if (this.performanceManager) {
            this.performanceManager.setQualityLevel(settings.graphics);
        }
        
        // Apply audio settings
        if (this.gameEngine.getAudioIntegration()) {
            const audio = this.gameEngine.getAudioIntegration();
            audio.setMasterVolume(settings.audio.master);
            audio.setEffectsVolume(settings.audio.effects);
            audio.setMusicVolume(settings.audio.music);
        }
    }

    /**
     * Menu action handlers
     */
    handleStartGame() {
        this.setState({ gameState: 'LEVEL_SELECT' });
    }

    handleVehicleSelection() {
        this.setState({ gameState: 'GARAGE' });
    }

    handleSettings() {
        this.setState({ gameState: 'SETTINGS' });
    }

    handleQuit() {
        if (window.confirm('Are you sure you want to quit?')) {
            window.close();
        }
    }

    handleLevelSelect(levelId) {
        this.updateGameData({ currentLevel: levelId });
        this.setState({ gameState: 'PLAYING' });
    }

    handleVehicleSelect(vehicleId) {
        this.updateGameData({ currentVehicle: vehicleId });
        this.setState({ gameState: 'MAIN_MENU' });
    }

    handlePause() {
        this.setState({ gameState: 'PAUSED' });
    }

    handleResume() {
        this.setState({ gameState: 'PLAYING' });
    }

    handleRestart() {
        // Reset game data
        this.updateGameData({
            score: 0,
            health: 100,
            fuel: 100,
            zombiesKilled: 0,
            distance: 0,
            combo: 0
        });
        
        this.setState({ gameState: 'PLAYING' });
    }

    handleBackToMenu() {
        this.setState({ gameState: 'MAIN_MENU' });
    }

    /**
     * Electron-specific methods
     */
    
    async saveGame() {
        if (!this.electronIntegration.isElectron) {
            console.warn('Save dialog only available in desktop version');
            return;
        }

        try {
            const result = await this.electronIntegration.showSaveDialog();
            if (!result.canceled && result.filePath) {
                const saveData = this.saveManager.exportSaveData();
                // TODO: Write save data to file
                console.log('Game saved to:', result.filePath);
            }
        } catch (error) {
            console.error('Failed to save game:', error);
            await this.electronIntegration.reportError(error);
        }
    }

    async loadGame() {
        if (!this.electronIntegration.isElectron) {
            console.warn('Load dialog only available in desktop version');
            return;
        }

        try {
            const result = await this.electronIntegration.showOpenDialog();
            if (!result.canceled && result.filePaths.length > 0) {
                // TODO: Read save data from file
                console.log('Loading game from:', result.filePaths[0]);
            }
        } catch (error) {
            console.error('Failed to load game:', error);
            await this.electronIntegration.reportError(error);
        }
    }

    startNewGame() {
        this.setState({ gameState: 'LEVEL_SELECT' });
    }

    togglePause() {
        if (this.state.gameState === 'PLAYING') {
            this.setState({ gameState: 'PAUSED' });
        } else if (this.state.gameState === 'PAUSED') {
            this.setState({ gameState: 'PLAYING' });
        }
    }

    restartLevel() {
        if (this.levelManager && this.state.gameState === 'PLAYING') {
            this.levelManager.restartLevel();
        }
    }

    adjustZoom(factor) {
        if (this.gameEngine && this.gameEngine.camera) {
            const camera = this.gameEngine.camera;
            camera.zoom *= factor;
            camera.updateProjectionMatrix();
        }
    }

    resetZoom() {
        if (this.gameEngine && this.gameEngine.camera) {
            const camera = this.gameEngine.camera;
            camera.zoom = 1;
            camera.updateProjectionMatrix();
        }
    }

    showControlsHelp() {
        // TODO: Show controls help dialog
        console.log('Showing controls help...');
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.gameEngine) {
            this.gameEngine.dispose();
        }
        
        if (this.errorHandler) {
            this.errorHandler.dispose();
        }
        
        if (this.performanceManager) {
            this.performanceManager.dispose();
        }
        
        if (this.finalIntegration) {
            this.finalIntegration.dispose();
        }

        // Cleanup Electron integration
        if (this.electronIntegration) {
            this.electronIntegration.dispose();
        }
    }

    /**
     * Render the appropriate UI based on game state
     */
    renderUI() {
        const { gameState, gameData, settings } = this.state;

        switch (gameState) {
            case 'MAIN_MENU':
                return (
                    <MainMenu
                        onStartGame={this.handleStartGame}
                        onVehicleSelection={this.handleVehicleSelection}
                        onSettings={this.handleSettings}
                        onQuit={this.handleQuit}
                    />
                );

            case 'GARAGE':
                return (
                    <GarageUI
                        vehicles={this.vehicleManager?.getAvailableVehicles() || []}
                        ownedVehicles={this.vehicleManager?.getOwnedVehicles() || []}
                        currentVehicle={gameData.currentVehicle}
                        currency={gameData.currency}
                        onVehicleSelect={this.handleVehicleSelect}
                        onBack={this.handleBackToMenu}
                        upgradeManager={this.upgradeManager}
                    />
                );

            case 'LEVEL_SELECT':
                return (
                    <LevelSelection
                        levels={this.levelManager?.getAvailableLevels() || []}
                        levelProgress={this.levelManager?.getLevelProgress() || {}}
                        onLevelSelect={this.handleLevelSelect}
                        onBack={this.handleBackToMenu}
                    />
                );

            case 'PLAYING':
                return (
                    <GameHUD
                        health={gameData.health}
                        fuel={gameData.fuel}
                        score={gameData.score}
                        currency={gameData.currency}
                        zombiesKilled={gameData.zombiesKilled}
                        distance={gameData.distance}
                        combo={gameData.combo}
                        onPause={this.handlePause}
                    />
                );

            case 'PAUSED':
                return (
                    <PauseMenu
                        onResume={this.handleResume}
                        onRestart={this.handleRestart}
                        onSettings={this.handleSettings}
                        onQuit={this.handleBackToMenu}
                    />
                );

            case 'SETTINGS':
                return (
                    <SettingsMenu
                        settings={settings}
                        onSettingsChange={this.updateSettings}
                        onBack={this.handleBackToMenu}
                    />
                );

            case 'GAME_OVER':
                return (
                    <div className="game-over-screen">
                        <h2>Game Over</h2>
                        <div className="final-stats">
                            <p>Final Score: {gameData.score}</p>
                            <p>Zombies Killed: {gameData.zombiesKilled}</p>
                            <p>Distance Traveled: {Math.round(gameData.distance)}m</p>
                            <p>Currency Earned: {gameData.currency}</p>
                        </div>
                        <div className="game-over-actions">
                            <button onClick={this.handleRestart}>Play Again</button>
                            <button onClick={this.handleBackToMenu}>Main Menu</button>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    }

    render() {
        const { isLoading, loadingProgress, loadingMessage, error } = this.state;

        if (error) {
            return (
                <div className="zombie-car-game error">
                    <div className="error-screen">
                        <h1>Game Error</h1>
                        <p>{error}</p>
                        <button onClick={() => window.location.reload()}>
                            Reload Game
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="zombie-car-game">
                {isLoading && (
                    <div className="loading-screen">
                        <div className="loading-content">
                            <h1>🧟‍♂️ Zombie Car Game</h1>
                            <div className="loading-bar">
                                <div 
                                    className="loading-progress" 
                                    style={{ width: `${loadingProgress}%` }}
                                />
                            </div>
                            <p className="loading-message">{loadingMessage}</p>
                            <div className="loading-percentage">{loadingProgress}%</div>
                            <div className="loading-tips">
                                <p>💡 <strong>Controls:</strong> WASD to drive, Space to brake, Mouse to look around</p>
                                <p>🎯 <strong>Objective:</strong> Survive the zombie apocalypse and upgrade your vehicle!</p>
                                {loadingProgress > 50 && (
                                    <p>🔊 <strong>Audio:</strong> Click anywhere after loading to enable sound</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <canvas
                    ref={this.canvasRef}
                    className="game-canvas"
                    style={{ display: isLoading ? 'none' : 'block' }}
                />

                {!isLoading && this.renderUI()}
            </div>
        );
    }
}

export default ZombieCarGame;