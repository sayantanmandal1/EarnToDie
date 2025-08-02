/**
 * Tire Physics Simulator
 * Advanced tire physics simulation with grip, slip, and wear modeling
 */

import { EventEmitter } from 'events';
import { electronIntegration } from '../electron/ElectronIntegration.js';

export class TirePhysicsSimulator extends EventEmitter {
    constructor(options = {}) {
        super();

        this.options = {
            // Tire physical properties
            tireWidth: options.tireWidth || 225, // mm
            aspectRatio: options.aspectRatio || 60, // %
            rimDiameter: options.rimDiameter || 16, // inches
            
            // Grip characteristics
            maxGripCoefficient: options.maxGripCoefficient || 1.2,
            wetGripReduction: options.wetGripReduction || 0.3,
            temperatureOptimal: options.temperatureOptimal || 80, // °C
            temperatureRange: options.temperatureRange || [20, 120], // °C
            
            // Pacejka tire model parameters
            pacejkaB: options.pacejkaB || 10, // Stiffness factor
            pacejkaC: options.pacejkaC || 1.9, // Shape factor
            pacejkaD: options.pacejkaD || 1.0, // Peak factor
            pacejkaE: options.pacejkaE || 0.97, // Curvature factor
            
            // Wear characteristics
            wearRate: options.wearRate || 0.0001, // per unit distance
            maxWear: options.maxWear || 1.0, // 100% worn
            wearTemperatureEffect: options.wearTemperatureEffect || 0.02,
            
            // Surface interaction
            surfaceTypes: options.surfaceTypes || {
                asphalt: { grip: 1.0, wear: 1.0 },
                concrete: { grip: 0.95, wear: 0.8 },
                gravel: { grip: 0.6, wear: 2.0 },
                grass: { grip: 0.4, wear: 1.5 },
                sand: { grip: 0.3, wear: 3.0 },
                ice: { grip: 0.1, wear: 0.5 },
                snow: { grip: 0.2, wear: 0.7 }
            },
            
            // Performance settings
            enableTemperatureEffects: options.enableTemperatureEffects !== false,
            enableWearSimulation: options.enableWearSimulation !== false,
            enableSurfaceInteraction: options.enableSurfaceInteraction !== false,
            simulationFrequency: options.simulationFrequency || 120 // Hz
        };

        // Tire state (per wheel: FL, FR, RL, RR)
        this.state = {
            temperature: [20, 20, 20, 20], // °C
            wear: [0, 0, 0, 0], // 0-1 (0 = new, 1 = completely worn)
            pressure: [2.2, 2.2, 2.2, 2.2], // bar
            slipRatio: [0, 0, 0, 0], // longitudinal slip
            slipAngle: [0, 0, 0, 0], // lateral slip (radians)
            gripCoefficient: [1.0, 1.0, 1.0, 1.0], // current grip coefficient
            contactPatch: [0.02, 0.02, 0.02, 0.02], // contact patch area (m²)
            lastUpdate: Date.now()
        };

        // Forces (per wheel)
        this.forces = {
            longitudinal: [0, 0, 0, 0], // N (forward/backward)
            lateral: [0, 0, 0, 0], // N (left/right)
            vertical: [0, 0, 0, 0], // N (up/down)
            combined: [0, 0, 0, 0] // N (total force magnitude)
        };

        // Performance tracking
        this.performance = {
            totalDistance: 0, // meters
            maxSlipRatio: [0, 0, 0, 0],
            maxSlipAngle: [0, 0, 0, 0],
            averageTemperature: [20, 20, 20, 20],
            wearRate: [0, 0, 0, 0],
            gripUtilization: [0, 0, 0, 0] // 0-1
        };

        // Physics constants
        this.physics = {
            gravity: 9.81, // m/s²
            airDensity: 1.225, // kg/m³
            heatCapacity: 1000, // J/(kg·K) for tire rubber
            thermalConductivity: 0.2, // W/(m·K)
            ambientTemperature: 20 // °C
        };

        this.logger = electronIntegration.getLogger();
        
        // Calculate tire dimensions
        this.calculateTireDimensions();
        
        // Initialize simulation
        this.initializeSimulation();
    }

    /**
     * Calculate tire dimensions from specifications
     */
    calculateTireDimensions() {
        // Convert rim diameter from inches to mm
        const rimDiameterMm = this.options.rimDiameter * 25.4;
        
        // Calculate sidewall height
        const sidewallHeight = (this.options.tireWidth * this.options.aspectRatio) / 100;
        
        // Calculate overall diameter
        this.tireDimensions = {
            width: this.options.tireWidth, // mm
            sidewallHeight: sidewallHeight, // mm
            overallDiameter: rimDiameterMm + (2 * sidewallHeight), // mm
            circumference: Math.PI * (rimDiameterMm + (2 * sidewallHeight)) / 1000, // meters
            contactPatchLength: Math.sqrt(this.options.tireWidth * sidewallHeight) / 1000, // meters (approximation)
            contactPatchWidth: this.options.tireWidth / 1000 // meters
        };

        // Calculate base contact patch area
        const baseContactPatch = this.tireDimensions.contactPatchLength * this.tireDimensions.contactPatchWidth;
        for (let i = 0; i < 4; i++) {
            this.state.contactPatch[i] = baseContactPatch;
        }
    }

    /**
     * Initialize tire simulation
     */
    initializeSimulation() {
        // Set initial grip coefficients
        for (let i = 0; i < 4; i++) {
            this.state.gripCoefficient[i] = this.options.maxGripCoefficient;
        }

        this.emit('initialized', {
            dimensions: this.tireDimensions,
            initialState: { ...this.state }
        });

        this.logger.info('Tire Physics Simulator initialized', {
            dimensions: this.tireDimensions,
            options: this.options
        });
    }

    /**
     * Update tire physics simulation
     */
    update(deltaTime, wheelData, surfaceType = 'asphalt') {
        const dt = Math.min(deltaTime, 1/30); // Cap at 30 FPS for stability

        for (let i = 0; i < 4; i++) {
            this.updateWheelTire(i, dt, wheelData[i], surfaceType);
        }

        // Update performance metrics
        this.updatePerformanceMetrics(dt);

        this.state.lastUpdate = Date.now();

        this.emit('updated', {
            state: { ...this.state },
            forces: { ...this.forces },
            performance: { ...this.performance }
        });
    }

    /**
     * Update individual wheel tire physics
     */
    updateWheelTire(wheelIndex, deltaTime, wheelData, surfaceType) {
        // Calculate slip ratio and slip angle
        this.calculateSlip(wheelIndex, wheelData);

        // Update tire temperature
        if (this.options.enableTemperatureEffects) {
            this.updateTireTemperature(wheelIndex, deltaTime, wheelData);
        }

        // Update tire wear
        if (this.options.enableWearSimulation) {
            this.updateTireWear(wheelIndex, deltaTime, wheelData, surfaceType);
        }

        // Calculate grip coefficient
        this.calculateGripCoefficient(wheelIndex, surfaceType);

        // Calculate tire forces using Pacejka model
        this.calculateTireForces(wheelIndex, wheelData);

        // Update contact patch based on load
        this.updateContactPatch(wheelIndex, wheelData.verticalLoad);
    }

    /**
     * Calculate slip ratio and slip angle
     */
    calculateSlip(wheelIndex, wheelData) {
        const wheelSpeed = wheelData.angularVelocity * (this.tireDimensions.overallDiameter / 2000); // m/s
        const vehicleSpeed = Math.max(0.1, wheelData.vehicleSpeed); // Avoid division by zero

        // Longitudinal slip ratio
        if (wheelData.isBraking) {
            this.state.slipRatio[wheelIndex] = Math.max(0, (vehicleSpeed - wheelSpeed) / vehicleSpeed);
        } else {
            this.state.slipRatio[wheelIndex] = Math.max(0, (wheelSpeed - vehicleSpeed) / Math.max(wheelSpeed, vehicleSpeed));
        }

        // Lateral slip angle (simplified)
        const lateralVelocity = wheelData.lateralVelocity || 0;
        const longitudinalVelocity = Math.max(0.1, wheelData.longitudinalVelocity || vehicleSpeed);
        this.state.slipAngle[wheelIndex] = Math.atan(lateralVelocity / longitudinalVelocity);

        // Limit slip values
        this.state.slipRatio[wheelIndex] = Math.min(1.0, this.state.slipRatio[wheelIndex]);
        this.state.slipAngle[wheelIndex] = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.state.slipAngle[wheelIndex]));
    }

    /**
     * Update tire temperature based on work done
     */
    updateTireTemperature(wheelIndex, deltaTime, wheelData) {
        // Heat generation from slip
        const slipWork = Math.abs(this.state.slipRatio[wheelIndex]) * wheelData.verticalLoad * wheelData.vehicleSpeed;
        const lateralWork = Math.abs(this.state.slipAngle[wheelIndex]) * wheelData.verticalLoad * wheelData.vehicleSpeed;
        const totalWork = slipWork + lateralWork;

        // Convert work to temperature rise
        const heatGeneration = totalWork * 0.001; // Simplified conversion

        // Heat dissipation to ambient
        const temperatureDifference = this.state.temperature[wheelIndex] - this.physics.ambientTemperature;
        const heatDissipation = temperatureDifference * this.physics.thermalConductivity * deltaTime;

        // Update temperature
        this.state.temperature[wheelIndex] += (heatGeneration - heatDissipation) * deltaTime;
        this.state.temperature[wheelIndex] = Math.max(
            this.physics.ambientTemperature,
            Math.min(200, this.state.temperature[wheelIndex]) // Cap at 200°C
        );
    }

    /**
     * Update tire wear based on usage
     */
    updateTireWear(wheelIndex, deltaTime, wheelData, surfaceType) {
        const surfaceData = this.options.surfaceTypes[surfaceType] || this.options.surfaceTypes.asphalt;
        
        // Base wear rate
        let wearRate = this.options.wearRate * surfaceData.wear;

        // Increase wear with slip
        const slipFactor = 1 + (this.state.slipRatio[wheelIndex] * 5) + (Math.abs(this.state.slipAngle[wheelIndex]) * 3);
        wearRate *= slipFactor;

        // Temperature effect on wear
        if (this.options.enableTemperatureEffects) {
            const tempFactor = 1 + (this.state.temperature[wheelIndex] - this.options.temperatureOptimal) * this.options.wearTemperatureEffect;
            wearRate *= Math.max(0.1, tempFactor);
        }

        // Apply wear
        const distance = wheelData.vehicleSpeed * deltaTime;
        this.state.wear[wheelIndex] += wearRate * distance;
        this.state.wear[wheelIndex] = Math.min(this.options.maxWear, this.state.wear[wheelIndex]);
    }

    /**
     * Calculate current grip coefficient
     */
    calculateGripCoefficient(wheelIndex, surfaceType) {
        let gripCoeff = this.options.maxGripCoefficient;
        const surfaceData = this.options.surfaceTypes[surfaceType] || this.options.surfaceTypes.asphalt;

        // Surface type effect
        if (this.options.enableSurfaceInteraction) {
            gripCoeff *= surfaceData.grip;
        }

        // Temperature effect
        if (this.options.enableTemperatureEffects) {
            const tempDiff = Math.abs(this.state.temperature[wheelIndex] - this.options.temperatureOptimal);
            const tempFactor = Math.max(0.3, 1 - (tempDiff / 100));
            gripCoeff *= tempFactor;
        }

        // Wear effect
        if (this.options.enableWearSimulation) {
            const wearFactor = Math.max(0.2, 1 - this.state.wear[wheelIndex]);
            gripCoeff *= wearFactor;
        }

        // Pressure effect (simplified)
        const optimalPressure = 2.2; // bar
        const pressureDiff = Math.abs(this.state.pressure[wheelIndex] - optimalPressure);
        const pressureFactor = Math.max(0.8, 1 - (pressureDiff / 2));
        gripCoeff *= pressureFactor;

        this.state.gripCoefficient[wheelIndex] = Math.max(0.1, gripCoeff);
    }

    /**
     * Calculate tire forces using Pacejka tire model
     */
    calculateTireForces(wheelIndex, wheelData) {
        const slipRatio = this.state.slipRatio[wheelIndex];
        const slipAngle = this.state.slipAngle[wheelIndex];
        const gripCoeff = this.state.gripCoefficient[wheelIndex];
        const normalForce = wheelData.verticalLoad;

        // Pacejka magic formula for longitudinal force
        const longitudinalForce = this.pacejkaFormula(
            slipRatio,
            this.options.pacejkaB,
            this.options.pacejkaC,
            this.options.pacejkaD * gripCoeff * normalForce,
            this.options.pacejkaE
        );

        // Pacejka magic formula for lateral force
        const lateralForce = this.pacejkaFormula(
            Math.tan(slipAngle),
            this.options.pacejkaB * 0.8, // Slightly different parameters for lateral
            this.options.pacejkaC * 1.1,
            this.options.pacejkaD * gripCoeff * normalForce * 0.9,
            this.options.pacejkaE
        );

        // Apply forces
        this.forces.longitudinal[wheelIndex] = longitudinalForce;
        this.forces.lateral[wheelIndex] = lateralForce;
        this.forces.vertical[wheelIndex] = normalForce;
        this.forces.combined[wheelIndex] = Math.sqrt(
            longitudinalForce * longitudinalForce + lateralForce * lateralForce
        );

        // Calculate grip utilization
        const maxPossibleForce = gripCoeff * normalForce;
        this.performance.gripUtilization[wheelIndex] = maxPossibleForce > 0 ? 
            this.forces.combined[wheelIndex] / maxPossibleForce : 0;
    }

    /**
     * Pacejka magic formula implementation
     */
    pacejkaFormula(slip, B, C, D, E) {
        const x = slip;
        const BCD = B * C * D;
        const BCDx = BCD * x;
        const Cx = C * x;
        const ECx = E * Cx;
        const ECx2 = ECx * ECx;
        
        return D * Math.sin(C * Math.atan(B * x - E * (B * x - Math.atan(B * x))));
    }

    /**
     * Update contact patch based on vertical load
     */
    updateContactPatch(wheelIndex, verticalLoad) {
        // Contact patch increases with load (simplified model)
        const baseArea = this.tireDimensions.contactPatchLength * this.tireDimensions.contactPatchWidth;
        const loadFactor = Math.sqrt(verticalLoad / 5000); // Normalize to ~5000N
        this.state.contactPatch[wheelIndex] = baseArea * Math.max(0.5, Math.min(2.0, loadFactor));
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(deltaTime) {
        for (let i = 0; i < 4; i++) {
            // Update maximum values
            this.performance.maxSlipRatio[i] = Math.max(
                this.performance.maxSlipRatio[i],
                this.state.slipRatio[i]
            );
            
            this.performance.maxSlipAngle[i] = Math.max(
                this.performance.maxSlipAngle[i],
                Math.abs(this.state.slipAngle[i])
            );

            // Update average temperature (exponential moving average)
            const alpha = 0.1;
            this.performance.averageTemperature[i] = 
                alpha * this.state.temperature[i] + 
                (1 - alpha) * this.performance.averageTemperature[i];

            // Update wear rate
            const previousWear = this.performance.wearRate[i];
            this.performance.wearRate[i] = (this.state.wear[i] - previousWear) / deltaTime;
        }
    }

    /**
     * Get tire forces for vehicle dynamics
     */
    getTireForces() {
        return {
            longitudinal: [...this.forces.longitudinal],
            lateral: [...this.forces.lateral],
            vertical: [...this.forces.vertical],
            combined: [...this.forces.combined],
            moments: this.calculateTireMoments()
        };
    }

    /**
     * Calculate tire moments about vehicle center
     */
    calculateTireMoments() {
        // This would be calculated based on tire position relative to vehicle center
        // For now, return simplified moments
        return {
            roll: (this.forces.lateral[0] + this.forces.lateral[2]) - 
                  (this.forces.lateral[1] + this.forces.lateral[3]),
            pitch: (this.forces.longitudinal[0] + this.forces.longitudinal[1]) - 
                   (this.forces.longitudinal[2] + this.forces.longitudinal[3]),
            yaw: (this.forces.lateral[0] + this.forces.lateral[1]) * 0.6 - 
                 (this.forces.lateral[2] + this.forces.lateral[3]) * 0.4
        };
    }

    /**
     * Adjust tire pressure
     */
    adjustPressure(wheelIndex, newPressure) {
        this.state.pressure[wheelIndex] = Math.max(0.5, Math.min(4.0, newPressure));
        
        this.emit('pressureAdjusted', {
            wheelIndex,
            newPressure: this.state.pressure[wheelIndex]
        });
    }

    /**
     * Replace tire (reset wear)
     */
    replaceTire(wheelIndex) {
        this.state.wear[wheelIndex] = 0;
        this.state.temperature[wheelIndex] = this.physics.ambientTemperature;
        
        this.emit('tireReplaced', { wheelIndex });
    }

    /**
     * Get tire telemetry data
     */
    getTelemetry() {
        return {
            state: { ...this.state },
            forces: { ...this.forces },
            performance: { ...this.performance },
            dimensions: { ...this.tireDimensions },
            gripUtilization: [...this.performance.gripUtilization],
            wearPercentage: this.state.wear.map(w => w * 100),
            temperatureStatus: this.state.temperature.map(t => {
                if (t < 40) return 'cold';
                if (t < 60) return 'warming';
                if (t < 100) return 'optimal';
                if (t < 120) return 'hot';
                return 'overheating';
            })
        };
    }

    /**
     * Get tire condition assessment
     */
    getTireCondition() {
        return this.state.wear.map((wear, index) => {
            const temp = this.state.temperature[index];
            const pressure = this.state.pressure[index];
            
            let condition = 'good';
            let issues = [];
            
            if (wear > 0.8) {
                condition = 'critical';
                issues.push('excessive wear');
            } else if (wear > 0.6) {
                condition = 'poor';
                issues.push('high wear');
            } else if (wear > 0.4) {
                condition = 'fair';
                issues.push('moderate wear');
            }
            
            if (temp > 120) {
                condition = 'critical';
                issues.push('overheating');
            } else if (temp > 100) {
                if (condition === 'good') condition = 'fair';
                issues.push('high temperature');
            }
            
            if (pressure < 1.8 || pressure > 2.6) {
                if (condition === 'good') condition = 'fair';
                issues.push('incorrect pressure');
            }
            
            return {
                condition,
                issues,
                wearPercentage: wear * 100,
                temperature: temp,
                pressure: pressure,
                recommendedAction: this.getRecommendedAction(wear, temp, pressure)
            };
        });
    }

    /**
     * Get recommended action for tire condition
     */
    getRecommendedAction(wear, temperature, pressure) {
        if (wear > 0.9) return 'Replace immediately';
        if (wear > 0.8) return 'Replace soon';
        if (temperature > 130) return 'Cool down - reduce speed';
        if (temperature > 110) return 'Monitor temperature';
        if (pressure < 1.5 || pressure > 3.0) return 'Adjust pressure';
        if (wear > 0.6) return 'Monitor wear';
        return 'Continue monitoring';
    }

    /**
     * Reset tire simulation
     */
    reset() {
        this.state = {
            temperature: [20, 20, 20, 20],
            wear: [0, 0, 0, 0],
            pressure: [2.2, 2.2, 2.2, 2.2],
            slipRatio: [0, 0, 0, 0],
            slipAngle: [0, 0, 0, 0],
            gripCoefficient: [1.0, 1.0, 1.0, 1.0],
            contactPatch: [0.02, 0.02, 0.02, 0.02],
            lastUpdate: Date.now()
        };

        this.forces = {
            longitudinal: [0, 0, 0, 0],
            lateral: [0, 0, 0, 0],
            vertical: [0, 0, 0, 0],
            combined: [0, 0, 0, 0]
        };

        this.performance = {
            totalDistance: 0,
            maxSlipRatio: [0, 0, 0, 0],
            maxSlipAngle: [0, 0, 0, 0],
            averageTemperature: [20, 20, 20, 20],
            wearRate: [0, 0, 0, 0],
            gripUtilization: [0, 0, 0, 0]
        };

        this.initializeSimulation();
        this.emit('reset');
    }

    /**
     * Dispose of the tire physics simulator
     */
    dispose() {
        this.removeAllListeners();
        this.logger.info('Tire Physics Simulator disposed');
    }
}