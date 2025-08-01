import { FinalIntegration } from '../integration/FinalIntegration';
import { GameBalance } from '../balance/GameBalance';
import { ParticleSystem } from '../effects/ParticleSystem';
import { AnimationSystem } from '../effects/AnimationSystem';

// Mock the game engine
const mockGameEngine = {
    scene: {
        add: jest.fn(),
        remove: jest.fn()
    },
    camera: {
        position: { x: 0, y: 0, z: 0 },
        lookAt: jest.fn()
    },
    physics: {
        add: jest.fn(),
        remove: jest.fn()
    },
    onUpdate: null,
    onRender: null
};

describe('Final Integration System', () => {
    let finalIntegration;

    beforeEach(async () => {
        finalIntegration = new FinalIntegration(mockGameEngine);
        await finalIntegration.initialize();
    });

    afterEach(() => {
        if (finalIntegration) {
            finalIntegration.dispose();
        }
    });

    describe('System Initialization', () => {
        test('should initialize all core systems', () => {
            expect(finalIntegration.isInitialized).toBe(true);
            expect(finalIntegration.particleSystem).toBeInstanceOf(ParticleSystem);
            expect(finalIntegration.animationSystem).toBeInstanceOf(AnimationSystem);
            expect(finalIntegration.gameBalance).toBeInstanceOf(GameBalance);
        });

        test('should setup event handlers', () => {
            expect(finalIntegration.eventHandlers.size).toBeGreaterThan(0);
        });
    });

    describe('Particle Effects Integration', () => {
        test('should create explosion particles on vehicle explosion', () => {
            const createExplosionSpy = jest.spyOn(finalIntegration.particleSystem, 'createExplosion');
            
            finalIntegration.triggerEvent('vehicle_explosion', {
                position: { x: 0, y: 0, z: 0 },
                intensity: 2.0
            });

            expect(createExplosionSpy).toHaveBeenCalledWith(
                { x: 0, y: 0, z: 0 },
                2.0,
                0xff4444
            );
        });

        test('should create blood splatter on zombie death', () => {
            const createBloodSplatterSpy = jest.spyOn(finalIntegration.particleSystem, 'createBloodSplatter');
            
            finalIntegration.triggerEvent('zombie_death', {
                position: { x: 5, y: 0, z: 5 },
                direction: { x: 1, y: 0, z: 0 },
                intensity: 1.0
            });

            expect(createBloodSplatterSpy).toHaveBeenCalledWith(
                { x: 5, y: 0, z: 5 },
                { x: 1, y: 0, z: 0 },
                1.0
            );
        });

        test('should create sparks on vehicle damage', () => {
            const createSparksSpy = jest.spyOn(finalIntegration.particleSystem, 'createSparks');
            
            finalIntegration.triggerEvent('vehicle_damage', {
                position: { x: 2, y: 1, z: 3 },
                direction: { x: 0, y: 1, z: 0 },
                intensity: 0.8
            });

            expect(createSparksSpy).toHaveBeenCalledWith(
                { x: 2, y: 1, z: 3 },
                { x: 0, y: 1, z: 0 },
                0.8
            );
        });
    });

    describe('Animation System Integration', () => {
        test('should create camera shake animation', () => {
            const createShakeSpy = jest.spyOn(finalIntegration.animationSystem, 'createShake');
            
            finalIntegration.triggerEvent('camera_shake', {
                intensity: 1.5,
                duration: 0.5
            });

            expect(createShakeSpy).toHaveBeenCalledWith(
                mockGameEngine.camera,
                1.5,
                0.5
            );
        });

        test('should animate camera movement', () => {
            const animateCameraSpy = jest.spyOn(finalIntegration.animationSystem, 'animateCamera');
            
            const targetPosition = { x: 10, y: 5, z: 10 };
            const targetLookAt = { x: 0, y: 0, z: 0 };
            
            finalIntegration.triggerEvent('camera_focus', {
                targetPosition,
                targetLookAt,
                duration: 2.0
            });

            expect(animateCameraSpy).toHaveBeenCalledWith(
                targetPosition,
                targetLookAt,
                2.0,
                undefined
            );
        });

        test('should create object pulse animation', () => {
            const createPulseSpy = jest.spyOn(finalIntegration.animationSystem, 'createPulse');
            const mockObject = { scale: { x: 1, y: 1, z: 1 } };
            
            finalIntegration.triggerEvent('object_highlight', {
                object: mockObject,
                loops: 5
            });

            expect(createPulseSpy).toHaveBeenCalledWith(
                mockObject,
                0.9,
                1.1,
                1.0,
                5
            );
        });
    });

    describe('Game Balance Integration', () => {
        test('should update player skill on level completion', () => {
            const updatePlayerSkillSpy = jest.spyOn(finalIntegration.gameBalance, 'updatePlayerSkill');
            
            finalIntegration.triggerEvent('level_complete', {
                zombiesKilled: 25,
                timeAlive: 180,
                damageReceived: 30,
                accuracy: 0.8
            });

            expect(updatePlayerSkillSpy).toHaveBeenCalledWith({
                zombiesKilled: 25,
                timeAlive: 180,
                damageReceived: 30,
                accuracy: 0.8,
                levelCompleted: true
            });
        });

        test('should calculate balanced zombie stats', () => {
            const zombieStats = finalIntegration.gameBalance.getZombieStats('walker', 3);
            
            expect(zombieStats).toHaveProperty('health');
            expect(zombieStats).toHaveProperty('speed');
            expect(zombieStats).toHaveProperty('damage');
            expect(zombieStats).toHaveProperty('points');
            
            expect(zombieStats.health).toBeGreaterThan(0);
            expect(zombieStats.speed).toBeGreaterThan(0);
            expect(zombieStats.damage).toBeGreaterThan(0);
        });

        test('should calculate balanced vehicle stats', () => {
            const vehicleStats = finalIntegration.gameBalance.getVehicleStats('sedan', 2);
            
            expect(vehicleStats).toHaveProperty('speed');
            expect(vehicleStats).toHaveProperty('maxSpeed');
            expect(vehicleStats).toHaveProperty('acceleration');
            expect(vehicleStats).toHaveProperty('handling');
            expect(vehicleStats).toHaveProperty('durability');
            
            expect(vehicleStats.speed).toBeGreaterThan(0);
            expect(vehicleStats.handling).toBeLessThanOrEqual(1.0);
        });
    });

    describe('Performance Monitoring', () => {
        test('should track performance metrics', () => {
            const metrics = finalIntegration.getPerformanceMetrics();
            
            expect(metrics).toHaveProperty('frameRate');
            expect(metrics).toHaveProperty('particleCount');
            expect(metrics).toHaveProperty('animationCount');
            expect(metrics).toHaveProperty('memoryUsage');
            
            expect(typeof metrics.frameRate).toBe('number');
            expect(typeof metrics.particleCount).toBe('number');
            expect(typeof metrics.animationCount).toBe('number');
            expect(typeof metrics.memoryUsage).toBe('number');
        });

        test('should handle performance degradation', () => {
            // Simulate poor performance
            finalIntegration.performanceMetrics.frameRate = 25;
            finalIntegration.performanceMetrics.particleCount = 300;
            
            const triggerEventSpy = jest.spyOn(finalIntegration, 'triggerEvent');
            
            finalIntegration.handlePerformanceAdjustment();
            
            expect(triggerEventSpy).toHaveBeenCalledWith('performance_degradation', {
                level: 'severe',
                fps: 25,
                particleCount: 300
            });
        });

        test('should adjust particle limits based on performance', () => {
            const initialMaxParticles = finalIntegration.particleSystem.maxParticles;
            
            // Simulate poor performance
            finalIntegration.performanceMetrics.frameRate = 20;
            finalIntegration.performanceMetrics.particleCount = 250;
            
            finalIntegration.handlePerformanceAdjustment();
            
            expect(finalIntegration.particleSystem.maxParticles).toBeLessThan(initialMaxParticles);
        });
    });

    describe('Event System', () => {
        test('should add and trigger event handlers', () => {
            const mockHandler = jest.fn();
            
            finalIntegration.addEventHandler('test_event', mockHandler);
            finalIntegration.triggerEvent('test_event', { data: 'test' });
            
            expect(mockHandler).toHaveBeenCalledWith({ data: 'test' });
        });

        test('should remove event handlers', () => {
            const mockHandler = jest.fn();
            
            finalIntegration.addEventHandler('test_event', mockHandler);
            finalIntegration.removeEventHandler('test_event', mockHandler);
            finalIntegration.triggerEvent('test_event', { data: 'test' });
            
            expect(mockHandler).not.toHaveBeenCalled();
        });

        test('should handle multiple handlers for same event', () => {
            const handler1 = jest.fn();
            const handler2 = jest.fn();
            
            finalIntegration.addEventHandler('test_event', handler1);
            finalIntegration.addEventHandler('test_event', handler2);
            finalIntegration.triggerEvent('test_event', { data: 'test' });
            
            expect(handler1).toHaveBeenCalledWith({ data: 'test' });
            expect(handler2).toHaveBeenCalledWith({ data: 'test' });
        });

        test('should handle errors in event handlers gracefully', () => {
            const errorHandler = jest.fn(() => {
                throw new Error('Handler error');
            });
            const normalHandler = jest.fn();
            
            finalIntegration.addEventHandler('test_event', errorHandler);
            finalIntegration.addEventHandler('test_event', normalHandler);
            
            // Should not throw
            expect(() => {
                finalIntegration.triggerEvent('test_event', { data: 'test' });
            }).not.toThrow();
            
            expect(normalHandler).toHaveBeenCalled();
        });
    });

    describe('System Updates', () => {
        test('should update all systems on update call', () => {
            const particleUpdateSpy = jest.spyOn(finalIntegration.particleSystem, 'update');
            const animationUpdateSpy = jest.spyOn(finalIntegration.animationSystem, 'update');
            
            finalIntegration.update(0.016); // 60 FPS
            
            expect(particleUpdateSpy).toHaveBeenCalledWith(0.016);
            expect(animationUpdateSpy).toHaveBeenCalledWith(0.016);
        });

        test('should handle update errors gracefully', () => {
            jest.spyOn(finalIntegration.particleSystem, 'update').mockImplementation(() => {
                throw new Error('Update error');
            });
            
            // Should not throw
            expect(() => {
                finalIntegration.update(0.016);
            }).not.toThrow();
        });
    });

    describe('Balance Data Persistence', () => {
        test('should save balance data to localStorage', () => {
            const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
            
            finalIntegration.saveBalanceData();
            
            expect(setItemSpy).toHaveBeenCalledWith(
                'zombie_car_game_balance',
                expect.any(String)
            );
        });

        test('should handle localStorage errors gracefully', () => {
            jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
                throw new Error('Storage error');
            });
            
            // Should not throw
            expect(() => {
                finalIntegration.saveBalanceData();
            }).not.toThrow();
        });
    });

    describe('System Disposal', () => {
        test('should dispose all systems properly', () => {
            const particleDisposeSpy = jest.spyOn(finalIntegration.particleSystem, 'dispose');
            const animationDisposeSpy = jest.spyOn(finalIntegration.animationSystem, 'dispose');
            
            finalIntegration.dispose();
            
            expect(particleDisposeSpy).toHaveBeenCalled();
            expect(animationDisposeSpy).toHaveBeenCalled();
            expect(finalIntegration.isInitialized).toBe(false);
        });

        test('should clear event handlers on disposal', () => {
            finalIntegration.addEventHandler('test_event', jest.fn());
            
            finalIntegration.dispose();
            
            expect(finalIntegration.eventHandlers.size).toBe(0);
        });
    });

    describe('Integration Scenarios', () => {
        test('should handle complete combat scenario', () => {
            const particleCreateSpy = jest.spyOn(finalIntegration.particleSystem, 'createBloodSplatter');
            const animationShakeSpy = jest.spyOn(finalIntegration.animationSystem, 'createShake');
            
            // Simulate zombie being hit and killed
            finalIntegration.triggerEvent('zombie_hit', {
                position: { x: 0, y: 0, z: 0 },
                direction: { x: 1, y: 0, z: 0 }
            });
            
            finalIntegration.triggerEvent('zombie_death', {
                position: { x: 0, y: 0, z: 0 },
                direction: { x: 1, y: 0, z: 0 },
                intensity: 1.0
            });
            
            finalIntegration.triggerEvent('camera_shake', {
                intensity: 0.5,
                duration: 0.3
            });
            
            expect(particleCreateSpy).toHaveBeenCalled(); // Hit + death events may trigger multiple effects
            expect(animationShakeSpy).toHaveBeenCalled();
        });

        test('should handle vehicle destruction sequence', () => {
            const explosionSpy = jest.spyOn(finalIntegration.particleSystem, 'createExplosion');
            const sparksSpy = jest.spyOn(finalIntegration.particleSystem, 'createSparks');
            const shakeSpy = jest.spyOn(finalIntegration.animationSystem, 'createShake');
            
            // Simulate vehicle taking damage and exploding
            finalIntegration.triggerEvent('vehicle_damage', {
                position: { x: 0, y: 0, z: 0 },
                direction: { x: 0, y: 1, z: 0 },
                intensity: 1.0
            });
            
            finalIntegration.triggerEvent('vehicle_explosion', {
                position: { x: 0, y: 0, z: 0 },
                intensity: 2.0
            });
            
            // Manually trigger camera shake for explosion
            finalIntegration.triggerEvent('camera_shake', {
                intensity: 1.0,
                duration: 0.5
            });
            
            expect(sparksSpy).toHaveBeenCalled();
            expect(explosionSpy).toHaveBeenCalled();
            expect(shakeSpy).toHaveBeenCalled();
        });

        test('should handle level progression with balance updates', () => {
            const balanceUpdateSpy = jest.spyOn(finalIntegration.gameBalance, 'updatePlayerSkill');
            const saveDataSpy = jest.spyOn(finalIntegration, 'saveBalanceData');
            
            finalIntegration.triggerEvent('level_complete', {
                zombiesKilled: 30,
                timeAlive: 240,
                damageReceived: 20,
                accuracy: 0.85
            });
            
            expect(balanceUpdateSpy).toHaveBeenCalledWith({
                zombiesKilled: 30,
                timeAlive: 240,
                damageReceived: 20,
                accuracy: 0.85,
                levelCompleted: true
            });
            expect(saveDataSpy).toHaveBeenCalled();
        });
    });
});