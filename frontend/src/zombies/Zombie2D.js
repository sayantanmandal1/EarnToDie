/**
 * 2D Zombie class for Desert Survival Game
 * Handles zombie rendering, physics, AI, and combat mechanics in 2D space
 */

import Matter from 'matter-js';

export class Zombie2D {
    constructor(type, config, gameEngine) {
        this.id = this._generateId();
        this.type = type;
        this.config = { ...config };
        this.gameEngine = gameEngine;
        
        // 2D rendering components
        this.sprite = null;
        this.animationState = 'idle';
        this.animationFrame = 0;
        this.animationTimer = 0;
        this.flailTimer = 0;
        this.isFlailing = false;
        
        // Physics components (Matter.js 2D)
        this.body = null;
        
        // Zombie state
        this.position = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.rotation = 0;
        this.health = this.config.health;
        this.maxHealth = this.config.maxHealth;
        this.speed = this.config.speed;
        
        // Movement and AI
        this.moveDirection = { x: 0, y: 0 };
        this.targetPosition = null;
        this.detectionRadius = this.config.detectionRange || 100;
        this.attackRadius = this.config.attackRange || 50; // Increased for easier testing
        
        // Status effects
        this.statusEffects = new Map();
        this.isDestroyed = false;
        this.isDying = false;
        this.deathTimer = 0;
        this.deathDuration = 2.0; // 2 seconds death animation
        
        // Visual effects
        this.bloodParticles = [];
        this.damageNumbers = [];
        this.tintColor = null;
        this.flashTimer = 0;
        
        // Audio
        this.lastSoundTime = 0;
        this.soundCooldown = 1000; // 1 second between sounds
        
        // Performance optimization
        this.isVisible = true;
        this.lastUpdateTime = 0;
        this.updateInterval = 1/30; // 30 FPS for zombies (performance)
        
        // Combat
        this.lastAttackTime = 0;
        this.attackCooldown = this.config.attackCooldown * 1000; // Convert to ms
        this.isAttacking = false;
        this.attackTimer = 0;
        
        // Collision tracking
        this.lastCollisionTime = 0;
        this.collisionCooldown = 500; // 0.5 seconds between collisions
    }

    /**
     * Initialize the 2D zombie with physics body and sprite
     */
    async initialize() {
        try {
            this._createPhysicsBody();
            this._createSprite();
            this._setupAI();
            
            // Register with game engine systems
            if (this.gameEngine.getSystem('spriteRenderer')) {
                this._registerWithRenderer();
            }
            
            console.log(`2D Zombie ${this.type} initialized successfully`);
            return true;
        } catch (error) {
            console.error(`Failed to initialize 2D zombie ${this.type}:`, error);
            throw error;
        }
    }

    /**
     * Update zombie physics, AI, animations, and rendering each frame
     */
    update(deltaTime) {
        if (this.isDestroyed) return;
        
        // Throttle updates for performance
        this.lastUpdateTime += deltaTime;
        if (this.lastUpdateTime < this.updateInterval) return;
        
        const actualDeltaTime = this.lastUpdateTime / 1000; // Convert to seconds
        this.lastUpdateTime = 0;
        
        // Update death state
        if (this.isDying) {
            this._updateDeath(actualDeltaTime);
            return;
        }
        
        // Update AI and movement
        this._updateAI(actualDeltaTime);
        this._updateMovement(actualDeltaTime);
        
        // Update physics
        this._updatePhysics(actualDeltaTime);
        
        // Update animations
        this._updateAnimations(actualDeltaTime);
        
        // Update visual effects
        this._updateVisualEffects(actualDeltaTime);
        
        // Update status effects
        this._updateStatusEffects(actualDeltaTime);
        
        // Update sprite position from physics
        this._updateSpriteFromPhysics();
        
        // Check health and handle death
        this._checkHealth();
    }

    /**
     * Apply damage to the zombie with visual feedback
     */
    takeDamage(amount, damageType = 'impact', source = null) {
        if (this.isDestroyed || this.isDying) return 0;
        
        // Apply armor reduction if zombie has armor
        let actualDamage = amount;
        if (this.config.armor) {
            actualDamage = amount * (1 - this.config.armor);
        }
        
        // Apply damage resistance based on zombie type
        const resistance = this._getDamageResistance(damageType);
        actualDamage *= resistance;
        
        // Apply status effect modifiers
        if (this.statusEffects.has('vulnerable')) {
            actualDamage *= 1.5;
        }
        
        if (this.statusEffects.has('armored')) {
            actualDamage *= 0.7;
        }
        
        // Apply damage
        const oldHealth = this.health;
        this.health = Math.max(0, this.health - actualDamage);
        
        // Visual feedback
        this._showDamageNumber(actualDamage);
        this._createBloodEffect();
        this._flashRed();
        this._startFlailing();
        
        // Audio feedback
        this._playSound('hurt');
        
        // AI reaction - become aggressive toward source
        if (source && this.targetPosition === null) {
            this.targetPosition = { x: source.position.x, y: source.position.y };
        }
        
        // Check for death immediately after damage
        if (this.health <= 0 && oldHealth > 0) {
            this._die();
        }
        
        return actualDamage;
    }

    /**
     * Get current zombie position
     */
    getPosition() {
        if (this.body) {
            return { x: this.body.position.x, y: this.body.position.y };
        }
        return { ...this.position };
    }

    /**
     * Set zombie position
     */
    setPosition(x, y) {
        this.position.x = x;
        this.position.y = y;
        
        if (this.body) {
            Matter.Body.setPosition(this.body, { x, y });
        }
        
        if (this.sprite) {
            this.sprite.x = x;
            this.sprite.y = y;
        }
    }

    /**
     * Get zombie stats for UI display
     */
    getStats() {
        return {
            id: this.id,
            type: this.type,
            health: this.health,
            maxHealth: this.maxHealth,
            speed: this.speed,
            damage: this.config.damage,
            pointValue: this.config.pointValue,
            position: this.getPosition(),
            velocity: this.velocity,
            state: this.animationState,
            isDestroyed: this.isDestroyed,
            isDying: this.isDying
        };
    }

    /**
     * Check if zombie can attack target
     */
    canAttack(target) {
        if (!target || this.isDying || this.isDestroyed) return false;
        
        const currentTime = Date.now();
        if (currentTime - this.lastAttackTime < this.attackCooldown) return false;
        
        const targetPos = target.getPosition();
        const myPos = this.getPosition();
        const distance = this._getDistanceTo(targetPos);
        return distance <= this.attackRadius;
    }

    /**
     * Attack target (vehicle)
     */
    attack(target) {
        if (!this.canAttack(target)) return false;
        
        this.isAttacking = true;
        this.attackTimer = 0;
        this.lastAttackTime = Date.now();
        this.animationState = 'attacking';
        
        // Apply damage to target
        const damage = this.config.damage || 10;
        if (target.takeDamage) {
            target.takeDamage(damage, 'zombie_attack', this);
        }
        
        // Visual and audio feedback
        this._playSound('attack');
        this._createAttackEffect(target);
        
        console.log(`Zombie ${this.type} attacked for ${damage} damage`);
        return true;
    }

    /**
     * Dispose of the zombie and clean up resources
     */
    dispose() {
        if (this.body && this.gameEngine.physics) {
            Matter.World.remove(this.gameEngine.physics.world, this.body);
        }
        
        // Remove sprite from renderer
        if (this.sprite && this.gameEngine.getSystem('spriteRenderer')) {
            this.gameEngine.getSystem('spriteRenderer').removeSprite(this.sprite.id);
        }
        
        // Clean up visual effects
        this._cleanupVisualEffects();
        
        this.isDestroyed = true;
        console.log(`Zombie ${this.id} disposed`);
    }

    /**
     * Create Matter.js physics body for 2D zombie
     */
    _createPhysicsBody() {
        const size = this.config.size;
        const width = size.width * 20; // Scale for 2D world
        const height = size.height * 20;
        
        this.body = Matter.Bodies.rectangle(
            this.position.x,
            this.position.y,
            width,
            height,
            {
                mass: this.config.mass || 70,
                friction: 0.8,
                frictionAir: 0.1,
                restitution: 0.1,
                inertia: Infinity, // Prevent rotation
                render: {
                    fillStyle: this.config.color
                }
            }
        );
        
        // Add collision group
        this.body.collisionFilter = {
            category: 0x0002, // Zombie category
            mask: 0x0001 | 0x0004 // Collide with vehicles and terrain
        };
        
        // Add user data for collision detection
        this.body.userData = {
            type: 'zombie',
            gameObject: this
        };
        
        // Add to physics world
        Matter.World.add(this.gameEngine.physics.world, this.body);
    }

    /**
     * Create sprite for 2D rendering
     */
    _createSprite() {
        const spriteRenderer = this.gameEngine.getSystem('spriteRenderer');
        if (!spriteRenderer) return;
        
        // Create placeholder sprite (would be replaced with actual zombie sprites)
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 30;
        canvas.height = 40;
        
        // Draw zombie shape with green/grey coloring
        ctx.fillStyle = this.config.color;
        ctx.fillRect(0, 0, 30, 40);
        
        // Add ragged clothing effect
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(5, 10, 20, 25);
        
        // Add eyes
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(8, 8, 3, 3);
        ctx.fillRect(19, 8, 3, 3);
        
        // Convert canvas to image
        const img = new Image();
        img.src = canvas.toDataURL();
        
        // Register sprite with renderer
        this.sprite = {
            id: `zombie_${this.id}`,
            image: img,
            x: this.position.x,
            y: this.position.y,
            width: 30,
            height: 40,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            visible: true,
            layer: 5 // Zombies render above terrain but below UI
        };
        
        spriteRenderer.registerSprite(this.sprite.id, this.sprite);
    }

    /**
     * Register with sprite renderer
     */
    _registerWithRenderer() {
        const spriteRenderer = this.gameEngine.getSystem('spriteRenderer');
        if (spriteRenderer && this.sprite) {
            spriteRenderer.registerSprite(this.sprite.id, this.sprite);
        }
    }

    /**
     * Setup basic AI behavior
     */
    _setupAI() {
        this.aiState = 'wandering';
        this.wanderTimer = 0;
        this.wanderDirection = Math.random() * Math.PI * 2;
        this.wanderChangeInterval = 2000 + Math.random() * 3000; // 2-5 seconds
    }

    /**
     * Update AI behavior
     */
    _updateAI(deltaTime) {
        if (this.isDying || this.isDestroyed) return;
        
        // Look for nearby vehicles to chase
        const nearbyVehicle = this._findNearbyVehicle();
        
        if (nearbyVehicle) {
            this.aiState = 'chasing';
            this.targetPosition = nearbyVehicle.getPosition();
            this.animationState = 'walking';
            
            // Try to attack if close enough
            if (this.canAttack(nearbyVehicle)) {
                this.attack(nearbyVehicle);
            }
        } else {
            // Wander around
            this.aiState = 'wandering';
            this.animationState = 'walking';
            
            this.wanderTimer += deltaTime * 1000;
            if (this.wanderTimer >= this.wanderChangeInterval) {
                this.wanderDirection = Math.random() * Math.PI * 2;
                this.wanderTimer = 0;
                this.wanderChangeInterval = 2000 + Math.random() * 3000;
            }
            
            // Set wander target
            const wanderDistance = 50;
            this.targetPosition = {
                x: this.position.x + Math.cos(this.wanderDirection) * wanderDistance,
                y: this.position.y + Math.sin(this.wanderDirection) * wanderDistance
            };
        }
    }

    /**
     * Update movement based on AI decisions
     */
    _updateMovement(deltaTime) {
        if (this.isDying || this.isDestroyed || this.isAttacking) return;
        
        if (this.targetPosition) {
            const dx = this.targetPosition.x - this.position.x;
            const dy = this.targetPosition.y - this.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) { // Don't move if very close to target
                this.moveDirection.x = dx / distance;
                this.moveDirection.y = dy / distance;
            } else {
                this.moveDirection.x = 0;
                this.moveDirection.y = 0;
            }
        }
    }

    /**
     * Update physics based on movement
     */
    _updatePhysics(deltaTime) {
        if (!this.body || this.isDying || this.isDestroyed) return;
        
        // Apply movement force
        if (this.moveDirection.x !== 0 || this.moveDirection.y !== 0) {
            const force = {
                x: this.moveDirection.x * this.speed * 0.01,
                y: this.moveDirection.y * this.speed * 0.01
            };
            
            Matter.Body.applyForce(this.body, this.body.position, force);
        }
        
        // Update position from physics body
        this.position.x = this.body.position.x;
        this.position.y = this.body.position.y;
        this.velocity.x = this.body.velocity.x;
        this.velocity.y = this.body.velocity.y;
    }

    /**
     * Update animations including flailing when hit
     */
    _updateAnimations(deltaTime) {
        this.animationTimer += deltaTime;
        
        // Handle flailing animation when hit
        if (this.isFlailing) {
            this.flailTimer += deltaTime;
            
            // Flail for 0.5 seconds
            if (this.flailTimer >= 0.5) {
                this.isFlailing = false;
                this.flailTimer = 0;
            } else {
                // Create flailing effect by rapidly changing sprite properties
                if (this.sprite) {
                    this.sprite.rotation = (Math.random() - 0.5) * 0.3;
                    this.sprite.scaleX = 0.9 + Math.random() * 0.2;
                    this.sprite.scaleY = 0.9 + Math.random() * 0.2;
                }
            }
        } else {
            // Normal animation
            if (this.sprite) {
                this.sprite.rotation = 0;
                this.sprite.scaleX = 1;
                this.sprite.scaleY = 1;
                
                // Simple walking animation
                if (this.animationState === 'walking') {
                    const walkCycle = Math.sin(this.animationTimer * 8) * 0.1;
                    this.sprite.scaleY = 1 + walkCycle * 0.1;
                }
            }
        }
        
        // Handle attack animation
        if (this.isAttacking) {
            this.attackTimer += deltaTime;
            
            if (this.attackTimer >= 0.3) { // 0.3 second attack animation
                this.isAttacking = false;
                this.attackTimer = 0;
                this.animationState = 'walking';
            } else {
                // Attack animation - lunge forward
                if (this.sprite) {
                    this.sprite.scaleX = 1.2;
                    this.sprite.scaleY = 0.8;
                }
            }
        }
    }

    /**
     * Update visual effects
     */
    _updateVisualEffects(deltaTime) {
        // Update flash effect
        if (this.flashTimer > 0) {
            this.flashTimer -= deltaTime;
            
            if (this.sprite) {
                const flashIntensity = this.flashTimer / 0.2; // 0.2 second flash
                this.sprite.tint = `rgba(255, 0, 0, ${flashIntensity * 0.5})`;
            }
            
            if (this.flashTimer <= 0) {
                if (this.sprite) {
                    this.sprite.tint = null;
                }
            }
        }
        
        // Update damage numbers
        this.damageNumbers = this.damageNumbers.filter(damageNumber => {
            damageNumber.life -= deltaTime;
            damageNumber.y -= deltaTime * 50; // Float upward
            
            if (damageNumber.life <= 0) {
                // Remove damage number sprite
                const spriteRenderer = this.gameEngine.getSystem('spriteRenderer');
                if (spriteRenderer) {
                    spriteRenderer.removeSprite(damageNumber.spriteId);
                }
                return false;
            }
            
            // Update damage number sprite position
            const spriteRenderer = this.gameEngine.getSystem('spriteRenderer');
            if (spriteRenderer) {
                spriteRenderer.updateSprite(damageNumber.spriteId, {
                    x: damageNumber.x,
                    y: damageNumber.y,
                    alpha: damageNumber.life / 2.0
                });
            }
            
            return true;
        });
    }

    /**
     * Update status effects
     */
    _updateStatusEffects(deltaTime) {
        const effectsToRemove = [];
        
        for (const [effectName, effect] of this.statusEffects.entries()) {
            effect.duration -= deltaTime;
            
            if (effect.duration <= 0) {
                effectsToRemove.push(effectName);
            } else {
                this._updateStatusEffect(effectName, effect, deltaTime);
            }
        }
        
        // Remove expired effects
        effectsToRemove.forEach(effectName => {
            this.statusEffects.delete(effectName);
        });
    }

    /**
     * Update individual status effect
     */
    _updateStatusEffect(effectName, effect, deltaTime) {
        switch (effectName) {
            case 'poison':
                if (Math.random() < 0.1) { // 10% chance per frame
                    this.takeDamage(effect.intensity, 'poison');
                }
                break;
            case 'burning':
                this.takeDamage(effect.intensity * deltaTime, 'fire');
                break;
            case 'frozen':
                this.speed = this.config.speed * (1 - effect.intensity);
                break;
            case 'stunned':
                this.speed = 0;
                break;
        }
    }

    /**
     * Update sprite position from physics body
     */
    _updateSpriteFromPhysics() {
        if (this.sprite && this.body) {
            this.sprite.x = this.body.position.x - this.sprite.width / 2;
            this.sprite.y = this.body.position.y - this.sprite.height / 2;
            
            // Update sprite in renderer
            const spriteRenderer = this.gameEngine.getSystem('spriteRenderer');
            if (spriteRenderer) {
                spriteRenderer.updateSprite(this.sprite.id, {
                    x: this.sprite.x,
                    y: this.sprite.y
                });
            }
        }
    }

    /**
     * Update death state
     */
    _updateDeath(deltaTime) {
        this.deathTimer += deltaTime;
        
        // Fade out over time
        if (this.sprite) {
            const opacity = Math.max(0, 1 - (this.deathTimer / this.deathDuration));
            this.sprite.alpha = opacity;
            
            // Update sprite in renderer
            const spriteRenderer = this.gameEngine.getSystem('spriteRenderer');
            if (spriteRenderer) {
                spriteRenderer.updateSprite(this.sprite.id, { alpha: opacity });
            }
        }
        
        // Remove after fade out
        if (this.deathTimer >= this.deathDuration) {
            this.dispose();
        }
    }

    /**
     * Check health and handle death
     */
    _checkHealth() {
        if (this.health <= 0 && !this.isDying) {
            this._die();
        }
    }

    /**
     * Handle zombie death
     */
    _die() {
        this.isDying = true;
        this.deathTimer = 0;
        this.animationState = 'dying';
        
        // Stop movement
        this.moveDirection.x = 0;
        this.moveDirection.y = 0;
        
        if (this.body) {
            Matter.Body.setVelocity(this.body, { x: 0, y: 0 });
        }
        
        // Play death sound
        this._playSound('death');
        
        // Create death effects
        this._createDeathEffect();
        
        // Award points to player (handled by combat system)
        console.log(`Zombie ${this.type} died, worth ${this.config.pointValue} points`);
    }

    /**
     * Find nearby vehicle to chase
     */
    _findNearbyVehicle() {
        // This would integrate with the vehicle system
        // For now, return null (no vehicles found)
        return null;
    }

    /**
     * Get distance to target position
     */
    _getDistanceTo(targetPos) {
        const myPos = this.getPosition();
        const dx = targetPos.x - myPos.x;
        const dy = targetPos.y - myPos.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Get damage resistance based on zombie type and damage type
     */
    _getDamageResistance(damageType) {
        const resistances = {
            walker: { impact: 1.0, explosion: 1.2, fire: 0.8, poison: 0.5 },
            runner: { impact: 0.9, explosion: 1.1, fire: 0.9, poison: 0.6 },
            crawler: { impact: 1.1, explosion: 1.0, fire: 0.7, poison: 0.4 },
            spitter: { impact: 0.8, explosion: 0.9, fire: 1.2, poison: 0.2 },
            bloater: { impact: 1.3, explosion: 0.6, fire: 1.5, poison: 0.1 }
        };
        
        const typeResistances = resistances[this.type] || resistances.walker;
        return typeResistances[damageType] || 1.0;
    }

    /**
     * Start flailing animation when hit
     */
    _startFlailing() {
        this.isFlailing = true;
        this.flailTimer = 0;
    }

    /**
     * Flash red when taking damage
     */
    _flashRed() {
        this.flashTimer = 0.2; // Flash for 0.2 seconds
    }

    /**
     * Show damage number
     */
    _showDamageNumber(damage) {
        const spriteRenderer = this.gameEngine.getSystem('spriteRenderer');
        if (!spriteRenderer) return;
        
        const damageText = Math.round(damage).toString();
        
        try {
            // Create damage number canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) return; // Handle test environment
            
            canvas.width = 64;
            canvas.height = 32;
            
            ctx.font = '16px Arial';
            ctx.fillStyle = '#ff0000';
            ctx.textAlign = 'center';
            ctx.fillText(damageText, 32, 20);
            
            // Convert to image
            const img = new Image();
            img.src = canvas.toDataURL();
            
            // Create damage number sprite
            const spriteId = `damage_${this.id}_${Date.now()}`;
            const damageNumber = {
                spriteId: spriteId,
                x: this.position.x,
                y: this.position.y - 20,
                life: 2.0
            };
            
            spriteRenderer.registerSprite(spriteId, {
                image: img,
                x: damageNumber.x,
                y: damageNumber.y,
                width: 64,
                height: 32,
                alpha: 1,
                layer: 10 // Above everything else
            });
            
            this.damageNumbers.push(damageNumber);
        } catch (error) {
            // Handle canvas errors in test environment
            console.warn('Could not create damage number:', error);
        }
    }

    /**
     * Create blood effect when taking damage
     */
    _createBloodEffect() {
        const spriteRenderer = this.gameEngine.getSystem('spriteRenderer');
        if (spriteRenderer) {
            spriteRenderer.createParticleEffect(
                this.position.x,
                this.position.y,
                5, // particle count
                '#8b0000' // dark red blood
            );
        }
    }

    /**
     * Create attack effect
     */
    _createAttackEffect(target) {
        const spriteRenderer = this.gameEngine.getSystem('spriteRenderer');
        if (spriteRenderer) {
            // Create impact effect at target position
            const targetPos = target.getPosition();
            spriteRenderer.createParticleEffect(
                targetPos.x,
                targetPos.y,
                3,
                '#ffff00' // Yellow impact
            );
        }
    }

    /**
     * Create death effect
     */
    _createDeathEffect() {
        const spriteRenderer = this.gameEngine.getSystem('spriteRenderer');
        if (spriteRenderer) {
            // Create larger blood splatter
            spriteRenderer.createParticleEffect(
                this.position.x,
                this.position.y,
                10,
                '#8b0000'
            );
            
            // Create dust cloud
            spriteRenderer.createDustEffect(
                this.position.x,
                this.position.y,
                1.5
            );
        }
    }

    /**
     * Trigger special death effects based on zombie type
     */
    _triggerDeathEffects() {
        if (this.config.abilities && this.config.abilities.includes('explosion_on_death')) {
            // Create explosion effect
            const spriteRenderer = this.gameEngine.getSystem('spriteRenderer');
            if (spriteRenderer) {
                spriteRenderer.createExplosionEffect(
                    this.position.x,
                    this.position.y,
                    2.0
                );
            }
            
            // Play explosion sound
            this._playSound('explosion');
        }
    }

    /**
     * Clean up visual effects
     */
    _cleanupVisualEffects() {
        const spriteRenderer = this.gameEngine.getSystem('spriteRenderer');
        if (!spriteRenderer) return;
        
        // Remove damage numbers
        this.damageNumbers.forEach(damageNumber => {
            spriteRenderer.removeSprite(damageNumber.spriteId);
        });
        this.damageNumbers = [];
    }

    /**
     * Play zombie sound
     */
    _playSound(soundType) {
        const currentTime = Date.now();
        if (currentTime - this.lastSoundTime < this.soundCooldown) return;
        
        this.lastSoundTime = currentTime;
        
        // Sound implementation would go here
        console.log(`Playing ${this.type} ${soundType} sound`);
    }

    /**
     * Generate unique ID for the zombie
     */
    _generateId() {
        return 'zombie2d_' + Math.random().toString(36).substr(2, 9);
    }
}