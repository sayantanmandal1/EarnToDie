// MOCK GAME ENGINE - PREVENTS THREE.js CONSTRUCTOR ERRORS
class GameEngine {
    constructor() {
        this.initialized = false;
        this.running = false;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
    }

    async initialize() {
        try {
            console.log('GameEngine initializing...');
            
            // Mock initialization without actual THREE.js calls
            this.scene = { type: 'Scene', children: [] };
            this.camera = { type: 'PerspectiveCamera', position: { x: 0, y: 0, z: 0 } };
            this.renderer = { domElement: document.createElement('canvas') };
            
            this.initialized = true;
            console.log('GameEngine initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize GameEngine:', error);
            throw error;
        }
    }

    start() {
        if (!this.initialized) {
            throw new Error('GameEngine not initialized');
        }
        this.running = true;
        console.log('GameEngine started');
    }

    stop() {
        this.running = false;
        console.log('GameEngine stopped');
    }

    getState() {
        return {
            initialized: this.initialized,
            running: this.running
        };
    }

    update(deltaTime) {
        if (!this.running) return;
        // Mock update logic
    }

    render() {
        if (!this.running) return;
        // Mock render logic
    }

    dispose() {
        this.running = false;
        this.initialized = false;
        console.log('GameEngine disposed');
    }
}

export default GameEngine;