/**
 * 2D Combat System for Desert Survival Game
 * Handles combat interactions between vehicles and zombies in 2D space
 * with satisfying visual and audio feedback
 */

import Matter from 'matter-js';

export class CombatSystem2D {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        
        // Combat state tracking
        this.activeVehicles = new Map();
        this.activeZombies = new Map();
        this.combatEvents = [];
        
        // Collision detection
        this.collisionPairs = new Set();
        this.lastCollisionCheck = 0;
        this.collisionCheckInterval = 16; // Check every 16ms (60fps)
        
        // Audio system (placeholder)
        this.audioManager = null;
        
        // Performance tracking
        this.combatStats = {
            totalCollisions: 0,
            totalDamageDealt: 0,
            zombiesKilled: 0,
            vehiclesDestroyed: 0,
            criticalHits: 0
        };
        
        // Combat settings
        this.baseVehicleDamage = 25;
        this.speedDamageMultiplier = 0.5; // Damage per unit of speed
        this.criticalHitChance = 0.1; // 10% base critical hit chance
        this.criticalHitMultiplier = 2.0;
        
        this._setupCombatSystem();
    }

    /**
     * Initialize the 2D combat system
     */
    async initialize() {
        // Setup collision event listeners
        this._setupCollisionEvents();
        
        console.log('2D Combat System initialized');
        return true;
    }

    /**
     * Set vehicle manager for combat system integration
     */
    setVehicleManager(vehicleManager) {
        this.vehicleManager = vehicleManager;
        console.log('Vehicle Manager connected to 2D Combat System');
    }

    /**
     * Set zombie manager for combat system integration
     */
    setZombieManager(zombieManager) {
        this.zombieManager = zombieManager;
        console.log('Zombie Manager connected to 2D Combat System');
    }

    /**
     * Initialize the combat system
     */
    _setupCombatSystem() {
        console.log('2D Combat System setup complete');
    }

    /**
     * Setup collision event listeners for Matter.js
     */
    _setupCollisionEvents() {
        if (!this.gameEngine.physics) return;
        
        // Listen for collision events
        Matter.Events.on(this.gameEngine.physics, 'collisionStart', (event) => {
            this._handleCollisionStart(event);
        });
        
        Matter.Events.on(this.gameEngine.physics, 'collisionEnd', (event) => {
            this._handleCollisionEnd(event);
        });
    }

    /**
     * Register a vehicle for combat tracking
     */
    registerVehicle(vehicle) {
        this.activeVehicles.set(vehicle.id, vehicle);
        
        // Setup collision category for vehicle
        if (vehicle.body) {
            vehicle.body.collisionFilter = {
                category: 0x0001, // Vehicle category
                mask: 0x0002 | 0x0004 // Collide with zombies and terrain
            };
            
            // Add user data for collision detection
            vehicle.body.userData = {
                type: 'vehicle',
                gameObject: vehicle
            };
        }
        
        console.log(`Vehicle ${vehicle.id} registered for 2D combat`);
    }

    /**
     * Register a zombie for combat tracking
     */
    registerZombie(zombie) {
        this.activeZombies.set(zombie.id, zombie);
        
        // Setup collision category for zombie
        if (zombie.body) {
            zombie.body.collisionFilter = {
                category: 0x0002, // Zombie category
                mask: 0x0001 | 0x0004 // Collide with vehicles and terrain
            };
            
            // Add user data for collision detection
            zombie.body.userData = {
                type: 'zombie',
                gameObject: zombie
            };
        }
        
        console.log(`Zombie ${zombie.id} registered for 2D combat`);
    }

    /**
     * Unregister vehicle from combat
     */
    unregisterVehicle(vehicleId) {
        this.activeVehicles.delete(vehicleId);
    }

    /**
     * Unregister zombie from combat
     */
    unregisterZombie(zombieId) {
        this.activeZombies.delete(zombieId);
    }

    /**
     * Update combat system each frame
     */
    update(deltaTime) {
        // Process combat events
        this._processCombatEvents(deltaTime);
        
        // Manual collision detection for better control
        this._checkCollisions();
        
        // Clean up destroyed objects
        this._cleanupDestroyedObjects();
    }

    /**
     * Handle collision start event
     */
    _handleCollisionStart(event) {
        const pairs = event.pairs;
        
        for (const pair of pairs) {
            const { bodyA, bodyB } = pair;
            
            // Check if this is a vehicle-zombie collision
            if (this._isVehicleZombieCollision(bodyA, bodyB)) {
                this._handleVehicleZombieCollision(bodyA, bodyB, pair);
            }
        }
    }

    /**
     * Handle collision end event
     */
    _handleCollisionEnd(event) {
        // Clean up collision tracking if needed
    }

    /**
     * Check if collision is between vehicle and zombie
     */
    _isVehicleZombieCollision(bodyA, bodyB) {
        const typeA = bodyA.userData?.type;
        const typeB = bodyB.userData?.type;
        
        return (typeA === 'vehicle' && typeB === 'zombie') ||
               (typeA === 'zombie' && typeB === 'vehicle');
    }

    /**
     * Handle vehicle-zombie collision
     */
    _handleVehicleZombieCollision(bodyA, bodyB, collisionPair) {
        // Determine which is vehicle and which is zombie
        let vehicle, zombie;
        if (bodyA.userData.type === 'vehicle') {
            vehicle = bodyA.userData.gameObject;
            zombie = bodyB.userData.gameObject;
        } else {
            vehicle = bodyB.userData.gameObject;
            zombie = bodyA.userData.gameObject;
        }
        
        if (!vehicle || !zombie || zombie.isDestroyed || zombie.isDying) return;
        
        // Prevent duplicate collision processing
        const collisionKey = `${vehicle.id}-${zombie.id}`;
        if (this.collisionPairs.has(collisionKey)) return;
        
        this.collisionPairs.add(collisionKey);
        
        // Remove collision key after short delay
        setTimeout(() => {
            this.collisionPairs.delete(collisionKey);
        }, 100);
        
        // Calculate collision data
        const collisionData = this._calculateCollisionData(vehicle, zombie);
        
        // Store zombie's initial health for kill detection
        const zombieInitialHealth = zombie.health;
        
        // Calculate damage from vehicle to zombie
        const vehicleDamage = this._calculateVehicleToZombieDamage(vehicle, zombie, collisionData);
        
        // Calculate damage from zombie to vehicle (zombie slows vehicle)
        const zombieDamage = this._calculateZombieToVehicleDamage(zombie, vehicle, collisionData);
        
        // Apply damage
        const actualZombieDamage = zombie.takeDamage(
            vehicleDamage.damage,
            vehicleDamage.damageType,
            vehicle
        );
        
        const actualVehicleDamage = vehicle.takeDamage ? vehicle.takeDamage(zombieDamage.damage) : 0;
        
        // Check if zombie was killed
        const zombieKilled = zombieInitialHealth > 0 && zombie.health <= 0;
        
        // Create visual effects
        this._createCollisionEffects(vehicle, zombie, collisionData, vehicleDamage, zombieKilled);
        
        // Play audio effects
        this._playCollisionAudio(vehicle, zombie, collisionData, zombieKilled);
        
        // Apply knockback to zombie
        this._applyKnockback(vehicle, zombie, collisionData);
        
        // Slow down vehicle (zombie impact)
        this._applyVehicleSlowdown(vehicle, zombie, collisionData);
        
        // Track combat statistics
        this._updateCombatStats(actualVehicleDamage, actualZombieDamage, zombieKilled, vehicleDamage.isCritical);
        
        // Emit zombie kill event for scoring
        if (zombieKilled) {
            this.gameEngine.emit('zombieKilled', {
                zombie,
                vehicle,
                damage: actualZombieDamage,
                isCritical: vehicleDamage.isCritical,
                killMethod: 'collision'
            });
        }
        
        console.log(`2D Combat: Vehicle dealt ${actualZombieDamage} damage${vehicleDamage.isCritical ? ' (CRITICAL)' : ''}${zombieKilled ? ' (KILLED)' : ''}`);
    }

    /**
     * Manual collision detection for better control
     */
    _checkCollisions() {
        const currentTime = Date.now();
        if (currentTime - this.lastCollisionCheck < this.collisionCheckInterval) return;
        
        this.lastCollisionCheck = currentTime;
        
        // Check all vehicle-zombie pairs
        for (const vehicle of this.activeVehicles.values()) {
            if (!vehicle.body || vehicle.isDestroyed) continue;
            
            for (const zombie of this.activeZombies.values()) {
                if (!zombie.body || zombie.isDestroyed || zombie.isDying) continue;
                
                // Check if they're colliding
                if (this._areColliding(vehicle.body, zombie.body)) {
                    // Create fake collision pair for processing
                    this._handleVehicleZombieCollision(vehicle.body, zombie.body, null);
                }
            }
        }
    }

    /**
     * Check if two bodies are colliding
     */
    _areColliding(bodyA, bodyB) {
        const dx = bodyA.position.x - bodyB.position.x;
        const dy = bodyA.position.y - bodyB.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Simple radius-based collision detection
        const radiusA = this._getBodyRadius(bodyA);
        const radiusB = this._getBodyRadius(bodyB);
        
        return distance < (radiusA + radiusB);
    }

    /**
     * Get approximate radius of a physics body
     */
    _getBodyRadius(body) {
        if (body.bounds) {
            const width = body.bounds.max.x - body.bounds.min.x;
            const height = body.bounds.max.y - body.bounds.min.y;
            return Math.max(width, height) / 2;
        }
        return 20; // Default radius
    }

    /**
     * Calculate collision data
     */
    _calculateCollisionData(vehicle, zombie) {
        const vehiclePos = vehicle.getPosition();
        const zombiePos = zombie.getPosition();
        
        // Calculate relative velocity
        const vehicleVel = vehicle.body ? vehicle.body.velocity : { x: 0, y: 0 };
        const zombieVel = zombie.body ? zombie.body.velocity : { x: 0, y: 0 };
        
        const relativeVelocity = {
            x: vehicleVel.x - zombieVel.x,
            y: vehicleVel.y - zombieVel.y
        };
        
        const speed = Math.sqrt(relativeVelocity.x * relativeVelocity.x + relativeVelocity.y * relativeVelocity.y);
        
        // Calculate collision normal
        const dx = zombiePos.x - vehiclePos.x;
        const dy = zombiePos.y - vehiclePos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const normal = distance > 0 ? { x: dx / distance, y: dy / distance } : { x: 1, y: 0 };
        
        return {
            speed,
            relativeVelocity,
            normal,
            distance
        };
    }

    /**
     * Calculate damage dealt by vehicle to zombie
     */
    _calculateVehicleToZombieDamage(vehicle, zombie, collisionData) {
        // Base damage
        let baseDamage = this.baseVehicleDamage;
        
        // Speed-based damage bonus
        const speedBonus = collisionData.speed * this.speedDamageMultiplier;
        
        // Vehicle type multiplier (if available)
        const vehicleMultiplier = vehicle.damageMultiplier || 1.0;
        
        // Calculate raw damage
        let rawDamage = (baseDamage + speedBonus) * vehicleMultiplier;
        
        // Apply zombie resistance
        const resistance = this._getZombieResistance(zombie.type, 'impact');
        const finalDamage = rawDamage * resistance;
        
        // Check for critical hit
        const isCritical = Math.random() < this.criticalHitChance;
        const criticalMultiplier = isCritical ? this.criticalHitMultiplier : 1.0;
        
        return {
            damage: Math.round(finalDamage * criticalMultiplier),
            isCritical,
            damageType: 'impact',
            components: {
                baseDamage,
                speedBonus,
                vehicleMultiplier,
                resistance,
                criticalMultiplier
            }
        };
    }

    /**
     * Calculate damage dealt by zombie to vehicle (slowdown effect)
     */
    _calculateZombieToVehicleDamage(zombie, vehicle, collisionData) {
        // Zombies primarily slow down vehicles rather than damage them
        const baseDamage = zombie.config.damage * 0.1; // Reduced damage
        const impactBonus = collisionData.speed * 0.1;
        
        return {
            damage: Math.round(baseDamage + impactBonus),
            damageType: 'impact'
        };
    }

    /**
     * Get zombie resistance to damage type
     */
    _getZombieResistance(zombieType, damageType) {
        const resistances = {
            walker: { impact: 1.0, explosion: 1.2, fire: 0.8 },
            runner: { impact: 0.9, explosion: 1.1, fire: 0.9 },
            crawler: { impact: 1.1, explosion: 1.0, fire: 0.7 },
            spitter: { impact: 0.8, explosion: 0.9, fire: 1.2 },
            bloater: { impact: 1.3, explosion: 0.6, fire: 1.5 },
            armored: { impact: 0.5, explosion: 0.7, fire: 0.9 }
        };
        
        const typeResistances = resistances[zombieType] || resistances.walker;
        return typeResistances[damageType] || 1.0;
    }

    /**
     * Create collision visual effects
     */
    _createCollisionEffects(vehicle, zombie, collisionData, vehicleDamage, zombieKilled) {
        const spriteRenderer = this.gameEngine.getSystem('spriteRenderer');
        if (!spriteRenderer) return;
        
        const zombiePos = zombie.getPosition();
        
        // Blood splatter effect
        const bloodIntensity = Math.min(2.0, vehicleDamage.damage / 25);
        spriteRenderer.createParticleEffect(
            zombiePos.x,
            zombiePos.y,
            Math.floor(5 + bloodIntensity * 3),
            '#8b0000' // Dark red blood
        );
        
        // Critical hit effect
        if (vehicleDamage.isCritical) {
            spriteRenderer.createParticleEffect(
                zombiePos.x,
                zombiePos.y - 20,
                8,
                '#ffff00' // Yellow critical effect
            );
        }
        
        // Death effect
        if (zombieKilled) {
            spriteRenderer.createExplosionEffect(
                zombiePos.x,
                zombiePos.y,
                1.5
            );
            
            // Extra blood for death
            spriteRenderer.createParticleEffect(
                zombiePos.x,
                zombiePos.y,
                15,
                '#8b0000'
            );
        }
        
        // Dust effect from impact
        spriteRenderer.createDustEffect(
            zombiePos.x,
            zombiePos.y,
            bloodIntensity
        );
    }

    /**
     * Play collision audio effects
     */
    _playCollisionAudio(vehicle, zombie, collisionData, zombieKilled) {
        const impactIntensity = Math.min(1.0, collisionData.speed / 20);
        
        // Vehicle impact sound
        this._playSound('vehicle_impact', vehicle.getPosition(), impactIntensity);
        
        // Zombie hit sound with satisfying crunch
        if (zombieKilled) {
            this._playSound('zombie_death_crunch', zombie.getPosition(), 1.0);
        } else {
            this._playSound('zombie_hit_crunch', zombie.getPosition(), impactIntensity);
        }
        
        // Zombie growl/scream
        this._playSound('zombie_hurt', zombie.getPosition(), impactIntensity);
    }

    /**
     * Apply knockback to zombie
     */
    _applyKnockback(vehicle, zombie, collisionData) {
        if (!zombie.body) return;
        
        const knockbackForce = collisionData.speed * 0.02;
        const forceX = collisionData.normal.x * knockbackForce;
        const forceY = collisionData.normal.y * knockbackForce;
        
        Matter.Body.applyForce(zombie.body, zombie.body.position, { x: forceX, y: forceY });
    }

    /**
     * Apply slowdown to vehicle from zombie impact
     */
    _applyVehicleSlowdown(vehicle, zombie, collisionData) {
        if (!vehicle.body) return;
        
        // Zombies slow down vehicles on impact
        const slowdownFactor = 0.8; // Reduce speed by 20%
        const currentVelocity = vehicle.body.velocity;
        
        Matter.Body.setVelocity(vehicle.body, {
            x: currentVelocity.x * slowdownFactor,
            y: currentVelocity.y * slowdownFactor
        });
    }

    /**
     * Process combat events each frame
     */
    _processCombatEvents(deltaTime) {
        // Process any ongoing combat effects
        // This could include damage over time, status effects, etc.
    }

    /**
     * Update combat statistics
     */
    _updateCombatStats(vehicleDamage, zombieDamage, zombieKilled, isCritical) {
        this.combatStats.totalCollisions++;
        this.combatStats.totalDamageDealt += zombieDamage;
        
        if (zombieKilled) {
            this.combatStats.zombiesKilled++;
        }
        
        if (isCritical) {
            this.combatStats.criticalHits++;
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
        console.log(`Playing 2D sound: ${soundName} at intensity ${intensity.toFixed(2)}`);
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
            vehiclesDestroyed: 0,
            criticalHits: 0
        };
    }

    /**
     * Dispose of combat system
     */
    dispose() {
        // Remove event listeners
        if (this.gameEngine.physics) {
            Matter.Events.off(this.gameEngine.physics, 'collisionStart');
            Matter.Events.off(this.gameEngine.physics, 'collisionEnd');
        }
        
        this.activeVehicles.clear();
        this.activeZombies.clear();
        this.combatEvents = [];
        this.collisionPairs.clear();
        
        console.log('2D Combat System disposed');
    }
}