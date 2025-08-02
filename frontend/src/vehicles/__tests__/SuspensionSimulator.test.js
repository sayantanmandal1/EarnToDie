/**
 * Tests for SuspensionSimulator
 */

import { SuspensionSimulator } from '../SuspensionSimulator.js';

describe('SuspensionSimulator', () => {
    let suspensionSimulator;
    let mockSuspensionConfig;

    beforeEach(() => {
        mockSuspensionConfig = {
            type: 'independent',
            springRate: [25000, 25000, 22000, 22000],
            springPreload: [0.1, 0.1, 0.1, 0.1],
            maxCompression: [0.15, 0.15, 0.15, 0.15],
            maxExtension: [0.12, 0.12, 0.12, 0.12],
            dampingCoefficient: [3500, 3500, 3200, 3200],
            reboundDamping: [4000, 4000, 3600, 3600],
            compressionDamping: [3000, 3000, 2800, 2800],
            antiRollBarStiffness: [15000, 12000],
            wheelbase: 2.7,
            trackWidth: [1.5, 1.5],
            centerOfGravityHeight: 0.5
        };

        suspensionSimulator = new SuspensionSimulator(mockSuspensionConfig);
    });

    afterEach(() => {
        if (suspensionSimulator) {
            suspensionSimulator.dispose();
        }
    });

    describe('Initialization', () => {
        test('should initialize with suspension configuration', () => {
            expect(suspensionSimulator.config.type).toBe('independent');
            expect(suspensionSimulator.config.springRate).toEqual([25000, 25000, 22000, 22000]);
        });

        test('should set initial compression based on vehicle weight', () => {
            expect(suspensionSimulator.state.compression[0]).toBeGreaterThan(0);
            expect(suspensionSimulator.state.compression[1]).toBeGreaterThan(0);
            expect(suspensionSimulator.state.compression[2]).toBeGreaterThan(0);
            expect(suspensionSimulator.state.compression[3]).toBeGreaterThan(0);
        });

        test('should emit initialized event', () => {
            const initSpy = jest.fn();
            const newSimulator = new SuspensionSimulator(mockSuspensionConfig);
            newSimulator.on('initialized', initSpy);
            
            newSimulator.initializeSimulation();
            
            expect(initSpy).toHaveBeenCalled();
            newSimulator.dispose();
        });
    });

    describe('Physics Update', () => {
        test('should update suspension state', () => {
            const vehicleState = { mass: 1500 };
            const wheelForces = [
                { vertical: 100 },
                { vertical: 100 },
                { vertical: 100 },
                { vertical: 100 }
            ];

            const initialCompression = [...suspensionSimulator.state.compression];
            
            suspensionSimulator.update(0.016, vehicleState, wheelForces);
            
            expect(suspensionSimulator.state.lastUpdate).toBeGreaterThan(0);
        });

        test('should emit updated event', () => {
            const updateSpy = jest.fn();
            suspensionSimulator.on('updated', updateSpy);
            
            const vehicleState = { mass: 1500 };
            const wheelForces = [
                { vertical: 0 },
                { vertical: 0 },
                { vertical: 0 },
                { vertical: 0 }
            ];
            
            suspensionSimulator.update(0.016, vehicleState, wheelForces);
            
            expect(updateSpy).toHaveBeenCalled();
        });

        test('should handle large delta times', () => {
            const vehicleState = { mass: 1500 };
            const wheelForces = [
                { vertical: 0 },
                { vertical: 0 },
                { vertical: 0 },
                { vertical: 0 }
            ];
            
            expect(() => {
                suspensionSimulator.update(1.0, vehicleState, wheelForces);
            }).not.toThrow();
        });
    });

    describe('Spring Force Calculations', () => {
        test('should calculate basic spring force', () => {
            const force = suspensionSimulator.calculateSpringForce(0, 0.05);
            
            expect(typeof force).toBe('number');
            expect(force).not.toBe(0);
        });

        test('should calculate progressive spring force when enabled', () => {
            suspensionSimulator.config.enableProgressiveRates = true;
            
            const normalForce = suspensionSimulator.calculateSpringForce(0, 0.05);
            const highCompressionForce = suspensionSimulator.calculateSpringForce(0, 0.12);
            
            expect(Math.abs(highCompressionForce)).toBeGreaterThan(Math.abs(normalForce));
        });

        test('should use linear spring rate when progressive rates disabled', () => {
            suspensionSimulator.config.enableProgressiveRates = false;
            
            const force1 = suspensionSimulator.calculateSpringForce(0, 0.05);
            const force2 = suspensionSimulator.calculateSpringForce(0, 0.10);
            
            // Force should be proportional to compression
            expect(Math.abs(force2 / force1)).toBeCloseTo(2, 1);
        });
    });

    describe('Damping Force Calculations', () => {
        test('should calculate compression damping', () => {
            const force = suspensionSimulator.calculateDampingForce(0, 0.5); // Positive velocity = compression
            
            expect(typeof force).toBe('number');
            expect(force).toBeLessThan(0); // Should oppose motion
        });

        test('should calculate rebound damping', () => {
            const force = suspensionSimulator.calculateDampingForce(0, -0.5); // Negative velocity = rebound
            
            expect(typeof force).toBe('number');
            expect(force).toBeGreaterThan(0); // Should oppose motion
        });

        test('should apply temperature effects when enabled', () => {
            suspensionSimulator.config.enableTemperatureEffects = true;
            suspensionSimulator.state.temperature[0] = 50; // Hot damper
            
            const hotForce = suspensionSimulator.calculateDampingForce(0, 0.5);
            
            suspensionSimulator.state.temperature[0] = 20; // Normal temperature
            const normalForce = suspensionSimulator.calculateDampingForce(0, 0.5);
            
            expect(Math.abs(hotForce)).not.toEqual(Math.abs(normalForce));
        });
    });

    describe('Anti-Roll Bars', () => {
        test('should apply anti-roll bar forces', () => {
            // Create roll condition
            suspensionSimulator.state.compression[0] = 0.1; // Left front compressed
            suspensionSimulator.state.compression[1] = 0.05; // Right front extended
            
            const initialForces = [...suspensionSimulator.state.force];
            
            suspensionSimulator.applyAntiRollBars();
            
            // Forces should be modified
            expect(suspensionSimulator.state.force[0]).not.toBe(initialForces[0]);
            expect(suspensionSimulator.state.force[1]).not.toBe(initialForces[1]);
        });

        test('should not apply forces when compression is equal', () => {
            // Equal compression = no roll
            suspensionSimulator.state.compression = [0.08, 0.08, 0.08, 0.08];
            
            const initialForces = [...suspensionSimulator.state.force];
            
            suspensionSimulator.applyAntiRollBars();
            
            // Forces should remain the same (or very close due to floating point)
            expect(Math.abs(suspensionSimulator.state.force[0] - initialForces[0])).toBeLessThan(0.001);
        });
    });

    describe('Temperature Effects', () => {
        test('should update temperature based on work done', () => {
            suspensionSimulator.config.enableTemperatureEffects = true;
            suspensionSimulator.state.force[0] = 1000;
            suspensionSimulator.state.velocity[0] = 0.5;
            
            const initialTemp = suspensionSimulator.state.temperature[0];
            
            suspensionSimulator.updateTemperatureEffects(0.1);
            
            expect(suspensionSimulator.state.temperature[0]).toBeGreaterThan(initialTemp);
        });

        test('should dissipate heat to ambient temperature', () => {
            suspensionSimulator.config.enableTemperatureEffects = true;
            suspensionSimulator.state.temperature[0] = 80; // Hot damper
            suspensionSimulator.state.force[0] = 0; // No work being done
            suspensionSimulator.state.velocity[0] = 0;
            
            const initialTemp = suspensionSimulator.state.temperature[0];
            
            suspensionSimulator.updateTemperatureEffects(1.0); // Long time step
            
            expect(suspensionSimulator.state.temperature[0]).toBeLessThan(initialTemp);
        });
    });

    describe('Suspension Forces', () => {
        test('should return suspension forces', () => {
            const forces = suspensionSimulator.getSuspensionForces();
            
            expect(forces).toHaveProperty('forces');
            expect(forces).toHaveProperty('moments');
            expect(forces).toHaveProperty('rollStiffness');
            expect(forces).toHaveProperty('pitchStiffness');
            
            expect(forces.forces).toHaveLength(4);
        });

        test('should calculate suspension moments', () => {
            const moments = suspensionSimulator.calculateSuspensionMoments();
            
            expect(moments).toHaveProperty('roll');
            expect(moments).toHaveProperty('pitch');
            expect(moments).toHaveProperty('yaw');
            
            expect(typeof moments.roll).toBe('number');
            expect(typeof moments.pitch).toBe('number');
        });
    });

    describe('Stiffness Calculations', () => {
        test('should calculate roll stiffness', () => {
            const rollStiffness = suspensionSimulator.calculateRollStiffness();
            
            expect(rollStiffness).toHaveProperty('front');
            expect(rollStiffness).toHaveProperty('rear');
            expect(rollStiffness).toHaveProperty('total');
            
            expect(rollStiffness.front).toBeGreaterThan(0);
            expect(rollStiffness.rear).toBeGreaterThan(0);
            expect(rollStiffness.total).toBe(rollStiffness.front + rollStiffness.rear);
        });

        test('should calculate pitch stiffness', () => {
            const pitchStiffness = suspensionSimulator.calculatePitchStiffness();
            
            expect(typeof pitchStiffness).toBe('number');
            expect(pitchStiffness).toBeGreaterThan(0);
        });
    });

    describe('Suspension Adjustments', () => {
        test('should adjust spring rates', () => {
            const initialSpringRate = suspensionSimulator.config.springRate[0];
            
            suspensionSimulator.adjustSuspension({
                springRate: [0.1, 0.1, 0.1, 0.1] // 10% increase
            });
            
            expect(suspensionSimulator.config.springRate[0]).toBeCloseTo(initialSpringRate * 1.1, 1);
        });

        test('should adjust damping coefficients', () => {
            const initialDamping = suspensionSimulator.config.dampingCoefficient[0];
            
            suspensionSimulator.adjustSuspension({
                dampingCoefficient: [0.2, 0.2, 0.2, 0.2] // 20% increase
            });
            
            expect(suspensionSimulator.config.dampingCoefficient[0]).toBeCloseTo(initialDamping * 1.2, 1);
        });

        test('should emit suspension adjusted event', () => {
            const adjustSpy = jest.fn();
            suspensionSimulator.on('suspensionAdjusted', adjustSpy);
            
            suspensionSimulator.adjustSuspension({
                springRate: [0.1, 0.1, 0.1, 0.1]
            });
            
            expect(adjustSpy).toHaveBeenCalled();
        });
    });

    describe('Telemetry', () => {
        test('should provide comprehensive telemetry data', () => {
            const telemetry = suspensionSimulator.getTelemetry();
            
            expect(telemetry).toHaveProperty('compression');
            expect(telemetry).toHaveProperty('velocity');
            expect(telemetry).toHaveProperty('force');
            expect(telemetry).toHaveProperty('temperature');
            expect(telemetry).toHaveProperty('performance');
            expect(telemetry).toHaveProperty('rollStiffness');
            expect(telemetry).toHaveProperty('pitchStiffness');
            expect(telemetry).toHaveProperty('workDone');
        });

        test('should include work done calculations', () => {
            const telemetry = suspensionSimulator.getTelemetry();
            
            expect(telemetry.workDone).toHaveProperty('compression');
            expect(telemetry.workDone).toHaveProperty('rebound');
            expect(telemetry.workDone).toHaveProperty('total');
        });
    });

    describe('Reset and Disposal', () => {
        test('should reset to initial state', () => {
            // Modify state
            suspensionSimulator.state.compression = [0.2, 0.2, 0.2, 0.2];
            suspensionSimulator.state.velocity = [1, 1, 1, 1];
            
            suspensionSimulator.reset();
            
            expect(suspensionSimulator.state.velocity).toEqual([0, 0, 0, 0]);
            expect(suspensionSimulator.performance.totalCompressionWork).toBe(0);
        });

        test('should emit reset event', () => {
            const resetSpy = jest.fn();
            suspensionSimulator.on('reset', resetSpy);
            
            suspensionSimulator.reset();
            
            expect(resetSpy).toHaveBeenCalled();
        });

        test('should dispose cleanly', () => {
            expect(() => {
                suspensionSimulator.dispose();
            }).not.toThrow();
        });
    });

    describe('Force Limits', () => {
        test('should apply force limits', () => {
            const excessiveForce = 1000000; // Very large force
            
            const limitedForce = suspensionSimulator.applyForceLimits(0, excessiveForce);
            
            expect(Math.abs(limitedForce)).toBeLessThan(Math.abs(excessiveForce));
        });

        test('should not modify reasonable forces', () => {
            const reasonableForce = 5000;
            
            const limitedForce = suspensionSimulator.applyForceLimits(0, reasonableForce);
            
            expect(limitedForce).toBe(reasonableForce);
        });
    });

    describe('Compression Limits', () => {
        test('should limit maximum compression', () => {
            const vehicleState = { mass: 1500 };
            const wheelForces = [
                { vertical: 50000 }, // Very large downward force
                { vertical: 0 },
                { vertical: 0 },
                { vertical: 0 }
            ];
            
            suspensionSimulator.update(0.1, vehicleState, wheelForces);
            
            expect(suspensionSimulator.state.compression[0]).toBeLessThanOrEqual(
                suspensionSimulator.config.maxCompression[0]
            );
        });

        test('should limit maximum extension', () => {
            const vehicleState = { mass: 1500 };
            const wheelForces = [
                { vertical: -50000 }, // Very large upward force
                { vertical: 0 },
                { vertical: 0 },
                { vertical: 0 }
            ];
            
            suspensionSimulator.update(0.1, vehicleState, wheelForces);
            
            expect(suspensionSimulator.state.compression[0]).toBeGreaterThanOrEqual(
                -suspensionSimulator.config.maxExtension[0]
            );
        });
    });
});