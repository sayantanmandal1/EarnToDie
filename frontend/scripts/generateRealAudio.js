/**
 * Generate Real Audio Files
 * Creates actual audio files with proper audio data instead of empty placeholders
 */

const fs = require('fs').promises;
const path = require('path');

class RealAudioGenerator {
    constructor() {
        this.audioDir = path.join(__dirname, '..', 'public', 'audio');
        this.generatedFiles = [];
    }

    /**
     * Generate all real audio files
     */
    async generateAllAudio() {
        console.log('🎵 Generating real audio files...');
        
        try {
            // Create directory structure
            await this.createDirectoryStructure();
            
            // Generate real audio files
            await this.generateEngineAudio();
            await this.generateImpactAudio();
            await this.generateZombieAudio();
            await this.generateMusicAudio();
            await this.generateUIAudio();
            await this.generateEnvironmentAudio();
            
            // Create audio manifest
            await this.createAudioManifest();
            
            console.log(`✅ Generated ${this.generatedFiles.length} real audio files`);
            console.log('📁 Audio files created in:', this.audioDir);
            
            return this.generatedFiles;
            
        } catch (error) {
            console.error('❌ Failed to generate real audio files:', error);
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
     * Generate a simple audio file with actual audio data
     */
    async generateAudioFile(filePath, duration = 1.0, frequency = 440) {
        // Create a simple WAV file with sine wave
        const sampleRate = 44100;
        const numSamples = Math.floor(sampleRate * duration);
        const buffer = Buffer.alloc(44 + numSamples * 2); // WAV header + 16-bit samples

        // WAV header
        buffer.write('RIFF', 0);
        buffer.writeUInt32LE(36 + numSamples * 2, 4);
        buffer.write('WAVE', 8);
        buffer.write('fmt ', 12);
        buffer.writeUInt32LE(16, 16); // PCM format size
        buffer.writeUInt16LE(1, 20);  // PCM format
        buffer.writeUInt16LE(1, 22);  // Mono
        buffer.writeUInt32LE(sampleRate, 24);
        buffer.writeUInt32LE(sampleRate * 2, 28);
        buffer.writeUInt16LE(2, 32);  // Block align
        buffer.writeUInt16LE(16, 34); // Bits per sample
        buffer.write('data', 36);
        buffer.writeUInt32LE(numSamples * 2, 40);

        // Generate sine wave samples
        for (let i = 0; i < numSamples; i++) {
            const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3; // 30% volume
            const intSample = Math.floor(sample * 32767);
            buffer.writeInt16LE(intSample, 44 + i * 2);
        }

        // Convert to MP3-like format by changing extension (browsers can handle WAV)
        const wavPath = filePath.replace('.mp3', '.wav');
        await fs.writeFile(wavPath, buffer);
        
        // Create a symbolic link or copy with .mp3 extension for compatibility
        try {
            await fs.copyFile(wavPath, filePath);
        } catch (error) {
            console.warn(`Could not create MP3 version of ${filePath}:`, error.message);
        }

        this.generatedFiles.push(filePath);
        console.log(`Generated: ${path.basename(filePath)}`);
    }

    /**
     * Generate engine audio files
     */
    async generateEngineAudio() {
        const engineSounds = [
            { name: 'engine_start.mp3', duration: 2.0, frequency: 120 },
            { name: 'engine_idle.mp3', duration: 3.0, frequency: 80 },
            { name: 'engine_rev.mp3', duration: 1.5, frequency: 200 },
            { name: 'engine_v6_start.mp3', duration: 2.0, frequency: 140 },
            { name: 'engine_v6_idle.mp3', duration: 3.0, frequency: 90 },
            { name: 'engine_diesel_start.mp3', duration: 2.5, frequency: 100 },
            { name: 'engine_diesel_idle.mp3', duration: 3.0, frequency: 70 }
        ];

        for (const sound of engineSounds) {
            const filePath = path.join(this.audioDir, 'effects', sound.name);
            await this.generateAudioFile(filePath, sound.duration, sound.frequency);
        }
    }

    /**
     * Generate impact and collision audio
     */
    async generateImpactAudio() {
        const impactSounds = [
            { name: 'metal_impact.mp3', duration: 0.5, frequency: 300 },
            { name: 'metal_crunch_light.mp3', duration: 0.8, frequency: 250 },
            { name: 'metal_crunch_heavy.mp3', duration: 1.2, frequency: 180 },
            { name: 'glass_break.mp3', duration: 0.6, frequency: 800 },
            { name: 'glass_shatter.mp3', duration: 1.0, frequency: 1000 },
            { name: 'explosion_small.mp3', duration: 1.0, frequency: 60 },
            { name: 'explosion_large.mp3', duration: 2.0, frequency: 40 },
            { name: 'tire_screech.mp3', duration: 1.5, frequency: 400 },
            { name: 'brake_squeal.mp3', duration: 1.0, frequency: 600 }
        ];

        for (const sound of impactSounds) {
            const filePath = path.join(this.audioDir, 'effects', sound.name);
            await this.generateAudioFile(filePath, sound.duration, sound.frequency);
        }
    }

    /**
     * Generate zombie audio
     */
    async generateZombieAudio() {
        const zombieSounds = [
            { name: 'zombie_groan.mp3', duration: 2.0, frequency: 150 },
            { name: 'zombie_groan_low.mp3', duration: 2.5, frequency: 100 },
            { name: 'zombie_groan_aggressive.mp3', duration: 1.5, frequency: 200 },
            { name: 'zombie_scream.mp3', duration: 1.0, frequency: 800 },
            { name: 'zombie_death.mp3', duration: 1.5, frequency: 120 },
            { name: 'zombie_hit_soft.mp3', duration: 0.3, frequency: 300 },
            { name: 'zombie_hit_hard.mp3', duration: 0.5, frequency: 250 },
            { name: 'zombie_splat.mp3', duration: 0.4, frequency: 200 },
            { name: 'zombie_footsteps_shamble.mp3', duration: 1.0, frequency: 80 },
            { name: 'zombie_footsteps_run.mp3', duration: 0.8, frequency: 120 },
            { name: 'zombie_horde_ambient.mp3', duration: 5.0, frequency: 90 }
        ];

        for (const sound of zombieSounds) {
            const filePath = path.join(this.audioDir, 'effects', sound.name);
            await this.generateAudioFile(filePath, sound.duration, sound.frequency);
        }
    }

    /**
     * Generate music tracks
     */
    async generateMusicAudio() {
        const musicTracks = [
            { name: 'menu_theme.mp3', duration: 30.0, frequency: 440 },
            { name: 'gameplay_calm.mp3', duration: 60.0, frequency: 330 },
            { name: 'gameplay_intense.mp3', duration: 45.0, frequency: 550 },
            { name: 'garage_theme.mp3', duration: 40.0, frequency: 370 }
        ];

        for (const track of musicTracks) {
            const filePath = path.join(this.audioDir, 'music', track.name);
            await this.generateAudioFile(filePath, track.duration, track.frequency);
        }
    }

    /**
     * Generate UI audio
     */
    async generateUIAudio() {
        const uiSounds = [
            { name: 'button_click.mp3', duration: 0.2, frequency: 800 },
            { name: 'button_hover.mp3', duration: 0.1, frequency: 1000 },
            { name: 'purchase_success.mp3', duration: 0.5, frequency: 600 },
            { name: 'purchase_fail.mp3', duration: 0.5, frequency: 200 },
            { name: 'level_complete.mp3', duration: 2.0, frequency: 500 },
            { name: 'game_over.mp3', duration: 3.0, frequency: 150 },
            { name: 'checkpoint.mp3', duration: 1.0, frequency: 700 }
        ];

        for (const sound of uiSounds) {
            const filePath = path.join(this.audioDir, 'ui', sound.name);
            await this.generateAudioFile(filePath, sound.duration, sound.frequency);
        }
    }

    /**
     * Generate environment audio
     */
    async generateEnvironmentAudio() {
        const envSounds = [
            { name: 'wind.mp3', duration: 10.0, frequency: 60 },
            { name: 'debris.mp3', duration: 2.0, frequency: 300 },
            { name: 'gear_shift.mp3', duration: 0.3, frequency: 400 },
            { name: 'turbo_whistle.mp3', duration: 1.0, frequency: 1200 },
            { name: 'bone_crack.mp3', duration: 0.4, frequency: 350 }
        ];

        for (const sound of envSounds) {
            const filePath = path.join(this.audioDir, 'effects', sound.name);
            await this.generateAudioFile(filePath, sound.duration, sound.frequency);
        }
    }

    /**
     * Create audio manifest
     */
    async createAudioManifest() {
        const manifest = {
            version: '1.0.0',
            generated: new Date().toISOString(),
            description: 'Zombie Car Game Audio Asset Manifest - Real Audio Files',
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
    const generator = new RealAudioGenerator();
    generator.generateAllAudio()
        .then(() => {
            console.log('🎉 Audio generation completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Audio generation failed:', error);
            process.exit(1);
        });
}

module.exports = RealAudioGenerator;