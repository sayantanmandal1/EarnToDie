/**
 * Advanced Transmission Simulator
 * Realistic transmission simulation with gear ratios, clutch, and shift logic
 */

import { EventEmitter } from 'events';

export class TransmissionSimulator extends EventEmitter {
    constructor(transmissionConfig, options = {}) {
        super();
        
        this.config = {
            // Transmission type
            type: transmissionConfig.type || 'manual', // manual, automatic, cvt, dual_clutch
            
            // Gear ratios (including reverse and final drive)
            gearRatios: transmissionConfig.gearRatios || [
                -3.5,  // Reverse
                0,     // Neutral
                3.5,   // 1st gear
                2.1,   // 2nd gear
                1.4,   // 3rd gear
                1.0,   // 4th gear
                0.8,   // 5th gear
                0.65   // 6th gear
            ],
            
            finalDriveRatio: transmissionConfig.finalDriveRatio || 3.73,
            
            // Shift characteristics
            shiftTime: transmissionConfig.shiftTime || 0.3, // seconds
            clutchEngageTime: transmissionConfig.clutchEngageTime || 0.2,
            
            // Automatic transmission settings
            shiftPoints: transmissionConfig.shiftPoints || {
                upshift: [2500, 3000, 3500, 4000, 4500], // RPM points for upshifts
                downshift: [1500, 2000, 2500, 3000, 3500] // RPM points for downshifts
            },
            
            // CVT settings
            cvtRatioRange: transmissionConfig.cvtRatioRange || { min: 0.5, max: 3.5 },
            
            ...transmissionConfig
        };
        
        this.options = {
            enableRealisticShifting: options.enableRealisticShifting !== false,
            enableClutchSimulation: options.enableClutchSimulation !== false,
            enableTorqueConverter: options.enableTorqueConverter !== false,
            enableShiftLogic: options.enableShiftLogic !== false,
            ...options
        };
        
        // Transmission state
        this.state = {
            currentGear: 0, // 0 = neutral, -1 = reverse, 1+ = forward gears
            targetGear: 0,
            isShifting: false,
            shiftProgress: 0,
            clutchPosition: 1.0, // 0 = fully disengaged, 1 = fully engaged
            
            // Automatic transmission state
            shiftMode: 'D', // P, R, N, D, S, M
            kickdownActive: false,
            
            // CVT state
            cvtRatio: 1.0,
            
            // Performance metrics
            shiftCount: 0,
            lastShiftTime: 0,
            temperature: 80 // Celsius
        };
        
        // Shift logic
        this.shiftLogic = {
            autoShiftEnabled: this.config.type === 'automatic',
            shiftDelay: 0,
            lastShiftRPM: 0,
            adaptiveShifting: true
        };
        
        // Initialize transmission
        this.initialize();
    }

    /**
     * Initialize transmission system
     */
    initialize() {
        // Set initial gear based on transmission type
        if (this.config.type === 'automatic') {
            this.state.currentGear = 1; // Start in 1st gear
            this.state.shiftMode = 'D';
        } else {
            this.state.currentGear = 0; // Start in neutral
        }
        
        this.emit('initialized', {
            type: this.config.type,
            gearCount: this.config.gearRatios.length - 2, // Exclude reverse and neutral
            currentGear: this.state.currentGear
        });
    }

    /**
     * Update transmission simulation
     */
    update(deltaTime, engineRPM, throttlePosition, brakePosition, vehicleSpeed) {
        // Update shift logic
        this.updateShiftLogic(engineRPM, throttlePosition, vehicleSpeed);
        
        // Update shifting process
        this.updateShifting(deltaTime);
        
        // Update clutch simulation
        this.updateClutch(deltaTime, engineRPM);
        
        // Update CVT ratio if applicable
        if (this.config.type === 'cvt') {
            this.updateCVTRatio(engineRPM, throttlePosition, vehicleSpeed);
        }
        
        // Update temperature
        this.updateTemperature(deltaTime, engineRPM, vehicleSpeed);
        
        // Calculate output
        const output = this.calculateOutput(engineRPM, throttlePosition);
        
        this.emit('updated', {
            currentGear: this.state.currentGear,
            clutchPosition: this.state.clutchPosition,
            isShifting: this.state.isShifting,
            outputTorque: output.torque,
            outputRPM: output.rpm,
            temperature: this.state.temperature
        });
        
        return output;
    }

    /**
     * Update shift logic
     */
    updateShiftLogic(engineRPM, throttlePosition, vehicleSpeed) {
        if (!this.shiftLogic.autoShiftEnabled || this.state.isShifting) {
            return;
        }
        
        const currentGear = this.state.currentGear;
        const maxGear = this.config.gearRatios.length - 2; // Exclude reverse and neutral
        
        // Upshift logic
        if (currentGear > 0 && currentGear < maxGear) {
            const upshiftRPM = this.getUpshiftRPM(currentGear, throttlePosition);
            if (engineRPM > upshiftRPM) {
                this.requestShift(currentGear + 1);
            }
        }
        
        // Downshift logic
        if (currentGear > 1) {
            const downshiftRPM = this.getDownshiftRPM(currentGear, throttlePosition);
            if (engineRPM < downshiftRPM || this.shouldKickdown(throttlePosition, vehicleSpeed)) {
                this.requestShift(currentGear - 1);
            }
        }
    }

    /**
     * Get upshift RPM based on gear and throttle position
     */
    getUpshiftRPM(gear, throttlePosition) {
        const baseRPM = this.config.shiftPoints.upshift[gear - 1] || 3000;
        
        // Adjust based on throttle position
        const throttleMultiplier = 1 + (throttlePosition * 0.5); // Up to 50% higher RPM under full throttle
        
        return baseRPM * throttleMultiplier;
    }

    /**
     * Get downshift RPM based on gear and throttle position
     */
    getDownshiftRPM(gear, throttlePosition) {
        const baseRPM = this.config.shiftPoints.downshift[gear - 2] || 1500;
        
        // Adjust based on throttle position
        const throttleMultiplier = 0.8 + (throttlePosition * 0.4); // Lower RPM under light throttle
        
        return baseRPM * throttleMultiplier;
    }

    /**
     * Check if kickdown should occur
     */
    shouldKickdown(throttlePosition, vehicleSpeed) {
        // Kickdown occurs under heavy throttle at moderate speeds
        return throttlePosition > 0.8 && vehicleSpeed > 30 && vehicleSpeed < 100;
    }

    /**
     * Request gear shift
     */
    requestShift(targetGear) {
        if (this.state.isShifting || targetGear === this.state.currentGear) {
            return false;
        }
        
        const maxGear = this.config.gearRatios.length - 2;
        if (targetGear < -1 || targetGear > maxGear) {
            return false;
        }
        
        this.state.targetGear = targetGear;
        this.state.isShifting = true;
        this.state.shiftProgress = 0;
        this.state.lastShiftTime = Date.now();
        
        this.emit('shiftStarted', {
            fromGear: this.state.currentGear,
            toGear: targetGear,
            shiftTime: this.config.shiftTime
        });
        
        return true;
    }

    /**
     * Update shifting process
     */
    updateShifting(deltaTime) {
        if (!this.state.isShifting) {
            return;
        }
        
        this.state.shiftProgress += deltaTime / this.config.shiftTime;
        
        // Update clutch during shift
        if (this.options.enableClutchSimulation) {
            // Disengage clutch during first half of shift
            if (this.state.shiftProgress < 0.5) {
                this.state.clutchPosition = 1.0 - (this.state.shiftProgress * 2);
            } else {
                // Re-engage clutch during second half
                this.state.clutchPosition = (this.state.shiftProgress - 0.5) * 2;
            }
        }
        
        // Complete shift
        if (this.state.shiftProgress >= 1.0) {
            this.completeShift();
        }
    }

    /**
     * Complete gear shift
     */
    completeShift() {
        this.state.currentGear = this.state.targetGear;
        this.state.isShifting = false;
        this.state.shiftProgress = 0;
        this.state.clutchPosition = 1.0;
        this.state.shiftCount++;
        
        this.emit('shiftCompleted', {
            newGear: this.state.currentGear,
            shiftCount: this.state.shiftCount
        });
    }

    /**
     * Update clutch simulation
     */
    updateClutch(deltaTime, engineRPM) {
        if (!this.options.enableClutchSimulation || this.state.isShifting) {
            return;
        }
        
        // Simulate clutch engagement based on RPM and load
        const targetClutchPosition = this.calculateClutchPosition(engineRPM);
        
        // Smooth clutch engagement
        const clutchSpeed = 5.0; // Engagement speed
        const clutchDelta = (targetClutchPosition - this.state.clutchPosition) * clutchSpeed * deltaTime;
        this.state.clutchPosition = Math.max(0, Math.min(1, this.state.clutchPosition + clutchDelta));
    }

    /**
     * Calculate ideal clutch position
     */
    calculateClutchPosition(engineRPM) {
        // Full engagement above idle RPM
        if (engineRPM > this.config.idleRPM * 1.2) {
            return 1.0;
        }
        
        // Partial engagement near idle
        if (engineRPM > this.config.idleRPM * 0.8) {
            return (engineRPM - this.config.idleRPM * 0.8) / (this.config.idleRPM * 0.4);
        }
        
        // Disengaged below idle
        return 0.0;
    }

    /**
     * Update CVT ratio
     */
    updateCVTRatio(engineRPM, throttlePosition, vehicleSpeed) {
        if (this.config.type !== 'cvt') {
            return;
        }
        
        // Target RPM based on throttle position
        const targetRPM = this.config.idleRPM + (this.config.maxRPM - this.config.idleRPM) * throttlePosition * 0.7;
        
        // Calculate required ratio to maintain target RPM
        const wheelRPM = vehicleSpeed * 60 / (Math.PI * 0.65); // Assuming 0.65m wheel radius
        const requiredRatio = targetRPM / Math.max(wheelRPM, 1);
        
        // Clamp to CVT range
        const targetRatio = Math.max(
            this.config.cvtRatioRange.min,
            Math.min(this.config.cvtRatioRange.max, requiredRatio)
        );
        
        // Smooth ratio change
        const ratioSpeed = 2.0;
        const ratioDelta = (targetRatio - this.state.cvtRatio) * ratioSpeed * (1/60); // Assuming 60 FPS
        this.state.cvtRatio = Math.max(
            this.config.cvtRatioRange.min,
            Math.min(this.config.cvtRatioRange.max, this.state.cvtRatio + ratioDelta)
        );
    }

    /**
     * Update transmission temperature
     */
    updateTemperature(deltaTime, engineRPM, vehicleSpeed) {
        const ambientTemp = 25; // Celsius
        const maxTemp = 120;
        
        // Heat generation based on load and shifting
        let heatGeneration = 0;
        
        // Base heat from operation
        heatGeneration += (engineRPM / this.config.maxRPM) * 10;
        
        // Additional heat from shifting
        if (this.state.isShifting) {
            heatGeneration += 20;
        }
        
        // Heat from clutch slip
        if (this.state.clutchPosition < 1.0) {
            heatGeneration += (1.0 - this.state.clutchPosition) * 15;
        }
        
        // Cooling based on vehicle speed (airflow)
        const cooling = Math.min(vehicleSpeed * 0.1, 15);
        
        // Temperature change
        const tempChange = (heatGeneration - cooling - (this.state.temperature - ambientTemp) * 0.1) * deltaTime;
        this.state.temperature = Math.max(ambientTemp, Math.min(maxTemp, this.state.temperature + tempChange));
    }

    /**
     * Calculate transmission output
     */
    calculateOutput(engineRPM, throttlePosition) {
        let gearRatio = 0;
        let efficiency = 0.95; // Base transmission efficiency
        
        // Get gear ratio
        if (this.config.type === 'cvt') {
            gearRatio = this.state.cvtRatio;
        } else {
            const gearIndex = this.state.currentGear + 1; // Adjust for array indexing
            if (gearIndex >= 0 && gearIndex < this.config.gearRatios.length) {
                gearRatio = this.config.gearRatios[gearIndex];
            }
        }
        
        // Apply final drive ratio
        const totalRatio = gearRatio * this.config.finalDriveRatio;
        
        // Reduce efficiency during shifts
        if (this.state.isShifting) {
            efficiency *= 0.5;
        }
        
        // Reduce efficiency with clutch slip
        if (this.options.enableClutchSimulation) {
            efficiency *= this.state.clutchPosition;
        }
        
        // Calculate output RPM and torque
        const outputRPM = Math.abs(totalRatio) > 0.001 ? engineRPM / totalRatio : 0;
        const outputTorque = engineRPM * totalRatio * efficiency;
        
        return {
            rpm: outputRPM,
            torque: outputTorque,
            ratio: totalRatio,
            efficiency: efficiency
        };
    }

    /**
     * Manual shift control
     */
    shiftUp() {
        if (this.config.type === 'manual' || this.state.shiftMode === 'M') {
            const maxGear = this.config.gearRatios.length - 2;
            if (this.state.currentGear < maxGear) {
                return this.requestShift(this.state.currentGear + 1);
            }
        }
        return false;
    }

    shiftDown() {
        if (this.config.type === 'manual' || this.state.shiftMode === 'M') {
            if (this.state.currentGear > 1) {
                return this.requestShift(this.state.currentGear - 1);
            }
        }
        return false;
    }

    /**
     * Set shift mode (for automatic transmissions)
     */
    setShiftMode(mode) {
        const validModes = ['P', 'R', 'N', 'D', 'S', 'M'];
        if (!validModes.includes(mode)) {
            return false;
        }
        
        this.state.shiftMode = mode;
        
        // Update shift logic
        switch (mode) {
            case 'P': // Park
                this.state.currentGear = 0;
                this.shiftLogic.autoShiftEnabled = false;
                break;
            case 'R': // Reverse
                this.state.currentGear = -1;
                this.shiftLogic.autoShiftEnabled = false;
                break;
            case 'N': // Neutral
                this.state.currentGear = 0;
                this.shiftLogic.autoShiftEnabled = false;
                break;
            case 'D': // Drive
                if (this.state.currentGear <= 0) {
                    this.state.currentGear = 1;
                }
                this.shiftLogic.autoShiftEnabled = true;
                break;
            case 'S': // Sport
                if (this.state.currentGear <= 0) {
                    this.state.currentGear = 1;
                }
                this.shiftLogic.autoShiftEnabled = true;
                // Modify shift points for sportier driving
                break;
            case 'M': // Manual
                this.shiftLogic.autoShiftEnabled = false;
                break;
        }
        
        this.emit('shiftModeChanged', { mode, currentGear: this.state.currentGear });
        return true;
    }

    /**
     * Get current transmission state
     */
    getState() {
        return {
            ...this.state,
            gearRatio: this.getCurrentGearRatio(),
            totalRatio: this.getCurrentGearRatio() * this.config.finalDriveRatio
        };
    }

    /**
     * Get current gear ratio
     */
    getCurrentGearRatio() {
        if (this.config.type === 'cvt') {
            return this.state.cvtRatio;
        }
        
        const gearIndex = this.state.currentGear + 1;
        if (gearIndex >= 0 && gearIndex < this.config.gearRatios.length) {
            return this.config.gearRatios[gearIndex];
        }
        
        return 0;
    }

    /**
     * Get transmission info
     */
    getInfo() {
        return {
            type: this.config.type,
            gearCount: this.config.gearRatios.length - 2,
            currentGear: this.state.currentGear,
            shiftMode: this.state.shiftMode,
            isShifting: this.state.isShifting,
            temperature: this.state.temperature,
            shiftCount: this.state.shiftCount
        };
    }

    /**
     * Reset transmission to initial state
     */
    reset() {
        this.state.currentGear = this.config.type === 'automatic' ? 1 : 0;
        this.state.targetGear = this.state.currentGear;
        this.state.isShifting = false;
        this.state.shiftProgress = 0;
        this.state.clutchPosition = 1.0;
        this.state.shiftMode = this.config.type === 'automatic' ? 'D' : 'N';
        this.state.cvtRatio = 1.0;
        this.state.temperature = 80;
        this.state.shiftCount = 0;
        
        this.emit('reset');
    }

    /**
     * Dispose of transmission simulator
     */
    dispose() {
        this.removeAllListeners();
    }