import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ZombieAI } from './ZombieAI';
import { ZombieAbilities } from './ZombieAbilities';
import { ZOMBIE_STATES } from './ZombieConfig';

/**
 * Zombie class representing a single zombie with physics, rendering, AI, and abilities
 */
export class Zombie {
    constructor(type, config, gameEngine) {
        this.id = this._generateId();
        this.type = type;
        this.config = { ...config };
        this.gameEngine = gameEngine;
        
        // 3D rendering components
        this.mesh = null;
        this.animations = new Map();
        this.currentAnimation = null;
        
        // Physics components
        this.body = null;
        
        // Zombie state
        this.position = new THREE.Vector3();
        this.rotation = new THREE.Euler();
        this.velocity = new THREE.Vector3();
        this.health = this.config.health;
        this.maxHealth = this.config.maxHealth;
        this.speed = this.config.speed;
        
        // Movement
        this.moveDirection = new THREE.Vector3();
        this.targetPosition = null;
        
        // Status effects
        this.statusEffects = new Map();
        this.isDestroyed = false;
        this.isDying = false;
        this.deathTimer = 0;
        
        // AI and abilities
        this.ai = null;
        this.abilities = null;
        
        // Visual effects
        this.bloodParticles = null;
        this.damageNumbers = [];
        
        // Audio
        this.audioSource = null;
        this.lastSoundTime = 0;
        
        // Performance optimization
        this.isVisible = true;
        this.lastUpdateTime = 0;
        this.updateInterval = 1/60; // 60 FPS
    }

    /**
     * Initialize the zombie with mesh, physics body, AI, and abilities
     */
    async initialize() {
        try {
            await this._createMesh();
            this._createPhysicsBody();
            this._initializeAI();
            this._initializeAbilities();
            this._setupAudio();
            
            // Add to game engine
            this.gameEngine.addObject(this.mesh, this.body);
            
            console.log(`Zombie ${this.type} initialized successfully`);
            return true;
        } catch (error) {
            console.error(`Failed to initialize zombie ${this.type}:`, error);
            throw error;
        }
    }

    /**
     * Update zombie physics, AI, abilities, and rendering each frame
     */
    update(deltaTime) {
        if (this.isDestroyed) return;
        
        // Throttle updates for performance
        this.lastUpdateTime += deltaTime;
        if (this.lastUpdateTime < this.updateInterval) return;
        
        const actualDeltaTime = this.lastUpdateTime;
        this.lastUpdateTime = 0;
        
        // Update death state
        if (this.isDying) {
            this._updateDeath(actualDeltaTime);
            return;
        }
        
        // Update AI
        if (this.ai) {
            this.ai.update(actualDeltaTime);
        }
        
        // Update abilities
        if (this.abilities) {
            this.abilities.update(actualDeltaTime);
        }
        
        // Update status effects
        this._updateStatusEffects(actualDeltaTime);
        
        // Update physics and movement
        this._updatePhysics(actualDeltaTime);
        this._updateMesh();
        
        // Update animations
        this._updateAnimations(actualDeltaTime);
        
        // Update visual effects
        this._updateVisualEffects(actualDeltaTime);
        
        // Check health
        this._checkHealth();
    }

    /**
     * Apply damage to the zombie
     */
    takeDamage(amount, damageType = 'physical', source = null) {
        if (this.isDestroyed || this.isDying) return 0;
        
        // Apply armor reduction if zombie has armor
        let actualDamage = amount;
        if (this.config.armor) {
            actualDamage = amount * (1 - this.config.armor);
        }
        
        // Apply damage resistance abilities
        if (this.abilities && this.config.abilities.includes('damage_resistance')) {
            actualDamage *= 0.5; // 50% damage reduction
        }
        
        // Apply status effect modifiers
        if (this.statusEffects.has('vulnerable')) {
            actualDamage *= 1.5;
        }
        
        if (this.statusEffects.has('armored')) {
            actualDamage *= 0.7;
        }
        
        // Apply damage
        this.health = Math.max(0, this.health - actualDamage);
        
        // Visual feedback
        this._showDamageNumber(actualDamage);
        this._createBloodEffect();
        this._playSound('hurt');
        
        // AI reaction
        if (this.ai && source) {
            this.ai.setTarget(source);
            this.ai.alertLevel = Math.min(1, this.ai.alertLevel + 0.3);
        }
        
        // Special death effects
        if (this.health <= 0) {
            this._triggerDeathAbilities();
        }
        
        return actualDamage;
    }

    /**
     * Heal the zombie
     */
    heal(amount) {
        if (this.isDestroyed || this.isDying) return;
        
        const oldHealth = this.health;
        this.health = Math.min(this.maxHealth, this.health + amount);
        
        const actualHealing = this.health - oldHealth;
        
        if (actualHealing > 0) {
            this._showHealingNumber(actualHealing);
            this._createHealingEffect();
        }
        
        return actualHealing;
    }

    /**
     * Apply a status effect
     */
    applyStatusEffect(effectName, duration, intensity = 1.0) {
        this.statusEffects.set(effectName, {
            duration,
            intensity,
            startTime: Date.now()
        });
        
        this._onStatusEffectApplied(effectName, intensity);
    }

    /**
     * Remove a status effect
     */
    removeStatusEffect(effectName) {
        if (this.statusEffects.has(effectName)) {
            this._onStatusEffectRemoved(effectName);
            this.statusEffects.delete(effectName);
        }
    }

    /**
     * Get current zombie position
     */
    getPosition() {
        if (this.body) {
            this.position.copy(this.body.position);
        }
        return this.position.clone();
    }

    /**
     * Get current zombie rotation
     */
    getRotation() {
        if (this.body) {
            this.rotation.setFromQuaternion(this.body.quaternion);
        }
        return this.rotation.clone();
    }

    /**
     * Get current zombie velocity
     */
    getVelocity() {
        if (this.body) {
            this.velocity.copy(this.body.velocity);
        }
        return this.velocity.clone();
    }

    /**
     * Set zombie position
     */
    setPosition(position) {
        if (this.body) {
            this.body.position.set(position.x, position.y, position.z);
        }
        if (this.mesh) {
            this.mesh.position.copy(position);
        }
        this.position.copy(position);
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
            velocity: this.getVelocity(),
            state: this.ai ? this.ai.getState() : ZOMBIE_STATES.IDLE,
            isDestroyed: this.isDestroyed,
            isDying: this.isDying
        };
    }

    /**
     * Dispose of the zombie and clean up resources
     */
    dispose() {
        if (this.mesh) {
            this.gameEngine.removeObject(this.mesh, this.body);
        }
        
        // Clean up AI
        if (this.ai) {
            this.ai.dispose();
        }
        
        // Clean up abilities
        if (this.abilities) {
            this.abilities.dispose();
        }
        
        // Clean up audio
        if (this.audioSource) {
            this.audioSource.stop();
        }
        
        // Clean up visual effects
        this._cleanupVisualEffects();
        
        this.isDestroyed = true;
    }

    /**
     * Create the 3D mesh for the zombie
     */
    async _createMesh() {
        // Create a basic geometry for now - in a real implementation,
        // this would load actual 3D models for each zombie type
        const geometry = this._getZombieGeometry();
        const material = this._getZombieMaterial();
        
        this.mesh = new THREE.Group();
        
        // Main body
        const bodyMesh = new THREE.Mesh(geometry, material);
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        this.mesh.add(bodyMesh);
        
        // Add additional details based on zombie type
        this._addZombieDetails();
        
        // Set initial position
        this.mesh.position.set(0, this.config.size.height / 2, 0);
    }

    /**
     * Get geometry based on zombie type
     */
    _getZombieGeometry() {
        const size = this.config.size;
        return new THREE.BoxGeometry(size.width, size.height, size.depth);
    }

    /**
     * Get material based on zombie type
     */
    _getZombieMaterial() {
        return new THREE.MeshLambertMaterial({ 
            color: this.config.color,
            transparent: false,
            opacity: 1.0
        });
    }

    /**
     * Add zombie-specific visual details
     */
    _addZombieDetails() {
        // Add glowing eyes for some zombie types
        if (this.config.abilities.includes('stealth') || this.config.isBoss) {
            this._addGlowingEyes();
        }
        
        // Add special effects for boss zombies
        if (this.config.isBoss) {
            this._addBossEffects();
        }
        
        // Add armor visuals for armored zombies
        if (this.config.armor) {
            this._addArmorVisuals();
        }
    }

    /**
     * Add glowing eyes effect
     */
    _addGlowingEyes() {
        const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        
        leftEye.position.set(-0.1, this.config.size.height * 0.3, this.config.size.depth * 0.4);
        rightEye.position.set(0.1, this.config.size.height * 0.3, this.config.size.depth * 0.4);
        
        this.mesh.add(leftEye);
        this.mesh.add(rightEye);
    }

    /**
     * Add boss-specific visual effects
     */
    _addBossEffects() {
        // Add aura effect
        const auraGeometry = new THREE.RingGeometry(2, 3, 16);
        const auraMaterial = new THREE.MeshBasicMaterial({
            color: 0x8b0000,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        const aura = new THREE.Mesh(auraGeometry, auraMaterial);
        aura.rotation.x = -Math.PI / 2;
        aura.position.y = -this.config.size.height / 2;
        
        this.mesh.add(aura);
    }

    /**
     * Add armor visuals
     */
    _addArmorVisuals() {
        // Add metallic overlay
        const armorGeometry = this._getZombieGeometry();
        const armorMaterial = new THREE.MeshLambertMaterial({
            color: 0x696969,
            transparent: true,
            opacity: 0.7
        });
        
        const armor = new THREE.Mesh(armorGeometry, armorMaterial);
        armor.scale.set(1.05, 1.05, 1.05); // Slightly larger than body
        
        this.mesh.add(armor);
    }

    /**
     * Create physics body for the zombie
     */
    _createPhysicsBody() {
        const size = this.config.size;
        const shape = new CANNON.Box(new CANNON.Vec3(
            size.width / 2,
            size.height / 2,
            size.depth / 2
        ));
        
        this.body = new CANNON.Body({
            mass: this.config.mass || 70, // Average human mass
            shape: shape,
            position: new CANNON.Vec3(0, size.height / 2, 0),
            material: new CANNON.Material({ friction: 0.8, restitution: 0.1 })
        });
        
        // Prevent zombies from falling over easily
        this.body.linearDamping = 0.4;
        this.body.angularDamping = 0.8;
        
        // Lock rotation on X and Z axes to keep zombie upright
        this.body.fixedRotation = true;
        this.body.updateMassProperties();
    }

    /**
     * Initialize AI system
     */
    _initializeAI() {
        this.ai = new ZombieAI(this, this.gameEngine);
    }

    /**
     * Initialize abilities system
     */
    _initializeAbilities() {
        this.abilities = new ZombieAbilities(this, this.gameEngine);
    }

    /**
     * Setup audio system
     */
    _setupAudio() {
        // Audio setup would be implemented here
        // For now, just log sound events
    }

    /**
     * Update physics based on AI movement decisions
     */
    _updatePhysics(deltaTime) {
        if (!this.body || this.isDying) return;
        
        // Apply movement force based on AI decisions
        if (this.moveDirection.length() > 0) {
            const force = this.moveDirection.clone().normalize().multiplyScalar(this.speed * 50);
            this.body.applyForce(new CANNON.Vec3(force.x, 0, force.z), this.body.position);
        }
        
        // Apply gravity if not on ground
        if (this.body.position.y > this.config.size.height / 2 + 0.1) {
            this.body.applyForce(new CANNON.Vec3(0, -500, 0), this.body.position);
        }
    }

    /**
     * Update mesh position and rotation from physics body
     */
    _updateMesh() {
        if (!this.mesh || !this.body) return;
        
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);
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
            this.removeStatusEffect(effectName);
        });
    }

    /**
     * Update individual status effect
     */
    _updateStatusEffect(effectName, effect, deltaTime) {
        switch (effectName) {
            case 'poison':
                if (Math.random() < 0.1) { // 10% chance per frame
                    this.takeDamage(effect.intensity);
                }
                break;
            case 'burning':
                this.takeDamage(effect.intensity * deltaTime);
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
     * Handle status effect application
     */
    _onStatusEffectApplied(effectName, intensity) {
        switch (effectName) {
            case 'frozen':
                // Add ice visual effect
                this._addIceEffect();
                break;
            case 'burning':
                // Add fire visual effect
                this._addFireEffect();
                break;
            case 'poison':
                // Add poison visual effect
                this._addPoisonEffect();
                break;
        }
    }

    /**
     * Handle status effect removal
     */
    _onStatusEffectRemoved(effectName) {
        switch (effectName) {
            case 'frozen':
                this.speed = this.config.speed;
                this._removeIceEffect();
                break;
            case 'stunned':
                this.speed = this.config.speed;
                break;
        }
    }

    /**
     * Update animations
     */
    _updateAnimations(deltaTime) {
        if (!this.ai) return;
        
        const state = this.ai.getState();
        let targetAnimation = 'idle';
        
        switch (state) {
            case ZOMBIE_STATES.WANDERING:
            case ZOMBIE_STATES.CHASING:
                targetAnimation = 'walk';
                break;
            case ZOMBIE_STATES.ATTACKING:
                targetAnimation = 'attack';
                break;
            case ZOMBIE_STATES.DYING:
                targetAnimation = 'death';
                break;
        }
        
        if (this.currentAnimation !== targetAnimation) {
            this._playAnimation(targetAnimation);
        }
    }

    /**
     * Play animation
     */
    _playAnimation(animationName) {
        this.currentAnimation = animationName;
        // Animation implementation would go here
        console.log(`Playing ${animationName} animation for ${this.type}`);
    }

    /**
     * Update visual effects
     */
    _updateVisualEffects(deltaTime) {
        // Update damage numbers
        this.damageNumbers = this.damageNumbers.filter(damageNumber => {
            damageNumber.life -= deltaTime;
            damageNumber.position.y += deltaTime * 2;
            damageNumber.mesh.position.copy(damageNumber.position);
            
            if (damageNumber.life <= 0) {
                this.mesh.remove(damageNumber.mesh);
                return false;
            }
            return true;
        });
    }

    /**
     * Update death state
     */
    _updateDeath(deltaTime) {
        this.deathTimer += deltaTime;
        
        // Fade out over time
        if (this.mesh) {
            const opacity = Math.max(0, 1 - (this.deathTimer / 3.0));
            this.mesh.traverse(child => {
                if (child.material) {
                    child.material.transparent = true;
                    child.material.opacity = opacity;
                }
            });
        }
        
        // Remove after fade out
        if (this.deathTimer > 3.0) {
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
        
        if (this.ai) {
            this.ai._setState(ZOMBIE_STATES.DYING);
        }
        
        this._playSound('death');
        this._createDeathEffect();
        
        // Award points to player
        if (this.gameEngine.scoreManager) {
            this.gameEngine.scoreManager.addPoints(this.config.pointValue);
        }
    }

    /**
     * Trigger death abilities (like explosion on death)
     */
    _triggerDeathAbilities() {
        if (this.abilities && this.config.abilities.includes('explosion_on_death')) {
            this.abilities.useAbility('explosion_on_death');
        }
    }

    /**
     * Show damage number
     */
    _showDamageNumber(damage) {
        const damageText = Math.round(damage).toString();
        
        try {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // Handle test environment where canvas context is not available
            if (!context) {
                return;
            }
            
            canvas.width = 64;
            canvas.height = 32;
            
            context.font = '16px Arial';
            context.fillStyle = '#ff0000';
            context.textAlign = 'center';
            context.fillText(damageText, 32, 20);
            
            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(material);
            
            const position = this.getPosition().clone();
            position.y += this.config.size.height + 0.5;
            
            sprite.position.copy(position);
            sprite.scale.set(1, 0.5, 1);
            
            if (this.mesh) {
                this.mesh.add(sprite);
            }
            
            this.damageNumbers.push({
                mesh: sprite,
                position: position,
                life: 2.0
            });
        } catch (error) {
            // Silently handle canvas errors in test environment
        }
    }

    /**
     * Show healing number
     */
    _showHealingNumber(healing) {
        // Similar to damage number but green
        const healText = '+' + Math.round(healing).toString();
        
        try {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // Handle test environment where canvas context is not available
            if (!context) {
                return;
            }
            
            canvas.width = 64;
            canvas.height = 32;
            
            context.font = '16px Arial';
            context.fillStyle = '#00ff00';
            context.textAlign = 'center';
                context.fillText(healText, 32, 20);
            
            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(material);
            
            const position = this.getPosition().clone();
            position.y += this.config.size.height + 0.5;
            
            sprite.position.copy(position);
            sprite.scale.set(1, 0.5, 1);
            
            if (this.mesh) {
                this.mesh.add(sprite);
            }
            
            this.damageNumbers.push({
                mesh: sprite,
                position: position,
                life: 2.0
            });
        } catch (error) {
            // Silently handle canvas errors in test environment
        }
    }

    /**
     * Create blood effect
     */
    _createBloodEffect() {
        // Blood particle effect implementation
        console.log('Creating blood effect');
    }

    /**
     * Create healing effect
     */
    _createHealingEffect() {
        // Healing particle effect implementation
        console.log('Creating healing effect');
    }

    /**
     * Create death effect
     */
    _createDeathEffect() {
        // Death particle effect implementation
        console.log('Creating death effect');
    }

    /**
     * Add visual status effects
     */
    _addIceEffect() {
        console.log('Adding ice effect');
    }

    _addFireEffect() {
        console.log('Adding fire effect');
    }

    _addPoisonEffect() {
        console.log('Adding poison effect');
    }

    _removeIceEffect() {
        console.log('Removing ice effect');
    }

    /**
     * Clean up visual effects
     */
    _cleanupVisualEffects() {
        this.damageNumbers.forEach(damageNumber => {
            if (damageNumber.mesh.parent) {
                damageNumber.mesh.parent.remove(damageNumber.mesh);
            }
        });
        this.damageNumbers = [];
    }

    /**
     * Play zombie sound
     */
    _playSound(soundType) {
        const currentTime = Date.now();
        if (currentTime - this.lastSoundTime < 500) return; // Throttle sounds
        
        this.lastSoundTime = currentTime;
        
        // Sound implementation would go here
        console.log(`Playing ${this.type} ${soundType} sound`);
    }

    /**
     * Generate unique ID for the zombie
     */
    _generateId() {
        return 'zombie_' + Math.random().toString(36).substr(2, 9);
    }
}