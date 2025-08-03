/**
 * Atmospheric Effects Manager
 * Handles real-time atmospheric effects including audio, visual, and environmental elements
 */

export class AtmosphericEffectsManager {
    constructor(audioManager, visualEffectsManager, options = {}) {
        this.audioManager = audioManager;
        this.visualEffectsManager = visualEffectsManager;
        
        this.options = {
            maxConcurrentEffects: 10,
            fadeInDuration: 2000,
            fadeOutDuration: 3000,
            updateInterval: 100,
            spatialAudioEnabled: true,
            ...options
        };

        // Active effects tracking
        this.activeEffects = new Map();
        this.effectQueue = [];
        this.updateTimer = null;
        
        // Environmental state
        this.environmentalState = {
            temperature: 20, // Celsius
            humidity: 0.5,
            windSpeed: 0.1,
            windDirection: 0,
            lightLevel: 0.8,
            fogDensity: 0.0,
            electricalActivity: 0.0
        };

        // Effect intensity modifiers
        this.intensityModifiers = {
            global: 1.0,
            audio: 1.0,
            visual: 1.0,
            environmental: 1.0
        };

        this.isInitialized = false;
    }

    /**
     * Initialize the atmospheric effects manager
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Start the update loop
            this.startUpdateLoop();
            this.isInitialized = true;
            
            console.log('Atmospheric Effects Manager initialized');
        } catch (error) {
            console.error('Failed to initialize Atmospheric Effects Manager:', error);
            throw error;
        }
    }

    /**
     * Start the main update loop
     */
    startUpdateLoop() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }

        this.updateTimer = setInterval(() => {
            this.updateActiveEffects();
            this.processEffectQueue();
        }, this.options.updateInterval);
    }

    /**
     * Stop the update loop
     */
    stopUpdateLoop() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }

    /**
     * Add atmospheric effect
     */
    addEffect(effectData) {
        if (!this.isInitialized) {
            console.warn('Atmospheric Effects Manager not initialized');
            return null;
        }

        const effect = this.createEffectInstance(effectData);
        
        // Check if we can add immediately or need to queue
        if (this.activeEffects.size < this.options.maxConcurrentEffects) {
            this.activateEffect(effect);
        } else {
            this.effectQueue.push(effect);
        }

        return effect.id;
    }

    /**
     * Remove atmospheric effect
     */
    removeEffect(effectId, fadeOut = true) {
        const effect = this.activeEffects.get(effectId);
        if (!effect) return false;

        if (fadeOut) {
            this.fadeOutEffect(effect);
        } else {
            this.deactivateEffect(effectId);
        }

        return true;
    }

    /**
     * Create effect instance
     */
    createEffectInstance(effectData) {
        const effect = {
            id: `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: effectData.type || 'ambient',
            startTime: Date.now(),
            duration: effectData.duration || -1, // -1 for infinite
            intensity: effectData.intensity || 0.5,
            position: effectData.position || null,
            fadeInDuration: effectData.fadeInDuration || this.options.fadeInDuration,
            fadeOutDuration: effectData.fadeOutDuration || this.options.fadeOutDuration,
            
            // Effect-specific properties
            audioProperties: effectData.audioProperties || {},
            visualProperties: effectData.visualProperties || {},
            environmentalProperties: effectData.environmentalProperties || {},
            
            // State tracking
            currentIntensity: 0,
            targetIntensity: effectData.intensity || 0.5,
            isActive: false,
            isFadingIn: false,
            isFadingOut: false,
            
            // References to created objects
            audioSources: [],
            visualObjects: [],
            environmentalModifiers: []
        };

        return effect;
    }

    /**
     * Activate an effect
     */
    activateEffect(effect) {
        try {
            // Create audio components
            if (effect.audioProperties && Object.keys(effect.audioProperties).length > 0) {
                this.createAudioComponents(effect);
            }

            // Create visual components
            if (effect.visualProperties && Object.keys(effect.visualProperties).length > 0) {
                this.createVisualComponents(effect);
            }

            // Apply environmental modifications
            if (effect.environmentalProperties && Object.keys(effect.environmentalProperties).length > 0) {
                this.applyEnvironmentalModifications(effect);
            }

            // Start fade-in
            effect.isActive = true;
            effect.isFadingIn = true;
            this.activeEffects.set(effect.id, effect);

            console.log(`Activated atmospheric effect: ${effect.id}`);
        } catch (error) {
            console.error(`Failed to activate effect ${effect.id}:`, error);
        }
    }

    /**
     * Deactivate an effect
     */
    deactivateEffect(effectId) {
        const effect = this.activeEffects.get(effectId);
        if (!effect) return;

        try {
            // Clean up audio components
            effect.audioSources.forEach(source => {
                if (this.audioManager && this.audioManager.stopSound) {
                    this.audioManager.stopSound(source.id);
                }
            });

            // Clean up visual components
            effect.visualObjects.forEach(obj => {
                if (this.visualEffectsManager && this.visualEffectsManager.removeEffect) {
                    this.visualEffectsManager.removeEffect(obj.id);
                }
            });

            // Remove environmental modifications
            this.removeEnvironmentalModifications(effect);

            this.activeEffects.delete(effectId);
            console.log(`Deactivated atmospheric effect: ${effectId}`);
        } catch (error) {
            console.error(`Failed to deactivate effect ${effectId}:`, error);
        }
    }

    /**
     * Create audio components for an effect
     */
    createAudioComponents(effect) {
        const audioProps = effect.audioProperties;
        
        if (audioProps.ambientSound) {
            const audioSource = {
                id: `${effect.id}_ambient`,
                file: audioProps.ambientSound.file,
                volume: 0, // Start at 0 for fade-in
                loop: audioProps.ambientSound.loop !== false,
                spatial: effect.position && this.options.spatialAudioEnabled,
                position: effect.position
            };

            if (this.audioManager && this.audioManager.playSound) {
                this.audioManager.playSound(audioSource.file, {
                    volume: audioSource.volume,
                    loop: audioSource.loop,
                    spatial: audioSource.spatial,
                    position: audioSource.position
                });
            }

            effect.audioSources.push(audioSource);
        }

        if (audioProps.randomSounds && audioProps.randomSounds.length > 0) {
            audioProps.randomSounds.forEach((soundConfig, index) => {
                const audioSource = {
                    id: `${effect.id}_random_${index}`,
                    files: soundConfig.files,
                    interval: soundConfig.interval || 10000,
                    volumeRange: soundConfig.volumeRange || [0.1, 0.5],
                    lastPlayed: 0
                };

                effect.audioSources.push(audioSource);
            });
        }
    }

    /**
     * Create visual components for an effect
     */
    createVisualComponents(effect) {
        const visualProps = effect.visualProperties;

        if (visualProps.particles) {
            const particleSystem = {
                id: `${effect.id}_particles`,
                type: 'particles',
                config: {
                    count: visualProps.particles.count || 100,
                    size: visualProps.particles.size || 1.0,
                    color: visualProps.particles.color || '#ffffff',
                    opacity: 0, // Start at 0 for fade-in
                    movement: visualProps.particles.movement || { x: 0, y: 0, z: 0 },
                    position: effect.position
                }
            };

            if (this.visualEffectsManager && this.visualEffectsManager.addParticleSystem) {
                this.visualEffectsManager.addParticleSystem(particleSystem.config);
            }

            effect.visualObjects.push(particleSystem);
        }

        if (visualProps.fog) {
            const fogEffect = {
                id: `${effect.id}_fog`,
                type: 'fog',
                config: {
                    density: 0, // Start at 0 for fade-in
                    color: visualProps.fog.color || '#cccccc',
                    near: visualProps.fog.near || 1,
                    far: visualProps.fog.far || 1000
                }
            };

            if (this.visualEffectsManager && this.visualEffectsManager.setFog) {
                this.visualEffectsManager.setFog(fogEffect.config);
            }

            effect.visualObjects.push(fogEffect);
        }

        if (visualProps.lighting) {
            const lightingEffect = {
                id: `${effect.id}_lighting`,
                type: 'lighting',
                config: {
                    intensity: 0, // Start at 0 for fade-in
                    color: visualProps.lighting.color || '#ffffff',
                    flickerRate: visualProps.lighting.flickerRate || 0,
                    position: effect.position
                }
            };

            if (this.visualEffectsManager && this.visualEffectsManager.addLight) {
                this.visualEffectsManager.addLight(lightingEffect.config);
            }

            effect.visualObjects.push(lightingEffect);
        }
    }

    /**
     * Apply environmental modifications
     */
    applyEnvironmentalModifications(effect) {
        const envProps = effect.environmentalProperties;

        Object.keys(envProps).forEach(property => {
            if (property in this.environmentalState) {
                const modifier = {
                    property,
                    originalValue: this.environmentalState[property],
                    targetValue: envProps[property],
                    currentValue: this.environmentalState[property]
                };

                effect.environmentalModifiers.push(modifier);
            }
        });
    }

    /**
     * Remove environmental modifications
     */
    removeEnvironmentalModifications(effect) {
        effect.environmentalModifiers.forEach(modifier => {
            this.environmentalState[modifier.property] = modifier.originalValue;
        });
    }

    /**
     * Update active effects
     */
    updateActiveEffects() {
        const currentTime = Date.now();

        this.activeEffects.forEach((effect, effectId) => {
            const elapsedTime = currentTime - effect.startTime;

            // Handle fade-in
            if (effect.isFadingIn) {
                const fadeProgress = Math.min(1, elapsedTime / effect.fadeInDuration);
                effect.currentIntensity = effect.targetIntensity * fadeProgress;

                if (fadeProgress >= 1) {
                    effect.isFadingIn = false;
                }

                this.updateEffectIntensity(effect);
            }

            // Handle fade-out
            if (effect.isFadingOut) {
                const fadeOutStart = effect.fadeOutStartTime || currentTime;
                const fadeProgress = Math.min(1, (currentTime - fadeOutStart) / effect.fadeOutDuration);
                effect.currentIntensity = effect.targetIntensity * (1 - fadeProgress);

                if (fadeProgress >= 1) {
                    this.deactivateEffect(effectId);
                    return;
                }

                this.updateEffectIntensity(effect);
            }

            // Check for duration expiry
            if (effect.duration > 0 && elapsedTime >= effect.duration) {
                this.fadeOutEffect(effect);
            }

            // Update random audio effects
            this.updateRandomAudio(effect, currentTime);

            // Update environmental modifications
            this.updateEnvironmentalModifications(effect);
        });
    }

    /**
     * Update effect intensity
     */
    updateEffectIntensity(effect) {
        const globalIntensity = effect.currentIntensity * this.intensityModifiers.global;

        // Update audio intensity
        effect.audioSources.forEach(source => {
            const audioIntensity = globalIntensity * this.intensityModifiers.audio;
            if (this.audioManager && this.audioManager.setVolume) {
                this.audioManager.setVolume(source.id, audioIntensity);
            }
        });

        // Update visual intensity
        effect.visualObjects.forEach(obj => {
            const visualIntensity = globalIntensity * this.intensityModifiers.visual;
            
            if (obj.type === 'particles' && this.visualEffectsManager) {
                if (this.visualEffectsManager.updateParticleOpacity) {
                    this.visualEffectsManager.updateParticleOpacity(obj.id, visualIntensity);
                }
            } else if (obj.type === 'fog' && this.visualEffectsManager) {
                if (this.visualEffectsManager.setFogDensity) {
                    this.visualEffectsManager.setFogDensity(visualIntensity * obj.config.density);
                }
            } else if (obj.type === 'lighting' && this.visualEffectsManager) {
                if (this.visualEffectsManager.setLightIntensity) {
                    this.visualEffectsManager.setLightIntensity(obj.id, visualIntensity);
                }
            }
        });
    }

    /**
     * Update random audio effects
     */
    updateRandomAudio(effect, currentTime) {
        effect.audioSources.forEach(source => {
            if (source.files && source.interval) {
                if (currentTime - source.lastPlayed >= source.interval) {
                    const randomFile = source.files[Math.floor(Math.random() * source.files.length)];
                    const randomVolume = source.volumeRange[0] + 
                        Math.random() * (source.volumeRange[1] - source.volumeRange[0]);

                    if (this.audioManager && this.audioManager.playSound) {
                        this.audioManager.playSound(randomFile, {
                            volume: randomVolume * effect.currentIntensity,
                            spatial: effect.position && this.options.spatialAudioEnabled,
                            position: effect.position
                        });
                    }

                    source.lastPlayed = currentTime;
                }
            }
        });
    }

    /**
     * Update environmental modifications
     */
    updateEnvironmentalModifications(effect) {
        const envIntensity = effect.currentIntensity * this.intensityModifiers.environmental;

        effect.environmentalModifiers.forEach(modifier => {
            const targetDelta = modifier.targetValue - modifier.originalValue;
            const currentDelta = targetDelta * envIntensity;
            modifier.currentValue = modifier.originalValue + currentDelta;
            
            this.environmentalState[modifier.property] = modifier.currentValue;
        });
    }

    /**
     * Fade out an effect
     */
    fadeOutEffect(effect) {
        if (effect.isFadingOut) return;

        effect.isFadingOut = true;
        effect.fadeOutStartTime = Date.now();
        effect.targetIntensity = effect.currentIntensity; // Fade from current intensity
    }

    /**
     * Process effect queue
     */
    processEffectQueue() {
        while (this.effectQueue.length > 0 && 
               this.activeEffects.size < this.options.maxConcurrentEffects) {
            const effect = this.effectQueue.shift();
            this.activateEffect(effect);
        }
    }

    /**
     * Set intensity modifier
     */
    setIntensityModifier(type, value) {
        if (type in this.intensityModifiers) {
            this.intensityModifiers[type] = Math.max(0, Math.min(1, value));
        }
    }

    /**
     * Get environmental state
     */
    getEnvironmentalState() {
        return { ...this.environmentalState };
    }

    /**
     * Set environmental state
     */
    setEnvironmentalState(newState) {
        Object.keys(newState).forEach(key => {
            if (key in this.environmentalState) {
                this.environmentalState[key] = newState[key];
            }
        });
    }

    /**
     * Get active effects count
     */
    getActiveEffectsCount() {
        return this.activeEffects.size;
    }

    /**
     * Get effect queue length
     */
    getEffectQueueLength() {
        return this.effectQueue.length;
    }

    /**
     * Clear all effects
     */
    clearAllEffects(fadeOut = true) {
        if (fadeOut) {
            this.activeEffects.forEach(effect => {
                this.fadeOutEffect(effect);
            });
        } else {
            const effectIds = Array.from(this.activeEffects.keys());
            effectIds.forEach(id => this.deactivateEffect(id));
        }

        this.effectQueue.length = 0;
    }

    /**
     * Dispose of the manager
     */
    dispose() {
        this.stopUpdateLoop();
        this.clearAllEffects(false);
        this.isInitialized = false;
        
        console.log('Atmospheric Effects Manager disposed');
    }
}

export default AtmosphericEffectsManager;