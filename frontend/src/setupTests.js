import '@testing-library/jest-dom';
import { applyTestMocks } from './test-fixes.js';
const { applyComprehensiveMocks } = require('./comprehensive-test-fixes.js');
const { applyUltimateTestFixes } = require('./ultimate-test-fixes.js');
import { applyEnhancedThreeJSMocks } from './three-js-mock-fixes.js';
import { applyZombieTestFixes } from './zombies-test-fixes.js';

// Configure React Testing Library to use legacy renderer
import { configure } from '@testing-library/react';

configure({
  // Use legacy renderer to avoid React 18 createRoot issues
  legacyRoot: true,
  // Increase timeout for async operations
  asyncUtilTimeout: 5000,
  // Configure test ID attribute
  testIdAttribute: 'data-testid'
});

// Import React-specific test fixes (temporarily disabled)
// import './react-test-fixes.js';

// Mock canvas getContext to return a proper WebGL mock
const mockWebGLContext = {
  getExtension: jest.fn(() => null),
  getParameter: jest.fn(() => 'Mock GPU'),
  createBuffer: jest.fn(),
  bindBuffer: jest.fn(),
  bufferData: jest.fn(),
  createShader: jest.fn(),
  shaderSource: jest.fn(),
  compileShader: jest.fn(),
  createProgram: jest.fn(),
  attachShader: jest.fn(),
  linkProgram: jest.fn(),
  useProgram: jest.fn(),
  getAttribLocation: jest.fn(() => 0),
  getUniformLocation: jest.fn(() => {}),
  enableVertexAttribArray: jest.fn(),
  vertexAttribPointer: jest.fn(),
  uniform1f: jest.fn(),
  uniform2f: jest.fn(),
  uniform3f: jest.fn(),
  uniform4f: jest.fn(),
  uniformMatrix4fv: jest.fn(),
  drawArrays: jest.fn(),
  drawElements: jest.fn(),
  viewport: jest.fn(),
  clearColor: jest.fn(),
  clear: jest.fn(),
  enable: jest.fn(),
  disable: jest.fn(),
  blendFunc: jest.fn(),
  depthFunc: jest.fn(),
  createTexture: jest.fn(() => ({})),
  bindTexture: jest.fn(),
  texImage2D: jest.fn(),
  texParameteri: jest.fn(),
  generateMipmap: jest.fn(),
  deleteTexture: jest.fn(),
  createFramebuffer: jest.fn(() => ({})),
  bindFramebuffer: jest.fn(),
  framebufferTexture2D: jest.fn(),
  checkFramebufferStatus: jest.fn(() => 36053), // FRAMEBUFFER_COMPLETE
  deleteFramebuffer: jest.fn(),
  createRenderbuffer: jest.fn(() => ({})),
  bindRenderbuffer: jest.fn(),
  renderbufferStorage: jest.fn(),
  framebufferRenderbuffer: jest.fn(),
  deleteRenderbuffer: jest.fn(),
  readPixels: jest.fn(),
  pixelStorei: jest.fn(),
  activeTexture: jest.fn(),
  getShaderParameter: jest.fn(() => true),
  getProgramParameter: jest.fn(() => true),
  getShaderInfoLog: jest.fn(() => ''),
  getProgramInfoLog: jest.fn(() => ''),
  canvas: {
    width: 800,
    height: 600
  }
};

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = jest.fn((contextType) => {
  if (contextType === 'webgl' || contextType === 'experimental-webgl') {
    return mockWebGLContext;
  }
  if (contextType === '2d') {
    return {
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(),
      putImageData: jest.fn(),
      createImageData: jest.fn(),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      translate: jest.fn(),
      transform: jest.fn(),
      fillText: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 }))
    };
  }
  return null;
});

// Mock GameEngine for tests that need it
global.mockGameEngine = {
  scene: {
    add: jest.fn(),
    remove: jest.fn(),
    traverse: jest.fn(),
    children: []
  },
  renderer: {
    setSize: jest.fn(),
    render: jest.fn(),
    domElement: document.createElement('canvas'),
    setClearColor: jest.fn(),
    setPixelRatio: jest.fn(),
    shadowMap: {
      enabled: false,
      type: 'PCFSoftShadowMap'
    },
    dispose: jest.fn()
  },
  camera: {
    position: { set: jest.fn(), x: 0, y: 0, z: 0 },
    lookAt: jest.fn(),
    updateProjectionMatrix: jest.fn()
  },
  physics: {
    step: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
    gravity: { set: jest.fn() }
  },
  // Event emitter interface
  on: jest.fn(),
  emit: jest.fn(),
  off: jest.fn(),
  // Additional methods
  initialize: jest.fn().mockResolvedValue(),
  dispose: jest.fn(),
  update: jest.fn(),
  render: jest.fn()
};

// Mock Three.js
global.THREE = {
  Scene: jest.fn(() => ({
    add: jest.fn(),
    remove: jest.fn(),
    traverse: jest.fn(),
    children: []
  })),
  PerspectiveCamera: jest.fn(() => ({
    position: { set: jest.fn(), x: 0, y: 0, z: 0 },
    lookAt: jest.fn(),
    updateProjectionMatrix: jest.fn()
  })),
  WebGLRenderer: jest.fn(() => ({
    setSize: jest.fn(),
    render: jest.fn(),
    domElement: document.createElement('canvas'),
    setClearColor: jest.fn(),
    setPixelRatio: jest.fn(),
    shadowMap: {
      enabled: false,
      type: 'PCFSoftShadowMap'
    },
    dispose: jest.fn(),
    info: {
      render: {
        calls: 0,
        triangles: 0,
        points: 0,
        lines: 0
      },
      memory: {
        geometries: 0,
        textures: 0
      },
      programs: []
    },
    capabilities: {
      maxTextures: 16,
      maxVertexTextures: 16,
      maxTextureSize: 2048,
      maxCubemapSize: 1024
    },
    extensions: {
      get: jest.fn(() => null)
    },
    state: {
      buffers: {
        color: { setClear: jest.fn() },
        depth: { setClear: jest.fn() },
        stencil: { setClear: jest.fn() }
      }
    }
  })),
  Group: jest.fn(() => ({
    add: jest.fn(),
    remove: jest.fn(),
    position: { set: jest.fn(), x: 0, y: 0, z: 0 },
    rotation: { set: jest.fn(), x: 0, y: 0, z: 0 },
    scale: { set: jest.fn(), x: 1, y: 1, z: 1 }
  })),
  Mesh: jest.fn(() => ({
    position: { set: jest.fn(), x: 0, y: 0, z: 0 },
    rotation: { set: jest.fn(), x: 0, y: 0, z: 0 },
    scale: { set: jest.fn(), x: 1, y: 1, z: 1 },
    visible: true
  })),
  BoxGeometry: jest.fn(),
  SphereGeometry: jest.fn(),
  PlaneGeometry: jest.fn(),
  MeshBasicMaterial: jest.fn(),
  MeshLambertMaterial: jest.fn(),
  MeshPhongMaterial: jest.fn(),
  Vector3: jest.fn(() => ({
    set: jest.fn().mockReturnThis(),
    copy: jest.fn().mockReturnThis(),
    add: jest.fn().mockReturnThis(),
    subtract: jest.fn().mockReturnThis(),
    sub: jest.fn().mockReturnThis(),
    multiply: jest.fn().mockReturnThis(),
    normalize: jest.fn().mockReturnThis(),
    clone: jest.fn(() => ({
      set: jest.fn().mockReturnThis(),
      copy: jest.fn().mockReturnThis(),
      add: jest.fn().mockReturnThis(),
      subtract: jest.fn().mockReturnThis(),
      sub: jest.fn().mockReturnThis(),
      multiply: jest.fn().mockReturnThis(),
      normalize: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      x: 0,
      y: 0,
      z: 0
    })),
    distanceTo: jest.fn(() => 10),
    length: jest.fn(() => 1),
    lengthSq: jest.fn(() => 1),
    dot: jest.fn(() => 0),
    cross: jest.fn().mockReturnThis(),
    x: 0,
    y: 0,
    z: 0
  })),
  Clock: jest.fn(() => ({
    getDelta: jest.fn(() => 0.016),
    getElapsedTime: jest.fn(() => 1.0)
  })),
  DirectionalLight: jest.fn(),
  AmbientLight: jest.fn(),
  Color: jest.fn(() => ({
    r: 1,
    g: 1,
    b: 1,
    set: jest.fn().mockReturnThis(),
    setHex: jest.fn().mockReturnThis(),
    setRGB: jest.fn().mockReturnThis(),
    setHSL: jest.fn().mockReturnThis(),
    clone: jest.fn().mockReturnThis(),
    copy: jest.fn().mockReturnThis(),
    getHex: jest.fn(() => 0xffffff),
    getHexString: jest.fn(() => 'ffffff')
  })),
  Raycaster: jest.fn(() => ({
    setFromCamera: jest.fn(),
    intersectObjects: jest.fn(() => [])
  })),
  PCFSoftShadowMap: 'PCFSoftShadowMap',
  
  // Add missing Frustum constructor
  Frustum: jest.fn(function() {
    this.planes = new Array(6).fill(null).map(() => ({
      normal: { x: 0, y: 0, z: 0 },
      constant: 0,
      distanceToPoint: jest.fn(() => 0),
      setFromProjectionMatrix: jest.fn()
    }));
    
    this.setFromProjectionMatrix = jest.fn().mockReturnValue(this);
    this.intersectsObject = jest.fn(() => true);
    this.intersectsBox = jest.fn(() => true);
    this.intersectsSphere = jest.fn(() => true);
    this.containsPoint = jest.fn(() => true);
  }),

  // Enhanced Matrix4 with more methods
  Matrix4: jest.fn(function() {
    this.elements = new Array(16).fill(0);
    this.elements[0] = this.elements[5] = this.elements[10] = this.elements[15] = 1;
    
    this.multiplyMatrices = jest.fn().mockReturnValue(this);
    this.multiply = jest.fn().mockReturnValue(this);
    this.makeRotationFromEuler = jest.fn().mockReturnValue(this);
    this.makeTranslation = jest.fn().mockReturnValue(this);
    this.makeScale = jest.fn().mockReturnValue(this);
    this.setPosition = jest.fn().mockReturnValue(this);
    this.lookAt = jest.fn().mockReturnValue(this);
    this.copy = jest.fn().mockReturnValue(this);
    this.clone = jest.fn(() => new global.THREE.Matrix4());
    this.invert = jest.fn().mockReturnValue(this);
    this.transpose = jest.fn().mockReturnValue(this);
    this.determinant = jest.fn(() => 1);
  }),

  // Enhanced Plane class
  Plane: jest.fn(function(normal = { x: 0, y: 1, z: 0 }, constant = 0) {
    this.normal = normal;
    this.constant = constant;
    
    this.setFromNormalAndCoplanarPoint = jest.fn().mockReturnValue(this);
    this.distanceToPoint = jest.fn(() => 0);
    this.projectPoint = jest.fn((point, target) => target || point);
  })
};

// Mock Cannon.js
global.CANNON = {
  World: jest.fn(() => ({
    step: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
    gravity: { set: jest.fn() },
    broadphase: {},
    solver: {}
  })),
  Body: jest.fn(() => ({
    position: { set: jest.fn(), x: 0, y: 0, z: 0 },
    quaternion: { set: jest.fn(), x: 0, y: 0, z: 0, w: 1 },
    velocity: { set: jest.fn(), x: 0, y: 0, z: 0 },
    angularVelocity: { set: jest.fn(), x: 0, y: 0, z: 0 },
    mass: 1,
    material: null,
    type: 1
  })),
  Box: jest.fn(),
  Sphere: jest.fn(),
  Plane: jest.fn(),
  Vec3: jest.fn(() => ({
    set: jest.fn(),
    x: 0,
    y: 0,
    z: 0
  })),
  Material: jest.fn(),
  ContactMaterial: jest.fn(),
  NaiveBroadphase: jest.fn(),
  GSSolver: jest.fn(),
  BODY_TYPES: {
    DYNAMIC: 1,
    STATIC: 2,
    KINEMATIC: 4
  }
};

// Mock Web Audio API
global.AudioContext = jest.fn(() => ({
  currentTime: 0,
  sampleRate: 44100,
  state: 'running',
  destination: {
    connect: jest.fn(),
    disconnect: jest.fn()
  },
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    gain: { 
      value: 1,
      setValueAtTime: jest.fn(),
      setTargetAtTime: jest.fn()
    }
  })),
  createBufferSource: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    buffer: null,
    loop: false,
    playbackRate: {
      value: 1,
      setValueAtTime: jest.fn(),
      setTargetAtTime: jest.fn()
    },
    onended: null
  })),
  createPanner: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    setPosition: jest.fn(),
    setOrientation: jest.fn(),
    panningModel: 'HRTF',
    distanceModel: 'inverse'
  })),
  createBuffer: jest.fn(() => ({
    duration: 1,
    sampleRate: 44100,
    numberOfChannels: 2,
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
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock fetch
global.fetch = jest.fn();

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => [])
};

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn();

// Ensure proper JSDOM setup for React Testing Library
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    // Ensure document.body exists and is a proper DOM element
    if (!document.body || !document.body.nodeType) {
        const body = document.createElement('body');
        if (document.documentElement) {
            document.documentElement.appendChild(body);
        } else {
            // Create full document structure
            const html = document.createElement('html');
            const head = document.createElement('head');
            html.appendChild(head);
            html.appendChild(body);
            if (document.appendChild) {
                document.appendChild(html);
            }
        }
        document.body = body;
    }
    
    // Ensure document.head exists
    if (!document.head || !document.head.nodeType) {
        const head = document.createElement('head');
        if (document.documentElement && document.body) {
            document.documentElement.insertBefore(head, document.body);
        }
        document.head = head;
    }
    
    // Create a root div for React Testing Library
    let root = document.getElementById('root');
    if (!root || !root.nodeType) {
        root = document.createElement('div');
        root.id = 'root';
        if (document.body && document.body.appendChild) {
            document.body.appendChild(root);
        }
    }
    
    // Ensure the root element is properly attached
    if (root && !root.parentNode) {
        if (document.body && document.body.appendChild) {
            document.body.appendChild(root);
        }
    }
}

// Import and apply final test completion fixes
const { applyAllFixes } = require('./final-test-completion-fixes.js');

// Apply comprehensive test mocks
applyTestMocks();
applyComprehensiveMocks();
applyUltimateTestFixes();
applyEnhancedThreeJSMocks();
applyZombieTestFixes();

// Apply final completion fixes
applyAllFixes();

// Set test timeout
jest.setTimeout(60000);