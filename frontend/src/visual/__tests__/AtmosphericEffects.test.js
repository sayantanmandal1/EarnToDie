import { AtmosphericEffects } from '../AtmosphericEffects.js';

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
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  
  drawImage: jest.fn()
};

describe('AtmosphericEffects', () => {
  let atmosphericEffects;
  
  beforeEach(() => {
    jest.clearAllMocks();
    atmosphericEffects = new AtmosphericEffects(mockCanvas, mockCtx);
  });
  
  describe('Initialization', () => {
    test('should initialize with default values', () => {
      expect(atmosphericEffects.canvas).toBe(mockCanvas);
      expect(atmosphericEffects.ctx).toBe(mockCtx);
      expect(atmosphericEffects.dustParticles).toHaveLength(30);
      expect(atmosphericEffects.heatShimmerLines).toHaveLength(20);
    });
    
    test('should initialize effect configurations', () => {
      const effects = atmosphericEffects.effects;
      
      expect(effects.dustStorm.active).toBe(false);
      expect(effects.heatShimmer.active).toBe(true);
      expect(effects.atmosphericHaze.active).toBe(true);
      expect(effects.windEffect.active).toBe(true);
    });
    
    test('should initialize dust particles with properties', () => {
      const particle = atmosphericEffects.dustParticles[0];
      
      expect(particle).toHaveProperty('x');
      expect(particle).toHaveProperty('y');
      expect(particle).toHaveProperty('size');
      expect(particle).toHaveProperty('speed');
      expect(particle).toHaveProperty('opacity');
      expect(particle).toHaveProperty('rotation');
    });
    
    test('should initialize heat shimmer lines', () => {
      const line = atmosphericEffects.heatShimmerLines[0];
      
      expect(line).toHaveProperty('x');
      expect(line).toHaveProperty('baseY');
      expect(line).toHaveProperty('amplitude');
      expect(line).toHaveProperty('frequency');
      expect(line).toHaveProperty('phase');
    });
  });
  
  describe('Dust Particle System', () => {
    test('should update dust particle positions', () => {
      const initialX = atmosphericEffects.dustParticles[0].x;
      const initialRotation = atmosphericEffects.dustParticles[0].rotation;
      
      atmosphericEffects.updateDustParticles(0.016, 1);
      
      expect(atmosphericEffects.dustParticles[0].x).not.toBe(initialX);
      expect(atmosphericEffects.dustParticles[0].rotation).not.toBe(initialRotation);
    });
    
    test('should wrap particles around screen horizontally', () => {
      atmosphericEffects.dustParticles[0].x = mockCanvas.width + 100;
      
      atmosphericEffects.updateDustParticles(0.016, 1);
      
      expect(atmosphericEffects.dustParticles[0].x).toBeLessThan(0);
    });
    
    test('should wrap particles around screen vertically', () => {
      atmosphericEffects.dustParticles[0].y = mockCanvas.height + 20;
      
      atmosphericEffects.updateDustParticles(0.016, 1);
      
      expect(atmosphericEffects.dustParticles[0].y).toBeLessThan(0);
    });
    
    test('should render dust particles', () => {
      atmosphericEffects.renderDustParticles();
      
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.createRadialGradient).toHaveBeenCalled();
      expect(atmosphericEffects.dustParticles.length).toBeGreaterThan(0);
    });
    
    test('should apply wind speed to particle movement', () => {
      const particle = atmosphericEffects.dustParticles[0];
      const initialX = particle.x;
      
      atmosphericEffects.updateDustParticles(0.016, 2); // Double wind speed
      
      const movement = Math.abs(particle.x - initialX);
      expect(movement).toBeGreaterThan(0);
    });
  });
  
  describe('Heat Shimmer Effect', () => {
    test('should update heat shimmer phases', () => {
      const initialPhase = atmosphericEffects.heatShimmerLines[0].phase;
      
      atmosphericEffects.updateHeatShimmer(0.016);
      
      expect(atmosphericEffects.heatShimmerLines[0].phase).not.toBe(initialPhase);
    });
    
    test('should render heat shimmer when active', () => {
      atmosphericEffects.effects.heatShimmer.active = true;
      atmosphericEffects.renderHeatShimmer();
      
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.createLinearGradient).toHaveBeenCalled();
    });
    
    test('should not render heat shimmer when inactive', () => {
      atmosphericEffects.effects.heatShimmer.active = false;
      const saveCallsBefore = mockCtx.save.mock.calls.length;
      
      atmosphericEffects.renderHeatShimmer();
      
      expect(mockCtx.save.mock.calls.length).toBe(saveCallsBefore);
    });
    
    test('should set heat shimmer intensity', () => {
      atmosphericEffects.setHeatShimmerIntensity(0.8);
      expect(atmosphericEffects.effects.heatShimmer.intensity).toBe(0.8);
      
      atmosphericEffects.setHeatShimmerIntensity(1.5); // Should clamp to 1
      expect(atmosphericEffects.effects.heatShimmer.intensity).toBe(1);
      
      atmosphericEffects.setHeatShimmerIntensity(-0.5); // Should clamp to 0
      expect(atmosphericEffects.effects.heatShimmer.intensity).toBe(0);
    });
  });
  
  describe('Dust Storm Effect', () => {
    test('should activate dust storm', () => {
      atmosphericEffects.activateDustStorm(0.7, 1000);
      
      expect(atmosphericEffects.effects.dustStorm.active).toBe(true);
      expect(atmosphericEffects.effects.dustStorm.intensity).toBe(0.7);
    });
    
    test('should add dust storm particles when active', () => {
      atmosphericEffects.effects.dustStorm.active = true;
      atmosphericEffects.effects.dustStorm.intensity = 0.5;
      
      atmosphericEffects.updateDustStorm(0.016, {});
      
      expect(atmosphericEffects.effects.dustStorm.particles.length).toBeGreaterThan(0);
    });
    
    test('should update dust storm particles', () => {
      atmosphericEffects.effects.dustStorm.active = true;
      atmosphericEffects.effects.dustStorm.particles.push({
        x: 400,
        y: 300,
        size: 3,
        speed: 2,
        opacity: 0.5,
        life: 1.0
      });
      
      const initialX = atmosphericEffects.effects.dustStorm.particles[0].x;
      const initialLife = atmosphericEffects.effects.dustStorm.particles[0].life;
      
      atmosphericEffects.updateDustStorm(0.016, {});
      
      expect(atmosphericEffects.effects.dustStorm.particles[0].x).toBeLessThan(initialX);
      expect(atmosphericEffects.effects.dustStorm.particles[0].life).toBeLessThan(initialLife);
    });
    
    test('should remove expired dust storm particles', () => {
      atmosphericEffects.effects.dustStorm.active = true;
      atmosphericEffects.effects.dustStorm.particles.push({
        x: -100, // Off screen
        y: 300,
        size: 3,
        speed: 2,
        opacity: 0.5,
        life: 0 // Expired
      });
      
      atmosphericEffects.updateDustStorm(0.016, {});
      
      expect(atmosphericEffects.effects.dustStorm.particles.length).toBe(0);
    });
    
    test('should render dust storm particles', () => {
      atmosphericEffects.effects.dustStorm.active = true;
      atmosphericEffects.effects.dustStorm.particles.push({
        x: 400,
        y: 300,
        size: 3,
        opacity: 0.5,
        life: 0.8
      });
      
      atmosphericEffects.renderDustStorm();
      
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.createRadialGradient).toHaveBeenCalled();
      expect(mockCtx.arc).toHaveBeenCalled();
    });
  });
  
  describe('Atmospheric Haze', () => {
    test('should render atmospheric haze when active', () => {
      atmosphericEffects.effects.atmosphericHaze.active = true;
      atmosphericEffects.renderAtmosphericHaze();
      
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.createLinearGradient).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });
    
    test('should not render atmospheric haze when inactive', () => {
      atmosphericEffects.effects.atmosphericHaze.active = false;
      const saveCallsBefore = mockCtx.save.mock.calls.length;
      
      atmosphericEffects.renderAtmosphericHaze();
      
      expect(mockCtx.save.mock.calls.length).toBe(saveCallsBefore);
    });
    
    test('should render multiple haze layers', () => {
      atmosphericEffects.effects.atmosphericHaze.layers = 3;
      atmosphericEffects.renderAtmosphericHaze();
      
      expect(mockCtx.createLinearGradient).toHaveBeenCalledTimes(3);
      expect(mockCtx.fillRect).toHaveBeenCalledTimes(3);
    });
  });
  
  describe('Wind Effects', () => {
    test('should set wind effect properties', () => {
      atmosphericEffects.setWindEffect(2.5, 1);
      
      expect(atmosphericEffects.effects.windEffect.strength).toBe(2.5);
      expect(atmosphericEffects.effects.windEffect.direction).toBe(1);
    });
    
    test('should apply wind to particle movement', () => {
      atmosphericEffects.setWindEffect(3, -1);
      
      const particle = atmosphericEffects.dustParticles[0];
      const initialX = particle.x;
      
      atmosphericEffects.updateDustParticles(0.016, 1);
      
      const movement = particle.x - initialX;
      expect(Math.abs(movement)).toBeGreaterThan(0);
    });
  });
  
  describe('Screen Distortion', () => {
    test('should render screen distortion for high heat shimmer', () => {
      atmosphericEffects.effects.heatShimmer.intensity = 0.5;
      atmosphericEffects.time = 1;
      
      atmosphericEffects.renderScreenDistortion();
      
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });
    
    test('should not render distortion for low heat shimmer', () => {
      atmosphericEffects.effects.heatShimmer.intensity = 0.2;
      const saveCallsBefore = mockCtx.save.mock.calls.length;
      
      atmosphericEffects.renderScreenDistortion();
      
      expect(mockCtx.save.mock.calls.length).toBe(saveCallsBefore);
    });
  });
  
  describe('Stage Configuration Updates', () => {
    test('should update effects based on stage config', () => {
      const stageConfig = {
        dustDensity: 0.8
      };
      
      atmosphericEffects.updateAtmosphericEffects(0.016, stageConfig);
      
      expect(atmosphericEffects.effects.heatShimmer.intensity).toBe(0.4); // 0.8 * 0.5
      expect(atmosphericEffects.effects.atmosphericHaze.opacity).toBe(0.16); // 0.8 * 0.2
    });
    
    test('should handle missing stage config', () => {
      expect(() => {
        atmosphericEffects.updateAtmosphericEffects(0.016, {});
      }).not.toThrow();
    });
  });
  
  describe('Complete Update and Render', () => {
    test('should update all effects', () => {
      const stageConfig = { dustDensity: 0.5 };
      
      atmosphericEffects.update(0.016, 1.5, stageConfig);
      
      expect(atmosphericEffects.time).toBeGreaterThan(0);
    });
    
    test('should render all active effects', () => {
      atmosphericEffects.render();
      
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });
    
    test('should get effect status', () => {
      const status = atmosphericEffects.getEffectStatus();
      
      expect(status).toHaveProperty('dustStorm');
      expect(status).toHaveProperty('heatShimmer');
      expect(status).toHaveProperty('atmosphericHaze');
      expect(status).toHaveProperty('windEffect');
      expect(status).toHaveProperty('particleCount');
      expect(typeof status.particleCount).toBe('number');
    });
  });
  
  describe('Performance', () => {
    test('should handle high particle counts efficiently', () => {
      // Add many particles
      for (let i = 0; i < 100; i++) {
        atmosphericEffects.dustParticles.push({
          x: Math.random() * mockCanvas.width,
          y: Math.random() * mockCanvas.height,
          size: 1,
          speed: 1,
          opacity: 0.3,
          drift: 0,
          rotation: 0,
          rotationSpeed: 0
        });
      }
      
      const startTime = performance.now();
      atmosphericEffects.update(0.016, 1, {});
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50); // Should complete in reasonable time
    });
    
    test('should limit dust storm particles', () => {
      atmosphericEffects.effects.dustStorm.active = true;
      atmosphericEffects.effects.dustStorm.intensity = 1.0;
      
      // Update multiple times to generate particles
      for (let i = 0; i < 100; i++) {
        atmosphericEffects.updateDustStorm(0.016, {});
      }
      
      expect(atmosphericEffects.effects.dustStorm.particles.length).toBeLessThan(100);
    });
  });
  
  describe('Error Handling', () => {
    test('should handle missing canvas context gracefully', () => {
      const invalidEffects = new AtmosphericEffects(null, null);
      
      expect(() => {
        invalidEffects.render();
      }).not.toThrow();
    });
    
    test('should handle invalid wind values', () => {
      expect(() => {
        atmosphericEffects.setWindEffect(NaN, undefined);
      }).not.toThrow();
    });
    
    test('should handle invalid stage configurations', () => {
      expect(() => {
        atmosphericEffects.updateAtmosphericEffects(0.016, null);
      }).not.toThrow();
    });
  });
  
  describe('Auto-deactivation', () => {
    test('should auto-deactivate dust storm after duration', (done) => {
      atmosphericEffects.activateDustStorm(0.5, 100); // 100ms duration
      
      expect(atmosphericEffects.effects.dustStorm.active).toBe(true);
      
      setTimeout(() => {
        expect(atmosphericEffects.effects.dustStorm.active).toBe(false);
        expect(atmosphericEffects.effects.dustStorm.particles).toHaveLength(0);
        done();
      }, 150);
    });
  });
});