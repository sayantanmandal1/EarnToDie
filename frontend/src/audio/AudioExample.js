import { GameEngine } from '../engine/GameEngine';
import { VehicleManager } from '../vehicles/VehicleManager';
import { ZombieManager } from '../zombies/ZombieManager';
import { CombatSystem } from '../combat/CombatSystem';

/**
 * Example of how to integrate the audio system with existing game systems
 */
export class AudioExample {
    constructor() {
        this.gameEngine = null;
        this.vehicleManager = null;
        this.zombieManager = null;
        this.combatSystem = null;
        this.audioIntegration = null;
    }

    /**
     * Initialize the example
     */
    async initialize(canvas) {
        try {
            // Initialize game engine (which includes audio integration)
            this.gameEngine = new GameEngine(canvas);
            await this.gameEngine.initialize();
            
            // Get audio integration from game engine
            this.audioIntegration = this.gameEngine.getAudioIntegration();
            
            if (!this.audioIntegration) {
                console.warn('Audio integration not available');
                return false;
            }
            
            // Initialize other game systems
            this.vehicleManager = new VehicleManager(this.gameEngine);
            this.zombieManager = new ZombieManager(this.gameEngine);
            this.combatSystem = new CombatSystem(this.gameEngine);
            
            // Integrate audio with game systems
            this.audioIntegration.integrateCombatSystem(this.combatSystem);
            this.audioIntegration.integrateVehicleSystem(this.vehicleManager);
            this.audioIntegration.integrateZombieSystem(this.zombieManager);
            this.audioIntegration.integrateUISystem();
            
            // Set initial game state
            this.audioIntegration.setGameState('menu');
            
            console.log('Audio example initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize audio example:', error);
            return false;
        }
    }

    /**
     * Start gameplay with audio
     */
    startGameplay() {
        if (!this.audioIntegration) return;
        
        // Change to gameplay state (starts appropriate music)
        this.audioIntegration.setGameState('gameplay');
        
        // Start the game engine
        this.gameEngine.start();
        
        // Example: Spawn a vehicle and start engine audio
        this.spawnVehicleWithAudio();
        
        // Example: Spawn some zombies with audio
        this.spawnZombiesWithAudio();
    }

    /**
     * Example of spawning a vehicle with audio integration
     */
    async spawnVehicleWithAudio() {
        if (!this.vehicleManager || !this.audioIntegration) return;
        
        try {
            // Create a vehicle
            const vehicle = await this.vehicleManager.createVehicle('sedan', { x: 0, y: 2, z: 0 });
            
            // Trigger vehicle start event (audio integration will handle engine sounds)
            const vehicleStartHandler = this.audioIntegration.eventHandlers.get('vehicleStart');
            if (vehicleStartHandler) {
                vehicleStartHandler(vehicle);
            }
            
            // Simulate vehicle controls for audio demonstration
            this.simulateVehicleControls(vehicle);
            
        } catch (error) {
            console.error('Failed to spawn vehicle with audio:', error);
        }
    }

    /**
     * Example of spawning zombies with audio integration
     */
    async spawnZombiesWithAudio() {
        if (!this.zombieManager || !this.audioIntegration) return;
        
        try {
            // Spawn multiple zombies
            for (let i = 0; i < 5; i++) {
                const position = {
                    x: (Math.random() - 0.5) * 20,
                    y: 0,
                    z: (Math.random() - 0.5) * 20
                };
                
                const zombie = await this.zombieManager.spawnZombie('walker', position);
                
                // Trigger zombie spawn event (audio integration will handle spawn sounds)
                const zombieSpawnHandler = this.audioIntegration.eventHandlers.get('zombieSpawn');
                if (zombieSpawnHandler) {
                    zombieSpawnHandler(zombie);
                }
            }
        } catch (error) {
            console.error('Failed to spawn zombies with audio:', error);
        }
    }

    /**
     * Simulate vehicle controls to demonstrate engine audio
     */
    simulateVehicleControls(vehicle) {
        if (!vehicle || !this.audioIntegration) return;
        
        let throttle = 0;
        let direction = 1;
        
        // Simulate throttle changes every 2 seconds
        setInterval(() => {
            throttle += direction * 0.2;
            
            if (throttle >= 1.0) {
                direction = -1;
                throttle = 1.0;
            } else if (throttle <= 0) {
                direction = 1;
                throttle = 0;
            }
            
            // Update vehicle controls
            vehicle.setControls({ forward: throttle });
            
            // Trigger vehicle update event
            const vehicleUpdateHandler = this.audioIntegration.eventHandlers.get('vehicleUpdate');
            if (vehicleUpdateHandler) {
                vehicleUpdateHandler(vehicle, {
                    speed: throttle * 100,
                    controls: { forward: throttle }
                });
            }
        }, 2000);
    }

    /**
     * Simulate combat events for audio demonstration
     */
    simulateCombatEvents() {
        if (!this.audioIntegration) return;
        
        // Simulate zombie collision every 3 seconds
        setInterval(() => {
            const collisionEvent = {
                type: 'zombie_collision',
                position: {
                    x: (Math.random() - 0.5) * 10,
                    y: 0,
                    z: (Math.random() - 0.5) * 10
                },
                intensity: Math.random(),
                objects: ['zombie', 'vehicle']
            };
            
            const collisionHandler = this.audioIntegration.eventHandlers.get('collision');
            if (collisionHandler) {
                collisionHandler(collisionEvent);
            }
        }, 3000);
        
        // Simulate explosion every 10 seconds
        setInterval(() => {
            const explosionEvent = {
                size: Math.random(),
                position: {
                    x: (Math.random() - 0.5) * 15,
                    y: 0,
                    z: (Math.random() - 0.5) * 15,
                    distanceTo: () => Math.random() * 20
                },
                intensity: 0.8 + Math.random() * 0.2
            };
            
            const explosionHandler = this.audioIntegration.eventHandlers.get('explosion');
            if (explosionHandler) {
                explosionHandler(explosionEvent);
            }
        }, 10000);
    }

    /**
     * Switch to garage mode
     */
    enterGarage() {
        if (!this.audioIntegration) return;
        
        this.audioIntegration.setGameState('garage');
        console.log('Entered garage - music changed to garage theme');
    }

    /**
     * Pause the game
     */
    pauseGame() {
        if (!this.audioIntegration) return;
        
        this.audioIntegration.setGameState('paused');
        this.gameEngine.stop();
        console.log('Game paused - audio volume reduced');
    }

    /**
     * Resume the game
     */
    resumeGame() {
        if (!this.audioIntegration) return;
        
        this.audioIntegration.setGameState('gameplay');
        this.gameEngine.start();
        console.log('Game resumed - audio volume restored');
    }

    /**
     * Get audio manager for manual control
     */
    getAudioManager() {
        return this.audioIntegration?.getAudioManager();
    }

    /**
     * Get spatial audio system for advanced features
     */
    getSpatialAudio() {
        return this.audioIntegration?.getSpatialAudio();
    }

    /**
     * Get engine audio system for vehicle sounds
     */
    getEngineAudio() {
        return this.audioIntegration?.getEngineAudio();
    }

    /**
     * Dispose of the example
     */
    dispose() {
        if (this.gameEngine) {
            this.gameEngine.dispose();
        }
        
        console.log('Audio example disposed');
    }
}

// Usage example:
/*
const audioExample = new AudioExample();

// Initialize with canvas element
await audioExample.initialize(document.getElementById('game-canvas'));

// Start gameplay with audio
audioExample.startGameplay();

// Simulate combat for audio demonstration
audioExample.simulateCombatEvents();

// Access audio systems directly if needed
const audioManager = audioExample.getAudioManager();
audioManager.setVolume('master', 0.8);

// Switch between game states
audioExample.enterGarage();
audioExample.pauseGame();
audioExample.resumeGame();
*/