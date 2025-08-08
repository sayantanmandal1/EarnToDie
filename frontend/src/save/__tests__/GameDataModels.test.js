/**
 * Unit tests for Game Data Models
 * Tests data model functionality and calculations
 */

import {
    VehicleTypes,
    UpgradeConfig,
    StageConfig,
    ZombieTypes,
    GameBalance,
    PlayerStatistics,
    VehicleData,
    StageProgress,
    createDefaultSaveData,
    GameDataUtils
} from '../GameDataModels.js';

describe('VehicleTypes Configuration', () => {
    test('should have all required vehicle types', () => {
        expect(VehicleTypes.STARTER_CAR).toBeDefined();
        expect(VehicleTypes.OLD_TRUCK).toBeDefined();
        expect(VehicleTypes.SPORTS_CAR).toBeDefined();
        expect(VehicleTypes.MONSTER_TRUCK).toBeDefined();
        expect(VehicleTypes.ARMORED_VAN).toBeDefined();
    });

    test('should have consistent data structure for all vehicles', () => {
        Object.keys(VehicleTypes).forEach(vehicleType => {
            const vehicle = VehicleTypes[vehicleType];
            
            expect(vehicle.name).toBeDefined();
            expect(vehicle.description).toBeDefined();
            expect(vehicle.baseStats).toBeDefined();
            expect(vehicle.cost).toBeDefined();
            expect(vehicle.unlockDistance).toBeDefined();
            expect(vehicle.sprite).toBeDefined();
            
            // Check base stats structure
            expect(vehicle.baseStats.engine).toBeDefined();
            expect(vehicle.baseStats.fuel).toBeDefined();
            expect(vehicle.baseStats.armor).toBeDefined();
            expect(vehicle.baseStats.weapon).toBeDefined();
            expect(vehicle.baseStats.wheels).toBeDefined();
        });
    });

    test('should have progressive unlock distances', () => {
        const vehicles = Object.values(VehicleTypes);
        const unlockDistances = vehicles.map(v => v.unlockDistance).sort((a, b) => a - b);
        
        // Should be in ascending order
        for (let i = 1; i < unlockDistances.length; i++) {
            expect(unlockDistances[i]).toBeGreaterThanOrEqual(unlockDistances[i - 1]);
        }
    });
});

describe('UpgradeConfig', () => {
    test('should have all required upgrade categories', () => {
        expect(UpgradeConfig.categories).toContain('engine');
        expect(UpgradeConfig.categories).toContain('fuel');
        expect(UpgradeConfig.categories).toContain('armor');
        expect(UpgradeConfig.categories).toContain('weapon');
        expect(UpgradeConfig.categories).toContain('wheels');
    });

    test('should have base costs for all categories', () => {
        UpgradeConfig.categories.forEach(category => {
            expect(UpgradeConfig.baseCosts[category]).toBeDefined();
            expect(typeof UpgradeConfig.baseCosts[category]).toBe('number');
            expect(UpgradeConfig.baseCosts[category]).toBeGreaterThan(0);
        });
    });

    test('should have effects for all categories', () => {
        UpgradeConfig.categories.forEach(category => {
            const effect = UpgradeConfig.effects[category];
            expect(effect).toBeDefined();
            expect(effect.stat).toBeDefined();
            expect(effect.multiplier).toBeDefined();
            expect(effect.description).toBeDefined();
            expect(effect.visual).toBeDefined();
        });
    });
});

describe('StageConfig', () => {
    test('should have progressive stage configuration', () => {
        const stageIds = Object.keys(StageConfig).map(id => parseInt(id)).sort((a, b) => a - b);
        
        // Should start from 0
        expect(stageIds[0]).toBe(0);
        
        // Should be consecutive
        for (let i = 1; i < stageIds.length; i++) {
            expect(stageIds[i]).toBe(stageIds[i - 1] + 1);
        }
    });

    test('should have increasing difficulty', () => {
        const stages = Object.keys(StageConfig).map(id => StageConfig[id]);
        
        for (let i = 1; i < stages.length; i++) {
            // Zombie density should increase or stay same
            expect(stages[i].zombieDensity).toBeGreaterThanOrEqual(stages[i - 1].zombieDensity);
            
            // Money multiplier should increase or stay same
            expect(stages[i].moneyMultiplier).toBeGreaterThanOrEqual(stages[i - 1].moneyMultiplier);
        }
    });

    test('should have valid stage data structure', () => {
        Object.values(StageConfig).forEach(stage => {
            expect(stage.name).toBeDefined();
            expect(stage.description).toBeDefined();
            expect(stage.length).toBeGreaterThan(0);
            expect(stage.backgroundColor).toBeDefined();
            expect(stage.skyColor).toBeDefined();
            expect(stage.zombieDensity).toBeGreaterThanOrEqual(0);
            expect(Array.isArray(stage.obstacleTypes)).toBe(true);
            expect(stage.unlockDistance).toBeGreaterThanOrEqual(0);
            expect(stage.moneyMultiplier).toBeGreaterThan(0);
        });
    });
});

describe('PlayerStatistics', () => {
    let stats;

    beforeEach(() => {
        stats = new PlayerStatistics();
    });

    test('should initialize with default values', () => {
        expect(stats.money).toBe(0);
        expect(stats.bestDistance).toBe(0);
        expect(stats.totalRuns).toBe(0);
        expect(stats.totalZombiesKilled).toBe(0);
        expect(stats.totalMoneyEarned).toBe(0);
        expect(stats.totalPlayTime).toBe(0);
    });

    test('should update statistics after a run', () => {
        const runData = {
            distance: 1500,
            zombiesKilled: 25,
            moneyEarned: 150,
            playTime: 120,
            fuelConsumed: 80,
            obstaclesHit: 3,
            survivalTime: 180
        };

        stats.updateAfterRun(runData);

        expect(stats.totalRuns).toBe(1);
        expect(stats.bestDistance).toBe(1500);
        expect(stats.totalZombiesKilled).toBe(25);
        expect(stats.totalMoneyEarned).toBe(150);
        expect(stats.totalPlayTime).toBe(120);
        expect(stats.totalFuelConsumed).toBe(80);
        expect(stats.totalObstaclesHit).toBe(3);
        expect(stats.longestSurvivalTime).toBe(180);
        expect(stats.averageRunDistance).toBe(1500);
    });

    test('should update best distance only when improved', () => {
        stats.updateAfterRun({ distance: 1000, zombiesKilled: 10, moneyEarned: 100 });
        stats.updateAfterRun({ distance: 800, zombiesKilled: 8, moneyEarned: 80 });

        expect(stats.bestDistance).toBe(1000);
        expect(stats.totalRuns).toBe(2);
    });

    test('should calculate average run distance correctly', () => {
        stats.updateAfterRun({ distance: 1000, zombiesKilled: 10, moneyEarned: 100 });
        stats.updateAfterRun({ distance: 1500, zombiesKilled: 15, moneyEarned: 150 });
        stats.updateAfterRun({ distance: 500, zombiesKilled: 5, moneyEarned: 50 });

        expect(stats.averageRunDistance).toBe(1000); // (1000 + 1500 + 500) / 3
    });

    test('should format statistics for display', () => {
        stats.money = 1234;
        stats.bestDistance = 5678;
        stats.totalRuns = 42;
        stats.totalPlayTime = 3661; // 1 hour, 1 minute, 1 second

        const formatted = stats.getFormattedStats();

        expect(formatted.money).toBe('$1,234');
        expect(formatted.bestDistance).toBe('5,678m');
        expect(formatted.totalRuns).toBe('42');
        expect(formatted.totalPlayTime).toBe('1h 1m 1s');
    });

    test('should format time correctly', () => {
        expect(stats.formatTime(30)).toBe('30s');
        expect(stats.formatTime(90)).toBe('1m 30s');
        expect(stats.formatTime(3661)).toBe('1h 1m 1s');
        expect(stats.formatTime(7200)).toBe('2h 0m 0s');
    });
});

describe('VehicleData', () => {
    let vehicleData;

    beforeEach(() => {
        vehicleData = new VehicleData('STARTER_CAR');
    });

    test('should initialize with vehicle type and default upgrades', () => {
        expect(vehicleData.type).toBe('STARTER_CAR');
        expect(vehicleData.baseStats).toEqual(VehicleTypes.STARTER_CAR.baseStats);
        expect(vehicleData.upgrades.engine).toBe(0);
        expect(vehicleData.upgrades.fuel).toBe(0);
        expect(vehicleData.upgrades.armor).toBe(0);
        expect(vehicleData.upgrades.weapon).toBe(0);
        expect(vehicleData.upgrades.wheels).toBe(0);
    });

    test('should initialize with custom upgrades', () => {
        const customUpgrades = { engine: 2, fuel: 1, armor: 3 };
        const customVehicle = new VehicleData('OLD_TRUCK', customUpgrades);

        expect(customVehicle.upgrades.engine).toBe(2);
        expect(customVehicle.upgrades.fuel).toBe(1);
        expect(customVehicle.upgrades.armor).toBe(3);
        expect(customVehicle.upgrades.weapon).toBe(0); // Default
        expect(customVehicle.upgrades.wheels).toBe(0); // Default
    });

    test('should calculate effective stats with upgrades', () => {
        vehicleData.upgrades.engine = 2; // 20% * 2 = 40% increase
        vehicleData.upgrades.fuel = 1;   // 30% * 1 = 30% increase

        const effectiveStats = vehicleData.getEffectiveStats();
        const baseStats = VehicleTypes.STARTER_CAR.baseStats;

        expect(effectiveStats.engine).toBe(Math.round(baseStats.engine * 1.4)); // 50 * 1.4 = 70
        expect(effectiveStats.fuel).toBe(Math.round(baseStats.fuel * 1.3));     // 100 * 1.3 = 130
        expect(effectiveStats.armor).toBe(baseStats.armor); // No upgrade
    });

    test('should calculate upgrade costs correctly', () => {
        const engineCost = vehicleData.getUpgradeCost('engine');
        expect(engineCost).toBe(UpgradeConfig.baseCosts.engine); // Level 0 -> 1

        vehicleData.upgrades.engine = 2;
        const nextEngineCost = vehicleData.getUpgradeCost('engine');
        const expectedCost = Math.round(UpgradeConfig.baseCosts.engine * Math.pow(UpgradeConfig.costMultiplier, 2));
        expect(nextEngineCost).toBe(expectedCost);
    });

    test('should return null for max level upgrades', () => {
        vehicleData.upgrades.engine = UpgradeConfig.maxLevel;
        const cost = vehicleData.getUpgradeCost('engine');
        expect(cost).toBeNull();
    });

    test('should check upgrade availability', () => {
        expect(vehicleData.canUpgrade('engine')).toBe(true);

        vehicleData.upgrades.engine = UpgradeConfig.maxLevel;
        expect(vehicleData.canUpgrade('engine')).toBe(false);
    });

    test('should calculate total upgrade cost', () => {
        vehicleData.upgrades.engine = 2;
        vehicleData.upgrades.fuel = 1;

        const totalCost = vehicleData.getTotalUpgradeCost();
        
        // Calculate expected cost
        const engineCosts = UpgradeConfig.baseCosts.engine + 
                           Math.round(UpgradeConfig.baseCosts.engine * UpgradeConfig.costMultiplier);
        const fuelCost = UpgradeConfig.baseCosts.fuel;
        const expectedTotal = engineCosts + fuelCost;

        expect(totalCost).toBe(expectedTotal);
    });
});

describe('StageProgress', () => {
    let stageProgress;

    beforeEach(() => {
        stageProgress = new StageProgress();
    });

    test('should initialize with default values', () => {
        expect(stageProgress.currentStage).toBe(0);
        expect(stageProgress.unlockedStages).toEqual([0]);
        expect(stageProgress.stageData[0]).toBeDefined();
        expect(stageProgress.stageData[0].bestDistance).toBe(0);
        expect(stageProgress.stageData[0].completed).toBe(false);
    });

    test('should update stage progress', () => {
        const runData = {
            distance: 5000,
            zombiesKilled: 20,
            moneyEarned: 100
        };

        stageProgress.updateStageProgress(0, runData);

        expect(stageProgress.stageData[0].bestDistance).toBe(5000);
        expect(stageProgress.stageData[0].attempts).toBe(1);
        expect(stageProgress.stageData[0].totalZombiesKilled).toBe(20);
        expect(stageProgress.stageData[0].totalMoneyEarned).toBe(100);
    });

    test('should complete stage and unlock next stage', () => {
        const runData = {
            distance: StageConfig[0].length, // Complete the stage
            zombiesKilled: 30,
            moneyEarned: 200
        };

        stageProgress.updateStageProgress(0, runData);

        expect(stageProgress.stageData[0].completed).toBe(true);
        expect(stageProgress.unlockedStages).toContain(1);
    });

    test('should check if stage is unlocked', () => {
        expect(stageProgress.isStageUnlocked(0)).toBe(true);
        expect(stageProgress.isStageUnlocked(1)).toBe(false);

        stageProgress.unlockedStages.push(1);
        expect(stageProgress.isStageUnlocked(1)).toBe(true);
    });

    test('should calculate stage completion percentage', () => {
        stageProgress.stageData[0].bestDistance = 5000;
        const completion = stageProgress.getStageCompletion(0);
        
        const expectedPercentage = (5000 / StageConfig[0].length) * 100;
        expect(completion).toBe(expectedPercentage);
    });

    test('should cap completion percentage at 100%', () => {
        stageProgress.stageData[0].bestDistance = StageConfig[0].length * 2; // Double the stage length
        const completion = stageProgress.getStageCompletion(0);
        
        expect(completion).toBe(100);
    });
});

describe('createDefaultSaveData', () => {
    test('should create valid default save data structure', () => {
        const defaultData = createDefaultSaveData();

        expect(defaultData.version).toBe('1.0.0');
        expect(defaultData.timestamp).toBeDefined();
        expect(defaultData.player).toBeInstanceOf(PlayerStatistics);
        expect(defaultData.vehicles.owned).toEqual(['STARTER_CAR']);
        expect(defaultData.vehicles.selected).toBe('STARTER_CAR');
        expect(defaultData.stages).toBeInstanceOf(StageProgress);
        expect(defaultData.settings).toBeDefined();
        expect(defaultData.gameCompleted).toBe(false);
    });
});

describe('GameDataUtils', () => {
    test('should calculate money from distance correctly', () => {
        const distance = 1000;
        const money = GameDataUtils.calculateMoneyFromDistance(distance, 0);
        
        const expectedMoney = Math.round(distance * GameBalance.distanceToMoneyRate * StageConfig[0].moneyMultiplier);
        expect(money).toBe(expectedMoney);
    });

    test('should apply stage multiplier to money calculation', () => {
        const distance = 1000;
        const stage0Money = GameDataUtils.calculateMoneyFromDistance(distance, 0);
        const stage1Money = GameDataUtils.calculateMoneyFromDistance(distance, 1);
        
        expect(stage1Money).toBeGreaterThan(stage0Money);
        expect(stage1Money).toBe(Math.round(distance * GameBalance.distanceToMoneyRate * StageConfig[1].moneyMultiplier));
    });

    test('should get milestone bonuses correctly', () => {
        expect(GameDataUtils.getMilestoneBonus(500)).toBe(0);
        expect(GameDataUtils.getMilestoneBonus(1000)).toBe(50);
        expect(GameDataUtils.getMilestoneBonus(2500)).toBe(100);
        expect(GameDataUtils.getMilestoneBonus(5000)).toBe(200);
        expect(GameDataUtils.getMilestoneBonus(15000)).toBe(500); // Should get highest applicable bonus
    });

    test('should check vehicle unlock status', () => {
        const playerStats = { bestDistance: 1500 };
        
        const starterStatus = GameDataUtils.getVehicleUnlockStatus('STARTER_CAR', playerStats);
        expect(starterStatus.unlocked).toBe(true);
        expect(starterStatus.distanceRemaining).toBe(0);

        const truckStatus = GameDataUtils.getVehicleUnlockStatus('OLD_TRUCK', playerStats);
        expect(truckStatus.unlocked).toBe(true); // 1500 >= 1000
        expect(truckStatus.distanceRemaining).toBe(0);

        const sportsCarStatus = GameDataUtils.getVehicleUnlockStatus('SPORTS_CAR', playerStats);
        expect(sportsCarStatus.unlocked).toBe(false); // 1500 < 2500
        expect(sportsCarStatus.distanceRemaining).toBe(1000); // 2500 - 1500
    });

    test('should calculate vehicle value correctly', () => {
        const upgrades = { engine: 2, fuel: 1, armor: 0, weapon: 0, wheels: 0 };
        const value = GameDataUtils.calculateVehicleValue('OLD_TRUCK', upgrades);
        
        const baseValue = VehicleTypes.OLD_TRUCK.cost;
        const vehicleData = new VehicleData('OLD_TRUCK', upgrades);
        const upgradeValue = vehicleData.getTotalUpgradeCost();
        const expectedValue = baseValue + upgradeValue;
        
        expect(value).toBe(expectedValue);
    });
});

describe('GameBalance Configuration', () => {
    test('should have valid balance parameters', () => {
        expect(GameBalance.distanceToMoneyRate).toBeGreaterThan(0);
        expect(GameBalance.fuelConsumption.idle).toBeGreaterThan(0);
        expect(GameBalance.fuelConsumption.driving).toBeGreaterThan(GameBalance.fuelConsumption.idle);
        expect(GameBalance.fuelConsumption.boosting).toBeGreaterThan(GameBalance.fuelConsumption.driving);
    });

    test('should have progressive milestone bonuses', () => {
        const milestones = Object.keys(GameBalance.milestones).map(m => parseInt(m)).sort((a, b) => a - b);
        const bonuses = milestones.map(m => GameBalance.milestones[m]);
        
        // Bonuses should increase with distance
        for (let i = 1; i < bonuses.length; i++) {
            expect(bonuses[i]).toBeGreaterThan(bonuses[i - 1]);
        }
    });

    test('should have increasing spawn rates by stage', () => {
        const stages = Object.keys(GameBalance.zombieSpawnRates).map(s => parseInt(s)).sort((a, b) => a - b);
        
        for (let i = 1; i < stages.length; i++) {
            const currentRate = GameBalance.zombieSpawnRates[stages[i]];
            const previousRate = GameBalance.zombieSpawnRates[stages[i - 1]];
            expect(currentRate).toBeGreaterThanOrEqual(previousRate);
        }
    });
});

describe('ZombieTypes Configuration', () => {
    test('should have valid zombie type data', () => {
        Object.values(ZombieTypes).forEach(zombie => {
            expect(zombie.name).toBeDefined();
            expect(zombie.health).toBeGreaterThan(0);
            expect(zombie.speed).toBeGreaterThan(0);
            expect(zombie.damage).toBeGreaterThan(0);
            expect(zombie.color).toBeDefined();
            expect(zombie.sprite).toBeDefined();
            expect(zombie.spawnWeight).toBeGreaterThan(0);
            expect(zombie.spawnWeight).toBeLessThanOrEqual(1);
        });
    });

    test('should have spawn weights that sum to reasonable total', () => {
        const totalWeight = Object.values(ZombieTypes).reduce((sum, zombie) => sum + zombie.spawnWeight, 0);
        expect(totalWeight).toBeCloseTo(1, 1); // Should be close to 1.0
    });
});