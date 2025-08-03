/**
 * Performance Tracker
 * 
 * Tracks player performance metrics to inform dynamic difficulty adjustments.
 * Monitors various gameplay aspects to create a comprehensive performance score.
 */

class PerformanceTracker {
    constructor() {
        this.metrics = {
            // Combat performance
            zombiesKilled: 0,
            hitAccuracy: 0,
            comboMultiplier: 0,
            damageDealt: 0,
            damageTaken: 0,
            
            // Movement performance
            averageSpeed: 0,
            distanceTraveled: 0,
            timeStuck: 0,
            collisions: 0,
            
            // Survival metrics
            healthPercentage: 100,
            survivalTime: 0,
            objectivesCompleted: 0,
            resourceEfficiency: 1.0,
            
            // Skill indicators
            reactionTime: 0,
            decisionQuality: 0,
            adaptability: 0
        };
        
        this.performanceHistory = [];
        this.evaluationWindow = 10000; // 10 seconds
        this.lastUpdate = Date.now();
        
        // Weights for different performance aspects
        this.weights = {
            combat: 0.3,
            movement: 0.2,
            survival: 0.3,
            skill: 0.2
        };
        
        // Temporary tracking variables
        this.tempMetrics = {
            shots: 0,
            hits: 0,
            speedSamples: [],
            lastPosition: null,
            stuckTimer: 0,
            lastHealthCheck: 100
        };
    }
    
    initialize() {
        console.log('📊 Initializing Performance Tracker');
        this.resetMetrics();
    }
    
    update(deltaTime, gameState) {
        const currentTime = Date.now();
        
        // Update combat metrics
        this.updateCombatMetrics(gameState);
        
        // Update movement metrics
        this.updateMovementMetrics(deltaTime, gameState);
        
        // Update survival metrics
        this.updateSurvivalMetrics(gameState);
        
        // Update skill metrics
        this.updateSkillMetrics(deltaTime, gameState);
        
        // Record performance snapshot
        if (currentTime - this.lastUpdate >= 1000) { // Every second
            this.recordPerformanceSnapshot();
            this.lastUpdate = currentTime;
        }
    }
    
    updateCombatMetrics(gameState) {
        if (gameState && gameState.combat) {
            // Update zombie kill count
            if (gameState.combat.zombiesKilled > this.metrics.zombiesKilled) {
                this.metrics.zombiesKilled = gameState.combat.zombiesKilled;
            }
            
            // Track hit accuracy
            if (gameState.combat.shotsFired > this.tempMetrics.shots) {
                this.tempMetrics.shots = gameState.combat.shotsFired;
            }
            
            if (gameState.combat.shotsHit > this.tempMetrics.hits) {
                this.tempMetrics.hits = gameState.combat.shotsHit;
            }
            
            this.metrics.hitAccuracy = this.tempMetrics.shots > 0 ? 
                this.tempMetrics.hits / this.tempMetrics.shots : 0;
            
            // Update combo multiplier
            this.metrics.comboMultiplier = Math.max(
                this.metrics.comboMultiplier,
                gameState.combat.currentCombo || 0
            );
            
            // Update damage metrics
            this.metrics.damageDealt = gameState.combat.totalDamageDealt || 0;
            this.metrics.damageTaken = gameState.combat.totalDamageTaken || 0;
        }
    }
    
    updateMovementMetrics(deltaTime, gameState) {
        if (gameState && gameState.vehicle) {
            const vehicle = gameState.vehicle;
            
            // Track speed
            const currentSpeed = vehicle.speed || 0;
            this.tempMetrics.speedSamples.push(currentSpeed);
            
            // Keep only recent speed samples
            if (this.tempMetrics.speedSamples.length > 60) { // 1 minute at 60fps
                this.tempMetrics.speedSamples.shift();
            }
            
            // Calculate average speed
            this.metrics.averageSpeed = this.tempMetrics.speedSamples.reduce((a, b) => a + b, 0) / 
                this.tempMetrics.speedSamples.length;
            
            // Track distance traveled
            if (this.tempMetrics.lastPosition) {
                const distance = this.calculateDistance(
                    this.tempMetrics.lastPosition,
                    vehicle.position
                );
                this.metrics.distanceTraveled += distance;
            }
            this.tempMetrics.lastPosition = { ...vehicle.position };
            
            // Track time stuck (very low speed)
            if (currentSpeed < 1.0) {
                this.tempMetrics.stuckTimer += deltaTime;
            } else {
                this.tempMetrics.stuckTimer = 0;
            }
            
            if (this.tempMetrics.stuckTimer > 3000) { // 3 seconds
                this.metrics.timeStuck += deltaTime;
            }
            
            // Track collisions
            if (vehicle.collisionCount > this.metrics.collisions) {
                this.metrics.collisions = vehicle.collisionCount;
            }
        }
    }
    
    updateSurvivalMetrics(gameState) {
        if (gameState && gameState.player) {
            // Update health percentage
            this.metrics.healthPercentage = gameState.player.health || 0;
            
            // Track survival time
            this.metrics.survivalTime = gameState.gameTime || 0;
            
            // Track objectives completed
            this.metrics.objectivesCompleted = gameState.objectivesCompleted || 0;
            
            // Calculate resource efficiency (health preservation)
            const healthLoss = this.tempMetrics.lastHealthCheck - this.metrics.healthPercentage;
            if (healthLoss > 0) {
                this.metrics.resourceEfficiency = Math.max(0, 
                    this.metrics.resourceEfficiency - (healthLoss / 100) * 0.1
                );
            }
            this.tempMetrics.lastHealthCheck = this.metrics.healthPercentage;
        }
    }
    
    updateSkillMetrics(deltaTime, gameState) {
        // Reaction time (based on input response to threats)
        if (gameState.threats && gameState.threats.length > 0) {
            const avgReactionTime = this.calculateAverageReactionTime(gameState.threats);
            this.metrics.reactionTime = avgReactionTime;
        }
        
        // Decision quality (based on strategic choices)
        this.metrics.decisionQuality = this.calculateDecisionQuality(gameState);
        
        // Adaptability (based on performance consistency)
        this.metrics.adaptability = this.calculateAdaptability();
    }
    
    calculateDistance(pos1, pos2) {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const dz = pos2.z - pos1.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    calculateAverageReactionTime(threats) {
        // Simplified reaction time calculation
        // In a real implementation, this would track input timing relative to threat appearance
        return Math.max(0, 1000 - (this.metrics.hitAccuracy * 500)); // ms
    }
    
    calculateDecisionQuality(gameState) {
        // Decision quality based on multiple factors
        let quality = 0.5; // Base quality
        
        // Bonus for maintaining health
        quality += (this.metrics.healthPercentage / 100) * 0.2;
        
        // Bonus for efficient movement
        if (this.metrics.averageSpeed > 10) {
            quality += 0.1;
        }
        
        // Penalty for getting stuck
        if (this.metrics.timeStuck > 5000) {
            quality -= 0.2;
        }
        
        // Bonus for combat effectiveness
        if (this.metrics.hitAccuracy > 0.7) {
            quality += 0.2;
        }
        
        return Math.max(0, Math.min(1, quality));
    }
    
    calculateAdaptability() {
        if (this.performanceHistory.length < 5) {
            return 0.5; // Default adaptability
        }
        
        // Calculate performance variance (lower variance = higher adaptability)
        const recentScores = this.performanceHistory.slice(-10).map(h => h.overallScore);
        const mean = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
        const variance = recentScores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / recentScores.length;
        
        // Convert variance to adaptability score (inverse relationship)
        return Math.max(0, Math.min(1, 1 - variance));
    }
    
    recordPerformanceSnapshot() {
        const snapshot = {
            timestamp: Date.now(),
            metrics: { ...this.metrics },
            overallScore: this.calculateOverallPerformanceScore()
        };
        
        this.performanceHistory.push(snapshot);
        
        // Limit history size
        if (this.performanceHistory.length > 300) { // 5 minutes at 1 sample/second
            this.performanceHistory.shift();
        }
    }
    
    calculateOverallPerformanceScore() {
        // Combat score (0-1)
        const combatScore = Math.min(1, (
            (this.metrics.hitAccuracy * 0.4) +
            (Math.min(this.metrics.zombiesKilled / 50, 1) * 0.3) +
            (Math.min(this.metrics.comboMultiplier / 10, 1) * 0.3)
        ));
        
        // Movement score (0-1)
        const movementScore = Math.min(1, (
            (Math.min(this.metrics.averageSpeed / 30, 1) * 0.4) +
            (Math.min(this.metrics.distanceTraveled / 1000, 1) * 0.3) +
            (Math.max(0, 1 - this.metrics.timeStuck / 10000) * 0.3)
        ));
        
        // Survival score (0-1)
        const survivalScore = (
            (this.metrics.healthPercentage / 100 * 0.4) +
            (Math.min(this.metrics.survivalTime / 60000, 1) * 0.3) + // 1 minute max
            (this.metrics.resourceEfficiency * 0.3)
        );
        
        // Skill score (0-1)
        const skillScore = (
            (Math.max(0, 1 - this.metrics.reactionTime / 2000) * 0.4) + // 2s max reaction time
            (this.metrics.decisionQuality * 0.3) +
            (this.metrics.adaptability * 0.3)
        );
        
        // Weighted overall score
        return (
            combatScore * this.weights.combat +
            movementScore * this.weights.movement +
            survivalScore * this.weights.survival +
            skillScore * this.weights.skill
        );
    }
    
    getPerformanceScore() {
        if (this.performanceHistory.length === 0) {
            return 0.5; // Default score
        }
        
        // Return average of recent performance
        const recentHistory = this.performanceHistory.slice(-10);
        const totalScore = recentHistory.reduce((sum, snapshot) => sum + snapshot.overallScore, 0);
        return totalScore / recentHistory.length;
    }
    
    getDetailedMetrics() {
        return {
            current: { ...this.metrics },
            overall: this.calculateOverallPerformanceScore(),
            breakdown: {
                combat: this.getCombatScore(),
                movement: this.getMovementScore(),
                survival: this.getSurvivalScore(),
                skill: this.getSkillScore()
            }
        };
    }
    
    getCombatScore() {
        return Math.min(1, (
            (this.metrics.hitAccuracy * 0.4) +
            (Math.min(this.metrics.zombiesKilled / 50, 1) * 0.3) +
            (Math.min(this.metrics.comboMultiplier / 10, 1) * 0.3)
        ));
    }
    
    getMovementScore() {
        return Math.min(1, (
            (Math.min(this.metrics.averageSpeed / 30, 1) * 0.4) +
            (Math.min(this.metrics.distanceTraveled / 1000, 1) * 0.3) +
            (Math.max(0, 1 - this.metrics.timeStuck / 10000) * 0.3)
        ));
    }
    
    getSurvivalScore() {
        return (
            (this.metrics.healthPercentage / 100 * 0.4) +
            (Math.min(this.metrics.survivalTime / 60000, 1) * 0.3) +
            (this.metrics.resourceEfficiency * 0.3)
        );
    }
    
    getSkillScore() {
        return (
            (Math.max(0, 1 - this.metrics.reactionTime / 2000) * 0.4) +
            (this.metrics.decisionQuality * 0.3) +
            (this.metrics.adaptability * 0.3)
        );
    }
    
    resetMetrics() {
        this.metrics = {
            zombiesKilled: 0,
            hitAccuracy: 0,
            comboMultiplier: 0,
            damageDealt: 0,
            damageTaken: 0,
            averageSpeed: 0,
            distanceTraveled: 0,
            timeStuck: 0,
            collisions: 0,
            healthPercentage: 100,
            survivalTime: 0,
            objectivesCompleted: 0,
            resourceEfficiency: 1.0,
            reactionTime: 0,
            decisionQuality: 0,
            adaptability: 0
        };
        
        this.tempMetrics = {
            shots: 0,
            hits: 0,
            speedSamples: [],
            lastPosition: null,
            stuckTimer: 0,
            lastHealthCheck: 100
        };
        
        this.performanceHistory = [];
    }
}

export default PerformanceTracker;