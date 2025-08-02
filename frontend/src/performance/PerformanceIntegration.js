import { PerformanceManager } from './PerformanceManager';
import { ObjectPool } from './ObjectPool';
import { LODSystem } from './LODSystem';
import { TextureOptimizer } from './TextureOptimizer';
import { PerformanceBenchmark } from './PerformanceBenchmark';
import * as THREE from 'three';

/**
 * Performance Integration - Coordinates all performance optimization systems
 */
export class PerformanceIntegration {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.performanceManager = null;
        this.poolManager = null;
        this.lodSystem = null;
        this.textureOptimizer = null;
        this.benchmark = null;
        
        this.isInitialized = false;
        this.updateInterval = 0.1; // Update every 100ms
        this.lastUpdate = 0;
    }

    /**
     * Initialize all performance systems
     */
    async initialize() {
        try {
            // Initialize performance manager
            this.performanceManager = new PerformanceManager(this.gameEngine);
            
            // Initialize pool manager with common pools
            this.poolManager = new ObjectPool();
            this._setupObjectPools();
            
            // Initialize LOD system
            this.lodSystem = new LODSystem(this.gameEngine.camera);
            
            // Initialize texture optimizer
            this.textureOptimizer = new TextureOptimizer();
            
            // Initialize benchmark system
            this.benchmark = new PerformanceBenchmark(this.gameEngine);
            
            // Setup integration between systems
            this._setupIntegration();
            
            this.isInitialized = true;
            console.log('PerformanceIntegration initialized successfully');
            
            return true;
        } catch (error) {
            console.error('Failed to initialize PerformanceIntegration:', error);
            throw error;
        }
    }

    /**
     * Update all performance systems
     */
    update(deltaTime) {
        if (!this.isInitialized) return;

        this.lastUpdate += deltaTime;
        if (this.lastUpdate < this.updateInterval) return;

        this.lastUpdate = 0;

        // Update performance manager (handles LOD and quality adjustment)
        this.performanceManager.update(deltaTime);
        
        // Update LOD system
        this.lodSystem.update(deltaTime);
    }

    /**
     * Set overall quality level
     */
    setQualityLevel(level) {
        if (!this.isInitialized) return;

        this.performanceManager.setQualityLevel(level);
        this.textureOptimizer.setQuality(level);
        
        console.log(`Performance quality set to: ${level}`);
    }

    /**
     * Register vehicle for performance optimization
     */
    registerVehicle(vehicle) {
        if (!this.isInitialized || !vehicle) return;

        // Register for LOD management
        const lodLevels = this.lodSystem.createVehicleLOD(vehicle);
        this.lodSystem.registerObject(vehicle.mesh, lodLevels);
        
        // Enable frustum culling
        this.performanceManager.setFrustumCulling(vehicle.mesh, true);
        
        // Optimize vehicle textures
        if (vehicle.mesh && vehicle.mesh.material) {
            this._optimizeVehicleTextures(vehicle);
        }
    }

    /**
     * Register zombie for performance optimization
     */
    registerZombie(zombie) {
        if (!this.isInitialized || !zombie) return;

        // Register for LOD management
        const lodLevels = this.lodSystem.createZombieLOD(zombie);
        this.lodSystem.registerObject(zombie.mesh, lodLevels);
        
        // Enable frustum culling
        this.performanceManager.setFrustumCulling(zombie.mesh, true);
    }

    /**
     * Get particle from pool
     */
    acquireParticle(type = 'default') {
        if (!this.poolManager) return null;
        
        try {
            return this.poolManager.acquire(`particle_${type}`);
        } catch (error) {
            console.warn(`Failed to acquire particle of type ${type}:`, error);
            return null;
        }
    }

    /**
     * Return particle to pool
     */
    releaseParticle(particle, type = 'default') {
        if (!this.poolManager || !particle) return;
        
        try {
            this.poolManager.release(`particle_${type}`, particle);
        } catch (error) {
            console.warn(`Failed to release particle of type ${type}:`, error);
        }
    }

    /**
     * Get zombie from pool
     */
    acquireZombie(type = 'walker') {
        if (!this.poolManager) return null;
        
        try {
            return this.poolManager.acquire(`zombie_${type}`);
        } catch (error) {
            console.warn(`Failed to acquire zombie of type ${type}:`, error);
            return null;
        }
    }

    /**
     * Return zombie to pool
     */
    releaseZombie(zombie, type = 'walker') {
        if (!this.poolManager || !zombie) return;
        
        try {
            this.poolManager.release(`zombie_${type}`, zombie);
        } catch (error) {
            console.warn(`Failed to release zombie of type ${type}:`, error);
        }
    }

    /**
     * Run performance benchmark
     */
    async runBenchmark() {
        if (!this.benchmark) {
            console.warn('Benchmark system not initialized');
            return null;
        }

        return await this.benchmark.runAllBenchmarks();
    }

    /**
     * Get comprehensive performance statistics
     */
    getPerformanceStats() {
        if (!this.isInitialized) return null;

        return {
            manager: this.performanceManager.getPerformanceStats(),
            lod: this.lodSystem.getStats(),
            pools: this.poolManager.getAllStats(),
            textures: this.textureOptimizer.getStats(),
            timestamp: Date.now()
        };
    }

    /**
     * Get current quality settings
     */
    getCurrentSettings() {
        return this.performanceManager?.getCurrentSettings() || null;
    }

    /**
     * Setup object pools for common game objects
     */
    _setupObjectPools() {
        // Particle pools
        this.poolManager.createPool(
            'particle_default',
            () => this._createParticle('default'),
            (particle) => this._resetParticle(particle),
            50
        );

        this.poolManager.createPool(
            'particle_explosion',
            () => this._createParticle('explosion'),
            (particle) => this._resetParticle(particle),
            20
        );

        this.poolManager.createPool(
            'particle_smoke',
            () => this._createParticle('smoke'),
            (particle) => this._resetParticle(particle),
            30
        );

        // Zombie pools for common types
        const zombieTypes = ['walker', 'runner', 'crawler'];
        zombieTypes.forEach(type => {
            this.poolManager.createPool(
                `zombie_${type}`,
                () => this._createZombieForPool(type),
                (zombie) => this._resetZombie(zombie),
                10
            );
        });

        // Projectile pool
        this.poolManager.createPool(
            'projectile',
            () => this._createProjectile(),
            (projectile) => this._resetProjectile(projectile),
            25
        );
    }

    /**
     * Setup integration between performance systems
     */
    _setupIntegration() {
        // Connect performance manager with texture optimizer
        const originalSetQuality = this.performanceManager.setQualityLevel.bind(this.performanceManager);
        this.performanceManager.setQualityLevel = (level) => {
            originalSetQuality(level);
            this.textureOptimizer.setQuality(level);
        };
    }

    /**
     * Optimize vehicle textures
     */
    _optimizeVehicleTextures(vehicle) {
        const mesh = vehicle.mesh;
        if (!mesh || !mesh.material) return;

        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        
        materials.forEach(material => {
            if (material.map) {
                material.map = this.textureOptimizer.optimizeTexture(material.map);
            }
            if (material.normalMap) {
                material.normalMap = this.textureOptimizer.optimizeTexture(material.normalMap);
            }
            if (material.roughnessMap) {
                material.roughnessMap = this.textureOptimizer.optimizeTexture(material.roughnessMap);
            }
        });
    }

    /**
     * Create particle for pool
     */
    _createParticle(type) {
        const geometry = new THREE.SphereGeometry(0.1, 8, 6);
        let material;
        
        switch (type) {
            case 'explosion':
                material = new THREE.MeshBasicMaterial({ 
                    color: 0xff4400, 
                    transparent: true, 
                    opacity: 0.8 
                });
                break;
            case 'smoke':
                material = new THREE.MeshBasicMaterial({ 
                    color: 0x666666, 
                    transparent: true, 
                    opacity: 0.5 
                });
                break;
            default:
                material = new THREE.MeshBasicMaterial({ 
                    color: 0xffffff, 
                    transparent: true, 
                    opacity: 1.0 
                });
        }
        
        const particle = new THREE.Mesh(geometry, material);
        particle.visible = false;
        
        return particle;
    }

    /**
     * Reset particle state
     */
    _resetParticle(particle) {
        particle.visible = false;
        particle.position.set(0, 0, 0);
        particle.scale.set(1, 1, 1);
        particle.material.opacity = 1.0;
    }

    /**
     * Create zombie for pool (simplified)
     */
    _createZombieForPool(type) {
        // This is a simplified zombie object for pooling
        // In a real implementation, this would create a proper zombie instance
        const geometry = new THREE.BoxGeometry(1, 2, 0.5);
        const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        const mesh = new THREE.Mesh(geometry, material);
        
        return {
            mesh,
            type,
            isActive: false,
            health: 100,
            speed: 1.0
        };
    }

    /**
     * Reset zombie state
     */
    _resetZombie(zombie) {
        zombie.isActive = false;
        zombie.health = 100;
        zombie.mesh.visible = false;
        zombie.mesh.position.set(0, 0, 0);
    }

    /**
     * Create projectile for pool
     */
    _createProjectile() {
        const geometry = new THREE.SphereGeometry(0.05, 6, 4);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const mesh = new THREE.Mesh(geometry, material);
        
        return {
            mesh,
            velocity: new THREE.Vector3(),
            isActive: false,
            damage: 10
        };
    }

    /**
     * Reset projectile state
     */
    _resetProjectile(projectile) {
        projectile.isActive = false;
        projectile.mesh.visible = false;
        projectile.mesh.position.set(0, 0, 0);
        projectile.velocity.set(0, 0, 0);
    }

    /**
     * Dispose of all performance systems
     */
    dispose() {
        if (this.performanceManager) {
            this.performanceManager.dispose();
        }
        
        if (this.poolManager) {
            this.poolManager.clearAll();
        }
        
        if (this.lodSystem) {
            this.lodSystem.dispose();
        }
        
        if (this.textureOptimizer) {
            this.textureOptimizer.dispose();
        }
        
        this.isInitialized = false;
        console.log('PerformanceIntegration disposed');
    }
}