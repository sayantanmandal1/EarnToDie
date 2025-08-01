/**
 * Enhanced game loop with fixed timestep physics and variable rendering
 * Provides precise timing control and performance monitoring
 */
export class GameLoop {
    constructor(gameEngine, gameStateManager) {
        this.gameEngine = gameEngine;
        this.gameStateManager = gameStateManager;
        
        // Timing properties
        this.isRunning = false;
        this.isPaused = false;
        this.lastTime = 0;
        this.accumulator = 0;
        this.currentTime = 0;
        this.frameTime = 0;
        
        // Fixed timestep for physics (60 FPS)
        this.fixedTimeStep = 1.0 / 60.0;
        this.maxFrameTime = 0.25; // Cap frame time to prevent spiral of death
        
        // Performance monitoring
        this.frameCount = 0;
        this.fpsUpdateInterval = 1000; // Update FPS every second
        this.lastFpsUpdate = 0;
        this.currentFps = 0;
        this.averageFrameTime = 0;
        
        // Frame time history for smoothing
        this.frameTimeHistory = [];
        this.frameTimeHistorySize = 60;
        
        // Animation frame ID for cleanup
        this.animationFrameId = null;
        
        // Callbacks
        this.onUpdate = null;
        this.onRender = null;
        this.onFpsUpdate = null;
    }

    /**
     * Start the game loop
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.isPaused = false;
        this.lastTime = performance.now();
        this.accumulator = 0;
        
        console.log('GameLoop started');
        this._loop();
    }

    /**
     * Stop the game loop
     */
    stop() {
        if (!this.isRunning) return;

        this.isRunning = false;
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        console.log('GameLoop stopped');
    }

    /**
     * Pause the game loop (stops updates but continues rendering)
     */
    pause() {
        this.isPaused = true;
        console.log('GameLoop paused');
    }

    /**
     * Resume the game loop
     */
    resume() {
        if (this.isPaused) {
            this.isPaused = false;
            this.lastTime = performance.now(); // Reset timing to prevent large delta
            console.log('GameLoop resumed');
        }
    }

    /**
     * Main game loop implementation
     */
    _loop() {
        if (!this.isRunning) return;

        this.currentTime = performance.now();
        this.frameTime = Math.min(this.currentTime - this.lastTime, this.maxFrameTime * 1000) / 1000;
        this.lastTime = this.currentTime;

        // Update frame time history
        this._updateFrameTimeHistory(this.frameTime);

        // Update FPS counter
        this._updateFpsCounter();

        if (!this.isPaused) {
            // Fixed timestep update loop
            this.accumulator += this.frameTime;

            // Prevent spiral of death by capping accumulator
            if (this.accumulator > this.maxFrameTime) {
                this.accumulator = this.maxFrameTime;
            }

            // Update with fixed timestep
            while (this.accumulator >= this.fixedTimeStep) {
                this._update(this.fixedTimeStep);
                this.accumulator -= this.fixedTimeStep;
            }

            // Calculate interpolation factor for smooth rendering
            const interpolation = this.accumulator / this.fixedTimeStep;
            this._render(interpolation);
        } else {
            // When paused, still render but don't update
            this._render(0);
        }

        // Schedule next frame
        this.animationFrameId = requestAnimationFrame(() => this._loop());
    }

    /**
     * Update game logic with fixed timestep
     */
    _update(deltaTime) {
        // Update game state manager
        if (this.gameStateManager) {
            this.gameStateManager.update(deltaTime);
        }

        // Update game engine
        if (this.gameEngine) {
            this.gameEngine.update(deltaTime);
        }

        // Call custom update callback
        if (this.onUpdate) {
            this.onUpdate(deltaTime);
        }
    }

    /**
     * Render the game with interpolation
     */
    _render(interpolation) {
        // Render game engine
        if (this.gameEngine) {
            this.gameEngine.render();
        }

        // Call custom render callback
        if (this.onRender) {
            this.onRender(interpolation);
        }
    }

    /**
     * Update frame time history for performance monitoring
     */
    _updateFrameTimeHistory(frameTime) {
        this.frameTimeHistory.push(frameTime);
        
        if (this.frameTimeHistory.length > this.frameTimeHistorySize) {
            this.frameTimeHistory.shift();
        }

        // Calculate average frame time
        const sum = this.frameTimeHistory.reduce((a, b) => a + b, 0);
        this.averageFrameTime = sum / this.frameTimeHistory.length;
    }

    /**
     * Update FPS counter
     */
    _updateFpsCounter() {
        this.frameCount++;
        
        if (this.currentTime - this.lastFpsUpdate >= this.fpsUpdateInterval) {
            this.currentFps = Math.round(this.frameCount * 1000 / (this.currentTime - this.lastFpsUpdate));
            this.frameCount = 0;
            this.lastFpsUpdate = this.currentTime;
            
            if (this.onFpsUpdate) {
                this.onFpsUpdate(this.currentFps, this.averageFrameTime);
            }
        }
    }

    /**
     * Get current FPS
     */
    getFps() {
        return this.currentFps;
    }

    /**
     * Get average frame time in milliseconds
     */
    getAverageFrameTime() {
        return this.averageFrameTime * 1000;
    }

    /**
     * Get current frame time in milliseconds
     */
    getCurrentFrameTime() {
        return this.frameTime * 1000;
    }

    /**
     * Check if the loop is running
     */
    isLoopRunning() {
        return this.isRunning;
    }

    /**
     * Check if the loop is paused
     */
    isLoopPaused() {
        return this.isPaused;
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return {
            fps: this.currentFps,
            averageFrameTime: this.getAverageFrameTime(),
            currentFrameTime: this.getCurrentFrameTime(),
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            fixedTimeStep: this.fixedTimeStep * 1000,
            accumulator: this.accumulator * 1000
        };
    }

    /**
     * Set the fixed timestep (in seconds)
     */
    setFixedTimeStep(timeStep) {
        this.fixedTimeStep = Math.max(0.001, Math.min(0.1, timeStep)); // Clamp between 1ms and 100ms
        console.log(`Fixed timestep set to ${this.fixedTimeStep * 1000}ms (${1/this.fixedTimeStep} FPS)`);
    }

    /**
     * Set the maximum frame time to prevent spiral of death
     */
    setMaxFrameTime(maxTime) {
        this.maxFrameTime = Math.max(0.016, Math.min(1.0, maxTime)); // Clamp between 16ms and 1s
        console.log(`Max frame time set to ${this.maxFrameTime * 1000}ms`);
    }

    /**
     * Dispose of the game loop
     */
    dispose() {
        this.stop();
        this.gameEngine = null;
        this.gameStateManager = null;
        this.onUpdate = null;
        this.onRender = null;
        this.onFpsUpdate = null;
        this.frameTimeHistory = [];
        console.log('GameLoop disposed');
    }
}