import { Vehicle } from '../Vehicle';
import * as THREE from 'three';

// Mock Three.js objects
jest.mock('three', () => ({
    ...jest.requireActual('three'),
    WebGLRenderer: jest.fn(() => ({
        setSize: jest.fn(),
        render: jest.fn(),
        dispose: jest.fn()
    })),
    Scene: jest.fn(() => ({
        add: jest.fn(),
        remove: jest.fn()
    })),
    PerspectiveCamera: jest.fn(),
    BoxGeometry: jest.fn(() => ({
        dispose: jest.fn()
    })),
    CylinderGeometry: jest.fn(() => ({
        dispose: jest.fn()
    })),
    SphereGeometry: jest.fn(() => ({
        dispose: jest.fn()
    })),
    ConeGeometry: jest.fn(() => ({
        dispose: jest.fn()
    })),
    RingGeometry: jest.fn(() => ({
        dispose: jest.fn()
    })),
    MeshLambertMaterial: jest.fn(() => ({
        dispose: jest.fn()
    })),
    MeshBasicMaterial: jest.fn(() => ({
        dispose: jest.fn()
    })),
    Mesh: jest.fn(() => ({
        add: jest.fn(),
        remove: jest.fn(),
        position: { set: jest.fn(), copy: jest.fn() },
        rotation: { set: jest.fn(), setFromQuaternion: jest.fn() },
        quaternion: { copy: jest.fn() },
        scale: { set: jest.fn() },
        castShadow: true,
        receiveShadow: true,
        geometry: { dispose: jest.fn() },
        material: { dispose: jest.fn() }
    })),
    Group: jest.fn(() => ({
        add: jest.fn(),
        remove: jest.fn(),
        children: [],
        parent: null
    })),
    Vector3: jest.fn(() => ({
        copy: jest.fn(),
        clone: jest.fn(),
        length: jest.fn(() => 10),
        set: jest.fn()
    })),
    Euler: jest.fn(() => ({
        setFromQuaternion: jest.fn(),
        clone: jest.fn()
    })),
    Color: jest.fn(() => ({
        setHex: jest.fn(),
        lerpColors: jest.fn(),
        lerp: jest.fn()
    })),
    DoubleSide: 2,
    PI: Math.PI
}));

// Mock Cannon.js
jest.mock('cannon-es', () => ({
    Box: jest.fn(),
    Body: jest.fn(() => ({
        position: { 
            x: 0, y: 0, z: 0,
            set: jest.fn()
        },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
        velocity: { x: 0, y: 0, z: 0 },
        applyForce: jest.fn(),
        applyTorque: jest.fn(),
        vectorToWorldFrame: jest.fn(),
        linearDamping: 0.1,
        angularDamping: 0.1
    })),
    Vec3: jest.fn(() => ({
        set: jest.fn()
    })),
    Material: jest.fn(),
    Cylinder: jest.fn(),
    PointToPointConstraint: jest.fn()
}));

// Mock game engine
const mockGameEngine = {
    addObject: jest.fn(),
    removeObject: jest.fn(),
    physics: {
        add: jest.fn(),
        remove: jest.fn(),
        addConstraint: jest.fn(),
        removeConstraint: jest.fn()
    }
};

describe('Vehicle Upgrade Visual Effects', () => {
    let vehicle;
    const mockStats = {
        speed: 60,
        acceleration: 40,
        armor: 30,
        fuelCapacity: 100,
        damage: 25,
        handling: 70,
        mass: 1000
    };

    beforeEach(() => {
        jest.clearAllMocks();
        vehicle = new Vehicle('sedan', mockStats, mockGameEngine);
        
        // Mock the mesh to avoid full initialization
        vehicle.mesh = {
            add: jest.fn(),
            remove: jest.fn(),
            traverse: jest.fn()
        };
        
        // Mock wheels array
        vehicle.wheels = [
            { 
                material: { color: { setHex: jest.fn() } }, 
                add: jest.fn(), 
                scale: { set: jest.fn() } 
            },
            { 
                material: { color: { setHex: jest.fn() } }, 
                add: jest.fn(), 
                scale: { set: jest.fn() } 
            }
        ];
    });

    afterEach(() => {
        if (vehicle) {
            vehicle.dispose();
        }
    });

    describe('Engine Upgrade Visuals', () => {
        test('should add engine glow effect for level 2+', () => {
            vehicle.applyUpgrade('engine', 2);

            expect(vehicle.engineGlow).toBeDefined();
            expect(THREE.SphereGeometry).toHaveBeenCalledWith(0.3, 8, 8);
            expect(THREE.MeshBasicMaterial).toHaveBeenCalledWith({
                color: 0xff4500,
                transparent: true,
                opacity: 0.5 // 0.3 + (2 * 0.1)
            });
        });

        test('should add turbo boost effect for level 5', () => {
            vehicle.applyUpgrade('engine', 5);

            expect(vehicle.turboFlame).toBeDefined();
            expect(THREE.ConeGeometry).toHaveBeenCalledWith(0.2, 0.8, 8);
            expect(THREE.MeshBasicMaterial).toHaveBeenCalledWith({
                color: 0x0066ff,
                transparent: true,
                opacity: 0.7
            });
        });

        test('should not add engine effects for level 1', () => {
            vehicle.applyUpgrade('engine', 1);

            expect(vehicle.engineGlow).toBeUndefined();
            expect(vehicle.turboFlame).toBeUndefined();
        });
    });

    describe('Armor Upgrade Visuals', () => {
        test('should add armor plating for level 1+', () => {
            vehicle.applyUpgrade('armor', 1);

            expect(vehicle.armorPlating).toBeDefined();
            expect(THREE.BoxGeometry).toHaveBeenCalledWith(0.1, 0.8, 3.5);
            expect(THREE.MeshLambertMaterial).toHaveBeenCalledWith({
                color: 0x666666,
                metalness: 0.8
            });
        });

        test('should add reinforced bumper for level 5', () => {
            vehicle.applyUpgrade('armor', 5);

            expect(vehicle.reinforcedBumper).toBeDefined();
            expect(THREE.BoxGeometry).toHaveBeenCalledWith(2.2, 0.3, 0.4);
        });

        test('should add armor spikes for level 3+', () => {
            vehicle.applyUpgrade('armor', 3);

            expect(vehicle.armorSpikes).toBeDefined();
            expect(THREE.ConeGeometry).toHaveBeenCalledWith(0.1, 0.3, 6);
        });
    });

    describe('Weapon Upgrade Visuals', () => {
        test('should add weapon mounts for level 1+', () => {
            vehicle.applyUpgrade('weapons', 1);

            expect(vehicle.weaponMounts).toBeDefined();
            expect(THREE.CylinderGeometry).toHaveBeenCalledWith(0.05, 0.05, 0.8, 8);
        });

        test('should add missile launchers for level 3+', () => {
            vehicle.applyUpgrade('weapons', 3);

            expect(vehicle.missileLaunchers).toBeDefined();
            expect(THREE.BoxGeometry).toHaveBeenCalledWith(0.3, 0.2, 0.6);
        });

        test('should add heavy cannon for level 5', () => {
            vehicle.applyUpgrade('weapons', 5);

            expect(vehicle.heavyCannon).toBeDefined();
            expect(THREE.CylinderGeometry).toHaveBeenCalledWith(0.15, 0.15, 2.0, 12);
        });
    });

    describe('Fuel Upgrade Visuals', () => {
        test('should add external fuel tanks for level 2+', () => {
            vehicle.applyUpgrade('fuel', 2);

            expect(vehicle.fuelTanks).toBeDefined();
            expect(THREE.CylinderGeometry).toHaveBeenCalledWith(0.2, 0.2, 1.0, 8);
        });

        test('should add fuel efficiency indicators for level 4+', () => {
            vehicle.applyUpgrade('fuel', 4);

            expect(vehicle.fuelIndicators).toBeDefined();
            expect(THREE.SphereGeometry).toHaveBeenCalledWith(0.05, 8, 8);
        });

        test('should not add fuel tanks for level 1', () => {
            vehicle.applyUpgrade('fuel', 1);

            expect(vehicle.fuelTanks).toBeUndefined();
        });
    });

    describe('Tire Upgrade Visuals', () => {
        test('should modify wheel appearance for level 1+', () => {
            // Mock wheels
            vehicle.wheels = [
                { material: { color: { setHex: jest.fn() } }, add: jest.fn(), scale: { set: jest.fn() } },
                { material: { color: { setHex: jest.fn() } }, add: jest.fn(), scale: { set: jest.fn() } }
            ];

            vehicle.applyUpgrade('tires', 1);

            vehicle.wheels.forEach(wheel => {
                expect(wheel.material.color.setHex).toHaveBeenCalledWith(0x222222);
            });
        });

        test('should add racing stripes for level 3+', () => {
            vehicle.wheels = [
                { material: { color: { setHex: jest.fn() } }, add: jest.fn(), scale: { set: jest.fn() } }
            ];

            vehicle.applyUpgrade('tires', 3);

            expect(THREE.RingGeometry).toHaveBeenCalledWith(0.35, 0.4, 16);
            expect(vehicle.wheels[0].add).toHaveBeenCalled();
        });

        test('should scale wheels for level 5', () => {
            vehicle.wheels = [
                { material: { color: { setHex: jest.fn() } }, add: jest.fn(), scale: { set: jest.fn() } }
            ];

            vehicle.applyUpgrade('tires', 5);

            expect(vehicle.wheels[0].scale.set).toHaveBeenCalledWith(1.1, 1.1, 1.1);
        });
    });

    describe('Multiple Upgrades', () => {
        test('should apply multiple visual effects simultaneously', () => {
            vehicle.applyUpgrade('engine', 3);
            vehicle.applyUpgrade('armor', 2);
            vehicle.applyUpgrade('weapons', 1);

            expect(vehicle.engineGlow).toBeDefined();
            expect(vehicle.armorPlating).toBeDefined();
            expect(vehicle.weaponMounts).toBeDefined();
        });

        test('should not duplicate visual effects when applying same upgrade level', () => {
            vehicle.applyUpgrade('engine', 2);
            const firstGlow = vehicle.engineGlow;

            vehicle.applyUpgrade('engine', 2);
            const secondGlow = vehicle.engineGlow;

            expect(firstGlow).toBe(secondGlow);
        });
    });

    describe('Visual Cleanup', () => {
        test('should clean up upgrade visuals on disposal', () => {
            vehicle.applyUpgrade('engine', 5);
            vehicle.applyUpgrade('armor', 5);
            vehicle.applyUpgrade('weapons', 5);

            const engineGlow = vehicle.engineGlow;
            const armorPlating = vehicle.armorPlating;
            const weaponMounts = vehicle.weaponMounts;

            vehicle.dispose();

            expect(vehicle.engineGlow).toBeNull();
            expect(vehicle.armorPlating).toBeNull();
            expect(vehicle.weaponMounts).toBeNull();
        });

        test('should dispose of geometries and materials', () => {
            vehicle.applyUpgrade('engine', 2);
            
            const mockGeometry = { dispose: jest.fn() };
            const mockMaterial = { dispose: jest.fn() };
            
            vehicle.engineGlow = {
                geometry: mockGeometry,
                material: mockMaterial,
                parent: vehicle.mesh
            };

            vehicle._disposeUpgradeVisuals();

            expect(mockGeometry.dispose).toHaveBeenCalled();
            expect(mockMaterial.dispose).toHaveBeenCalled();
        });
    });

    describe('Performance Stats Integration', () => {
        test('should apply both visual and performance effects', () => {
            const originalSpeed = vehicle.stats.speed;
            const originalArmor = vehicle.stats.armor;

            vehicle.applyUpgrade('engine', 2);
            vehicle.applyUpgrade('armor', 3);

            // Performance effects
            expect(vehicle.stats.speed).toBeGreaterThan(originalSpeed);
            expect(vehicle.stats.armor).toBeGreaterThan(originalArmor);

            // Visual effects
            expect(vehicle.engineGlow).toBeDefined();
            expect(vehicle.armorPlating).toBeDefined();
            expect(vehicle.armorSpikes).toBeDefined();
        });
    });
});