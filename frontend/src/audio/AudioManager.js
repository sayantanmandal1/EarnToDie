import * as THREE from 'three';

/**
 * AudioManager class for centralized audio management using Web Audio API
 * Handles spatial audio, engine sounds, impact effects, and background music
 */
export class AudioManager {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.audioContext = null;
        this.listener = null;
        
        // Audio categories with separate volume controls
        this.volumes = {
            master: 1.0,
            effects: 1.0,
            music: 1.0,
            engine: 1.0
        };
        
        // Audio sources and buffers
        this.audioBuffers = new Map();
        this.activeSources = new Map();
        this.musicSource = null;
        
        // Spatial audio settings
        this.maxDistance = 100;
        this.rolloffFactor = 1;
        this.refDistance = 1;
        
        // Engine audio system
        this.engineAudio = {
            source: null,
            gainNode: null,
            baseFrequency: 100,
            rpmMultiplier: 0.02,
            isPlaying: false
        };
        
        // Background music system
        this.musicSystem = {
            currentTrack: null,
            intensity: 0.5, // 0 = calm, 1 = intense
            fadeSpeed: 0.02,
            tracks: {
                menu: 'audio/music/menu_theme.mp3',
                gameplay_calm: 'audio/music/gameplay_calm.mp3',
                gameplay_intense: 'audio/music/gameplay_intense.mp3',
                garage: 'audio/music/garage_theme.mp3'
            }
        };
        
        // Sound effect definitions
        this.soundEffects = {
            // Vehicle sounds
            engine_start: 'audio/effects/engine_start.mp3',
            engine_idle: 'audio/effects/engine_idle.mp3',
            engine_rev: 'audio/effects/engine_rev.mp3',
            tire_screech: 'audio/effects/tire_screech.mp3',
            brake_squeal: 'audio/effects/brake_squeal.mp3',
            
            // Combat sounds
            zombie_hit_soft: 'audio/effects/zombie_hit_soft.mp3',
            zombie_hit_hard: 'audio/effects/zombie_hit_hard.mp3',
            zombie_splat: 'audio/effects/zombie_splat.mp3',
            metal_impact: 'audio/effects/metal_impact.mp3',
            glass_break: 'audio/effects/glass_break.mp3',
            explosion_small: 'audio/effects/explosion_small.mp3',
            explosion_large: 'audio/effects/explosion_large.mp3',
            
            // Zombie sounds
            zombie_groan: 'audio/effects/zombie_groan.mp3',
            zombie_scream: 'audio/effects/zombie_scream.mp3',
            zombie_death: 'audio/effects/zombie_death.mp3',
            
            // UI sounds
            button_click: 'audio/effects/button_click.mp3',
            button_hover: 'audio/effects/button_hover.mp3',
            purchase_success: 'audio/effects/purchase_success.mp3',
            purchase_fail: 'audio/effects/purchase_fail.mp3',
            level_complete: 'audio/effects/level_complete.mp3',
            game_over: 'audio/effects/game_over.mp3',
            
            // Environmental sounds
            wind: 'audio/effects/wind.mp3',
            debris: 'audio/effects/debris.mp3',
            checkpoint: 'audio/effects/checkpoint.mp3'
        };
        
        this.isInitialized = false;
        this.isEnabled = true;
    }

    /**
     * Initialize the audio system
     */
    async initialize() {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create Three.js audio listener
            this.listener = new THREE.AudioListener();
            if (this.gameEngine.camera) {
                this.gameEngine.camera.add(this.listener);
            }
            
            // Load audio assets
            await this._loadAudioAssets();
            
            // Initialize engine audio system
            this._initializeEngineAudio();
            
            // Setup audio context resume (required for some browsers)
            this._setupAudioContextResume();
            
            this.isInitialized = true;
            console.log('AudioManager initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize AudioManager:', error);
            this.isEnabled = false;
            return false;
        }
    }

    /**
     * Update audio system each frame
     */
    update(deltaTime) {
        if (!this.isInitialized || !this.isEnabled) return;
        
        // Update music intensity based on gameplay state
        this._updateMusicIntensity(deltaTime);
        
        // Update spatial audio positions
        this._updateSpatialAudio();
        
        // Clean up finished audio sources
        this._cleanupFinishedSources();
    }

    /**
     * Set volume for a specific audio category
     */
    setVolume(category, volume) {
        if (Object.prototype.hasOwnProperty.call(this.volumes, category)) {
            this.volumes[category] = Math.max(0, Math.min(1, volume));
            this._updateCategoryVolumes(category);
        }
    }

    /**
     * Get volume for a specific audio category
     */
    getVolume(category) {
        return this.volumes[category] || 0;
    }

    /**
     * Play a sound effect at a specific position
     */
    playSound(soundName, position = null, volume = 1.0, pitch = 1.0) {
        if (!this.isInitialized || !this.isEnabled) return null;
        
        const buffer = this.audioBuffers.get(soundName);
        if (!buffer) {
            console.warn(`Sound effect '${soundName}' not found`);
            return null;
        }
        
        try {
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            
            // Create gain node for volume control
            const gainNode = this.audioContext.createGain();
            const finalVolume = volume * this.volumes.effects * this.volumes.master;
            gainNode.gain.setValueAtTime(finalVolume, this.audioContext.currentTime);
            
            // Set playback rate for pitch control
            source.playbackRate.setValueAtTime(pitch, this.audioContext.currentTime);
            
            // Setup spatial audio if position is provided
            let pannerNode = null;
            if (position && this.listener) {
                pannerNode = this.audioContext.createPanner();
                pannerNode.panningModel = 'HRTF';
                pannerNode.distanceModel = 'inverse';
                pannerNode.refDistance = this.refDistance;
                pannerNode.maxDistance = this.maxDistance;
                pannerNode.rolloffFactor = this.rolloffFactor;
                
                // Set position
                pannerNode.positionX.setValueAtTime(position.x, this.audioContext.currentTime);
                pannerNode.positionY.setValueAtTime(position.y, this.audioContext.currentTime);
                pannerNode.positionZ.setValueAtTime(position.z, this.audioContext.currentTime);
                
                // Connect: source -> panner -> gain -> destination
                source.connect(pannerNode);
                pannerNode.connect(gainNode);
            } else {
                // Connect: source -> gain -> destination
                source.connect(gainNode);
            }
            
            gainNode.connect(this.audioContext.destination);
            
            // Store reference for cleanup
            const sourceId = this._generateSourceId();
            this.activeSources.set(sourceId, {
                source,
                gainNode,
                pannerNode,
                startTime: this.audioContext.currentTime
            });
            
            // Setup cleanup when sound finishes
            source.onended = () => {
                this.activeSources.delete(sourceId);
            };
            
            // Start playback
            source.start();
            
            return sourceId;
        } catch (error) {
            console.error(`Failed to play sound '${soundName}':`, error);
            return null;
        }
    }

    /**
     * Stop a specific sound by its ID
     */
    stopSound(sourceId) {
        const audioSource = this.activeSources.get(sourceId);
        if (audioSource) {
            try {
                audioSource.source.stop();
                this.activeSources.delete(sourceId);
            } catch (error) {
                console.error('Failed to stop sound:', error);
            }
        }
    }

    /**
     * Play background music
     */
    playMusic(trackName, fadeIn = true) {
        if (!this.isInitialized || !this.isEnabled) return;
        
        const trackPath = this.musicSystem.tracks[trackName];
        if (!trackPath) {
            console.warn(`Music track '${trackName}' not found`);
            return;
        }
        
        // Stop current music if playing
        if (this.musicSource) {
            this.stopMusic(fadeIn);
        }
        
        const buffer = this.audioBuffers.get(trackName);
        if (!buffer) {
            console.warn(`Music buffer for '${trackName}' not loaded`);
            return;
        }
        
        try {
            this.musicSource = this.audioContext.createBufferSource();
            this.musicSource.buffer = buffer;
            this.musicSource.loop = true;
            
            // Create gain node for music volume
            const musicGain = this.audioContext.createGain();
            const targetVolume = this.volumes.music * this.volumes.master;
            
            if (fadeIn) {
                musicGain.gain.setValueAtTime(0, this.audioContext.currentTime);
                musicGain.gain.linearRampToValueAtTime(targetVolume, this.audioContext.currentTime + 2);
            } else {
                musicGain.gain.setValueAtTime(targetVolume, this.audioContext.currentTime);
            }
            
            this.musicSource.connect(musicGain);
            musicGain.connect(this.audioContext.destination);
            
            this.musicSource.start();
            this.musicSystem.currentTrack = trackName;
            
            console.log(`Started playing music: ${trackName}`);
        } catch (error) {
            console.error(`Failed to play music '${trackName}':`, error);
        }
    }

    /**
     * Stop background music
     */
    stopMusic(fadeOut = true) {
        if (!this.musicSource) return;
        
        try {
            if (fadeOut) {
                // Fade out over 1 second
                const musicGain = this.musicSource.context.createGain();
                musicGain.gain.setValueAtTime(this.volumes.music * this.volumes.master, this.audioContext.currentTime);
                musicGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1);
                
                setTimeout(() => {
                    if (this.musicSource) {
                        this.musicSource.stop();
                        this.musicSource = null;
                    }
                }, 1000);
            } else {
                this.musicSource.stop();
                this.musicSource = null;
            }
            
            this.musicSystem.currentTrack = null;
        } catch (error) {
            console.error('Failed to stop music:', error);
        }
    }

    /**
     * Start engine audio for a vehicle
     */
    startEngineAudio(vehicle) {
        if (!this.isInitialized || !this.isEnabled || !vehicle) return;
        
        try {
            // Stop existing engine audio
            this.stopEngineAudio();
            
            const buffer = this.audioBuffers.get('engine_idle');
            if (!buffer) {
                console.warn('Engine idle sound not loaded');
                return;
            }
            
            this.engineAudio.source = this.audioContext.createBufferSource();
            this.engineAudio.source.buffer = buffer;
            this.engineAudio.source.loop = true;
            
            // Create gain node for engine volume
            this.engineAudio.gainNode = this.audioContext.createGain();
            const baseVolume = this.volumes.engine * this.volumes.master * 0.5;
            this.engineAudio.gainNode.gain.setValueAtTime(baseVolume, this.audioContext.currentTime);
            
            // Connect audio chain
            this.engineAudio.source.connect(this.engineAudio.gainNode);
            this.engineAudio.gainNode.connect(this.audioContext.destination);
            
            // Start playback
            this.engineAudio.source.start();
            this.engineAudio.isPlaying = true;
            this.engineAudio.vehicle = vehicle;
            
        } catch (error) {
            console.error('Failed to start engine audio:', error);
        }
    }

    /**
     * Stop engine audio
     */
    stopEngineAudio() {
        if (this.engineAudio.source && this.engineAudio.isPlaying) {
            try {
                this.engineAudio.source.stop();
            } catch (error) {
                console.error('Failed to stop engine audio:', error);
            }
        }
        
        this.engineAudio.source = null;
        this.engineAudio.gainNode = null;
        this.engineAudio.isPlaying = false;
        this.engineAudio.vehicle = null;
    }

    /**
     * Update engine audio based on vehicle RPM and state
     */
    updateEngineAudio(vehicle, rpm, throttle = 0) {
        if (!this.engineAudio.isPlaying || !this.engineAudio.source || !vehicle) return;
        
        try {
            // Calculate pitch based on RPM
            const normalizedRPM = Math.max(0, Math.min(1, rpm / 6000)); // Normalize to 0-1
            const pitch = 0.8 + (normalizedRPM * 0.8); // Pitch range: 0.8 to 1.6
            
            // Calculate volume based on throttle
            const baseVolume = this.volumes.engine * this.volumes.master * 0.5;
            const throttleVolume = 0.3 + (throttle * 0.7); // Volume range: 0.3 to 1.0
            const finalVolume = baseVolume * throttleVolume;
            
            // Apply changes smoothly
            const currentTime = this.audioContext.currentTime;
            this.engineAudio.source.playbackRate.setTargetAtTime(pitch, currentTime, 0.1);
            this.engineAudio.gainNode.gain.setTargetAtTime(finalVolume, currentTime, 0.1);
            
        } catch (error) {
            console.error('Failed to update engine audio:', error);
        }
    }

    /**
     * Play impact sound effect for zombie collisions
     */
    playImpactSound(impactType, position, intensity = 1.0) {
        let soundName;
        
        switch (impactType) {
            case 'zombie_soft':
                soundName = 'zombie_hit_soft';
                break;
            case 'zombie_hard':
                soundName = 'zombie_hit_hard';
                break;
            case 'zombie_splat':
                soundName = 'zombie_splat';
                break;
            case 'metal':
                soundName = 'metal_impact';
                break;
            case 'glass':
                soundName = 'glass_break';
                break;
            case 'explosion_small':
                soundName = 'explosion_small';
                break;
            case 'explosion_large':
                soundName = 'explosion_large';
                break;
            default:
                soundName = 'zombie_hit_soft';
        }
        
        const volume = Math.max(0.1, Math.min(1.0, intensity));
        const pitch = 0.8 + (Math.random() * 0.4); // Random pitch variation
        
        return this.playSound(soundName, position, volume, pitch);
    }

    /**
     * Set music intensity based on gameplay state
     */
    setMusicIntensity(intensity) {
        this.musicSystem.intensity = Math.max(0, Math.min(1, intensity));
    }

    /**
     * Enable or disable audio system
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        
        if (!enabled) {
            // Stop all audio when disabled
            this.stopMusic(false);
            this.stopEngineAudio();
            this._stopAllSounds();
        }
    }

    /**
     * Dispose of audio resources
     */
    dispose() {
        this.stopMusic(false);
        this.stopEngineAudio();
        this._stopAllSounds();
        
        if (this.audioContext && typeof this.audioContext.close === 'function') {
            this.audioContext.close();
        }
        
        this.audioBuffers.clear();
        this.activeSources.clear();
        
        console.log('AudioManager disposed');
    }

    /**
     * Load all audio assets
     */
    async _loadAudioAssets() {
        const loader = new THREE.AudioLoader();
        const loadPromises = [];
        
        // Load sound effects
        for (const [name, path] of Object.entries(this.soundEffects)) {
            loadPromises.push(this._loadAudioBuffer(loader, name, path));
        }
        
        // Load music tracks
        for (const [name, path] of Object.entries(this.musicSystem.tracks)) {
            loadPromises.push(this._loadAudioBuffer(loader, name, path));
        }
        
        try {
            await Promise.all(loadPromises);
            console.log('All audio assets loaded successfully');
        } catch (error) {
            console.error('Failed to load some audio assets:', error);
        }
    }

    /**
     * Load a single audio buffer
     */
    async _loadAudioBuffer(loader, name, path) {
        return new Promise((resolve, reject) => {
            loader.load(
                path,
                (buffer) => {
                    this.audioBuffers.set(name, buffer);
                    resolve();
                },
                (progress) => {
                    // Loading progress
                },
                (error) => {
                    console.warn(`Failed to load audio: ${path}`, error);
                    resolve(); // Don't reject to allow other assets to load
                }
            );
        });
    }

    /**
     * Initialize engine audio system
     */
    _initializeEngineAudio() {
        // Engine audio is initialized when startEngineAudio is called
        console.log('Engine audio system ready');
    }

    /**
     * Setup audio context resume for browser compatibility
     */
    _setupAudioContextResume() {
        // Some browsers require user interaction to start audio context
        const resumeAudio = () => {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        };
        
        document.addEventListener('click', resumeAudio, { once: true });
        document.addEventListener('keydown', resumeAudio, { once: true });
    }

    /**
     * Update music intensity based on gameplay state
     */
    _updateMusicIntensity(deltaTime) {
        // This would be called by the game to adjust music based on action level
        // For now, it's a placeholder for dynamic music system
    }

    /**
     * Update spatial audio positions
     */
    _updateSpatialAudio() {
        if (!this.listener || !this.gameEngine.camera) return;
        
        // Update listener position and orientation
        const camera = this.gameEngine.camera;
        this.listener.position.copy(camera.position);
        this.listener.setRotationFromMatrix(camera.matrixWorld);
    }

    /**
     * Clean up finished audio sources
     */
    _cleanupFinishedSources() {
        const currentTime = this.audioContext.currentTime;
        const sourcesToRemove = [];
        
        for (const [id, audioSource] of this.activeSources) {
            // Remove sources that have been playing for longer than expected
            if (currentTime - audioSource.startTime > 30) { // 30 second cleanup threshold
                sourcesToRemove.push(id);
            }
        }
        
        sourcesToRemove.forEach(id => {
            this.stopSound(id);
        });
    }

    /**
     * Update volumes for a specific category
     */
    _updateCategoryVolumes(category) {
        // Update active sources based on category
        if (category === 'master' || category === 'effects') {
            for (const audioSource of this.activeSources.values()) {
                if (audioSource.gainNode) {
                    const newVolume = this.volumes.effects * this.volumes.master;
                    audioSource.gainNode.gain.setTargetAtTime(newVolume, this.audioContext.currentTime, 0.1);
                }
            }
        }
        
        if (category === 'master' || category === 'engine') {
            if (this.engineAudio.gainNode) {
                const newVolume = this.volumes.engine * this.volumes.master * 0.5;
                this.engineAudio.gainNode.gain.setTargetAtTime(newVolume, this.audioContext.currentTime, 0.1);
            }
        }
    }

    /**
     * Stop all active sound effects
     */
    _stopAllSounds() {
        for (const [id, audioSource] of this.activeSources) {
            try {
                audioSource.source.stop();
            } catch (error) {
                // Ignore errors when stopping sounds
            }
        }
        this.activeSources.clear();
    }

    /**
     * Generate unique ID for audio sources
     */
    _generateSourceId() {
        return 'audio_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}