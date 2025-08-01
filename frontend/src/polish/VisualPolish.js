/**
 * Visual polish system for enhanced user experience
 */
export class VisualPolish {
    constructor(gameEngine, finalIntegration) {
        this.gameEngine = gameEngine;
        this.finalIntegration = finalIntegration;
        
        // Polish settings
        this.settings = {
            enableScreenEffects: true,
            enableUIAnimations: true,
            enableParticleTrails: true,
            enableDynamicLighting: true,
            enablePostProcessing: true,
            qualityLevel: 'high' // low, medium, high
        };
        
        // Effect states
        this.activeEffects = new Map();
        this.screenEffects = {
            bloodOverlay: null,
            damageFlash: null,
            speedLines: null,
            vignette: null
        };
        
        this.initialize();
    }

    initialize() {
        this.setupScreenEffects();
        this.setupUIEnhancements();
        this.setupDynamicLighting();
        this.connectToGameEvents();
        
        console.log('Visual Polish system initialized');
    }

    /**
     * Setup screen overlay effects
     */
    setupScreenEffects() {
        if (!this.settings.enableScreenEffects) return;

        // Create blood overlay effect
        this.screenEffects.bloodOverlay = this.createScreenOverlay('blood', {
            color: '#ff0000',
            opacity: 0,
            blendMode: 'multiply',
            texture: 'radial-gradient(circle, transparent 30%, rgba(255,0,0,0.3) 100%)'
        });

        // Create damage flash effect
        this.screenEffects.damageFlash = this.createScreenOverlay('damage', {
            color: '#ff4444',
            opacity: 0,
            blendMode: 'screen',
            texture: 'linear-gradient(45deg, transparent, rgba(255,68,68,0.5), transparent)'
        });

        // Create speed lines effect
        this.screenEffects.speedLines = this.createScreenOverlay('speed', {
            color: '#ffffff',
            opacity: 0,
            blendMode: 'screen',
            texture: 'repeating-linear-gradient(90deg, transparent, rgba(255,255,255,0.1) 2px, transparent 4px)'
        });

        // Create vignette effect
        this.screenEffects.vignette = this.createScreenOverlay('vignette', {
            color: '#000000',
            opacity: 0.2,
            blendMode: 'multiply',
            texture: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.8) 100%)'
        });
    }

    /**
     * Create screen overlay element
     */
    createScreenOverlay(name, config) {
        const overlay = document.createElement('div');
        overlay.className = `screen-effect screen-effect-${name}`;
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 1000;
            background: ${config.texture || config.color};
            opacity: ${config.opacity};
            mix-blend-mode: ${config.blendMode || 'normal'};
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(overlay);
        return overlay;
    }

    /**
     * Setup UI enhancements
     */
    setupUIEnhancements() {
        if (!this.settings.enableUIAnimations) return;

        // Add CSS for enhanced UI animations
        const style = document.createElement('style');
        style.textContent = `
            .ui-element {
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .ui-element:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }
            
            .button-press {
                animation: buttonPress 0.1s ease;
            }
            
            @keyframes buttonPress {
                0% { transform: scale(1); }
                50% { transform: scale(0.95); }
                100% { transform: scale(1); }
            }
            
            .score-popup {
                animation: scorePopup 1s ease-out forwards;
            }
            
            @keyframes scorePopup {
                0% {
                    transform: scale(0.5) translateY(0);
                    opacity: 1;
                }
                50% {
                    transform: scale(1.2) translateY(-20px);
                    opacity: 1;
                }
                100% {
                    transform: scale(1) translateY(-40px);
                    opacity: 0;
                }
            }
            
            .health-pulse {
                animation: healthPulse 0.5s ease-in-out;
            }
            
            @keyframes healthPulse {
                0%, 100% { 
                    background-color: rgba(255, 68, 68, 0.2);
                    transform: scale(1);
                }
                50% { 
                    background-color: rgba(255, 68, 68, 0.6);
                    transform: scale(1.05);
                }
            }
            
            .combo-glow {
                animation: comboGlow 0.3s ease-out;
                box-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
            }
            
            @keyframes comboGlow {
                0% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.4); }
                100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.8); }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Setup dynamic lighting effects
     */
    setupDynamicLighting() {
        if (!this.settings.enableDynamicLighting) return;

        // Create dynamic ambient lighting based on game state
        this.ambientLightController = {
            baseIntensity: 0.4,
            currentIntensity: 0.4,
            targetIntensity: 0.4,
            transitionSpeed: 2.0
        };

        // Create dynamic directional lighting
        this.directionalLightController = {
            baseIntensity: 1.0,
            currentIntensity: 1.0,
            targetIntensity: 1.0,
            color: { r: 1, g: 1, b: 1 },
            targetColor: { r: 1, g: 1, b: 1 }
        };
    }

    /**
     * Connect to game events for visual feedback
     */
    connectToGameEvents() {
        if (!this.finalIntegration) return;

        // Vehicle damage effects
        this.finalIntegration.addEventHandler('vehicle_damage', (data) => {
            this.triggerDamageEffect(data.intensity || 1.0);
        });

        // Health change effects
        this.finalIntegration.addEventHandler('health_change', (data) => {
            this.triggerHealthEffect(data.newHealth, data.oldHealth);
        });

        // Speed effects
        this.finalIntegration.addEventHandler('speed_change', (data) => {
            this.updateSpeedEffects(data.speed, data.maxSpeed);
        });

        // Combo effects
        this.finalIntegration.addEventHandler('combo_update', (data) => {
            this.triggerComboEffect(data.combo, data.multiplier);
        });

        // Score effects
        this.finalIntegration.addEventHandler('score_gained', (data) => {
            this.triggerScorePopup(data.points, data.position);
        });

        // Environmental effects
        this.finalIntegration.addEventHandler('environment_change', (data) => {
            this.updateEnvironmentalLighting(data.environment);
        });

        // Game state effects
        this.finalIntegration.addEventHandler('game_state_change', (data) => {
            this.updateGameStateEffects(data.newState, data.oldState);
        });
    }

    /**
     * Trigger damage screen effect
     */
    triggerDamageEffect(intensity = 1.0) {
        if (!this.settings.enableScreenEffects) return;

        const overlay = this.screenEffects.damageFlash;
        if (!overlay) return;

        // Flash effect
        overlay.style.opacity = Math.min(intensity * 0.3, 0.6);
        
        setTimeout(() => {
            overlay.style.opacity = '0';
        }, 100);

        // Blood overlay for severe damage
        if (intensity > 1.5) {
            const bloodOverlay = this.screenEffects.bloodOverlay;
            if (bloodOverlay) {
                bloodOverlay.style.opacity = Math.min(intensity * 0.1, 0.3);
                
                setTimeout(() => {
                    bloodOverlay.style.opacity = '0';
                }, 2000);
            }
        }
    }

    /**
     * Trigger health-based visual effects
     */
    triggerHealthEffect(newHealth, oldHealth) {
        const healthElement = document.querySelector('.health-bar, .health-display');
        if (!healthElement) return;

        // Health decrease effect
        if (newHealth < oldHealth) {
            healthElement.classList.add('health-pulse');
            setTimeout(() => {
                healthElement.classList.remove('health-pulse');
            }, 500);
        }

        // Critical health warning
        if (newHealth <= 25) {
            this.triggerCriticalHealthWarning();
        }
    }

    /**
     * Trigger critical health warning
     */
    triggerCriticalHealthWarning() {
        const vignette = this.screenEffects.vignette;
        if (!vignette) return;

        // Pulsing red vignette
        let pulseCount = 0;
        const pulseInterval = setInterval(() => {
            vignette.style.background = 'radial-gradient(circle, transparent 40%, rgba(255,0,0,0.4) 100%)';
            vignette.style.opacity = '0.5';
            
            setTimeout(() => {
                vignette.style.opacity = '0.2';
                vignette.style.background = 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.8) 100%)';
            }, 300);
            
            pulseCount++;
            if (pulseCount >= 3) {
                clearInterval(pulseInterval);
            }
        }, 600);
    }

    /**
     * Update speed-based visual effects
     */
    updateSpeedEffects(currentSpeed, maxSpeed) {
        if (!this.settings.enableScreenEffects) return;

        const speedRatio = currentSpeed / maxSpeed;
        const speedLines = this.screenEffects.speedLines;
        
        if (speedLines && speedRatio > 0.7) {
            const intensity = (speedRatio - 0.7) / 0.3; // 0-1 range for high speeds
            speedLines.style.opacity = intensity * 0.3;
            speedLines.style.animationDuration = `${0.5 / intensity}s`;
        } else if (speedLines) {
            speedLines.style.opacity = '0';
        }
    }

    /**
     * Trigger combo visual effect
     */
    triggerComboEffect(combo, multiplier) {
        const comboElement = document.querySelector('.combo-display, .combo-counter');
        if (!comboElement) return;

        comboElement.classList.add('combo-glow');
        
        // Scale effect based on combo level
        const scale = Math.min(1 + (combo * 0.05), 1.5);
        comboElement.style.transform = `scale(${scale})`;
        
        setTimeout(() => {
            comboElement.classList.remove('combo-glow');
            comboElement.style.transform = 'scale(1)';
        }, 300);
    }

    /**
     * Trigger score popup effect
     */
    triggerScorePopup(points, position) {
        const popup = document.createElement('div');
        popup.className = 'score-popup';
        popup.textContent = `+${points}`;
        popup.style.cssText = `
            position: fixed;
            color: #ffff00;
            font-size: 24px;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            pointer-events: none;
            z-index: 2000;
            left: ${position?.x || 50}%;
            top: ${position?.y || 50}%;
            transform: translate(-50%, -50%);
        `;
        
        document.body.appendChild(popup);
        
        setTimeout(() => {
            popup.remove();
        }, 1000);
    }

    /**
     * Update environmental lighting
     */
    updateEnvironmentalLighting(environment) {
        if (!this.settings.enableDynamicLighting) return;

        const lightingConfigs = {
            'day': {
                ambient: 0.6,
                directional: 1.0,
                color: { r: 1, g: 1, b: 0.9 }
            },
            'night': {
                ambient: 0.2,
                directional: 0.8,
                color: { r: 0.7, g: 0.8, b: 1.0 }
            },
            'dawn': {
                ambient: 0.4,
                directional: 0.9,
                color: { r: 1, g: 0.8, b: 0.6 }
            },
            'storm': {
                ambient: 0.3,
                directional: 0.6,
                color: { r: 0.6, g: 0.7, b: 0.8 }
            }
        };

        const config = lightingConfigs[environment] || lightingConfigs['day'];
        
        this.ambientLightController.targetIntensity = config.ambient;
        this.directionalLightController.targetIntensity = config.directional;
        this.directionalLightController.targetColor = config.color;
    }

    /**
     * Update effects based on game state
     */
    updateGameStateEffects(newState, oldState) {
        switch (newState) {
            case 'PLAYING':
                this.enableGameplayEffects();
                break;
            case 'PAUSED':
                this.enablePauseEffects();
                break;
            case 'GAME_OVER':
                this.enableGameOverEffects();
                break;
            case 'MAIN_MENU':
                this.disableAllEffects();
                break;
        }
    }

    /**
     * Enable gameplay-specific effects
     */
    enableGameplayEffects() {
        // Enable all screen effects
        Object.values(this.screenEffects).forEach(effect => {
            if (effect) effect.style.display = 'block';
        });
    }

    /**
     * Enable pause-specific effects
     */
    enablePauseEffects() {
        // Add blur effect to game canvas
        const canvas = document.querySelector('.game-canvas');
        if (canvas) {
            canvas.style.filter = 'blur(3px) brightness(0.7)';
        }
    }

    /**
     * Enable game over effects
     */
    enableGameOverEffects() {
        // Fade to black effect
        const overlay = document.createElement('div');
        overlay.className = 'game-over-fade';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0);
            pointer-events: none;
            z-index: 999;
            transition: background 2s ease;
        `;
        
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            overlay.style.background = 'rgba(0, 0, 0, 0.7)';
        }, 100);
    }

    /**
     * Disable all visual effects
     */
    disableAllEffects() {
        // Remove all screen effects
        Object.values(this.screenEffects).forEach(effect => {
            if (effect) effect.style.opacity = '0';
        });

        // Remove canvas filters
        const canvas = document.querySelector('.game-canvas');
        if (canvas) {
            canvas.style.filter = 'none';
        }

        // Remove temporary overlays
        document.querySelectorAll('.game-over-fade').forEach(el => el.remove());
    }

    /**
     * Update lighting controllers
     */
    updateLighting(deltaTime) {
        if (!this.settings.enableDynamicLighting) return;

        // Update ambient light
        const ambientDiff = this.ambientLightController.targetIntensity - this.ambientLightController.currentIntensity;
        if (Math.abs(ambientDiff) > 0.01) {
            this.ambientLightController.currentIntensity += ambientDiff * this.ambientLightController.transitionSpeed * deltaTime;
        }

        // Update directional light
        const directionalDiff = this.directionalLightController.targetIntensity - this.directionalLightController.currentIntensity;
        if (Math.abs(directionalDiff) > 0.01) {
            this.directionalLightController.currentIntensity += directionalDiff * deltaTime * 2.0;
        }

        // Update light color
        const colorController = this.directionalLightController;
        ['r', 'g', 'b'].forEach(component => {
            const diff = colorController.targetColor[component] - colorController.color[component];
            if (Math.abs(diff) > 0.01) {
                colorController.color[component] += diff * deltaTime * 2.0;
            }
        });
    }

    /**
     * Update visual polish system
     */
    update(deltaTime) {
        this.updateLighting(deltaTime);
        
        // Update any active timed effects
        this.activeEffects.forEach((effect, id) => {
            effect.timeRemaining -= deltaTime;
            if (effect.timeRemaining <= 0) {
                effect.cleanup();
                this.activeEffects.delete(id);
            }
        });
    }

    /**
     * Set quality level
     */
    setQualityLevel(level) {
        this.settings.qualityLevel = level;
        
        switch (level) {
            case 'low':
                this.settings.enableScreenEffects = false;
                this.settings.enableUIAnimations = false;
                this.settings.enableParticleTrails = false;
                this.settings.enableDynamicLighting = false;
                break;
            case 'medium':
                this.settings.enableScreenEffects = true;
                this.settings.enableUIAnimations = true;
                this.settings.enableParticleTrails = false;
                this.settings.enableDynamicLighting = false;
                break;
            case 'high':
                this.settings.enableScreenEffects = true;
                this.settings.enableUIAnimations = true;
                this.settings.enableParticleTrails = true;
                this.settings.enableDynamicLighting = true;
                break;
        }
        
        // Apply settings
        this.applyQualitySettings();
    }

    /**
     * Apply quality settings
     */
    applyQualitySettings() {
        // Show/hide screen effects
        Object.values(this.screenEffects).forEach(effect => {
            if (effect) {
                effect.style.display = this.settings.enableScreenEffects ? 'block' : 'none';
            }
        });

        // Enable/disable UI animations
        const uiElements = document.querySelectorAll('.ui-element');
        uiElements.forEach(element => {
            element.style.transition = this.settings.enableUIAnimations ? 
                'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none';
        });
    }

    /**
     * Dispose of visual polish system
     */
    dispose() {
        // Remove screen effects
        Object.values(this.screenEffects).forEach(effect => {
            if (effect && effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        });

        // Clear active effects
        this.activeEffects.forEach(effect => {
            if (effect.cleanup) effect.cleanup();
        });
        this.activeEffects.clear();

        // Remove temporary overlays
        document.querySelectorAll('.game-over-fade, .score-popup').forEach(el => el.remove());

        console.log('Visual Polish system disposed');
    }
}