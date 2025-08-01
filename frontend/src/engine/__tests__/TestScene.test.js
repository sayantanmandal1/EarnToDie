import { TestScene } from '../TestScene';

// Mock Three.js and Cannon.js
jest.mock('three', () => ({
  PlaneGeometry: jest.fn(),
  BoxGeometry: jest.fn(),
  SphereGeometry: jest.fn(),
  MeshLambertMaterial: jest.fn(() => ({ side: null })),
  MeshPhongMaterial: jest.fn(() => ({ shininess: 0 })),
  Mesh: jest.fn(() => ({
    rotation: { x: 0, y: 0, z: 0 },
    position: { set: jest.fn(), copy: jest.fn() },
    quaternion: { copy: jest.fn() },
    receiveShadow: false,
    castShadow: false
  })),
  DoubleSide: 'DoubleSide'
}));

jest.mock('cannon-es', () => ({
  Plane: jest.fn(),
  Box: jest.fn(),
  Sphere: jest.fn(),
  Body: jest.fn(() => ({
    addShape: jest.fn(),
    quaternion: { setFromAxisAngle: jest.fn(), copy: jest.fn() },
    position: { set: jest.fn(), copy: jest.fn() },
    velocity: { set: jest.fn() },
    angularVelocity: { set: jest.fn() },
    applyForce: jest.fn(),
    applyImpulse: jest.fn()
  })),
  Vec3: jest.fn(function(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.length = jest.fn(() => Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z));
    return this;
  })
}));

describe('TestScene', () => {
  let mockGameEngine;
  let testScene;

  beforeEach(() => {
    // Create mock game engine
    mockGameEngine = {
      addObject: jest.fn(),
      removeObject: jest.fn(),
      camera: {
        position: { set: jest.fn() },
        lookAt: jest.fn()
      },
      inputManager: {
        isKeyDown: jest.fn(() => false),
        isKeyPressed: jest.fn(() => false)
      }
    };

    testScene = new TestScene(mockGameEngine);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with correct default values', () => {
      expect(testScene.gameEngine).toBe(mockGameEngine);
      expect(testScene.testObjects).toEqual([]);
      expect(testScene.testCube).toBeNull();
      expect(testScene.ground).toBeNull();
    });
  });

  describe('initialize', () => {
    test('should create all test scene objects', async () => {
      await testScene.initialize();
      
      expect(testScene.ground).toBeDefined();
      expect(testScene.testCube).toBeDefined();
      expect(testScene.testObjects.length).toBeGreaterThan(0);
      expect(mockGameEngine.addObject).toHaveBeenCalledTimes(3); // ground, cube, sphere
      expect(mockGameEngine.camera.position.set).toHaveBeenCalledWith(10, 10, 10);
      expect(mockGameEngine.camera.lookAt).toHaveBeenCalledWith(0, 0, 0);
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      await testScene.initialize();
    });

    test('should rotate test cube', () => {
      const deltaTime = 0.016;
      const initialRotationX = testScene.testCube.mesh.rotation.x;
      const initialRotationY = testScene.testCube.mesh.rotation.y;
      
      testScene.update(deltaTime);
      
      expect(testScene.testCube.mesh.rotation.x).toBe(initialRotationX + deltaTime);
      expect(testScene.testCube.mesh.rotation.y).toBe(initialRotationY + deltaTime * 0.5);
    });

    test('should sync physics bodies with meshes', () => {
      testScene.update(0.016);
      
      testScene.testObjects.forEach(obj => {
        if (obj.mesh && obj.body) {
          expect(obj.mesh.position.copy).toHaveBeenCalledWith(obj.body.position);
          expect(obj.mesh.quaternion.copy).toHaveBeenCalledWith(obj.body.quaternion);
        }
      });
    });

    test('should handle input for cube movement', () => {
      // Mock input states
      mockGameEngine.inputManager.isKeyDown
        .mockReturnValueOnce(true)  // FORWARD
        .mockReturnValueOnce(false) // BACKWARD
        .mockReturnValueOnce(false) // LEFT
        .mockReturnValueOnce(false); // RIGHT
      
      testScene.update(0.016);
      
      expect(testScene.testCube.body.applyForce).toHaveBeenCalled();
    });

    test('should reset cube on R key press', () => {
      mockGameEngine.inputManager.isKeyPressed.mockImplementation(key => key === 'RESET');
      
      testScene.update(0.016);
      
      expect(testScene.testCube.body.position.set).toHaveBeenCalledWith(0, 5, 0);
      expect(testScene.testCube.body.velocity.set).toHaveBeenCalledWith(0, 0, 0);
      expect(testScene.testCube.body.angularVelocity.set).toHaveBeenCalledWith(0, 0, 0);
    });

    test('should apply impulse on brake key press', () => {
      mockGameEngine.inputManager.isKeyPressed.mockImplementation(key => key === 'BRAKE');
      
      testScene.update(0.016);
      
      expect(testScene.testCube.body.applyImpulse).toHaveBeenCalled();
    });
  });

  describe('Input Handling', () => {
    beforeEach(async () => {
      await testScene.initialize();
    });

    test('should handle forward movement', () => {
      mockGameEngine.inputManager.isKeyDown.mockImplementation(key => key === 'FORWARD');
      
      testScene._handleInput();
      
      expect(testScene.testCube.body.applyForce).toHaveBeenCalled();
    });

    test('should handle backward movement', () => {
      mockGameEngine.inputManager.isKeyDown.mockImplementation(key => key === 'BACKWARD');
      
      testScene._handleInput();
      
      expect(testScene.testCube.body.applyForce).toHaveBeenCalled();
    });

    test('should handle left movement', () => {
      mockGameEngine.inputManager.isKeyDown.mockImplementation(key => key === 'LEFT');
      
      testScene._handleInput();
      
      expect(testScene.testCube.body.applyForce).toHaveBeenCalled();
    });

    test('should handle right movement', () => {
      mockGameEngine.inputManager.isKeyDown.mockImplementation(key => key === 'RIGHT');
      
      testScene._handleInput();
      
      expect(testScene.testCube.body.applyForce).toHaveBeenCalled();
    });

    test('should not apply force when no keys are pressed', () => {
      mockGameEngine.inputManager.isKeyDown.mockReturnValue(false);
      
      testScene._handleInput();
      
      expect(testScene.testCube.body.applyForce).not.toHaveBeenCalled();
    });
  });

  describe('Object Creation', () => {
    test('should create ground with correct properties', () => {
      testScene._createGround();
      
      expect(testScene.ground).toBeDefined();
      expect(testScene.ground.mesh).toBeDefined();
      expect(testScene.ground.body).toBeDefined();
      expect(mockGameEngine.addObject).toHaveBeenCalledWith(
        testScene.ground.mesh,
        testScene.ground.body
      );
    });

    test('should create test cube with correct properties', () => {
      testScene._createTestCube();
      
      expect(testScene.testCube).toBeDefined();
      expect(testScene.testCube.mesh).toBeDefined();
      expect(testScene.testCube.body).toBeDefined();
      expect(testScene.testObjects).toContain(testScene.testCube);
      expect(mockGameEngine.addObject).toHaveBeenCalledWith(
        testScene.testCube.mesh,
        testScene.testCube.body
      );
    });

    test('should create test sphere with correct properties', () => {
      testScene._createTestSphere();
      
      expect(testScene.testObjects.length).toBeGreaterThan(0);
      const sphere = testScene.testObjects[testScene.testObjects.length - 1];
      expect(sphere.mesh).toBeDefined();
      expect(sphere.body).toBeDefined();
      expect(mockGameEngine.addObject).toHaveBeenCalledWith(
        sphere.mesh,
        sphere.body
      );
    });
  });

  describe('dispose', () => {
    test('should clean up all objects', async () => {
      await testScene.initialize();
      
      const objectCount = testScene.testObjects.length;
      
      testScene.dispose();
      
      expect(mockGameEngine.removeObject).toHaveBeenCalledTimes(objectCount + 1); // +1 for ground
      expect(testScene.testObjects).toEqual([]);
      expect(testScene.testCube).toBeNull();
      expect(testScene.ground).toBeNull();
    });

    test('should handle dispose when not initialized', () => {
      expect(() => testScene.dispose()).not.toThrow();
    });
  });

  describe('Camera Setup', () => {
    test('should setup camera position correctly', () => {
      testScene._setupCamera();
      
      expect(mockGameEngine.camera.position.set).toHaveBeenCalledWith(10, 10, 10);
      expect(mockGameEngine.camera.lookAt).toHaveBeenCalledWith(0, 0, 0);
    });
  });
});