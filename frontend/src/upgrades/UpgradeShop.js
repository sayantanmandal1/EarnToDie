/**
 * Vehicle Upgrade Shop System for Zombie Car Game
 * Handles upgrade purchases, cost calculations, and visual enhancements
 */

import { UpgradeConfig, VehicleTypes } from '../save/GameDataModels.js';

export class UpgradeShop {
    constructor(saveManager) {
        this.saveManager = saveManager;
        this.categories = UpgradeConfig.categories;
        this.maxLevel = UpgradeConfig.maxLevel;
        this.baseCosts = UpgradeConfig.baseCosts;
        this.costMultiplier = UpgradeConfig.costMultiplier;
        this.effects = UpgradeConfig.effects;
        
        // Event listeners for upgrade purchases
        this.listeners = new Map();
    }
    
    /**
     * Get all upgrade categories with their information
     */
    getUpgradeCategories() {
        return this.categories.map(category => ({
            id: category,
            name: this.getCategoryDisplayName(category),
            description: this.effects[category].description,
            icon: this.getCategoryIcon(category),
            visual: this.effects[category].visual,
            statAffected: this.effects[category].stat,
            multiplier: this.effects[category].multiplier
        }));
    }
    
    /**
     * Get upgrade information for a specific vehicle and category
     */
    getUpgradeInfo(vehicleType, category) {
        if (!this.categories.includes(category)) {
            throw new Error(`Invalid upgrade category: ${category}`);
        }
        
        if (!VehicleTypes[vehicleType]) {
            throw new Error(`Invalid vehicle type: ${vehicleType}`);
        }
        
        const saveData = this.saveManager.getSaveData();
        const vehicleUpgrades = saveData.vehicles.upgrades[vehicleType] || {};
        const currentLevel = vehicleUpgrades[category] || 0;
        
        const cost = this.calculateUpgradeCost(category, currentLevel);
        const nextLevelCost = currentLevel < this.maxLevel ? 
            this.calculateUpgradeCost(category, currentLevel + 1) : null;
        
        const baseStats = VehicleTypes[vehicleType].baseStats;
        const currentEffect = this.calculateUpgradeEffect(category, currentLevel, baseStats);
        const nextLevelEffect = currentLevel < this.maxLevel ? 
            this.calculateUpgradeEffect(category, currentLevel + 1, baseStats) : null;
        
        return {
            category,
            vehicleType,
            currentLevel,
            maxLevel: this.maxLevel,
            cost,
            nextLevelCost,
            canUpgrade: this.canUpgrade(vehicleType, category),
            canAfford: this.canAffordUpgrade(vehicleType, category),
            currentEffect,
            nextLevelEffect,
            effectIncrease: nextLevelEffect ? nextLevelEffect - currentEffect : 0,
            description: this.effects[category].description,
            visual: this.effects[category].visual,
            isMaxLevel: currentLevel >= this.maxLevel
        };
    }
    
    /**
     * Get all upgrade information for a specific vehicle
     */
    getVehicleUpgrades(vehicleType) {
        return this.categories.map(category => 
            this.getUpgradeInfo(vehicleType, category)
        );
    }
    
    /**
     * Calculate upgrade cost for a specific category and level
     */
    calculateUpgradeCost(category, currentLevel) {
        if (currentLevel >= this.maxLevel) {
            return null; // Max level reached
        }
        
        const baseCost = this.baseCosts[category];
        return Math.round(baseCost * Math.pow(this.costMultiplier, currentLevel));
    }
    
    /**
     * Calculate the effect value of an upgrade at a specific level
     */
    calculateUpgradeEffect(category, level, baseStats) {
        if (level <= 0) return 0;
        
        const effect = this.effects[category];
        const baseStat = baseStats[category] || 0;
        
        // Calculate the effective increase
        const multiplier = 1 + (effect.multiplier * level);
        const upgradedValue = Math.round(baseStat * multiplier);
        
        return upgradedValue - baseStat;
    }
    
    /**
     * Check if a vehicle can be upgraded in a specific category
     */
    canUpgrade(vehicleType, category) {
        const saveData = this.saveManager.getSaveData();
        const vehicleUpgrades = saveData.vehicles.upgrades[vehicleType] || {};
        const currentLevel = vehicleUpgrades[category] || 0;
        
        // Check if vehicle is owned
        if (!saveData.vehicles.owned.includes(vehicleType)) {
            return { canUpgrade: false, reason: 'Vehicle not owned' };
        }
        
        // Check if max level reached
        if (currentLevel >= this.maxLevel) {
            return { canUpgrade: false, reason: 'Max level reached' };
        }
        
        return { canUpgrade: true };
    }
    
    /**
     * Check if player can afford an upgrade
     */
    canAffordUpgrade(vehicleType, category) {
        const upgradeCheck = this.canUpgrade(vehicleType, category);
        if (!upgradeCheck.canUpgrade) {
            return upgradeCheck;
        }
        
        const saveData = this.saveManager.getSaveData();
        const vehicleUpgrades = saveData.vehicles.upgrades[vehicleType] || {};
        const currentLevel = vehicleUpgrades[category] || 0;
        const cost = this.calculateUpgradeCost(category, currentLevel);
        
        if (saveData.player.money < cost) {
            return { 
                canUpgrade: false, 
                reason: 'Insufficient funds',
                required: cost,
                available: saveData.player.money,
                shortfall: cost - saveData.player.money
            };
        }
        
        return { canUpgrade: true, cost };
    }
    
    /**
     * Purchase an upgrade for a specific vehicle and category
     */
    purchaseUpgrade(vehicleType, category) {
        const affordabilityCheck = this.canAffordUpgrade(vehicleType, category);
        
        if (!affordabilityCheck.canUpgrade) {
            throw new Error(`Cannot purchase upgrade: ${affordabilityCheck.reason}`);
        }
        
        const saveData = this.saveManager.getSaveData();
        const cost = affordabilityCheck.cost;
        
        // Initialize vehicle upgrades if not exists
        if (!saveData.vehicles.upgrades[vehicleType]) {
            saveData.vehicles.upgrades[vehicleType] = {
                engine: 0, fuel: 0, armor: 0, weapon: 0, wheels: 0
            };
        }
        
        const vehicleUpgrades = saveData.vehicles.upgrades[vehicleType];
        const oldLevel = vehicleUpgrades[category] || 0;
        const newLevel = oldLevel + 1;
        
        // Deduct money
        saveData.player.money -= cost;
        
        // Apply upgrade
        vehicleUpgrades[category] = newLevel;
        
        // Save changes
        this.saveManager.saveToDisk();
        
        // Create upgrade result
        const result = {
            success: true,
            vehicleType,
            category,
            oldLevel,
            newLevel,
            cost,
            remainingMoney: saveData.player.money,
            visualChanges: this.getVisualChanges(vehicleType, category, newLevel),
            performanceChanges: this.getPerformanceChanges(vehicleType, category, oldLevel, newLevel)
        };
        
        // Emit upgrade event
        this.emit('upgradeCompleted', result);
        
        return result;
    }
    
    /**
     * Get visual changes that result from an upgrade
     */
    getVisualChanges(vehicleType, category, newLevel) {
        if (!this.effects[category]) {
            return [];
        }
        
        const visual = this.effects[category].visual;
        const changes = [];
        
        switch (category) {
            case 'engine':
                changes.push({
                    type: 'exhaust_enhancement',
                    level: newLevel,
                    description: `Enhanced exhaust system (Level ${newLevel})`
                });
                if (newLevel >= 3) {
                    changes.push({
                        type: 'turbo_charger',
                        level: newLevel - 2,
                        description: 'Turbo charger visible'
                    });
                }
                break;
                
            case 'fuel':
                changes.push({
                    type: 'fuel_tank_size',
                    level: newLevel,
                    description: `Larger fuel tank (Level ${newLevel})`
                });
                if (newLevel >= 3) {
                    changes.push({
                        type: 'external_fuel_tanks',
                        level: newLevel - 2,
                        description: 'External fuel tanks mounted'
                    });
                }
                break;
                
            case 'armor':
                changes.push({
                    type: 'armor_plating',
                    level: newLevel,
                    description: `Armor plating (Level ${newLevel})`
                });
                if (newLevel >= 2) {
                    changes.push({
                        type: 'reinforced_bumper',
                        level: newLevel - 1,
                        description: 'Reinforced front bumper'
                    });
                }
                if (newLevel >= 4) {
                    changes.push({
                        type: 'roll_cage',
                        level: newLevel - 3,
                        description: 'Protective roll cage'
                    });
                }
                break;
                
            case 'weapon':
                changes.push({
                    type: 'roof_mounted_gun',
                    level: newLevel,
                    description: `Roof-mounted weapon (Level ${newLevel})`
                });
                if (newLevel >= 2) {
                    changes.push({
                        type: 'muzzle_brake',
                        level: newLevel - 1,
                        description: 'Muzzle brake system'
                    });
                }
                if (newLevel >= 3) {
                    changes.push({
                        type: 'gun_turret',
                        level: newLevel - 2,
                        description: 'Rotating gun turret'
                    });
                }
                if (newLevel >= 4) {
                    changes.push({
                        type: 'dual_weapons',
                        level: newLevel - 3,
                        description: 'Dual weapon system'
                    });
                }
                break;
                
            case 'wheels':
                changes.push({
                    type: 'tire_upgrade',
                    level: newLevel,
                    description: `Performance tires (Level ${newLevel})`
                });
                if (newLevel >= 3) {
                    changes.push({
                        type: 'off_road_tires',
                        level: newLevel - 2,
                        description: 'Off-road tire treads'
                    });
                }
                if (newLevel >= 5) {
                    changes.push({
                        type: 'reinforced_rims',
                        level: 1,
                        description: 'Reinforced wheel rims'
                    });
                }
                break;
        }
        
        return changes;
    }
    
    /**
     * Get performance changes that result from an upgrade
     */
    getPerformanceChanges(vehicleType, category, oldLevel, newLevel) {
        const baseStats = VehicleTypes[vehicleType].baseStats;
        const oldEffect = this.calculateUpgradeEffect(category, oldLevel, baseStats);
        const newEffect = this.calculateUpgradeEffect(category, newLevel, baseStats);
        const improvement = newEffect - oldEffect;
        
        const changes = {
            category,
            oldLevel,
            newLevel,
            improvement,
            percentage: oldLevel > 0 ? ((newEffect / oldEffect - 1) * 100) : 100
        };
        
        // Add specific performance metrics
        switch (category) {
            case 'engine':
                changes.metrics = {
                    acceleration: `+${Math.round(improvement * 0.8)}%`,
                    topSpeed: `+${Math.round(improvement * 0.6)}%`,
                    fuelConsumption: `+${Math.round(improvement * 0.2)}%`
                };
                break;
                
            case 'fuel':
                changes.metrics = {
                    fuelCapacity: `+${Math.round(improvement)}L`,
                    range: `+${Math.round(improvement * 10)}m`
                };
                break;
                
            case 'armor':
                changes.metrics = {
                    damageReduction: `+${Math.round(improvement * 0.5)}%`,
                    durability: `+${Math.round(improvement)}%`
                };
                break;
                
            case 'weapon':
                changes.metrics = {
                    damage: `+${Math.round(improvement)}%`,
                    fireRate: `+${Math.round(improvement * 0.3)}%`
                };
                break;
                
            case 'wheels':
                changes.metrics = {
                    handling: `+${Math.round(improvement)}%`,
                    traction: `+${Math.round(improvement * 0.8)}%`,
                    stability: `+${Math.round(improvement * 0.6)}%`
                };
                break;
        }
        
        return changes;
    }
    
    /**
     * Get total upgrade cost for all categories of a vehicle
     */
    getTotalUpgradeCost(vehicleType) {
        const saveData = this.saveManager.getSaveData();
        const vehicleUpgrades = saveData.vehicles.upgrades[vehicleType] || {};
        
        let totalCost = 0;
        let totalSpent = 0;
        
        this.categories.forEach(category => {
            const currentLevel = vehicleUpgrades[category] || 0;
            
            // Calculate spent cost
            for (let level = 0; level < currentLevel; level++) {
                totalSpent += this.calculateUpgradeCost(category, level);
            }
            
            // Calculate remaining cost to max
            for (let level = currentLevel; level < this.maxLevel; level++) {
                totalCost += this.calculateUpgradeCost(category, level);
            }
        });
        
        return {
            totalSpent,
            totalRemaining: totalCost,
            totalToMax: totalSpent + totalCost,
            completionPercentage: totalCost > 0 ? (totalSpent / (totalSpent + totalCost)) * 100 : 100
        };
    }
    
    /**
     * Get upgrade recommendations based on player's playstyle
     */
    getUpgradeRecommendations(vehicleType, playerStats) {
        const recommendations = [];
        const saveData = this.saveManager.getSaveData();
        const vehicleUpgrades = saveData.vehicles.upgrades[vehicleType] || {};
        
        // Analyze player statistics to make recommendations
        const avgDistance = playerStats.averageRunDistance || 0;
        const zombieKillRatio = playerStats.totalZombiesKilled / Math.max(1, playerStats.totalRuns);
        const survivalTime = playerStats.longestSurvivalTime || 0;
        
        // Fuel recommendation for long-distance players
        if (avgDistance > 5000 && vehicleUpgrades.fuel < 3) {
            recommendations.push({
                category: 'fuel',
                priority: 'high',
                reason: 'Your long-distance runs would benefit from increased fuel capacity',
                expectedBenefit: 'Extend runs by 25-40%'
            });
        }
        
        // Weapon recommendation for zombie-heavy encounters
        if (zombieKillRatio > 10 && vehicleUpgrades.weapon < 3) {
            recommendations.push({
                category: 'weapon',
                priority: 'high',
                reason: 'You encounter many zombies - better weapons will help clear the path',
                expectedBenefit: 'Faster zombie elimination, less vehicle damage'
            });
        }
        
        // Armor recommendation for players taking lots of damage
        if (playerStats.totalObstaclesHit > playerStats.totalRuns * 5 && vehicleUpgrades.armor < 3) {
            recommendations.push({
                category: 'armor',
                priority: 'medium',
                reason: 'Armor upgrades will help you survive more collisions',
                expectedBenefit: 'Reduce damage taken by 15-30%'
            });
        }
        
        // Engine recommendation for speed-focused players
        if (survivalTime < avgDistance / 20 && vehicleUpgrades.engine < 3) {
            recommendations.push({
                category: 'engine',
                priority: 'medium',
                reason: 'Engine upgrades will help you move faster through dangerous areas',
                expectedBenefit: 'Increase speed and acceleration by 20-35%'
            });
        }
        
        // Wheels recommendation for handling issues
        if (vehicleUpgrades.wheels < 2) {
            recommendations.push({
                category: 'wheels',
                priority: 'low',
                reason: 'Better wheels improve handling on rough terrain',
                expectedBenefit: 'Better control and stability'
            });
        }
        
        return recommendations.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }
    
    /**
     * Get category display name
     */
    getCategoryDisplayName(category) {
        const displayNames = {
            engine: 'Engine',
            fuel: 'Fuel System',
            armor: 'Armor',
            weapon: 'Weapons',
            wheels: 'Wheels & Tires'
        };
        return displayNames[category] || category;
    }
    
    /**
     * Get category icon
     */
    getCategoryIcon(category) {
        const icons = {
            engine: '⚙️',
            fuel: '⛽',
            armor: '🛡️',
            weapon: '🔫',
            wheels: '🛞'
        };
        return icons[category] || '❓';
    }
    
    /**
     * Add event listener
     */
    addEventListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    /**
     * Remove event listener
     */
    removeEventListener(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    /**
     * Emit event
     */
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }
    
    /**
     * Get upgrade shop statistics
     */
    getShopStatistics() {
        const saveData = this.saveManager.getSaveData();
        const ownedVehicles = saveData.vehicles.owned;
        
        let totalUpgrades = 0;
        let totalSpent = 0;
        let maxPossibleUpgrades = 0;
        
        ownedVehicles.forEach(vehicleType => {
            const vehicleUpgrades = saveData.vehicles.upgrades[vehicleType] || {};
            const costInfo = this.getTotalUpgradeCost(vehicleType);
            
            totalSpent += costInfo.totalSpent;
            maxPossibleUpgrades += this.categories.length * this.maxLevel;
            
            this.categories.forEach(category => {
                totalUpgrades += vehicleUpgrades[category] || 0;
            });
        });
        
        return {
            totalUpgrades,
            maxPossibleUpgrades,
            totalSpent,
            upgradeCompletionPercentage: maxPossibleUpgrades > 0 ? 
                (totalUpgrades / maxPossibleUpgrades) * 100 : 0,
            averageUpgradeLevel: maxPossibleUpgrades > 0 ? 
                totalUpgrades / maxPossibleUpgrades * this.maxLevel : 0,
            ownedVehicles: ownedVehicles.length,
            fullyUpgradedVehicles: this.getFullyUpgradedVehicles().length
        };
    }
    
    /**
     * Get list of fully upgraded vehicles
     */
    getFullyUpgradedVehicles() {
        const saveData = this.saveManager.getSaveData();
        const ownedVehicles = saveData.vehicles.owned;
        
        return ownedVehicles.filter(vehicleType => {
            const vehicleUpgrades = saveData.vehicles.upgrades[vehicleType] || {};
            return this.categories.every(category => 
                (vehicleUpgrades[category] || 0) >= this.maxLevel
            );
        });
    }
    
    /**
     * Reset all upgrades for a vehicle (for testing or respec)
     */
    resetVehicleUpgrades(vehicleType) {
        const saveData = this.saveManager.getSaveData();
        
        if (!saveData.vehicles.owned.includes(vehicleType)) {
            throw new Error(`Vehicle ${vehicleType} is not owned`);
        }
        
        const vehicleUpgrades = saveData.vehicles.upgrades[vehicleType] || {};
        const refundAmount = this.getTotalUpgradeCost(vehicleType).totalSpent;
        
        // Reset upgrades
        saveData.vehicles.upgrades[vehicleType] = {
            engine: 0, fuel: 0, armor: 0, weapon: 0, wheels: 0
        };
        
        // Refund money (partial refund - 75%)
        const refund = Math.round(refundAmount * 0.75);
        saveData.player.money += refund;
        
        // Save changes
        this.saveManager.saveToDisk();
        
        // Emit reset event
        this.emit('upgradesReset', {
            vehicleType,
            refundAmount: refund,
            totalRefunded: refundAmount
        });
        
        return {
            success: true,
            vehicleType,
            refundAmount: refund,
            newMoney: saveData.player.money
        };
    }
}

export default UpgradeShop;