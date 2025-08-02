/**
 * Advanced Engine Simulator
 * Realistic engine simulation with torque curves, inertia, and temperature
 */

import { EventEmitter } from 'events';

export class EngineSimulator extends EventEmitter {
    constructor(engineConfig, options = {}) {
        super();
        
        this.config = {
            // Engine specifications
            displacement: engineConfig.displacement || 2.0, // Liters
            cylinders: engineConfig.cylinders || 4,
            maxRPM: engineConfig.maxRPM || 6500,
            idleRPM: engineConfig.idleRPM || 800,
            maxTorque: engineConfig.maxTorque || 300, // Nm
            maxTorqueRPM: engineConfig.maxTorqueRPM || 3500,
            maxPower: engineConfig.maxPower || 200, // HP
            maxPowerRPM: engineConfig.maxPowerRPM || 5500,
            
            // Engine characteristics
            compressionRatio: engineConfig.compressionRatio || 10.5,
            fuelType: engineConfig.fuelType || 'gasoline',
            aspiration: engineConfig.aspiration || 'naturally_aspirated', // turbo, supercharged
            
            // Torque curve points (RPM -> Torque multiplier)
            torqueCurve: engineConfig.torqueCurve || [
                { rpm: 800, torque: 0.4 },
                { rpm: 1500, torque: 0.7 },
                { rpm: 2500, torque: 0.9 },
                { rpm: 3500, torque: 1.0 }, // Peak torque
                { rpm: 4500, torque: 0.95 },
                { rpm: 5500, torque: 0.85 }, // Peak power
                { rpm: 6500, torque: 0.6 },
                { rpm: 7000, torque: 0.3 }
            ],
            
            ...engineConfig
        };
        
        this.options = {
            enableTorqueCurves: options.enableTorqueCurves !== false,
            enableInertia: options.enableInertia !== false,
            enableTemperature: options.enableTemperature !== false,
            enableWearSimulation: options.enableWearSimulation || false,
            enableAdvancedCombustion: options.enableAdvancedCombustion || false,
            ...options
        };
        
        // Engine state
        this.state = {
            rpm: this.config.idleRPM,
            targetRPM: this.config.idleRPM,
            torque: 0,
            power: 0,
            temperature: 90, // Celsius
            oilPressure: 3.5, // Bar
            fuelConsumption: 0, // L/h
            
            // Advanced state
            throttlePosition: 0, // 0-1
            airFuelRatio: 14.7, // Stoichiometric ratio
            manifoldPressure: 1.0, // Bar (atmospheric)
            exhaustTemperature: 400, // Celsius
            
            // Wear and maintenance
            engineHours: 0,
            wearLevel: 0, // 0-1
            lastMaintenanceHours: 0,
            
            // Performance metrics
            efficiency: 0.35, // Thermal efficiency
            emissions: 0 // g/km CO2
        };
        
        // Engine dynamics
        this.dynamics = {
            inertia: this.calculateEngineInertia(),
            friction: this.calculateEngineFriction(),
            thermalMass: this.calculateThermalMass()
        };
        
        // Initialize engine
        this.initialize();
    }

    /**
     * Initialize engine simulator
     */
    initialize() {
        // Calculate derived properties
        this.calculateDerivedProperties();
        
        // Set initial state
        this.state.rpm = this.config.idleRPM;
        this.state.temperature = 20; // Cold start
        
        this.emit('initialized', {
            displacement: this.config.displacement,
            cylinders: this.config.cylinders,
            maxPower: this.config.maxPower,
            maxTorque: this.config.maxTorque
        });
    }

    /**
     * Calculate derived engine properties
     */
    calculateDerivedProperties() {
        // Calculate engine inertia based on displacement and configuration
        this.dynamics.inertia = this.calculateEngineInertia();
        
        // Calculate base friction
        this.dynamics.friction = this.calculateEngineFriction();
        
        // Calculate thermal mass
        this.dynamics.thermalMass = this.calculateThermalMass();
    }

    /**
     * Calculate engine inertia
     */
    calculateEngineInertia() {
        // Base inertia increases with displacement and cylinder count
        const baseInertia = 0.1 + (this.config.displacement * 0.05) + (this.config.cylinders * 0.01);
        
        // Adjust for engine configuration
        let configMultiplier = 1.0;
        if (this.config.aspiration === 'turbo') {
            configMultiplier *= 1.2; // Turbo adds inertia
        } else if (this.config.aspiration === 'supercharged') {
            configMultiplier *= 1.1;
        }
        
        return baseInertia * configMultiplier;
    }

    /**
     * Calculate engine friction
     */
    calculateEngineFriction() {
        // Base friction increases with displacement
        const baseFriction = 0.02 + (this.config.displacement * 0.01);
        
        // Adjust for wear
        const wearMultiplier = 1.0 + (this.state.wearLevel * 0.5);
        
        return baseFriction * wearMultiplier;
    }

    /**
     * Calculate thermal mass
     */
    calculateThermalMass() {
        // Thermal mass based on engine size
        return 50 + (this.config.displacement * 20) + (this.config.cylinders * 5);
    }

    /**
     * Update engine simulation
     */
    update(deltaTime, throttleInput, load = 0) {
        // Update throttle position
        this.updateThrottlePosition(deltaTime, throttleInput);
        
        // Calculate target RPM based on throttle and load
        this.calculateTargetRPM(throttleInput, load);
        
        // Update RPM with inertia
        this.updateRPM(deltaTime, load);
        
        // Calculate torque and power
        this.calculateTorqueAndPower();
        
        // Update temperature
        this.updateTemperature(deltaTime);
        
        // Update advanced systems
        if (this.options.enableAdvancedCombustion) {
            this.updateCombustionParameters();
        }
        
        // Update wear and maintenance
        if (this.options.enableWearSimulation) {
            this.updateWearAndMaintenance(deltaTime);
        }
        
        // Update performance metrics
        this.updatePerformanceMetrics(deltaTime);
        
        // Emit update event
        this.emit('updated', this.getEngineData());
        
        return this.getEngineData();
    }

    /**
     * Update throttle position with realistic response
     */
    updateThrottlePosition(deltaTime, throttleInput) {
        // Throttle response speed (electronic throttle body)
        const responseSpeed = 8.0; // rad/s
        
        const throttleDelta = (throttleInput - this.state.throttlePosition) * responseSpeed * deltaTime;
        this.state.throttlePosition = Math.max(0, Math.min(1, this.state.throttlePosition + throttleDelta));
    }

    /**
     * Calculate target RPM based on throttle and load
     */
    calculateTargetRPM(throttleInput, load) {
        // Base target RPM from throttle
        const throttleRPM = this.config.idleRPM + (this.config.maxRPM - this.config.idleRPM) * throttleInput;
        
        // Adjust for load (engine works harder under load)
        const loadAdjustment = load * 500; // RPM reduction under load
        
        this.state.targetRPM = Math.max(this.config.idleRPM, throttleRPM - loadAdjustment);
    }

    /**
     * Update RPM with engine inertia
     */
    updateRPM(deltaTime, load) {
        if (!this.options.enableInertia) {
            this.state.rpm = this.state.targetRPM;
            return;
        }
        
        // Calculate RPM change based on inertia
        const rpmDifference = this.state.targetRPM - this.state.rpm;
        const acceleration = rpmDifference / this.dynamics.inertia;
        
        // Apply friction and load
        const friction = this.dynamics.friction * this.state.rpm;
        const loadResistance = load * 100;
        
        const netAcceleration = acceleration - friction - loadResistance;
        const rpmChange = netAcceleration * deltaTime;
        
        this.state.rpm = Math.max(0, Math.min(this.config.maxRPM * 1.1, this.state.rpm + rpmChange));
        
        // Prevent stalling below idle
        if (this.state.rpm < this.config.idleRPM * 0.8) {
            this.state.rpm = this.config.idleRPM * 0.8;
        }
    }

    /**
     * Calculate torque and power based on current RPM
     */
    calculateTorqueAndPower() {
        if (this.options.enableTorqueCurves) {
            this.state.torque = this.getTorqueFromCurve(this.state.rpm);
        } else {
            // Simple torque calculation
            const rpmRatio = this.state.rpm / this.config.maxTorqueRPM;
            this.state.torque = this.config.maxTorque * Math.max(0, 1 - Math.abs(rpmRatio - 1) * 0.5);
        }
        
        // Apply throttle position
        this.state.torque *= this.state.throttlePosition;
        
        // Calculate power (P = T * ω)
        const angularVelocity = (this.state.rpm * 2 * Math.PI) / 60; // rad/s
        this.state.power = (this.state.torque * angularVelocity) / 1000; // kW
        
        // Apply temperature derating
        if (this.state.temperature > 100) {
            const derating = Math.max(0.7, 1 - (this.state.temperature - 100) / 200);
            this.state.torque *= derating;
            this.state.power *= derating;
        }
    }

    /**
     * Get torque from torque curve
     */
    getTorqueFromCurve(rpm) {
        const curve = this.config.torqueCurve;
        
        // Find the two points to interpolate between
        let lowerPoint = curve[0];
        let upperPoint = curve[curve.length - 1];
        
        for (let i = 0; i < curve.length - 1; i++) {
            if (rpm >= curve[i].rpm && rpm <= curve[i + 1].rpm) {
                lowerPoint = curve[i];
                upperPoint = curve[i + 1];
                break;
            }
        }
        
        // Linear interpolation
        const rpmRange = upperPoint.rpm - lowerPoint.rpm;
        const torqueRange = upperPoint.torque - lowerPoint.torque;
        
        if (rpmRange === 0) {
            return lowerPoint.torque * this.config.maxTorque;
        }
        
        const interpolationFactor = (rpm - lowerPoint.rpm) / rpmRange;
        const torqueMultiplier = lowerPoint.torque + (torqueRange * interpolationFactor);
        
        return torqueMultiplier * this.config.maxTorque;
    }

    /**
     * Update engine temperature
     */
    updateTemperature(deltaTime) {
        if (!this.options.enableTemperature) {
            return;
        }
        
        const ambientTemp = 25; // Celsius
        const targetTemp = 90; // Operating temperature
        
        // Heat generation based on load and RPM
        const loadFactor = (this.state.rpm / this.config.maxRPM) * this.state.throttlePosition;
        const heatGeneration = loadFactor * 50; // Heat per second
        
        // Cooling based on temperature difference and cooling system
        const tempDifference = this.state.temperature - ambientTemp;
        const cooling = tempDifference * 0.1; // Cooling rate
        
        // Temperature change
        const tempChange = (heatGeneration - cooling) / this.dynamics.thermalMass * deltaTime;
        this.state.temperature = Math.max(ambientTemp, this.state.temperature + tempChange);
        
        // Update oil pressure based on temperature and RPM
        this.updateOilPressure();
    }

    /**
     * Update oil pressure
     */
    updateOilPressure() {
        // Base pressure from RPM
        const rpmPressure = (this.state.rpm / this.config.maxRPM) * 4.0; // 0-4 bar
        
        // Temperature effect (lower pressure when hot)
        const tempFactor = Math.max(0.5, 1 - (this.state.temperature - 90) / 100);
        
        // Wear effect
        const wearFactor = Math.max(0.3, 1 - this.state.wearLevel * 0.7);
        
        this.state.oilPressure = Math.max(0.5, rpmPressure * tempFactor * wearFactor);
    }

    /**
     * Update combustion parameters
     */
    updateCombustionParameters() {
        // Air-fuel ratio based on throttle position and load
        const targetAFR = 14.7; // Stoichiometric
        const richnessFactor = this.state.throttlePosition * 0.8; // Richer under load
        this.state.airFuelRatio = targetAFR * (1 - richnessFactor * 0.1);
        
        // Manifold pressure (turbo/supercharger effect)
        if (this.config.aspiration === 'turbo') {
            const boost = this.state.throttlePosition * 1.5; // Up to 1.5 bar boost
            this.state.manifoldPressure = 1.0 + boost;
        } else if (this.config.aspiration === 'supercharged') {
            const boost = this.state.throttlePosition * 1.2; // Up to 1.2 bar boost
            this.state.manifoldPressure = 1.0 + boost;
        } else {
            // Naturally aspirated - vacuum under throttle
            this.state.manifoldPressure = 0.3 + (this.state.throttlePosition * 0.7);
        }
        
        // Exhaust temperature
        const baseExhaustTemp = 400 + (this.state.rpm / this.config.maxRPM) * 400;
        this.state.exhaustTemperature = baseExhaustTemp * (0.5 + this.state.throttlePosition * 0.5);
    }

    /**
     * Update wear and maintenance
     */
    updateWearAndMaintenance(deltaTime) {
        // Accumulate engine hours
        this.state.engineHours += deltaTime / 3600; // Convert seconds to hours
        
        // Calculate wear rate based on operating conditions
        let wearRate = 0.000001; // Base wear per second
        
        // Increase wear with high RPM
        if (this.state.rpm > this.config.maxRPM * 0.8) {
            wearRate *= 2.0;
        }
        
        // Increase wear with high temperature
        if (this.state.temperature > 110) {
            wearRate *= 1.5;
        }
        
        // Increase wear with low oil pressure
        if (this.state.oilPressure < 2.0) {
            wearRate *= 3.0;
        }
        
        // Apply wear
        this.state.wearLevel = Math.min(1.0, this.state.wearLevel + wearRate * deltaTime);
        
        // Update friction based on wear
        this.dynamics.friction = this.calculateEngineFriction();
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(deltaTime) {
        // Calculate fuel consumption (L/h)
        const baseFuelConsumption = this.config.displacement * 2; // L/h at idle
        const loadFactor = (this.state.rpm / this.config.maxRPM) * this.state.throttlePosition;
        this.state.fuelConsumption = baseFuelConsumption * (0.3 + loadFactor * 2);
        
        // Calculate efficiency
        const idealEfficiency = 0.4; // Maximum theoretical efficiency
        const rpmEfficiency = 1 - Math.abs(this.state.rpm - this.config.maxTorqueRPM) / this.config.maxRPM;
        const loadEfficiency = Math.min(1, this.state.throttlePosition * 2); // More efficient under load
        this.state.efficiency = idealEfficiency * rpmEfficiency * loadEfficiency * (1 - this.state.wearLevel * 0.2);
        
        // Calculate emissions (simplified)
        const baseEmissions = this.config.displacement * 150; // g/km base
        const afr_factor = Math.abs(this.state.airFuelRatio - 14.7) / 14.7; // Penalty for non-stoichiometric
        this.state.emissions = baseEmissions * (1 + afr_factor) * (1 + this.state.wearLevel * 0.5);
    }

    /**
     * Get current engine data
     */
    getEngineData() {
        return {
            rpm: this.state.rpm,
            torque: this.state.torque,
            power: this.state.power,
            temperature: this.state.temperature,
            oilPressure: this.state.oilPressure,
            throttlePosition: this.state.throttlePosition,
            fuelConsumption: this.state.fuelConsumption,
            efficiency: this.state.efficiency,
            wearLevel: this.state.wearLevel,
            
            // Advanced data
            airFuelRatio: this.state.airFuelRatio,
            manifoldPressure: this.state.manifoldPressure,
            exhaustTemperature: this.state.exhaustTemperature,
            emissions: this.state.emissions
        };
    }

    /**
     * Get engine specifications
     */
    getSpecifications() {
        return {
            displacement: this.config.displacement,
            cylinders: this.config.cylinders,
            maxRPM: this.config.maxRPM,
            idleRPM: this.config.idleRPM,
            maxTorque: this.config.maxTorque,
            maxTorqueRPM: this.config.maxTorqueRPM,
            maxPower: this.config.maxPower,
            maxPowerRPM: this.config.maxPowerRPM,
            compressionRatio: this.config.compressionRatio,
            fuelType: this.config.fuelType,
            aspiration: this.config.aspiration
        };
    }

    /**
     * Perform maintenance
     */
    performMaintenance() {
        this.state.lastMaintenanceHours = this.state.engineHours;
        this.state.wearLevel = Math.max(0, this.state.wearLevel - 0.1); // Reduce wear by 10%
        
        this.emit('maintenancePerformed', {
            engineHours: this.state.engineHours,
            wearLevel: this.state.wearLevel
        });
    }

    /**
     * Check if maintenance is needed
     */
    needsMaintenance() {
        const hoursSinceMaintenance = this.state.engineHours - this.state.lastMaintenanceHours;
        return hoursSinceMaintenance > 100 || this.state.wearLevel > 0.8; // 100 hours or 80% wear
    }

    /**
     * Reset engine to initial state
     */
    reset() {
        this.state.rpm = this.config.idleRPM;
        this.state.targetRPM = this.config.idleRPM;
        this.state.torque = 0;
        this.state.power = 0;
        this.state.temperature = 20;
        this.state.oilPressure = 3.5;
        this.state.throttlePosition = 0;
        this.state.fuelConsumption = 0;
        this.state.engineHours = 0;
        this.state.wearLevel = 0;
        this.state.lastMaintenanceHours = 0;
        
        this.emit('reset');
    }

    /**
     * Dispose of engine simulator
     */
    dispose() {
        this.removeAllListeners();
    }
        
        // Engine state
        this.state = {
            rpm: this.config.idleRPM,
            torque: 0,
            power: 0,
            temperature: 90, // Celsius
            oilPressure: 3.5, // Bar
            fuelConsumption: 0, // L/h
            efficiency: 0.35, // Thermal efficiency
            wear: 0, // 0-1 scale
            
            // Internal state
            inertia: this.calculateEngineInertia(),
            throttleResponse: 0,
            loadFactor: 0,
            heatGeneration: 0,
            coolingRate: 0
        };
        
        // Performance characteristics
        this.characteristics = {
            throttleResponseTime: 0.1, // seconds
            temperatureResponseTime: 30, // seconds
            maxTemperature: 120, // Celsius
            optimalTemperature: 90, // Celsius
            thermostatTemperature: 85, // Celsius
        };
        
        // Initialize torque curve interpolation
        this.initializeTorqueCurve();
    }

    /**
     * Initialize torque curve interpolation
     */
    initializeTorqueCurve() {
        // Sort torque curve by RPM
        this.config.torqueCurve.sort((a, b) => a.rpm - b.rpm);
        
        // Create interpolation function
        this.interpolateTorque = (rpm) => {
            if (!this.options.enableTorqueCurves) {
                // Simple linear torque curve
                const rpmRatio = (rpm - this.config.idleRPM) / (this.config.maxRPM - this.config.idleRPM);
                return Math.max(0, Math.min(1, 1 - Math.pow(rpmRatio - 0.5, 2) * 4));
            }
            
            const curve = this.config.torqueCurve;
            
            // Clamp RPM to curve range
            if (rpm <= curve[0].rpm) return curve[0].torque;
            if (rpm >= curve[curve.length - 1].rpm) return curve[curve.length - 1].torque;
            
            // Find interpolation points
            for (let i = 0; i < curve.length - 1; i++) {
                if (rpm >= curve[i].rpm && rpm <= curve[i + 1].rpm) {
                    const t = (rpm - curve[i].rpm) / (curve[i + 1].rpm - curve[i].rpm);
                    return this.lerp(curve[i].torque, curve[i + 1].torque, t);
                }
            }
            
            return 0;
        };
    }

    /**
     * Linear interpolation
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    /**
     * Calculate engine inertia based on configuration
     */
    calculateEngineInertia() {
        // Simplified inertia calculation based on displacement and cylinders
        const baseInertia = this.config.displacement * 0.1; // kg⋅m²
        const cylinderFactor = this.config.cylinders * 0.02;
        return baseInertia + cylinderFactor;
    }

    /**
     * Update engine simulation
     */
    update(deltaTime, inputs) {
        const { throttle, rpm, load, temperature } = inputs;
        
        // Update throttle response
        this.updateThrottleResponse(deltaTime, throttle);
        
        // Update RPM with inertia
        this.updateRPM(deltaTime, rpm, load);
        
        // Calculate torque and power
        this.updateTorqueAndPower();
        
        // Update temperature simulation
        if (this.options.enableTemperature) {
            this.updateTemperature(deltaTime, load);
        }
        
        // Update engine wear
        if (this.options.enableWearSimulation) {
            this.updateWear(deltaTime);
        }
        
        // Update fuel consumption
        this.updateFuelConsumption();
        
        // Update oil pressure
        this.updateOilPressure();
        
        return {
            rpm: this.state.rpm,
            torque: this.state.torque,
            power: this.state.power,
            temperature: this.state.temperature,
            oilPressure: this.state.oilPressure,
            fuelConsumption: this.state.fuelConsumption,
            efficiency: this.state.efficiency,
            wear: this.state.wear
        };
    }

    /**
     * Update throttle response
     */
    updateThrottleResponse(deltaTime, throttleInput) {
        const targetThrottle = Math.max(0, Math.min(1, throttleInput));
        const responseFactor = deltaTime / this.characteristics.throttleResponseTime;
        
        this.state.throttleResponse = this.lerp(
            this.state.throttleResponse,
            targetThrottle,
            responseFactor
        );
    }

    /**
     * Update RPM with engine inertia
     */
    updateRPM(deltaTime, targetRPM, load) {
        if (!this.options.enableInertia) {
            this.state.rpm = targetRPM;
            return;
        }
        
        // Calculate target RPM based on throttle and load
        const throttleRPM = this.config.idleRPM + 
            (this.config.maxRPM - this.config.idleRPM) * this.state.throttleResponse;
        
        // Apply load resistance
        const loadResistance = load * 1000; // Convert to RPM reduction
        const effectiveTargetRPM = Math.max(
            this.config.idleRPM,
            throttleRPM - loadResistance
        );
        
        // Apply inertia
        const rpmDifference = effectiveTargetRPM - this.state.rpm;
        const inertiaFactor = deltaTime / (this.state.inertia * 0.1);
        
        this.state.rpm += rpmDifference * inertiaFactor;
        
        // Clamp RPM to valid range
        this.state.rpm = Math.max(
            this.config.idleRPM * 0.5, // Allow stalling
            Math.min(this.config.maxRPM * 1.1, this.state.rpm) // Allow slight over-rev
        );
        
        // Store load factor for other calculations
        this.state.loadFactor = load;
    }

    /**
     * Update torque and power calculations
     */
    updateTorqueAndPower() {
        // Get base torque from curve
        const baseTorqueMultiplier = this.interpolateTorque(this.state.rpm);
        const baseTorque = this.config.maxTorque * baseTorqueMultiplier;
        
        // Apply throttle
        const throttleTorque = baseTorque * this.state.throttleResponse;
        
        // Apply temperature effects
        const temperatureMultiplier = this.getTemperatureMultiplier();
        
        // Apply wear effects
        const wearMultiplier = 1 - (this.state.wear * 0.3); // Max 30% reduction
        
        // Apply aspiration effects
        const aspirationMultiplier = this.getAspirationMultiplier();
        
        // Calculate final torque
        this.state.torque = throttleTorque * temperatureMultiplier * wearMultiplier * aspirationMultiplier;
        
        // Calculate power (P = T × ω, where ω = RPM × 2π/60)
        const angularVelocity = (this.state.rpm * 2 * Math.PI) / 60;
        this.state.power = (this.state.torque * angularVelocity) / 1000; // kW
        
        // Update efficiency
        this.updateEfficiency();
    }

    /**
     * Get temperature multiplier for performance
     */
    getTemperatureMultiplier() {
        const temp = this.state.temperature;
        const optimal = this.characteristics.optimalTemperature;
        
        if (temp < 60) {
            // Cold engine - reduced performance
            return 0.7 + (temp - 20) / 40 * 0.3;
        } else if (temp <= optimal + 10) {
            // Optimal range
            return 1.0;
        } else if (temp <= this.characteristics.maxTemperature) {
            // Overheating - reduced performance
            const overheatingFactor = (temp - optimal - 10) / (this.characteristics.maxTemperature - optimal - 10);
            return 1.0 - overheatingFactor * 0.4;
        } else {
            // Critical overheating
            return 0.3;
        }
    }

    /**
     * Get aspiration multiplier
     */
    getAspirationMultiplier() {
        switch (this.config.aspiration) {
            case 'turbo':
                // Turbo provides more power at higher RPM
                const turboBoost = Math.max(0, (this.state.rpm - 2000) / 4000);
                return 1.0 + turboBoost * 0.5;
            
            case 'supercharged':
                // Supercharger provides consistent boost
                return 1.3;
            
            case 'naturally_aspirated':
            default:
                return 1.0;
        }
    }

    /**
     * Update engine temperature simulation
     */
    updateTemperature(deltaTime, load) {
        // Heat generation based on load and RPM
        const rpmFactor = this.state.rpm / this.config.maxRPM;
        const loadFactor = load;
        const throttleFactor = this.state.throttleResponse;
        
        this.state.heatGeneration = (rpmFactor * 0.4 + loadFactor * 0.4 + throttleFactor * 0.2) * 100;
        
        // Cooling rate based on temperature difference and airflow
        const temperatureDifference = this.state.temperature - 20; // Ambient temperature
        const airflowFactor = Math.min(1, this.state.rpm / 2000); // Cooling fan effect
        this.state.coolingRate = temperatureDifference * 0.1 * (0.5 + airflowFactor * 0.5);
        
        // Update temperature
        const temperatureChange = (this.state.heatGeneration - this.state.coolingRate) * deltaTime;
        this.state.temperature += temperatureChange;
        
        // Thermostat effect
        if (this.state.temperature > this.characteristics.thermostatTemperature) {
            const thermostatCooling = (this.state.temperature - this.characteristics.thermostatTemperature) * 2;
            this.state.temperature -= thermostatCooling * deltaTime;
        }
        
        // Clamp temperature to realistic range
        this.state.temperature = Math.max(20, Math.min(150, this.state.temperature));
    }

    /**
     * Update engine wear simulation
     */
    updateWear(deltaTime) {
        // Wear factors
        const rpmWear = Math.max(0, (this.state.rpm - this.config.maxRPM * 0.8) / (this.config.maxRPM * 0.2));
        const temperatureWear = Math.max(0, (this.state.temperature - 100) / 50);
        const loadWear = this.state.loadFactor;
        
        // Calculate wear rate (very slow process)
        const wearRate = (rpmWear * 0.4 + temperatureWear * 0.4 + loadWear * 0.2) * 0.000001;
        
        this.state.wear += wearRate * deltaTime;
        this.state.wear = Math.min(1, this.state.wear);
    }

    /**
     * Update fuel consumption
     */
    updateFuelConsumption() {
        // Base consumption based on displacement and RPM
        const baseConsumption = this.config.displacement * (this.state.rpm / 1000) * 0.1;
        
        // Load factor
        const loadConsumption = baseConsumption * this.state.loadFactor * 2;
        
        // Throttle factor
        const throttleConsumption = baseConsumption * this.state.throttleResponse;
        
        // Efficiency factor
        const efficiencyFactor = 1 / this.state.efficiency;
        
        this.state.fuelConsumption = (baseConsumption + loadConsumption + throttleConsumption) * efficiencyFactor;
    }

    /**
     * Update engine efficiency
     */
    updateEfficiency() {
        // Base efficiency
        let efficiency = 0.35; // Typical gasoline engine
        
        // RPM efficiency curve (peak efficiency around 2000-3000 RPM)
        const optimalRPM = 2500;
        const rpmDifference = Math.abs(this.state.rpm - optimalRPM) / optimalRPM;
        const rpmEfficiency = Math.max(0.7, 1 - rpmDifference * 0.3);
        
        // Load efficiency (better efficiency at moderate loads)
        const loadEfficiency = Math.max(0.8, 1 - Math.abs(this.state.loadFactor - 0.6) * 0.5);
        
        // Temperature efficiency
        const tempEfficiency = this.getTemperatureMultiplier();
        
        this.state.efficiency = efficiency * rpmEfficiency * loadEfficiency * tempEfficiency;
    }

    /**
     * Update oil pressure
     */
    updateOilPressure() {
        // Base pressure based on RPM
        const basePressure = 1 + (this.state.rpm / 1000) * 0.5;
        
        // Temperature effect (lower viscosity at higher temps)
        const tempFactor = Math.max(0.7, 1 - (this.state.temperature - 90) / 100);
        
        // Wear effect (worn engines have lower pressure)
        const wearFactor = 1 - this.state.wear * 0.5;
        
        this.state.oilPressure = basePressure * tempFactor * wearFactor;
        this.state.oilPressure = Math.max(0.5, Math.min(6, this.state.oilPressure));
    }

    /**
     * Get engine sound characteristics
     */
    getSoundCharacteristics() {
        return {
            rpm: this.state.rpm,
            load: this.state.loadFactor,
            throttle: this.state.throttleResponse,
            cylinders: this.config.cylinders,
            displacement: this.config.displacement,
            aspiration: this.config.aspiration,
            
            // Sound modifiers
            pitch: this.state.rpm / this.config.maxRPM,
            volume: 0.3 + this.state.throttleResponse * 0.7,
            roughness: this.state.wear * 0.5 + (this.state.temperature > 110 ? 0.3 : 0)
        };
    }

    /**
     * Get engine diagnostics
     */
    getDiagnostics() {
        return {
            state: { ...this.state },
            config: { ...this.config },
            characteristics: { ...this.characteristics },
            
            // Calculated values
            powerHP: this.state.power * 1.34102, // Convert kW to HP
            torqueLbFt: this.state.torque * 0.737562, // Convert Nm to lb⋅ft
            fuelConsumptionMPG: this.calculateMPG(),
            
            // Health indicators
            healthScore: this.calculateHealthScore(),
            maintenanceNeeded: this.checkMaintenanceNeeds(),
            warnings: this.getWarnings()
        };
    }

    /**
     * Calculate fuel consumption in MPG
     */
    calculateMPG() {
        if (this.state.fuelConsumption <= 0) return 0;
        
        // Simplified MPG calculation
        const gallonsPerHour = this.state.fuelConsumption * 0.264172; // L/h to gal/h
        const milesPerHour = 60; // Assume 60 mph average
        
        return milesPerHour / gallonsPerHour;
    }

    /**
     * Calculate overall engine health score
     */
    calculateHealthScore() {
        const wearScore = (1 - this.state.wear) * 100;
        const tempScore = this.state.temperature <= 100 ? 100 : Math.max(0, 100 - (this.state.temperature - 100) * 2);
        const oilScore = this.state.oilPressure >= 2 ? 100 : (this.state.oilPressure / 2) * 100;
        
        return Math.round((wearScore + tempScore + oilScore) / 3);
    }

    /**
     * Check maintenance needs
     */
    checkMaintenanceNeeds() {
        const needs = [];
        
        if (this.state.wear > 0.7) {
            needs.push('Engine rebuild required');
        } else if (this.state.wear > 0.4) {
            needs.push('Major service recommended');
        } else if (this.state.wear > 0.2) {
            needs.push('Regular maintenance due');
        }
        
        if (this.state.oilPressure < 1.5) {
            needs.push('Check oil level and pressure');
        }
        
        return needs;
    }

    /**
     * Get engine warnings
     */
    getWarnings() {
        const warnings = [];
        
        if (this.state.temperature > this.characteristics.maxTemperature) {
            warnings.push({ type: 'critical', message: 'Engine overheating!' });
        } else if (this.state.temperature > 105) {
            warnings.push({ type: 'warning', message: 'High engine temperature' });
        }
        
        if (this.state.oilPressure < 1) {
            warnings.push({ type: 'critical', message: 'Low oil pressure!' });
        } else if (this.state.oilPressure < 2) {
            warnings.push({ type: 'warning', message: 'Oil pressure low' });
        }
        
        if (this.state.rpm > this.config.maxRPM) {
            warnings.push({ type: 'critical', message: 'Engine over-revving!' });
        }
        
        return warnings;
    }

    /**
     * Dispose of the engine simulator
     */
    dispose() {
        this.removeAllListeners();
    }
}

export default EngineSimulator;