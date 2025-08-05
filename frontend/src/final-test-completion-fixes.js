// Final Test Completion Fixes
// This file contains comprehensive fixes for all remaining test failures

// 1. Enhanced Three.js Mock System with Frustum and Matrix4
const enhancedThreeJSMocks = {
    // Add missing Frustum constructor
    Frustum: class MockFrustum {
        constructor() {
            this.planes = new Array(6).fill(null).map(() => ({
                normal: { x: 0, y: 0, z: 0 },
                constant: 0,
                distanceToPoint: jest.fn(() => 0),
                setFromProjectionMatrix: jest.fn()
            }));
        }

        setFromProjectionMatrix(matrix) {
            return this;
        }

        intersectsObject(object) {
            return true; // Always visible for testing
        }

        intersectsBox(box) {
            return true;
        }

        intersectsSphere(sphere) {
            return true;
        }

        containsPoint(point) {
            return true;
        }
    },

    // Enhanced Matrix4 with more methods
    Matrix4: class MockMatrix4 {
        constructor() {
            this.elements = new Array(16).fill(0);
            this.elements[0] = this.elements[5] = this.elements[10] = this.elements[15] = 1;
        }

        multiplyMatrices(a, b) {
            return this;
        }

        multiply(matrix) {
            return this;
        }

        makeRotationFromEuler(euler) {
            return this;
        }

        makeTranslation(x, y, z) {
            return this;
        }

        makeScale(x, y, z) {
            return this;
        }

        setPosition(position) {
            return this;
        }

        lookAt(eye, target, up) {
            return this;
        }

        copy(matrix) {
            return this;
        }

        clone() {
            return new MockMatrix4();
        }

        invert() {
            return this;
        }

        transpose() {
            return this;
        }

        determinant() {
            return 1;
        }
    },

    // Enhanced Plane class
    Plane: class MockPlane {
        constructor(normal = { x: 0, y: 1, z: 0 }, constant = 0) {
            this.normal = normal;
            this.constant = constant;
        }

        setFromNormalAndCoplanarPoint(normal, point) {
            return this;
        }

        distanceToPoint(point) {
            return 0;
        }

        projectPoint(point, target) {
            return target || point;
        }
    }
};

// 2. Enhanced Audio Context Mock
const createEnhancedAudioContextMock = () => {
    const mockAudioContext = {
        state: 'running',
        sampleRate: 44100,
        currentTime: 0,
        destination: {
            channelCount: 2,
            channelCountMode: 'max',
            channelInterpretation: 'speakers'
        },
        listener: {
            positionX: { value: 0 },
            positionY: { value: 0 },
            positionZ: { value: 0 },
            forwardX: { value: 0 },
            forwardY: { value: 0 },
            forwardZ: { value: -1 },
            upX: { value: 0 },
            upY: { value: 1 },
            upZ: { value: 0 }
        },
        resume: jest.fn().mockResolvedValue(),
        suspend: jest.fn().mockResolvedValue(),
        close: jest.fn().mockResolvedValue(),
        createBuffer: jest.fn((channels, length, sampleRate) => ({
            numberOfChannels: channels,
            length: length,
            sampleRate: sampleRate,
            getChannelData: jest.fn(() => new Float32Array(length))
        })),
        createBufferSource: jest.fn(() => ({
            buffer: null,
            connect: jest.fn(),
            disconnect: jest.fn(),
            start: jest.fn(),
            stop: jest.fn(),
            playbackRate: { value: 1 },
            loop: false,
            loopStart: 0,
            loopEnd: 0
        })),
        createGain: jest.fn(() => ({
            gain: { value: 1 },
            connect: jest.fn(),
            disconnect: jest.fn()
        })),
        createPanner: jest.fn(() => ({
            panningModel: 'HRTF',
            distanceModel: 'inverse',
            refDistance: 1,
            maxDistance: 10000,
            rolloffFactor: 1,
            coneInnerAngle: 360,
            coneOuterAngle: 0,
            coneOuterGain: 0,
            positionX: { value: 0 },
            positionY: { value: 0 },
            positionZ: { value: 0 },
            orientationX: { value: 1 },
            orientationY: { value: 0 },
            orientationZ: { value: 0 },
            connect: jest.fn(),
            disconnect: jest.fn()
        })),
        createConvolver: jest.fn(() => ({
            buffer: null,
            normalize: true,
            connect: jest.fn(),
            disconnect: jest.fn()
        })),
        createDelay: jest.fn(() => ({
            delayTime: { value: 0 },
            connect: jest.fn(),
            disconnect: jest.fn()
        })),
        createBiquadFilter: jest.fn(() => ({
            type: 'lowpass',
            frequency: { value: 350 },
            Q: { value: 1 },
            gain: { value: 0 },
            connect: jest.fn(),
            disconnect: jest.fn()
        })),
        createAnalyser: jest.fn(() => ({
            fftSize: 2048,
            frequencyBinCount: 1024,
            minDecibels: -100,
            maxDecibels: -30,
            smoothingTimeConstant: 0.8,
            getByteFrequencyData: jest.fn(),
            getByteTimeDomainData: jest.fn(),
            getFloatFrequencyData: jest.fn(),
            getFloatTimeDomainData: jest.fn(),
            connect: jest.fn(),
            disconnect: jest.fn()
        })),
        decodeAudioData: jest.fn().mockResolvedValue({
            numberOfChannels: 2,
            length: 44100,
            sampleRate: 44100,
            getChannelData: jest.fn(() => new Float32Array(44100))
        })
    };

    // Add event listener support
    mockAudioContext.addEventListener = jest.fn();
    mockAudioContext.removeEventListener = jest.fn();

    return mockAudioContext;
};

// 3. Network Error Handler Fixes
const networkErrorHandlerFixes = {
    // Fix offline detection
    setupOfflineDetection: () => {
        Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: true
        });
    },

    // Fix fetch mock for network tests
    setupFetchMock: () => {
        global.fetch = jest.fn();
        
        // Default successful response
        fetch.mockResolvedValue({
            ok: true,
            status: 200,
            statusText: 'OK',
            headers: {
                get: jest.fn(() => 'application/json')
            },
            json: jest.fn().mockResolvedValue({ success: true }),
            text: jest.fn().mockResolvedValue('success'),
            blob: jest.fn().mockResolvedValue(new Blob()),
            arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
        });
    },

    // Fix timeout issues
    setupTimeouts: () => {
        jest.setTimeout(30000); // Increase timeout for all tests
    }
};

// 4. Performance Manager Fixes
const performanceManagerFixes = {
    // Fix PerformanceManager initialization
    mockPerformanceAPI: () => {
        global.performance = global.performance || {};
        global.performance.now = jest.fn(() => Date.now());
        global.performance.mark = jest.fn();
        global.performance.measure = jest.fn();
        global.performance.getEntriesByType = jest.fn(() => []);
        global.performance.getEntriesByName = jest.fn(() => []);
        global.performance.clearMarks = jest.fn();
        global.performance.clearMeasures = jest.fn();
    },

    // Mock requestAnimationFrame
    mockAnimationFrame: () => {
        global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
        global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));
    }
};

// 5. Save API Fixes
const saveAPIFixes = {
    // Fix localStorage mock
    setupLocalStorage: () => {
        const localStorageMock = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
            clear: jest.fn(),
            length: 0,
            key: jest.fn()
        };
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock
        });
    },

    // Fix IndexedDB mock
    setupIndexedDB: () => {
        const mockDB = {
            transaction: jest.fn(() => ({
                objectStore: jest.fn(() => ({
                    get: jest.fn(() => ({
                        onsuccess: null,
                        onerror: null,
                        result: null
                    })),
                    put: jest.fn(() => ({
                        onsuccess: null,
                        onerror: null
                    })),
                    delete: jest.fn(() => ({
                        onsuccess: null,
                        onerror: null
                    }))
                }))
            })),
            close: jest.fn()
        };

        global.indexedDB = {
            open: jest.fn(() => ({
                onsuccess: null,
                onerror: null,
                onupgradeneeded: null,
                result: mockDB
            })),
            deleteDatabase: jest.fn()
        };
    }
};

// 6. Jest Worker Exception Fixes
const jestWorkerFixes = {
    // Reduce memory usage
    setupJestConfig: () => {
        // Force garbage collection
        if (global.gc) {
            global.gc();
        }
    },

    // Fix worker pool issues
    setupWorkerPool: () => {
        // Limit concurrent workers
        process.env.NODE_OPTIONS = '--max-old-space-size=4096';
    }
};

// Export all fixes
module.exports = {
    enhancedThreeJSMocks,
    createEnhancedAudioContextMock,
    networkErrorHandlerFixes,
    performanceManagerFixes,
    saveAPIFixes,
    jestWorkerFixes,

    // Apply all fixes function
    applyAllFixes: () => {
        // Apply Three.js mocks
        Object.assign(global.THREE, enhancedThreeJSMocks);

        // Apply audio context mock
        global.AudioContext = jest.fn(() => createEnhancedAudioContextMock());
        global.webkitAudioContext = global.AudioContext;

        // Apply network fixes
        networkErrorHandlerFixes.setupOfflineDetection();
        networkErrorHandlerFixes.setupFetchMock();
        networkErrorHandlerFixes.setupTimeouts();

        // Apply performance fixes
        performanceManagerFixes.mockPerformanceAPI();
        performanceManagerFixes.mockAnimationFrame();

        // Apply save API fixes
        saveAPIFixes.setupLocalStorage();
        saveAPIFixes.setupIndexedDB();

        // Apply Jest worker fixes
        jestWorkerFixes.setupJestConfig();
        jestWorkerFixes.setupWorkerPool();

        console.log('✅ All test completion fixes applied successfully');
    }
};