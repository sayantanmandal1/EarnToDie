import * as THREE from 'three';

/**
 * LOD System - Manages Level of Detail for 3D objects
 */
export class LODSystem {
    constructor(camera) {
        this.camera = camera;
        this.lodObjects = new Map();
        this.updateInterval = 0.1; // Update every 100ms
        this.lastUpdate = 0;
        
        // Default LOD distances
        this.defaultDistances = {
            high: 50,
            medium: 100,
            low: 200
        };
    }

    /**
     * Create LOD levels for a mesh
     */
    createLODLevels(originalMesh, options = {}) {
        const levels = [];
        const geometry = originalMesh.geometry;
        const material = originalMesh.material;

        // High detail (original)
        levels.push({
            maxDistance: options.highDistance || this.defaultDistances.high,
            geometry: geometry,
            material: material,
            scale: new THREE.Vector3(1, 1, 1),
            visible: true
        });

        // Medium detail (reduced geometry)
        const mediumGeometry = this._reduceGeometry(geometry, 0.6);
        const mediumMaterial = this._createLODMaterial(material, 0.8);
        levels.push({
            maxDistance: options.mediumDistance || this.defaultDistances.medium,
            geometry: mediumGeometry,
            material: mediumMaterial,
            scale: new THREE.Vector3(1, 1, 1),
            visible: true
        });

        // Low detail (heavily reduced geometry)
        const lowGeometry = this._reduceGeometry(geometry, 0.3);
        const lowMaterial = this._createLODMaterial(material, 0.5);
        levels.push({
            maxDistance: options.lowDistance || this.defaultDistances.low,
            geometry: lowGeometry,
            material: lowMaterial,
            scale: new THREE.Vector3(0.9, 0.9, 0.9),
            visible: true
        });

        // Very far (invisible or billboard)
        levels.push({
            maxDistance: Infinity,
            geometry: null,
            material: null,
            scale: new THREE.Vector3(1, 1, 1),
            visible: false
        });

        return levels;
    }

    /**
     * Register an object for LOD management
     */
    registerObject(object, lodLevels) {
        if (!object || !lodLevels) return;

        this.lodObjects.set(object, {
            levels: lodLevels,
            currentLevel: 0,
            lastDistance: 0,
            originalGeometry: object.geometry,
            originalMaterial: object.material
        });
    }

    /**
     * Unregister an object from LOD management
     */
    unregisterObject(object) {
        this.lodObjects.delete(object);
    }

    /**
     * Update LOD system
     */
    update(deltaTime) {
        this.lastUpdate += deltaTime;
        if (this.lastUpdate < this.updateInterval) return;

        this.lastUpdate = 0;
        const cameraPosition = this.camera.position;

        this.lodObjects.forEach((lodData, object) => {
            if (!object.position) return;

            const distance = cameraPosition.distanceTo(object.position);
            const newLevel = this._calculateLODLevel(distance, lodData.levels);

            if (newLevel !== lodData.currentLevel) {
                this._applyLODLevel(object, lodData.levels[newLevel]);
                lodData.currentLevel = newLevel;
            }

            lodData.lastDistance = distance;
        });
    }

    /**
     * Create vehicle LOD levels
     */
    createVehicleLOD(vehicle, options = {}) {
        const levels = [];

        // High detail - full model with all parts
        levels.push({
            maxDistance: options.highDistance || 30,
            visible: true,
            showDetails: true,
            geometryQuality: 1.0,
            textureQuality: 1.0
        });

        // Medium detail - simplified model
        levels.push({
            maxDistance: options.mediumDistance || 80,
            visible: true,
            showDetails: false,
            geometryQuality: 0.7,
            textureQuality: 0.8
        });

        // Low detail - basic shape only
        levels.push({
            maxDistance: options.lowDistance || 150,
            visible: true,
            showDetails: false,
            geometryQuality: 0.4,
            textureQuality: 0.5
        });

        // Very far - invisible
        levels.push({
            maxDistance: Infinity,
            visible: false,
            showDetails: false,
            geometryQuality: 0,
            textureQuality: 0
        });

        return levels;
    }

    /**
     * Create zombie LOD levels
     */
    createZombieLOD(zombie, options = {}) {
        const levels = [];

        // High detail - full animation and details
        levels.push({
            maxDistance: options.highDistance || 25,
            visible: true,
            animationQuality: 'high',
            showDetails: true,
            updateRate: 1.0
        });

        // Medium detail - reduced animation
        levels.push({
            maxDistance: options.mediumDistance || 60,
            visible: true,
            animationQuality: 'medium',
            showDetails: false,
            updateRate: 0.5
        });

        // Low detail - basic movement only
        levels.push({
            maxDistance: options.lowDistance || 120,
            visible: true,
            animationQuality: 'low',
            showDetails: false,
            updateRate: 0.25
        });

        // Very far - invisible
        levels.push({
            maxDistance: Infinity,
            visible: false,
            animationQuality: 'none',
            showDetails: false,
            updateRate: 0
        });

        return levels;
    }

    /**
     * Get LOD statistics
     */
    getStats() {
        const stats = {
            totalObjects: this.lodObjects.size,
            levelCounts: { 0: 0, 1: 0, 2: 0, 3: 0 }
        };

        this.lodObjects.forEach(lodData => {
            stats.levelCounts[lodData.currentLevel]++;
        });

        return stats;
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
        return levels.length - 1;
    }

    /**
     * Apply LOD level to object
     */
    _applyLODLevel(object, level) {
        if (!level) return;

        // Apply visibility
        if (level.visible !== undefined) {
            object.visible = level.visible;
        }

        // Apply geometry if specified
        if (level.geometry !== undefined) {
            if (level.geometry === null) {
                object.visible = false;
            } else if (object.geometry !== level.geometry) {
                object.geometry = level.geometry;
            }
        }

        // Apply material if specified
        if (level.material !== undefined && object.material !== level.material) {
            object.material = level.material;
        }

        // Apply scale if specified
        if (level.scale && object.scale) {
            object.scale.copy(level.scale);
        }
    }

    /**
     * Reduce geometry complexity
     */
    _reduceGeometry(geometry, factor) {
        if (!geometry.isBufferGeometry) return geometry;

        // Simple vertex reduction - remove every nth vertex
        const positions = geometry.attributes.position.array;
        const normals = geometry.attributes.normal?.array;
        const uvs = geometry.attributes.uv?.array;
        
        const vertexCount = positions.length / 3;
        const targetCount = Math.floor(vertexCount * factor);
        const step = Math.max(1, Math.floor(vertexCount / targetCount));

        const newPositions = [];
        const newNormals = normals ? [] : null;
        const newUvs = uvs ? [] : null;

        for (let i = 0; i < vertexCount; i += step) {
            const idx = i * 3;
            newPositions.push(positions[idx], positions[idx + 1], positions[idx + 2]);
            
            if (normals) {
                newNormals.push(normals[idx], normals[idx + 1], normals[idx + 2]);
            }
            
            if (uvs) {
                const uvIdx = i * 2;
                newUvs.push(uvs[uvIdx], uvs[uvIdx + 1]);
            }
        }

        const reducedGeometry = new THREE.BufferGeometry();
        reducedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
        
        if (newNormals) {
            reducedGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
        }
        
        if (newUvs) {
            reducedGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(newUvs, 2));
        }

        return reducedGeometry;
    }

    /**
     * Create LOD material with reduced quality
     */
    _createLODMaterial(originalMaterial, qualityFactor) {
        if (!originalMaterial) return null;

        const lodMaterial = originalMaterial.clone();
        
        // Reduce texture resolution if possible
        if (lodMaterial.map) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = lodMaterial.map.image;
            
            if (img && img.width && img.height) {
                canvas.width = Math.max(32, img.width * qualityFactor);
                canvas.height = Math.max(32, img.height * qualityFactor);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                const texture = new THREE.CanvasTexture(canvas);
                texture.wrapS = lodMaterial.map.wrapS;
                texture.wrapT = lodMaterial.map.wrapT;
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                
                lodMaterial.map = texture;
            }
        }

        return lodMaterial;
    }

    /**
     * Dispose of LOD system
     */
    dispose() {
        this.lodObjects.clear();
    }
}