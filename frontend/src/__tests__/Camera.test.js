/**
 * Unit tests for Camera system
 * Tests camera movement, coordinate conversion, and rendering transformations
 */

import Camera from '../engine/Camera.js';

// Mock canvas
const mockCanvas = {
  width: 1200,
  height: 800
};

// Mock rendering context
const mockCtx = {
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  fillText: jest.fn(),
  fillStyle: '#000000',
  font: '12px "Courier New", monospace',
  textAlign: 'left'
};

describe('Camera', () => {
  let camera;
  
  beforeEach(() => {
    camera = new Camera(mockCanvas);
    jest.clearAllMocks();
  });
  
  describe('Constructor', () => {
    test('should initialize with default values', () => {
      expect(camera.canvas).toBe(mockCanvas);
      expect(camera.x).toBe(0);
      expect(camera.y).toBe(0);
      expect(camera.zoom).toBe(1.0);
      expect(camera.targetZoom).toBe(1.0);
      expect(camera.followTarget).toBeNull();
      expect(camera.smoothing).toBe(0.1);
      expect(camera.zoomSmoothness).toBe(0.05);
    });
    
    test('should set zoom bounds', () => {
      expect(camera.minZoom).toBe(0.5);
      expect(camera.maxZoom).toBe(2.0);
      expect(camera.airborneZoom).toBe(0.8);
      expect(camera.groundZoom).toBe(1.0);
    });
    
    test('should initialize shake properties', () => {
      expect(camera.shakeIntensity).toBe(0);
      expect(camera.shakeDuration).toBe(0);
      expect(camera.shakeX).toBe(0);
      expect(camera.shakeY).toBe(0);
    });
  });
  
  describe('Vehicle Following', () => {
    let mockVehicle;
    
    beforeEach(() => {
      mockVehicle = {
        position: { x: 1000, y: 400 },
        isAirborne: false
      };
    });
    
    test('should set follow target', () => {
      camera.followVehicle(mockVehicle);
      
      expect(camera.followTarget).toBe(mockVehicle);
    });
    
    test('should update camera position to follow vehicle', () => {
      camera.followVehicle(mockVehicle);
      
      // Update multiple times to simulate smooth following
      for (let i = 0; i < 100; i++) {
        camera.update(16);
      }
      
      // Camera should move towards vehicle position (with offset)
      const expectedX = mockVehicle.position.x + camera.offsetX - mockCanvas.width / 2;
      
      expect(camera.x).toBeCloseTo(expectedX, 1);
      // Y position is constrained, so just check it's within bounds
      expect(camera.y).toBeGreaterThanOrEqual(-100);
      expect(camera.y).toBeLessThanOrEqual(200);
    });
    
    test('should adjust zoom when vehicle is airborne', () => {
      mockVehicle.isAirborne = true;
      camera.followVehicle(mockVehicle);
      
      camera.update(16);
      
      expect(camera.targetZoom).toBe(camera.airborneZoom);
    });
    
    test('should adjust zoom when vehicle is on ground', () => {
      mockVehicle.isAirborne = false;
      camera.followVehicle(mockVehicle);
      
      camera.update(16);
      
      expect(camera.targetZoom).toBe(camera.groundZoom);
    });
    
    test('should constrain camera Y position', () => {
      mockVehicle.position.y = -1000; // Very high position
      camera.followVehicle(mockVehicle);
      
      // Update multiple times to reach target
      for (let i = 0; i < 100; i++) {
        camera.update(16);
      }
      
      expect(camera.y).toBeGreaterThanOrEqual(-100); // maxY constraint
    });
  });
  
  describe('Zoom Control', () => {
    test('should smoothly transition zoom', () => {
      camera.targetZoom = 1.5;
      const initialZoom = camera.zoom;
      
      camera.update(16);
      
      expect(camera.zoom).toBeGreaterThan(initialZoom);
      expect(camera.zoom).toBeLessThan(camera.targetZoom);
    });
    
    test('should clamp zoom to bounds', () => {
      camera.targetZoom = 3.0; // Above max
      
      for (let i = 0; i < 100; i++) {
        camera.update(16);
      }
      
      expect(camera.zoom).toBeLessThanOrEqual(camera.maxZoom);
    });
    
    test('should clamp zoom to minimum', () => {
      camera.targetZoom = 0.1; // Below min
      
      for (let i = 0; i < 100; i++) {
        camera.update(16);
      }
      
      expect(camera.zoom).toBeGreaterThanOrEqual(camera.minZoom);
    });
    
    test('should set zoom directly', () => {
      camera.setZoom(1.5);
      
      expect(camera.zoom).toBe(1.5);
      expect(camera.targetZoom).toBe(1.5);
    });
    
    test('should clamp direct zoom setting', () => {
      camera.setZoom(3.0);
      
      expect(camera.zoom).toBe(camera.maxZoom);
    });
  });
  
  describe('Coordinate Conversion', () => {
    beforeEach(() => {
      camera.x = 100;
      camera.y = 50;
      camera.zoom = 1.0;
    });
    
    test('should convert world to screen coordinates', () => {
      const worldPos = { x: 200, y: 100 };
      const screenPos = camera.worldToScreen(worldPos.x, worldPos.y);
      
      expect(screenPos.x).toBe((worldPos.x - camera.x) * camera.zoom);
      expect(screenPos.y).toBe((worldPos.y - camera.y) * camera.zoom);
    });
    
    test('should convert screen to world coordinates', () => {
      const screenPos = { x: 300, y: 200 };
      const worldPos = camera.screenToWorld(screenPos.x, screenPos.y);
      
      expect(worldPos.x).toBe((screenPos.x / camera.zoom) + camera.x);
      expect(worldPos.y).toBe((screenPos.y / camera.zoom) + camera.y);
    });
    
    test('should handle zoom in coordinate conversion', () => {
      camera.zoom = 2.0;
      const worldPos = { x: 200, y: 100 };
      const screenPos = camera.worldToScreen(worldPos.x, worldPos.y);
      
      expect(screenPos.x).toBe((worldPos.x - camera.x) * 2.0);
      expect(screenPos.y).toBe((worldPos.y - camera.y) * 2.0);
    });
    
    test('should handle shake in coordinate conversion', () => {
      camera.shakeX = 5;
      camera.shakeY = 3;
      
      const worldPos = { x: 200, y: 100 };
      const screenPos = camera.worldToScreen(worldPos.x, worldPos.y);
      
      expect(screenPos.x).toBe((worldPos.x - camera.x + camera.shakeX) * camera.zoom);
      expect(screenPos.y).toBe((worldPos.y - camera.y + camera.shakeY) * camera.zoom);
    });
    
    test('should maintain coordinate conversion consistency', () => {
      const originalWorld = { x: 500, y: 300 };
      const screen = camera.worldToScreen(originalWorld.x, originalWorld.y);
      const backToWorld = camera.screenToWorld(screen.x, screen.y);
      
      expect(backToWorld.x).toBeCloseTo(originalWorld.x, 5);
      expect(backToWorld.y).toBeCloseTo(originalWorld.y, 5);
    });
  });
  
  describe('Visibility Testing', () => {
    beforeEach(() => {
      camera.x = 0;
      camera.y = 0;
      camera.zoom = 1.0;
    });
    
    test('should detect visible positions', () => {
      const visiblePos = { x: 600, y: 400 }; // Center of screen
      
      expect(camera.isVisible(visiblePos.x, visiblePos.y)).toBe(true);
    });
    
    test('should detect invisible positions', () => {
      const invisiblePos = { x: -500, y: -500 }; // Far off screen
      
      expect(camera.isVisible(invisiblePos.x, invisiblePos.y)).toBe(false);
    });
    
    test('should use margin in visibility testing', () => {
      const marginPos = { x: -50, y: -50 }; // Just outside screen
      
      expect(camera.isVisible(marginPos.x, marginPos.y, 100)).toBe(true);
      expect(camera.isVisible(marginPos.x, marginPos.y, 10)).toBe(false);
    });
    
    test('should detect visible rectangles', () => {
      const rect = { x: 500, y: 300, width: 100, height: 50 };
      
      expect(camera.isRectVisible(rect.x, rect.y, rect.width, rect.height)).toBe(true);
    });
    
    test('should detect invisible rectangles', () => {
      const rect = { x: -200, y: -200, width: 50, height: 50 };
      
      expect(camera.isRectVisible(rect.x, rect.y, rect.width, rect.height)).toBe(false);
    });
    
    test('should detect partially visible rectangles', () => {
      const rect = { x: 1150, y: 750, width: 100, height: 100 }; // Partially off-screen
      
      expect(camera.isRectVisible(rect.x, rect.y, rect.width, rect.height)).toBe(true);
    });
  });
  
  describe('View Bounds', () => {
    test('should calculate correct view bounds', () => {
      camera.x = 100;
      camera.y = 50;
      camera.zoom = 1.0;
      
      const bounds = camera.getViewBounds();
      
      expect(bounds.left).toBe(100);
      expect(bounds.top).toBe(50);
      expect(bounds.right).toBe(100 + mockCanvas.width);
      expect(bounds.bottom).toBe(50 + mockCanvas.height);
      expect(bounds.width).toBe(mockCanvas.width);
      expect(bounds.height).toBe(mockCanvas.height);
    });
    
    test('should adjust view bounds for zoom', () => {
      camera.x = 0;
      camera.y = 0;
      camera.zoom = 2.0;
      
      const bounds = camera.getViewBounds();
      
      expect(bounds.width).toBe(mockCanvas.width / 2.0);
      expect(bounds.height).toBe(mockCanvas.height / 2.0);
    });
  });
  
  describe('Screen Shake', () => {
    test('should trigger shake effect', () => {
      camera.shake(15, 500);
      
      expect(camera.shakeIntensity).toBe(15);
      expect(camera.shakeDuration).toBe(500);
    });
    
    test('should update shake over time', () => {
      camera.shake(10, 100);
      const initialDuration = camera.shakeDuration;
      
      camera.update(50);
      
      expect(camera.shakeDuration).toBeLessThan(initialDuration);
      expect(camera.shakeX).not.toBe(0);
      expect(camera.shakeY).not.toBe(0);
    });
    
    test('should end shake after duration', () => {
      camera.shake(10, 50);
      
      camera.update(100); // More than shake duration
      
      expect(camera.shakeDuration).toBeLessThanOrEqual(0);
      expect(camera.shakeX).toBe(0);
      expect(camera.shakeY).toBe(0);
      expect(camera.shakeIntensity).toBe(0);
    });
    
    test('should maintain maximum shake intensity', () => {
      camera.shake(10, 100);
      camera.shake(5, 50); // Lower intensity
      
      expect(camera.shakeIntensity).toBe(10); // Should keep higher intensity
    });
    
    test('should extend shake duration', () => {
      camera.shake(10, 100);
      camera.shake(10, 200); // Longer duration
      
      expect(camera.shakeDuration).toBe(200); // Should use longer duration
    });
  });
  
  describe('Camera Positioning', () => {
    test('should set position directly', () => {
      camera.setPosition(500, 300);
      
      expect(camera.x).toBe(500);
      expect(camera.y).toBe(300);
    });
    
    test('should focus on position', () => {
      camera.focusOn(1000, 600, 1.5);
      
      expect(camera.x).toBe(1000 - mockCanvas.width / 2);
      expect(camera.y).toBe(600 - mockCanvas.height / 2);
      expect(camera.zoom).toBe(1.5);
      expect(camera.targetZoom).toBe(1.5);
    });
    
    test('should focus without changing zoom', () => {
      const originalZoom = camera.zoom;
      camera.focusOn(1000, 600);
      
      expect(camera.zoom).toBe(originalZoom);
    });
    
    test('should move to position smoothly', () => {
      camera.moveTo(1000, 600, 1.2);
      
      expect(camera.followTarget).toBeTruthy();
      expect(camera.followTarget.position.x).toBe(1000);
      expect(camera.followTarget.position.y).toBe(600);
      expect(camera.targetZoom).toBe(1.2);
    });
    
    test('should stop following', () => {
      const mockVehicle = { position: { x: 100, y: 100 }, isAirborne: false };
      camera.followVehicle(mockVehicle);
      
      camera.stopFollowing();
      
      expect(camera.followTarget).toBeNull();
    });
  });
  
  describe('Transform Application', () => {
    test('should apply camera transformations to context', () => {
      camera.x = 100;
      camera.y = 50;
      camera.zoom = 1.5;
      camera.shakeX = 5;
      camera.shakeY = 3;
      
      camera.applyTransform(mockCtx);
      
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.translate).toHaveBeenCalledWith(mockCanvas.width / 2, mockCanvas.height / 2);
      expect(mockCtx.scale).toHaveBeenCalledWith(1.5, 1.5);
      expect(mockCtx.translate).toHaveBeenCalledWith(-mockCanvas.width / 2, -mockCanvas.height / 2);
      expect(mockCtx.translate).toHaveBeenCalledWith(-100 + 5, -50 + 3);
    });
  });
  
  describe('Reset and Debug', () => {
    test('should reset to default state', () => {
      camera.x = 500;
      camera.y = 300;
      camera.zoom = 1.5;
      camera.targetZoom = 1.5;
      camera.followTarget = { position: { x: 0, y: 0 }, isAirborne: false };
      camera.shake(10, 100);
      
      camera.reset();
      
      expect(camera.x).toBe(0);
      expect(camera.y).toBe(0);
      expect(camera.zoom).toBe(1.0);
      expect(camera.targetZoom).toBe(1.0);
      expect(camera.followTarget).toBeNull();
      expect(camera.shakeIntensity).toBe(0);
      expect(camera.shakeDuration).toBe(0);
      expect(camera.shakeX).toBe(0);
      expect(camera.shakeY).toBe(0);
    });
    
    test('should provide debug information', () => {
      camera.x = 100;
      camera.y = 50;
      camera.zoom = 1.2;
      camera.targetZoom = 1.5;
      camera.followTarget = { position: { x: 0, y: 0 }, isAirborne: false };
      camera.shake(5, 200);
      
      const debugInfo = camera.getDebugInfo();
      
      expect(debugInfo.position.x).toBe(100);
      expect(debugInfo.position.y).toBe(50);
      expect(debugInfo.zoom).toBe(1.2);
      expect(debugInfo.targetZoom).toBe(1.5);
      expect(debugInfo.hasTarget).toBe(true);
      expect(debugInfo.shake.intensity).toBe(5);
      expect(debugInfo.shake.duration).toBe(200);
      expect(debugInfo.viewBounds).toBeTruthy();
    });
    
    test('should render debug information', () => {
      camera.renderDebug(mockCtx);
      
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.fillText).toHaveBeenCalledTimes(6); // 6 debug lines
    });
  });
  
  describe('Edge Cases', () => {
    test('should handle null follow target in update', () => {
      camera.followTarget = null;
      
      expect(() => camera.update(16)).not.toThrow();
    });
    
    test('should handle zero delta time', () => {
      const mockVehicle = { position: { x: 100, y: 100 }, isAirborne: false };
      camera.followVehicle(mockVehicle);
      
      expect(() => camera.update(0)).not.toThrow();
    });
    
    test('should handle negative coordinates', () => {
      const screenPos = camera.worldToScreen(-100, -50);
      const worldPos = camera.screenToWorld(-100, -50);
      
      expect(screenPos.x).toBe(-100);
      expect(screenPos.y).toBe(-50);
      expect(worldPos.x).toBe(-100);
      expect(worldPos.y).toBe(-50);
    });
    
    test('should handle extreme zoom values in coordinate conversion', () => {
      camera.zoom = 0.1;
      
      const worldPos = { x: 1000, y: 1000 };
      const screenPos = camera.worldToScreen(worldPos.x, worldPos.y);
      const backToWorld = camera.screenToWorld(screenPos.x, screenPos.y);
      
      expect(backToWorld.x).toBeCloseTo(worldPos.x, 1);
      expect(backToWorld.y).toBeCloseTo(worldPos.y, 1);
    });
  });
});