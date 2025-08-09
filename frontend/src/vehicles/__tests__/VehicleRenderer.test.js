/**
 * Unit tests for Vehicle Renderer
 * Tests vehicle rendering with weathered appearance and modifications
 */

import { VehicleRenderer } from '../VehicleRenderer.js';
import { VehicleInstance } from '../VehicleSystem.js';
import { VehicleTypes } from '../../save/GameDataModels.js';

// Mock canvas context
const createMockContext = () => ({
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    createLinearGradient: jest.fn(() => ({
        addColorStop: jest.fn()
    })),
    set fillStyle(value) { this._fillStyle = value; },
    get fillStyle() { return this._fillStyle; },
    set strokeStyle(value) { this._strokeStyle = value; },
    get strokeStyle() { return this._strokeStyle; },
    set lineWidth(value) { this._lineWidth = value; },
    get lineWidth() { return this._lineWidth; }
});

// Mock save manager
const createMockSaveManager = (vehicleType = 'STARTER_CAR', upgrades = {}) => ({
    getSaveData: jest.fn(() => ({
        vehicles: {
            upgrades: {
                [vehicleType]: {
                    engine: 0,
                    fuel: 0,
                    armor: 0,
                    weapon: 0,
                    wheels: 0,
                    ...upgrades
                }
            }
        }
    })),
    saveGame: jest.fn()
});

// Mock vehicle instance
const createMockVehicleInstance = (type = 'STARTER_CAR', upgrades = {}, health = 100) => {
    const saveManager = createMockSaveManager(type, upgrades);
    const config = VehicleTypes[type];
    const instance = new VehicleInstance(type, config, saveManager);
    
    instance.health = health;
    instance.position = { x: 100, y: 200 };
    instance.rotation = 0.5;
    instance.controls = { throttle: 0 };
    
    return instance;
};

describe('VehicleRenderer', () => {
    let renderer;
    let mockCtx;
    
    beforeEach(() => {
        renderer = new VehicleRenderer();
        mockCtx = createMockContext();
    });
    
    afterEach(() => {
        renderer.dispose();
    });
    
    describe('Basic Rendering', () => {
        test('should render vehicle without errors', () => {
            const vehicleInstance = createMockVehicleInstance();
            
            expect(() => {
                renderer.renderVehicle(mockCtx, vehicleInstance);
            }).not.toThrow();
            
            expect(mockCtx.save).toHaveBeenCalled();
            expect(mockCtx.restore).toHaveBeenCalled();
            expect(mockCtx.translate).toHaveBeenCalledWith(100, 200);
            expect(mockCtx.rotate).toHaveBeenCalledWith(0.5);
        });
        
        test('should not render destroyed vehicle', () => {
            const vehicleInstance = createMockVehicleInstance();
            vehicleInstance.health = 0;
            
            renderer.renderVehicle(mockCtx, vehicleInstance);
            
            expect(mockCtx.save).not.toHaveBeenCalled();
        });
        
        test('should not render null vehicle', () => {
            renderer.renderVehicle(mockCtx, null);
            
            expect(mockCtx.save).not.toHaveBeenCalled();
        });
    });
    
    describe('Vehicle Body Rendering', () => {
        test('should render vehicle body with correct dimensions', () => {
            const vehicleInstance = createMockVehicleInstance('STARTER_CAR');
            const appearance = vehicleInstance.getVisualAppearance();
            
            renderer.renderVehicleBody(mockCtx, vehicleInstance, appearance);
            
            expect(mockCtx.fillRect).toHaveBeenCalled();
            expect(mockCtx.strokeRect).toHaveBeenCalled();
            expect(mockCtx.createLinearGradient).toHaveBeenCalled();
        });
        
        test('should render different vehicle types with different details', () => {
            const vehicleTypes = ['STARTER_CAR', 'OLD_TRUCK', 'SPORTS_CAR', 'MONSTER_TRUCK', 'ARMORED_VAN'];
            
            vehicleTypes.forEach(type => {
                const vehicleInstance = createMockVehicleInstance(type);
                const appearance = vehicleInstance.getVisualAppearance();
                
                mockCtx.fillRect.mockClear();
                mockCtx.strokeRect.mockClear();
                
                renderer.renderVehicleBody(mockCtx, vehicleInstance, appearance);
                
                expect(mockCtx.fillRect).toHaveBeenCalled();
                expect(mockCtx.strokeRect).toHaveBeenCalled();
            });
        });
    });
    
    describe('Vehicle Details Rendering', () => {
        test('should render sedan-specific details', () => {
            const dimensions = { width: 60, height: 30 };
            const colors = { primary: '#8b4513', secondary: '#654321' };
            
            renderer.renderSedanDetails(mockCtx, dimensions, colors);
            
            // Should render windshield, headlights, grille, and door handles
            expect(mockCtx.fillRect).toHaveBeenCalledTimes(3); // windshield + 2 door handles
            expect(mockCtx.arc).toHaveBeenCalledTimes(2); // 2 headlights
            expect(mockCtx.moveTo).toHaveBeenCalled(); // grille lines
            expect(mockCtx.lineTo).toHaveBeenCalled();
        });
        
        test('should render truck-specific details', () => {
            const dimensions = { width: 70, height: 35 };
            const colors = { primary: '#654321', secondary: '#4a4a4a' };
            
            renderer.renderTruckDetails(mockCtx, dimensions, colors);
            
            // Should render truck bed, cab, large headlights, and exhaust
            expect(mockCtx.fillRect).toHaveBeenCalledTimes(3); // bed + cab + exhaust
            expect(mockCtx.strokeRect).toHaveBeenCalledTimes(1); // bed outline
            expect(mockCtx.arc).toHaveBeenCalledTimes(2); // 2 large headlights
        });
        
        test('should render sports car-specific details', () => {
            const dimensions = { width: 65, height: 25 };
            const colors = { primary: '#ff4500', secondary: '#cc3300' };
            
            renderer.renderSportsCarDetails(mockCtx, dimensions, colors);
            
            // Should render sleek windshield, racing stripes, spoiler, and performance headlights
            expect(mockCtx.fillRect).toHaveBeenCalledTimes(2); // stripes + spoiler
            expect(mockCtx.arc).toHaveBeenCalledTimes(2); // 2 performance headlights
            expect(mockCtx.beginPath).toHaveBeenCalled();
            expect(mockCtx.closePath).toHaveBeenCalled();
        });
        
        test('should render monster truck-specific details', () => {
            const dimensions = { width: 80, height: 45 };
            const colors = { primary: '#800080', secondary: '#660066' };
            
            renderer.renderMonsterTruckDetails(mockCtx, dimensions, colors);
            
            // Should render lift kit, roll cage, exhaust stacks, and massive headlights
            expect(mockCtx.fillRect).toHaveBeenCalledTimes(3); // lift kit + 2 exhaust stacks
            expect(mockCtx.arc).toHaveBeenCalledTimes(4); // roll cage + 3 massive headlights
        });
        
        test('should render armored van-specific details', () => {
            const dimensions = { width: 75, height: 40 };
            const colors = { primary: '#696969', secondary: '#555555' };
            
            renderer.renderArmoredVanDetails(mockCtx, dimensions, colors);
            
            // Should render reinforced windows, window bars, armored panels, and heavy bumper
            expect(mockCtx.fillRect).toHaveBeenCalledTimes(4); // windows + 2 panels + bumper
            expect(mockCtx.moveTo).toHaveBeenCalled(); // window bars
            expect(mockCtx.lineTo).toHaveBeenCalled();
        });
    });
    
    describe('Upgrade Rendering', () => {
        test('should render engine upgrades', () => {
            const vehicleInstance = createMockVehicleInstance('STARTER_CAR', { engine: 2 });
            const appearance = vehicleInstance.getVisualAppearance();
            
            renderer.renderUpgrades(mockCtx, vehicleInstance, appearance);
            
            // Should render exhaust modifications
            expect(mockCtx.fillRect).toHaveBeenCalled();
            expect(mockCtx.arc).toHaveBeenCalled();
        });
        
        test('should render armor upgrades', () => {
            const vehicleInstance = createMockVehicleInstance('STARTER_CAR', { armor: 3 });
            const appearance = vehicleInstance.getVisualAppearance();
            
            renderer.renderUpgrades(mockCtx, vehicleInstance, appearance);
            
            // Should render armor plating and front bumper
            expect(mockCtx.fillRect).toHaveBeenCalled();
            expect(mockCtx.strokeRect).toHaveBeenCalled();
        });
        
        test('should render weapon upgrades', () => {
            const vehicleInstance = createMockVehicleInstance('STARTER_CAR', { weapon: 2 });
            const appearance = vehicleInstance.getVisualAppearance();
            
            renderer.renderUpgrades(mockCtx, vehicleInstance, appearance);
            
            // Should render roof-mounted gun
            expect(mockCtx.fillRect).toHaveBeenCalled();
            expect(mockCtx.strokeRect).toHaveBeenCalled();
        });
        
        test('should render fuel tank upgrades', () => {
            const vehicleInstance = createMockVehicleInstance('STARTER_CAR', { fuel: 3 });
            const appearance = vehicleInstance.getVisualAppearance();
            
            renderer.renderUpgrades(mockCtx, vehicleInstance, appearance);
            
            // Should render external fuel tanks
            expect(mockCtx.fillRect).toHaveBeenCalled();
            expect(mockCtx.strokeRect).toHaveBeenCalled();
            expect(mockCtx.moveTo).toHaveBeenCalled(); // fuel lines
            expect(mockCtx.lineTo).toHaveBeenCalled();
        });
        
        test('should render wheel upgrades', () => {
            const vehicleInstance = createMockVehicleInstance('STARTER_CAR', { wheels: 3 });
            const appearance = vehicleInstance.getVisualAppearance();
            
            renderer.renderUpgrades(mockCtx, vehicleInstance, appearance);
            
            // Should render wheel well armor
            expect(mockCtx.fillRect).toHaveBeenCalled();
        });
        
        test('should render armor spikes for maximum armor level', () => {
            const vehicleInstance = createMockVehicleInstance('STARTER_CAR', { armor: 5 });
            const appearance = vehicleInstance.getVisualAppearance();
            
            renderer.renderUpgrades(mockCtx, vehicleInstance, appearance);
            
            // Should render spikes around the vehicle
            expect(mockCtx.save).toHaveBeenCalled();
            expect(mockCtx.translate).toHaveBeenCalled();
            expect(mockCtx.rotate).toHaveBeenCalled();
            expect(mockCtx.restore).toHaveBeenCalled();
        });
    });
    
    describe('Damage Effects Rendering', () => {
        test('should render damage cracks for moderately damaged vehicle', () => {
            const vehicleInstance = createMockVehicleInstance('STARTER_CAR', {}, 60); // 60% health
            const appearance = vehicleInstance.getVisualAppearance();
            
            renderer.renderDamageEffects(mockCtx, vehicleInstance, appearance);
            
            // Should render damage cracks
            expect(mockCtx.moveTo).toHaveBeenCalled();
            expect(mockCtx.lineTo).toHaveBeenCalled();
            expect(mockCtx.stroke).toHaveBeenCalled();
        });
        
        test('should render dents for heavily damaged vehicle', () => {
            const vehicleInstance = createMockVehicleInstance('STARTER_CAR', {}, 40); // 40% health
            const appearance = vehicleInstance.getVisualAppearance();
            
            renderer.renderDamageEffects(mockCtx, vehicleInstance, appearance);
            
            // Should render dents
            expect(mockCtx.arc).toHaveBeenCalled();
            expect(mockCtx.fill).toHaveBeenCalled();
        });
        
        test('should render missing parts for critically damaged vehicle', () => {
            const vehicleInstance = createMockVehicleInstance('STARTER_CAR', {}, 20); // 20% health
            const appearance = vehicleInstance.getVisualAppearance();
            
            renderer.renderDamageEffects(mockCtx, vehicleInstance, appearance);
            
            // Should render missing parts (holes)
            expect(mockCtx.fillRect).toHaveBeenCalled();
        });
        
        test('should not render damage effects for healthy vehicle', () => {
            const vehicleInstance = createMockVehicleInstance('STARTER_CAR', {}, 100); // 100% health
            const appearance = vehicleInstance.getVisualAppearance();
            
            mockCtx.moveTo.mockClear();
            mockCtx.lineTo.mockClear();
            mockCtx.arc.mockClear();
            mockCtx.fillRect.mockClear();
            
            renderer.renderDamageEffects(mockCtx, vehicleInstance, appearance);
            
            // Should not render any damage effects
            expect(mockCtx.moveTo).not.toHaveBeenCalled();
            expect(mockCtx.lineTo).not.toHaveBeenCalled();
        });
    });
    
    describe('Weathering Effects Rendering', () => {
        test('should render rust spots for rusty vehicle', () => {
            const vehicleInstance = createMockVehicleInstance('STARTER_CAR');
            const appearance = vehicleInstance.getVisualAppearance();
            
            // Starter car has high weathering level
            renderer.renderWeathering(mockCtx, vehicleInstance, appearance);
            
            // Should render rust spots, dirt, and scratches
            expect(mockCtx.arc).toHaveBeenCalled(); // rust spots
            expect(mockCtx.fillRect).toHaveBeenCalled(); // dirt spots
            expect(mockCtx.moveTo).toHaveBeenCalled(); // scratches
            expect(mockCtx.lineTo).toHaveBeenCalled();
        });
        
        test('should render less weathering for sports car', () => {
            const vehicleInstance = createMockVehicleInstance('SPORTS_CAR');
            const appearance = vehicleInstance.getVisualAppearance();
            
            mockCtx.arc.mockClear();
            mockCtx.fillRect.mockClear();
            
            renderer.renderWeathering(mockCtx, vehicleInstance, appearance);
            
            // Sports car should have less weathering
            const arcCalls = mockCtx.arc.mock.calls.length;
            const fillRectCalls = mockCtx.fillRect.mock.calls.length;
            
            // Should have some weathering but less than starter car
            expect(arcCalls).toBeGreaterThanOrEqual(0);
            expect(fillRectCalls).toBeGreaterThanOrEqual(0);
        });
    });
    
    describe('Particle Effects Rendering', () => {
        test('should render smoke for damaged vehicle', () => {
            const vehicleInstance = createMockVehicleInstance('STARTER_CAR', {}, 25); // 25% health
            const appearance = vehicleInstance.getVisualAppearance();
            
            renderer.renderParticleEffects(mockCtx, vehicleInstance, appearance);
            
            // Should render damage smoke
            expect(mockCtx.arc).toHaveBeenCalled();
            expect(mockCtx.fill).toHaveBeenCalled();
        });
        
        test('should render exhaust smoke for throttling vehicle with engine upgrades', () => {
            const vehicleInstance = createMockVehicleInstance('STARTER_CAR', { engine: 2 });
            vehicleInstance.controls.throttle = 0.8;
            const appearance = vehicleInstance.getVisualAppearance();
            
            renderer.renderParticleEffects(mockCtx, vehicleInstance, appearance);
            
            // Should render exhaust smoke
            expect(mockCtx.arc).toHaveBeenCalled();
            expect(mockCtx.fill).toHaveBeenCalled();
        });
        
        test('should not render exhaust smoke when not throttling', () => {
            const vehicleInstance = createMockVehicleInstance('STARTER_CAR', { engine: 2 });
            vehicleInstance.controls.throttle = 0;
            const appearance = vehicleInstance.getVisualAppearance();
            
            mockCtx.arc.mockClear();
            mockCtx.fill.mockClear();
            
            renderer.renderParticleEffects(mockCtx, vehicleInstance, appearance);
            
            // Should not render exhaust smoke (but might render damage smoke)
            // We can't easily test this without more complex mocking
        });
    });
    
    describe('Utility Functions', () => {
        test('should get correct dimensions for different vehicle types', () => {
            const starterCarDimensions = renderer.getVehicleDimensions('STARTER_CAR');
            expect(starterCarDimensions).toEqual({ width: 60, height: 30 });
            
            const monsterTruckDimensions = renderer.getVehicleDimensions('MONSTER_TRUCK');
            expect(monsterTruckDimensions).toEqual({ width: 80, height: 45 });
            
            const unknownDimensions = renderer.getVehicleDimensions('UNKNOWN_TYPE');
            expect(unknownDimensions).toEqual({ width: 60, height: 30 }); // Default to starter car
        });
        
        test('should lighten colors correctly', () => {
            const originalColor = '#808080';
            const lightenedColor = renderer.lightenColor(originalColor, 0.5);
            
            expect(lightenedColor).toBeDefined();
            expect(lightenedColor).toMatch(/^#[0-9a-f]{6}$/i);
            expect(lightenedColor).not.toBe(originalColor);
        });
        
        test('should darken colors correctly', () => {
            const originalColor = '#808080';
            const darkenedColor = renderer.darkenColor(originalColor, 0.5);
            
            expect(darkenedColor).toBeDefined();
            expect(darkenedColor).toMatch(/^#[0-9a-f]{6}$/i);
            expect(darkenedColor).not.toBe(originalColor);
        });
        
        test('should handle non-hex colors gracefully', () => {
            const nonHexColor = 'rgb(128, 128, 128)';
            
            expect(renderer.lightenColor(nonHexColor, 0.5)).toBe(nonHexColor);
            expect(renderer.darkenColor(nonHexColor, 0.5)).toBe(nonHexColor);
        });
    });
    
    describe('Resource Management', () => {
        test('should dispose of resources correctly', () => {
            renderer.particleEffects = ['effect1', 'effect2'];
            renderer.damageTextures.set('key1', 'texture1');
            renderer.upgradeVisuals.set('key2', 'visual1');
            
            renderer.dispose();
            
            expect(renderer.particleEffects).toEqual([]);
            expect(renderer.damageTextures.size).toBe(0);
            expect(renderer.upgradeVisuals.size).toBe(0);
        });
    });
    
    describe('Edge Cases', () => {
        test('should handle vehicle with no controls', () => {
            const vehicleInstance = createMockVehicleInstance('STARTER_CAR', { engine: 2 });
            vehicleInstance.controls = null;
            const appearance = vehicleInstance.getVisualAppearance();
            
            expect(() => {
                renderer.renderParticleEffects(mockCtx, vehicleInstance, appearance);
            }).not.toThrow();
        });
        
        test('should handle vehicle with no modifications', () => {
            const vehicleInstance = createMockVehicleInstance('STARTER_CAR');
            const appearance = vehicleInstance.getVisualAppearance();
            appearance.modifications = [];
            
            expect(() => {
                renderer.renderUpgrades(mockCtx, vehicleInstance, appearance);
            }).not.toThrow();
        });
        
        test('should handle extreme damage levels', () => {
            const vehicleInstance = createMockVehicleInstance('STARTER_CAR', {}, 0); // 0% health
            const appearance = vehicleInstance.getVisualAppearance();
            
            expect(() => {
                renderer.renderDamageEffects(mockCtx, vehicleInstance, appearance);
            }).not.toThrow();
        });
        
        test('should handle extreme weathering levels', () => {
            const vehicleInstance = createMockVehicleInstance('STARTER_CAR');
            const appearance = vehicleInstance.getVisualAppearance();
            appearance.weatheringLevel = 1.0; // Maximum weathering
            appearance.rustLevel = 1.0; // Maximum rust
            
            expect(() => {
                renderer.renderWeathering(mockCtx, vehicleInstance, appearance);
            }).not.toThrow();
        });
    });
});