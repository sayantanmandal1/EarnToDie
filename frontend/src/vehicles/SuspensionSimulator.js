/**
 * Advanced Suspension Simulator
 * Realistic suspension physics with spring and damper calculations
 */

import { EventEmitter } from 'events';

export class SuspensionSimulator extends EventEmitter {
    constructor(suspensionConfig, options = {}) {
        super();
        
        this.config = {
            // Suspension type
            type: suspensionConfig.type || 'independent', // independent, solid_axle, multi_link
            
            // Spring characteristics (per wheel)
            springRate: suspensionConfig.springRate || [25000, 25000, 22000, 22000], // N/m (FL, FR, RL, RR)
            springPreload: suspensionConfig.springPreload || [0.1, 0.1, 0.1, 0.1], // meters
            maxCompression: suspensionConfig.maxCompression || [0.15, 0.15, 0.15, 0.15], // meters
            maxExtension: suspensionConfig.maxExtension || [0.12, 0.12, 0.12, 0.12], // meters
            
            // Damper characteristics (per wheel)
            dampingCoefficient: suspensionConfig.dampingCoefficient || [3500, 3500, 3200, 3200], // Ns/m
            reboundDamping: suspensionConfig.reboundDamping || [4000, 4000, 3600, 3600], // Ns/m
            compressionDamping: suspensionConfig.compressionDamping || [3000, 3000, 2800, 2800], // Ns/m
            
            // Anti-roll bar
            antiRollBarStiffness: suspensionConfig.antiRollBarStiffness || [15000, 12000], // N⋅m/rad (front, rear)
            
            // Geometry
            wheelbase: suspensionConfig.wheelbase || 2.7, // meters
            trackWidth: suspensionConfig.trackWidth || [1.5, 1.5], // meters (front, rear)
            centerOfGravityHeight: suspensionConfig.centerOfGravityHeight || 0.5, // meters
            
            // Performance options
            enableAntiRollBars: options.enableAntiRollBars !== false,
            enableProgressiveRates: options.enableProgressiveRates !== false,
            enableTemperatureEffects: options.enableTemperatureEffects !== false,
            simulationFrequency: options.simulationFrequency || 120 // Hz
        };
        
        // Suspension state (per wheel: FL, FR, RL, RR)
        this.state = {
            compression: [0, 0, 0, 0], // meters
            velocity: [0, 0, 0, 0], // m/s
            force: [0, 0, 0, 0], // N
            temperature: [20, 20, 20, 20], // °C
            lastUpdate: Date.now()
        };
        
        // Physics constants
        this.physics = {
            gravity: 9.81, // m/s²
            airDensity: 1.225, // kg/m³
            dampingTemperatureCoeff: 0.02 // per °C
        };
        
        // Performance tracking
        this.performance = {
            totalCompressionWork: 0,
            totalReboundWork: 0,
            maxCompression: [0, 0, 0, 0],
            maxExtension: [0, 0, 0, 0],
            averageForce: [0, 0, 0, 0]
        };
        
        // Initialize simulation
        this.initializeSimulation();
    }

    /**
     * Initialize suspension simulation
     */
    initializeSimulation() {
        // Set initial compression based on vehicle weight distribution
        const frontWeightRatio = 0.6; // 60% front, 40% rear
        const vehicleWeight = 1500; // kg (will be provided by vehicle)
        
        // Calculate static compression
        const frontWeight = vehicleWeight * frontWeightRatio * this.physics.gravity / 2;
        const rearWeight = vehicleWeight * (1 - frontWeightRatio) * this.physics.gravity / 2;
        
        this.state.compression[0] = frontWeight / this.config.springRate[0] + this.config.springPreload[0];
        this.state.compression[1] = frontWeight / this.config.springRate[1] + this.config.springPreload[1];
        this.state.compression[2] = rearWeight / this.config.springRate[2] + this.config.springPreload[2];
        this.state.compression[3] = rearWeight / this.config.springRate[3] + this.config.springPreload[3];
        
        this.emit('initialized', {
            config: this.config,
            initialState: { ...this.state }
        });
    }

    /**
     * Update suspension physics
     */
    update(deltaTime, vehicleState, wheelForces) {
        const currentTime = Date.now();
        const dt = Math.min(deltaTime, 1/30); // Cap at 30 FPS for stability
        
        // Update each wheel's suspension
        for (let i = 0; i < 4; i++) {
            this.updateWheelSuspension(i, dt, vehicleState, wheelForces[i]);
        }
        
        // Apply anti-roll bar effects
        if (this.config.enableAntiRollBars) {
            this.applyAntiRollBars();
        }
        
        // Update temperature effects
        if (this.config.enableTemperatureEffects) {
            this.updateTemperatureEffects(dt);
        }
        
        // Update performance metrics
        this.updatePerformanceMetrics(dt);
        
        this.state.lastUpdate = currentTime;
        
        this.emit('updated', {
            state: { ...this.state },
            performance: { ...this.performance }
        });
    }

    /**
     * Update individual wheel suspension
     */
    updateWheelSuspension(wheelIndex, deltaTime, vehicleState, wheelForce) {
        const compression = this.state.compression[wheelIndex];
        const velocity = this.state.velocity[wheelIndex];
        
        // Calculate spring force
        const springForce = this.calculateSpringForce(wheelIndex, compression);
        
        // Calculate damping force
        const dampingForce = this.calculateDampingForce(wheelIndex, velocity);
        
        // Calculate total suspension force
        const totalForce = springForce + dampingForce + wheelForce.vertical;
        
        // Apply force limits
        const limitedForce = this.applyForceLimits(wheelIndex, totalForce);
        
        // Update velocity and position using Verlet integration
        const acceleration = limitedForce / (vehicleState.mass / 4); // Assume equal mass distribution
        
        const newVelocity = velocity + acceleration * deltaTime;
        const newCompression = compression + newVelocity * deltaTime;
        
        // Apply compression limits
        this.state.compression[wheelIndex] = Math.max(
            -this.config.maxExtension[wheelIndex],
            Math.min(this.config.maxCompression[wheelIndex], newCompression)
        );
        
        this.state.velocity[wheelIndex] = newVelocity;
        this.state.force[wheelIndex] = limitedForce;
        
        // Update performance tracking
        this.performance.maxCompression[wheelIndex] = Math.max(
            this.performance.maxCompression[wheelIndex],
            Math.max(0, newCompression)
        );
        
        this.performance.maxExtension[wheelIndex] = Math.max(
            this.performance.maxExtension[wheelIndex],
            Math.max(0, -newCompression)
        );
    }

    /**
     * Calculate spring force with progressive rates
     */
    calculateSpringForce(wheelIndex, compression) {
        const baseRate = this.config.springRate[wheelIndex];
        const preload = this.config.springPreload[wheelIndex];
        
        if (!this.config.enableProgressiveRates) {
            return -baseRate * (compression - preload);
        }
        
        // Progressive spring rate calculation
        const compressionRatio = Math.abs(compression) / this.config.maxCompression[wheelIndex];
        const progressiveFactor = 1 + (compressionRatio * compressionRatio * 0.5);
        
        return -baseRate * progressiveFactor * (compression - preload);
    }

    /**
     * Calculate damping force with velocity-dependent characteristics
     */
    calculateDampingForce(wheelIndex, velocity) {
        let dampingCoeff;
        
        if (velocity > 0) {
            // Compression
            dampingCoeff = this.config.compressionDamping[wheelIndex];
        } else {
            // Rebound
            dampingCoeff = this.config.reboundDamping[wheelIndex];
        }
        
        // Apply temperature effects
        if (this.config.enableTemperatureEffects) {
            const tempFactor = 1 + (this.state.temperature[wheelIndex] - 20) * this.physics.dampingTemperatureCoeff;
            dampingCoeff *= tempFactor;
        }
        
        // Non-linear damping for realism
        const velocitySquared = velocity * velocity;
        const linearDamping = -dampingCoeff * velocity;
        const quadraticDamping = -Math.sign(velocity) * dampingCoeff * 0.1 * velocitySquared;
        
        return linearDamping + quadraticDamping;
    }

    /**
     * Apply anti-roll bar effects
     */
    applyAntiRollBars() {
        // Front anti-roll bar
        const frontRollAngle = (this.state.compression[0] - this.state.compression[1]) / this.config.trackWidth[0];
        const frontAntiRollTorque = -this.config.antiRollBarStiffness[0] * frontRollAngle;
        const frontAntiRollForce = frontAntiRollTorque / this.config.trackWidth[0];
        
        this.state.force[0] += frontAntiRollForce;
        this.state.force[1] -= frontAntiRollForce;
        
        // Rear anti-roll bar
        const rearRollAngle = (this.state.compression[2] - this.state.compression[3]) / this.config.trackWidth[1];
        const rearAntiRollTorque = -this.config.antiRollBarStiffness[1] * rearRollAngle;
        const rearAntiRollForce = rearAntiRollTorque / this.config.trackWidth[1];
        
        this.state.force[2] += rearAntiRollForce;
        this.state.force[3] -= rearAntiRollForce;
    }

    /**
     * Update temperature effects on suspension components
     */
    updateTemperatureEffects(deltaTime) {
        for (let i = 0; i < 4; i++) {
            // Temperature increases with work done
            const work = Math.abs(this.state.force[i] * this.state.velocity[i]);
            const heatGeneration = work * 0.001; // Convert to temperature rise
            
            // Heat dissipation
            const ambientTemp = 20; // °C
            const heatDissipation = (this.state.temperature[i] - ambientTemp) * 0.1 * deltaTime;
            
            this.state.temperature[i] += (heatGeneration - heatDissipation) * deltaTime;
            this.state.temperature[i] = Math.max(ambientTemp, this.state.temperature[i]);
        }
    }

    /**
     * Apply force limits to prevent unrealistic values
     */
    applyForceLimits(wheelIndex, force) {
        const maxForce = this.config.springRate[wheelIndex] * this.config.maxCompression[wheelIndex] * 2;
        return Math.max(-maxForce, Math.min(maxForce, force));
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(deltaTime) {
        for (let i = 0; i < 4; i++) {
            const work = Math.abs(this.state.force[i] * this.state.velocity[i]) * deltaTime;
            
            if (this.state.velocity[i] > 0) {
                this.performance.totalCompressionWork += work;
            } else {
                this.performance.totalReboundWork += work;
            }
            
            // Update average force (exponential moving average)
            const alpha = 0.1;
            this.performance.averageForce[i] = 
                alpha * Math.abs(this.state.force[i]) + 
                (1 - alpha) * this.performance.averageForce[i];
        }
    }

    /**
     * Get suspension forces for vehicle dynamics
     */
    getSuspensionForces() {
        return {
            forces: [...this.state.force],
            moments: this.calculateSuspensionMoments(),
            rollStiffness: this.calculateRollStiffness(),
            pitchStiffness: this.calculatePitchStiffness()
        };
    }

    /**
     * Calculate suspension moments about vehicle center
     */
    calculateSuspensionMoments() {
        const frontAxleDistance = this.config.wheelbase * 0.6; // Distance from CG to front axle
        const rearAxleDistance = this.config.wheelbase * 0.4; // Distance from CG to rear axle
        
        // Roll moment (about longitudinal axis)
        const rollMoment = 
            (this.state.force[0] - this.state.force[1]) * this.config.trackWidth[0] / 2 +
            (this.state.force[2] - this.state.force[3]) * this.config.trackWidth[1] / 2;
        
        // Pitch moment (about lateral axis)
        const pitchMoment = 
            (this.state.force[0] + this.state.force[1]) * frontAxleDistance -
            (this.state.force[2] + this.state.force[3]) * rearAxleDistance;
        
        return {
            roll: rollMoment,
            pitch: pitchMoment,
            yaw: 0 // Suspension doesn't directly contribute to yaw
        };
    }

    /**
     * Calculate effective roll stiffness
     */
    calculateRollStiffness() {
        const frontRollStiffness = 
            (this.config.springRate[0] * this.config.springRate[1] * Math.pow(this.config.trackWidth[0], 2)) /
            (4 * (this.config.springRate[0] + this.config.springRate[1])) +
            this.config.antiRollBarStiffness[0];
        
        const rearRollStiffness = 
            (this.config.springRate[2] * this.config.springRate[3] * Math.pow(this.config.trackWidth[1], 2)) /
            (4 * (this.config.springRate[2] + this.config.springRate[3])) +
            this.config.antiRollBarStiffness[1];
        
        return {
            front: frontRollStiffness,
            rear: rearRollStiffness,
            total: frontRollStiffness + rearRollStiffness
        };
    }

    /**
     * Calculate effective pitch stiffness
     */
    calculatePitchStiffness() {
        const frontStiffness = (this.config.springRate[0] + this.config.springRate[1]) / 2;
        const rearStiffness = (this.config.springRate[2] + this.config.springRate[3]) / 2;
        
        const frontDistance = this.config.wheelbase * 0.6;
        const rearDistance = this.config.wheelbase * 0.4;
        
        return frontStiffness * Math.pow(frontDistance, 2) + rearStiffness * Math.pow(rearDistance, 2);
    }

    /**
     * Adjust suspension settings
     */
    adjustSuspension(adjustments) {
        if (adjustments.springRate) {
            for (let i = 0; i < 4; i++) {
                this.config.springRate[i] *= (1 + adjustments.springRate[i]);
            }
        }
        
        if (adjustments.dampingCoefficient) {
            for (let i = 0; i < 4; i++) {
                this.config.dampingCoefficient[i] *= (1 + adjustments.dampingCoefficient[i]);
                this.config.compressionDamping[i] *= (1 + adjustments.dampingCoefficient[i]);
                this.config.reboundDamping[i] *= (1 + adjustments.dampingCoefficient[i]);
            }
        }
        
        if (adjustments.antiRollBarStiffness) {
            this.config.antiRollBarStiffness[0] *= (1 + adjustments.antiRollBarStiffness[0]);
            this.config.antiRollBarStiffness[1] *= (1 + adjustments.antiRollBarStiffness[1]);
        }
        
        this.emit('suspensionAdjusted', {
            adjustments,
            newConfig: { ...this.config }
        });
    }

    /**
     * Get suspension telemetry data
     */
    getTelemetry() {
        return {
            compression: [...this.state.compression],
            velocity: [...this.state.velocity],
            force: [...this.state.force],
            temperature: [...this.state.temperature],
            performance: { ...this.performance },
            rollStiffness: this.calculateRollStiffness(),
            pitchStiffness: this.calculatePitchStiffness(),
            workDone: {
                compression: this.performance.totalCompressionWork,
                rebound: this.performance.totalReboundWork,
                total: this.performance.totalCompressionWork + this.performance.totalReboundWork
            }
        };
    }

    /**
     * Reset suspension to initial state
     */
    reset() {
        this.state = {
            compression: [0, 0, 0, 0],
            velocity: [0, 0, 0, 0],
            force: [0, 0, 0, 0],
            temperature: [20, 20, 20, 20],
            lastUpdate: Date.now()
        };
        
        this.performance = {
            totalCompressionWork: 0,
            totalReboundWork: 0,
            maxCompression: [0, 0, 0, 0],
            maxExtension: [0, 0, 0, 0],
            averageForce: [0, 0, 0, 0]
        };
        
        this.initializeSimulation();
        
        this.emit('reset');
    }

    /**
     * Dispose of the suspension simulator
     */
    dispose() {
        this.removeAllListeners();
    }
}