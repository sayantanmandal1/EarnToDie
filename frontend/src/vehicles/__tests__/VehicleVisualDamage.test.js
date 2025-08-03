/**
 * Vehicle Visual Damage Tests
 * Tests for visual damage rendering and particle effects
 */

import VehicleVisualDamage from '../VehicleVisualDamage.js';

// Mock canvas and context
const mockCanvas = {
    width: 800,
    height: 600,
    getContext: jest.fn(() => ({
        clearRect: jest.fn(),
        fillRect: jest.fn(),
        beginPath: jest.fn(),
        arc: jest.fn(),
        fill: jest.fn(),
        stroke: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        quadraticCurveTo: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        translate: jest.fn(),
        rotate: jest.fn(),
        transform: jest.fn(),
        drawImage: jest.fn(),
        createImageData: jest.fn(() => ({
            data: new Uint8ClampedArray(256 * 256 * 4)
        })),
        putImageData: jest.fn(),
        createRadialGradient: jest.fn(() => ({
            addColorStop: jest.fn()
        })),
        set fillStyle(value) { this._fillStyle = value; },
        get fillStyle() { return this._fillStyle; },
        set strokeStyle(value) { this._strokeStyle = value; },
        get strokeStyle() { return this._strokeStyle; },
        set lineWidth(value) { this._lineWidth = value; },
        get lineWidth() { return this._lineWidth; },
        set globalAlpha(value) { this._globalAlpha = value; },
        get globalAlpha() { return this._globalAlpha; }
    }))
};

// Mock document.createElement for canvas creation
global.document = {
    createElement: jest.fn((tagName) => {
        if (tagName === 'canvas') {
            return {
                width: 512,
                height: 512,
                getContext: mockCanvas.getContext
            };
        }
        return {};
    })
};

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
    setTimeout(callback, 16); // ~60fps
    return 1;
});

global.cancelAnimationFrame = jest.fn();

describe('VehicleVisualDamage', () => {
    let visualDamage;
    let canvas;

    beforeEach(() => {
        canvas = mockCanvas;
        visualDamage = new VehicleVisualDamage(canvas, {
            enableParticleEffects: true,
            enableDeformation: true,
            enableDamageTextures: true,
            particleCount: 20,
            particleLifetime: 1000
        });
    });

    afterEach(() => {
        visualDamage.dispose();
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize with default settings', () => {
            expect(visualDamage.canvas).toBe(canvas);
            expect(visualDamage.options.enableParticleEffects).toBe(true);
            expect(visualDamage.options.enableDeformation).toBe(true);
            expect(visualDamage.options.particleCount).toBe(20);
        });

        test('should create damage textures', () => {
            expect(visualDamage.damageOverlays.scratches).toBeDefined();
            expect(visualDamage.damageOverlays.dents).toBeDefined();
            expect(visualDamage.damageOverlays.rust).toBeDefined();
            expect(visualDamage.damageOverlays.cracks).toBeDefined();
        });

        test('should emit initialized event', () => {
            const initSpy = jest.fn();
            const newVisualDamage = new VehicleVisualDamage(canvas);
            
            newVisualDamage.on('initialized', initSpy);
            
            expect(initSpy).toHaveBeenCalled();
            
            newVisualDamage.dispose();
        });

        test('should start render loop', () => {
            expect(global.requestAnimationFrame).toHaveBeenCalled();
        });
    });

    describe('Damage Application', () => {
        test('should apply visual damage from damage data', () => {
            const damageData = {
                deformation: {
                    front: 5,
                    rear: 2,
                    left: 3,
                    right: 1
                },
                scratches: {
                    front: 4,
                    rear: 2,
                    left: 3,
                    right: 2
                },
                brokenParts: {
                    headlights: [true, false],
                    taillights: [false, true],
                    windows: [false, false, true, false, false, false],
                    mirrors: [true, false],
                    bumpers: [false, true]
                },
                fluids: {
                    oil: true,
                    coolant: false,
                    fuel: true,
                    brake_fluid: false
                }
            };

            const damageSpy = jest.fn();
            visualDamage.on('damageApplied', damageSpy);

            visualDamage.applyDamage(damageData);

            expect(damageSpy).toHaveBeenCalledWith(damageData);
            
            // Check deformation was applied
            expect(visualDamage.deformationData.deformationMap.has('front')).toBe(true);
            expect(visualDamage.deformationData.deformationMap.get('front').amount).toBe(5);
            
            // Check broken parts were stored
            expect(visualDamage.brokenParts.headlights[0]).toBe(true);
            expect(visualDamage.brokenParts.headlights[1]).toBe(false);
        });

        test('should respect deformation scale option', () => {
            const scaledVisualDamage = new VehicleVisualDamage(canvas, {
                deformationScale: 2.0
            });

            const damageData = {
                deformation: { front: 3 },
                scratches: {},
                brokenParts: { headlights: [false, false] },
                fluids: {}
            };

            scaledVisualDamage.applyDamage(damageData);

            const deformation = scaledVisualDamage.deformationData.deformationMap.get('front');
            expect(deformation.amount).toBe(6); // 3 * 2.0 scale

            scaledVisualDamage.dispose();
        });

        test('should not apply deformation when disabled', () => {
            const noDeformVisualDamage = new VehicleVisualDamage(canvas, {
                enableDeformation: false
            });

            const damageData = {
                deformation: { front: 5 },
                scratches: {},
                brokenParts: { headlights: [false, false] },
                fluids: {}
            };

            noDeformVisualDamage.applyDamage(damageData);

            expect(noDeformVisualDamage.deformationData.deformationMap.size).toBe(0);

            noDeformVisualDamage.dispose();
        });
    });

    describe('Particle Effects', () => {
        test('should create impact particles', () => {
            const position = { x: 400, y: 300 };
            const severity = 8;

            visualDamage.createImpactEffect(position, severity, 'collision');

            // Should have created sparks
            expect(visualDamage.particleSystems.sparks.length).toBeGreaterThan(0);
            
            // Should have created debris
            expect(visualDamage.particleSystems.debris.length).toBeGreaterThan(0);
            
            // Should have created smoke for severe impact
            expect(visualDamage.particleSystems.smoke.length).toBeGreaterThan(0);
        });

        test('should create glass break particles', () => {
            visualDamage.createGlassBreakEffect('headlight_0');

            expect(visualDamage.particleSystems.glass.length).toBeGreaterThan(0);
            
            const glassParticle = visualDamage.particleSystems.glass[0];
            expect(glassParticle.partName).toBe('headlight_0');
            expect(glassParticle.life).toBe(visualDamage.options.particleLifetime);
        });

        test('should create fluid leak particles', () => {
            visualDamage.createFluidParticles('oil');

            expect(visualDamage.particleSystems.fluid.length).toBeGreaterThan(0);
            
            const fluidParticle = visualDamage.particleSystems.fluid[0];
            expect(fluidParticle.fluidType).toBe('oil');
            expect(fluidParticle.color).toEqual({ r: 20, g: 20, b: 20 });
        });

        test('should not create particles when disabled', () => {
            const noParticleVisualDamage = new VehicleVisualDamage(canvas, {
                enableParticleEffects: false
            });

            noParticleVisualDamage.createImpactEffect({ x: 400, y: 300 }, 8);

            expect(noParticleVisualDamage.particleSystems.sparks.length).toBe(0);
            expect(noParticleVisualDamage.particleSystems.debris.length).toBe(0);

            noParticleVisualDamage.dispose();
        });

        test('should update particle positions and life', () => {
            // Add a test particle
            visualDamage.particleSystems.sparks.push({
                x: 100,
                y: 100,
                vx: 50,
                vy: -30,
                size: 2,
                life: 1000,
                maxLife: 1000,
                color: { r: 255, g: 200, b: 100 }
            });

            const deltaTime = 0.1; // 100ms
            visualDamage.updateParticles(deltaTime);

            const particle = visualDamage.particleSystems.sparks[0];
            
            // Position should have updated
            expect(particle.x).toBe(105); // 100 + 50 * 0.1
            expect(particle.y).toBe(97);  // 100 + (-30) * 0.1
            
            // Life should have decreased
            expect(particle.life).toBe(900); // 1000 - 100
        });

        test('should remove dead particles', () => {
            // Add a particle with very low life
            visualDamage.particleSystems.sparks.push({
                x: 100,
                y: 100,
                vx: 0,
                vy: 0,
                size: 2,
                life: 50, // Very low life
                maxLife: 1000,
                color: { r: 255, g: 200, b: 100 }
            });

            const deltaTime = 0.1; // 100ms - should kill the particle
            visualDamage.updateParticles(deltaTime);

            expect(visualDamage.particleSystems.sparks.length).toBe(0);
        });
    });

    describe('Texture Creation', () => {
        test('should create scratch texture', () => {
            const scratchTexture = visualDamage.createScratchTexture();
            
            expect(scratchTexture).toBeDefined();
            expect(scratchTexture.width).toBe(512);
            expect(scratchTexture.height).toBe(512);
        });

        test('should create dent texture', () => {
            const dentTexture = visualDamage.createDentTexture();
            
            expect(dentTexture).toBeDefined();
            expect(dentTexture.width).toBe(256);
            expect(dentTexture.height).toBe(256);
        });

        test('should create rust texture', () => {
            const rustTexture = visualDamage.createRustTexture();
            
            expect(rustTexture).toBeDefined();
            expect(rustTexture.width).toBe(256);
            expect(rustTexture.height).toBe(256);
        });

        test('should create crack texture', () => {
            const crackTexture = visualDamage.createCrackTexture();
            
            expect(crackTexture).toBeDefined();
            expect(crackTexture.width).toBe(512);
            expect(crackTexture.height).toBe(512);
        });
    });

    describe('Rendering', () => {
        test('should render vehicle with damage', () => {
            const vehicleData = { color: '#ff0000' };
            
            // Add some damage for rendering
            visualDamage.deformationData.deformationMap.set('front', {
                amount: 5,
                type: 'inward',
                timestamp: Date.now()
            });
            
            visualDamage.surfaceDamage = { front: 3 };
            visualDamage.brokenParts = { headlights: [true, false] };
            
            // Add a particle
            visualDamage.particleSystems.sparks.push({
                x: 400,
                y: 300,
                size: 3,
                life: 500,
                maxLife: 1000,
                color: { r: 255, g: 200, b: 100 }
            });

            visualDamage.render(vehicleData);

            const ctx = canvas.getContext('2d');
            
            // Should have cleared canvas
            expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height);
            
            // Should have rendered vehicle base
            expect(ctx.fillRect).toHaveBeenCalled();
            
            // Should have rendered particles
            expect(ctx.arc).toHaveBeenCalled();
        });

        test('should handle empty damage gracefully', () => {
            const vehicleData = { color: '#0000ff' };
            
            expect(() => {
                visualDamage.render(vehicleData);
            }).not.toThrow();
        });
    });

    describe('Render Loop Control', () => {
        test('should stop render loop', () => {
            visualDamage.stopRenderLoop();
            
            expect(global.cancelAnimationFrame).toHaveBeenCalled();
            expect(visualDamage.animationFrame).toBeNull();
        });

        test('should restart render loop', () => {
            visualDamage.stopRenderLoop();
            jest.clearAllMocks();
            
            visualDamage.startRenderLoop();
            
            expect(global.requestAnimationFrame).toHaveBeenCalled();
        });
    });

    describe('Disposal', () => {
        test('should dispose properly', () => {
            // Add some particles
            visualDamage.particleSystems.sparks.push({ test: 'particle' });
            visualDamage.particleSystems.debris.push({ test: 'particle' });
            
            visualDamage.dispose();
            
            // Should stop render loop
            expect(global.cancelAnimationFrame).toHaveBeenCalled();
            
            // Should clear particles
            expect(visualDamage.particleSystems.sparks.length).toBe(0);
            expect(visualDamage.particleSystems.debris.length).toBe(0);
        });

        test('should remove all event listeners', () => {
            const testListener = jest.fn();
            visualDamage.on('test', testListener);
            
            visualDamage.dispose();
            visualDamage.emit('test');
            
            expect(testListener).not.toHaveBeenCalled();
        });
    });

    describe('Integration', () => {
        test('should handle complex damage scenario', () => {
            const complexDamageData = {
                deformation: {
                    front: 8,
                    rear: 3,
                    left: 5,
                    right: 2,
                    roof: 1
                },
                scratches: {
                    front: 6,
                    rear: 4,
                    left: 7,
                    right: 3,
                    roof: 2
                },
                brokenParts: {
                    headlights: [true, true],
                    taillights: [false, true],
                    windows: [true, false, true, false, false, true],
                    mirrors: [true, true],
                    bumpers: [true, false]
                },
                fluids: {
                    oil: true,
                    coolant: true,
                    fuel: false,
                    brake_fluid: true
                }
            };

            expect(() => {
                visualDamage.applyDamage(complexDamageData);
                visualDamage.createImpactEffect({ x: 400, y: 300 }, 10);
                visualDamage.render({ color: '#ff0000' });
            }).not.toThrow();

            // Should have applied all damage types
            expect(visualDamage.deformationData.deformationMap.size).toBeGreaterThan(0);
            expect(visualDamage.surfaceDamage).toBeDefined();
            expect(visualDamage.brokenParts).toBeDefined();
            
            // Should have created particles
            const totalParticles = Object.values(visualDamage.particleSystems)
                .reduce((sum, system) => sum + system.length, 0);
            expect(totalParticles).toBeGreaterThan(0);
        });
    });
});