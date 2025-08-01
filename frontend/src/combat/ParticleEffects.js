import * as THREE from 'three';

/**
 * ParticleEffects handles all visual particle effects for combat
 * including blood, sparks, explosions, and damage numbers
 */
export class ParticleEffects {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.scene = gameEngine.scene;
        
        // Particle systems
        this.particleSystems = [];
        this.damageNumbers = [];
        
        // Object pools for performance
        this.particlePool = new Map();
        this.maxPoolSize = 1000;
        
        // Effect configurations
        this.effectConfigs = {
            blood: {
                particleCount: 20,
                lifetime: 2.0,
                speed: 5.0,
                gravity: -9.8,
                color: 0x8b0000,
                size: 0.1
            },
            sparks: {
                particleCount: 15,
                lifetime: 1.5,
                speed: 8.0,
                gravity: -5.0,
                color: 0xffa500,
                size: 0.05
            },
            explosion: {
                particleCount: 50,
                lifetime: 3.0,
                speed: 12.0,
                gravity: -2.0,
                color: 0xff4500,
                size: 0.2
            },
            smoke: {
                particleCount: 30,
                lifetime: 4.0,
                speed: 2.0,
                gravity: 1.0,
                color: 0x555555,
                size: 0.3
            }
        };
        
        this._initializeParticleSystems();
    }

    /**
     * Initialize particle systems
     */
    _initializeParticleSystems() {
        // Pre-create particle geometries and materials
        this.particleGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        
        this.materials = {
            blood: new THREE.MeshBasicMaterial({ color: 0x8b0000, transparent: true }),
            sparks: new THREE.MeshBasicMaterial({ color: 0xffa500, transparent: true }),
            explosion: new THREE.MeshBasicMaterial({ color: 0xff4500, transparent: true }),
            smoke: new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true }),
            fire: new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true }),
            poison: new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true }),
            electric: new THREE.MeshBasicMaterial({ color: 0x0088ff, transparent: true })
        };
        
        console.log('ParticleEffects initialized');
    }

    /**
     * Update all particle effects
     */
    update(deltaTime) {
        // Update particle systems
        this.particleSystems = this.particleSystems.filter(system => {
            system.update(deltaTime);
            if (system.isFinished()) {
                system.dispose();
                return false;
            }
            return true;
        });
        
        // Update damage numbers
        this.damageNumbers = this.damageNumbers.filter(damageNumber => {
            damageNumber.life -= deltaTime;
            damageNumber.position.y += deltaTime * 2;
            damageNumber.mesh.position.copy(damageNumber.position);
            
            // Fade out
            const opacity = Math.max(0, damageNumber.life / damageNumber.maxLife);
            damageNumber.mesh.material.opacity = opacity;
            
            if (damageNumber.life <= 0) {
                this.scene.remove(damageNumber.mesh);
                return false;
            }
            return true;
        });
    }

    /**
     * Create blood splatter effect
     */
    createBloodEffect(position, normal, intensity = 1.0) {
        const config = this.effectConfigs.blood;
        const particleCount = Math.floor(config.particleCount * intensity);
        
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this._createParticle('blood', position, config);
            
            // Random velocity in hemisphere around normal
            const velocity = this._getRandomHemisphereDirection(normal);
            velocity.multiplyScalar(config.speed * (0.5 + Math.random() * 0.5));
            
            particle.velocity = velocity;
            particle.angularVelocity = new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            );
            
            particles.push(particle);
        }
        
        const system = new ParticleSystem(particles, config);
        this.particleSystems.push(system);
        
        return system;
    }

    /**
     * Create spark effect
     */
    createSparkEffect(position, normal, intensity = 1.0) {
        const config = this.effectConfigs.sparks;
        const particleCount = Math.floor(config.particleCount * intensity);
        
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this._createParticle('sparks', position, config);
            
            // Sparks fly in cone around normal
            const velocity = this._getRandomConeDirection(normal, Math.PI / 4);
            velocity.multiplyScalar(config.speed * (0.8 + Math.random() * 0.4));
            
            particle.velocity = velocity;
            particle.trail = true; // Sparks leave trails
            
            particles.push(particle);
        }
        
        const system = new ParticleSystem(particles, config);
        this.particleSystems.push(system);
        
        return system;
    }

    /**
     * Create explosion effect
     */
    createExplosionEffect(position, radius = 5.0) {
        const config = this.effectConfigs.explosion;
        const particles = [];
        
        // Main explosion particles
        for (let i = 0; i < config.particleCount; i++) {
            const particle = this._createParticle('explosion', position, config);
            
            // Random direction in sphere
            const velocity = this._getRandomSphereDirection();
            velocity.multiplyScalar(config.speed * (0.5 + Math.random() * 0.5));
            
            particle.velocity = velocity;
            particle.scale = 0.5 + Math.random() * 1.0;
            
            particles.push(particle);
        }
        
        // Add smoke particles
        const smokeConfig = this.effectConfigs.smoke;
        for (let i = 0; i < smokeConfig.particleCount; i++) {
            const particle = this._createParticle('smoke', position, smokeConfig);
            
            const velocity = this._getRandomSphereDirection();
            velocity.multiplyScalar(smokeConfig.speed * Math.random());
            velocity.y = Math.abs(velocity.y); // Smoke rises
            
            particle.velocity = velocity;
            particle.scale = 1.0 + Math.random() * 2.0;
            
            particles.push(particle);
        }
        
        const system = new ParticleSystem(particles, { ...config, lifetime: 4.0 });
        this.particleSystems.push(system);
        
        // Create shockwave effect
        this._createShockwaveEffect(position, radius);
        
        return system;
    }

    /**
     * Create impact effect
     */
    createImpactEffect(position, normal, intensity = 1.0) {
        // Combine sparks and debris
        this.createSparkEffect(position, normal, intensity * 0.7);
        
        // Add debris particles
        const debrisCount = Math.floor(10 * intensity);
        const particles = [];
        
        for (let i = 0; i < debrisCount; i++) {
            const particle = this._createParticle('smoke', position, this.effectConfigs.smoke);
            
            const velocity = this._getRandomHemisphereDirection(normal);
            velocity.multiplyScalar(3.0 * Math.random());
            
            particle.velocity = velocity;
            particle.scale = 0.2 + Math.random() * 0.3;
            particle.lifetime = 1.0 + Math.random();
            
            particles.push(particle);
        }
        
        const system = new ParticleSystem(particles, this.effectConfigs.smoke);
        this.particleSystems.push(system);
        
        return system;
    }

    /**
     * Create critical hit effect
     */
    createCriticalHitEffect(position) {
        // Golden burst effect
        const particles = [];
        const particleCount = 25;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this._createParticle('sparks', position, this.effectConfigs.sparks);
            particle.mesh.material = new THREE.MeshBasicMaterial({ 
                color: 0xffd700, 
                transparent: true 
            });
            
            const velocity = this._getRandomSphereDirection();
            velocity.multiplyScalar(6.0 + Math.random() * 4.0);
            
            particle.velocity = velocity;
            particle.scale = 0.8 + Math.random() * 0.4;
            
            particles.push(particle);
        }
        
        const system = new ParticleSystem(particles, { 
            ...this.effectConfigs.sparks, 
            lifetime: 2.0 
        });
        this.particleSystems.push(system);
        
        return system;
    }

    /**
     * Create damage over time effect
     */
    createDamageOverTimeEffect(position, damageType) {
        let effectType, color;
        
        switch (damageType) {
            case 'fire':
                effectType = 'fire';
                color = 0xff4500;
                break;
            case 'poison':
                effectType = 'poison';
                color = 0x00ff00;
                break;
            case 'electric':
                effectType = 'electric';
                color = 0x0088ff;
                break;
            default:
                return null;
        }
        
        const particles = [];
        const particleCount = 8;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this._createParticle(effectType, position, {
                lifetime: 1.0,
                size: 0.08
            });
            
            // Particles float upward with slight random movement
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 2.0,
                2.0 + Math.random() * 2.0,
                (Math.random() - 0.5) * 2.0
            );
            
            particle.velocity = velocity;
            particle.scale = 0.5 + Math.random() * 0.5;
            
            particles.push(particle);
        }
        
        const system = new ParticleSystem(particles, { lifetime: 1.5 });
        this.particleSystems.push(system);
        
        return system;
    }

    /**
     * Create damage number display
     */
    createDamageNumber(position, damage, color = '#ffffff') {
        try {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // Handle test environment where canvas context is not available
            if (!context) {
                return null;
            }
            
            canvas.width = 128;
            canvas.height = 64;
            
            // Style the text
            context.font = 'bold 24px Arial';
            context.fillStyle = color;
            context.strokeStyle = '#000000';
            context.lineWidth = 2;
            context.textAlign = 'center';
            
            const text = Math.round(damage).toString();
            
            // Draw text with outline
            context.strokeText(text, 64, 40);
            context.fillText(text, 64, 40);
            
            // Create sprite
            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({ 
                map: texture,
                transparent: true
            });
            const sprite = new THREE.Sprite(material);
            
            sprite.position.copy(position);
            sprite.scale.set(2, 1, 1);
            
            this.scene.add(sprite);
            
            const damageNumber = {
                mesh: sprite,
                position: position.clone(),
                life: 2.0,
                maxLife: 2.0
            };
            
            this.damageNumbers.push(damageNumber);
            
            return damageNumber;
        } catch (error) {
            // Silently handle canvas errors in test environment
            return null;
        }
    }

    /**
     * Create shockwave effect
     */
    _createShockwaveEffect(position, radius) {
        const geometry = new THREE.RingGeometry(0.1, radius, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const shockwave = new THREE.Mesh(geometry, material);
        shockwave.position.copy(position);
        shockwave.rotation.x = -Math.PI / 2;
        
        this.scene.add(shockwave);
        
        // Animate shockwave
        const startTime = Date.now();
        const duration = 1000; // 1 second
        
        const animateShockwave = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1.0) {
                this.scene.remove(shockwave);
                return;
            }
            
            // Expand and fade
            const scale = 1 + progress * 2;
            shockwave.scale.set(scale, scale, scale);
            material.opacity = 0.8 * (1 - progress);
            
            requestAnimationFrame(animateShockwave);
        };
        
        animateShockwave();
    }

    /**
     * Create a single particle
     */
    _createParticle(type, position, config) {
        const geometry = this.particleGeometry;
        const material = this.materials[type].clone();
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.scale.setScalar(config.size || 0.1);
        
        this.scene.add(mesh);
        
        return {
            mesh,
            velocity: new THREE.Vector3(),
            angularVelocity: new THREE.Vector3(),
            lifetime: config.lifetime || 2.0,
            maxLifetime: config.lifetime || 2.0,
            gravity: config.gravity || -9.8,
            scale: 1.0,
            trail: false
        };
    }

    /**
     * Get random direction in hemisphere around normal
     */
    _getRandomHemisphereDirection(normal) {
        const direction = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize();
        
        // Ensure direction is in hemisphere
        if (direction.dot(normal) < 0) {
            direction.negate();
        }
        
        return direction;
    }

    /**
     * Get random direction in cone around normal
     */
    _getRandomConeDirection(normal, angle) {
        const direction = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize();
        
        // Adjust direction to be within cone
        const dot = direction.dot(normal);
        const targetDot = Math.cos(angle);
        
        if (dot < targetDot) {
            const correction = normal.clone().multiplyScalar(targetDot - dot);
            direction.add(correction).normalize();
        }
        
        return direction;
    }

    /**
     * Get random direction in sphere
     */
    _getRandomSphereDirection() {
        return new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize();
    }

    /**
     * Dispose of particle effects
     */
    dispose() {
        // Clean up particle systems
        this.particleSystems.forEach(system => system.dispose());
        this.particleSystems = [];
        
        // Clean up damage numbers
        this.damageNumbers.forEach(damageNumber => {
            this.scene.remove(damageNumber.mesh);
        });
        this.damageNumbers = [];
        
        // Clean up materials
        Object.values(this.materials).forEach(material => material.dispose());
        
        console.log('ParticleEffects disposed');
    }
}

/**
 * Individual particle system class
 */
class ParticleSystem {
    constructor(particles, config) {
        this.particles = particles;
        this.config = config;
        this.age = 0;
        this.finished = false;
    }

    update(deltaTime) {
        this.age += deltaTime;
        
        // Update each particle
        this.particles = this.particles.filter(particle => {
            particle.lifetime -= deltaTime;
            
            if (particle.lifetime <= 0) {
                // Remove particle from scene
                if (particle.mesh.parent) {
                    particle.mesh.parent.remove(particle.mesh);
                }
                return false;
            }
            
            // Update position
            particle.mesh.position.add(
                particle.velocity.clone().multiplyScalar(deltaTime)
            );
            
            // Apply gravity
            particle.velocity.y += particle.gravity * deltaTime;
            
            // Update rotation
            if (particle.angularVelocity) {
                particle.mesh.rotation.x += particle.angularVelocity.x * deltaTime;
                particle.mesh.rotation.y += particle.angularVelocity.y * deltaTime;
                particle.mesh.rotation.z += particle.angularVelocity.z * deltaTime;
            }
            
            // Update scale
            const lifeRatio = particle.lifetime / particle.maxLifetime;
            particle.mesh.scale.setScalar(particle.scale * lifeRatio);
            
            // Update opacity
            particle.mesh.material.opacity = lifeRatio;
            
            return true;
        });
        
        // Mark as finished when no particles remain
        if (this.particles.length === 0) {
            this.finished = true;
        }
    }

    isFinished() {
        return this.finished;
    }

    dispose() {
        this.particles.forEach(particle => {
            if (particle.mesh.parent) {
                particle.mesh.parent.remove(particle.mesh);
            }
        });
        this.particles = [];
    }
}