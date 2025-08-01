/**
 * Integration example for the scoring system with the game engine
 * This shows how to properly integrate scoring with combat, vehicle, and game systems
 */

import { ScoringSystem } from './ScoringSystem';
import { RobustScoringAPI } from './ScoringAPI';
import { ScoringHUD } from '../components/ScoringHUD';

/**
 * ScoringIntegration manages the integration of scoring system with game components
 */
export class ScoringIntegration {
    constructor(gameEngine, authToken) {
        this.gameEngine = gameEngine;
        
        // Initialize API client
        this.apiClient = new RobustScoringAPI('/api/v1', authToken, {
            retryAttempts: 3,
            retryDelay: 1000,
            retryBackoff: 2
        });
        
        // Initialize scoring system
        this.scoringSystem = new ScoringSystem(gameEngine, this.apiClient);
        
        // Game session tracking
        this.currentSessionId = null;
        this.lastScoreUpdate = 0;
        this.scoreUpdateInterval = 5000; // Update every 5 seconds
        
        // Distance tracking
        this.lastPosition = null;
        this.totalDistance = 0;
        
        this._setupIntegration();
        
        console.log('ScoringIntegration initialized');
    }

    /**
     * Setup integration with game systems
     */
    _setupIntegration() {
        // Setup vehicle tracking for distance calculation
        this._setupVehicleTracking();
        
        // Setup special event detection
        this._setupSpecialEventDetection();
        
        // Setup periodic score updates
        this._setupPeriodicUpdates();
        
        // Setup session management
        this._setupSessionManagement();
    }

    /**
     * Setup vehicle tracking for distance calculation
     */
    _setupVehicleTracking() {
        // Track vehicle movement for distance calculation
        this.gameEngine.on('vehicleUpdate', (vehicleData) => {
            if (vehicleData.position && this.lastPosition) {
                const distance = this.lastPosition.distanceTo(vehicleData.position);
                this.totalDistance += distance;
                
                // Emit distance update for scoring system
                this.gameEngine.emit('distanceUpdate', this.totalDistance);
            }
            
            this.lastPosition = vehicleData.position ? vehicleData.position.clone() : null;
        });

        // Track vehicle air time for bonus points
        this.gameEngine.on('vehicleAirborne', (airTimeData) => {
            if (airTimeData.duration > 0.5) { // Minimum 0.5 seconds for bonus
                this.gameEngine.emit('specialEvent', {
                    type: 'airTime',
                    value: airTimeData.duration,
                    position: airTimeData.position
                });
            }
        });

        // Track vehicle landings
        this.gameEngine.on('vehicleLanded', (landingData) => {
            if (landingData.isPerfect) {
                this.gameEngine.emit('specialEvent', {
                    type: 'perfectLanding',
                    value: 1,
                    position: landingData.position
                });
            }
        });
    }

    /**
     * Setup special event detection
     */
    _setupSpecialEventDetection() {
        // Track near misses with zombies
        this.gameEngine.on('nearMiss', (missData) => {
            this.gameEngine.emit('specialEvent', {
                type: 'nearMiss',
                value: 1,
                distance: missData.distance,
                position: missData.position
            });
        });

        // Track environmental kills
        this.gameEngine.on('environmentalKill', (killData) => {
            this.gameEngine.emit('specialEvent', {
                type: 'environmentalKill',
                value: killData.basePoints,
                method: killData.method,
                position: killData.position
            });
        });

        // Track multi-kills (multiple zombies killed simultaneously)
        this.gameEngine.on('multiKill', (multiKillData) => {
            const killCount = multiKillData.zombies.length;
            if (killCount >= 2) {
                this.gameEngine.emit('specialEvent', {
                    type: 'multiKill',
                    value: killCount,
                    bonus: this._calculateMultiKillBonus(killCount),
                    position: multiKillData.position
                });
            }
        });

        // Track speed bonuses
        this.gameEngine.on('speedUpdate', (speedData) => {
            const speedKmh = speedData.speed * 3.6; // Convert m/s to km/h
            if (speedKmh > 80) { // High speed threshold
                this.gameEngine.emit('specialEvent', {
                    type: 'speedBonus',
                    value: speedKmh,
                    bonus: Math.floor((speedKmh - 80) * 2),
                    position: speedData.position
                });
            }
        });
    }

    /**
     * Setup periodic score updates to backend
     */
    _setupPeriodicUpdates() {
        setInterval(() => {
            if (this.currentSessionId) {
                this._updateSessionScore();
            }
        }, this.scoreUpdateInterval);
    }

    /**
     * Setup session management
     */
    _setupSessionManagement() {
        // Listen for game start/end events
        this.gameEngine.on('gameStarted', (gameData) => {
            this.startSession(gameData.levelId);
        });

        this.gameEngine.on('gameEnded', (gameData) => {
            this.endSession(gameData.state || 'completed');
        });

        this.gameEngine.on('gamePaused', () => {
            // Pause scoring updates but don't end session
            this._pauseScoring();
        });

        this.gameEngine.on('gameResumed', () => {
            this._resumeScoring();
        });
    }

    /**
     * Start a new game session
     */
    async startSession(levelId) {
        try {
            console.log(`Starting scoring session for level: ${levelId}`);
            
            // Start session via API
            const response = await this.apiClient.startSession(levelId);
            this.currentSessionId = response.session.id;
            
            // Reset scoring system for new session
            this.scoringSystem.resetSession();
            
            // Reset distance tracking
            this.totalDistance = 0;
            this.lastPosition = null;
            
            console.log(`Scoring session started: ${this.currentSessionId}`);
            
            return this.currentSessionId;
        } catch (error) {
            console.error('Failed to start scoring session:', error);
            throw error;
        }
    }

    /**
     * End current game session
     */
    async endSession(sessionState = 'completed') {
        if (!this.currentSessionId) {
            console.warn('No active session to end');
            return null;
        }

        try {
            console.log(`Ending scoring session: ${this.currentSessionId}`);
            
            // Get final session stats
            const finalStats = this.scoringSystem.getSessionStats();
            
            // End session via API
            const result = await this.scoringSystem.endSession(this.currentSessionId, sessionState);
            
            console.log('Session ended successfully:', result);
            
            // Clear current session
            this.currentSessionId = null;
            
            return result;
        } catch (error) {
            console.error('Failed to end scoring session:', error);
            throw error;
        }
    }

    /**
     * Update session score via API
     */
    async _updateSessionScore() {
        if (!this.currentSessionId) return;

        try {
            const now = Date.now();
            if (now - this.lastScoreUpdate < this.scoreUpdateInterval) {
                return; // Too soon for update
            }

            await this.scoringSystem.updateSessionScore(this.currentSessionId);
            this.lastScoreUpdate = now;
            
            console.log('Session score updated successfully');
        } catch (error) {
            console.error('Failed to update session score:', error);
            // Don't throw - this is a background operation
        }
    }

    /**
     * Calculate multi-kill bonus points
     */
    _calculateMultiKillBonus(killCount) {
        const bonuses = {
            2: 50,   // Double kill
            3: 100,  // Triple kill
            4: 200,  // Quad kill
            5: 400,  // Penta kill
            6: 800,  // Hexa kill
            7: 1600, // Septa kill
            8: 3200  // Octa kill
        };
        
        return bonuses[Math.min(killCount, 8)] || 3200;
    }

    /**
     * Pause scoring updates
     */
    _pauseScoring() {
        // Implementation would pause timers and updates
        console.log('Scoring paused');
    }

    /**
     * Resume scoring updates
     */
    _resumeScoring() {
        // Implementation would resume timers and updates
        console.log('Scoring resumed');
    }

    /**
     * Get current session statistics
     */
    getSessionStats() {
        return this.scoringSystem.getSessionStats();
    }

    /**
     * Get scoring system instance
     */
    getScoringSystem() {
        return this.scoringSystem;
    }

    /**
     * Create scoring HUD component
     */
    createScoringHUD() {
        return new ScoringHUD({ scoringSystem: this.scoringSystem });
    }

    /**
     * Force score update (for testing or manual triggers)
     */
    async forceScoreUpdate() {
        if (this.currentSessionId) {
            await this._updateSessionScore();
        }
    }

    /**
     * Get leaderboard data
     */
    async getLeaderboard(type = 'total_score', limit = 100) {
        try {
            return await this.apiClient.getLeaderboard(type, limit);
        } catch (error) {
            console.error('Failed to get leaderboard:', error);
            throw error;
        }
    }

    /**
     * Get player statistics
     */
    async getPlayerStats() {
        try {
            return await this.apiClient.getPlayerStats();
        } catch (error) {
            console.error('Failed to get player stats:', error);
            throw error;
        }
    }

    /**
     * Dispose of scoring integration
     */
    dispose() {
        if (this.currentSessionId) {
            // Try to end session gracefully
            this.endSession('abandoned').catch(console.error);
        }
        
        this.scoringSystem.dispose();
        
        console.log('ScoringIntegration disposed');
    }
}

/**
 * Factory function to create scoring integration
 */
export function createScoringIntegration(gameEngine, authToken) {
    return new ScoringIntegration(gameEngine, authToken);
}

export default ScoringIntegration;