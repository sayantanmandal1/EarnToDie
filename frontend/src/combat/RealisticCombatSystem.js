/**
 * Realistic Combat and Collision System
 * Advanced physics-based combat with realistic damage calculation and effects
 */

import { EventEmitter } from 'events';
import { electronIntegration } from '../electron/ElectronIntegration.js';

export class RealisticCombatSystem extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            // Physics settings
            enablePhysicsBasedCollision: options.enablePhysicsBasedCollision !== false,
            enableRealisticDamage: options.enableRealisticDamage !== false,
            enableBloodEffects: options.enableBloodEffects !== false,
            enableComboSystem: options.enableComboSystem !== false,
            
            // Collision detection settings
            collisionPrecision: options.collisionPrecision || 'high', // low, medium, high
            maxCollisionChecks: options.maxCollisionChecks || 100,
            spatialGridSize: options.spatialGridSize || 50,
            
            // Damage calculation settings
            momentumDamageMultiplier: options.momentumDamageMultiplier || 1.5,
            massDamageMultiplier: options.massDamageMultiplier || 0.8,
            velocityThreshold: options.velocityThreshold || 5.0, // m/s
            
            // Visual effects settings
            maxBloodParticles: options.maxBloodParticles || 200,
            bloodLifetime: options.bloodLifetime || 5000, // ms
            goreIntensity: options.goreIntensity || 0.7, // 0-1
            
            // Combo system settings
            comboTimeWindow: options.comboTimeWindow || 2000, // ms
            maxComboMultiplier: options.maxComboMultiplier || 5.0,
            comboDecayRate: options.comboDecayRate || 0.1,
            
            ...options
        };
        
        // Collision detection system
        this.collisionSystem = new PhysicsCollisionDetector(this.options);
        
        // Damage calculation system
        this.damageCalculator = new RealisticDamageCalculator(this.options);
        
        // Blood and gore effects system
        this.bloodEffects = new BloodEffectsSystem(this.options);
        
        // Combo system
        this.comboSystem = new CombatComboSystem(this.options);
        
        // Combat state tracking
        this.combatState = {
            activeCollisions: new Map(),
            recentHits: new Map(),
            bloodSplatters: [],
            activeEffects: new Set(),
            lastUpdate: Date.now()
        };
        
        // Performance tracking
        this.performance = {
            collisionChecks: 0,
            damageCalculations: 0,
            particlesRendered: 0,
            updateTime: 0
        };
        
        this.logger = electronIntegration.getLogger();
        
        // Initialize combat system
        this.initialize();
    }

    /**
     * Initialize combat system
     */
    initialize() {
        // Initialize subsystems
        this.collisionSystem.initialize();
        this.damageCalculator.initialize();
        this.bloodEffects.initialize();
        this.comboSystem.initialize();
        
        this.emit('initialized', {
            collisionPrecision: this.options.collisionPrecision,
            enabledFeatures: {
                physicsCollision: this.options.enablePhysicsBasedCollision,
                realisticDamage: this.options.enableRealisticDamage,
                bloodEffects: this.options.enableBloodEffects,
                comboSystem: this.options.enableComboSystem
            }
        });
        
        this.logger.info('Realistic Combat System initialized', {
            options: this.options
        });
    }

    /**
     * Update combat system
     */
    update(deltaTime, gameState) {
        const startTime = performance.now();
        
        // Update collision detection
        if (this.options.enablePhysicsBasedCollision) {
            this.updateCollisionDetection(deltaTime, gameState);
        }
        
        // Update blood effects
        if (this.options.enableBloodEffects) {
            this.bloodEffects.update(deltaTime);
        }
        
        // Update combo system
        if (this.options.enableComboSystem) {
            this.comboSystem.update(deltaTime);
        }
        
        // Clean up old combat state
        this.cleanupCombatState(deltaTime);
        
        // Update performance metrics
        this.performance.updateTime = performance.now() - startTime;
        
        this.emit('updated', {
            performance: { ...this.performance },
            activeCollisions: this.combatState.activeCollisions.size,
            bloodSplatters: this.combatState.bloodSplatters.length
        });
    }

    /**
     * Update collision detection system
     */
    updateCollisionDetection(deltaTime, gameState) {
        const { vehicles, zombies, projectiles, environment } = gameState;
        
        // Reset collision counter
        this.performance.collisionChecks = 0;
        
        // Vehicle vs Zombie collisions
        if (vehicles && zombies) {
            this.checkVehicleZombieCollisions(vehicles, zombies);
        }
        
        // Vehicle vs Environment collisions
        if (vehicles && environment) {
            this.checkVehicleEnvironmentCollisions(vehicles, environment);
        }
        
        // Projectile vs Target collisions
        if (projectiles) {
            this.checkProjectileCollisions(projectiles, { zombies, vehicles, environment });
        }
        
        // Zombie vs Zombie collisions (for physics)
        if (zombies) {
            this.checkZombieZombieCollisions(zombies);
        }
    }

    /**
     * Check vehicle vs zombie collisions
     */
    checkVehicleZombieCollisions(vehicles, zombies) {
        for (const vehicle of vehicles) {
            if (!vehicle.isActive) continue;
            
            const vehicleBounds = this.collisionSystem.getBounds(vehicle);
            const nearbyZombies = this.collisionSystem.getNearbyEntities(
                vehicle.position, 
                zombies, 
                vehicleBounds.radius * 2
            );
            
            for (const zombie of nearbyZombies) {
                if (!zombie.isAlive) continue;
                
                const collision = this.collisionSystem.checkCollision(vehicle, zombie);
                if (collision) {
                    this.handleVehicleZombieCollision(vehicle, zombie, collision);
                }
                
                this.performance.collisionChecks++;
            }
        }
    }

    /**
     * Handle vehicle vs zombie collision
     */
    handleVehicleZombieCollision(vehicle, zombie, collision) {
        // Calculate collision data
        const collisionData = this.calculateCollisionData(vehicle, zombie, collision);
        
        // Calculate damage
        const damage = this.damageCalculator.calculateVehicleZombieDamage(collisionData);
        
        // Apply damage to zombie
        this.applyDamageToZombie(zombie, damage, collisionData);
        
        // Apply damage to vehicle (if any)
        if (damage.vehicleDamage > 0) {
            this.applyDamageToVehicle(vehicle, damage.vehicleDamage, collisionData);
        }
        
        // Create blood effects
        if (this.options.enableBloodEffects) {
            this.bloodEffects.createBloodSplatter(collision.point, collisionData.impactVelocity);
        }
        
        // Update combo system
        if (this.options.enableComboSystem) {
            this.comboSystem.registerHit(damage.zombieDamage, collisionData);
        }
        
        // Emit collision event
        this.emit('vehicleZombieCollision', {
            vehicle: vehicle.id,
            zombie: zombie.id,
            damage,
            collision: collisionData,
            timestamp: Date.now()
        });
        
        this.logger.info('Vehicle-Zombie collision', {
            vehicleId: vehicle.id,
            zombieId: zombie.id,
            damage: damage.zombieDamage,
            velocity: collisionData.impactVelocity
        });
    }

    /**
     * Calculate collision data for physics-based damage
     */
    calculateCollisionData(entity1, entity2, collision) {
        // Calculate relative velocity
        const relativeVelocity = {
            x: entity1.velocity.x - (entity2.velocity?.x || 0),
            y: entity1.velocity.y - (entity2.velocity?.y || 0),
            z: entity1.velocity.z - (entity2.velocity?.z || 0)
        };
        
        // Calculate impact velocity magnitude
        const impactVelocity = Math.sqrt(
            relativeVelocity.x ** 2 + 
            relativeVelocity.y ** 2 + 
            relativeVelocity.z ** 2
        );
        
        // Calculate momentum
        const entity1Mass = entity1.mass || entity1.config?.mass || 1500; // kg
        const entity2Mass = entity2.mass || entity2.config?.mass || 70;   // kg
        
        const momentum = entity1Mass * impactVelocity;
        
        // Calculate impact angle
        const impactAngle = this.calculateImpactAngle(
            relativeVelocity, 
            collision.normal
        );
        
        // Calculate contact area (simplified)
        const contactArea = this.calculateContactArea(entity1, entity2, collision);
        
        return {
            impactVelocity,
            momentum,
            impactAngle,
            contactArea,
            relativeVelocity,
            entity1Mass,
            entity2Mass,
            collisionPoint: collision.point,
            collisionNormal: collision.normal,
            penetrationDepth: collision.penetration || 0
        };
    }

    /**
     * Calculate impact angle between velocity and collision normal
     */
    calculateImpactAngle(velocity, normal) {
        const velocityMag = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
        if (velocityMag === 0) return 0;
        
        const normalizedVelocity = {
            x: velocity.x / velocityMag,
            y: velocity.y / velocityMag,
            z: velocity.z / velocityMag
        };
        
        const dotProduct = normalizedVelocity.x * normal.x + 
                          normalizedVelocity.y * normal.y + 
                          normalizedVelocity.z * normal.z;
        
        return Math.acos(Math.abs(dotProduct));
    }

    /**
     * Calculate contact area for collision
     */
    calculateContactArea(entity1, entity2, collision) {
        // Simplified contact area calculation
        const entity1Size = entity1.bounds?.radius || 1.0;
        const entity2Size = entity2.bounds?.radius || 0.5;
        
        const penetration = collision.penetration || 0;
        const baseArea = Math.PI * Math.min(entity1Size, entity2Size) ** 2;
        
        // Increase contact area with deeper penetration
        return baseArea * (1 + penetration * 0.5);
    }

    /**
     * Apply damage to zombie
     */
    applyDamageToZombie(zombie, damage, collisionData) {
        // Apply base damage
        zombie.health -= damage.zombieDamage;
        
        // Apply physics effects
        if (collisionData.impactVelocity > 10) {
            // High-speed impact - apply knockback
            const knockbackForce = collisionData.momentum * 0.001;
            const knockbackDirection = collisionData.collisionNormal;
            
            zombie.velocity = zombie.velocity || { x: 0, y: 0, z: 0 };
            zombie.velocity.x += knockbackDirection.x * knockbackForce;
            zombie.velocity.y += knockbackDirection.y * knockbackForce;
            zombie.velocity.z += knockbackDirection.z * knockbackForce;
            
            // Chance of dismemberment at very high speeds
            if (collisionData.impactVelocity > 20 && Math.random() < 0.3) {
                this.applyDismemberment(zombie, collisionData);
            }
        }
        
        // Apply status effects based on damage type
        if (damage.zombieDamage > zombie.maxHealth * 0.3) {
            zombie.statusEffects = zombie.statusEffects || [];
            zombie.statusEffects.push({
                type: 'stunned',
                duration: 1000 + (damage.zombieDamage * 10),
                startTime: Date.now()
            });
        }
        
        // Check if zombie is killed
        if (zombie.health <= 0) {
            this.handleZombieKill(zombie, damage, collisionData);
        }
    }

    /**
     * Apply dismemberment effects
     */
    applyDismemberment(zombie, collisionData) {
        zombie.dismembered = zombie.dismembered || [];
        
        // Determine which body part to dismember based on impact point
        const bodyPart = this.determineBodyPart(zombie, collisionData.collisionPoint);
        
        if (!zombie.dismembered.includes(bodyPart)) {
            zombie.dismembered.push(bodyPart);
            
            // Create gore effects
            if (this.options.enableBloodEffects) {
                this.bloodEffects.createGoreEffect(
                    collisionData.collisionPoint,
                    bodyPart,
                    collisionData.impactVelocity
                );
            }
            
            this.emit('zombieDismembered', {
                zombieId: zombie.id,
                bodyPart,
                position: collisionData.collisionPoint
            });
        }
    }

    /**
     * Determine which body part was hit
     */
    determineBodyPart(zombie, impactPoint) {
        const zombieCenter = zombie.position;
        const relativeY = impactPoint.y - zombieCenter.y;
        
        if (relativeY > 0.7) return 'head';
        if (relativeY > 0.2) return 'torso';
        if (relativeY > -0.3) return 'arm';
        return 'leg';
    }

    /**
     * Handle zombie kill
     */
    handleZombieKill(zombie, damage, collisionData) {
        zombie.isAlive = false;
        zombie.deathTime = Date.now();
        zombie.deathCause = 'vehicle_collision';
        
        // Create death effects
        if (this.options.enableBloodEffects) {
            this.bloodEffects.createDeathEffect(
                zombie.position,
                collisionData.impactVelocity,
                damage.zombieDamage
            );
        }
        
        // Update combo system
        if (this.options.enableComboSystem) {
            this.comboSystem.registerKill(zombie, damage, collisionData);
        }
        
        this.emit('zombieKilled', {
            zombieId: zombie.id,
            damage,
            collisionData,
            killMethod: 'vehicle_collision'
        });
    }

    /**
     * Apply damage to vehicle
     */
    applyDamageToVehicle(vehicle, damage, collisionData) {
        // Vehicle damage is typically much less than zombie damage
        const actualDamage = damage * 0.1; // 10% of calculated damage
        
        // Apply to vehicle damage system if available
        if (vehicle.damageSystem) {
            vehicle.damageSystem.applyCollisionDamage({
                velocity: collisionData.relativeVelocity,
                direction: collisionData.collisionNormal,
                impactPoint: collisionData.collisionPoint,
                severity: actualDamage / 100
            });
        }
        
        this.emit('vehicleDamaged', {
            vehicleId: vehicle.id,
            damage: actualDamage,
            collisionData
        });
    }

    /**
     * Check vehicle vs environment collisions
     */
    checkVehicleEnvironmentCollisions(vehicles, environment) {
        for (const vehicle of vehicles) {
            if (!vehicle.isActive) continue;
            
            const nearbyObjects = this.collisionSystem.getNearbyEnvironmentObjects(
                vehicle.position,
                environment,
                vehicle.bounds?.radius * 2 || 10
            );
            
            for (const envObject of nearbyObjects) {
                const collision = this.collisionSystem.checkCollision(vehicle, envObject);
                if (collision) {
                    this.handleVehicleEnvironmentCollision(vehicle, envObject, collision);
                }
                
                this.performance.collisionChecks++;
            }
        }
    }

    /**
     * Handle vehicle vs environment collision
     */
    handleVehicleEnvironmentCollision(vehicle, envObject, collision) {
        const collisionData = this.calculateCollisionData(vehicle, envObject, collision);
        
        // Calculate damage based on object type and impact
        const damage = this.damageCalculator.calculateEnvironmentDamage(
            collisionData,
            envObject.type,
            envObject.properties
        );
        
        // Apply damage to vehicle
        if (damage.vehicleDamage > 0) {
            this.applyDamageToVehicle(vehicle, damage.vehicleDamage, collisionData);
        }
        
        // Apply damage to environment object if destructible
        if (envObject.destructible && damage.environmentDamage > 0) {
            this.applyEnvironmentDamage(envObject, damage.environmentDamage, collisionData);
        }
        
        // Create impact effects
        this.createImpactEffects(collision.point, collisionData, envObject.type);
        
        this.emit('vehicleEnvironmentCollision', {
            vehicle: vehicle.id,
            object: envObject.id,
            damage,
            collision: collisionData
        });
    }

    /**
     * Apply damage to environment object
     */
    applyEnvironmentDamage(envObject, damage, collisionData) {
        envObject.health = (envObject.health || envObject.maxHealth) - damage;
        
        if (envObject.health <= 0) {
            this.destroyEnvironmentObject(envObject, collisionData);
        }
    }

    /**
     * Destroy environment object
     */
    destroyEnvironmentObject(envObject, collisionData) {
        envObject.destroyed = true;
        envObject.destructionTime = Date.now();
        
        // Create destruction effects
        this.createDestructionEffects(envObject, collisionData);
        
        this.emit('environmentObjectDestroyed', {
            objectId: envObject.id,
            type: envObject.type,
            position: envObject.position,
            collisionData
        });
    }

    /**
     * Create impact effects for environment collisions
     */
    createImpactEffects(position, collisionData, objectType) {
        const effectType = this.getImpactEffectType(objectType);
        
        this.emit('impactEffect', {
            type: effectType,
            position,
            intensity: Math.min(collisionData.impactVelocity / 20, 1.0),
            direction: collisionData.collisionNormal
        });
    }

    /**
     * Get impact effect type based on object material
     */
    getImpactEffectType(objectType) {
        const effectMap = {
            'concrete': 'concrete_impact',
            'metal': 'metal_impact',
            'wood': 'wood_impact',
            'glass': 'glass_shatter',
            'plastic': 'plastic_impact',
            'default': 'generic_impact'
        };
        
        return effectMap[objectType] || effectMap.default;
    }

    /**
     * Create destruction effects
     */
    createDestructionEffects(envObject, collisionData) {
        this.emit('destructionEffect', {
            objectType: envObject.type,
            position: envObject.position,
            size: envObject.bounds?.radius || 1.0,
            intensity: collisionData.impactVelocity / 15,
            debris: this.generateDebris(envObject, collisionData)
        });
    }

    /**
     * Generate debris for destroyed objects
     */
    generateDebris(envObject, collisionData) {
        const debrisCount = Math.min(Math.floor(collisionData.impactVelocity / 5), 20);
        const debris = [];
        
        for (let i = 0; i < debrisCount; i++) {
            debris.push({
                position: {
                    x: envObject.position.x + (Math.random() - 0.5) * 4,
                    y: envObject.position.y + (Math.random() - 0.5) * 4,
                    z: envObject.position.z + Math.random() * 2
                },
                velocity: {
                    x: (Math.random() - 0.5) * collisionData.impactVelocity * 0.5,
                    y: (Math.random() - 0.5) * collisionData.impactVelocity * 0.5,
                    z: Math.random() * collisionData.impactVelocity * 0.3
                },
                size: 0.1 + Math.random() * 0.3,
                lifetime: 3000 + Math.random() * 2000,
                material: envObject.type
            });
        }
        
        return debris;
    }

    /**
     * Check projectile collisions
     */
    checkProjectileCollisions(projectiles, targets) {
        for (const projectile of projectiles) {
            if (!projectile.isActive) continue;
            
            // Check against zombies
            if (targets.zombies) {
                for (const zombie of targets.zombies) {
                    if (!zombie.isAlive) continue;
                    
                    const collision = this.collisionSystem.checkProjectileCollision(projectile, zombie);
                    if (collision) {
                        this.handleProjectileZombieCollision(projectile, zombie, collision);
                        projectile.isActive = false;
                        break;
                    }
                    
                    this.performance.collisionChecks++;
                }
            }
            
            // Check against environment
            if (projectile.isActive && targets.environment) {
                for (const envObject of targets.environment) {
                    const collision = this.collisionSystem.checkProjectileCollision(projectile, envObject);
                    if (collision) {
                        this.handleProjectileEnvironmentCollision(projectile, envObject, collision);
                        projectile.isActive = false;
                        break;
                    }
                    
                    this.performance.collisionChecks++;
                }
            }
        }
    }

    /**
     * Handle projectile vs zombie collision
     */
    handleProjectileZombieCollision(projectile, zombie, collision) {
        const collisionData = this.calculateProjectileCollisionData(projectile, zombie, collision);
        const damage = this.damageCalculator.calculateProjectileDamage(collisionData, projectile.type);
        
        // Apply damage
        this.applyDamageToZombie(zombie, damage, collisionData);
        
        // Create blood effects
        if (this.options.enableBloodEffects) {
            this.bloodEffects.createProjectileBloodEffect(
                collision.point,
                projectile.velocity,
                damage.zombieDamage
            );
        }
        
        // Update combo system
        if (this.options.enableComboSystem) {
            this.comboSystem.registerProjectileHit(damage.zombieDamage, collisionData, projectile.type);
        }
        
        this.emit('projectileZombieCollision', {
            projectile: projectile.id,
            zombie: zombie.id,
            damage,
            collision: collisionData
        });
    }

    /**
     * Calculate projectile collision data
     */
    calculateProjectileCollisionData(projectile, target, collision) {
        const impactVelocity = Math.sqrt(
            projectile.velocity.x ** 2 + 
            projectile.velocity.y ** 2 + 
            projectile.velocity.z ** 2
        );
        
        return {
            impactVelocity,
            momentum: projectile.mass * impactVelocity,
            impactAngle: this.calculateImpactAngle(projectile.velocity, collision.normal),
            contactArea: Math.PI * (projectile.radius || 0.01) ** 2,
            relativeVelocity: projectile.velocity,
            entity1Mass: projectile.mass || 0.01,
            entity2Mass: target.mass || 70,
            collisionPoint: collision.point,
            collisionNormal: collision.normal,
            penetrationDepth: collision.penetration || 0
        };
    }

    /**
     * Clean up old combat state
     */
    cleanupCombatState(deltaTime) {
        const now = Date.now();
        
        // Clean up old blood splatters
        this.combatState.bloodSplatters = this.combatState.bloodSplatters.filter(
            splatter => now - splatter.timestamp < this.options.bloodLifetime
        );
        
        // Clean up old collision data
        for (const [key, collision] of this.combatState.activeCollisions) {
            if (now - collision.timestamp > 1000) { // 1 second
                this.combatState.activeCollisions.delete(key);
            }
        }
        
        // Clean up recent hits
        for (const [key, hit] of this.combatState.recentHits) {
            if (now - hit.timestamp > 5000) { // 5 seconds
                this.combatState.recentHits.delete(key);
            }
        }
    }

    /**
     * Get combat statistics
     */
    getCombatStats() {
        return {
            performance: { ...this.performance },
            activeCollisions: this.combatState.activeCollisions.size,
            bloodSplatters: this.combatState.bloodSplatters.length,
            recentHits: this.combatState.recentHits.size,
            comboStats: this.comboSystem.getStats(),
            bloodEffectStats: this.bloodEffects.getStats()
        };
    }

    /**
     * Get system status
     */
    getStatus() {
        return {
            isActive: true,
            enabledFeatures: {
                physicsCollision: this.options.enablePhysicsBasedCollision,
                realisticDamage: this.options.enableRealisticDamage,
                bloodEffects: this.options.enableBloodEffects,
                comboSystem: this.options.enableComboSystem
            },
            performance: { ...this.performance },
            combatStats: this.getCombatStats()
        };
    }

    /**
     * Dispose of combat system
     */
    dispose() {
        // Dispose subsystems
        this.collisionSystem.dispose();
        this.damageCalculator.dispose();
        this.bloodEffects.dispose();
        this.comboSystem.dispose();
        
        // Clear state
        this.combatState.activeCollisions.clear();
        this.combatState.recentHits.clear();
        this.combatState.bloodSplatters = [];
        this.combatState.activeEffects.clear();
        
        this.removeAllListeners();
        this.logger.info('Realistic Combat System disposed');
    }
}/**
 *
 Physics-based Collision Detection System
 */
class PhysicsCollisionDetector {
    constructor(options) {
        this.options = options;
        this.spatialGrid = new Map();
        this.gridSize = options.spatialGridSize || 50;
    }

    initialize() {
        this.spatialGrid.clear();
    }

    /**
     * Get bounding box for entity
     */
    getBounds(entity) {
        if (entity.bounds) {
            return entity.bounds;
        }
        
        // Default bounds based on entity type
        const defaultBounds = {
            vehicle: { width: 4.5, height: 1.8, length: 2.0, radius: 3.0 },
            zombie: { width: 0.6, height: 1.8, length: 0.4, radius: 0.5 },
            projectile: { radius: 0.05 },
            environment: { radius: 1.0 }
        };
        
        const entityType = entity.type || 'environment';
        return defaultBounds[entityType] || defaultBounds.environment;
    }

    /**
     * Get nearby entities using spatial partitioning
     */
    getNearbyEntities(position, entities, radius) {
        const nearby = [];
        const gridX = Math.floor(position.x / this.gridSize);
        const gridY = Math.floor(position.y / this.gridSize);
        const searchRadius = Math.ceil(radius / this.gridSize);
        
        for (let x = gridX - searchRadius; x <= gridX + searchRadius; x++) {
            for (let y = gridY - searchRadius; y <= gridY + searchRadius; y++) {
                const gridKey = `${x},${y}`;
                const gridEntities = this.spatialGrid.get(gridKey) || [];
                
                for (const entity of gridEntities) {
                    if (entities.includes(entity)) {
                        const distance = this.calculateDistance(position, entity.position);
                        if (distance <= radius) {
                            nearby.push(entity);
                        }
                    }
                }
            }
        }
        
        return nearby;
    }

    /**
     * Get nearby environment objects
     */
    getNearbyEnvironmentObjects(position, environment, radius) {
        return environment.filter(obj => {
            const distance = this.calculateDistance(position, obj.position);
            return distance <= radius;
        });
    }

    /**
     * Check collision between two entities
     */
    checkCollision(entity1, entity2) {
        const bounds1 = this.getBounds(entity1);
        const bounds2 = this.getBounds(entity2);
        
        // Use appropriate collision detection based on precision setting
        switch (this.options.collisionPrecision) {
            case 'low':
                return this.checkSphereCollision(entity1, entity2, bounds1, bounds2);
            case 'medium':
                return this.checkAABBCollision(entity1, entity2, bounds1, bounds2);
            case 'high':
                return this.checkOBBCollision(entity1, entity2, bounds1, bounds2);
            default:
                return this.checkSphereCollision(entity1, entity2, bounds1, bounds2);
        }
    }

    /**
     * Sphere collision detection (fastest)
     */
    checkSphereCollision(entity1, entity2, bounds1, bounds2) {
        const distance = this.calculateDistance(entity1.position, entity2.position);
        const combinedRadius = bounds1.radius + bounds2.radius;
        
        if (distance <= combinedRadius) {
            const penetration = combinedRadius - distance;
            const direction = this.normalizeVector({
                x: entity2.position.x - entity1.position.x,
                y: entity2.position.y - entity1.position.y,
                z: entity2.position.z - entity1.position.z
            });
            
            return {
                point: {
                    x: entity1.position.x + direction.x * bounds1.radius,
                    y: entity1.position.y + direction.y * bounds1.radius,
                    z: entity1.position.z + direction.z * bounds1.radius
                },
                normal: direction,
                penetration
            };
        }
        
        return null;
    }

    /**
     * AABB collision detection (medium precision)
     */
    checkAABBCollision(entity1, entity2, bounds1, bounds2) {
        const pos1 = entity1.position;
        const pos2 = entity2.position;
        
        const minX1 = pos1.x - bounds1.width / 2;
        const maxX1 = pos1.x + bounds1.width / 2;
        const minY1 = pos1.y - bounds1.length / 2;
        const maxY1 = pos1.y + bounds1.length / 2;
        const minZ1 = pos1.z;
        const maxZ1 = pos1.z + bounds1.height;
        
        const minX2 = pos2.x - bounds2.width / 2;
        const maxX2 = pos2.x + bounds2.width / 2;
        const minY2 = pos2.y - bounds2.length / 2;
        const maxY2 = pos2.y + bounds2.length / 2;
        const minZ2 = pos2.z;
        const maxZ2 = pos2.z + bounds2.height;
        
        if (maxX1 >= minX2 && minX1 <= maxX2 &&
            maxY1 >= minY2 && minY1 <= maxY2 &&
            maxZ1 >= minZ2 && minZ1 <= maxZ2) {
            
            // Calculate collision point and normal
            const overlapX = Math.min(maxX1 - minX2, maxX2 - minX1);
            const overlapY = Math.min(maxY1 - minY2, maxY2 - minY1);
            const overlapZ = Math.min(maxZ1 - minZ2, maxZ2 - minZ1);
            
            const minOverlap = Math.min(overlapX, overlapY, overlapZ);
            let normal;
            
            if (minOverlap === overlapX) {
                normal = { x: pos1.x < pos2.x ? -1 : 1, y: 0, z: 0 };
            } else if (minOverlap === overlapY) {
                normal = { x: 0, y: pos1.y < pos2.y ? -1 : 1, z: 0 };
            } else {
                normal = { x: 0, y: 0, z: pos1.z < pos2.z ? -1 : 1 };
            }
            
            return {
                point: {
                    x: (pos1.x + pos2.x) / 2,
                    y: (pos1.y + pos2.y) / 2,
                    z: (pos1.z + pos2.z) / 2
                },
                normal,
                penetration: minOverlap
            };
        }
        
        return null;
    }

    /**
     * OBB collision detection (highest precision)
     */
    checkOBBCollision(entity1, entity2, bounds1, bounds2) {
        // Simplified OBB collision - in a real implementation, this would
        // use the Separating Axis Theorem (SAT)
        
        // For now, fall back to AABB with rotation consideration
        const rotation1 = entity1.rotation || { x: 0, y: 0, z: 0 };
        const rotation2 = entity2.rotation || { x: 0, y: 0, z: 0 };
        
        // If entities are not rotated much, use AABB
        if (Math.abs(rotation1.z) < 0.1 && Math.abs(rotation2.z) < 0.1) {
            return this.checkAABBCollision(entity1, entity2, bounds1, bounds2);
        }
        
        // Otherwise, use more complex OBB calculation
        return this.checkRotatedBoxCollision(entity1, entity2, bounds1, bounds2);
    }

    /**
     * Rotated box collision detection
     */
    checkRotatedBoxCollision(entity1, entity2, bounds1, bounds2) {
        // Simplified rotated box collision
        // In a production system, this would use proper OBB vs OBB collision
        
        // Transform entity2 to entity1's local space
        const relativePos = this.rotatePoint(
            {
                x: entity2.position.x - entity1.position.x,
                y: entity2.position.y - entity1.position.y,
                z: entity2.position.z - entity1.position.z
            },
            -entity1.rotation.z
        );
        
        // Check collision in local space
        const localEntity2 = {
            position: {
                x: entity1.position.x + relativePos.x,
                y: entity1.position.y + relativePos.y,
                z: entity1.position.z + relativePos.z
            }
        };
        
        return this.checkAABBCollision(entity1, localEntity2, bounds1, bounds2);
    }

    /**
     * Check projectile collision (ray-based)
     */
    checkProjectileCollision(projectile, target) {
        const targetBounds = this.getBounds(target);
        
        // Use ray-sphere intersection for fast projectile collision
        const rayStart = projectile.position;
        const rayDir = this.normalizeVector(projectile.velocity);
        const sphereCenter = target.position;
        const sphereRadius = targetBounds.radius;
        
        const toSphere = {
            x: sphereCenter.x - rayStart.x,
            y: sphereCenter.y - rayStart.y,
            z: sphereCenter.z - rayStart.z
        };
        
        const projLength = this.dotProduct(toSphere, rayDir);
        
        if (projLength < 0) return null; // Behind ray
        
        const closestPoint = {
            x: rayStart.x + rayDir.x * projLength,
            y: rayStart.y + rayDir.y * projLength,
            z: rayStart.z + rayDir.z * projLength
        };
        
        const distance = this.calculateDistance(closestPoint, sphereCenter);
        
        if (distance <= sphereRadius) {
            return {
                point: closestPoint,
                normal: this.normalizeVector({
                    x: closestPoint.x - sphereCenter.x,
                    y: closestPoint.y - sphereCenter.y,
                    z: closestPoint.z - sphereCenter.z
                }),
                penetration: sphereRadius - distance
            };
        }
        
        return null;
    }

    /**
     * Utility functions
     */
    calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = (pos1.z || 0) - (pos2.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    normalizeVector(vector) {
        const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
        if (magnitude === 0) return { x: 0, y: 0, z: 0 };
        
        return {
            x: vector.x / magnitude,
            y: vector.y / magnitude,
            z: vector.z / magnitude
        };
    }

    dotProduct(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    }

    rotatePoint(point, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        return {
            x: point.x * cos - point.y * sin,
            y: point.x * sin + point.y * cos,
            z: point.z
        };
    }

    dispose() {
        this.spatialGrid.clear();
    }
}

/**
 * Realistic Damage Calculator
 */
class RealisticDamageCalculator {
    constructor(options) {
        this.options = options;
        
        // Damage calculation constants
        this.constants = {
            baseDamageMultiplier: 1.0,
            momentumDamageScale: 0.1,
            massEffectScale: 0.05,
            velocityThreshold: 5.0,
            maxDamage: 1000,
            minDamage: 1
        };
    }

    initialize() {
        // Initialize damage calculation system
    }

    /**
     * Calculate vehicle vs zombie damage
     */
    calculateVehicleZombieDamage(collisionData) {
        const { impactVelocity, momentum, impactAngle, entity1Mass, entity2Mass } = collisionData;
        
        // Base damage from momentum
        let baseDamage = momentum * this.constants.momentumDamageScale;
        
        // Velocity multiplier
        const velocityMultiplier = Math.max(1.0, impactVelocity / this.constants.velocityThreshold);
        baseDamage *= velocityMultiplier;
        
        // Mass ratio effect
        const massRatio = entity1Mass / entity2Mass;
        const massMultiplier = 1.0 + (massRatio - 1.0) * this.constants.massEffectScale;
        baseDamage *= massMultiplier;
        
        // Impact angle effect (head-on collisions do more damage)
        const angleMultiplier = 0.5 + 0.5 * Math.cos(impactAngle);
        baseDamage *= angleMultiplier;
        
        // Apply damage multipliers from options
        baseDamage *= this.options.momentumDamageMultiplier;
        
        // Calculate zombie damage
        const zombieDamage = Math.min(
            Math.max(baseDamage, this.constants.minDamage),
            this.constants.maxDamage
        );
        
        // Calculate vehicle damage (much smaller)
        const vehicleDamage = zombieDamage * 0.05 * (entity2Mass / entity1Mass);
        
        return {
            zombieDamage,
            vehicleDamage,
            baseDamage,
            multipliers: {
                velocity: velocityMultiplier,
                mass: massMultiplier,
                angle: angleMultiplier
            }
        };
    }

    /**
     * Calculate projectile damage
     */
    calculateProjectileDamage(collisionData, projectileType) {
        const { impactVelocity, momentum } = collisionData;
        
        // Base damage varies by projectile type
        const projectileDamageMap = {
            bullet: 50,
            shell: 150,
            rocket: 300,
            plasma: 200,
            default: 25
        };
        
        const baseDamage = projectileDamageMap[projectileType] || projectileDamageMap.default;
        
        // Velocity multiplier for projectiles
        const velocityMultiplier = Math.max(0.5, impactVelocity / 100);
        
        const totalDamage = baseDamage * velocityMultiplier;
        
        return {
            zombieDamage: totalDamage,
            vehicleDamage: 0,
            baseDamage,
            multipliers: {
                velocity: velocityMultiplier
            }
        };
    }

    /**
     * Calculate environment collision damage
     */
    calculateEnvironmentDamage(collisionData, objectType, objectProperties) {
        const { impactVelocity, momentum } = collisionData;
        
        // Object hardness affects damage distribution
        const hardnessMap = {
            concrete: { hardness: 0.9, damageToVehicle: 0.8, damageToObject: 0.1 },
            metal: { hardness: 0.8, damageToVehicle: 0.7, damageToObject: 0.2 },
            wood: { hardness: 0.4, damageToVehicle: 0.3, damageToObject: 0.6 },
            glass: { hardness: 0.1, damageToVehicle: 0.1, damageToObject: 0.9 },
            plastic: { hardness: 0.3, damageToVehicle: 0.2, damageToObject: 0.5 },
            default: { hardness: 0.5, damageToVehicle: 0.5, damageToObject: 0.5 }
        };
        
        const material = hardnessMap[objectType] || hardnessMap.default;
        
        // Base damage from momentum
        const baseDamage = momentum * 0.05;
        
        // Apply material properties
        const vehicleDamage = baseDamage * material.damageToVehicle;
        const environmentDamage = baseDamage * material.damageToObject;
        
        return {
            vehicleDamage,
            environmentDamage,
            baseDamage,
            material: material.hardness
        };
    }

    dispose() {
        // Cleanup if needed
    }
}

/**
 * Blood and Gore Effects System
 */
class BloodEffectsSystem {
    constructor(options) {
        this.options = options;
        this.bloodParticles = [];
        this.goreSplatters = [];
        this.maxParticles = options.maxBloodParticles || 200;
    }

    initialize() {
        this.bloodParticles = [];
        this.goreSplatters = [];
    }

    /**
     * Create blood splatter effect
     */
    createBloodSplatter(position, impactVelocity) {
        const particleCount = Math.min(
            Math.floor(impactVelocity / 2),
            this.maxParticles - this.bloodParticles.length
        );
        
        for (let i = 0; i < particleCount; i++) {
            this.bloodParticles.push({
                position: { ...position },
                velocity: {
                    x: (Math.random() - 0.5) * impactVelocity * 0.5,
                    y: (Math.random() - 0.5) * impactVelocity * 0.5,
                    z: Math.random() * impactVelocity * 0.3
                },
                size: 0.05 + Math.random() * 0.15,
                life: this.options.bloodLifetime,
                maxLife: this.options.bloodLifetime,
                color: {
                    r: 0.8 + Math.random() * 0.2,
                    g: 0.1 + Math.random() * 0.1,
                    b: 0.1 + Math.random() * 0.1,
                    a: 0.8 + Math.random() * 0.2
                },
                gravity: 9.81,
                type: 'blood'
            });
        }
    }

    /**
     * Create gore effect for dismemberment
     */
    createGoreEffect(position, bodyPart, impactVelocity) {
        const goreIntensity = this.options.goreIntensity;
        const particleCount = Math.floor(impactVelocity * goreIntensity / 3);
        
        for (let i = 0; i < particleCount; i++) {
            this.bloodParticles.push({
                position: { ...position },
                velocity: {
                    x: (Math.random() - 0.5) * impactVelocity * 0.8,
                    y: (Math.random() - 0.5) * impactVelocity * 0.8,
                    z: Math.random() * impactVelocity * 0.5
                },
                size: 0.1 + Math.random() * 0.3,
                life: this.options.bloodLifetime * 1.5,
                maxLife: this.options.bloodLifetime * 1.5,
                color: {
                    r: 0.6 + Math.random() * 0.3,
                    g: 0.05 + Math.random() * 0.05,
                    b: 0.05 + Math.random() * 0.05,
                    a: 0.9
                },
                gravity: 9.81,
                type: 'gore',
                bodyPart
            });
        }
    }

    /**
     * Create death effect
     */
    createDeathEffect(position, impactVelocity, damage) {
        const intensity = Math.min(damage / 100, 2.0);
        this.createBloodSplatter(position, impactVelocity * intensity);
        
        // Add blood pool
        this.goreSplatters.push({
            position: { ...position },
            size: 0.5 + intensity * 0.5,
            opacity: 0.8,
            life: this.options.bloodLifetime * 2,
            maxLife: this.options.bloodLifetime * 2,
            type: 'blood_pool'
        });
    }

    /**
     * Create projectile blood effect
     */
    createProjectileBloodEffect(position, velocity, damage) {
        const particleCount = Math.min(Math.floor(damage / 10), 20);
        
        for (let i = 0; i < particleCount; i++) {
            this.bloodParticles.push({
                position: { ...position },
                velocity: {
                    x: velocity.x * 0.1 + (Math.random() - 0.5) * 5,
                    y: velocity.y * 0.1 + (Math.random() - 0.5) * 5,
                    z: Math.random() * 3
                },
                size: 0.02 + Math.random() * 0.08,
                life: this.options.bloodLifetime * 0.8,
                maxLife: this.options.bloodLifetime * 0.8,
                color: {
                    r: 0.9,
                    g: 0.1,
                    b: 0.1,
                    a: 0.7
                },
                gravity: 9.81,
                type: 'projectile_blood'
            });
        }
    }

    /**
     * Update blood effects
     */
    update(deltaTime) {
        // Update blood particles
        for (let i = this.bloodParticles.length - 1; i >= 0; i--) {
            const particle = this.bloodParticles[i];
            
            // Update position
            particle.position.x += particle.velocity.x * deltaTime;
            particle.position.y += particle.velocity.y * deltaTime;
            particle.position.z += particle.velocity.z * deltaTime;
            
            // Apply gravity
            particle.velocity.z -= particle.gravity * deltaTime;
            
            // Update life
            particle.life -= deltaTime * 1000;
            
            // Fade out
            const lifeRatio = particle.life / particle.maxLife;
            particle.color.a = lifeRatio * 0.8;
            
            // Remove dead particles
            if (particle.life <= 0 || particle.position.z < 0) {
                this.bloodParticles.splice(i, 1);
            }
        }
        
        // Update gore splatters
        for (let i = this.goreSplatters.length - 1; i >= 0; i--) {
            const splatter = this.goreSplatters[i];
            
            splatter.life -= deltaTime * 1000;
            splatter.opacity = (splatter.life / splatter.maxLife) * 0.8;
            
            if (splatter.life <= 0) {
                this.goreSplatters.splice(i, 1);
            }
        }
    }

    /**
     * Get blood effects statistics
     */
    getStats() {
        return {
            bloodParticles: this.bloodParticles.length,
            goreSplatters: this.goreSplatters.length,
            maxParticles: this.maxParticles
        };
    }

    dispose() {
        this.bloodParticles = [];
        this.goreSplatters = [];
    }
}

/**
 * Combat Combo System
 */
class CombatComboSystem {
    constructor(options) {
        this.options = options;
        this.combo = {
            count: 0,
            multiplier: 1.0,
            lastHitTime: 0,
            totalScore: 0,
            bestCombo: 0
        };
        
        this.comboTypes = {
            kill: { points: 100, multiplier: 1.0 },
            headshot: { points: 200, multiplier: 1.5 },
            multikill: { points: 300, multiplier: 2.0 },
            rampage: { points: 500, multiplier: 3.0 },
            dismember: { points: 150, multiplier: 1.2 }
        };
    }

    initialize() {
        this.resetCombo();
    }

    /**
     * Register a hit for combo system
     */
    registerHit(damage, collisionData) {
        const now = Date.now();
        
        // Check if combo is still active
        if (now - this.combo.lastHitTime > this.options.comboTimeWindow) {
            this.resetCombo();
        }
        
        // Increase combo
        this.combo.count++;
        this.combo.lastHitTime = now;
        
        // Calculate multiplier
        this.updateComboMultiplier();
        
        // Calculate score
        const baseScore = Math.floor(damage * 10);
        const comboScore = Math.floor(baseScore * this.combo.multiplier);
        this.combo.totalScore += comboScore;
        
        // Check for special combo types
        this.checkSpecialCombos(collisionData);
        
        return {
            score: comboScore,
            combo: this.combo.count,
            multiplier: this.combo.multiplier
        };
    }

    /**
     * Register a kill for combo system
     */
    registerKill(zombie, damage, collisionData) {
        const killScore = this.registerHit(damage.zombieDamage, collisionData);
        
        // Bonus for kill
        const killBonus = this.comboTypes.kill.points * this.combo.multiplier;
        this.combo.totalScore += killBonus;
        
        // Check for headshot
        if (this.isHeadshot(zombie, collisionData)) {
            const headshotBonus = this.comboTypes.headshot.points * this.combo.multiplier;
            this.combo.totalScore += headshotBonus;
            
            return {
                ...killScore,
                bonuses: ['kill', 'headshot'],
                totalBonus: killBonus + headshotBonus
            };
        }
        
        return {
            ...killScore,
            bonuses: ['kill'],
            totalBonus: killBonus
        };
    }

    /**
     * Register projectile hit
     */
    registerProjectileHit(damage, collisionData, projectileType) {
        const hitScore = this.registerHit(damage, collisionData);
        
        // Projectile type bonuses
        const projectileBonuses = {
            bullet: 1.0,
            shell: 1.5,
            rocket: 2.0,
            plasma: 1.8
        };
        
        const bonus = (projectileBonuses[projectileType] || 1.0) * 50 * this.combo.multiplier;
        this.combo.totalScore += bonus;
        
        return {
            ...hitScore,
            projectileBonus: bonus
        };
    }

    /**
     * Update combo multiplier
     */
    updateComboMultiplier() {
        // Exponential growth with diminishing returns
        const baseMultiplier = 1.0;
        const growthRate = 0.2;
        const maxMultiplier = this.options.maxComboMultiplier;
        
        this.combo.multiplier = Math.min(
            baseMultiplier + (this.combo.count * growthRate),
            maxMultiplier
        );
        
        // Update best combo
        if (this.combo.count > this.combo.bestCombo) {
            this.combo.bestCombo = this.combo.count;
        }
    }

    /**
     * Check for special combo types
     */
    checkSpecialCombos(collisionData) {
        // Multikill detection (multiple kills in short time)
        // Rampage detection (high combo count)
        // Dismemberment detection
        
        if (this.combo.count >= 10) {
            const rampageBonus = this.comboTypes.rampage.points * this.combo.multiplier;
            this.combo.totalScore += rampageBonus;
        } else if (this.combo.count >= 5) {
            const multikillBonus = this.comboTypes.multikill.points * this.combo.multiplier;
            this.combo.totalScore += multikillBonus;
        }
    }

    /**
     * Check if hit was a headshot
     */
    isHeadshot(zombie, collisionData) {
        const zombieHeight = zombie.bounds?.height || 1.8;
        const headThreshold = zombie.position.z + zombieHeight * 0.8;
        
        return collisionData.collisionPoint.z >= headThreshold;
    }

    /**
     * Update combo system (handle decay)
     */
    update(deltaTime) {
        const now = Date.now();
        
        // Check for combo timeout
        if (now - this.combo.lastHitTime > this.options.comboTimeWindow) {
            this.decayCombo(deltaTime);
        }
    }

    /**
     * Decay combo over time
     */
    decayCombo(deltaTime) {
        if (this.combo.count > 0) {
            this.combo.multiplier = Math.max(
                1.0,
                this.combo.multiplier - this.options.comboDecayRate * deltaTime
            );
            
            if (this.combo.multiplier <= 1.0) {
                this.resetCombo();
            }
        }
    }

    /**
     * Reset combo
     */
    resetCombo() {
        this.combo.count = 0;
        this.combo.multiplier = 1.0;
        this.combo.lastHitTime = 0;
    }

    /**
     * Get combo statistics
     */
    getStats() {
        return {
            currentCombo: this.combo.count,
            multiplier: this.combo.multiplier,
            totalScore: this.combo.totalScore,
            bestCombo: this.combo.bestCombo,
            isActive: Date.now() - this.combo.lastHitTime < this.options.comboTimeWindow
        };
    }

    dispose() {
        this.resetCombo();
    }
}

export default RealisticCombatSystem;