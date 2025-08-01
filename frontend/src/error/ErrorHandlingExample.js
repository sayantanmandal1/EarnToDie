/**
 * Error Handling System Usage Example
 * Demonstrates how to integrate and use the comprehensive error handling system
 */

import { 
    setupErrorHandling, 
    handleError, 
    getErrorHandling,
    createGameSystemProvider,
    withErrorHandling,
    GameError,
    CriticalGameError,
    AssetLoadingError,
    NetworkError
} from './index.js';

/**
 * Example: Initialize error handling system
 */
export function initializeGameErrorHandling() {
    const errorHandling = setupErrorHandling({
        targetFPS: 30,
        criticalFPS: 15,
        errorEndpoint: '/api/v1/game-errors',
        privacyMode: false
    });

    console.log('Error handling system initialized');
    return errorHandling;
}

/**
 * Example: Register game system providers for crash recovery
 */
export function registerGameSystems(errorHandling) {
    // Game state provider
    const gameStateProvider = createGameSystemProvider(
        'gameState',
        // Basic state (for heartbeat)
        () => ({
            level: getCurrentLevel(),
            score: getCurrentScore(),
            health: getPlayerHealth()
        }),
        // Full state (for crash recovery)
        () => ({
            level: getCurrentLevel(),
            score: getCurrentScore(),
            health: getPlayerHealth(),
            position: getPlayerPosition(),
            inventory: getPlayerInventory(),
            progress: getLevelProgress()
        }),
        // Restore state
        async (state) => {
            await setCurrentLevel(state.level);
            await setCurrentScore(state.score);
            await setPlayerHealth(state.health);
            if (state.position) await setPlayerPosition(state.position);
            if (state.inventory) await setPlayerInventory(state.inventory);
            if (state.progress) await setLevelProgress(state.progress);
        },
        // Validate state
        (state) => {
            return state && 
                   typeof state.level === 'number' && 
                   typeof state.score === 'number' && 
                   typeof state.health === 'number';
        }
    );

    // Vehicle system provider
    const vehicleSystemProvider = createGameSystemProvider(
        'vehicleSystem',
        () => ({
            currentVehicle: getCurrentVehicleId(),
            upgrades: getVehicleUpgrades()
        }),
        () => ({
            currentVehicle: getCurrentVehicleId(),
            upgrades: getVehicleUpgrades(),
            ownedVehicles: getOwnedVehicles(),
            customizations: getVehicleCustomizations()
        }),
        async (state) => {
            if (state.currentVehicle) await setCurrentVehicle(state.currentVehicle);
            if (state.upgrades) await setVehicleUpgrades(state.upgrades);
            if (state.ownedVehicles) await setOwnedVehicles(state.ownedVehicles);
            if (state.customizations) await setVehicleCustomizations(state.customizations);
        }
    );

    errorHandling.registerGameSystemProvider('gameState', gameStateProvider);
    errorHandling.registerGameSystemProvider('vehicleSystem', vehicleSystemProvider);

    console.log('Game system providers registered');
}

/**
 * Example: Handle different types of errors
 */
export async function demonstrateErrorHandling() {
    try {
        // Simulate asset loading error
        throw new AssetLoadingError('Failed to load zombie model', {
            assetType: 'model',
            assetUrl: '/models/zombie.gltf',
            isCritical: false
        });
    } catch (error) {
        await handleError(error, {
            source: 'asset_loader',
            context: 'loading_game_assets'
        });
    }

    try {
        // Simulate network error
        throw new NetworkError('API request failed', {
            status: 500,
            endpoint: '/api/v1/save-game'
        });
    } catch (error) {
        await handleError(error, {
            source: 'save_system',
            context: 'auto_save'
        });
    }

    try {
        // Simulate critical game error
        throw new CriticalGameError('WebGL context lost', {
            context: 'rendering_system'
        });
    } catch (error) {
        await handleError(error, {
            source: 'rendering_system',
            context: 'frame_render'
        });
    }
}

/**
 * Example: Wrap functions with error handling
 */
export const safeGameLoop = withErrorHandling(async function gameLoop() {
    // Update game physics
    updatePhysics();
    
    // Update AI
    updateZombieAI();
    
    // Render frame
    renderFrame();
    
    // Check for collisions
    checkCollisions();
    
    // Update UI
    updateUI();
}, { source: 'game_loop' });

/**
 * Example: Asset loading with error handling
 */
export const safeAssetLoader = {
    async loadTexture(url, options = {}) {
        try {
            const errorHandling = getErrorHandling();
            const assetLoader = errorHandling.getAssetLoader();
            return await assetLoader.loadTexture(url, options);
        } catch (error) {
            await handleError(error, {
                source: 'asset_loader',
                assetType: 'texture',
                assetUrl: url
            });
            throw error;
        }
    },

    async loadModel(url, options = {}) {
        try {
            const errorHandling = getErrorHandling();
            const assetLoader = errorHandling.getAssetLoader();
            return await assetLoader.loadModel(url, options);
        } catch (error) {
            await handleError(error, {
                source: 'asset_loader',
                assetType: 'model',
                assetUrl: url
            });
            throw error;
        }
    }
};

/**
 * Example: Network requests with error handling
 */
export const safeAPIClient = {
    async saveGame(gameData) {
        try {
            const errorHandling = getErrorHandling();
            const networkClient = errorHandling.getNetworkClient('/api/v1');
            return await networkClient.post('/save-game', gameData);
        } catch (error) {
            await handleError(error, {
                source: 'save_system',
                operation: 'save_game'
            });
            throw error;
        }
    },

    async loadGame(playerId) {
        try {
            const errorHandling = getErrorHandling();
            const networkClient = errorHandling.getNetworkClient('/api/v1');
            return await networkClient.get(`/load-game/${playerId}`);
        } catch (error) {
            await handleError(error, {
                source: 'save_system',
                operation: 'load_game'
            });
            throw error;
        }
    }
};

/**
 * Example: Performance monitoring
 */
export function monitorPerformance() {
    const errorHandling = getErrorHandling();
    
    // Get current performance metrics
    const metrics = errorHandling.getPerformanceMetrics();
    console.log('Performance metrics:', metrics);
    
    // Get current quality settings
    const qualitySettings = errorHandling.getPerformanceSettings();
    console.log('Quality settings:', qualitySettings);
    
    // Check if performance is degraded
    if (metrics.fps && metrics.fps.average < 20) {
        console.warn('Low FPS detected, performance handler should adjust quality');
    }
}

/**
 * Example: Error statistics and debugging
 */
export function showErrorStatistics() {
    const errorHandling = getErrorHandling();
    const stats = errorHandling.getErrorStats();
    
    console.log('Error Handling Statistics:');
    console.log('- Initialized:', stats.initialized);
    console.log('- Systems:', stats.systems);
    
    if (stats.errorHandler) {
        console.log('- Total Errors:', stats.errorHandler.totalErrors);
        console.log('- Critical Errors:', stats.errorHandler.criticalErrors);
        console.log('- Errors by Type:', stats.errorHandler.errorsByType);
    }
    
    if (stats.performanceHandler) {
        console.log('- Current FPS:', stats.performanceHandler.fps?.current);
        console.log('- Average FPS:', stats.performanceHandler.fps?.average);
    }
    
    if (stats.assetLoader) {
        console.log('- Cache Hits:', stats.assetLoader.cacheHits);
        console.log('- Failed Assets:', stats.assetLoader.failedAssets);
    }
    
    if (stats.networkHandler) {
        console.log('- Network Online:', stats.networkHandler.isOnline);
        console.log('- Queued Requests:', stats.networkHandler.queuedRequests);
    }
}

/**
 * Example: Manual crash recovery
 */
export async function triggerManualRecovery() {
    try {
        const errorHandling = getErrorHandling();
        const success = await errorHandling.triggerRecovery('manual_user_request');
        
        if (success) {
            console.log('Manual recovery completed successfully');
        } else {
            console.warn('Manual recovery failed');
        }
    } catch (error) {
        console.error('Failed to trigger manual recovery:', error);
    }
}

// Mock game functions for the example
function getCurrentLevel() { return 1; }
function getCurrentScore() { return 1000; }
function getPlayerHealth() { return 100; }
function getPlayerPosition() { return { x: 0, y: 0, z: 0 }; }
function getPlayerInventory() { return []; }
function getLevelProgress() { return { completed: false, time: 0 }; }
function getCurrentVehicleId() { return 'sedan'; }
function getVehicleUpgrades() { return {}; }
function getOwnedVehicles() { return ['sedan']; }
function getVehicleCustomizations() { return {}; }

async function setCurrentLevel(level) { console.log('Set level:', level); }
async function setCurrentScore(score) { console.log('Set score:', score); }
async function setPlayerHealth(health) { console.log('Set health:', health); }
async function setPlayerPosition(pos) { console.log('Set position:', pos); }
async function setPlayerInventory(inv) { console.log('Set inventory:', inv); }
async function setLevelProgress(progress) { console.log('Set progress:', progress); }
async function setCurrentVehicle(vehicle) { console.log('Set vehicle:', vehicle); }
async function setVehicleUpgrades(upgrades) { console.log('Set upgrades:', upgrades); }
async function setOwnedVehicles(vehicles) { console.log('Set owned vehicles:', vehicles); }
async function setVehicleCustomizations(custom) { console.log('Set customizations:', custom); }

function updatePhysics() { /* Physics update */ }
function updateZombieAI() { /* AI update */ }
function renderFrame() { /* Rendering */ }
function checkCollisions() { /* Collision detection */ }
function updateUI() { /* UI update */ }

export default {
    initializeGameErrorHandling,
    registerGameSystems,
    demonstrateErrorHandling,
    safeGameLoop,
    safeAssetLoader,
    safeAPIClient,
    monitorPerformance,
    showErrorStatistics,
    triggerManualRecovery
};