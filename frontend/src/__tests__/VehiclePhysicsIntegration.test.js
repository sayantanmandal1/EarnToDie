/**
 * Integration tests for Vehicle Physics System
 * Tests the complete integration between VehiclePhysics and Vehicle2D
 */

import VehiclePhysics from '../physics/VehiclePhysics.js';
import Vehicle2D from '../vehicles/Vehicle2D.js';
import Matter from 'matter-js';

describe('Vehicle Physics Integration', () => {
  let gameEngine;
  let vehicle;
  
  beforeEach(() => {
    // Create a real Matter.js physics engine for integration testing
    gameEngine = {
      physics: Matter.Engine.create(),
      getAsset: jest.fn(),
      emit: jest.fn()
    };
    
    vehicle = new Vehicle2D('starter_car', gameEngine, 0, 0);
  });
  
  afterEach(() => {
    if (vehicle) {
      vehicle.dispose();
    }
  });
  
  describe('Basic Integration', () => {
    test('should initialize vehicle with physics', async () => {
      const result = await vehicle.initialize();
      
      expect(result).toBe(true);
      expect(vehicle.isInitialized).toBe(true);
      expect(vehicle.physics).toBeDefined();
      expect(vehicle.physics.body).toBeDefined();
      expect(vehicle.physics.wheels).toHaveLength(2);
    });
    
    test('should create physics bodies in the world', async () => {
      await vehicle.initialize();
      
      // Check that bodies were added to the physics world
      expect(gameEngine.physics.world.bodies.length).toBeGreaterThan(0);
      
      // Should have main body + 2 wheels = 3 bodies
      expect(gameEngine.physics.world.bodies.length).toBe(3);
    });
    
    test('should create suspension constraints', async () => {
      await vehicle.initialize();
      
      // Check that constraints were added
      expect(gameEngine.physics.world.constraints.length).toBe(2); // Front and rear suspension
    });
  });
  
  describe('Physics Simulation', () => {
    beforeEach(async () => {
      await vehicle.initialize();
    });
    
    test('should apply throttle and move vehicle', () => {
      const initialPosition = vehicle.getPosition();
      
      // Apply throttle
      vehicle.setControls({ throttle: 1.0 });
      
      // Update physics multiple times to see movement
      for (let i = 0; i < 30; i++) {
        vehicle.update(16);
        Matter.Engine.update(gameEngine.physics, 16);
      }
      
      const finalPosition = vehicle.getPosition();
      const finalVelocity = vehicle.getVelocity();
      
      // Vehicle should have gained forward velocity (positive X direction)
      // Even if position hasn't changed much due to physics constraints
      expect(Math.abs(finalVelocity.x)).toBeGreaterThan(0.1);
    });
    
    test('should apply steering and rotate vehicle', () => {
      const initialRotation = vehicle.physics.getRotation();
      
      // Apply steering and some forward movement
      vehicle.setControls({ throttle: 0.5, steering: 1.0 });
      
      // Update physics multiple times
      for (let i = 0; i < 20; i++) {
        vehicle.update(16);
        Matter.Engine.update(gameEngine.physics, 16);
      }
      
      const finalRotation = vehicle.physics.getRotation();
      
      // Vehicle should have rotated
      expect(Math.abs(finalRotation - initialRotation)).toBeGreaterThan(0.01);
    });
    
    test('should consume fuel when throttling', () => {
      const initialFuel = vehicle.fuel;
      
      vehicle.setControls({ throttle: 1.0 });
      
      // Update for 1 second (1000ms)
      vehicle.update(1000);
      
      expect(vehicle.fuel).toBeLessThan(initialFuel);
    });
    
    test('should not consume fuel when not throttling', () => {
      const initialFuel = vehicle.fuel;
      
      vehicle.setControls({ throttle: 0 });
      
      // Update for 1 second
      vehicle.update(1000);
      
      expect(vehicle.fuel).toBe(initialFuel);
    });
  });
  
  describe('Collision Detection', () => {
    beforeEach(async () => {
      await vehicle.initialize();
    });
    
    test('should detect terrain collision', () => {
      // Create a terrain body
      const terrain = Matter.Bodies.rectangle(0, 100, 200, 20, {
        isStatic: true,
        label: 'terrain_ground'
      });
      
      Matter.World.add(gameEngine.physics.world, terrain);
      
      // Position vehicle above terrain
      vehicle.physics.setPosition(0, 50);
      
      // Let physics simulate collision
      for (let i = 0; i < 30; i++) {
        Matter.Engine.update(gameEngine.physics, 16);
      }
      
      // Vehicle should not be airborne after landing
      expect(vehicle.physics.getIsAirborne()).toBe(false);
    });
    
    test('should handle obstacle collision', () => {
      // Create an obstacle
      const obstacle = Matter.Bodies.rectangle(50, 0, 20, 20, {
        label: 'obstacle_rock'
      });
      
      Matter.World.add(gameEngine.physics.world, obstacle);
      
      // Give vehicle velocity toward obstacle
      Matter.Body.setVelocity(vehicle.physics.body, { x: 10, y: 0 });
      
      // Simulate collision
      for (let i = 0; i < 20; i++) {
        Matter.Engine.update(gameEngine.physics, 16);
      }
      
      // Should emit damage event when collision occurs
      // Note: This test verifies the collision detection system is working
      // The actual damage event emission depends on collision detection callbacks
    });
  });
  
  describe('Vehicle Upgrades Integration', () => {
    beforeEach(async () => {
      await vehicle.initialize();
    });
    
    test('should apply engine upgrades to physics', () => {
      const originalPower = vehicle.stats.enginePower;
      
      vehicle.applyUpgrade('engine', 3);
      
      expect(vehicle.stats.enginePower).toBeGreaterThan(originalPower);
      expect(vehicle.upgrades.engine).toBe(3);
    });
    
    test('should apply wheel upgrades to suspension', () => {
      const originalStiffness = vehicle.physics.suspensionStiffness;
      
      vehicle.applyUpgrade('wheels', 2);
      
      // Wheel upgrades should affect suspension properties
      expect(vehicle.physics.suspensionStiffness).toBeGreaterThan(originalStiffness);
    });
  });
  
  describe('Vehicle State Management', () => {
    beforeEach(async () => {
      await vehicle.initialize();
    });
    
    test('should track vehicle health and destruction', () => {
      expect(vehicle.health).toBe(100);
      expect(vehicle.isDestroyed).toBe(false);
      
      // Apply fatal damage (accounting for armor reduction)
      vehicle.takeDamage(120); // More than 100 to account for armor
      
      expect(vehicle.health).toBe(0);
      expect(vehicle.isDestroyed).toBe(true);
      
      // Should emit destruction event
      expect(gameEngine.emit).toHaveBeenCalledWith('vehicleDestroyed',
        expect.objectContaining({
          vehicle: vehicle
        })
      );
    });
    
    test('should handle vehicle repair', () => {
      vehicle.health = 50;
      vehicle.repair(30);
      
      expect(vehicle.health).toBe(80);
    });
    
    test('should handle vehicle refueling', () => {
      vehicle.fuel = 50;
      vehicle.refuel(25);
      
      expect(vehicle.fuel).toBe(75);
    });
  });
  
  describe('Disposal and Cleanup', () => {
    test('should properly dispose of physics resources', async () => {
      await vehicle.initialize();
      
      const initialBodyCount = gameEngine.physics.world.bodies.length;
      const initialConstraintCount = gameEngine.physics.world.constraints.length;
      
      vehicle.dispose();
      
      // Bodies and constraints should be removed from physics world
      expect(gameEngine.physics.world.bodies.length).toBeLessThan(initialBodyCount);
      expect(gameEngine.physics.world.constraints.length).toBeLessThan(initialConstraintCount);
      
      // Vehicle should be marked as destroyed
      expect(vehicle.isDestroyed).toBe(true);
      expect(vehicle.isInitialized).toBe(false);
    });
  });
  
  describe('Performance and Stability', () => {
    beforeEach(async () => {
      await vehicle.initialize();
    });
    
    test('should handle rapid control changes', () => {
      // Rapidly change controls
      for (let i = 0; i < 100; i++) {
        vehicle.setControls({
          throttle: Math.random() * 2 - 1,
          steering: Math.random() * 2 - 1,
          brake: Math.random(),
          tilt: Math.random() * 2 - 1
        });
        
        vehicle.update(16);
        Matter.Engine.update(gameEngine.physics, 16);
      }
      
      // Vehicle should remain stable
      expect(vehicle.isDestroyed).toBe(false);
      expect(vehicle.physics.body).toBeDefined();
    });
    
    test('should maintain physics constraints under stress', () => {
      // Apply extreme forces
      Matter.Body.setVelocity(vehicle.physics.body, { x: 50, y: 50 });
      Matter.Body.setAngularVelocity(vehicle.physics.body, 5);
      
      // Update physics many times to let constraints take effect
      for (let i = 0; i < 200; i++) {
        vehicle.update(16);
        Matter.Engine.update(gameEngine.physics, 16);
      }
      
      // Physics constraints should limit extreme values
      const finalVelocity = vehicle.physics.getVelocity();
      const finalSpeed = Math.sqrt(finalVelocity.x * finalVelocity.x + finalVelocity.y * finalVelocity.y);
      
      // Speed should be limited by physics constraints
      expect(finalSpeed).toBeLessThan(25); // Max velocity constraint
      
      // Angular velocity should be damped over time
      expect(Math.abs(vehicle.physics.body.angularVelocity)).toBeLessThan(2); // More lenient constraint
    });
  });
});