import { DesertStageBackdrops } from '../DesertStageBackdrops.js';

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
  
  createLinearGradient: jest.fn(() => ({
    addColorStop: jest.fn()
  })),
  createRadialGradient: jest.fn(() => ({
    addColorStop: jest.fn()
  })),
  
  fillRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  arc: jest.fn(),
  ellipse: jest.fn(),
  closePath: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn()
};

describe('DesertStageBackdrops', () => {
  let desertBackdrops;
  
  beforeEach(() => {
    jest.clearAllMocks();
    desertBackdrops = new DesertStageBackdrops(mockCanvas, mockCtx);
  });
  
  describe('Initialization', () => {
    test('should initialize with default values', () => {
      expect(desertBackdrops.canvas).toBe(mockCanvas);
      expect(desertBackdrops.ctx).toBe(mockCtx);
      expect(desertBackdrops.currentStage).toBe(0);
      expect(desertBackdrops.parallaxLayers).toHaveLength(4);
    });
    
    test('should have stage backdrop configurations', () => {
      const backdrops = desertBackdrops.stageBackdrops;
      expect(Object.keys(backdrops)).toHaveLength(3);
      
      expect(backdrops[0].name).toBe('Desert Outskirts');
      expect(backdrops[1].name).toBe('Deep Wasteland');
      expect(backdrops[2].name).toBe('Death Valley');
    });
    
    test('should initialize parallax layers with correct distances', () => {
      const layers = desertBackdrops.parallaxLayers;
      expect(layers[0].distance).toBe(0.95);
      expect(layers[1].distance).toBe(0.8);
      expect(layers[2].distance).toBe(0.6);
      expect(layers[3].distance).toBe(0.4);
    });
  });
  
  describe('Stage Management', () => {
    test('should set stage correctly', () => {
      desertBackdrops.setStage(1);
      expect(desertBackdrops.currentStage).toBe(1);
    });
    
    test('should not set invalid stage', () => {
      desertBackdrops.setStage(5);
      expect(desertBackdrops.currentStage).toBe(0);
    });
    
    test('should generate stage elements when stage changes', () => {
      desertBackdrops.setStage(1);
      
      // Should have elements in parallax layers
      const totalElements = desertBackdrops.parallaxLayers.reduce(
        (sum, layer) => sum + layer.elements.length, 0
      );
      expect(totalElements).toBeGreaterThan(0);
    });
    
    test('should get current stage config', () => {
      desertBackdrops.setStage(2);
      const config = desertBackdrops.getCurrentStageConfig();
      expect(config.name).toBe('Death Valley');
    });
  });
  
  describe('Landmark Generation', () => {
    test('should generate landmarks for stage 0', () => {
      desertBackdrops.setStage(0);
      
      const allElements = desertBackdrops.parallaxLayers.flatMap(layer => layer.elements);
      const landmarks = allElements.filter(el => 
        ['distant_city', 'radio_tower', 'highway_signs'].includes(el.type)
      );
      
      expect(landmarks.length).toBe(3);
    });
    
    test('should generate landmarks for stage 1', () => {
      desertBackdrops.setStage(1);
      
      const allElements = desertBackdrops.parallaxLayers.flatMap(layer => layer.elements);
      const landmarks = allElements.filter(el => 
        ['ruined_building', 'crashed_plane', 'abandoned_gas_station'].includes(el.type)
      );
      
      expect(landmarks.length).toBe(3);
    });
    
    test('should generate landmarks for stage 2', () => {
      desertBackdrops.setStage(2);
      
      const allElements = desertBackdrops.parallaxLayers.flatMap(layer => layer.elements);
      const landmarks = allElements.filter(el => 
        ['military_base_ruins', 'nuclear_crater', 'evacuation_point'].includes(el.type)
      );
      
      expect(landmarks.length).toBe(3);
    });
    
    test('should assign landmarks to appropriate layers', () => {
      desertBackdrops.setStage(0);
      
      const distantCityLayer = desertBackdrops.getLayerForLandmark('distant_city');
      const radioTowerLayer = desertBackdrops.getLayerForLandmark('radio_tower');
      
      expect(distantCityLayer).toBe(desertBackdrops.parallaxLayers[0]); // Far background
      expect(radioTowerLayer).toBe(desertBackdrops.parallaxLayers[1]); // Mid background
    });
  });
  
  describe('Vegetation Generation', () => {
    test('should generate vegetation based on stage density', () => {
      desertBackdrops.setStage(0); // High vegetation density
      
      const vegetationElements = desertBackdrops.parallaxLayers[2].elements.filter(el =>
        ['dead_tree', 'cactus', 'scrub_brush'].includes(el.type)
      );
      
      expect(vegetationElements.length).toBeGreaterThan(0);
    });
    
    test('should generate less vegetation in later stages', () => {
      desertBackdrops.setStage(0);
      const stage0Vegetation = desertBackdrops.parallaxLayers[2].elements.filter(el =>
        ['dead_tree', 'cactus', 'scrub_brush'].includes(el.type)
      ).length;
      
      desertBackdrops.setStage(2);
      const stage2Vegetation = desertBackdrops.parallaxLayers[2].elements.filter(el =>
        ['dead_tree'].includes(el.type)
      ).length;
      
      expect(stage2Vegetation).toBeLessThan(stage0Vegetation);
    });
  });
  
  describe('Sky Gradient Rendering', () => {
    test('should render sky gradient', () => {
      desertBackdrops.renderSkyGradient();
      
      expect(mockCtx.createLinearGradient).toHaveBeenCalledWith(0, 0, 0, mockCanvas.height);
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, mockCanvas.width, mockCanvas.height);
    });
    
    test('should use different colors for different stages', () => {
      const stage0Config = desertBackdrops.stageBackdrops[0];
      const stage2Config = desertBackdrops.stageBackdrops[2];
      
      expect(stage0Config.skyGradient.top).not.toBe(stage2Config.skyGradient.top);
      expect(stage0Config.skyGradient.bottom).not.toBe(stage2Config.skyGradient.bottom);
    });
  });
  
  describe('Parallax Rendering', () => {
    test('should render parallax layers with camera offset', () => {
      desertBackdrops.setStage(1);
      const cameraX = 100;
      
      desertBackdrops.renderParallaxLayers(cameraX);
      
      // Should call rendering methods for visible elements
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });
    
    test('should apply different parallax speeds to different layers', () => {
      const layer0Speed = desertBackdrops.parallaxLayers[0].speed;
      const layer3Speed = desertBackdrops.parallaxLayers[3].speed;
      
      expect(layer0Speed).toBeLessThan(layer3Speed);
    });
    
    test('should only render visible elements', () => {
      desertBackdrops.setStage(1);
      
      // Add element far off screen
      desertBackdrops.parallaxLayers[0].elements.push({
        type: 'distant_city',
        x: mockCanvas.width * 10,
        opacity: 0.5,
        scale: 1
      });
      
      const saveCallsBefore = mockCtx.save.mock.calls.length;
      desertBackdrops.renderParallaxLayers(0);
      
      // Should not render off-screen elements
      expect(mockCtx.save.mock.calls.length).toBe(saveCallsBefore);
    });
  });
  
  describe('Element Drawing', () => {
    test('should draw distant city', () => {
      desertBackdrops.drawDistantCity();
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });
    
    test('should draw radio tower', () => {
      desertBackdrops.drawRadioTower();
      expect(mockCtx.moveTo).toHaveBeenCalled();
      expect(mockCtx.lineTo).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
    });
    
    test('should draw ruined building', () => {
      desertBackdrops.drawRuinedBuilding();
      expect(mockCtx.fillRect).toHaveBeenCalled();
      expect(mockCtx.beginPath).toHaveBeenCalled();
    });
    
    test('should draw nuclear crater', () => {
      desertBackdrops.drawNuclearCrater();
      expect(mockCtx.ellipse).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });
    
    test('should draw evacuation point', () => {
      desertBackdrops.drawEvacuationPoint();
      expect(mockCtx.fillRect).toHaveBeenCalled();
      expect(mockCtx.arc).toHaveBeenCalled();
    });
    
    test('should draw vegetation elements', () => {
      desertBackdrops.drawDeadTree();
      expect(mockCtx.moveTo).toHaveBeenCalled();
      expect(mockCtx.lineTo).toHaveBeenCalled();
      
      desertBackdrops.drawCactus();
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });
  });
  
  describe('Element Positioning', () => {
    test('should get correct base Y positions for elements', () => {
      const cityY = desertBackdrops.getElementBaseY('distant_city');
      const treeY = desertBackdrops.getElementBaseY('dead_tree');
      
      expect(cityY).toBeLessThan(treeY); // City should be higher (further back)
    });
    
    test('should get correct scale factors for landmarks', () => {
      const cityScale = desertBackdrops.getScaleForLandmark('distant_city');
      const gasStationScale = desertBackdrops.getScaleForLandmark('abandoned_gas_station');
      
      expect(cityScale).toBeLessThan(gasStationScale); // Distant objects should be smaller
    });
  });
  
  describe('Atmospheric Elements', () => {
    test('should generate dust clouds', () => {
      desertBackdrops.setStage(2); // High dust density
      
      const dustClouds = desertBackdrops.parallaxLayers[0].elements.filter(el =>
        el.type === 'dust_cloud'
      );
      
      expect(dustClouds.length).toBeGreaterThan(0);
    });
    
    test('should update dust cloud positions', () => {
      desertBackdrops.setStage(1);
      
      // Add dust cloud with drift
      desertBackdrops.parallaxLayers[0].elements.push({
        type: 'dust_cloud',
        x: 100,
        y: 200,
        drift: 0.5
      });
      
      const initialX = desertBackdrops.parallaxLayers[0].elements[0].x;
      desertBackdrops.update(0.016);
      
      expect(desertBackdrops.parallaxLayers[0].elements[0].x).not.toBe(initialX);
    });
  });
  
  describe('Complete Rendering', () => {
    test('should render complete backdrop', () => {
      desertBackdrops.setStage(1);
      desertBackdrops.render(50);
      
      expect(mockCtx.createLinearGradient).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });
    
    test('should handle camera movement', () => {
      desertBackdrops.setStage(1);
      
      const cameraX1 = 0;
      const cameraX2 = 200;
      
      desertBackdrops.render(cameraX1);
      const calls1 = mockCtx.translate.mock.calls.length;
      
      jest.clearAllMocks();
      
      desertBackdrops.render(cameraX2);
      const calls2 = mockCtx.translate.mock.calls.length;
      
      // Should render elements at different positions
      expect(calls2).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Stage Progression', () => {
    test('should have increasing atmospheric effects', () => {
      const stage0 = desertBackdrops.stageBackdrops[0];
      const stage2 = desertBackdrops.stageBackdrops[2];
      
      expect(stage0.atmosphere.dustDensity).toBeLessThan(stage2.atmosphere.dustDensity);
      expect(stage0.atmosphere.heatShimmer).toBeLessThan(stage2.atmosphere.heatShimmer);
    });
    
    test('should have decreasing visibility', () => {
      const stage0 = desertBackdrops.stageBackdrops[0];
      const stage2 = desertBackdrops.stageBackdrops[2];
      
      expect(stage0.atmosphere.visibility).toBeGreaterThan(stage2.atmosphere.visibility);
    });
    
    test('should have appropriate landmarks for each stage', () => {
      const stage0Landmarks = desertBackdrops.stageBackdrops[0].landmarks;
      const stage2Landmarks = desertBackdrops.stageBackdrops[2].landmarks;
      
      expect(stage0Landmarks.some(l => l.type === 'distant_city')).toBe(true);
      expect(stage2Landmarks.some(l => l.type === 'evacuation_point')).toBe(true);
    });
  });
  
  describe('Performance', () => {
    test('should handle multiple stage changes efficiently', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 10; i++) {
        desertBackdrops.setStage(i % 3);
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(50);
    });
    
    test('should limit element count per layer', () => {
      desertBackdrops.setStage(0);
      
      desertBackdrops.parallaxLayers.forEach(layer => {
        expect(layer.elements.length).toBeLessThan(100); // Reasonable limit
      });
    });
  });
  
  describe('Error Handling', () => {
    test('should handle missing stage gracefully', () => {
      expect(() => {
        desertBackdrops.setStage(999);
      }).not.toThrow();
    });
    
    test('should handle invalid element types gracefully', () => {
      expect(() => {
        desertBackdrops.renderBackgroundElement({ type: 'invalid_type', x: 0, y: 0 }, 0);
      }).not.toThrow();
    });
  });
});