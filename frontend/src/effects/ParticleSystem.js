import * as THREE from 'three';

/**
 * Advanced particle system for visual effects
 */
export class ParticleSystem {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.particleGroups = new Map();
        this.activeParticles = [];
        this.particlePool = [];
        this.maxParticles = 1000;
        
        this.initialize();
    }

    initialize() {
        // Create particle pool for performance
        for (let i = 0; i < this.maxParticles; i++) {
            this.particlePool.push(this.createParticle());
        }
        
        console.log('ParticleSystem initialized');
    }

    createParticle() {
        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([0, 0, 0]);
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        
        const material = new THREE.PointsMaterial({
            size: 1.0,
            transparent: true,
            opacity: 1.0,
            vertexColors: true
        });
        
        const particle = new THREE.Points(geometry, material);
        
        // Particle properties
        particle.userData = {
            velocity: new THREE.Vector3(),
            acceleration: new THREE.Vector3(),
            life: 1.0,
            maxLife: 1.0,
            size: 1.0,
            color: new THREE.Color(1, 1, 1),
            active: false
        };
        
        return particle;
    }

    getParticle() {
        // Try to get from pool first
        for (let particle of this.particlePool) {
            if (!particle.userData.active) {
                particle.userData.active = true;
                return particle;
            }
        }
        
        // If pool is exhausted, reuse oldest active particle
        if (this.activeParticles.length > 0) {
            const oldestParticle = this.activeParticles[0];
            this.resetParticle(oldestParticle);
            return oldestParticle;
        }
        
        return null;
    }

    resetParticle(particle) {
        particle.userData.velocity.set(0, 0, 0);
        particle.userData.acceleration.set(0, 0, 0);
        particle.userData.life = 1.0;
        particle.userData.maxLife = 1.0;
        particle.userData.size = 1.0;
        particle.userData.color.set(1, 1, 1);
        particle.userData.active = true;
        particle.visible = true;
    }

    releaseParticle(particle) {
        particle.userData.active = false;
        particle.visible = false;
        
        // Remove from scene
        if (particle.parent) {
            particle.parent.remove(particle);
        }
        
        // Remove from active list
        const index = this.activeParticles.indexOf(particle);
        if (index > -1) {
            this.activeParticles.splice(index, 1);
        }
    }

    /**
     * Create explosion effect
     */
    createExplosion(position, intensity = 1.0, color = 0xff4444) {
        const particleCount = Math.floor(20 * intensity);
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.getParticle();
            if (!particle) continue;
            
            // Set position
            particle.position.copy(position);
            
            // Random velocity in sphere
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 20 * intensity,
                Math.random() * 15 * intensity,
                (Math.random() - 0.5) * 20 * intensity
            );
            
            particle.userData.velocity.copy(velocity);
            particle.userData.acceleration.set(0, -9.8, 0); // Gravity
            particle.userData.life = 1.0;
            particle.userData.maxLife = 1.0 + Math.random() * 2.0;
            particle.userData.size = 2.0 + Math.random() * 3.0;
            particle.userData.color.setHex(color);
            
            // Set material properties
            particle.material.size = particle.userData.size;
            particle.material.color.copy(particle.userData.color);
            
            this.gameEngine.scene.add(particle);
            this.activeParticles.push(particle);
            particles.push(particle);
        }
        
        return particles;
    }

    /**
     * Create blood splatter effect
     */
    createBloodSplatter(position, direction, intensity = 1.0) {
        const particleCount = Math.floor(15 * intensity);
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.getParticle();
            if (!particle) continue;
            
            particle.position.copy(position);
            
            // Velocity in cone around direction
            const spread = 0.5;
            const velocity = direction.clone().normalize();
            velocity.x += (Math.random() - 0.5) * spread;
            velocity.y += (Math.random() - 0.5) * spread;
            velocity.z += (Math.random() - 0.5) * spread;
            velocity.multiplyScalar(10 * intensity);
            
            particle.userData.velocity.copy(velocity);
            particle.userData.acceleration.set(0, -9.8, 0);
            particle.userData.life = 1.0;
            particle.userData.maxLife = 2.0 + Math.random();
            particle.userData.size = 1.0 + Math.random() * 2.0;
            particle.userData.color.setHex(0x880000); // Dark red
            
            particle.material.size = particle.userData.size;
            particle.material.color.copy(particle.userData.color);
            
            this.gameEngine.scene.add(particle);
            this.activeParticles.push(particle);
            particles.push(particle);
        }
        
        return particles;
    }

    /**
     * Create engine smoke effect
     */
    createEngineSmoke(position, velocity, intensity = 1.0) {
        const particle = this.getParticle();
        if (!particle) return null;
        
        particle.position.copy(position);
        
        // Smoke rises and drifts
        const smokeVelocity = velocity.clone();
        smokeVelocity.y += 2.0;
        smokeVelocity.multiplyScalar(0.5);
        
        particle.userData.velocity.copy(smokeVelocity);
        particle.userData.acceleration.set(0, 1.0, 0); // Buoyancy
        particle.userData.life = 1.0;
        particle.userData.maxLife = 3.0;
        particle.userData.size = 3.0 + Math.random() * 2.0;
        particle.userData.color.setHex(0x666666); // Gray smoke
        
        particle.material.size = particle.userData.size;
        particle.material.color.copy(particle.userData.color);
        particle.material.opacity = 0.6;
        
        this.gameEngine.scene.add(particle);
        this.activeParticles.push(particle);
        
        return particle;
    }

    /**
     * Create sparks effect
     */
    createSparks(position, direction, intensity = 1.0) {
        const particleCount = Math.floor(10 * intensity);
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.getParticle();
            if (!particle) continue;
            
            particle.position.copy(position);
            
            // Sparks fly in cone
            const velocity = direction.clone().normalize();
            velocity.x += (Math.random() - 0.5) * 0.8;
            velocity.y += Math.random() * 0.5;
            velocity.z += (Math.random() - 0.5) * 0.8;
            velocity.multiplyScalar(15 * intensity);
            
            particle.userData.velocity.copy(velocity);
            particle.userData.acceleration.set(0, -9.8, 0);
            particle.userData.life = 1.0;
            particle.userData.maxLife = 0.5 + Math.random() * 0.5;
            particle.userData.size = 0.5 + Math.random();
            particle.userData.color.setHex(0xffaa00); // Orange sparks
            
            particle.material.size = particle.userData.size;
            particle.material.color.copy(particle.userData.color);
            
            this.gameEngine.scene.add(particle);
            this.activeParticles.push(particle);
            particles.push(particle);
        }
        
        return particles;
    }

    /**
     * Create dust cloud effect
     */
    createDustCloud(position, intensity = 1.0) {
        const particleCount = Math.floor(8 * intensity);
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.getParticle();
            if (!particle) continue;
            
            particle.position.copy(position);
            particle.position.y += Math.random() * 2.0;
            
            // Dust spreads outward and settles
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                Math.random() * 3,
                (Math.random() - 0.5) * 5
            );
            
            particle.userData.velocity.copy(velocity);
            particle.userData.acceleration.set(0, -2.0, 0);
            particle.userData.life = 1.0;
            particle.userData.maxLife = 2.0 + Math.random();
            particle.userData.size = 4.0 + Math.random() * 3.0;
            particle.userData.color.setHex(0xaa8866); // Dusty brown
            
            particle.material.size = particle.userData.size;
            particle.material.color.copy(particle.userData.color);
            particle.material.opacity = 0.4;
            
            this.gameEngine.scene.add(particle);
            this.activeParticles.push(particle);
            particles.push(particle);
        }
        
        return particles;
    }

    /**
     * Update all active particles
     */
    update(deltaTime) {
        for (let i = this.activeParticles.length - 1; i >= 0; i--) {
            const particle = this.activeParticles[i];
            const userData = particle.userData;
            
            if (!userData.active) {
                this.activeParticles.splice(i, 1);
                continue;
            }
            
            // Update life
            userData.life -= deltaTime / userData.maxLife;
            
            if (userData.life <= 0) {
                this.releaseParticle(particle);
                continue;
            }
            
            // Update physics
            userData.velocity.add(
                userData.acceleration.clone().multiplyScalar(deltaTime)
            );
            
            particle.position.add(
                userData.velocity.clone().multiplyScalar(deltaTime)
            );
            
            // Update visual properties based on life
            const lifeRatio = userData.life;
            particle.material.opacity = lifeRatio * 0.8;
            
            // Fade color for some effects
            if (userData.color.r > 0.5) { // Fire/explosion particles
                particle.material.color.lerp(new THREE.Color(0.2, 0.1, 0.1), 1 - lifeRatio);
            }
            
            // Scale particles over time
            const currentSize = userData.size * (0.5 + lifeRatio * 0.5);
            particle.material.size = currentSize;
        }
    }

    /**
     * Clear all particles
     */
    clear() {
        for (let particle of this.activeParticles) {
            this.releaseParticle(particle);
        }
        this.activeParticles = [];
    }

    /**
     * Get particle count for performance monitoring
     */
    getActiveParticleCount() {
        return this.activeParticles.length;
    }

    /**
     * Dispose of the particle system
     */
    dispose() {
        this.clear();
        
        // Dispose of all particle materials and geometries
        for (let particle of this.particlePool) {
            if (particle.material) {
                particle.material.dispose();
            }
            if (particle.geometry) {
                particle.geometry.dispose();
            }
        }
        
        this.particlePool = [];
        this.particleGroups.clear();
        
        console.log('ParticleSystem disposed');
    }
}