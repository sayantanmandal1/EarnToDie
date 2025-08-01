/**
 * Vehicle configuration data with stats and characteristics for all vehicle types
 */

export const VEHICLE_TYPES = {
    SEDAN: 'sedan',
    SUV: 'suv',
    TRUCK: 'truck',
    SPORTS_CAR: 'sports_car',
    MONSTER_TRUCK: 'monster_truck',
    ARMORED_CAR: 'armored_car',
    BUGGY: 'buggy',
    MOTORCYCLE: 'motorcycle',
    TANK: 'tank',
    HOVERCRAFT: 'hovercraft',
    MUSCLE_CAR: 'muscle_car',
    RACING_CAR: 'racing_car',
    PICKUP_TRUCK: 'pickup_truck',
    VAN: 'van',
    CONVERTIBLE: 'convertible'
};

export const VEHICLE_CONFIGS = {
    [VEHICLE_TYPES.SEDAN]: {
        name: 'Family Sedan',
        description: 'A reliable everyday car with balanced stats',
        stats: {
            speed: 60,
            acceleration: 40,
            armor: 30,
            fuelCapacity: 100,
            damage: 25,
            handling: 70,
            braking: 60,
            mass: 1200,
            fuelConsumption: 8
        },
        cost: 0,
        unlockLevel: 1,
        category: 'starter'
    },

    [VEHICLE_TYPES.SUV]: {
        name: 'Sport Utility Vehicle',
        description: 'Higher ground clearance and better armor than sedans',
        stats: {
            speed: 55,
            acceleration: 35,
            armor: 45,
            fuelCapacity: 120,
            damage: 35,
            handling: 60,
            braking: 65,
            mass: 1800,
            fuelConsumption: 12
        },
        cost: 2500,
        unlockLevel: 2,
        category: 'utility'
    },

    [VEHICLE_TYPES.TRUCK]: {
        name: 'Heavy Duty Truck',
        description: 'Massive vehicle with excellent armor and damage potential',
        stats: {
            speed: 45,
            acceleration: 25,
            armor: 70,
            fuelCapacity: 200,
            damage: 60,
            handling: 40,
            braking: 50,
            mass: 3500,
            fuelConsumption: 20
        },
        cost: 8000,
        unlockLevel: 4,
        category: 'heavy'
    },

    [VEHICLE_TYPES.SPORTS_CAR]: {
        name: 'Sports Car',
        description: 'Lightning fast with excellent handling but fragile',
        stats: {
            speed: 90,
            acceleration: 80,
            armor: 20,
            fuelCapacity: 80,
            damage: 30,
            handling: 95,
            braking: 85,
            mass: 1000,
            fuelConsumption: 15
        },
        cost: 12000,
        unlockLevel: 6,
        category: 'performance'
    },

    [VEHICLE_TYPES.MONSTER_TRUCK]: {
        name: 'Monster Crusher',
        description: 'Enormous wheels and crushing power for maximum zombie destruction',
        stats: {
            speed: 50,
            acceleration: 30,
            armor: 60,
            fuelCapacity: 150,
            damage: 80,
            handling: 35,
            braking: 45,
            mass: 2800,
            fuelConsumption: 25
        },
        cost: 15000,
        unlockLevel: 8,
        category: 'special'
    },

    [VEHICLE_TYPES.ARMORED_CAR]: {
        name: 'Armored Personnel Carrier',
        description: 'Military-grade armor with moderate speed and excellent protection',
        stats: {
            speed: 55,
            acceleration: 35,
            armor: 90,
            fuelCapacity: 180,
            damage: 45,
            handling: 50,
            braking: 70,
            mass: 4000,
            fuelConsumption: 18
        },
        cost: 20000,
        unlockLevel: 10,
        category: 'military'
    },

    [VEHICLE_TYPES.BUGGY]: {
        name: 'Desert Buggy',
        description: 'Lightweight off-road vehicle with excellent maneuverability',
        stats: {
            speed: 70,
            acceleration: 65,
            armor: 25,
            fuelCapacity: 90,
            damage: 20,
            handling: 85,
            braking: 75,
            mass: 800,
            fuelConsumption: 10
        },
        cost: 6000,
        unlockLevel: 3,
        category: 'offroad'
    },

    [VEHICLE_TYPES.MOTORCYCLE]: {
        name: 'Heavy Motorcycle',
        description: 'Ultra-fast and agile but extremely vulnerable',
        stats: {
            speed: 100,
            acceleration: 90,
            armor: 10,
            fuelCapacity: 40,
            damage: 15,
            handling: 100,
            braking: 80,
            mass: 300,
            fuelConsumption: 6
        },
        cost: 4000,
        unlockLevel: 5,
        category: 'performance'
    },

    [VEHICLE_TYPES.TANK]: {
        name: 'Battle Tank',
        description: 'Ultimate armor and firepower but slow and fuel-hungry',
        stats: {
            speed: 35,
            acceleration: 20,
            armor: 100,
            fuelCapacity: 300,
            damage: 100,
            handling: 25,
            braking: 40,
            mass: 6000,
            fuelConsumption: 35
        },
        cost: 50000,
        unlockLevel: 15,
        category: 'military'
    },

    [VEHICLE_TYPES.HOVERCRAFT]: {
        name: 'Hovercraft',
        description: 'Unique hovering vehicle with special movement capabilities',
        stats: {
            speed: 65,
            acceleration: 50,
            armor: 35,
            fuelCapacity: 110,
            damage: 30,
            handling: 80,
            braking: 60,
            mass: 1500,
            fuelConsumption: 22
        },
        cost: 25000,
        unlockLevel: 12,
        category: 'special'
    },

    [VEHICLE_TYPES.MUSCLE_CAR]: {
        name: 'Muscle Car',
        description: 'Classic American power with high speed and moderate armor',
        stats: {
            speed: 80,
            acceleration: 70,
            armor: 40,
            fuelCapacity: 95,
            damage: 50,
            handling: 65,
            braking: 70,
            mass: 1400,
            fuelConsumption: 16
        },
        cost: 10000,
        unlockLevel: 7,
        category: 'performance'
    },

    [VEHICLE_TYPES.RACING_CAR]: {
        name: 'Formula Racing Car',
        description: 'Professional racing vehicle with maximum speed and handling',
        stats: {
            speed: 110,
            acceleration: 95,
            armor: 15,
            fuelCapacity: 70,
            damage: 25,
            handling: 100,
            braking: 95,
            mass: 700,
            fuelConsumption: 20
        },
        cost: 30000,
        unlockLevel: 14,
        category: 'performance'
    },

    [VEHICLE_TYPES.PICKUP_TRUCK]: {
        name: 'Pickup Truck',
        description: 'Versatile truck with good balance of power and utility',
        stats: {
            speed: 65,
            acceleration: 45,
            armor: 50,
            fuelCapacity: 130,
            damage: 40,
            handling: 55,
            braking: 60,
            mass: 2000,
            fuelConsumption: 14
        },
        cost: 5000,
        unlockLevel: 3,
        category: 'utility'
    },

    [VEHICLE_TYPES.VAN]: {
        name: 'Cargo Van',
        description: 'Large capacity vehicle with decent protection',
        stats: {
            speed: 50,
            acceleration: 30,
            armor: 55,
            fuelCapacity: 160,
            damage: 35,
            handling: 45,
            braking: 55,
            mass: 2500,
            fuelConsumption: 16
        },
        cost: 7000,
        unlockLevel: 4,
        category: 'utility'
    },

    [VEHICLE_TYPES.CONVERTIBLE]: {
        name: 'Convertible Sports Car',
        description: 'Stylish open-top car with good speed but reduced armor',
        stats: {
            speed: 85,
            acceleration: 75,
            armor: 25,
            fuelCapacity: 85,
            damage: 35,
            handling: 90,
            braking: 80,
            mass: 1100,
            fuelConsumption: 13
        },
        cost: 14000,
        unlockLevel: 9,
        category: 'performance'
    }
};

/**
 * Get vehicle configuration by type
 */
export function getVehicleConfig(type) {
    return VEHICLE_CONFIGS[type] || VEHICLE_CONFIGS[VEHICLE_TYPES.SEDAN];
}

/**
 * Get all available vehicle types
 */
export function getAllVehicleTypes() {
    return Object.values(VEHICLE_TYPES);
}

/**
 * Get vehicles by category
 */
export function getVehiclesByCategory(category) {
    return Object.entries(VEHICLE_CONFIGS)
        .filter(([_, config]) => config.category === category)
        .map(([type, config]) => ({ type, ...config }));
}

/**
 * Get vehicles available at a specific level
 */
export function getAvailableVehicles(playerLevel) {
    return Object.entries(VEHICLE_CONFIGS)
        .filter(([_, config]) => config.unlockLevel <= playerLevel)
        .map(([type, config]) => ({ type, ...config }));
}

/**
 * Calculate vehicle stats with upgrades applied
 */
export function calculateUpgradedStats(baseStats, upgrades) {
    const upgradedStats = { ...baseStats };
    
    // Engine upgrades
    if (upgrades.engine > 0) {
        upgradedStats.speed *= (1 + upgrades.engine * 0.1);
        upgradedStats.acceleration *= (1 + upgrades.engine * 0.15);
    }
    
    // Armor upgrades
    if (upgrades.armor > 0) {
        upgradedStats.armor += upgrades.armor * 10;
    }
    
    // Fuel upgrades
    if (upgrades.fuel > 0) {
        upgradedStats.fuelCapacity *= (1 + upgrades.fuel * 0.2);
        upgradedStats.fuelConsumption *= (1 - upgrades.fuel * 0.1);
    }
    
    // Tire upgrades
    if (upgrades.tires > 0) {
        upgradedStats.handling *= (1 + upgrades.tires * 0.1);
        upgradedStats.braking *= (1 + upgrades.tires * 0.1);
    }
    
    // Weapon upgrades
    if (upgrades.weapons > 0) {
        upgradedStats.damage *= (1 + upgrades.weapons * 0.2);
    }
    
    return upgradedStats;
}

/**
 * Vehicle categories for organization
 */
export const VEHICLE_CATEGORIES = {
    STARTER: 'starter',
    UTILITY: 'utility',
    PERFORMANCE: 'performance',
    HEAVY: 'heavy',
    MILITARY: 'military',
    SPECIAL: 'special',
    OFFROAD: 'offroad'
};