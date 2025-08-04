#!/usr/bin/env node

/**
 * Automated Screenshot Generation System
 * Generates marketing screenshots and promotional materials
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class ScreenshotGenerator {
    constructor() {
        this.outputDir = path.join(__dirname, '..', 'marketing', 'screenshots');
        this.gameExecutable = path.join(__dirname, '..', 'frontend', 'dist', 'zombie-car-game');
        this.scenarios = [
            {
                name: 'action-combat',
                description: 'Vehicle crushing zombies with particle effects',
                settings: {
                    level: 'city_outbreak',
                    vehicle: 'muscle_car',
                    zombieCount: 50,
                    weather: 'clear',
                    timeOfDay: 'day'
                },
                shots: [
                    { angle: 'chase_cam', timing: 5000 },
                    { angle: 'side_view', timing: 3000 },
                    { angle: 'overhead', timing: 2000 }
                ]
            },
            {
                name: 'garage-customization',
                description: 'Vehicle customization and upgrade interface',
                settings: {
                    screen: 'garage',
                    vehicle: 'sports_car',
                    showUpgrades: true,
                    showStats: true
                },
                shots: [
                    { view: 'main_garage', ui: 'full' },
                    { view: 'upgrade_menu', ui: 'focused' },
                    { view: 'paint_shop', ui: 'minimal' }
                ]
            },
            {
                name: 'environment-variety',
                description: 'Different biomes and weather conditions',
                settings: {
                    vehicle: 'suv',
                    zombieCount: 20
                },
                shots: [
                    { level: 'desert_wasteland', weather: 'sandstorm', timeOfDay: 'sunset' },
                    { level: 'forest_ruins', weather: 'rain', timeOfDay: 'night' },
                    { level: 'industrial_zone', weather: 'fog', timeOfDay: 'dawn' },
                    { level: 'suburban_nightmare', weather: 'clear', timeOfDay: 'day' }
                ]
            },
            {
                name: 'ui-polish',
                description: 'Professional menus and HUD elements',
                settings: {
                    showUI: true,
                    highQuality: true
                },
                shots: [
                    { screen: 'main_menu', animation: 'intro' },
                    { screen: 'level_select', animation: 'transition' },
                    { screen: 'settings', animation: 'none' },
                    { screen: 'achievements', animation: 'unlock' }
                ]
            },
            {
                name: 'vehicle-variety',
                description: 'Different vehicle types and customizations',
                settings: {
                    level: 'showcase_arena',
                    lighting: 'studio',
                    background: 'neutral'
                },
                shots: [
                    { vehicle: 'muscle_car', customization: 'racing' },
                    { vehicle: 'suv', customization: 'military' },
                    { vehicle: 'sports_car', customization: 'street' },
                    { vehicle: 'truck', customization: 'apocalypse' }
                ]
            }
        ];
    }

    async initialize() {
        try {
            await fs.mkdir(this.outputDir, { recursive: true });
            console.log(`Screenshot output directory created: ${this.outputDir}`);
        } catch (error) {
            console.error('Failed to create output directory:', error);
            throw error;
        }
    }

    async generateScreenshots() {
        console.log('Starting automated screenshot generation...');
        
        for (const scenario of this.scenarios) {
            console.log(`\nGenerating screenshots for: ${scenario.name}`);
            await this.generateScenarioScreenshots(scenario);
        }

        console.log('\nScreenshot generation completed!');
        await this.generateContactSheet();
    }

    async generateScenarioScreenshots(scenario) {
        const scenarioDir = path.join(this.outputDir, scenario.name);
        await fs.mkdir(scenarioDir, { recursive: true });

        if (scenario.shots) {
            for (let i = 0; i < scenario.shots.length; i++) {
                const shot = scenario.shots[i];
                const filename = `${scenario.name}_${i + 1}.png`;
                const filepath = path.join(scenarioDir, filename);

                console.log(`  Capturing: ${filename}`);
                await this.captureScreenshot(scenario, shot, filepath);
            }
        }
    }

    async captureScreenshot(scenario, shot, filepath) {
        // Create screenshot configuration
        const config = {
            scenario: scenario.name,
            settings: scenario.settings,
            shot: shot,
            output: filepath,
            resolution: '1920x1080',
            quality: 'ultra',
            format: 'png'
        };

        // Write temporary config file
        const configPath = path.join(__dirname, 'temp_screenshot_config.json');
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));

        try {
            // Launch game in screenshot mode
            const command = `"${this.gameExecutable}" --screenshot-mode --config="${configPath}"`;
            execSync(command, { 
                stdio: 'pipe',
                timeout: 30000 // 30 second timeout
            });

            console.log(`    ✓ Screenshot saved: ${path.basename(filepath)}`);
        } catch (error) {
            console.error(`    ✗ Failed to capture screenshot: ${error.message}`);
            
            // Generate placeholder if game capture fails
            await this.generatePlaceholderScreenshot(filepath, scenario, shot);
        } finally {
            // Clean up config file
            try {
                await fs.unlink(configPath);
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    }

    async generatePlaceholderScreenshot(filepath, scenario, shot) {
        // Create a placeholder image with scenario information
        const placeholderContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            margin: 0;
            padding: 40px;
            font-family: 'Arial', sans-serif;
            background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
            color: #ffffff;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            text-align: center;
        }
        .title {
            font-size: 48px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #ff6b35;
        }
        .subtitle {
            font-size: 24px;
            margin-bottom: 40px;
            color: #cccccc;
        }
        .details {
            font-size: 16px;
            line-height: 1.6;
            max-width: 600px;
            background: rgba(0,0,0,0.3);
            padding: 20px;
            border-radius: 10px;
        }
        .logo {
            position: absolute;
            bottom: 40px;
            right: 40px;
            font-size: 14px;
            color: #888;
        }
    </style>
</head>
<body>
    <div class="title">Zombie Car Game</div>
    <div class="subtitle">${scenario.description}</div>
    <div class="details">
        <strong>Scenario:</strong> ${scenario.name}<br>
        <strong>Shot Details:</strong> ${JSON.stringify(shot, null, 2)}<br>
        <strong>Settings:</strong> ${JSON.stringify(scenario.settings, null, 2)}
    </div>
    <div class="logo">Marketing Screenshot Placeholder</div>
</body>
</html>
        `;

        const htmlPath = filepath.replace('.png', '.html');
        await fs.writeFile(htmlPath, placeholderContent);
        
        console.log(`    ⚠ Placeholder created: ${path.basename(htmlPath)}`);
    }

    async generateContactSheet() {
        console.log('\nGenerating contact sheet...');
        
        const contactSheetHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Zombie Car Game - Marketing Screenshots</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f0f0f0;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .title {
            font-size: 36px;
            color: #333;
            margin-bottom: 10px;
        }
        .subtitle {
            font-size: 18px;
            color: #666;
        }
        .scenario {
            margin-bottom: 40px;
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .scenario-title {
            font-size: 24px;
            color: #333;
            margin-bottom: 10px;
            border-bottom: 2px solid #ff6b35;
            padding-bottom: 5px;
        }
        .scenario-description {
            font-size: 16px;
            color: #666;
            margin-bottom: 20px;
        }
        .screenshots {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .screenshot {
            text-align: center;
        }
        .screenshot img {
            max-width: 100%;
            height: auto;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        .screenshot-name {
            margin-top: 10px;
            font-size: 14px;
            color: #666;
        }
        .stats {
            background: #333;
            color: white;
            padding: 20px;
            border-radius: 10px;
            margin-top: 40px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">Zombie Car Game</div>
        <div class="subtitle">Marketing Screenshots Collection</div>
    </div>
    
    ${this.scenarios.map(scenario => `
        <div class="scenario">
            <div class="scenario-title">${scenario.name.replace(/-/g, ' ').toUpperCase()}</div>
            <div class="scenario-description">${scenario.description}</div>
            <div class="screenshots">
                ${scenario.shots ? scenario.shots.map((shot, index) => `
                    <div class="screenshot">
                        <img src="${scenario.name}/${scenario.name}_${index + 1}.png" 
                             alt="${scenario.name} screenshot ${index + 1}"
                             onerror="this.src='${scenario.name}/${scenario.name}_${index + 1}.html'">
                        <div class="screenshot-name">Shot ${index + 1}</div>
                    </div>
                `).join('') : '<div>No shots defined for this scenario</div>'}
            </div>
        </div>
    `).join('')}
    
    <div class="stats">
        <h3>Screenshot Collection Stats</h3>
        <p>Total Scenarios: ${this.scenarios.length}</p>
        <p>Total Screenshots: ${this.scenarios.reduce((total, scenario) => total + (scenario.shots ? scenario.shots.length : 0), 0)}</p>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>
        `;

        const contactSheetPath = path.join(this.outputDir, 'contact-sheet.html');
        await fs.writeFile(contactSheetPath, contactSheetHtml);
        
        console.log(`Contact sheet generated: ${contactSheetPath}`);
    }

    async generateVideoCaptures() {
        console.log('\nGenerating video capture configurations...');
        
        const videoConfigs = [
            {
                name: 'gameplay-trailer',
                duration: 60,
                scenes: [
                    { type: 'intro', duration: 5, settings: { screen: 'logo_splash' } },
                    { type: 'action', duration: 20, settings: { level: 'city_outbreak', intensity: 'high' } },
                    { type: 'customization', duration: 10, settings: { screen: 'garage', showcase: true } },
                    { type: 'environments', duration: 15, settings: { montage: true, levels: 'all' } },
                    { type: 'features', duration: 8, settings: { highlights: ['physics', 'ai', 'audio'] } },
                    { type: 'outro', duration: 2, settings: { screen: 'logo_end' } }
                ]
            },
            {
                name: 'physics-showcase',
                duration: 30,
                scenes: [
                    { type: 'vehicle_physics', duration: 15, settings: { focus: 'suspension', slowmo: true } },
                    { type: 'collision_physics', duration: 10, settings: { focus: 'damage', particles: true } },
                    { type: 'comparison', duration: 5, settings: { before_after: true } }
                ]
            },
            {
                name: 'ai-demonstration',
                duration: 30,
                scenes: [
                    { type: 'zombie_behavior', duration: 10, settings: { focus: 'pathfinding' } },
                    { type: 'swarm_intelligence', duration: 10, settings: { focus: 'group_behavior' } },
                    { type: 'difficulty_scaling', duration: 10, settings: { focus: 'adaptation' } }
                ]
            }
        ];

        const videoConfigDir = path.join(this.outputDir, '..', 'video-configs');
        await fs.mkdir(videoConfigDir, { recursive: true });

        for (const config of videoConfigs) {
            const configPath = path.join(videoConfigDir, `${config.name}.json`);
            await fs.writeFile(configPath, JSON.stringify(config, null, 2));
            console.log(`  Video config created: ${config.name}.json`);
        }
    }
}

// CLI Interface
async function main() {
    const generator = new ScreenshotGenerator();
    
    try {
        await generator.initialize();
        await generator.generateScreenshots();
        await generator.generateVideoCaptures();
        
        console.log('\n✅ Marketing material generation completed successfully!');
        console.log(`📁 Screenshots saved to: ${generator.outputDir}`);
        console.log(`🎬 Video configs saved to: ${path.join(generator.outputDir, '..', 'video-configs')}`);
        
    } catch (error) {
        console.error('\n❌ Marketing material generation failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = ScreenshotGenerator;