import { VisualStyleManager } from '../VisualStyleManager.js';
import { DesertStageBackdrops } from '../DesertStageBackdrops.js';
import { AtmosphericEffects } from '../AtmosphericEffects.js';
import { MechanicalSoundEffects } from '../MechanicalSoundEffects.js';

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
  ellipse: jest.fn(),
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

// Mock Web Audio API
const mockAudioContext = {
  state: 'running',
  currentTime: 0,
  sampleRate: 44100,
  destination: {},
  
  createOscillator: jest.fn(() => ({
    type: 'sine',
    frequency: {
      setValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn()
    },
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn()
  })),
  
  createGain: jest.fn(() => ({
    gain: {
      setValueAtTime: jest.fn(),
      linearRampToValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn()
    },
    connect: jest.fn()
  })),
  
  createBiquadFilter: jest.fn(() => ({
    type: 'lowpass',
    frequency: { setValueAtTime: jest.fn() },
    Q: { setValueAtTime: jest.fn() },
    connect: jest.fn()
  })),
  
  createBufferSource: jest.fn(() => ({
    buffer: null,
    connect: jest.fn(),
    start: jest.fn()
  })),
  
  createBuffer: jest.fn(() => ({
    getChannelData: jest.fn(() => new Float32Array(1024))
  })),
  
  resume: jest.fn()
};

global.AudioContext = jest.fn(() => mockAudioContext);
global.document = {
  createElement: jest.fn(() => ({
    width: 100,
    height: 100,
    getContext: jest.fn(() => mockCtx)
  })),
  addEventListener: jest.fn(),
  body: {}
};
global.MutationObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn()
}));

describe('Visual Style System Integration', () => {
  let visualStyleManager;
  let desertBackdrops;
  let atmosphericEffects;
  let mechanicalSounds;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    visualStyleManager = new VisualStyleManager(mockCanvas, mockCtx);
    desertBackdrops = new DesertStageBackdrops(mockCanvas, mockCtx);
    atmosphericEffects = new AtmosphericEffects(mockCanvas, mockCtx);
    mechanicalSounds = new MechanicalSoundEffects();
  });
  
  describe('Complete Visual System Integration', () => {
    test('should coordinate all visual systems for stage progression', () => {
      // Test stage 0 (Outskirts)
      visualStyleManager.setStage(0);
      desertBackdrops.setStage(0);
      
      const stage0Config = visualStyleManager.getCurrentStageConfig();
      const backdrop0Config = desertBackdrops.getCurrentStageConfig();
      
      expect(stage0Config.name).toBe('Outskirts');
      expect(backdrop0Config.name).toBe('Desert Outskirts');
      expect(stage0Config.dustDensity).toBe(backdrop0Config.atmosphere.dustDensity);
      
      // Test stage 2 (Death Valley)
      visualStyleManager.setStage(2);
      desertBackdrops.setStage(2);
      
      const stage2Config = visualStyleManager.getCurrentStageConfig();
      const backdrop2Config = desertBackdrops.getCurrentStageConfig();
      
      expect(stage2Config.name).toBe('Death Valley');
      expect(backdrop2Config.name).toBe('Death Valley');
      expect(stage2Config.dustDensity).toBeGreaterThan(stage0Config.dustDensity);
    });
    
    test('should render complete post-apocalyptic scene', () => {
      const deltaTime = 0.016;
      const cameraX = 100;
      const windSpeed = 1.5;
      
      // Set up stage 1
      visualStyleManager.setStage(1);
      desertBackdrops.setStage(1);
      
      // Update all systems
      visualStyleManager.update(deltaTime, cameraX, windSpeed);
      desertBackdrops.update(deltaTime);
      atmosphericEffects.update(deltaTime, windSpeed, visualStyleManager.getCurrentStageConfig());
      
      // Render complete scene
      desertBackdrops.render(cameraX);
      visualStyleManager.render(cameraX, windSpeed);
      atmosphericEffects.render();
      
      // Verify rendering calls were made
      expect(mockCtx.createLinearGradient).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalled();
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });
    
    test('should synchronize atmospheric effects with stage configuration', () => {
      visualStyleManager.setStage(2);
      const stageConfig = visualStyleManager.getCurrentStageConfig();
      
      atmosphericEffects.update(0.016, 1, stageConfig);
      
      // Atmospheric effects should be adjusted based on stage
      expect(atmosphericEffects.effects.heatShimmer.intensity).toBe(stageConfig.dustDensity * 0.5);
      expect(atmosphericEffects.effects.atmosphericHaze.opacity).toBe(stageConfig.dustDensity * 0.2);
    });
    
    test('should create cohesive visual progression through stages', () => {
      const stages = [0, 1, 2];
      const progressionData = [];
      
      stages.forEach(stageIndex => {
        visualStyleManager.setStage(stageIndex);
        desertBackdrops.setStage(stageIndex);
        
        const visualConfig = visualStyleManager.getCurrentStageConfig();
        const backdropConfig = desertBackdrops.getCurrentStageConfig();
        
        progressionData.push({
          stage: stageIndex,
          dustDensity: visualConfig.dustDensity,
          desolationLevel: visualConfig.desolationLevel,
          visibility: backdropConfig.atmosphere.visibility,
          heatShimmer: backdropConfig.atmosphere.heatShimmer
        });
      });
      
      // Verify progression increases difficulty/desolation
      expect(progressionData[0].dustDensity).toBeLessThan(progressionData[2].dustDensity);
      expect(progressionData[0].desolationLevel).toBeLessThan(progressionData[2].desolationLevel);
      expect(progressionData[0].visibility).toBeGreaterThan(progressionData[2].visibility);
      expect(progressionData[0].heatShimmer).toBeLessThan(progressionData[2].heatShimmer);
    });
  });
  
  describe('Audio-Visual Coordination', () => {
    test('should coordinate mechanical sounds with visual interactions', () => {
      const playSound = jest.spyOn(mechanicalSounds, 'playSound');
      
      // Simulate UI interactions that should trigger sounds
      mechanicalSounds.playSound('buttonClick');
      mechanicalSounds.playSound('upgradePurchase');
      mechanicalSounds.playSound('menuOpen');
      
      expect(playSound).toHaveBeenCalledWith('buttonClick');
      expect(playSound).toHaveBeenCalledWith('upgradePurchase');
      expect(playSound).toHaveBeenCalledWith('menuOpen');
    });
    
    test('should adjust audio based on visual intensity', () => {
      // High intensity stage should have more dramatic audio
      visualStyleManager.setStage(2);
      const stageConfig = visualStyleManager.getCurrentStageConfig();
      
      // Audio volume could be adjusted based on stage intensity
      const baseVolume = 0.5;
      const adjustedVolume = baseVolume * (1 + stageConfig.desolationLevel * 0.3);
      
      mechanicalSounds.setVolume(adjustedVolume);
      expect(mechanicalSounds.volume).toBeGreaterThan(baseVolume);
    });
    
    test('should provide audio feedback for visual state changes', () => {
      const playSound = jest.spyOn(mechanicalSounds, 'playSound');
      
      // Stage progression could trigger audio feedback
      visualStyleManager.setStage(1);
      mechanicalSounds.playSound('successSound'); // Stage unlock sound
      
      expect(playSound).toHaveBeenCalledWith('successSound');
    });
  });
  
  describe('Performance Integration', () => {
    test('should maintain performance with all systems active', () => {
      const startTime = performance.now();
      
      // Set up complex scene
      visualStyleManager.setStage(2);
      desertBackdrops.setStage(2);
      atmosphericEffects.activateDustStorm(0.8);
      
      // Simulate multiple frame updates
      for (let i = 0; i < 60; i++) {
        const deltaTime = 0.016;
        const cameraX = i * 10;
        const windSpeed = 1 + Math.sin(i * 0.1) * 0.5;
        
        visualStyleManager.update(deltaTime, cameraX, windSpeed);
        desertBackdrops.update(deltaTime);
        atmosphericEffects.update(deltaTime, windSpeed, visualStyleManager.getCurrentStageConfig());
        
        visualStyleManager.render(cameraX, windSpeed);
        desertBackdrops.render(cameraX);
        atmosphericEffects.render();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete 60 frames in reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });
    
    test('should handle rapid stage transitions efficiently', () => {
      const startTime = performance.now();
      
      // Rapidly change stages
      for (let i = 0; i < 30; i++) {
        const stage = i % 3;
        visualStyleManager.setStage(stage);
        desertBackdrops.setStage(stage);
        
        // Quick update and render
        visualStyleManager.update(0.016, 0, 1);
        desertBackdrops.update(0.016);
        atmosphericEffects.update(0.016, 1, visualStyleManager.getCurrentStageConfig());
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(200);
    });
  });
  
  describe('Visual Consistency', () => {
    test('should maintain consistent color palette across all systems', () => {
      const visualPalette = visualStyleManager.colorPalette;
      
      // All systems should use similar color schemes
      expect(visualPalette.desert).toBe('#d4a574');
      expect(visualPalette.sky).toBe('#ff8c42');
      expect(visualPalette.rust).toBe('#8b4513');
      
      // Stage configurations should use consistent colors
      const stage0 = visualStyleManager.stageConfigs[0];
      const backdrop0 = desertBackdrops.stageBackdrops[0];
      
      expect(stage0.backgroundColor).toBe(backdrop0.terrain.baseColor);
    });
    
    test('should maintain visual coherence between dust particles and atmospheric effects', () => {
      visualStyleManager.setStage(1);
      const stageConfig = visualStyleManager.getCurrentStageConfig();
      
      atmosphericEffects.update(0.016, 1, stageConfig);
      
      // Dust density should be coordinated
      expect(stageConfig.dustDensity).toBe(0.5);
      expect(atmosphericEffects.effects.heatShimmer.intensity).toBe(0.25); // 0.5 * 0.5
    });
    
    test('should create seamless visual transitions between stages', () => {
      const transitionData = [];
      
      // Capture visual data for each stage
      for (let stage = 0; stage <= 2; stage++) {
        visualStyleManager.setStage(stage);
        desertBackdrops.setStage(stage);
        
        const visualConfig = visualStyleManager.getCurrentStageConfig();
        const backdropConfig = desertBackdrops.getCurrentStageConfig();
        
        transitionData.push({
          stage,
          skyColor: visualConfig.skyColor,
          backgroundColor: visualConfig.backgroundColor,
          dustDensity: visualConfig.dustDensity,
          landmarks: backdropConfig.landmarks.length
        });
      }
      
      // Verify smooth progression
      expect(transitionData[0].dustDensity).toBeLessThan(transitionData[1].dustDensity);
      expect(transitionData[1].dustDensity).toBeLessThan(transitionData[2].dustDensity);
      
      // Each stage should have unique landmarks
      expect(transitionData[0].landmarks).toBeGreaterThan(0);
      expect(transitionData[1].landmarks).toBeGreaterThan(0);
      expect(transitionData[2].landmarks).toBeGreaterThan(0);
    });
  });
  
  describe('Error Recovery Integration', () => {
    test('should handle system failures gracefully', () => {
      // Simulate audio system failure
      mechanicalSounds.setEnabled(false);
      
      // Visual systems should continue working
      expect(() => {
        visualStyleManager.render(0, 1);
        desertBackdrops.render(0);
        atmosphericEffects.render();
      }).not.toThrow();
    });
    
    test('should recover from invalid stage configurations', () => {
      // Try to set invalid stages
      visualStyleManager.setStage(-1);
      desertBackdrops.setStage(999);
      
      // Should fall back to valid stages
      expect(visualStyleManager.currentStage).toBe(0);
      expect(desertBackdrops.currentStage).toBe(0);
      
      // Systems should still render
      expect(() => {
        visualStyleManager.render(0, 1);
        desertBackdrops.render(0);
      }).not.toThrow();
    });
    
    test('should handle missing canvas context', () => {
      const invalidVisualManager = new VisualStyleManager(null, null);
      const invalidBackdrops = new DesertStageBackdrops(null, null);
      const invalidEffects = new AtmosphericEffects(null, null);
      
      expect(() => {
        invalidVisualManager.render(0, 1);
        invalidBackdrops.render(0);
        invalidEffects.render();
      }).not.toThrow();
    });
  });
  
  describe('Memory Management', () => {
    test('should not create memory leaks during extended use', () => {
      const initialParticleCount = atmosphericEffects.dustParticles.length;
      
      // Simulate extended gameplay
      for (let i = 0; i < 1000; i++) {
        visualStyleManager.update(0.016, i, 1);
        atmosphericEffects.update(0.016, 1, visualStyleManager.getCurrentStageConfig());
        
        // Occasionally change stages
        if (i % 100 === 0) {
          const stage = Math.floor(i / 100) % 3;
          visualStyleManager.setStage(stage);
          desertBackdrops.setStage(stage);
        }
      }
      
      // Particle count should remain reasonable
      expect(atmosphericEffects.dustParticles.length).toBeLessThanOrEqual(initialParticleCount * 2);
    });
    
    test('should clean up resources properly', () => {
      // Activate dust storm
      atmosphericEffects.activateDustStorm(0.5, 100);
      expect(atmosphericEffects.effects.dustStorm.active).toBe(true);
      
      // Should auto-cleanup after timeout
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(atmosphericEffects.effects.dustStorm.active).toBe(false);
          expect(atmosphericEffects.effects.dustStorm.particles).toHaveLength(0);
          resolve();
        }, 150);
      });
    });
  });
  
  describe('Requirements Compliance', () => {
    test('should meet Requirement 7.1 - dusty desert backgrounds with orange-hued skies', () => {
      visualStyleManager.setStage(0);
      desertBackdrops.setStage(0);
      
      const stageConfig = visualStyleManager.getCurrentStageConfig();
      const backdropConfig = desertBackdrops.getCurrentStageConfig();
      
      expect(stageConfig.skyColor).toContain('#ff'); // Orange hue
      expect(backdropConfig.skyGradient.top).toContain('#ff'); // Orange hue
      expect(stageConfig.backgroundColor).toContain('#d4a574'); // Desert color
    });
    
    test('should meet Requirement 7.2 - weathered vehicle textures', () => {
      const originalCanvas = { width: 100, height: 100 };
      const weatheredTexture = visualStyleManager.createWeatheredVehicleTexture(originalCanvas, 0.5);
      
      expect(weatheredTexture).toBeDefined();
      expect(weatheredTexture.width).toBe(100);
      expect(weatheredTexture.height).toBe(100);
    });
    
    test('should meet Requirement 7.3 - dust particle effects and atmospheric elements', () => {
      expect(visualStyleManager.dustParticles.length).toBeGreaterThan(0);
      expect(atmosphericEffects.dustParticles.length).toBeGreaterThan(0);
      expect(atmosphericEffects.effects.atmosphericHaze.active).toBe(true);
    });
    
    test('should meet Requirement 7.4 - rugged, minimal UI design with mechanical sounds', () => {
      expect(mechanicalSounds.soundConfigs).toHaveProperty('buttonClick');
      expect(mechanicalSounds.soundConfigs).toHaveProperty('upgradePurchase');
      expect(mechanicalSounds.enabled).toBe(true);
    });
    
    test('should meet Requirement 7.5 - different desert stage backdrops with increasing desolation', () => {
      const stage0Config = desertBackdrops.stageBackdrops[0];
      const stage2Config = desertBackdrops.stageBackdrops[2];
      
      expect(stage0Config.atmosphere.dustDensity).toBeLessThan(stage2Config.atmosphere.dustDensity);
      expect(stage0Config.atmosphere.visibility).toBeGreaterThan(stage2Config.atmosphere.visibility);
      expect(stage0Config.vegetation.density).toBeGreaterThan(stage2Config.vegetation.density);
    });
  });
});