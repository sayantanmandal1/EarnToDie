import { VisualStyleManager } from '../VisualStyleManager.js';

// Mock canvas and context
const mockCanvas = {
  width: 800,
  height: 600
};

const mockCtx = {
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  
  createLinearGradient: jest.fn(() => ({
    addColorStop: jest.fn()
  })),
  createRadialGradient: jest.fn(() => ({
    addColorStop: jest.fn()
  })),
  
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  arc: jest.fn(),
  closePath: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  
  drawImage: jest.fn(),
  getImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(800 * 600 * 4),
    width: 800,
    height: 600
  })),
  putImageData: jest.fn()
};

// Mock document.createElement for canvas creation
global.document = {
  createElement: jest.fn(() => ({
    width: 100,
    height: 100,
    getContext: jest.fn(() => mockCtx)
  }))
};

describe('VisualStyleManager', () => {
  let visualStyleManager;
  
  beforeEach(() => {
    jest.clearAllMocks();
    visualStyleManager = new VisualStyleManager(mockCanvas, mockCtx);
  });
  
  describe('Initialization', () => {
    test('should initialize with default values', () => {
      expect(visualStyleManager.canvas).toBe(mockCanvas);
      expect(visualStyleManager.ctx).toBe(mockCtx);
      expect(visualStyleManager.currentStage).toBe(0);
      expect(visualStyleManager.dustParticles).toHaveLength(15); // 50 * 0.3 density
    });
    
    test('should have correct color palette', () => {
      const palette = visualStyleManager.colorPalette;
      expect(palette.desert).toBe('#d4a574');
      expect(palette.sky).toBe('#ff8c42');
      expect(palette.rust).toBe('#8b4513');
      expect(palette.metal).toBe('#696969');
    });
    
    test('should have stage configurations', () => {
      const stages = visualStyleManager.stageConfigs;
      expect(Object.keys(stages)).toHaveLength(3);
      expect(stages[0].name).toBe('Outskirts');
      expect(stages[1].name).toBe('Deep Desert');
      expect(stages[2].name).toBe('Death Valley');
    });
  });
  
  describe('Stage Management', () => {
    test('should set stage correctly', () => {
      visualStyleManager.setStage(1);
      expect(visualStyleManager.currentStage).toBe(1);
    });
    
    test('should not set invalid stage', () => {
      visualStyleManager.setStage(5);
      expect(visualStyleManager.currentStage).toBe(0); // Should remain unchanged
    });
    
    test('should reinitialize dust particles when stage changes', () => {
      const initialParticleCount = visualStyleManager.dustParticles.length;
      visualStyleManager.setStage(2); // Death Valley has higher dust density
      
      expect(visualStyleManager.dustParticles.length).toBeGreaterThan(initialParticleCount);
    });
    
    test('should get current stage config', () => {
      visualStyleManager.setStage(1);
      const config = visualStyleManager.getCurrentStageConfig();
      expect(config.name).toBe('Deep Desert');
      expect(config.dustDensity).toBe(0.5);
    });
  });
  
  describe('Background Rendering', () => {
    test('should render background with gradient', () => {
      visualStyleManager.renderBackground(0);
      
      expect(mockCtx.createLinearGradient).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, mockCanvas.width, mockCanvas.height);
    });
    
    test('should render atmospheric haze', () => {
      visualStyleManager.renderBackground(0);
      
      // Should create multiple gradient fills for haze layers
      expect(mockCtx.createLinearGradient).toHaveBeenCalledTimes(4); // Sky + 3 haze layers
    });
    
    test('should render distant terrain with parallax', () => {
      const cameraX = 100;
      visualStyleManager.renderBackground(cameraX);
      
      // Should render multiple terrain layers
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });
  });
  
  describe('Dust Particle System', () => {
    test('should initialize dust particles', () => {
      expect(visualStyleManager.dustParticles.length).toBeGreaterThan(0);
      
      const particle = visualStyleManager.dustParticles[0];
      expect(particle).toHaveProperty('x');
      expect(particle).toHaveProperty('y');
      expect(particle).toHaveProperty('size');
      expect(particle).toHaveProperty('speed');
      expect(particle).toHaveProperty('opacity');
    });
    
    test('should update dust particles', () => {
      const initialX = visualStyleManager.dustParticles[0].x;
      
      visualStyleManager.updateAndRenderDustParticles(0.016, 1); // 60fps delta
      
      // Particles should move
      expect(visualStyleManager.dustParticles[0].x).not.toBe(initialX);
    });
    
    test('should wrap particles around screen', () => {
      // Move particle off screen
      visualStyleManager.dustParticles[0].x = mockCanvas.width + 20;
      
      visualStyleManager.updateAndRenderDustParticles(0.016, 1);
      
      // Should wrap to left side
      expect(visualStyleManager.dustParticles[0].x).toBeLessThan(0);
    });
    
    test('should render dust particles', () => {
      visualStyleManager.updateAndRenderDustParticles(0.016, 1);
      
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.arc).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });
  });
  
  describe('Weathered Texture Effects', () => {
    test('should apply weathered effect to image data', () => {
      const imageData = {
        data: new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255])
      };
      
      const weatheredData = visualStyleManager.applyWeatheredEffect(imageData, 0.5);
      
      expect(weatheredData).toBe(imageData);
      // Should modify the pixel data
      expect(imageData.data[0]).not.toBe(255); // Red channel should be modified
    });
    
    test('should create weathered vehicle texture', () => {
      const originalCanvas = {
        width: 100,
        height: 100
      };
      
      const weatheredCanvas = visualStyleManager.createWeatheredVehicleTexture(originalCanvas, 0.5);
      
      expect(document.createElement).toHaveBeenCalledWith('canvas');
      expect(weatheredCanvas.width).toBe(100);
      expect(weatheredCanvas.height).toBe(100);
    });
    
    test('should add rust spots to texture', () => {
      visualStyleManager.addRustSpots(mockCtx, 100, 100, 0.5);
      
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.createRadialGradient).toHaveBeenCalled();
      expect(mockCtx.arc).toHaveBeenCalled();
    });
    
    test('should add wear marks to texture', () => {
      visualStyleManager.addWearMarks(mockCtx, 100, 100, 0.5);
      
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalled();
      expect(mockCtx.lineTo).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
    });
  });
  
  describe('Screen Effects', () => {
    test('should render heat shimmer for high desolation stages', () => {
      visualStyleManager.setStage(2); // Death Valley
      visualStyleManager.renderScreenEffects();
      
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });
    
    test('should render dust storm overlay for high dust density', () => {
      visualStyleManager.setStage(2); // Death Valley has high dust density
      visualStyleManager.renderScreenEffects();
      
      expect(mockCtx.createLinearGradient).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });
    
    test('should not render heat shimmer for low desolation stages', () => {
      visualStyleManager.setStage(0); // Outskirts
      const saveCallsBefore = mockCtx.save.mock.calls.length;
      
      visualStyleManager.renderScreenEffects();
      
      // Should not add extra save calls for heat shimmer
      expect(mockCtx.save.mock.calls.length).toBe(saveCallsBefore);
    });
  });
  
  describe('Update and Render', () => {
    test('should update visual effects', () => {
      const deltaTime = 0.016;
      const cameraX = 100;
      const windSpeed = 1.5;
      
      visualStyleManager.update(deltaTime, cameraX, windSpeed);
      
      // Should update dust particles
      expect(mockCtx.arc).toHaveBeenCalled();
    });
    
    test('should render complete visual style', () => {
      const cameraX = 50;
      const windSpeed = 1.2;
      
      visualStyleManager.render(cameraX, windSpeed);
      
      // Should render background and screen effects
      expect(mockCtx.createLinearGradient).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });
  });
  
  describe('Stage Progression', () => {
    test('should have increasing desolation levels', () => {
      const stage0 = visualStyleManager.stageConfigs[0];
      const stage1 = visualStyleManager.stageConfigs[1];
      const stage2 = visualStyleManager.stageConfigs[2];
      
      expect(stage0.desolationLevel).toBeLessThan(stage1.desolationLevel);
      expect(stage1.desolationLevel).toBeLessThan(stage2.desolationLevel);
    });
    
    test('should have increasing dust density', () => {
      const stage0 = visualStyleManager.stageConfigs[0];
      const stage1 = visualStyleManager.stageConfigs[1];
      const stage2 = visualStyleManager.stageConfigs[2];
      
      expect(stage0.dustDensity).toBeLessThan(stage1.dustDensity);
      expect(stage1.dustDensity).toBeLessThan(stage2.dustDensity);
    });
    
    test('should have different sky colors for each stage', () => {
      const stage0 = visualStyleManager.stageConfigs[0];
      const stage1 = visualStyleManager.stageConfigs[1];
      const stage2 = visualStyleManager.stageConfigs[2];
      
      expect(stage0.skyColor).not.toBe(stage1.skyColor);
      expect(stage1.skyColor).not.toBe(stage2.skyColor);
    });
  });
  
  describe('Performance', () => {
    test('should limit dust particle count', () => {
      expect(visualStyleManager.dustParticles.length).toBeLessThanOrEqual(visualStyleManager.maxDustParticles);
    });
    
    test('should handle high frame rate updates', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        visualStyleManager.update(0.016, i, 1);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 100 updates in reasonable time (less than 100ms)
      expect(duration).toBeLessThan(100);
    });
  });
  
  describe('Error Handling', () => {
    test('should handle missing canvas context gracefully', () => {
      const invalidManager = new VisualStyleManager(null, null);
      
      expect(() => {
        invalidManager.render(0, 1);
      }).not.toThrow();
    });
    
    test('should handle invalid stage gracefully', () => {
      expect(() => {
        visualStyleManager.setStage(-1);
        visualStyleManager.setStage(999);
      }).not.toThrow();
      
      expect(visualStyleManager.currentStage).toBe(0);
    });
  });
});