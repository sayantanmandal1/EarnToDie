/**
 * Professional Vehicle Upgrade System
 * Comprehensive upgrade system with real physics impact and visual customization
 */

import { EventEmitter } from 'events';
import { electronIntegration } from '../electron/ElectronIntegration.js';

export class VehicleUpgradeSystem extends EventEmitter {
    constructor(vehicleConfig, options = {}) {
        super();
        
        this.vehicleConfig = vehicleConfig;
        this.options = {
            // System settings
            enablePhysicsModification: options.enablePhysicsModification !== false,
            enableVisualCustomization: options.enableVisualCustomization !== false,
            enableUpgradePreview: options.enableUpgradePreview !== false,
            
            // Balance settings
            maxUpgradeLevel: options.maxUpgradeLevel || 10,
            diminishingReturnsRate: options.diminishingReturnsRate || 0.8,
            costMultiplier: options.costMultiplier || 1.0,
            
            // Currency settings
            startingCurrency: options.startingCurrency || 5000,
            
            ...options
        };
        
        // Player currency and progression
        this.playerData = {
            currency: this.options.startingCurrency,
            experience: 0,
            level: 1,
            unlockedUpgrades: new Set(['engine_power_1', 'transmission_efficiency_1', 'suspension_stiffness_1'])
        };
        
        // Upgrade categories and their effects
        this.upgradeCategories = {
            engine: {
                name: 'Engine',
                description: 'Improve power, efficiency, and reliability',
                icon: 'engine',
                upgrades: this.createEngineUpgrades()
            },
            transmission: {
                name: 'Transmission',
                description: 'Enhance shifting speed and efficiency',
                icon: 'transmission',
                upgrades: this.createTransmissionUpgrades()
            },
            suspension: {
                name: 'Suspension',
                description: 'Better handling and stability',
                icon: 'suspension',
                upgrades: this.createSuspensionUpgrades()
            },
            tires: {
                name: 'Tires',
                description: 'Improved grip and durability',
                icon: 'tires',
                upgrades: this.createTireUpgrades()
            },
            brakes: {
                name: 'Brakes',
                description: 'Enhanced stopping power and heat resistance',
                icon: 'brakes',
                upgrades: this.createBrakeUpgrades()
            },
            aerodynamics: {
                name: 'Aerodynamics',
                description: 'Reduce drag and increase downforce',
                icon: 'aerodynamics',
                upgrades: this.createAerodynamicsUpgrades()
            },
            armor: {
                name: 'Armor',
                description: 'Protection against zombie damage',
                icon: 'armor',
                upgrades: this.createArmorUpgrades()
            },
            visual: {
                name: 'Visual',
                description: 'Customize appearance and style',
                icon: 'visual',
                upgrades: this.createVisualUpgrades()
            }
        };
        
        // Current vehicle upgrades
        this.currentUpgrades = new Map();
        
        // Upgrade effects on vehicle physics
        this.upgradeEffects = {
            power: 1.0,
            torque: 1.0,
            efficiency: 1.0,
            weight: 1.0,
            handling: 1.0,
            braking: 1.0,
            acceleration: 1.0,
            topSpeed: 1.0,
            durability: 1.0,
            grip: 1.0,
            stability: 1.0,
            aerodynamics: 1.0
        };
        
        // Visual customization state
        this.visualCustomization = {
            paintJob: {
                primary: '#ff0000',
                secondary: '#000000',
                finish: 'metallic' // metallic, matte, gloss, carbon
            },
            decals: [],
            bodyKit: 'stock',
            spoiler: 'none',
            wheels: 'stock',
            exhaust: 'stock',
            lights: 'stock',
            windowTint: 0 // 0-100%
        };
        
        this.logger = electronIntegration.getLogger();
        
        // Initialize system
        this.initialize();
    }

    /**
     * Initialize upgrade system
     */
    initialize() {
        // Load saved upgrades if available
        this.loadUpgradeProgress();
        
        // Calculate initial effects
        this.recalculateUpgradeEffects();
        
        this.emit('initialized', {
            categories: Object.keys(this.upgradeCategories),
            currency: this.playerData.currency,
            level: this.playerData.level
        });
        
        this.logger.info('Vehicle Upgrade System initialized', {
            categories: Object.keys(this.upgradeCategories).length,
            currency: this.playerData.currency
        });
    }

    /**
     * Create engine upgrade definitions
     */
    createEngineUpgrades() {
        return {
            power: {
                id: 'engine_power',
                name: 'Engine Power',
                description: 'Increase horsepower and torque output',
                maxLevel: this.options.maxUpgradeLevel,
                baseCost: 500,
                effects: {
                    power: { base: 0.1, diminishing: true },
                    torque: { base: 0.08, diminishing: true },
                    weight: { base: 0.02, diminishing: false }
                },
                requirements: { level: 1 },
                category: 'performance'
            },
            efficiency: {
                id: 'engine_efficiency',
                name: 'Fuel Efficiency',
                description: 'Improve fuel consumption and engine longevity',
                maxLevel: this.options.maxUpgradeLevel,
                baseCost: 300,
                effects: {
                    efficiency: { base: 0.12, diminishing: true },
                    durability: { base: 0.05, diminishing: true }
                },
                requirements: { level: 2 },
                category: 'efficiency'
            },
            cooling: {
                id: 'engine_cooling',
                name: 'Cooling System',
                description: 'Better heat management and overheating protection',
                maxLevel: 8,
                baseCost: 400,
                effects: {
                    durability: { base: 0.15, diminishing: true },
                    power: { base: 0.03, diminishing: true }
                },
                requirements: { level: 3 },
                category: 'reliability'
            },
            turbo: {
                id: 'engine_turbo',
                name: 'Turbocharger',
                description: 'Forced induction for massive power gains',
                maxLevel: 5,
                baseCost: 1500,
                effects: {
                    power: { base: 0.25, diminishing: true },
                    torque: { base: 0.20, diminishing: true },
                    weight: { base: 0.08, diminishing: false },
                    efficiency: { base: -0.05, diminishing: false }
                },
                requirements: { level: 5, upgrades: ['engine_power_3', 'engine_cooling_2'] },
                category: 'performance'
            }
        };
    }

    /**
     * Create transmission upgrade definitions
     */
    createTransmissionUpgrades() {
        return {
            efficiency: {
                id: 'transmission_efficiency',
                name: 'Transmission Efficiency',
                description: 'Reduce power loss through drivetrain',
                maxLevel: this.options.maxUpgradeLevel,
                baseCost: 400,
                effects: {
                    efficiency: { base: 0.08, diminishing: true },
                    acceleration: { base: 0.05, diminishing: true }
                },
                requirements: { level: 1 },
                category: 'efficiency'
            },
            shifting: {
                id: 'transmission_shifting',
                name: 'Quick Shift',
                description: 'Faster gear changes and better shift points',
                maxLevel: 8,
                baseCost: 600,
                effects: {
                    acceleration: { base: 0.12, diminishing: true },
                    handling: { base: 0.03, diminishing: true }
                },
                requirements: { level: 2 },
                category: 'performance'
            },
            differential: {
                id: 'transmission_differential',
                name: 'Limited Slip Differential',
                description: 'Better traction and cornering performance',
                maxLevel: 6,
                baseCost: 800,
                effects: {
                    grip: { base: 0.15, diminishing: true },
                    handling: { base: 0.10, diminishing: true },
                    stability: { base: 0.08, diminishing: true }
                },
                requirements: { level: 4 },
                category: 'handling'
            }
        };
    }

    /**
     * Create suspension upgrade definitions
     */
    createSuspensionUpgrades() {
        return {
            stiffness: {
                id: 'suspension_stiffness',
                name: 'Sport Suspension',
                description: 'Stiffer springs and dampers for better handling',
                maxLevel: this.options.maxUpgradeLevel,
                baseCost: 350,
                effects: {
                    handling: { base: 0.12, diminishing: true },
                    stability: { base: 0.08, diminishing: true },
                    weight: { base: -0.02, diminishing: false }
                },
                requirements: { level: 1 },
                category: 'handling'
            },
            adjustable: {
                id: 'suspension_adjustable',
                name: 'Adjustable Coilovers',
                description: 'Fine-tune suspension for different conditions',
                maxLevel: 6,
                baseCost: 1200,
                effects: {
                    handling: { base: 0.20, diminishing: true },
                    stability: { base: 0.15, diminishing: true },
                    grip: { base: 0.05, diminishing: true }
                },
                requirements: { level: 6, upgrades: ['suspension_stiffness_4'] },
                category: 'handling'
            },
            antiroll: {
                id: 'suspension_antiroll',
                name: 'Anti-Roll Bars',
                description: 'Reduce body roll in corners',
                maxLevel: 5,
                baseCost: 500,
                effects: {
                    handling: { base: 0.10, diminishing: true },
                    stability: { base: 0.12, diminishing: true }
                },
                requirements: { level: 3 },
                category: 'handling'
            }
        };
    }

    /**
     * Create tire upgrade definitions
     */
    createTireUpgrades() {
        return {
            compound: {
                id: 'tires_compound',
                name: 'Performance Compound',
                description: 'Stickier rubber for better grip',
                maxLevel: 8,
                baseCost: 300,
                effects: {
                    grip: { base: 0.15, diminishing: true },
                    braking: { base: 0.08, diminishing: true },
                    durability: { base: -0.05, diminishing: false }
                },
                requirements: { level: 1 },
                category: 'performance'
            },
            size: {
                id: 'tires_size',
                name: 'Plus Sizing',
                description: 'Larger wheels and lower profile tires',
                maxLevel: 5,
                baseCost: 800,
                effects: {
                    handling: { base: 0.12, diminishing: true },
                    grip: { base: 0.08, diminishing: true },
                    weight: { base: 0.03, diminishing: false },
                    durability: { base: -0.03, diminishing: false }
                },
                requirements: { level: 3 },
                category: 'handling'
            },
            reinforced: {
                id: 'tires_reinforced',
                name: 'Reinforced Sidewalls',
                description: 'Better resistance to damage and punctures',
                maxLevel: 6,
                baseCost: 400,
                effects: {
                    durability: { base: 0.20, diminishing: true },
                    weight: { base: 0.02, diminishing: false }
                },
                requirements: { level: 2 },
                category: 'durability'
            }
        };
    }

    /**
     * Create brake upgrade definitions
     */
    createBrakeUpgrades() {
        return {
            pads: {
                id: 'brakes_pads',
                name: 'Performance Brake Pads',
                description: 'Better stopping power and heat resistance',
                maxLevel: this.options.maxUpgradeLevel,
                baseCost: 250,
                effects: {
                    braking: { base: 0.12, diminishing: true },
                    durability: { base: 0.05, diminishing: true }
                },
                requirements: { level: 1 },
                category: 'safety'
            },
            discs: {
                id: 'brakes_discs',
                name: 'Vented Brake Discs',
                description: 'Better heat dissipation and fade resistance',
                maxLevel: 6,
                baseCost: 600,
                effects: {
                    braking: { base: 0.15, diminishing: true },
                    durability: { base: 0.10, diminishing: true },
                    weight: { base: 0.02, diminishing: false }
                },
                requirements: { level: 3 },
                category: 'safety'
            },
            calipers: {
                id: 'brakes_calipers',
                name: 'Multi-Piston Calipers',
                description: 'More even pressure distribution and power',
                maxLevel: 4,
                baseCost: 1000,
                effects: {
                    braking: { base: 0.20, diminishing: true },
                    weight: { base: 0.03, diminishing: false }
                },
                requirements: { level: 5, upgrades: ['brakes_pads_3', 'brakes_discs_2'] },
                category: 'safety'
            }
        };
    }

    /**
     * Create aerodynamics upgrade definitions
     */
    createAerodynamicsUpgrades() {
        return {
            front_splitter: {
                id: 'aero_front_splitter',
                name: 'Front Splitter',
                description: 'Reduce front lift and improve stability',
                maxLevel: 3,
                baseCost: 400,
                effects: {
                    aerodynamics: { base: 0.08, diminishing: true },
                    stability: { base: 0.05, diminishing: true },
                    topSpeed: { base: -0.02, diminishing: false }
                },
                requirements: { level: 3 },
                category: 'aerodynamics'
            },
            rear_wing: {
                id: 'aero_rear_wing',
                name: 'Rear Wing',
                description: 'Increase downforce for better high-speed stability',
                maxLevel: 5,
                baseCost: 600,
                effects: {
                    aerodynamics: { base: 0.12, diminishing: true },
                    stability: { base: 0.10, diminishing: true },
                    handling: { base: 0.05, diminishing: true },
                    topSpeed: { base: -0.03, diminishing: false }
                },
                requirements: { level: 4 },
                category: 'aerodynamics'
            },
            underbody: {
                id: 'aero_underbody',
                name: 'Underbody Panels',
                description: 'Smooth airflow under the vehicle',
                maxLevel: 4,
                baseCost: 800,
                effects: {
                    aerodynamics: { base: 0.10, diminishing: true },
                    topSpeed: { base: 0.05, diminishing: true },
                    efficiency: { base: 0.03, diminishing: true }
                },
                requirements: { level: 5 },
                category: 'aerodynamics'
            }
        };
    }

    /**
     * Create armor upgrade definitions
     */
    createArmorUpgrades() {
        return {
            body_armor: {
                id: 'armor_body',
                name: 'Body Armor Plating',
                description: 'Protect against zombie attacks and collisions',
                maxLevel: 8,
                baseCost: 500,
                effects: {
                    durability: { base: 0.15, diminishing: true },
                    weight: { base: 0.08, diminishing: false },
                    acceleration: { base: -0.03, diminishing: false }
                },
                requirements: { level: 2 },
                category: 'protection'
            },
            window_armor: {
                id: 'armor_windows',
                name: 'Reinforced Windows',
                description: 'Bulletproof glass protection',
                maxLevel: 5,
                baseCost: 700,
                effects: {
                    durability: { base: 0.12, diminishing: true },
                    weight: { base: 0.04, diminishing: false }
                },
                requirements: { level: 3 },
                category: 'protection'
            },
            ram_bar: {
                id: 'armor_ram_bar',
                name: 'Ram Bar',
                description: 'Front-mounted zombie clearing device',
                maxLevel: 6,
                baseCost: 600,
                effects: {
                    durability: { base: 0.10, diminishing: true },
                    weight: { base: 0.05, diminishing: false },
                    aerodynamics: { base: -0.03, diminishing: false }
                },
                requirements: { level: 4 },
                category: 'protection'
            }
        };
    }

    /**
     * Create visual upgrade definitions
     */
    createVisualUpgrades() {
        return {
            paint_jobs: {
                id: 'visual_paint',
                name: 'Custom Paint Jobs',
                description: 'Unique colors and finishes',
                maxLevel: 1,
                baseCost: 200,
                effects: {},
                requirements: { level: 1 },
                category: 'cosmetic',
                options: [
                    { name: 'Racing Stripes', cost: 150 },
                    { name: 'Flame Design', cost: 300 },
                    { name: 'Carbon Fiber', cost: 500 },
                    { name: 'Chrome Finish', cost: 800 },
                    { name: 'Matte Black', cost: 400 }
                ]
            },
            decals: {
                id: 'visual_decals',
                name: 'Decal Packages',
                description: 'Sponsor logos and custom graphics',
                maxLevel: 1,
                baseCost: 100,
                effects: {},
                requirements: { level: 1 },
                category: 'cosmetic',
                options: [
                    { name: 'Racing Numbers', cost: 50 },
                    { name: 'Sponsor Logos', cost: 100 },
                    { name: 'Zombie Hunter', cost: 200 },
                    { name: 'Skull Graphics', cost: 150 }
                ]
            },
            body_kit: {
                id: 'visual_body_kit',
                name: 'Body Kits',
                description: 'Aggressive styling packages',
                maxLevel: 1,
                baseCost: 1000,
                effects: {
                    aerodynamics: { base: 0.05, diminishing: false },
                    weight: { base: 0.02, diminishing: false }
                },
                requirements: { level: 5 },
                category: 'cosmetic',
                options: [
                    { name: 'Sport Package', cost: 800 },
                    { name: 'Aggressive Kit', cost: 1200 },
                    { name: 'Wide Body', cost: 1500 }
                ]
            }
        };
    }

    /**
     * Get available upgrades for a category
     */
    getAvailableUpgrades(categoryName) {
        const category = this.upgradeCategories[categoryName];
        if (!category) return [];

        return Object.values(category.upgrades).filter(upgrade => {
            return this.isUpgradeAvailable(upgrade);
        });
    }

    /**
     * Check if upgrade is available to purchase
     */
    isUpgradeAvailable(upgrade) {
        // Check level requirement
        if (upgrade.requirements.level > this.playerData.level) {
            return false;
        }

        // Check prerequisite upgrades
        if (upgrade.requirements.upgrades) {
            for (const reqUpgrade of upgrade.requirements.upgrades) {
                if (!this.playerData.unlockedUpgrades.has(reqUpgrade)) {
                    return false;
                }
            }
        }

        // Check if already at max level
        const currentLevel = this.getCurrentUpgradeLevel(upgrade.id);
        return currentLevel < upgrade.maxLevel;
    }

    /**
     * Get current level of an upgrade
     */
    getCurrentUpgradeLevel(upgradeId) {
        return this.currentUpgrades.get(upgradeId) || 0;
    }

    /**
     * Calculate upgrade cost with level scaling
     */
    calculateUpgradeCost(upgrade, targetLevel = null) {
        const currentLevel = this.getCurrentUpgradeLevel(upgrade.id);
        const level = targetLevel || (currentLevel + 1);
        
        if (level > upgrade.maxLevel) return null;

        // Exponential cost scaling
        const costMultiplier = Math.pow(1.5, level - 1);
        return Math.floor(upgrade.baseCost * costMultiplier * this.options.costMultiplier);
    }

    /**
     * Purchase an upgrade
     */
    purchaseUpgrade(upgradeId, categoryName) {
        const category = this.upgradeCategories[categoryName];
        if (!category) {
            throw new Error(`Invalid category: ${categoryName}`);
        }

        const upgrade = Object.values(category.upgrades).find(u => u.id === upgradeId);
        if (!upgrade) {
            throw new Error(`Invalid upgrade: ${upgradeId}`);
        }

        if (!this.isUpgradeAvailable(upgrade)) {
            throw new Error(`Upgrade not available: ${upgradeId}`);
        }

        const cost = this.calculateUpgradeCost(upgrade);
        if (this.playerData.currency < cost) {
            throw new Error(`Insufficient currency. Need ${cost}, have ${this.playerData.currency}`);
        }

        // Purchase upgrade
        this.playerData.currency -= cost;
        const newLevel = this.getCurrentUpgradeLevel(upgradeId) + 1;
        this.currentUpgrades.set(upgradeId, newLevel);
        
        // Unlock upgrade for future reference
        this.playerData.unlockedUpgrades.add(`${upgradeId}_${newLevel}`);

        // Recalculate effects
        this.recalculateUpgradeEffects();

        // Save progress
        this.saveUpgradeProgress();

        this.emit('upgradePurchased', {
            upgradeId,
            level: newLevel,
            cost,
            remainingCurrency: this.playerData.currency,
            effects: this.upgradeEffects
        });

        this.logger.info('Upgrade purchased', {
            upgradeId,
            level: newLevel,
            cost,
            remainingCurrency: this.playerData.currency
        });

        return {
            success: true,
            newLevel,
            cost,
            remainingCurrency: this.playerData.currency
        };
    }    
/**
     * Recalculate all upgrade effects
     */
    recalculateUpgradeEffects() {
        // Reset to base values
        this.upgradeEffects = {
            power: 1.0,
            torque: 1.0,
            efficiency: 1.0,
            weight: 1.0,
            handling: 1.0,
            braking: 1.0,
            acceleration: 1.0,
            topSpeed: 1.0,
            durability: 1.0,
            grip: 1.0,
            stability: 1.0,
            aerodynamics: 1.0
        };

        // Apply all current upgrades
        for (const [upgradeId, level] of this.currentUpgrades) {
            this.applyUpgradeEffects(upgradeId, level);
        }

        this.emit('effectsRecalculated', { ...this.upgradeEffects });
    }

    /**
     * Apply effects from a specific upgrade
     */
    applyUpgradeEffects(upgradeId, level) {
        const upgrade = this.findUpgradeById(upgradeId);
        if (!upgrade || level <= 0) return;

        Object.entries(upgrade.effects).forEach(([effectName, effectData]) => {
            if (this.upgradeEffects.hasOwnProperty(effectName)) {
                let effectValue = effectData.base * level;

                // Apply diminishing returns if enabled
                if (effectData.diminishing) {
                    effectValue = this.applyDiminishingReturns(effectData.base, level);
                }

                // Apply the effect (additive for most, multiplicative for weight)
                if (effectName === 'weight') {
                    this.upgradeEffects[effectName] *= (1 + effectValue);
                } else {
                    this.upgradeEffects[effectName] += effectValue;
                }
            }
        });
    }

    /**
     * Apply diminishing returns formula
     */
    applyDiminishingReturns(baseValue, level) {
        // Formula: baseValue * (1 - (1 - rate)^level) / rate
        const rate = this.options.diminishingReturnsRate;
        return baseValue * (1 - Math.pow(1 - rate, level)) / rate;
    }

    /**
     * Find upgrade by ID across all categories
     */
    findUpgradeById(upgradeId) {
        for (const category of Object.values(this.upgradeCategories)) {
            for (const upgrade of Object.values(category.upgrades)) {
                if (upgrade.id === upgradeId) {
                    return upgrade;
                }
            }
        }
        return null;
    }

    /**
     * Get upgrade preview (what would happen if purchased)
     */
    getUpgradePreview(upgradeId, categoryName) {
        if (!this.options.enableUpgradePreview) {
            return null;
        }

        const category = this.upgradeCategories[categoryName];
        if (!category) return null;

        const upgrade = Object.values(category.upgrades).find(u => u.id === upgradeId);
        if (!upgrade) return null;

        const currentLevel = this.getCurrentUpgradeLevel(upgradeId);
        const nextLevel = currentLevel + 1;

        if (nextLevel > upgrade.maxLevel) return null;

        // Calculate what effects would be after upgrade
        const previewEffects = { ...this.upgradeEffects };
        
        // Temporarily apply the upgrade effect
        Object.entries(upgrade.effects).forEach(([effectName, effectData]) => {
            if (previewEffects.hasOwnProperty(effectName)) {
                let currentEffectValue = effectData.base * currentLevel;
                let nextEffectValue = effectData.base * nextLevel;

                if (effectData.diminishing) {
                    currentEffectValue = this.applyDiminishingReturns(effectData.base, currentLevel);
                    nextEffectValue = this.applyDiminishingReturns(effectData.base, nextLevel);
                }

                const effectDifference = nextEffectValue - currentEffectValue;

                if (effectName === 'weight') {
                    previewEffects[effectName] *= (1 + effectDifference);
                } else {
                    previewEffects[effectName] += effectDifference;
                }
            }
        });

        return {
            upgradeId,
            currentLevel,
            nextLevel,
            cost: this.calculateUpgradeCost(upgrade),
            currentEffects: { ...this.upgradeEffects },
            previewEffects,
            effectChanges: this.calculateEffectChanges(this.upgradeEffects, previewEffects),
            isAvailable: this.isUpgradeAvailable(upgrade),
            canAfford: this.playerData.currency >= this.calculateUpgradeCost(upgrade)
        };
    }

    /**
     * Calculate the difference between current and preview effects
     */
    calculateEffectChanges(current, preview) {
        const changes = {};
        
        Object.keys(current).forEach(effectName => {
            const change = preview[effectName] - current[effectName];
            if (Math.abs(change) > 0.001) { // Only include meaningful changes
                changes[effectName] = {
                    absolute: change,
                    percentage: (change / current[effectName]) * 100
                };
            }
        });

        return changes;
    }

    /**
     * Get comparison between two upgrade configurations
     */
    getUpgradeComparison(upgradeIds) {
        const comparisons = upgradeIds.map(upgradeId => {
            const upgrade = this.findUpgradeById(upgradeId);
            if (!upgrade) return null;

            const currentLevel = this.getCurrentUpgradeLevel(upgradeId);
            const maxLevel = upgrade.maxLevel;
            const cost = this.calculateUpgradeCost(upgrade);

            return {
                upgradeId,
                name: upgrade.name,
                description: upgrade.description,
                currentLevel,
                maxLevel,
                cost,
                costPerLevel: cost / (maxLevel - currentLevel),
                effects: upgrade.effects,
                category: upgrade.category,
                efficiency: this.calculateUpgradeEfficiency(upgrade)
            };
        }).filter(Boolean);

        return {
            upgrades: comparisons,
            recommendations: this.generateUpgradeRecommendations(comparisons)
        };
    }

    /**
     * Calculate upgrade efficiency (benefit per cost)
     */
    calculateUpgradeEfficiency(upgrade) {
        const cost = this.calculateUpgradeCost(upgrade);
        if (!cost) return 0;

        let totalBenefit = 0;
        Object.values(upgrade.effects).forEach(effectData => {
            totalBenefit += Math.abs(effectData.base);
        });

        return totalBenefit / cost;
    }

    /**
     * Generate upgrade recommendations
     */
    generateUpgradeRecommendations(comparisons) {
        const recommendations = [];

        // Sort by efficiency
        const sortedByEfficiency = [...comparisons].sort((a, b) => b.efficiency - a.efficiency);
        
        if (sortedByEfficiency.length > 0) {
            recommendations.push({
                type: 'most_efficient',
                upgradeId: sortedByEfficiency[0].upgradeId,
                reason: 'Best performance improvement per cost'
            });
        }

        // Find cheapest upgrade
        const sortedByCost = [...comparisons].sort((a, b) => a.cost - b.cost);
        if (sortedByCost.length > 0) {
            recommendations.push({
                type: 'cheapest',
                upgradeId: sortedByCost[0].upgradeId,
                reason: 'Most affordable immediate upgrade'
            });
        }

        // Find performance-focused upgrade
        const performanceUpgrades = comparisons.filter(u => 
            u.category === 'performance' && u.currentLevel < u.maxLevel
        );
        if (performanceUpgrades.length > 0) {
            const bestPerformance = performanceUpgrades.sort((a, b) => b.efficiency - a.efficiency)[0];
            recommendations.push({
                type: 'performance',
                upgradeId: bestPerformance.upgradeId,
                reason: 'Best performance enhancement'
            });
        }

        return recommendations;
    }

    /**
     * Apply visual customization
     */
    applyVisualCustomization(customizationType, options) {
        if (!this.options.enableVisualCustomization) {
            return false;
        }

        switch (customizationType) {
            case 'paint':
                this.visualCustomization.paintJob = { ...this.visualCustomization.paintJob, ...options };
                break;
            case 'decals':
                if (options.add) {
                    this.visualCustomization.decals.push(options.decal);
                } else if (options.remove) {
                    this.visualCustomization.decals = this.visualCustomization.decals.filter(
                        decal => decal.id !== options.decalId
                    );
                }
                break;
            case 'bodykit':
                this.visualCustomization.bodyKit = options.kit;
                break;
            case 'wheels':
                this.visualCustomization.wheels = options.style;
                break;
            case 'spoiler':
                this.visualCustomization.spoiler = options.type;
                break;
            case 'exhaust':
                this.visualCustomization.exhaust = options.type;
                break;
            case 'lights':
                this.visualCustomization.lights = options.type;
                break;
            case 'tint':
                this.visualCustomization.windowTint = Math.max(0, Math.min(100, options.percentage));
                break;
            default:
                return false;
        }

        this.emit('visualCustomizationApplied', {
            type: customizationType,
            options,
            currentCustomization: { ...this.visualCustomization }
        });

        return true;
    }

    /**
     * Get visual customization options
     */
    getVisualCustomizationOptions() {
        return {
            paintJobs: [
                { id: 'solid', name: 'Solid Color', cost: 100 },
                { id: 'metallic', name: 'Metallic', cost: 200 },
                { id: 'pearl', name: 'Pearl', cost: 300 },
                { id: 'matte', name: 'Matte', cost: 250 },
                { id: 'carbon', name: 'Carbon Fiber', cost: 500 },
                { id: 'chrome', name: 'Chrome', cost: 800 }
            ],
            decalPackages: [
                { id: 'racing', name: 'Racing Numbers', cost: 50 },
                { id: 'flames', name: 'Flame Design', cost: 150 },
                { id: 'tribal', name: 'Tribal Pattern', cost: 120 },
                { id: 'zombie', name: 'Zombie Hunter', cost: 200 },
                { id: 'skull', name: 'Skull Graphics', cost: 180 },
                { id: 'sponsor', name: 'Sponsor Logos', cost: 100 }
            ],
            bodyKits: [
                { id: 'stock', name: 'Stock', cost: 0 },
                { id: 'sport', name: 'Sport Package', cost: 800 },
                { id: 'aggressive', name: 'Aggressive Kit', cost: 1200 },
                { id: 'widebody', name: 'Wide Body', cost: 1500 }
            ],
            wheels: [
                { id: 'stock', name: 'Stock Wheels', cost: 0 },
                { id: 'sport', name: 'Sport Wheels', cost: 400 },
                { id: 'racing', name: 'Racing Wheels', cost: 800 },
                { id: 'offroad', name: 'Off-Road Wheels', cost: 600 }
            ],
            spoilers: [
                { id: 'none', name: 'No Spoiler', cost: 0 },
                { id: 'lip', name: 'Lip Spoiler', cost: 200 },
                { id: 'wing', name: 'Rear Wing', cost: 500 },
                { id: 'gt', name: 'GT Wing', cost: 800 }
            ]
        };
    }

    /**
     * Add currency (from gameplay rewards)
     */
    addCurrency(amount, source = 'gameplay') {
        this.playerData.currency += amount;
        
        this.emit('currencyAdded', {
            amount,
            source,
            newTotal: this.playerData.currency
        });

        this.saveUpgradeProgress();
    }

    /**
     * Add experience and check for level up
     */
    addExperience(amount, source = 'gameplay') {
        this.playerData.experience += amount;
        
        const newLevel = this.calculateLevelFromExperience(this.playerData.experience);
        const leveledUp = newLevel > this.playerData.level;
        
        if (leveledUp) {
            const oldLevel = this.playerData.level;
            this.playerData.level = newLevel;
            
            // Unlock new upgrades based on level
            this.unlockUpgradesByLevel(newLevel);
            
            this.emit('levelUp', {
                oldLevel,
                newLevel,
                unlockedUpgrades: this.getUpgradesByLevel(newLevel)
            });
        }

        this.emit('experienceAdded', {
            amount,
            source,
            newTotal: this.playerData.experience,
            level: this.playerData.level,
            leveledUp
        });

        this.saveUpgradeProgress();
    }

    /**
     * Calculate level from total experience
     */
    calculateLevelFromExperience(experience) {
        // Level formula: level = floor(sqrt(experience / 100)) + 1
        return Math.floor(Math.sqrt(experience / 100)) + 1;
    }

    /**
     * Unlock upgrades based on level
     */
    unlockUpgradesByLevel(level) {
        Object.values(this.upgradeCategories).forEach(category => {
            Object.values(category.upgrades).forEach(upgrade => {
                if (upgrade.requirements.level <= level) {
                    this.playerData.unlockedUpgrades.add(`${upgrade.id}_1`);
                }
            });
        });
    }

    /**
     * Get upgrades unlocked at specific level
     */
    getUpgradesByLevel(level) {
        const upgrades = [];
        
        Object.values(this.upgradeCategories).forEach(category => {
            Object.values(category.upgrades).forEach(upgrade => {
                if (upgrade.requirements.level === level) {
                    upgrades.push({
                        id: upgrade.id,
                        name: upgrade.name,
                        category: category.name
                    });
                }
            });
        });

        return upgrades;
    }

    /**
     * Get player statistics
     */
    getPlayerStats() {
        return {
            currency: this.playerData.currency,
            experience: this.playerData.experience,
            level: this.playerData.level,
            upgradesPurchased: this.currentUpgrades.size,
            totalUpgradesAvailable: this.getTotalUpgradeCount(),
            unlockedUpgrades: this.playerData.unlockedUpgrades.size,
            nextLevelExperience: this.getExperienceForLevel(this.playerData.level + 1),
            experienceToNextLevel: this.getExperienceForLevel(this.playerData.level + 1) - this.playerData.experience
        };
    }

    /**
     * Get experience required for specific level
     */
    getExperienceForLevel(level) {
        // Inverse of level formula: experience = (level - 1)^2 * 100
        return Math.pow(level - 1, 2) * 100;
    }

    /**
     * Get total number of possible upgrades
     */
    getTotalUpgradeCount() {
        let total = 0;
        Object.values(this.upgradeCategories).forEach(category => {
            Object.values(category.upgrades).forEach(upgrade => {
                total += upgrade.maxLevel;
            });
        });
        return total;
    }

    /**
     * Get upgrade system status
     */
    getSystemStatus() {
        return {
            playerStats: this.getPlayerStats(),
            upgradeEffects: { ...this.upgradeEffects },
            visualCustomization: { ...this.visualCustomization },
            currentUpgrades: Object.fromEntries(this.currentUpgrades),
            availableCategories: Object.keys(this.upgradeCategories),
            systemOptions: {
                physicsModification: this.options.enablePhysicsModification,
                visualCustomization: this.options.enableVisualCustomization,
                upgradePreview: this.options.enableUpgradePreview
            }
        };
    }

    /**
     * Reset all upgrades (for testing or new game)
     */
    resetUpgrades() {
        this.currentUpgrades.clear();
        this.playerData.currency = this.options.startingCurrency;
        this.playerData.experience = 0;
        this.playerData.level = 1;
        this.playerData.unlockedUpgrades.clear();
        
        // Re-unlock starting upgrades
        this.playerData.unlockedUpgrades.add('engine_power_1');
        this.playerData.unlockedUpgrades.add('transmission_efficiency_1');
        this.playerData.unlockedUpgrades.add('suspension_stiffness_1');
        
        // Reset visual customization
        this.visualCustomization = {
            paintJob: { primary: '#ff0000', secondary: '#000000', finish: 'metallic' },
            decals: [],
            bodyKit: 'stock',
            spoiler: 'none',
            wheels: 'stock',
            exhaust: 'stock',
            lights: 'stock',
            windowTint: 0
        };

        this.recalculateUpgradeEffects();
        this.saveUpgradeProgress();

        this.emit('upgradesReset');
    }

    /**
     * Save upgrade progress to storage
     */
    saveUpgradeProgress() {
        const saveData = {
            playerData: {
                currency: this.playerData.currency,
                experience: this.playerData.experience,
                level: this.playerData.level,
                unlockedUpgrades: Array.from(this.playerData.unlockedUpgrades)
            },
            currentUpgrades: Object.fromEntries(this.currentUpgrades),
            visualCustomization: { ...this.visualCustomization },
            timestamp: Date.now()
        };

        try {
            localStorage.setItem('vehicleUpgradeProgress', JSON.stringify(saveData));
        } catch (error) {
            this.logger.error('Failed to save upgrade progress:', error);
        }
    }

    /**
     * Load upgrade progress from storage
     */
    loadUpgradeProgress() {
        try {
            const saveData = localStorage.getItem('vehicleUpgradeProgress');
            if (!saveData) return;

            const data = JSON.parse(saveData);
            
            // Load player data
            if (data.playerData) {
                this.playerData.currency = data.playerData.currency || this.options.startingCurrency;
                this.playerData.experience = data.playerData.experience || 0;
                this.playerData.level = data.playerData.level || 1;
                this.playerData.unlockedUpgrades = new Set(data.playerData.unlockedUpgrades || []);
            }

            // Load current upgrades
            if (data.currentUpgrades) {
                this.currentUpgrades = new Map(Object.entries(data.currentUpgrades));
            }

            // Load visual customization
            if (data.visualCustomization) {
                this.visualCustomization = { ...this.visualCustomization, ...data.visualCustomization };
            }

            this.logger.info('Upgrade progress loaded successfully');
        } catch (error) {
            this.logger.error('Failed to load upgrade progress:', error);
        }
    }

    /**
     * Export upgrade configuration for sharing
     */
    exportConfiguration() {
        return {
            upgrades: Object.fromEntries(this.currentUpgrades),
            visual: { ...this.visualCustomization },
            effects: { ...this.upgradeEffects },
            playerLevel: this.playerData.level,
            exportDate: new Date().toISOString()
        };
    }

    /**
     * Import upgrade configuration
     */
    importConfiguration(config) {
        if (!config || typeof config !== 'object') {
            throw new Error('Invalid configuration data');
        }

        try {
            // Import upgrades
            if (config.upgrades) {
                this.currentUpgrades = new Map(Object.entries(config.upgrades));
            }

            // Import visual customization
            if (config.visual) {
                this.visualCustomization = { ...this.visualCustomization, ...config.visual };
            }

            // Recalculate effects
            this.recalculateUpgradeEffects();

            this.emit('configurationImported', config);
            this.logger.info('Configuration imported successfully');

            return true;
        } catch (error) {
            this.logger.error('Failed to import configuration:', error);
            throw error;
        }
    }

    /**
     * Dispose of upgrade system
     */
    dispose() {
        this.saveUpgradeProgress();
        this.removeAllListeners();
        this.logger.info('Vehicle Upgrade System disposed');
    }
}

export default VehicleUpgradeSystem;