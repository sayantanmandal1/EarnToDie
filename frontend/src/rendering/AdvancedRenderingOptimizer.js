/**
 * Advanced Rendering Optimizer
 * Implements LOD system, culling, dynamic quality adjustment, and texture optimization
 */
import * as THREE from 'three';

class AdvancedRenderingOptimizer {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        
        // Performance monitoring
        this.performanceMetrics = {
            fps: 60,
            frameTime: 16.67,
            drawCalls: 0,
            triangles: 0,
            memoryUsage: 0,
            lastFrameTime: performance.now()
        };
        
        // Quality settings
        this.qualitySettings = {
            level: 'high', // 'low', 'medium', 'high', 'ultra'
            lodBias: 1.0,
            shadowQuality: 'high',
            textureQuality: 'high',
            particleQuality: 'high',
            postProcessing: true,
            antialiasing: true
        };
        
        // LOD system
        this.lodSystem = {
            enabled: true,
            levels: new Map(),
            distances: [50, 100, 200, 500], // LOD switch distances
            bias: 1.0
        };
        
        // Culling system
        this.cullingSystem = {
            frustumCulling: true,
            occlusionCulling: true,
            distanceCulling: true,
            maxDistance: 1000,
            occlusionQueries: new Map()
        };
        
        // Texture streaming
        this.textureStreaming = {
            enabled: true,
            maxTextureSize: 2048,
            compressionFormat: 'DXT',
            streamingDistance: 200,
            loadedTextures: new Map(),
            textureQueue: []
        };
        
        // Dynamic quality adjustment
        this.dynamicQuality = {
            enabled: true,
            targetFPS: 60,
            adjustmentThreshold: 5,
            lastAdjustment: 0,
            adjustmentCooldown: 2000 // 2 seconds
        };
        
        // Initialize systems
        this.initialize();
    }
    
    /**
     * Initialize the rendering optimizer
     */
    initialize() {
        this.setupLODSystem();
        this.setupCullingSystem();
        this.setupTextureStreaming();
        this.setupDynamicQuality();
        this.setupPerformanceMonitoring();
        
        console.log('Advanced Rendering Optimizer initialized');
    }
    
    /**
     * Setup Level of Detail (LOD) system
     */
    setupLODSystem() {
        this.lodSystem.frustum = new THREE.Frustum();
        this.lodSystem.cameraMatrix = new THREE.Matrix4();
        
        // Create LOD manager
        this.lodManager = {
            objects: new Map(),
            updateQueue: [],
            lastUpdate: 0,
            updateInterval: 100 // Update every 100ms
        };
    }
    
    /**
     * Setup culling system
     */
    setupCullingSystem() {
        this.cullingSystem.frustum = new THREE.Frustum();
        this.cullingSystem.cameraMatrix = new THREE.Matrix4();
        this.cullingSystem.culledObjects = new Set();
        
        // Setup occlusion culling
        if (this.cullingSystem.occlusionCulling) {
            this.setupOcclusionCulling();
        }
    }
    
    /**
     * Setup occlusion culling
     */
    setupOcclusionCulling() {
        // Create occlusion query system
        this.occlusionSystem = {
            queries: new Map(),
            queryPool: [],
            maxQueries: 100,
            enabled: this.renderer.capabilities.isWebGL2
        };
        
        if (!this.occlusionSystem.enabled) {
            console.warn('Occlusion culling disabled: WebGL2 not supported');
            this.cullingSystem.occlusionCulling = false;
        }
    }
    
    /**
     * Setup texture streaming system
     */
    setupTextureStreaming() {
        this.textureManager = {
            loadedTextures: new Map(),
            textureQueue: [],
            maxConcurrentLoads: 4,
            currentLoads: 0,
            compressionSupport: this.checkCompressionSupport()
        };
        
        // Setup texture compression
        this.setupTextureCompression();
    }
    
    /**
     * Check texture compression support
     */
    checkCompressionSupport() {
        const gl = this.renderer.getContext();
        return {
            s3tc: !!gl.getExtension('WEBGL_compressed_texture_s3tc'),
            etc1: !!gl.getExtension('WEBGL_compressed_texture_etc1'),
            pvrtc: !!gl.getExtension('WEBGL_compressed_texture_pvrtc'),
            astc: !!gl.getExtension('WEBGL_compressed_texture_astc')
        };
    }
    
    /**
     * Setup texture compression
     */
    setupTextureCompression() {
        const support = this.textureManager.compressionSupport;
        
        if (support.s3tc) {
            this.textureStreaming.compressionFormat = 'S3TC';
        } else if (support.etc1) {
            this.textureStreaming.compressionFormat = 'ETC1';
        } else if (support.pvrtc) {
            this.textureStreaming.compressionFormat = 'PVRTC';
        } else {
            this.textureStreaming.compressionFormat = 'NONE';
            console.warn('No texture compression support detected');
        }
    }
    
    /**
     * Setup dynamic quality adjustment
     */
    setupDynamicQuality() {
        this.qualityAdjuster = {
            frameTimeHistory: new Array(60).fill(16.67),
            historyIndex: 0,
            averageFrameTime: 16.67,
            lastQualityChange: 0,
            adjustmentSteps: [
                { name: 'ultra', shadowRes: 2048, textureRes: 2048, particles: 1.0, postFX: true },
                { name: 'high', shadowRes: 1024, textureRes: 1024, particles: 0.8, postFX: true },
                { name: 'medium', shadowRes: 512, textureRes: 512, particles: 0.6, postFX: false },
                { name: 'low', shadowRes: 256, textureRes: 256, particles: 0.4, postFX: false }
            ]
        };
    }
    
    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        this.performanceMonitor = {
            enabled: true,
            updateInterval: 1000, // 1 second
            lastUpdate: 0,
            samples: {
                fps: [],
                frameTime: [],
                drawCalls: [],
                memory: []
            },
            maxSamples: 60
        };
    }
    
    /**
     * Register object for LOD management
     */
    registerLODObject(object, lodLevels) {
        const lodData = {
            object: object,
            levels: lodLevels, // Array of { distance, geometry, material }
            currentLevel: 0,
            lastDistance: 0,
            boundingSphere: new THREE.Sphere()
        };
        
        // Calculate bounding sphere
        if (object.geometry) {
            object.geometry.computeBoundingSphere();
            lodData.boundingSphere.copy(object.geometry.boundingSphere);
        }
        
        this.lodManager.objects.set(object.uuid, lodData);
    }
    
    /**
     * Update LOD system
     */
    updateLODSystem() {
        const now = performance.now();
        if (now - this.lodManager.lastUpdate < this.lodManager.updateInterval) {
            return;
        }
        
        this.lodManager.lastUpdate = now;
        const cameraPosition = this.camera.position;
        
        this.lodManager.objects.forEach((lodData, uuid) => {
            const object = lodData.object;
            if (!object.visible) return;
            
            // Calculate distance to camera
            const distance = cameraPosition.distanceTo(object.position) * this.lodSystem.bias;
            
            // Determine appropriate LOD level
            let newLevel = lodData.levels.length - 1;
            for (let i = 0; i < lodData.levels.length; i++) {
                if (distance < this.lodSystem.distances[i]) {
                    newLevel = i;
                    break;
                }
            }
            
            // Update LOD if changed
            if (newLevel !== lodData.currentLevel) {
                this.switchLODLevel(lodData, newLevel);
            }
        });
    }
    
    /**
     * Switch LOD level for an object
     */
    switchLODLevel(lodData, newLevel) {
        const object = lodData.object;
        const levelData = lodData.levels[newLevel];
        
        if (levelData && object.geometry !== levelData.geometry) {
            // Switch geometry
            if (levelData.geometry) {
                object.geometry = levelData.geometry;
            }
            
            // Switch material
            if (levelData.material) {
                object.material = levelData.material;
            }
            
            lodData.currentLevel = newLevel;
        }
    }
    
    /**
     * Update frustum culling
     */
    updateFrustumCulling() {
        if (!this.cullingSystem.frustumCulling) return;
        
        // Update frustum
        this.cullingSystem.cameraMatrix.multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        this.cullingSystem.frustum.setFromProjectionMatrix(this.cullingSystem.cameraMatrix);
        
        // Cull objects
        this.scene.traverse((object) => {
            if (object.isMesh && object.geometry) {
                // Calculate bounding sphere
                if (!object.geometry.boundingSphere) {
                    object.geometry.computeBoundingSphere();
                }
                
                const sphere = object.geometry.boundingSphere.clone();
                sphere.applyMatrix4(object.matrixWorld);
                
                // Test against frustum
                const inFrustum = this.cullingSystem.frustum.intersectsSphere(sphere);
                
                if (!inFrustum) {
                    this.cullingSystem.culledObjects.add(object.uuid);
                    object.visible = false;
                } else {
                    this.cullingSystem.culledObjects.delete(object.uuid);
                    object.visible = true;
                }
            }
        });
    }
    
    /**
     * Update distance culling
     */
    updateDistanceCulling() {
        if (!this.cullingSystem.distanceCulling) return;
        
        const cameraPosition = this.camera.position;
        const maxDistance = this.cullingSystem.maxDistance;
        
        this.scene.traverse((object) => {
            if (object.isMesh) {
                const distance = cameraPosition.distanceTo(object.position);
                
                if (distance > maxDistance) {
                    object.visible = false;
                } else if (!this.cullingSystem.culledObjects.has(object.uuid)) {
                    object.visible = true;
                }
            }
        });
    }
    
    /**
     * Update occlusion culling
     */
    updateOcclusionCulling() {
        if (!this.cullingSystem.occlusionCulling || !this.occlusionSystem.enabled) return;
        
        // Simplified occlusion culling implementation
        // In a full implementation, this would use WebGL occlusion queries
        const cameraPosition = this.camera.position;
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        
        this.scene.traverse((object) => {
            if (object.isMesh && object.userData.occlusionTest) {
                // Simple ray-based occlusion test
                const raycaster = new THREE.Raycaster(cameraPosition, 
                    object.position.clone().sub(cameraPosition).normalize());
                
                const intersects = raycaster.intersectObjects(this.scene.children, true);
                
                if (intersects.length > 0 && intersects[0].object !== object) {
                    // Object is occluded
                    object.visible = false;
                } else {
                    object.visible = true;
                }
            }
        });
    }
    
    /**
     * Update texture streaming
     */
    updateTextureStreaming() {
        if (!this.textureStreaming.enabled) return;
        
        const cameraPosition = this.camera.position;
        const streamingDistance = this.textureStreaming.streamingDistance;
        
        // Process texture queue
        this.processTextureQueue();
        
        // Check for textures to load/unload
        this.scene.traverse((object) => {
            if (object.isMesh && object.material) {
                const distance = cameraPosition.distanceTo(object.position);
                
                if (distance < streamingDistance) {
                    this.requestHighResTexture(object.material);
                } else {
                    this.requestLowResTexture(object.material);
                }
            }
        });
    }
    
    /**
     * Process texture loading queue
     */
    processTextureQueue() {
        while (this.textureManager.currentLoads < this.textureManager.maxConcurrentLoads &&
               this.textureManager.textureQueue.length > 0) {
            
            const textureRequest = this.textureManager.textureQueue.shift();
            this.loadTexture(textureRequest);
        }
    }
    
    /**
     * Request high resolution texture
     */
    requestHighResTexture(material) {
        if (material.map && material.map.userData.lowRes) {
            const highResUrl = material.map.userData.highResUrl;
            if (highResUrl && !this.textureManager.loadedTextures.has(highResUrl)) {
                this.textureManager.textureQueue.push({
                    url: highResUrl,
                    material: material,
                    type: 'high'
                });
            }
        }
    }
    
    /**
     * Request low resolution texture
     */
    requestLowResTexture(material) {
        if (material.map && !material.map.userData.lowRes) {
            const lowResUrl = material.map.userData.lowResUrl;
            if (lowResUrl) {
                const loader = new THREE.TextureLoader();
                loader.load(lowResUrl, (texture) => {
                    texture.userData.lowRes = true;
                    material.map = texture;
                    material.needsUpdate = true;
                });
            }
        }
    }
    
    /**
     * Load texture with compression
     */
    loadTexture(textureRequest) {
        this.textureManager.currentLoads++;
        
        const loader = new THREE.TextureLoader();
        loader.load(
            textureRequest.url,
            (texture) => {
                // Apply compression if supported
                this.applyTextureCompression(texture);
                
                // Update material
                textureRequest.material.map = texture;
                textureRequest.material.needsUpdate = true;
                
                // Cache texture
                this.textureManager.loadedTextures.set(textureRequest.url, texture);
                
                this.textureManager.currentLoads--;
            },
            undefined,
            (error) => {
                console.error('Failed to load texture:', textureRequest.url, error);
                this.textureManager.currentLoads--;
            }
        );
    }
    
    /**
     * Apply texture compression
     */
    applyTextureCompression(texture) {
        const format = this.textureStreaming.compressionFormat;
        
        switch (format) {
            case 'S3TC':
                texture.format = THREE.RGB_S3TC_DXT1_Format;
                break;
            case 'ETC1':
                texture.format = THREE.RGB_ETC1_Format;
                break;
            case 'PVRTC':
                texture.format = THREE.RGB_PVRTC_4BPPV1_Format;
                break;
            default:
                // No compression
                break;
        }
        
        // Limit texture size
        const maxSize = this.textureStreaming.maxTextureSize;
        if (texture.image && (texture.image.width > maxSize || texture.image.height > maxSize)) {
            this.resizeTexture(texture, maxSize);
        }
    }
    
    /**
     * Resize texture to maximum size
     */
    resizeTexture(texture, maxSize) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const { width, height } = texture.image;
        const scale = Math.min(maxSize / width, maxSize / height);
        
        canvas.width = width * scale;
        canvas.height = height * scale;
        
        ctx.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
        
        texture.image = canvas;
        texture.needsUpdate = true;
    }
    
    /**
     * Update dynamic quality adjustment
     */
    updateDynamicQuality() {
        if (!this.dynamicQuality.enabled) return;
        
        const now = performance.now();
        const frameTime = now - this.performanceMetrics.lastFrameTime;
        this.performanceMetrics.lastFrameTime = now;
        
        // Update frame time history
        const adjuster = this.qualityAdjuster;
        adjuster.frameTimeHistory[adjuster.historyIndex] = frameTime;
        adjuster.historyIndex = (adjuster.historyIndex + 1) % adjuster.frameTimeHistory.length;
        
        // Calculate average frame time
        adjuster.averageFrameTime = adjuster.frameTimeHistory.reduce((a, b) => a + b) / adjuster.frameTimeHistory.length;
        
        const currentFPS = 1000 / adjuster.averageFrameTime;
        const targetFPS = this.dynamicQuality.targetFPS;
        
        // Check if adjustment is needed
        if (now - adjuster.lastQualityChange > this.dynamicQuality.adjustmentCooldown) {
            if (currentFPS < targetFPS - this.dynamicQuality.adjustmentThreshold) {
                this.decreaseQuality();
                adjuster.lastQualityChange = now;
            } else if (currentFPS > targetFPS + this.dynamicQuality.adjustmentThreshold) {
                this.increaseQuality();
                adjuster.lastQualityChange = now;
            }
        }
        
        // Update performance metrics
        this.performanceMetrics.fps = currentFPS;
        this.performanceMetrics.frameTime = adjuster.averageFrameTime;
    }
    
    /**
     * Decrease rendering quality
     */
    decreaseQuality() {
        const steps = this.qualityAdjuster.adjustmentSteps;
        const currentIndex = steps.findIndex(step => step.name === this.qualitySettings.level);
        
        if (currentIndex < steps.length - 1) {
            const newQuality = steps[currentIndex + 1];
            this.applyQualitySettings(newQuality);
            console.log(`Quality decreased to: ${newQuality.name}`);
        }
    }
    
    /**
     * Increase rendering quality
     */
    increaseQuality() {
        const steps = this.qualityAdjuster.adjustmentSteps;
        const currentIndex = steps.findIndex(step => step.name === this.qualitySettings.level);
        
        if (currentIndex > 0) {
            const newQuality = steps[currentIndex - 1];
            this.applyQualitySettings(newQuality);
            console.log(`Quality increased to: ${newQuality.name}`);
        }
    }
    
    /**
     * Apply quality settings
     */
    applyQualitySettings(qualityStep) {
        this.qualitySettings.level = qualityStep.name;
        
        // Update shadow resolution
        this.updateShadowQuality(qualityStep.shadowRes);
        
        // Update texture resolution
        this.textureStreaming.maxTextureSize = qualityStep.textureRes;
        
        // Update particle quality
        this.updateParticleQuality(qualityStep.particles);
        
        // Update post-processing
        this.qualitySettings.postProcessing = qualityStep.postFX;
        
        // Update LOD bias
        this.lodSystem.bias = qualityStep.particles;
    }
    
    /**
     * Update shadow quality
     */
    updateShadowQuality(resolution) {
        this.scene.traverse((object) => {
            if (object.isDirectionalLight && object.shadow) {
                object.shadow.mapSize.width = resolution;
                object.shadow.mapSize.height = resolution;
                object.shadow.map?.dispose();
                object.shadow.map = null;
            }
        });
    }
    
    /**
     * Update particle quality
     */
    updateParticleQuality(quality) {
        this.scene.traverse((object) => {
            if (object.userData.particleSystem) {
                const system = object.userData.particleSystem;
                system.maxParticles = Math.floor(system.baseMaxParticles * quality);
            }
        });
    }
    
    /**
     * Update performance monitoring
     */
    updatePerformanceMonitoring() {
        const now = performance.now();
        if (now - this.performanceMonitor.lastUpdate < this.performanceMonitor.updateInterval) {
            return;
        }
        
        this.performanceMonitor.lastUpdate = now;
        
        // Update renderer info
        const info = this.renderer.info;
        this.performanceMetrics.drawCalls = info.render.calls;
        this.performanceMetrics.triangles = info.render.triangles;
        
        // Update memory usage (approximate)
        if (performance.memory) {
            this.performanceMetrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
        }
        
        // Store samples
        const monitor = this.performanceMonitor;
        monitor.samples.fps.push(this.performanceMetrics.fps);
        monitor.samples.frameTime.push(this.performanceMetrics.frameTime);
        monitor.samples.drawCalls.push(this.performanceMetrics.drawCalls);
        monitor.samples.memory.push(this.performanceMetrics.memoryUsage);
        
        // Limit sample history
        Object.keys(monitor.samples).forEach(key => {
            if (monitor.samples[key].length > monitor.maxSamples) {
                monitor.samples[key].shift();
            }
        });
    }
    
    /**
     * Main update function - call this every frame
     */
    update() {
        this.updateLODSystem();
        this.updateFrustumCulling();
        this.updateDistanceCulling();
        this.updateOcclusionCulling();
        this.updateTextureStreaming();
        this.updateDynamicQuality();
        this.updatePerformanceMonitoring();
    }
    
    /**
     * Get current performance metrics
     */
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }
    
    /**
     * Get quality settings
     */
    getQualitySettings() {
        return { ...this.qualitySettings };
    }
    
    /**
     * Set quality level manually
     */
    setQualityLevel(level) {
        const steps = this.qualityAdjuster.adjustmentSteps;
        const qualityStep = steps.find(step => step.name === level);
        
        if (qualityStep) {
            this.applyQualitySettings(qualityStep);
        }
    }
    
    /**
     * Enable/disable dynamic quality adjustment
     */
    setDynamicQuality(enabled) {
        this.dynamicQuality.enabled = enabled;
    }
    
    /**
     * Dispose of resources
     */
    dispose() {
        // Clear LOD objects
        this.lodManager.objects.clear();
        
        // Clear texture cache
        this.textureManager.loadedTextures.forEach(texture => {
            texture.dispose();
        });
        this.textureManager.loadedTextures.clear();
        
        // Clear occlusion queries
        if (this.occlusionSystem) {
            this.occlusionSystem.queries.clear();
        }
        
        console.log('Advanced Rendering Optimizer disposed');
    }
}

export default AdvancedRenderingOptimizer;