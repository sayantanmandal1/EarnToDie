import * as THREE from 'three';

/**
 * Checkpoint class for level progression and respawn mechanics
 */
export default class Checkpoint {
    constructor(config, scene) {
        this.id = config.id;
        this.position = new THREE.Vector3(config.position.x, 0, config.position.z);
        this.radius = config.radius || 20;
        this.scene = scene;
        
        // State
        this.isActive = false;
        this.isReached = false;
        this.respawnPoint = this.position.clone();
        
        // Visual elements
        this.mesh = null;
        this.particles = null;
        this.light = null;
        
        // Audio
        this.activationSound = null;
        
        this.createVisuals();
    }

    /**
     * Create visual representation of the checkpoint
     */
    createVisuals() {
        // Create checkpoint pillar
        const pillarGeometry = new THREE.CylinderGeometry(2, 3, 10, 8);
        const pillarMaterial = new THREE.MeshLambertMaterial({
            color: this.isActive ? 0x00ff00 : 0x666666,
            emissive: this.isActive ? 0x002200 : 0x000000
        });
        
        this.mesh = new THREE.Mesh(pillarGeometry, pillarMaterial);
        this.mesh.position.copy(this.position);
        this.mesh.position.y = 5;
        this.mesh.userData = { type: 'checkpoint', checkpoint: this };
        
        // Create checkpoint base
        const baseGeometry = new THREE.CylinderGeometry(this.radius, this.radius, 1, 16);
        const baseMaterial = new THREE.MeshLambertMaterial({
            color: this.isActive ? 0x004400 : 0x333333,
            transparent: true,
            opacity: 0.3
        });
        
        const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
        baseMesh.position.copy(this.position);
        baseMesh.position.y = 0.5;
        
        // Group checkpoint elements
        const checkpointGroup = new THREE.Group();
        checkpointGroup.add(this.mesh);
        checkpointGroup.add(baseMesh);
        
        this.scene.add(checkpointGroup);
        
        // Create light for active checkpoints
        if (this.isActive) {
            this.createLight();
        }
    }

    /**
     * Create light effect for active checkpoint
     */
    createLight() {
        this.light = new THREE.PointLight(0x00ff00, 1, 50);
        this.light.position.copy(this.position);
        this.light.position.y = 8;
        this.scene.add(this.light);
    }

    /**
     * Activate the checkpoint
     */
    activate() {
        if (this.isActive) return;
        
        this.isActive = true;
        
        // Update visual appearance
        this.mesh.material.color.setHex(0x00ff00);
        this.mesh.material.emissive.setHex(0x002200);
        
        // Create light
        this.createLight();
        
        // Create particle effect
        this.createActivationEffect();
        
        console.log(`Checkpoint ${this.id} activated`);
    }

    /**
     * Mark checkpoint as reached
     */
    reach() {
        if (this.isReached) return;
        
        this.isReached = true;
        this.activate();
        
        // Update visual to show completion
        this.mesh.material.color.setHex(0x0088ff);
        this.mesh.material.emissive.setHex(0x002244);
        
        if (this.light) {
            this.light.color.setHex(0x0088ff);
        }
        
        // Create completion effect
        this.createCompletionEffect();
        
        console.log(`Checkpoint ${this.id} reached`);
        
        return true;
    }

    /**
     * Check if a position is within checkpoint radius
     */
    isPositionInRange(position) {
        const distance = this.position.distanceTo(position);
        return distance <= this.radius;
    }

    /**
     * Update checkpoint (called each frame)
     */
    update(deltaTime) {
        // Animate light intensity for active checkpoints
        if (this.light && this.isActive) {
            const time = Date.now() * 0.001;
            this.light.intensity = 0.8 + Math.sin(time * 2) * 0.2;
        }
        
        // Rotate checkpoint pillar
        if (this.mesh) {
            this.mesh.rotation.y += deltaTime * 0.5;
        }
    }

    /**
     * Create activation particle effect
     */
    createActivationEffect() {
        const particleCount = 50;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Random position around checkpoint
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * this.radius;
            
            positions[i3] = this.position.x + Math.cos(angle) * radius;
            positions[i3 + 1] = this.position.y + Math.random() * 15;
            positions[i3 + 2] = this.position.z + Math.sin(angle) * radius;
            
            // Green color
            colors[i3] = 0;
            colors[i3 + 1] = 1;
            colors[i3 + 2] = 0;
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });
        
        this.particles = new THREE.Points(particles, particleMaterial);
        this.scene.add(this.particles);
        
        // Animate particles upward and fade out
        const animateParticles = () => {
            if (!this.particles) return;
            
            const positions = this.particles.geometry.attributes.position.array;
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                positions[i3 + 1] += 0.5; // Move up
            }
            
            this.particles.geometry.attributes.position.needsUpdate = true;
            this.particles.material.opacity -= 0.02;
            
            if (this.particles.material.opacity > 0) {
                requestAnimationFrame(animateParticles);
            } else {
                this.scene.remove(this.particles);
                this.particles = null;
            }
        };
        
        animateParticles();
    }

    /**
     * Create completion particle effect
     */
    createCompletionEffect() {
        // Similar to activation effect but with blue particles
        const particleCount = 100;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * this.radius * 1.5;
            
            positions[i3] = this.position.x + Math.cos(angle) * radius;
            positions[i3 + 1] = this.position.y + Math.random() * 20;
            positions[i3 + 2] = this.position.z + Math.sin(angle) * radius;
            
            // Blue color
            colors[i3] = 0;
            colors[i3 + 1] = 0.5;
            colors[i3 + 2] = 1;
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            size: 3,
            vertexColors: true,
            transparent: true,
            opacity: 1.0
        });
        
        const completionParticles = new THREE.Points(particles, particleMaterial);
        this.scene.add(completionParticles);
        
        // Animate completion particles
        const animateCompletion = () => {
            if (!completionParticles) return;
            
            const positions = completionParticles.geometry.attributes.position.array;
            
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                positions[i3 + 1] += 1.0; // Move up faster
            }
            
            completionParticles.geometry.attributes.position.needsUpdate = true;
            completionParticles.material.opacity -= 0.015;
            
            if (completionParticles.material.opacity > 0) {
                requestAnimationFrame(animateCompletion);
            } else {
                this.scene.remove(completionParticles);
            }
        };
        
        animateCompletion();
    }

    /**
     * Get checkpoint data for saving
     */
    getState() {
        return {
            id: this.id,
            isActive: this.isActive,
            isReached: this.isReached,
            position: {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            }
        };
    }

    /**
     * Load checkpoint state
     */
    setState(state) {
        this.isActive = state.isActive;
        this.isReached = state.isReached;
        
        if (this.isActive && !this.light) {
            this.createLight();
        }
        
        // Update visual appearance
        if (this.isReached) {
            this.mesh.material.color.setHex(0x0088ff);
            this.mesh.material.emissive.setHex(0x002244);
            if (this.light) {
                this.light.color.setHex(0x0088ff);
            }
        } else if (this.isActive) {
            this.mesh.material.color.setHex(0x00ff00);
            this.mesh.material.emissive.setHex(0x002200);
        }
    }

    /**
     * Clean up checkpoint resources
     */
    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
        
        if (this.light) {
            this.scene.remove(this.light);
        }
        
        if (this.particles) {
            this.scene.remove(this.particles);
            this.particles.geometry.dispose();
            this.particles.material.dispose();
        }
    }
}