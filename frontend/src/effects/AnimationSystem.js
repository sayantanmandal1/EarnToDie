import * as THREE from 'three';

/**
 * Animation system for smooth transitions and visual effects
 */
export class AnimationSystem {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.animations = new Map();
        this.tweens = [];
        this.animationId = 0;
        
        this.initialize();
    }

    initialize() {
        console.log('AnimationSystem initialized');
    }

    /**
     * Create a tween animation
     */
    createTween(target, properties, duration, options = {}) {
        const animId = ++this.animationId;
        
        const tween = {
            id: animId,
            target,
            startValues: {},
            endValues: properties,
            duration,
            elapsed: 0,
            easing: options.easing || this.easeInOutQuad,
            onUpdate: options.onUpdate || null,
            onComplete: options.onComplete || null,
            delay: options.delay || 0,
            delayElapsed: 0,
            active: true
        };
        
        // Store initial values
        for (let prop in properties) {
            if (target[prop] !== undefined) {
                if (typeof target[prop] === 'object' && target[prop].clone) {
                    tween.startValues[prop] = target[prop].clone();
                } else {
                    tween.startValues[prop] = target[prop];
                }
            }
        }
        
        this.tweens.push(tween);
        return animId;
    }

    /**
     * Stop a tween animation
     */
    stopTween(animId) {
        const index = this.tweens.findIndex(tween => tween.id === animId);
        if (index > -1) {
            this.tweens.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Animate camera movement
     */
    animateCamera(targetPosition, targetLookAt, duration = 2.0, onComplete = null) {
        const camera = this.gameEngine.camera;
        const startPosition = camera.position.clone();
        const startLookAt = new THREE.Vector3();
        
        // Get current look at point
        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        startLookAt.copy(camera.position).add(direction);
        
        return this.createTween(
            { position: startPosition, lookAt: startLookAt },
            { position: targetPosition, lookAt: targetLookAt },
            duration,
            {
                easing: this.easeInOutCubic,
                onUpdate: (values) => {
                    camera.position.copy(values.position);
                    camera.lookAt(values.lookAt);
                },
                onComplete
            }
        );
    }

    /**
     * Animate object scale with bounce effect
     */
    animateScale(object, targetScale, duration = 0.5, onComplete = null) {
        const startScale = object.scale.clone();
        
        return this.createTween(
            object.scale,
            { x: targetScale.x, y: targetScale.y, z: targetScale.z },
            duration,
            {
                easing: this.easeOutBounce,
                onComplete
            }
        );
    }

    /**
     * Animate object rotation
     */
    animateRotation(object, targetRotation, duration = 1.0, onComplete = null) {
        const startRotation = object.rotation.clone();
        
        return this.createTween(
            object.rotation,
            { x: targetRotation.x, y: targetRotation.y, z: targetRotation.z },
            duration,
            {
                easing: this.easeInOutQuad,
                onComplete
            }
        );
    }

    /**
     * Animate material opacity
     */
    animateOpacity(material, targetOpacity, duration = 1.0, onComplete = null) {
        const startOpacity = material.opacity;
        
        return this.createTween(
            material,
            { opacity: targetOpacity },
            duration,
            {
                easing: this.easeInOutQuad,
                onComplete
            }
        );
    }

    /**
     * Animate color transition
     */
    animateColor(material, targetColor, duration = 1.0, onComplete = null) {
        const startColor = material.color.clone();
        
        return this.createTween(
            { color: startColor },
            { color: targetColor },
            duration,
            {
                easing: this.easeInOutQuad,
                onUpdate: (values) => {
                    material.color.copy(values.color);
                },
                onComplete
            }
        );
    }

    /**
     * Create shake animation for screen shake effects
     */
    createShake(object, intensity = 1.0, duration = 0.5, onComplete = null) {
        const originalPosition = object.position.clone();
        const shakeOffset = new THREE.Vector3();
        
        return this.createTween(
            { intensity: intensity },
            { intensity: 0 },
            duration,
            {
                easing: this.easeOutQuad,
                onUpdate: (values) => {
                    const currentIntensity = values.intensity;
                    shakeOffset.set(
                        (Math.random() - 0.5) * currentIntensity,
                        (Math.random() - 0.5) * currentIntensity,
                        (Math.random() - 0.5) * currentIntensity
                    );
                    object.position.copy(originalPosition).add(shakeOffset);
                },
                onComplete: () => {
                    object.position.copy(originalPosition);
                    if (onComplete) onComplete();
                }
            }
        );
    }

    /**
     * Create pulse animation
     */
    createPulse(object, minScale = 0.8, maxScale = 1.2, duration = 1.0, loops = -1) {
        const originalScale = object.scale.clone();
        let currentLoop = 0;
        
        const doPulse = () => {
            this.createTween(
                object.scale,
                { x: maxScale, y: maxScale, z: maxScale },
                duration / 2,
                {
                    easing: this.easeInOutSine,
                    onComplete: () => {
                        this.createTween(
                            object.scale,
                            { x: minScale, y: minScale, z: minScale },
                            duration / 2,
                            {
                                easing: this.easeInOutSine,
                                onComplete: () => {
                                    currentLoop++;
                                    if (loops === -1 || currentLoop < loops) {
                                        doPulse();
                                    } else {
                                        object.scale.copy(originalScale);
                                    }
                                }
                            }
                        );
                    }
                }
            );
        };
        
        doPulse();
    }

    /**
     * Create floating animation
     */
    createFloat(object, amplitude = 1.0, frequency = 1.0, duration = -1) {
        const originalY = object.position.y;
        let elapsed = 0;
        
        return this.createTween(
            { time: 0 },
            { time: duration > 0 ? duration : 1000000 }, // Large number for infinite
            duration > 0 ? duration : 1000000,
            {
                easing: this.linear,
                onUpdate: (values) => {
                    elapsed = values.time;
                    object.position.y = originalY + Math.sin(elapsed * frequency * Math.PI * 2) * amplitude;
                }
            }
        );
    }

    /**
     * Update all active animations
     */
    update(deltaTime) {
        for (let i = this.tweens.length - 1; i >= 0; i--) {
            const tween = this.tweens[i];
            
            if (!tween.active) {
                this.tweens.splice(i, 1);
                continue;
            }
            
            // Handle delay
            if (tween.delay > 0) {
                tween.delayElapsed += deltaTime;
                if (tween.delayElapsed < tween.delay) {
                    continue;
                }
            }
            
            tween.elapsed += deltaTime;
            const progress = Math.min(tween.elapsed / tween.duration, 1.0);
            const easedProgress = tween.easing(progress);
            
            // Update target properties
            for (let prop in tween.endValues) {
                const startValue = tween.startValues[prop];
                const endValue = tween.endValues[prop];
                
                if (typeof startValue === 'number') {
                    tween.target[prop] = startValue + (endValue - startValue) * easedProgress;
                } else if (startValue && startValue.lerp) {
                    // Vector3, Color, etc.
                    tween.target[prop].copy(startValue).lerp(endValue, easedProgress);
                } else if (typeof startValue === 'object') {
                    // Handle nested objects
                    for (let subProp in endValue) {
                        if (typeof startValue[subProp] === 'number') {
                            tween.target[prop][subProp] = startValue[subProp] + 
                                (endValue[subProp] - startValue[subProp]) * easedProgress;
                        }
                    }
                }
            }
            
            // Call update callback
            if (tween.onUpdate) {
                tween.onUpdate(tween.target);
            }
            
            // Check if animation is complete
            if (progress >= 1.0) {
                if (tween.onComplete) {
                    tween.onComplete();
                }
                this.tweens.splice(i, 1);
            }
        }
    }

    /**
     * Easing functions
     */
    linear(t) {
        return t;
    }

    easeInQuad(t) {
        return t * t;
    }

    easeOutQuad(t) {
        return t * (2 - t);
    }

    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    easeInCubic(t) {
        return t * t * t;
    }

    easeOutCubic(t) {
        return (--t) * t * t + 1;
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }

    easeInOutSine(t) {
        return -(Math.cos(Math.PI * t) - 1) / 2;
    }

    easeOutBounce(t) {
        const n1 = 7.5625;
        const d1 = 2.75;

        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    }

    easeInOutElastic(t) {
        const c5 = (2 * Math.PI) / 4.5;

        return t === 0
            ? 0
            : t === 1
            ? 1
            : t < 0.5
            ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
            : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
    }

    /**
     * Stop all animations
     */
    stopAll() {
        this.tweens = [];
    }

    /**
     * Get active animation count
     */
    getActiveAnimationCount() {
        return this.tweens.length;
    }

    /**
     * Dispose of the animation system
     */
    dispose() {
        this.stopAll();
        this.animations.clear();
        console.log('AnimationSystem disposed');
    }
}