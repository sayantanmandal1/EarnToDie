import TerrainGenerator from '../TerrainGenerator.js';
import { ENVIRONMENT_TYPES, OBSTACLE_TYPES } from '../LevelConfig.js';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// Mock Three.js and Cannon.js
jest.mock('three');
jest.mock('cannon-es');

describe('TerrainGenerator', () => {
    let terrainGenerator;
    let mockScene;
    let mockPhysicsWorld;

    beforeEach(() => {
        // Mock scene
        mockScene = {
            add: jest.fn(),
            remove: jest.fn(),
            children: []
        };

        // Mock physics world
        mockPhysicsWorld = {
            addBody: jest.fn(),
            removeBody: jest.fn()
        };

        // Mock Three.js constructors
        THREE.PlaneGeometry = jest.fn().mockImplementation(() => ({
            attributes: {
                position: {
                    array: new Float32Array(6144), // 64 * 32 * 3 components
                    needsUpdate: false
                }
            },
            computeVertexNormals: jest.fn()
        }));

        THREE.Mesh = jest.fn().mockImplementation((geometry, material) => ({
            geometry,
            material,
            rotation: { x: 0 },
            userData: {},
            receiveShadow: false,
            position: { 
                copy: jest.fn(),
                y: 0,
                x: 0,
                z: 0
            },
            scale: { 
                copy: jest.fn(),
                x: 1,
                y: 1,
                z: 1
            },
            castShadow: false
        }));

        THREE.MeshLambertMaterial = jest.fn().mockImplementation((params) => ({
            ...params,
            dispose: jest.fn()
        }));

        THREE.BoxGeometry = jest.fn().mockImplementation(() => ({
            parameters: { width: 2, height: 2, depth: 2 },
            dispose: jest.fn()
        }));

        THREE.CylinderGeometry = jest.fn().mockImplementation(() => ({
            parameters: { radiusTop: 1, radiusBottom: 1, height: 2 },
            dispose: jest.fn()
        }));

        THREE.SphereGeometry = jest.fn().mockImplementation(() => ({
            parameters: { radius: 1 },
            dispose: jest.fn()
        }));

        THREE.Vector3 = jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
            x, y, z,
            clone: jest.fn().mockReturnValue({ x, y, z }),
            distanceTo: jest.fn().mockReturnValue(10)
        }));

        THREE.Group = jest.fn().mockImplementation(() => ({
            add: jest.fn()
        }));

        THREE.PointLight = jest.fn().mockImplementation(() => ({
            position: { set: jest.fn() }
        }));

        // Mock Cannon.js constructors
        CANNON.Box = jest.fn().mockImplementation(() => ({}));
        CANNON.Vec3 = jest.fn().mockImplementation(() => ({}));
        CANNON.Body = jest.fn().mockImplementation(() => ({
            addShape: jest.fn(),
            position: { set: jest.fn() }
        }));

        terrainGenerator = new TerrainGenerator(mockScene, mockPhysicsWorld);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with scene and physics world', () => {
            expect(terrainGenerator.scene).toBe(mockScene);
            expect(terrainGenerator.physicsWorld).toBe(mockPhysicsWorld);
            expect(terrainGenerator.terrainMesh).toBeNull();
            expect(terrainGenerator.terrainBody).toBeNull();
            expect(terrainGenerator.obstacles).toEqual([]);
        });

        test('should create materials for all environment types', () => {
            const materials = terrainGenerator.materials;
            
            expect(materials).toHaveProperty(ENVIRONMENT_TYPES.CITY);
            expect(materials).toHaveProperty(ENVIRONMENT_TYPES.HIGHWAY);
            expect(materials).toHaveProperty(ENVIRONMENT_TYPES.INDUSTRIAL);
            expect(materials).toHaveProperty(ENVIRONMENT_TYPES.DESERT);
            expect(materials).toHaveProperty(ENVIRONMENT_TYPES.FOREST);
            expect(materials).toHaveProperty(ENVIRONMENT_TYPES.APOCALYPSE);
            
            // Each environment should have ground and obstacle materials
            Object.values(materials).forEach(materialSet => {
                expect(materialSet).toHaveProperty('ground');
                expect(materialSet).toHaveProperty('obstacle');
            });
        });
    });

    describe('generateTerrain', () => {
        const mockLevelConfig = {
            terrain: {
                length: 1000,
                width: 200,
                heightVariation: 5,
                obstacleCount: 10
            },
            environmentType: ENVIRONMENT_TYPES.CITY
        };

        test('should generate terrain with correct configuration', () => {
            const result = terrainGenerator.generateTerrain(mockLevelConfig);
            
            expect(result).toHaveProperty('mesh');
            expect(result).toHaveProperty('body');
            expect(result).toHaveProperty('obstacles');
            
            // Should create terrain mesh
            expect(THREE.PlaneGeometry).toHaveBeenCalledWith(1000, 200, 64, 32);
            expect(mockScene.add).toHaveBeenCalled();
            
            // Should create physics body
            expect(CANNON.Box).toHaveBeenCalled();
            expect(CANNON.Body).toHaveBeenCalled();
            expect(mockPhysicsWorld.addBody).toHaveBeenCalled();
        });

        test('should clear existing terrain before generating new one', () => {
            // Generate terrain first time
            terrainGenerator.generateTerrain(mockLevelConfig);
            
            const firstMesh = terrainGenerator.terrainMesh;
            const firstBody = terrainGenerator.terrainBody;
            
            // Generate terrain second time
            terrainGenerator.generateTerrain(mockLevelConfig);
            
            // Should have removed previous terrain
            expect(mockScene.remove).toHaveBeenCalledWith(firstMesh);
            expect(mockPhysicsWorld.removeBody).toHaveBeenCalledWith(firstBody);
        });

        test('should generate correct number of obstacles', () => {
            terrainGenerator.generateTerrain(mockLevelConfig);
            
            expect(terrainGenerator.obstacles).toHaveLength(mockLevelConfig.terrain.obstacleCount);
        });
    });

    describe('generateHeightMap', () => {
        test('should generate height map with correct dimensions', () => {
            const heightMap = terrainGenerator.generateHeightMap(1000, 200, 10);
            
            expect(heightMap).toHaveLength(32); // mapHeight
            expect(heightMap[0]).toHaveLength(64); // mapWidth
            
            // All height values should be within expected range
            heightMap.forEach(row => {
                row.forEach(height => {
                    expect(height).toBeGreaterThanOrEqual(-15);
                    expect(height).toBeLessThanOrEqual(15);
                });
            });
        });

        test('should generate different height maps for different inputs', () => {
            const heightMap1 = terrainGenerator.generateHeightMap(1000, 200, 5);
            const heightMap2 = terrainGenerator.generateHeightMap(2000, 400, 10);
            
            // Maps should be different (very unlikely to be identical)
            expect(heightMap1).not.toEqual(heightMap2);
        });
    });

    describe('getObstacleTypesForEnvironment', () => {
        test('should return correct obstacle types for city environment', () => {
            const types = terrainGenerator.getObstacleTypesForEnvironment(ENVIRONMENT_TYPES.CITY);
            
            expect(types).toContain(OBSTACLE_TYPES.BUILDING);
            expect(types).toContain(OBSTACLE_TYPES.CAR_WRECK);
            expect(types).toContain(OBSTACLE_TYPES.DEBRIS);
        });

        test('should return correct obstacle types for highway environment', () => {
            const types = terrainGenerator.getObstacleTypesForEnvironment(ENVIRONMENT_TYPES.HIGHWAY);
            
            expect(types).toContain(OBSTACLE_TYPES.CAR_WRECK);
            expect(types).toContain(OBSTACLE_TYPES.BARRIER);
            expect(types).toContain(OBSTACLE_TYPES.DEBRIS);
        });

        test('should return correct obstacle types for forest environment', () => {
            const types = terrainGenerator.getObstacleTypesForEnvironment(ENVIRONMENT_TYPES.FOREST);
            
            expect(types).toContain(OBSTACLE_TYPES.TREE);
            expect(types).toContain(OBSTACLE_TYPES.ROCK);
            expect(types).toContain(OBSTACLE_TYPES.DEBRIS);
        });

        test('should return default obstacle types for unknown environment', () => {
            const types = terrainGenerator.getObstacleTypesForEnvironment('unknown');
            
            expect(types).toEqual([OBSTACLE_TYPES.DEBRIS]);
        });
    });

    describe('createObstacle', () => {
        beforeEach(() => {
            // Mock random to make tests deterministic
            jest.spyOn(Math, 'random').mockReturnValue(0.5);
        });

        afterEach(() => {
            Math.random.mockRestore();
        });

        test('should create building obstacle with correct properties', () => {
            const position = new THREE.Vector3(10, 0, 20);
            
            terrainGenerator.createObstacle(OBSTACLE_TYPES.BUILDING, position, ENVIRONMENT_TYPES.CITY);
            
            expect(THREE.BoxGeometry).toHaveBeenCalledWith(10, 20, 8);
            expect(mockScene.add).toHaveBeenCalled();
            expect(mockPhysicsWorld.addBody).toHaveBeenCalled();
            expect(terrainGenerator.obstacles).toHaveLength(1);
        });

        test('should create tree obstacle with correct properties', () => {
            const position = new THREE.Vector3(5, 0, 15);
            
            terrainGenerator.createObstacle(OBSTACLE_TYPES.TREE, position, ENVIRONMENT_TYPES.FOREST);
            
            expect(THREE.CylinderGeometry).toHaveBeenCalledWith(0.5, 1, 12, 8);
            expect(mockScene.add).toHaveBeenCalled();
            expect(mockPhysicsWorld.addBody).toHaveBeenCalled();
        });

        test('should create rock obstacle with correct properties', () => {
            const position = new THREE.Vector3(0, 0, 0);
            
            terrainGenerator.createObstacle(OBSTACLE_TYPES.ROCK, position, ENVIRONMENT_TYPES.DESERT);
            
            expect(THREE.SphereGeometry).toHaveBeenCalledWith(2, 8, 6);
            expect(mockScene.add).toHaveBeenCalled();
            expect(mockPhysicsWorld.addBody).toHaveBeenCalled();
        });
    });

    describe('isValidSpawnPosition', () => {
        test('should return true for position away from obstacles', () => {
            const position = new THREE.Vector3(100, 0, 100);
            
            // Mock distance calculation to return large distance
            position.distanceTo = jest.fn().mockReturnValue(50);
            
            const isValid = terrainGenerator.isValidSpawnPosition(position, 5);
            
            expect(isValid).toBe(true);
        });

        test('should return false for position too close to obstacles', () => {
            // Add an obstacle
            terrainGenerator.obstacles.push({
                position: new THREE.Vector3(10, 0, 10)
            });
            
            const position = new THREE.Vector3(12, 0, 12);
            
            // Mock distance calculation to return small distance
            position.distanceTo = jest.fn().mockReturnValue(3);
            
            const isValid = terrainGenerator.isValidSpawnPosition(position, 5);
            
            expect(isValid).toBe(false);
        });
    });

    describe('getRandomSpawnPosition', () => {
        const terrainConfig = {
            length: 1000,
            width: 200
        };

        test('should return valid spawn position', () => {
            // Mock Math.random to return predictable values
            jest.spyOn(Math, 'random').mockReturnValue(0.5);
            
            const position = terrainGenerator.getRandomSpawnPosition(terrainConfig, 5);
            
            expect(position).toBeInstanceOf(THREE.Vector3);
            expect(position.x).toBeGreaterThanOrEqual(-400);
            expect(position.x).toBeLessThanOrEqual(400);
            expect(position.z).toBeGreaterThanOrEqual(-80);
            expect(position.z).toBeLessThanOrEqual(80);
            
            Math.random.mockRestore();
        });

        test('should return fallback position if no valid position found', () => {
            // Mock isValidSpawnPosition to always return false
            jest.spyOn(terrainGenerator, 'isValidSpawnPosition').mockReturnValue(false);
            
            const position = terrainGenerator.getRandomSpawnPosition(terrainConfig, 5);
            
            expect(position.x).toBe(0);
            expect(position.y).toBe(0);
            expect(position.z).toBe(0);
            
            terrainGenerator.isValidSpawnPosition.mockRestore();
        });
    });

    describe('clearTerrain', () => {
        test('should clear all terrain and obstacles', () => {
            // Set up some terrain and obstacles
            terrainGenerator.terrainMesh = { 
                geometry: { dispose: jest.fn() },
                material: { dispose: jest.fn() }
            };
            terrainGenerator.terrainBody = {};
            terrainGenerator.obstacles = [
                {
                    mesh: { 
                        geometry: { dispose: jest.fn() },
                        material: { dispose: jest.fn() }
                    },
                    body: {}
                }
            ];
            
            terrainGenerator.clearTerrain();
            
            expect(mockScene.remove).toHaveBeenCalledWith(terrainGenerator.terrainMesh);
            expect(mockPhysicsWorld.removeBody).toHaveBeenCalledWith(terrainGenerator.terrainBody);
            expect(terrainGenerator.terrainMesh).toBeNull();
            expect(terrainGenerator.terrainBody).toBeNull();
            expect(terrainGenerator.obstacles).toHaveLength(0);
        });
    });

    describe('dispose', () => {
        test('should dispose all resources', () => {
            // Mock materials
            const mockMaterial = { dispose: jest.fn() };
            terrainGenerator.materials = {
                [ENVIRONMENT_TYPES.CITY]: {
                    ground: mockMaterial,
                    obstacle: mockMaterial
                }
            };
            
            // Spy on clearTerrain
            jest.spyOn(terrainGenerator, 'clearTerrain');
            
            terrainGenerator.dispose();
            
            expect(terrainGenerator.clearTerrain).toHaveBeenCalled();
            expect(mockMaterial.dispose).toHaveBeenCalled();
        });
    });
});