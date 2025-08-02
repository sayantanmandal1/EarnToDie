/**
 * Realistic Vehicle Physics Engine
 * Advanced physics simulation for realistic vehicle behavior
 */

import { EventEmitter } from 'events';
import { electronIntegration } from '../electron/ElectronIntegration.js';

export class VehiclePhysicsEngine extends EventEmitter {
    constructor(vehicleConfig, options = {}) {
        super();
        
        this.vehicleConfig = vehicleConfig;
        this.options = {
            // Physics settings
            enableAdvancedPhysics: options.enableAdvancedPhysics !== false,
            physicsTimeStep: options.physicsTimeStep || 1/60, // 60 FPS
            maxSubSteps: options.maxSubSteps || 3,
            
            // Engine settings
            enableTorqueCurves: options.enableTorqueCurves !== false,
            enableEngineInertia: options.enableEngineInertia !== false,
            enableEngineTemperature: options.enableEngineTemperature !== false,
            
            // Transmission settings
            enableRealisticTransmission: options.enableRealisticTransmission !== false,
            enableClutchSimulation: options.enableClutchSimulation !== false,
            
            // Suspension settings
            enableAdvancedSuspension: options.enableAdvancedSuspension !== false,
            enableAntiRollBars: options.enableAntiRollBars !== false,
            
            // Tire settings
            enableAdvancedTireModel: options.enableAdvancedTireModel !== false,
            enableTireWear: options.enableTireWear !== false,
            enableTireTemperature: options.enableTireTemperature !== false,
            
            ...options
        };
        
        // Vehicle state
        this.state = {
            // Position and orientation
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            acceleration: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            angularVelocity: { x: 0, y: 0, z: 0 },
            
            // Vehicle dynamics
            speed: 0,
            wheelSpeed: [0, 0, 0, 0], // FL, FR, RL, RR
            wheelSlip: [0, 0, 0, 0],
            wheelLoad: [0, 0, 0, 0],
            
            // Engine state
            engineRPM: 800, // Idle RPM
            engineTorque: 0,
            engineTemperature: 90, // Celsius
            throttlePosition: 0,
            
            // Transmission state
            currentGear: 1,
            clutchPosition: 1.0, // 0 = disengaged, 1 = engaged
            transmissionRatio: 1.0,
            
            // Suspension state
            suspensionCompression: [0, 0, 0, 0],
            suspensionVelocity: [0, 0, 0, 0],
            
            // Tire state
            tireGrip: [1.0, 1.0, 1.0, 1.0],
            tireWear: [0, 0, 0, 0], // 0 = new, 1 = worn out
            tireTemperature: [20, 20, 20, 20], // Celsius
            
            // Forces
            engineForce: 0,
            brakeForce: 0,
            steeringAngle: 0,
            downforce: 0
        };
        
        // Physics components
        this.engineSimulator = null;
        this.transmissionSimulator = null;
        this.suspensionSimulator = null;
        this.tireSimulator = null;
        
        // Performance tracking
        this.performanceMetrics = {
            updateTime: 0,
            maxUpdateTime: 0,
            physicsSteps: 0,
            lastUpdate: 0
        };
        
        this.logger = electronIntegration.getLogger();
        this.isRunning = false;
        
        // Initialize physics components
        this.initializePhysicsComponents();
    }

    /**
     * Initialize all physics components
     */
    initializePhysicsComponents() {
        try {
            this.logger.info('Initializing Vehicle Physics Engine...');
            
            // Initialize engine simulator
            this.engineSimulator = new EngineSimulator(this.vehicleConfig.engine, {
                enableTorqueCurves: this.options.enableTorqueCurves,
                enableInertia: this.options.enableEngineInertia,
                enableTemperature: this.options.enableEngineTemperature
            });
            
            // Initialize transmission simulator
            this.transmissionSimulator = new TransmissionSimulator(this.vehicleConfig.transmission, {
                enableRealistic: this.options.enableRealisticTransmission,
                enableClutch: this.options.enableClutchSimulation
            });
            
            // Initialize suspension simulator
            this.suspensionSimulator = new SuspensionSimulator(this.vehicleConfig.suspension, {
                enableAdvanced: this.options.enableAdvancedSuspension,
                enableAntiRoll: this.options.enableAntiRollBars
            });
            
            // Initialize tire simulator
            this.tireSimulator = new TireSimulator(this.vehicleConfig.tires, {
                enableAdvanced: this.options.enableAdvancedTireModel,
                enableWear: this.options.enableTireWear,
                enableTemperature: this.options.enableTireTemperature
            });
            
            this.logger.info('Vehicle Physics Engine initialized successfully');
            this.emit('initialized');
            
        } catch (error) {
            this.logger.error('Failed to initialize Vehicle Physics Engine:', error);
            throw error;
        }
    }

    /**
     * Start physics simulation
     */
    start() {
        if (this.isRunning) {
            this.logger.warn('Vehicle Physics Engine already running');
            return;
        }
        
        this.logger.info('Starting Vehicle Physics Engine...');
        this.isRunning = true;
        this.performanceMetrics.lastUpdate = performance.now();
        
        this.emit('started');
        this.logger.info('Vehicle Physics Engine started');
    }

    /**
     * Stop physics simulation
     */
    stop() {
        if (!this.isRunning) {
            return;
        }
        
        this.logger.info('Stopping Vehicle Physics Engine...');
        this.isRunning = false;
        
        this.emit('stopped');
        this.logger.info('Vehicle Physics Engine stopped');
    }

    /**
     * Update physics simulation
     */
    update(deltaTime, inputs) {
        if (!this.isRunning) {
            return;
        }
        
        const startTime = performance.now();
        
        try {
            // Clamp delta time to prevent instability
            const clampedDeltaTime = Math.min(deltaTime, 1/30); // Max 30 FPS
            
            // Perform physics update with sub-stepping
            this.updateWithSubStepping(clampedDeltaTime, inputs);
            
            // Update performance metrics
            const updateTime = performance.now() - startTime;
            this.performanceMetrics.updateTime = updateTime;
            this.performanceMetrics.maxUpdateTime = Math.max(
                this.performanceMetrics.maxUpdateTime,
                updateTime
            );
            this.performanceMetrics.physicsSteps++;
            
            // Emit update event
            this.emit('updated', {
                state: this.getState(),
                deltaTime: clampedDeltaTime,
                performanceMetrics: this.performanceMetrics
            });
            
        } catch (error) {
            this.logger.error('Physics update error:', error);
            this.emit('error', error);
        }
    }

    /**
     * Update physics with sub-stepping for stability
     */
    updateWithSubStepping(deltaTime, inputs) {
        const subSteps = Math.min(
            Math.ceil(deltaTime / this.options.physicsTimeStep),
            this.options.maxSubSteps
        );
        
        const subDeltaTime = deltaTime / subSteps;
        
        for (let i = 0; i < subSteps; i++) {
            this.updatePhysicsStep(subDeltaTime, inputs);
        }
    }

    /**
     * Single physics step update
     */
    updatePhysicsStep(deltaTime, inputs) {
        // Update engine simulation
        this.updateEngine(deltaTime, inputs);
        
        // Update transmission simulation
        this.updateTransmission(deltaTime, inputs);
        
        // Update suspension simulation
        this.updateSuspension(deltaTime, inputs);
        
        // Update tire simulation
        this.updateTires(deltaTime, inputs);
        
        // Update vehicle dynamics
        this.updateVehicleDynamics(deltaTime, inputs);
        
        // Apply forces and integrate motion
        this.integrateMotion(deltaTime);
    }

    /**
     * Update engine simulation
     */
    updateEngine(deltaTime, inputs) {
        const engineResult = this.engineSimulator.update(deltaTime, {
            throttle: inputs.throttle || 0,
            rpm: this.state.engineRPM,
            load: this.calculateEngineLoad(),
            temperature: this.state.engineTemperature
        });
        
        this.state.engineRPM = engineResult.rpm;
        this.state.engineTorque = engineResult.torque;
        this.state.engineTemperature = engineResult.temperature;
        this.state.throttlePosition = inputs.throttle || 0;
    }

    /**
     * Update transmission simulation
     */
    updateTransmission(deltaTime, inputs) {
        const transmissionResult = this.transmissionSimulator.update(deltaTime, {
            engineRPM: this.state.engineRPM,
            engineTorque: this.state.engineTorque,
            vehicleSpeed: this.state.speed,
            gearShift: inputs.gearShift || 0,
            clutch: inputs.clutch || 1.0
        });
        
        this.state.currentGear = transmissionResult.gear;
        this.state.clutchPosition = transmissionResult.clutchPosition;
        this.state.transmissionRatio = transmissionResult.ratio;
        this.state.engineForce = transmissionResult.outputTorque;
    }

    /**
     * Update suspension simulation
     */
    updateSuspension(deltaTime, inputs) {
        const suspensionResult = this.suspensionSimulator.update(deltaTime, {
            wheelLoads: this.state.wheelLoad,
            vehicleVelocity: this.state.velocity,
            steeringAngle: inputs.steering || 0
        });
        
        this.state.suspensionCompression = suspensionResult.compression;
        this.state.suspensionVelocity = suspensionResult.velocity;
        this.state.wheelLoad = suspensionResult.wheelLoads;
    }

    /**
     * Update tire simulation
     */
    updateTires(deltaTime, inputs) {
        const tireResult = this.tireSimulator.update(deltaTime, {
            wheelSpeeds: this.state.wheelSpeed,
            wheelLoads: this.state.wheelLoad,
            steeringAngle: inputs.steering || 0,
            brakeForce: inputs.brake || 0,
            surfaceType: inputs.surfaceType || 'asphalt'
        });
        
        this.state.wheelSlip = tireResult.slip;
        this.state.tireGrip = tireResult.grip;
        this.state.tireWear = tireResult.wear;
        this.state.tireTemperature = tireResult.temperature;
        this.state.brakeForce = inputs.brake || 0;
        this.state.steeringAngle = inputs.steering || 0;
    }

    /**
     * Update vehicle dynamics
     */
    updateVehicleDynamics(deltaTime, inputs) {
        // Calculate aerodynamic forces
        const aeroForces = this.calculateAerodynamicForces();
        
        // Calculate total forces
        const totalForces = this.calculateTotalForces(aeroForces);
        
        // Update acceleration
        this.state.acceleration = {
            x: totalForces.x / this.vehicleConfig.mass,
            y: totalForces.y / this.vehicleConfig.mass,
            z: totalForces.z / this.vehicleConfig.mass
        };
        
        // Calculate wheel speeds
        this.updateWheelSpeeds(deltaTime);
        
        // Update vehicle speed
        this.state.speed = Math.sqrt(
            this.state.velocity.x * this.state.velocity.x +
            this.state.velocity.z * this.state.velocity.z
        );
    }

    /**
     * Calculate engine load
     */
    calculateEngineLoad() {
        // Simplified engine load calculation
        const speedLoad = this.state.speed / 100; // Normalize to 0-1
        const throttleLoad = this.state.throttlePosition;
        const transmissionLoad = 1.0 / (this.state.transmissionRatio + 0.1);
        
        return Math.min(speedLoad + throttleLoad + transmissionLoad, 1.0);
    }

    /**
     * Calculate aerodynamic forces
     */
    calculateAerodynamicForces() {
        const airDensity = 1.225; // kg/m³ at sea level
        const dragCoefficient = this.vehicleConfig.aerodynamics?.dragCoefficient || 0.3;
        const frontalArea = this.vehicleConfig.aerodynamics?.frontalArea || 2.5;
        const downforceCoefficient = this.vehicleConfig.aerodynamics?.downforceCoefficient || 0.1;
        
        const speedSquared = this.state.speed * this.state.speed;
        
        // Drag force (opposing motion)
        const dragForce = 0.5 * airDensity * dragCoefficient * frontalArea * speedSquared;
        
        // Downforce (increases tire grip)
        this.state.downforce = 0.5 * airDensity * downforceCoefficient * frontalArea * speedSquared;
        
        // Apply drag in opposite direction of motion
        const velocityMagnitude = Math.sqrt(
            this.state.velocity.x * this.state.velocity.x +
            this.state.velocity.z * this.state.velocity.z
        );
        
        if (velocityMagnitude > 0.1) {
            const dragX = -dragForce * (this.state.velocity.x / velocityMagnitude);
            const dragZ = -dragForce * (this.state.velocity.z / velocityMagnitude);
            
            return { x: dragX, y: -this.state.downforce, z: dragZ };
        }
        
        return { x: 0, y: -this.state.downforce, z: 0 };
    }

    /**
     * Calculate total forces acting on vehicle
     */
    calculateTotalForces(aeroForces) {
        // Engine force (forward/backward)
        const engineForceX = this.state.engineForce * Math.sin(this.state.rotation.y);
        const engineForceZ = this.state.engineForce * Math.cos(this.state.rotation.y);
        
        // Brake force (opposing motion)
        const brakeForceX = -this.state.brakeForce * Math.sign(this.state.velocity.x);
        const brakeForceZ = -this.state.brakeForce * Math.sign(this.state.velocity.z);
        
        // Tire forces (lateral grip)
        const tireForces = this.calculateTireForces();
        
        // Gravity
        const gravityForce = this.vehicleConfig.mass * 9.81;
        
        return {
            x: engineForceX + brakeForceX + tireForces.x + aeroForces.x,
            y: -gravityForce + aeroForces.y,
            z: engineForceZ + brakeForceZ + tireForces.z + aeroForces.z
        };
    }

    /**
     * Calculate tire forces
     */
    calculateTireForces() {
        let totalLateralForce = 0;
        
        // Calculate lateral forces from each tire
        for (let i = 0; i < 4; i++) {
            const grip = this.state.tireGrip[i];
            const load = this.state.wheelLoad[i] + (this.state.downforce / 4);
            const slip = this.state.wheelSlip[i];
            
            // Simplified tire force model
            const maxForce = grip * load * 1.2; // Friction coefficient
            const slipRatio = Math.abs(slip) / (Math.abs(slip) + 1);
            const lateralForce = maxForce * (1 - slipRatio);
            
            totalLateralForce += lateralForce;
        }
        
        // Apply steering
        const steeringForceX = totalLateralForce * Math.sin(this.state.steeringAngle);
        const steeringForceZ = 0; // Simplified - no lateral force in Z direction
        
        return { x: steeringForceX, z: steeringForceZ };
    }

    /**
     * Update wheel speeds
     */
    updateWheelSpeeds(deltaTime) {
        const wheelRadius = this.vehicleConfig.tires?.radius || 0.3;
        
        for (let i = 0; i < 4; i++) {
            // Calculate target wheel speed based on vehicle speed
            let targetSpeed = this.state.speed / wheelRadius;
            
            // Apply engine force to driven wheels
            if (this.isDrivenWheel(i)) {
                const engineInfluence = this.state.engineForce / (this.vehicleConfig.mass * 10);
                targetSpeed += engineInfluence;
            }
            
            // Apply brake force
            if (this.state.brakeForce > 0) {
                const brakeInfluence = this.state.brakeForce / (this.vehicleConfig.mass * 5);
                targetSpeed -= brakeInfluence;
            }
            
            // Smooth wheel speed changes
            const speedDiff = targetSpeed - this.state.wheelSpeed[i];
            this.state.wheelSpeed[i] += speedDiff * deltaTime * 10;
            
            // Calculate wheel slip
            const vehicleSpeedAtWheel = this.state.speed / wheelRadius;
            this.state.wheelSlip[i] = this.state.wheelSpeed[i] - vehicleSpeedAtWheel;
        }
    }

    /**
     * Check if wheel is driven (receives engine power)
     */
    isDrivenWheel(wheelIndex) {
        const driveType = this.vehicleConfig.drivetrain?.type || 'fwd';
        
        switch (driveType) {
            case 'fwd': // Front-wheel drive
                return wheelIndex < 2;
            case 'rwd': // Rear-wheel drive
                return wheelIndex >= 2;
            case 'awd': // All-wheel drive
                return true;
            default:
                return wheelIndex < 2; // Default to FWD
        }
    }

    /**
     * Integrate motion (position and velocity)
     */
    integrateMotion(deltaTime) {
        // Update velocity
        this.state.velocity.x += this.state.acceleration.x * deltaTime;
        this.state.velocity.y += this.state.acceleration.y * deltaTime;
        this.state.velocity.z += this.state.acceleration.z * deltaTime;
        
        // Update position
        this.state.position.x += this.state.velocity.x * deltaTime;
        this.state.position.y += this.state.velocity.y * deltaTime;
        this.state.position.z += this.state.velocity.z * deltaTime;
        
        // Update rotation (simplified)
        const steeringInfluence = this.state.steeringAngle * (this.state.speed / 50);
        this.state.angularVelocity.y = steeringInfluence;
        this.state.rotation.y += this.state.angularVelocity.y * deltaTime;
        
        // Apply damping to prevent unrealistic values
        this.applyDamping();
    }

    /**
     * Apply damping to prevent unrealistic physics values
     */
    applyDamping() {
        const dampingFactor = 0.99;
        
        // Velocity damping
        this.state.velocity.x *= dampingFactor;
        this.state.velocity.y *= dampingFactor;
        this.state.velocity.z *= dampingFactor;
        
        // Angular velocity damping
        this.state.angularVelocity.x *= dampingFactor;
        this.state.angularVelocity.y *= dampingFactor;
        this.state.angularVelocity.z *= dampingFactor;
        
        // Clamp extreme values
        this.state.velocity.x = Math.max(-200, Math.min(200, this.state.velocity.x));
        this.state.velocity.z = Math.max(-200, Math.min(200, this.state.velocity.z));
        this.state.engineRPM = Math.max(500, Math.min(8000, this.state.engineRPM));
    }

    /**
     * Get current vehicle state
     */
    getState() {
        return {
            ...this.state,
            // Add computed values
            speedKmh: this.state.speed * 3.6,
            speedMph: this.state.speed * 2.237,
            engineRPMPercent: (this.state.engineRPM - 800) / (this.vehicleConfig.engine?.maxRPM - 800),
            gearRatio: this.state.transmissionRatio,
            totalTireWear: this.state.tireWear.reduce((sum, wear) => sum + wear, 0) / 4
        };
    }

    /**
     * Get physics performance metrics
     */
    getPerformanceMetrics() {
        return {
            ...this.performanceMetrics,
            averageUpdateTime: this.performanceMetrics.updateTime,
            physicsStepsPerSecond: this.performanceMetrics.physicsSteps / 
                ((performance.now() - this.performanceMetrics.lastUpdate) / 1000)
        };
    }

    /**
     * Reset vehicle to initial state
     */
    reset() {
        this.state.position = { x: 0, y: 0, z: 0 };
        this.state.velocity = { x: 0, y: 0, z: 0 };
        this.state.acceleration = { x: 0, y: 0, z: 0 };
        this.state.rotation = { x: 0, y: 0, z: 0 };
        this.state.angularVelocity = { x: 0, y: 0, z: 0 };
        
        this.state.speed = 0;
        this.state.wheelSpeed = [0, 0, 0, 0];
        this.state.wheelSlip = [0, 0, 0, 0];
        
        this.state.engineRPM = 800;
        this.state.engineTorque = 0;
        this.state.currentGear = 1;
        this.state.clutchPosition = 1.0;
        
        this.state.engineForce = 0;
        this.state.brakeForce = 0;
        this.state.steeringAngle = 0;
        
        this.emit('reset');
        this.logger.info('Vehicle physics reset to initial state');
    }

    /**
     * Update vehicle configuration
     */
    updateConfiguration(newConfig) {
        this.vehicleConfig = { ...this.vehicleConfig, ...newConfig };
        
        // Reinitialize physics components with new config
        this.initializePhysicsComponents();
        
        this.emit('configurationUpdated', this.vehicleConfig);
        this.logger.info('Vehicle configuration updated');
    }

    /**
     * Dispose of the physics engine
     */
    dispose() {
        this.stop();
        
        // Dispose physics components
        if (this.engineSimulator) {
            this.engineSimulator.dispose();
        }
        if (this.transmissionSimulator) {
            this.transmissionSimulator.dispose();
        }
        if (this.suspensionSimulator) {
            this.suspensionSimulator.dispose();
        }
        if (this.tireSimulator) {
            this.tireSimulator.dispose();
        }
        
        this.removeAllListeners();
        this.logger.info('Vehicle Physics Engine disposed');
    }
}

export default VehiclePhysicsEngine;