import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CollisionDetector } from './CollisionDetector';
import { DamageCalculator } from './DamageCalculator';
import { ParticleEffects } from './ParticleEffects';

/**
 * CombatSystem manages all combat interactions between vehicles and zombies
 * including collision detection, damage calculation, and visual/audio feedback
 */
export class CombatSystem {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        
        // Core combat components
        this.collisionDetector = new CollisionDetector(gameEngine);
        this.damageCalculator = new DamageCalculator();
        this.particleEffects = new ParticleEffects(gameEngine);
        
        // Combat state tracking
        this.activeVehicles = new Map();
        this.activeZombies = new Map();
        this.combatEvents = [];
        
        // Audio system (placeholder for now)
        this.audioManager = null;
        
        // Performance tracking
        this.combatStats = {
            totalCollisions: 0,
            totalDamageDealt: 0,
            zombiesKilled: 0,
            vehiclesDestroyed: 0
        };
        
        this._setupCombatSystem();
    }

    /**
     * Initialize the combat system (async version for compatibility)
     */
    async initialize() {
        // Combat system is already initialized in constructor
        // This method exists for compatibility with other systems
        return Promise.resolve();
    }

    /**
     * Initialize the combat system
     */
    _setupCombatSystem() {
        // Register collision callbacks
        this.collisionDetector.registerCollisionCallback(
            'vehicle', 
            'zombie', 
            (collisionData) => this._handleVehicleZombieCollision(collisionData)
        );
        
        this.collisionDetector.registerCollisionCallback(
            'vehicle', 
            'terrain', 
            (collisionData) => this._handleVehicleTerrainCollision(collisionData)
        );
        
        console.log('CombatSystem initialized');
    }

    /**
     * Register a vehicle for combat tracking
     */
    registerVehicle(vehicle) {
        this.activeVehicles.set(vehicle.id, vehicle);
        
        // Setup collision groups for vehicle
        if (vehicle.body) {
            this.collisionDetector.setupCollisionGroups(
                vehicle.body,
                this.collisionDetector.COLLISION_GROUPS.VEHICLE
            );
            
            // Add type information to physics body
            vehicle.body.userData = { type: 'vehicle', gameObject: vehicle };
        }
        
        console.log(`Vehicle ${vehicle.id} registered for combat`);
    }

    /**
     * Register a zombie for combat tracking
     */
    registerZombie(zombie) {
        this.activeZombies.set(zombie.id, zombie);
        
        // Setup collision groups for zombie
        if (zombie.body) {
            this.collisionDetector.setupCollisionGroups(
                zombie.body,
                this.collisionDetector.COLLISION_GROUPS.ZOMBIE
            );
            
            // Add type information to physics body
            zombie.body.userData = { type: 'zombie', gameObject: zombie };
        }
        
        console.log(`Zombie ${zombie.id} registered for combat`);
    }

    /**
     * Unregister vehicle from combat
     */
    unregisterVehicle(vehicleId) {
        this.activeVehicles.delete(vehicleId);
        console.log(`Vehicle ${vehicleId} unregistered from combat`);
    }

    /**
     * Unregister zombie from combat
     */
    unregisterZombie(zombieId) {
        this.activeZombies.delete(zombieId);
        console.log(`Zombie ${zombieId} unregistered from combat`);
    }

    /**
     * Update combat system each frame
     */
    update(deltaTime) {
        // Process combat events
        this._processCombatEvents(deltaTime);
        
        // Update particle effects
        this.particleEffects.update(deltaTime);
        
        // Clean up destroyed objects
        this._cleanupDestroyedObjects();
    }

    /**
     * Handle vehicle-zombie collision
     */
    _handleVehicleZombieCollision(collisionData) {
        const { bodyA, bodyB, impact } = collisionData;
        
        // Determine which is vehicle and which is zombie
        let vehicle, zombie;
        if (bodyA.userData.type === 'vehicle') {
            vehicle = bodyA.userData.gameObject;
            zombie = bodyB.userData.gameObject;
        } else {
            vehicle = bodyB.userData.gameObject;
            zombie = bodyA.userData.gameObject;
        }
        
        if (!vehicle || !zombie || zombie.isDestroyed) return;
        
        // Store zombie's initial health for kill detection
        const zombieInitialHealth = zombie.health;
        
        // Calculate damage from vehicle to zombie
        const vehicleDamage = this.damageCalculator.calculateVehicleToZombieDamage(
            vehicle, zombie, collisionData
        );
        
        // Calculate damage from zombie to vehicle
        const zombieDamage = this.damageCalculator.calculateZombieToVehicleDamage(
            zombie, vehicle, collisionData
        );
        
        // Apply damage
        const actualZombieDamage = zombie.takeDamage(
            vehicleDamage.damage, 
            vehicleDamage.damageType, 
            vehicle
        );
        
        const actualVehicleDamage = vehicle.takeDamage(zombieDamage.damage);
        
        // Check if zombie was killed
        const zombieKilled = zombieInitialHealth > 0 && zombie.health <= 0;
        
        // Emit zombie kill event for scoring system
        if (zombieKilled) {
            this.gameEngine.emit('zombieKilled', {
                zombie,
                vehicle,
                killMethod: this._determineKillMethod(vehicleDamage, impact),
                damage: actualZombieDamage,
                impact,
                isCritical: vehicleDamage.isCritical || false
            });
        }
        
        // Create visual effects
        this._createCollisionEffects(vehicle, zombie, impact, vehicleDamage, zombieDamage);
        
        // Play audio effects
        this._playCollisionAudio(vehicle, zombie, impact);
        
        // Apply knockback
        this._applyKnockback(vehicle, zombie, impact, vehicleDamage.damage);
        
        // Track combat statistics
        this._updateCombatStats(actualVehicleDamage, actualZombieDamage, zombieKilled);
        
        // Create combat event
        this.combatEvents.push({
            type: 'vehicle_zombie_collision',
            vehicle,
            zombie,
            vehicleDamage: actualVehicleDamage,
            zombieDamage: actualZombieDamage,
            impact,
            zombieKilled,
            timestamp: Date.now()
        });
        
        console.log(`Combat: Vehicle dealt ${actualZombieDamage} damage, Zombie dealt ${actualVehicleDamage} damage${zombieKilled ? ' (KILLED)' : ''}`);
    }

    /**
     * Handle vehicle-terrain collision
     */
    _handleVehicleTerrainCollision(collisionData) {
        const { bodyA, bodyB, impact } = collisionData;
        
        // Determine which is the vehicle
        let vehicle;
        if (bodyA.userData.type === 'vehicle') {
            vehicle = bodyA.userData.gameObject;
        } else if (bodyB.userData.type === 'vehicle') {
            vehicle = bodyB.userData.gameObject;
        }
        
        if (!vehicle || vehicle.isDestroyed) return;
        
        // Calculate impact damage based on speed and angle
        const impactSpeed = impact.speed * 3.6; // Convert to km/h
        const minDamageSpeed = 20; // km/h
        
        if (impactSpeed > minDamageSpeed) {
            const impactDamage = Math.pow((impactSpeed - minDamageSpeed) / 10, 2);
            const actualDamage = vehicle.takeDamage(impactDamage);
            
            // Create impact effects
            this.particleEffects.createImpactEffect(
                vehicle.getPosition(),
                impact.normal,
                impactSpeed / 100
            );
            
            // Play crash sound
            this._playSound('crash', vehicle.getPosition(), impactSpeed / 100);
            
            console.log(`Vehicle terrain impact: ${actualDamage} damage at ${impactSpeed.toFixed(1)} km/h`);
        }
    }

    /**
     * Create explosion at specified location
     */
    createExplosion(center, radius, damage, source = null) {
        // Find all targets in explosion radius
        const targets = [];
        
        // Check vehicles
        this.activeVehicles.forEach(vehicle => {
            if (!vehicle.isDestroyed) {
                const distance = center.distanceTo(vehicle.getPosition());
                if (distance <= radius) {
                    targets.push(vehicle);
                }
            }
        });
        
        // Check zombies
        this.activeZombies.forEach(zombie => {
            if (!zombie.isDestroyed) {
                const distance = center.distanceTo(zombie.getPosition());
                if (distance <= radius) {
                    targets.push(zombie);
                }
            }
        });
        
        // Calculate and apply explosion damage
        const damageResults = this.damageCalculator.calculateExplosionDamage(
            center, radius, damage, targets
        );
        
        damageResults.forEach(result => {
            const actualDamage = result.target.takeDamage(
                result.damage,
                this.damageCalculator.DAMAGE_TYPES.EXPLOSION,
                source
            );
            
            // Apply knockback
            const direction = result.target.getPosition().clone().sub(center).normalize();
            const knockback = this.damageCalculator.calculateKnockback(
                { body: { mass: 1000 } }, // Explosion source
                result.target,
                result.damage,
                direction
            );
            
            if (result.target.body) {
                result.target.body.applyImpulse(
                    new CANNON.Vec3(knockback.x, knockback.y, knockback.z),
                    result.target.body.position
                );
            }
            
            console.log(`Explosion damage: ${actualDamage} to ${result.target.type || 'vehicle'}`);
        });
        
        // Create explosion effects
        this.particleEffects.createExplosionEffect(center, radius);
        this._playSound('explosion', center, 1.0);
        
        return damageResults;
    }

    /**
     * Apply damage over time effect
     */
    applyDamageOverTime(target, damageType, baseDamage, duration, source = null) {
        const dotData = this.damageCalculator.calculateDamageOverTime(
            target, damageType, baseDamage, duration
        );
        
        // Create DOT effect
        const dotEffect = {
            target,
            damageType,
            damagePerTick: dotData.damagePerTick,
            ticksRemaining: dotData.totalTicks,
            tickRate: dotData.tickRate,
            lastTick: Date.now(),
            source
        };
        
        // Add to combat events for processing
        this.combatEvents.push({
            type: 'damage_over_time',
            effect: dotEffect,
            timestamp: Date.now()
        });
        
        return dotEffect;
    }

    /**
     * Create collision visual and particle effects
     */
    _createCollisionEffects(vehicle, zombie, impact, vehicleDamage, zombieDamage) {
        const collisionPoint = vehicle.getPosition().clone().lerp(zombie.getPosition(), 0.5);
        
        // Blood splatter effect
        this.particleEffects.createBloodEffect(
            collisionPoint,
            impact.normal,
            vehicleDamage.damage / 50
        );
        
        // Sparks from vehicle
        this.particleEffects.createSparkEffect(
            collisionPoint,
            impact.normal.clone().negate(),
            zombieDamage.damage / 20
        );
        
        // Critical hit effect
        if (vehicleDamage.isCritical) {
            this.particleEffects.createCriticalHitEffect(collisionPoint);
        }
        
        // Damage numbers
        this.particleEffects.createDamageNumber(
            zombie.getPosition().clone().add(new THREE.Vector3(0, 2, 0)),
            vehicleDamage.damage,
            this.damageCalculator.getDamageColor(vehicleDamage.damageType, vehicleDamage.isCritical)
        );
    }

    /**
     * Play collision audio effects
     */
    _playCollisionAudio(vehicle, zombie, impact) {
        const impactIntensity = Math.min(1.0, impact.speed / 20);
        
        // Vehicle impact sound
        this._playSound('vehicle_impact', vehicle.getPosition(), impactIntensity);
        
        // Zombie hit sound
        this._playSound('zombie_hit', zombie.getPosition(), impactIntensity);
        
        // Additional sounds based on zombie type
        if (zombie.type === 'exploder' && zombie.health <= 0) {
            this._playSound('zombie_explosion', zombie.getPosition(), 1.0);
        }
    }

    /**
     * Apply knockback forces
     */
    _applyKnockback(vehicle, zombie, impact, damage) {
        // Calculate knockback for zombie
        const knockback = this.damageCalculator.calculateKnockback(
            vehicle, zombie, damage, impact.normal
        );
        
        if (zombie.body && knockback) {
            zombie.body.applyImpulse(
                new CANNON.Vec3(knockback.x, knockback.y, knockback.z),
                zombie.body.position
            );
        }
        
        // Vehicle experiences minor recoil
        if (knockback && vehicle.body) {
            const recoil = knockback.clone().multiplyScalar(-0.1);
            vehicle.body.applyImpulse(
                new CANNON.Vec3(recoil.x, recoil.y, recoil.z),
                vehicle.body.position
            );
        }
    }

    /**
     * Process combat events each frame
     */
    _processCombatEvents(deltaTime) {
        const currentTime = Date.now();
        const eventsToRemove = [];
        
        this.combatEvents.forEach((event, index) => {
            switch (event.type) {
                case 'damage_over_time':
                    if (this._processDamageOverTime(event.effect, currentTime)) {
                        eventsToRemove.push(index);
                    }
                    break;
                    
                case 'vehicle_zombie_collision':
                    // Collision events are processed immediately and can be removed
                    eventsToRemove.push(index);
                    break;
            }
        });
        
        // Remove processed events
        eventsToRemove.reverse().forEach(index => {
            this.combatEvents.splice(index, 1);
        });
    }

    /**
     * Process damage over time effect
     */
    _processDamageOverTime(effect, currentTime) {
        if (effect.target.isDestroyed || effect.ticksRemaining <= 0) {
            return true; // Remove effect
        }
        
        const timeSinceLastTick = currentTime - effect.lastTick;
        const tickInterval = effect.tickRate * 1000; // Convert to milliseconds
        
        if (timeSinceLastTick >= tickInterval) {
            const actualDamage = effect.target.takeDamage(
                effect.damagePerTick,
                effect.damageType,
                effect.source
            );
            
            // Create DOT visual effect
            this.particleEffects.createDamageOverTimeEffect(
                effect.target.getPosition(),
                effect.damageType
            );
            
            effect.ticksRemaining--;
            effect.lastTick = currentTime;
            
            console.log(`DOT: ${actualDamage} ${effect.damageType} damage, ${effect.ticksRemaining} ticks remaining`);
        }
        
        return effect.ticksRemaining <= 0;
    }

    /**
     * Update combat statistics
     */
    _updateCombatStats(vehicleDamage, zombieDamage, zombieKilled) {
        this.combatStats.totalCollisions++;
        this.combatStats.totalDamageDealt += zombieDamage;
        
        if (zombieKilled) {
            this.combatStats.zombiesKilled++;
        }
    }

    /**
     * Clean up destroyed objects
     */
    _cleanupDestroyedObjects() {
        // Remove destroyed vehicles
        for (const [id, vehicle] of this.activeVehicles.entries()) {
            if (vehicle.isDestroyed) {
                this.unregisterVehicle(id);
                this.combatStats.vehiclesDestroyed++;
            }
        }
        
        // Remove destroyed zombies
        for (const [id, zombie] of this.activeZombies.entries()) {
            if (zombie.isDestroyed) {
                this.unregisterZombie(id);
            }
        }
    }

    /**
     * Play sound effect (placeholder implementation)
     */
    _playSound(soundName, position, intensity = 1.0) {
        // Audio implementation would go here
        console.log(`Playing sound: ${soundName} at intensity ${intensity.toFixed(2)}`);
    }

    /**
     * Get combat statistics
     */
    getCombatStats() {
        return { ...this.combatStats };
    }

    /**
     * Reset combat statistics
     */
    resetCombatStats() {
        this.combatStats = {
            totalCollisions: 0,
            totalDamageDealt: 0,
            zombiesKilled: 0,
            vehiclesDestroyed: 0
        };
    }

    /**
     * Determine kill method based on damage type and impact
     */
    _determineKillMethod(vehicleDamage, impact) {
        if (vehicleDamage.damageType === this.damageCalculator.DAMAGE_TYPES.EXPLOSION) {
            return 'explosion';
        }
        
        if (impact.speed > 30) { // High speed collision
            return 'collision';
        }
        
        if (vehicleDamage.isCritical) {
            return 'special';
        }
        
        return 'collision'; // Default
    }

    /**
     * Dispose of combat system
     */
    dispose() {
        this.collisionDetector.dispose();
        this.particleEffects.dispose();
        
        this.activeVehicles.clear();
        this.activeZombies.clear();
        this.combatEvents = [];
        
        console.log('CombatSystem disposed');
    }
}