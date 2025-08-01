#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Running comprehensive test suite...\n');

// Test categories to run
const testCategories = [
    'src/audio/__tests__',
    'src/combat/__tests__',
    'src/components/__tests__',
    'src/engine/__tests__',
    'src/error/__tests__',
    'src/levels/__tests__',
    'src/performance/__tests__',
    'src/save/__tests__',
    'src/scoring/__tests__',
    'src/upgrades/__tests__',
    'src/vehicles/__tests__',
    'src/zombies/__tests__'
];

const results = {};
let totalPassed = 0;
let totalFailed = 0;

for (const category of testCategories) {
    console.log(`📋 Testing ${category}...`);
    
    try {
        const output = execSync(`npm test -- ${category} --watchAll=false --verbose`, {
            encoding: 'utf8',
            timeout: 60000
        });
        
        console.log(`✅ ${category} - PASSED`);
        results[category] = { status: 'PASSED', output };
        totalPassed++;
    } catch (error) {
        console.log(`❌ ${category} - FAILED`);
        results[category] = { status: 'FAILED', output: error.stdout || error.message };
        totalFailed++;
    }
}

console.log('\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`Total Categories: ${testCategories.length}`);
console.log(`Passed: ${totalPassed} ✅`);
console.log(`Failed: ${totalFailed} ❌`);
console.log(`Success Rate: ${((totalPassed / testCategories.length) * 100).toFixed(1)}%`);

// Write detailed results to file
fs.writeFileSync('test-results.json', JSON.stringify(results, null, 2));
console.log('\n📄 Detailed results written to test-results.json');

process.exit(totalFailed > 0 ? 1 : 0);