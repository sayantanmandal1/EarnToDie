import { MechanicalSoundEffects } from '../MechanicalSoundEffects.js';

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
    frequency: {
      setValueAtTime: jest.fn()
    },
    Q: {
      setValueAtTime: jest.fn()
    },
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
  
  decodeAudioData: jest.fn(),
  resume: jest.fn()
};

// Mock global AudioContext
global.AudioContext = jest.fn(() => mockAudioContext);
global.webkitAudioContext = jest.fn(() => mockAudioContext);

// Mock document for event listeners
global.document = {
  addEventListener: jest.fn(),
  body: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  }
};

// Mock MutationObserver
global.MutationObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn()
}));

describe('MechanicalSoundEffects', () => {
  let soundEffects;
  
  beforeEach(() => {
    jest.clearAllMocks();
    soundEffects = new MechanicalSoundEffects();
  });
  
  describe('Initialization', () => {
    test('should initialize audio context', () => {
      expect(global.AudioContext).toHaveBeenCalled();
      expect(soundEffects.audioContext).toBe(mockAudioContext);
      expect(soundEffects.enabled).toBe(true);
    });
    
    test('should create master gain node', () => {
      expect(mockAudioContext.createGain).toHaveBeenCalled();
      expect(soundEffects.masterGain).toBeDefined();
    });
    
    test('should have sound configurations', () => {
      const configs = soundEffects.soundConfigs;
      
      expect(configs).toHaveProperty('buttonClick');
      expect(configs).toHaveProperty('buttonHover');
      expect(configs).toHaveProperty('upgradePurchase');
      expect(configs).toHaveProperty('menuOpen');
      expect(configs).toHaveProperty('menuClose');
      expect(configs).toHaveProperty('errorSound');
      expect(configs).toHaveProperty('successSound');
    });
    
    test('should handle audio context initialization failure', () => {
      global.AudioContext = jest.fn(() => {
        throw new Error('Audio not supported');
      });
      
      const failedSoundEffects = new MechanicalSoundEffects();
      expect(failedSoundEffects.enabled).toBe(false);
    });
  });
  
  describe('Sound Generation', () => {
    test('should generate mechanical click sound', () => {
      soundEffects.generateMechanicalClick(200, 0.1, 0.3);
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();
      expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();
    });
    
    test('should generate metal scrape sound', () => {
      soundEffects.generateMetalScrape(150, 0.05, 0.2);
      
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
      expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });
    
    test('should generate mechanical clank sound', () => {
      soundEffects.generateMechanicalClank(100, 0.3, 0.4);
      
      // Should create multiple oscillators for complex sound
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(4);
      expect(mockAudioContext.createGain).toHaveBeenCalledTimes(4);
      expect(mockAudioContext.createBiquadFilter).toHaveBeenCalledTimes(4);
    });
    
    test('should generate metal creak sound', () => {
      soundEffects.generateMetalCreak(80, 0.4, 0.3);
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(2); // Main + LFO
      expect(mockAudioContext.createGain).toHaveBeenCalledTimes(2);
      expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();
    });
    
    test('should generate mechanical buzz sound', () => {
      soundEffects.generateMechanicalBuzz(300, 0.5, 0.4);
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(2); // Main + LFO
      expect(mockAudioContext.createGain).toHaveBeenCalledTimes(2);
      expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();
    });
    
    test('should not generate sounds when disabled', () => {
      soundEffects.setEnabled(false);
      soundEffects.generateMechanicalClick(200, 0.1, 0.3);
      
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });
  });
  
  describe('Sound Playback', () => {
    test('should play button click sound', () => {
      soundEffects.playSound('buttonClick');
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockAudioContext.createBiquadFilter).toHaveBeenCalled();
    });
    
    test('should play button hover sound', () => {
      soundEffects.playSound('buttonHover');
      
      expect(mockAudioContext.createBufferSource).toHaveBeenCalled();
    });
    
    test('should play upgrade purchase sound', () => {
      soundEffects.playSound('upgradePurchase');
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(4);
    });
    
    test('should play menu open sound', () => {
      soundEffects.playSound('menuOpen');
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(2);
    });
    
    test('should play error sound', () => {
      soundEffects.playSound('errorSound');
      
      expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(2);
    });
    
    test('should not play invalid sound', () => {
      const oscillatorCallsBefore = mockAudioContext.createOscillator.mock.calls.length;
      
      soundEffects.playSound('invalidSound');
      
      expect(mockAudioContext.createOscillator.mock.calls.length).toBe(oscillatorCallsBefore);
    });
  });
  
  describe('Volume Control', () => {
    test('should set master volume', () => {
      soundEffects.setVolume(0.7);
      
      expect(soundEffects.volume).toBe(0.7);
      expect(soundEffects.masterGain.gain.setValueAtTime).toHaveBeenCalledWith(
        0.35, // 0.7 * 0.5
        mockAudioContext.currentTime
      );
    });
    
    test('should clamp volume to valid range', () => {
      soundEffects.setVolume(1.5);
      expect(soundEffects.volume).toBe(1);
      
      soundEffects.setVolume(-0.5);
      expect(soundEffects.volume).toBe(0);
    });
    
    test('should apply volume to sound generation', () => {
      soundEffects.setVolume(0.5);
      soundEffects.generateMechanicalClick(200, 0.1, 0.3);
      
      // Volume should be applied in gain calculations
      expect(mockAudioContext.createGain).toHaveBeenCalled();
    });
  });
  
  describe('Enable/Disable', () => {
    test('should enable sound effects', () => {
      soundEffects.setEnabled(true);
      expect(soundEffects.enabled).toBe(true);
    });
    
    test('should disable sound effects', () => {
      soundEffects.setEnabled(false);
      expect(soundEffects.enabled).toBe(false);
    });
    
    test('should not play sounds when disabled', () => {
      soundEffects.setEnabled(false);
      const oscillatorCallsBefore = mockAudioContext.createOscillator.mock.calls.length;
      
      soundEffects.playSound('buttonClick');
      
      expect(mockAudioContext.createOscillator.mock.calls.length).toBe(oscillatorCallsBefore);
    });
  });
  
  describe('Noise Buffer Creation', () => {
    test('should create noise buffer', () => {
      const buffer = soundEffects.createNoiseBuffer(0.1);
      
      expect(mockAudioContext.createBuffer).toHaveBeenCalledWith(
        1, // channels
        4410, // buffer length (0.1 * 44100)
        44100 // sample rate
      );
    });
    
    test('should fill buffer with noise data', () => {
      const mockChannelData = new Float32Array(1024);
      mockAudioContext.createBuffer.mockReturnValueOnce({
        getChannelData: jest.fn(() => mockChannelData)
      });
      
      soundEffects.createNoiseBuffer(0.1);
      
      // Should have filled the buffer with random data
      expect(mockChannelData.some(value => value !== 0)).toBe(true);
    });
  });
  
  describe('UI Integration', () => {
    test('should attach to UI elements', () => {
      soundEffects.attachToUIElements();
      
      expect(document.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(document.addEventListener).toHaveBeenCalledWith('mouseover', expect.any(Function));
      expect(global.MutationObserver).toHaveBeenCalled();
    });
    
    test('should handle button click events', () => {
      soundEffects.attachToUIElements();
      
      // Get the click event handler
      const clickHandler = document.addEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1];
      
      // Mock button click event
      const mockEvent = {
        target: {
          classList: {
            contains: jest.fn(() => true)
          }
        }
      };
      
      const playSound = jest.spyOn(soundEffects, 'playSound');
      clickHandler(mockEvent);
      
      expect(playSound).toHaveBeenCalledWith('buttonClick');
    });
    
    test('should handle button hover events', () => {
      soundEffects.attachToUIElements();
      
      // Get the mouseover event handler
      const hoverHandler = document.addEventListener.mock.calls.find(
        call => call[0] === 'mouseover'
      )[1];
      
      // Mock button hover event
      const mockEvent = {
        target: {
          classList: {
            contains: jest.fn(() => true)
          }
        }
      };
      
      const playSound = jest.spyOn(soundEffects, 'playSound');
      hoverHandler(mockEvent);
      
      expect(playSound).toHaveBeenCalledWith('buttonHover');
    });
  });
  
  describe('Audio Status', () => {
    test('should get audio status', () => {
      const status = soundEffects.getAudioStatus();
      
      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('volume');
      expect(status).toHaveProperty('contextState');
      expect(status).toHaveProperty('supportedSounds');
      
      expect(status.enabled).toBe(true);
      expect(status.volume).toBe(1.0);
      expect(status.contextState).toBe('running');
      expect(Array.isArray(status.supportedSounds)).toBe(true);
    });
    
    test('should report unavailable context when audio fails', () => {
      const failedSoundEffects = new MechanicalSoundEffects();
      failedSoundEffects.audioContext = null;
      
      const status = failedSoundEffects.getAudioStatus();
      expect(status.contextState).toBe('unavailable');
    });
  });
  
  describe('Audio Context State Handling', () => {
    test('should handle suspended audio context', () => {
      mockAudioContext.state = 'suspended';
      const suspendedSoundEffects = new MechanicalSoundEffects();
      
      expect(document.addEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        { once: true }
      );
    });
    
    test('should resume suspended context on user interaction', () => {
      mockAudioContext.state = 'suspended';
      const suspendedSoundEffects = new MechanicalSoundEffects();
      
      // Get the click handler for resuming context
      const resumeHandler = document.addEventListener.mock.calls.find(
        call => call[0] === 'click' && call[2] && call[2].once
      )[1];
      
      resumeHandler();
      
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });
  });
  
  describe('Performance', () => {
    test('should handle rapid sound playback', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 50; i++) {
        soundEffects.playSound('buttonClick');
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100);
    });
    
    test('should not create excessive audio nodes', () => {
      const initialCalls = mockAudioContext.createOscillator.mock.calls.length;
      
      soundEffects.playSound('buttonClick');
      soundEffects.playSound('buttonHover');
      
      const finalCalls = mockAudioContext.createOscillator.mock.calls.length;
      expect(finalCalls - initialCalls).toBeLessThan(10);
    });
  });
  
  describe('Error Handling', () => {
    test('should handle audio context creation failure gracefully', () => {
      global.AudioContext = jest.fn(() => {
        throw new Error('Audio not supported');
      });
      
      expect(() => {
        new MechanicalSoundEffects();
      }).not.toThrow();
    });
    
    test('should handle missing master gain gracefully', () => {
      soundEffects.masterGain = null;
      
      expect(() => {
        soundEffects.setVolume(0.5);
      }).not.toThrow();
    });
    
    test('should handle invalid sound configurations', () => {
      soundEffects.soundConfigs.invalidSound = {
        type: 'unknown_type',
        frequency: 100,
        duration: 0.1,
        volume: 0.3
      };
      
      expect(() => {
        soundEffects.playSound('invalidSound');
      }).not.toThrow();
    });
  });
  
  describe('Sound Configuration', () => {
    test('should have appropriate frequencies for different sounds', () => {
      const configs = soundEffects.soundConfigs;
      
      expect(configs.buttonClick.frequency).toBeGreaterThan(configs.menuOpen.frequency);
      expect(configs.errorSound.frequency).toBeGreaterThan(configs.successSound.frequency);
    });
    
    test('should have appropriate durations for different sounds', () => {
      const configs = soundEffects.soundConfigs;
      
      expect(configs.buttonHover.duration).toBeLessThan(configs.upgradePurchase.duration);
      expect(configs.tabSwitch.duration).toBeLessThan(configs.menuOpen.duration);
    });
    
    test('should have appropriate volumes for different sounds', () => {
      const configs = soundEffects.soundConfigs;
      
      expect(configs.buttonHover.volume).toBeLessThan(configs.upgradePurchase.volume);
      expect(configs.tabSwitch.volume).toBeLessThan(configs.errorSound.volume);
    });
  });
});