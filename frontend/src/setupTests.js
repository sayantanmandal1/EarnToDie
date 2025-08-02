import '@testing-library/jest-dom';
import { applyTestMocks } from './test-fixes.js';
const { applyComprehensiveMocks } = require('./comprehensive-test-fixes.js');
const { applyUltimateTestFixes } = require('./ultimate-test-fixes.js');

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
    set: jest.fn(),
    copy: jest.fn(),
    add: jest.fn(),
    subtract: jest.fn(),
    multiply: jest.fn(),
    normalize: jest.fn(),
    clone: jest.fn(() => ({
      sub: jest.fn().mockReturnThis(),
      normalize: jest.fn().mockReturnThis()
    })),
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
  Color: jest.fn(),
  Raycaster: jest.fn(() => ({
    setFromCamera: jest.fn(),
    intersectObjects: jest.fn(() => [])
  })),
  PCFSoftShadowMap: 'PCFSoftShadowMap'
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

// Apply comprehensive test mocks
applyTestMocks();
applyComprehensiveMocks();
applyUltimateTestFixes();

// Set test timeout
jest.setTimeout(60000);