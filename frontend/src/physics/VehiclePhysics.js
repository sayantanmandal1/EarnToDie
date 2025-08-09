/**
 * 2D Vehicle Physics System using Matter.js
 * Handles vehicle physics body, suspension, and collision detection
 */

import Matter from 'matter-js';

class VehiclePhysics {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.physics = gameEngine.physics;
    
    // Vehicle physics properties
    this.body = null;
    this.wheels = [];
    this.constraints = [];
    this.suspension = [];
    
    // Physics configuration
    this.wheelRadius = 25;
    this.wheelWidth = 15;
    this.suspensionStiffness = 0.8;
    this.suspensionDamping = 0.3;
    this.suspensionLength = 40;
    
    // Vehicle state
    this.isAirborne = false;
    this.groundContacts = 0;
    this.lastGroundContact = 0;
    
    // Control inputs
    this.throttle = 0;
    this.steering = 0;
    this.brake = 0;
    this.tilt = 0; // For mid-air maneuvering
  }
  
  /**
   * Create vehicle physics body with realistic properties
   */
  createVehicleBody(x, y, width, height, mass = 1000) {
    // Create main vehicle body
    this.body = Matter.Bodies.rectangle(x, y, width, height, {
      mass: mass,
      frictionAir: 0.02,
      friction: 0.8,
      restitution: 0.3,
      density: 0.001,
      label: 'vehicle_body',
      render: {
        fillStyle: '#8b4513',
        strokeStyle: '#654321',
        lineWidth: 2
      }
    });
    
    // Create wheels
    this.createWheels(width, height);
    
    // Create suspension system
    this.createSuspension();
    
    // Add collision detection
    this.setupCollisionDetection();
    
    // Add all bodies to physics world
    Matter.World.add(this.physics.world, [this.body, ...this.wheels]);
    
    // Add constraints individually
    this.constraints.forEach(constraint => {
      Matter.World.add(this.physics.world, constraint);
    });
    
    console.log('Vehicle physics body created');
    return this.body;
  }
  
  /**
   * Create wheel bodies with proper physics properties
   */
  createWheels(vehicleWidth, vehicleHeight) {
    const wheelOffset = vehicleWidth * 0.35;
    const wheelY = vehicleHeight * 0.4;
    
    // Front wheel
    const frontWheel = Matter.Bodies.circle(
      this.body.position.x + wheelOffset,
      this.body.position.y + wheelY,
      this.wheelRadius,
      {
        mass: 50,
        friction: 1.2,
        frictionAir: 0.01,
        restitution: 0.1,
        density: 0.002,
        label: 'wheel_front',
        render: {
          fillStyle: '#333333',
          strokeStyle: '#222222',
          lineWidth: 2
        }
      }
    );
    
    // Rear wheel
    const rearWheel = Matter.Bodies.circle(
      this.body.position.x - wheelOffset,
      this.body.position.y + wheelY,
      this.wheelRadius,
      {
        mass: 50,
        friction: 1.2,
        frictionAir: 0.01,
        restitution: 0.1,
        density: 0.002,
        label: 'wheel_rear',
        render: {
          fillStyle: '#333333',
          strokeStyle: '#222222',
          lineWidth: 2
        }
      }
    );
    
    this.wheels = [frontWheel, rearWheel];
  }
  
  /**
   * Create suspension system with realistic bounce and damping
   */
  createSuspension() {
    const vehicleWidth = this.body.bounds.max.x - this.body.bounds.min.x;
    const wheelOffset = vehicleWidth * 0.35;
    
    // Front suspension
    const frontSuspension = Matter.Constraint.create({
      bodyA: this.body,
      bodyB: this.wheels[0],
      pointA: { x: wheelOffset, y: 20 },
      pointB: { x: 0, y: 0 },
      stiffness: this.suspensionStiffness,
      damping: this.suspensionDamping,
      length: this.suspensionLength,
      render: {
        visible: false
      }
    });
    
    // Rear suspension
    const rearSuspension = Matter.Constraint.create({
      bodyA: this.body,
      bodyB: this.wheels[1],
      pointA: { x: -wheelOffset, y: 20 },
      pointB: { x: 0, y: 0 },
      stiffness: this.suspensionStiffness,
      damping: this.suspensionDamping,
      length: this.suspensionLength,
      render: {
        visible: false
      }
    });
    
    this.suspension = [frontSuspension, rearSuspension];
    this.constraints = [...this.suspension];
  }
  
  /**
   * Setup collision detection for terrain and obstacles
   */
  setupCollisionDetection() {
    // Track ground contact for airborne detection
    Matter.Events.on(this.physics, 'collisionStart', (event) => {
      event.pairs.forEach(pair => {
        const { bodyA, bodyB } = pair;
        
        // Check if vehicle or wheels are involved in collision
        if (this.isVehicleBody(bodyA) || this.isVehicleBody(bodyB)) {
          this.handleCollision(bodyA, bodyB, 'start');
        }
      });
    });
    
    Matter.Events.on(this.physics, 'collisionEnd', (event) => {
      event.pairs.forEach(pair => {
        const { bodyA, bodyB } = pair;
        
        if (this.isVehicleBody(bodyA) || this.isVehicleBody(bodyB)) {
          this.handleCollision(bodyA, bodyB, 'end');
        }
      });
    });
  }
  
  /**
   * Check if a body belongs to this vehicle
   */
  isVehicleBody(body) {
    return body === this.body || this.wheels.includes(body);
  }
  
  /**
   * Handle collision events
   */
  handleCollision(bodyA, bodyB, phase) {
    const otherBody = this.isVehicleBody(bodyA) ? bodyB : bodyA;
    const vehicleBody = this.isVehicleBody(bodyA) ? bodyA : bodyB;
    
    if (phase === 'start') {
      // Check if collision is with ground/terrain
      if (otherBody.label && otherBody.label.includes('terrain')) {
        this.groundContacts++;
        this.lastGroundContact = Date.now();
        this.isAirborne = false;
      }
      
      // Handle obstacle collisions
      if (otherBody.label && otherBody.label.includes('obstacle')) {
        this.handleObstacleCollision(vehicleBody, otherBody);
      }
      
      // Handle zombie collisions
      if (otherBody.label && otherBody.label.includes('zombie')) {
        this.handleZombieCollision(vehicleBody, otherBody);
      }
    } else if (phase === 'end') {
      if (otherBody.label && otherBody.label.includes('terrain')) {
        this.groundContacts = Math.max(0, this.groundContacts - 1);
        
        // Check if vehicle is now airborne
        if (this.groundContacts === 0) {
          setTimeout(() => {
            if (Date.now() - this.lastGroundContact > 100) {
              this.isAirborne = true;
            }
          }, 100);
        }
      }
    }
  }
  
  /**
   * Handle collision with obstacles
   */
  handleObstacleCollision(vehicleBody, obstacle) {
    // Calculate collision force
    const velocity = vehicleBody.velocity;
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    
    // Apply damage based on collision speed
    const damage = Math.max(0, (speed - 5) * 2); // Damage threshold at 5 units/s
    
    if (damage > 0) {
      this.gameEngine.emit('vehicleDamage', {
        amount: damage,
        type: 'collision',
        source: obstacle
      });
    }
    
    // Create impact particles
    this.createImpactEffect(vehicleBody.position, obstacle.position);
  }
  
  /**
   * Handle collision with zombies
   */
  handleZombieCollision(vehicleBody, zombie) {
    const velocity = vehicleBody.velocity;
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    
    // Zombies slow down the vehicle unless destroyed by weapons
    if (speed > 3) {
      // High speed collision - zombie takes damage
      this.gameEngine.emit('zombieHit', {
        zombie: zombie,
        damage: speed * 10,
        vehicle: this
      });
    } else {
      // Low speed - zombie slows vehicle
      Matter.Body.setVelocity(vehicleBody, {
        x: velocity.x * 0.5,
        y: velocity.y * 0.5
      });
    }
  }
  
  /**
   * Create visual impact effect
   */
  createImpactEffect(vehiclePos, obstaclePos) {
    // Emit event for particle system to handle
    this.gameEngine.emit('impactEffect', {
      position: vehiclePos,
      direction: {
        x: vehiclePos.x - obstaclePos.x,
        y: vehiclePos.y - obstaclePos.y
      }
    });
  }
  
  /**
   * Update vehicle physics based on controls
   */
  update(deltaTime, controls) {
    if (!this.body) return;
    
    // Store control inputs
    this.throttle = controls.throttle || 0;
    this.steering = controls.steering || 0;
    this.brake = controls.brake || 0;
    this.tilt = controls.tilt || 0;
    
    // Apply engine force
    this.applyEngineForce();
    
    // Apply steering
    this.applySteering();
    
    // Apply braking
    this.applyBraking();
    
    // Handle mid-air tilting
    if (this.isAirborne) {
      this.applyAirTilting();
    }
    
    // Update suspension
    this.updateSuspension();
    
    // Apply realistic physics constraints
    this.applyPhysicsConstraints();
  }
  
  /**
   * Apply engine force to wheels
   */
  applyEngineForce() {
    if (this.throttle === 0) return;
    
    const enginePower = 0.01; // Base engine power
    const force = this.throttle * enginePower;
    
    // Apply force to rear wheel (rear-wheel drive)
    const rearWheel = this.wheels[1];
    const forceVector = {
      x: Math.abs(force), // Ensure forward direction (positive X)
      y: 0
    };
    
    Matter.Body.applyForce(rearWheel, rearWheel.position, forceVector);
    
    // Apply smaller force to front wheel for all-wheel drive feel
    const frontWheel = this.wheels[0];
    const frontForce = {
      x: Math.abs(force) * 0.3,
      y: 0
    };
    
    Matter.Body.applyForce(frontWheel, frontWheel.position, frontForce);
  }
  
  /**
   * Apply steering forces
   */
  applySteering() {
    if (this.steering === 0 || this.isAirborne) return;
    
    const steeringForce = 0.005;
    const torque = this.steering * steeringForce;
    
    // Apply torque to main body
    Matter.Body.setAngularVelocity(this.body, this.body.angularVelocity + torque);
    
    // Apply lateral force to front wheel for realistic steering
    const frontWheel = this.wheels[0];
    const lateralForce = {
      x: -Math.sin(this.body.angle) * this.steering * 0.002,
      y: Math.cos(this.body.angle) * this.steering * 0.002
    };
    
    Matter.Body.applyForce(frontWheel, frontWheel.position, lateralForce);
  }
  
  /**
   * Apply braking forces
   */
  applyBraking() {
    if (this.brake === 0) return;
    
    const brakingForce = 0.95; // Friction coefficient for braking
    
    // Apply braking to both wheels
    this.wheels.forEach(wheel => {
      Matter.Body.setVelocity(wheel, {
        x: wheel.velocity.x * (1 - this.brake * (1 - brakingForce)),
        y: wheel.velocity.y * (1 - this.brake * (1 - brakingForce))
      });
    });
    
    // Apply braking to main body
    Matter.Body.setVelocity(this.body, {
      x: this.body.velocity.x * (1 - this.brake * (1 - brakingForce)),
      y: this.body.velocity.y * (1 - this.brake * (1 - brakingForce))
    });
  }
  
  /**
   * Apply mid-air tilting for maneuvering
   */
  applyAirTilting() {
    if (this.tilt === 0) return;
    
    const tiltForce = 0.003;
    const torque = this.tilt * tiltForce;
    
    // Apply rotational force for mid-air control
    Matter.Body.setAngularVelocity(this.body, this.body.angularVelocity + torque);
  }
  
  /**
   * Update suspension system for realistic bounce
   */
  updateSuspension() {
    this.suspension.forEach((constraint, index) => {
      const wheel = this.wheels[index];
      const currentLength = Matter.Vector.magnitude(
        Matter.Vector.sub(constraint.bodyA.position, constraint.bodyB.position)
      );
      
      // Adjust suspension based on compression
      const compression = Math.max(0, this.suspensionLength - currentLength);
      const compressionRatio = compression / this.suspensionLength;
      
      // Apply additional spring force for realistic suspension
      if (compressionRatio > 0.1) {
        const springForce = compressionRatio * 0.001;
        const direction = Matter.Vector.normalise(
          Matter.Vector.sub(constraint.bodyA.position, constraint.bodyB.position)
        );
        
        Matter.Body.applyForce(wheel, wheel.position, {
          x: direction.x * springForce,
          y: direction.y * springForce
        });
      }
    });
  }
  
  /**
   * Apply realistic physics constraints
   */
  applyPhysicsConstraints() {
    // Limit maximum velocity to prevent unrealistic speeds
    const maxVelocity = 20;
    const velocity = this.body.velocity;
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    
    if (speed > maxVelocity) {
      const scale = maxVelocity / speed;
      Matter.Body.setVelocity(this.body, {
        x: velocity.x * scale,
        y: velocity.y * scale
      });
    }
    
    // Limit angular velocity to prevent excessive spinning
    const maxAngularVelocity = 0.3;
    if (Math.abs(this.body.angularVelocity) > maxAngularVelocity) {
      const sign = this.body.angularVelocity > 0 ? 1 : -1;
      Matter.Body.setAngularVelocity(this.body, maxAngularVelocity * sign);
    }
    
    // Apply angular damping
    Matter.Body.setAngularVelocity(this.body, this.body.angularVelocity * 0.98);
    
    // Apply air resistance
    const airResistance = 0.99;
    Matter.Body.setVelocity(this.body, {
      x: this.body.velocity.x * airResistance,
      y: this.body.velocity.y * airResistance
    });
  }
  
  /**
   * Get vehicle position
   */
  getPosition() {
    return this.body ? { ...this.body.position } : { x: 0, y: 0 };
  }
  
  /**
   * Get vehicle velocity
   */
  getVelocity() {
    return this.body ? { ...this.body.velocity } : { x: 0, y: 0 };
  }
  
  /**
   * Get vehicle rotation
   */
  getRotation() {
    return this.body ? this.body.angle : 0;
  }
  
  /**
   * Get vehicle speed
   */
  getSpeed() {
    if (!this.body) return 0;
    const velocity = this.body.velocity;
    return Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
  }
  
  /**
   * Check if vehicle is airborne
   */
  getIsAirborne() {
    return this.isAirborne;
  }
  
  /**
   * Set vehicle position
   */
  setPosition(x, y) {
    if (this.body) {
      Matter.Body.setPosition(this.body, { x, y });
      
      // Update wheel positions relative to body
      const vehicleWidth = this.body.bounds.max.x - this.body.bounds.min.x;
      const wheelOffset = vehicleWidth * 0.35;
      const wheelY = 20;
      
      Matter.Body.setPosition(this.wheels[0], { x: x + wheelOffset, y: y + wheelY });
      Matter.Body.setPosition(this.wheels[1], { x: x - wheelOffset, y: y + wheelY });
    }
  }
  
  /**
   * Dispose of physics bodies and constraints
   */
  dispose() {
    if (this.physics && this.physics.world) {
      try {
        // Remove constraints
        this.constraints.forEach(constraint => {
          if (constraint && this.physics.world.constraints.includes(constraint)) {
            Matter.World.remove(this.physics.world, constraint);
          }
        });
        
        // Remove bodies
        if (this.body && this.physics.world.bodies.includes(this.body)) {
          Matter.World.remove(this.physics.world, this.body);
        }
        
        this.wheels.forEach(wheel => {
          if (wheel && this.physics.world.bodies.includes(wheel)) {
            Matter.World.remove(this.physics.world, wheel);
          }
        });
      } catch (error) {
        console.warn('Error disposing vehicle physics:', error);
      }
    }
    
    // Clear references
    this.body = null;
    this.wheels = [];
    this.constraints = [];
    this.suspension = [];
    
    console.log('Vehicle physics disposed');
  }
}

export default VehiclePhysics;