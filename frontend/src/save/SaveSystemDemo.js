/**
 * Demonstration of the Zombie Car Game Save System
 * Shows how to use the SaveManager and GameDataModels
 */

import { ZombieCarSaveManager } from './ZombieCarSaveManager.js';
import { VehicleTypes, GameDataUtils, VehicleData } from './GameDataModels.js';

/**
 * Demo function showing basic save system usage
 */
export async function demonstrateSaveSystem() {
    console.log('=== Zombie Car Game Save System Demo ===');
    
    // Initialize the save manager
    const saveManager = new ZombieCarSaveManager();
    await saveManager.initialize();
    
    console.log('1. Initial save state:');
    console.log(JSON.stringify(saveManager.getSaveData(), null, 2));
    
    // Simulate a game run
    console.log('\n2. Simulating first run...');
    await saveManager.updateRunStats(1500, 25, 150);
    
    console.log('After first run:');
    const afterRun = saveManager.getSaveData();
    console.log(`Money: $${afterRun.player.money}`);
    console.log(`Best Distance: ${afterRun.player.bestDistance}m`);
    console.log(`Zombies Killed: ${afterRun.player.totalZombiesKilled}`);
    
    // Purchase vehicle upgrades
    console.log('\n3. Purchasing upgrades...');
    await saveManager.spendMoney(100);
    await saveManager.upgradeVehicle('STARTER_CAR', 'engine', 1);
    
    console.log('After upgrade:');
    const afterUpgrade = saveManager.getSaveData();
    console.log(`Money: $${afterUpgrade.player.money}`);
    console.log(`Engine Level: ${afterUpgrade.vehicles.upgrades.STARTER_CAR.engine}`);
    
    // Calculate effective stats with upgrades
    const vehicleData = new VehicleData('STARTER_CAR', afterUpgrade.vehicles.upgrades.STARTER_CAR);
    const effectiveStats = vehicleData.getEffectiveStats();
    console.log('Effective vehicle stats:', effectiveStats);
    
    // Purchase new vehicle
    console.log('\n4. Purchasing new vehicle...');
    await saveManager.addMoney(500);
    await saveManager.purchaseVehicle('OLD_TRUCK');
    await saveManager.selectVehicle('OLD_TRUCK');
    
    console.log('After vehicle purchase:');
    const afterPurchase = saveManager.getSaveData();
    console.log(`Owned vehicles: ${afterPurchase.vehicles.owned.join(', ')}`);
    console.log(`Selected vehicle: ${afterPurchase.vehicles.selected}`);
    
    // Check vehicle unlock status
    console.log('\n5. Vehicle unlock status:');
    Object.keys(VehicleTypes).forEach(vehicleType => {
        const status = GameDataUtils.getVehicleUnlockStatus(vehicleType, afterPurchase.player);
        console.log(`${VehicleTypes[vehicleType].name}: ${status.unlocked ? 'UNLOCKED' : `Locked (need ${status.distanceRemaining}m more)`}`);
    });
    
    // Update stage progress
    console.log('\n6. Updating stage progress...');
    await saveManager.updateStageProgress(0, 8000, false);
    await saveManager.updateStageProgress(0, 10000, true); // Complete stage
    
    const afterStage = saveManager.getSaveData();
    console.log(`Stage 0 completed: ${afterStage.stages.stageProgress[0].completed}`);
    console.log(`Unlocked stages: ${afterStage.stages.unlockedStages.join(', ')}`);
    
    // Export save data
    console.log('\n7. Exporting save data...');
    const exportedData = saveManager.exportSaveData();
    console.log('Save data exported successfully (length:', exportedData.length, 'characters)');
    
    // Demonstrate data validation
    console.log('\n8. Testing data validation...');
    const validData = saveManager.getSaveData();
    const validation = saveManager.validateSaveData(validData);
    console.log('Save data validation:', validation.isValid ? 'PASSED' : 'FAILED');
    if (!validation.isValid) {
        console.log('Validation errors:', validation.errors);
    }
    
    console.log('\n=== Demo Complete ===');
    return saveManager.getSaveData();
}

/**
 * Demo function showing error recovery
 */
export async function demonstrateErrorRecovery() {
    console.log('=== Error Recovery Demo ===');
    
    const saveManager = new ZombieCarSaveManager();
    
    // Test with corrupted data
    const corruptedData = {
        version: '1.0.0',
        timestamp: Date.now(),
        player: { money: 'invalid', bestDistance: -100 },
        vehicles: { owned: 'not an array', selected: null },
        stages: { currentStage: 'invalid' }
    };
    
    console.log('1. Testing data repair...');
    const repairedData = saveManager.repairSaveData(corruptedData);
    
    if (repairedData) {
        console.log('Data repair successful!');
        console.log('Repaired player money:', repairedData.player.money);
        console.log('Repaired vehicles:', repairedData.vehicles.owned);
    } else {
        console.log('Data repair failed');
    }
    
    // Test validation
    console.log('\n2. Testing validation...');
    const validation = saveManager.validateSaveData(corruptedData);
    console.log('Corrupted data validation:', validation.isValid ? 'PASSED' : 'FAILED');
    console.log('Validation errors:', validation.errors);
    
    console.log('\n=== Error Recovery Demo Complete ===');
}

/**
 * Demo function showing game balance calculations
 */
export function demonstrateGameBalance() {
    console.log('=== Game Balance Demo ===');
    
    // Test distance to money conversion
    console.log('1. Distance to money conversion:');
    [500, 1000, 2500, 5000, 10000].forEach(distance => {
        const money = GameDataUtils.calculateMoneyFromDistance(distance, 0);
        const bonus = GameDataUtils.getMilestoneBonus(distance);
        const total = money + bonus;
        console.log(`${distance}m -> $${money} + $${bonus} bonus = $${total} total`);
    });
    
    // Test upgrade costs
    console.log('\n2. Upgrade cost progression:');
    const vehicleData = new VehicleData('STARTER_CAR');
    for (let level = 0; level < 5; level++) {
        vehicleData.upgrades.engine = level;
        const cost = vehicleData.getUpgradeCost('engine');
        console.log(`Engine Level ${level} -> ${level + 1}: $${cost || 'MAX LEVEL'}`);
    }
    
    // Test vehicle values
    console.log('\n3. Vehicle values with upgrades:');
    Object.keys(VehicleTypes).forEach(vehicleType => {
        const upgrades = { engine: 2, fuel: 1, armor: 1, weapon: 0, wheels: 1 };
        const value = GameDataUtils.calculateVehicleValue(vehicleType, upgrades);
        console.log(`${VehicleTypes[vehicleType].name}: $${value} (with upgrades)`);
    });
    
    console.log('\n=== Game Balance Demo Complete ===');
}

// Export demo functions for use in other modules
export default {
    demonstrateSaveSystem,
    demonstrateErrorRecovery,
    demonstrateGameBalance
};