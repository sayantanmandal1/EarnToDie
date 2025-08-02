/**
 * Generate Placeholder Audio Files
 * Creates placeholder audio files for development and testing
 */

const fs = require('fs').promises;
const path = require('path');

class AudioPlaceholderGenerator {
    constructor() {
        this.audioDir = path.join(__dirname, '..', 'public', 'audio');
        this.generatedFiles = [];
    }

    /**
     * Generate all placeholder audio files
     */
    async generateAllPlaceholders() {
        console.log('🎵 Generating placeholder audio files...');
        
        try {
            // Create directory structure
            await this.createDirectoryStructure();
            
            // Generate placeholder files
            await this.generateEngineAudio();
            await this.generateImpactAudio();
            await this.generateZombieAudio();
            await this.generateMusicAudio();
            await this.generateUIAudio();
            await this.generateEnvironmentAudio();
            
            // Create audio manifest
            await this.createAudioManifest();
            
            console.log(`✅ Generated ${this.generatedFiles.length} placeholder audio files`);
            console.log('📁 Audio files created in:', this.audioDir);
            
            return this.generatedFiles;
            
        } catch (error) {
            console.error('❌ Failed to generate placeholder audio files:', error);
            throw error;
        }
    }

    /**
     * Create directory structure for audio files
     */
    async createDirectoryStructure() {
        const directories = [
            'effects',
            'music',
            'ui',
            'environment'
        ];

        for (const dir of directories) {
            const dirPath = path.join(this.audioDir, dir);
            await fs.mkdir(dirPath, { recursive: true });
        }
    }

    /**
     * Generate engine audio placeholders
     */
    async generateEngineAudio() {
        const engineSounds = [
            { name: 'engine_start.mp3', duration: 3.5, description: 'V8 engine startup' },
            { name: 'engine_idle.mp3', duration: 5.0, description: 'V8 engine idle loop' },
            { name: 'engine_rev.mp3', duration: 2.0, description: 'Engine revving' },
            { name: 'engine_v6_start.mp3', duration: 2.8, description: 'V6 engine startup' },
            { name: 'engine_v6_idle.mp3', duration: 4.0, description: 'V6 engine idle' },
            { name: 'engine_diesel_start.mp3', duration: 4.0, description: 'Diesel engine startup' },
            { name: 'engine_diesel_idle.mp3', duration: 6.0, description: 'Diesel engine idle' },
            { name: 'gear_shift.mp3', duration: 0.5, description: 'Manual transmission shift' },
            { name: 'turbo_whistle.mp3', duration: 1.2, description: 'Turbocharger whistle' }
        ];

        for (const sound of engineSounds) {
            await this.createPlaceholderFile('effects', sound);
        }
    }

    /**
     * Generate impact audio placeholders
     */
    async generateImpactAudio() {
        const impactSounds = [
            { name: 'metal_crunch_light.mp3', duration: 1.0, description: 'Light metal impact' },
            { name: 'metal_crunch_heavy.mp3', duration: 2.0, description: 'Heavy metal collision' },
            { name: 'glass_shatter.mp3', duration: 1.5, description: 'Glass breaking' },
            { name: 'tire_screech.mp3', duration: 2.5, description: 'Tire screeching' },
            { name: 'brake_squeal.mp3', duration: 1.8, description: 'Brake squealing' },
            { name: 'zombie_hit_soft.mp3', duration: 0.8, description: 'Soft zombie impact' },
            { name: 'zombie_hit_hard.mp3', duration: 1.2, description: 'Hard zombie impact' },
            { name: 'bone_crack.mp3', duration: 0.6, description: 'Bone breaking' },
            { name: 'zombie_splat.mp3', duration: 1.0, description: 'Gore splatter' }
        ];

        for (const sound of impactSounds) {
            await this.createPlaceholderFile('effects', sound);
        }
    }

    /**
     * Generate zombie audio placeholders
     */
    async generateZombieAudio() {
        const zombieSounds = [
            { name: 'zombie_groan_low.mp3', duration: 3.0, description: 'Low zombie groan' },
            { name: 'zombie_groan_aggressive.mp3', duration: 2.5, description: 'Aggressive growl' },
            { name: 'zombie_scream.mp3', duration: 2.0, description: 'Zombie attack scream' },
            { name: 'zombie_death.mp3', duration: 2.8, description: 'Zombie death rattle' },
            { name: 'zombie_horde_ambient.mp3', duration: 10.0, description: 'Distant horde' },
            { name: 'zombie_footsteps_shamble.mp3', duration: 1.0, description: 'Shambling footsteps' },
            { name: 'zombie_footsteps_run.mp3', duration: 0.8, description: 'Running footsteps' }
        ];

        for (const sound of zombieSounds) {
            await this.createPlaceholderFile('effects', sound);
        }
    }

    /**
     * Generate music audio placeholders
     */
    async generateMusicAudio() {
        const musicTracks = [
            { name: 'menu_theme.mp3', duration: 180.0, description: 'Main menu orchestral theme' },
            { name: 'menu_electronic.mp3', duration: 200.0, description: 'Electronic menu theme' },
            { name: 'gameplay_calm.mp3', duration: 240.0, description: 'Calm exploration music' },
            { name: 'gameplay_tension.mp3', duration: 180.0, description: 'Building tension music' },
            { name: 'gameplay_action.mp3', duration: 220.0, description: 'High-intensity action music' },
            { name: 'gameplay_horror.mp3', duration: 300.0, description: 'Horror ambient soundscape' },
            { name: 'victory_fanfare.mp3', duration: 15.0, description: 'Victory fanfare' },
            { name: 'game_over.mp3', duration: 8.0, description: 'Game over sting' },
            { name: 'garage_theme.mp3', duration: 150.0, description: 'Garage/upgrade music' }
        ];

        for (const track of musicTracks) {
            await this.createPlaceholderFile('music', track);
        }
    }

    /**
     * Generate UI audio placeholders
     */
    async generateUIAudio() {
        const uiSounds = [
            { name: 'button_click.mp3', duration: 0.2, description: 'Button click' },
            { name: 'button_hover.mp3', duration: 0.1, description: 'Button hover' },
            { name: 'menu_transition.mp3', duration: 0.8, description: 'Menu transition' },
            { name: 'notification.mp3', duration: 1.5, description: 'Achievement notification' },
            { name: 'error.mp3', duration: 0.5, description: 'Error sound' },
            { name: 'purchase_success.mp3', duration: 1.0, description: 'Purchase success' },
            { name: 'purchase_fail.mp3', duration: 0.8, description: 'Purchase failure' },
            { name: 'level_complete.mp3', duration: 3.0, description: 'Level completion' },
            { name: 'checkpoint.mp3', duration: 1.2, description: 'Checkpoint reached' }
        ];

        for (const sound of uiSounds) {
            await this.createPlaceholderFile('ui', sound);
        }
    }

    /**
     * Generate environment audio placeholders
     */
    async generateEnvironmentAudio() {
        const environmentSounds = [
            { name: 'wind_light.mp3', duration: 30.0, description: 'Light wind ambient' },
            { name: 'wind_heavy.mp3', duration: 25.0, description: 'Heavy wind with debris' },
            { name: 'rain_light.mp3', duration: 40.0, description: 'Light rain' },
            { name: 'thunder.mp3', duration: 4.0, description: 'Thunder crack' },
            { name: 'debris_impact.mp3', duration: 1.5, description: 'Debris impact' },
            { name: 'fire_crackle.mp3', duration: 20.0, description: 'Fire crackling' },
            { name: 'explosion_small.mp3', duration: 2.0, description: 'Small explosion' },
            { name: 'explosion_large.mp3', duration: 4.0, description: 'Large explosion' }
        ];

        for (const sound of environmentSounds) {
            await this.createPlaceholderFile('environment', sound);
        }
    }

    /**
     * Create a placeholder audio file
     */
    async createPlaceholderFile(category, soundSpec) {
        const filePath = path.join(this.audioDir, category, soundSpec.name);
        
        // Create a simple placeholder file with metadata
        const placeholderContent = this.generatePlaceholderContent(soundSpec);
        
        try {
            await fs.writeFile(filePath, placeholderContent);
            
            this.generatedFiles.push({
                path: filePath,
                category,
                name: soundSpec.name,
                duration: soundSpec.duration,
                description: soundSpec.description,
                size: placeholderContent.length
            });
            
            console.log(`📄 Created: ${category}/${soundSpec.name} (${soundSpec.duration}s)`);
            
        } catch (error) {
            console.error(`❌ Failed to create ${category}/${soundSpec.name}:`, error);
        }
    }

    /**
     * Generate placeholder file content
     */
    generatePlaceholderContent(soundSpec) {
        // Create a simple text-based placeholder that represents the audio file
        // In a real implementation, you would generate actual audio data
        const metadata = {
            name: soundSpec.name,
            duration: soundSpec.duration,
            description: soundSpec.description,
            format: 'mp3',
            placeholder: true,
            generated: new Date().toISOString(),
            size: Math.floor(soundSpec.duration * 32000) // Rough size estimate
        };
        
        // Create a simple binary-like placeholder
        const headerSize = 1024;
        const dataSize = Math.floor(soundSpec.duration * 32000);
        const totalSize = headerSize + dataSize;
        
        const buffer = Buffer.alloc(totalSize);
        
        // Write metadata as JSON in the header
        const metadataJson = JSON.stringify(metadata);
        buffer.write(metadataJson, 0, Math.min(metadataJson.length, headerSize - 1));
        
        // Fill the rest with pseudo-random data to simulate audio
        for (let i = headerSize; i < totalSize; i++) {
            buffer[i] = Math.floor(Math.random() * 256);
        }
        
        return buffer;
    }

    /**
     * Create audio manifest file
     */
    async createAudioManifest() {
        const manifest = {
            version: '1.0.0',
            generated: new Date().toISOString(),
            description: 'Zombie Car Game Audio Asset Manifest',
            totalFiles: this.generatedFiles.length,
            categories: {},
            files: {}
        };

        // Group files by category
        for (const file of this.generatedFiles) {
            if (!manifest.categories[file.category]) {
                manifest.categories[file.category] = {
                    count: 0,
                    totalDuration: 0,
                    totalSize: 0
                };
            }
            
            manifest.categories[file.category].count++;
            manifest.categories[file.category].totalDuration += file.duration;
            manifest.categories[file.category].totalSize += file.size;
            
            manifest.files[`${file.category}/${file.name}`] = {
                path: `audio/${file.category}/${file.name}`,
                duration: file.duration,
                description: file.description,
                size: file.size,
                category: file.category
            };
        }

        const manifestPath = path.join(this.audioDir, 'audio-manifest.json');
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
        
        console.log('📋 Created audio manifest:', manifestPath);
    }
}

// Run the generator if called directly
if (require.main === module) {
    const generator = new AudioPlaceholderGenerator();
    generator.generateAllPlaceholders()
        .then((files) => {
            console.log(`\n🎉 Successfully generated ${files.length} placeholder audio files!`);
            console.log('\n📊 Summary by category:');
            
            const categories = {};
            files.forEach(file => {
                if (!categories[file.category]) {
                    categories[file.category] = { count: 0, duration: 0 };
                }
                categories[file.category].count++;
                categories[file.category].duration += file.duration;
            });
            
            Object.entries(categories).forEach(([category, stats]) => {
                console.log(`   ${category}: ${stats.count} files, ${stats.duration.toFixed(1)}s total`);
            });
        })
        .catch((error) => {
            console.error('\n💥 Failed to generate audio placeholders:', error);
            process.exit(1);
        });
}

module.exports = AudioPlaceholderGenerator;