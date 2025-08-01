import { EventEmitter } from 'events';

/**
 * UpgradeIntegration handles the integration between upgrade system, scoring system, and currency conversion
 * Manages the flow of currency from scoring to upgrades and synchronizes with backend
 */
export class UpgradeIntegration extends EventEmitter {
    constructor(upgradeManager, scoringSystem, apiClient) {
        super();
        
        this.upgradeManager = upgradeManager;
        this.scoringSystem = scoringSystem;
        this.apiClient = apiClient;
        
        // Integration state
        this.isInitialized = false;
        this.syncInProgress = false;
        
        // Currency conversion settings
        this.currencySettings = {
            autoConvert: true,
            conversionThreshold: 100, // Minimum points before conversion
            conversionRate: 0.1 // Points to currency rate (10 points = 1 currency)
        };
        
        console.log('UpgradeIntegration initialized');
    }

    /**
     * Initialize the integration system
     */
    async initialize() {
        try {
            // Wait for both systems to be ready
            if (!this.upgradeManager || !this.scoringSystem) {
                throw new Error('Required systems not available');
            }

            // Setup event listeners
            this._setupEventListeners();
            
            // Initialize upgrade manager if not already done
            if (!this.upgradeManager.isInitialized) {
                await this.upgradeManager.initialize();
            }
            
            this.isInitialized = true;
            console.log('UpgradeIntegration initialized successfully');
            
            this.emit('initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize UpgradeIntegration:', error);
            throw error;
        }
    }

    /**
     * Setup event listeners for scoring and upgrade systems
     */
    _setupEventListeners() {
        // Listen for session end to convert points to currency
        this.scoringSystem.on('sessionEnded', async (sessionResult) => {
            await this._handleSessionEnd(sessionResult);
        });

        // Listen for currency updates from scoring system
        this.scoringSystem.on('pointsScored', (pointsData) => {
            this._handlePointsScored(pointsData);
        });

        // Listen for upgrade purchases to update currency
        this.upgradeManager.on('upgradeCompleted', (upgradeData) => {
            this._handleUpgradeCompleted(upgradeData);
        });

        // Listen for achievement unlocks for bonus currency
        this.scoringSystem.on('achievementUnlocked', (achievement) => {
            this._handleAchievementUnlocked(achievement);
        });
    }

    /**
     * Handle session end and convert points to currency
     */
    async _handleSessionEnd(sessionResult) {
        try {
            console.log('Session ended, processing currency conversion...');
            
            const currencyData = this.scoringSystem.calculateCurrency();
            const earnedCurrency = currencyData.totalCurrency;
            
            if (earnedCurrency > 0) {
                // Update player currency via backend
                await this._updatePlayerCurrency(earnedCurrency);
                
                // Emit currency earned event
                this.emit('currencyEarned', {
                    amount: earnedCurrency,
                    breakdown: currencyData,
                    sessionResult
                });
                
                console.log(`Earned ${earnedCurrency} currency from session`);
            }
            
        } catch (error) {
            console.error('Failed to process session end currency:', error);
            this.emit('error', { type: 'currency_conversion', error });
        }
    }

    /**
     * Handle points scored during gameplay for real-time currency preview
     */
    _handlePointsScored(pointsData) {
        // Calculate potential currency from current points
        const potentialCurrency = Math.floor(pointsData.totalPoints * this.currencySettings.conversionRate);
        
        // Emit currency preview update
        this.emit('currencyPreview', {
            points: pointsData.totalPoints,
            potentialCurrency,
            conversionRate: this.currencySettings.conversionRate
        });
    }

    /**
     * Handle upgrade completion
     */
    _handleUpgradeCompleted(upgradeData) {
        console.log(`Upgrade completed: ${upgradeData.category} level ${upgradeData.newLevel}`);
        
        // Emit integration event
        this.emit('upgradeIntegrated', {
            ...upgradeData,
            timestamp: Date.now()
        });
    }

    /**
     * Handle achievement unlocks for bonus currency
     */
    _handleAchievementUnlocked(achievement) {
        // Some achievements might provide immediate currency bonus
        if (achievement.currencyBonus) {
            this._updatePlayerCurrency(achievement.currencyBonus);
            
            this.emit('bonusCurrencyEarned', {
                amount: achievement.currencyBonus,
                source: 'achievement',
                achievement
            });
        }
    }

    /**
     * Update player currency via backend API
     */
    async _updatePlayerCurrency(amount) {
        if (this.syncInProgress) {
            console.log('Currency sync already in progress, queuing update...');
            return;
        }

        try {
            this.syncInProgress = true;
            
            // Get current currency from upgrade manager
            const currentCurrency = this.upgradeManager.getPlayerCurrency();
            const newCurrency = currentCurrency + amount;
            
            // Update via backend API
            const response = await this.apiClient.post('/api/v1/player/currency', {
                amount: amount,
                operation: 'add',
                source: 'gameplay'
            });
            
            // Update local currency in upgrade manager
            this.upgradeManager.updatePlayerCurrency(newCurrency);
            
            console.log(`Currency updated: ${currentCurrency} + ${amount} = ${newCurrency}`);
            
            return response.data;
            
        } catch (error) {
            console.error('Failed to update player currency:', error);
            throw error;
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * Get upgrade recommendations based on player progress and currency
     */
    getUpgradeRecommendations(vehicleId) {
        try {
            const vehicleUpgrades = this.upgradeManager.getVehicleUpgrades(vehicleId);
            const playerCurrency = this.upgradeManager.getPlayerCurrency();
            
            const recommendations = [];
            
            // Analyze each upgrade category
            Object.entries(vehicleUpgrades.upgrades).forEach(([category, upgrade]) => {
                if (!upgrade.isMaxLevel && upgrade.canAfford) {
                    const priority = this._calculateUpgradePriority(category, upgrade, vehicleUpgrades);
                    
                    recommendations.push({
                        category,
                        upgrade,
                        priority,
                        reasoning: this._getUpgradeReasoning(category, upgrade, priority)
                    });
                }
            });
            
            // Sort by priority (higher is better)
            recommendations.sort((a, b) => b.priority - a.priority);
            
            return {
                vehicleId,
                playerCurrency,
                recommendations: recommendations.slice(0, 3), // Top 3 recommendations
                totalAffordable: recommendations.length
            };
            
        } catch (error) {
            console.error('Failed to get upgrade recommendations:', error);
            return null;
        }
    }

    /**
     * Calculate upgrade priority based on various factors
     */
    _calculateUpgradePriority(category, upgrade, vehicleUpgrades) {
        let priority = 0;
        
        // Base priority by category (gameplay impact)
        const categoryPriorities = {
            engine: 10,  // High impact on gameplay
            armor: 8,    // Important for survival
            weapons: 7,  // Good for scoring
            tires: 6,    // Handling improvement
            fuel: 5      // Utility upgrade
        };
        
        priority += categoryPriorities[category] || 5;
        
        // Lower priority for higher levels (diminishing returns)
        priority -= upgrade.currentLevel * 0.3;
        
        // Higher priority for affordable upgrades
        const playerCurrency = this.upgradeManager.getPlayerCurrency();
        if (playerCurrency > 0) {
            const costRatio = upgrade.cost / playerCurrency;
            if (costRatio < 0.3) priority += 2; // Very affordable
            else if (costRatio < 0.5) priority += 1; // Affordable
        }
        
        // Bonus for first upgrade in category
        if (upgrade.currentLevel === 0) priority += 1.5;
        
        return Math.max(0, priority);
    }

    /**
     * Get reasoning text for upgrade recommendation
     */
    _getUpgradeReasoning(category, upgrade, priority) {
        const reasons = [];
        
        if (upgrade.currentLevel === 0) {
            reasons.push('First upgrade in this category');
        }
        
        if (upgrade.cost < this.upgradeManager.getPlayerCurrency() * 0.3) {
            reasons.push('Very affordable');
        }
        
        const categoryReasons = {
            engine: 'Improves speed and acceleration for better mobility',
            armor: 'Increases survivability against zombie attacks',
            weapons: 'Boosts damage output for higher scores',
            tires: 'Enhances handling and control',
            fuel: 'Extends gameplay duration'
        };
        
        reasons.push(categoryReasons[category] || 'Improves vehicle performance');
        
        return reasons.join('. ');
    }

    /**
     * Get currency conversion preview
     */
    getCurrencyPreview(points) {
        const baseCurrency = Math.floor(points * this.currencySettings.conversionRate);
        
        // Calculate potential bonuses
        const sessionStats = this.scoringSystem.getSessionStats();
        const achievementBonus = sessionStats.achievements.length * 0.05; // 5% per achievement
        const bonusMultiplier = 1 + achievementBonus;
        
        const totalCurrency = Math.floor(baseCurrency * bonusMultiplier);
        
        return {
            points,
            baseCurrency,
            bonusMultiplier,
            totalCurrency,
            conversionRate: this.currencySettings.conversionRate
        };
    }

    /**
     * Calculate precise currency conversion with all bonuses
     */
    calculateCurrencyConversion(sessionData) {
        const { points, achievements = [], bonusMultipliers = {} } = sessionData;
        
        // Base currency from points
        const baseCurrency = Math.floor(points * this.currencySettings.conversionRate);
        
        // Achievement bonus
        const achievementBonus = achievements.length * 0.05;
        
        // Additional bonus multipliers (combo, distance, time, etc.)
        let totalBonusMultiplier = 1.0 + achievementBonus;
        Object.values(bonusMultipliers).forEach(multiplier => {
            totalBonusMultiplier += (multiplier - 1.0);
        });
        
        // Cap the bonus multiplier to prevent excessive rewards
        totalBonusMultiplier = Math.min(totalBonusMultiplier, 3.0);
        
        const totalCurrency = Math.floor(baseCurrency * totalBonusMultiplier);
        
        return {
            points,
            baseCurrency,
            achievementBonus,
            bonusMultipliers,
            totalBonusMultiplier,
            totalCurrency,
            conversionRate: this.currencySettings.conversionRate
        };
    }

    /**
     * Get integration statistics
     */
    getIntegrationStats() {
        const sessionStats = this.scoringSystem.getSessionStats();
        const currencyPreview = this.getCurrencyPreview(sessionStats.totalPoints);
        
        return {
            session: {
                points: sessionStats.totalPoints,
                zombiesKilled: sessionStats.zombiesKilled,
                achievements: sessionStats.achievements.length
            },
            currency: {
                current: this.upgradeManager.getPlayerCurrency(),
                potential: currencyPreview.totalCurrency,
                conversionRate: this.currencySettings.conversionRate
            },
            upgrades: {
                totalVehicles: this.upgradeManager.getPlayerVehicles().length,
                affordableUpgrades: this._countAffordableUpgrades()
            }
        };
    }

    /**
     * Count total affordable upgrades across all vehicles
     */
    _countAffordableUpgrades() {
        try {
            const vehicles = this.upgradeManager.getPlayerVehicles();
            let count = 0;
            
            vehicles.forEach(vehicle => {
                try {
                    if (this.upgradeManager.canAffordAnyUpgrade(vehicle.id)) {
                        const upgrades = this.upgradeManager.getVehicleUpgrades(vehicle.id);
                        Object.values(upgrades.upgrades).forEach(upgrade => {
                            if (!upgrade.isMaxLevel && upgrade.canAfford) {
                                count++;
                            }
                        });
                    }
                } catch (error) {
                    // Skip vehicles that can't be processed
                    console.warn(`Failed to process vehicle ${vehicle.id}:`, error.message);
                }
            });
            
            return count;
        } catch (error) {
            console.error('Failed to count affordable upgrades:', error);
            return 0;
        }
    }

    /**
     * Update currency conversion settings
     */
    updateCurrencySettings(settings) {
        this.currencySettings = { ...this.currencySettings, ...settings };
        
        this.emit('settingsUpdated', this.currencySettings);
        console.log('Currency settings updated:', this.currencySettings);
    }

    /**
     * Force sync currency with backend
     */
    async syncCurrency() {
        try {
            await this.upgradeManager.loadPlayerCurrency();
            console.log('Currency synced with backend');
            return true;
        } catch (error) {
            console.error('Failed to sync currency:', error);
            throw error;
        }
    }

    /**
     * Validate upgrade calculations and currency conversion
     */
    validateUpgradeCalculations(vehicleId) {
        try {
            const vehicleUpgrades = this.upgradeManager.getVehicleUpgrades(vehicleId);
            const playerCurrency = this.upgradeManager.getPlayerCurrency();
            
            const validationResults = {
                vehicleId,
                playerCurrency,
                validUpgrades: 0,
                invalidUpgrades: 0,
                totalUpgradeCost: 0,
                affordableUpgrades: 0,
                errors: []
            };
            
            Object.entries(vehicleUpgrades.upgrades).forEach(([category, upgrade]) => {
                try {
                    // Validate upgrade cost calculation
                    if (upgrade.cost < 0) {
                        validationResults.errors.push(`${category}: Negative cost ${upgrade.cost}`);
                        validationResults.invalidUpgrades++;
                        return;
                    }
                    
                    // Validate level progression
                    if (upgrade.currentLevel < 0 || upgrade.currentLevel > upgrade.maxLevel) {
                        validationResults.errors.push(`${category}: Invalid level ${upgrade.currentLevel}/${upgrade.maxLevel}`);
                        validationResults.invalidUpgrades++;
                        return;
                    }
                    
                    // Validate affordability calculation
                    const expectedAffordable = !upgrade.isMaxLevel && playerCurrency >= upgrade.cost;
                    if (upgrade.canAfford !== expectedAffordable) {
                        validationResults.errors.push(`${category}: Affordability mismatch - expected ${expectedAffordable}, got ${upgrade.canAfford}`);
                        validationResults.invalidUpgrades++;
                        return;
                    }
                    
                    validationResults.validUpgrades++;
                    if (!upgrade.isMaxLevel) {
                        validationResults.totalUpgradeCost += upgrade.cost;
                        if (upgrade.canAfford) {
                            validationResults.affordableUpgrades++;
                        }
                    }
                    
                } catch (error) {
                    validationResults.errors.push(`${category}: Validation error - ${error.message}`);
                    validationResults.invalidUpgrades++;
                }
            });
            
            return validationResults;
            
        } catch (error) {
            return {
                vehicleId,
                error: error.message,
                validUpgrades: 0,
                invalidUpgrades: 0,
                totalUpgradeCost: 0,
                affordableUpgrades: 0,
                errors: [error.message]
            };
        }
    }

    /**
     * Get detailed currency conversion breakdown
     */
    getCurrencyConversionBreakdown() {
        const sessionStats = this.scoringSystem.getSessionStats();
        const conversionData = this.calculateCurrencyConversion({
            points: sessionStats.totalPoints,
            achievements: sessionStats.achievements,
            bonusMultipliers: {
                combo: sessionStats.maxComboMultiplier,
                distance: Math.min(sessionStats.distanceTraveled / 10000, 1.2),
                time: Math.min(sessionStats.timeElapsed / 300000, 1.1)
            }
        });
        
        return {
            session: sessionStats,
            conversion: conversionData,
            settings: this.currencySettings,
            timestamp: Date.now()
        };
    }

    /**
     * Dispose of the integration system
     */
    dispose() {
        this.removeAllListeners();
        this.isInitialized = false;
        
        console.log('UpgradeIntegration disposed');
    }
}