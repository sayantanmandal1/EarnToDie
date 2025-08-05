module.exports = {
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    html: '<html><body><div id="root"></div></body></html>',
    url: 'http://localhost',
    userAgent: 'node.js'
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  globals: {
    'IS_REACT_ACT_ENVIRONMENT': true
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js'
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/index.js',
    '!src/setupTests.js'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  testTimeout: 30000,
  maxWorkers: 2,
  workerIdleMemoryLimit: '512MB',
  forceExit: true,
  detectOpenHandles: true,
  bail: false,
  verbose: false
};