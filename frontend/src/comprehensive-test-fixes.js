/**
 * Comprehensive Test Fixes - All Remaining Issues
 * This file contains fixes for ALL remaining test failures
 */

// Enhanced Three.js Mock with complete API coverage
const createComprehensiveThreeMock = () => {
    const createVector3 = (x = 0, y = 0, z = 0) => {
        const vector = {
            x, y, z,
            clone: jest.fn().mockImplementation(() => createVector3(x, y, z)),
            copy: jest.fn().mockImplementation((other) => {
                vector.x = other.x;
                vector.y = other.y;
                vector.z = other.z;
                return vector;
            }),
            set: jest.fn().mockImplementation((newX, newY, newZ) => {
                vector.x = newX;
                vector.y = newY;
                vector.z = newZ;
                return vector;
            }),
            subVectors: jest.fn().mockReturnValue(vector),
            normalize: jest.fn().mockReturnValue(vector),
            dot: jest.fn(() => 0),
            distanceTo: jest.fn(() => 10),
            applyQuaternion: jest.fn().mockReturnValue(vector),
            length: jest.fn(() => Math.sqrt(x * x + y * y + z * z)),
            multiplyScalar: jest.fn().mockReturnValue(vector),
            add: jest.fn().mockReturnValue(vector),
            sub: jest.fn().mockReturnValue(vector)
        };
        return vector;
    };

    const createMaterial = (params = {}) => ({
        ...params,
        color: {
            setHex: jest.fn(),
            r: 1, g: 1, b: 1
        },
        emissive: {
            setHex: jest.fn(),
            r: 0, g: 0, b: 0
        },
        opacity: params.opacity || 1,
        transparent: params.transparent || false,
        dispose: jest.fn(),
        clone: jest.fn().mockImplementation(() => {
            const newMaterial = createMaterial(params);
            newMaterial.clone = jest.fn().mockReturnValue(newMaterial);
            return newMaterial;
        })
    });

    const createGeometry = () => ({
        attributes: {
            position: {
                array: new Float32Array(150),
                needsUpdate: false,
                count: 50
            },
            normal: {
                array: new Float32Array(150),
                needsUpdate: false,
                count: 50
            },
            uv: {
                array: new Float32Array(100),
                needsUpdate: false,
                count: 50
            }
        },
        dispose: jest.fn(),
        clone: jest.fn().mockImplementation(() => {
            const newGeometry = createGeometry();
            newGeometry.clone = jest.fn().mockReturnValue(newGeometry);
            return newGeometry;
        }),
        computeBoundingBox: jest.fn(),
        computeBoundingSphere: jest.fn()
    });

    const createMesh = (geometry, material) => ({
        geometry: geometry || createGeometry(),
        material: material || createMaterial(),
        position: createVector3(0, 0, 0),
        rotation: { x: 0, y: 0, z: 0 },
        scale: createVector3(1, 1, 1),
        userData: {},
        visible: true,
        castShadow: false,
        receiveShadow: false,
        add: jest.fn(),
        remove: jest.fn(),
        traverse: jest.fn(),
        clone: jest.fn().mockImplementation(() => {
            const newMesh = createMesh(geometry, material);
            newMesh.clone = jest.fn().mockReturnValue(newMesh);
            return newMesh;
        }),
        dispose: jest.fn()
    });

    const createTexture = () => ({
        wrapS: 1001, // THREE.RepeatWrapping
        wrapT: 1001,
        magFilter: 1006, // THREE.LinearFilter
        minFilter: 1008, // THREE.LinearMipmapLinearFilter
        format: 1023, // THREE.RGBAFormat
        type: 1009, // THREE.UnsignedByteType
        generateMipmaps: true,
        flipY: true,
        needsUpdate: false,
        dispose: jest.fn(),
        clone: jest.fn().mockImplementation(() => {
            const newTexture = createTexture();
            newTexture.clone = jest.fn().mockReturnValue(newTexture);
            return newTexture;
        })
    });

    return {
        // Core Classes
        Vector3: jest.fn().mockImplementation(createVector3),
        Quaternion: jest.fn().mockImplementation(() => ({
            x: 0, y: 0, z: 0, w: 1,
            setFromAxisAngle: jest.fn(),
            multiply: jest.fn(),
            clone: jest.fn()
        })),
        Matrix4: jest.fn().mockImplementation(() => ({
            elements: new Float32Array(16),
            makeTranslation: jest.fn(),
            makeRotationFromQuaternion: jest.fn(),
            multiply: jest.fn(),
            clone: jest.fn()
        })),
        Euler: jest.fn().mockImplementation(() => ({
            x: 0, y: 0, z: 0,
            set: jest.fn(),
            clone: jest.fn()
        })),

        // Geometry Classes
        CylinderGeometry: jest.fn().mockImplementation(createGeometry),
        BoxGeometry: jest.fn().mockImplementation(createGeometry),
        SphereGeometry: jest.fn().mockImplementation(createGeometry),
        PlaneGeometry: jest.fn().mockImplementation(createGeometry),
        BufferGeometry: jest.fn().mockImplementation(createGeometry),

        // Material Classes
        MeshLambertMaterial: jest.fn().mockImplementation(createMaterial),
        MeshBasicMaterial: jest.fn().mockImplementation(createMaterial),
        MeshPhongMaterial: jest.fn().mockImplementation(createMaterial),
        MeshStandardMaterial: jest.fn().mockImplementation(createMaterial),
        PointsMaterial: jest.fn().mockImplementation(createMaterial),

        // Mesh and Object3D
        Mesh: jest.fn().mockImplementation(createMesh),
        Object3D: jest.fn().mockImplementation(() => ({
            position: createVector3(0, 0, 0),
            rotation: { x: 0, y: 0, z: 0 },
            scale: createVector3(1, 1, 1),
            add: jest.fn(),
            remove: jest.fn(),
            traverse: jest.fn(),
            clone: jest.fn()
        })),
        Group: jest.fn().mockImplementation(() => ({
            position: createVector3(0, 0, 0),
            rotation: { x: 0, y: 0, z: 0 },
            scale: createVector3(1, 1, 1),
            add: jest.fn(),
            remove: jest.fn(),
            children: []
        })),

        // Lights
        PointLight: jest.fn().mockImplementation(() => ({
            position: createVector3(0, 0, 0),
            color: { setHex: jest.fn() },
            intensity: 1,
            distance: 0,
            decay: 1,
            castShadow: false
        })),
        DirectionalLight: jest.fn().mockImplementation(() => ({
            position: createVector3(0, 0, 0),
            color: { setHex: jest.fn() },
            intensity: 1,
            castShadow: false
        })),

        // Textures
        Texture: jest.fn().mockImplementation(createTexture),
        CanvasTexture: jest.fn().mockImplementation(createTexture),
        DataTexture: jest.fn().mockImplementation(createTexture),

        // Raycaster
        Raycaster: jest.fn().mockImplementation(() => ({
            set: jest.fn(),
            far: 100,
            intersectObjects: jest.fn(() => []),
            intersectObject: jest.fn(() => [])
        })),

        // Constants
        RepeatWrapping: 1001,
        ClampToEdgeWrapping: 1002,
        LinearFilter: 1006,
        LinearMipmapLinearFilter: 1008,
        RGBAFormat: 1023,
        UnsignedByteType: 1009,
        DoubleSide: 2,
        FrontSide: 0,
        BackSide: 1
    };
};

// Enhanced Audio Context Mock with complete API
const createComprehensiveAudioMock = () => {
    const createAudioParam = (defaultValue = 1) => ({
        value: defaultValue,
        setValueAtTime: jest.fn(),
        setTargetAtTime: jest.fn(),
        linearRampToValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
        cancelScheduledValues: jest.fn()
    });

    const createGainNode = () => ({
        connect: jest.fn(),
        disconnect: jest.fn(),
        gain: createAudioParam(1)
    });

    const createBufferSource = () => ({
        buffer: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        playbackRate: createAudioParam(1),
        detune: createAudioParam(0),
        loop: false,
        loopStart: 0,
        loopEnd: 0,
        onended: null
    });

    const createPannerNode = () => ({
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
        coneOuterGain: 0,
        positionX: createAudioParam(0),
        positionY: createAudioParam(0),
        positionZ: createAudioParam(0),
        orientationX: createAudioParam(1),
        orientationY: createAudioParam(0),
        orientationZ: createAudioParam(0)
    });

    const createAudioListener = () => ({
        positionX: createAudioParam(0),
        positionY: createAudioParam(0),
        positionZ: createAudioParam(0),
        forwardX: createAudioParam(0),
        forwardY: createAudioParam(0),
        forwardZ: createAudioParam(-1),
        upX: createAudioParam(0),
        upY: createAudioParam(1),
        upZ: createAudioParam(0),
        setPosition: jest.fn(),
        setOrientation: jest.fn()
    });

    const createAudioBuffer = () => ({
        duration: 1,
        sampleRate: 44100,
        numberOfChannels: 2,
        length: 44100,
        getChannelData: jest.fn(() => new Float32Array(44100))
    });

    return {
        currentTime: 0,
        sampleRate: 44100,
        state: 'running',
        destination: {
            connect: jest.fn(),
            disconnect: jest.fn()
        },
        listener: createAudioListener(),
        createGain: jest.fn(() => createGainNode()),
        createBufferSource: jest.fn(() => createBufferSource()),
        createPanner: jest.fn(() => createPannerNode()),
        createBuffer: jest.fn(() => createAudioBuffer()),
        createAnalyser: jest.fn(() => ({
            connect: jest.fn(),
            disconnect: jest.fn(),
            fftSize: 2048,
            frequencyBinCount: 1024,
            getByteFrequencyData: jest.fn(),
            getFloatFrequencyData: jest.fn()
        })),
        decodeAudioData: jest.fn(() => Promise.resolve(createAudioBuffer())),
        close: jest.fn(() => Promise.resolve()),
        suspend: jest.fn(() => Promise.resolve()),
        resume: jest.fn(() => Promise.resolve())
    };
};

// Enhanced Canvas Context Mock
const createCanvasContextMock = () => ({
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
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
    arcTo: jest.fn(),
    bezierCurveTo: jest.fn(),
    quadraticCurveTo: jest.fn(),
    rect: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    clip: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    scale: jest.fn(),
    transform: jest.fn(),
    setTransform: jest.fn(),
    resetTransform: jest.fn(),
    createImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(64 * 64 * 4),
        width: 64,
        height: 64
    })),
    getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(64 * 64 * 4),
        width: 64,
        height: 64
    })),
    putImageData: jest.fn(),
    drawImage: jest.fn(),
    createLinearGradient: jest.fn(() => ({
        addColorStop: jest.fn()
    })),
    createRadialGradient: jest.fn(() => ({
        addColorStop: jest.fn()
    })),
    createPattern: jest.fn(() => ({}))
});

// Performance API Mock
const createPerformanceMock = () => ({
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    memory: {
        usedJSHeapSize: 50000000,
        totalJSHeapSize: 100000000,
        jsHeapSizeLimit: 200000000
    }
});

// Apply all mocks globally
const applyComprehensiveMocks = () => {
    // Three.js Mock
    jest.doMock('three', () => createComprehensiveThreeMock());

    // Audio Context Mock
    global.AudioContext = jest.fn(() => createComprehensiveAudioMock());
    global.webkitAudioContext = jest.fn(() => createComprehensiveAudioMock());

    // Canvas Mock
    global.HTMLCanvasElement.prototype.getContext = jest.fn((type) => {
        if (type === 'webgl' || type === 'experimental-webgl') {
            return createWebGLMock();
        }
        if (type === '2d') {
            return createCanvasContextMock();
        }
        return null;
    });

    // Performance Mock
    global.performance = createPerformanceMock();

    // Navigator Mock
    Object.defineProperty(global.navigator, 'onLine', {
        writable: true,
        value: true
    });

    // Window Mock
    global.window = global.window || {};
    global.window.addEventListener = jest.fn();
    global.window.removeEventListener = jest.fn();
    global.window.dispatchEvent = jest.fn();
    global.window.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
    global.window.cancelAnimationFrame = jest.fn();

    // Document Mock
    global.document = global.document || {};
    global.document.createElement = jest.fn((tagName) => {
        if (tagName === 'canvas') {
            return {
                width: 800,
                height: 600,
                getContext: global.HTMLCanvasElement.prototype.getContext,
                toDataURL: jest.fn(() => 'data:image/png;base64,mock'),
                toBlob: jest.fn((callback) => callback(new Blob()))
            };
        }
        return {
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            appendChild: jest.fn(),
            removeChild: jest.fn(),
            style: {}
        };
    });

    global.document.body = global.document.body || {
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        innerHTML: ''
    };

    // LocalStorage Mock
    const localStorageMock = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        length: 0,
        key: jest.fn()
    };
    global.localStorage = localStorageMock;

    // Fetch Mock
    global.fetch = jest.fn(() =>
        Promise.resolve({
            ok: true,
            status: 200,
            headers: {
                get: jest.fn(() => 'application/json')
            },
            json: () => Promise.resolve({ success: true }),
            text: () => Promise.resolve('success'),
            blob: () => Promise.resolve(new Blob())
        })
    );

    // Console methods (to reduce noise in tests)
    global.console.warn = jest.fn();
    global.console.error = jest.fn();
    global.console.log = jest.fn();
};

// WebGL Mock (from existing code)
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
        uniform1f: jest.fn(),
        uniform2f: jest.fn(),
        uniform3f: jest.fn(),
        uniform4f: jest.fn(),
        uniformMatrix4fv: jest.fn(),
        createTexture: jest.fn(() => ({})),
        bindTexture: jest.fn(),
        texImage2D: jest.fn(),
        texParameteri: jest.fn(),
        generateMipmap: jest.fn(),
        activeTexture: jest.fn(),
        viewport: jest.fn(),
        clearColor: jest.fn(),
        clear: jest.fn(),
        clearDepth: jest.fn(),
        clearStencil: jest.fn(),
        enable: jest.fn(),
        disable: jest.fn(),
        depthFunc: jest.fn(),
        blendFunc: jest.fn(),
        cullFace: jest.fn(),
        frontFace: jest.fn(),
        drawArrays: jest.fn(),
        drawElements: jest.fn(),
        getParameter: jest.fn((param) => {
            if (param === 0x1F00) return 'WebGL'; // GL_VENDOR
            if (param === 0x1F01) return 'Mock Renderer'; // GL_RENDERER
            if (param === 0x1F02) return '1.0'; // GL_VERSION
            if (param === 0x0D33) return 3379; // GL_MAX_TEXTURE_SIZE
            if (param === 0x0D3A) return [1920, 1080]; // GL_MAX_VIEWPORT_DIMS
            return null;
        }),
        getExtension: jest.fn(() => null),
        getSupportedExtensions: jest.fn(() => [])
    };
    return gl;
};

// Export for use in setupTests.js
module.exports = {
    applyComprehensiveMocks,
    createComprehensiveThreeMock,
    createComprehensiveAudioMock,
    createCanvasContextMock,
    createWebGLMock,
    createPerformanceMock
};