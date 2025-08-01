import { EventEmitter } from 'events';

/**
 * UpgradeManager handles vehicle upgrade system including purchase, effects, and persistence
 * Integrates with currency system and backend APIs for upgrade management
 */
export class UpgradeManager extends EventEmitter {
    constructor(gameEngine, apiClient) {
        super();
        
        this.gameEngine = gameEngine;
        this.apiClient = apiClient;
        
        // Upgrade categories and their effects
        this.upgradeCategories = {
            engine: {
                name: 'Engine',
                description: 'Increases speed and acceleration',
                icon: '⚡',
                maxLevel: 5,
                effects: {
                    speed: 5,        // +5 speed per level
                    acceleration: 3  // +3 acceleration per level
                }
            },
            armor: {
                name: 'Armor',
                description: 'Increases damage resistance',
                icon: '🛡️',
                maxLevel: 5,
                effects: {
                    armor: 10        // +10 armor per level
                }
            },
            weapons: {
                name: 'Weapons',
                description: 'Increases damage output',
                icon: '⚔️',
                maxLevel: 5,
                effects: {
                    damage: 8        // +8 damage per level
                }
            },
            fuel: {
                name: 'Fuel System',
                description: 'Increases fuel capacity and efficiency',
                icon: '⛽',
                maxLevel: 5,
                effects: {
                    fuelCapacity: 20 // +20 fuel capacity per level
                }
            },
            tires: {
                name: 'Tires',
                description: 'Improves handling and traction',
                icon: '🏎️',
                maxLevel: 5,
                effects: {
                    handling: 4      // +4 handling per level
                }
            }
        };
        
        // Current player vehicles and their upgrades
        this.playerVehicles = new Map();
        
        // Available vehicle configurations from backend
        this.vehicleConfigs = new Map();
        
        // Current player currency
        this.playerCurrency = 0;
        
        console.log('UpgradeManager initialized');
    }

    /**
     * Initialize the upgrade manager by loading player data
     */
    async initialize() {
        try {
            await this.loadVehicleConfigs();
            await this.loadPlayerVehicles();
            await this.loadPlayerCurrency();
            
            console.log('UpgradeManager initialized successfully');
            this.emit('initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize UpgradeManager:', error);
            throw error;
        }
    }

    /**
     * Load available vehicle configurations from backend
     */
    async loadVehicleConfigs() {
        try {
            const response = await this.apiClient.get('/api/v1/vehicles/available');
            const configs = response.data.vehicles;
            
            this.vehicleConfigs.clear();
            Object.entries(configs).forEach(([type, config]) => {
                this.vehicleConfigs.set(type, config);
            });
            
            console.log(`Loaded ${this.vehicleConfigs.size} vehicle configurations`);
        } catch (error) {
            console.error('Failed to load vehicle configurations:', error);
            throw error;
        }
    }

    /**
     * Load player's owned vehicles and their upgrade levels
     */
    async loadPlayerVehicles() {
        try {
            const response = await this.apiClient.get('/api/v1/vehicles');
            const vehicles = response.data.vehicles;
            
            this.playerVehicles.clear();
            vehicles.forEach(vehicle => {
                this.playerVehicles.set(vehicle.id, vehicle);
            });
            
            console.log(`Loaded ${this.playerVehicles.size} player vehicles`);
            this.emit('vehiclesLoaded', Array.from(this.playerVehicles.values()));
        } catch (error) {
            console.error('Failed to load player vehicles:', error);
            throw error;
        }
    }

    /**
     * Load current player currency
     */
    async loadPlayerCurrency() {
        try {
            const response = await this.apiClient.get('/api/v1/player/profile');
            this.playerCurrency = response.data.player.currency;
            
            console.log(`Player currency: ${this.playerCurrency}`);
            this.emit('currencyUpdated', this.playerCurrency);
        } catch (error) {
            console.error('Failed to load player currency:', error);
            throw error;
        }
    }

    /**
     * Get upgrade information for a specific vehicle and category
     */
    getUpgradeInfo(vehicleId, category) {
        const vehicle = this.playerVehicles.get(vehicleId);
        if (!vehicle) {
            throw new Error(`Vehicle ${vehicleId} not found`);
        }

        const categoryInfo = this.upgradeCategories[category];
        if (!categoryInfo) {
            throw new Error(`Invalid upgrade category: ${category}`);
        }

        const currentLevel = vehicle.upgrades[category] || 0;
        const nextLevel = currentLevel + 1;
        const isMaxLevel = currentLevel >= categoryInfo.maxLevel;
        
        // Get upgrade cost from vehicle config or calculate default
        const upgradeCost = vehicle.upgrade_costs?.[category] || this._calculateDefaultCost(category, currentLevel);
        
        // Calculate current and next level effects
        const currentEffects = this._calculateUpgradeEffects(category, currentLevel);
        const nextEffects = isMaxLevel ? currentEffects : this._calculateUpgradeEffects(category, nextLevel);
        
        return {
            category,
            categoryInfo,
            vehicleId,
            vehicleType: vehicle.vehicle_type,
            currentLevel,
            nextLevel,
            maxLevel: categoryInfo.maxLevel,
            isMaxLevel,
            cost: isMaxLevel ? 0 : upgradeCost,
            canAfford: !isMaxLevel && this.playerCurrency >= upgradeCost,
            currentEffects,
            nextEffects,
            improvement: this._calculateImprovement(currentEffects, nextEffects)
        };
    }

    /**
     * Purchase an upgrade for a vehicle
     */
    async purchaseUpgrade(vehicleId, category) {
        const upgradeInfo = this.getUpgradeInfo(vehicleId, category);
        
        if (upgradeInfo.isMaxLevel) {
            throw new Error(`${category} is already at maximum level`);
        }
        
        if (!upgradeInfo.canAfford) {
            throw new Error(`Insufficient funds. Need ${upgradeInfo.cost}, have ${this.playerCurrency}`);
        }

        try {
            // Send upgrade request to backend
            const response = await this.apiClient.post('/api/v1/vehicles/upgrade', {
                vehicle_id: vehicleId,
                upgrade_type: category
            });

            const updatedVehicle = response.data.vehicle;
            
            // Update local data
            this.playerVehicles.set(vehicleId, updatedVehicle);
            this.playerCurrency -= upgradeInfo.cost;
            
            // Apply upgrade effects to active vehicle if it matches
            this._applyUpgradeToActiveVehicle(vehicleId, category, upgradeInfo.nextLevel);
            
            // Emit events
            this.emit('upgradeCompleted', {
                vehicleId,
                category,
                newLevel: upgradeInfo.nextLevel,
                cost: upgradeInfo.cost,
                vehicle: updatedVehicle
            });
            
            this.emit('currencyUpdated', this.playerCurrency);
            
            console.log(`Upgraded ${category} to level ${upgradeInfo.nextLevel} for vehicle ${vehicleId}`);
            
            return {
                success: true,
                newLevel: upgradeInfo.nextLevel,
                remainingCurrency: this.playerCurrency,
                vehicle: updatedVehicle
            };
            
        } catch (error) {
            console.error('Failed to purchase upgrade:', error);
            
            // Handle specific error cases
            if (error.response?.status === 400) {
                const errorMessage = error.response.data.error;
                if (errorMessage.includes('Insufficient funds')) {
                    throw new Error('Insufficient funds');
                } else if (errorMessage.includes('Maximum upgrade level')) {
                    throw new Error('Maximum upgrade level reached');
                }
            }
            
            throw new Error('Failed to purchase upgrade. Please try again.');
        }
    }

    /**
     * Get all upgrades for a specific vehicle
     */
    getVehicleUpgrades(vehicleId) {
        const vehicle = this.playerVehicles.get(vehicleId);
        if (!vehicle) {
            throw new Error(`Vehicle ${vehicleId} not found`);
        }

        const upgrades = {};
        Object.keys(this.upgradeCategories).forEach(category => {
            upgrades[category] = this.getUpgradeInfo(vehicleId, category);
        });

        return {
            vehicleId,
            vehicleType: vehicle.vehicle_type,
            vehicleName: this.vehicleConfigs.get(vehicle.vehicle_type)?.name || vehicle.vehicle_type,
            currentStats: vehicle.current_stats,
            baseStats: vehicle.config?.base_stats,
            upgrades
        };
    }

    /**
     * Get upgrade preview showing stat changes
     */
    getUpgradePreview(vehicleId, category) {
        const vehicle = this.playerVehicles.get(vehicleId);
        if (!vehicle) {
            throw new Error(`Vehicle ${vehicleId} not found`);
        }

        const upgradeInfo = this.getUpgradeInfo(vehicleId, category);
        if (upgradeInfo.isMaxLevel) {
            return null;
        }

        const currentStats = vehicle.current_stats;
        const previewStats = { ...currentStats };
        
        // Apply upgrade effects to preview stats
        const effects = this.upgradeCategories[category].effects;
        Object.entries(effects).forEach(([stat, value]) => {
            if (previewStats[stat] !== undefined) {
                previewStats[stat] += value;
            }
        });

        return {
            category,
            currentLevel: upgradeInfo.currentLevel,
            nextLevel: upgradeInfo.nextLevel,
            cost: upgradeInfo.cost,
            currentStats,
            previewStats,
            statChanges: this._calculateStatChanges(currentStats, previewStats)
        };
    }

    /**
     * Calculate upgrade effects for a given category and level
     */
    _calculateUpgradeEffects(category, level) {
        const categoryInfo = this.upgradeCategories[category];
        const effects = {};
        
        Object.entries(categoryInfo.effects).forEach(([stat, valuePerLevel]) => {
            effects[stat] = valuePerLevel * level;
        });
        
        return effects;
    }

    /**
     * Calculate improvement between current and next level effects
     */
    _calculateImprovement(currentEffects, nextEffects) {
        const improvement = {};
        
        Object.keys(nextEffects).forEach(stat => {
            improvement[stat] = nextEffects[stat] - (currentEffects[stat] || 0);
        });
        
        return improvement;
    }

    /**
     * Calculate stat changes for preview
     */
    _calculateStatChanges(currentStats, previewStats) {
        const changes = {};
        
        Object.keys(previewStats).forEach(stat => {
            const current = currentStats[stat] || 0;
            const preview = previewStats[stat] || 0;
            const change = preview - current;
            
            if (change !== 0) {
                changes[stat] = {
                    current,
                    preview,
                    change,
                    percentage: current > 0 ? ((change / current) * 100).toFixed(1) : 0
                };
            }
        });
        
        return changes;
    }

    /**
     * Calculate default upgrade cost if not provided by backend
     */
    _calculateDefaultCost(category, currentLevel) {
        const baseCosts = {
            engine: 100,
            armor: 150,
            weapons: 200,
            fuel: 80,
            tires: 120
        };
        
        const baseCost = baseCosts[category] || 100;
        return Math.floor(baseCost * Math.pow(2, currentLevel));
    }

    /**
     * Apply upgrade effects to the currently active vehicle in the game
     */
    _applyUpgradeToActiveVehicle(vehicleId, category, newLevel) {
        // Check if this vehicle is currently active in the game
        const activeVehicle = this.gameEngine.getActiveVehicle?.();
        if (!activeVehicle || activeVehicle.id !== vehicleId) {
            return; // Vehicle is not currently active
        }

        // Apply the upgrade to the active vehicle
        activeVehicle.applyUpgrade(category, newLevel);
        
        console.log(`Applied ${category} upgrade level ${newLevel} to active vehicle`);
    }

    /**
     * Get player's current currency
     */
    getPlayerCurrency() {
        return this.playerCurrency;
    }

    /**
     * Update player currency (called by scoring system)
     */
    updatePlayerCurrency(newCurrency) {
        const oldCurrency = this.playerCurrency;
        this.playerCurrency = newCurrency;
        
        this.emit('currencyUpdated', this.playerCurrency, oldCurrency);
    }

    /**
     * Get all player vehicles
     */
    getPlayerVehicles() {
        return Array.from(this.playerVehicles.values());
    }

    /**
     * Get specific vehicle by ID
     */
    getVehicle(vehicleId) {
        return this.playerVehicles.get(vehicleId);
    }

    /**
     * Check if player can afford any upgrades for a vehicle
     */
    canAffordAnyUpgrade(vehicleId) {
        try {
            const upgrades = this.getVehicleUpgrades(vehicleId);
            return Object.values(upgrades.upgrades).some(upgrade => 
                !upgrade.isMaxLevel && upgrade.canAfford
            );
        } catch (error) {
            return false;
        }
    }

    /**
     * Get total upgrade cost for all categories to max level
     */
    getTotalUpgradeCost(vehicleId) {
        const vehicle = this.playerVehicles.get(vehicleId);
        if (!vehicle) {
            return 0;
        }

        let totalCost = 0;
        Object.keys(this.upgradeCategories).forEach(category => {
            const currentLevel = vehicle.upgrades[category] || 0;
            const maxLevel = this.upgradeCategories[category].maxLevel;
            
            for (let level = currentLevel; level < maxLevel; level++) {
                totalCost += this._calculateDefaultCost(category, level);
            }
        });

        return totalCost;
    }

    /**
     * Get upgrade statistics for a vehicle
     */
    getUpgradeStats(vehicleId) {
        const vehicle = this.playerVehicles.get(vehicleId);
        if (!vehicle) {
            return null;
        }

        const upgrades = vehicle.upgrades;
        const totalLevels = Object.values(upgrades).reduce((sum, level) => sum + level, 0);
        const maxPossibleLevels = Object.keys(this.upgradeCategories).length * 5; // 5 max level per category
        const upgradeProgress = (totalLevels / maxPossibleLevels) * 100;

        return {
            totalLevels,
            maxPossibleLevels,
            upgradeProgress: upgradeProgress.toFixed(1),
            categoryBreakdown: upgrades,
            isFullyUpgraded: totalLevels === maxPossibleLevels
        };
    }

    /**
     * Dispose of the upgrade manager
     */
    dispose() {
        this.playerVehicles.clear();
        this.vehicleConfigs.clear();
        this.removeAllListeners();
        
        console.log('UpgradeManager disposed');
    }
}