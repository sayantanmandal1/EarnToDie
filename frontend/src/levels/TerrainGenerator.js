import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ENVIRONMENT_TYPES, OBSTACLE_TYPES } from './LevelConfig.js';

/**
 * TerrainGenerator for procedural and designed level layouts
 */
export default class TerrainGenerator {
    constructor(scene, physicsWorld) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        
        // Terrain properties
        this.terrainMesh = null;
        this.terrainBody = null;
        this.obstacles = [];
        
        // Materials for different environments
        this.materials = this.createMaterials();
    }

    /**
     * Create materials for different environment types
     */
    createMaterials() {
        return {
            [ENVIRONMENT_TYPES.CITY]: {
                ground: new THREE.MeshLambertMaterial({ color: 0x666666 }),
                obstacle: new THREE.MeshLambertMaterial({ color: 0x444444 })
            },
            [ENVIRONMENT_TYPES.HIGHWAY]: {
                ground: new THREE.MeshLambertMaterial({ color: 0x333333 }),
                obstacle: new THREE.MeshLambertMaterial({ color: 0x555555 })
            },
            [ENVIRONMENT_TYPES.INDUSTRIAL]: {
                ground: new THREE.MeshLambertMaterial({ color: 0x554433 }),
                obstacle: new THREE.MeshLambertMaterial({ color: 0x666644 })
            },
            [ENVIRONMENT_TYPES.DESERT]: {
                ground: new THREE.MeshLambertMaterial({ color: 0xddaa77 }),
                obstacle: new THREE.MeshLambertMaterial({ color: 0xaa8855 })
            },
            [ENVIRONMENT_TYPES.FOREST]: {
                ground: new THREE.MeshLambertMaterial({ color: 0x446633 }),
                obstacle: new THREE.MeshLambertMaterial({ color: 0x335522 })
            },
            [ENVIRONMENT_TYPES.APOCALYPSE]: {
                ground: new THREE.MeshLambertMaterial({ color: 0x442222 }),
                obstacle: new THREE.MeshLambertMaterial({ color: 0x331111 })
            }
        };
    }

    /**
     * Generate terrain for a level
     */
    generateTerrain(levelConfig) {
        this.clearTerrain();
        
        const { terrain, environmentType } = levelConfig;
        
        // Generate base terrain
        this.createBaseTerrain(terrain, environmentType);
        
        // Add obstacles
        this.generateObstacles(terrain, environmentType);
        
        // Add environment-specific details
        this.addEnvironmentDetails(terrain, environmentType);
        
        return {
            mesh: this.terrainMesh,
            body: this.terrainBody,
            obstacles: this.obstacles
        };
    }

    /**
     * Create the base terrain mesh and physics body
     */
    createBaseTerrain(terrainConfig, environmentType) {
        const { length, width, heightVariation } = terrainConfig;
        
        // Create height map
        const heightMap = this.generateHeightMap(length, width, heightVariation);
        
        // Create terrain geometry
        const geometry = new THREE.PlaneGeometry(length, width, 64, 32);
        const vertices = geometry.attributes.position.array;
        
        // Apply height map to vertices
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            
            // Convert world coordinates to height map indices
            const mapX = Math.floor(((x + length / 2) / length) * 64);
            const mapZ = Math.floor(((z + width / 2) / width) * 32);
            
            if (mapX >= 0 && mapX < 64 && mapZ >= 0 && mapZ < 32) {
                vertices[i + 1] = heightMap[mapZ][mapX];
            }
        }
        
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
        
        // Create terrain mesh
        const material = this.materials[environmentType].ground;
        this.terrainMesh = new THREE.Mesh(geometry, material);
        this.terrainMesh.rotation.x = -Math.PI / 2;
        this.terrainMesh.receiveShadow = true;
        this.terrainMesh.userData = { type: 'terrain' };
        
        this.scene.add(this.terrainMesh);
        
        // Create physics body for terrain
        this.createTerrainPhysics(heightMap, length, width);
    }

    /**
     * Generate height map for terrain variation
     */
    generateHeightMap(length, width, heightVariation) {
        const mapWidth = 64;
        const mapHeight = 32;
        const heightMap = [];
        
        for (let z = 0; z < mapHeight; z++) {
            heightMap[z] = [];
            for (let x = 0; x < mapWidth; x++) {
                // Use Perlin-like noise for natural terrain variation
                const noise1 = Math.sin(x * 0.1) * Math.cos(z * 0.1);
                const noise2 = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.5;
                const noise3 = Math.sin(x * 0.2) * Math.cos(z * 0.2) * 0.25;
                
                const height = (noise1 + noise2 + noise3) * heightVariation;
                heightMap[z][x] = height;
            }
        }
        
        return heightMap;
    }

    /**
     * Create physics body for terrain
     */
    createTerrainPhysics(heightMap, length, width) {
        // For simplicity, create a box shape for the terrain
        // In a full implementation, you'd use a heightfield shape
        const shape = new CANNON.Box(new CANNON.Vec3(length / 2, 1, width / 2));
        this.terrainBody = new CANNON.Body({ mass: 0 });
        this.terrainBody.addShape(shape);
        this.terrainBody.position.set(0, -1, 0);
        this.physicsWorld.addBody(this.terrainBody);
    }

    /**
     * Generate obstacles based on terrain configuration
     */
    generateObstacles(terrainConfig, environmentType) {
        const { length, width, obstacleCount } = terrainConfig;
        const obstacleTypes = this.getObstacleTypesForEnvironment(environmentType);
        
        for (let i = 0; i < obstacleCount; i++) {
            const obstacleType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
            
            // Random position within terrain bounds
            const x = (Math.random() - 0.5) * length * 0.8;
            const z = (Math.random() - 0.5) * width * 0.8;
            const position = new THREE.Vector3(x, 0, z);
            
            this.createObstacle(obstacleType, position, environmentType);
        }
    }

    /**
     * Get appropriate obstacle types for environment
     */
    getObstacleTypesForEnvironment(environmentType) {
        switch (environmentType) {
            case ENVIRONMENT_TYPES.CITY:
                return [OBSTACLE_TYPES.BUILDING, OBSTACLE_TYPES.CAR_WRECK, OBSTACLE_TYPES.DEBRIS];
            case ENVIRONMENT_TYPES.HIGHWAY:
                return [OBSTACLE_TYPES.CAR_WRECK, OBSTACLE_TYPES.BARRIER, OBSTACLE_TYPES.DEBRIS];
            case ENVIRONMENT_TYPES.INDUSTRIAL:
                return [OBSTACLE_TYPES.BUILDING, OBSTACLE_TYPES.DEBRIS, OBSTACLE_TYPES.BARRIER];
            case ENVIRONMENT_TYPES.DESERT:
                return [OBSTACLE_TYPES.ROCK, OBSTACLE_TYPES.CRATER, OBSTACLE_TYPES.DEBRIS];
            case ENVIRONMENT_TYPES.FOREST:
                return [OBSTACLE_TYPES.TREE, OBSTACLE_TYPES.ROCK, OBSTACLE_TYPES.DEBRIS];
            case ENVIRONMENT_TYPES.APOCALYPSE:
                return [OBSTACLE_TYPES.BUILDING, OBSTACLE_TYPES.CAR_WRECK, OBSTACLE_TYPES.CRATER, OBSTACLE_TYPES.DEBRIS];
            default:
                return [OBSTACLE_TYPES.DEBRIS];
        }
    }

    /**
     * Create a single obstacle
     */
    createObstacle(obstacleType, position, environmentType) {
        let geometry, scale, height;
        
        switch (obstacleType) {
            case OBSTACLE_TYPES.BUILDING:
                geometry = new THREE.BoxGeometry(10, 20, 8);
                scale = new THREE.Vector3(1, 1, 1);
                height = 10;
                break;
            case OBSTACLE_TYPES.CAR_WRECK:
                geometry = new THREE.BoxGeometry(4, 1.5, 2);
                scale = new THREE.Vector3(1, 1, 1);
                height = 0.75;
                break;
            case OBSTACLE_TYPES.BARRIER:
                geometry = new THREE.BoxGeometry(8, 1, 0.5);
                scale = new THREE.Vector3(1, 1, 1);
                height = 0.5;
                break;
            case OBSTACLE_TYPES.DEBRIS:
                geometry = new THREE.BoxGeometry(2, 1, 2);
                scale = new THREE.Vector3(
                    0.5 + Math.random() * 1.5,
                    0.5 + Math.random() * 1.5,
                    0.5 + Math.random() * 1.5
                );
                height = 0.5;
                break;
            case OBSTACLE_TYPES.CRATER:
                geometry = new THREE.CylinderGeometry(5, 3, 2, 8);
                scale = new THREE.Vector3(1, 1, 1);
                height = -1;
                break;
            case OBSTACLE_TYPES.TREE:
                geometry = new THREE.CylinderGeometry(0.5, 1, 12, 8);
                scale = new THREE.Vector3(1, 1, 1);
                height = 6;
                break;
            case OBSTACLE_TYPES.ROCK:
                geometry = new THREE.SphereGeometry(2, 8, 6);
                scale = new THREE.Vector3(
                    0.8 + Math.random() * 0.4,
                    0.8 + Math.random() * 0.4,
                    0.8 + Math.random() * 0.4
                );
                height = 2;
                break;
            default:
                geometry = new THREE.BoxGeometry(2, 2, 2);
                scale = new THREE.Vector3(1, 1, 1);
                height = 1;
        }
        
        // Create mesh
        const material = this.materials[environmentType].obstacle;
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.position.y = height;
        mesh.scale.copy(scale);
        mesh.castShadow = true;
        mesh.userData = { type: 'obstacle', obstacleType };
        
        // Add random rotation
        mesh.rotation.y = Math.random() * Math.PI * 2;
        
        this.scene.add(mesh);
        
        // Create physics body
        const shape = new CANNON.Box(new CANNON.Vec3(
            geometry.parameters.width * scale.x / 2,
            geometry.parameters.height * scale.y / 2,
            geometry.parameters.depth * scale.z / 2
        ));
        
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape);
        body.position.set(position.x, position.y + height, position.z);
        this.physicsWorld.addBody(body);
        
        // Store obstacle reference
        this.obstacles.push({
            type: obstacleType,
            mesh,
            body,
            position: position.clone()
        });
    }

    /**
     * Add environment-specific details
     */
    addEnvironmentDetails(terrainConfig, environmentType) {
        switch (environmentType) {
            case ENVIRONMENT_TYPES.CITY:
                this.addCityDetails(terrainConfig);
                break;
            case ENVIRONMENT_TYPES.HIGHWAY:
                this.addHighwayDetails(terrainConfig);
                break;
            case ENVIRONMENT_TYPES.INDUSTRIAL:
                this.addIndustrialDetails(terrainConfig);
                break;
            case ENVIRONMENT_TYPES.DESERT:
                this.addDesertDetails(terrainConfig);
                break;
            case ENVIRONMENT_TYPES.FOREST:
                this.addForestDetails(terrainConfig);
                break;
            case ENVIRONMENT_TYPES.APOCALYPSE:
                this.addApocalypseDetails(terrainConfig);
                break;
        }
    }

    /**
     * Add city-specific environmental details
     */
    addCityDetails(terrainConfig) {
        // Add street lights
        const lightCount = 10;
        for (let i = 0; i < lightCount; i++) {
            const x = (Math.random() - 0.5) * terrainConfig.length * 0.9;
            const z = (Math.random() - 0.5) * terrainConfig.width * 0.9;
            
            const lightGeometry = new THREE.CylinderGeometry(0.2, 0.2, 8, 8);
            const lightMaterial = new THREE.MeshLambertMaterial({ color: 0x888888 });
            const lightMesh = new THREE.Mesh(lightGeometry, lightMaterial);
            lightMesh.position.set(x, 4, z);
            this.scene.add(lightMesh);
        }
    }

    /**
     * Add highway-specific environmental details
     */
    addHighwayDetails(terrainConfig) {
        // Add road markings (simplified as lines)
        const lineGeometry = new THREE.BoxGeometry(terrainConfig.length, 0.1, 0.5);
        const lineMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
        
        // Center line
        const centerLine = new THREE.Mesh(lineGeometry, lineMaterial);
        centerLine.position.set(0, 0.1, 0);
        this.scene.add(centerLine);
        
        // Side lines
        const leftLine = new THREE.Mesh(lineGeometry, lineMaterial);
        leftLine.position.set(0, 0.1, -terrainConfig.width * 0.4);
        this.scene.add(leftLine);
        
        const rightLine = new THREE.Mesh(lineGeometry, lineMaterial);
        rightLine.position.set(0, 0.1, terrainConfig.width * 0.4);
        this.scene.add(rightLine);
    }

    /**
     * Add industrial-specific environmental details
     */
    addIndustrialDetails(terrainConfig) {
        // Add smokestacks
        const stackCount = 5;
        for (let i = 0; i < stackCount; i++) {
            const x = (Math.random() - 0.5) * terrainConfig.length * 0.8;
            const z = (Math.random() - 0.5) * terrainConfig.width * 0.8;
            
            const stackGeometry = new THREE.CylinderGeometry(1, 1.5, 25, 8);
            const stackMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
            const stackMesh = new THREE.Mesh(stackGeometry, stackMaterial);
            stackMesh.position.set(x, 12.5, z);
            this.scene.add(stackMesh);
        }
    }

    /**
     * Add desert-specific environmental details
     */
    addDesertDetails(terrainConfig) {
        // Add sand dunes (simplified as mounds)
        const duneCount = 8;
        for (let i = 0; i < duneCount; i++) {
            const x = (Math.random() - 0.5) * terrainConfig.length * 0.9;
            const z = (Math.random() - 0.5) * terrainConfig.width * 0.9;
            
            const duneGeometry = new THREE.SphereGeometry(8, 8, 6);
            const duneMaterial = new THREE.MeshLambertMaterial({ color: 0xddaa77 });
            const duneMesh = new THREE.Mesh(duneGeometry, duneMaterial);
            duneMesh.position.set(x, -2, z);
            duneMesh.scale.y = 0.3;
            this.scene.add(duneMesh);
        }
    }

    /**
     * Add forest-specific environmental details
     */
    addForestDetails(terrainConfig) {
        // Add additional trees for forest density
        const treeCount = 20;
        for (let i = 0; i < treeCount; i++) {
            const x = (Math.random() - 0.5) * terrainConfig.length * 0.9;
            const z = (Math.random() - 0.5) * terrainConfig.width * 0.9;
            
            // Tree trunk
            const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 8, 8);
            const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x4a3c28 });
            const trunkMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunkMesh.position.set(x, 4, z);
            this.scene.add(trunkMesh);
            
            // Tree foliage
            const foliageGeometry = new THREE.SphereGeometry(3, 8, 6);
            const foliageMaterial = new THREE.MeshLambertMaterial({ color: 0x2d5a2d });
            const foliageMesh = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliageMesh.position.set(x, 8, z);
            this.scene.add(foliageMesh);
        }
    }

    /**
     * Add apocalypse-specific environmental details
     */
    addApocalypseDetails(terrainConfig) {
        // Add fires and smoke effects
        const fireCount = 6;
        for (let i = 0; i < fireCount; i++) {
            const x = (Math.random() - 0.5) * terrainConfig.length * 0.8;
            const z = (Math.random() - 0.5) * terrainConfig.width * 0.8;
            
            // Fire effect (simplified as glowing sphere)
            const fireGeometry = new THREE.SphereGeometry(2, 8, 6);
            const fireMaterial = new THREE.MeshLambertMaterial({
                color: 0xff4400,
                emissive: 0x441100
            });
            const fireMesh = new THREE.Mesh(fireGeometry, fireMaterial);
            fireMesh.position.set(x, 2, z);
            this.scene.add(fireMesh);
            
            // Add point light for fire
            const fireLight = new THREE.PointLight(0xff4400, 2, 30);
            fireLight.position.set(x, 3, z);
            this.scene.add(fireLight);
        }
    }

    /**
     * Clear existing terrain and obstacles
     */
    clearTerrain() {
        // Remove terrain mesh
        if (this.terrainMesh) {
            this.scene.remove(this.terrainMesh);
            this.terrainMesh.geometry.dispose();
            this.terrainMesh.material.dispose();
            this.terrainMesh = null;
        }
        
        // Remove terrain physics body
        if (this.terrainBody) {
            this.physicsWorld.removeBody(this.terrainBody);
            this.terrainBody = null;
        }
        
        // Remove obstacles
        this.obstacles.forEach(obstacle => {
            this.scene.remove(obstacle.mesh);
            obstacle.mesh.geometry.dispose();
            obstacle.mesh.material.dispose();
            this.physicsWorld.removeBody(obstacle.body);
        });
        this.obstacles = [];
    }

    /**
     * Get terrain height at a specific position
     */
    getHeightAtPosition(x, z) {
        // Simplified height calculation
        // In a full implementation, you'd interpolate from the height map
        return 0;
    }

    /**
     * Check if a position is valid for spawning (not inside obstacles)
     */
    isValidSpawnPosition(position, radius = 5) {
        for (const obstacle of this.obstacles) {
            const distance = position.distanceTo(obstacle.position);
            if (distance < radius) {
                return false;
            }
        }
        return true;
    }

    /**
     * Get random valid spawn position
     */
    getRandomSpawnPosition(terrainConfig, radius = 5) {
        const maxAttempts = 50;
        let attempts = 0;
        
        while (attempts < maxAttempts) {
            const x = (Math.random() - 0.5) * terrainConfig.length * 0.8;
            const z = (Math.random() - 0.5) * terrainConfig.width * 0.8;
            const position = new THREE.Vector3(x, 0, z);
            
            if (this.isValidSpawnPosition(position, radius)) {
                return position;
            }
            
            attempts++;
        }
        
        // Fallback to center if no valid position found
        return new THREE.Vector3(0, 0, 0);
    }

    /**
     * Dispose of all terrain resources
     */
    dispose() {
        this.clearTerrain();
        
        // Dispose materials
        Object.values(this.materials).forEach(materialSet => {
            Object.values(materialSet).forEach(material => {
                material.dispose();
            });
        });
    }
}