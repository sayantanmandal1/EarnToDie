import { LODSystem } from '../LODSystem';
import * as THREE from 'three';

// Mock Three.js components
jest.mock('three', () => ({
    SphereGeometry: jest.fn(() => ({ isBufferGeometry: true })),
    BoxGeometry: jest.fn(() => ({ isBufferGeometry: true })),
    MeshBasicMaterial: jest.fn(() => ({})),
    MeshLambertMaterial: jest.fn(() => ({})),
    Mesh: jest.fn((geometry, material) => ({ geometry, material })),
    BufferGeometry: jest.fn(() => ({
        setAttribute: jest.fn(),
        attributes: {
            position: { array: new Float32Array([1, 2, 3, 4, 5, 6]) },
            normal: { array: new Float32Array([0, 1, 0, 0, 1, 0]) },
            uv: { array: new Float32Array([0, 0, 1, 1]) }
        }
    })),
    Float32BufferAttribute: jest.fn((array, itemSize) => ({ array, itemSize })),
    Vector3: jest.fn(() => ({ set: jest.fn(), copy: jest.fn() })),
    CanvasTexture: jest.fn(() => ({
        wrapS: null,
        wrapT: null,
        minFilter: null,
        magFilter: null
    })),
    LinearFilter: 'LinearFilter'
}));

describe('LODSystem', () => {
    let lodSystem;
    let mockCamera;

    beforeEach(() => {
        mockCamera = {
            position: {
                distanceTo: jest.fn(() => 25) // Default distance
            }
        };
        
        lodSystem = new LODSystem(mockCamera);
    });

    afterEach(() => {
        if (lodSystem) {
            lodSystem.dispose();
        }
    });

    describe('Initialization', () => {
        test('should initialize with camera reference', () => {
            expect(lodSystem.camera).toBe(mockCamera);
            expect(lodSystem.lodObjects.size).toBe(0);
            expect(lodSystem.updateInterval).toBe(0.1);
        });

        test('should have default LOD distances', () => {
            expect(lodSystem.defaultDistances).toEqual({
                high: 50,
                medium: 100,
                low: 200
            });
        });
    });

    describe('LOD Level Creation', () => {
        test('should create LOD levels for mesh', () => {
            const mockMesh = {
                geometry: { isBufferGeometry: true },
                material: {}
            };

            const levels = lodSystem.createLODLevels(mockMesh);

            expect(levels).toHaveLength(4); // high, medium, low, invisible
            expect(levels[0].maxDistance).toBe(50);
            expect(levels[1].maxDistance).toBe(100);
            expect(levels[2].maxDistance).toBe(200);
            expect(levels[3].maxDistance).toBe(Infinity);
            expect(levels[3].visible).toBe(false);
        });

        test('should create vehicle LOD levels', () => {
            const mockVehicle = {};
            const levels = lodSystem.createVehicleLOD(mockVehicle);

            expect(levels).toHaveLength(4);
            expect(levels[0].showDetails).toBe(true);
            expect(levels[0].geometryQuality).toBe(1.0);
            expect(levels[1].showDetails).toBe(false);
            expect(levels[1].geometryQuality).toBe(0.7);
            expect(levels[3].visible).toBe(false);
        });

        test('should create zombie LOD levels', () => {
            const mockZombie = {};
            const levels = lodSystem.createZombieLOD(mockZombie);

            expect(levels).toHaveLength(4);
            expect(levels[0].animationQuality).toBe('high');
            expect(levels[0].updateRate).toBe(1.0);
            expect(levels[1].animationQuality).toBe('medium');
            expect(levels[1].updateRate).toBe(0.5);
            expect(levels[3].animationQuality).toBe('none');
            expect(levels[3].updateRate).toBe(0);
        });

        test('should accept custom distances for LOD levels', () => {
            const mockMesh = {
                geometry: { isBufferGeometry: true },
                material: {}
            };

            const options = {
                highDistance: 30,
                mediumDistance: 80,
                lowDistance: 150
            };

            const levels = lodSystem.createLODLevels(mockMesh, options);

            expect(levels[0].maxDistance).toBe(30);
            expect(levels[1].maxDistance).toBe(80);
            expect(levels[2].maxDistance).toBe(150);
        });
    });

    describe('Object Registration', () => {
        test('should register object for LOD management', () => {
            const mockObject = { position: { x: 0, y: 0, z: 0 } };
            const lodLevels = [
                { maxDistance: 50, visible: true },
                { maxDistance: 100, visible: false }
            ];

            lodSystem.registerObject(mockObject, lodLevels);

            expect(lodSystem.lodObjects.has(mockObject)).toBe(true);
            const lodData = lodSystem.lodObjects.get(mockObject);
            expect(lodData.levels).toBe(lodLevels);
            expect(lodData.currentLevel).toBe(0);
        });

        test('should not register invalid objects', () => {
            lodSystem.registerObject(null, []);
            lodSystem.registerObject({}, null);

            expect(lodSystem.lodObjects.size).toBe(0);
        });

        test('should unregister object', () => {
            const mockObject = { position: { x: 0, y: 0, z: 0 } };
            const lodLevels = [{ maxDistance: 50, visible: true }];

            lodSystem.registerObject(mockObject, lodLevels);
            lodSystem.unregisterObject(mockObject);

            expect(lodSystem.lodObjects.has(mockObject)).toBe(false);
        });
    });

    describe('LOD Level Calculation', () => {
        test('should calculate correct LOD level based on distance', () => {
            const levels = [
                { maxDistance: 50 },
                { maxDistance: 100 },
                { maxDistance: 200 }
            ];

            expect(lodSystem._calculateLODLevel(25, levels)).toBe(0);
            expect(lodSystem._calculateLODLevel(75, levels)).toBe(1);
            expect(lodSystem._calculateLODLevel(150, levels)).toBe(2);
            expect(lodSystem._calculateLODLevel(300, levels)).toBe(2); // Clamp to last level
        });

        test('should handle empty levels array', () => {
            const result = lodSystem._calculateLODLevel(50, []);
            expect(result).toBe(-1);
        });
    });

    describe('LOD Application', () => {
        test('should apply LOD level to object', () => {
            const mockObject = {
                visible: true,
                geometry: null,
                material: null,
                scale: { copy: jest.fn() }
            };

            const level = {
                visible: false,
                geometry: 'newGeometry',
                material: 'newMaterial',
                scale: { x: 0.5, y: 0.5, z: 0.5 }
            };

            lodSystem._applyLODLevel(mockObject, level);

            expect(mockObject.visible).toBe(false);
            expect(mockObject.geometry).toBe('newGeometry');
            expect(mockObject.material).toBe('newMaterial');
            expect(mockObject.scale.copy).toHaveBeenCalledWith(level.scale);
        });

        test('should handle null geometry in LOD level', () => {
            const mockObject = {
                visible: true,
                geometry: 'originalGeometry'
            };

            const level = {
                geometry: null
            };

            lodSystem._applyLODLevel(mockObject, level);

            expect(mockObject.visible).toBe(false);
        });

        test('should not apply undefined properties', () => {
            const mockObject = {
                visible: true,
                geometry: 'original',
                material: 'original'
            };

            const level = {}; // Empty level

            lodSystem._applyLODLevel(mockObject, level);

            expect(mockObject.visible).toBe(true);
            expect(mockObject.geometry).toBe('original');
            expect(mockObject.material).toBe('original');
        });
    });

    describe('Update System', () => {
        test('should update LOD based on distance', () => {
            const mockObject = {
                position: { x: 0, y: 0, z: 0 },
                visible: true,
                geometry: null,
                material: null
            };

            const lodLevels = [
                { maxDistance: 50, visible: true },
                { maxDistance: 100, visible: false }
            ];

            lodSystem.registerObject(mockObject, lodLevels);

            // Set camera distance to trigger level 1
            mockCamera.position.distanceTo.mockReturnValue(75);

            // Force update by setting lastUpdate to exceed interval
            lodSystem.lastUpdate = 0.2;
            lodSystem.update(0.1);

            const lodData = lodSystem.lodObjects.get(mockObject);
            expect(lodData.currentLevel).toBe(1);
            expect(mockObject.visible).toBe(false);
        });

        test('should throttle updates based on interval', () => {
            const mockObject = {
                position: { x: 0, y: 0, z: 0 }
            };

            lodSystem.registerObject(mockObject, [{ maxDistance: 50 }]);

            const applySpy = jest.spyOn(lodSystem, '_applyLODLevel');

            // First update should not trigger (interval not reached)
            lodSystem.update(0.05);
            expect(applySpy).not.toHaveBeenCalled();

            // Second update should trigger (interval exceeded)
            lodSystem.update(0.06);
            expect(applySpy).toHaveBeenCalled();
        });

        test('should skip objects without position', () => {
            const mockObject = {}; // No position property
            lodSystem.registerObject(mockObject, [{ maxDistance: 50 }]);

            const applySpy = jest.spyOn(lodSystem, '_applyLODLevel');
            lodSystem.lastUpdate = 0.2; // Force update
            lodSystem.update(0.1);

            expect(applySpy).not.toHaveBeenCalled();
        });
    });

    describe('Geometry Reduction', () => {
        test('should reduce geometry complexity', () => {
            const mockGeometry = {
                isBufferGeometry: true,
                attributes: {
                    position: { array: new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]) }, // 3 vertices
                    normal: { array: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]) },
                    uv: { array: new Float32Array([0, 0, 1, 0, 1, 1]) }
                }
            };

            const reducedGeometry = lodSystem._reduceGeometry(mockGeometry, 0.5);

            expect(reducedGeometry).toBeDefined();
            expect(THREE.BufferGeometry).toHaveBeenCalled();
        });

        test('should return original geometry if not BufferGeometry', () => {
            const mockGeometry = { isBufferGeometry: false };
            const result = lodSystem._reduceGeometry(mockGeometry, 0.5);
            expect(result).toBe(mockGeometry);
        });
    });

    describe('Statistics', () => {
        test('should return LOD statistics', () => {
            const mockObject1 = { position: { x: 0, y: 0, z: 0 } };
            const mockObject2 = { position: { x: 0, y: 0, z: 0 } };

            lodSystem.registerObject(mockObject1, [{ maxDistance: 50 }]);
            lodSystem.registerObject(mockObject2, [{ maxDistance: 50 }]);

            // Set different LOD levels
            lodSystem.lodObjects.get(mockObject1).currentLevel = 0;
            lodSystem.lodObjects.get(mockObject2).currentLevel = 1;

            const stats = lodSystem.getStats();

            expect(stats.totalObjects).toBe(2);
            expect(stats.levelCounts[0]).toBe(1);
            expect(stats.levelCounts[1]).toBe(1);
        });

        test('should return empty stats for no objects', () => {
            const stats = lodSystem.getStats();

            expect(stats.totalObjects).toBe(0);
            expect(stats.levelCounts).toEqual({ 0: 0, 1: 0, 2: 0, 3: 0 });
        });
    });

    describe('Disposal', () => {
        test('should clear all LOD objects on dispose', () => {
            const mockObject = { position: { x: 0, y: 0, z: 0 } };
            lodSystem.registerObject(mockObject, [{ maxDistance: 50 }]);

            lodSystem.dispose();

            expect(lodSystem.lodObjects.size).toBe(0);
        });
    });
});