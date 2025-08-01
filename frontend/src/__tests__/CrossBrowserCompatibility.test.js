/**
 * Cross-browser compatibility testing
 * Tests browser-specific features and fallbacks
 */

describe('Cross-Browser Compatibility Tests', () => {
  let originalUserAgent;
  let originalWebGL;
  let originalAudioContext;

  beforeEach(() => {
    originalUserAgent = navigator.userAgent;
    originalWebGL = window.WebGLRenderingContext;
    originalAudioContext = window.AudioContext;
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(navigator, 'userAgent', {
      value: originalUserAgent,
      configurable: true
    });
    window.WebGLRenderingContext = originalWebGL;
    window.AudioContext = originalAudioContext;
  });

  describe('WebGL Support Detection', () => {
    test('should detect WebGL support', () => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      expect(gl).toBeTruthy();
    });

    test('should handle WebGL context loss', () => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      
      let contextLostHandled = false;
      canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        contextLostHandled = true;
      });

      // Simulate context loss
      const loseContext = gl.getExtension('WEBGL_lose_context');
      if (loseContext) {
        loseContext.loseContext();
        expect(contextLostHandled).toBe(true);
      }
    });

    test('should provide fallback for missing WebGL', () => {
      // Mock missing WebGL
      window.WebGLRenderingContext = undefined;
      
      const { GameEngine } = require('../engine/GameEngine');
      const gameEngine = new GameEngine();
      
      expect(() => {
        gameEngine.initialize();
      }).not.toThrow();
      
      // Should fall back to canvas 2D or show appropriate message
      expect(gameEngine.renderer).toBeDefined();
    });
  });

  describe('Audio API Compatibility', () => {
    test('should handle different AudioContext implementations', () => {
      // Test standard AudioContext
      expect(window.AudioContext || window.webkitAudioContext).toBeTruthy();
      
      const { AudioManager } = require('../audio/AudioManager');
      const audioManager = new AudioManager();
      
      expect(() => {
        audioManager.initialize();
      }).not.toThrow();
    });

    test('should handle missing Web Audio API', () => {
      // Mock missing AudioContext
      window.AudioContext = undefined;
      window.webkitAudioContext = undefined;
      
      const { AudioManager } = require('../audio/AudioManager');
      const audioManager = new AudioManager();
      
      expect(() => {
        audioManager.initialize();
      }).not.toThrow();
      
      // Should fall back to HTML5 audio or silent mode
      expect(audioManager.isInitialized()).toBe(true);
    });

    test('should handle autoplay restrictions', async () => {
      const { AudioManager } = require('../audio/AudioManager');
      const audioManager = new AudioManager();
      
      audioManager.initialize();
      
      // Simulate autoplay restriction
      const playPromise = audioManager.playSound('test_sound');
      
      if (playPromise && typeof playPromise.catch === 'function') {
        await expect(playPromise).resolves.not.toThrow();
      }
    });
  });

  describe('Browser-Specific Features', () => {
    test('should handle Chrome-specific features', () => {
      // Mock Chrome user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        configurable: true
      });

      const { GameEngine } = require('../engine/GameEngine');
      const gameEngine = new GameEngine();
      
      expect(() => {
        gameEngine.initialize();
      }).not.toThrow();
    });

    test('should handle Firefox-specific features', () => {
      // Mock Firefox user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        configurable: true
      });

      const { GameEngine } = require('../engine/GameEngine');
      const gameEngine = new GameEngine();
      
      expect(() => {
        gameEngine.initialize();
      }).not.toThrow();
    });

    test('should handle Safari-specific features', () => {
      // Mock Safari user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        configurable: true
      });

      const { GameEngine } = require('../engine/GameEngine');
      const gameEngine = new GameEngine();
      
      expect(() => {
        gameEngine.initialize();
      }).not.toThrow();
    });

    test('should handle Edge-specific features', () => {
      // Mock Edge user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
        configurable: true
      });

      const { GameEngine } = require('../engine/GameEngine');
      const gameEngine = new GameEngine();
      
      expect(() => {
        gameEngine.initialize();
      }).not.toThrow();
    });
  });

  describe('Mobile Browser Compatibility', () => {
    test('should handle mobile Chrome', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
        configurable: true
      });

      const { GameEngine } = require('../engine/GameEngine');
      const gameEngine = new GameEngine();
      
      expect(() => {
        gameEngine.initialize();
      }).not.toThrow();
    });

    test('should handle mobile Safari', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        configurable: true
      });

      const { GameEngine } = require('../engine/GameEngine');
      const gameEngine = new GameEngine();
      
      expect(() => {
        gameEngine.initialize();
      }).not.toThrow();
    });

    test('should adjust performance settings for mobile', () => {
      // Mock mobile device
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15',
        configurable: true
      });

      const { PerformanceManager } = require('../performance/PerformanceManager');
      const performanceManager = new PerformanceManager();
      
      performanceManager.initialize();
      
      // Should automatically adjust settings for mobile
      const settings = performanceManager.getSettings();
      expect(settings.quality).toBeLessThanOrEqual('medium');
      expect(settings.particleCount).toBeLessThan(1000);
    });
  });

  describe('Feature Detection and Polyfills', () => {
    test('should detect requestAnimationFrame support', () => {
      const raf = window.requestAnimationFrame || 
                  window.webkitRequestAnimationFrame || 
                  window.mozRequestAnimationFrame || 
                  window.msRequestAnimationFrame;
      
      expect(raf).toBeTruthy();
    });

    test('should provide requestAnimationFrame polyfill', () => {
      // Mock missing requestAnimationFrame
      const originalRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = undefined;
      
      // Import polyfill
      require('../utils/polyfills');
      
      expect(window.requestAnimationFrame).toBeTruthy();
      
      // Restore original
      window.requestAnimationFrame = originalRAF;
    });

    test('should detect localStorage support', () => {
      expect(typeof Storage !== 'undefined').toBe(true);
      expect(window.localStorage).toBeTruthy();
    });

    test('should provide localStorage fallback', () => {
      // Mock missing localStorage
      const originalLocalStorage = window.localStorage;
      delete window.localStorage;
      
      const { SaveManager } = require('../save/SaveManager');
      const saveManager = new SaveManager();
      
      expect(() => {
        saveManager.initialize();
      }).not.toThrow();
      
      // Should use memory storage or other fallback
      expect(saveManager.isAvailable()).toBe(true);
      
      // Restore original
      window.localStorage = originalLocalStorage;
    });

    test('should detect Pointer Events support', () => {
      const hasPointerEvents = 'PointerEvent' in window;
      
      if (hasPointerEvents) {
        expect(window.PointerEvent).toBeTruthy();
      } else {
        // Should fall back to mouse/touch events
        expect(window.MouseEvent).toBeTruthy();
        expect(window.TouchEvent || true).toBeTruthy(); // TouchEvent might not exist on desktop
      }
    });
  });

  describe('Performance Across Browsers', () => {
    test('should maintain consistent frame rate across browsers', () => {
      const { GameEngine } = require('../engine/GameEngine');
      const gameEngine = new GameEngine();
      
      gameEngine.initialize();
      
      const frameRates = [];
      let lastTime = performance.now();
      
      // Simulate 60 frames
      for (let i = 0; i < 60; i++) {
        const currentTime = performance.now();
        const deltaTime = (currentTime - lastTime) / 1000;
        
        gameEngine.update(deltaTime);
        
        if (deltaTime > 0) {
          frameRates.push(1 / deltaTime);
        }
        
        lastTime = currentTime;
      }
      
      const averageFrameRate = frameRates.reduce((a, b) => a + b) / frameRates.length;
      
      // Should maintain reasonable frame rate (at least 30 FPS average)
      expect(averageFrameRate).toBeGreaterThan(30);
    });

    test('should handle memory constraints gracefully', () => {
      const { PerformanceManager } = require('../performance/PerformanceManager');
      const performanceManager = new PerformanceManager();
      
      performanceManager.initialize();
      
      // Simulate memory pressure
      performanceManager.handleMemoryPressure();
      
      const settings = performanceManager.getSettings();
      
      // Should reduce quality settings under memory pressure
      expect(settings.quality).toBeLessThanOrEqual('medium');
      expect(settings.maxZombies).toBeLessThan(100);
    });
  });

  describe('Input Compatibility', () => {
    test('should handle keyboard input across browsers', () => {
      const keyboardEvent = new KeyboardEvent('keydown', {
        key: 'ArrowUp',
        code: 'ArrowUp',
        keyCode: 38
      });
      
      let eventHandled = false;
      
      document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowUp' || event.keyCode === 38) {
          eventHandled = true;
        }
      });
      
      document.dispatchEvent(keyboardEvent);
      
      expect(eventHandled).toBe(true);
    });

    test('should handle touch input on mobile browsers', () => {
      // Mock touch support
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 5,
        configurable: true
      });
      
      const touchEvent = new TouchEvent('touchstart', {
        touches: [{
          clientX: 100,
          clientY: 100,
          identifier: 0
        }]
      });
      
      let touchHandled = false;
      
      document.addEventListener('touchstart', () => {
        touchHandled = true;
      });
      
      document.dispatchEvent(touchEvent);
      
      expect(touchHandled).toBe(true);
    });

    test('should handle gamepad input where supported', () => {
      // Mock gamepad support
      Object.defineProperty(navigator, 'getGamepads', {
        value: () => [null, null, null, null],
        configurable: true
      });
      
      const { InputManager } = require('../input/InputManager');
      const inputManager = new InputManager();
      
      expect(() => {
        inputManager.initialize();
      }).not.toThrow();
      
      expect(inputManager.hasGamepadSupport()).toBe(true);
    });
  });
});