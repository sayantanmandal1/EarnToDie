import * as THREE from 'three';

/**
 * SpatialAudio class for 3D positioned sounds in the game world
 * Handles distance-based volume, doppler effects, and environmental audio
 */
export class SpatialAudio {
    constructor(audioManager) {
        this.audioManager = audioManager;
        this.audioContext = audioManager.audioContext;
        this.listener = audioManager.listener;
        
        // Spatial audio configuration
        this.config = {
            maxDistance: 100,
            refDistance: 1,
            rolloffFactor: 1,
            dopplerFactor: 1,
            speedOfSound: 343.3, // meters per second
            panningModel: 'HRTF',
            distanceModel: 'inverse'
        };
        
        // Active spatial audio sources
        this.spatialSources = new Map();
        
        // Environmental audio zones
        this.audioZones = [];
        
        // Occlusion and obstruction system
        this.occlusionEnabled = true;
        this.obstructionRaycast = null;
    }

    /**
     * Initialize spatial audio system
     */
    initialize(gameEngine) {
        this.gameEngine = gameEngine;
        
        // Setup raycaster for occlusion detection
        if (this.occlusionEnabled && gameEngine.scene) {
            this.obstructionRaycast = new THREE.Raycaster();
        }
        
        console.log('SpatialAudio system initialized');
    }

    /**
     * Create a spatial audio source at a specific position
     */
    createSpatialSource(soundName, position, options = {}) {
        if (!this.audioContext || !this.listener) {
            console.warn('Spatial audio not available - audio context or listener missing');
            return null;
        }

        const buffer = this.audioManager.audioBuffers.get(soundName);
        if (!buffer) {
            console.warn(`Sound buffer '${soundName}' not found for spatial audio`);
            return null;
        }

        try {
            // Create audio source
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            
            // Apply options
            source.loop = options.loop || false;
            source.playbackRate.setValueAtTime(options.pitch || 1.0, this.audioContext.currentTime);

            // Create panner node for spatial positioning
            const panner = this.audioContext.createPanner();
            panner.panningModel = this.config.panningModel;
            panner.distanceModel = this.config.distanceModel;
            panner.refDistance = options.refDistance || this.config.refDistance;
            panner.maxDistance = options.maxDistance || this.config.maxDistance;
            panner.rolloffFactor = options.rolloffFactor || this.config.rolloffFactor;

            // Set initial position
            this._updatePannerPosition(panner, position);

            // Create gain node for volume control
            const gainNode = this.audioContext.createGain();
            const volume = (options.volume || 1.0) * this.audioManager.volumes.effects * this.audioManager.volumes.master;
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);

            // Connect audio chain: source -> panner -> gain -> destination
            source.connect(panner);
            panner.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // Create spatial source object
            const spatialSource = {
                id: this._generateId(),
                source,
                panner,
                gainNode,
                position: position.clone(),
                velocity: options.velocity ? options.velocity.clone() : new THREE.Vector3(),
                lastPosition: position.clone(),
                volume: options.volume || 1.0,
                isPlaying: false,
                loop: options.loop || false,
                occlusionFactor: 1.0,
                obstructionFactor: 1.0,
                environmentalGain: 1.0,
                options
            };

            // Setup cleanup when sound finishes
            source.onended = () => {
                this.spatialSources.delete(spatialSource.id);
            };

            // Store reference
            this.spatialSources.set(spatialSource.id, spatialSource);

            return spatialSource;
        } catch (error) {
            console.error('Failed to create spatial audio source:', error);
            return null;
        }
    }

    /**
     * Play a spatial audio source
     */
    playSpatialSource(spatialSource, delay = 0) {
        if (!spatialSource || spatialSource.isPlaying) return;

        try {
            spatialSource.source.start(this.audioContext.currentTime + delay);
            spatialSource.isPlaying = true;
        } catch (error) {
            console.error('Failed to play spatial audio source:', error);
        }
    }

    /**
     * Stop a spatial audio source
     */
    stopSpatialSource(spatialSource) {
        if (!spatialSource || !spatialSource.isPlaying) return;

        try {
            spatialSource.source.stop();
            spatialSource.isPlaying = false;
            this.spatialSources.delete(spatialSource.id);
        } catch (error) {
            console.error('Failed to stop spatial audio source:', error);
        }
    }

    /**
     * Update spatial audio source position
     */
    updateSourcePosition(spatialSource, newPosition, velocity = null) {
        if (!spatialSource || !spatialSource.position || !spatialSource.lastPosition) return;

        // Update position
        spatialSource.lastPosition.copy(spatialSource.position);
        spatialSource.position.copy(newPosition);
        
        // Update velocity if provided, otherwise calculate from position change
        if (velocity && spatialSource.velocity) {
            spatialSource.velocity.copy(velocity);
        } else if (spatialSource.velocity) {
            spatialSource.velocity.subVectors(spatialSource.position, spatialSource.lastPosition);
        }

        // Update panner position
        this._updatePannerPosition(spatialSource.panner, newPosition);

        // Apply doppler effect if enabled
        if (this.config.dopplerFactor > 0) {
            this._applyDopplerEffect(spatialSource);
        }

        // Update occlusion and obstruction
        if (this.occlusionEnabled) {
            this._updateOcclusion(spatialSource);
        }

        // Update environmental effects
        this._updateEnvironmentalEffects(spatialSource);
    }

    /**
     * Update all spatial audio sources
     */
    update(deltaTime) {
        if (!this.listener || this.spatialSources.size === 0) return;

        // Update listener position and orientation
        this._updateListener();

        // Update each spatial source
        for (const spatialSource of this.spatialSources.values()) {
            if (spatialSource.isPlaying) {
                this._updateSpatialSource(spatialSource, deltaTime);
            }
        }
    }

    /**
     * Add an environmental audio zone
     */
    addAudioZone(zone) {
        this.audioZones.push({
            position: zone.position.clone(),
            radius: zone.radius || 10,
            effect: zone.effect || 'none',
            intensity: zone.intensity || 1.0,
            soundName: zone.soundName || null,
            volume: zone.volume || 0.5
        });
    }

    /**
     * Remove an environmental audio zone
     */
    removeAudioZone(index) {
        if (index >= 0 && index < this.audioZones.length) {
            this.audioZones.splice(index, 1);
        }
    }

    /**
     * Set spatial audio configuration
     */
    setConfig(config) {
        this.config = { ...this.config, ...config };
        
        // Update existing sources with new config
        for (const spatialSource of this.spatialSources.values()) {
            if (spatialSource.panner) {
                spatialSource.panner.refDistance = this.config.refDistance;
                spatialSource.panner.maxDistance = this.config.maxDistance;
                spatialSource.panner.rolloffFactor = this.config.rolloffFactor;
            }
        }
    }

    /**
     * Enable or disable occlusion system
     */
    setOcclusionEnabled(enabled) {
        this.occlusionEnabled = enabled;
    }

    /**
     * Dispose of spatial audio system
     */
    dispose() {
        // Stop all spatial sources
        for (const spatialSource of this.spatialSources.values()) {
            this.stopSpatialSource(spatialSource);
        }
        
        this.spatialSources.clear();
        this.audioZones.length = 0;
        
        console.log('SpatialAudio system disposed');
    }

    /**
     * Update panner node position
     */
    _updatePannerPosition(panner, position) {
        const currentTime = this.audioContext.currentTime;
        panner.positionX.setValueAtTime(position.x, currentTime);
        panner.positionY.setValueAtTime(position.y, currentTime);
        panner.positionZ.setValueAtTime(position.z, currentTime);
    }

    /**
     * Update listener position and orientation
     */
    _updateListener() {
        if (!this.gameEngine.camera) return;

        const camera = this.gameEngine.camera;
        const currentTime = this.audioContext.currentTime;

        // Update listener position
        this.listener.positionX.setValueAtTime(camera.position.x, currentTime);
        this.listener.positionY.setValueAtTime(camera.position.y, currentTime);
        this.listener.positionZ.setValueAtTime(camera.position.z, currentTime);

        // Update listener orientation
        const forward = new THREE.Vector3(0, 0, -1);
        const up = new THREE.Vector3(0, 1, 0);
        
        forward.applyQuaternion(camera.quaternion);
        up.applyQuaternion(camera.quaternion);

        this.listener.forwardX.setValueAtTime(forward.x, currentTime);
        this.listener.forwardY.setValueAtTime(forward.y, currentTime);
        this.listener.forwardZ.setValueAtTime(forward.z, currentTime);
        this.listener.upX.setValueAtTime(up.x, currentTime);
        this.listener.upY.setValueAtTime(up.y, currentTime);
        this.listener.upZ.setValueAtTime(up.z, currentTime);
    }

    /**
     * Update individual spatial source
     */
    _updateSpatialSource(spatialSource, deltaTime) {
        // Update volume based on occlusion, obstruction, and environmental factors
        const finalVolume = spatialSource.volume * 
                           spatialSource.occlusionFactor * 
                           spatialSource.obstructionFactor * 
                           spatialSource.environmentalGain *
                           this.audioManager.volumes.effects * 
                           this.audioManager.volumes.master;

        spatialSource.gainNode.gain.setTargetAtTime(finalVolume, this.audioContext.currentTime, 0.1);
    }

    /**
     * Apply doppler effect to spatial source
     */
    _applyDopplerEffect(spatialSource) {
        if (!this.gameEngine.camera) return;

        // Calculate relative velocity between source and listener
        const listenerVelocity = new THREE.Vector3(); // Assume stationary listener for now
        const relativeVelocity = new THREE.Vector3().subVectors(spatialSource.velocity, listenerVelocity);
        
        // Calculate direction from listener to source
        const direction = new THREE.Vector3().subVectors(spatialSource.position, this.gameEngine.camera.position).normalize();
        
        // Calculate doppler shift
        const velocityComponent = relativeVelocity.dot(direction);
        const dopplerShift = this.config.speedOfSound / (this.config.speedOfSound - velocityComponent * this.config.dopplerFactor);
        
        // Apply pitch shift (clamped to reasonable range)
        const pitchShift = Math.max(0.5, Math.min(2.0, dopplerShift));
        spatialSource.source.playbackRate.setTargetAtTime(pitchShift, this.audioContext.currentTime, 0.1);
    }

    /**
     * Update occlusion and obstruction for spatial source
     */
    _updateOcclusion(spatialSource) {
        if (!this.obstructionRaycast || !this.gameEngine.camera) return;

        // Cast ray from listener to source
        const listenerPosition = this.gameEngine.camera.position;
        const direction = new THREE.Vector3().subVectors(spatialSource.position, listenerPosition).normalize();
        const distance = listenerPosition.distanceTo(spatialSource.position);

        this.obstructionRaycast.set(listenerPosition, direction);
        this.obstructionRaycast.far = distance;

        // Check for intersections with scene objects
        const intersections = this.obstructionRaycast.intersectObjects(this.gameEngine.scene.children, true);
        
        if (intersections.length > 0) {
            // Calculate occlusion based on materials and distance
            let occlusionFactor = 1.0;
            let obstructionFactor = 1.0;

            for (const intersection of intersections) {
                // Simple occlusion model - reduce volume based on material
                const material = intersection.object.material;
                if (material) {
                    // Different materials have different occlusion properties
                    if (material.name && material.name.includes('wall')) {
                        occlusionFactor *= 0.3; // Walls block most sound
                    } else if (material.name && material.name.includes('glass')) {
                        occlusionFactor *= 0.7; // Glass blocks some sound
                    } else {
                        occlusionFactor *= 0.8; // Generic obstruction
                    }
                }
            }

            spatialSource.occlusionFactor = Math.max(0.1, occlusionFactor);
            spatialSource.obstructionFactor = Math.max(0.1, obstructionFactor);
        } else {
            // No obstruction
            spatialSource.occlusionFactor = 1.0;
            spatialSource.obstructionFactor = 1.0;
        }
    }

    /**
     * Update environmental effects for spatial source
     */
    _updateEnvironmentalEffects(spatialSource) {
        let environmentalGain = 1.0;

        // Check if source is within any audio zones
        for (const zone of this.audioZones) {
            const distance = spatialSource.position.distanceTo(zone.position);
            
            if (distance <= zone.radius) {
                // Apply zone effect based on distance
                const influence = 1.0 - (distance / zone.radius);
                
                switch (zone.effect) {
                    case 'reverb':
                        // Increase volume slightly for reverb zones
                        environmentalGain *= 1.0 + (influence * 0.2);
                        break;
                    case 'muffle':
                        // Decrease volume for muffled zones
                        environmentalGain *= 1.0 - (influence * 0.5);
                        break;
                    case 'echo':
                        // Slight volume boost for echo zones
                        environmentalGain *= 1.0 + (influence * 0.1);
                        break;
                }
            }
        }

        spatialSource.environmentalGain = environmentalGain;
    }

    /**
     * Generate unique ID for spatial sources
     */
    _generateId() {
        return 'spatial_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}