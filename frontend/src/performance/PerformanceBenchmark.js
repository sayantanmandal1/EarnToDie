/**
 * Performance Benchmark - Tests and measures game performance
 */
export class PerformanceBenchmark {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.tests = new Map();
        this.results = new Map();
        this.isRunning = false;
        
        this._setupDefaultTests();
    }

    /**
     * Run all performance benchmarks
     */
    async runAllBenchmarks() {
        if (this.isRunning) {
            console.warn('Benchmarks already running');
            return;
        }

        this.isRunning = true;
        this.results.clear();
        
        console.log('Starting performance benchmarks...');
        
        for (const [name, test] of this.tests) {
            console.log(`Running benchmark: ${name}`);
            try {
                const result = await this._runTest(name, test);
                this.results.set(name, result);
                console.log(`Benchmark ${name} completed:`, result);
            } catch (error) {
                console.error(`Benchmark ${name} failed:`, error);
                this.results.set(name, { error: error.message });
            }
        }
        
        this.isRunning = false;
        console.log('All benchmarks completed');
        
        return this.getResults();
    }

    /**
     * Run specific benchmark
     */
    async runBenchmark(name) {
        const test = this.tests.get(name);
        if (!test) {
            throw new Error(`Benchmark '${name}' not found`);
        }

        console.log(`Running benchmark: ${name}`);
        const result = await this._runTest(name, test);
        this.results.set(name, result);
        
        return result;
    }

    /**
     * Add custom benchmark test
     */
    addTest(name, testFunction, options = {}) {
        this.tests.set(name, {
            fn: testFunction,
            duration: options.duration || 5000, // 5 seconds default
            warmup: options.warmup || 1000, // 1 second warmup
            description: options.description || name
        });
    }

    /**
     * Get benchmark results
     */
    getResults() {
        const results = {};
        this.results.forEach((result, name) => {
            results[name] = result;
        });
        return results;
    }

    /**
     * Generate performance report
     */
    generateReport() {
        const results = this.getResults();
        const report = {
            timestamp: new Date().toISOString(),
            system: this._getSystemInfo(),
            benchmarks: results,
            summary: this._generateSummary(results)
        };

        return report;
    }

    /**
     * Setup default performance tests
     */
    _setupDefaultTests() {
        // Frame rate stability test
        this.addTest('frameRate', async () => {
            const frameRates = [];
            const startTime = performance.now();
            let lastFrameTime = startTime;
            
            return new Promise(resolve => {
                const measureFrame = () => {
                    const currentTime = performance.now();
                    const deltaTime = currentTime - lastFrameTime;
                    
                    if (deltaTime > 0) {
                        frameRates.push(1000 / deltaTime);
                    }
                    
                    lastFrameTime = currentTime;
                    
                    if (currentTime - startTime < 3000) {
                        requestAnimationFrame(measureFrame);
                    } else {
                        resolve(this._analyzeFrameRates(frameRates));
                    }
                };
                
                requestAnimationFrame(measureFrame);
            });
        }, { description: 'Frame rate stability test' });

        // Memory usage test
        this.addTest('memory', async () => {
            const measurements = [];
            const interval = 100; // Measure every 100ms
            const duration = 2000; // 2 seconds
            
            return new Promise(resolve => {
                const startTime = performance.now();
                
                const measure = () => {
                    if (performance.memory) {
                        measurements.push({
                            used: performance.memory.usedJSHeapSize,
                            total: performance.memory.totalJSHeapSize,
                            timestamp: performance.now()
                        });
                    }
                    
                    if (performance.now() - startTime < duration) {
                        setTimeout(measure, interval);
                    } else {
                        resolve(this._analyzeMemoryUsage(measurements));
                    }
                };
                
                measure();
            });
        }, { description: 'Memory usage analysis' });

        // Rendering performance test
        this.addTest('rendering', async () => {
            const renderer = this.gameEngine.renderer;
            const scene = this.gameEngine.scene;
            const camera = this.gameEngine.camera;
            
            const renderTimes = [];
            const iterations = 100;
            
            for (let i = 0; i < iterations; i++) {
                const startTime = performance.now();
                renderer.render(scene, camera);
                const endTime = performance.now();
                renderTimes.push(endTime - startTime);
                
                // Small delay to prevent blocking
                if (i % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 1));
                }
            }
            
            return this._analyzeRenderTimes(renderTimes);
        }, { description: 'Rendering performance test' });

        // Physics performance test
        this.addTest('physics', async () => {
            const world = this.gameEngine.physics;
            const stepTimes = [];
            const iterations = 100;
            const timeStep = 1/60;
            
            for (let i = 0; i < iterations; i++) {
                const startTime = performance.now();
                world.step(timeStep);
                const endTime = performance.now();
                stepTimes.push(endTime - startTime);
                
                // Small delay to prevent blocking
                if (i % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 1));
                }
            }
            
            return this._analyzePhysicsTimes(stepTimes);
        }, { description: 'Physics simulation performance' });

        // Object creation/destruction test
        this.addTest('objectLifecycle', async () => {
            const scene = this.gameEngine.scene;
            const objects = [];
            const iterations = 1000;
            
            // Creation test
            const createStartTime = performance.now();
            for (let i = 0; i < iterations; i++) {
                const geometry = new THREE.BoxGeometry(1, 1, 1);
                const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
                const mesh = new THREE.Mesh(geometry, material);
                objects.push(mesh);
                scene.add(mesh);
            }
            const createEndTime = performance.now();
            
            // Destruction test
            const destroyStartTime = performance.now();
            objects.forEach(obj => {
                scene.remove(obj);
                obj.geometry.dispose();
                obj.material.dispose();
            });
            const destroyEndTime = performance.now();
            
            return {
                creation: {
                    totalTime: createEndTime - createStartTime,
                    averageTime: (createEndTime - createStartTime) / iterations,
                    objectsPerSecond: iterations / ((createEndTime - createStartTime) / 1000)
                },
                destruction: {
                    totalTime: destroyEndTime - destroyStartTime,
                    averageTime: (destroyEndTime - destroyStartTime) / iterations,
                    objectsPerSecond: iterations / ((destroyEndTime - destroyStartTime) / 1000)
                }
            };
        }, { description: 'Object creation and destruction performance' });
    }

    /**
     * Run individual test
     */
    async _runTest(name, test) {
        const startTime = performance.now();
        
        // Warmup period
        if (test.warmup > 0) {
            await new Promise(resolve => setTimeout(resolve, test.warmup));
        }
        
        // Run the actual test
        const result = await test.fn();
        
        const endTime = performance.now();
        
        return {
            ...result,
            testDuration: endTime - startTime,
            description: test.description
        };
    }

    /**
     * Analyze frame rate data
     */
    _analyzeFrameRates(frameRates) {
        if (frameRates.length === 0) return { error: 'No frame rate data' };
        
        const sorted = frameRates.sort((a, b) => a - b);
        const avg = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const median = sorted[Math.floor(sorted.length / 2)];
        const p95 = sorted[Math.floor(sorted.length * 0.95)];
        const p99 = sorted[Math.floor(sorted.length * 0.99)];
        
        // Calculate frame time consistency
        const variance = frameRates.reduce((acc, fps) => acc + Math.pow(fps - avg, 2), 0) / frameRates.length;
        const stdDev = Math.sqrt(variance);
        
        return {
            average: Math.round(avg * 100) / 100,
            minimum: Math.round(min * 100) / 100,
            maximum: Math.round(max * 100) / 100,
            median: Math.round(median * 100) / 100,
            percentile95: Math.round(p95 * 100) / 100,
            percentile99: Math.round(p99 * 100) / 100,
            standardDeviation: Math.round(stdDev * 100) / 100,
            stability: Math.max(0, 100 - (stdDev / avg * 100)), // Stability score
            samples: frameRates.length
        };
    }

    /**
     * Analyze memory usage data
     */
    _analyzeMemoryUsage(measurements) {
        if (measurements.length === 0) return { error: 'No memory data' };
        
        const usedMemory = measurements.map(m => m.used);
        const totalMemory = measurements.map(m => m.total);
        
        const avgUsed = usedMemory.reduce((a, b) => a + b, 0) / usedMemory.length;
        const maxUsed = Math.max(...usedMemory);
        const minUsed = Math.min(...usedMemory);
        const avgTotal = totalMemory.reduce((a, b) => a + b, 0) / totalMemory.length;
        
        // Calculate memory growth rate
        const firstUsed = usedMemory[0];
        const lastUsed = usedMemory[usedMemory.length - 1];
        const growthRate = (lastUsed - firstUsed) / firstUsed * 100;
        
        return {
            averageUsed: Math.round(avgUsed / 1048576 * 100) / 100, // MB
            maximumUsed: Math.round(maxUsed / 1048576 * 100) / 100, // MB
            minimumUsed: Math.round(minUsed / 1048576 * 100) / 100, // MB
            averageTotal: Math.round(avgTotal / 1048576 * 100) / 100, // MB
            growthRate: Math.round(growthRate * 100) / 100, // Percentage
            samples: measurements.length
        };
    }

    /**
     * Analyze render times
     */
    _analyzeRenderTimes(renderTimes) {
        const avg = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
        const max = Math.max(...renderTimes);
        const min = Math.min(...renderTimes);
        
        return {
            averageTime: Math.round(avg * 1000) / 1000, // ms
            maximumTime: Math.round(max * 1000) / 1000, // ms
            minimumTime: Math.round(min * 1000) / 1000, // ms
            framesPerSecond: Math.round(1000 / avg * 100) / 100,
            samples: renderTimes.length
        };
    }

    /**
     * Analyze physics step times
     */
    _analyzePhysicsTimes(stepTimes) {
        const avg = stepTimes.reduce((a, b) => a + b, 0) / stepTimes.length;
        const max = Math.max(...stepTimes);
        const min = Math.min(...stepTimes);
        
        return {
            averageStepTime: Math.round(avg * 1000) / 1000, // ms
            maximumStepTime: Math.round(max * 1000) / 1000, // ms
            minimumStepTime: Math.round(min * 1000) / 1000, // ms
            stepsPerSecond: Math.round(1000 / avg * 100) / 100,
            samples: stepTimes.length
        };
    }

    /**
     * Generate performance summary
     */
    _generateSummary(results) {
        const summary = {
            overallScore: 0,
            recommendations: [],
            issues: []
        };

        // Analyze frame rate
        if (results.frameRate && !results.frameRate.error) {
            const fps = results.frameRate.average;
            if (fps >= 55) {
                summary.overallScore += 25;
            } else if (fps >= 45) {
                summary.overallScore += 20;
                summary.recommendations.push('Consider reducing graphics quality for better frame rate');
            } else if (fps >= 30) {
                summary.overallScore += 15;
                summary.issues.push('Low frame rate detected');
            } else {
                summary.overallScore += 5;
                summary.issues.push('Very low frame rate - performance optimization needed');
            }
        }

        // Analyze memory usage
        if (results.memory && !results.memory.error) {
            const growth = results.memory.growthRate;
            if (growth < 5) {
                summary.overallScore += 25;
            } else if (growth < 15) {
                summary.overallScore += 20;
                summary.recommendations.push('Monitor memory usage for potential leaks');
            } else {
                summary.overallScore += 10;
                summary.issues.push('High memory growth rate detected');
            }
        }

        // Analyze rendering performance
        if (results.rendering && !results.rendering.error) {
            const renderFPS = results.rendering.framesPerSecond;
            if (renderFPS >= 100) {
                summary.overallScore += 25;
            } else if (renderFPS >= 60) {
                summary.overallScore += 20;
            } else {
                summary.overallScore += 10;
                summary.recommendations.push('Optimize rendering pipeline');
            }
        }

        // Analyze physics performance
        if (results.physics && !results.physics.error) {
            const physicsSteps = results.physics.stepsPerSecond;
            if (physicsSteps >= 200) {
                summary.overallScore += 25;
            } else if (physicsSteps >= 100) {
                summary.overallScore += 20;
            } else {
                summary.overallScore += 10;
                summary.recommendations.push('Consider optimizing physics calculations');
            }
        }

        return summary;
    }

    /**
     * Get system information
     */
    _getSystemInfo() {
        const info = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: navigator.deviceMemory,
            screen: {
                width: screen.width,
                height: screen.height,
                pixelRatio: window.devicePixelRatio
            }
        };

        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    info.gpu = {
                        vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
                        renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
                    };
                }
                info.webglVersion = gl.getParameter(gl.VERSION);
            }
        } catch (error) {
            // WebGL not available in test environment
            info.webglSupported = false;
        }

        return info;
    }
}