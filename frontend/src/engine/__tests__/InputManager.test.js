import { InputManager } from '../InputManager';

describe('InputManager', () => {
  let canvas;
  let inputManager;

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

    // Mock document
    global.document = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };
    
    // Spy on document methods
    jest.spyOn(document, 'addEventListener');
    jest.spyOn(document, 'removeEventListener');

    inputManager = new InputManager(canvas);
  });

  afterEach(() => {
    if (inputManager) {
      inputManager.dispose();
    }
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with correct default values', () => {
      expect(inputManager.canvas).toBe(canvas);
      expect(inputManager.keys).toEqual({});
      expect(inputManager.keysPressed).toEqual({});
      expect(inputManager.keysReleased).toEqual({});
      expect(inputManager.mouse.x).toBe(0);
      expect(inputManager.mouse.y).toBe(0);
      expect(inputManager.touches).toEqual([]);
    });

    test('should have correct key mappings', () => {
      expect(inputManager.keyMap.FORWARD).toContain('KeyW');
      expect(inputManager.keyMap.FORWARD).toContain('ArrowUp');
      expect(inputManager.keyMap.LEFT).toContain('KeyA');
      expect(inputManager.keyMap.RIGHT).toContain('KeyD');
      expect(inputManager.keyMap.BRAKE).toContain('Space');
    });
  });

  describe('initialize', () => {
    test('should set up event listeners', () => {
      inputManager.initialize();
      
      expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(document.addEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
      expect(canvas.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(canvas.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
      expect(canvas.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(canvas.addEventListener).toHaveBeenCalledWith('wheel', expect.any(Function));
    });
  });

  describe('Key Input', () => {
    beforeEach(() => {
      inputManager.initialize();
    });

    test('should detect key down state', () => {
      // Simulate keydown event
      inputManager._onKeyDown({ code: 'KeyW', preventDefault: jest.fn() });
      
      expect(inputManager.isKeyDown('FORWARD')).toBe(true);
      expect(inputManager.isKeyPressed('FORWARD')).toBe(true);
    });

    test('should detect key up state', () => {
      // First press the key
      inputManager._onKeyDown({ code: 'KeyW', preventDefault: jest.fn() });
      inputManager.update(); // Clear pressed state
      
      // Then release it
      inputManager._onKeyUp({ code: 'KeyW', preventDefault: jest.fn() });
      
      expect(inputManager.isKeyDown('FORWARD')).toBe(false);
      expect(inputManager.isKeyReleased('FORWARD')).toBe(true);
    });

    test('should handle multiple keys for same action', () => {
      inputManager._onKeyDown({ code: 'ArrowUp', preventDefault: jest.fn() });
      
      expect(inputManager.isKeyDown('FORWARD')).toBe(true);
    });

    test('should return false for unknown actions', () => {
      expect(inputManager.isKeyDown('UNKNOWN_ACTION')).toBe(false);
      expect(inputManager.isKeyPressed('UNKNOWN_ACTION')).toBe(false);
      expect(inputManager.isKeyReleased('UNKNOWN_ACTION')).toBe(false);
    });
  });

  describe('Mouse Input', () => {
    beforeEach(() => {
      inputManager.initialize();
    });

    test('should detect mouse button states', () => {
      const mockEvent = { button: 0, preventDefault: jest.fn() };
      
      inputManager._onMouseDown(mockEvent);
      
      expect(inputManager.isMouseDown(0)).toBe(true);
      expect(inputManager.isMousePressed(0)).toBe(true);
    });

    test('should track mouse position', () => {
      const mockEvent = {
        clientX: 400,
        clientY: 300
      };
      
      inputManager._onMouseMove(mockEvent);
      
      expect(inputManager.mouse.x).toBe(400);
      expect(inputManager.mouse.y).toBe(300);
    });

    test('should calculate mouse delta', () => {
      // Initial position
      inputManager._onMouseMove({ clientX: 100, clientY: 100 });
      inputManager.update(); // Clear delta
      
      // Move mouse
      inputManager._onMouseMove({ clientX: 150, clientY: 120 });
      
      const delta = inputManager.getMouseDelta();
      expect(delta.x).toBe(50);
      expect(delta.y).toBe(20);
    });

    test('should get normalized mouse position', () => {
      inputManager.mouse.x = 400; // Center of 800px width
      inputManager.mouse.y = 300; // Center of 600px height
      
      const normalized = inputManager.getMousePosition();
      expect(normalized.x).toBe(0); // Center should be 0
      expect(normalized.y).toBe(0); // Center should be 0
    });

    test('should track mouse wheel', () => {
      const mockEvent = { deltaY: 100, preventDefault: jest.fn() };
      
      inputManager._onWheel(mockEvent);
      
      expect(inputManager.getWheelDelta()).toBe(100);
    });
  });

  describe('Movement Input', () => {
    beforeEach(() => {
      inputManager.initialize();
    });

    test('should calculate movement vector', () => {
      // Press W and D keys
      inputManager._onKeyDown({ code: 'KeyW', preventDefault: jest.fn() });
      inputManager._onKeyDown({ code: 'KeyD', preventDefault: jest.fn() });
      
      const movement = inputManager.getMovementInput();
      
      // Should be normalized diagonal movement
      expect(movement.x).toBeCloseTo(0.707, 2);
      expect(movement.y).toBeCloseTo(0.707, 2);
    });

    test('should return zero vector when no keys pressed', () => {
      const movement = inputManager.getMovementInput();
      
      expect(movement.x).toBe(0);
      expect(movement.y).toBe(0);
    });

    test('should detect brake input', () => {
      inputManager._onKeyDown({ code: 'Space', preventDefault: jest.fn() });
      
      expect(inputManager.isBraking()).toBe(true);
    });

    test('should detect boost input', () => {
      inputManager._onKeyDown({ code: 'ShiftLeft', preventDefault: jest.fn() });
      
      expect(inputManager.isBoosting()).toBe(true);
    });
  });

  describe('Touch Input', () => {
    beforeEach(() => {
      inputManager.initialize();
    });

    test('should handle touch start events', () => {
      const mockEvent = {
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: jest.fn()
      };
      
      inputManager._onTouchStart(mockEvent);
      
      expect(inputManager.touches).toHaveLength(1);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    test('should handle touch end events', () => {
      const mockEvent = {
        touches: [],
        preventDefault: jest.fn()
      };
      
      inputManager._onTouchEnd(mockEvent);
      
      expect(inputManager.touches).toHaveLength(0);
    });
  });

  describe('update', () => {
    test('should clear frame-specific states', () => {
      inputManager.keysPressed['KeyW'] = true;
      inputManager.keysReleased['KeyS'] = true;
      inputManager.mouse.buttonsPressed[0] = true;
      inputManager.mouse.buttonsReleased[0] = true;
      inputManager.mouse.deltaX = 10;
      inputManager.mouse.deltaY = 5;
      inputManager.mouse.wheel = 100;
      
      inputManager.update();
      
      expect(inputManager.keysPressed).toEqual({});
      expect(inputManager.keysReleased).toEqual({});
      expect(inputManager.mouse.buttonsPressed).toEqual({});
      expect(inputManager.mouse.buttonsReleased).toEqual({});
      expect(inputManager.mouse.deltaX).toBe(0);
      expect(inputManager.mouse.deltaY).toBe(0);
      expect(inputManager.mouse.wheel).toBe(0);
    });
  });

  describe('dispose', () => {
    test('should remove all event listeners', () => {
      inputManager.initialize();
      inputManager.dispose();
      
      expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(document.removeEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
      expect(canvas.removeEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(canvas.removeEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
      expect(canvas.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(canvas.removeEventListener).toHaveBeenCalledWith('wheel', expect.any(Function));
    });
  });

  describe('Event Prevention', () => {
    beforeEach(() => {
      inputManager.initialize();
    });

    test('should prevent default for game keys', () => {
      const mockEvent = { code: 'KeyW', preventDefault: jest.fn() };
      
      inputManager._onKeyDown(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    test('should prevent context menu', () => {
      const mockEvent = { preventDefault: jest.fn() };
      
      inputManager._onContextMenu(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });
  });
});