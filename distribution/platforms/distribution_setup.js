#!/usr/bin/env node

/**
 * Multi-Platform Distribution Setup
 * Configures and prepares game for distribution across multiple platforms
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class DistributionSetup {
    constructor() {
        this.platforms = {
            steam: {
                name: 'Steam',
                enabled: true,
                configPath: 'distribution/steam/steam_config.json',
                buildScript: 'npm run build:steam',
                uploadScript: 'steamcmd +login $STEAM_USERNAME $STEAM_PASSWORD +run_app_build steam_app_build.vdf +quit'
            },
            epic: {
                name: 'Epic Games Store',
                enabled: true,
                configPath: 'distribution/epic/epic_config.json',
                buildScript: 'npm run build:epic',
                uploadScript: 'epic-games-cli upload'
            },
            gog: {
                name: 'GOG',
                enabled: true,
                configPath: 'distribution/gog/gog_config.json',
                buildScript: 'npm run build:gog',
                uploadScript: 'gog-galaxy-pipeline upload'
            },
            itch: {
                name: 'itch.io',
                enabled: true,
                configPath: 'distribution/itch/itch_config.json',
                buildScript: 'npm run build:itch',
                uploadScript: 'butler push dist/itch zombiecargame/zombie-car-game:windows'
            },
            microsoft: {
                name: 'Microsoft Store',
                enabled: false,
                configPath: 'distribution/microsoft/microsoft_config.json',
                buildScript: 'npm run build:microsoft',
                uploadScript: 'partner-center-cli upload'
            },
            mac_app_store: {
                name: 'Mac App Store',
                enabled: false,
                configPath: 'distribution/mac/mac_config.json',
                buildScript: 'npm run build:mac-store',
                uploadScript: 'xcrun altool --upload-app'
            },
            direct: {
                name: 'Direct Sales',
                enabled: true,
                configPath: 'distribution/direct/direct_config.json',
                buildScript: 'npm run build:direct',
                uploadScript: 'aws s3 sync dist/direct s3://zombiecargame-releases/'
            }
        };

        this.gameInfo = {
            name: 'Zombie Car Game',
            version: '1.0.0',
            developer: 'Independent Developer',
            publisher: 'Independent Developer',
            website: 'https://zombiecargame.com',
            supportEmail: 'support@zombiecargame.com'
        };
    }

    async initialize() {
        console.log('Initializing distribution setup...');
        
        try {
            await this.createDirectoryStructure();
            await this.generatePlatformConfigs();
            await this.setupBuildScripts();
            await this.createUploadScripts();
            await this.generateDocumentation();
            
            console.log('✅ Distribution setup completed successfully!');
        } catch (error) {
            console.error('❌ Distribution setup failed:', error);
            throw error;
        }
    }

    async createDirectoryStructure() {
        console.log('Creating directory structure...');
        
        const directories = [
            'distribution',
            'distribution/steam',
            'distribution/epic',
            'distribution/gog',
            'distribution/itch',
            'distribution/microsoft',
            'distribution/mac',
            'distribution/direct',
            'distribution/assets',
            'distribution/scripts',
            'builds',
            'builds/steam',
            'builds/epic',
            'builds/gog',
            'builds/itch',
            'builds/microsoft',
            'builds/mac',
            'builds/direct'
        ];

        for (const dir of directories) {
            await fs.mkdir(dir, { recursive: true });
            console.log(`  Created: ${dir}`);
        }
    }

    async generatePlatformConfigs() {
        console.log('Generating platform configurations...');

        // Epic Games Store Config
        const epicConfig = {
            product_id: 'TBD',
            product_name: this.gameInfo.name,
            developer_name: this.gameInfo.developer,
            publisher_name: this.gameInfo.publisher,
            description: {
                short: 'Drive through zombie-infested landscapes in this intense survival action game.',
                long: 'Zombie Car Game combines intense vehicular combat with survival horror elements...'
            },
            categories: ['Action', 'Indie', 'Simulation'],
            tags: ['zombies', 'driving', 'survival', 'physics', 'indie'],
            age_rating: {
                esrb: 'T',
                pegi: '16'
            },
            pricing: {
                base_price: 19.99,
                currency: 'USD'
            },
            system_requirements: {
                windows: {
                    minimum: {
                        os: 'Windows 10 64-bit',
                        processor: 'Intel Core i5-4590 / AMD FX 8350',
                        memory: '8 GB RAM',
                        graphics: 'NVIDIA GTX 960 / AMD R9 280',
                        storage: '4 GB available space'
                    }
                }
            },
            features: {
                achievements: true,
                cloud_saves: true,
                controller_support: true
            }
        };

        await fs.writeFile(
            'distribution/epic/epic_config.json',
            JSON.stringify(epicConfig, null, 2)
        );

        // GOG Config
        const gogConfig = {
            game_id: 'TBD',
            title: this.gameInfo.name,
            developer: this.gameInfo.developer,
            publisher: this.gameInfo.publisher,
            genre: ['Action', 'Indie', 'Racing'],
            description: 'DRM-free zombie survival driving game with realistic physics.',
            features: [
                'Single-player',
                'Achievements',
                'Cloud saves',
                'Controller support',
                'No DRM'
            ],
            system_requirements: {
                minimum: {
                    system: 'Windows 10 (64-bit)',
                    processor: 'Intel Core i5-4590 / AMD FX 8350',
                    memory: '8 GB RAM',
                    graphics: 'NVIDIA GTX 960 / AMD R9 280',
                    storage: '4 GB'
                }
            },
            languages: {
                interface: ['English'],
                audio: ['English'],
                subtitles: ['English']
            },
            drm_free: true,
            offline_mode: true
        };

        await fs.writeFile(
            'distribution/gog/gog_config.json',
            JSON.stringify(gogConfig, null, 2)
        );

        // itch.io Config
        const itchConfig = {
            game: 'zombie-car-game',
            user: 'zombiecargame',
            display_name: this.gameInfo.name,
            short_text: 'Zombie survival meets vehicular combat',
            description: 'Drive through zombie-infested landscapes...',
            tags: ['action', 'zombies', 'driving', 'survival', 'physics'],
            classification: 'games',
            kind: 'default',
            pricing: {
                type: 'paid',
                price: 19.99,
                currency: 'USD'
            },
            platforms: {
                windows: true,
                mac: true,
                linux: true
            },
            features: {
                can_be_bought: true,
                has_demo: false,
                in_press_system: true
            }
        };

        await fs.writeFile(
            'distribution/itch/itch_config.json',
            JSON.stringify(itchConfig, null, 2)
        );

        // Direct Sales Config
        const directConfig = {
            product_name: this.gameInfo.name,
            version: this.gameInfo.version,
            platforms: ['windows', 'mac', 'linux'],
            pricing: {
                base_price: 19.99,
                currency: 'USD',
                regional_pricing: true
            },
            distribution: {
                cdn_url: 'https://cdn.zombiecargame.com',
                download_servers: [
                    'https://dl1.zombiecargame.com',
                    'https://dl2.zombiecargame.com'
                ],
                torrent_enabled: false
            },
            drm: {
                enabled: false,
                activation_required: false,
                online_check: false
            },
            updates: {
                auto_update: true,
                delta_patching: true,
                update_server: 'https://updates.zombiecargame.com'
            },
            analytics: {
                enabled: true,
                endpoint: 'https://analytics.zombiecargame.com'
            }
        };

        await fs.writeFile(
            'distribution/direct/direct_config.json',
            JSON.stringify(directConfig, null, 2)
        );

        console.log('  Platform configurations generated');
    }

    async setupBuildScripts() {
        console.log('Setting up build scripts...');

        // Steam build script
        const steamBuildScript = `#!/bin/bash
# Steam Build Script

echo "Building for Steam..."

# Set Steam-specific environment variables
export STEAM_BUILD=true
export PLATFORM=steam

# Build the game
npm run build:prod

# Copy Steam-specific files
cp distribution/steam/steam_api64.dll dist/
cp distribution/steam/steam_appid.txt dist/

# Create Steam depot structure
mkdir -p builds/steam/content
cp -r dist/* builds/steam/content/

# Generate Steam build VDF
node distribution/scripts/generate-steam-vdf.js

echo "Steam build completed!"
`;

        await fs.writeFile('distribution/scripts/build-steam.sh', steamBuildScript);

        // Epic build script
        const epicBuildScript = `#!/bin/bash
# Epic Games Store Build Script

echo "Building for Epic Games Store..."

# Set Epic-specific environment variables
export EPIC_BUILD=true
export PLATFORM=epic

# Build the game
npm run build:prod

# Copy Epic-specific files
cp distribution/epic/epic_eos.dll dist/

# Create Epic build structure
mkdir -p builds/epic
cp -r dist/* builds/epic/

echo "Epic Games Store build completed!"
`;

        await fs.writeFile('distribution/scripts/build-epic.sh', epicBuildScript);

        // GOG build script
        const gogBuildScript = `#!/bin/bash
# GOG Build Script

echo "Building for GOG..."

# Set GOG-specific environment variables
export GOG_BUILD=true
export PLATFORM=gog
export DRM_FREE=true

# Build the game
npm run build:prod

# Remove any DRM-related files
rm -f dist/steam_api*.dll
rm -f dist/epic_eos.dll

# Create GOG build structure
mkdir -p builds/gog
cp -r dist/* builds/gog/

# Create GOG installer
node distribution/scripts/create-gog-installer.js

echo "GOG build completed!"
`;

        await fs.writeFile('distribution/scripts/build-gog.sh', gogBuildScript);

        // Make scripts executable
        try {
            execSync('chmod +x distribution/scripts/*.sh');
        } catch (error) {
            console.log('  Note: Could not set execute permissions (Windows?)');
        }

        console.log('  Build scripts created');
    }

    async createUploadScripts() {
        console.log('Creating upload scripts...');

        // Steam upload script
        const steamUploadScript = `#!/bin/bash
# Steam Upload Script

if [ -z "$STEAM_USERNAME" ] || [ -z "$STEAM_PASSWORD" ]; then
    echo "Error: STEAM_USERNAME and STEAM_PASSWORD environment variables must be set"
    exit 1
fi

echo "Uploading to Steam..."

# Use SteamCMD to upload
steamcmd +login $STEAM_USERNAME $STEAM_PASSWORD +run_app_build builds/steam/app_build.vdf +quit

echo "Steam upload completed!"
`;

        await fs.writeFile('distribution/scripts/upload-steam.sh', steamUploadScript);

        // itch.io upload script
        const itchUploadScript = `#!/bin/bash
# itch.io Upload Script

if [ -z "$BUTLER_API_KEY" ]; then
    echo "Error: BUTLER_API_KEY environment variable must be set"
    exit 1
fi

echo "Uploading to itch.io..."

# Upload Windows build
butler push builds/itch/windows zombiecargame/zombie-car-game:windows --userversion $1

# Upload Mac build
butler push builds/itch/mac zombiecargame/zombie-car-game:mac --userversion $1

# Upload Linux build
butler push builds/itch/linux zombiecargame/zombie-car-game:linux --userversion $1

echo "itch.io upload completed!"
`;

        await fs.writeFile('distribution/scripts/upload-itch.sh', itchUploadScript);

        // Direct sales upload script
        const directUploadScript = `#!/bin/bash
# Direct Sales Upload Script

if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "Error: AWS credentials must be set"
    exit 1
fi

echo "Uploading to direct sales servers..."

# Upload to S3
aws s3 sync builds/direct s3://zombiecargame-releases/v$1/ --delete

# Update CDN
aws cloudfront create-invalidation --distribution-id $CDN_DISTRIBUTION_ID --paths "/*"

# Update download manifest
node distribution/scripts/update-download-manifest.js $1

echo "Direct sales upload completed!"
`;

        await fs.writeFile('distribution/scripts/upload-direct.sh', directUploadScript);

        console.log('  Upload scripts created');
    }

    async generateDocumentation() {
        console.log('Generating distribution documentation...');

        const distributionGuide = `# Distribution Guide

## Overview

This guide covers the distribution process for Zombie Car Game across multiple platforms.

## Supported Platforms

### Primary Platforms
- **Steam**: Largest PC gaming platform
- **Epic Games Store**: Growing platform with exclusive deals
- **GOG**: DRM-free distribution
- **itch.io**: Indie-friendly platform

### Secondary Platforms
- **Microsoft Store**: Windows 10/11 integration
- **Mac App Store**: macOS users
- **Direct Sales**: Official website sales

## Build Process

### Prerequisites
1. Node.js 18+ installed
2. Platform-specific SDKs and tools
3. Code signing certificates
4. Platform developer accounts

### Building for All Platforms
\`\`\`bash
# Build all platforms
npm run build:all-platforms

# Or build individually
npm run build:steam
npm run build:epic
npm run build:gog
npm run build:itch
\`\`\`

### Platform-Specific Requirements

#### Steam
- SteamWorks SDK integration
- Steam App ID and depot configuration
- Steam DRM (optional)
- Achievement integration

#### Epic Games Store
- Epic Online Services SDK
- Epic Games Launcher integration
- Achievement system
- Cloud save support

#### GOG
- DRM-free build (no platform SDKs)
- GOG Galaxy integration (optional)
- Offline mode support

#### itch.io
- Butler CLI tool for uploads
- Simple executable distribution
- Optional itch.io app integration

## Upload Process

### Environment Variables
Set the following environment variables:

\`\`\`bash
# Steam
export STEAM_USERNAME="your_steam_username"
export STEAM_PASSWORD="your_steam_password"

# itch.io
export BUTLER_API_KEY="your_butler_api_key"

# AWS (for direct sales)
export AWS_ACCESS_KEY_ID="your_aws_key"
export AWS_SECRET_ACCESS_KEY="your_aws_secret"
\`\`\`

### Upload Commands
\`\`\`bash
# Upload to Steam
./distribution/scripts/upload-steam.sh

# Upload to itch.io
./distribution/scripts/upload-itch.sh 1.0.0

# Upload to direct sales
./distribution/scripts/upload-direct.sh 1.0.0
\`\`\`

## Release Checklist

### Pre-Release
- [ ] All builds tested on target platforms
- [ ] Code signing certificates valid
- [ ] Store pages updated with latest information
- [ ] Marketing materials prepared
- [ ] Press kits distributed

### Release Day
- [ ] Upload builds to all platforms
- [ ] Update store pages with release information
- [ ] Activate store listings
- [ ] Monitor for issues
- [ ] Respond to community feedback

### Post-Release
- [ ] Monitor crash reports and user feedback
- [ ] Prepare patches for critical issues
- [ ] Plan content updates and DLC
- [ ] Analyze sales and user metrics

## Platform-Specific Notes

### Steam
- Review process: 1-3 days
- Can update builds without re-review
- Steam Workshop support available
- Extensive analytics and community features

### Epic Games Store
- Review process: 1-2 weeks
- Stricter content guidelines
- Exclusive deals possible
- Growing user base

### GOG
- Curation process: 2-4 weeks
- Focus on DRM-free gaming
- Quality-focused audience
- Manual review required

### itch.io
- No review process
- Immediate publishing
- Indie-focused community
- Flexible pricing options

## Troubleshooting

### Common Issues
1. **Build Failures**: Check platform-specific dependencies
2. **Upload Errors**: Verify credentials and network connectivity
3. **Store Rejections**: Review platform guidelines and requirements
4. **Performance Issues**: Test on minimum system requirements

### Support Contacts
- Steam: steamworks-support@valvesoftware.com
- Epic: epic-games-store-support@epicgames.com
- GOG: developers@gog.com
- itch.io: support@itch.io

## Analytics and Monitoring

### Key Metrics to Track
- Sales by platform
- User engagement and retention
- Crash reports and error rates
- Performance metrics
- User reviews and feedback

### Tools
- Steam Analytics
- Epic Games Store Analytics
- GOG Developer Portal
- itch.io Analytics
- Custom telemetry system

## Updates and Patches

### Update Process
1. Develop and test fixes
2. Build updated versions
3. Upload to platforms
4. Coordinate release timing
5. Monitor deployment

### Platform Update Policies
- **Steam**: Automatic updates, user can disable
- **Epic**: Automatic updates, background download
- **GOG**: Manual updates through GOG Galaxy
- **itch.io**: Manual updates through itch app

## Legal and Compliance

### Age Ratings
- ESRB: T (Teen) for Violence, Blood and Gore
- PEGI: 16 for Violence
- Update ratings if content changes

### Regional Restrictions
- Check local laws and regulations
- Some regions may restrict violent content
- Adjust marketing and availability accordingly

### Privacy and Data Protection
- GDPR compliance for EU users
- CCPA compliance for California users
- Clear privacy policy and data handling

## Marketing Integration

### Store Optimization
- Compelling store descriptions
- High-quality screenshots and videos
- Regular updates and community engagement
- Seasonal sales and promotions

### Cross-Platform Promotion
- Coordinate marketing across platforms
- Platform-specific features and benefits
- Community building and engagement
- Influencer and press outreach
`;

        await fs.writeFile('distribution/DISTRIBUTION_GUIDE.md', distributionGuide);

        // Platform comparison document
        const platformComparison = `# Platform Comparison

| Feature | Steam | Epic | GOG | itch.io | Direct |
|---------|-------|------|-----|---------|--------|
| Revenue Share | 70% | 88% | 70% | 90-95% | 95-100% |
| Review Process | 1-3 days | 1-2 weeks | 2-4 weeks | None | N/A |
| DRM Required | Optional | No | No | No | No |
| Auto Updates | Yes | Yes | Optional | Optional | Yes |
| Achievements | Yes | Yes | Optional | No | Custom |
| Cloud Saves | Yes | Yes | Optional | No | Custom |
| Community Features | Extensive | Basic | Basic | Basic | Custom |
| Marketing Support | High | Medium | Medium | Low | Self |
| Audience Size | Largest | Growing | Medium | Small | Variable |
| Indie Friendly | Medium | Medium | High | Very High | N/A |

## Recommendations

### Primary Focus
1. **Steam** - Largest audience, best features
2. **itch.io** - Easy launch, indie community
3. **Direct Sales** - Highest revenue share

### Secondary Focus
1. **Epic Games Store** - Growing platform, better revenue
2. **GOG** - DRM-free audience, quality focus

### Future Consideration
1. **Console Platforms** - Xbox, PlayStation, Nintendo Switch
2. **Mobile Platforms** - iOS, Android (adapted version)
3. **VR Platforms** - Steam VR, Oculus Store
`;

        await fs.writeFile('distribution/PLATFORM_COMPARISON.md', platformComparison);

        console.log('  Distribution documentation generated');
    }

    async generateReleaseScript() {
        console.log('Generating release automation script...');

        const releaseScript = `#!/bin/bash
# Automated Release Script

VERSION=$1
if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version>"
    echo "Example: $0 1.0.0"
    exit 1
fi

echo "Starting release process for version $VERSION..."

# Update version in package.json
npm version $VERSION --no-git-tag-version

# Build all platforms
echo "Building all platforms..."
npm run build:all-platforms

# Run final tests
echo "Running final tests..."
npm test

# Upload to platforms
echo "Uploading to platforms..."
./distribution/scripts/upload-steam.sh
./distribution/scripts/upload-itch.sh $VERSION
./distribution/scripts/upload-direct.sh $VERSION

# Create git tag
git add .
git commit -m "Release version $VERSION"
git tag -a "v$VERSION" -m "Release version $VERSION"
git push origin main
git push origin "v$VERSION"

echo "Release $VERSION completed successfully!"
echo "Don't forget to:"
echo "- Update store pages"
echo "- Announce on social media"
echo "- Monitor for issues"
`;

        await fs.writeFile('distribution/scripts/release.sh', releaseScript);

        try {
            execSync('chmod +x distribution/scripts/release.sh');
        } catch (error) {
            console.log('  Note: Could not set execute permissions');
        }

        console.log('  Release automation script generated');
    }

    async validateSetup() {
        console.log('Validating distribution setup...');

        const requiredFiles = [
            'distribution/steam/steam_config.json',
            'distribution/epic/epic_config.json',
            'distribution/gog/gog_config.json',
            'distribution/itch/itch_config.json',
            'distribution/direct/direct_config.json',
            'distribution/scripts/build-steam.sh',
            'distribution/scripts/upload-steam.sh',
            'distribution/DISTRIBUTION_GUIDE.md'
        ];

        for (const file of requiredFiles) {
            try {
                await fs.access(file);
                console.log(`  ✓ ${file}`);
            } catch (error) {
                console.log(`  ✗ ${file} - Missing!`);
            }
        }

        console.log('Distribution setup validation completed');
    }
}

// CLI Interface
async function main() {
    const setup = new DistributionSetup();
    
    try {
        await setup.initialize();
        await setup.generateReleaseScript();
        await setup.validateSetup();
        
        console.log('\n🎉 Distribution setup completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Configure platform-specific credentials');
        console.log('2. Test builds on each platform');
        console.log('3. Set up store pages and marketing materials');
        console.log('4. Run ./distribution/scripts/release.sh <version> to release');
        
    } catch (error) {
        console.error('\n❌ Distribution setup failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = DistributionSetup;