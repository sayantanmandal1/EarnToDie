import Checkpoint from '../Checkpoint.js';
import * as THREE from 'three';

// Mock Three.js
jest.mock('three');

describe('Checkpoint', () => {
    let checkpoint;
    let mockScene;
    let mockConfig;

    beforeEach(() => {
        // Mock scene
        mockScene = {
            add: jest.fn(),
            remove: jest.fn()
        };

        // Mock config
        mockConfig = {
            id: 'test-checkpoint',
            position: { x: 10, z: 20 },
            radius: 15
        };

        // Mock Three.js constructors
        THREE.Vector3 = jest.fn().mockImplementation((x = 0, y = 0, z = 0) => ({
            x, y, z,
            clone: jest.fn().mockReturnValue({ x, y, z }),
            copy: jest.fn(),
            distanceTo: jest.fn().mockReturnValue(10)
        }));

        THREE.CylinderGeometry = jest.fn().mockImplementation(() => ({
            dispose: jest.fn()
        }));

        THREE.MeshLambertMaterial = jest.fn().mockImplementation((params) => ({
            ...params,
            color: { setHex: jest.fn() },
            emissive: { setHex: jest.fn() },
            dispose: jest.fn()
        }));

        THREE.Mesh = jest.fn().mockImplementation((geometry, material) => ({
            geometry,
            material,
            position: { copy: jest.fn(), y: 0 },
            userData: {},
            rotation: { y: 0 }
        }));

        THREE.Group = jest.fn().mockImplementation(() => ({
            add: jest.fn()
        }));

        THREE.PointLight = jest.fn().mockImplementation(() => ({
            position: { copy: jest.fn(), y: 0 },
            color: { setHex: jest.fn() },
            intensity: 1
        }));

        THREE.BufferGeometry = jest.fn().mockImplementation(() => ({
            setAttribute: jest.fn(),
            attributes: {
                position: { needsUpdate: false }
            },
            dispose: jest.fn()
        }));

        THREE.BufferAttribute = jest.fn();

        THREE.PointsMaterial = jest.fn().mockImplementation(() => ({
            opacity: 1,
            dispose: jest.fn()
        }));

        THREE.Points = jest.fn().mockImplementation(() => ({
            geometry: {
                attributes: {
                    position: { array: new Float32Array(150), needsUpdate: false }
                },
                dispose: jest.fn()
            },
            material: { opacity: 1, dispose: jest.fn() }
        }));

        checkpoint = new Checkpoint(mockConfig, mockScene);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with correct properties', () => {
            expect(checkpoint.id).toBe('test-checkpoint');
            expect(checkpoint.radius).toBe(15);
            expect(checkpoint.scene).toBe(mockScene);
            expect(checkpoint.isActive).toBe(false);
            expect(checkpoint.isReached).toBe(false);
        });

        test('should use default radius if not provided', () => {
            const configWithoutRadius = {
                id: 'test',
                position: { x: 0, z: 0 }
            };
            
            const checkpointWithDefaultRadius = new Checkpoint(configWithoutRadius, mockScene);
            
            expect(checkpointWithDefaultRadius.radius).toBe(20);
        });

        test('should create visual elements', () => {
            expect(THREE.CylinderGeometry).toHaveBeenCalledTimes(2); // Pillar and base
            expect(THREE.MeshLambertMaterial).toHaveBeenCalledTimes(2);
            expect(THREE.Mesh).toHaveBeenCalledTimes(2);
            expect(THREE.Group).toHaveBeenCalled();
            expect(mockScene.add).toHaveBeenCalled();
        });
    });

    describe('activate', () => {
        test('should activate checkpoint', () => {
            checkpoint.activate();
            
            expect(checkpoint.isActive).toBe(true);
            expect(checkpoint.mesh.material.color.setHex).toHaveBeenCalledWith(0x00ff00);
            expect(checkpoint.mesh.material.emissive.setHex).toHaveBeenCalledWith(0x002200);
            expect(THREE.PointLight).toHaveBeenCalled();
            expect(mockScene.add).toHaveBeenCalledWith(expect.any(Object)); // Light added
        });

        test('should not activate if already active', () => {
            checkpoint.isActive = true;
            const initialCallCount = THREE.PointLight.mock.calls.length;
            
            checkpoint.activate();
            
            expect(THREE.PointLight).toHaveBeenCalledTimes(initialCallCount);
        });
    });

    describe('reach', () => {
        test('should mark checkpoint as reached', () => {
            const result = checkpoint.reach();
            
            expect(checkpoint.isReached).toBe(true);
            expect(checkpoint.isActive).toBe(true);
            expect(result).toBe(true);
            expect(checkpoint.mesh.material.color.setHex).toHaveBeenCalledWith(0x0088ff);
            expect(checkpoint.mesh.material.emissive.setHex).toHaveBeenCalledWith(0x002244);
        });

        test('should not reach if already reached', () => {
            checkpoint.isReached = true;
            
            const result = checkpoint.reach();
            
            expect(result).toBeUndefined();
        });

        test('should update light color when reached', () => {
            checkpoint.light = { color: { setHex: jest.fn() } };
            
            checkpoint.reach();
            
            expect(checkpoint.light.color.setHex).toHaveBeenCalledWith(0x0088ff);
        });
    });

    describe('isPositionInRange', () => {
        test('should return true for position within range', () => {
            const position = new THREE.Vector3(10, 0, 20);
            position.distanceTo.mockReturnValue(10); // Within radius of 15
            
            const inRange = checkpoint.isPositionInRange(position);
            
            expect(inRange).toBe(true);
            expect(position.distanceTo).toHaveBeenCalledWith(checkpoint.position);
        });

        test('should return false for position outside range', () => {
            const position = new THREE.Vector3(50, 0, 50);
            position.distanceTo.mockReturnValue(25); // Outside radius of 15
            
            const inRange = checkpoint.isPositionInRange(position);
            
            expect(inRange).toBe(false);
        });
    });

    describe('update', () => {
        test('should animate light intensity when active', () => {
            checkpoint.isActive = true;
            checkpoint.light = { intensity: 1 };
            
            // Mock Date.now to return consistent value
            const mockDate = 1000;
            jest.spyOn(Date, 'now').mockReturnValue(mockDate);
            
            checkpoint.update(0.016);
            
            expect(checkpoint.light.intensity).toBeDefined();
            
            Date.now.mockRestore();
        });

        test('should rotate checkpoint pillar', () => {
            const initialRotation = checkpoint.mesh.rotation.y;
            
            checkpoint.update(0.016);
            
            expect(checkpoint.mesh.rotation.y).toBe(initialRotation + 0.016 * 0.5);
        });

        test('should not animate light if not active', () => {
            checkpoint.isActive = false;
            checkpoint.light = { intensity: 1 };
            
            checkpoint.update(0.016);
            
            expect(checkpoint.light.intensity).toBe(1); // Unchanged
        });
    });

    describe('createActivationEffect', () => {
        test('should create particle effect', () => {
            checkpoint.createActivationEffect();
            
            expect(THREE.BufferGeometry).toHaveBeenCalled();
            expect(THREE.BufferAttribute).toHaveBeenCalled();
            expect(THREE.PointsMaterial).toHaveBeenCalled();
            expect(THREE.Points).toHaveBeenCalled();
            expect(mockScene.add).toHaveBeenCalled();
        });
    });

    describe('createCompletionEffect', () => {
        test('should create completion particle effect', () => {
            checkpoint.createCompletionEffect();
            
            expect(THREE.BufferGeometry).toHaveBeenCalled();
            expect(THREE.PointsMaterial).toHaveBeenCalled();
            expect(THREE.Points).toHaveBeenCalled();
            expect(mockScene.add).toHaveBeenCalled();
        });
    });

    describe('getState and setState', () => {
        test('should save and restore checkpoint state', () => {
            checkpoint.isActive = true;
            checkpoint.isReached = true;
            
            const state = checkpoint.getState();
            
            expect(state.id).toBe('test-checkpoint');
            expect(state.isActive).toBe(true);
            expect(state.isReached).toBe(true);
            expect(state.position).toEqual({
                x: checkpoint.position.x,
                y: checkpoint.position.y,
                z: checkpoint.position.z
            });
            
            // Create new checkpoint and restore state
            const newCheckpoint = new Checkpoint(mockConfig, mockScene);
            newCheckpoint.setState(state);
            
            expect(newCheckpoint.isActive).toBe(true);
            expect(newCheckpoint.isReached).toBe(true);
        });

        test('should update visual appearance when setting state', () => {
            const state = {
                id: 'test-checkpoint',
                isActive: true,
                isReached: true,
                position: { x: 10, y: 0, z: 20 }
            };
            
            checkpoint.setState(state);
            
            expect(checkpoint.mesh.material.color.setHex).toHaveBeenCalledWith(0x0088ff);
            expect(checkpoint.mesh.material.emissive.setHex).toHaveBeenCalledWith(0x002244);
        });
    });

    describe('dispose', () => {
        test('should dispose all resources', () => {
            checkpoint.light = { dispose: jest.fn() };
            checkpoint.particles = { 
                geometry: { dispose: jest.fn() },
                material: { dispose: jest.fn() }
            };
            
            checkpoint.dispose();
            
            expect(mockScene.remove).toHaveBeenCalledWith(checkpoint.mesh);
            expect(mockScene.remove).toHaveBeenCalledWith(checkpoint.light);
            expect(mockScene.remove).toHaveBeenCalledWith(checkpoint.particles);
            expect(checkpoint.mesh.geometry.dispose).toHaveBeenCalled();
            expect(checkpoint.mesh.material.dispose).toHaveBeenCalled();
        });

        test('should handle missing resources gracefully', () => {
            checkpoint.mesh = null;
            checkpoint.light = null;
            checkpoint.particles = null;
            
            expect(() => {
                checkpoint.dispose();
            }).not.toThrow();
        });
    });
});