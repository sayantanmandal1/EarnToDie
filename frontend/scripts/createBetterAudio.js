/**
 * Create Better Quality Audio Files
 * Generates higher quality audio files using Web Audio API techniques
 */

const fs = require('fs').promises;
const path = require('path');

class BetterAudioGenerator {
    constructor() {
        this.audioDir = path.join(__dirname, '..', 'public', 'audio');
        this.generatedFiles = [];
    }

    /**
     * Generate all better quality audio files
     */
    async generateAllAudio() {
        console.log('🎵 Generating better quality audio files...');
        
        try {
            // Create directory structure
            await this.createDirectoryStructure();
            
            // Generate different types of audio
            await this.generateEngineAudio();
            await this.generateImpactAudio();
            await this.generateZombieAudio();
            await this.generateMusicAudio();
            await this.generateUIAudio();
            await this.generateEnvironmentAudio();
            
            // Create audio manifest
            await this.createAudioManifest();
            
            console.log(`✅ Generated ${this.generatedFiles.length} better quality audio files`);
            console.log('📁 Audio files created in:', this.audioDir);
            
            return this.generatedFiles;
            
        } catch (error) {
            console.error('❌ Failed to generate better audio files:', error);
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
     * Generate a better quality audio file with multiple waveforms
     */
    async generateBetterAudioFile(filePath, duration = 1.0, config = {}) {
        const {
            frequency = 440,
            waveform = 'sine',
            envelope = 'decay',
            harmonics = [],
            noise = 0,
            modulation = null
        } = config;

        const sampleRate = 44100;
        const numSamples = Math.floor(sampleRate * duration);
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
            let sample = 0;

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
                sample += harmonic.amplitude * Math.sin(2 * Math.PI * frequency * harmonic.ratio * t);
            }

            // Add noise
            if (noise > 0) {
                sample += (Math.random() * 2 - 1) * noise;
            }

            // Apply modulation
            if (modulation) {
                const modValue = Math.sin(2 * Math.PI * modulation.frequency * t);
                sample *= (1 + modulation.depth * modValue);
            }

            // Apply envelope
            let envelopeValue = 1;
            switch (envelope) {
                case 'decay':
                    envelopeValue = Math.exp(-t * 3);
                    break;
                case 'attack':
                    envelopeValue = Math.min(1, t * 10);
                    break;
                case 'adsr':
                    if (t < 0.1) envelopeValue = t * 10; // Attack
                    else if (t < 0.3) envelopeValue = 1 - (t - 0.1) * 0.5; // Decay
                    else if (t < duration - 0.2) envelopeValue = 0.6; // Sustain
                    else envelopeValue = 0.6 * (1 - (t - (duration - 0.2)) * 5); // Release
                    break;
            }

            sample *= envelopeValue * 0.3; // Overall volume
            const intSample = Math.floor(Math.max(-32767, Math.min(32767, sample * 32767)));
            buffer.writeInt16LE(intSample, 44 + i * 2);
        }

        await fs.writeFile(filePath, buffer);
        this.generatedFiles.push(filePath);
        console.log(`Generated: ${path.basename(filePath)}`);
    }

    /**
     * Generate engine audio files
     */
    async generateEngineAudio() {
        const engineSounds = [
            {
                name: 'engine_start.mp3',
                duration: 2.0,
                config: {
                    frequency: 80,
                    waveform: 'sawtooth',
                    envelope: 'attack',
                    harmonics: [
                        { ratio: 2, amplitude: 0.3 },
                        { ratio: 3, amplitude: 0.1 }
                    ],
                    noise: 0.1
                }
            },
            {
                name: 'engine_idle.mp3',
                duration: 3.0,
                config: {
                    frequency: 60,
                    waveform: 'sawtooth',
                    harmonics: [
                        { ratio: 2, amplitude: 0.4 },
                        { ratio: 4, amplitude: 0.2 }
                    ],
                    modulation: { frequency: 2, depth: 0.1 },
                    noise: 0.05
                }
            },
            {
                name: 'engine_rev.mp3',
                duration: 1.5,
                config: {
                    frequency: 120,
                    waveform: 'sawtooth',
                    envelope: 'adsr',
                    harmonics: [
                        { ratio: 2, amplitude: 0.5 },
                        { ratio: 3, amplitude: 0.3 }
                    ],
                    noise: 0.15
                }
            }
        ];

        for (const sound of engineSounds) {
            const filePath = path.join(this.audioDir, 'effects', sound.name);
            await this.generateBetterAudioFile(filePath, sound.duration, sound.config);
        }
    }

    /**
     * Generate impact and collision audio
     */
    async generateImpactAudio() {
        const impactSounds = [
            {
                name: 'metal_impact.mp3',
                duration: 0.5,
                config: {
                    frequency: 800,
                    waveform: 'square',
                    envelope: 'decay',
                    harmonics: [
                        { ratio: 1.5, amplitude: 0.3 },
                        { ratio: 2.5, amplitude: 0.2 }
                    ],
                    noise: 0.3
                }
            },
            {
                name: 'glass_break.mp3',
                duration: 0.8,
                config: {
                    frequency: 2000,
                    waveform: 'noise',
                    envelope: 'decay',
                    modulation: { frequency: 50, depth: 0.5 }
                }
            },
            {
                name: 'explosion_small.mp3',
                duration: 1.0,
                config: {
                    frequency: 40,
                    waveform: 'noise',
                    envelope: 'decay',
                    harmonics: [
                        { ratio: 0.5, amplitude: 0.4 }
                    ],
                    noise: 0.8
                }
            }
        ];

        for (const sound of impactSounds) {
            const filePath = path.join(this.audioDir, 'effects', sound.name);
            await this.generateBetterAudioFile(filePath, sound.duration, sound.config);
        }
    }

    /**
     * Generate zombie audio
     */
    async generateZombieAudio() {
        const zombieSounds = [
            {
                name: 'zombie_groan.mp3',
                duration: 2.0,
                config: {
                    frequency: 150,
                    waveform: 'sawtooth',
                    harmonics: [
                        { ratio: 0.5, amplitude: 0.3 },
                        { ratio: 1.5, amplitude: 0.2 }
                    ],
                    modulation: { frequency: 3, depth: 0.3 },
                    noise: 0.2
                }
            },
            {
                name: 'zombie_scream.mp3',
                duration: 1.0,
                config: {
                    frequency: 600,
                    waveform: 'square',
                    envelope: 'adsr',
                    harmonics: [
                        { ratio: 2, amplitude: 0.4 },
                        { ratio: 3, amplitude: 0.2 }
                    ],
                    noise: 0.3
                }
            }
        ];

        for (const sound of zombieSounds) {
            const filePath = path.join(this.audioDir, 'effects', sound.name);
            await this.generateBetterAudioFile(filePath, sound.duration, sound.config);
        }
    }

    /**
     * Generate music tracks
     */
    async generateMusicAudio() {
        const musicTracks = [
            {
                name: 'menu_theme.mp3',
                duration: 30.0,
                config: {
                    frequency: 440,
                    waveform: 'sine',
                    harmonics: [
                        { ratio: 1.5, amplitude: 0.3 },
                        { ratio: 2, amplitude: 0.2 }
                    ],
                    modulation: { frequency: 0.5, depth: 0.1 }
                }
            },
            {
                name: 'gameplay_intense.mp3',
                duration: 45.0,
                config: {
                    frequency: 220,
                    waveform: 'sawtooth',
                    harmonics: [
                        { ratio: 2, amplitude: 0.4 },
                        { ratio: 3, amplitude: 0.2 }
                    ],
                    modulation: { frequency: 4, depth: 0.2 }
                }
            }
        ];

        for (const track of musicTracks) {
            const filePath = path.join(this.audioDir, 'music', track.name);
            await this.generateBetterAudioFile(filePath, track.duration, track.config);
        }
    }

    /**
     * Generate UI audio
     */
    async generateUIAudio() {
        const uiSounds = [
            {
                name: 'button_click.mp3',
                duration: 0.2,
                config: {
                    frequency: 800,
                    waveform: 'sine',
                    envelope: 'decay',
                    harmonics: [
                        { ratio: 2, amplitude: 0.2 }
                    ]
                }
            },
            {
                name: 'button_hover.mp3',
                duration: 0.1,
                config: {
                    frequency: 1000,
                    waveform: 'sine',
                    envelope: 'decay'
                }
            }
        ];

        for (const sound of uiSounds) {
            const filePath = path.join(this.audioDir, 'ui', sound.name);
            await this.generateBetterAudioFile(filePath, sound.duration, sound.config);
        }
    }

    /**
     * Generate environment audio
     */
    async generateEnvironmentAudio() {
        const envSounds = [
            {
                name: 'wind.mp3',
                duration: 10.0,
                config: {
                    frequency: 100,
                    waveform: 'noise',
                    modulation: { frequency: 0.5, depth: 0.3 },
                    noise: 0.5
                }
            }
        ];

        for (const sound of envSounds) {
            const filePath = path.join(this.audioDir, 'effects', sound.name);
            await this.generateBetterAudioFile(filePath, sound.duration, sound.config);
        }
    }

    /**
     * Create audio manifest
     */
    async createAudioManifest() {
        const manifest = {
            version: '1.0.0',
            generated: new Date().toISOString(),
            description: 'Zombie Car Game Audio Asset Manifest - Better Quality Generated Files',
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
                generated: true,
                quality: 'improved'
            };
        }

        const manifestPath = path.join(this.audioDir, 'audio-manifest.json');
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
        
        console.log('📄 Audio manifest created');
    }
}

// Run if called directly
if (require.main === module) {
    const generator = new BetterAudioGenerator();
    generator.generateAllAudio()
        .then(() => {
            console.log('🎉 Better audio generation completed successfully!');
            console.log('Note: These are improved synthetic audio files.');
            console.log('For production, consider using professional audio libraries.');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Better audio generation failed:', error);
            process.exit(1);
        });
}

module.exports = BetterAudioGenerator;