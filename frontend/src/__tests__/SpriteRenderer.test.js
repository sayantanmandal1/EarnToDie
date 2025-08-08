/**
 * Unit tests for SpriteRenderer
 * Tests sprite rendering, animations, and visual effects
 */

import SpriteRenderer from '../engine/SpriteRenderer.js';

// Mock Image
class MockImage {
  constructor() {
    this.width = 100;
    this.height = 50;
    this.src = '';
  }
}

// Mock canvas context
const mockCtx = {
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  scale: jest.fn(),
  drawImage: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  fillText: jest.fn(),
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  fillStyle: '#000000',
  strokeStyle: '#000000',
  lineWidth: 1,
  font: '12px Arial',
  textAlign: 'left'
};

// Mock camera
const mockCamera = {
  worldToScreen: jest.fn((x, y) => ({ x: x - 100, y: y - 50 })),
  getViewBounds: jest.fn(() => ({
    left: 0,
    top: 0,
    right: 1200,
    bottom: 800,
    width: 1200,
    height: 800
  }))
};



describe('SpriteRenderer', () => {
  let renderer;
  let mockImage;
  
  beforeEach(() => {
    renderer = new SpriteRenderer();
    mockImage = new MockImage();
    jest.clearAllMocks();
    
    // Reset camera mock
    mockCamera.getViewBounds.mockReturnValue({
      left: 0,
      top: 0,
      right: 1200,
      bottom: 800,
      width: 1200,
      height: 800
    });
    mockCamera.worldToScreen.mockImplementation((x, y) => ({ x: x - 100, y: y - 50 }));
  });
  
  describe('Constructor', () => {
    test('should initialize with empty collections', () => {
      expect(renderer.sprites.size).toBe(0);
      expect(renderer.animations.size).toBe(0);
      expect(renderer.effects.size).toBe(0);
      expect(renderer.animationTime).toBe(0);
      expect(renderer.spritesRendered).toBe(0);
      expect(renderer.effectsRendered).toBe(0);
    });
  });
  
  describe('Sprite Management', () => {
    test('should register sprite with default values', () => {
      const id = renderer.registerSprite('test', { image: mockImage });
      
      expect(id).toBe('test');
      expect(renderer.sprites.has('test')).toBe(true);
      
      const sprite = renderer.getSprite('test');
      expect(sprite.image).toBe(mockImage);
      expect(sprite.x).toBe(0);
      expect(sprite.y).toBe(0);
      expect(sprite.width).toBe(mockImage.width);
      expect(sprite.height).toBe(mockImage.height);
      expect(sprite.rotation).toBe(0);
      expect(sprite.scaleX).toBe(1);
      expect(sprite.scaleY).toBe(1);
      expect(sprite.alpha).toBe(1);
      expect(sprite.visible).toBe(true);
      expect(sprite.layer).toBe(0);
    });
    
    test('should register sprite with custom values', () => {
      const spriteData = {
        image: mockImage,
        x: 100,
        y: 200,
        width: 80,
        height: 40,
        rotation: Math.PI / 4,
        scaleX: 1.5,
        scaleY: 0.8,
        alpha: 0.7,
        visible: false,
        flipX: true,
        flipY: true,
        tint: '#ff0000',
        layer: 5
      };
      
      renderer.registerSprite('custom', spriteData);
      const sprite = renderer.getSprite('custom');
      
      expect(sprite.x).toBe(100);
      expect(sprite.y).toBe(200);
      expect(sprite.width).toBe(80);
      expect(sprite.height).toBe(40);
      expect(sprite.rotation).toBe(Math.PI / 4);
      expect(sprite.scaleX).toBe(1.5);
      expect(sprite.scaleY).toBe(0.8);
      expect(sprite.alpha).toBe(0.7);
      expect(sprite.visible).toBe(false);
      expect(sprite.flipX).toBe(true);
      expect(sprite.flipY).toBe(true);
      expect(sprite.tint).toBe('#ff0000');
      expect(sprite.layer).toBe(5);
    });
    
    test('should update sprite properties', () => {
      renderer.registerSprite('test', { image: mockImage });
      
      renderer.updateSprite('test', { x: 50, y: 75, alpha: 0.5 });
      
      const sprite = renderer.getSprite('test');
      expect(sprite.x).toBe(50);
      expect(sprite.y).toBe(75);
      expect(sprite.alpha).toBe(0.5);
    });
    
    test('should remove sprite', () => {
      renderer.registerSprite('test', { image: mockImage });
      
      expect(renderer.removeSprite('test')).toBe(true);
      expect(renderer.sprites.has('test')).toBe(false);
      expect(renderer.removeSprite('nonexistent')).toBe(false);
    });
    
    test('should clear all sprites', () => {
      renderer.registerSprite('test1', { image: mockImage });
      renderer.registerSprite('test2', { image: mockImage });
      
      renderer.clearSprites();
      
      expect(renderer.sprites.size).toBe(0);
    });
  });
  
  describe('Animation Management', () => {
    let mockSpriteSheet;
    
    beforeEach(() => {
      mockSpriteSheet = new MockImage();
      mockSpriteSheet.width = 400;
      mockSpriteSheet.height = 100;
    });
    
    test('should register animated sprite with default values', () => {
      const animationData = {
        spriteSheet: mockSpriteSheet,
        frameWidth: 100,
        frameHeight: 100,
        frames: [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
          { x: 200, y: 0 }
        ]
      };
      
      const id = renderer.registerAnimatedSprite('anim', animationData);
      
      expect(id).toBe('anim');
      expect(renderer.animations.has('anim')).toBe(true);
      
      const animation = renderer.getAnimation('anim');
      expect(animation.spriteSheet).toBe(mockSpriteSheet);
      expect(animation.frameWidth).toBe(100);
      expect(animation.frameHeight).toBe(100);
      expect(animation.frames.length).toBe(3);
      expect(animation.currentFrame).toBe(0);
      expect(animation.frameTime).toBe(100);
      expect(animation.loop).toBe(true);
      expect(animation.playing).toBe(true);
    });
    
    test('should register animated sprite with custom values', () => {
      const animationData = {
        spriteSheet: mockSpriteSheet,
        frameWidth: 50,
        frameHeight: 50,
        frames: [{ x: 0, y: 0 }],
        frameTime: 200,
        loop: false,
        playing: false,
        x: 100,
        y: 200,
        alpha: 0.8,
        layer: 3
      };
      
      renderer.registerAnimatedSprite('custom', animationData);
      const animation = renderer.getAnimation('custom');
      
      expect(animation.frameTime).toBe(200);
      expect(animation.loop).toBe(false);
      expect(animation.playing).toBe(false);
      expect(animation.x).toBe(100);
      expect(animation.y).toBe(200);
      expect(animation.alpha).toBe(0.8);
      expect(animation.layer).toBe(3);
    });
    
    test('should control animation playback', () => {
      const animationData = {
        spriteSheet: mockSpriteSheet,
        frameWidth: 100,
        frameHeight: 100,
        frames: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
        playing: false
      };
      
      renderer.registerAnimatedSprite('anim', animationData);
      
      // Play animation
      renderer.playAnimation('anim');
      let animation = renderer.getAnimation('anim');
      expect(animation.playing).toBe(true);
      expect(animation.currentFrame).toBe(0);
      
      // Stop animation
      renderer.stopAnimation('anim');
      animation = renderer.getAnimation('anim');
      expect(animation.playing).toBe(false);
      
      // Pause animation
      renderer.pauseAnimation('anim');
      expect(animation.playing).toBe(false);
      
      // Resume animation
      renderer.resumeAnimation('anim');
      expect(animation.playing).toBe(true);
    });
    
    test('should update animation frames', () => {
      const animationData = {
        spriteSheet: mockSpriteSheet,
        frameWidth: 100,
        frameHeight: 100,
        frames: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 200, y: 0 }],
        frameTime: 50
      };
      
      renderer.registerAnimatedSprite('anim', animationData);
      
      // Simulate time passing
      renderer.update(60); // More than frameTime
      
      const animation = renderer.getAnimation('anim');
      expect(animation.currentFrame).toBe(1);
    });
    
    test('should loop animation', () => {
      const animationData = {
        spriteSheet: mockSpriteSheet,
        frameWidth: 100,
        frameHeight: 100,
        frames: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
        frameTime: 50,
        loop: true
      };
      
      renderer.registerAnimatedSprite('anim', animationData);
      
      // Advance through all frames and beyond
      renderer.update(60); // Frame 1
      renderer.update(60); // Should loop back to frame 0
      
      const animation = renderer.getAnimation('anim');
      expect(animation.currentFrame).toBe(0);
      expect(animation.playing).toBe(true);
    });
    
    test('should stop non-looping animation at end', () => {
      const onComplete = jest.fn();
      const animationData = {
        spriteSheet: mockSpriteSheet,
        frameWidth: 100,
        frameHeight: 100,
        frames: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
        frameTime: 50,
        loop: false,
        onComplete: onComplete
      };
      
      renderer.registerAnimatedSprite('anim', animationData);
      
      // Advance through all frames
      renderer.update(60); // Frame 1
      renderer.update(60); // Should stop at last frame
      
      const animation = renderer.getAnimation('anim');
      expect(animation.currentFrame).toBe(1);
      expect(animation.playing).toBe(false);
      expect(onComplete).toHaveBeenCalledWith('anim');
    });
  });
  
  describe('Effect Management', () => {
    test('should register effect with default values', () => {
      const effectData = {
        type: 'explosion',
        x: 100,
        y: 200
      };
      
      const id = renderer.registerEffect('effect', effectData);
      
      expect(id).toBe('effect');
      expect(renderer.effects.has('effect')).toBe(true);
      
      const effect = renderer.getEffect('effect');
      expect(effect.type).toBe('explosion');
      expect(effect.x).toBe(100);
      expect(effect.y).toBe(200);
      expect(effect.duration).toBe(1000);
      expect(effect.intensity).toBe(1);
      expect(effect.color).toBe('#ffffff');
      expect(effect.fade).toBe(true);
      expect(effect.layer).toBe(10);
    });
    
    test('should register effect with custom values', () => {
      const effectData = {
        type: 'dust',
        x: 50,
        y: 75,
        duration: 500,
        intensity: 2,
        color: '#ff0000',
        fade: false,
        layer: 5
      };
      
      renderer.registerEffect('custom', effectData);
      const effect = renderer.getEffect('custom');
      
      expect(effect.duration).toBe(500);
      expect(effect.intensity).toBe(2);
      expect(effect.color).toBe('#ff0000');
      expect(effect.fade).toBe(false);
      expect(effect.layer).toBe(5);
    });
    
    test('should remove expired effects', () => {
      const effectData = {
        type: 'explosion',
        x: 100,
        y: 200,
        duration: 50 // Very short duration
      };
      
      renderer.registerEffect('shortEffect', effectData);
      
      // Wait for effect to expire
      setTimeout(() => {
        renderer.update(16);
        expect(renderer.effects.has('shortEffect')).toBe(false);
      }, 60);
    });
    
    test('should create dust effect', () => {
      const id = renderer.createDustEffect(100, 200, 1.5);
      
      expect(renderer.effects.has(id)).toBe(true);
      const effect = renderer.getEffect(id);
      expect(effect.type).toBe('dust');
      expect(effect.x).toBe(100);
      expect(effect.y).toBe(200);
      expect(effect.intensity).toBe(1.5);
    });
    
    test('should create explosion effect', () => {
      const id = renderer.createExplosionEffect(150, 250, 2);
      
      expect(renderer.effects.has(id)).toBe(true);
      const effect = renderer.getEffect(id);
      expect(effect.type).toBe('explosion');
      expect(effect.x).toBe(150);
      expect(effect.y).toBe(250);
      expect(effect.intensity).toBe(2);
    });
    
    test('should create particle effect', () => {
      const id = renderer.createParticleEffect(200, 300, 15, '#00ff00');
      
      expect(renderer.effects.has(id)).toBe(true);
      const effect = renderer.getEffect(id);
      expect(effect.type).toBe('particle');
      expect(effect.particles.length).toBe(15);
      expect(effect.color).toBe('#00ff00');
    });
  });
  
  describe('Rendering', () => {
    beforeEach(() => {
      // Reset mock functions
      mockCtx.save.mockClear();
      mockCtx.restore.mockClear();
      mockCtx.translate.mockClear();
      mockCtx.rotate.mockClear();
      mockCtx.scale.mockClear();
      mockCtx.drawImage.mockClear();
    });
    
    test('should render visible sprites', () => {
      renderer.registerSprite('visible', {
        image: mockImage,
        x: 100,
        y: 100,
        visible: true
      });
      
      renderer.registerSprite('invisible', {
        image: mockImage,
        x: 200,
        y: 200,
        visible: false
      });
      
      renderer.render(mockCtx, mockCamera);
      
      expect(renderer.spritesRendered).toBe(1);
      expect(mockCtx.drawImage).toHaveBeenCalledTimes(1);
    });
    
    test('should apply sprite transformations', () => {
      renderer.registerSprite('transformed', {
        image: mockImage,
        x: 100,
        y: 100,
        rotation: Math.PI / 4,
        scaleX: 1.5,
        scaleY: 0.8,
        flipX: true,
        alpha: 0.7
      });
      
      renderer.render(mockCtx, mockCamera);
      
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.translate).toHaveBeenCalled();
      expect(mockCtx.rotate).toHaveBeenCalledWith(Math.PI / 4);
      expect(mockCtx.scale).toHaveBeenCalledWith(-1.5, 0.8); // flipX applied
      expect(mockCtx.globalAlpha).toBe(0.7);
    });
    
    test('should render animations', () => {
      const animationData = {
        spriteSheet: mockImage,
        frameWidth: 50,
        frameHeight: 50,
        frames: [{ x: 0, y: 0 }, { x: 50, y: 0 }],
        x: 100,
        y: 100
      };
      
      renderer.registerAnimatedSprite('anim', animationData);
      renderer.render(mockCtx, mockCamera);
      
      expect(renderer.spritesRendered).toBe(1);
      expect(mockCtx.drawImage).toHaveBeenCalledWith(
        mockImage,
        0, 0, 50, 50, // Source rectangle
        -25, -25, 50, 50 // Destination rectangle (centered)
      );
    });
    
    test('should render effects', () => {
      renderer.registerEffect('explosion', {
        type: 'explosion',
        x: 100,
        y: 100
      });
      
      renderer.render(mockCtx, mockCamera);
      
      expect(renderer.effectsRendered).toBe(1);
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });
    
    test('should sort renderables by layer', () => {
      const drawCalls = [];
      mockCtx.drawImage.mockImplementation(() => {
        drawCalls.push('sprite');
      });
      mockCtx.arc.mockImplementation(() => {
        drawCalls.push('effect');
      });
      
      // Register objects in reverse layer order
      renderer.registerSprite('back', { image: mockImage, layer: 0 });
      renderer.registerEffect('front', { type: 'explosion', layer: 10 });
      renderer.registerSprite('middle', { image: mockImage, layer: 5 });
      
      renderer.render(mockCtx, mockCamera);
      
      // Should render in layer order: back (0), middle (5), front (10)
      // Note: explosion effect calls arc twice (outer ring and inner flash)
      expect(drawCalls.length).toBeGreaterThanOrEqual(3);
      expect(drawCalls[0]).toBe('sprite'); // back layer
      expect(drawCalls[1]).toBe('sprite'); // middle layer
    });
    
    test('should skip rendering invisible objects', () => {
      renderer.registerSprite('invisible', {
        image: mockImage,
        visible: false,
        x: 100,
        y: 100
      });
      
      renderer.render(mockCtx, mockCamera);
      
      // The sprite should be filtered out due to visible = false
      expect(renderer.spritesRendered).toBe(0);
      expect(mockCtx.drawImage).not.toHaveBeenCalled();
    });
  });
  
  describe('Visibility Culling', () => {
    test('should detect objects in view', () => {
      const inViewObject = { x: 500, y: 400, width: 100, height: 50 };
      
      expect(renderer.isInView(inViewObject, mockCamera)).toBe(true);
    });
    
    test('should detect objects out of view', () => {
      const outOfViewObject = { x: -500, y: -500, width: 100, height: 50 };
      
      expect(renderer.isInView(outOfViewObject, mockCamera)).toBe(false);
    });
    
    test('should use margin for visibility testing', () => {
      const marginObject = { x: -50, y: -50, width: 100, height: 50 };
      
      expect(renderer.isInView(marginObject, mockCamera)).toBe(true);
    });
  });
  
  describe('Statistics and Debug', () => {
    test('should provide rendering statistics', () => {
      renderer.registerSprite('sprite1', { image: mockImage });
      renderer.registerAnimatedSprite('anim1', {
        spriteSheet: mockImage,
        frameWidth: 50,
        frameHeight: 50,
        frames: [{ x: 0, y: 0 }]
      });
      renderer.registerEffect('effect1', { type: 'explosion' });
      
      const stats = renderer.getStats();
      
      expect(stats.sprites).toBe(1);
      expect(stats.animations).toBe(1);
      expect(stats.effects).toBe(1);
      expect(stats.spritesRendered).toBe(0); // Before rendering
      expect(stats.effectsRendered).toBe(0);
    });
    
    test('should render debug information', () => {
      renderer.renderDebug(mockCtx);
      
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalled();
      expect(mockCtx.fillText).toHaveBeenCalledTimes(5);
    });
  });
  
  describe('Cleanup', () => {
    test('should clear all rendering objects', () => {
      renderer.registerSprite('sprite', { image: mockImage });
      renderer.registerAnimatedSprite('anim', {
        spriteSheet: mockImage,
        frameWidth: 50,
        frameHeight: 50,
        frames: [{ x: 0, y: 0 }]
      });
      renderer.registerEffect('effect', { type: 'explosion' });
      
      renderer.clearAll();
      
      expect(renderer.sprites.size).toBe(0);
      expect(renderer.animations.size).toBe(0);
      expect(renderer.effects.size).toBe(0);
    });
  });
});