#!/usr/bin/env node

/**
 * Comprehensive test orchestration script
 * Runs all test suites and generates detailed reports
 */

const TestRunner = require('../utils/TestRunner');

// Import test suites
const GameSystemsIntegration = require('./GameSystemsIntegration.test');
const GameplayBalanceTests = require('./GameplayBalanceTests.test');
const CrossBrowserCompatibility = require('./CrossBrowserCompatibility.test');
const PerformanceTests = require('./PerformanceTests.test');
const EndToEndWorkflows = require('./EndToEndWorkflows.test');

async function runComprehensiveTestSuite() {
  console.log('🎮 Zombie Car Game - Comprehensive Test Suite');
  console.log('='.repeat(50));
  
  const testRunner = new TestRunner();

  // Register all test suites with appropriate configurations
  testRunner.registerTestSuite(
    'Game Systems Integration',
    () => runJestTests('GameSystemsIntegration'),
    {
      timeout: 60000,
      retries: 1,
      tags: ['integration', 'core']
    }
  );

  testRunner.registerTestSuite(
    'Gameplay Balance Tests',
    () => runJestTests('GameplayBalanceTests'),
    {
      timeout: 45000,
      retries: 2,
      tags: ['balance', 'gameplay']
    }
  );

  testRunner.registerTestSuite(
    'Cross-Browser Compatibility',
    () => runJestTests('CrossBrowserCompatibility'),
    {
      timeout: 30000,
      retries: 1,
      tags: ['compatibility', 'browser']
    }
  );

  testRunner.registerTestSuite(
    'Performance Tests',
    () => runJestTests('PerformanceTests'),
    {
      timeout: 90000,
      retries: 1,
      tags: ['performance', 'optimization']
    }
  );

  testRunner.registerTestSuite(
    'End-to-End Workflows',
    () => runJestTests('EndToEndWorkflows'),
    {
      timeout: 120000,
      retries: 1,
      tags: ['e2e', 'workflows']
    }
  );

  // Run all tests
  const results = await testRunner.runAllTests();

  // Run additional specialized tests
  await testRunner.runPerformanceBenchmarks();
  await testRunner.runCompatibilityTests();

  // Generate final report
  generateFinalReport(results);

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Helper function to run Jest tests
async function runJestTests(testPattern) {
  const { execSync } = require('child_process');
  
  try {
    const command = `npx jest --testPathPattern=${testPattern} --verbose --no-coverage`;
    execSync(command, { stdio: 'pipe' });
    return { success: true };
  } catch (error) {
    throw new Error(`Jest tests failed: ${error.message}`);
  }
}

// Generate comprehensive final report
function generateFinalReport(results) {
  console.log('\n' + '='.repeat(60));
  console.log('🏆 FINAL TEST REPORT');
  console.log('='.repeat(60));

  // Overall statistics
  const successRate = (results.passed / results.total) * 100;
  const status = successRate >= 90 ? '🟢 EXCELLENT' : 
                 successRate >= 75 ? '🟡 GOOD' : 
                 successRate >= 50 ? '🟠 NEEDS IMPROVEMENT' : '🔴 CRITICAL';

  console.log(`Overall Status: ${status}`);
  console.log(`Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`Tests Passed: ${results.passed}/${results.total}`);

  // Performance summary
  console.log('\n📊 PERFORMANCE SUMMARY:');
  Object.entries(results.performance).forEach(([name, data]) => {
    if (typeof data === 'object' && data.value) {
      const status = data.passed ? '✅' : '❌';
      console.log(`  ${status} ${name}: ${data.value}${data.unit}`);
    }
  });

  // Compatibility summary
  console.log('\n🌐 COMPATIBILITY SUMMARY:');
  Object.entries(results.compatibility).forEach(([name, data]) => {
    const status = data.supported ? '✅' : '❌';
    console.log(`  ${status} ${name}: ${data.message}`);
  });

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (successRate < 90) {
    console.log('  • Review failed tests and address critical issues');
  }
  
  if (results.performance.some && !results.performance['Frame Rate Stability']?.passed) {
    console.log('  • Optimize rendering performance for better frame rates');
  }
  
  if (results.compatibility.some && !results.compatibility['WebGL Support']?.supported) {
    console.log('  • Implement WebGL fallbacks for better compatibility');
  }

  console.log('\n📄 Detailed logs and reports available in test output above');
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Zombie Car Game Test Runner

Usage: node runAllTests.js [options]

Options:
  --help, -h          Show this help message
  --category <name>   Run tests for specific category
  --performance       Run only performance tests
  --compatibility     Run only compatibility tests
  --quick             Run quick test suite (skip long-running tests)

Categories:
  integration         Game systems integration tests
  balance             Gameplay balance tests
  compatibility       Cross-browser compatibility tests
  performance         Performance and optimization tests
  e2e                 End-to-end workflow tests

Examples:
  node runAllTests.js                    # Run all tests
  node runAllTests.js --category e2e     # Run only E2E tests
  node runAllTests.js --performance      # Run only performance tests
  node runAllTests.js --quick            # Run quick test suite
  `);
  process.exit(0);
}

// Handle specific test categories
if (args.includes('--category')) {
  const categoryIndex = args.indexOf('--category');
  const category = args[categoryIndex + 1];
  
  if (category) {
    runCategoryTests(category);
  } else {
    console.error('Error: --category requires a category name');
    process.exit(1);
  }
} else if (args.includes('--performance')) {
  runPerformanceOnly();
} else if (args.includes('--compatibility')) {
  runCompatibilityOnly();
} else if (args.includes('--quick')) {
  runQuickTests();
} else {
  // Run full test suite
  runComprehensiveTestSuite().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

// Category-specific test runners
async function runCategoryTests(category) {
  console.log(`🏷️  Running ${category} tests...`);
  
  const testRunner = new TestRunner();
  await testRunner.runCategory(category);
}

async function runPerformanceOnly() {
  console.log('⚡ Running performance tests only...');
  
  const testRunner = new TestRunner();
  await testRunner.runPerformanceBenchmarks();
}

async function runCompatibilityOnly() {
  console.log('🌐 Running compatibility tests only...');
  
  const testRunner = new TestRunner();
  await testRunner.runCompatibilityTests();
}

async function runQuickTests() {
  console.log('⚡ Running quick test suite...');
  
  const testRunner = new TestRunner();
  
  // Register only quick tests
  testRunner.registerTestSuite(
    'Quick Integration Tests',
    () => runJestTests('GameSystemsIntegration'),
    {
      timeout: 30000,
      retries: 0,
      tags: ['quick', 'integration']
    }
  );

  testRunner.registerTestSuite(
    'Quick Compatibility Tests',
    () => runJestTests('CrossBrowserCompatibility'),
    {
      timeout: 15000,
      retries: 0,
      tags: ['quick', 'compatibility']
    }
  );

  await testRunner.runAllTests();
}