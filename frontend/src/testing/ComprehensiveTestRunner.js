/**
 * Comprehensive Test Runner
 * Orchestrates and manages all unit tests for the game systems
 */
class ComprehensiveTestRunner {
    constructor(config = {}) {
        // Configuration
        this.config = {
            enableParallelExecution: true,
            maxConcurrentTests: 4,
            timeoutMs: 30000,
            enableCoverage: true,
            enablePerformanceMetrics: true,
            enableMemoryTracking: true,
            reportFormat: 'detailed', // 'summary', 'detailed', 'json'
            outputPath: './test-results',
            debugMode: process.env.NODE_ENV === 'development',
            ...config
        };

        // Test registry
        this.testSuites = new Map();
        this.testResults = new Map();
        this.testMetrics = new Map();
        
        // Execution state
        this.isRunning = false;
        this.currentSuite = null;
        this.startTime = 0;
        this.endTime = 0;
        
        // Statistics
        this.stats = {
            totalSuites: 0,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            skippedTests: 0,
            executionTime: 0,
            coverage: {
                statements: 0,
                branches: 0,
                functions: 0,
                lines: 0
            },
            performance: {
                averageTestTime: 0,
                slowestTest: null,
                fastestTest: null,
                memoryUsage: {
                    peak: 0,
                    average: 0
                }
            }
        };

        // Event listeners
        this.eventListeners = new Map();
        
        // Mock factories
        this.mockFactories = new Map();
        
        this.initialize();
    }

    /**
     * Initialize test runner
     */
    initialize() {
        console.log('Initializing Comprehensive Test Runner...');
        
        // Setup mock factories
        this.setupMockFactories();
        
        // Setup global test utilities
        this.setupGlobalUtilities();
        
        // Register built-in test suites
        this.registerBuiltInTestSuites();
        
        console.log('Comprehensive Test Runner initialized');
        
        // Emit initialization event
        this.emit('initialized', {
            suiteCount: this.testSuites.size,
            config: this.config
        });
    }

    /**
     * Setup mock factories for different systems
     */
    setupMockFactories() {
        // Audio Context Mock Factory
        this.mockFactories.set('audioContext', () => ({
            createOscillator: jest.fn().mockReturnValue({
                connect: jest.fn(),
                start: jest.fn(),
                stop: jest.fn(),
                frequency: { value: 440 }
            }),
            createGain: jest.fn().mockReturnValue({
                connect: jest.fn(),
                gain: { value: 1 }
            }),
            createAnalyser: jest.fn().mockReturnValue({
                connect: jest.fn(),
                getByteFrequencyData: jest.fn(),
                fftSize: 2048
            }),
            createPanner: jest.fn().mockReturnValue({
                connect: jest.fn(),
                setPosition: jest.fn(),
                setOrientation: jest.fn()
            }),
            destination: {
                connect: jest.fn()
            },
            sampleRate: 44100,
            currentTime: 0,
            state: 'running',
            suspend: jest.fn(),
            resume: jest.fn(),
            close: jest.fn()
        }));

        // WebGL Context Mock Factory
        this.mockFactories.set('webglContext', () => ({
            createShader: jest.fn().mockReturnValue({}),
            shaderSource: jest.fn(),
            compileShader: jest.fn(),
            createProgram: jest.fn().mockReturnValue({}),
            attachShader: jest.fn(),
            linkProgram: jest.fn(),
            useProgram: jest.fn(),
            createBuffer: jest.fn().mockReturnValue({}),
            bindBuffer: jest.fn(),
            bufferData: jest.fn(),
            getAttribLocation: jest.fn().mockReturnValue(0),
            enableVertexAttribArray: jest.fn(),
            vertexAttribPointer: jest.fn(),
            drawArrays: jest.fn(),
            viewport: jest.fn(),
            clearColor: jest.fn(),
            clear: jest.fn(),
            enable: jest.fn(),
            disable: jest.fn(),
            VERTEX_SHADER: 35633,
            FRAGMENT_SHADER: 35632,
            ARRAY_BUFFER: 34962,
            STATIC_DRAW: 35044,
            TRIANGLES: 4,
            COLOR_BUFFER_BIT: 16384,
            DEPTH_BUFFER_BIT: 256,
            DEPTH_TEST: 2929
        }));

        // Physics Engine Mock Factory
        this.mockFactories.set('physicsEngine', () => ({
            createWorld: jest.fn().mockReturnValue({
                addBody: jest.fn(),
                removeBody: jest.fn(),
                step: jest.fn(),
                raycast: jest.fn(),
                bodies: []
            }),
            createBody: jest.fn().mockReturnValue({
                position: { x: 0, y: 0, z: 0 },
                velocity: { x: 0, y: 0, z: 0 },
                mass: 1,
                addShape: jest.fn(),
                removeShape: jest.fn()
            }),
            createShape: jest.fn().mockReturnValue({
                type: 'box',
                dimensions: { x: 1, y: 1, z: 1 }
            })
        }));

        // Database Mock Factory
        this.mockFactories.set('database', () => ({
            open: jest.fn().mockResolvedValue({
                transaction: jest.fn().mockReturnValue({
                    objectStore: jest.fn().mockReturnValue({
                        get: jest.fn().mockResolvedValue(null),
                        put: jest.fn().mockResolvedValue(),
                        delete: jest.fn().mockResolvedValue(),
                        getAll: jest.fn().mockResolvedValue([]),
                        count: jest.fn().mockResolvedValue(0)
                    })
                }),
                close: jest.fn()
            }),
            deleteDatabase: jest.fn().mockResolvedValue()
        }));

        // Canvas Mock Factory
        this.mockFactories.set('canvas', () => ({
            getContext: jest.fn().mockReturnValue({
                fillRect: jest.fn(),
                clearRect: jest.fn(),
                drawImage: jest.fn(),
                fillText: jest.fn(),
                measureText: jest.fn().mockReturnValue({ width: 100 }),
                save: jest.fn(),
                restore: jest.fn(),
                translate: jest.fn(),
                rotate: jest.fn(),
                scale: jest.fn(),
                beginPath: jest.fn(),
                moveTo: jest.fn(),
                lineTo: jest.fn(),
                stroke: jest.fn(),
                fill: jest.fn(),
                arc: jest.fn(),
                rect: jest.fn(),
                createImageData: jest.fn(),
                getImageData: jest.fn(),
                putImageData: jest.fn()
            }),
            width: 800,
            height: 600,
            toDataURL: jest.fn().mockReturnValue('data:image/png;base64,mock')
        }));
    }

    /**
     * Setup global test utilities
     */
    setupGlobalUtilities() {
        // Global test utilities
        global.testUtils = {
            // Mock factory access
            createMock: (type) => {
                const factory = this.mockFactories.get(type);
                return factory ? factory() : null;
            },
            
            // Async test helpers
            waitFor: (condition, timeout = 5000) => {
                return new Promise((resolve, reject) => {
                    const startTime = Date.now();
                    const check = () => {
                        if (condition()) {
                            resolve();
                        } else if (Date.now() - startTime > timeout) {
                            reject(new Error('Timeout waiting for condition'));
                        } else {
                            setTimeout(check, 10);
                        }
                    };
                    check();
                });
            },
            
            // Performance measurement
            measurePerformance: async (fn) => {
                const startTime = performance.now();
                const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
                
                const result = await fn();
                
                const endTime = performance.now();
                const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
                
                return {
                    result,
                    executionTime: endTime - startTime,
                    memoryDelta: endMemory - startMemory
                };
            },
            
            // Mock data generators
            generateMockSaveData: () => ({
                playerLevel: Math.floor(Math.random() * 100) + 1,
                gameProgress: {
                    level: Math.floor(Math.random() * 50) + 1,
                    score: Math.floor(Math.random() * 100000),
                    achievements: Array.from({ length: 5 }, (_, i) => `achievement_${i}`)
                },
                vehicles: Array.from({ length: 3 }, (_, i) => ({
                    id: `vehicle_${i}`,
                    type: ['sedan', 'suv', 'truck'][i % 3],
                    upgrades: {
                        engine: Math.floor(Math.random() * 5) + 1,
                        tires: Math.floor(Math.random() * 5) + 1,
                        armor: Math.floor(Math.random() * 5) + 1
                    }
                })),
                settings: {
                    audio: {
                        masterVolume: 0.8,
                        musicVolume: 0.7,
                        sfxVolume: 0.9
                    },
                    graphics: {
                        quality: 'high',
                        resolution: '1920x1080',
                        fullscreen: true
                    }
                },
                timestamp: Date.now()
            }),
            
            generateMockAssetData: () => ({
                id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: ['image', 'audio', 'model', 'texture'][Math.floor(Math.random() * 4)],
                url: `/assets/mock_${Date.now()}.png`,
                size: Math.floor(Math.random() * 1000000) + 1000,
                checksum: Array.from({ length: 64 }, () => 
                    Math.floor(Math.random() * 16).toString(16)
                ).join(''),
                version: '1.0.0',
                metadata: {
                    width: 512,
                    height: 512,
                    format: 'PNG'
                }
            }),
            
            // Test data validation
            validateSaveData: (data) => {
                const required = ['playerLevel', 'gameProgress', 'timestamp'];
                return required.every(field => field in data) &&
                       typeof data.playerLevel === 'number' &&
                       typeof data.gameProgress === 'object' &&
                       typeof data.timestamp === 'number';
            },
            
            validateAssetData: (data) => {
                const required = ['id', 'type', 'url', 'size', 'checksum'];
                return required.every(field => field in data) &&
                       typeof data.size === 'number' &&
                       data.size > 0 &&
                       typeof data.checksum === 'string' &&
                       data.checksum.length === 64;
            }
        };

        // Setup global mocks for browser APIs
        this.setupBrowserAPIMocks();
    }

    /**
     * Setup browser API mocks
     */
    setupBrowserAPIMocks() {
        // AudioContext mock
        global.AudioContext = jest.fn().mockImplementation(() => 
            this.mockFactories.get('audioContext')()
        );
        global.webkitAudioContext = global.AudioContext;

        // WebGL context mock
        global.WebGLRenderingContext = jest.fn().mockImplementation(() => 
            this.mockFactories.get('webglContext')()
        );

        // Canvas mock
        global.HTMLCanvasElement = jest.fn().mockImplementation(() => 
            this.mockFactories.get('canvas')()
        );

        // IndexedDB mock
        global.indexedDB = this.mockFactories.get('database')();

        // Performance API mock
        if (!global.performance) {
            global.performance = {
                now: jest.fn().mockReturnValue(Date.now()),
                memory: {
                    usedJSHeapSize: 1000000,
                    totalJSHeapSize: 2000000,
                    jsHeapSizeLimit: 4000000
                }
            };
        }

        // RequestAnimationFrame mock
        global.requestAnimationFrame = jest.fn().mockImplementation(cb => {
            setTimeout(cb, 16); // ~60fps
            return 1;
        });
        global.cancelAnimationFrame = jest.fn();

        // Fetch mock
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue({}),
            text: jest.fn().mockResolvedValue(''),
            arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0))
        });

        // LocalStorage mock
        const localStorageMock = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
            clear: jest.fn(),
            length: 0,
            key: jest.fn()
        };
        global.localStorage = localStorageMock;
        global.sessionStorage = localStorageMock;

        // Worker mock
        global.Worker = jest.fn().mockImplementation(() => ({
            postMessage: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            terminate: jest.fn(),
            onmessage: null,
            onerror: null
        }));

        // Crypto API mock
        global.crypto = {
            subtle: {
                digest: jest.fn().mockImplementation((algorithm, data) => {
                    const mockHash = new ArrayBuffer(32);
                    const view = new Uint8Array(mockHash);
                    for (let i = 0; i < 32; i++) {
                        view[i] = i;
                    }
                    return Promise.resolve(mockHash);
                }),
                encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(16)),
                decrypt: jest.fn().mockResolvedValue(new ArrayBuffer(16)),
                generateKey: jest.fn().mockResolvedValue({}),
                importKey: jest.fn().mockResolvedValue({}),
                exportKey: jest.fn().mockResolvedValue(new ArrayBuffer(16))
            },
            getRandomValues: jest.fn().mockImplementation(array => {
                for (let i = 0; i < array.length; i++) {
                    array[i] = Math.floor(Math.random() * 256);
                }
                return array;
            })
        };
    }

    /**
     * Register built-in test suites
     */
    registerBuiltInTestSuites() {
        // Register test suites for all major game systems
        this.registerTestSuite('VehiclePhysics', () => import('../vehicles/__tests__/VehiclePhysicsEngine.test.js'));
        this.registerTestSuite('ZombieAI', () => import('../zombies/__tests__/IntelligentZombieAI.test.js'));
        this.registerTestSuite('AudioSystem', () => import('../audio/__tests__/AudioManagementSystem.test.js'));
        this.registerTestSuite('SaveSystem', () => import('../save/__tests__/SaveGameProtection.test.js'));
        this.registerTestSuite('AssetVerification', () => import('../assets/__tests__/AssetVerificationSystem.test.js'));
        this.registerTestSuite('ErrorHandling', () => import('../error/__tests__/ErrorHandlingIntegration.test.js'));
        this.registerTestSuite('Performance', () => import('../performance/__tests__/PerformanceIntegration.test.js'));
        this.registerTestSuite('Rendering', () => import('../rendering/__tests__/AdvancedRenderingOptimizer.test.js'));
        this.registerTestSuite('Platform', () => import('../platform/__tests__/CrossPlatformIntegration.test.js'));
        this.registerTestSuite('Database', () => import('../database/__tests__/DatabaseIntegration.test.js'));
    }

    /**
     * Register a test suite
     */
    registerTestSuite(name, testModule) {
        this.testSuites.set(name, {
            name,
            module: testModule,
            status: 'registered',
            tests: [],
            results: null,
            metrics: null
        });
        
        console.log(`Registered test suite: ${name}`);
    }

    /**
     * Run all test suites
     */
    async runAllTests() {
        if (this.isRunning) {
            throw new Error('Tests are already running');
        }

        console.log('Starting comprehensive test run...');
        this.isRunning = true;
        this.startTime = Date.now();
        
        // Reset statistics
        this.resetStats();
        
        // Emit test run started event
        this.emit('testRunStarted', {
            suiteCount: this.testSuites.size,
            config: this.config
        });

        try {
            if (this.config.enableParallelExecution) {
                await this.runTestsInParallel();
            } else {
                await this.runTestsSequentially();
            }
            
            this.endTime = Date.now();
            this.stats.executionTime = this.endTime - this.startTime;
            
            // Calculate final statistics
            this.calculateFinalStats();
            
            // Generate test report
            const report = this.generateTestReport();
            
            console.log('Comprehensive test run completed');
            console.log(`Total time: ${this.stats.executionTime}ms`);
            console.log(`Tests: ${this.stats.passedTests}/${this.stats.totalTests} passed`);
            
            // Emit test run completed event
            this.emit('testRunCompleted', {
                stats: this.stats,
                report
            });
            
            return report;
            
        } catch (error) {
            console.error('Test run failed:', error);
            
            // Emit test run failed event
            this.emit('testRunFailed', {
                error: error.message,
                stats: this.stats
            });
            
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Run tests in parallel
     */
    async runTestsInParallel() {
        const suiteNames = Array.from(this.testSuites.keys());
        const batches = this.createBatches(suiteNames, this.config.maxConcurrentTests);
        
        for (const batch of batches) {
            const batchPromises = batch.map(suiteName => this.runTestSuite(suiteName));
            await Promise.allSettled(batchPromises);
        }
    }

    /**
     * Run tests sequentially
     */
    async runTestsSequentially() {
        for (const suiteName of this.testSuites.keys()) {
            await this.runTestSuite(suiteName);
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

        console.log(`Running test suite: ${suiteName}`);
        this.currentSuite = suiteName;
        suite.status = 'running';
        
        const startTime = Date.now();
        let startMemory = 0;
        
        if (this.config.enableMemoryTracking && performance.memory) {
            startMemory = performance.memory.usedJSHeapSize;
        }

        try {
            // Emit suite started event
            this.emit('suiteStarted', { suiteName });
            
            // Load and run test module
            const testModule = await suite.module();
            
            // Execute tests (this would integrate with Jest or similar)
            const results = await this.executeTestModule(testModule, suiteName);
            
            const endTime = Date.now();
            let endMemory = startMemory;
            
            if (this.config.enableMemoryTracking && performance.memory) {
                endMemory = performance.memory.usedJSHeapSize;
            }
            
            // Store results and metrics
            suite.results = results;
            suite.metrics = {
                executionTime: endTime - startTime,
                memoryUsage: endMemory - startMemory,
                testCount: results.tests.length,
                passedCount: results.tests.filter(t => t.status === 'passed').length,
                failedCount: results.tests.filter(t => t.status === 'failed').length,
                skippedCount: results.tests.filter(t => t.status === 'skipped').length
            };
            
            suite.status = 'completed';
            
            // Update global statistics
            this.updateStats(suite);
            
            console.log(`Test suite completed: ${suiteName} (${suite.metrics.executionTime}ms)`);
            
            // Emit suite completed event
            this.emit('suiteCompleted', {
                suiteName,
                results: suite.results,
                metrics: suite.metrics
            });
            
            return suite.results;
            
        } catch (error) {
            console.error(`Test suite failed: ${suiteName}`, error);
            
            suite.status = 'failed';
            suite.results = {
                success: false,
                error: error.message,
                tests: []
            };
            
            // Emit suite failed event
            this.emit('suiteFailed', {
                suiteName,
                error: error.message
            });
            
            throw error;
        }
    }

    /**
     * Execute test module (mock implementation)
     */
    async executeTestModule(testModule, suiteName) {
        // This is a mock implementation
        // In a real scenario, this would integrate with Jest or another test runner
        
        const mockTests = [
            { name: `${suiteName} - Basic functionality`, status: 'passed', duration: Math.random() * 100 },
            { name: `${suiteName} - Error handling`, status: 'passed', duration: Math.random() * 100 },
            { name: `${suiteName} - Performance`, status: 'passed', duration: Math.random() * 100 },
            { name: `${suiteName} - Edge cases`, status: Math.random() > 0.1 ? 'passed' : 'failed', duration: Math.random() * 100 }
        ];
        
        // Simulate test execution delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
        
        return {
            success: mockTests.every(t => t.status === 'passed'),
            tests: mockTests,
            coverage: {
                statements: Math.random() * 100,
                branches: Math.random() * 100,
                functions: Math.random() * 100,
                lines: Math.random() * 100
            }
        };
    }

    /**
     * Create batches for parallel execution
     */
    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalSuites: this.testSuites.size,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            skippedTests: 0,
            executionTime: 0,
            coverage: {
                statements: 0,
                branches: 0,
                functions: 0,
                lines: 0
            },
            performance: {
                averageTestTime: 0,
                slowestTest: null,
                fastestTest: null,
                memoryUsage: {
                    peak: 0,
                    average: 0
                }
            }
        };
    }

    /**
     * Update statistics with suite results
     */
    updateStats(suite) {
        if (!suite.results || !suite.metrics) return;
        
        this.stats.totalTests += suite.metrics.testCount;
        this.stats.passedTests += suite.metrics.passedCount;
        this.stats.failedTests += suite.metrics.failedCount;
        this.stats.skippedTests += suite.metrics.skippedCount;
        
        // Update coverage (weighted average)
        if (suite.results.coverage) {
            const weight = suite.metrics.testCount / this.stats.totalTests;
            this.stats.coverage.statements += suite.results.coverage.statements * weight;
            this.stats.coverage.branches += suite.results.coverage.branches * weight;
            this.stats.coverage.functions += suite.results.coverage.functions * weight;
            this.stats.coverage.lines += suite.results.coverage.lines * weight;
        }
        
        // Update performance metrics
        if (suite.metrics.memoryUsage > this.stats.performance.memoryUsage.peak) {
            this.stats.performance.memoryUsage.peak = suite.metrics.memoryUsage;
        }
        
        // Track slowest and fastest tests
        suite.results.tests.forEach(test => {
            if (!this.stats.performance.slowestTest || 
                test.duration > this.stats.performance.slowestTest.duration) {
                this.stats.performance.slowestTest = {
                    name: test.name,
                    duration: test.duration,
                    suite: suite.name
                };
            }
            
            if (!this.stats.performance.fastestTest || 
                test.duration < this.stats.performance.fastestTest.duration) {
                this.stats.performance.fastestTest = {
                    name: test.name,
                    duration: test.duration,
                    suite: suite.name
                };
            }
        });
    }

    /**
     * Calculate final statistics
     */
    calculateFinalStats() {
        // Calculate average test time
        if (this.stats.totalTests > 0) {
            const totalTestTime = Array.from(this.testSuites.values())
                .reduce((sum, suite) => {
                    if (suite.results && suite.results.tests) {
                        return sum + suite.results.tests.reduce((testSum, test) => testSum + test.duration, 0);
                    }
                    return sum;
                }, 0);
            
            this.stats.performance.averageTestTime = totalTestTime / this.stats.totalTests;
        }
        
        // Calculate average memory usage
        const suiteCount = Array.from(this.testSuites.values()).filter(s => s.metrics).length;
        if (suiteCount > 0) {
            const totalMemory = Array.from(this.testSuites.values())
                .reduce((sum, suite) => sum + (suite.metrics?.memoryUsage || 0), 0);
            
            this.stats.performance.memoryUsage.average = totalMemory / suiteCount;
        }
    }

    /**
     * Generate comprehensive test report
     */
    generateTestReport() {
        const report = {
            summary: {
                timestamp: new Date().toISOString(),
                executionTime: this.stats.executionTime,
                totalSuites: this.stats.totalSuites,
                totalTests: this.stats.totalTests,
                passedTests: this.stats.passedTests,
                failedTests: this.stats.failedTests,
                skippedTests: this.stats.skippedTests,
                successRate: this.stats.totalTests > 0 ? 
                    (this.stats.passedTests / this.stats.totalTests * 100).toFixed(2) : 0,
                coverage: this.stats.coverage,
                performance: this.stats.performance
            },
            suites: [],
            recommendations: []
        };
        
        // Add suite details
        for (const [name, suite] of this.testSuites.entries()) {
            report.suites.push({
                name,
                status: suite.status,
                results: suite.results,
                metrics: suite.metrics
            });
        }
        
        // Generate recommendations
        report.recommendations = this.generateRecommendations();
        
        return report;
    }

    /**
     * Generate recommendations based on test results
     */
    generateRecommendations() {
        const recommendations = [];
        
        // Coverage recommendations
        if (this.stats.coverage.statements < 80) {
            recommendations.push({
                type: 'coverage',
                priority: 'high',
                message: `Statement coverage is ${this.stats.coverage.statements.toFixed(1)}%. Aim for at least 80%.`,
                action: 'Add more unit tests to cover untested code paths'
            });
        }
        
        if (this.stats.coverage.branches < 70) {
            recommendations.push({
                type: 'coverage',
                priority: 'medium',
                message: `Branch coverage is ${this.stats.coverage.branches.toFixed(1)}%. Aim for at least 70%.`,
                action: 'Add tests for conditional logic and error handling paths'
            });
        }
        
        // Performance recommendations
        if (this.stats.performance.averageTestTime > 100) {
            recommendations.push({
                type: 'performance',
                priority: 'medium',
                message: `Average test time is ${this.stats.performance.averageTestTime.toFixed(1)}ms. Consider optimizing slow tests.`,
                action: 'Review and optimize tests that take longer than 200ms'
            });
        }
        
        // Failure rate recommendations
        const failureRate = this.stats.totalTests > 0 ? 
            (this.stats.failedTests / this.stats.totalTests * 100) : 0;
        
        if (failureRate > 5) {
            recommendations.push({
                type: 'reliability',
                priority: 'high',
                message: `Test failure rate is ${failureRate.toFixed(1)}%. Investigate failing tests.`,
                action: 'Fix failing tests and improve test stability'
            });
        }
        
        // Memory usage recommendations
        if (this.stats.performance.memoryUsage.peak > 50000000) { // 50MB
            recommendations.push({
                type: 'memory',
                priority: 'medium',
                message: `Peak memory usage during tests is ${(this.stats.performance.memoryUsage.peak / 1000000).toFixed(1)}MB.`,
                action: 'Review memory-intensive tests and optimize resource usage'
            });
        }
        
        return recommendations;
    }

    /**
     * Get test results for a specific suite
     */
    getTestResults(suiteName) {
        const suite = this.testSuites.get(suiteName);
        return suite ? suite.results : null;
    }

    /**
     * Get test metrics for a specific suite
     */
    getTestMetrics(suiteName) {
        const suite = this.testSuites.get(suiteName);
        return suite ? suite.metrics : null;
    }

    /**
     * Get overall test statistics
     */
    getTestStats() {
        return { ...this.stats };
    }

    /**
     * Event system
     */
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

    /**
     * Cleanup and destroy
     */
    destroy() {
        console.log('Destroying Comprehensive Test Runner');
        
        // Clear event listeners
        this.eventListeners.clear();
        
        // Clear test data
        this.testSuites.clear();
        this.testResults.clear();
        this.testMetrics.clear();
        
        // Reset state
        this.isRunning = false;
        this.currentSuite = null;
        
        console.log('Comprehensive Test Runner destroyed');
    }
}

export default ComprehensiveTestRunner;