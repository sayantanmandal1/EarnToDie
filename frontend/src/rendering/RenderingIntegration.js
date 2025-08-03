/**
 * Rendering Integration System
 * Integrates advanced rendering optimizations with the game engine
 */
import AdvancedRenderingOptimizer from './AdvancedRenderingOptimizer';
import * as THREE from 'three';

class RenderingIntegration {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.optimizer = null;
        
        // Integration state
        this.isInitialized = false;
        this.isEnabled = true;
        this.updateInterval = 16; // ~60fps
        this.lastUpdate = 0;
        
        // Performance targets
        this.performanceTargets = {
            targetFPS: 60,
            minFPS: 30,
            maxFrameTime: 33.33, // 30fps
            memoryLimit: 512 // MB
        };
        
        // Quality presets
        this.qualityPresets = {
            potato: {
                name: 'Potato',
                shadowRes: 128,
                textureRes: 256,
                lodBias: 2.0,
                particleQuality: 0.2,
                postProcessing: false,
                antialiasing: false
            },
            low: {
                name: 'Low',
                shadowRes: 256,
                textureRes: 512,
                lodBias: 1.5,
                particleQuality: 0.4,
                postProcessing: false,
                antialiasing: false
            },
            medium: {
                name: 'Medium',
                shadowRes: 512,
                textureRes: 1024,
                lodBias: 1.0,
                particleQuality: 0.6,
                postProcessing: true,
                antialiasing: false
            },
            high: {
                name: 'High',
                shadowRes: 1024,
                textureRes: 2048,
                lodBias: 0.8,
                particleQuality: 0.8,
                postProcessing: true,
                antialiasing: true
            },
            ultra: {
                name: 'Ultra',
                shadowRes: 2048,
                textureRes: 4096,
                lodBias: 0.5,
                particleQuality: 1.0,
                postProcessing: true,
                antialiasing: true
            }
        };
        
        this.initialize();
    }
    
    /**
     * Initialize the rendering integration
     */
    initialize() {
        try {
            this.setupRenderer();
            this.setupOptimizer();
            this.setupGameIntegration();
            this.setupPerformanceMonitoring();
            
            this.isInitialized = true;
            console.log('Rendering Integration initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Rendering Integration:', error);
            this.isInitialized = false;
        }
    }
    
    /**
     * Setup renderer integration
     */
    setupRenderer() {
        // Get renderer from game engine
        this.renderer = this.gameEngine.getRenderer();
        this.scene = this.gameEngine.getScene();
        this.camera = this.gameEngine.getCamera();
        
        if (!this.renderer || !this.scene || !this.camera) {
            throw new Error('Game engine components not available');
        }
        
        // Configure renderer for optimization
        this.configureRenderer();
    }
    
    /**
     * Configure renderer settings
     */
    configureRenderer() {
        // Enable shadow mapping
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Enable tone mapping
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        // Set pixel ratio for performance
        const pixelRatio = Math.min(window.devicePixelRatio, 2);
        this.renderer.setPixelRatio(pixelRatio);
        
        // Enable automatic clearing
        this.renderer.autoClear = true;
        this.renderer.autoClearColor = true;
        this.renderer.autoClearDepth = true;
        this.renderer.autoClearStencil = true;
    }
    
    /**
     * Setup advanced rendering optimizer
     */
    setupOptimizer() {
        this.optimizer = new AdvancedRenderingOptimizer(
            this.renderer,
            this.scene,
            this.camera
        );
        
        // Configure optimizer based on device capabilities
        this.configureOptimizerForDevice();
    }
    
    /**
     * Configure optimizer based on device capabilities
     */
    configureOptimizerForDevice() {
        const capabilities = this.detectDeviceCapabilities();
        
        // Set quality based on device
        let qualityLevel = 'medium';
        if (capabilities.isHighEnd) {
            qualityLevel = 'high';
        } else if (capabilities.isLowEnd) {
            qualityLevel = 'low';
        }
        
        this.optimizer.setQualityLevel(qualityLevel);
        
        // Configure features based on capabilities
        if (!capabilities.supportsWebGL2) {
            this.optimizer.cullingSystem.occlusionCulling = false;
        }
        
        if (capabilities.limitedMemory) {
            this.optimizer.textureStreaming.maxTextureSize = 1024;
        }
        
        console.log(`Configured for ${capabilities.deviceType} device with ${qualityLevel} quality`);
    }
    
    /**
     * Detect device capabilities
     */
    detectDeviceCapabilities() {
        const gl = this.renderer.getContext();
        const capabilities = {
            deviceType: 'desktop',
            isHighEnd: false,
            isLowEnd: false,
            supportsWebGL2: gl instanceof WebGL2RenderingContext,
            limitedMemory: false,
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)
        };
        
        // Detect mobile devices
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            capabilities.deviceType = 'mobile';
            capabilities.limitedMemory = true;
        }
        
        // Detect device performance tier
        const memoryInfo = navigator.deviceMemory || 4; // Default to 4GB if not available
        const hardwareConcurrency = navigator.hardwareConcurrency || 4;
        
        if (memoryInfo >= 8 && hardwareConcurrency >= 8) {
            capabilities.isHighEnd = true;
        } else if (memoryInfo <= 2 || hardwareConcurrency <= 2) {
            capabilities.isLowEnd = true;
            capabilities.limitedMemory = true;
        }
        
        return capabilities;
    }
    
    /**
     * Setup game engine integration
     */
    setupGameIntegration() {
        // Register with game engine update loop
        this.gameEngine.registerUpdateCallback('rendering', (deltaTime) => {
            this.update(deltaTime);
        });
        
        // Register for game events
        this.gameEngine.on('sceneChanged', () => {
            this.handleSceneChange();
        });
        
        this.gameEngine.on('qualityChanged', (quality) => {
            this.handleQualityChange(quality);
        });
        
        // Register LOD objects from game
        this.registerGameObjects();
    }
    
    /**
     * Register game objects for LOD management
     */
    registerGameObjects() {
        // Register vehicles
        const vehicles = this.gameEngine.getVehicles();
        vehicles.forEach(vehicle => {
            this.registerVehicleLOD(vehicle);
        });
        
        // Register environment objects
        const environmentObjects = this.gameEngine.getEnvironmentObjects();
        environmentObjects.forEach(obj => {
            this.registerEnvironmentLOD(obj);
        });
        
        // Register zombies
        const zombies = this.gameEngine.getZombies();
        zombies.forEach(zombie => {
            this.registerZombieLOD(zombie);
        });
    }
    
    /**
     * Register vehicle for LOD management
     */
    registerVehicleLOD(vehicle) {
        const lodLevels = [
            { distance: 50, geometry: vehicle.highDetailGeometry, material: vehicle.highDetailMaterial },
            { distance: 100, geometry: vehicle.mediumDetailGeometry, material: vehicle.mediumDetailMaterial },
            { distance: 200, geometry: vehicle.lowDetailGeometry, material: vehicle.lowDetailMaterial },
            { distance: 500, geometry: vehicle.impostorGeometry, material: vehicle.impostorMaterial }
        ];
        
        this.optimizer.registerLODObject(vehicle.mesh, lodLevels);
    }
    
    /**
     * Register environment object for LOD management
     */
    registerEnvironmentLOD(envObject) {
        if (envObject.lodLevels) {
            this.optimizer.registerLODObject(envObject.mesh, envObject.lodLevels);
        }
    }
    
    /**
     * Register zombie for LOD management
     */
    registerZombieLOD(zombie) {
        const lodLevels = [
            { distance: 30, geometry: zombie.highDetailGeometry, material: zombie.highDetailMaterial },
            { distance: 60, geometry: zombie.mediumDetailGeometry, material: zombie.mediumDetailMaterial },
            { distance: 120, geometry: zombie.lowDetailGeometry, material: zombie.lowDetailMaterial },
            { distance: 250, geometry: zombie.impostorGeometry, material: zombie.impostorMaterial }
        ];
        
        this.optimizer.registerLODObject(zombie.mesh, lodLevels);
    }
    
    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        this.performanceMonitor = {
            enabled: true,
            samples: [],
            maxSamples: 300, // 5 seconds at 60fps
            alertThreshold: 0.8, // Alert when performance drops below 80% of target
            lastAlert: 0,
            alertCooldown: 5000 // 5 seconds between alerts
        };
    }
    
    /**
     * Main update function
     */
    update(deltaTime) {
        if (!this.isInitialized || !this.isEnabled) return;
        
        const now = performance.now();
        if (now - this.lastUpdate < this.updateInterval) return;
        
        this.lastUpdate = now;
        
        // Update optimizer
        this.optimizer.update();
        
        // Monitor performance
        this.monitorPerformance();
        
        // Handle automatic quality adjustment
        this.handleAutomaticQualityAdjustment();
    }
    
    /**
     * Monitor performance and trigger alerts if needed
     */
    monitorPerformance() {
        const metrics = this.optimizer.getPerformanceMetrics();
        const monitor = this.performanceMonitor;
        
        // Store performance sample
        monitor.samples.push({
            timestamp: performance.now(),
            fps: metrics.fps,
            frameTime: metrics.frameTime,
            drawCalls: metrics.drawCalls,
            memory: metrics.memoryUsage
        });
        
        // Limit sample history
        if (monitor.samples.length > monitor.maxSamples) {
            monitor.samples.shift();
        }
        
        // Check for performance issues
        const avgFPS = this.getAverageMetric('fps', 60); // Last 1 second
        const targetFPS = this.performanceTargets.targetFPS;
        
        if (avgFPS < targetFPS * monitor.alertThreshold) {
            this.handlePerformanceAlert(avgFPS, targetFPS);
        }
    }
    
    /**
     * Get average metric over specified number of samples
     */
    getAverageMetric(metric, samples) {
        const recentSamples = this.performanceMonitor.samples.slice(-samples);
        if (recentSamples.length === 0) return 0;
        
        const sum = recentSamples.reduce((acc, sample) => acc + sample[metric], 0);
        return sum / recentSamples.length;
    }
    
    /**
     * Handle performance alert
     */
    handlePerformanceAlert(currentFPS, targetFPS) {
        const now = performance.now();
        const monitor = this.performanceMonitor;
        
        if (now - monitor.lastAlert < monitor.alertCooldown) return;
        
        monitor.lastAlert = now;
        
        console.warn(`Performance alert: FPS ${currentFPS.toFixed(1)} below target ${targetFPS}`);
        
        // Trigger automatic quality reduction
        this.optimizer.decreaseQuality();
        
        // Notify game engine
        this.gameEngine.emit('performanceAlert', {
            currentFPS,
            targetFPS,
            severity: (targetFPS - currentFPS) / targetFPS
        });
    }
    
    /**
     * Handle automatic quality adjustment
     */
    handleAutomaticQualityAdjustment() {
        const metrics = this.optimizer.getPerformanceMetrics();
        const targets = this.performanceTargets;
        
        // Check memory usage
        if (metrics.memoryUsage > targets.memoryLimit) {
            this.handleMemoryPressure(metrics.memoryUsage);
        }
        
        // Check frame time consistency
        const frameTimeVariance = this.getFrameTimeVariance();
        if (frameTimeVariance > 10) { // High variance indicates stuttering
            this.handleFrameTimeVariance(frameTimeVariance);
        }
    }
    
    /**
     * Handle memory pressure
     */
    handleMemoryPressure(memoryUsage) {
        console.warn(`Memory pressure detected: ${memoryUsage.toFixed(1)}MB`);
        
        // Reduce texture quality
        this.optimizer.textureStreaming.maxTextureSize = Math.max(256, 
            this.optimizer.textureStreaming.maxTextureSize * 0.75);
        
        // Increase LOD bias
        this.optimizer.lodSystem.bias = Math.min(2.0, this.optimizer.lodSystem.bias * 1.2);
        
        // Trigger garbage collection if available
        if (window.gc) {
            window.gc();
        }
    }
    
    /**
     * Get frame time variance
     */
    getFrameTimeVariance() {
        const samples = this.performanceMonitor.samples.slice(-60); // Last 1 second
        if (samples.length < 10) return 0;
        
        const frameTimes = samples.map(s => s.frameTime);
        const mean = frameTimes.reduce((a, b) => a + b) / frameTimes.length;
        const variance = frameTimes.reduce((acc, time) => acc + Math.pow(time - mean, 2), 0) / frameTimes.length;
        
        return Math.sqrt(variance);
    }
    
    /**
     * Handle frame time variance (stuttering)
     */
    handleFrameTimeVariance(variance) {
        console.warn(`Frame time variance detected: ${variance.toFixed(2)}ms`);
        
        // Reduce particle quality
        this.optimizer.updateParticleQuality(
            Math.max(0.2, this.optimizer.qualitySettings.particleQuality * 0.8)
        );
        
        // Increase culling aggressiveness
        this.optimizer.cullingSystem.maxDistance *= 0.9;
    }
    
    /**
     * Handle scene change
     */
    handleSceneChange() {
        // Re-register objects for new scene
        this.registerGameObjects();
        
        // Reset performance monitoring
        this.performanceMonitor.samples = [];
        
        console.log('Scene changed, re-registered objects for optimization');
    }
    
    /**
     * Handle quality change
     */
    handleQualityChange(quality) {
        if (this.qualityPresets[quality]) {
            this.applyQualityPreset(quality);
        }
    }
    
    /**
     * Apply quality preset
     */
    applyQualityPreset(presetName) {
        const preset = this.qualityPresets[presetName];
        if (!preset) return;
        
        // Apply to optimizer
        this.optimizer.applyQualitySettings(preset);
        
        // Apply renderer-specific settings
        if (preset.antialiasing) {
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        } else {
            this.renderer.setPixelRatio(1);
        }
        
        console.log(`Applied ${preset.name} quality preset`);
    }
    
    /**
     * Get current performance statistics
     */
    getPerformanceStats() {
        const metrics = this.optimizer.getPerformanceMetrics();
        const samples = this.performanceMonitor.samples;
        
        return {
            current: metrics,
            averages: {
                fps: this.getAverageMetric('fps', 60),
                frameTime: this.getAverageMetric('frameTime', 60),
                drawCalls: this.getAverageMetric('drawCalls', 60),
                memory: this.getAverageMetric('memory', 60)
            },
            quality: this.optimizer.getQualitySettings(),
            sampleCount: samples.length
        };
    }
    
    /**
     * Enable/disable rendering optimization
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (this.optimizer) {
            this.optimizer.setDynamicQuality(enabled);
        }
    }
    
    /**
     * Set quality level manually
     */
    setQualityLevel(level) {
        if (this.optimizer) {
            this.optimizer.setQualityLevel(level);
        }
    }
    
    /**
     * Get available quality presets
     */
    getQualityPresets() {
        return Object.keys(this.qualityPresets).map(key => ({
            id: key,
            name: this.qualityPresets[key].name
        }));
    }
    
    /**
     * Dispose of resources
     */
    dispose() {
        if (this.optimizer) {
            this.optimizer.dispose();
        }
        
        // Unregister from game engine
        if (this.gameEngine) {
            this.gameEngine.unregisterUpdateCallback('rendering');
        }
        
        this.isInitialized = false;
        console.log('Rendering Integration disposed');
    }
}

export default RenderingIntegration;