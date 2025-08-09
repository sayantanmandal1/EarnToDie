/**
 * Unit tests for VehicleVisualEnhancer class
 */

import VehicleVisualEnhancer from '../VehicleVisualEnhancer.js';

// Mock Canvas Context
class MockCanvasContext {
    constructor() {
        this.operations = [];
        this.state = {
            fillStyle: '#000000',
            strokeStyle: '#000000',
            lineWidth: 1,
            shadowColor: 'transparent',
            shadowBlur: 0
        };
        this.transformStack = [];
    }
    
    // Drawing operations
    fillRect(x, y, width, height) {
        this.operations.push({ type: 'fillRect', x, y, width, height, style: this.state.fillStyle });
    }
    
    strokeRect(x, y, width, height) {
        this.operations.push({ type: 'strokeRect', x, y, width, height, style: this.state.strokeStyle });
    }
    
    beginPath() {
        this.operations.push({ type: 'beginPath' });
    }
    
    arc(x, y, radius, startAngle, endAngle) {
        this.operations.push({ type: 'arc', x, y, radius, startAngle, endAngle });
    }
    
    moveTo(x, y) {
        this.operations.push({ type: 'moveTo', x, y });
    }
    
    lineTo(x, y) {
        this.operations.push({ type: 'lineTo', x, y });
    }
    
    closePath() {
        this.operations.push({ type: 'closePath' });
    }
    
    fill() {
        this.operations.push({ type: 'fill', style: this.state.fillStyle });
    }
    
    stroke() {
        this.operations.push({ type: 'stroke', style: this.state.strokeStyle });
    }
    
    // Transform operations
    save() {
        this.transformStack.push({ ...this.state });
        this.operations.push({ type: 'save' });
    }
    
    restore() {
        if (this.transformStack.length > 0) {
            this.state = this.transformStack.pop();
        }
        this.operations.push({ type: 'restore' });
    }
    
    translate(x, y) {
        this.operations.push({ type: 'translate', x, y });
    }
    
    rotate(angle) {
        this.operations.push({ type: 'rotate', angle });
    }
    
    // Style setters
    set fillStyle(value) {
        this.state.fillStyle = value;
    }
    
    get fillStyle() {
        return this.state.fillStyle;
    }
    
    set strokeStyle(value) {
        this.state.strokeStyle = value;
    }
    
    get strokeStyle() {
        return this.state.strokeStyle;
    }
    
    set lineWidth(value) {
        this.state.lineWidth = value;
    }
    
    get lineWidth() {
        return this.state.lineWidth;
    }
    
    set shadowColor(value) {
        this.state.shadowColor = value;
        this.operations.push({ type: 'setShadowColor', value });
    }
    
    get shadowColor() {
        return this.state.shadowColor;
    }
    
    set shadowBlur(value) {
        this.state.shadowBlur = value;
        this.operations.push({ type: 'setShadowBlur', value });
    }
    
    get shadowBlur() {
        return this.state.shadowBlur;
    }
    
    // Helper methods for testing
    getOperations() {
        return this.operations;
    }
    
    getOperationsByType(type) {
        return this.operations.filter(op => op.type === type);
    }
    
    clearOperations() {
        this.operations = [];
    }
    
    hasOperation(type) {
        return this.operations.some(op => op.type === type);
    }
}

// Mock Vehicle
const createMockVehicle = (overrides = {}) => ({
    width: 80,
    height: 40,
    controls: {
        throttle: 0,
        fire: false
    },
    ...overrides
});

describe('VehicleVisualEnhancer', () => {
    let enhancer;
    let mockCtx;
    let mockVehicle;
    
    beforeEach(() => {
        enhancer = new VehicleVisualEnhancer();
        mockCtx = new MockCanvasContext();
        mockVehicle = createMockVehicle();
    });
    
    describe('Constructor', () => {
        test('should initialize with empty caches', () => {
            expect(enhancer.enhancementCache).toBeInstanceOf(Map);
            expect(enhancer.spriteCache).toBeInstanceOf(Map);
            expect(enhancer.enhancementCache.size).toBe(0);
            expect(enhancer.spriteCache.size).toBe(0);
        });
    });
    
    describe('applyEnhancements', () => {
        test('should apply transform operations', () => {
            const position = { x: 100, y: 200 };
            const rotation = Math.PI / 4;
            const upgrades = { engine: 0, fuel: 0, armor: 0, weapon: 0, wheels: 0 };
            
            enhancer.applyEnhancements(mockCtx, mockVehicle, upgrades, position, rotation);
            
            expect(mockCtx.hasOperation('save')).toBe(true);
            expect(mockCtx.hasOperation('translate')).toBe(true);
            expect(mockCtx.hasOperation('rotate')).toBe(true);
            expect(mockCtx.hasOperation('restore')).toBe(true);
            
            const translateOp = mockCtx.getOperationsByType('translate')[0];
            expect(translateOp.x).toBe(position.x);
            expect(translateOp.y).toBe(position.y);
            
            const rotateOp = mockCtx.getOperationsByType('rotate')[0];
            expect(rotateOp.angle).toBe(rotation);
        });
        
        test('should not render enhancements for zero levels', () => {
            const upgrades = { engine: 0, fuel: 0, armor: 0, weapon: 0, wheels: 0 };
            
            enhancer.applyEnhancements(mockCtx, mockVehicle, upgrades, { x: 0, y: 0 }, 0);
            
            // Should only have transform operations
            const drawingOps = mockCtx.operations.filter(op => 
                ['fillRect', 'strokeRect', 'arc', 'fill', 'stroke'].includes(op.type)
            );
            expect(drawingOps).toHaveLength(0);
        });
    });
    
    describe('renderEngineEnhancements', () => {
        test('should not render for level 0', () => {
            enhancer.renderEngineEnhancements(mockCtx, mockVehicle, 0);
            
            const drawingOps = mockCtx.getOperationsByType('fillRect');
            expect(drawingOps).toHaveLength(0);
        });
        
        test('should render exhaust system for level 1+', () => {
            enhancer.renderEngineEnhancements(mockCtx, mockVehicle, 1);
            
            const fillRects = mockCtx.getOperationsByType('fillRect');
            expect(fillRects.length).toBeGreaterThan(0);
            
            // Should have exhaust pipe
            const exhaustPipe = fillRects.find(rect => 
                rect.x < -mockVehicle.width / 2 && rect.width > 0
            );
            expect(exhaustPipe).toBeDefined();
        });
        
        test('should render dual exhaust for level 3+', () => {
            enhancer.renderEngineEnhancements(mockCtx, mockVehicle, 3);
            
            const fillRects = mockCtx.getOperationsByType('fillRect');
            
            // Should have at least 2 exhaust pipes
            const exhaustPipes = fillRects.filter(rect => 
                rect.x < -mockVehicle.width / 2 && rect.width > 0
            );
            expect(exhaustPipes.length).toBeGreaterThanOrEqual(2);
        });
        
        test('should render turbo charger for level 3+', () => {
            enhancer.renderEngineEnhancements(mockCtx, mockVehicle, 3);
            
            const fillRects = mockCtx.getOperationsByType('fillRect');
            
            // Should have turbo housing
            const turboHousing = fillRects.find(rect => 
                rect.y < -mockVehicle.height / 2 && rect.width > 0 && rect.height > 0
            );
            expect(turboHousing).toBeDefined();
        });
        
        test('should render engine modifications for level 4+', () => {
            enhancer.renderEngineEnhancements(mockCtx, mockVehicle, 4);
            
            const fillRects = mockCtx.getOperationsByType('fillRect');
            
            // Should have hood scoop
            const hoodScoop = fillRects.find(rect => 
                rect.x > 0 && rect.y < -mockVehicle.height / 2
            );
            expect(hoodScoop).toBeDefined();
        });
    });
    
    describe('renderFuelTankEnhancements', () => {
        test('should not render for levels 0-2', () => {
            enhancer.renderFuelTankEnhancements(mockCtx, mockVehicle, 2);
            
            const drawingOps = mockCtx.getOperationsByType('fillRect');
            expect(drawingOps).toHaveLength(0);
        });
        
        test('should render external fuel tanks for level 3+', () => {
            enhancer.renderFuelTankEnhancements(mockCtx, mockVehicle, 3);
            
            const fillRects = mockCtx.getOperationsByType('fillRect');
            
            // Should have left and right fuel tanks
            const leftTank = fillRects.find(rect => rect.x < -mockVehicle.width / 2);
            const rightTank = fillRects.find(rect => rect.x > mockVehicle.width / 2);
            
            expect(leftTank).toBeDefined();
            expect(rightTank).toBeDefined();
        });
        
        test('should render fuel lines', () => {
            enhancer.renderFuelTankEnhancements(mockCtx, mockVehicle, 3);
            
            const strokes = mockCtx.getOperationsByType('stroke');
            expect(strokes.length).toBeGreaterThanOrEqual(2); // At least 2 fuel lines
        });
        
        test('should render fuel caps for level 4+', () => {
            enhancer.renderFuelTankEnhancements(mockCtx, mockVehicle, 4);
            
            const arcs = mockCtx.getOperationsByType('arc');
            expect(arcs.length).toBeGreaterThanOrEqual(2); // Fuel caps
        });
    });
    
    describe('renderArmorEnhancements', () => {
        test('should not render for level 0', () => {
            enhancer.renderArmorEnhancements(mockCtx, mockVehicle, 0);
            
            const drawingOps = mockCtx.getOperationsByType('fillRect');
            expect(drawingOps).toHaveLength(0);
        });
        
        test('should render side armor plates for level 1+', () => {
            enhancer.renderArmorEnhancements(mockCtx, mockVehicle, 1);
            
            const fillRects = mockCtx.getOperationsByType('fillRect');
            
            // Should have left and right armor plates
            const leftPlate = fillRects.find(rect => rect.x < -mockVehicle.width / 2);
            const rightPlate = fillRects.find(rect => rect.x >= mockVehicle.width / 2);
            
            expect(leftPlate).toBeDefined();
            expect(rightPlate).toBeDefined();
        });
        
        test('should render reinforced bumper for level 2+', () => {
            enhancer.renderArmorEnhancements(mockCtx, mockVehicle, 2);
            
            const fillRects = mockCtx.getOperationsByType('fillRect');
            
            // Should have more rectangles for bumper
            expect(fillRects.length).toBeGreaterThan(2);
        });
        
        test('should render bumper spikes for level 3+', () => {
            enhancer.renderArmorEnhancements(mockCtx, mockVehicle, 3);
            
            const fills = mockCtx.getOperationsByType('fill');
            expect(fills.length).toBeGreaterThan(0); // Spikes use fill()
        });
        
        test('should render roll cage for level 4+', () => {
            enhancer.renderArmorEnhancements(mockCtx, mockVehicle, 4);
            
            const arcs = mockCtx.getOperationsByType('arc');
            expect(arcs.length).toBeGreaterThan(0); // Roll cage uses arc
        });
        
        test('should render rivets for level 3+', () => {
            enhancer.renderArmorEnhancements(mockCtx, mockVehicle, 3);
            
            const arcs = mockCtx.getOperationsByType('arc');
            const rivets = arcs.filter(arc => arc.radius === 1); // Rivets have radius 1
            expect(rivets.length).toBeGreaterThan(0);
        });
    });
    
    describe('renderWeaponEnhancements', () => {
        test('should not render for level 0', () => {
            enhancer.renderWeaponEnhancements(mockCtx, mockVehicle, 0);
            
            const drawingOps = mockCtx.getOperationsByType('fillRect');
            expect(drawingOps).toHaveLength(0);
        });
        
        test('should render roof-mounted weapon for level 1+', () => {
            enhancer.renderWeaponEnhancements(mockCtx, mockVehicle, 1);
            
            const fillRects = mockCtx.getOperationsByType('fillRect');
            
            // Should have weapon mount and barrel
            expect(fillRects.length).toBeGreaterThanOrEqual(2);
            
            // Should have weapon mount above vehicle
            const weaponMount = fillRects.find(rect => rect.y < -mockVehicle.height / 2);
            expect(weaponMount).toBeDefined();
        });
        
        test('should render side weapons for level 3+', () => {
            enhancer.renderWeaponEnhancements(mockCtx, mockVehicle, 3);
            
            const fillRects = mockCtx.getOperationsByType('fillRect');
            
            // Should have additional rectangles for side weapons
            const sideWeapons = fillRects.filter(rect => 
                Math.abs(rect.x) >= mockVehicle.width / 2
            );
            expect(sideWeapons.length).toBeGreaterThan(0);
        });
        
        test('should render front weapons for level 5', () => {
            enhancer.renderWeaponEnhancements(mockCtx, mockVehicle, 5);
            
            const fillRects = mockCtx.getOperationsByType('fillRect');
            
            // Should have front-mounted weapons
            const frontWeapons = fillRects.filter(rect => 
                rect.x >= mockVehicle.width / 2 && Math.abs(rect.y) < mockVehicle.height / 2
            );
            expect(frontWeapons.length).toBeGreaterThan(0);
        });
    });
    
    describe('renderRoofMountedWeapon', () => {
        test('should render basic weapon components', () => {
            enhancer.renderRoofMountedWeapon(mockCtx, mockVehicle.width, mockVehicle.height, 1);
            
            const fillRects = mockCtx.getOperationsByType('fillRect');
            
            // Should have mount and barrel
            expect(fillRects.length).toBeGreaterThanOrEqual(2);
        });
        
        test('should render muzzle brake for level 2+', () => {
            enhancer.renderRoofMountedWeapon(mockCtx, mockVehicle.width, mockVehicle.height, 2);
            
            const fillRects = mockCtx.getOperationsByType('fillRect');
            
            // Should have additional rectangle for muzzle brake
            expect(fillRects.length).toBeGreaterThan(2);
        });
        
        test('should render rotating turret for level 3+', () => {
            enhancer.renderRoofMountedWeapon(mockCtx, mockVehicle.width, mockVehicle.height, 3);
            
            const arcs = mockCtx.getOperationsByType('arc');
            expect(arcs.length).toBeGreaterThan(0); // Turret uses arc
        });
        
        test('should render dual barrels for level 4+', () => {
            enhancer.renderRoofMountedWeapon(mockCtx, mockVehicle.width, mockVehicle.height, 4);
            
            const fillRects = mockCtx.getOperationsByType('fillRect');
            
            // Should have additional rectangles for second barrel
            const barrels = fillRects.filter(rect => 
                rect.y < -mockVehicle.height / 2 && rect.height > 10
            );
            expect(barrels.length).toBeGreaterThanOrEqual(2);
        });
    });
    
    describe('renderWheelEnhancements', () => {
        test('should not render for level 0-1', () => {
            enhancer.renderWheelEnhancements(mockCtx, mockVehicle, 1);
            
            const drawingOps = mockCtx.getOperationsByType('arc');
            expect(drawingOps).toHaveLength(0);
        });
        
        test('should render enhanced wheel wells for level 2+', () => {
            enhancer.renderWheelEnhancements(mockCtx, mockVehicle, 2);
            
            const arcs = mockCtx.getOperationsByType('arc');
            expect(arcs.length).toBeGreaterThanOrEqual(2); // Front and rear wheel wells
        });
        
        test('should render fender flares for level 3+', () => {
            enhancer.renderWheelEnhancements(mockCtx, mockVehicle, 3);
            
            const fillRects = mockCtx.getOperationsByType('fillRect');
            expect(fillRects.length).toBeGreaterThanOrEqual(2); // Front and rear fender flares
        });
    });
    
    describe('renderUpgradeGlowEffects', () => {
        test('should render engine glow when throttling with high engine level', () => {
            const vehicleWithThrottle = createMockVehicle({
                controls: { throttle: 0.8 }
            });
            const upgrades = { engine: 3, fuel: 0, armor: 0, weapon: 0, wheels: 0 };
            
            enhancer.renderUpgradeGlowEffects(mockCtx, vehicleWithThrottle, upgrades, { x: 0, y: 0 }, 0);
            
            const fillRects = mockCtx.getOperationsByType('fillRect');
            expect(fillRects.length).toBeGreaterThan(0);
            
            // Should have set shadow properties through operations
            const shadowColorOps = mockCtx.getOperationsByType('setShadowColor');
            const shadowBlurOps = mockCtx.getOperationsByType('setShadowBlur');
            
            expect(shadowColorOps.length).toBeGreaterThan(0);
            expect(shadowBlurOps.length).toBeGreaterThan(0);
            expect(shadowColorOps[0].value).toBe('#ff4500');
            expect(shadowBlurOps[0].value).toBe(10);
        });
        
        test('should render weapon glow for high weapon level', () => {
            const upgrades = { engine: 0, fuel: 0, armor: 0, weapon: 4, wheels: 0 };
            
            enhancer.renderUpgradeGlowEffects(mockCtx, mockVehicle, upgrades, { x: 0, y: 0 }, 0);
            
            const fillRects = mockCtx.getOperationsByType('fillRect');
            expect(fillRects.length).toBeGreaterThan(0);
            
            // Should have set weapon glow properties through operations
            const shadowColorOps = mockCtx.getOperationsByType('setShadowColor');
            const shadowBlurOps = mockCtx.getOperationsByType('setShadowBlur');
            
            expect(shadowColorOps.length).toBeGreaterThan(0);
            expect(shadowBlurOps.length).toBeGreaterThan(0);
            expect(shadowColorOps[0].value).toBe('#ff0000');
            expect(shadowBlurOps[0].value).toBe(8);
        });
        
        test('should not render glow effects for low levels', () => {
            const upgrades = { engine: 1, fuel: 1, armor: 1, weapon: 1, wheels: 1 };
            
            enhancer.renderUpgradeGlowEffects(mockCtx, mockVehicle, upgrades, { x: 0, y: 0 }, 0);
            
            const fillRects = mockCtx.getOperationsByType('fillRect');
            expect(fillRects).toHaveLength(0);
        });
    });
    
    describe('getUpgradeVisualSummary', () => {
        test('should return summary for all categories', () => {
            const upgrades = { engine: 2, fuel: 3, armor: 1, weapon: 4, wheels: 2 };
            
            const summary = enhancer.getUpgradeVisualSummary(upgrades);
            
            expect(summary).toHaveProperty('totalVisualChanges');
            expect(summary).toHaveProperty('categories');
            
            expect(summary.totalVisualChanges).toBeGreaterThan(0);
            
            Object.keys(upgrades).forEach(category => {
                expect(summary.categories).toHaveProperty(category);
                expect(summary.categories[category]).toHaveProperty('level');
                expect(summary.categories[category]).toHaveProperty('changes');
                expect(summary.categories[category]).toHaveProperty('descriptions');
                
                expect(summary.categories[category].level).toBe(upgrades[category]);
                expect(Array.isArray(summary.categories[category].descriptions)).toBe(true);
            });
        });
        
        test('should handle zero upgrades', () => {
            const upgrades = { engine: 0, fuel: 0, armor: 0, weapon: 0, wheels: 0 };
            
            const summary = enhancer.getUpgradeVisualSummary(upgrades);
            
            expect(summary.totalVisualChanges).toBe(0);
            
            Object.keys(upgrades).forEach(category => {
                expect(summary.categories[category].changes).toBe(0);
                expect(summary.categories[category].descriptions).toHaveLength(0);
            });
        });
    });
    
    describe('getVisualChangesForCategory', () => {
        test('should return correct changes for engine category', () => {
            const changes = enhancer.getVisualChangesForCategory('engine', 4);
            
            expect(changes).toContain('Enhanced exhaust system');
            expect(changes).toContain('Turbo charger');
            expect(changes).toContain('Hood scoop and air intake');
        });
        
        test('should return correct changes for fuel category', () => {
            const changes = enhancer.getVisualChangesForCategory('fuel', 4);
            
            expect(changes).toContain('External fuel tanks');
            expect(changes).toContain('Fuel tank caps and lines');
        });
        
        test('should return correct changes for armor category', () => {
            const changes = enhancer.getVisualChangesForCategory('armor', 4);
            
            expect(changes).toContain('Side armor plating');
            expect(changes).toContain('Reinforced bumper');
            expect(changes).toContain('Bumper spikes and rivets');
            expect(changes).toContain('Roll cage');
        });
        
        test('should return correct changes for weapon category', () => {
            const changes = enhancer.getVisualChangesForCategory('weapon', 5);
            
            expect(changes).toContain('Roof-mounted gun');
            expect(changes).toContain('Muzzle brake');
            expect(changes).toContain('Rotating turret and side weapons');
            expect(changes).toContain('Dual barrel system');
            expect(changes).toContain('Front-mounted machine guns');
        });
        
        test('should return correct changes for wheels category', () => {
            const changes = enhancer.getVisualChangesForCategory('wheels', 3);
            
            expect(changes).toContain('Enhanced wheel wells');
            expect(changes).toContain('Fender flares');
        });
        
        test('should return empty array for level 0', () => {
            const changes = enhancer.getVisualChangesForCategory('engine', 0);
            expect(changes).toHaveLength(0);
        });
        
        test('should return empty array for invalid category', () => {
            const changes = enhancer.getVisualChangesForCategory('invalid', 5);
            expect(changes).toHaveLength(0);
        });
    });
    
    describe('clearCache', () => {
        test('should clear both caches', () => {
            // Add some dummy data to caches
            enhancer.enhancementCache.set('test', 'data');
            enhancer.spriteCache.set('test', 'sprite');
            
            expect(enhancer.enhancementCache.size).toBe(1);
            expect(enhancer.spriteCache.size).toBe(1);
            
            enhancer.clearCache();
            
            expect(enhancer.enhancementCache.size).toBe(0);
            expect(enhancer.spriteCache.size).toBe(0);
        });
    });
    
    describe('Integration Tests', () => {
        test('should render complete vehicle with all upgrades', () => {
            const maxUpgrades = { engine: 5, fuel: 5, armor: 5, weapon: 5, wheels: 5 };
            const position = { x: 100, y: 200 };
            const rotation = 0;
            
            enhancer.applyEnhancements(mockCtx, mockVehicle, maxUpgrades, position, rotation);
            
            // Should have many drawing operations
            const drawingOps = mockCtx.operations.filter(op => 
                ['fillRect', 'strokeRect', 'arc', 'fill', 'stroke'].includes(op.type)
            );
            expect(drawingOps.length).toBeGreaterThan(20);
            
            // Should have proper transform operations
            expect(mockCtx.hasOperation('save')).toBe(true);
            expect(mockCtx.hasOperation('restore')).toBe(true);
            expect(mockCtx.hasOperation('translate')).toBe(true);
        });
        
        test('should handle partial upgrades correctly', () => {
            const partialUpgrades = { engine: 2, fuel: 0, armor: 3, weapon: 1, wheels: 0 };
            
            enhancer.applyEnhancements(mockCtx, mockVehicle, partialUpgrades, { x: 0, y: 0 }, 0);
            
            // Should have some drawing operations but not as many as max upgrades
            const drawingOps = mockCtx.operations.filter(op => 
                ['fillRect', 'strokeRect', 'arc', 'fill', 'stroke'].includes(op.type)
            );
            expect(drawingOps.length).toBeGreaterThan(0);
            expect(drawingOps.length).toBeLessThan(50); // Reasonable upper bound
        });
    });
});