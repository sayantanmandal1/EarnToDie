/**
 * Physics Simulation Test Suite
 * Comprehensive tests for physics engine components
 */
import VehiclePhysicsEngine from '../vehicles/VehiclePhysicsEngine.js';
import EngineSimulator from '../vehicles/EngineSimulator.js';
import SuspensionSimulator from '../vehicles/SuspensionSimulator.js';
import TirePhysicsSimulator from '../vehicles/TirePhysicsSimulator.js';

describe('Physics Simulation Tests', () => {
    let physicsEngine;
    let mockWorld;

    beforeEach(() => {
        // Create mock physics world
        mockWorld = global.testUtils.createMock('physicsEngine').createWorld();
        
        // Initialize physics engine
        physicsEngine = new VehiclePhysicsEngine({
            gravity: { x: 0, y: -9.81, z: 0 },
            timeStep: 1/60,
            maxSubSteps: 3
        });
    });

    afterEach(() => {
        if (physicsEngine) {
            physicsEngine.destroy();
        }
    });

    describe('Vehicle Physics Engine', () => {
        test('should initialize with correct parameters', () => {
            expect(physicsEngine.config.gravity.y).toBe(-9.81);
            expect(physicsEngine.config.timeStep).toBe(1/60);
            expect(physicsEngine.world).toBeDefined();
        });

        test('should create vehicle body with correct mass', () => {
            const vehicleData = {
                mass: 1500,
                dimensions: { length: 4.5, width: 2.0, height: 1.5 },
                centerOfMass: { x: 0, y: -0.5, z: 0 }
            };

            const vehicleBody = physicsEngine.createVehicleBody(vehicleData);
            
            expect(vehicleBody).toBeDefined();
            expect(vehicleBody.mass).toBe(1500);
            expect(vehicleBody.position).toEqual({ x: 0, y: 0, z: 0 });
        });

        test('should apply forces correctly', async () => {
            const vehicleData = {
                mass: 1500,
                dimensions: { length: 4.5, width: 2.0, height: 1.5 }
            };

            const vehicleBody = physicsEngine.createVehicleBody(vehicleData);
            const force = { x: 1000, y: 0, z: 0 };
            
            physicsEngine.applyForce(vehicleBody, force);
            
            // Simulate one step
            physicsEngine.step(1/60);
            
            // Check that velocity has changed
            expect(vehicleBody.velocity.x).toBeGreaterThan(0);
        });

        test('should handle collision detection', () => {
            const vehicleData = {
                mass: 1500,
                dimensions: { length: 4.5, width: 2.0, height: 1.5 }
            };

            const vehicle1 = physicsEngine.createVehicleBody(vehicleData);
            const vehicle2 = physicsEngine.createVehicleBody(vehicleData);
            
            // Position vehicles close to each other
            vehicle1.position = { x: 0, y: 0, z: 0 };
            vehicle2.position = { x: 2, y: 0, z: 0 };
            
            const collision = physicsEngine.checkCollision(vehicle1, vehicle2);
            expect(collision).toBeDefined();
        });

        test('should calculate realistic stopping distance', async () => {
            const vehicleData = {
                mass: 1500,
                dimensions: { length: 4.5, width: 2.0, height: 1.5 }
            };

            const vehicleBody = physicsEngine.createVehicleBody(vehicleData);
            
            // Set initial velocity (50 km/h = ~13.89 m/s)
            vehicleBody.velocity = { x: 13.89, y: 0, z: 0 };
            
            const initialPosition = vehicleBody.position.x;
            const brakeForce = -5000; // Strong braking force
            
            // Simulate braking until stopped
            let steps = 0;
            while (Math.abs(vehicleBody.velocity.x) > 0.1 && steps < 1000) {
                physicsEngine.applyForce(vehicleBody, { x: brakeForce, y: 0, z: 0 });
                physicsEngine.step(1/60);
                steps++;
            }
            
            const stoppingDistance = vehicleBody.position.x - initialPosition;
            
            // Realistic stopping distance for 50 km/h should be around 15-25 meters
            expect(stoppingDistance).toBeGreaterThan(10);
            expect(stoppingDistance).toBeLessThan(30);
        });
    });

    describe('Engine Simulator', () => {
        let engineSimulator;

        beforeEach(() => {
            engineSimulator = new EngineSimulator({
                maxPower: 200, // 200 HP
                maxTorque: 300, // 300 Nm
                maxRPM: 6000,
                idleRPM: 800
            });
        });

        test('should calculate torque curve correctly', () => {
            // Test torque at different RPM values
            const torqueAt2000 = engineSimulator.calculateTorque(2000);
            const torqueAt4000 = engineSimulator.calculateTorque(4000);
            const torqueAt6000 = engineSimulator.calculateTorque(6000);
            
            expect(torqueAt2000).toBeGreaterThan(0);
            expect(torqueAt4000).toBeGreaterThan(torqueAt2000); // Peak torque around mid-range
            expect(torqueAt6000).toBeLessThan(torqueAt4000); // Torque drops at high RPM
        });

        test('should simulate engine load correctly', () => {
            const baseRPM = 3000;
            const throttle = 0.8; // 80% throttle
            
            const torque = engineSimulator.calculateTorque(baseRPM, throttle);
            const power = engineSimulator.calculatePower(baseRPM, throttle);
            
            expect(torque).toBeGreaterThan(0);
            expect(power).toBeGreaterThan(0);
            expect(power).toBe((torque * baseRPM * 2 * Math.PI) / 60 / 1000); // Power = Torque * Angular Velocity
        });

        test('should handle engine braking', () => {
            const rpm = 3000;
            const throttle = 0; // No throttle = engine braking
            
            const brakingTorque = engineSimulator.calculateEngineBraking(rpm);
            
            expect(brakingTorque).toBeLessThan(0); // Negative torque for braking
            expect(Math.abs(brakingTorque)).toBeGreaterThan(0);
        });

        test('should simulate realistic fuel consumption', () => {
            const rpm = 2500;
            const throttle = 0.6;
            const timeStep = 1/60;
            
            const fuelConsumption = engineSimulator.calculateFuelConsumption(rpm, throttle, timeStep);
            
            expect(fuelConsumption).toBeGreaterThan(0);
            expect(fuelConsumption).toBeLessThan(1); // Reasonable consumption per frame
        });
    });

    describe('Suspension Simulator', () => {
        let suspensionSimulator;

        beforeEach(() => {
            suspensionSimulator = new SuspensionSimulator({
                springRate: 25000, // N/m
                damperRate: 3000, // Ns/m
                maxCompression: 0.15, // 15cm
                maxExtension: 0.10, // 10cm
                restLength: 0.35 // 35cm
            });
        });

        test('should calculate spring force correctly', () => {
            const compression = 0.05; // 5cm compression
            const springForce = suspensionSimulator.calculateSpringForce(compression);
            
            expect(springForce).toBeGreaterThan(0);
            expect(springForce).toBe(25000 * compression); // F = k * x
        });

        test('should calculate damper force correctly', () => {
            const velocity = 0.5; // 0.5 m/s compression velocity
            const damperForce = suspensionSimulator.calculateDamperForce(velocity);
            
            expect(damperForce).toBeGreaterThan(0);
            expect(damperForce).toBe(3000 * velocity); // F = c * v
        });

        test('should handle suspension limits', () => {
            const maxCompression = 0.20; // Exceeds limit
            const force = suspensionSimulator.calculateSpringForce(maxCompression);
            
            // Force should be clamped to maximum compression
            expect(force).toBe(25000 * 0.15); // Limited to maxCompression
        });

        test('should simulate realistic suspension behavior', async () => {
            const { result, executionTime } = await global.testUtils.measurePerformance(async () => {
                const results = [];
                
                // Simulate suspension compression and rebound
                for (let i = 0; i < 100; i++) {
                    const time = i * 0.01; // 10ms steps
                    const displacement = Math.sin(time * 2 * Math.PI) * 0.05; // 5cm oscillation
                    const velocity = Math.cos(time * 2 * Math.PI) * 0.05 * 2 * Math.PI;
                    
                    const springForce = suspensionSimulator.calculateSpringForce(Math.abs(displacement));
                    const damperForce = suspensionSimulator.calculateDamperForce(velocity);
                    const totalForce = springForce + damperForce;
                    
                    results.push({
                        time,
                        displacement,
                        velocity,
                        force: totalForce
                    });
                }
                
                return results;
            });
            
            expect(result).toHaveLength(100);
            expect(executionTime).toBeLessThan(10); // Should complete quickly
            
            // Check that forces are reasonable
            const maxForce = Math.max(...result.map(r => Math.abs(r.force)));
            expect(maxForce).toBeGreaterThan(0);
            expect(maxForce).toBeLessThan(10000); // Reasonable maximum force
        });
    });

    describe('Tire Physics Simulator', () => {
        let tireSimulator;

        beforeEach(() => {
            tireSimulator = new TirePhysicsSimulator({
                width: 225, // mm
                aspectRatio: 45, // %
                rimDiameter: 17, // inches
                maxGrip: 1.2,
                rollingResistance: 0.015,
                thermalProperties: {
                    optimalTemp: 80, // Celsius
                    maxTemp: 120
                }
            });
        });

        test('should calculate tire dimensions correctly', () => {
            const dimensions = tireSimulator.calculateDimensions();
            
            expect(dimensions.width).toBe(0.225); // 225mm = 0.225m
            expect(dimensions.sidewallHeight).toBeCloseTo(0.10125); // 225 * 0.45 / 1000
            expect(dimensions.outerDiameter).toBeGreaterThan(0.6); // Reasonable tire diameter
        });

        test('should simulate grip based on slip ratio', () => {
            const slipRatios = [0, 0.05, 0.1, 0.15, 0.2, 0.3];
            const gripValues = slipRatios.map(slip => tireSimulator.calculateGrip(slip));
            
            // Grip should increase with slip ratio up to a point, then decrease
            expect(gripValues[0]).toBe(0); // No grip at zero slip
            expect(gripValues[1]).toBeGreaterThan(gripValues[0]);
            expect(gripValues[2]).toBeGreaterThan(gripValues[1]);
            
            // Find peak grip
            const peakGrip = Math.max(...gripValues);
            expect(peakGrip).toBeLessThanOrEqual(1.2); // Should not exceed max grip
        });

        test('should simulate tire temperature effects', () => {
            const temperatures = [20, 40, 60, 80, 100, 120, 140];
            const gripModifiers = temperatures.map(temp => 
                tireSimulator.calculateTemperatureEffect(temp)
            );
            
            // Grip should be optimal around 80°C
            const optimalIndex = temperatures.indexOf(80);
            const optimalGrip = gripModifiers[optimalIndex];
            
            expect(optimalGrip).toBeCloseTo(1.0, 1); // Should be close to 1.0 at optimal temp
            expect(gripModifiers[0]).toBeLessThan(optimalGrip); // Cold tires have less grip
            expect(gripModifiers[gripModifiers.length - 1]).toBeLessThan(optimalGrip); // Overheated tires have less grip
        });

        test('should calculate rolling resistance correctly', () => {
            const speeds = [0, 10, 20, 30, 50]; // m/s
            const resistanceForces = speeds.map(speed => 
                tireSimulator.calculateRollingResistance(speed, 1500) // 1500kg vehicle
            );
            
            // Rolling resistance should increase with speed
            expect(resistanceForces[0]).toBe(0); // No resistance at zero speed
            expect(resistanceForces[1]).toBeGreaterThan(0);
            expect(resistanceForces[4]).toBeGreaterThan(resistanceForces[1]);
            
            // Should be proportional to vehicle weight
            const heavierResistance = tireSimulator.calculateRollingResistance(30, 2000);
            const lighterResistance = tireSimulator.calculateRollingResistance(30, 1500);
            expect(heavierResistance).toBeGreaterThan(lighterResistance);
        });

        test('should simulate tire wear correctly', () => {
            let tireWear = 0;
            const timeStep = 1/60;
            
            // Simulate aggressive driving for 1000 steps
            for (let i = 0; i < 1000; i++) {
                const slipRatio = 0.15; // High slip
                const temperature = 100; // High temperature
                const load = 5000; // High load (N)
                
                const wearRate = tireSimulator.calculateWearRate(slipRatio, temperature, load);
                tireWear += wearRate * timeStep;
            }
            
            expect(tireWear).toBeGreaterThan(0);
            expect(tireWear).toBeLessThan(1); // Should not wear out completely in 1000 steps
        });
    });

    describe('Physics Integration Tests', () => {
        test('should handle vehicle-to-vehicle collision', async () => {
            const vehicleData = {
                mass: 1500,
                dimensions: { length: 4.5, width: 2.0, height: 1.5 }
            };

            const vehicle1 = physicsEngine.createVehicleBody(vehicleData);
            const vehicle2 = physicsEngine.createVehicleBody(vehicleData);
            
            // Set up collision scenario
            vehicle1.position = { x: 0, y: 0, z: 0 };
            vehicle1.velocity = { x: 10, y: 0, z: 0 }; // 10 m/s forward
            
            vehicle2.position = { x: 10, y: 0, z: 0 };
            vehicle2.velocity = { x: 0, y: 0, z: 0 }; // Stationary
            
            // Simulate until collision
            let collisionDetected = false;
            let steps = 0;
            
            while (!collisionDetected && steps < 100) {
                physicsEngine.step(1/60);
                
                const distance = Math.abs(vehicle1.position.x - vehicle2.position.x);
                if (distance < 4.5) { // Vehicle length
                    collisionDetected = true;
                    
                    // Apply collision response
                    const collision = physicsEngine.resolveCollision(vehicle1, vehicle2);
                    
                    expect(collision).toBeDefined();
                    expect(collision.impulse).toBeGreaterThan(0);
                    
                    // Both vehicles should have changed velocities
                    expect(vehicle1.velocity.x).toBeLessThan(10);
                    expect(vehicle2.velocity.x).toBeGreaterThan(0);
                }
                
                steps++;
            }
            
            expect(collisionDetected).toBe(true);
        });

        test('should simulate realistic vehicle dynamics', async () => {
            const vehicleData = {
                mass: 1500,
                dimensions: { length: 4.5, width: 2.0, height: 1.5 },
                centerOfMass: { x: 0, y: -0.3, z: 0.2 } // Slightly forward and low
            };

            const vehicle = physicsEngine.createVehicleBody(vehicleData);
            const engine = new EngineSimulator({ maxPower: 150, maxTorque: 250 });
            
            // Simulate acceleration from standstill
            const results = [];
            let rpm = 1000;
            
            for (let i = 0; i < 300; i++) { // 5 seconds at 60fps
                const throttle = 0.8;
                const torque = engine.calculateTorque(rpm, throttle);
                const wheelRadius = 0.3; // 30cm wheel radius
                const driveForce = torque / wheelRadius;
                
                // Apply drive force
                physicsEngine.applyForce(vehicle, { x: driveForce, y: 0, z: 0 });
                
                // Apply drag and rolling resistance
                const dragForce = -0.5 * 1.225 * 0.3 * 2.5 * Math.pow(vehicle.velocity.x, 2); // Air drag
                const rollingResistance = -vehicle.mass * 9.81 * 0.015; // Rolling resistance
                
                physicsEngine.applyForce(vehicle, { 
                    x: dragForce + rollingResistance, 
                    y: 0, 
                    z: 0 
                });
                
                physicsEngine.step(1/60);
                
                // Update RPM based on vehicle speed
                rpm = Math.max(1000, (vehicle.velocity.x / wheelRadius) * 60 / (2 * Math.PI) * 3.5); // Gear ratio 3.5
                
                results.push({
                    time: i / 60,
                    velocity: vehicle.velocity.x,
                    position: vehicle.position.x,
                    rpm: rpm,
                    torque: torque
                });
            }
            
            // Check realistic acceleration
            const finalVelocity = results[results.length - 1].velocity;
            const maxVelocity = Math.max(...results.map(r => r.velocity));
            
            expect(finalVelocity).toBeGreaterThan(20); // Should reach reasonable speed
            expect(finalVelocity).toBeLessThan(60); // But not unrealistic speed
            expect(maxVelocity).toBe(finalVelocity); // Should still be accelerating at end
            
            // Check 0-100 km/h time (0-27.78 m/s)
            const time100kmh = results.find(r => r.velocity >= 27.78)?.time;
            if (time100kmh) {
                expect(time100kmh).toBeGreaterThan(5); // Realistic acceleration time
                expect(time100kmh).toBeLessThan(15);
            }
        });

        test('should handle complex multi-body interactions', async () => {
            // Create multiple vehicles and obstacles
            const vehicles = [];
            const obstacles = [];
            
            // Create 3 vehicles
            for (let i = 0; i < 3; i++) {
                const vehicle = physicsEngine.createVehicleBody({
                    mass: 1500,
                    dimensions: { length: 4.5, width: 2.0, height: 1.5 }
                });
                vehicle.position = { x: i * 10, y: 0, z: 0 };
                vehicle.velocity = { x: 5 + i * 2, y: 0, z: 0 };
                vehicles.push(vehicle);
            }
            
            // Create obstacles
            for (let i = 0; i < 2; i++) {
                const obstacle = physicsEngine.createStaticBody({
                    dimensions: { length: 2, width: 2, height: 2 }
                });
                obstacle.position = { x: 15 + i * 8, y: 0, z: 2 };
                obstacles.push(obstacle);
            }
            
            // Simulate interaction
            let totalCollisions = 0;
            
            for (let step = 0; step < 500; step++) {
                // Check for collisions between all bodies
                for (let i = 0; i < vehicles.length; i++) {
                    for (let j = i + 1; j < vehicles.length; j++) {
                        if (physicsEngine.checkCollision(vehicles[i], vehicles[j])) {
                            physicsEngine.resolveCollision(vehicles[i], vehicles[j]);
                            totalCollisions++;
                        }
                    }
                    
                    // Check vehicle-obstacle collisions
                    for (const obstacle of obstacles) {
                        if (physicsEngine.checkCollision(vehicles[i], obstacle)) {
                            physicsEngine.resolveCollision(vehicles[i], obstacle);
                            totalCollisions++;
                        }
                    }
                }
                
                physicsEngine.step(1/60);
            }
            
            // Verify that simulation completed without errors
            expect(totalCollisions).toBeGreaterThanOrEqual(0);
            
            // Check that vehicles have moved
            vehicles.forEach((vehicle, index) => {
                expect(vehicle.position.x).toBeGreaterThan(index * 10);
            });
        });
    });

    describe('Performance Tests', () => {
        test('should maintain performance with many physics bodies', async () => {
            const bodyCount = 100;
            const bodies = [];
            
            const { result: creationTime } = await global.testUtils.measurePerformance(async () => {
                // Create many physics bodies
                for (let i = 0; i < bodyCount; i++) {
                    const body = physicsEngine.createVehicleBody({
                        mass: 1000 + Math.random() * 1000,
                        dimensions: { 
                            length: 3 + Math.random() * 3, 
                            width: 1.5 + Math.random() * 1, 
                            height: 1 + Math.random() * 1 
                        }
                    });
                    body.position = {
                        x: (Math.random() - 0.5) * 200,
                        y: Math.random() * 10,
                        z: (Math.random() - 0.5) * 200
                    };
                    bodies.push(body);
                }
            });
            
            expect(creationTime).toBeLessThan(1000); // Should create 100 bodies in under 1 second
            
            const { result: simulationTime } = await global.testUtils.measurePerformance(async () => {
                // Simulate 60 steps (1 second at 60fps)
                for (let i = 0; i < 60; i++) {
                    physicsEngine.step(1/60);
                }
            });
            
            expect(simulationTime).toBeLessThan(1000); // Should simulate 1 second in under 1 second real time
            
            // Cleanup
            bodies.forEach(body => physicsEngine.removeBody(body));
        });

        test('should handle physics step timing accurately', async () => {
            const targetTimeStep = 1/60; // 60 FPS
            const steps = 100;
            const stepTimes = [];
            
            for (let i = 0; i < steps; i++) {
                const { executionTime } = await global.testUtils.measurePerformance(async () => {
                    physicsEngine.step(targetTimeStep);
                });
                stepTimes.push(executionTime);
            }
            
            const averageStepTime = stepTimes.reduce((sum, time) => sum + time, 0) / steps;
            const maxStepTime = Math.max(...stepTimes);
            
            // Average step time should be much less than target frame time (16.67ms)
            expect(averageStepTime).toBeLessThan(5); // 5ms average
            expect(maxStepTime).toBeLessThan(16.67); // No step should exceed frame time
            
            // Check consistency (standard deviation should be low)
            const variance = stepTimes.reduce((sum, time) => sum + Math.pow(time - averageStepTime, 2), 0) / steps;
            const standardDeviation = Math.sqrt(variance);
            
            expect(standardDeviation).toBeLessThan(2); // Low variation in step times
        });
    });
});

export default {
    name: 'Physics Simulation Tests',
    description: 'Comprehensive physics engine testing suite',
    category: 'physics',
    priority: 'high'
};