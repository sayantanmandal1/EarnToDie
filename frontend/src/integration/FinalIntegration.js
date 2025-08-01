import { ParticleSystem } from '../effects/ParticleSystem';
import { AnimationSystem } from '../effects/AnimationSystem';
import { GameBalance } from '../balance/GameBalance';

/**
 * Final integration system that connects all game components
 */
export class FinalIntegration {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.particleSystem = null;
        this.animationSystem = null;
        this.gameBalance = null;
        
        // Integration state
        this.isInitialized = false;
        this.systemConnections = new Map();
        this.eventHandlers = new Map();
        
        // Performance monitoring
        this.performanceMetrics = {
            frameRate: 60,
            particleCount: 0,
            animationCount: 0,
            memoryUsage: 0
        };
        
        this.initialize();
    }

    async initialize() {
        try {
            console.log('Initializing Final Integration System...');
            
            // Initialize core systems
            await this.initializeCoreEffects();
            await this.initializeGameBalance();
            await this.connectAllSystems();
            await this.setupEventHandlers();
            
            this.isInitialized = true;
            console.log('Final Integration System initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Final Integration System:', error);
            throw error;
        }
    }

    /**
     * Initialize particle and animation systems
     */
    async initializeCoreEffects() {
        // Initialize particle system
        this.particleSystem = new ParticleSystem(this.gameEngine);
        
        // Initialize animation system
        this.animationSystem = new AnimationSystem(this.gameEngine);
        
        // Initialize game balance
        this.gameBalance = new GameBalance();
        
        console.log('Core effects systems initialized');
    }

    /**
     * Initialize game balance system
     */
    async initializeGameBalance() {
        // Load saved balance data if available
        try {
            const savedBalance = localStorage.getItem('zombie_car_game_balance');
            if (savedBalance) {
                const balanceData = JSON.parse(savedBalance);
                this.gameBalance.updateConfig(balanceData.config);
                this.gameBalance.setDifficultyLevel(balanceData.difficultyLevel);
            }
        } catch (error) {
            console.warn('Could not load saved balance data:', error);
        }
        
        console.log('Game balance system initialized');
    }

    /**
     * Connect all game systems together
     */
    async connectAllSystems() {
        // Connect particle system to combat events
        this.connectParticleEffects();
        
        // Connect animation system to UI and game events
        this.connectAnimationEffects();
        
        // Connect balance system to gameplay
        this.connectBalanceSystem();
        
        // Connect performance monitoring
        this.connectPerformanceMonitoring();
        
        console.log('All systems connected');
    }

    /**
     * Connect particle effects to game events
     */
    connectParticleEffects() {
        // Vehicle-related particles
        this.addEventHandler('vehicle_explosion', (data) => {
            this.particleSystem.createExplosion(
                data.position, 
                data.intensity || 2.0, 
                0xff4444
            );
        });

        this.addEventHandler('vehicle_damage', (data) => {
            this.particleSystem.createSparks(
                data.position,
                data.direction,
                data.intensity || 1.0
            );
        });

        this.addEventHandler('vehicle_engine_smoke', (data) => {
            this.particleSystem.createEngineSmoke(
                data.position,
                data.velocity,
                data.intensity || 1.0
            );
        });

        // Zombie-related particles
        this.addEventHandler('zombie_death', (data) => {
            this.particleSystem.createBloodSplatter(
                data.position,
                data.direction,
                data.intensity || 1.0
            );
        });

        this.addEventHandler('zombie_hit', (data) => {
            this.particleSystem.createBloodSplatter(
                data.position,
                data.direction,
                0.5
            );
        });

        // Environmental particles
        this.addEventHandler('terrain_impact', (data) => {
            this.particleSystem.createDustCloud(
                data.position,
                data.intensity || 1.0
            );
        });

        this.addEventHandler('weapon_fire', (data) => {
            if (data.weaponType === 'rocket_launcher') {
                this.particleSystem.createExplosion(
                    data.position,
                    1.5,
                    0xffaa00
                );
            } else {
                this.particleSystem.createSparks(
                    data.position,
                    data.direction,
                    0.3
                );
            }
        });
    }

    /**
     * Connect animation effects to game events
     */
    connectAnimationEffects() {
        // UI animations
        this.addEventHandler('menu_transition', (data) => {
            if (data.element && data.targetPosition) {
                this.animationSystem.createTween(
                    data.element.position,
                    data.targetPosition,
                    data.duration || 0.5,
                    {
                        easing: this.animationSystem.easeInOutCubic,
                        onComplete: data.onComplete
                    }
                );
            }
        });

        this.addEventHandler('score_popup', (data) => {
            if (data.element) {
                // Scale up and fade out
                this.animationSystem.animateScale(
                    data.element,
                    { x: 1.5, y: 1.5, z: 1.5 },
                    0.3
                );
                
                setTimeout(() => {
                    this.animationSystem.animateOpacity(
                        data.element.material,
                        0,
                        0.5,
                        () => {
                            if (data.onComplete) data.onComplete();
                        }
                    );
                }, 300);
            }
        });

        // Camera effects
        this.addEventHandler('camera_shake', (data) => {
            this.animationSystem.createShake(
                this.gameEngine.camera,
                data.intensity || 1.0,
                data.duration || 0.5
            );
        });

        this.addEventHandler('camera_focus', (data) => {
            this.animationSystem.animateCamera(
                data.targetPosition,
                data.targetLookAt,
                data.duration || 2.0,
                data.onComplete
            );
        });

        // Object animations
        this.addEventHandler('object_highlight', (data) => {
            if (data.object) {
                this.animationSystem.createPulse(
                    data.object,
                    0.9,
                    1.1,
                    1.0,
                    data.loops || 3
                );
            }
        });

        this.addEventHandler('object_float', (data) => {
            if (data.object) {
                this.animationSystem.createFloat(
                    data.object,
                    data.amplitude || 1.0,
                    data.frequency || 1.0,
                    data.duration || -1
                );
            }
        });
    }

    /**
     * Connect balance system to gameplay
     */
    connectBalanceSystem() {
        // Monitor player performance
        this.addEventHandler('level_complete', (data) => {
            this.gameBalance.updatePlayerSkill({
                zombiesKilled: data.zombiesKilled || 0,
                timeAlive: data.timeAlive || 0,
                damageReceived: data.damageReceived || 0,
                accuracy: data.accuracy || 0.5,
                levelCompleted: true
            });
            
            // Save balance data
            this.saveBalanceData();
        });

        this.addEventHandler('player_death', (data) => {
            this.gameBalance.updatePlayerSkill({
                zombiesKilled: data.zombiesKilled || 0,
                timeAlive: data.timeAlive || 0,
                damageReceived: data.damageReceived || 0,
                accuracy: data.accuracy || 0.5,
                levelCompleted: false
            });
            
            // Save balance data
            this.saveBalanceData();
        });

        // Adjust difficulty based on performance
        this.addEventHandler('difficulty_adjustment', (data) => {
            if (data.telemetryData) {
                this.gameBalance.adjustBalance(data.telemetryData);
            }
        });
    }

    /**
     * Connect performance monitoring
     */
    connectPerformanceMonitoring() {
        // Monitor frame rate
        let frameCount = 0;
        let lastTime = performance.now();
        
        const updateFrameRate = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                this.performanceMetrics.frameRate = frameCount;
                frameCount = 0;
                lastTime = currentTime;
                
                // Trigger performance adjustment if needed
                this.handlePerformanceAdjustment();
            }
        };

        this.gameEngine.onUpdate = (originalUpdate) => {
            return (deltaTime) => {
                updateFrameRate();
                if (originalUpdate) originalUpdate(deltaTime);
            };
        };

        // Monitor particle and animation counts
        setInterval(() => {
            this.performanceMetrics.particleCount = this.particleSystem.getActiveParticleCount();
            this.performanceMetrics.animationCount = this.animationSystem.getActiveAnimationCount();
            
            // Estimate memory usage (rough approximation)
            this.performanceMetrics.memoryUsage = 
                this.performanceMetrics.particleCount * 0.1 + 
                this.performanceMetrics.animationCount * 0.05;
                
        }, 1000);
    }

    /**
     * Handle performance adjustments
     */
    handlePerformanceAdjustment() {
        const fps = this.performanceMetrics.frameRate;
        
        if (fps < 30) {
            // Poor performance - reduce effects
            this.triggerEvent('performance_degradation', {
                level: 'severe',
                fps: fps,
                particleCount: this.performanceMetrics.particleCount
            });
            
            // Reduce particle limits
            if (this.performanceMetrics.particleCount > 200) {
                this.particleSystem.maxParticles = Math.max(100, this.particleSystem.maxParticles * 0.8);
            }
            
        } else if (fps < 45) {
            // Moderate performance issues
            this.triggerEvent('performance_degradation', {
                level: 'moderate',
                fps: fps,
                particleCount: this.performanceMetrics.particleCount
            });
            
        } else if (fps > 55 && this.particleSystem.maxParticles < 500) {
            // Good performance - can increase effects
            this.particleSystem.maxParticles = Math.min(500, this.particleSystem.maxParticles * 1.1);
        }
    }

    /**
     * Add event handler
     */
    addEventHandler(eventName, handler) {
        if (!this.eventHandlers.has(eventName)) {
            this.eventHandlers.set(eventName, []);
        }
        this.eventHandlers.get(eventName).push(handler);
    }

    /**
     * Remove event handler
     */
    removeEventHandler(eventName, handler) {
        if (this.eventHandlers.has(eventName)) {
            const handlers = this.eventHandlers.get(eventName);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * Trigger event
     */
    triggerEvent(eventName, data = {}) {
        if (this.eventHandlers.has(eventName)) {
            const handlers = this.eventHandlers.get(eventName);
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${eventName}:`, error);
                }
            });
        }
    }

    /**
     * Update all integrated systems
     */
    update(deltaTime) {
        if (!this.isInitialized) return;

        try {
            // Update particle system
            if (this.particleSystem) {
                this.particleSystem.update(deltaTime);
            }

            // Update animation system
            if (this.animationSystem) {
                this.animationSystem.update(deltaTime);
            }

        } catch (error) {
            console.error('Error updating integrated systems:', error);
        }
    }

    /**
     * Save balance data to localStorage
     */
    saveBalanceData() {
        try {
            const balanceData = this.gameBalance.exportBalanceData();
            localStorage.setItem('zombie_car_game_balance', JSON.stringify(balanceData));
        } catch (error) {
            console.warn('Could not save balance data:', error);
        }
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }

    /**
     * Get game balance instance
     */
    getGameBalance() {
        return this.gameBalance;
    }

    /**
     * Get particle system instance
     */
    getParticleSystem() {
        return this.particleSystem;
    }

    /**
     * Get animation system instance
     */
    getAnimationSystem() {
        return this.animationSystem;
    }

    /**
     * Setup event listeners for external systems
     */
    async setupEventHandlers() {
        // Listen for window events
        window.addEventListener('beforeunload', () => {
            this.saveBalanceData();
        });

        // Listen for visibility changes to pause/resume effects
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseEffects();
            } else {
                this.resumeEffects();
            }
        });

        console.log('Event handlers setup complete');
    }

    /**
     * Pause all effects
     */
    pauseEffects() {
        if (this.particleSystem) {
            // Pause particle updates by clearing active particles
            this.particleSystem.clear();
        }
        
        if (this.animationSystem) {
            // Pause animations
            this.animationSystem.stopAll();
        }
    }

    /**
     * Resume all effects
     */
    resumeEffects() {
        // Effects will resume naturally on next update cycle
        console.log('Effects resumed');
    }

    /**
     * Dispose of all integrated systems
     */
    dispose() {
        // Save final balance data
        this.saveBalanceData();

        // Dispose of systems
        if (this.particleSystem) {
            this.particleSystem.dispose();
            this.particleSystem = null;
        }

        if (this.animationSystem) {
            this.animationSystem.dispose();
            this.animationSystem = null;
        }

        // Clear event handlers
        this.eventHandlers.clear();
        this.systemConnections.clear();

        // Remove window event listeners
        window.removeEventListener('beforeunload', this.saveBalanceData);

        this.isInitialized = false;
        console.log('Final Integration System disposed');
    }
}