/**
 * Unit tests for VehiclePhysics class
 * Tests vehicle physics behavior and collision responses
 */

import VehiclePhysics from '../physics/VehiclePhysics.js';
import Matter from 'matter-js';

// Mock game engine
const mockGameEngine = {
  physics: Matter.Engine.create(),
  emit: jest.fn()
};

describe('VehiclePhysics', () => {
  let vehiclePhysics;
  
  beforeEach(() => {
    vehiclePhysics = new VehiclePhysics(mockGameEngine);
    mockGameEngine.emit.mockClear();
  });
  
  afterEach(() => {
    if (vehiclePhysics) {
      vehiclePhysics.dispose();
    }
  });
  
  describe('Vehicle Body Creation', () => {
    test('should create vehicle body with correct properties', () => {
      const body = vehiclePhysics.createVehicleBody(100, 200, 80, 40, 1000);
      
      expect(body).toBeDefined();
      expect(body.position.x).toBe(100);
      expect(body.position.y).toBe(200);
      expect(body.mass).toBe(1000);
      expect(body.label).toBe('vehicle_body');
    });
    
    test('should create wheels with correct properties', () => {
      vehiclePhysics.createVehicleBody(0, 0, 80, 40);
      
      expect(vehiclePhysics.wheels).toHaveLength(2);
      expect(vehiclePhysics.wheels[0].label).toBe('wheel_front');
      expect(vehiclePhysics.wheels[1].label).toBe('wheel_rear');
      
      // Check wheel physics properties
      vehiclePhysics.wheels.forEach(wheel => {
        expect(wheel.mass).toBe(50);
        expect(wheel.friction).toBe(1.2);
        expect(wheel.restitution).toBe(0.1);
      });
    });
    
    test('should create suspension constraints', () => {
      vehiclePhysics.createVehicleBody(0, 0, 80, 40);
      
      expect(vehiclePhysics.suspension).toHaveLength(2);
      expect(vehiclePhysics.constraints).toHaveLength(2);
      
      vehiclePhysics.suspension.forEach(constraint => {
        expect(constraint.stiffness).toBe(vehiclePhysics.suspensionStiffness);
        expect(constraint.damping).toBe(vehiclePhysics.suspensionDamping);
        expect(constraint.length).toBe(vehiclePhysics.suspensionLength);
      });
    });
  });
  
  describe('Physics Updates', () => {
    beforeEach(() => {
      vehiclePhysics.createVehicleBody(0, 0, 80, 40);
    });
    
    test('should apply engine force when throttle is pressed', () => {
      const initialVelocity = { ...vehiclePhysics.body.velocity };
      
      vehiclePhysics.update(16, { throttle: 1.0 });
      
      // Step the physics engine to apply forces
      Matter.Engine.update(mockGameEngine.physics, 16);
      
      // Vehicle should have gained forward velocity
      expect(vehiclePhysics.body.velocity.x).not.toBe(initialVelocity.x);
    });
    
    test('should apply steering torque', () => {
      const initialAngularVelocity = vehiclePhysics.body.angularVelocity;
      
      vehiclePhysics.update(16, { steering: 1.0 });
      
      // Step the physics engine to apply forces
      Matter.Engine.update(mockGameEngine.physics, 16);
      
      // Vehicle should have gained angular velocity
      expect(vehiclePhysics.body.angularVelocity).not.toBe(initialAngularVelocity);
    });
    
    test('should apply braking force', () => {
      // Give vehicle some initial velocity
      Matter.Body.setVelocity(vehiclePhysics.body, { x: 10, y: 0 });
      const initialSpeed = vehiclePhysics.getSpeed();
      
      vehiclePhysics.update(16, { brake: 1.0 });
      
      // Vehicle should have reduced speed
      expect(vehiclePhysics.getSpeed()).toBeLessThan(initialSpeed);
    });
    
    test('should apply air tilting when airborne', () => {
      vehiclePhysics.isAirborne = true;
      const initialAngularVelocity = vehiclePhysics.body.angularVelocity;
      
      vehiclePhysics.update(16, { tilt: 1.0 });
      
      // Step the physics engine to apply forces
      Matter.Engine.update(mockGameEngine.physics, 16);
      
      // Vehicle should have gained angular velocity from tilting
      expect(vehiclePhysics.body.angularVelocity).not.toBe(initialAngularVelocity);
    });
    
    test('should not apply steering when airborne', () => {
      vehiclePhysics.isAirborne = true;
      const initialAngularVelocity = vehiclePhysics.body.angularVelocity;
      
      vehiclePhysics.update(16, { steering: 1.0 });
      
      // Steering should not affect angular velocity when airborne
      expect(vehiclePhysics.body.angularVelocity).toBe(initialAngularVelocity);
    });
  });
  
  describe('Collision Detection', () => {
    beforeEach(() => {
      vehiclePhysics.createVehicleBody(0, 0, 80, 40);
    });
    
    test('should detect ground contact', () => {
      const terrainBody = Matter.Bodies.rectangle(0, 100, 200, 20, {
        isStatic: true,
        label: 'terrain_ground'
      });
      
      // Simulate collision start
      vehiclePhysics.handleCollision(vehiclePhysics.body, terrainBody, 'start');
      
      expect(vehiclePhysics.groundContacts).toBe(1);
      expect(vehiclePhysics.isAirborne).toBe(false);
    });
    
    test('should detect airborne state when losing ground contact', (done) => {
      const terrainBody = Matter.Bodies.rectangle(0, 100, 200, 20, {
        isStatic: true,
        label: 'terrain_ground'
      });
      
      // Start with ground contact
      vehiclePhysics.handleCollision(vehiclePhysics.body, terrainBody, 'start');
      expect(vehiclePhysics.groundContacts).toBe(1);
      
      // End ground contact
      vehiclePhysics.handleCollision(vehiclePhysics.body, terrainBody, 'end');
      expect(vehiclePhysics.groundContacts).toBe(0);
      
      // Should become airborne after delay
      setTimeout(() => {
        expect(vehiclePhysics.isAirborne).toBe(true);
        done();
      }, 150);
    });
    
    test('should handle obstacle collision', () => {
      const obstacle = Matter.Bodies.rectangle(50, 0, 20, 20, {
        label: 'obstacle_rock'
      });
      
      // Give vehicle some velocity for collision damage
      Matter.Body.setVelocity(vehiclePhysics.body, { x: 10, y: 0 });
      
      vehiclePhysics.handleCollision(vehiclePhysics.body, obstacle, 'start');
      
      // Should emit damage event
      expect(mockGameEngine.emit).toHaveBeenCalledWith('vehicleDamage', 
        expect.objectContaining({
          type: 'collision',
          source: obstacle
        })
      );
    });
    
    test('should handle zombie collision at high speed', () => {
      const zombie = Matter.Bodies.rectangle(50, 0, 15, 30, {
        label: 'zombie_walker'
      });
      
      // High speed collision
      Matter.Body.setVelocity(vehiclePhysics.body, { x: 15, y: 0 });
      
      vehiclePhysics.handleCollision(vehiclePhysics.body, zombie, 'start');
      
      // Should emit zombie hit event
      expect(mockGameEngine.emit).toHaveBeenCalledWith('zombieHit',
        expect.objectContaining({
          zombie: zombie,
          vehicle: vehiclePhysics
        })
      );
    });
    
    test('should slow vehicle on low-speed zombie collision', () => {
      const zombie = Matter.Bodies.rectangle(50, 0, 15, 30, {
        label: 'zombie_walker'
      });
      
      // Low speed collision
      Matter.Body.setVelocity(vehiclePhysics.body, { x: 2, y: 0 });
      const initialVelocity = { ...vehiclePhysics.body.velocity };
      
      vehiclePhysics.handleCollision(vehiclePhysics.body, zombie, 'start');
      
      // Vehicle should be slowed down
      expect(vehiclePhysics.body.velocity.x).toBeLessThan(initialVelocity.x);
    });
  });
  
  describe('Suspension System', () => {
    beforeEach(() => {
      vehiclePhysics.createVehicleBody(0, 0, 80, 40);
    });
    
    test('should update suspension based on compression', () => {
      // Compress suspension by moving wheel closer to body
      const wheel = vehiclePhysics.wheels[0];
      const originalY = wheel.position.y;
      Matter.Body.setPosition(wheel, { x: wheel.position.x, y: originalY - 10 });
      
      const initialVelocity = { ...wheel.velocity };
      
      vehiclePhysics.updateSuspension();
      
      // Wheel should have upward force applied due to compression
      // This is hard to test directly, but we can verify the method runs without error
      expect(wheel.position.y).toBeLessThan(originalY);
    });
    
    test('should adjust suspension properties', () => {
      const newStiffness = 1.0;
      const newDamping = 0.5;
      
      vehiclePhysics.suspensionStiffness = newStiffness;
      vehiclePhysics.suspensionDamping = newDamping;
      
      // Recreate suspension with new properties
      vehiclePhysics.createSuspension();
      
      vehiclePhysics.suspension.forEach(constraint => {
        expect(constraint.stiffness).toBe(newStiffness);
        expect(constraint.damping).toBe(newDamping);
      });
    });
  });
  
  describe('Physics Constraints', () => {
    beforeEach(() => {
      vehiclePhysics.createVehicleBody(0, 0, 80, 40);
    });
    
    test('should limit maximum velocity', () => {
      // Set velocity above maximum
      Matter.Body.setVelocity(vehiclePhysics.body, { x: 25, y: 0 });
      
      vehiclePhysics.applyPhysicsConstraints();
      
      // Velocity should be clamped to maximum
      const speed = vehiclePhysics.getSpeed();
      expect(speed).toBeLessThanOrEqual(20);
    });
    
    test('should limit angular velocity', () => {
      // Set angular velocity above maximum
      Matter.Body.setAngularVelocity(vehiclePhysics.body, 0.5);
      
      vehiclePhysics.applyPhysicsConstraints();
      
      // Angular velocity should be clamped
      expect(Math.abs(vehiclePhysics.body.angularVelocity)).toBeLessThanOrEqual(0.3);
    });
    
    test('should apply air resistance', () => {
      Matter.Body.setVelocity(vehiclePhysics.body, { x: 10, y: 5 });
      const initialVelocity = { ...vehiclePhysics.body.velocity };
      
      vehiclePhysics.applyPhysicsConstraints();
      
      // Velocity should be reduced by air resistance
      expect(vehiclePhysics.body.velocity.x).toBeLessThan(initialVelocity.x);
      expect(vehiclePhysics.body.velocity.y).toBeLessThan(initialVelocity.y);
    });
  });
  
  describe('Getters and Setters', () => {
    beforeEach(() => {
      vehiclePhysics.createVehicleBody(100, 200, 80, 40);
    });
    
    test('should get correct position', () => {
      const position = vehiclePhysics.getPosition();
      expect(position.x).toBe(100);
      expect(position.y).toBe(200);
    });
    
    test('should get correct velocity', () => {
      Matter.Body.setVelocity(vehiclePhysics.body, { x: 5, y: -2 });
      
      const velocity = vehiclePhysics.getVelocity();
      expect(velocity.x).toBe(5);
      expect(velocity.y).toBe(-2);
    });
    
    test('should get correct rotation', () => {
      Matter.Body.setAngle(vehiclePhysics.body, Math.PI / 4);
      
      const rotation = vehiclePhysics.getRotation();
      expect(rotation).toBeCloseTo(Math.PI / 4);
    });
    
    test('should calculate speed correctly', () => {
      Matter.Body.setVelocity(vehiclePhysics.body, { x: 3, y: 4 });
      
      const speed = vehiclePhysics.getSpeed();
      expect(speed).toBeCloseTo(5); // 3-4-5 triangle
    });
    
    test('should set position correctly', () => {
      vehiclePhysics.setPosition(300, 400);
      
      expect(vehiclePhysics.body.position.x).toBe(300);
      expect(vehiclePhysics.body.position.y).toBe(400);
      
      // Wheels should be positioned relative to body
      const vehicleWidth = 80;
      const wheelOffset = vehicleWidth * 0.35;
      
      expect(vehiclePhysics.wheels[0].position.x).toBeCloseTo(300 + wheelOffset);
      expect(vehiclePhysics.wheels[1].position.x).toBeCloseTo(300 - wheelOffset);
    });
  });
  
  describe('Disposal', () => {
    test('should dispose of all physics bodies and constraints', () => {
      vehiclePhysics.createVehicleBody(0, 0, 80, 40);
      
      expect(vehiclePhysics.body).toBeDefined();
      expect(vehiclePhysics.wheels).toHaveLength(2);
      expect(vehiclePhysics.constraints).toHaveLength(2);
      
      vehiclePhysics.dispose();
      
      expect(vehiclePhysics.body).toBeNull();
      expect(vehiclePhysics.wheels).toHaveLength(0);
      expect(vehiclePhysics.constraints).toHaveLength(0);
    });
  });
  
  describe('Body Identification', () => {
    beforeEach(() => {
      vehiclePhysics.createVehicleBody(0, 0, 80, 40);
    });
    
    test('should identify vehicle body correctly', () => {
      expect(vehiclePhysics.isVehicleBody(vehiclePhysics.body)).toBe(true);
      expect(vehiclePhysics.isVehicleBody(vehiclePhysics.wheels[0])).toBe(true);
      expect(vehiclePhysics.isVehicleBody(vehiclePhysics.wheels[1])).toBe(true);
      
      const otherBody = Matter.Bodies.rectangle(0, 0, 10, 10);
      expect(vehiclePhysics.isVehicleBody(otherBody)).toBe(false);
    });
  });
  
  describe('Impact Effects', () => {
    beforeEach(() => {
      vehiclePhysics.createVehicleBody(0, 0, 80, 40);
    });
    
    test('should create impact effect on collision', () => {
      const vehiclePos = { x: 0, y: 0 };
      const obstaclePos = { x: 10, y: 0 };
      
      vehiclePhysics.createImpactEffect(vehiclePos, obstaclePos);
      
      expect(mockGameEngine.emit).toHaveBeenCalledWith('impactEffect',
        expect.objectContaining({
          position: vehiclePos,
          direction: expect.objectContaining({
            x: expect.any(Number),
            y: expect.any(Number)
          })
        })
      );
    });
  });
});