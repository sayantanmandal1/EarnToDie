// BULLETPROOF TEST SETUP - HANDLES ALL EDGE CASES
import '@testing-library/jest-dom';

// Mock THREE.js globally
jest.mock('three', () => require('./__mocks__/three.js'));

// Mock Audio Context completely
class MockAudioContext {
    constructor() {
        this.state = 'running';
        this.sampleRate = 44100;
        this.currentTime = 0;
        this.destination = {
            channelCount: 2,
            connect: jest.fn(),
            disconnect: jest.fn()
        };
        this.listener = {
            positionX: { value: 0, setValueAtTime: jest.fn() },
            positionY: { value: 0, setValueAtTime: jest.fn() },
            positionZ: { value: 0, setValueAtTime: jest.fn() },
            forwardX: { value: 0, setValueAtTime: jest.fn() },
            forwardY: { value: 0, setValueAtTime: jest.fn() },
            forwardZ: { value: -1, setValueAtTime: jest.fn() },
            upX: { value: 0, setValueAtTime: jest.fn() },
            upY: { value: 1, setValueAtTime: jest.fn() },
            upZ: { value: 0, setValueAtTime: jest.fn() }
        };
    }
    
    createOscillator() {
        return {
            frequency: { value: 440, setValueAtTime: jest.fn() },
            type: 'sine',
            start: jest.fn(),
            stop: jest.fn(),
            connect: jest.fn(),
            disconnect: jest.fn()
        };
    }
    
    createGain() {
        return {
            gain: { value: 1, setValueAtTime: jest.fn() },
            connect: jest.fn(),
            disconnect: jest.fn()
        };
    }
    
    createAnalyser() {
        return {
            fftSize: 2048,
            frequencyBinCount: 1024,
            getByteFrequencyData: jest.fn(),
            getByteTimeDomainData: jest.fn(),
            connect: jest.fn(),
            disconnect: jest.fn()
        };
    }
    
    createPanner() {
        return {
            panningModel: 'HRTF',
            positionX: { value: 0, setValueAtTime: jest.fn() },
            positionY: { value: 0, setValueAtTime: jest.fn() },
            positionZ: { value: 0, setValueAtTime: jest.fn() },
            connect: jest.fn(),
            disconnect: jest.fn()
        };
    }
    
    createBufferSource() {
        return {
            buffer: null,
            start: jest.fn(),
            stop: jest.fn(),
            connect: jest.fn(),
            disconnect: jest.fn()
        };
    }
    
    decodeAudioData() {
        return Promise.resolve({
            length: 44100,
            duration: 1,
            sampleRate: 44100,
            numberOfChannels: 2,
            getChannelData: jest.fn(() => new Float32Array(44100))
        });
    }
    
    resume() { return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
}

global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;

// Mock Canvas completely
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Array(4).fill(0) })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => ({ data: new Array(4).fill(0) })),
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
    measureText: jest.fn(() => ({ width: 100 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn()
}));

// Mock other Web APIs
global.ResizeObserver = jest.fn(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
}));

global.IntersectionObserver = jest.fn(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
}));

global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn();

// Mock fetch
global.fetch = jest.fn(() =>
    Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
    })
);

// Mock localStorage
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn()
};
global.localStorage = localStorageMock;
global.sessionStorage = localStorageMock;

// Mock performance
global.performance = {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => [])
};

// Mock URL
global.URL = {
    createObjectURL: jest.fn(() => 'mock-url'),
    revokeObjectURL: jest.fn()
};

// Mock crypto
global.crypto = {
    getRandomValues: jest.fn(arr => {
        for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
    }),
    randomUUID: jest.fn(() => 'mock-uuid')
};

// Suppress console noise in tests
const originalConsole = global.console;
global.console = {
    ...originalConsole,
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn()
};

console.log('✅ Bulletproof Test Setup Complete - All APIs Mocked');