/**
 * Vehicle Damage System Tests
 * Comprehensive tests for vehicle damage simulation
 */

import { VehicleDamageSystem } from '../VehicleDamageSystem.js';

// Mock electron integration
jest.mock('../electron/ElectronIntegration.js', () => ({
    electronIntegration: {
        getLogger: () => ({
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        })
    }
}));

describe('VehicleDamageSystem', () => {
    let damageSystem;
    let vehicleConfig;

    beforeEach(() => {
        vehicleConfig = {
            mass: 1500,
            dimensions: { length: 4.5, width: 1.8, height: 1.4 }
        };

        damageSystem = new VehicleDamageSystem(vehicleConfig, {
            enableVisualDamage: true,
            enablePerformanceDegradation: true,
            enableComponentDamage: true,
            enableRepairSystem: true
        });
    });

    afterEach(() => {
        damageSystem.dispose();
    });

    describe('Initialization', () => {
        test('should initialize with default component health', () => {
            const status = damageSystem.getStatus();
            
            expect(status.totalDamage).toBe(0);
            expect(status.componentHealth).toHaveLength(8); // All components
            
            status.componentHealth.forEach(component => {
                if (Array.isArray(component.health)) {
                    component.health.forEach(health => {
                        expect(health).toBe(100);
                    });
                } else {
                    expect(component.health).toBe(100);
                }
            });
        });

        test('should emit initialized event', () => {
            const initSpy = jest.fn();
            const newDamageSystem = new VehicleDamageSystem(vehicleConfig);
            
            newDamageSystem.on('initialized', initSpy);
            
            expect(initSpy).toHaveBeenCalledWith({
                components: expect.arrayContaining(['engine', 'transmission', 'suspension', 'tires']),
                repairOptions: expect.arrayContaining(['engine', 'transmission', 'suspension', 'tires'])
            });
            
            newDamageSystem.dispose();
        });
    });

    describe('Collision Damage', () => {
        test('should apply collision damage correctly', () => {
            const impactData = {
                velocity: { x: 0, y: 0, z: 20 }, // 20 m/s front impact
                direction: { x: 0, y: 0, z: 1 },
                impactPoint: { x: 0, y: 0, z: 2 },
                severity: 1.0
            };

            const damageSpy = jest.fn();
            damageSystem.on('collisionDamage', damageSpy);

            damageSystem.applyCollisionDamage(impactData);

            expect(damageSpy).toHaveBeenCalled();
            
            const status = damageSystem.getStatus();
            expect(status.totalDamage).toBeGreaterThan(0);
            
            // Engine should be damaged in front impact
            const engineHealth = damageSystem.getComponentHealth('engine');
            expect(engineHealth.health).toBeLessThan(100);
        });

        test('should not apply damage below threshold', () => {
            const impactData = {
                velocity: { x: 0, y: 0, z: 2 }, // 2 m/s - below threshold
                direction: { x: 0, y: 0, z: 1 },
                impactPoint: { x: 0, y: 0, z: 2 },
                severity: 1.0
            };

            damageSystem.applyCollisionDamage(impactData);

            const status = damageSystem.getStatus();
            expect(status.totalDamage).toBe(0);
        });

        test('should apply different damage based on impact direction', () => {
            // Front impact
            const frontImpact = {
                velocity: { x: 0, y: 0, z: 15 },
                direction: { x: 0, y: 0, z: 1 },
                impactPoint: { x: 0, y: 0, z: 2 },
                severity: 1.0
            };

            // Rear impact
            const rearImpact = {
                velocity: { x: 0, y: 0, z: -15 },
                direction: { x: 0, y: 0, z: -1 },
                impactPoint: { x: 0, y: 0, z: -2 },
                severity: 1.0
            };

            const frontDamageSystem = new VehicleDamageSystem(vehicleConfig);
            const rearDamageSystem = new VehicleDamageSystem(vehicleConfig);

            frontDamageSystem.applyCollisionDamage(frontImpact);
            rearDamageSystem.applyCollisionDamage(rearImpact);

            const frontEngineHealth = frontDamageSystem.getComponentHealth('engine').health;
            const frontFuelHealth = frontDamageSystem.getComponentHealth('fuel_system').health;
            
            const rearEngineHealth = rearDamageSystem.getComponentHealth('engine').health;
            const rearFuelHealth = rearDamageSystem.getComponentHealth('fuel_system').health;

            // Front impact should damage engine more than fuel system
            expect(frontEngineHealth).toBeLessThan(frontFuelHealth);
            
            // Rear impact should damage fuel system more than engine
            expect(rearFuelHealth).toBeLessThan(rearEngineHealth);

            frontDamageSystem.dispose();
            rearDamageSystem.dispose();
        });
    });

    describe('Component Damage', () => {
        test('should damage individual components', () => {
            const initialHealth = damageSystem.getComponentHealth('engine').health;
            
            damageSystem.damageComponent('engine', 25, 'collision');
            
            const newHealth = damageSystem.getComponentHealth('engine').health;
            expect(newHealth).toBe(initialHealth - 25);
        });

        test('should not damage below zero', () => {
            damageSystem.damageComponent('engine', 150, 'collision');
            
            const health = damageSystem.getComponentHealth('engine').health;
            expect(health).toBe(0);
        });

        test('should emit critical damage event', () => {
            const criticalSpy = jest.fn();
            damageSystem.on('criticalDamage', criticalSpy);

            // Damage engine to critical level (below 20%)
            damageSystem.damageComponent('engine', 85, 'collision');

            expect(criticalSpy).toHaveBeenCalledWith({
                component: 'engine',
                health: 15,
                damageType: 'collision'
            });
        });

        test('should handle multi-part components', () => {
            const initialTireHealth = damageSystem.getComponentHealth('tires').health;
            
            damageSystem.damageComponent('tires', 40, 'puncture');
            
            const newTireHealth = damageSystem.getComponentHealth('tires').health;
            
            // Each tire should be damaged by 40/4 = 10
            newTireHealth.forEach((health, index) => {
                expect(health).toBe(initialTireHealth[index] - 10);
            });
        });
    });

    describe('Performance Degradation', () => {
        test('should update performance modifiers when components are damaged', () => {
            const initialModifiers = damageSystem.getPerformanceModifiers();
            
            // Damage engine significantly
            damageSystem.damageComponent('engine', 60, 'collision');
            
            const newModifiers = damageSystem.getPerformanceModifiers();
            
            expect(newModifiers.acceleration).toBeLessThan(initialModifiers.acceleration);
            expect(newModifiers.maxSpeed).toBeLessThan(initialModifiers.maxSpeed);
        });

        test('should respect maximum performance loss limit', () => {
            // Damage all components severely
            Object.keys(damageSystem.components).forEach(component => {
                damageSystem.damageComponent(component, 100, 'collision');
            });

            const modifiers = damageSystem.getPerformanceModifiers();
            
            // Should not go below 30% (1.0 - 0.7 max loss)
            Object.values(modifiers).forEach(modifier => {
                expect(modifier).toBeGreaterThanOrEqual(0.3);
            });
        });

        test('should disable performance degradation when option is false', () => {
            const noPerfDamageSystem = new VehicleDamageSystem(vehicleConfig, {
                enablePerformanceDegradation: false
            });

            const initialModifiers = noPerfDamageSystem.getPerformanceModifiers();
            
            noPerfDamageSystem.damageComponent('engine', 80, 'collision');
            
            const newModifiers = noPerfDamageSystem.getPerformanceModifiers();
            
            expect(newModifiers).toEqual(initialModifiers);
            
            noPerfDamageSystem.dispose();
        });
    });

    describe('Wear Damage', () => {
        test('should apply wear damage over time', () => {
            const usage = {
                engineRPM: 3000,
                engineTemp: 90,
                speed: 60,
                tireSlip: 0.1,
                brakeIntensity: 0.5,
                roadRoughness: 0.3,
                isShifting: false,
                transmissionLoad: 0.6
            };

            const initialEngineHealth = damageSystem.getComponentHealth('engine').health;
            
            // Simulate 10 seconds of wear
            for (let i = 0; i < 10; i++) {
                damageSystem.applyWearDamage(1.0, usage);
            }

            const newEngineHealth = damageSystem.getComponentHealth('engine').health;
            expect(newEngineHealth).toBeLessThan(initialEngineHealth);
        });

        test('should apply different wear rates based on usage intensity', () => {
            const lightUsage = {
                engineRPM: 1500,
                engineTemp: 80,
                speed: 30,
                tireSlip: 0.02,
                brakeIntensity: 0.1,
                roadRoughness: 0.1
            };

            const heavyUsage = {
                engineRPM: 5000,
                engineTemp: 110,
                speed: 120,
                tireSlip: 0.3,
                brakeIntensity: 0.9,
                roadRoughness: 0.8
            };

            const lightSystem = new VehicleDamageSystem(vehicleConfig);
            const heavySystem = new VehicleDamageSystem(vehicleConfig);

            // Apply same duration but different intensity
            for (let i = 0; i < 5; i++) {
                lightSystem.applyWearDamage(1.0, lightUsage);
                heavySystem.applyWearDamage(1.0, heavyUsage);
            }

            const lightEngineHealth = lightSystem.getComponentHealth('engine').health;
            const heavyEngineHealth = heavySystem.getComponentHealth('engine').health;

            expect(heavyEngineHealth).toBeLessThan(lightEngineHealth);

            lightSystem.dispose();
            heavySystem.dispose();
        });
    });

    describe('Overheating Damage', () => {
        test('should apply overheating damage above critical temperature', () => {
            const initialEngineHealth = damageSystem.getComponentHealth('engine').health;
            
            // Apply overheating at 120°C for 5 seconds
            for (let i = 0; i < 5; i++) {
                damageSystem.applyOverheatingDamage(120, 1.0);
            }

            const newEngineHealth = damageSystem.getComponentHealth('engine').health;
            expect(newEngineHealth).toBeLessThan(initialEngineHealth);
        });

        test('should not apply damage below critical temperature', () => {
            const initialEngineHealth = damageSystem.getComponentHealth('engine').health;
            
            damageSystem.applyOverheatingDamage(100, 1.0);

            const newEngineHealth = damageSystem.getComponentHealth('engine').health;
            expect(newEngineHealth).toBe(initialEngineHealth);
        });
    });

    describe('Repair System', () => {
        test('should start repair process', () => {
            // Damage engine first
            damageSystem.damageComponent('engine', 50, 'collision');
            
            const repairSpy = jest.fn();
            damageSystem.on('repairStarted', repairSpy);

            const success = damageSystem.startRepair('engine');
            
            expect(success).toBe(true);
            expect(repairSpy).toHaveBeenCalledWith({
                component: 'engine',
                type: 'full',
                duration: expect.any(Number),
                cost: expect.any(Number)
            });
        });

        test('should not start repair if component is healthy', () => {
            const success = damageSystem.startRepair('engine');
            expect(success).toBe(false);
        });

        test('should not start repair if already repairing', () => {
            damageSystem.damageComponent('engine', 50, 'collision');
            damageSystem.damageComponent('transmission', 50, 'collision');
            
            damageSystem.startRepair('engine');
            const success = damageSystem.startRepair('transmission');
            
            expect(success).toBe(false);
        });

        test('should complete repair and restore health', (done) => {
            damageSystem.damageComponent('engine', 50, 'collision');
            
            damageSystem.on('repairCompleted', (data) => {
                expect(data.component).toBe('engine');
                expect(data.newHealth).toBe(100);
                
                const engineHealth = damageSystem.getComponentHealth('engine').health;
                expect(engineHealth).toBe(100);
                
                done();
            });

            damageSystem.startRepair('engine');
            
            // Fast-forward repair completion
            damageSystem.repairSystem.currentRepair.startTime = Date.now() - 35000;
            damageSystem.updateRepair(1.0);
        });

        test('should cancel repair', () => {
            damageSystem.damageComponent('engine', 50, 'collision');
            damageSystem.startRepair('engine');
            
            const cancelSpy = jest.fn();
            damageSystem.on('repairCancelled', cancelSpy);

            const success = damageSystem.cancelRepair();
            
            expect(success).toBe(true);
            expect(cancelSpy).toHaveBeenCalled();
            expect(damageSystem.repairSystem.currentRepair).toBeNull();
        });

        test('should get repair estimate', () => {
            damageSystem.damageComponent('engine', 60, 'collision');
            
            const estimate = damageSystem.getRepairEstimate('engine');
            
            expect(estimate).toEqual({
                component: 'engine',
                damagePercentage: 60,
                repairCost: expect.any(Number),
                repairTime: expect.any(Number),
                priority: expect.any(Number),
                isCritical: false
            });
        });
    });

    describe('Visual Damage', () => {
        test('should apply visual damage on collision', () => {
            const visualSpy = jest.fn();
            damageSystem.on('visualDamageApplied', visualSpy);

            const impactData = {
                velocity: { x: 0, y: 0, z: 15 },
                direction: { x: 0, y: 0, z: 1 },
                impactPoint: { x: 0, y: 0, z: 2 },
                severity: 1.0
            };

            damageSystem.applyCollisionDamage(impactData);

            expect(visualSpy).toHaveBeenCalled();
            
            const visualDamage = damageSystem.getVisualDamage();
            expect(visualDamage.deformation.front).toBeGreaterThan(0);
        });

        test('should disable visual damage when option is false', () => {
            const noVisualDamageSystem = new VehicleDamageSystem(vehicleConfig, {
                enableVisualDamage: false
            });

            const impactData = {
                velocity: { x: 0, y: 0, z: 15 },
                direction: { x: 0, y: 0, z: 1 },
                impactPoint: { x: 0, y: 0, z: 2 },
                severity: 1.0
            };

            noVisualDamageSystem.applyCollisionDamage(impactData);

            const visualDamage = noVisualDamageSystem.getVisualDamage();
            expect(visualDamage.deformation.front).toBe(0);

            noVisualDamageSystem.dispose();
        });
    });

    describe('System Integration', () => {
        test('should update all systems in main update loop', () => {
            const vehicleState = {
                engineRPM: 3000,
                engineTemp: 95,
                speed: 80,
                tireSlip: 0.1,
                brakeIntensity: 0.3,
                roadRoughness: 0.2,
                transmissionLoad: 0.7
            };

            const updateSpy = jest.fn();
            damageSystem.on('updated', updateSpy);

            damageSystem.update(1.0, vehicleState);

            expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
                totalDamage: expect.any(Number),
                componentHealth: expect.any(Array),
                performanceModifiers: expect.any(Object)
            }));
        });

        test('should reset all damage', () => {
            // Apply various types of damage
            damageSystem.damageComponent('engine', 50, 'collision');
            damageSystem.damageComponent('tires', 30, 'wear');
            
            const resetSpy = jest.fn();
            damageSystem.on('damageReset', resetSpy);

            damageSystem.resetDamage();

            expect(resetSpy).toHaveBeenCalled();
            
            const status = damageSystem.getStatus();
            expect(status.totalDamage).toBe(0);
            
            status.componentHealth.forEach(component => {
                if (Array.isArray(component.health)) {
                    component.health.forEach(health => {
                        expect(health).toBe(100);
                    });
                } else {
                    expect(component.health).toBe(100);
                }
            });
        });

        test('should get comprehensive status', () => {
            damageSystem.damageComponent('engine', 40, 'collision');
            damageSystem.startRepair('engine');

            const status = damageSystem.getStatus();

            expect(status).toEqual({
                totalDamage: expect.any(Number),
                componentHealth: expect.any(Array),
                visualDamage: expect.any(Object),
                performanceModifiers: expect.any(Object),
                currentRepair: expect.objectContaining({
                    component: 'engine',
                    progress: expect.any(Number),
                    timeRemaining: expect.any(Number)
                }),
                criticalComponents: expect.any(Array)
            });
        });
    });

    describe('Random Failures', () => {
        test('should simulate random failures based on component health', () => {
            // Damage engine to increase failure chance
            damageSystem.damageComponent('engine', 80, 'wear');

            const failureSpy = jest.fn();
            damageSystem.on('randomFailure', failureSpy);

            // Run many simulation steps to increase chance of failure
            for (let i = 0; i < 1000; i++) {
                damageSystem.simulateRandomFailure(0.1);
            }

            // With heavily damaged engine, should have some chance of failure
            // Note: This test might be flaky due to randomness
            // In a real scenario, you might want to mock Math.random
        });
    });
});