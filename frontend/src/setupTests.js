
// Jest DOM matchers
import '@testing-library/jest-dom';

// Ultimate AudioContext Mock
const createMockAudioContext = () => ({
    createBufferSource: jest.fn(() => ({
        buffer: null,
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        playbackRate: { setValueAtTime: jest.fn(), value: 1 },
        onended: null,
        loop: false
    })),
    createPanner: jest.fn(() => ({
        panningModel: 'HRTF',
        distanceModel: 'inverse',
        refDistance: 1,
        maxDistance: 100,
        rolloffFactor: 1,
        positionX: { setValueAtTime: jest.fn(), value: 0 },
        positionY: { setValueAtTime: jest.fn(), value: 0 },
        positionZ: { setValueAtTime: jest.fn(), value: 0 },
        orientationX: { setValueAtTime: jest.fn(), value: 0 },
        orientationY: { setValueAtTime: jest.fn(), value: 0 },
        orientationZ: { setValueAtTime: jest.fn(), value: -1 },
        connect: jest.fn()
    })),
    createGain: jest.fn(() => ({
        gain: { setValueAtTime: jest.fn(), setTargetAtTime: jest.fn(), value: 1 },
        connect: jest.fn()
    })),
    createAnalyser: jest.fn(() => ({
        fftSize: 2048,
        frequencyBinCount: 1024,
        getByteFrequencyData: jest.fn(),
        getByteTimeDomainData: jest.fn(),
        connect: jest.fn()
    })),
    createCompressor: jest.fn(() => ({
        threshold: { setValueAtTime: jest.fn(), value: -24 },
        knee: { setValueAtTime: jest.fn(), value: 30 },
        ratio: { setValueAtTime: jest.fn(), value: 12 },
        attack: { setValueAtTime: jest.fn(), value: 0.003 },
        release: { setValueAtTime: jest.fn(), value: 0.25 },
        connect: jest.fn()
    })),
    createDynamicsCompressor: jest.fn(() => ({
        threshold: { setValueAtTime: jest.fn(), value: -24 },
        knee: { setValueAtTime: jest.fn(), value: 30 },
        ratio: { setValueAtTime: jest.fn(), value: 12 },
        attack: { setValueAtTime: jest.fn(), value: 0.003 },
        release: { setValueAtTime: jest.fn(), value: 0.25 },
        connect: jest.fn()
    })),
    createConvolver: jest.fn(() => ({
        buffer: null,
        normalize: true,
        connect: jest.fn()
    })),
    createDelay: jest.fn(() => ({
        delayTime: { setValueAtTime: jest.fn(), value: 0 },
        connect: jest.fn()
    })),
    createBiquadFilter: jest.fn(() => ({
        type: 'lowpass',
        frequency: { setValueAtTime: jest.fn(), value: 350 },
        Q: { setValueAtTime: jest.fn(), value: 1 },
        gain: { setValueAtTime: jest.fn(), value: 0 },
        connect: jest.fn()
    })),
    listener: {
        positionX: { setValueAtTime: jest.fn(), value: 0 },
        positionY: { setValueAtTime: jest.fn(), value: 0 },
        positionZ: { setValueAtTime: jest.fn(), value: 0 },
        forwardX: { setValueAtTime: jest.fn(), value: 0 },
        forwardY: { setValueAtTime: jest.fn(), value: 0 },
        forwardZ: { setValueAtTime: jest.fn(), value: -1 },
        upX: { setValueAtTime: jest.fn(), value: 0 },
        upY: { setValueAtTime: jest.fn(), value: 1 },
        upZ: { setValueAtTime: jest.fn(), value: 0 }
    },
    destination: {},
    sampleRate: 44100,
    currentTime: 0,
    state: 'running',
    resume: jest.fn().mockResolvedValue(),
    suspend: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    decodeAudioData: jest.fn().mockResolvedValue({
        duration: 1,
        sampleRate: 44100,
        numberOfChannels: 2,
        length: 44100,
        getChannelData: jest.fn(() => new Float32Array(44100))
    })
});

// Mock AudioContext constructor
global.AudioContext = jest.fn(() => createMockAudioContext());
global.webkitAudioContext = jest.fn(() => createMockAudioContext());

// Mock MediaDevices
global.navigator.mediaDevices = {
    getUserMedia: jest.fn().mockResolvedValue({
        getTracks: jest.fn(() => []),
        getAudioTracks: jest.fn(() => []),
        getVideoTracks: jest.fn(() => [])
    })
};

// Mock Canvas API
HTMLCanvasElement.prototype.getContext = jest.fn((type) => {
    if (type === '2d') {
        return {
            fillRect: jest.fn(),
            clearRect: jest.fn(),
            getImageData: jest.fn(() => ({ data: new Array(4) })),
            putImageData: jest.fn(),
            createImageData: jest.fn(() => ({ data: new Array(4) })),
            setTransform: jest.fn(),
            drawImage: jest.fn(),
            save: jest.fn(),
            fillText: jest.fn(),
            restore: jest.fn(),
            beginPath: jest.fn(),
            moveTo: jest.fn(),
            lineTo: jest.fn(),
            closePath: jest.fn(),
            stroke: jest.fn(),
            translate: jest.fn(),
            scale: jest.fn(),
            rotate: jest.fn(),
            arc: jest.fn(),
            fill: jest.fn(),
            measureText: jest.fn(() => ({ width: 0 })),
            transform: jest.fn(),
            rect: jest.fn(),
            clip: jest.fn()
        };
    }
    return null;
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
}));

// Mock fetch
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        blob: () => Promise.resolve(new Blob()),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8))
    })
);

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
global.localStorage = localStorageMock;
global.sessionStorage = localStorageMock;

// Mock URL methods
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Mock Worker
global.Worker = jest.fn().mockImplementation(() => ({
    postMessage: jest.fn(),
    terminate: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
}));

// Mock performance
global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => [])
};

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// Mock window properties
Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 768 });
Object.defineProperty(window, 'devicePixelRatio', { writable: true, configurable: true, value: 1 });

// Suppress console warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
    if (args[0] && typeof args[0] === 'string' && (
        args[0].includes('THREE.') || 
        args[0].includes('WebGL') ||
        args[0].includes('AudioContext')
    )) {
        return;
    }
    originalWarn.apply(console, args);
};

// Set test timeout
jest.setTimeout(30000);
