/**
 * Comprehensive test runner for all game systems
 * Orchestrates different types of tests and generates reports
 */

class TestRunner {
  constructor() {
    this.testSuites = [];
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      coverage: {},
      performance: {},
      compatibility: {}
    };
  }

  // Register test suites
  registerTestSuite(name, testFunction, options = {}) {
    this.testSuites.push({
      name,
      testFunction,
      options: {
        timeout: options.timeout || 30000,
        retries: options.retries || 0,
        parallel: options.parallel || false,
        tags: options.tags || []
      }
    });
  }

  // Run all registered test suites
  async runAllTests() {
    console.log('🚀 Starting comprehensive test suite...');
    console.log(`Running ${this.testSuites.length} test suites\n`);

    const startTime = performance.now();

    for (const suite of this.testSuites) {
      await this.runTestSuite(suite);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    this.generateReport(totalTime);
    return this.results;
  }

  // Run individual test suite
  async runTestSuite(suite) {
    console.log(`📋 Running ${suite.name}...`);
    
    const suiteStartTime = performance.now();
    let attempts = 0;
    let success = false;

    while (attempts <= suite.options.retries && !success) {
      try {
        await this.executeWithTimeout(suite.testFunction, suite.options.timeout);
        success = true;
        this.results.passed++;
        console.log(`✅ ${suite.name} - PASSED`);
      } catch (error) {
        attempts++;
        if (attempts > suite.options.retries) {
          this.results.failed++;
          console.log(`❌ ${suite.name} - FAILED`);
          console.log(`   Error: ${error.message}`);
        } else {
          console.log(`🔄 ${suite.name} - Retrying (${attempts}/${suite.options.retries})`);
        }
      }
    }

    const suiteEndTime = performance.now();
    const suiteTime = suiteEndTime - suiteStartTime;
    
    this.results.performance[suite.name] = {
      duration: suiteTime,
      success: success,
      attempts: attempts
    };

    this.results.total++;
  }

  // Execute test with timeout
  executeWithTimeout(testFunction, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Test timed out after ${timeout}ms`));
      }, timeout);

      Promise.resolve(testFunction())
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  // Generate comprehensive test report
  generateReport(totalTime) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed} ✅`);
    console.log(`Failed: ${this.results.failed} ❌`);
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(2)}%`);
    console.log(`Total Time: ${(totalTime / 1000).toFixed(2)}s`);

    console.log('\n📈 PERFORMANCE BREAKDOWN:');
    Object.entries(this.results.performance).forEach(([name, data]) => {
      const status = data.success ? '✅' : '❌';
      const duration = (data.duration / 1000).toFixed(2);
      console.log(`  ${status} ${name}: ${duration}s (${data.attempts} attempts)`);
    });

    // Generate detailed report file
    this.generateDetailedReport();
  }

  // Generate detailed HTML report
  generateDetailedReport() {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: (this.results.passed / this.results.total) * 100
      },
      performance: this.results.performance,
      compatibility: this.results.compatibility,
      coverage: this.results.coverage
    };

    // In a real implementation, this would write to a file
    console.log('\n📄 Detailed report data:', JSON.stringify(reportData, null, 2));
  }

  // Run specific test categories
  async runCategory(category) {
    const categoryTests = this.testSuites.filter(suite => 
      suite.options.tags.includes(category)
    );

    console.log(`🏷️  Running ${category} tests (${categoryTests.length} suites)...`);

    for (const suite of categoryTests) {
      await this.runTestSuite(suite);
    }
  }

  // Run performance benchmarks
  async runPerformanceBenchmarks() {
    console.log('⚡ Running performance benchmarks...');

    const benchmarks = [
      {
        name: 'Frame Rate Stability',
        test: this.benchmarkFrameRate
      },
      {
        name: 'Memory Usage',
        test: this.benchmarkMemoryUsage
      },
      {
        name: 'Load Time',
        test: this.benchmarkLoadTime
      },
      {
        name: 'Asset Loading',
        test: this.benchmarkAssetLoading
      }
    ];

    for (const benchmark of benchmarks) {
      const result = await benchmark.test();
      this.results.performance[benchmark.name] = result;
      
      const status = result.passed ? '✅' : '❌';
      console.log(`  ${status} ${benchmark.name}: ${result.value}${result.unit}`);
    }
  }

  // Benchmark frame rate stability
  async benchmarkFrameRate() {
    const frameRates = [];
    const testDuration = 1000; // 1 second
    const startTime = performance.now();

    return new Promise((resolve) => {
      const measureFrame = () => {
        const currentTime = performance.now();
        const deltaTime = currentTime - startTime;
        
        if (deltaTime < testDuration) {
          frameRates.push(1000 / (currentTime - (frameRates.length > 0 ? startTime + (deltaTime - 16) : startTime)));
          requestAnimationFrame(measureFrame);
        } else {
          const avgFrameRate = frameRates.reduce((a, b) => a + b) / frameRates.length;
          const minFrameRate = Math.min(...frameRates);
          
          resolve({
            value: avgFrameRate.toFixed(1),
            unit: ' FPS',
            min: minFrameRate.toFixed(1),
            passed: avgFrameRate >= 30 && minFrameRate >= 20
          });
        }
      };
      
      requestAnimationFrame(measureFrame);
    });
  }

  // Benchmark memory usage
  async benchmarkMemoryUsage() {
    const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    
    // Simulate memory-intensive operations
    const objects = [];
    for (let i = 0; i < 10000; i++) {
      objects.push({
        id: i,
        data: new Array(100).fill(Math.random())
      });
    }

    const peakMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    
    // Clean up
    objects.length = 0;
    
    if (global.gc) {
      global.gc();
    }

    const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024); // MB

    return {
      value: memoryIncrease.toFixed(2),
      unit: ' MB',
      peak: ((peakMemory - initialMemory) / (1024 * 1024)).toFixed(2),
      passed: memoryIncrease < 50 // Less than 50MB increase
    };
  }

  // Benchmark load time
  async benchmarkLoadTime() {
    const startTime = performance.now();
    
    // Simulate game initialization
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const endTime = performance.now();
    const loadTime = endTime - startTime;

    return {
      value: loadTime.toFixed(0),
      unit: ' ms',
      passed: loadTime < 5000 // Less than 5 seconds
    };
  }

  // Benchmark asset loading
  async benchmarkAssetLoading() {
    const startTime = performance.now();
    
    // Simulate loading multiple assets
    const assetPromises = [];
    for (let i = 0; i < 10; i++) {
      assetPromises.push(
        new Promise(resolve => setTimeout(resolve, Math.random() * 100))
      );
    }
    
    await Promise.all(assetPromises);
    
    const endTime = performance.now();
    const loadTime = endTime - startTime;

    return {
      value: loadTime.toFixed(0),
      unit: ' ms',
      passed: loadTime < 2000 // Less than 2 seconds for 10 assets
    };
  }

  // Run compatibility tests
  async runCompatibilityTests() {
    console.log('🌐 Running compatibility tests...');

    const compatibilityTests = [
      {
        name: 'WebGL Support',
        test: this.testWebGLSupport
      },
      {
        name: 'Web Audio API',
        test: this.testWebAudioSupport
      },
      {
        name: 'Local Storage',
        test: this.testLocalStorageSupport
      },
      {
        name: 'Request Animation Frame',
        test: this.testRAFSupport
      }
    ];

    for (const test of compatibilityTests) {
      const result = await test.test();
      this.results.compatibility[test.name] = result;
      
      const status = result.supported ? '✅' : '❌';
      console.log(`  ${status} ${test.name}: ${result.message}`);
    }
  }

  // Test WebGL support
  testWebGLSupport() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    return {
      supported: !!gl,
      message: gl ? 'WebGL is supported' : 'WebGL is not supported',
      version: gl ? gl.getParameter(gl.VERSION) : null
    };
  }

  // Test Web Audio API support
  testWebAudioSupport() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    
    return {
      supported: !!AudioContext,
      message: AudioContext ? 'Web Audio API is supported' : 'Web Audio API is not supported',
      context: AudioContext ? 'Available' : 'Not available'
    };
  }

  // Test Local Storage support
  testLocalStorageSupport() {
    try {
      const testKey = 'test_storage';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      
      return {
        supported: true,
        message: 'Local Storage is supported'
      };
    } catch (error) {
      return {
        supported: false,
        message: 'Local Storage is not supported'
      };
    }
  }

  // Test Request Animation Frame support
  testRAFSupport() {
    const raf = window.requestAnimationFrame || 
                window.webkitRequestAnimationFrame || 
                window.mozRequestAnimationFrame || 
                window.msRequestAnimationFrame;
    
    return {
      supported: !!raf,
      message: raf ? 'Request Animation Frame is supported' : 'Request Animation Frame is not supported'
    };
  }
}

// Export for use in test files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TestRunner;
} else {
  window.TestRunner = TestRunner;
}