module.exports = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '^three$': '<rootDir>/src/__mocks__/three.js'
    },
    transform: {
        '^.+\\.(js|jsx)$': 'babel-jest'
    },
    testMatch: [
        '<rootDir>/src/**/__tests__/**/*.{js,jsx}',
        '<rootDir>/src/**/*.{test,spec}.{js,jsx}'
    ],
    collectCoverageFrom: [
        'src/**/*.{js,jsx}',
        '!src/**/*.test.{js,jsx}',
        '!src/setupTests.js',
        '!src/__mocks__/**'
    ],
    testTimeout: 60000,
    verbose: false,
    maxWorkers: 1,
    forceExit: true,
    detectOpenHandles: false,
    workerIdleMemoryLimit: '1GB'
};