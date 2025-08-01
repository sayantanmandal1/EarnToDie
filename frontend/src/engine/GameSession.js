import { EventEmitter } from 'events';

/**
 * Game session management and results calculation
 */
export class GameSession extends EventEmitter {
    constructor(gameStateManager, scoringSystem) {
        super();
        this.gameStateManager = gameStateManager;
        this.scoringSystem = scoringSystem;
        
        // Session data
        this.sessionId = null;
        this.levelId = null;
        this.vehicleId = null;
        this.startTime = null;
        this.endTime = null;
        this.isActive = false;
        
        // Game statistics
        this.stats = this._initializeStats();
        
        // Objectives and completion tracking
        this.objectives = [];
        this.completedObjectives = [];
        this.levelCompleted = false;
        
        // Performance tracking
        this.checkpoints = [];
        this.milestones = [];
        
        // Results calculation
        this.finalResults = null;
    }

    /**
     * Start a new game session
     */
    start(levelId, vehicleId, objectives = []) {
        if (this.isActive) {
            console.warn('Cannot start new session - session already active');
            return false;
        }

        this.sessionId = this._generateSessionId();
        this.levelId = levelId;
        this.vehicleId = vehicleId;
        this.startTime = Date.now();
        this.endTime = null;
        this.isActive = true;
        
        this.stats = this._initializeStats();
        this.objectives = [...objectives];
        this.completedObjectives = [];
        this.levelCompleted = false;
        this.checkpoints = [];
        this.milestones = [];
        this.finalResults = null;

        console.log(`Game session started: ${this.sessionId}`);
        this.emit('sessionStarted', {
            sessionId: this.sessionId,
            levelId: this.levelId,
            vehicleId: this.vehicleId,
            objectives: this.objectives
        });

        return true;
    }

    /**
     * End the current game session
     */
    end(reason = 'manual', completed = false) {
        if (!this.isActive) {
            console.warn('Cannot end session - no active session');
            return null;
        }

        this.endTime = Date.now();
        this.isActive = false;
        this.levelCompleted = completed;

        // Calculate final results
        this.finalResults = this._calculateResults(reason, completed);

        console.log(`Game session ended: ${this.sessionId}`, this.finalResults);
        this.emit('sessionEnded', {
            sessionId: this.sessionId,
            results: this.finalResults,
            reason,
            completed
        });

        return this.finalResults;
    }

    /**
     * Update session statistics
     */
    updateStats(newStats) {
        if (!this.isActive) return;

        Object.assign(this.stats, newStats);
        this.emit('statsUpdated', this.stats);
    }

    /**
     * Add points to the session score
     */
    addScore(points, source = 'unknown') {
        if (!this.isActive) return;

        this.stats.score += points;
        this.stats.totalPointsEarned += points;

        // Track score sources
        if (!this.stats.scoreBreakdown[source]) {
            this.stats.scoreBreakdown[source] = 0;
        }
        this.stats.scoreBreakdown[source] += points;

        this.emit('scoreAdded', { points, source, totalScore: this.stats.score });
    }

    /**
     * Record zombie elimination
     */
    recordZombieKill(zombieType, points, comboMultiplier = 1) {
        if (!this.isActive) return;

        this.stats.zombiesKilled++;
        this.stats.zombieKills[zombieType] = (this.stats.zombieKills[zombieType] || 0) + 1;
        
        const totalPoints = Math.floor(points * comboMultiplier);
        this.addScore(totalPoints, 'zombie_kills');

        // Update combo tracking
        this.stats.currentCombo++;
        this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.currentCombo);

        this.emit('zombieKilled', {
            zombieType,
            points: totalPoints,
            comboMultiplier,
            currentCombo: this.stats.currentCombo
        });
    }

    /**
     * Break the current combo
     */
    breakCombo() {
        if (!this.isActive) return;

        if (this.stats.currentCombo > 0) {
            this.stats.currentCombo = 0;
            this.emit('comboBreak');
        }
    }

    /**
     * Record distance traveled
     */
    updateDistance(distance) {
        if (!this.isActive) return;

        this.stats.distanceTraveled = distance;
        this.emit('distanceUpdated', distance);
    }

    /**
     * Record checkpoint reached
     */
    reachCheckpoint(checkpointId, position, timeElapsed) {
        if (!this.isActive) return;

        const checkpoint = {
            id: checkpointId,
            position: { ...position },
            timeElapsed,
            timestamp: Date.now()
        };

        this.checkpoints.push(checkpoint);
        this.stats.checkpointsReached++;

        // Award checkpoint bonus
        const bonusPoints = 100;
        this.addScore(bonusPoints, 'checkpoints');

        this.emit('checkpointReached', checkpoint);
    }

    /**
     * Complete an objective
     */
    completeObjective(objectiveId) {
        if (!this.isActive) return;

        const objective = this.objectives.find(obj => obj.id === objectiveId);
        if (!objective || this.completedObjectives.includes(objectiveId)) {
            return;
        }

        this.completedObjectives.push(objectiveId);
        
        // Award objective completion bonus
        const bonusPoints = objective.bonusPoints || 500;
        this.addScore(bonusPoints, 'objectives');

        this.emit('objectiveCompleted', {
            objectiveId,
            objective,
            bonusPoints,
            completedCount: this.completedObjectives.length,
            totalCount: this.objectives.length
        });

        // Check if all objectives are completed
        if (this.completedObjectives.length === this.objectives.length) {
            this._checkLevelCompletion();
        }
    }

    /**
     * Record vehicle damage
     */
    recordDamage(damage, source = 'unknown') {
        if (!this.isActive) return;

        this.stats.damageTaken += damage;
        this.stats.damageBySource[source] = (this.stats.damageBySource[source] || 0) + damage;

        this.emit('damageRecorded', { damage, source, totalDamage: this.stats.damageTaken });
    }

    /**
     * Update vehicle status
     */
    updateVehicleStatus(health, fuel) {
        if (!this.isActive) return;

        this.stats.vehicleHealth = health;
        this.stats.vehicleFuel = fuel;

        this.emit('vehicleStatusUpdated', { health, fuel });
    }

    /**
     * Get current session data
     */
    getSessionData() {
        return {
            sessionId: this.sessionId,
            levelId: this.levelId,
            vehicleId: this.vehicleId,
            startTime: this.startTime,
            endTime: this.endTime,
            isActive: this.isActive,
            stats: { ...this.stats },
            objectives: [...this.objectives],
            completedObjectives: [...this.completedObjectives],
            checkpoints: [...this.checkpoints],
            levelCompleted: this.levelCompleted
        };
    }

    /**
     * Get session duration in seconds
     */
    getDuration() {
        if (!this.startTime) return 0;
        
        const endTime = this.endTime || Date.now();
        return (endTime - this.startTime) / 1000;
    }

    /**
     * Check if level completion conditions are met
     */
    _checkLevelCompletion() {
        // All objectives completed
        const allObjectivesCompleted = this.completedObjectives.length === this.objectives.length;
        
        if (allObjectivesCompleted && !this.levelCompleted) {
            this.levelCompleted = true;
            this.emit('levelCompleted', {
                sessionId: this.sessionId,
                completionTime: this.getDuration(),
                finalScore: this.stats.score
            });
        }
    }

    /**
     * Calculate final results
     */
    _calculateResults(reason, completed) {
        const duration = this.getDuration();
        const baseScore = this.stats.score;
        
        // Calculate bonus multipliers
        let timeBonus = 0;
        let completionBonus = 0;
        let performanceBonus = 0;

        if (completed) {
            // Time bonus (faster completion = higher bonus)
            const targetTime = 300; // 5 minutes target
            if (duration < targetTime) {
                timeBonus = Math.floor((targetTime - duration) * 10);
            }

            // Completion bonus
            completionBonus = 1000;

            // Performance bonus based on various factors
            const comboBonus = this.stats.maxCombo * 50;
            const efficiencyBonus = Math.floor(this.stats.zombiesKilled / Math.max(1, this.stats.damageTaken) * 100);
            performanceBonus = comboBonus + efficiencyBonus;
        }

        const totalBonus = timeBonus + completionBonus + performanceBonus;
        const finalScore = baseScore + totalBonus;

        // Calculate star rating (1-3 stars)
        let stars = 1;
        if (completed) {
            stars = 2;
            if (this.stats.maxCombo >= 10 && duration < 240) { // 4 minutes
                stars = 3;
            }
        }

        // Calculate grade (F to S)
        let grade = 'F';
        if (completed) {
            if (finalScore >= 10000) grade = 'S';
            else if (finalScore >= 7500) grade = 'A';
            else if (finalScore >= 5000) grade = 'B';
            else if (finalScore >= 2500) grade = 'C';
            else grade = 'D';
        }

        return {
            sessionId: this.sessionId,
            levelId: this.levelId,
            vehicleId: this.vehicleId,
            completed,
            reason,
            duration,
            baseScore,
            bonuses: {
                time: timeBonus,
                completion: completionBonus,
                performance: performanceBonus,
                total: totalBonus
            },
            finalScore,
            stars,
            grade,
            stats: { ...this.stats },
            objectives: {
                total: this.objectives.length,
                completed: this.completedObjectives.length,
                list: this.completedObjectives
            },
            checkpoints: this.checkpoints.length,
            achievements: this._calculateAchievements()
        };
    }

    /**
     * Calculate achievements earned during the session
     */
    _calculateAchievements() {
        const achievements = [];

        // Combo achievements
        if (this.stats.maxCombo >= 50) achievements.push('combo_master');
        else if (this.stats.maxCombo >= 25) achievements.push('combo_expert');
        else if (this.stats.maxCombo >= 10) achievements.push('combo_starter');

        // Kill count achievements
        if (this.stats.zombiesKilled >= 500) achievements.push('zombie_slayer');
        else if (this.stats.zombiesKilled >= 200) achievements.push('zombie_hunter');
        else if (this.stats.zombiesKilled >= 50) achievements.push('zombie_killer');

        // Distance achievements
        if (this.stats.distanceTraveled >= 5000) achievements.push('long_distance_driver');
        else if (this.stats.distanceTraveled >= 2000) achievements.push('distance_driver');

        // Survival achievements
        if (this.stats.vehicleHealth > 80) achievements.push('survivor');
        if (this.stats.damageTaken < 50) achievements.push('untouchable');

        // Speed achievements
        const duration = this.getDuration();
        if (this.levelCompleted && duration < 180) achievements.push('speed_demon');
        else if (this.levelCompleted && duration < 300) achievements.push('quick_finisher');

        return achievements;
    }

    /**
     * Initialize session statistics
     */
    _initializeStats() {
        return {
            score: 0,
            totalPointsEarned: 0,
            zombiesKilled: 0,
            zombieKills: {},
            distanceTraveled: 0,
            damageTaken: 0,
            damageBySource: {},
            vehicleHealth: 100,
            vehicleFuel: 100,
            checkpointsReached: 0,
            currentCombo: 0,
            maxCombo: 0,
            scoreBreakdown: {}
        };
    }

    /**
     * Generate unique session ID
     */
    _generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Dispose of the session
     */
    dispose() {
        if (this.isActive) {
            this.end('disposed', false);
        }
        
        this.removeAllListeners();
        this.gameStateManager = null;
        this.scoringSystem = null;
        console.log('GameSession disposed');
    }
}