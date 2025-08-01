import { GameEngine } from '../GameEngine';

// Mock Three.js and Cannon.js
jest.mock('three', () => ({
  Scene: jest.fn(() => ({
    add: jest.fn(),
    remove: jest.fn(),
    background: null,
    fog: null
  })),
  PerspectiveCamera: jest.fn(() => ({
    position: { set: jest.fn() },
    lookAt: jest.fn(),
    aspect: 1,
    updateProjectionMatrix: jest.fn()
  })),
  WebGLRenderer: jest.fn(() => ({
    setSize: jest.fn(),
    setPixelRatio: jest.fn(),
    render: jest.fn(),
    dispose: jest.fn(),
    shadowMap: { enabled: false, type: null },
    outputColorSpace: null,
    toneMapping: null,
    toneMappingExposure: 1
  })),
  AmbientLight: jest.fn(() => ({})),
  DirectionalLight: jest.fn(() => ({
    position: { set: jest.fn() },
    castShadow: false,
    shadow: {
      mapSize: { width: 0, height: 0 },
      camera: { near: 0, far: 0, left: 0, right: 0, top: 0, bottom: 0 }
    }
  })),
  HemisphereLight: jest.fn(() => ({})),
  Color: jest.fn(),
  Fog: jest.fn(),
  PCFSoftShadowMap: 'PCFSoftShadowMap',
  SRGBColorSpace: 'SRGBColorSpace',
  ACESFilmicToneMapping: 'ACESFilmicToneMapping'
}));

jest.mock('cannon-es', () => ({
  World: jest.fn(() => ({
    gravity: { set: jest.fn() },
    broadphase: null,
    solver: { iterations: 0 },
    step: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
    addContactMaterial: jest.fn(),
    defaultContactMaterial: null
  })),
  NaiveBroadphase: jest.fn(),
  Material: jest.fn(),
  ContactMaterial: jest.fn()
}));

// Mock InputManager and AssetLoader
jest.mock('../InputManager', () => ({
  InputManager: jest.fn(() => ({
    initialize: jest.fn(),
    update: jest.fn(),
    dispose: jest.fn()
  }))
}));

jest.mock('../AssetLoader', () => ({
  AssetLoader: jest.fn(() => ({}))
}));

describe('GameEngine', () => {
  let canvas;
  let gameEngine;

  beforeEach(() => {
    // Create mock canvas
    canvas = {
      getBoundingClientRect: jest.fn(() => ({
        width: 800,
        height: 600,
        left: 0,
        top: 0
      })),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };

    // Mock window properties
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 600
    });
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      configurable: true,
      value: 1
    });

    // Mock performance.now
    global.performance = {
      now: jest.fn(() => 1000)
    };

    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));

    gameEngine = new GameEngine(canvas);
  });

  afterEach(() => {
    if (gameEngine) {
      gameEngine.dispose();
    }
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with correct default values', () => {
      expect(gameEngine.canvas).toBe(canvas);
      expect(gameEngine.scene).toBeNull();
      expect(gameEngine.camera).toBeNull();
      expect(gameEngine.renderer).toBeNull();
      expect(gameEngine.physics).toBeNull();
      expect(gameEngine.isRunning).toBe(false);
      expect(gameEngine.fixedTimeStep).toBe(1.0 / 60.0);
      expect(gameEngine.maxSubSteps).toBe(3);
    });
  });

  describe('initialize', () => {
    test('should initialize all engine components successfully', async () => {
      const result = await gameEngine.initialize();
      
      expect(result).toBe(true);
      expect(gameEngine.scene).toBeDefined();
      expect(gameEngine.camera).toBeDefined();
      expect(gameEngine.renderer).toBeDefined();
      expect(gameEngine.physics).toBeDefined();
      expect(gameEngine.inputManager).toBeDefined();
      expect(gameEngine.assetLoader).toBeDefined();
    });

    test('should handle initialization errors', async () => {
      // Mock an error in renderer creation
      const THREE = require('three');
      THREE.WebGLRenderer.mockImplementationOnce(() => {
        throw new Error('WebGL not supported');
      });

      await expect(gameEngine.initialize()).rejects.toThrow('WebGL not supported');
    });
  });

  describe('Game Loop', () => {
    beforeEach(async () => {
      await gameEngine.initialize();
    });

    test('should start and stop game loop correctly', () => {
      expect(gameEngine.isRunning).toBe(false);
      
      gameEngine.start();
      expect(gameEngine.isRunning).toBe(true);
      
      gameEngine.stop();
      expect(gameEngine.isRunning).toBe(false);
    });

    test('should call update and render methods in game loop', () => {
      const updateSpy = jest.spyOn(gameEngine, 'update');
      const renderSpy = jest.spyOn(gameEngine, 'render');
      
      gameEngine.start();
      
      // Trigger one frame
      jest.advanceTimersByTime(16);
      
      expect(updateSpy).toHaveBeenCalled();
      expect(renderSpy).toHaveBeenCalled();
      
      gameEngine.stop();
    });

    test('should call physics step with correct parameters', () => {
      gameEngine.start();
      
      // Trigger one frame
      jest.advanceTimersByTime(16);
      
      expect(gameEngine.physics.step).toHaveBeenCalledWith(
        gameEngine.fixedTimeStep,
        expect.any(Number),
        gameEngine.maxSubSteps
      );
      
      gameEngine.stop();
    });
  });

  describe('Object Management', () => {
    beforeEach(async () => {
      await gameEngine.initialize();
    });

    test('should add objects to scene and physics world', () => {
      const mockMesh = { type: 'Mesh' };
      const mockBody = { type: 'Body' };
      
      gameEngine.addObject(mockMesh, mockBody);
      
      expect(gameEngine.scene.add).toHaveBeenCalledWith(mockMesh);
      expect(gameEngine.physics.add).toHaveBeenCalledWith(mockBody);
    });

    test('should remove objects from scene and physics world', () => {
      const mockMesh = { type: 'Mesh' };
      const mockBody = { type: 'Body' };
      
      gameEngine.removeObject(mockMesh, mockBody);
      
      expect(gameEngine.scene.remove).toHaveBeenCalledWith(mockMesh);
      expect(gameEngine.physics.remove).toHaveBeenCalledWith(mockBody);
    });

    test('should handle null objects gracefully', () => {
      expect(() => {
        gameEngine.addObject(null, null);
        gameEngine.removeObject(null, null);
      }).not.toThrow();
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await gameEngine.initialize();
    });

    test('should handle window resize', () => {
      // Change window size
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      Object.defineProperty(window, 'innerHeight', { value: 768 });
      
      // Trigger resize
      gameEngine._onWindowResize();
      
      expect(gameEngine.camera.aspect).toBe(1024 / 768);
      expect(gameEngine.camera.updateProjectionMatrix).toHaveBeenCalled();
      expect(gameEngine.renderer.setSize).toHaveBeenCalledWith(1024, 768);
    });

    test('should call onResize callback when provided', () => {
      const onResizeMock = jest.fn();
      gameEngine.onResize = onResizeMock;
      
      gameEngine._onWindowResize();
      
      expect(onResizeMock).toHaveBeenCalledWith(
        window.innerWidth,
        window.innerHeight
      );
    });
  });

  describe('Callbacks', () => {
    beforeEach(async () => {
      await gameEngine.initialize();
    });

    test('should call onUpdate callback during update', () => {
      const onUpdateMock = jest.fn();
      gameEngine.onUpdate = onUpdateMock;
      
      gameEngine.update(0.016);
      
      expect(onUpdateMock).toHaveBeenCalledWith(0.016);
    });

    test('should call onRender callback during render', () => {
      const onRenderMock = jest.fn();
      gameEngine.onRender = onRenderMock;
      
      gameEngine.render();
      
      expect(onRenderMock).toHaveBeenCalled();
    });
  });

  describe('Utility Methods', () => {
    test('should return correct frame rate', () => {
      expect(gameEngine.getFrameRate()).toBe(60);
    });
  });

  describe('dispose', () => {
    test('should clean up all resources', async () => {
      await gameEngine.initialize();
      
      const stopSpy = jest.spyOn(gameEngine, 'stop');
      
      gameEngine.dispose();
      
      expect(stopSpy).toHaveBeenCalled();
      expect(gameEngine.renderer.dispose).toHaveBeenCalled();
      expect(gameEngine.inputManager.dispose).toHaveBeenCalled();
    });
  });
});