/**
 * Procedural Terrain Generator
 * 
 * Generates realistic terrain using Perlin noise and heightmaps with support for
 * different biomes, dynamic weather, time-of-day systems, and destructible elements.
 * 
 * Features:
 * - Perlin noise-based terrain generation
 * - Multiple biome support (city, desert, forest, industrial)
 * - Dynamic weather and time-of-day systems
 * - Destructible environment elements
 * - Optimized for real-time generation
 */

import PerlinNoise from './PerlinNoise';
import WeatherSystem from './WeatherSystem';

class ProceduralTerrainGenerator {
    constructor(options = {}) {
        this.options = {
            chunkSize: options.chunkSize || 256,
            heightScale: options.heightScale || 50,
            detailLevel: options.detailLevel || 4,
            seed: options.seed || Math.random() * 1000000,
            biomeBlending: options.biomeBlending || true,
            destructibleElements: options.destructibleElements || true,
            ...options
        };
        
        // Initialize noise generators
        this.terrainNoise = new PerlinNoise(this.options.seed);
        this.biomeNoise = new PerlinNoise(this.options.seed + 1000);
        this.detailNoise = new PerlinNoise(this.options.seed + 2000);
        this.vegetationNoise = new PerlinNoise(this.options.seed + 3000);
        
        // Weather and time system
        this.weatherSystem = new WeatherSystem();
        
        // Biome definitions
        this.biomes = new Map();
        this.initializeBiomes();
        
        // Terrain cache for performance
        this.terrainCache = new Map();
        this.maxCacheSize = 100;
        
        // Destructible elements tracking
        this.destructibleElements = new Map();
        
        // Generation statistics
        this.stats = {
            chunksGenerated: 0,
            cacheHits: 0,
            cacheMisses: 0,
            generationTime: 0,
            destructibleElementsCreated: 0
        };
        
        console.log('🌍 Procedural Terrain Generator initialized');
    }
    
    initializeBiomes() {
        // City Biome
        this.biomes.set('city', {
            name: 'Urban City',
            heightVariation: 0.3,
            baseHeight: 0.1,
            vegetationDensity: 0.1,
            buildingDensity: 0.8,
            roadDensity: 0.6,
            colors: {
                ground: '#666666',
                vegetation: '#2d5016',
                buildings: '#8a8a8a',
                roads: '#333333'
            },
            features: ['buildings', 'roads', 'streetlights', 'debris', 'abandoned_cars'],
            destructibleElements: ['windows', 'signs', 'barriers', 'lamp_posts'],
            weatherEffects: ['rain', 'fog', 'smog'],
            ambientSounds: ['traffic', 'sirens', 'urban_ambient']
        });
        
        // Desert Biome
        this.biomes.set('desert', {
            name: 'Wasteland Desert',
            heightVariation: 0.8,
            baseHeight: 0.0,
            vegetationDensity: 0.05,
            buildingDensity: 0.1,
            roadDensity: 0.2,
            colors: {
                ground: '#d2b48c',
                vegetation: '#8b7355',
                buildings: '#a0522d',
                roads: '#654321'
            },
            features: ['sand_dunes', 'cacti', 'rocks', 'ruins', 'bones'],
            destructibleElements: ['cacti', 'rock_formations', 'old_structures'],
            weatherEffects: ['sandstorm', 'heat_haze', 'clear'],
            ambientSounds: ['wind', 'desert_ambient']
        });
        
        // Forest Biome
        this.biomes.set('forest', {
            name: 'Dark Forest',
            heightVariation: 0.6,
            baseHeight: 0.2,
            vegetationDensity: 0.9,
            buildingDensity: 0.05,
            roadDensity: 0.1,
            colors: {
                ground: '#2d4a2b',
                vegetation: '#1a3d1a',
                buildings: '#8b4513',
                roads: '#654321'
            },
            features: ['trees', 'undergrowth', 'fallen_logs', 'streams', 'caves'],
            destructibleElements: ['trees', 'branches', 'logs', 'bushes'],
            weatherEffects: ['rain', 'fog', 'mist'],
            ambientSounds: ['forest_ambient', 'birds', 'rustling']
        });
        
        // Industrial Biome
        this.biomes.set('industrial', {
            name: 'Industrial Zone',
            heightVariation: 0.4,
            baseHeight: 0.05,
            vegetationDensity: 0.2,
            buildingDensity: 0.7,
            roadDensity: 0.5,
            colors: {
                ground: '#4a4a4a',
                vegetation: '#3d5016',
                buildings: '#696969',
                roads: '#2f2f2f'
            },
            features: ['factories', 'smokestacks', 'pipes', 'containers', 'machinery'],
            destructibleElements: ['pipes', 'containers', 'machinery', 'fences'],
            weatherEffects: ['smog', 'acid_rain', 'fog'],
            ambientSounds: ['machinery', 'steam', 'industrial_ambient']
        });
    }
    
    generateTerrain(centerX, centerZ, radius = 512) {
        const startTime = performance.now();
        
        // Calculate chunk bounds
        const chunkSize = this.options.chunkSize;
        const minChunkX = Math.floor((centerX - radius) / chunkSize);
        const maxChunkX = Math.floor((centerX + radius) / chunkSize);
        const minChunkZ = Math.floor((centerZ - radius) / chunkSize);
        const maxChunkZ = Math.floor((centerZ + radius) / chunkSize);
        
        const terrain = {
            chunks: new Map(),
            biomes: new Map(),
            features: [],
            destructibleElements: [],
            weatherData: this.weatherSystem.getCurrentWeather(),
            timeOfDay: this.weatherSystem.getTimeOfDay(),
            bounds: {
                minX: minChunkX * chunkSize,
                maxX: (maxChunkX + 1) * chunkSize,
                minZ: minChunkZ * chunkSize,
                maxZ: (maxChunkZ + 1) * chunkSize
            }
        };
        
        // Generate chunks
        for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
            for (let chunkZ = minChunkZ; chunkZ <= maxChunkZ; chunkZ++) {
                const chunk = this.generateChunk(chunkX, chunkZ);
                const chunkKey = `${chunkX},${chunkZ}`;
                terrain.chunks.set(chunkKey, chunk);
                
                // Extract biome information
                terrain.biomes.set(chunkKey, chunk.dominantBiome);
                
                // Collect features and destructible elements
                terrain.features.push(...chunk.features);
                terrain.destructibleElements.push(...chunk.destructibleElements);
            }
        }
        
        // Update statistics
        const generationTime = performance.now() - startTime;
        this.stats.generationTime += generationTime;
        
        console.log(`🌍 Generated terrain: ${terrain.chunks.size} chunks in ${generationTime.toFixed(2)}ms`);
        
        return terrain;
    }
    
    generateChunk(chunkX, chunkZ) {
        const chunkKey = `${chunkX},${chunkZ}`;
        
        // Check cache first
        if (this.terrainCache.has(chunkKey)) {
            this.stats.cacheHits++;
            return this.terrainCache.get(chunkKey);
        }
        
        this.stats.cacheMisses++;
        
        const chunkSize = this.options.chunkSize;
        const worldX = chunkX * chunkSize;
        const worldZ = chunkZ * chunkSize;
        
        // Generate heightmap
        const heightmap = this.generateHeightmap(worldX, worldZ, chunkSize);
        
        // Determine biome distribution
        const biomeMap = this.generateBiomeMap(worldX, worldZ, chunkSize);
        
        // Generate features based on biomes
        const features = this.generateFeatures(worldX, worldZ, chunkSize, biomeMap, heightmap);
        
        // Generate destructible elements
        const destructibleElements = this.generateDestructibleElements(
            worldX, worldZ, chunkSize, biomeMap, features
        );
        
        // Create chunk data
        const chunk = {
            x: chunkX,
            z: chunkZ,
            worldX: worldX,
            worldZ: worldZ,
            size: chunkSize,
            heightmap: heightmap,
            biomeMap: biomeMap,
            dominantBiome: this.getDominantBiome(biomeMap),
            features: features,
            destructibleElements: destructibleElements,
            generated: Date.now()
        };
        
        // Cache the chunk
        this.cacheChunk(chunkKey, chunk);
        
        this.stats.chunksGenerated++;
        this.stats.destructibleElementsCreated += destructibleElements.length;
        
        return chunk;
    }
    
    generateHeightmap(worldX, worldZ, size) {
        const heightmap = [];
        const scale = 0.01; // Noise scale
        
        for (let x = 0; x < size; x++) {
            heightmap[x] = [];
            for (let z = 0; z < size; z++) {
                const worldPosX = worldX + x;
                const worldPosZ = worldZ + z;
                
                // Multi-octave noise for realistic terrain
                let height = 0;
                let amplitude = 1;
                let frequency = scale;
                
                for (let octave = 0; octave < this.options.detailLevel; octave++) {
                    height += this.terrainNoise.noise(
                        worldPosX * frequency,
                        worldPosZ * frequency
                    ) * amplitude;
                    
                    amplitude *= 0.5;
                    frequency *= 2;
                }
                
                // Normalize and scale height
                height = (height + 1) * 0.5; // Normalize to 0-1
                height *= this.options.heightScale;
                
                heightmap[x][z] = height;
            }
        }
        
        return heightmap;
    }
    
    generateBiomeMap(worldX, worldZ, size) {
        const biomeMap = [];
        const biomeScale = 0.005; // Larger scale for biome transitions
        const biomeNames = Array.from(this.biomes.keys());
        
        for (let x = 0; x < size; x++) {
            biomeMap[x] = [];
            for (let z = 0; z < size; z++) {
                const worldPosX = worldX + x;
                const worldPosZ = worldZ + z;
                
                // Generate biome noise
                const biomeNoise = this.biomeNoise.noise(
                    worldPosX * biomeScale,
                    worldPosZ * biomeScale
                );
                
                // Map noise to biome index
                const biomeIndex = Math.floor(
                    ((biomeNoise + 1) * 0.5) * biomeNames.length
                );
                const clampedIndex = Math.max(0, Math.min(biomeNames.length - 1, biomeIndex));
                
                biomeMap[x][z] = biomeNames[clampedIndex];
            }
        }
        
        return biomeMap;
    }
    
    generateFeatures(worldX, worldZ, size, biomeMap, heightmap) {
        const features = [];
        const featureScale = 0.02;
        
        // Sample points for feature placement
        const sampleRate = 8; // Check every 8th point for performance
        
        for (let x = 0; x < size; x += sampleRate) {
            for (let z = 0; z < size; z += sampleRate) {
                const biome = this.biomes.get(biomeMap[x][z]);
                if (!biome) continue;
                
                const worldPosX = worldX + x;
                const worldPosZ = worldZ + z;
                const height = heightmap[x][z];
                
                // Generate feature placement noise
                const featureNoise = this.detailNoise.noise(
                    worldPosX * featureScale,
                    worldPosZ * featureScale
                );
                
                // Place features based on biome and noise
                biome.features.forEach(featureType => {
                    const placementChance = this.getFeaturePlacementChance(
                        featureType, biome, featureNoise, height
                    );
                    
                    if (Math.random() < placementChance) {
                        const feature = this.createFeature(
                            featureType, worldPosX, worldPosZ, height, biome
                        );
                        features.push(feature);
                    }
                });
            }
        }
        
        return features;
    }
    
    getFeaturePlacementChance(featureType, biome, noise, height) {
        let baseChance = 0.1;
        
        // Adjust chance based on feature type
        switch (featureType) {
            case 'buildings':
                baseChance = biome.buildingDensity * 0.3;
                break;
            case 'trees':
                baseChance = biome.vegetationDensity * 0.4;
                break;
            case 'roads':
                baseChance = biome.roadDensity * 0.2;
                break;
            case 'rocks':
                baseChance = 0.15;
                break;
            case 'debris':
                baseChance = 0.1;
                break;
            default:
                baseChance = 0.05;
        }
        
        // Modify based on noise (creates clustering)
        const noiseModifier = (noise + 1) * 0.5; // Normalize to 0-1
        baseChance *= (0.5 + noiseModifier);
        
        // Height-based modifications
        if (featureType === 'trees' && height < 5) {
            baseChance *= 0.5; // Fewer trees in low areas
        }
        
        return Math.min(1.0, baseChance);
    }
    
    createFeature(type, x, z, height, biome) {
        const feature = {
            id: `${type}_${x}_${z}_${Date.now()}`,
            type: type,
            position: { x, y: height, z },
            biome: biome.name,
            scale: 0.8 + Math.random() * 0.4, // Random scale variation
            rotation: Math.random() * Math.PI * 2,
            health: this.getFeatureHealth(type),
            maxHealth: this.getFeatureHealth(type),
            destructible: biome.destructibleElements.includes(type),
            created: Date.now()
        };
        
        // Add type-specific properties
        switch (type) {
            case 'buildings':
                feature.height = 10 + Math.random() * 20;
                feature.width = 8 + Math.random() * 12;
                feature.depth = 8 + Math.random() * 12;
                feature.windows = Math.floor(feature.height / 3) * 4;
                break;
                
            case 'trees':
                feature.height = 5 + Math.random() * 15;
                feature.trunkRadius = 0.3 + Math.random() * 0.7;
                feature.canopyRadius = 2 + Math.random() * 4;
                break;
                
            case 'rocks':
                feature.height = 1 + Math.random() * 3;
                feature.width = 1 + Math.random() * 2;
                feature.depth = 1 + Math.random() * 2;
                break;
                
            case 'roads':
                feature.width = 4 + Math.random() * 2;
                feature.length = 20 + Math.random() * 30;
                feature.direction = Math.random() * Math.PI * 2;
                break;
        }
        
        return feature;
    }
    
    getFeatureHealth(type) {
        const healthMap = {
            buildings: 500,
            trees: 100,
            rocks: 200,
            roads: 50,
            debris: 25,
            containers: 150,
            machinery: 300,
            pipes: 75,
            fences: 50
        };
        
        return healthMap[type] || 100;
    }
    
    generateDestructibleElements(worldX, worldZ, size, biomeMap, features) {
        const destructibleElements = [];
        
        // Add destructible elements based on features
        features.forEach(feature => {
            if (feature.destructible) {
                const elements = this.createDestructibleElementsForFeature(feature);
                destructibleElements.push(...elements);
            }
        });
        
        // Add standalone destructible elements
        const elementScale = 0.03;
        const sampleRate = 16;
        
        for (let x = 0; x < size; x += sampleRate) {
            for (let z = 0; z < size; z += sampleRate) {
                const biome = this.biomes.get(biomeMap[x][z]);
                if (!biome) continue;
                
                const worldPosX = worldX + x;
                const worldPosZ = worldZ + z;
                
                const elementNoise = this.detailNoise.noise(
                    worldPosX * elementScale,
                    worldPosZ * elementScale
                );
                
                biome.destructibleElements.forEach(elementType => {
                    if (Math.random() < 0.05 && elementNoise > 0.3) {
                        const element = this.createDestructibleElement(
                            elementType, worldPosX, worldPosZ, biome
                        );
                        destructibleElements.push(element);
                    }
                });
            }
        }
        
        return destructibleElements;
    }
    
    createDestructibleElementsForFeature(feature) {
        const elements = [];
        
        switch (feature.type) {
            case 'buildings':
                // Add windows
                for (let i = 0; i < feature.windows; i++) {
                    elements.push({
                        id: `window_${feature.id}_${i}`,
                        type: 'window',
                        parentFeature: feature.id,
                        position: {
                            x: feature.position.x + (Math.random() - 0.5) * feature.width,
                            y: feature.position.y + Math.random() * feature.height,
                            z: feature.position.z + (Math.random() - 0.5) * feature.depth
                        },
                        health: 25,
                        maxHealth: 25,
                        destructible: true
                    });
                }
                break;
                
            case 'trees':
                // Add branches
                const branchCount = Math.floor(feature.height / 3);
                for (let i = 0; i < branchCount; i++) {
                    elements.push({
                        id: `branch_${feature.id}_${i}`,
                        type: 'branch',
                        parentFeature: feature.id,
                        position: {
                            x: feature.position.x + (Math.random() - 0.5) * 2,
                            y: feature.position.y + (i + 1) * 3,
                            z: feature.position.z + (Math.random() - 0.5) * 2
                        },
                        health: 50,
                        maxHealth: 50,
                        destructible: true
                    });
                }
                break;
        }
        
        return elements;
    }
    
    createDestructibleElement(type, x, z, biome) {
        return {
            id: `${type}_${x}_${z}_${Date.now()}`,
            type: type,
            position: { x, y: 0, z }, // Y will be adjusted based on terrain
            biome: biome.name,
            health: this.getFeatureHealth(type),
            maxHealth: this.getFeatureHealth(type),
            destructible: true,
            scale: 0.8 + Math.random() * 0.4,
            rotation: Math.random() * Math.PI * 2,
            created: Date.now()
        };
    }
    
    getDominantBiome(biomeMap) {
        const biomeCounts = new Map();
        
        biomeMap.forEach(row => {
            row.forEach(biome => {
                biomeCounts.set(biome, (biomeCounts.get(biome) || 0) + 1);
            });
        });
        
        let dominantBiome = 'city';
        let maxCount = 0;
        
        for (const [biome, count] of biomeCounts) {
            if (count > maxCount) {
                maxCount = count;
                dominantBiome = biome;
            }
        }
        
        return dominantBiome;
    }
    
    cacheChunk(key, chunk) {
        // Remove oldest entries if cache is full
        if (this.terrainCache.size >= this.maxCacheSize) {
            const oldestKey = this.terrainCache.keys().next().value;
            this.terrainCache.delete(oldestKey);
        }
        
        this.terrainCache.set(key, chunk);
    }
    
    // Terrain modification methods
    modifyTerrain(x, z, radius, heightDelta) {
        // Find affected chunks
        const chunkSize = this.options.chunkSize;
        const minChunkX = Math.floor((x - radius) / chunkSize);
        const maxChunkX = Math.floor((x + radius) / chunkSize);
        const minChunkZ = Math.floor((z - radius) / chunkSize);
        const maxChunkZ = Math.floor((z + radius) / chunkSize);
        
        const modifiedChunks = [];
        
        for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
            for (let chunkZ = minChunkZ; chunkZ <= maxChunkZ; chunkZ++) {
                const chunkKey = `${chunkX},${chunkZ}`;
                const chunk = this.terrainCache.get(chunkKey);
                
                if (chunk) {
                    this.modifyChunkTerrain(chunk, x, z, radius, heightDelta);
                    modifiedChunks.push(chunk);
                }
            }
        }
        
        return modifiedChunks;
    }
    
    modifyChunkTerrain(chunk, centerX, centerZ, radius, heightDelta) {
        const radiusSquared = radius * radius;
        
        for (let x = 0; x < chunk.size; x++) {
            for (let z = 0; z < chunk.size; z++) {
                const worldX = chunk.worldX + x;
                const worldZ = chunk.worldZ + z;
                
                const dx = worldX - centerX;
                const dz = worldZ - centerZ;
                const distanceSquared = dx * dx + dz * dz;
                
                if (distanceSquared <= radiusSquared) {
                    const distance = Math.sqrt(distanceSquared);
                    const falloff = 1 - (distance / radius);
                    const modification = heightDelta * falloff;
                    
                    chunk.heightmap[x][z] += modification;
                }
            }
        }
    }
    
    destroyElement(elementId) {
        const element = this.destructibleElements.get(elementId);
        if (element && element.destructible) {
            element.health = 0;
            element.destroyed = true;
            element.destroyedAt = Date.now();
            
            // Create debris
            this.createDebris(element);
            
            return true;
        }
        return false;
    }
    
    createDebris(element) {
        const debrisCount = Math.floor(2 + Math.random() * 4);
        
        for (let i = 0; i < debrisCount; i++) {
            const debris = {
                id: `debris_${element.id}_${i}`,
                type: 'debris',
                position: {
                    x: element.position.x + (Math.random() - 0.5) * 4,
                    y: element.position.y,
                    z: element.position.z + (Math.random() - 0.5) * 4
                },
                scale: 0.2 + Math.random() * 0.3,
                rotation: Math.random() * Math.PI * 2,
                velocity: {
                    x: (Math.random() - 0.5) * 10,
                    y: Math.random() * 5,
                    z: (Math.random() - 0.5) * 10
                },
                lifetime: 30000, // 30 seconds
                created: Date.now()
            };
            
            // Add to temporary debris list (would be managed by physics system)
            console.log(`💥 Created debris: ${debris.id}`);
        }
    }
    
    // Weather and time integration
    updateEnvironment(deltaTime) {
        this.weatherSystem.update(deltaTime);
    }
    
    getCurrentWeather() {
        return this.weatherSystem.getCurrentWeather();
    }
    
    getTimeOfDay() {
        return this.weatherSystem.getTimeOfDay();
    }
    
    // Statistics and debugging
    getStatistics() {
        return {
            ...this.stats,
            cacheSize: this.terrainCache.size,
            cacheHitRate: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses),
            averageGenerationTime: this.stats.generationTime / Math.max(1, this.stats.chunksGenerated),
            destructibleElementsActive: this.destructibleElements.size
        };
    }
    
    clearCache() {
        this.terrainCache.clear();
        console.log('🌍 Terrain cache cleared');
    }
    
    getBiomeAt(x, z) {
        const chunkSize = this.options.chunkSize;
        const chunkX = Math.floor(x / chunkSize);
        const chunkZ = Math.floor(z / chunkSize);
        const chunkKey = `${chunkX},${chunkZ}`;
        
        const chunk = this.terrainCache.get(chunkKey);
        if (chunk) {
            const localX = Math.floor(x - chunk.worldX);
            const localZ = Math.floor(z - chunk.worldZ);
            
            if (localX >= 0 && localX < chunkSize && localZ >= 0 && localZ < chunkSize) {
                return chunk.biomeMap[localX][localZ];
            }
        }
        
        // Fallback: generate biome on demand
        const biomeNoise = this.biomeNoise.noise(x * 0.005, z * 0.005);
        const biomeNames = Array.from(this.biomes.keys());
        const biomeIndex = Math.floor(((biomeNoise + 1) * 0.5) * biomeNames.length);
        return biomeNames[Math.max(0, Math.min(biomeNames.length - 1, biomeIndex))];
    }
    
    getHeightAt(x, z) {
        const chunkSize = this.options.chunkSize;
        const chunkX = Math.floor(x / chunkSize);
        const chunkZ = Math.floor(z / chunkSize);
        const chunkKey = `${chunkX},${chunkZ}`;
        
        const chunk = this.terrainCache.get(chunkKey);
        if (chunk) {
            const localX = Math.floor(x - chunk.worldX);
            const localZ = Math.floor(z - chunk.worldZ);
            
            if (localX >= 0 && localX < chunkSize && localZ >= 0 && localZ < chunkSize) {
                return chunk.heightmap[localX][localZ];
            }
        }
        
        // Fallback: generate height on demand
        let height = 0;
        let amplitude = 1;
        let frequency = 0.01;
        
        for (let octave = 0; octave < this.options.detailLevel; octave++) {
            height += this.terrainNoise.noise(x * frequency, z * frequency) * amplitude;
            amplitude *= 0.5;
            frequency *= 2;
        }
        
        return ((height + 1) * 0.5) * this.options.heightScale;
    }
}

export default ProceduralTerrainGenerator;