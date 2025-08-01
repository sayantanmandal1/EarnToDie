import { PerformanceIntegration } from './PerformanceIntegration';
import * as THREE from 'three';

/**
 * Performance Example - Demonstrates how to use the performance optimization system
 */
export class PerformanceExample {
    constructor() {
        this.gameEngine = null;
        this.performanceIntegration = null;
        this.vehicles = [];
        this.zombies = [];
        this.particles = [];
    }

    /**
     * Initialize the example with a mock game engine
     */
    async initialize() {
        // Create a mock game engine
        this.gameEngine = this._createMockGameEngine();
        
        // Initialize performance integration
        this.performanceIntegration = new PerformanceIntegration(this.gameEngine);
        await this.performanceIntegration.initialize();
        
        console.log('Performance example initialized');
        return true;
    }

    /**
     * Demonstrate vehicle performance optimization
     */
    demonstrateVehicleOptimization() {
        console.log('=== Vehicle Performance Optimization Demo ===');
        
        // Create a mock vehicle
        const vehicle = this._createMockVehicle();
        this.vehicles.push(vehicle);
        
        // Register vehicle for performance optimization
        this.performanceIntegration.registerVehicle(vehicle);
        
        console.log('Vehicle registered for LOD and texture optimization');
        
        // Show current performance stats
        const stats = this.performanceIntegration.getPerformanceStats();
        console.log('LOD Objects:', stats.lod.totalObjects);
    }

    /**
     * Demonstrate zombie performance optimization
     */
    demonstrateZombieOptimization() {
        console.log('=== Zombie Performance Optimization Demo ===');
        
        // Create multiple zombies
        for (let i = 0; i < 5; i++) {
            const zombie = this._createMockZombie(`zombie_${i}`);
            this.zombies.push(zombie);
            
            // Register zombie for performance optimization
            this.performanceIntegration.registerZombie(zombie);
        }
        
        console.log('5 zombies registered for LOD optimization');
        
        // Show updated stats
        const stats = this.performanceIntegration.getPerformanceStats();
        console.log('Total LOD Objects:', stats.lod.totalObjects);
    }

    /**
     * Demonstrate object pooling
     */
    demonstrateObjectPooling() {
        console.log('=== Object Pooling Demo ===');
        
        // Acquire particles from pool
        for (let i = 0; i < 10; i++) {
            const particle = this.performanceIntegration.acquireParticle('explosion');
            if (particle) {
                this.particles.push(particle);
            }
        }
        
        console.log('Acquired 10 explosion particles from pool');
        
        // Show pool stats
        const stats = this.performanceIntegration.getPerformanceStats();
        console.log('Pool Stats:', stats.pools);
        
        // Release half the particles back to pool
        for (let i = 0; i < 5; i++) {
            const particle = this.particles.pop();
            this.performanceIntegration.releaseParticle(particle, 'explosion');
        }
        
        console.log('Released 5 particles back to pool');
        
        // Show updated pool stats
        const updatedStats = this.performanceIntegration.getPerformanceStats();
        console.log('Updated Pool Stats:', updatedStats.pools);
    }

    /**
     * Demonstrate quality level changes
     */
    demonstrateQualitySettings() {
        console.log('=== Quality Settings Demo ===');
        
        const qualities = ['high', 'medium', 'low', 'auto'];
        
        qualities.forEach(quality => {
            this.performanceIntegration.setQualityLevel(quality);
            const settings = this.performanceIntegration.getCurrentSettings();
            console.log(`${quality.toUpperCase()} Quality:`, {
                shadowMapSize: settings.shadowMapSize,
                pixelRatio: settings.pixelRatio,
                maxZombies: settings.maxZombies,
                particleCount: settings.particleCount
            });
        });
    }

    /**
     * Run performance benchmark
     */
    async demonstrateBenchmark() {
        console.log('=== Performance Benchmark Demo ===');
        console.log('Running performance benchmark...');
        
        try {
            const results = await this.performanceIntegration.runBenchmark();
            
            console.log('Benchmark Results:');
            if (results.frameRate) {
                console.log(`- Frame Rate: ${results.frameRate.average} FPS (avg)`);
                console.log(`- Frame Stability: ${Math.round(results.frameRate.stability)}%`);
            }
            
            if (results.memory) {
                console.log(`- Memory Usage: ${results.memory.averageUsed} MB (avg)`);
                console.log(`- Memory Growth: ${results.memory.growthRate}%`);
            }
            
            if (results.rendering) {
                console.log(`- Render Time: ${results.rendering.averageTime} ms`);
                console.log(`- Render FPS: ${results.rendering.framesPerSecond}`);
            }
            
        } catch (error) {
            console.error('Benchmark failed:', error);
        }
    }

    /**
     * Simulate game update loop
     */
    simulateGameLoop() {
        console.log('=== Game Loop Simulation ===');
        
        let frameCount = 0;
        const maxFrames = 60; // Simulate 1 second at 60 FPS
        
        const updateLoop = () => {
            const deltaTime = 1/60; // 60 FPS
            
            // Update performance system
            this.performanceIntegration.update(deltaTime);
            
            frameCount++;
            
            if (frameCount < maxFrames) {
                setTimeout(updateLoop, 16); // ~60 FPS
            } else {
                console.log('Game loop simulation completed');
                this._showFinalStats();
            }
        };
        
        updateLoop();
    }

    /**
     * Show final performance statistics
     */
    _showFinalStats() {
        console.log('=== Final Performance Statistics ===');
        
        const stats = this.performanceIntegration.getPerformanceStats();
        
        console.log('Performance Manager:', {
            frameRate: Math.round(stats.manager.frameRate),
            qualityLevel: stats.manager.qualityLevel,
            lodObjects: stats.manager.lodObjects
        });
        
        console.log('LOD System:', stats.lod);
        console.log('Object Pools:', stats.pools);
        console.log('Texture Optimizer:', stats.textures);
    }

    /**
     * Create a mock game engine for testing
     */
    _createMockGameEngine() {
        return {
            scene: new THREE.Scene(),
            camera: new THREE.PerspectiveCamera(75, 1, 0.1, 1000),
            renderer: {
                setPixelRatio: () => {},
                shadowMap: { enabled: true },
                info: { render: { calls: 0, triangles: 0 } }
            }
        };
    }

    /**
     * Create a mock vehicle for testing
     */
    _createMockVehicle() {
        const geometry = new THREE.BoxGeometry(2, 1, 4);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0x0066cc,
            map: this._createMockTexture()
        });
        const mesh = new THREE.Mesh(geometry, material);
        
        return {
            id: 'vehicle_' + Date.now(),
            mesh: mesh,
            stats: {
                speed: 60,
                armor: 50,
                fuel: 100
            }
        };
    }

    /**
     * Create a mock zombie for testing
     */
    _createMockZombie(id) {
        const geometry = new THREE.BoxGeometry(1, 2, 0.5);
        const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        const mesh = new THREE.Mesh(geometry, material);
        
        return {
            id: id,
            mesh: mesh,
            health: 100,
            speed: 10,
            type: 'walker'
        };
    }

    /**
     * Create a mock texture for testing
     */
    _createMockTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0066cc';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(16, 16, 32, 32);
        
        return new THREE.CanvasTexture(canvas);
    }

    /**
     * Clean up resources
     */
    dispose() {
        if (this.performanceIntegration) {
            this.performanceIntegration.dispose();
        }
        
        // Clean up mock objects
        this.vehicles = [];
        this.zombies = [];
        this.particles = [];
        
        console.log('Performance example disposed');
    }
}

// Example usage
export async function runPerformanceExample() {
    console.log('Starting Performance Optimization Example...\n');
    
    const example = new PerformanceExample();
    
    try {
        await example.initialize();
        
        example.demonstrateVehicleOptimization();
        console.log('');
        
        example.demonstrateZombieOptimization();
        console.log('');
        
        example.demonstrateObjectPooling();
        console.log('');
        
        example.demonstrateQualitySettings();
        console.log('');
        
        await example.demonstrateBenchmark();
        console.log('');
        
        example.simulateGameLoop();
        
    } catch (error) {
        console.error('Example failed:', error);
    } finally {
        // Clean up after a delay to allow simulation to complete
        setTimeout(() => {
            example.dispose();
        }, 2000);
    }
}