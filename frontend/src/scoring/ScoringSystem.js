import { EventEmitter } from 'events';

/**
 * ScoringSystem manages all scoring mechanics including points, combos, achievements, and currency conversion
 * Integrates with combat system and backend API for persistent storage
 */
export class ScoringSystem extends EventEmitter {
    constructor(gameEngine, apiClient) {
        super();
        
        this.gameEngine = gameEngine;
        this.apiClient = apiClient;
        
        // Current session scoring state
        this.sessionScore = {
            totalPoints: 0,
            zombiesKilled: 0,
            distanceTraveled: 0,
            timeElapsed: 0,
            comboMultiplier: 1.0,
            maxComboMultiplier: 1.0,
            currentCombo: 0,
            maxCombo: 0,
            achievements: []
        };
        
        // Combo system configuration
        this.comboConfig = {
            baseMultiplier: 1.0,
            maxMultiplier: 5.0,
            multiplierIncrement: 0.2,
            comboDecayTime: 3000, // 3 seconds
            comboThreshold: 3 // Minimum kills for combo to start
        };
        
        // Currency conversion configuration
        this.currencyConfig = {
            pointsToCurrencyRate: 0.1, // 10 points = 1 currency
            bonusMultiplier: 1.0,
            achievementBonus: 0.05 // 5% bonus per achievement
        };
        
        // Achievement system
        this.achievementSystem = new AchievementSystem();
        
        // Combo tracking
        this.lastKillTime = 0;
        this.comboTimer = null;
        
        // Session tracking
        this.sessionStartTime = Date.now();
        this.lastUpdateTime = Date.now();
        
        this._setupEventListeners();
        
        console.log('ScoringSystem initialized');
    }

    /**
     * Setup event listeners for combat and game events
     */
    _setupEventListeners() {
        // Listen for zombie eliminations from combat system
        if (this.gameEngine && typeof this.gameEngine.on === 'function') {
            this.gameEngine.on('zombieKilled', (data) => {
                this._handleZombieKill(data);
            });
            
            // Listen for distance updates
            this.gameEngine.on('distanceUpdate', (distance) => {
                this._updateDistance(distance);
            });
            
            // Listen for special events
            this.gameEngine.on('specialEvent', (eventData) => {
                this._handleSpecialEvent(eventData);
            });
        }
    }

    /**
     * Handle zombie kill event and calculate points
     */
    _handleZombieKill(killData) {
        const { zombie, vehicle, killMethod, damage } = killData;
        
        // Calculate base points for zombie type
        const basePoints = this._calculateZombiePoints(zombie, killMethod, damage);
        
        // Update combo system
        this._updateCombo();
        
        // Apply combo multiplier
        const comboPoints = Math.floor(basePoints * this.sessionScore.comboMultiplier);
        
        // Add points to session
        this.sessionScore.totalPoints += comboPoints;
        this.sessionScore.zombiesKilled++;
        
        // Check for achievements
        this._checkKillAchievements(zombie, killMethod, damage);
        
        // Emit scoring event
        this.emit('pointsScored', {
            basePoints,
            comboPoints,
            multiplier: this.sessionScore.comboMultiplier,
            zombie,
            totalPoints: this.sessionScore.totalPoints
        });
        
        console.log(`Zombie killed: +${comboPoints} points (${basePoints} x ${this.sessionScore.comboMultiplier.toFixed(1)})`);
    }

    /**
     * Calculate points for zombie elimination
     */
    _calculateZombiePoints(zombie, killMethod, damage) {
        let basePoints = zombie.pointValue || 10;
        
        // Bonus points based on kill method
        const killMethodMultipliers = {
            'collision': 1.0,
            'explosion': 1.5,
            'environmental': 2.0,
            'special': 2.5
        };
        
        const methodMultiplier = killMethodMultipliers[killMethod] || 1.0;
        basePoints = Math.floor(basePoints * methodMultiplier);
        
        // Bonus for overkill damage
        if (damage > zombie.maxHealth * 2) {
            basePoints = Math.floor(basePoints * 1.3);
        }
        
        // Bonus for special zombie types
        if (zombie.type.includes('boss')) {
            basePoints *= 3;
        } else if (zombie.type.includes('special')) {
            basePoints *= 2;
        }
        
        return basePoints;
    }

    /**
     * Update combo system
     */
    _updateCombo() {
        const currentTime = Date.now();
        const timeSinceLastKill = currentTime - this.lastKillTime;
        
        // Reset combo if too much time has passed
        if (timeSinceLastKill > this.comboConfig.comboDecayTime && this.sessionScore.currentCombo > 0) {
            this._resetCombo();
            return;
        }
        
        // Increment combo
        this.sessionScore.currentCombo++;
        this.lastKillTime = currentTime;
        
        // Update max combo
        if (this.sessionScore.currentCombo > this.sessionScore.maxCombo) {
            this.sessionScore.maxCombo = this.sessionScore.currentCombo;
        }
        
        // Calculate new multiplier
        if (this.sessionScore.currentCombo >= this.comboConfig.comboThreshold) {
            const comboBonus = (this.sessionScore.currentCombo - this.comboConfig.comboThreshold) * 
                              this.comboConfig.multiplierIncrement;
            
            this.sessionScore.comboMultiplier = Math.min(
                this.comboConfig.baseMultiplier + comboBonus,
                this.comboConfig.maxMultiplier
            );
        } else {
            this.sessionScore.comboMultiplier = this.comboConfig.baseMultiplier;
        }
        
        // Update max multiplier
        if (this.sessionScore.comboMultiplier > this.sessionScore.maxComboMultiplier) {
            this.sessionScore.maxComboMultiplier = this.sessionScore.comboMultiplier;
        }
        
        // Clear existing combo timer
        if (this.comboTimer) {
            clearTimeout(this.comboTimer);
        }
        
        // Set new combo timer
        this.comboTimer = setTimeout(() => {
            this._resetCombo();
        }, this.comboConfig.comboDecayTime);
        
        // Emit combo event
        this.emit('comboUpdate', {
            combo: this.sessionScore.currentCombo,
            multiplier: this.sessionScore.comboMultiplier,
            isNewRecord: this.sessionScore.currentCombo === this.sessionScore.maxCombo
        });
        
        console.log(`Combo: ${this.sessionScore.currentCombo}x (${this.sessionScore.comboMultiplier.toFixed(1)}x multiplier)`);
    }

    /**
     * Reset combo system
     */
    _resetCombo() {
        if (this.sessionScore.currentCombo > 0) {
            this.emit('comboEnded', {
                finalCombo: this.sessionScore.currentCombo,
                finalMultiplier: this.sessionScore.comboMultiplier
            });
        }
        
        this.sessionScore.currentCombo = 0;
        this.sessionScore.comboMultiplier = this.comboConfig.baseMultiplier;
        
        if (this.comboTimer) {
            clearTimeout(this.comboTimer);
            this.comboTimer = null;
        }
    }

    /**
     * Update distance traveled
     */
    _updateDistance(distance) {
        this.sessionScore.distanceTraveled = distance;
        
        // Check for distance achievements
        this._checkDistanceAchievements(distance);
    }

    /**
     * Handle special events (environmental kills, stunts, etc.)
     */
    _handleSpecialEvent(eventData) {
        const { type, value, bonus } = eventData;
        
        let bonusPoints = 0;
        
        switch (type) {
            case 'airTime':
                bonusPoints = Math.floor(value * 10); // 10 points per second of air time
                break;
            case 'nearMiss':
                bonusPoints = 50;
                break;
            case 'perfectLanding':
                bonusPoints = 100;
                break;
            case 'environmentalKill':
                bonusPoints = value * 2; // Double points for environmental kills
                break;
            default:
                bonusPoints = bonus || 0;
        }
        
        if (bonusPoints > 0) {
            this.sessionScore.totalPoints += bonusPoints;
            
            this.emit('bonusPoints', {
                type,
                points: bonusPoints,
                totalPoints: this.sessionScore.totalPoints
            });
            
            console.log(`Bonus points: +${bonusPoints} for ${type}`);
        }
    }

    /**
     * Check for kill-related achievements
     */
    _checkKillAchievements(zombie, killMethod, damage) {
        const achievements = [];
        
        // First blood achievement
        if (this.sessionScore.zombiesKilled === 1) {
            achievements.push(this.achievementSystem.unlock('FIRST_BLOOD', { points: 100 }));
        }
        
        // Kill count milestones
        const killMilestones = [10, 25, 50, 100, 250, 500, 1000];
        if (killMilestones.includes(this.sessionScore.zombiesKilled)) {
            achievements.push(this.achievementSystem.unlock(`KILL_${this.sessionScore.zombiesKilled}`, {
                points: this.sessionScore.zombiesKilled * 2
            }));
        }
        
        // Combo achievements
        if (this.sessionScore.currentCombo === 10) {
            achievements.push(this.achievementSystem.unlock('COMBO_MASTER', { points: 500 }));
        } else if (this.sessionScore.currentCombo === 25) {
            achievements.push(this.achievementSystem.unlock('COMBO_LEGEND', { points: 1000 }));
        }
        
        // Special kill method achievements
        if (killMethod === 'explosion') {
            achievements.push(this.achievementSystem.unlock('EXPLOSIVE_EXPERT', { points: 200 }));
        }
        
        // Boss kill achievements
        if (zombie.type.includes('boss')) {
            achievements.push(this.achievementSystem.unlock('BOSS_SLAYER', { points: 1000 }));
        }
        
        // Process achievements
        achievements.filter(Boolean).forEach(achievement => {
            this._processAchievement(achievement);
        });
    }

    /**
     * Check for distance-related achievements
     */
    _checkDistanceAchievements(distance) {
        const distanceMilestones = [1000, 5000, 10000, 25000, 50000];
        const currentMilestone = distanceMilestones.find(milestone => 
            distance >= milestone && !this.sessionScore.achievements.some(a => a.id === `DISTANCE_${milestone}`)
        );
        
        if (currentMilestone) {
            const achievement = this.achievementSystem.unlock(`DISTANCE_${currentMilestone}`, {
                points: currentMilestone / 10
            });
            
            if (achievement) {
                this._processAchievement(achievement);
            }
        }
    }

    /**
     * Process unlocked achievement
     */
    _processAchievement(achievement) {
        // Add to session achievements
        this.sessionScore.achievements.push(achievement);
        
        // Add bonus points
        this.sessionScore.totalPoints += achievement.points;
        
        // Emit achievement event
        this.emit('achievementUnlocked', achievement);
        
        console.log(`Achievement unlocked: ${achievement.name} (+${achievement.points} points)`);
    }

    /**
     * Calculate currency from current points
     */
    calculateCurrency() {
        const basePoints = this.sessionScore.totalPoints;
        
        // Apply achievement bonus
        const achievementBonus = this.sessionScore.achievements.length * this.currencyConfig.achievementBonus;
        const bonusMultiplier = this.currencyConfig.bonusMultiplier + achievementBonus;
        
        // Calculate currency
        const currency = Math.floor(basePoints * this.currencyConfig.pointsToCurrencyRate * bonusMultiplier);
        
        return {
            baseCurrency: Math.floor(basePoints * this.currencyConfig.pointsToCurrencyRate),
            bonusCurrency: currency - Math.floor(basePoints * this.currencyConfig.pointsToCurrencyRate),
            totalCurrency: currency,
            bonusMultiplier
        };
    }

    /**
     * Get current session statistics
     */
    getSessionStats() {
        const currentTime = Date.now();
        this.sessionScore.timeElapsed = currentTime - this.sessionStartTime;
        
        return {
            ...this.sessionScore,
            currency: this.calculateCurrency(),
            averagePointsPerKill: this.sessionScore.zombiesKilled > 0 ? 
                Math.floor(this.sessionScore.totalPoints / this.sessionScore.zombiesKilled) : 0,
            killsPerMinute: this.sessionScore.timeElapsed > 0 ? 
                (this.sessionScore.zombiesKilled / (this.sessionScore.timeElapsed / 60000)).toFixed(1) : 0
        };
    }

    /**
     * Update session with backend API
     */
    async updateSessionScore(sessionId) {
        try {
            const stats = this.getSessionStats();
            
            const response = await this.apiClient.put(`/api/v1/game/sessions/${sessionId}/score`, {
                score: stats.totalPoints,
                zombies_killed: stats.zombiesKilled,
                distance_traveled: stats.distanceTraveled
            });
            
            console.log('Session score updated successfully');
            return response.data;
        } catch (error) {
            console.error('Failed to update session score:', error);
            throw error;
        }
    }

    /**
     * End session and sync with backend
     */
    async endSession(sessionId, sessionState = 'completed') {
        try {
            const stats = this.getSessionStats();
            
            const response = await this.apiClient.post(`/api/v1/game/sessions/${sessionId}/end`, {
                final_score: stats.totalPoints,
                zombies_killed: stats.zombiesKilled,
                distance_traveled: stats.distanceTraveled,
                session_state: sessionState
            });
            
            console.log('Session ended successfully');
            this.emit('sessionEnded', response.data.result);
            
            return response.data.result;
        } catch (error) {
            console.error('Failed to end session:', error);
            throw error;
        }
    }

    /**
     * Reset scoring system for new session
     */
    resetSession() {
        // Reset combo
        this._resetCombo();
        
        // Reset session score
        this.sessionScore = {
            totalPoints: 0,
            zombiesKilled: 0,
            distanceTraveled: 0,
            timeElapsed: 0,
            comboMultiplier: 1.0,
            maxComboMultiplier: 1.0,
            currentCombo: 0,
            maxCombo: 0,
            achievements: []
        };
        
        // Reset timers
        this.sessionStartTime = Date.now();
        this.lastUpdateTime = Date.now();
        this.lastKillTime = 0;
        
        // Reset achievement system for new session
        this.achievementSystem.resetSession();
        
        console.log('Scoring system reset for new session');
    }

    /**
     * Update scoring system each frame
     */
    update(deltaTime) {
        const currentTime = Date.now();
        this.sessionScore.timeElapsed = currentTime - this.sessionStartTime;
        
        // Check for time-based achievements
        this._checkTimeAchievements();
        
        this.lastUpdateTime = currentTime;
    }

    /**
     * Check for time-based achievements
     */
    _checkTimeAchievements() {
        const timeMinutes = this.sessionScore.timeElapsed / 60000;
        const timeMilestones = [5, 10, 30, 60]; // minutes
        
        const currentMilestone = timeMilestones.find(milestone => 
            timeMinutes >= milestone && !this.sessionScore.achievements.some(a => a.id === `SURVIVOR_${milestone}`)
        );
        
        if (currentMilestone) {
            const achievement = this.achievementSystem.unlock(`SURVIVOR_${currentMilestone}`, {
                points: currentMilestone * 50
            });
            
            if (achievement) {
                this._processAchievement(achievement);
            }
        }
    }

    /**
     * Dispose of scoring system
     */
    dispose() {
        if (this.comboTimer) {
            clearTimeout(this.comboTimer);
        }
        
        this.removeAllListeners();
        console.log('ScoringSystem disposed');
    }
}

/**
 * Achievement system for managing unlockable achievements
 */
class AchievementSystem {
    constructor() {
        this.achievements = new Map();
        this.unlockedThisSession = new Set();
        
        this._initializeAchievements();
    }

    /**
     * Initialize achievement definitions
     */
    _initializeAchievements() {
        const achievementDefs = [
            // Kill achievements
            { id: 'FIRST_BLOOD', name: 'First Blood', description: 'Kill your first zombie', points: 100 },
            { id: 'KILL_10', name: 'Zombie Hunter', description: 'Kill 10 zombies', points: 20 },
            { id: 'KILL_25', name: 'Zombie Slayer', description: 'Kill 25 zombies', points: 50 },
            { id: 'KILL_50', name: 'Zombie Destroyer', description: 'Kill 50 zombies', points: 100 },
            { id: 'KILL_100', name: 'Zombie Annihilator', description: 'Kill 100 zombies', points: 200 },
            { id: 'KILL_250', name: 'Zombie Exterminator', description: 'Kill 250 zombies', points: 500 },
            { id: 'KILL_500', name: 'Zombie Apocalypse', description: 'Kill 500 zombies', points: 1000 },
            { id: 'KILL_1000', name: 'Zombie Genocide', description: 'Kill 1000 zombies', points: 2000 },
            
            // Combo achievements
            { id: 'COMBO_MASTER', name: 'Combo Master', description: 'Achieve a 10x combo', points: 500 },
            { id: 'COMBO_LEGEND', name: 'Combo Legend', description: 'Achieve a 25x combo', points: 1000 },
            
            // Special kill achievements
            { id: 'EXPLOSIVE_EXPERT', name: 'Explosive Expert', description: 'Kill zombies with explosions', points: 200 },
            { id: 'BOSS_SLAYER', name: 'Boss Slayer', description: 'Defeat a boss zombie', points: 1000 },
            
            // Distance achievements
            { id: 'DISTANCE_1000', name: 'Road Warrior', description: 'Travel 1000 meters', points: 100 },
            { id: 'DISTANCE_5000', name: 'Long Hauler', description: 'Travel 5000 meters', points: 500 },
            { id: 'DISTANCE_10000', name: 'Marathon Runner', description: 'Travel 10000 meters', points: 1000 },
            { id: 'DISTANCE_25000', name: 'Cross Country', description: 'Travel 25000 meters', points: 2500 },
            { id: 'DISTANCE_50000', name: 'World Traveler', description: 'Travel 50000 meters', points: 5000 },
            
            // Time achievements
            { id: 'SURVIVOR_5', name: 'Survivor', description: 'Survive for 5 minutes', points: 250 },
            { id: 'SURVIVOR_10', name: 'Veteran Survivor', description: 'Survive for 10 minutes', points: 500 },
            { id: 'SURVIVOR_30', name: 'Endurance Master', description: 'Survive for 30 minutes', points: 1500 },
            { id: 'SURVIVOR_60', name: 'Ultimate Survivor', description: 'Survive for 1 hour', points: 3000 }
        ];
        
        achievementDefs.forEach(def => {
            this.achievements.set(def.id, { ...def, unlocked: false });
        });
    }

    /**
     * Unlock an achievement
     */
    unlock(achievementId, data = {}) {
        const achievement = this.achievements.get(achievementId);
        
        if (!achievement) {
            console.warn(`Achievement ${achievementId} not found`);
            return null;
        }
        
        if (achievement.unlocked || this.unlockedThisSession.has(achievementId)) {
            return null; // Already unlocked
        }
        
        // Mark as unlocked
        achievement.unlocked = true;
        this.unlockedThisSession.add(achievementId);
        
        // Merge additional data
        const unlockedAchievement = { ...achievement, ...data, unlockedAt: Date.now() };
        
        return unlockedAchievement;
    }

    /**
     * Get all achievements
     */
    getAllAchievements() {
        return Array.from(this.achievements.values());
    }

    /**
     * Get unlocked achievements
     */
    getUnlockedAchievements() {
        return Array.from(this.achievements.values()).filter(a => a.unlocked);
    }

    /**
     * Reset session-specific tracking
     */
    resetSession() {
        this.unlockedThisSession.clear();
    }
}