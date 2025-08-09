/**
 * MechanicalSoundEffects - Generates mechanical sound effects for UI interactions
 * Creates post-apocalyptic audio feedback using Web Audio API
 */
export class MechanicalSoundEffects {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.soundCache = new Map();
    
    // Initialize audio context
    this.initializeAudioContext();
    
    // Sound effect configurations
    this.soundConfigs = {
      buttonClick: {
        type: 'mechanical_click',
        frequency: 200,
        duration: 0.1,
        volume: 0.3
      },
      buttonHover: {
        type: 'metal_scrape',
        frequency: 150,
        duration: 0.05,
        volume: 0.2
      },
      upgradePurchase: {
        type: 'mechanical_clank',
        frequency: 100,
        duration: 0.3,
        volume: 0.4
      },
      menuOpen: {
        type: 'metal_creak',
        frequency: 80,
        duration: 0.4,
        volume: 0.3
      },
      menuClose: {
        type: 'metal_slam',
        frequency: 60,
        duration: 0.2,
        volume: 0.3
      },
      errorSound: {
        type: 'mechanical_buzz',
        frequency: 300,
        duration: 0.5,
        volume: 0.4
      },
      successSound: {
        type: 'mechanical_ding',
        frequency: 400,
        duration: 0.3,
        volume: 0.3
      },
      tabSwitch: {
        type: 'metal_click',
        frequency: 180,
        duration: 0.08,
        volume: 0.25
      }
    };
    
    this.enabled = true;
    this.volume = 1.0;
  }
  
  /**
   * Initialize Web Audio API context
   */
  initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create master gain node
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
      
      // Handle audio context state
      if (this.audioContext.state === 'suspended') {
        // Resume context on first user interaction
        document.addEventListener('click', () => {
          if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
          }
        }, { once: true });
      }
      
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
      this.enabled = false;
    }
  }
  
  /**
   * Generate mechanical click sound
   */
  generateMechanicalClick(frequency, duration, volume) {
    if (!this.enabled || !this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filterNode = this.audioContext.createBiquadFilter();
    
    // Configure oscillator
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      frequency * 0.5, 
      this.audioContext.currentTime + duration * 0.3
    );
    
    // Configure filter for metallic sound
    filterNode.type = 'bandpass';
    filterNode.frequency.setValueAtTime(frequency * 2, this.audioContext.currentTime);
    filterNode.Q.setValueAtTime(5, this.audioContext.currentTime);
    
    // Configure gain envelope
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume * this.volume, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    
    // Connect nodes
    oscillator.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    // Start and stop
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }
  
  /**
   * Generate metal scrape sound
   */
  generateMetalScrape(frequency, duration, volume) {
    if (!this.enabled || !this.audioContext) return;
    
    const noiseBuffer = this.createNoiseBuffer(duration);
    const noiseSource = this.audioContext.createBufferSource();
    const filterNode = this.audioContext.createBiquadFilter();
    const gainNode = this.audioContext.createGain();
    
    noiseSource.buffer = noiseBuffer;
    
    // Configure filter for scraping sound
    filterNode.type = 'highpass';
    filterNode.frequency.setValueAtTime(frequency * 3, this.audioContext.currentTime);
    filterNode.Q.setValueAtTime(2, this.audioContext.currentTime);
    
    // Configure gain
    gainNode.gain.setValueAtTime(volume * this.volume * 0.3, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    
    // Connect nodes
    noiseSource.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    noiseSource.start(this.audioContext.currentTime);
  }
  
  /**
   * Generate mechanical clank sound
   */
  generateMechanicalClank(frequency, duration, volume) {
    if (!this.enabled || !this.audioContext) return;
    
    // Create multiple oscillators for complex metallic sound
    const oscillators = [];
    const frequencies = [frequency, frequency * 1.5, frequency * 2.2, frequency * 3.1];
    
    frequencies.forEach((freq, index) => {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      const filterNode = this.audioContext.createBiquadFilter();
      
      oscillator.type = index % 2 === 0 ? 'square' : 'sawtooth';
      oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
      
      // Add frequency modulation for metallic ring
      oscillator.frequency.exponentialRampToValueAtTime(
        freq * 0.7, 
        this.audioContext.currentTime + duration * 0.8
      );
      
      // Configure filter
      filterNode.type = 'bandpass';
      filterNode.frequency.setValueAtTime(freq * 1.5, this.audioContext.currentTime);
      filterNode.Q.setValueAtTime(3, this.audioContext.currentTime);
      
      // Configure gain with different envelopes
      const volumeMultiplier = 1 / (index + 1);
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        volume * this.volume * volumeMultiplier, 
        this.audioContext.currentTime + 0.02
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001, 
        this.audioContext.currentTime + duration * (0.5 + index * 0.2)
      );
      
      // Connect nodes
      oscillator.connect(filterNode);
      filterNode.connect(gainNode);
      gainNode.connect(this.masterGain);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
      
      oscillators.push({ oscillator, gainNode, filterNode });
    });
  }
  
  /**
   * Generate metal creak sound
   */
  generateMetalCreak(frequency, duration, volume) {
    if (!this.enabled || !this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filterNode = this.audioContext.createBiquadFilter();
    const lfoOscillator = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();
    
    // Main oscillator
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    
    // LFO for creaking effect
    lfoOscillator.type = 'sine';
    lfoOscillator.frequency.setValueAtTime(8, this.audioContext.currentTime);
    lfoGain.gain.setValueAtTime(frequency * 0.3, this.audioContext.currentTime);
    
    // Connect LFO to main oscillator frequency
    lfoOscillator.connect(lfoGain);
    lfoGain.connect(oscillator.frequency);
    
    // Configure filter
    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(frequency * 4, this.audioContext.currentTime);
    filterNode.Q.setValueAtTime(1, this.audioContext.currentTime);
    
    // Configure gain envelope
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume * this.volume, this.audioContext.currentTime + duration * 0.3);
    gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
    
    // Connect nodes
    oscillator.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    // Start oscillators
    lfoOscillator.start(this.audioContext.currentTime);
    oscillator.start(this.audioContext.currentTime);
    
    // Stop oscillators
    lfoOscillator.stop(this.audioContext.currentTime + duration);
    oscillator.stop(this.audioContext.currentTime + duration);
  }
  
  /**
   * Generate mechanical buzz sound
   */
  generateMechanicalBuzz(frequency, duration, volume) {
    if (!this.enabled || !this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filterNode = this.audioContext.createBiquadFilter();
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    
    // Add frequency modulation for buzzing effect
    const lfoOscillator = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();
    
    lfoOscillator.type = 'sine';
    lfoOscillator.frequency.setValueAtTime(15, this.audioContext.currentTime);
    lfoGain.gain.setValueAtTime(frequency * 0.1, this.audioContext.currentTime);
    
    lfoOscillator.connect(lfoGain);
    lfoGain.connect(oscillator.frequency);
    
    // Configure filter
    filterNode.type = 'bandpass';
    filterNode.frequency.setValueAtTime(frequency * 2, this.audioContext.currentTime);
    filterNode.Q.setValueAtTime(8, this.audioContext.currentTime);
    
    // Configure gain with pulsing envelope
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    
    const pulseCount = Math.floor(duration * 10);
    for (let i = 0; i < pulseCount; i++) {
      const pulseTime = this.audioContext.currentTime + (i / pulseCount) * duration;
      gainNode.gain.linearRampToValueAtTime(volume * this.volume, pulseTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, pulseTime + 0.05);
    }
    
    // Connect nodes
    oscillator.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(this.masterGain);
    
    lfoOscillator.start(this.audioContext.currentTime);
    oscillator.start(this.audioContext.currentTime);
    
    lfoOscillator.stop(this.audioContext.currentTime + duration);
    oscillator.stop(this.audioContext.currentTime + duration);
  }
  
  /**
   * Create noise buffer for scraping sounds
   */
  createNoiseBuffer(duration) {
    const sampleRate = this.audioContext.sampleRate;
    const bufferLength = sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferLength, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferLength; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    
    return buffer;
  }
  
  /**
   * Play sound effect by name
   */
  playSound(soundName) {
    if (!this.enabled || !this.soundConfigs[soundName]) return;
    
    const config = this.soundConfigs[soundName];
    
    switch (config.type) {
      case 'mechanical_click':
      case 'metal_click':
        this.generateMechanicalClick(config.frequency, config.duration, config.volume);
        break;
      case 'metal_scrape':
        this.generateMetalScrape(config.frequency, config.duration, config.volume);
        break;
      case 'mechanical_clank':
        this.generateMechanicalClank(config.frequency, config.duration, config.volume);
        break;
      case 'metal_creak':
        this.generateMetalCreak(config.frequency, config.duration, config.volume);
        break;
      case 'metal_slam':
        this.generateMechanicalClick(config.frequency, config.duration, config.volume * 1.5);
        break;
      case 'mechanical_buzz':
        this.generateMechanicalBuzz(config.frequency, config.duration, config.volume);
        break;
      case 'mechanical_ding':
        this.generateMechanicalClick(config.frequency * 2, config.duration, config.volume);
        break;
    }
  }
  
  /**
   * Set master volume
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.volume * 0.5, this.audioContext.currentTime);
    }
  }
  
  /**
   * Enable/disable sound effects
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }
  
  /**
   * Add UI event listeners for automatic sound effects
   */
  attachToUIElements() {
    // Button click sounds
    document.addEventListener('click', (event) => {
      if (event.target.classList.contains('apocalypse-button')) {
        this.playSound('buttonClick');
      }
    });
    
    // Button hover sounds
    document.addEventListener('mouseover', (event) => {
      if (event.target.classList.contains('apocalypse-button')) {
        this.playSound('buttonHover');
      }
    });
    
    // Tab switch sounds
    document.addEventListener('click', (event) => {
      if (event.target.classList.contains('apocalypse-tab')) {
        this.playSound('tabSwitch');
      }
    });
    
    // Menu open/close sounds
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && 
              node.classList && node.classList.contains('apocalypse-menu')) {
            this.playSound('menuOpen');
          }
        });
        
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && 
              node.classList && node.classList.contains('apocalypse-menu')) {
            this.playSound('menuClose');
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }
  
  /**
   * Get current audio status
   */
  getAudioStatus() {
    return {
      enabled: this.enabled,
      volume: this.volume,
      contextState: this.audioContext ? this.audioContext.state : 'unavailable',
      supportedSounds: Object.keys(this.soundConfigs)
    };
  }
}