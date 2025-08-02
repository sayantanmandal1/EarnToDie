/**
 * Professional Audio Asset Integration System
 * Handles sourcing, loading, and integration of high-quality audio assets
 */

import { assetManager } from '../assets/AssetManager.js';
import { electronIntegration } from '../electron/ElectronIntegration.js';

export class AudioAssetIntegration {
    constructor() {
        this.logger = electronIntegration.getLogger();
        this.audioContext = null;
        this.audioBuffers = new Map();
        this.audioSources = new Map();
        this.audioCategories = {
            engine: new Map(),
            impacts: new Map(),
            zombies: new Map(),
            music: new Map(),
            ui: new Map(),
            environment: new Map()
        };
        
        // Audio quality specifications
        this.audioSpecs = {
            engine: {
                sampleRate: 44100,
                bitDepth: 16,
                channels: 2,
                format: 'mp3',
                quality: 'high',
                compression: 'vbr'
            },
            impacts: {
                sampleRate: 44100,
                bitDepth: 16,
                channels: 1,
                format: 'mp3',
                quality: 'high',
                compression: 'cbr'
            },
            zombies: {
                sampleRate: 44100,
                bitDepth: 16,
                channels: 1,
                format: 'mp3',
                quality: 'high',
                compression: 'vbr'
            },
            music: {
                sampleRate: 44100,
                bitDepth: 16,
                channels: 2,
                format: 'mp3',
                quality: 'ultra',
                compression: 'vbr'
            }
        };
        
        this.isInitialized = false;
    }

    /**
     * Initialize audio asset integration system
     */
    async initialize() {
        try {
            this.logger.info('Initializing AudioAssetIntegration...');
            
            // Initialize Web Audio API
            await this.initializeAudioContext();
            
            // Load audio asset manifest
            await this.loadAudioManifest();
            
            // Create placeholder audio assets
            await this.createPlaceholderAudioAssets();
            
            // Integrate with asset manager
            await this.integrateWithAssetManager();
            
            this.isInitialized = true;
            this.logger.info('AudioAssetIntegration initialized successfully');
            
            return true;
            
        } catch (error) {
            this.logger.error('Failed to initialize AudioAssetIntegration:', error);
            throw error;
        }
    }

    /**
     * Initialize Web Audio API context
     */
    async initializeAudioContext() {
        try {
            if (window.AudioContext || window.webkitAudioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // Resume context if suspended (required by some browsers)
                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }
                
                this.logger.info('Web Audio API initialized:', {
                    sampleRate: this.audioContext.sampleRate,
                    state: this.audioContext.state
                });
            } else {
                this.logger.warn('Web Audio API not supported, using fallback');
            }
        } catch (error) {
            this.logger.error('Failed to initialize audio context:', error);
            throw error;
        }
    }

    /**
     * Load audio asset manifest
     */
    async loadAudioManifest() {
        try {
            // Define comprehensive audio asset requirements
            this.audioManifest = {
                engine: {
                    // V8 Engine Sounds
                    v8_start: {
                        description: 'V8 engine startup sequence',
                        duration: 3.5,
                        loop: false,
                        volume: 0.8,
                        priority: 'critical',
                        variants: ['cold_start', 'warm_start']
                    },
                    v8_idle: {
                        description: 'V8 engine idle loop',
                        duration: 5.0,
                        loop: true,
                        volume: 0.6,
                        priority: 'critical',
                        rpm_range: [800, 1200]
                    },
                    v8_rev_low: {
                        description: 'V8 engine low RPM revving',
                        duration: 2.0,
                        loop: false,
                        volume: 0.7,
                        priority: 'high',
                        rpm_range: [1200, 3000]
                    },
                    v8_rev_high: {
                        description: 'V8 engine high RPM revving',
                        duration: 2.5,
                        loop: false,
                        volume: 0.9,
                        priority: 'high',
                        rpm_range: [3000, 6000]
                    },
                    v8_redline: {
                        description: 'V8 engine redline',
                        duration: 1.5,
                        loop: false,
                        volume: 1.0,
                        priority: 'medium',
                        rpm_range: [6000, 7500]
                    },
                    
                    // V6 Engine Sounds
                    v6_start: {
                        description: 'V6 engine startup sequence',
                        duration: 2.8,
                        loop: false,
                        volume: 0.7,
                        priority: 'high'
                    },
                    v6_idle: {
                        description: 'V6 engine idle loop',
                        duration: 4.0,
                        loop: true,
                        volume: 0.5,
                        priority: 'high',
                        rpm_range: [750, 1100]
                    },
                    v6_rev: {
                        description: 'V6 engine revving',
                        duration: 2.2,
                        loop: false,
                        volume: 0.8,
                        priority: 'medium',
                        rpm_range: [1100, 5500]
                    },
                    
                    // Diesel Engine Sounds
                    diesel_start: {
                        description: 'Diesel engine startup with characteristic knock',
                        duration: 4.0,
                        loop: false,
                        volume: 0.8,
                        priority: 'medium'
                    },
                    diesel_idle: {
                        description: 'Diesel engine idle with knock',
                        duration: 6.0,
                        loop: true,
                        volume: 0.6,
                        priority: 'medium',
                        rpm_range: [600, 900]
                    },
                    diesel_rev: {
                        description: 'Diesel engine revving',
                        duration: 3.0,
                        loop: false,
                        volume: 0.9,
                        priority: 'medium',
                        rpm_range: [900, 4000]
                    },
                    
                    // Transmission and Mechanical
                    gear_shift: {
                        description: 'Manual transmission gear shift',
                        duration: 0.5,
                        loop: false,
                        volume: 0.4,
                        priority: 'medium',
                        variants: ['up_shift', 'down_shift']
                    },
                    turbo_whistle: {
                        description: 'Turbocharger whistle and blow-off',
                        duration: 1.2,
                        loop: false,
                        volume: 0.6,
                        priority: 'low'
                    }
                },
                
                impacts: {
                    // Vehicle Collision Sounds
                    metal_crunch_light: {
                        description: 'Light metal impact and deformation',
                        duration: 1.0,
                        loop: false,
                        volume: 0.7,
                        priority: 'critical',
                        impact_force: 'low'
                    },
                    metal_crunch_heavy: {
                        description: 'Heavy metal collision with crushing',
                        duration: 2.0,
                        loop: false,
                        volume: 0.9,
                        priority: 'critical',
                        impact_force: 'high'
                    },
                    glass_shatter: {
                        description: 'Window and windshield shattering',
                        duration: 1.5,
                        loop: false,
                        volume: 0.8,
                        priority: 'high',
                        variants: ['windshield', 'side_window', 'rear_window']
                    },
                    tire_screech: {
                        description: 'Tire screeching on asphalt',
                        duration: 2.5,
                        loop: true,
                        volume: 0.8,
                        priority: 'high',
                        surface: 'asphalt'
                    },
                    brake_squeal: {
                        description: 'Brake pad squealing',
                        duration: 1.8,
                        loop: false,
                        volume: 0.6,
                        priority: 'medium'
                    },
                    
                    // Zombie Impact Sounds
                    flesh_impact_soft: {
                        description: 'Soft flesh impact (low speed)',
                        duration: 0.8,
                        loop: false,
                        volume: 0.6,
                        priority: 'critical',
                        gore_level: 'low'
                    },
                    flesh_impact_hard: {
                        description: 'Hard flesh impact with bone crack',
                        duration: 1.2,
                        loop: false,
                        volume: 0.8,
                        priority: 'critical',
                        gore_level: 'medium'
                    },
                    bone_crack: {
                        description: 'Bone breaking and cracking',
                        duration: 0.6,
                        loop: false,
                        volume: 0.7,
                        priority: 'high',
                        gore_level: 'high'
                    },
                    splatter: {
                        description: 'Blood and gore splatter',
                        duration: 1.0,
                        loop: false,
                        volume: 0.5,
                        priority: 'medium',
                        gore_level: 'high'
                    }
                },
                
                zombies: {
                    // Zombie Vocalizations
                    groan_low: {
                        description: 'Low, menacing zombie groan',
                        duration: 3.0,
                        loop: false,
                        volume: 0.7,
                        priority: 'critical',
                        threat_level: 'low'
                    },
                    groan_aggressive: {
                        description: 'Aggressive zombie growl',
                        duration: 2.5,
                        loop: false,
                        volume: 0.8,
                        priority: 'critical',
                        threat_level: 'high'
                    },
                    scream_attack: {
                        description: 'Zombie attack scream',
                        duration: 2.0,
                        loop: false,
                        volume: 0.9,
                        priority: 'critical',
                        threat_level: 'critical'
                    },
                    death_rattle: {
                        description: 'Zombie death sound',
                        duration: 2.8,
                        loop: false,
                        volume: 0.6,
                        priority: 'high'
                    },
                    horde_ambient: {
                        description: 'Distant zombie horde sounds',
                        duration: 10.0,
                        loop: true,
                        volume: 0.4,
                        priority: 'medium',
                        distance: 'far'
                    },
                    
                    // Zombie Movement
                    footsteps_shamble: {
                        description: 'Zombie shambling footsteps',
                        duration: 1.0,
                        loop: true,
                        volume: 0.5,
                        priority: 'medium',
                        movement_type: 'walk'
                    },
                    footsteps_run: {
                        description: 'Fast zombie running footsteps',
                        duration: 0.8,
                        loop: true,
                        volume: 0.6,
                        priority: 'high',
                        movement_type: 'run'
                    }
                },
                
                music: {
                    // Menu Music
                    main_menu_orchestral: {
                        description: 'Epic orchestral main menu theme',
                        duration: 180.0,
                        loop: true,
                        volume: 0.6,
                        priority: 'medium',
                        mood: 'epic',
                        instrumentation: 'full_orchestra'
                    },
                    main_menu_electronic: {
                        description: 'Dark electronic main menu theme',
                        duration: 200.0,
                        loop: true,
                        volume: 0.5,
                        priority: 'low',
                        mood: 'dark',
                        instrumentation: 'electronic'
                    },
                    
                    // Gameplay Music
                    gameplay_calm_orchestral: {
                        description: 'Calm exploration orchestral music',
                        duration: 240.0,
                        loop: true,
                        volume: 0.4,
                        priority: 'medium',
                        mood: 'calm',
                        intensity: 'low'
                    },
                    gameplay_tension_electronic: {
                        description: 'Building tension electronic music',
                        duration: 180.0,
                        loop: true,
                        volume: 0.5,
                        priority: 'high',
                        mood: 'tense',
                        intensity: 'medium'
                    },
                    gameplay_action_hybrid: {
                        description: 'High-intensity hybrid orchestral/electronic',
                        duration: 220.0,
                        loop: true,
                        volume: 0.7,
                        priority: 'high',
                        mood: 'action',
                        intensity: 'high'
                    },
                    gameplay_horror_ambient: {
                        description: 'Horror ambient soundscape',
                        duration: 300.0,
                        loop: true,
                        volume: 0.3,
                        priority: 'medium',
                        mood: 'horror',
                        intensity: 'atmospheric'
                    },
                    
                    // Special Moments
                    victory_fanfare: {
                        description: 'Level completion victory fanfare',
                        duration: 15.0,
                        loop: false,
                        volume: 0.8,
                        priority: 'high',
                        mood: 'triumphant'
                    },
                    game_over_sting: {
                        description: 'Game over dramatic sting',
                        duration: 8.0,
                        loop: false,
                        volume: 0.7,
                        priority: 'high',
                        mood: 'defeat'
                    }
                },
                
                ui: {
                    button_click: {
                        description: 'UI button click sound',
                        duration: 0.2,
                        loop: false,
                        volume: 0.5,
                        priority: 'high'
                    },
                    button_hover: {
                        description: 'UI button hover sound',
                        duration: 0.1,
                        loop: false,
                        volume: 0.3,
                        priority: 'medium'
                    },
                    menu_transition: {
                        description: 'Menu transition whoosh',
                        duration: 0.8,
                        loop: false,
                        volume: 0.4,
                        priority: 'medium'
                    },
                    notification: {
                        description: 'Achievement/notification sound',
                        duration: 1.5,
                        loop: false,
                        volume: 0.6,
                        priority: 'medium'
                    },
                    error: {
                        description: 'Error/invalid action sound',
                        duration: 0.5,
                        loop: false,
                        volume: 0.4,
                        priority: 'low'
                    }
                },
                
                environment: {
                    wind_light: {
                        description: 'Light wind ambient',
                        duration: 30.0,
                        loop: true,
                        volume: 0.2,
                        priority: 'low',
                        weather: 'clear'
                    },
                    wind_heavy: {
                        description: 'Heavy wind with debris',
                        duration: 25.0,
                        loop: true,
                        volume: 0.4,
                        priority: 'medium',
                        weather: 'storm'
                    },
                    rain_light: {
                        description: 'Light rain on surfaces',
                        duration: 40.0,
                        loop: true,
                        volume: 0.3,
                        priority: 'low',
                        weather: 'rain'
                    },
                    thunder: {
                        description: 'Thunder crack with reverb',
                        duration: 4.0,
                        loop: false,
                        volume: 0.8,
                        priority: 'medium',
                        weather: 'storm'
                    }
                }
            };
            
            this.logger.info('Audio manifest loaded with categories:', Object.keys(this.audioManifest));
            
        } catch (error) {
            this.logger.error('Failed to load audio manifest:', error);
            throw error;
        }
    }

    /**
     * Create placeholder audio assets for development
     */
    async createPlaceholderAudioAssets() {
        try {
            this.logger.info('Creating placeholder audio assets...');
            
            if (!this.audioContext) {
                this.logger.warn('No audio context available, skipping placeholder creation');
                return;
            }
            
            let totalCreated = 0;
            
            for (const [category, sounds] of Object.entries(this.audioManifest)) {
                this.logger.info(`Creating ${Object.keys(sounds).length} placeholder sounds for category: ${category}`);
                
                for (const [soundName, soundSpec] of Object.entries(sounds)) {
                    try {
                        const audioBuffer = await this.createPlaceholderAudioBuffer(soundSpec);
                        const assetKey = `${category}/${soundName}`;
                        
                        this.audioBuffers.set(assetKey, audioBuffer);
                        this.audioCategories[category].set(soundName, {
                            buffer: audioBuffer,
                            spec: soundSpec,
                            assetKey
                        });
                        
                        totalCreated++;
                        
                    } catch (error) {
                        this.logger.warn(`Failed to create placeholder for ${category}/${soundName}:`, error);
                    }
                }
            }
            
            this.logger.info(`Created ${totalCreated} placeholder audio assets`);
            
        } catch (error) {
            this.logger.error('Failed to create placeholder audio assets:', error);
            throw error;
        }
    }

    /**
     * Create a placeholder audio buffer based on sound specifications
     */
    async createPlaceholderAudioBuffer(soundSpec) {
        const sampleRate = this.audioContext.sampleRate;
        const duration = soundSpec.duration || 1.0;
        const channels = soundSpec.channels || 1;
        const frameCount = sampleRate * duration;
        
        const audioBuffer = this.audioContext.createBuffer(channels, frameCount, sampleRate);
        
        // Generate different types of placeholder audio based on sound characteristics
        for (let channel = 0; channel < channels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            
            // Generate audio based on sound type
            if (soundSpec.description.includes('engine')) {
                this.generateEngineSound(channelData, sampleRate, duration, soundSpec);
            } else if (soundSpec.description.includes('impact') || soundSpec.description.includes('crash')) {
                this.generateImpactSound(channelData, sampleRate, duration, soundSpec);
            } else if (soundSpec.description.includes('zombie') || soundSpec.description.includes('groan')) {
                this.generateZombieSound(channelData, sampleRate, duration, soundSpec);
            } else if (soundSpec.description.includes('music') || soundSpec.description.includes('orchestral')) {
                this.generateMusicSound(channelData, sampleRate, duration, soundSpec);
            } else {
                this.generateGenericSound(channelData, sampleRate, duration, soundSpec);
            }
        }
        
        return audioBuffer;
    }

    /**
     * Generate engine sound placeholder
     */
    generateEngineSound(channelData, sampleRate, duration, soundSpec) {
        const baseFreq = soundSpec.rpm_range ? 
            (soundSpec.rpm_range[0] + soundSpec.rpm_range[1]) / 2 / 60 * 2 : 50;
        
        for (let i = 0; i < channelData.length; i++) {
            const t = i / sampleRate;
            
            // Base engine rumble
            let sample = Math.sin(2 * Math.PI * baseFreq * t) * 0.3;
            
            // Add harmonics for engine character
            sample += Math.sin(2 * Math.PI * baseFreq * 2 * t) * 0.2;
            sample += Math.sin(2 * Math.PI * baseFreq * 3 * t) * 0.1;
            
            // Add some noise for realism
            sample += (Math.random() - 0.5) * 0.1;
            
            // Apply envelope
            const envelope = Math.min(1, t * 4) * Math.min(1, (duration - t) * 4);
            channelData[i] = sample * envelope * (soundSpec.volume || 0.5);
        }
    }

    /**
     * Generate impact sound placeholder
     */
    generateImpactSound(channelData, sampleRate, duration, soundSpec) {
        for (let i = 0; i < channelData.length; i++) {
            const t = i / sampleRate;
            
            // Sharp attack with noise
            let sample = (Math.random() - 0.5) * 2;
            
            // Add some tonal content for metal impacts
            if (soundSpec.description.includes('metal')) {
                sample += Math.sin(2 * Math.PI * 200 * t) * 0.5;
                sample += Math.sin(2 * Math.PI * 800 * t) * 0.3;
            }
            
            // Exponential decay
            const envelope = Math.exp(-t * 5);
            channelData[i] = sample * envelope * (soundSpec.volume || 0.5);
        }
    }

    /**
     * Generate zombie sound placeholder
     */
    generateZombieSound(channelData, sampleRate, duration, soundSpec) {
        for (let i = 0; i < channelData.length; i++) {
            const t = i / sampleRate;
            
            // Low frequency growl
            let sample = Math.sin(2 * Math.PI * 80 * t) * 0.4;
            sample += Math.sin(2 * Math.PI * 120 * t) * 0.3;
            
            // Add noise and distortion
            sample += (Math.random() - 0.5) * 0.6;
            sample = Math.tanh(sample * 2) * 0.5; // Soft clipping
            
            // Irregular envelope for organic feel
            const envelope = (Math.sin(t * 3) + 1) * 0.5 * Math.min(1, (duration - t) * 2);
            channelData[i] = sample * envelope * (soundSpec.volume || 0.5);
        }
    }

    /**
     * Generate music sound placeholder
     */
    generateMusicSound(channelData, sampleRate, duration, soundSpec) {
        const key = 440; // A4
        const scale = [1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8]; // Major scale ratios
        
        for (let i = 0; i < channelData.length; i++) {
            const t = i / sampleRate;
            
            let sample = 0;
            
            // Generate chord progression
            const chordIndex = Math.floor(t / 4) % 4; // Change chord every 4 seconds
            const chord = [0, 2, 4]; // Major triad
            
            for (const note of chord) {
                const freq = key * scale[note % scale.length];
                sample += Math.sin(2 * Math.PI * freq * t) * 0.2;
            }
            
            // Add some bass
            sample += Math.sin(2 * Math.PI * key * 0.5 * t) * 0.3;
            
            // Gentle envelope
            const envelope = Math.min(1, t * 0.5) * Math.min(1, (duration - t) * 0.5);
            channelData[i] = sample * envelope * (soundSpec.volume || 0.3);
        }
    }

    /**
     * Generate generic sound placeholder
     */
    generateGenericSound(channelData, sampleRate, duration, soundSpec) {
        for (let i = 0; i < channelData.length; i++) {
            const t = i / sampleRate;
            
            // Simple tone with some character
            let sample = Math.sin(2 * Math.PI * 440 * t) * 0.3;
            sample += Math.sin(2 * Math.PI * 880 * t) * 0.2;
            
            // Envelope
            const envelope = Math.min(1, t * 2) * Math.min(1, (duration - t) * 2);
            channelData[i] = sample * envelope * (soundSpec.volume || 0.4);
        }
    }

    /**
     * Integrate with asset manager
     */
    async integrateWithAssetManager() {
        try {
            this.logger.info('Integrating audio assets with AssetManager...');
            
            // Register audio assets with the asset manager
            for (const [assetKey, audioBuffer] of this.audioBuffers.entries()) {
                const [category, soundName] = assetKey.split('/');
                const soundSpec = this.audioManifest[category][soundName];
                
                const audioAsset = {
                    type: 'audio',
                    buffer: audioBuffer,
                    spec: soundSpec,
                    category,
                    name: soundName,
                    duration: soundSpec.duration,
                    volume: soundSpec.volume,
                    loop: soundSpec.loop,
                    priority: soundSpec.priority
                };
                
                // Store in asset manager's audio category
                assetManager.categories.audio.set(assetKey, audioAsset);
            }
            
            this.logger.info(`Integrated ${this.audioBuffers.size} audio assets with AssetManager`);
            
        } catch (error) {
            this.logger.error('Failed to integrate with AssetManager:', error);
            throw error;
        }
    }

    /**
     * Get audio asset by category and name
     */
    getAudioAsset(category, name) {
        const assetKey = `${category}/${name}`;
        return this.audioBuffers.get(assetKey);
    }

    /**
     * Get all audio assets in a category
     */
    getAudioCategory(category) {
        return this.audioCategories[category] || new Map();
    }

    /**
     * Get audio specifications
     */
    getAudioSpecs(category) {
        return this.audioSpecs[category] || this.audioSpecs.engine;
    }

    /**
     * Get comprehensive audio asset statistics
     */
    getAudioStats() {
        const stats = {
            totalAssets: this.audioBuffers.size,
            categories: {},
            totalDuration: 0,
            memoryUsage: 0
        };
        
        for (const [category, sounds] of Object.entries(this.audioManifest)) {
            stats.categories[category] = {
                count: Object.keys(sounds).length,
                duration: 0,
                memoryUsage: 0
            };
            
            for (const [soundName, soundSpec] of Object.entries(sounds)) {
                stats.categories[category].duration += soundSpec.duration || 0;
                stats.totalDuration += soundSpec.duration || 0;
                
                // Estimate memory usage (rough calculation)
                const estimatedSize = (soundSpec.duration || 1) * 44100 * 2 * 2; // 16-bit stereo
                stats.categories[category].memoryUsage += estimatedSize;
                stats.memoryUsage += estimatedSize;
            }
        }
        
        return stats;
    }

    /**
     * Dispose of audio integration system
     */
    dispose() {
        // Clear all audio buffers
        this.audioBuffers.clear();
        this.audioSources.clear();
        
        // Clear category maps
        for (const category of Object.values(this.audioCategories)) {
            category.clear();
        }
        
        // Close audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        
        this.isInitialized = false;
        this.logger.info('AudioAssetIntegration disposed');
    }
}

// Export singleton instance
export const audioAssetIntegration = new AudioAssetIntegration();