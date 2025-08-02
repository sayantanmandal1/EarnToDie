/**
 * Spatial Audio Engine Tests
 * Comprehensive tests for the advanced 3D spatial audio system
 */

import { spatialAudioEngine, SpatialAudioEngine } from '../SpatialAudioEngine.js';

// Mock Web Audio API
const mockAudioContext = {
    sampleRate: 44100,
    state: 'running',
    currentTime: 0,
    destination: { connect: jest.fn() },
    listener: {
        positionX: { value: 0 },
        positionY: { value: 0 },
        positionZ: { value: 0 },
        forwardX: { value: 0 },
        forwardY: { value: 0 },
        forwardZ: { value: -1 },
        upX: { value: 0 },
        upY: { value: 1 },
        upZ: { value: 0 },
        setPosition: jest.fn(),
        setOrientation: jest.fn(),
        setVelocity: jest.fn()
    },
    createGain: jest.fn(() => ({
        gain: { value: 1, setValueAtTime: jest.fn() },
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
        orientationX: { value: 0 },
        orientationY: { value: 0 },
        orientationZ: { value: -1 },
        connect: jest.fn(),
        disconnect: jest.fn(),
        setPosition: jest.fn(),
        setOrientation: jest.fn(),
        setVelocity: jest.fn()
    })),
    createBufferSource: jest.fn(() => ({
        buffer: null,
        onended: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn()
    })),
    createBiquadFilter: jest.fn(() => ({
        type: 'lowpass',
        frequency: { value: 22050, setValueAtTime: jest.fn() },
        Q: { value: 1 },
        connect: jest.fn(),
        disconnect: jest.fn()
    })),
    createDynamicsCompressor: jest.fn(() => ({
        threshold: { value: -24 },
        knee: { value: 30 },
        ratio: { value: 12 },
        attack: { value: 0.003 },
        release: { value: 0.25 },
        connect: jest.fn(),
        disconnect: jest.fn()
    })),
    createConvolver: jest.fn(() => ({
        buffer: null,
        connect: jest.fn(),
        disconnect: jest.fn()
    })),
    createAnalyser: jest.fn(() => ({
        fftSize: 2048,
        smoothingTimeConstant: 0.8,
        frequencyBinCount: 1024,
        connect: jest.fn(),
        disconnect: jest.fn(),
        getByteFrequencyData: jest.fn(),
        getByteTimeDomainData: jest.fn()
    })),
    createBuffer: jest.fn((channels, length, sampleRate) => ({
        numberOfChannels: channels,
        length: length,
        sampleRate: sampleRate,
        duration: length / sampleRate,
        getChannelData: jest.fn(() => new Float32Array(length))
    })),
    resume: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue()
};

// Mock audio asset integration
jest.mock('../AudioAssetIntegration.js', () => ({
    audioAssetIntegration: {
        audioContext: mockAudioContext
    }
}));

// Mock electron integration
jest.mock('../../electron/ElectronIntegration.js', () => ({
    electronIntegration: {
        getLogger: () => ({
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        })
    }
}));

describe('SpatialAudioEngine', () => {
    let engine;

    beforeEach(() => {
        jest.clearAllMocks();
        global.AudioContext = jest.fn(() => mockAudioContext);
        global.webkitAudioContext = jest.fn(() => mockAudioContext);
        
        engine = new SpatialAudioEngine();
        
        // Mock timer functions
        jest.useFakeTimers();
    });

    afterEach(() => {
        if (engine && engine.isInitialized) {
            engine.dispose();
        }
        jest.useRealTimers();
    });

    describe('Initialization', () => {
        test('should initialize successfully with all features enabled', async () => {
            await engine.initialize();
            
            expect(engine.isInitialized).toBe(true);
            expect(engine.audioContext).toBe(mockAudioContext);
            expect(engine.listener).toBe(mockAudioContext.listener);
            expect(engine.masterGain).toBeDefined();
            expect(engine.analyser).toBeDefined();
        });

        test('should initialize with custom options', async () => {
            const customEngine = new SpatialAudioEngine({