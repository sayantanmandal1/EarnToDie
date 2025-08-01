import { PerformanceBenchmark } from '../PerformanceBenchmark';

// Mock performance API
global.performance = {
    now: jest.fn(() => Date.now()),
    memory: {
        usedJSHeapSize: 50 * 1048576,
        totalJSHeapSize: 100 * 1048576,
        jsHeapSizeLimit: 200 * 1048576
    }
};

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));

describe('PerformanceBenchmark', () => {
    let benchmark;
    let mockGameEngine;

    beforeEach(() => {
        mockGameEngine = {
            renderer: {
                render: jest.fn(),
                info: { render: { calls: 10, triangles: 1000 } }
            },
            scene: {
                add: jest.fn(),
                remove: jest.fn()
            },
            camera: {},
            physics: {
                step: jest.fn()
            }
        };

        benchmark = new PerformanceBenchmark(mockGameEngine);
    });

    describe('Initialization', () => {
        test('should initialize with game engine', () => {
            expect(benchmark.gameEngine).toBe(mockGameEngine);
            expect(benchmark.isRunning).toBe(false);
            expect(benchmark.tests.size).toBeGreaterThan(0);
        });

        test('should have default tests', () => {
            expect(benchmark.tests.has('frameRate')).toBe(true);
            expect(benchmark.tests.has('memory')).toBe(true);
            expect(benchmark.tests.has('rendering')).toBe(true);
            expect(benchmark.tests.has('physics')).toBe(true);
            expect(benchmark.tests.has('objectLifecycle')).toBe(true);
        });
    });

    describe('Custom Test Management', () => {
        test('should add custom test', () => {
            const testFn = jest.fn(() => Promise.resolve({ result: 'test' }));
            const options = {
                duration: 1000,
                warmup: 500,
                description: 'Custom test'
            };

            benchmark.addTest('custom', testFn, options);

            expect(benchmark.tests.has('custom')).toBe(true);
            const test = benchmark.tests.get('custom');
            expect(test.fn).toBe(testFn);
            expect(test.duration).toBe(1000);
            expect(test.warmup).toBe(500);
            expect(test.description).toBe('Custom test');
        });

        test('should use default options for custom test', () => {
            const testFn = jest.fn(() => Promise.resolve({}));
            benchmark.addTest('custom', testFn);

            const test = benchmark.tests.get('custom');
            expect(test.duration).toBe(5000);
            expect(test.warmup).toBe(1000);
            expect(test.description).toBe('custom');
        });
    });

    describe('Individual Benchmark Execution', () => {
        test('should run specific benchmark', async () => {
            const testFn = jest.fn(() => Promise.resolve({ score: 100 }));
            benchmark.addTest('test', testFn, { warmup: 0 });

            const result = await benchmark.runBenchmark('test');

            expect(testFn).toHaveBeenCalled();
            expect(result.score).toBe(100);
            expect(result.testDuration).toBeDefined();
        });

        test('should throw error for non-existent benchmark', async () => {
            await expect(benchmark.runBenchmark('nonexistent'))
                .rejects.toThrow("Benchmark 'nonexistent' not found");
        });

        test('should include warmup time in test execution', async () => {
            const testFn = jest.fn(() => Promise.resolve({}));
            benchmark.addTest('test', testFn, { warmup: 100 });

            const startTime = performance.now();
            await benchmark.runBenchmark('test');
            const endTime = performance.now();

            expect(endTime - startTime).toBeGreaterThanOrEqual(100);
        });
    });

    describe('Frame Rate Analysis', () => {
        test('should analyze frame rate data correctly', () => {
            const frameRates = [58, 59, 60, 61, 62, 58, 59, 60];
            const result = benchmark._analyzeFrameRates(frameRates);

            expect(result.average).toBeCloseTo(59.625, 1);
            expect(result.minimum).toBe(58);
            expect(result.maximum).toBe(62);
            expect(result.samples).toBe(8);
            expect(result.stability).toBeGreaterThan(0);
        });

        test('should handle empty frame rate data', () => {
            const result = benchmark._analyzeFrameRates([]);
            expect(result.error).toBe('No frame rate data');
        });

        test('should calculate percentiles correctly', () => {
            const frameRates = Array.from({ length: 100 }, (_, i) => i + 1); // 1-100
            const result = benchmark._analyzeFrameRates(frameRates);

            expect(result.percentile95).toBe(96); // Math.floor(100 * 0.95) = 95, so index 95 = value 96
            expect(result.percentile99).toBe(100); // Math.floor(100 * 0.99) = 99, so index 99 = value 100
            expect(result.median).toBe(51); // Math.floor(100 / 2) = 50, so index 50 = value 51
        });
    });

    describe('Memory Analysis', () => {
        test('should analyze memory usage data', () => {
            const measurements = [
                { used: 50 * 1048576, total: 100 * 1048576 },
                { used: 55 * 1048576, total: 100 * 1048576 },
                { used: 60 * 1048576, total: 100 * 1048576 }
            ];

            const result = benchmark._analyzeMemoryUsage(measurements);

            expect(result.averageUsed).toBeCloseTo(55, 1);
            expect(result.maximumUsed).toBe(60);
            expect(result.minimumUsed).toBe(50);
            expect(result.growthRate).toBe(20); // (60-50)/50 * 100
            expect(result.samples).toBe(3);
        });

        test('should handle empty memory data', () => {
            const result = benchmark._analyzeMemoryUsage([]);
            expect(result.error).toBe('No memory data');
        });
    });

    describe('Render Time Analysis', () => {
        test('should analyze render times', () => {
            const renderTimes = [16, 17, 15, 16, 18]; // ~60 FPS
            const result = benchmark._analyzeRenderTimes(renderTimes);

            expect(result.averageTime).toBeCloseTo(16.4, 1);
            expect(result.maximumTime).toBe(18);
            expect(result.minimumTime).toBe(15);
            expect(result.framesPerSecond).toBeCloseTo(61, 0);
            expect(result.samples).toBe(5);
        });
    });

    describe('Physics Time Analysis', () => {
        test('should analyze physics step times', () => {
            const stepTimes = [1, 2, 1.5, 1.8, 1.2];
            const result = benchmark._analyzePhysicsTimes(stepTimes);

            expect(result.averageStepTime).toBeCloseTo(1.5, 1);
            expect(result.maximumStepTime).toBe(2);
            expect(result.minimumStepTime).toBe(1);
            expect(result.samples).toBe(5);
        });
    });

    describe('Performance Summary', () => {
        test('should generate performance summary', () => {
            const results = {
                frameRate: { average: 58, error: null },
                memory: { growthRate: 8, error: null },
                rendering: { framesPerSecond: 90, error: null },
                physics: { stepsPerSecond: 150, error: null }
            };

            const summary = benchmark._generateSummary(results);

            expect(summary.overallScore).toBeGreaterThan(0);
            expect(summary.recommendations).toBeDefined();
            expect(summary.issues).toBeDefined();
        });

        test('should identify performance issues', () => {
            const results = {
                frameRate: { average: 25, error: null }, // Low FPS
                memory: { growthRate: 20, error: null } // High memory growth
            };

            const summary = benchmark._generateSummary(results);

            expect(summary.issues.length).toBeGreaterThan(0);
            expect(summary.issues.some(issue => 
                issue.includes('frame rate')
            )).toBe(true);
        });

        test('should provide recommendations', () => {
            const results = {
                frameRate: { average: 48, error: null }, // Slightly low FPS
                rendering: { framesPerSecond: 55, error: null } // Could be better
            };

            const summary = benchmark._generateSummary(results);

            expect(summary.recommendations.length).toBeGreaterThan(0);
        });
    });

    describe('System Information', () => {
        test('should get system information', () => {
            // Mock navigator
            Object.defineProperty(navigator, 'userAgent', {
                value: 'Test Browser',
                configurable: true
            });
            Object.defineProperty(navigator, 'platform', {
                value: 'Test Platform',
                configurable: true
            });
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                value: 8,
                configurable: true
            });

            const info = benchmark._getSystemInfo();

            expect(info.userAgent).toBe('Test Browser');
            expect(info.platform).toBe('Test Platform');
            expect(info.hardwareConcurrency).toBe(8);
            expect(info.screen).toBeDefined();
        });
    });

    describe('Report Generation', () => {
        test('should generate comprehensive report', () => {
            benchmark.results.set('test', { score: 100 });

            const report = benchmark.generateReport();

            expect(report.timestamp).toBeDefined();
            expect(report.system).toBeDefined();
            expect(report.benchmarks).toBeDefined();
            expect(report.summary).toBeDefined();
            expect(report.benchmarks.test).toEqual({ score: 100 });
        });
    });

    describe('Results Management', () => {
        test('should get benchmark results', () => {
            benchmark.results.set('test1', { score: 100 });
            benchmark.results.set('test2', { score: 200 });

            const results = benchmark.getResults();

            expect(results.test1).toEqual({ score: 100 });
            expect(results.test2).toEqual({ score: 200 });
        });

        test('should return empty results when none exist', () => {
            const results = benchmark.getResults();
            expect(Object.keys(results)).toHaveLength(0);
        });
    });

    describe('Concurrent Execution', () => {
        test('should prevent concurrent benchmark runs', async () => {
            benchmark.isRunning = true;
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

            const result = await benchmark.runAllBenchmarks();

            expect(consoleSpy).toHaveBeenCalledWith('Benchmarks already running');
            expect(result).toBeUndefined();
            consoleSpy.mockRestore();
        });

        test('should reset running state after completion', async () => {
            // Mock all tests to resolve quickly
            benchmark.tests.clear();
            benchmark.addTest('quick', () => Promise.resolve({ result: 'done' }), { warmup: 0 });

            await benchmark.runAllBenchmarks();

            expect(benchmark.isRunning).toBe(false);
        });
    });
});