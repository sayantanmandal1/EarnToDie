#!/usr/bin/env node
/**
 * Immediate Test Fix - Stop infinite loops NOW
 */
const fs = require('fs').promises;
const path = require('path');

async function immediateTestFix() {
    console.log('🚨 IMMEDIATE TEST FIX - STOPPING INFINITE LOOPS');
    
    // 1. Create ultra-safe Jest config
    const safeJestConfig = `module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
    moduleNameMapping: {
        '\\\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '^three$': '<rootDir>/src/__mocks__/three.js'
    },
    testTimeout: 5000,
    maxWorkers: 1,
    forceExit: true,
    detectOpenHandles: false,
    bail: true,
    verbose: false,
    collectCoverage: false,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true
};`;
    
    await fs.writeFile(path.join(__dirname, '..', 'jest.config.js'), safeJestConfig);
    console.log('✅ Created ultra-safe Jest config');
    
    // 2. Create minimal setupTests
    const minimalSetup = `import '@testing-library/jest-dom';

// Prevent infinite loops
jest.setTimeout(5000);

// Mock everything that could cause loops
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn();

global.AudioContext = jest.fn(() => ({
    state: 'running',
    createBuffer: jest.fn(() => ({ getChannelData: () => new Float32Array(1024) })),
    createBufferSource: jest.fn(() => ({ connect: jest.fn(), start: jest.fn(), stop: jest.fn() })),
    createGain: jest.fn(() => ({ gain: { value: 1 }, connect: jest.fn() })),
    decodeAudioData: jest.fn(() => Promise.resolve({ getChannelData: () => new Float32Array(1024) })),
    resume: jest.fn(() => Promise.resolve()),
    close: jest.fn(() => Promise.resolve())
}));

global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
}));

HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    fillRect: jest.fn(), clearRect: jest.fn(), drawImage: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Array(4).fill(0) })),
    putImageData: jest.fn(), save: jest.fn(), restore: jest.fn()
}));

global.ResizeObserver = jest.fn(() => ({
    observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn()
}));

global.localStorage = {
    getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn(), clear: jest.fn()
};

console.log('✅ Safe test environment loaded');`;
    
    await fs.writeFile(path.join(__dirname, 'setupTests.js'), minimalSetup);
    console.log('✅ Created minimal setupTests');
    
    console.log('🎯 IMMEDIATE FIX COMPLETE - Tests should now run safely!');
}

immediateTestFix().catch(console.error);