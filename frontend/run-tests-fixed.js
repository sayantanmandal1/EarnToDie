#!/usr/bin/env node

/**
 * Enhanced test runner with better error handling and timeout management
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
    timeout: 30000,
    maxWorkers: 2,
    verbose: true,
    coverage: false,
    bail: false
};

// Test categories to run
const TEST_CATEGORIES = [
    'src/scoring/__tests__',
    'src/vehicles/__tests__',
    'src/zombies/__tests__',
    'src/combat/__tests__',
    'src/levels/__tests__',
    'src/audio/__tests__',
    'src/components/__tests__',
    'src/engine/__tests__',
    'src/performance/__tests__',
    'src/upgrades/__tests__',
    'src/save/__tests__',
    'src/error/__tests__',
    'src/__tests__'
];

function runTestCategory(category) {
    console.log(`\n🧪 Running tests for: ${category}`);
    
    try {
        const command = `npm test -- --testPathPattern="${category}" --testTimeout=${TEST_CONFIG.timeout} --maxWorkers=${TEST_CONFIG.maxWorkers} --verbose=${TEST_CONFIG.verbose} --coverage=${TEST_CONFIG.coverage}`;
        
        const result = execSync(command, {
            stdio: 'inherit',
            cwd: process.cwd(),
            timeout: TEST_CONFIG.timeout * 2 // Give extra time for the command itself
        });
        
        console.log(`✅ ${category} tests completed successfully`);
        return true;
    } catch (error) {
        console.error(`❌ ${category} tests failed:`, error.message);
        return false;
    }
}

function main() {
    console.log('🚀 Starting enhanced test runner...');
    console.log(`Configuration: timeout=${TEST_CONFIG.timeout}ms, workers=${TEST_CONFIG.maxWorkers}`);
    
    const results = {
        passed: [],
        failed: [],
        total: TEST_CATEGORIES.length
    };
    
    for (const category of TEST_CATEGORIES) {
        const success = runTestCategory(category);
        
        if (success) {
            results.passed.push(category);
        } else {
            results.failed.push(category);
        }
        
        // Add delay between test categories to prevent resource exhaustion
        if (category !== TEST_CATEGORIES[TEST_CATEGORIES.length - 1]) {
            console.log('⏳ Waiting 2 seconds before next category...');
            execSync('timeout 2 2>nul || sleep 2', { stdio: 'ignore' });
        }
    }
    
    // Print summary
    console.log('\n📊 Test Summary:');
    console.log(`Total categories: ${results.total}`);
    console.log(`Passed: ${results.passed.length}`);
    console.log(`Failed: ${results.failed.length}`);
    console.log(`Success rate: ${Math.round((results.passed.length / results.total) * 100)}%`);
    
    if (results.failed.length > 0) {
        console.log('\n❌ Failed categories:');
        results.failed.forEach(category => console.log(`  - ${category}`));
    }
    
    if (results.passed.length > 0) {
        console.log('\n✅ Passed categories:');
        results.passed.forEach(category => console.log(`  - ${category}`));
    }
    
    process.exit(results.failed.length > 0 ? 1 : 0);
}

if (require.main === module) {
    main();
}

module.exports = { runTestCategory, TEST_CATEGORIES };