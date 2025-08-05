import * as THREE from 'three';

/**
 * Performance Manager - Handles LOD, quality settings, and performance monitoring
 */
export class PerformanceManager {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.scene = gameEngine?.scene;
        this.renderer = gameEngine?.renderer;
        this.camera = gameEngine?.camera;

        // Performance monitoring
        this.frameRate = 60;
        this.frameRateHistory = [];
        this.frameRateHistorySize = 60; // 1 second at 60fps
        this.lastFrameTime = performance.now();
        this.performanceLevel = 'high'; // high, medium, low, auto

        // Quality settings
        this.qualitySettings = {
            high: {
                shadowMapSize: 2048,
                pixelRatio: Math.min(window.devicePixelRatio, 2),
                antialias: true,
                lodDistance: { near: 50, far: 200 },
                particleCount: 1000,
                maxZombies: 100,
                frustumCulling: true,
                textureQuality: 1.0
            },
            medium: {
                shadowMapSize: 1024,
                pixelRatio: Math.min(window.devicePixelRatio, 1.5),
                antialias: true,
                lodDistance: { near: 30, far: 150 },
                particleCount: 500,
                maxZombies: 75,
                frustumCulling: true,
                textureQuality: 0.75
            },
            low: {
                shadowMapSize: 512,
                pixelRatio: 1,
                antialias: false,
                lodDistance: { near: 20, far: 100 },
                particleCount: 250,
                maxZombies: 50,
                frustumCulling: true,
                textureQuality: 0.5
            }
        };

        // LOD system
        this.lodObjects = new Map(); // object -> LOD levels
        this.lodUpdateInterval = 0.1; // Update LOD every 100ms
        this.lastLodUpdate = 0;

        // Frustum culling (initialized in initialize method)
        this.frustum = null;
        this.cameraMatrix = null;
        this.culledObjects = new Set();

        // Auto-adjustment settings
        this.autoAdjustEnabled = true;
        this.targetFrameRate = 50; // Target minimum FPS
        this.adjustmentCooldown = 2000; // 2 seconds between adjustments
        this.lastAdjustment = 0;

        this.initialize();
    }

    /**
     * Initialize performance manager
     */
    initialize() {
        // Initialize THREE.js objects (deferred to ensure THREE is available)
        if (typeof THREE !== 'undefined') {
            console.log('THREE is defined, checking Frustum:', typeof THREE.Frustum);
            console.log('THREE keys:', Object.keys(THREE));
            
            if (typeof THREE.Frustum === 'function') {
                this.frustum = new THREE.Frustum();
            } else {
                console.warn('THREE.Frustum is not a constructor, disabling frustum culling');
                this.frustum = null;
            }
            
            if (typeof THREE.Matrix4 === 'function') {
                this.cameraMatrix = new THREE.Matrix4();
            } else {
                console.warn('THREE.Matrix4 is not a constructor, disabling matrix operations');
                this.cameraMatrix = null;
            }
        } else {
            console.warn('THREE.js not available, frustum culling disabled');
            this.frustum = null;
            this.cameraMatrix = null;
        }
        
        this.applyQualitySettings(this.performanceLevel);
        console.log(`PerformanceManager initialized with ${this.performanceLevel} quality`);
    }

    /**
     * Update performance monitoring and LOD system
     */
    update(deltaTime) {
        this._updateFrameRate(deltaTime);
        this._updateLOD(deltaTime);
        this._updateFrustumCulling();
        
        if (this.autoAdjustEnabled && this.performanceLevel === 'auto') {
            this._autoAdjustQuality();
        }
    }

    /**
     * Set quality level
     */
    setQualityLevel(level) {
        if (!this.qualitySettings[level] && level !== 'auto') {
            console.warn(`Invalid quality level: ${level}`);
            return;
        }

        this.performanceLevel = level;
        if (level !== 'auto') {
            this.applyQualitySettings(level);
        }
        console.log(`Quality level set to: ${level}`);
    }

    /**
     * Apply quality settings to renderer and scene
     */
    applyQualitySettings(level) {
        const settings = this.qualitySettings[level];
        if (!settings) return;

        // Apply renderer settings
        if (this.renderer) {
            this.renderer.setPixelRatio(settings.pixelRatio);
        }
        
        // Update shadow map size
        if (this.renderer && this.renderer.shadowMap && this.renderer.shadowMap.enabled) {
            const lights = [];
            this.scene.traverse((child) => {
                if (child.isDirectionalLight || child.isSpotLight) {
                    lights.push(child);
                }
            });

            lights.forEach(light => {
                if (light.shadow) {
                    light.shadow.mapSize.setScalar(settings.shadowMapSize);
                    light.shadow.map?.dispose();
                    light.shadow.map = null;
                }
            });
        }

        // Store current settings for other systems to use
        this.currentSettings = settings;
        
        console.log(`Applied ${level} quality settings:`, settings);
    }

    /**
     * Register object for LOD management
     */
    registerLODObject(object, lodLevels) {
        if (!object || !lodLevels) return;

        this.lodObjects.set(object, {
            levels: lodLevels,
            currentLevel: 0,
            lastDistance: 0
        });
    }

    /**
     * Unregister object from LOD management
     */
    unregisterLODObject(object) {
        this.lodObjects.delete(object);
    }

    /**
     * Enable/disable frustum culling for an object
     */
    setFrustumCulling(object, enabled) {
        if (enabled) {
            this.culledObjects.add(object);
        } else {
            this.culledObjects.delete(object);
        }
    }

    /**
     * Get current performance statistics
     */
    getPerformanceStats() {
        const avgFrameRate = this.frameRateHistory.length > 0 
            ? this.frameRateHistory.reduce((a, b) => a + b, 0) / this.frameRateHistory.length 
            : 60;

        return {
            frameRate: this.frameRate,
            averageFrameRate: Math.round(avgFrameRate * 100) / 100,
            qualityLevel: this.performanceLevel,
            lodObjects: this.lodObjects.size,
            culledObjects: this.culledObjects.size,
            memoryUsage: this._getMemoryUsage(),
            renderInfo: this.renderer.info
        };
    }

    /**
     * Get current quality settings
     */
    getCurrentSettings() {
        return this.currentSettings || this.qualitySettings.high;
    }

    /**
     * Update frame rate monitoring
     */
    _updateFrameRate(deltaTime) {
        const currentTime = performance.now();
        const frameDelta = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;

        if (frameDelta > 0) {
            this.frameRate = 1000 / frameDelta;
            this.frameRateHistory.push(this.frameRate);

            if (this.frameRateHistory.length > this.frameRateHistorySize) {
                this.frameRateHistory.shift();
            }
        }
    }

    /**
     * Update LOD system
     */
    _updateLOD(deltaTime) {
        this.lastLodUpdate += deltaTime;
        if (this.lastLodUpdate < this.lodUpdateInterval) return;

        this.lastLodUpdate = 0;
        const cameraPosition = this.camera.position;

        this.lodObjects.forEach((lodData, object) => {
            if (!object.position) return;

            const distance = cameraPosition.distanceTo(object.position);
            const newLevel = this._calculateLODLevel(distance, lodData.levels);

            if (newLevel !== lodData.currentLevel) {
                this._applyLODLevel(object, lodData.levels, newLevel);
                lodData.currentLevel = newLevel;
            }

            lodData.lastDistance = distance;
        });
    }

    /**
     * Calculate appropriate LOD level based on distance
     */
    _calculateLODLevel(distance, levels) {
        for (let i = 0; i < levels.length; i++) {
            if (distance <= levels[i].maxDistance) {
                return i;
            }
        }
        return levels.length - 1; // Return lowest quality level
    }

    /**
     * Apply LOD level to object
     */
    _applyLODLevel(object, levels, levelIndex) {
        const level = levels[levelIndex];
        if (!level) return;

        // Hide/show object based on LOD level
        if (level.visible !== undefined) {
            object.visible = level.visible;
        }

        // Apply geometry LOD if available
        if (level.geometry && object.geometry !== level.geometry) {
            object.geometry = level.geometry;
        }

        // Apply material LOD if available
        if (level.material && object.material !== level.material) {
            object.material = level.material;
        }

        // Apply scale if specified
        if (level.scale && object.scale) {
            object.scale.copy(level.scale);
        }
    }

    /**
     * Update frustum culling
     */
    _updateFrustumCulling() {
        if (!this.getCurrentSettings().frustumCulling || !this.frustum || !this.cameraMatrix) return;

        this.cameraMatrix.multiplyMatrices(
            this.camera.projectionMatrix,
            this.camera.matrixWorldInverse
        );
        this.frustum.setFromProjectionMatrix(this.cameraMatrix);

        this.culledObjects.forEach(object => {
            if (object.geometry && object.geometry.boundingSphere) {
                const sphere = object.geometry.boundingSphere.clone();
                sphere.applyMatrix4(object.matrixWorld);
                object.visible = this.frustum.intersectsSphere(sphere);
            }
        });
    }

    /**
     * Auto-adjust quality based on performance
     */
    _autoAdjustQuality() {
        const now = performance.now();
        if (now - this.lastAdjustment < this.adjustmentCooldown) return;

        const avgFrameRate = this.frameRateHistory.length > 0 
            ? this.frameRateHistory.reduce((a, b) => a + b, 0) / this.frameRateHistory.length 
            : 60;

        let newLevel = null;

        if (avgFrameRate < this.targetFrameRate - 10) {
            // Performance is poor, reduce quality
            if (this.performanceLevel === 'high') newLevel = 'medium';
            else if (this.performanceLevel === 'medium') newLevel = 'low';
        } else if (avgFrameRate > this.targetFrameRate + 15) {
            // Performance is good, increase quality
            if (this.performanceLevel === 'low') newLevel = 'medium';
            else if (this.performanceLevel === 'medium') newLevel = 'high';
        }

        if (newLevel && newLevel !== this.performanceLevel) {
            console.log(`Auto-adjusting quality from ${this.performanceLevel} to ${newLevel} (FPS: ${avgFrameRate.toFixed(1)})`);
            this.performanceLevel = newLevel;
            this.applyQualitySettings(newLevel);
            this.lastAdjustment = now;
        }
    }

    /**
     * Get memory usage information
     */
    _getMemoryUsage() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
                total: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) // MB
            };
        }
        return null;
    }

    /**
     * Dispose of performance manager
     */
    dispose() {
        this.lodObjects.clear();
        this.culledObjects.clear();
        this.frameRateHistory = [];
        console.log('PerformanceManager disposed');
    }
}