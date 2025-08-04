/**
 * Generate All Required Audio Files
 * Creates all audio files needed by the game
 */

const fs = require('fs').promises;
const path = require('path');

class CompleteAudioGenerator {
    constructor() {
        this.audioDir = path.join(__dirname, '..', 'public', 'audio');
        this.generatedFiles = [];
        
        // Complete list of all required audio files
        this.requiredFiles = {
            effects: [
                'engine_start', 'engine_idle', 'engine_rev', 'engine_v6_start', 'engine_v6_idle',
                'engine_diesel_start', 'engine_diesel_idle', 'metal_impact', 'metal_crunch_light',
                'metal_crunch_heavy', 'glass_break', 'glass_shatter', 'explosion_small', 'explosion_large',
                'tire_screech', 'brake_squeal', 'zombie_groan', 'zombie_groan_low', 'zombie_groan_aggressive',
                'zombie_scream', 'zombie_death', 'zombie_hit_soft', 'zombie_hit_hard', 'zombie_splat',
                'zombie_footsteps_shamble', 'zombie_footsteps_run', 'zombie_horde_ambient',
                'wind', 'debris', 'gear_shift', 'turbo_whistle', 'bone_crack'
            ],
            music: [
                'menu_theme', 'gameplay_calm', 'gameplay_intense', 'garage_theme'
            ],
            ui: [
                'button_click', 'button_hover', 'purchase_success', 'purchase_fail',
                'level_complete', 'game_over', 'checkpoint'
            ]
        };
    }

    /**
     * Generate all required audio files
     */
    async generateAllAudio() {
        console.log('🎵 Generating all required audio files...');
        
        try {
            // Create directory structure
            await this.createDirectoryStructure();
            
            // Generate all required files
            await this.generateAllRequiredFiles();
            
            // Create audio manifest
            await this.createAudioManifest();
            
            console.log(`✅ Generated ${this.generatedFiles.length} audio files`);
            console.log('📁 Audio files created in:', this.audioDir);
            
            return this.generatedFiles;
            
        } catch (error) {
            console.error('❌ Failed to generate audio files:', error);
            throw error;
        }
    }

    /**
     * Create directory structure for audio files
     */
    async createDirectoryStructure() {
        const dirs = [
            path.join(this.audioDir, 'effects'),
            path.join(this.audioDir, 'music'),
            path.join(this.audioDir, 'ui'),
            path.join(this.audioDir, 'environment')
        ];

        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    throw error;
                }
            }
        }
    }

    /**
     * Generate all required files
     */
    async generateAllRequiredFiles() {
        for (const [category, files] of Object.entries(this.requiredFiles)) {
            for (const fileName of files) {
                const filePath = path.join(this.audioDir, category, `${fileName}.mp3`);
                await this.generateAudioFile(filePath, fileName);
            }
        }
    }

    /**
     * Generate a single audio file based on its type
     */
    async generateAudioFile(filePath, fileName) {
        let config = this.getAudioConfig(fileName);
        
        const sampleRate = 44100;
        const numSamples = Math.floor(sampleRate * config.duration);
        const buffer = Buffer.alloc(44 + numSamples * 2);

        // WAV header
        buffer.write('RIFF', 0);
        buffer.writeUInt32LE(36 + numSamples * 2, 4);
        buffer.write('WAVE', 8);
        buffer.write('fmt ', 12);
        buffer.writeUInt32LE(16, 16);
        buffer.writeUInt16LE(1, 20);
        buffer.writeUInt16LE(1, 22);
        buffer.writeUInt32LE(sampleRate, 24);
        buffer.writeUInt32LE(sampleRate * 2, 28);
        buffer.writeUInt16LE(2, 32);
        buffer.writeUInt16LE(16, 34);
        buffer.write('data', 36);
        buffer.writeUInt32LE(numSamples * 2, 40);

        // Generate samples
        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            let sample = this.generateSample(t, config);
            
            // Apply envelope
            sample *= this.applyEnvelope(t, config.duration, config.envelope);
            
            // Apply overall volume
            sample *= 0.3;
            
            const intSample = Math.floor(Math.max(-32767, Math.min(32767, sample * 32767)));
            buffer.writeInt16LE(intSample, 44 + i * 2);
        }

        await fs.writeFile(filePath, buffer);
        this.generatedFiles.push(filePath);
        console.log(`Generated: ${fileName}.mp3`);
    }

    /**
     * Get audio configuration for a specific file
     */
    getAudioConfig(fileName) {
        const configs = {
            // Engine sounds
            engine_start: { duration: 2.0, frequency: 80, waveform: 'sawtooth', envelope: 'attack', harmonics: [2, 3], noise: 0.1 },
            engine_idle: { duration: 3.0, frequency: 60, waveform: 'sawtooth', envelope: 'sustain', harmonics: [2, 4], noise: 0.05 },
            engine_rev: { duration: 1.5, frequency: 120, waveform: 'sawtooth', envelope: 'adsr', harmonics: [2, 3], noise: 0.15 },
            engine_v6_start: { duration: 2.0, frequency: 90, waveform: 'sawtooth', envelope: 'attack', harmonics: [2, 3], noise: 0.1 },
            engine_v6_idle: { duration: 3.0, frequency: 70, waveform: 'sawtooth', envelope: 'sustain', harmonics: [2, 4], noise: 0.05 },
            engine_diesel_start: { duration: 2.5, frequency: 70, waveform: 'square', envelope: 'attack', harmonics: [2], noise: 0.2 },
            engine_diesel_idle: { duration: 3.0, frequency: 50, waveform: 'square', envelope: 'sustain', harmonics: [2], noise: 0.1 },
            
            // Impact sounds
            metal_impact: { duration: 0.5, frequency: 800, waveform: 'square', envelope: 'decay', harmonics: [1.5, 2.5], noise: 0.3 },
            metal_crunch_light: { duration: 0.3, frequency: 600, waveform: 'square', envelope: 'decay', harmonics: [2], noise: 0.2 },
            metal_crunch_heavy: { duration: 0.8, frequency: 400, waveform: 'square', envelope: 'decay', harmonics: [1.5, 2], noise: 0.4 },
            glass_break: { duration: 0.8, frequency: 2000, waveform: 'noise', envelope: 'decay', noise: 0.8 },
            glass_shatter: { duration: 1.0, frequency: 1500, waveform: 'noise', envelope: 'decay', noise: 0.9 },
            explosion_small: { duration: 1.0, frequency: 40, waveform: 'noise', envelope: 'decay', harmonics: [0.5], noise: 0.8 },
            explosion_large: { duration: 2.0, frequency: 30, waveform: 'noise', envelope: 'decay', harmonics: [0.3, 0.5], noise: 0.9 },
            
            // Vehicle sounds
            tire_screech: { duration: 1.5, frequency: 400, waveform: 'sawtooth', envelope: 'sustain', harmonics: [2, 3], noise: 0.2 },
            brake_squeal: { duration: 1.0, frequency: 600, waveform: 'sine', envelope: 'sustain', harmonics: [2], noise: 0.1 },
            gear_shift: { duration: 0.3, frequency: 200, waveform: 'square', envelope: 'decay', noise: 0.1 },
            turbo_whistle: { duration: 1.0, frequency: 1200, waveform: 'sine', envelope: 'attack', harmonics: [2] },
            
            // Zombie sounds
            zombie_groan: { duration: 2.0, frequency: 150, waveform: 'sawtooth', envelope: 'sustain', harmonics: [0.5, 1.5], noise: 0.2 },
            zombie_groan_low: { duration: 2.5, frequency: 100, waveform: 'sawtooth', envelope: 'sustain', harmonics: [0.5], noise: 0.3 },
            zombie_groan_aggressive: { duration: 1.5, frequency: 200, waveform: 'square', envelope: 'adsr', harmonics: [2], noise: 0.3 },
            zombie_scream: { duration: 1.0, frequency: 600, waveform: 'square', envelope: 'adsr', harmonics: [2, 3], noise: 0.3 },
            zombie_death: { duration: 1.5, frequency: 120, waveform: 'sawtooth', envelope: 'decay', harmonics: [0.5], noise: 0.4 },
            zombie_hit_soft: { duration: 0.3, frequency: 300, waveform: 'square', envelope: 'decay', noise: 0.2 },
            zombie_hit_hard: { duration: 0.5, frequency: 250, waveform: 'square', envelope: 'decay', noise: 0.3 },
            zombie_splat: { duration: 0.4, frequency: 200, waveform: 'noise', envelope: 'decay', noise: 0.6 },
            zombie_footsteps_shamble: { duration: 1.0, frequency: 80, waveform: 'square', envelope: 'sustain', noise: 0.3 },
            zombie_footsteps_run: { duration: 0.8, frequency: 120, waveform: 'square', envelope: 'sustain', noise: 0.2 },
            zombie_horde_ambient: { duration: 5.0, frequency: 90, waveform: 'sawtooth', envelope: 'sustain', harmonics: [0.5, 2], noise: 0.4 },
            bone_crack: { duration: 0.4, frequency: 350, waveform: 'square', envelope: 'decay', noise: 0.3 },
            
            // Music
            menu_theme: { duration: 30.0, frequency: 440, waveform: 'sine', envelope: 'sustain', harmonics: [1.5, 2] },
            gameplay_calm: { duration: 60.0, frequency: 330, waveform: 'sine', envelope: 'sustain', harmonics: [1.5] },
            gameplay_intense: { duration: 45.0, frequency: 220, waveform: 'sawtooth', envelope: 'sustain', harmonics: [2, 3] },
            garage_theme: { duration: 40.0, frequency: 370, waveform: 'sine', envelope: 'sustain', harmonics: [1.5, 2] },
            
            // UI sounds
            button_click: { duration: 0.2, frequency: 800, waveform: 'sine', envelope: 'decay', harmonics: [2] },
            button_hover: { duration: 0.1, frequency: 1000, waveform: 'sine', envelope: 'decay' },
            purchase_success: { duration: 0.5, frequency: 600, waveform: 'sine', envelope: 'adsr', harmonics: [1.5] },
            purchase_fail: { duration: 0.5, frequency: 200, waveform: 'square', envelope: 'decay' },
            level_complete: { duration: 2.0, frequency: 500, waveform: 'sine', envelope: 'adsr', harmonics: [1.5, 2] },
            game_over: { duration: 3.0, frequency: 150, waveform: 'sawtooth', envelope: 'decay', harmonics: [0.5] },
            checkpoint: { duration: 1.0, frequency: 700, waveform: 'sine', envelope: 'adsr', harmonics: [2] },
            
            // Environment
            wind: { duration: 10.0, frequency: 60, waveform: 'noise', envelope: 'sustain', noise: 0.5 },
            debris: { duration: 2.0, frequency: 300, waveform: 'noise', envelope: 'decay', noise: 0.7 }
        };

        return configs[fileName] || { duration: 1.0, frequency: 440, waveform: 'sine', envelope: 'decay' };
    }

    /**
     * Generate a sample based on configuration
     */
    generateSample(t, config) {
        let sample = 0;
        const { frequency, waveform, harmonics = [], noise = 0 } = config;

        // Base waveform
        switch (waveform) {
            case 'sine':
                sample = Math.sin(2 * Math.PI * frequency * t);
                break;
            case 'square':
                sample = Math.sign(Math.sin(2 * Math.PI * frequency * t));
                break;
            case 'sawtooth':
                sample = 2 * (t * frequency - Math.floor(t * frequency + 0.5));
                break;
            case 'triangle':
                sample = 2 * Math.abs(2 * (t * frequency - Math.floor(t * frequency + 0.5))) - 1;
                break;
            case 'noise':
                sample = Math.random() * 2 - 1;
                break;
        }

        // Add harmonics
        for (const harmonic of harmonics) {
            sample += 0.3 * Math.sin(2 * Math.PI * frequency * harmonic * t);
        }

        // Add noise
        if (noise > 0) {
            sample += (Math.random() * 2 - 1) * noise;
        }

        return sample;
    }

    /**
     * Apply envelope to sample
     */
    applyEnvelope(t, duration, envelope) {
        switch (envelope) {
            case 'decay':
                return Math.exp(-t * 3);
            case 'attack':
                return Math.min(1, t * 10);
            case 'sustain':
                return 1;
            case 'adsr':
                if (t < 0.1) return t * 10; // Attack
                else if (t < 0.3) return 1 - (t - 0.1) * 0.5; // Decay
                else if (t < duration - 0.2) return 0.6; // Sustain
                else return 0.6 * (1 - (t - (duration - 0.2)) * 5); // Release
            default:
                return 1;
        }
    }

    /**
     * Create audio manifest
     */
    async createAudioManifest() {
        const manifest = {
            version: '1.0.0',
            generated: new Date().toISOString(),
            description: 'Zombie Car Game Audio Asset Manifest - Complete Generated Files',
            totalFiles: this.generatedFiles.length,
            files: {}
        };

        for (const filePath of this.generatedFiles) {
            const relativePath = path.relative(this.audioDir, filePath);
            const stats = await fs.stat(filePath);
            
            manifest.files[relativePath] = {
                path: `audio/${relativePath}`,
                size: stats.size,
                type: 'audio/wav',
                generated: true
            };
        }

        const manifestPath = path.join(this.audioDir, 'audio-manifest.json');
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
        
        console.log('📄 Audio manifest created');
    }
}

// Run if called directly
if (require.main === module) {
    const generator = new CompleteAudioGenerator();
    generator.generateAllAudio()
        .then(() => {
            console.log('🎉 Complete audio generation finished!');
            console.log('All required audio files have been generated.');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Audio generation failed:', error);
            process.exit(1);
        });
}

module.exports = CompleteAudioGenerator;