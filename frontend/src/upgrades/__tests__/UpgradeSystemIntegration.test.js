/**
 * Integration tests for the complete upgrade system
 * Tests UpgradeShop, VehicleVisualEnhancer, and their integration with VehicleSystem
 */

import UpgradeShop from '../UpgradeShop.js';
import VehicleVisualEnhancer from '../VehicleVisualEnhancer.js';
import { VehicleSystem } from '../../vehicles/VehicleSystem.js';
import { ZombieCarSaveManager } from '../../save/ZombieCarSaveManager.js';
import { VehicleTypes, UpgradeConfig } from '../../save/GameDataModels.js';

// Mock localStorage for testing
const mockLocalStorage = {
    data: {},
    getItem: jest.fn((key) => mockLocalStorage.data[key] || null),
    setItem: jest.fn((key, value) => {
        mockLocalStorage.data[key] = value;
    }),
    removeItem: jest.fn((key) => {
        delete mockLocalStorage.data[key];
    }),
    clear: jest.fn(() => {
        mockLocalStorage.data = {};
    })
};

// Mock Canvas Context for visual tests
class MockCanvasContext {
    constructor() {
        this.operations = [];
        this.state = { fillStyle: '#000000', strokeStyle: '#000000', lineWidth: 1 };
    }
    
    fillRect(x, y, width, height) {
        this.operations.push({ type: 'fillRect', x, y, width, height });
    }
    
    strokeRect(x, y, width, height) {
        this.operations.push({ type: 'strokeRect', x, y, width, height });
    }
    
    beginPath() { this.operations.push({ type: 'beginPath' }); }
    arc(x, y, r, start, end) { this.operations.push({ type: 'arc', x, y, r, start, end }); }
    fill() { this.operations.push({ type: 'fill' }); }
    stroke() { this.operations.push({ type: 'stroke' }); }
    save() { this.operations.push({ type: 'save' }); }
    restore() { this.operations.push({ type: 'restore' }); }
    translate(x, y) { this.operations.push({ type: 'translate', x, y }); }
    rotate(angle) { this.operations.push({ type: 'rotate', angle }); }
    moveTo(x, y) { this.operations.push({ type: 'moveTo', x, y }); }
    lineTo(x, y) { this.operations.push({ type: 'lineTo', x, y }); }
    closePath() { this.operations.push({ type: 'closePath' }); }
    
    set fillStyle(value) { this.state.fillStyle = value; }
    get fillStyle() { return this.state.fillStyle; }
    set strokeStyle(value) { this.state.strokeStyle = value; }
    get strokeStyle() { return this.state.strokeStyle; }
    set lineWidth(value) { this.state.lineWidth = value; }
    get lineWidth() { return this.state.lineWidth; }
    set shadowColor(value) { this.state.shadowColor = value; }
    get shadowColor() { return this.state.shadowColor; }
    set shadowBlur(value) { this.state.shadowBlur = value; }
    get shadowBlur() { return this.state.shadowBlur; }
    
    getOperations() { return this.operations; }
    clearOperations() { this.operations = []; }
}

describe('Upgrade System Integration', () => {
    let saveManager;
    let vehicleSystem;
    let upgradeShop;
    let visualEnhancer;
    let mockCtx;
    
    beforeEach(() => {
        // Mock localStorage
        Object.defineProperty(window, 'localStorage', {
            value: mockLocalStorage,
            writable: true
        });
        mockLocalStorage.clear();
        
        // Initialize systems
        saveManager = new ZombieCarSaveManager();
        vehicleSystem = new VehicleSystem(saveManager);
        upgradeShop = new UpgradeShop(saveManager);
        visualEnhancer = new VehicleVisualEnhancer();
        mockCtx = new MockCanvasContext();
        
        // Set up initial game state with some money
        const saveData = saveManager.getSaveData();
        saveData.player.money = 5000;
        saveData.player.bestDistance = 10000;
        saveManager.saveToDisk();
    });
    
    afterEach(() => {
        mockLocalStorage.clear();
    });
    
    describe('Complete Upgrade Workflow', () => {
        test('should complete full upgrade purchase and application workflow', () => {
            const vehicleType = 'STARTER_CAR';
            const category = 'engine';
            
            // 1. Check initial state
            const initialInfo = upgradeShop.getUpgradeInfo(vehicleType, category);
            expect(initialInfo.currentLevel).toBe(0);
            expect(initialInfo.canUpgrade.canUpgrade).toBe(true);
            expect(initialInfo.canAfford.canUpgrade).toBe(true);
            
            // 2. Purchase upgrade
            const purchaseResult = upgradeShop.purchaseUpgrade(vehicleType, category);
            expect(purchaseResult.success).toBe(true);
            expect(purchaseResult.newLevel).toBe(1);
            
            // 3. Verify upgrade was applied to save data
            const saveData = saveManager.getSaveData();
            expect(saveData.vehicles.upgrades[vehicleType][category]).toBe(1);
            
            // 4. Verify vehicle system reflects the upgrade
            const vehicle = vehicleSystem.getVehicle(vehicleType);
            const effectiveStats = vehicle.getEffectiveStats();
            expect(effectiveStats.engine).toBeGreaterThan(vehicle.getBaseStats().engine);
            
            // 5. Verify visual changes are applied
            const upgrades = vehicle.getCurrentUpgrades();
            visualEnhancer.applyEnhancements(mockCtx, { width: 80, height: 40 }, upgrades, { x: 0, y: 0 }, 0);
            
            const drawingOps = mockCtx.getOperations().filter(op => 
                ['fillRect', 'strokeRect'].includes(op.type)
            );
            expect(drawingOps.length).toBeGreaterThan(0);
        });
        
        test('should handle multiple upgrades correctly', () => {
            const vehicleType = 'STARTER_CAR';
            const categories = ['engine', 'fuel', 'armor'];
            
            // Purchase multiple upgrades
            const results = categories.map(category => 
                upgradeShop.purchaseUpgrade(vehicleType, category)
            );
            
            // Verify all purchases succeeded
            results.forEach((result, index) => {
                expect(result.success).toBe(true);
                expect(result.category).toBe(categories[index]);
                expect(result.newLevel).toBe(1);
            });
            
            // Verify vehicle stats reflect all upgrades
            const vehicle = vehicleSystem.getVehicle(vehicleType);
            const effectiveStats = vehicle.getEffectiveStats();
            const baseStats = vehicle.getBaseStats();
            
            expect(effectiveStats.engine).toBeGreaterThan(baseStats.engine);
            expect(effectiveStats.fuel).toBeGreaterThan(baseStats.fuel);
            expect(effectiveStats.armor).toBeGreaterThan(baseStats.armor);
            
            // Verify visual enhancements for all categories
            const upgrades = vehicle.getCurrentUpgrades();
            const visualSummary = visualEnhancer.getUpgradeVisualSummary(upgrades);
            
            expect(visualSummary.totalVisualChanges).toBeGreaterThan(0);
            expect(visualSummary.categories.engine.changes).toBeGreaterThan(0);
            expect(visualSummary.categories.fuel.changes).toBe(0); // Fuel doesn't show visuals at level 1
            expect(visualSummary.categories.armor.changes).toBeGreaterThan(0);
        });
        
        test('should handle upgrade progression through multiple levels', () => {
            const vehicleType = 'STARTER_CAR';
            const category = 'weapon';
            const targetLevel = 3;
            
            // Purchase upgrades to reach target level
            for (let i = 0; i < targetLevel; i++) {
                const result = upgradeShop.purchaseUpgrade(vehicleType, category);
                expect(result.success).toBe(true);
                expect(result.newLevel).toBe(i + 1);
            }
            
            // Verify final state
            const vehicle = vehicleSystem.getVehicle(vehicleType);
            const upgrades = vehicle.getCurrentUpgrades();
            expect(upgrades[category]).toBe(targetLevel);
            
            // Verify visual progression
            const visualChanges = visualEnhancer.getVisualChangesForCategory(category, targetLevel);
            expect(visualChanges).toContain('Roof-mounted gun');
            expect(visualChanges).toContain('Muzzle brake');
            expect(visualChanges).toContain('Rotating turret and side weapons');
            
            // Verify rendering includes all expected elements
            visualEnhancer.applyEnhancements(mockCtx, { width: 80, height: 40 }, upgrades, { x: 0, y: 0 }, 0);
            
            const operations = mockCtx.getOperations();
            const weaponOperations = operations.filter(op => 
                op.type === 'fillRect' && (op.y < -20 || Math.abs(op.x) > 40)
            );
            expect(weaponOperations.length).toBeGreaterThan(3); // Multiple weapon components
        });
    });
    
    describe('Cost and Affordability Integration', () => {
        test('should handle insufficient funds correctly', () => {
            const vehicleType = 'STARTER_CAR';
            const category = 'engine';
            
            // Set money to a low amount
            const saveData = saveManager.getSaveData();
            saveData.player.money = 50;
            saveManager.saveToDisk();
            
            // Try to purchase upgrade
            expect(() => {
                upgradeShop.purchaseUpgrade(vehicleType, category);
            }).toThrow('Cannot purchase upgrade: Insufficient funds');
            
            // Verify no changes were made
            const vehicle = vehicleSystem.getVehicle(vehicleType);
            const upgrades = vehicle.getCurrentUpgrades();
            expect(upgrades[category]).toBe(0);
        });
        
        test('should calculate exponential costs correctly', () => {
            const vehicleType = 'STARTER_CAR';
            const category = 'engine';
            
            const costs = [];
            const baseCost = UpgradeConfig.baseCosts[category];
            
            // Purchase upgrades and track costs
            for (let level = 0; level < 3; level++) {
                const info = upgradeShop.getUpgradeInfo(vehicleType, category);
                costs.push(info.cost);
                
                upgradeShop.purchaseUpgrade(vehicleType, category);
            }
            
            // Verify exponential scaling
            expect(costs[0]).toBe(baseCost);
            expect(costs[1]).toBe(Math.round(baseCost * UpgradeConfig.costMultiplier));
            expect(costs[2]).toBe(Math.round(baseCost * Math.pow(UpgradeConfig.costMultiplier, 2)));
        });
        
        test('should handle max level restrictions', () => {
            const vehicleType = 'STARTER_CAR';
            const category = 'armor';
            
            // Purchase upgrades to max level
            for (let i = 0; i < UpgradeConfig.maxLevel; i++) {
                const result = upgradeShop.purchaseUpgrade(vehicleType, category);
                expect(result.success).toBe(true);
            }
            
            // Try to purchase beyond max level
            expect(() => {
                upgradeShop.purchaseUpgrade(vehicleType, category);
            }).toThrow('Cannot purchase upgrade: Max level reached');
            
            // Verify upgrade info reflects max level
            const info = upgradeShop.getUpgradeInfo(vehicleType, category);
            expect(info.isMaxLevel).toBe(true);
            expect(info.canUpgrade.canUpgrade).toBe(false);
        });
    });
    
    describe('Vehicle System Integration', () => {
        test('should apply upgrades to vehicle performance correctly', () => {
            const vehicleType = 'STARTER_CAR';
            const vehicle = vehicleSystem.getVehicle(vehicleType);
            
            // Get initial performance
            const initialPerformance = vehicle.getPerformanceMetrics();
            
            // Purchase engine upgrades
            upgradeShop.purchaseUpgrade(vehicleType, 'engine');
            upgradeShop.purchaseUpgrade(vehicleType, 'engine');
            
            // Get updated performance
            const updatedPerformance = vehicle.getPerformanceMetrics();
            
            // Verify performance improvements
            expect(updatedPerformance.acceleration).toBeGreaterThan(initialPerformance.acceleration);
            expect(updatedPerformance.topSpeed).toBeGreaterThan(initialPerformance.topSpeed);
            expect(updatedPerformance.overallRating).toBeGreaterThan(initialPerformance.overallRating);
        });
        
        test('should handle fuel capacity upgrades correctly', () => {
            const vehicleType = 'STARTER_CAR';
            const vehicle = vehicleSystem.getVehicle(vehicleType);
            
            // Get initial fuel capacity
            const initialCapacity = vehicle.getFuelCapacity();
            
            // Purchase fuel upgrades
            upgradeShop.purchaseUpgrade(vehicleType, 'fuel');
            upgradeShop.purchaseUpgrade(vehicleType, 'fuel');
            
            // Get updated fuel capacity
            const updatedCapacity = vehicle.getFuelCapacity();
            
            // Verify fuel capacity increased
            expect(updatedCapacity).toBeGreaterThan(initialCapacity);
            
            // Verify fuel consumption efficiency improved
            const upgrades = vehicle.getCurrentUpgrades();
            const baseRate = 1.0;
            const efficiencyMultiplier = 1 - (upgrades.fuel * 0.1);
            expect(efficiencyMultiplier).toBeLessThan(1.0);
        });
        
        test('should handle armor upgrades and damage reduction', () => {
            const vehicleType = 'STARTER_CAR';
            const vehicle = vehicleSystem.getVehicle(vehicleType);
            
            // Purchase armor upgrades
            upgradeShop.purchaseUpgrade(vehicleType, 'armor');
            upgradeShop.purchaseUpgrade(vehicleType, 'armor');
            upgradeShop.purchaseUpgrade(vehicleType, 'armor');
            
            // Test damage reduction
            const testDamage = 50;
            const stats = vehicle.getEffectiveStats();
            const armorReduction = Math.min(0.8, stats.armor * 0.01);
            const expectedDamage = testDamage * (1 - armorReduction);
            
            vehicle.health = 100;
            const actualDamage = vehicle.takeDamage(testDamage);
            
            expect(actualDamage).toBeLessThan(testDamage);
            expect(Math.abs(actualDamage - expectedDamage)).toBeLessThan(1); // Allow for rounding
        });
    });
    
    describe('Visual Enhancement Integration', () => {
        test('should render different visual enhancements for different upgrade levels', () => {
            const vehicleType = 'STARTER_CAR';
            const mockVehicle = { width: 80, height: 40, controls: { throttle: 0 } };
            
            // Test level 1 engine upgrade
            upgradeShop.purchaseUpgrade(vehicleType, 'engine');
            let vehicle = vehicleSystem.getVehicle(vehicleType);
            let upgrades = vehicle.getCurrentUpgrades();
            
            mockCtx.clearOperations();
            visualEnhancer.applyEnhancements(mockCtx, mockVehicle, upgrades, { x: 0, y: 0 }, 0);
            const level1Ops = mockCtx.getOperations().length;
            
            // Test level 3 engine upgrade
            upgradeShop.purchaseUpgrade(vehicleType, 'engine');
            upgradeShop.purchaseUpgrade(vehicleType, 'engine');
            vehicle = vehicleSystem.getVehicle(vehicleType);
            upgrades = vehicle.getCurrentUpgrades();
            
            mockCtx.clearOperations();
            visualEnhancer.applyEnhancements(mockCtx, mockVehicle, upgrades, { x: 0, y: 0 }, 0);
            const level3Ops = mockCtx.getOperations().length;
            
            // Level 3 should have more visual elements than level 1
            expect(level3Ops).toBeGreaterThan(level1Ops);
        });
        
        test('should handle combined visual enhancements from multiple categories', () => {
            const vehicleType = 'STARTER_CAR';
            const mockVehicle = { width: 80, height: 40, controls: { throttle: 0 } };
            
            // Purchase upgrades in multiple categories
            upgradeShop.purchaseUpgrade(vehicleType, 'engine');
            upgradeShop.purchaseUpgrade(vehicleType, 'armor');
            upgradeShop.purchaseUpgrade(vehicleType, 'armor');
            upgradeShop.purchaseUpgrade(vehicleType, 'weapon');
            upgradeShop.purchaseUpgrade(vehicleType, 'fuel');
            upgradeShop.purchaseUpgrade(vehicleType, 'fuel');
            upgradeShop.purchaseUpgrade(vehicleType, 'fuel');
            
            const vehicle = vehicleSystem.getVehicle(vehicleType);
            const upgrades = vehicle.getCurrentUpgrades();
            
            // Render all enhancements
            visualEnhancer.applyEnhancements(mockCtx, mockVehicle, upgrades, { x: 0, y: 0 }, 0);
            
            const operations = mockCtx.getOperations();
            const drawingOps = operations.filter(op => 
                ['fillRect', 'strokeRect', 'arc', 'fill', 'stroke'].includes(op.type)
            );
            
            // Should have many drawing operations from all categories
            expect(drawingOps.length).toBeGreaterThan(10);
            
            // Verify visual summary
            const visualSummary = visualEnhancer.getUpgradeVisualSummary(upgrades);
            expect(visualSummary.totalVisualChanges).toBeGreaterThan(3);
            expect(visualSummary.categories.engine.changes).toBeGreaterThan(0);
            expect(visualSummary.categories.armor.changes).toBeGreaterThan(0);
            expect(visualSummary.categories.weapon.changes).toBeGreaterThan(0);
            expect(visualSummary.categories.fuel.changes).toBeGreaterThan(0); // Level 3+ shows external tanks
        });
    });
    
    describe('Save System Integration', () => {
        test('should persist upgrades across save/load cycles', () => {
            const vehicleType = 'STARTER_CAR';
            
            // Purchase some upgrades
            upgradeShop.purchaseUpgrade(vehicleType, 'engine');
            upgradeShop.purchaseUpgrade(vehicleType, 'fuel');
            upgradeShop.purchaseUpgrade(vehicleType, 'armor');
            
            // Get current state
            const vehicle = vehicleSystem.getVehicle(vehicleType);
            const originalUpgrades = vehicle.getCurrentUpgrades();
            const originalStats = vehicle.getEffectiveStats();
            
            // Create new systems (simulating game restart)
            const newSaveManager = new ZombieCarSaveManager();
            const newVehicleSystem = new VehicleSystem(newSaveManager);
            const newUpgradeShop = new UpgradeShop(newSaveManager);
            
            // Verify upgrades were loaded correctly
            const loadedVehicle = newVehicleSystem.getVehicle(vehicleType);
            const loadedUpgrades = loadedVehicle.getCurrentUpgrades();
            const loadedStats = loadedVehicle.getEffectiveStats();
            
            expect(loadedUpgrades).toEqual(originalUpgrades);
            expect(loadedStats).toEqual(originalStats);
            
            // Verify upgrade shop recognizes the upgrades
            const engineInfo = newUpgradeShop.getUpgradeInfo(vehicleType, 'engine');
            expect(engineInfo.currentLevel).toBe(originalUpgrades.engine);
        });
        
        test('should handle upgrade reset correctly', () => {
            const vehicleType = 'STARTER_CAR';
            
            // Purchase several upgrades
            const upgradesToPurchase = ['engine', 'fuel', 'armor', 'weapon'];
            upgradesToPurchase.forEach(category => {
                upgradeShop.purchaseUpgrade(vehicleType, category);
                upgradeShop.purchaseUpgrade(vehicleType, category);
            });
            
            const initialMoney = saveManager.getSaveData().player.money;
            
            // Reset upgrades
            const resetResult = upgradeShop.resetVehicleUpgrades(vehicleType);
            
            expect(resetResult.success).toBe(true);
            expect(resetResult.refundAmount).toBeGreaterThan(0);
            
            // Verify upgrades were reset
            const vehicle = vehicleSystem.getVehicle(vehicleType);
            const upgrades = vehicle.getCurrentUpgrades();
            
            Object.values(upgrades).forEach(level => {
                expect(level).toBe(0);
            });
            
            // Verify money was refunded
            const finalMoney = saveManager.getSaveData().player.money;
            expect(finalMoney).toBeGreaterThan(initialMoney);
        });
    });
    
    describe('Performance and Edge Cases', () => {
        test('should handle rapid upgrade purchases efficiently', () => {
            const vehicleType = 'STARTER_CAR';
            const startTime = performance.now();
            
            // Purchase many upgrades rapidly
            for (let i = 0; i < 20; i++) {
                const category = UpgradeConfig.categories[i % UpgradeConfig.categories.length];
                try {
                    upgradeShop.purchaseUpgrade(vehicleType, category);
                } catch (error) {
                    // Expected when reaching max level or insufficient funds
                }
            }
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            // Should complete within reasonable time (less than 100ms)
            expect(duration).toBeLessThan(100);
        });
        
        test('should handle invalid upgrade attempts gracefully', () => {
            // Try to upgrade non-existent vehicle
            expect(() => {
                upgradeShop.purchaseUpgrade('INVALID_VEHICLE', 'engine');
            }).toThrow();
            
            // Try to upgrade with invalid category
            expect(() => {
                upgradeShop.purchaseUpgrade('STARTER_CAR', 'invalid_category');
            }).toThrow();
            
            // Try to upgrade unowned vehicle
            expect(() => {
                upgradeShop.purchaseUpgrade('SPORTS_CAR', 'engine');
            }).toThrow();
        });
        
        test('should maintain data consistency under stress', () => {
            const vehicleType = 'STARTER_CAR';
            
            // Perform many operations
            for (let i = 0; i < 50; i++) {
                const category = UpgradeConfig.categories[i % UpgradeConfig.categories.length];
                
                try {
                    const info = upgradeShop.getUpgradeInfo(vehicleType, category);
                    if (info.canAfford.canUpgrade) {
                        upgradeShop.purchaseUpgrade(vehicleType, category);
                    }
                } catch (error) {
                    // Expected for max level or insufficient funds
                }
                
                // Verify data consistency
                const vehicle = vehicleSystem.getVehicle(vehicleType);
                const upgrades = vehicle.getCurrentUpgrades();
                const saveData = saveManager.getSaveData();
                
                expect(upgrades).toEqual(saveData.vehicles.upgrades[vehicleType]);
            }
        });
    });
});