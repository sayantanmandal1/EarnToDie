/**
 * Vehicle System for Zombie Car Game
 * Handles vehicle progression, unlocking, and management
 */

import { VehicleTypes, UpgradeConfig } from '../save/GameDataModels.js';

export class VehicleSystem {
    constructor(saveManager) {
        this.saveManager = saveManager;
        this.vehicles = new Map();
        this.currentVehicle = null;
        
        // Initialize with default vehicles
        this.initializeVehicles();
    }
    
    /**
     * Initialize vehicle system with all vehicle types
     */
    initializeVehicles() {
        Object.keys(VehicleTypes).forEach(vehicleType => {
            const config = VehicleTypes[vehicleType];
            const vehicle = new VehicleInstance(vehicleType, config, this.saveManager);
            this.vehicles.set(vehicleType, vehicle);
        });
        
        // Set starter car as current if no vehicle selected
        const saveData = this.saveManager.getSaveData();
        if (!saveData.vehicles.selected || !this.vehicles.has(saveData.vehicles.selected)) {
            this.currentVehicle = this.vehicles.get('STARTER_CAR');
        } else {
            this.currentVehicle = this.vehicles.get(saveData.vehicles.selected);
        }
    }
    
    /**
     * Get all available vehicles
     */
    getAllVehicles() {
        return Array.from(this.vehicles.values());
    }
    
    /**
     * Get unlocked vehicles based on player progress
     */
    getUnlockedVehicles() {
        const saveData = this.saveManager.getSaveData();
        const playerStats = saveData.player;
        
        return this.getAllVehicles().filter(vehicle => {
            return this.isVehicleUnlocked(vehicle.type, playerStats);
        });
    }
    
    /**
     * Get locked vehicles that can potentially be unlocked
     */
    getLockedVehicles() {
        const saveData = this.saveManager.getSaveData();
        const playerStats = saveData.player;
        
        return this.getAllVehicles().filter(vehicle => {
            return !this.isVehicleUnlocked(vehicle.type, playerStats);
        });
    }
    
    /**
     * Check if a vehicle is unlocked
     */
    isVehicleUnlocked(vehicleType, playerStats) {
        const vehicleConfig = VehicleTypes[vehicleType];
        if (!vehicleConfig) return false;
        
        // Starter car is always unlocked
        if (vehicleType === 'STARTER_CAR') return true;
        
        // Check distance requirement
        const hasDistance = playerStats.bestDistance >= vehicleConfig.unlockDistance;
        
        // Check if player owns the vehicle
        const saveData = this.saveManager.getSaveData();
        const isOwned = saveData.vehicles.owned.includes(vehicleType);
        
        return hasDistance && isOwned;
    }
    
    /**
     * Check if a vehicle can be purchased
     */
    canPurchaseVehicle(vehicleType) {
        const saveData = this.saveManager.getSaveData();
        const vehicleConfig = VehicleTypes[vehicleType];
        
        if (!vehicleConfig) return { canPurchase: false, reason: 'Invalid vehicle type' };
        
        // Check if already owned
        if (saveData.vehicles.owned.includes(vehicleType)) {
            return { canPurchase: false, reason: 'Already owned' };
        }
        
        // Check distance requirement
        if (saveData.player.bestDistance < vehicleConfig.unlockDistance) {
            return { 
                canPurchase: false, 
                reason: 'Distance requirement not met',
                requiredDistance: vehicleConfig.unlockDistance,
                currentDistance: saveData.player.bestDistance
            };
        }
        
        // Check money requirement
        if (saveData.player.money < vehicleConfig.cost) {
            return { 
                canPurchase: false, 
                reason: 'Insufficient funds',
                requiredMoney: vehicleConfig.cost,
                currentMoney: saveData.player.money
            };
        }
        
        return { canPurchase: true };
    }
    
    /**
     * Purchase a vehicle
     */
    purchaseVehicle(vehicleType) {
        const purchaseCheck = this.canPurchaseVehicle(vehicleType);
        
        if (!purchaseCheck.canPurchase) {
            throw new Error(`Cannot purchase vehicle: ${purchaseCheck.reason}`);
        }
        
        const vehicleConfig = VehicleTypes[vehicleType];
        const saveData = this.saveManager.getSaveData();
        
        // Deduct money
        saveData.player.money -= vehicleConfig.cost;
        
        // Add to owned vehicles
        saveData.vehicles.owned.push(vehicleType);
        
        // Initialize upgrades for the new vehicle
        saveData.vehicles.upgrades[vehicleType] = {
            engine: 0,
            fuel: 0,
            armor: 0,
            weapon: 0,
            wheels: 0
        };
        
        // Save the changes
        this.saveManager.saveToDisk();
        
        return {
            success: true,
            vehicleType,
            cost: vehicleConfig.cost,
            remainingMoney: saveData.player.money
        };
    }
    
    /**
     * Select a vehicle as current
     */
    selectVehicle(vehicleType) {
        if (!this.vehicles.has(vehicleType)) {
            throw new Error(`Vehicle type ${vehicleType} not found`);
        }
        
        const saveData = this.saveManager.getSaveData();
        
        // Check if vehicle is owned
        if (!saveData.vehicles.owned.includes(vehicleType)) {
            throw new Error(`Vehicle ${vehicleType} is not owned`);
        }
        
        // Set as current vehicle
        this.currentVehicle = this.vehicles.get(vehicleType);
        saveData.vehicles.selected = vehicleType;
        
        // Save the change
        this.saveManager.saveToDisk();
        
        return this.currentVehicle;
    }
    
    /**
     * Get current vehicle
     */
    getCurrentVehicle() {
        return this.currentVehicle;
    }
    
    /**
     * Get vehicle by type
     */
    getVehicle(vehicleType) {
        return this.vehicles.get(vehicleType);
    }
    
    /**
     * Get vehicle unlock progress
     */
    getVehicleUnlockProgress() {
        const saveData = this.saveManager.getSaveData();
        const playerStats = saveData.player;
        
        return Object.keys(VehicleTypes).map(vehicleType => {
            const config = VehicleTypes[vehicleType];
            const isUnlocked = this.isVehicleUnlocked(vehicleType, playerStats);
            const isOwned = saveData.vehicles.owned.includes(vehicleType);
            const canPurchase = this.canPurchaseVehicle(vehicleType);
            
            return {
                type: vehicleType,
                name: config.name,
                description: config.description,
                cost: config.cost,
                unlockDistance: config.unlockDistance,
                isUnlocked,
                isOwned,
                canPurchase: canPurchase.canPurchase,
                purchaseInfo: canPurchase,
                distanceProgress: Math.min(1, playerStats.bestDistance / config.unlockDistance),
                remainingDistance: Math.max(0, config.unlockDistance - playerStats.bestDistance)
            };
        });
    }
}

/**
 * Vehicle Instance class
 * Represents a single vehicle with its stats and upgrades
 */
export class VehicleInstance {
    constructor(type, config, saveManager) {
        this.type = type;
        this.config = config;
        this.saveManager = saveManager;
        
        // Vehicle state
        this.health = 100;
        this.fuel = 0;
        this.position = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.rotation = 0;
        
        // Visual properties
        this.weatheringLevel = this.calculateWeatheringLevel();
        this.damageLevel = 0;
        
        // Initialize fuel to capacity
        this.refillFuel();
    }
    
    /**
     * Get base stats from configuration
     */
    getBaseStats() {
        return { ...this.config.baseStats };
    }
    
    /**
     * Get current upgrades for this vehicle
     */
    getCurrentUpgrades() {
        const saveData = this.saveManager.getSaveData();
        return saveData.vehicles.upgrades[this.type] || {
            engine: 0,
            fuel: 0,
            armor: 0,
            weapon: 0,
            wheels: 0
        };
    }
    
    /**
     * Get effective stats with upgrades applied
     */
    getEffectiveStats() {
        const baseStats = this.getBaseStats();
        const upgrades = this.getCurrentUpgrades();
        const effectiveStats = { ...baseStats };
        
        // Apply upgrade multipliers
        Object.keys(upgrades).forEach(category => {
            const upgradeLevel = upgrades[category];
            const effect = UpgradeConfig.effects[category];
            
            if (effect && upgradeLevel > 0) {
                const multiplier = 1 + (effect.multiplier * upgradeLevel);
                
                // Apply to relevant stats
                switch (category) {
                    case 'engine':
                        effectiveStats.engine = Math.round(baseStats.engine * multiplier);
                        break;
                    case 'fuel':
                        effectiveStats.fuel = Math.round(baseStats.fuel * multiplier);
                        break;
                    case 'armor':
                        effectiveStats.armor = Math.round(baseStats.armor * multiplier);
                        break;
                    case 'weapon':
                        effectiveStats.weapon = Math.round(baseStats.weapon * multiplier);
                        break;
                    case 'wheels':
                        effectiveStats.wheels = Math.round(baseStats.wheels * multiplier);
                        break;
                }
            }
        });
        
        return effectiveStats;
    }
    
    /**
     * Get fuel capacity based on upgrades
     */
    getFuelCapacity() {
        const stats = this.getEffectiveStats();
        return stats.fuel;
    }
    
    /**
     * Get fuel consumption rate
     */
    getFuelConsumptionRate() {
        const baseRate = 1.0; // Base fuel consumption per second
        const stats = this.getEffectiveStats();
        
        // Larger engines consume more fuel
        const engineMultiplier = 1 + (stats.engine / 100) * 0.5;
        
        // Better fuel upgrades reduce consumption
        const upgrades = this.getCurrentUpgrades();
        const efficiencyMultiplier = 1 - (upgrades.fuel * 0.1); // 10% better efficiency per upgrade
        
        return baseRate * engineMultiplier * Math.max(0.5, efficiencyMultiplier);
    }
    
    /**
     * Consume fuel over time
     */
    consumeFuel(deltaTime, throttleInput = 0) {
        if (this.fuel <= 0) return false;
        
        const consumptionRate = this.getFuelConsumptionRate();
        const throttleMultiplier = 0.1 + (Math.abs(throttleInput) * 0.9); // 10% idle, up to 100% at full throttle
        
        const fuelConsumed = consumptionRate * throttleMultiplier * (deltaTime / 1000);
        this.fuel = Math.max(0, this.fuel - fuelConsumed);
        
        return this.fuel > 0;
    }
    
    /**
     * Refill fuel to capacity
     */
    refillFuel() {
        this.fuel = this.getFuelCapacity();
    }
    
    /**
     * Get fuel percentage
     */
    getFuelPercentage() {
        return this.fuel / this.getFuelCapacity();
    }
    
    /**
     * Check if vehicle is out of fuel
     */
    isOutOfFuel() {
        return this.fuel <= 0;
    }
    
    /**
     * Take damage
     */
    takeDamage(amount) {
        if (this.health <= 0 || amount < 0) return 0;
        
        const stats = this.getEffectiveStats();
        const armorReduction = Math.min(0.8, stats.armor * 0.01); // Max 80% damage reduction
        const actualDamage = amount * (1 - armorReduction);
        
        this.health = Math.max(0, this.health - actualDamage);
        this.damageLevel = 1 - (this.health / 100);
        
        return actualDamage;
    }
    
    /**
     * Repair vehicle
     */
    repair(amount) {
        if (amount < 0) return;
        this.health = Math.min(100, this.health + amount);
        this.damageLevel = 1 - (this.health / 100);
    }
    
    /**
     * Check if vehicle is destroyed
     */
    isDestroyed() {
        return this.health <= 0;
    }
    
    /**
     * Get health percentage
     */
    getHealthPercentage() {
        return this.health / 100;
    }
    
    /**
     * Calculate weathering level based on vehicle type and age
     */
    calculateWeatheringLevel() {
        // Different vehicles have different weathering levels
        const weatheringMap = {
            'STARTER_CAR': 0.8,    // Very weathered
            'OLD_TRUCK': 0.7,      // Quite weathered
            'SPORTS_CAR': 0.3,     // Less weathered
            'MONSTER_TRUCK': 0.5,  // Moderately weathered
            'ARMORED_VAN': 0.4     // Less weathered due to armor
        };
        
        return weatheringMap[this.type] || 0.5;
    }
    
    /**
     * Get visual appearance data
     */
    getVisualAppearance() {
        const upgrades = this.getCurrentUpgrades();
        
        return {
            weatheringLevel: this.weatheringLevel,
            damageLevel: this.damageLevel,
            rustLevel: Math.min(1, this.weatheringLevel + (this.damageLevel * 0.3)),
            upgrades: {
                hasEngineUpgrades: upgrades.engine > 0,
                hasArmorPlating: upgrades.armor > 0,
                hasWeapons: upgrades.weapon > 0,
                hasFuelTanks: upgrades.fuel > 2,
                hasWheelUpgrades: upgrades.wheels > 0
            },
            colors: this.getVehicleColors(),
            modifications: this.getVisualModifications()
        };
    }
    
    /**
     * Get vehicle colors based on type and weathering
     */
    getVehicleColors() {
        const baseColors = {
            'STARTER_CAR': { primary: '#8b4513', secondary: '#654321' },
            'OLD_TRUCK': { primary: '#654321', secondary: '#4a4a4a' },
            'SPORTS_CAR': { primary: '#ff4500', secondary: '#cc3300' },
            'MONSTER_TRUCK': { primary: '#800080', secondary: '#660066' },
            'ARMORED_VAN': { primary: '#696969', secondary: '#555555' }
        };
        
        const colors = baseColors[this.type] || baseColors['STARTER_CAR'];
        
        // Apply weathering to colors (make them more brown/grey)
        const weatheringFactor = this.weatheringLevel;
        const rustColor = { r: 139, g: 69, b: 19 }; // Rust brown
        
        return {
            primary: this.blendColors(colors.primary, rustColor, weatheringFactor * 0.3),
            secondary: this.blendColors(colors.secondary, rustColor, weatheringFactor * 0.2),
            rust: '#8b4513',
            damage: '#4a4a4a'
        };
    }
    
    /**
     * Get visual modifications based on upgrades
     */
    getVisualModifications() {
        const upgrades = this.getCurrentUpgrades();
        const modifications = [];
        
        if (upgrades.engine > 0) {
            modifications.push({
                type: 'exhaust',
                level: upgrades.engine,
                description: 'Modified exhaust system'
            });
        }
        
        if (upgrades.armor > 0) {
            modifications.push({
                type: 'armor_plating',
                level: upgrades.armor,
                description: 'Armor plating and reinforcement'
            });
        }
        
        if (upgrades.weapon > 0) {
            modifications.push({
                type: 'weapons',
                level: upgrades.weapon,
                description: 'Mounted weapons and gun turrets'
            });
        }
        
        if (upgrades.fuel > 2) {
            modifications.push({
                type: 'fuel_tanks',
                level: upgrades.fuel,
                description: 'External fuel tanks'
            });
        }
        
        if (upgrades.wheels > 0) {
            modifications.push({
                type: 'wheels',
                level: upgrades.wheels,
                description: 'Upgraded tires and rims'
            });
        }
        
        return modifications;
    }
    
    /**
     * Blend two colors based on a factor
     */
    blendColors(color1, color2, factor) {
        // Simple color blending - in a real implementation, this would be more sophisticated
        return color1; // Placeholder
    }
    
    /**
     * Get vehicle performance metrics
     */
    getPerformanceMetrics() {
        const stats = this.getEffectiveStats();
        const upgrades = this.getCurrentUpgrades();
        
        return {
            acceleration: this.calculateAcceleration(stats),
            topSpeed: this.calculateTopSpeed(stats),
            handling: this.calculateHandling(stats),
            durability: this.calculateDurability(stats),
            fuelEfficiency: this.calculateFuelEfficiency(stats, upgrades),
            combatPower: stats.weapon,
            overallRating: this.calculateOverallRating(stats)
        };
    }
    
    /**
     * Calculate acceleration based on stats
     */
    calculateAcceleration(stats) {
        return Math.min(100, stats.engine * 0.8 + stats.wheels * 0.2);
    }
    
    /**
     * Calculate top speed based on stats
     */
    calculateTopSpeed(stats) {
        return Math.min(100, stats.engine * 0.9 + stats.wheels * 0.1);
    }
    
    /**
     * Calculate handling based on stats
     */
    calculateHandling(stats) {
        return Math.min(100, stats.wheels * 0.7 + stats.engine * 0.3);
    }
    
    /**
     * Calculate durability based on stats
     */
    calculateDurability(stats) {
        return Math.min(100, stats.armor);
    }
    
    /**
     * Calculate fuel efficiency
     */
    calculateFuelEfficiency(stats, upgrades) {
        const baseEfficiency = 50;
        const fuelUpgradeBonus = upgrades.fuel * 10;
        const enginePenalty = (stats.engine - 50) * 0.2;
        
        return Math.max(10, Math.min(100, baseEfficiency + fuelUpgradeBonus - enginePenalty));
    }
    
    /**
     * Calculate overall rating
     */
    calculateOverallRating(stats) {
        const acceleration = this.calculateAcceleration(stats);
        const topSpeed = this.calculateTopSpeed(stats);
        const handling = this.calculateHandling(stats);
        const durability = this.calculateDurability(stats);
        const upgrades = this.getCurrentUpgrades();
        const fuelEfficiency = this.calculateFuelEfficiency(stats, upgrades);
        const combatPower = stats.weapon;
        
        const weights = {
            acceleration: 0.2,
            topSpeed: 0.2,
            handling: 0.2,
            durability: 0.2,
            fuelEfficiency: 0.1,
            combatPower: 0.1
        };
        
        const totalScore = 
            acceleration * weights.acceleration +
            topSpeed * weights.topSpeed +
            handling * weights.handling +
            durability * weights.durability +
            fuelEfficiency * weights.fuelEfficiency +
            combatPower * weights.combatPower;
        
        return Math.round(totalScore);
    }
    
    /**
     * Get upgrade cost for a specific category
     */
    getUpgradeCost(category) {
        const upgrades = this.getCurrentUpgrades();
        const currentLevel = upgrades[category] || 0;
        
        if (currentLevel >= UpgradeConfig.maxLevel) {
            return null; // Max level reached
        }
        
        const baseCost = UpgradeConfig.baseCosts[category];
        return Math.round(baseCost * Math.pow(UpgradeConfig.costMultiplier, currentLevel));
    }
    
    /**
     * Check if upgrade is available
     */
    canUpgrade(category) {
        const upgrades = this.getCurrentUpgrades();
        const currentLevel = upgrades[category] || 0;
        return currentLevel < UpgradeConfig.maxLevel;
    }
    
    /**
     * Purchase upgrade
     */
    purchaseUpgrade(category) {
        if (!this.canUpgrade(category)) {
            throw new Error(`Cannot upgrade ${category}: already at max level`);
        }
        
        const cost = this.getUpgradeCost(category);
        const saveData = this.saveManager.getSaveData();
        
        if (saveData.player.money < cost) {
            throw new Error(`Insufficient funds: need ${cost}, have ${saveData.player.money}`);
        }
        
        // Deduct money
        saveData.player.money -= cost;
        
        // Apply upgrade
        if (!saveData.vehicles.upgrades[this.type]) {
            saveData.vehicles.upgrades[this.type] = {
                engine: 0, fuel: 0, armor: 0, weapon: 0, wheels: 0
            };
        }
        
        saveData.vehicles.upgrades[this.type][category]++;
        
        // Save changes
        this.saveManager.saveToDisk();
        
        return {
            success: true,
            category,
            newLevel: saveData.vehicles.upgrades[this.type][category],
            cost,
            remainingMoney: saveData.player.money
        };
    }
    
    /**
     * Get vehicle summary for UI display
     */
    getSummary() {
        const stats = this.getEffectiveStats();
        const upgrades = this.getCurrentUpgrades();
        const performance = this.getPerformanceMetrics();
        const appearance = this.getVisualAppearance();
        
        return {
            type: this.type,
            name: this.config.name,
            description: this.config.description,
            cost: this.config.cost,
            unlockDistance: this.config.unlockDistance,
            baseStats: this.getBaseStats(),
            effectiveStats: stats,
            upgrades,
            performance,
            appearance,
            health: this.health,
            fuel: this.fuel,
            fuelCapacity: this.getFuelCapacity(),
            fuelPercentage: this.getFuelPercentage(),
            isDestroyed: this.isDestroyed(),
            isOutOfFuel: this.isOutOfFuel()
        };
    }
}