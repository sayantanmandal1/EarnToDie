/**
 * Integration Test Framework
 * Comprehensive framework for end-to-end and cross-system integration testing
 */
class IntegrationTestFramework {
    constructor(config = {}) {
        // Configuration
        this.config = {
            enableE2ETesting: true,
            enableCrossSystemTesting: true,
            enablePerformanceRegression: true,
            enableUITesting: true,
            testTimeout: 60000, // 1 minute per test
            screenshotOnFailure: true,
            videoRecording: false,
            parallelExecution: false, // Integration tests run sequentially
            retryFailedTests: 2,
            debugMode: process.env.NODE_ENV === 'development',
            ...config
        };

        // Test registry
        this.testSuites = new Map();
        this.testResults = new Map();
        this.testEnvironment = null;
        
        // Execution state
        this.isRunning = false;
        this.currentTest = null;
        this.testSession = null;
        
        // Performance baselines
        this.performanceBaselines = new Map();
        this.regressionThresholds = {
            loadTime: 1.2, // 20% increase threshold
            memoryUsage: 1.3, // 30% increase threshold
            frameRate: 0.8 // 20% decrease threshold
        };

        // Event listeners
        this.eventListeners = new Map();
        
        this.initialize();
    }

    /**
     * Initialize integration test framework
     */
    async initialize() {
        console.log('Initializing Integration Test Framework...');
        
        try {
            // Setup test environment
            await this.setupTestEnvironment();
            
            // Register test suites
            this.registerTestSuites();
            
            // Load performance baselines
            await this.loadPerformanceBaselines();
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('Integration Test Framework initialized');
            
            // Emit initialization event
            this.emit('initialized', {
                suiteCount: this.testSuites.size,
                config: this.config
            });
            
        } catch (error) {
            console.error('Failed to initialize Integration Test Framework:', error);
            throw error;
        }
    }

    /**
     * Setup test environment
     */
    async setupTestEnvironment() {
        this.testEnvironment = {
            // Game engine instance
            gameEngine: null,
            
            // System managers
            audioManager: null,
            physicsEngine: null,
            databaseManager: null,
            assetManager: null,
            
            // UI elements
            gameContainer: null,
            canvas: null,
            
            // Test utilities
            testPlayer: null,
            testVehicle: null,
            testLevel: null,
            
            // Performance monitors
            performanceMonitor: null,
            memoryTracker: null,
            
            // Screenshot/video utilities
            screenshotUtil: null,
            videoRecorder: null
        };

        // Create test DOM environment
        await this.createTestDOM();
        
        // Initialize game systems for testing
        await this.initializeGameSystems();
        
        console.log('Test environment setup complete');
    }    /**

     * Create test DOM environment
     */
    async createTestDOM() {
        // Create game container
        const gameContainer = document.createElement('div');
        gameContainer.id = 'test-game-container';
        gameContainer.style.width = '1920px';
        gameContainer.style.height = '1080px';
        gameContainer.style.position = 'absolute';
        gameContainer.style.top = '-9999px'; // Hide from view
        document.body.appendChild(gameContainer);

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.id = 'test-game-canvas';
        canvas.width = 1920;
        canvas.height = 1080;
        gameContainer.appendChild(canvas);

        // Create UI elements
        const uiContainer = document.createElement('div');
        uiContainer.id = 'test-ui-container';
        uiContainer.className = 'game-ui';
        gameContainer.appendChild(uiContainer);

        this.testEnvironment.gameContainer = gameContainer;
        this.testEnvironment.canvas = canvas;
        this.testEnvironment.uiContainer = uiContainer;
    }

    /**
     * Initialize game systems for testing
     */
    async initializeGameSystems() {
        // Import game systems dynamically
        const { default: ZombieCarGame } = await import('../ZombieCarGame.js');
        const { default: AudioManagementSystem } = await import('../audio/AudioManagementSystem.js');
        const { default: VehiclePhysicsEngine } = await import('../vehicles/VehiclePhysicsEngine.js');
        const { default: DatabaseManager } = await import('../database/DatabaseManager.js');
        const { default: AssetManager } = await import('../assets/AssetManager.js');

        // Initialize systems with test configuration
        this.testEnvironment.gameEngine = new ZombieCarGame({
            container: this.testEnvironment.gameContainer,
            canvas: this.testEnvironment.canvas,
            testMode: true,
            enableAudio: false, // Disable audio in tests
            enablePhysics: true,
            enableDatabase: true
        });

        this.testEnvironment.audioManager = new AudioManagementSystem({
            testMode: true,
            enableSpatialAudio: false
        });

        this.testEnvironment.physicsEngine = new VehiclePhysicsEngine({
            testMode: true,
            gravity: { x: 0, y: -9.81, z: 0 }
        });

        this.testEnvironment.databaseManager = new DatabaseManager({
            dbName: 'TestGameDB',
            version: 1,
            testMode: true
        });

        this.testEnvironment.assetManager = new AssetManager({
            testMode: true,
            enableCaching: false
        });

        // Initialize all systems
        await Promise.all([
            this.testEnvironment.gameEngine.initialize(),
            this.testEnvironment.audioManager.initialize(),
            this.testEnvironment.physicsEngine.initialize(),
            this.testEnvironment.databaseManager.initialize(),
            this.testEnvironment.assetManager.initialize()
        ]);

        console.log('Game systems initialized for testing');
    }

    /**
     * Register test suites
     */
    registerTestSuites() {
        // End-to-end gameplay tests
        this.registerTestSuite('E2E_GameplayFlow', this.createE2EGameplayTests());
        this.registerTestSuite('E2E_VehicleUpgrade', this.createE2EVehicleUpgradeTests());
        this.registerTestSuite('E2E_LevelProgression', this.createE2ELevelProgressionTests());
        
        // Cross-system integration tests
        this.registerTestSuite('Integration_AudioPhysics', this.createAudioPhysicsIntegrationTests());
        this.registerTestSuite('Integration_DatabaseUI', this.createDatabaseUIIntegrationTests());
        this.registerTestSuite('Integration_AssetRendering', this.createAssetRenderingIntegrationTests());
        
        // Performance regression tests
        this.registerTestSuite('Performance_LoadTime', this.createLoadTimeRegressionTests());
        this.registerTestSuite('Performance_FrameRate', this.createFrameRateRegressionTests());
        this.registerTestSuite('Performance_Memory', this.createMemoryRegressionTests());
        
        // UI automation tests
        this.registerTestSuite('UI_MainMenu', this.createMainMenuUITests());
        this.registerTestSuite('UI_GameHUD', this.createGameHUDUITests());
        this.registerTestSuite('UI_Settings', this.createSettingsUITests());
    }

    /**
     * Register a test suite
     */
    registerTestSuite(name, testSuite) {
        this.testSuites.set(name, {
            name,
            tests: testSuite,
            status: 'registered',
            results: null,
            executionTime: 0
        });
        
        console.log(`Registered integration test suite: ${name}`);
    }

    /**
     * Create E2E gameplay tests
     */
    createE2EGameplayTests() {
        return [
            {
                name: 'Complete Game Session',
                description: 'Test a complete game session from start to finish',
                timeout: 120000, // 2 minutes
                test: async () => {
                    // Start new game
                    await this.testEnvironment.gameEngine.startNewGame();
                    
                    // Verify initial state
                    const gameState = this.testEnvironment.gameEngine.getGameState();
                    expect(gameState.status).toBe('playing');
                    expect(gameState.player.health).toBe(100);
                    expect(gameState.player.level).toBe(1);
                    
                    // Simulate gameplay
                    await this.simulateGameplay(30000); // 30 seconds
                    
                    // Check progress
                    const updatedState = this.testEnvironment.gameEngine.getGameState();
                    expect(updatedState.player.score).toBeGreaterThan(0);
                    expect(updatedState.zombiesKilled).toBeGreaterThan(0);
                    
                    // Save game
                    const saveResult = await this.testEnvironment.gameEngine.saveGame();
                    expect(saveResult.success).toBe(true);
                    
                    // End game
                    await this.testEnvironment.gameEngine.endGame();
                    
                    return { success: true, score: updatedState.player.score };
                }
            },
            {
                name: 'Game Over and Restart',
                description: 'Test game over scenario and restart functionality',
                timeout: 60000,
                test: async () => {
                    // Start game
                    await this.testEnvironment.gameEngine.startNewGame();
                    
                    // Force game over
                    await this.forceGameOver();
                    
                    // Verify game over state
                    const gameState = this.testEnvironment.gameEngine.getGameState();
                    expect(gameState.status).toBe('gameOver');
                    
                    // Restart game
                    await this.testEnvironment.gameEngine.restartGame();
                    
                    // Verify restart
                    const restartedState = this.testEnvironment.gameEngine.getGameState();
                    expect(restartedState.status).toBe('playing');
                    expect(restartedState.player.health).toBe(100);
                    
                    return { success: true };
                }
            },
            {
                name: 'Pause and Resume',
                description: 'Test game pause and resume functionality',
                timeout: 30000,
                test: async () => {
                    // Start game
                    await this.testEnvironment.gameEngine.startNewGame();
                    
                    // Play for a bit
                    await this.simulateGameplay(5000);
                    
                    // Pause game
                    await this.testEnvironment.gameEngine.pauseGame();
                    const pausedState = this.testEnvironment.gameEngine.getGameState();
                    expect(pausedState.status).toBe('paused');
                    
                    // Wait while paused
                    await this.wait(2000);
                    
                    // Resume game
                    await this.testEnvironment.gameEngine.resumeGame();
                    const resumedState = this.testEnvironment.gameEngine.getGameState();
                    expect(resumedState.status).toBe('playing');
                    
                    return { success: true };
                }
            }
        ];
    }

    /**
     * Create E2E vehicle upgrade tests
     */
    createE2EVehicleUpgradeTests() {
        return [
            {
                name: 'Vehicle Purchase and Upgrade Flow',
                description: 'Test complete vehicle purchase and upgrade workflow',
                timeout: 60000,
                test: async () => {
                    // Start game with sufficient currency
                    await this.testEnvironment.gameEngine.startNewGame();
                    await this.addCurrency(10000);
                    
                    // Open garage
                    await this.navigateToGarage();
                    
                    // Purchase new vehicle
                    const purchaseResult = await this.purchaseVehicle('suv');
                    expect(purchaseResult.success).toBe(true);
                    
                    // Upgrade engine
                    const engineUpgrade = await this.upgradeVehicleComponent('engine', 2);
                    expect(engineUpgrade.success).toBe(true);
                    
                    // Upgrade tires
                    const tireUpgrade = await this.upgradeVehicleComponent('tires', 2);
                    expect(tireUpgrade.success).toBe(true);
                    
                    // Verify upgrades applied
                    const vehicle = this.testEnvironment.gameEngine.getCurrentVehicle();
                    expect(vehicle.upgrades.engine).toBe(2);
                    expect(vehicle.upgrades.tires).toBe(2);
                    
                    // Test upgraded performance
                    const performance = await this.testVehiclePerformance();
                    expect(performance.acceleration).toBeGreaterThan(1.0);
                    expect(performance.handling).toBeGreaterThan(1.0);
                    
                    return { success: true, performance };
                }
            }
        ];
    }

    /**
     * Create cross-system integration tests
     */
    createAudioPhysicsIntegrationTests() {
        return [
            {
                name: 'Engine Audio Physics Sync',
                description: 'Test synchronization between engine audio and physics',
                timeout: 30000,
                test: async () => {
                    // Start game
                    await this.testEnvironment.gameEngine.startNewGame();
                    
                    // Get vehicle and audio references
                    const vehicle = this.testEnvironment.gameEngine.getCurrentVehicle();
                    const audioManager = this.testEnvironment.audioManager;
                    
                    // Test idle state
                    expect(vehicle.engine.rpm).toBeCloseTo(800, 50); // Idle RPM
                    const idleAudio = audioManager.getEngineAudio();
                    expect(idleAudio.frequency).toBeCloseTo(800 * 0.1, 10); // Audio frequency
                    
                    // Accelerate
                    await this.simulateAcceleration(3000, 0.8); // 3 seconds at 80% throttle
                    
                    // Check audio-physics sync
                    const highRPM = vehicle.engine.rpm;
                    const accelAudio = audioManager.getEngineAudio();
                    
                    expect(highRPM).toBeGreaterThan(2000);
                    expect(accelAudio.frequency).toBeCloseTo(highRPM * 0.1, 20);
                    expect(accelAudio.volume).toBeGreaterThan(idleAudio.volume);
                    
                    return { success: true, rpmSync: Math.abs(accelAudio.frequency - highRPM * 0.1) < 20 };
                }
            }
        ];
    }

    /**
     * Create performance regression tests
     */
    createLoadTimeRegressionTests() {
        return [
            {
                name: 'Game Load Time Regression',
                description: 'Test game loading performance against baseline',
                timeout: 30000,
                test: async () => {
                    const startTime = performance.now();
                    
                    // Measure full game initialization
                    await this.testEnvironment.gameEngine.initialize();
                    await this.testEnvironment.gameEngine.loadAssets();
                    await this.testEnvironment.gameEngine.startNewGame();
                    
                    const loadTime = performance.now() - startTime;
                    
                    // Get baseline
                    const baseline = this.performanceBaselines.get('gameLoadTime') || loadTime;
                    const regression = loadTime / baseline;
                    
                    // Check for regression
                    const threshold = this.regressionThresholds.loadTime;
                    const hasRegression = regression > threshold;
                    
                    if (hasRegression) {
                        console.warn(`Load time regression detected: ${loadTime}ms vs ${baseline}ms baseline (${(regression * 100 - 100).toFixed(1)}% increase)`);
                    }
                    
                    // Update baseline if this is better
                    if (loadTime < baseline) {
                        this.performanceBaselines.set('gameLoadTime', loadTime);
                        await this.savePerformanceBaselines();
                    }
                    
                    return {
                        success: !hasRegression,
                        loadTime,
                        baseline,
                        regression: (regression - 1) * 100,
                        threshold: (threshold - 1) * 100
                    };
                }
            }
        ];
    }

    /**
     * Create UI automation tests
     */
    createMainMenuUITests() {
        return [
            {
                name: 'Main Menu Navigation',
                description: 'Test main menu navigation and interactions',
                timeout: 30000,
                test: async () => {
                    // Navigate to main menu
                    await this.navigateToMainMenu();
                    
                    // Test menu buttons
                    const newGameBtn = await this.findUIElement('[data-testid="new-game-btn"]');
                    expect(newGameBtn).toBeTruthy();
                    expect(newGameBtn.disabled).toBe(false);
                    
                    const loadGameBtn = await this.findUIElement('[data-testid="load-game-btn"]');
                    expect(loadGameBtn).toBeTruthy();
                    
                    const settingsBtn = await this.findUIElement('[data-testid="settings-btn"]');
                    expect(settingsBtn).toBeTruthy();
                    
                    // Test navigation
                    await this.clickUIElement(settingsBtn);
                    await this.waitForUIElement('[data-testid="settings-menu"]');
                    
                    const settingsMenu = await this.findUIElement('[data-testid="settings-menu"]');
                    expect(settingsMenu).toBeTruthy();
                    expect(settingsMenu.style.display).not.toBe('none');
                    
                    // Return to main menu
                    const backBtn = await this.findUIElement('[data-testid="back-btn"]');
                    await this.clickUIElement(backBtn);
                    
                    await this.waitForUIElement('[data-testid="main-menu"]');
                    
                    return { success: true };
                }
            }
        ];
    }

    /**
     * Run all integration tests
     */
    async runAllTests() {
        if (this.isRunning) {
            throw new Error('Integration tests are already running');
        }

        console.log('Starting integration test run...');
        this.isRunning = true;
        this.testSession = {
            startTime: Date.now(),
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            results: []
        };

        try {
            // Emit test run started event
            this.emit('testRunStarted', {
                suiteCount: this.testSuites.size,
                config: this.config
            });

            // Run test suites sequentially (integration tests need isolation)
            for (const [suiteName, suite] of this.testSuites.entries()) {
                await this.runTestSuite(suiteName);
            }

            this.testSession.endTime = Date.now();
            this.testSession.duration = this.testSession.endTime - this.testSession.startTime;

            console.log('Integration test run completed');
            console.log(`Total time: ${this.testSession.duration}ms`);
            console.log(`Tests: ${this.testSession.passedTests}/${this.testSession.totalTests} passed`);

            // Emit test run completed event
            this.emit('testRunCompleted', {
                session: this.testSession
            });

            return this.generateTestReport();

        } catch (error) {
            console.error('Integration test run failed:', error);
            
            // Emit test run failed event
            this.emit('testRunFailed', {
                error: error.message,
                session: this.testSession
            });
            
            throw error;
        } finally {
            this.isRunning = false;
            await this.cleanupTestEnvironment();
        }
    }

    /**
     * Run a single test suite
     */
    async runTestSuite(suiteName) {
        const suite = this.testSuites.get(suiteName);
        if (!suite) {
            throw new Error(`Test suite not found: ${suiteName}`);
        }

        console.log(`Running integration test suite: ${suiteName}`);
        suite.status = 'running';
        
        const startTime = Date.now();
        const suiteResults = {
            suiteName,
            tests: [],
            passed: 0,
            failed: 0,
            skipped: 0
        };

        try {
            // Emit suite started event
            this.emit('suiteStarted', { suiteName });

            // Run each test in the suite
            for (const test of suite.tests) {
                const testResult = await this.runSingleTest(test, suiteName);
                suiteResults.tests.push(testResult);
                
                if (testResult.status === 'passed') {
                    suiteResults.passed++;
                    this.testSession.passedTests++;
                } else if (testResult.status === 'failed') {
                    suiteResults.failed++;
                    this.testSession.failedTests++;
                } else {
                    suiteResults.skipped++;
                }
                
                this.testSession.totalTests++;
            }

            suite.executionTime = Date.now() - startTime;
            suite.results = suiteResults;
            suite.status = 'completed';

            console.log(`Test suite completed: ${suiteName} (${suite.executionTime}ms)`);
            console.log(`  Passed: ${suiteResults.passed}, Failed: ${suiteResults.failed}, Skipped: ${suiteResults.skipped}`);

            // Emit suite completed event
            this.emit('suiteCompleted', {
                suiteName,
                results: suiteResults,
                executionTime: suite.executionTime
            });

            this.testSession.results.push(suiteResults);

        } catch (error) {
            console.error(`Test suite failed: ${suiteName}`, error);
            
            suite.status = 'failed';
            suite.results = {
                suiteName,
                error: error.message,
                tests: [],
                passed: 0,
                failed: 1,
                skipped: 0
            };

            // Emit suite failed event
            this.emit('suiteFailed', {
                suiteName,
                error: error.message
            });

            throw error;
        }
    }    /**

     * Run a single test
     */
    async runSingleTest(test, suiteName) {
        console.log(`  Running test: ${test.name}`);
        this.currentTest = test;
        
        const testResult = {
            name: test.name,
            description: test.description,
            suiteName,
            status: 'running',
            startTime: Date.now(),
            endTime: null,
            duration: 0,
            error: null,
            screenshots: [],
            performance: null
        };

        try {
            // Setup test environment
            await this.setupTestForExecution(test);
            
            // Start performance monitoring
            const performanceMonitor = this.startPerformanceMonitoring();
            
            // Run the test with timeout
            const testPromise = test.test();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Test timeout')), test.timeout || this.config.testTimeout);
            });
            
            const result = await Promise.race([testPromise, timeoutPromise]);
            
            // Stop performance monitoring
            testResult.performance = this.stopPerformanceMonitoring(performanceMonitor);
            
            testResult.status = 'passed';
            testResult.result = result;
            
            console.log(`    ✓ ${test.name} (${testResult.duration}ms)`);
            
        } catch (error) {
            testResult.status = 'failed';
            testResult.error = error.message;
            testResult.stack = error.stack;
            
            console.log(`    ✗ ${test.name}: ${error.message}`);
            
            // Take screenshot on failure
            if (this.config.screenshotOnFailure) {
                try {
                    const screenshot = await this.takeScreenshot();
                    testResult.screenshots.push(screenshot);
                } catch (screenshotError) {
                    console.warn('Failed to take screenshot:', screenshotError);
                }
            }
            
            // Retry failed test if configured
            if (this.config.retryFailedTests > 0 && !test.retryAttempt) {
                console.log(`    Retrying test: ${test.name}`);
                test.retryAttempt = (test.retryAttempt || 0) + 1;
                
                if (test.retryAttempt <= this.config.retryFailedTests) {
                    await this.wait(1000); // Wait before retry
                    return await this.runSingleTest(test, suiteName);
                }
            }
        } finally {
            testResult.endTime = Date.now();
            testResult.duration = testResult.endTime - testResult.startTime;
            
            // Cleanup after test
            await this.cleanupAfterTest(test);
            
            this.currentTest = null;
        }

        return testResult;
    }

    /**
     * Setup test for execution
     */
    async setupTestForExecution(test) {
        // Reset game state
        if (this.testEnvironment.gameEngine) {
            await this.testEnvironment.gameEngine.reset();
        }
        
        // Clear any existing UI state
        await this.clearUIState();
        
        // Reset performance counters
        if (this.testEnvironment.performanceMonitor) {
            this.testEnvironment.performanceMonitor.reset();
        }
        
        // Clear console for clean test output
        if (this.config.debugMode) {
            console.clear();
        }
    }

    /**
     * Start performance monitoring
     */
    startPerformanceMonitoring() {
        const startTime = performance.now();
        const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
        
        return {
            startTime,
            startMemory,
            frameCount: 0,
            frameStartTime: startTime
        };
    }

    /**
     * Stop performance monitoring
     */
    stopPerformanceMonitoring(monitor) {
        const endTime = performance.now();
        const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
        
        return {
            duration: endTime - monitor.startTime,
            memoryUsage: endMemory - monitor.startMemory,
            averageFrameTime: monitor.frameCount > 0 ? (endTime - monitor.frameStartTime) / monitor.frameCount : 0,
            frameRate: monitor.frameCount > 0 ? monitor.frameCount / ((endTime - monitor.frameStartTime) / 1000) : 0
        };
    }

    /**
     * Utility methods for test implementation
     */
    
    async simulateGameplay(duration) {
        const endTime = Date.now() + duration;
        
        while (Date.now() < endTime) {
            // Simulate player input
            await this.simulatePlayerInput();
            
            // Update game
            if (this.testEnvironment.gameEngine) {
                this.testEnvironment.gameEngine.update(16); // 60fps
            }
            
            await this.wait(16); // ~60fps
        }
    }

    async simulatePlayerInput() {
        // Simulate random player actions
        const actions = ['accelerate', 'brake', 'steerLeft', 'steerRight', 'shoot'];
        const action = actions[Math.floor(Math.random() * actions.length)];
        
        switch (action) {
            case 'accelerate':
                this.testEnvironment.gameEngine.handleInput('accelerate', true);
                await this.wait(100);
                this.testEnvironment.gameEngine.handleInput('accelerate', false);
                break;
            case 'brake':
                this.testEnvironment.gameEngine.handleInput('brake', true);
                await this.wait(50);
                this.testEnvironment.gameEngine.handleInput('brake', false);
                break;
            case 'steerLeft':
                this.testEnvironment.gameEngine.handleInput('steerLeft', true);
                await this.wait(200);
                this.testEnvironment.gameEngine.handleInput('steerLeft', false);
                break;
            case 'steerRight':
                this.testEnvironment.gameEngine.handleInput('steerRight', true);
                await this.wait(200);
                this.testEnvironment.gameEngine.handleInput('steerRight', false);
                break;
            case 'shoot':
                this.testEnvironment.gameEngine.handleInput('shoot', true);
                await this.wait(10);
                this.testEnvironment.gameEngine.handleInput('shoot', false);
                break;
        }
    }

    async forceGameOver() {
        // Reduce player health to zero
        const gameState = this.testEnvironment.gameEngine.getGameState();
        gameState.player.health = 0;
        
        // Trigger game over
        this.testEnvironment.gameEngine.triggerGameOver();
        
        // Wait for game over state to be processed
        await this.waitForGameState('gameOver');
    }

    async waitForGameState(expectedState, timeout = 5000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const gameState = this.testEnvironment.gameEngine.getGameState();
            if (gameState.status === expectedState) {
                return true;
            }
            await this.wait(100);
        }
        
        throw new Error(`Timeout waiting for game state: ${expectedState}`);
    }

    async navigateToGarage() {
        // Click garage button
        const garageBtn = await this.findUIElement('[data-testid="garage-btn"]');
        await this.clickUIElement(garageBtn);
        
        // Wait for garage to load
        await this.waitForUIElement('[data-testid="garage-menu"]');
    }

    async purchaseVehicle(vehicleType) {
        const vehicleBtn = await this.findUIElement(`[data-testid="vehicle-${vehicleType}"]`);
        await this.clickUIElement(vehicleBtn);
        
        const purchaseBtn = await this.findUIElement('[data-testid="purchase-btn"]');
        await this.clickUIElement(purchaseBtn);
        
        // Wait for purchase confirmation
        await this.waitForUIElement('[data-testid="purchase-success"]');
        
        return { success: true, vehicleType };
    }

    async upgradeVehicleComponent(component, level) {
        const componentBtn = await this.findUIElement(`[data-testid="upgrade-${component}"]`);
        await this.clickUIElement(componentBtn);
        
        // Click upgrade button multiple times to reach desired level
        for (let i = 0; i < level; i++) {
            const upgradeBtn = await this.findUIElement('[data-testid="upgrade-btn"]');
            await this.clickUIElement(upgradeBtn);
            await this.wait(500); // Wait for upgrade animation
        }
        
        return { success: true, component, level };
    }

    async testVehiclePerformance() {
        // Get vehicle stats
        const vehicle = this.testEnvironment.gameEngine.getCurrentVehicle();
        
        return {
            acceleration: vehicle.stats.acceleration,
            handling: vehicle.stats.handling,
            topSpeed: vehicle.stats.topSpeed,
            durability: vehicle.stats.durability
        };
    }

    async addCurrency(amount) {
        const gameState = this.testEnvironment.gameEngine.getGameState();
        gameState.player.currency += amount;
    }

    async simulateAcceleration(duration, throttle) {
        const endTime = Date.now() + duration;
        
        this.testEnvironment.gameEngine.handleInput('accelerate', true, throttle);
        
        while (Date.now() < endTime) {
            this.testEnvironment.gameEngine.update(16);
            await this.wait(16);
        }
        
        this.testEnvironment.gameEngine.handleInput('accelerate', false);
    }

    // UI Testing Utilities
    
    async findUIElement(selector) {
        return this.testEnvironment.uiContainer.querySelector(selector);
    }

    async waitForUIElement(selector, timeout = 5000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            const element = await this.findUIElement(selector);
            if (element) {
                return element;
            }
            await this.wait(100);
        }
        
        throw new Error(`Timeout waiting for UI element: ${selector}`);
    }

    async clickUIElement(element) {
        if (!element) {
            throw new Error('Cannot click null element');
        }
        
        // Simulate click event
        const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        
        element.dispatchEvent(clickEvent);
        
        // Wait for any animations or state changes
        await this.wait(100);
    }

    async typeInUIElement(element, text) {
        if (!element) {
            throw new Error('Cannot type in null element');
        }
        
        element.focus();
        element.value = text;
        
        // Trigger input event
        const inputEvent = new Event('input', {
            bubbles: true,
            cancelable: true
        });
        
        element.dispatchEvent(inputEvent);
        
        await this.wait(50);
    }

    async navigateToMainMenu() {
        // Reset to main menu state
        if (this.testEnvironment.gameEngine) {
            await this.testEnvironment.gameEngine.showMainMenu();
        }
        
        await this.waitForUIElement('[data-testid="main-menu"]');
    }

    async clearUIState() {
        // Clear any modal dialogs
        const modals = this.testEnvironment.uiContainer.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        
        // Reset form inputs
        const inputs = this.testEnvironment.uiContainer.querySelectorAll('input');
        inputs.forEach(input => {
            input.value = '';
        });
        
        // Clear any temporary UI elements
        const tempElements = this.testEnvironment.uiContainer.querySelectorAll('.temp');
        tempElements.forEach(element => {
            element.remove();
        });
    }

    async takeScreenshot() {
        try {
            const canvas = this.testEnvironment.canvas;
            const dataURL = canvas.toDataURL('image/png');
            
            return {
                timestamp: Date.now(),
                dataURL,
                width: canvas.width,
                height: canvas.height
            };
        } catch (error) {
            console.warn('Failed to take screenshot:', error);
            return null;
        }
    }

    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Performance baseline management
    
    async loadPerformanceBaselines() {
        try {
            const stored = localStorage.getItem('integration_test_baselines');
            if (stored) {
                const baselines = JSON.parse(stored);
                this.performanceBaselines = new Map(Object.entries(baselines));
                console.log(`Loaded ${this.performanceBaselines.size} performance baselines`);
            }
        } catch (error) {
            console.warn('Failed to load performance baselines:', error);
        }
    }

    async savePerformanceBaselines() {
        try {
            const baselines = Object.fromEntries(this.performanceBaselines);
            localStorage.setItem('integration_test_baselines', JSON.stringify(baselines));
        } catch (error) {
            console.warn('Failed to save performance baselines:', error);
        }
    }

    // Cleanup and reporting
    
    async cleanupAfterTest(test) {
        // Stop any running animations
        if (this.testEnvironment.gameEngine) {
            this.testEnvironment.gameEngine.pause();
        }
        
        // Clear any timers
        // Note: In a real implementation, you'd track and clear timers
        
        // Reset audio
        if (this.testEnvironment.audioManager) {
            this.testEnvironment.audioManager.stopAllSounds();
        }
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
    }

    async cleanupTestEnvironment() {
        // Destroy game systems
        if (this.testEnvironment.gameEngine) {
            await this.testEnvironment.gameEngine.destroy();
        }
        
        if (this.testEnvironment.audioManager) {
            await this.testEnvironment.audioManager.destroy();
        }
        
        if (this.testEnvironment.physicsEngine) {
            await this.testEnvironment.physicsEngine.destroy();
        }
        
        if (this.testEnvironment.databaseManager) {
            await this.testEnvironment.databaseManager.destroy();
        }
        
        if (this.testEnvironment.assetManager) {
            await this.testEnvironment.assetManager.destroy();
        }
        
        // Remove test DOM elements
        if (this.testEnvironment.gameContainer) {
            document.body.removeChild(this.testEnvironment.gameContainer);
        }
        
        console.log('Test environment cleaned up');
    }

    generateTestReport() {
        return {
            session: this.testSession,
            summary: {
                totalTests: this.testSession.totalTests,
                passedTests: this.testSession.passedTests,
                failedTests: this.testSession.failedTests,
                successRate: this.testSession.totalTests > 0 ? 
                    (this.testSession.passedTests / this.testSession.totalTests * 100).toFixed(2) : 0,
                duration: this.testSession.duration
            },
            suites: this.testSession.results,
            performanceBaselines: Object.fromEntries(this.performanceBaselines)
        };
    }

    setupEventListeners() {
        // Setup any global event listeners needed for testing
    }

    // Event system
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (!this.eventListeners.has(event)) return;
        const listeners = this.eventListeners.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    emit(event, data) {
        if (!this.eventListeners.has(event)) return;
        const listeners = this.eventListeners.get(event);
        listeners.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }

    destroy() {
        console.log('Destroying Integration Test Framework');
        
        // Clear event listeners
        this.eventListeners.clear();
        
        // Clear test data
        this.testSuites.clear();
        this.testResults.clear();
        this.performanceBaselines.clear();
        
        // Reset state
        this.isRunning = false;
        this.currentTest = null;
        this.testSession = null;
        
        console.log('Integration Test Framework destroyed');
    }
}

export default IntegrationTestFramework;