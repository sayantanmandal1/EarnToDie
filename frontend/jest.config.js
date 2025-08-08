module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
    moduleNameMapping: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'jest-transform-stub',
        '^three$': '<rootDir>/src/__mocks__/three.js',
        '^three/(.*)$': '<rootDir>/src/__mocks__/three.js'
    },
    transform: {
        '^.+\\.(js|jsx)$': 'babel-jest'
    },
    testMatch: [
        '<rootDir>/src/**/__tests__/**/*.{js,jsx}',
        '<rootDir>/src/**/*.{test,spec}.{js,jsx}'
    ],
    testTimeout: 30000,
    verbose: false,
    silent: true,
    maxWorkers: 1,
    forceExit: true,
    detectOpenHandles: false,
    bail: false,
    collectCoverage: false,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    transformIgnorePatterns: [
        'node_modules/(?!(three)/)'
    ],
    testEnvironmentOptions: {
        url: 'http://localhost'
    }
};