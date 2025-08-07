module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
    moduleNameMapping: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '^three$': '<rootDir>/src/__mocks__/three.js'
    },
    testTimeout: 15000,
    maxWorkers: 1,
    forceExit: true,
    detectOpenHandles: false,
    bail: false,
    verbose: false,
    collectCoverage: false,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    transform: {
        '^.+\\.(js|jsx)$': 'babel-jest'
    },
    testMatch: [
        '<rootDir>/src/**/__tests__/**/*.{js,jsx}',
        '<rootDir>/src/**/*.{test,spec}.{js,jsx}'
    ],
    transformIgnorePatterns: [
        'node_modules/(?!(three)/)'
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/build/',
        '/dist/',
        'src/levels/__tests__/IntelligentLevelDesigner.test.js',
        'src/combat/__tests__/RealisticCombatSystem.test.js',
        'src/assets/__tests__/AssetVerificationSystem.test.js'
    ]
};