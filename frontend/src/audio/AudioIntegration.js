import { AudioManager } from './AudioManager';
import { SpatialAudio } from './SpatialAudio';
import { EngineAudio } from './EngineAudio';

/**
 * AudioIntegration class that connects the audio system with existing game systems
 * Handles integration with combat, vehicle, zombie, and UI systems
 */
export class AudioIntegration {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.audioManager = null;
        this.spatialAudio = null;
        this.engineAudio = null;
        
        // Integration state
        this.isInitialized = false;
        this.currentVehicle = null;
        this.gameState = 'menu'; // menu, gameplay, garage, paused
        
        // Audio event handlers
        this.eventHandlers = new Map();
        
        // Music intensity tracking
        this.musicIntensity = {
            current: 0.5,
            target: 0.5,
            zombieCount: 0,
            combatActivity: 0,
            speed: 0,
            lastUpdate: 0
        };
        
        // Sound effect pools for performance
        this.soundPools = {
            zombieHits: [],
            impacts: [],
            explosions: []
        };
    }

    /**
     * Initialize audio integration system
     */
    async initialize() {
        try {
            // Initialize core audio manager
            this.audioManager = new AudioManager(this.gameEngine);
            await this.audioManager.initialize();
            
            // Initialize spatial audio system
            this.spatialAudio = new SpatialAudio(this.audioManager);
            this.spatialAudio.initialize(this.gameEngine);
            
            // Initialize engine audio system
            this.engineAudio = new EngineAudio(this.audioManager);
            await this.engineAudio.initialize();
            
            // Connect audio manager with spatial audio
            this.audioManager.spatialAudio = this.spatialAudio;
            
            // Setup event listeners for game systems
            this._setupEventListeners();
            
            // Start background music for menu
            this.audioManager.playMusic('menu');
            
            this.isInitialized = true;
            console.log('AudioIntegration initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize AudioIntegration:', error);
            return false;
        }
    }

    /**
     * Update audio integration system
     */
    update(deltaTime) {
        if (!this.isInitialized) return;
        
        // Update core audio systems
        this.audioManager.update(deltaTime);
        this.spatialAudio.update(deltaTime);
        this.engineAudio.update(deltaTime, this._getVehicleState());
        
        // Update music intensity
        this._updateMusicIntensity(deltaTime);
        
        // Update spatial audio positions
        this._updateSpatialPositions();
    }

    /**
     * Integrate with combat system
     */
    integrateCombatSystem(combatSystem) {
        if (!combatSystem) return;
        
        // Listen for collision events
        this.eventHandlers.set('collision', (event) => {
            this._handleCollisionAudio(event);
        });
        
        // Listen for damage events
        this.eventHandlers.set('damage', (event) => {
            this._handleDamageAudio(event);
        });
        
        // Listen for explosion events
        this.eventHandlers.set('explosion', (event) => {
            this._handleExplosionAudio(event);
        });
        
        console.log('Audio integrated with combat system');
    }

    /**
     * Integrate with vehicle system
     */
    integrateVehicleSystem(vehicleManager) {
        if (!vehicleManager) return;
        
        // Listen for vehicle events
        this.eventHandlers.set('vehicleStart', (vehicle) => {
            this._handleVehicleStart(vehicle);
        });
        
        this.eventHandlers.set('vehicleStop', (vehicle) => {
            this._handleVehicleStop(vehicle);
        });
        
        this.eventHandlers.set('vehicleUpdate', (vehicle, state) => {
            this._handleVehicleUpdate(vehicle, state);
        });
        
        console.log('Audio integrated with vehicle system');
    }

    /**
     * Integrate with zombie system
     */
    integrateZombieSystem(zombieManager) {
        if (!zombieManager) return;
        
        // Listen for zombie events
        this.eventHandlers.set('zombieSpawn', (zombie) => {
            this._handleZombieSpawn(zombie);
        });
        
        this.eventHandlers.set('zombieDeath', (zombie) => {
            this._handleZombieDeath(zombie);
        });
        
        this.eventHandlers.set('zombieAttack', (zombie) => {
            this._handleZombieAttack(zombie);
        });
        
        console.log('Audio integrated with zombie system');
    }

    /**
     * Integrate with UI system
     */
    integrateUISystem() {
        // Setup UI sound effects
        this._setupUIAudio();
        console.log('Audio integrated with UI system');
    }

    /**
     * Set game state for appropriate audio context
     */
    setGameState(newState) {
        if (this.gameState === newState) return;
        
        const previousState = this.gameState;
        this.gameState = newState;
        
        this._handleGameStateChange(previousState, newState);
    }

    /**
     * Get audio manager instance
     */
    getAudioManager() {
        return this.audioManager;
    }

    /**
     * Get spatial audio instance
     */
    getSpatialAudio() {
        return this.spatialAudio;
    }

    /**
     * Get engine audio instance
     */
    getEngineAudio() {
        return this.engineAudio;
    }

    /**
     * Dispose of audio integration
     */
    dispose() {
        if (this.engineAudio) {
            this.engineAudio.dispose();
        }
        
        if (this.spatialAudio) {
            this.spatialAudio.dispose();
        }
        
        if (this.audioManager) {
            this.audioManager.dispose();
        }
        
        this.eventHandlers.clear();
        this.isInitialized = false;
        
        console.log('AudioIntegration disposed');
    }

    /**
     * Setup event listeners for game systems
     */
    _setupEventListeners() {
        // Listen for window focus/blur to pause/resume audio
        window.addEventListener('focus', () => {
            if (this.audioManager && this.audioManager.audioContext && this.audioManager.audioContext.state === 'suspended') {
                this.audioManager.audioContext.resume();
            }
        });
        
        window.addEventListener('blur', () => {
            // Optionally pause audio when window loses focus
            // this.audioManager.setVolume('master', 0.3);
        });
    }

    /**
     * Handle collision audio events
     */
    _handleCollisionAudio(event) {
        const { type, position, intensity, objects } = event;
        
        let impactType = 'zombie_soft';
        
        // Determine impact type based on collision objects
        if (objects.includes('zombie')) {
            if (intensity > 0.8) {
                impactType = 'zombie_splat';
            } else if (intensity > 0.5) {
                impactType = 'zombie_hard';
            } else {
                impactType = 'zombie_soft';
            }
        } else if (objects.includes('metal')) {
            impactType = 'metal';
        } else if (objects.includes('glass')) {
            impactType = 'glass';
        }
        
        // Play impact sound with spatial positioning
        this.audioManager.playImpactSound(impactType, position, intensity);
        
        // Update music intensity based on combat activity
        this.musicIntensity.combatActivity = Math.min(1.0, this.musicIntensity.combatActivity + 0.2);
    }

    /**
     * Handle damage audio events
     */
    _handleDamageAudio(event) {
        const { target, damage, position } = event;
        
        if (target === 'vehicle') {
            // Play vehicle damage sound
            this.audioManager.playSound('metal_impact', position, damage / 100);
        } else if (target === 'zombie') {
            // Play zombie damage sound
            this.audioManager.playSound('zombie_hit_soft', position, 0.8);
        }
    }

    /**
     * Handle explosion audio events
     */
    _handleExplosionAudio(event) {
        const { size, position, intensity } = event;
        
        const explosionType = size > 0.5 ? 'explosion_large' : 'explosion_small';
        this.audioManager.playImpactSound(explosionType, position, intensity);
        
        // Trigger engine backfire if vehicle is nearby
        if (this.currentVehicle && this.engineAudio.isActive) {
            const distance = position.distanceTo(this.currentVehicle.getPosition());
            if (distance < 10) {
                this.engineAudio.triggerBackfire();
            }
        }
    }

    /**
     * Handle vehicle start events
     */
    _handleVehicleStart(vehicle) {
        this.currentVehicle = vehicle;
        this.engineAudio.startEngine(vehicle);
        this.audioManager.startEngineAudio(vehicle);
    }

    /**
     * Handle vehicle stop events
     */
    _handleVehicleStop(vehicle) {
        this.engineAudio.stopEngine();
        this.audioManager.stopEngineAudio();
        this.currentVehicle = null;
    }

    /**
     * Handle vehicle update events
     */
    _handleVehicleUpdate(vehicle, state) {
        if (!this.currentVehicle || vehicle !== this.currentVehicle) return;
        
        // Update engine audio based on vehicle state
        const rpm = this._calculateRPM(state);
        const throttle = state.controls?.forward || 0;
        
        this.engineAudio.setThrottle(throttle);
        this.audioManager.updateEngineAudio(vehicle, rpm, throttle);
        
        // Update music intensity based on speed
        this.musicIntensity.speed = Math.min(1.0, state.speed / 100); // Normalize speed
    }

    /**
     * Handle zombie spawn events
     */
    _handleZombieSpawn(zombie) {
        // Play zombie spawn sound
        const position = zombie.getPosition();
        this.audioManager.playSound('zombie_groan', position, 0.6);
        
        // Update zombie count for music intensity
        this.musicIntensity.zombieCount++;
    }

    /**
     * Handle zombie death events
     */
    _handleZombieDeath(zombie) {
        // Play zombie death sound
        const position = zombie.getPosition();
        this.audioManager.playSound('zombie_death', position, 0.8);
        
        // Update zombie count for music intensity
        this.musicIntensity.zombieCount = Math.max(0, this.musicIntensity.zombieCount - 1);
    }

    /**
     * Handle zombie attack events
     */
    _handleZombieAttack(zombie) {
        // Play zombie attack sound
        const position = zombie.getPosition();
        this.audioManager.playSound('zombie_scream', position, 0.9);
    }

    /**
     * Setup UI audio effects
     */
    _setupUIAudio() {
        // Add event listeners to UI elements
        document.addEventListener('click', (event) => {
            if (event.target.matches('button, .button, [role="button"]')) {
                this.audioManager.playSound('button_click', null, 0.5);
            }
        });
        
        document.addEventListener('mouseover', (event) => {
            if (event.target.matches('button, .button, [role="button"]')) {
                this.audioManager.playSound('button_hover', null, 0.3);
            }
        });
    }

    /**
     * Handle game state changes
     */
    _handleGameStateChange(previousState, newState) {
        switch (newState) {
            case 'menu':
                this.audioManager.playMusic('menu');
                this.audioManager.setMusicIntensity(0.3);
                break;
                
            case 'gameplay':
                this.audioManager.playMusic('gameplay_calm');
                this.audioManager.setMusicIntensity(0.5);
                break;
                
            case 'garage':
                this.audioManager.playMusic('garage');
                this.audioManager.setMusicIntensity(0.4);
                break;
                
            case 'paused':
                // Reduce all audio volumes when paused
                this.audioManager.setVolume('master', this.audioManager.getVolume('master') * 0.3);
                break;
        }
        
        // Resume normal volume when unpausing
        if (previousState === 'paused' && newState !== 'paused') {
            this.audioManager.setVolume('master', this.audioManager.getVolume('master') / 0.3);
        }
    }

    /**
     * Update music intensity based on gameplay factors
     */
    _updateMusicIntensity(deltaTime) {
        const currentTime = performance.now();
        if (currentTime - this.musicIntensity.lastUpdate < 1000) return; // Update once per second
        this.musicIntensity.lastUpdate = currentTime;
        
        // Calculate target intensity based on various factors
        let targetIntensity = 0.5; // Base intensity
        
        // Add intensity based on zombie count
        targetIntensity += Math.min(0.3, this.musicIntensity.zombieCount * 0.02);
        
        // Add intensity based on combat activity
        targetIntensity += this.musicIntensity.combatActivity * 0.3;
        
        // Add intensity based on speed
        targetIntensity += this.musicIntensity.speed * 0.2;
        
        // Clamp to valid range
        targetIntensity = Math.max(0.2, Math.min(1.0, targetIntensity));
        
        // Smooth transition to target intensity
        const intensityDiff = targetIntensity - this.musicIntensity.current;
        this.musicIntensity.current += intensityDiff * 0.1; // Smooth transition
        
        // Apply intensity to audio manager
        this.audioManager.setMusicIntensity(this.musicIntensity.current);
        
        // Switch music tracks based on intensity
        if (this.gameState === 'gameplay') {
            if (this.musicIntensity.current > 0.7 && this.audioManager.musicSystem.currentTrack !== 'gameplay_intense') {
                this.audioManager.playMusic('gameplay_intense');
            } else if (this.musicIntensity.current <= 0.7 && this.audioManager.musicSystem.currentTrack !== 'gameplay_calm') {
                this.audioManager.playMusic('gameplay_calm');
            }
        }
        
        // Decay combat activity over time
        this.musicIntensity.combatActivity = Math.max(0, this.musicIntensity.combatActivity - 0.05);
    }

    /**
     * Update spatial audio positions for moving objects
     */
    _updateSpatialPositions() {
        // Update vehicle position for engine audio
        if (this.currentVehicle && this.engineAudio.isActive) {
            const vehiclePosition = this.currentVehicle.getPosition();
            const vehicleVelocity = this.currentVehicle.getVelocity();
            
            // Update any spatial audio sources attached to the vehicle
            // This would be implemented based on how spatial sources are managed
        }
    }

    /**
     * Get current vehicle state for audio processing
     */
    _getVehicleState() {
        if (!this.currentVehicle) {
            return {
                rpm: 0,
                throttle: 0,
                speed: 0,
                gear: 1,
                controls: { forward: 0, backward: 0 }
            };
        }
        
        const speed = this.currentVehicle.getSpeed();
        const controls = this.currentVehicle.controls;
        
        return {
            rpm: this._calculateRPM({ speed, controls }),
            throttle: controls.forward || 0,
            speed: speed,
            gear: this._calculateGear(speed),
            controls: controls
        };
    }

    /**
     * Calculate RPM based on vehicle state
     */
    _calculateRPM(state) {
        const baseRPM = 800;
        const maxRPM = 6000;
        const speedRPM = (state.speed / 100) * (maxRPM - baseRPM);
        const throttleRPM = (state.controls?.forward || 0) * 1000;
        
        return Math.min(maxRPM, baseRPM + speedRPM + throttleRPM);
    }

    /**
     * Calculate current gear based on speed
     */
    _calculateGear(speed) {
        if (speed < 10) return 1;
        if (speed < 30) return 2;
        if (speed < 50) return 3;
        if (speed < 70) return 4;
        return 5;
    }
}