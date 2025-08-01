import * as THREE from 'three';

/**
 * EngineAudio class for realistic vehicle engine sounds with RPM-based modulation
 * Handles engine startup, idle, acceleration, deceleration, and gear shifting sounds
 */
export class EngineAudio {
    constructor(audioManager) {
        this.audioManager = audioManager;
        this.audioContext = audioManager.audioContext;
        
        // Engine audio state
        this.isActive = false;
        this.currentVehicle = null;
        
        // Audio nodes
        this.engineNodes = {
            idle: null,
            rev: null,
            startup: null,
            shutdown: null
        };
        
        // Engine parameters
        this.engineState = {
            rpm: 800,           // Current RPM
            targetRPM: 800,     // Target RPM
            minRPM: 600,        // Minimum idle RPM
            maxRPM: 6000,       // Maximum RPM
            throttle: 0,        // Throttle input (0-1)
            load: 0,            // Engine load (0-1)
            temperature: 0.5,   // Engine temperature (0-1)
            gear: 1,            // Current gear
            isStarting: false,
            isRunning: false
        };
        
        // Audio mixing parameters
        this.mixLevels = {
            idle: 1.0,
            rev: 0.0,
            exhaust: 0.3,
            turbo: 0.0,
            backfire: 0.0
        };
        
        // Engine sound characteristics per vehicle type
        this.engineProfiles = {
            sedan: {
                baseFreq: 80,
                rpmMultiplier: 0.015,
                exhaustTone: 0.3,
                smoothness: 0.8,
                volume: 0.6
            },
            sports_car: {
                baseFreq: 120,
                rpmMultiplier: 0.025,
                exhaustTone: 0.8,
                smoothness: 0.6,
                volume: 0.8
            },
            truck: {
                baseFreq: 60,
                rpmMultiplier: 0.012,
                exhaustTone: 0.9,
                smoothness: 0.9,
                volume: 0.9
            },
            monster_truck: {
                baseFreq: 50,
                rpmMultiplier: 0.018,
                exhaustTone: 1.0,
                smoothness: 0.5,
                volume: 1.0
            },
            motorcycle: {
                baseFreq: 150,
                rpmMultiplier: 0.035,
                exhaustTone: 0.7,
                smoothness: 0.4,
                volume: 0.7
            },
            tank: {
                baseFreq: 40,
                rpmMultiplier: 0.008,
                exhaustTone: 1.2,
                smoothness: 1.0,
                volume: 1.2
            }
        };
        
        // Audio processing nodes
        this.processingNodes = {
            masterGain: null,
            lowPassFilter: null,
            highPassFilter: null,
            compressor: null,
            distortion: null
        };
        
        // Performance optimization
        this.updateInterval = 1000 / 60; // 60 FPS
        this.lastUpdateTime = 0;
    }

    /**
     * Initialize engine audio system
     */
    async initialize() {
        if (!this.audioContext) {
            console.warn('Audio context not available for engine audio');
            return false;
        }

        try {
            // Create master processing chain
            this._createProcessingChain();
            
            console.log('EngineAudio system initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize EngineAudio:', error);
            return false;
        }
    }

    /**
     * Start engine audio for a specific vehicle
     */
    async startEngine(vehicle) {
        if (!vehicle || this.isActive) return false;

        this.currentVehicle = vehicle;
        const profile = this.engineProfiles[vehicle.type] || this.engineProfiles.sedan;

        try {
            // Play engine startup sound
            await this._playStartupSound(profile);
            
            // Initialize engine audio nodes
            await this._initializeEngineNodes(profile);
            
            // Set initial engine state
            this.engineState.isStarting = true;
            this.engineState.rpm = profile.baseFreq * 10; // Convert to RPM-like value
            this.engineState.targetRPM = this.engineState.minRPM;
            
            // Start engine idle after startup
            setTimeout(() => {
                this.engineState.isStarting = false;
                this.engineState.isRunning = true;
                this._startIdleLoop(profile);
            }, 1500); // Startup duration
            
            this.isActive = true;
            console.log(`Engine started for vehicle: ${vehicle.type}`);
            return true;
        } catch (error) {
            console.error('Failed to start engine audio:', error);
            return false;
        }
    }

    /**
     * Stop engine audio
     */
    async stopEngine() {
        if (!this.isActive) return;

        try {
            // Play shutdown sound
            if (this.currentVehicle) {
                const profile = this.engineProfiles[this.currentVehicle.type] || this.engineProfiles.sedan;
                await this._playShutdownSound(profile);
            }
            
            // Stop all engine nodes
            this._stopAllEngineNodes();
            
            // Reset state
            this.engineState.isRunning = false;
            this.engineState.rpm = 0;
            this.engineState.throttle = 0;
            this.isActive = false;
            this.currentVehicle = null;
            
            console.log('Engine stopped');
        } catch (error) {
            console.error('Failed to stop engine audio:', error);
        }
    }

    /**
     * Update engine audio based on vehicle state
     */
    update(deltaTime, vehicleState) {
        if (!this.isActive || !this.engineState.isRunning || !this.currentVehicle) return;

        const currentTime = performance.now();
        if (currentTime - this.lastUpdateTime < this.updateInterval) return;
        this.lastUpdateTime = currentTime;

        // Update engine parameters from vehicle state
        this._updateEngineParameters(vehicleState, deltaTime);
        
        // Update audio mixing based on engine state
        this._updateAudioMixing(deltaTime);
        
        // Apply audio effects
        this._updateAudioEffects();
    }

    /**
     * Set throttle input (0-1)
     */
    setThrottle(throttle) {
        this.engineState.throttle = Math.max(0, Math.min(1, throttle));
    }

    /**
     * Set engine load (0-1)
     */
    setLoad(load) {
        this.engineState.load = Math.max(0, Math.min(1, load));
    }

    /**
     * Shift gear
     */
    shiftGear(newGear) {
        if (newGear !== this.engineState.gear) {
            this.engineState.gear = newGear;
            this._playGearShiftSound();
        }
    }

    /**
     * Trigger backfire effect
     */
    triggerBackfire() {
        if (!this.isActive) return;
        
        this._playBackfireSound();
        
        // Temporarily increase exhaust mix
        this.mixLevels.backfire = 1.0;
        setTimeout(() => {
            this.mixLevels.backfire = 0.0;
        }, 200);
    }

    /**
     * Set engine audio volume
     */
    setVolume(volume) {
        if (this.processingNodes.masterGain) {
            const finalVolume = volume * this.audioManager.volumes.engine * this.audioManager.volumes.master;
            this.processingNodes.masterGain.gain.setTargetAtTime(finalVolume, this.audioContext.currentTime, 0.1);
        }
    }

    /**
     * Dispose of engine audio system
     */
    dispose() {
        this.stopEngine();
        this._disposeProcessingChain();
        this.isActive = false;
        console.log('EngineAudio system disposed');
    }

    /**
     * Create audio processing chain
     */
    _createProcessingChain() {
        // Master gain node
        this.processingNodes.masterGain = this.audioContext.createGain();
        this.processingNodes.masterGain.gain.setValueAtTime(0.8, this.audioContext.currentTime);

        // Low-pass filter for engine smoothness
        this.processingNodes.lowPassFilter = this.audioContext.createBiquadFilter();
        this.processingNodes.lowPassFilter.type = 'lowpass';
        this.processingNodes.lowPassFilter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
        this.processingNodes.lowPassFilter.Q.setValueAtTime(1, this.audioContext.currentTime);

        // High-pass filter for engine clarity
        this.processingNodes.highPassFilter = this.audioContext.createBiquadFilter();
        this.processingNodes.highPassFilter.type = 'highpass';
        this.processingNodes.highPassFilter.frequency.setValueAtTime(80, this.audioContext.currentTime);
        this.processingNodes.highPassFilter.Q.setValueAtTime(0.7, this.audioContext.currentTime);

        // Compressor for dynamic range control
        this.processingNodes.compressor = this.audioContext.createDynamicsCompressor();
        this.processingNodes.compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime);
        this.processingNodes.compressor.knee.setValueAtTime(30, this.audioContext.currentTime);
        this.processingNodes.compressor.ratio.setValueAtTime(12, this.audioContext.currentTime);
        this.processingNodes.compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
        this.processingNodes.compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);

        // Connect processing chain
        this.processingNodes.highPassFilter.connect(this.processingNodes.lowPassFilter);
        this.processingNodes.lowPassFilter.connect(this.processingNodes.compressor);
        this.processingNodes.compressor.connect(this.processingNodes.masterGain);
        this.processingNodes.masterGain.connect(this.audioContext.destination);
    }

    /**
     * Initialize engine audio nodes for a specific profile
     */
    async _initializeEngineNodes(profile) {
        // Create oscillators for engine sound synthesis
        this.engineNodes.idle = this._createEngineOscillator(profile.baseFreq, 'idle');
        this.engineNodes.rev = this._createEngineOscillator(profile.baseFreq * 1.5, 'rev');
        
        // Connect to processing chain
        this.engineNodes.idle.connect(this.processingNodes.highPassFilter);
        this.engineNodes.rev.connect(this.processingNodes.highPassFilter);
    }

    /**
     * Create engine oscillator with specific characteristics
     */
    _createEngineOscillator(baseFreq, type) {
        // Create oscillator
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = 'sawtooth'; // Rich harmonic content
        oscillator.frequency.setValueAtTime(baseFreq, this.audioContext.currentTime);

        // Create gain node for this oscillator
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(type === 'idle' ? 0.3 : 0.0, this.audioContext.currentTime);

        // Add some noise for realism
        const noiseBuffer = this._createNoiseBuffer();
        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;

        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(0.1, this.audioContext.currentTime);

        // Connect: oscillator -> gain, noise -> noiseGain -> gain
        oscillator.connect(gainNode);
        noiseSource.connect(noiseGain);
        noiseGain.connect(gainNode);

        // Start oscillator and noise
        oscillator.start();
        noiseSource.start();

        // Store references for cleanup
        gainNode._oscillator = oscillator;
        gainNode._noiseSource = noiseSource;
        gainNode._noiseGain = noiseGain;

        return gainNode;
    }

    /**
     * Create noise buffer for engine texture
     */
    _createNoiseBuffer() {
        const bufferSize = this.audioContext.sampleRate * 2; // 2 seconds
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        // Generate pink noise (more realistic than white noise)
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }

        return buffer;
    }

    /**
     * Play engine startup sound
     */
    async _playStartupSound(profile) {
        const startupSound = this.audioManager.audioBuffers.get('engine_start');
        if (startupSound) {
            const source = this.audioContext.createBufferSource();
            source.buffer = startupSound;
            
            const gainNode = this.audioContext.createGain();
            gainNode.gain.setValueAtTime(profile.volume * 0.8, this.audioContext.currentTime);
            
            source.connect(gainNode);
            gainNode.connect(this.processingNodes.masterGain);
            
            source.start();
        }
    }

    /**
     * Play engine shutdown sound
     */
    async _playShutdownSound(profile) {
        // Create a simple fade-out effect for shutdown
        if (this.processingNodes.masterGain) {
            this.processingNodes.masterGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1);
        }
    }

    /**
     * Start engine idle loop
     */
    _startIdleLoop(profile) {
        if (this.engineNodes.idle && this.engineNodes.idle._oscillator) {
            // Set idle frequency and volume
            const idleFreq = profile.baseFreq + (Math.random() * 5 - 2.5); // Small random variation
            this.engineNodes.idle._oscillator.frequency.setTargetAtTime(idleFreq, this.audioContext.currentTime, 0.1);
            this.engineNodes.idle.gain.setTargetAtTime(0.3 * profile.volume, this.audioContext.currentTime, 0.5);
        }
    }

    /**
     * Update engine parameters from vehicle state
     */
    _updateEngineParameters(vehicleState, deltaTime) {
        const profile = this.engineProfiles[this.currentVehicle.type] || this.engineProfiles.sedan;
        
        // Calculate target RPM based on throttle and load
        const baseRPM = this.engineState.minRPM;
        const throttleRPM = this.engineState.throttle * (this.engineState.maxRPM - baseRPM);
        const loadRPM = this.engineState.load * 1000; // Load increases RPM
        
        this.engineState.targetRPM = baseRPM + throttleRPM + loadRPM;
        
        // Smooth RPM changes
        const rpmDiff = this.engineState.targetRPM - this.engineState.rpm;
        const rpmChangeRate = profile.smoothness * 2000 * deltaTime; // RPM per second
        
        if (Math.abs(rpmDiff) > rpmChangeRate) {
            this.engineState.rpm += Math.sign(rpmDiff) * rpmChangeRate;
        } else {
            this.engineState.rpm = this.engineState.targetRPM;
        }
        
        // Clamp RPM to valid range
        this.engineState.rpm = Math.max(this.engineState.minRPM, 
                                       Math.min(this.engineState.maxRPM, this.engineState.rpm));
    }

    /**
     * Update audio mixing based on engine state
     */
    _updateAudioMixing(deltaTime) {
        const profile = this.engineProfiles[this.currentVehicle.type] || this.engineProfiles.sedan;
        
        // Calculate mix levels based on RPM and throttle
        const rpmRatio = (this.engineState.rpm - this.engineState.minRPM) / 
                        (this.engineState.maxRPM - this.engineState.minRPM);
        
        // Idle mix decreases with RPM
        this.mixLevels.idle = Math.max(0.1, 1.0 - rpmRatio * 0.8);
        
        // Rev mix increases with throttle and RPM
        this.mixLevels.rev = this.engineState.throttle * rpmRatio;
        
        // Exhaust mix increases with RPM
        this.mixLevels.exhaust = profile.exhaustTone * rpmRatio * 0.5;
        
        // Apply mix levels to audio nodes
        if (this.engineNodes.idle) {
            const idleVolume = this.mixLevels.idle * profile.volume * 0.3;
            this.engineNodes.idle.gain.setTargetAtTime(idleVolume, this.audioContext.currentTime, 0.1);
        }
        
        if (this.engineNodes.rev) {
            const revVolume = this.mixLevels.rev * profile.volume * 0.4;
            this.engineNodes.rev.gain.setTargetAtTime(revVolume, this.audioContext.currentTime, 0.1);
        }
    }

    /**
     * Update audio effects based on engine state
     */
    _updateAudioEffects() {
        const profile = this.engineProfiles[this.currentVehicle.type] || this.engineProfiles.sedan;
        
        // Update oscillator frequencies based on RPM
        const rpmFreq = profile.baseFreq + (this.engineState.rpm * profile.rpmMultiplier);
        
        if (this.engineNodes.idle && this.engineNodes.idle._oscillator) {
            this.engineNodes.idle._oscillator.frequency.setTargetAtTime(rpmFreq, this.audioContext.currentTime, 0.05);
        }
        
        if (this.engineNodes.rev && this.engineNodes.rev._oscillator) {
            const revFreq = rpmFreq * 1.5;
            this.engineNodes.rev._oscillator.frequency.setTargetAtTime(revFreq, this.audioContext.currentTime, 0.05);
        }
        
        // Update filter frequencies based on RPM
        if (this.processingNodes.lowPassFilter) {
            const filterFreq = 1000 + (this.engineState.rpm * 0.3);
            this.processingNodes.lowPassFilter.frequency.setTargetAtTime(filterFreq, this.audioContext.currentTime, 0.1);
        }
    }

    /**
     * Play gear shift sound
     */
    _playGearShiftSound() {
        // Simple click sound for gear shift
        const clickBuffer = this._createClickBuffer();
        const source = this.audioContext.createBufferSource();
        source.buffer = clickBuffer;
        
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
        
        source.connect(gainNode);
        gainNode.connect(this.processingNodes.masterGain);
        
        source.start();
    }

    /**
     * Play backfire sound
     */
    _playBackfireSound() {
        const backfireSound = this.audioManager.audioBuffers.get('explosion_small');
        if (backfireSound) {
            const source = this.audioContext.createBufferSource();
            source.buffer = backfireSound;
            
            const gainNode = this.audioContext.createGain();
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            
            source.connect(gainNode);
            gainNode.connect(this.processingNodes.masterGain);
            
            source.start();
        }
    }

    /**
     * Create click buffer for gear shifts
     */
    _createClickBuffer() {
        const bufferSize = this.audioContext.sampleRate * 0.1; // 0.1 seconds
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        // Generate click sound
        for (let i = 0; i < bufferSize; i++) {
            const envelope = Math.exp(-i / (bufferSize * 0.1));
            data[i] = (Math.random() * 2 - 1) * envelope * 0.5;
        }

        return buffer;
    }

    /**
     * Stop all engine nodes
     */
    _stopAllEngineNodes() {
        Object.values(this.engineNodes).forEach(node => {
            if (node) {
                if (node._oscillator) {
                    try {
                        node._oscillator.stop();
                    } catch (e) {
                        // Ignore errors when stopping
                    }
                }
                if (node._noiseSource) {
                    try {
                        node._noiseSource.stop();
                    } catch (e) {
                        // Ignore errors when stopping
                    }
                }
            }
        });
        
        // Clear references
        this.engineNodes = {
            idle: null,
            rev: null,
            startup: null,
            shutdown: null
        };
    }

    /**
     * Dispose of processing chain
     */
    _disposeProcessingChain() {
        Object.values(this.processingNodes).forEach(node => {
            if (node && node.disconnect) {
                try {
                    node.disconnect();
                } catch (error) {
                    // Ignore disconnect errors during disposal
                }
            }
        });
        
        this.processingNodes = {
            masterGain: null,
            lowPassFilter: null,
            highPassFilter: null,
            compressor: null,
            distortion: null
        };
    }
}