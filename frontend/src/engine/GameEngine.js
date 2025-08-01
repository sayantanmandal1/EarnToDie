import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { InputManager } from './InputManager';
import { AssetLoader } from './AssetLoader';
import { AudioIntegration } from '../audio/AudioIntegration';
import { PerformanceIntegration } from '../performance/PerformanceIntegration';

/**
 * Core game engine class that manages Three.js scene, physics world, and game loop
 */
export class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.physics = null;
        this.inputManager = null;
        this.assetLoader = null;
        this.audioIntegration = null;
        this.performanceIntegration = null;

        // Game loop properties
        this.isRunning = false;
        this.lastTime = 0;
        this.fixedTimeStep = 1.0 / 60.0; // 60 FPS physics
        this.maxSubSteps = 3;

        // Event callbacks
        this.onUpdate = null;
        this.onRender = null;
        this.onResize = null;
    }

    /**
     * Initialize the game engine with Three.js scene and Cannon.js physics
     */
    async initialize() {
        try {
            this._initializeRenderer();
            this._initializeScene();
            this._initializeCamera();
            this._initializeLighting();
            this._initializePhysics();
            this._initializeInput();
            this._initializeAssetLoader();
            this._initializeAudio();
            this._initializePerformance();
            this._setupEventListeners();

            console.log('GameEngine initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize GameEngine:', error);
            throw error;
        }
    }

    /**
     * Start the game loop
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.lastTime = performance.now();
        this._gameLoop();
        console.log('GameEngine started');
    }

    /**
     * Stop the game loop
     */
    stop() {
        this.isRunning = false;
        console.log('GameEngine stopped');
    }

    /**
     * Main game loop with fixed timestep physics
     */
    _gameLoop() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000.0;
        this.lastTime = currentTime;

        // Update physics with fixed timestep
        this.physics.step(this.fixedTimeStep, deltaTime, this.maxSubSteps);

        // Update game logic
        this.update(deltaTime);

        // Render the scene
        this.render();

        // Continue the loop
        requestAnimationFrame(() => this._gameLoop());
    }

    /**
     * Update method called each frame
     */
    update(deltaTime) {
        // Update input manager
        this.inputManager.update();

        // Update audio system
        if (this.audioIntegration) {
            this.audioIntegration.update(deltaTime);
        }

        // Update performance system
        if (this.performanceIntegration) {
            this.performanceIntegration.update(deltaTime);
        }

        // Call custom update callback if provided
        if (this.onUpdate) {
            this.onUpdate(deltaTime);
        }
    }

    /**
     * Render method called each frame
     */
    render() {
        // Call custom render callback if provided
        if (this.onRender) {
            this.onRender();
        }

        // Render the Three.js scene
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * Clean up resources
     */
    dispose() {
        this.stop();

        if (this.renderer) {
            this.renderer.dispose();
        }

        if (this.inputManager) {
            this.inputManager.dispose();
        }

        if (this.audioIntegration) {
            this.audioIntegration.dispose();
        }

        if (this.performanceIntegration) {
            this.performanceIntegration.dispose();
        }

        // Remove event listeners
        window.removeEventListener('resize', this._onWindowResize);

        console.log('GameEngine disposed');
    }

    /**
     * Initialize Three.js renderer
     */
    _initializeRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
    }

    /**
     * Initialize Three.js scene
     */
    _initializeScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200); // Distance fog
    }

    /**
     * Initialize camera
     */
    _initializeCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.camera.position.set(0, 10, 20);
        this.camera.lookAt(0, 0, 0);
    }

    /**
     * Initialize lighting system
     */
    _initializeLighting() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(50, 50, 25);
        directionalLight.castShadow = true;

        // Configure shadow properties
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 200;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;

        this.scene.add(directionalLight);

        // Hemisphere light for natural outdoor lighting
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x8B4513, 0.3);
        this.scene.add(hemisphereLight);
    }

    /**
     * Initialize Cannon.js physics world
     */
    _initializePhysics() {
        this.physics = new CANNON.World();
        this.physics.gravity.set(0, -9.82, 0); // Earth gravity
        this.physics.broadphase = new CANNON.NaiveBroadphase();
        this.physics.solver.iterations = 10;

        // Default contact material
        const defaultMaterial = new CANNON.Material('default');
        const defaultContactMaterial = new CANNON.ContactMaterial(
            defaultMaterial,
            defaultMaterial,
            {
                friction: 0.4,
                restitution: 0.3
            }
        );
        this.physics.addContactMaterial(defaultContactMaterial);
        this.physics.defaultContactMaterial = defaultContactMaterial;
    }

    /**
     * Initialize input management
     */
    _initializeInput() {
        this.inputManager = new InputManager(this.canvas);
        this.inputManager.initialize();
    }

    /**
     * Initialize asset loading system
     */
    _initializeAssetLoader() {
        this.assetLoader = new AssetLoader();
    }

    /**
     * Initialize audio integration system
     */
    async _initializeAudio() {
        try {
            this.audioIntegration = new AudioIntegration(this);
            await this.audioIntegration.initialize();
            console.log('Audio integration initialized');
        } catch (error) {
            console.warn('Failed to initialize audio integration:', error);
            this.audioIntegration = null;
        }
    }

    /**
     * Setup event listeners
     */
    _setupEventListeners() {
        this._onWindowResize = this._onWindowResize.bind(this);
        window.addEventListener('resize', this._onWindowResize);
    }

    /**
     * Handle window resize
     */
    _onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);

        if (this.onResize) {
            this.onResize(width, height);
        }
    }

    /**
     * Get current frame rate
     */
    getFrameRate() {
        return 1.0 / this.fixedTimeStep;
    }

    /**
     * Add object to both Three.js scene and physics world
     */
    addObject(mesh, body) {
        if (mesh) {
            this.scene.add(mesh);
        }
        if (body) {
            this.physics.add(body);
        }
    }

    /**
     * Remove object from both Three.js scene and physics world
     */
    removeObject(mesh, body) {
        if (mesh && this.scene) {
            this.scene.remove(mesh);
        }
        if (body && this.physics) {
            this.physics.remove(body);
        }
    }

    /**
     * Get audio integration instance
     */
    getAudioIntegration() {
        return this.audioIntegration;
    }

    /**
     * Get performance integration instance
     */
    getPerformanceIntegration() {
        return this.performanceIntegration;
    }

    /**
     * Initialize performance integration system
     */
    async _initializePerformance() {
        try {
            this.performanceIntegration = new PerformanceIntegration(this);
            await this.performanceIntegration.initialize();
            console.log('Performance integration initialized');
        } catch (error) {
            console.warn('Failed to initialize performance integration:', error);
            this.performanceIntegration = null;
        }
    }
}