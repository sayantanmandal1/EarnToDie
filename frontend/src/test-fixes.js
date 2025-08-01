/**
 * Comprehensive test fixes for the Zombie Car Game
 * This file contains fixes for all major test issues
 */

// Enhanced WebGL Mock
const createWebGLMock = () => {
    const gl = {
        // Constants
        VERTEX_SHADER: 35633,
        FRAGMENT_SHADER: 35632,
        COMPILE_STATUS: 35713,
        LINK_STATUS: 35714,
        DEPTH_TEST: 2929,
        BLEND: 3042,
        CULL_FACE: 2884,
        BACK: 1029,
        CCW: 2305,
        TEXTURE_2D: 3553,
        RGBA: 6408,
        UNSIGNED_BYTE: 5121,
        TEXTURE_MIN_FILTER: 10241,
        TEXTURE_MAG_FILTER: 10240,
        LINEAR: 9729,
        CLAMP_TO_EDGE: 33071,
        TEXTURE_WRAP_S: 10242,
        TEXTURE_WRAP_T: 10243,
        COLOR_BUFFER_BIT: 16384,
        DEPTH_BUFFER_BIT: 256,
        MAX_TEXTURE_SIZE: 3379,
        MAX_VIEWPORT_DIMS: 3386,
        VENDOR: 7936,
        RENDERER: 7937,
        VERSION: 7938,

        // Methods
        createShader: jest.fn(() => ({})),
        shaderSource: jest.fn(),
        compileShader: jest.fn(),
        getShaderParameter: jest.fn(() => true),
        createProgram: jest.fn(() => ({})),
        attachShader: jest.fn(),
        linkProgram: jest.fn(),
        getProgramParameter: jest.fn(() => true),
        useProgram: jest.fn(),
        createBuffer: jest.fn(() => ({})),
        bindBuffer: jest.fn(),
        bufferData: jest.fn(),
        getAttribLocation: jest.fn(() => 0),
        enableVertexAttribArray: jest.fn(),
        vertexAttribPointer: jest.fn(),
        getUniformLocation: jest.fn(() => ({})),
        uniformMatrix4fv: jest.fn(),
        uniform1f: jest.fn(),
        uniform3fv: jest.fn(),
        createTexture: jest.fn(() => ({})),
        bindTexture: jest.fn(),
        texImage2D: jest.fn(),
        texParameteri: jest.fn(),
        generateMipmap: jest.fn(),
        enable: jest.fn(),
        disable: jest.fn(),
        cullFace: jest.fn(),
        frontFace: jest.fn(),
        clearColor: jest.fn(),
        clearDepth: jest.fn(),
        clearStencil: jest.fn(), // Add missing clearStencil method
        clear: jest.fn(),
        viewport: jest.fn(),
        drawElements: jest.fn(),
        drawArrays: jest.fn(),
        getParameter: jest.fn((param) => {
            switch (param) {
                case gl.MAX_TEXTURE_SIZE: return 2048;
                case gl.MAX_VIEWPORT_DIMS: return new Int32Array([1920, 1080]);
                case gl.VENDOR: return 'Mock WebGL';
                case gl.RENDERER: return 'Mock Renderer';
                case gl.VERSION: return 'WebGL 1.0';
                case 34921: return 16; // MAX_VERTEX_ATTRIBS
                case 36347: return 256; // MAX_VERTEX_UNIFORM_VECTORS
                case 36349: return 256; // MAX_FRAGMENT_UNIFORM_VECTORS
                case 36348: return 8; // MAX_VARYING_VECTORS
                case 34076: return 4096; // MAX_CUBE_MAP_TEXTURE_SIZE
                case 34930: return 16; // MAX_TEXTURE_IMAGE_UNITS
                case 35660: return 16; // MAX_VERTEX_TEXTURE_IMAGE_UNITS
                case 35661: return 32; // MAX_COMBINED_TEXTURE_IMAGE_UNITS
                case 3408: return new Float32Array([0, 1]); // ALIASED_LINE_WIDTH_RANGE
                case 33901: return new Float32Array([0, 1]); // ALIASED_POINT_SIZE_RANGE
                case 2978: return new Int32Array([0, 0, 800, 600]); // VIEWPORT
                default: return param === 2978 ? new Int32Array([0, 0, 800, 600]) : 0;
            }
        }),
        getSupportedExtensions: jest.fn(() => ['WEBGL_depth_texture', 'OES_texture_float']),
        getExtension: jest.fn(() => ({})),
        canvas: {
            width: 800,
            height: 600,
            getContext: jest.fn(() => gl)
        }
    };
    return gl;
};

// Enhanced AudioContext Mock
const createAudioContextMock = () => {
    const mockGainNode = {
        connect: jest.fn(),
        disconnect: jest.fn(),
        gain: {
            setValueAtTime: jest.fn(),
            setTargetAtTime: jest.fn(),
            linearRampToValueAtTime: jest.fn(),
            exponentialRampToValueAtTime: jest.fn(),
            value: 1
        }
    };

    const mockBufferSource = {
        connect: jest.fn(),
        disconnect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        buffer: null,
        loop: false,
        playbackRate: {
            setValueAtTime: jest.fn(),
            setTargetAtTime: jest.fn(),
            value: 1
        },
        onended: null
    };

    const mockPannerNode = {
        connect: jest.fn(),
        disconnect: jest.fn(),
        setPosition: jest.fn(),
        setOrientation: jest.fn(),
        panningModel: 'HRTF',
        distanceModel: 'inverse',
        refDistance: 1,
        maxDistance: 10000,
        rolloffFactor: 1,
        coneInnerAngle: 360,
        coneOuterAngle: 0,
        coneOuterGain: 0
    };

    return {
        currentTime: 0,
        sampleRate: 44100,
        state: 'running',
        destination: {
            connect: jest.fn(),
            disconnect: jest.fn()
        },
        listener: {
            positionX: { setValueAtTime: jest.fn() },
            positionY: { setValueAtTime: jest.fn() },
            positionZ: { setValueAtTime: jest.fn() },
            forwardX: { setValueAtTime: jest.fn() },
            forwardY: { setValueAtTime: jest.fn() },
            forwardZ: { setValueAtTime: jest.fn() },
            upX: { setValueAtTime: jest.fn() },
            upY: { setValueAtTime: jest.fn() },
            upZ: { setValueAtTime: jest.fn() },
            setPosition: jest.fn(),
            setOrientation: jest.fn()
        },
        createGain: jest.fn(() => mockGainNode),
        createBufferSource: jest.fn(() => mockBufferSource),
        createPanner: jest.fn(() => mockPannerNode),
        createBuffer: jest.fn(() => ({
            duration: 1,
            sampleRate: 44100,
            numberOfChannels: 2,
            length: 44100,
            getChannelData: jest.fn(() => new Float32Array(44100))
        })),
        decodeAudioData: jest.fn(() => Promise.resolve({
            duration: 1,
            sampleRate: 44100,
            numberOfChannels: 2
        })),
        close: jest.fn(() => Promise.resolve()),
        suspend: jest.fn(() => Promise.resolve()),
        resume: jest.fn(() => Promise.resolve())
    };
};

// Enhanced Canvas Mock
const createCanvasMock = () => {
    const canvas = {
        width: 800,
        height: 600,
        style: {},
        getContext: jest.fn((type) => {
            if (type === 'webgl' || type === 'experimental-webgl') {
                return createWebGLMock();
            }
            return null;
        }),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        getBoundingClientRect: jest.fn(() => ({
            left: 0,
            top: 0,
            width: 800,
            height: 600
        })),
        toDataURL: jest.fn(() => 'data:image/png;base64,mock'),
        toBlob: jest.fn((callback) => callback(new Blob()))
    };
    return canvas;
};

// Mock GameEngine for tests
const createMockGameEngine = () => {
    const mockCanvas = createCanvasMock();
    const mockGL = createWebGLMock();
    
    return {
        canvas: mockCanvas,
        scene: {
            add: jest.fn(),
            remove: jest.fn(),
            traverse: jest.fn(),
            children: []
        },
        camera: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            updateProjectionMatrix: jest.fn()
        },
        renderer: {
            setSize: jest.fn(),
            setPixelRatio: jest.fn(),
            setClearColor: jest.fn(),
            render: jest.fn(),
            shadowMap: {
                enabled: false,
                type: 'PCFSoftShadowMap'
            },
            dispose: jest.fn()
        },
        physics: {
            world: {
                add: jest.fn(),
                remove: jest.fn(),
                step: jest.fn(),
                gravity: { x: 0, y: -9.82, z: 0 }
            },
            addBody: jest.fn(),
            removeBody: jest.fn()
        },
        initialize: jest.fn(() => Promise.resolve()),
        start: jest.fn(),
        stop: jest.fn(),
        dispose: jest.fn(),
        update: jest.fn(),
        render: jest.fn()
    };
};

// Apply all mocks globally
const applyTestMocks = () => {
    // Mock WebGL
    global.WebGLRenderingContext = createWebGLMock;
    global.WebGL2RenderingContext = createWebGLMock;
    
    // Mock AudioContext
    global.AudioContext = jest.fn(() => createAudioContextMock());
    global.webkitAudioContext = jest.fn(() => createAudioContextMock());
    
    // Mock Canvas
    global.HTMLCanvasElement.prototype.getContext = jest.fn((type) => {
        if (type === 'webgl' || type === 'experimental-webgl') {
            return createWebGLMock();
        }
        if (type === '2d') {
            return {
                fillStyle: '',
                strokeStyle: '',
                lineWidth: 1,
                font: '10px sans-serif',
                textAlign: 'start',
                textBaseline: 'alphabetic',
                fillRect: jest.fn(),
                strokeRect: jest.fn(),
                clearRect: jest.fn(),
                fillText: jest.fn(),
                strokeText: jest.fn(),
                measureText: jest.fn(() => ({ width: 100 })),
                beginPath: jest.fn(),
                closePath: jest.fn(),
                moveTo: jest.fn(),
                lineTo: jest.fn(),
                arc: jest.fn(),
                stroke: jest.fn(),
                fill: jest.fn(),
                save: jest.fn(),
                restore: jest.fn(),
                translate: jest.fn(),
                rotate: jest.fn(),
                scale: jest.fn(),
                setTransform: jest.fn(),
                transform: jest.fn(),
                createImageData: jest.fn(() => ({ data: new Uint8ClampedArray(64 * 64 * 4) })),
                getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(64 * 64 * 4) })),
                putImageData: jest.fn(),
                drawImage: jest.fn()
            };
        }
        return null;
    });
    
    // Mock performance
    global.performance = global.performance || {};
    global.performance.now = jest.fn(() => Date.now());
    
    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));
    global.cancelAnimationFrame = jest.fn();
    
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
    
    // Mock fetch
    global.fetch = jest.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        headers: {
            get: jest.fn(() => 'application/json')
        }
    }));
    
    // Mock navigator
    Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
    });
    
    // Mock window events
    global.addEventListener = jest.fn();
    global.removeEventListener = jest.fn();
    global.dispatchEvent = jest.fn();
    
    // Mock document
    global.document = global.document || {};
    global.document.createElement = jest.fn((tag) => {
        if (tag === 'canvas') {
            return createCanvasMock();
        }
        return {
            style: {},
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };
    });
    
    // Mock URL
    global.URL = global.URL || {};
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
};

// Export everything
export {
    createWebGLMock,
    createAudioContextMock,
    createCanvasMock,
    createMockGameEngine,
    applyTestMocks
};

// Auto-apply mocks when this file is imported
applyTestMocks();