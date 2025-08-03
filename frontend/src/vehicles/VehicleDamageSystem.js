/**
 * Comprehensive Vehicle Damage System
 * Realistic damage simulation with visual effects and performance degradation
 */

import { EventEmitter } from 'events';
import { electronIntegration } from '../electron/ElectronIntegration.js';

export class VehicleDamageSystem extends EventEmitter {
    constructor(vehicleConfig, options = {}) {
        super();
        
        this.vehicleConfig = vehicleConfig;
        this.options = {
            // Damage simulation settings
            enableVisualDamage: options.enableVisualDamage !== false,
            enablePerformanceDegradation: options.enablePerformanceDegradation !== false,
            enableComponentDamage: options.enableComponentDamage !== false,
            enableRepairSystem: options.enableRepairSystem !== false,
            
            // Damage sensitivity
            damageSensitivity: options.damageSensitivity || 1.0,
            impactThreshold: options.impactThreshold || 5.0, // m/s
            
            // Visual damage settings
            maxDeformationLevel: options.maxDeformationLevel || 10,
            particleEffectsEnabled: options.particleEffectsEnabled !== false,
            
            // Performance settings
            maxPerformanceLoss: options.maxPerformanceLoss || 0.7, // 70% max loss
            
            ...options
        };
        
        // Vehicle components that can be damaged
        this.components = {
            engine: {
                health: 100,
                maxHealth: 100,
                damageThreshold: 15.0,
                repairCost: 500,
                performanceImpact: 0.8, // 80% impact on performance
                criticalThreshold: 20, // Below 20% health is critical
                damageTypes: ['collision', 'overheating', 'wear']
            },
            transmission: {
                health: 100,
                maxHealth: 100,
                damageThreshold: 12.0,
                repairCost: 300,
                performanceImpact: 0.6,
                criticalThreshold: 25,
                damageTypes: ['collision', 'overuse', 'wear']
            },
            suspension: {
                health: [100, 100, 100, 100], // FL, FR, RL, RR
                maxHealth: 100,
                damageThreshold: 8.0,
                repairCost: 150,
                performanceImpact: 0.4,
                criticalThreshold: 30,
                damageTypes: ['collision', 'impact', 'wear']
            },
            tires: {
                health: [100, 100, 100, 100], // FL, FR, RL, RR
                maxHealth: 100,
                damageThreshold: 5.0,
                repairCost: 80,
                performanceImpact: 0.9,
                criticalThreshold: 15,
                damageTypes: ['puncture', 'wear', 'impact', 'overheating']
            },
            body: {
                health: 100,
                maxHealth: 100,
                damageThreshold: 10.0,
                repairCost: 200,
                performanceImpact: 0.2, // Mainly aerodynamic impact
                criticalThreshold: 40,
                damageTypes: ['collision', 'impact']
            },
            brakes: {
                health: [100, 100, 100, 100], // FL, FR, RL, RR
                maxHealth: 100,
                damageThreshold: 6.0,
                repairCost: 120,
                performanceImpact: 0.7,
                criticalThreshold: 25,
                damageTypes: ['overheating', 'wear', 'impact']
            },
            fuel_system: {
                health: 100,
                maxHealth: 100,
                damageThreshold: 8.0,
                repairCost: 250,
                performanceImpact: 0.5,
                criticalThreshold: 30,
                damageTypes: ['collision', 'puncture']
            },
            electrical: {
                health: 100,
                maxHealth: 100,
                damageThreshold: 7.0,
                repairCost: 180,
                performanceImpact: 0.3,
                criticalThreshold: 35,
                damageTypes: ['collision', 'water', 'overheating']
            }
        };
        
        // Visual damage state
        this.visualDamage = {
            deformation: {
                front: 0,    // 0-10 scale
                rear: 0,
                left: 0,
                right: 0,
                roof: 0,
                undercarriage: 0
            },
            scratches: {
                front: 0,
                rear: 0,
                left: 0,
                right: 0,
                roof: 0
            },
            brokenParts: {
                headlights: [false, false], // Left, Right
                taillights: [false, false],
                windows: [false, false, false, false, false, false], // Front, Rear, FL, FR, RL, RR
                mirrors: [false, false], // Left, Right
                bumpers: [false, false] // Front, Rear
            },
            fluids: {
                oil: false,
                coolant: false,
                fuel: false,
                brake_fluid: false
            }
        };
        
        // Performance modifiers based on damage
        this.performanceModifiers = {
            maxSpeed: 1.0,
            acceleration: 1.0,
            braking: 1.0,
            handling: 1.0,
            fuelEfficiency: 1.0,
            reliability: 1.0
        };
        
        // Damage history for analytics
        this.damageHistory = [];
        
        // Repair system
        this.repairSystem = {
            availableRepairs: ['engine', 'transmission', 'suspension', 'tires', 'body', 'brakes'],
            repairTime: {
                engine: 30000,      // 30 seconds
                transmission: 20000, // 20 seconds
                suspension: 15000,   // 15 seconds per wheel
                tires: 5000,        // 5 seconds per tire
                body: 25000,        // 25 seconds
                brakes: 10000       // 10 seconds per wheel
            },
            currentRepair: null,
            repairProgress: 0
        };
        
        this.logger = electronIntegration.getLogger();
        
        // Initialize damage system
        this.initialize();
    }

    /**
     * Initialize damage system
     */
    initialize() {
        // Calculate initial performance modifiers
        this.updatePerformanceModifiers();
        
        this.emit('initialized', {
            components: Object.keys(this.components),
            repairOptions: this.repairSystem.availableRepairs
        });
        
        this.logger.info('Vehicle Damage System initialized', {
            components: Object.keys(this.components).length,
            options: this.options
        });
    }

    /**
     * Apply damage from collision
     */
    applyCollisionDamage(impactData) {
        const { velocity, direction, impactPoint, severity } = impactData;
        
        // Calculate impact force
        const impactForce = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
        
        if (impactForce < this.options.impactThreshold) {
            return; // Impact too weak to cause damage
        }
        
        // Determine affected components based on impact point and direction
        const affectedComponents = this.determineAffectedComponents(direction, impactPoint);
        
        // Apply damage to components
        affectedComponents.forEach(({ component, factor }) => {
            this.damageComponent(component, impactForce * factor * severity, 'collision');
        });
        
        // Apply visual damage
        if (this.options.enableVisualDamage) {
            this.applyVisualDamage(direction, impactForce * severity);
        }
        
        // Record damage event
        this.recordDamageEvent('collision', {
            impactForce,
            direction,
            impactPoint,
            affectedComponents: affectedComponents.map(c => c.component)
        });
        
        this.emit('collisionDamage', {
            impactForce,
            affectedComponents,
            totalDamage: this.getTotalDamagePercentage()
        });
    }

    /**
     * Determine which components are affected by impact
     */
    determineAffectedComponents(direction, impactPoint) {
        const affected = [];
        
        // Front impact
        if (direction.z > 0.5) {
            affected.push(
                { component: 'engine', factor: 0.8 },
                { component: 'body', factor: 1.0 },
                { component: 'suspension', factor: 0.6 },
                { component: 'fuel_system', factor: 0.3 }
            );
        }
        
        // Rear impact
        if (direction.z < -0.5) {
            affected.push(
                { component: 'fuel_system', factor: 0.9 },
                { component: 'body', factor: 1.0 },
                { component: 'transmission', factor: 0.4 },
                { component: 'electrical', factor: 0.5 }
            );
        }
        
        // Side impact
        if (Math.abs(direction.x) > 0.5) {
            affected.push(
                { component: 'body', factor: 1.0 },
                { component: 'suspension', factor: 0.7 },
                { component: 'electrical', factor: 0.4 }
            );
        }
        
        // Undercarriage impact
        if (direction.y < -0.3) {
            affected.push(
                { component: 'engine', factor: 0.5 },
                { component: 'transmission', factor: 0.6 },
                { component: 'fuel_system', factor: 0.7 },
                { component: 'suspension', factor: 0.9 }
            );
        }
        
        return affected;
    }

    /**
     * Damage a specific component
     */
    damageComponent(componentName, damageAmount, damageType) {
        const component = this.components[componentName];
        if (!component) return;
        
        // Check if component can be damaged by this type
        if (!component.damageTypes.includes(damageType)) {
            damageAmount *= 0.5; // Reduced damage for non-applicable damage types
        }
        
        // Apply damage sensitivity
        damageAmount *= this.options.damageSensitivity;
        
        // Apply damage based on component type
        if (Array.isArray(component.health)) {
            // Multi-part component (tires, suspension, brakes)
            component.health.forEach((health, index) => {
                const newHealth = Math.max(0, health - damageAmount / 4);
                component.health[index] = newHealth;
            });
        } else {
            // Single component
            component.health = Math.max(0, component.health - damageAmount);
        }
        
        // Check for critical damage
        if (this.isComponentCritical(componentName)) {
            this.emit('criticalDamage', {
                component: componentName,
                health: component.health,
                damageType
            });
        }
        
        // Update performance modifiers
        this.updatePerformanceModifiers();
        
        this.emit('componentDamaged', {
            component: componentName,
            damage: damageAmount,
            health: component.health,
            damageType
        });
    }

    /**
     * Check if component is in critical condition
     */
    isComponentCritical(componentName) {
        const component = this.components[componentName];
        if (!component) return false;
        
        if (Array.isArray(component.health)) {
            return component.health.some(health => 
                (health / component.maxHealth) * 100 < component.criticalThreshold
            );
        } else {
            return (component.health / component.maxHealth) * 100 < component.criticalThreshold;
        }
    }

    /**
     * Apply visual damage
     */
    applyVisualDamage(direction, severity) {
        const damageAmount = Math.min(severity / 10, this.options.maxDeformationLevel);
        
        // Apply deformation based on impact direction
        if (direction.z > 0.5) { // Front impact
            this.visualDamage.deformation.front = Math.min(
                this.options.maxDeformationLevel,
                this.visualDamage.deformation.front + damageAmount
            );
            
            // Chance to break headlights
            if (Math.random() < severity / 20) {
                this.visualDamage.brokenParts.headlights[Math.floor(Math.random() * 2)] = true;
            }
        }
        
        if (direction.z < -0.5) { // Rear impact
            this.visualDamage.deformation.rear = Math.min(
                this.options.maxDeformationLevel,
                this.visualDamage.deformation.rear + damageAmount
            );
            
            // Chance to break taillights
            if (Math.random() < severity / 20) {
                this.visualDamage.brokenParts.taillights[Math.floor(Math.random() * 2)] = true;
            }
        }
        
        if (direction.x > 0.5) { // Right side impact
            this.visualDamage.deformation.right = Math.min(
                this.options.maxDeformationLevel,
                this.visualDamage.deformation.right + damageAmount
            );
        }
        
        if (direction.x < -0.5) { // Left side impact
            this.visualDamage.deformation.left = Math.min(
                this.options.maxDeformationLevel,
                this.visualDamage.deformation.left + damageAmount
            );
        }
        
        // Add scratches
        const scratchAmount = damageAmount * 0.5;
        Object.keys(this.visualDamage.scratches).forEach(area => {
            this.visualDamage.scratches[area] = Math.min(
                this.options.maxDeformationLevel,
                this.visualDamage.scratches[area] + scratchAmount * Math.random()
            );
        });
        
        // Fluid leaks based on component damage
        if (this.components.engine.health < 50) {
            this.visualDamage.fluids.oil = true;
            this.visualDamage.fluids.coolant = Math.random() < 0.3;
        }
        
        if (this.components.fuel_system.health < 60) {
            this.visualDamage.fluids.fuel = Math.random() < 0.4;
        }
        
        if (this.components.brakes.health.some(h => h < 40)) {
            this.visualDamage.fluids.brake_fluid = Math.random() < 0.2;
        }
        
        this.emit('visualDamageApplied', {
            deformation: { ...this.visualDamage.deformation },
            brokenParts: { ...this.visualDamage.brokenParts },
            fluids: { ...this.visualDamage.fluids }
        });
    }

    /**
     * Update performance modifiers based on component health
     */
    updatePerformanceModifiers() {
        if (!this.options.enablePerformanceDegradation) {
            return;
        }
        
        // Reset modifiers
        this.performanceModifiers = {
            maxSpeed: 1.0,
            acceleration: 1.0,
            braking: 1.0,
            handling: 1.0,
            fuelEfficiency: 1.0,
            reliability: 1.0
        };
        
        // Engine damage affects acceleration and max speed
        const engineHealth = this.components.engine.health / this.components.engine.maxHealth;
        this.performanceModifiers.acceleration *= 0.3 + (engineHealth * 0.7);
        this.performanceModifiers.maxSpeed *= 0.4 + (engineHealth * 0.6);
        this.performanceModifiers.fuelEfficiency *= 0.5 + (engineHealth * 0.5);
        
        // Transmission damage affects acceleration and shifting
        const transmissionHealth = this.components.transmission.health / this.components.transmission.maxHealth;
        this.performanceModifiers.acceleration *= 0.5 + (transmissionHealth * 0.5);
        
        // Suspension damage affects handling
        const avgSuspensionHealth = this.components.suspension.health.reduce((a, b) => a + b, 0) / 
                                   (4 * this.components.suspension.maxHealth);
        this.performanceModifiers.handling *= 0.2 + (avgSuspensionHealth * 0.8);
        
        // Tire damage affects all aspects
        const avgTireHealth = this.components.tires.health.reduce((a, b) => a + b, 0) / 
                             (4 * this.components.tires.maxHealth);
        this.performanceModifiers.acceleration *= 0.4 + (avgTireHealth * 0.6);
        this.performanceModifiers.braking *= 0.3 + (avgTireHealth * 0.7);
        this.performanceModifiers.handling *= 0.3 + (avgTireHealth * 0.7);
        this.performanceModifiers.maxSpeed *= 0.6 + (avgTireHealth * 0.4);
        
        // Brake damage affects braking
        const avgBrakeHealth = this.components.brakes.health.reduce((a, b) => a + b, 0) / 
                              (4 * this.components.brakes.maxHealth);
        this.performanceModifiers.braking *= 0.2 + (avgBrakeHealth * 0.8);
        
        // Body damage affects aerodynamics (max speed)
        const bodyHealth = this.components.body.health / this.components.body.maxHealth;
        this.performanceModifiers.maxSpeed *= 0.8 + (bodyHealth * 0.2);
        
        // Fuel system damage affects fuel efficiency and reliability
        const fuelHealth = this.components.fuel_system.health / this.components.fuel_system.maxHealth;
        this.performanceModifiers.fuelEfficiency *= 0.4 + (fuelHealth * 0.6);
        this.performanceModifiers.reliability *= 0.5 + (fuelHealth * 0.5);
        
        // Electrical damage affects reliability
        const electricalHealth = this.components.electrical.health / this.components.electrical.maxHealth;
        this.performanceModifiers.reliability *= 0.6 + (electricalHealth * 0.4);
        
        // Apply maximum performance loss limit
        Object.keys(this.performanceModifiers).forEach(key => {
            this.performanceModifiers[key] = Math.max(
                1.0 - this.options.maxPerformanceLoss,
                this.performanceModifiers[key]
            );
        });
        
        this.emit('performanceUpdated', { ...this.performanceModifiers });
    }   
 /**
     * Apply wear damage over time
     */
    applyWearDamage(deltaTime, usage) {
        const wearRate = 0.001 * deltaTime; // Base wear rate per second
        
        // Engine wear based on RPM and temperature
        if (usage.engineRPM > 0) {
            const engineWear = wearRate * (usage.engineRPM / 6000) * (usage.engineTemp / 100);
            this.damageComponent('engine', engineWear, 'wear');
        }
        
        // Transmission wear based on shifting and load
        if (usage.isShifting || usage.transmissionLoad > 0.8) {
            const transmissionWear = wearRate * (usage.transmissionLoad || 0.5);
            this.damageComponent('transmission', transmissionWear, 'wear');
        }
        
        // Tire wear based on slip and speed
        if (usage.tireSlip && usage.speed > 0) {
            const tireWear = wearRate * usage.tireSlip * (usage.speed / 100);
            this.damageComponent('tires', tireWear, 'wear');
        }
        
        // Brake wear based on braking intensity
        if (usage.brakeIntensity > 0) {
            const brakeWear = wearRate * usage.brakeIntensity * 2;
            this.damageComponent('brakes', brakeWear, 'wear');
        }
        
        // Suspension wear based on road conditions and speed
        if (usage.roadRoughness > 0 && usage.speed > 0) {
            const suspensionWear = wearRate * usage.roadRoughness * (usage.speed / 80);
            this.damageComponent('suspension', suspensionWear, 'wear');
        }
    }

    /**
     * Apply overheating damage
     */
    applyOverheatingDamage(temperature, deltaTime) {
        const criticalTemp = 110; // Celsius
        
        if (temperature > criticalTemp) {
            const overheatingDamage = (temperature - criticalTemp) * 0.01 * deltaTime;
            this.damageComponent('engine', overheatingDamage, 'overheating');
            
            // Chance of additional electrical damage
            if (Math.random() < 0.1 * deltaTime) {
                this.damageComponent('electrical', overheatingDamage * 0.5, 'overheating');
            }
        }
    }

    /**
     * Start repair process
     */
    startRepair(componentName, repairType = 'full') {
        if (!this.options.enableRepairSystem) {
            return false;
        }
        
        if (this.repairSystem.currentRepair) {
            return false; // Already repairing something
        }
        
        const component = this.components[componentName];
        if (!component) {
            return false;
        }
        
        // Check if repair is needed
        if (Array.isArray(component.health)) {
            if (component.health.every(h => h >= component.maxHealth)) {
                return false; // No repair needed
            }
        } else {
            if (component.health >= component.maxHealth) {
                return false; // No repair needed
            }
        }
        
        this.repairSystem.currentRepair = {
            component: componentName,
            type: repairType,
            startTime: Date.now(),
            duration: this.repairSystem.repairTime[componentName] || 10000,
            cost: component.repairCost
        };
        
        this.repairSystem.repairProgress = 0;
        
        this.emit('repairStarted', {
            component: componentName,
            type: repairType,
            duration: this.repairSystem.currentRepair.duration,
            cost: this.repairSystem.currentRepair.cost
        });
        
        return true;
    }

    /**
     * Update repair progress
     */
    updateRepair(deltaTime) {
        if (!this.repairSystem.currentRepair) {
            return;
        }
        
        const repair = this.repairSystem.currentRepair;
        const elapsed = Date.now() - repair.startTime;
        this.repairSystem.repairProgress = Math.min(1.0, elapsed / repair.duration);
        
        // Complete repair
        if (this.repairSystem.repairProgress >= 1.0) {
            this.completeRepair();
        }
        
        this.emit('repairProgress', {
            component: repair.component,
            progress: this.repairSystem.repairProgress
        });
    }

    /**
     * Complete repair process
     */
    completeRepair() {
        if (!this.repairSystem.currentRepair) {
            return;
        }
        
        const repair = this.repairSystem.currentRepair;
        const component = this.components[repair.component];
        
        // Restore component health
        if (Array.isArray(component.health)) {
            component.health = component.health.map(() => component.maxHealth);
        } else {
            component.health = component.maxHealth;
        }
        
        // Clear some visual damage if body repair
        if (repair.component === 'body') {
            this.visualDamage.deformation = {
                front: Math.max(0, this.visualDamage.deformation.front - 5),
                rear: Math.max(0, this.visualDamage.deformation.rear - 5),
                left: Math.max(0, this.visualDamage.deformation.left - 5),
                right: Math.max(0, this.visualDamage.deformation.right - 5),
                roof: Math.max(0, this.visualDamage.deformation.roof - 5),
                undercarriage: Math.max(0, this.visualDamage.deformation.undercarriage - 5)
            };
            
            this.visualDamage.scratches = {
                front: 0, rear: 0, left: 0, right: 0, roof: 0
            };
        }
        
        // Clear fluid leaks for relevant repairs
        if (repair.component === 'engine') {
            this.visualDamage.fluids.oil = false;
            this.visualDamage.fluids.coolant = false;
        } else if (repair.component === 'fuel_system') {
            this.visualDamage.fluids.fuel = false;
        } else if (repair.component === 'brakes') {
            this.visualDamage.fluids.brake_fluid = false;
        }
        
        // Update performance modifiers
        this.updatePerformanceModifiers();
        
        this.emit('repairCompleted', {
            component: repair.component,
            cost: repair.cost,
            newHealth: component.health
        });
        
        this.repairSystem.currentRepair = null;
        this.repairSystem.repairProgress = 0;
    }

    /**
     * Cancel current repair
     */
    cancelRepair() {
        if (!this.repairSystem.currentRepair) {
            return false;
        }
        
        const repair = this.repairSystem.currentRepair;
        
        this.emit('repairCancelled', {
            component: repair.component,
            progress: this.repairSystem.repairProgress
        });
        
        this.repairSystem.currentRepair = null;
        this.repairSystem.repairProgress = 0;
        
        return true;
    }

    /**
     * Get repair estimate for component
     */
    getRepairEstimate(componentName) {
        const component = this.components[componentName];
        if (!component) {
            return null;
        }
        
        let damagePercentage;
        if (Array.isArray(component.health)) {
            const avgHealth = component.health.reduce((a, b) => a + b, 0) / component.health.length;
            damagePercentage = 1 - (avgHealth / component.maxHealth);
        } else {
            damagePercentage = 1 - (component.health / component.maxHealth);
        }
        
        return {
            component: componentName,
            damagePercentage: damagePercentage * 100,
            repairCost: Math.ceil(component.repairCost * damagePercentage),
            repairTime: Math.ceil(this.repairSystem.repairTime[componentName] * damagePercentage),
            priority: this.getRepairPriority(componentName),
            isCritical: this.isComponentCritical(componentName)
        };
    }

    /**
     * Get repair priority for component
     */
    getRepairPriority(componentName) {
        const component = this.components[componentName];
        if (!component) return 0;
        
        let healthPercentage;
        if (Array.isArray(component.health)) {
            const avgHealth = component.health.reduce((a, b) => a + b, 0) / component.health.length;
            healthPercentage = (avgHealth / component.maxHealth) * 100;
        } else {
            healthPercentage = (component.health / component.maxHealth) * 100;
        }
        
        // Priority based on health and performance impact
        const healthFactor = (100 - healthPercentage) / 100;
        const impactFactor = component.performanceImpact;
        
        return Math.ceil((healthFactor * impactFactor) * 10);
    }

    /**
     * Record damage event for analytics
     */
    recordDamageEvent(type, data) {
        this.damageHistory.push({
            timestamp: Date.now(),
            type,
            data,
            totalDamage: this.getTotalDamagePercentage()
        });
        
        // Keep only last 100 events
        if (this.damageHistory.length > 100) {
            this.damageHistory.shift();
        }
    }

    /**
     * Get total damage percentage across all components
     */
    getTotalDamagePercentage() {
        let totalHealth = 0;
        let totalMaxHealth = 0;
        
        Object.values(this.components).forEach(component => {
            if (Array.isArray(component.health)) {
                totalHealth += component.health.reduce((a, b) => a + b, 0);
                totalMaxHealth += component.health.length * component.maxHealth;
            } else {
                totalHealth += component.health;
                totalMaxHealth += component.maxHealth;
            }
        });
        
        return ((totalMaxHealth - totalHealth) / totalMaxHealth) * 100;
    }

    /**
     * Get component health status
     */
    getComponentHealth(componentName) {
        const component = this.components[componentName];
        if (!component) return null;
        
        let health, maxHealth;
        if (Array.isArray(component.health)) {
            health = [...component.health];
            maxHealth = component.maxHealth;
        } else {
            health = component.health;
            maxHealth = component.maxHealth;
        }
        
        return {
            component: componentName,
            health,
            maxHealth,
            percentage: Array.isArray(health) ? 
                health.map(h => (h / maxHealth) * 100) : 
                (health / maxHealth) * 100,
            isCritical: this.isComponentCritical(componentName),
            repairCost: component.repairCost,
            performanceImpact: component.performanceImpact
        };
    }

    /**
     * Get all component health statuses
     */
    getAllComponentHealth() {
        return Object.keys(this.components).map(name => this.getComponentHealth(name));
    }

    /**
     * Get visual damage state
     */
    getVisualDamage() {
        return {
            deformation: { ...this.visualDamage.deformation },
            scratches: { ...this.visualDamage.scratches },
            brokenParts: { ...this.visualDamage.brokenParts },
            fluids: { ...this.visualDamage.fluids }
        };
    }

    /**
     * Get performance modifiers
     */
    getPerformanceModifiers() {
        return { ...this.performanceModifiers };
    }

    /**
     * Get damage system status
     */
    getStatus() {
        return {
            totalDamage: this.getTotalDamagePercentage(),
            componentHealth: this.getAllComponentHealth(),
            visualDamage: this.getVisualDamage(),
            performanceModifiers: this.getPerformanceModifiers(),
            currentRepair: this.repairSystem.currentRepair ? {
                component: this.repairSystem.currentRepair.component,
                progress: this.repairSystem.repairProgress,
                timeRemaining: this.repairSystem.currentRepair.duration * (1 - this.repairSystem.repairProgress)
            } : null,
            criticalComponents: Object.keys(this.components).filter(name => this.isComponentCritical(name))
        };
    }

    /**
     * Simulate random failure based on component health
     */
    simulateRandomFailure(deltaTime) {
        Object.keys(this.components).forEach(componentName => {
            const component = this.components[componentName];
            let avgHealth;
            
            if (Array.isArray(component.health)) {
                avgHealth = component.health.reduce((a, b) => a + b, 0) / component.health.length;
            } else {
                avgHealth = component.health;
            }
            
            const healthPercentage = avgHealth / component.maxHealth;
            const failureChance = (1 - healthPercentage) * 0.001 * deltaTime; // Very low base chance
            
            if (Math.random() < failureChance) {
                this.damageComponent(componentName, 10, 'failure');
                
                this.emit('randomFailure', {
                    component: componentName,
                    health: component.health
                });
            }
        });
    }

    /**
     * Reset all damage
     */
    resetDamage() {
        // Reset component health
        Object.values(this.components).forEach(component => {
            if (Array.isArray(component.health)) {
                component.health = component.health.map(() => component.maxHealth);
            } else {
                component.health = component.maxHealth;
            }
        });
        
        // Reset visual damage
        this.visualDamage = {
            deformation: { front: 0, rear: 0, left: 0, right: 0, roof: 0, undercarriage: 0 },
            scratches: { front: 0, rear: 0, left: 0, right: 0, roof: 0 },
            brokenParts: {
                headlights: [false, false],
                taillights: [false, false],
                windows: [false, false, false, false, false, false],
                mirrors: [false, false],
                bumpers: [false, false]
            },
            fluids: { oil: false, coolant: false, fuel: false, brake_fluid: false }
        };
        
        // Reset performance modifiers
        this.updatePerformanceModifiers();
        
        // Clear repair
        this.repairSystem.currentRepair = null;
        this.repairSystem.repairProgress = 0;
        
        // Clear damage history
        this.damageHistory = [];
        
        this.emit('damageReset');
    }

    /**
     * Update damage system
     */
    update(deltaTime, vehicleState) {
        // Update repair progress
        this.updateRepair(deltaTime);
        
        // Apply wear damage based on usage
        if (vehicleState) {
            this.applyWearDamage(deltaTime, vehicleState);
            
            // Check for overheating
            if (vehicleState.engineTemp > 100) {
                this.applyOverheatingDamage(vehicleState.engineTemp, deltaTime);
            }
            
            // Simulate random failures
            this.simulateRandomFailure(deltaTime);
        }
        
        this.emit('updated', this.getStatus());
    }

    /**
     * Dispose of damage system
     */
    dispose() {
        this.removeAllListeners();
        this.logger.info('Vehicle Damage System disposed');
    }
}

export default VehicleDamageSystem;