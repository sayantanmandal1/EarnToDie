/**
 * Audio Asset Integration Tests
 * Comprehensive tests for the professional audio asset integration system
 */

import { audioAssetIntegration } from '../AudioAssetIntegration.js';
import { assetManager } from '../../assets/AssetManager.js';

// Mock Web Audio API for testing
const mockAudioContext = {
    sampleRate: 44100,
    state: 'running',
    createBuffer: jest.fn((channels, frameCount, sampleRate) => ({
        numberOfChannels: channels,
        length: frameCount,
        sampleRate: sampleRate,
        getChannelData: jest.fn(() => new Float32Array(frameCount))
    })),
    resume: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue()
};

// Mock electron integration
jest.mock('../../electron/ElectronIntegration.js', () => ({
    electronIntegration: {
        getLogger: () => ({
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        }),
        isElectron: false
    }
}));

// Mock asset manager
jest.mock('../../assets/AssetManager.js', () => ({
    assetManager: {
        categories: {
            audio: new Map()
        }
    }
}));

describe('AudioAssetIntegration', () => {
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Mock Web Audio API
        global.AudioContext = jest.fn(() => mockAudioContext);
        global.webkitAudioContext = jest.fn(() => mockAudioContext);
        
        // Reset audio asset integration
        audioAssetIntegration.isInitialized = false;
        audioAssetIntegration.audioContext = null;
        audioAssetIntegration.audioBuffers.clear();
        audioAssetIntegration.audioSources.clear();
        
        // Clear category maps
        for (const category of Object.values(audioAssetIntegration.audioCategories)) {
            category.clear();
        }
    });

    afterEach(() => {
        // Clean up
        if (audioAssetIntegration.isInitialized) {
            audioAssetIntegration.dispose();
        }
    });

    describe('Initialization', () => {
        test('should initialize successfully with Web Audio API support', async () => {
            await audioAssetIntegration.initialize();
            
            expect(audioAssetIntegration.isInitialized).toBe(true);
            expect(audioAssetIntegration.audioContext).toBeTruthy();
            expect(mockAudioContext.resume).toHaveBeenCalled();
        });

        test('should handle Web Audio API not supported', async () => {
            delete global.AudioContext;
            delete global.webkitAudioContext;
            
            await audioAssetIntegration.initialize();
            
            expect(audioAssetIntegration.isInitialized).toBe(true);
            expect(audioAssetIntegration.audioContext).toBeNull();
        });

        test('should handle suspended audio context', async () => {
            mockAudioContext.state = 'suspended';
            
            await audioAssetIntegration.initialize();
            
            expect(mockAudioContext.resume).toHaveBeenCalled();
        });

        test('should throw error on initialization failure', async () => {
            mockAudioContext.resume.mockRejectedValue(new Error('Audio context error'));
            
            await expect(audioAssetIntegration.initialize()).rejects.toThrow('Audio context error');
        });
    });

    describe('Audio Manifest', () => {
        beforeEach(async () => {
            await audioAssetIntegration.initialize();
        });

        test('should load comprehensive audio manifest', () => {
            expect(audioAssetIntegration.audioManifest).toBeDefined();
            expect(audioAssetIntegration.audioManifest.engine).toBeDefined();
            expect(audioAssetIntegration.audioManifest.impacts).toBeDefined();
            expect(audioAssetIntegration.audioManifest.zombies).toBeDefined();
            expect(audioAssetIntegration.audioManifest.music).toBeDefined();
            expect(audioAssetIntegration.audioManifest.ui).toBeDefined();
            expect(audioAssetIntegration.audioManifest.environment).toBeDefined();
        });

        test('should have proper engine sound specifications', () => {
            const engineSounds = audioAssetIntegration.audioManifest.engine;
            
            expect(engineSounds.v8_start).toBeDefined();
            expect(engineSounds.v8_start.duration).toBe(3.5);
            expect(engineSounds.v8_start.priority).toBe('critical');
            
            expect(engineSounds.v8_idle).toBeDefined();
            expect(engineSounds.v8_idle.loop).toBe(true);
            expect(engineSounds.v8_idle.rpm_range).toEqual([800, 1200]);
        });

        test('should have proper zombie sound specifications', () => {
            const zombieSounds = audioAssetIntegration.audioManifest.zombies;
            
            expect(zombieSounds.groan_low).toBeDefined();
            expect(zombieSounds.groan_low.threat_level).toBe('low');
            
            expect(zombieSounds.scream_attack).toBeDefined();
            expect(zombieSounds.scream_attack.threat_level).toBe('critical');
        });

        test('should have proper music specifications', () => {
            const musicTracks = audioAssetIntegration.audioManifest.music;
            
            expect(musicTracks.main_menu_orchestral).toBeDefined();
            expect(musicTracks.main_menu_orchestral.instrumentation).toBe('full_orchestra');
            
            expect(musicTracks.gameplay_action_hybrid).toBeDefined();
            expect(musicTracks.gameplay_action_hybrid.intensity).toBe('high');
        });
    });

    describe('Placeholder Audio Generation', () => {
        beforeEach(async () => {
            await audioAssetIntegration.initialize();
        });

        test('should create placeholder audio buffers for all categories', () => {
            expect(audioAssetIntegration.audioBuffers.size).toBeGreaterThan(0);
            
            // Check that all categories have audio buffers
            const categories = ['engine', 'impacts', 'zombies', 'music', 'ui', 'environment'];
            for (const category of categories) {
                const categoryBuffers = Array.from(audioAssetIntegration.audioBuffers.keys())
                    .filter(key => key.startsWith(category));
                expect(categoryBuffers.length).toBeGreaterThan(0);
            }
        });

        test('should create audio buffers with correct specifications', () => {
            const engineStartBuffer = audioAssetIntegration.audioBuffers.get('engine/v8_start');
            expect(engineStartBuffer).toBeDefined();
            expect(mockAudioContext.createBuffer).toHaveBeenCalledWith(
                1, // channels
                expect.any(Number), // frameCount
                44100 // sampleRate
            );
        });

        test('should populate category maps correctly', () => {
            expect(audioAssetIntegration.audioCategories.engine.size).toBeGreaterThan(0);
            expect(audioAssetIntegration.audioCategories.zombies.size).toBeGreaterThan(0);
            expect(audioAssetIntegration.audioCategories.music.size).toBeGreaterThan(0);
            
            const engineAsset = audioAssetIntegration.audioCategories.engine.get('v8_start');
            expect(engineAsset).toBeDefined();
            expect(engineAsset.buffer).toBeDefined();
            expect(engineAsset.spec).toBeDefined();
            expect(engineAsset.assetKey).toBe('engine/v8_start');
        });
    });

    describe('Asset Manager Integration', () => {
        beforeEach(async () => {
            await audioAssetIntegration.initialize();
        });

        test('should integrate audio assets with asset manager', () => {
            expect(assetManager.categories.audio.size).toBeGreaterThan(0);
            
            // Check that assets are properly formatted
            const audioAssets = Array.from(assetManager.categories.audio.values());
            const firstAsset = audioAssets[0];
            
            expect(firstAsset.type).toBe('audio');
            expect(firstAsset.buffer).toBeDefined();
            expect(firstAsset.spec).toBeDefined();
            expect(firstAsset.category).toBeDefined();
            expect(firstAsset.name).toBeDefined();
            expect(firstAsset.duration).toBeDefined();
            expect(firstAsset.volume).toBeDefined();
            expect(firstAsset.priority).toBeDefined();
        });

        test('should maintain asset key consistency', () => {
            const audioBufferKeys = Array.from(audioAssetIntegration.audioBuffers.keys());
            const assetManagerKeys = Array.from(assetManager.categories.audio.keys());
            
            expect(audioBufferKeys.sort()).toEqual(assetManagerKeys.sort());
        });
    });

    describe('Audio Asset Retrieval', () => {
        beforeEach(async () => {
            await audioAssetIntegration.initialize();
        });

        test('should retrieve audio assets by category and name', () => {
            const engineStart = audioAssetIntegration.getAudioAsset('engine', 'v8_start');
            expect(engineStart).toBeDefined();
            
            const zombieGroan = audioAssetIntegration.getAudioAsset('zombies', 'groan_low');
            expect(zombieGroan).toBeDefined();
        });

        test('should return undefined for non-existent assets', () => {
            const nonExistent = audioAssetIntegration.getAudioAsset('engine', 'non_existent');
            expect(nonExistent).toBeUndefined();
        });

        test('should retrieve entire audio categories', () => {
            const engineCategory = audioAssetIntegration.getAudioCategory('engine');
            expect(engineCategory).toBeInstanceOf(Map);
            expect(engineCategory.size).toBeGreaterThan(0);
            
            const musicCategory = audioAssetIntegration.getAudioCategory('music');
            expect(musicCategory).toBeInstanceOf(Map);
            expect(musicCategory.size).toBeGreaterThan(0);
        });

        test('should return empty map for non-existent categories', () => {
            const nonExistentCategory = audioAssetIntegration.getAudioCategory('non_existent');
            expect(nonExistentCategory).toBeInstanceOf(Map);
            expect(nonExistentCategory.size).toBe(0);
        });
    });

    describe('Audio Specifications', () => {
        beforeEach(async () => {
            await audioAssetIntegration.initialize();
        });

        test('should provide audio specifications for each category', () => {
            const engineSpecs = audioAssetIntegration.getAudioSpecs('engine');
            expect(engineSpecs).toBeDefined();
            expect(engineSpecs.sampleRate).toBe(44100);
            expect(engineSpecs.bitDepth).toBe(16);
            expect(engineSpecs.channels).toBe(2);
            expect(engineSpecs.format).toBe('mp3');
            expect(engineSpecs.quality).toBe('high');
            
            const impactSpecs = audioAssetIntegration.getAudioSpecs('impacts');
            expect(impactSpecs.channels).toBe(1); // Mono for impacts
            
            const musicSpecs = audioAssetIntegration.getAudioSpecs('music');
            expect(musicSpecs.quality).toBe('ultra');
        });

        test('should return default specs for unknown categories', () => {
            const unknownSpecs = audioAssetIntegration.getAudioSpecs('unknown');
            expect(unknownSpecs).toEqual(audioAssetIntegration.audioSpecs.engine);
        });
    });

    describe('Audio Statistics', () => {
        beforeEach(async () => {
            await audioAssetIntegration.initialize();
        });

        test('should provide comprehensive audio statistics', () => {
            const stats = audioAssetIntegration.getAudioStats();
            
            expect(stats.totalAssets).toBeGreaterThan(0);
            expect(stats.categories).toBeDefined();
            expect(stats.totalDuration).toBeGreaterThan(0);
            expect(stats.memoryUsage).toBeGreaterThan(0);
            
            // Check category-specific stats
            expect(stats.categories.engine).toBeDefined();
            expect(stats.categories.engine.count).toBeGreaterThan(0);
            expect(stats.categories.engine.duration).toBeGreaterThan(0);
            expect(stats.categories.engine.memoryUsage).toBeGreaterThan(0);
            
            expect(stats.categories.music).toBeDefined();
            expect(stats.categories.music.duration).toBeGreaterThan(stats.categories.engine.duration);
        });

        test('should calculate memory usage estimates', () => {
            const stats = audioAssetIntegration.getAudioStats();
            
            // Music should use more memory due to longer duration
            expect(stats.categories.music.memoryUsage).toBeGreaterThan(stats.categories.ui.memoryUsage);
            
            // Total should equal sum of categories
            const categoryTotal = Object.values(stats.categories)
                .reduce((sum, category) => sum + category.memoryUsage, 0);
            expect(stats.memoryUsage).toBe(categoryTotal);
        });
    });

    describe('Error Handling', () => {
        test('should handle audio context creation failure', async () => {
            global.AudioContext = jest.fn(() => {
                throw new Error('AudioContext creation failed');
            });
            
            await expect(audioAssetIntegration.initialize()).rejects.toThrow();
        });

        test('should handle placeholder generation failure gracefully', async () => {
            mockAudioContext.createBuffer.mockImplementation(() => {
                throw new Error('Buffer creation failed');
            });
            
            // Should not throw, but should log warnings
            await audioAssetIntegration.initialize();
            
            expect(audioAssetIntegration.isInitialized).toBe(true);
            // Some buffers might fail, but system should still initialize
        });
    });

    describe('Disposal', () => {
        beforeEach(async () => {
            await audioAssetIntegration.initialize();
        });

        test('should dispose of all resources properly', () => {
            const initialBufferCount = audioAssetIntegration.audioBuffers.size;
            expect(initialBufferCount).toBeGreaterThan(0);
            
            audioAssetIntegration.dispose();
            
            expect(audioAssetIntegration.audioBuffers.size).toBe(0);
            expect(audioAssetIntegration.audioSources.size).toBe(0);
            expect(audioAssetIntegration.isInitialized).toBe(false);
            expect(mockAudioContext.close).toHaveBeenCalled();
            
            // Check that all category maps are cleared
            for (const category of Object.values(audioAssetIntegration.audioCategories)) {
                expect(category.size).toBe(0);
            }
        });

        test('should handle disposal when audio context is already closed', () => {
            mockAudioContext.state = 'closed';
            
            expect(() => audioAssetIntegration.dispose()).not.toThrow();
        });
    });

    describe('Integration with Real Audio Files', () => {
        test('should be ready to integrate with real audio files', async () => {
            await audioAssetIntegration.initialize();
            
            // Verify that the system is structured to handle real audio files
            expect(audioAssetIntegration.audioManifest).toBeDefined();
            expect(audioAssetIntegration.audioSpecs).toBeDefined();
            
            // Check that all required categories are present
            const requiredCategories = ['engine', 'impacts', 'zombies', 'music', 'ui', 'environment'];
            for (const category of requiredCategories) {
                expect(audioAssetIntegration.audioManifest[category]).toBeDefined();
                expect(audioAssetIntegration.audioSpecs[category]).toBeDefined();
            }
        });

        test('should have proper audio specifications for production', () => {
            const specs = audioAssetIntegration.audioSpecs;
            
            // Verify production-ready specifications
            expect(specs.engine.sampleRate).toBe(44100);
            expect(specs.engine.bitDepth).toBe(16);
            expect(specs.music.quality).toBe('ultra');
            expect(specs.impacts.channels).toBe(1);
            expect(specs.engine.channels).toBe(2);
        });
    });
});

describe('AudioAssetIntegration Performance', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.AudioContext = jest.fn(() => mockAudioContext);
    });

    test('should initialize within reasonable time', async () => {
        const startTime = Date.now();
        
        await audioAssetIntegration.initialize();
        
        const initTime = Date.now() - startTime;
        expect(initTime).toBeLessThan(5000); // Should initialize within 5 seconds
    });

    test('should handle large number of audio assets efficiently', async () => {
        await audioAssetIntegration.initialize();
        
        const stats = audioAssetIntegration.getAudioStats();
        
        // Should handle at least 50+ audio assets
        expect(stats.totalAssets).toBeGreaterThan(50);
        
        // Memory usage should be reasonable (less than 100MB estimated)
        expect(stats.memoryUsage).toBeLessThan(100 * 1024 * 1024);
    });

    test('should provide fast asset retrieval', async () => {
        await audioAssetIntegration.initialize();
        
        const startTime = Date.now();
        
        // Retrieve multiple assets
        for (let i = 0; i < 100; i++) {
            audioAssetIntegration.getAudioAsset('engine', 'v8_start');
            audioAssetIntegration.getAudioAsset('zombies', 'groan_low');
            audioAssetIntegration.getAudioAsset('music', 'main_menu_orchestral');
        }
        
        const retrievalTime = Date.now() - startTime;
        expect(retrievalTime).toBeLessThan(100); // Should be very fast
    });
});