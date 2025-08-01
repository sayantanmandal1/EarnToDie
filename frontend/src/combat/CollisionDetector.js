import * as CANNON from 'cannon-es';

/**
 * CollisionDetector handles collision detection between vehicles and zombies
 * using Cannon.js physics engine
 */
export class CollisionDetector {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.physics = gameEngine.physics;
        
        // Collision event listeners
        this.collisionCallbacks = new Map();
        
        // Collision groups for filtering
        this.COLLISION_GROUPS = {
            VEHICLE: 1,
            ZOMBIE: 2,
            TERRAIN: 4,
            PROJECTILE: 8
        };
        
        // Track active collisions to prevent duplicate events
        this.activeCollisions = new Set();
        
        this._setupCollisionDetection();
    }

    /**
     * Initialize collision detection system
     */
    _setupCollisionDetection() {
        // Listen for collision events from physics world
        this.physics.addEventListener('beginContact', (event) => {
            this._handleCollisionBegin(event);
        });
        
        this.physics.addEventListener('endContact', (event) => {
            this._handleCollisionEnd(event);
        });
        
        console.log('CollisionDetector initialized');
    }

    /**
     * Register a collision callback for specific object types
     */
    registerCollisionCallback(objectTypeA, objectTypeB, callback) {
        const key = this._getCollisionKey(objectTypeA, objectTypeB);
        if (!this.collisionCallbacks.has(key)) {
            this.collisionCallbacks.set(key, []);
        }
        this.collisionCallbacks.get(key).push(callback);
    }

    /**
     * Unregister collision callback
     */
    unregisterCollisionCallback(objectTypeA, objectTypeB, callback) {
        const key = this._getCollisionKey(objectTypeA, objectTypeB);
        if (this.collisionCallbacks.has(key)) {
            const callbacks = this.collisionCallbacks.get(key);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Setup collision groups for a physics body
     */
    setupCollisionGroups(body, group, mask = null) {
        body.collisionFilterGroup = group;
        body.collisionFilterMask = mask || (
            this.COLLISION_GROUPS.VEHICLE | 
            this.COLLISION_GROUPS.ZOMBIE | 
            this.COLLISION_GROUPS.TERRAIN
        );
    }

    /**
     * Check if two objects are currently colliding
     */
    areColliding(bodyA, bodyB) {
        const key = this._getBodyCollisionKey(bodyA, bodyB);
        return this.activeCollisions.has(key);
    }

    /**
     * Get collision normal vector between two bodies
     */
    getCollisionNormal(bodyA, bodyB) {
        // Calculate collision normal from positions
        const direction = bodyA.position.clone();
        direction.vsub(bodyB.position, direction);
        direction.normalize();
        return direction;
    }

    /**
     * Calculate collision impact force
     */
    calculateImpactForce(bodyA, bodyB) {
        const relativeVelocity = bodyA.velocity.clone();
        relativeVelocity.vsub(bodyB.velocity, relativeVelocity);
        
        const normal = this.getCollisionNormal(bodyA, bodyB);
        const impactSpeed = Math.abs(relativeVelocity.dot(normal));
        
        // Calculate impact force based on masses and speed
        const reducedMass = (bodyA.mass * bodyB.mass) / (bodyA.mass + bodyB.mass);
        const impactForce = reducedMass * impactSpeed;
        
        return {
            force: impactForce,
            speed: impactSpeed,
            normal: normal,
            relativeVelocity: relativeVelocity
        };
    }

    /**
     * Perform raycast collision detection
     */
    raycast(from, to, options = {}) {
        const raycastResult = new CANNON.RaycastResult();
        const ray = new CANNON.Ray(from, to);
        
        const hasHit = this.physics.raycastClosest(
            from, 
            to, 
            options, 
            raycastResult
        );
        
        if (hasHit) {
            return {
                hasHit: true,
                body: raycastResult.body,
                point: raycastResult.hitPointWorld,
                normal: raycastResult.hitNormalWorld,
                distance: raycastResult.distance
            };
        }
        
        return { hasHit: false };
    }

    /**
     * Perform sphere collision detection
     */
    sphereCollisionTest(center, radius, filterGroup = null) {
        const collisions = [];
        const testSphere = new CANNON.Sphere(radius);
        const testBody = new CANNON.Body({ mass: 0, shape: testSphere });
        testBody.position.copy(center);
        
        // Check against all bodies in physics world
        for (const body of this.physics.bodies) {
            if (body === testBody) continue;
            
            // Apply filter if specified
            if (filterGroup && !(body.collisionFilterGroup & filterGroup)) {
                continue;
            }
            
            // Check for collision
            const distance = testBody.position.distanceTo(body.position);
            const combinedRadius = radius + this._getBodyRadius(body);
            
            if (distance <= combinedRadius) {
                collisions.push({
                    body: body,
                    distance: distance,
                    penetration: combinedRadius - distance
                });
            }
        }
        
        return collisions;
    }

    /**
     * Handle collision begin event
     */
    _handleCollisionBegin(event) {
        const { bodyA, bodyB, contact } = event;
        
        // Create collision key to track active collisions
        const collisionKey = this._getBodyCollisionKey(bodyA, bodyB);
        this.activeCollisions.add(collisionKey);
        
        // Determine object types
        const typeA = this._getBodyType(bodyA);
        const typeB = this._getBodyType(bodyB);
        
        if (!typeA || !typeB) return;
        
        // Create collision data
        const collisionData = {
            bodyA,
            bodyB,
            contact,
            typeA,
            typeB,
            impact: this.calculateImpactForce(bodyA, bodyB),
            timestamp: Date.now()
        };
        
        // Call registered callbacks
        this._triggerCollisionCallbacks(typeA, typeB, collisionData);
    }

    /**
     * Handle collision end event
     */
    _handleCollisionEnd(event) {
        const { bodyA, bodyB } = event;
        
        // Remove from active collisions
        const collisionKey = this._getBodyCollisionKey(bodyA, bodyB);
        this.activeCollisions.delete(collisionKey);
    }

    /**
     * Trigger collision callbacks
     */
    _triggerCollisionCallbacks(typeA, typeB, collisionData) {
        const key = this._getCollisionKey(typeA, typeB);
        const reverseKey = this._getCollisionKey(typeB, typeA);
        
        // Call callbacks for both directions
        [key, reverseKey].forEach(callbackKey => {
            if (this.collisionCallbacks.has(callbackKey)) {
                this.collisionCallbacks.get(callbackKey).forEach(callback => {
                    try {
                        callback(collisionData);
                    } catch (error) {
                        console.error('Error in collision callback:', error);
                    }
                });
            }
        });
    }

    /**
     * Get collision key for object types
     */
    _getCollisionKey(typeA, typeB) {
        return `${typeA}-${typeB}`;
    }

    /**
     * Get collision key for physics bodies
     */
    _getBodyCollisionKey(bodyA, bodyB) {
        const idA = bodyA.id || bodyA.uuid || 'unknown';
        const idB = bodyB.id || bodyB.uuid || 'unknown';
        return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
    }

    /**
     * Get body type from physics body
     */
    _getBodyType(body) {
        // Check for custom type property
        if (body.userData && body.userData.type) {
            return body.userData.type;
        }
        
        // Infer type from collision group
        if (body.collisionFilterGroup === this.COLLISION_GROUPS.VEHICLE) {
            return 'vehicle';
        } else if (body.collisionFilterGroup === this.COLLISION_GROUPS.ZOMBIE) {
            return 'zombie';
        } else if (body.collisionFilterGroup === this.COLLISION_GROUPS.TERRAIN) {
            return 'terrain';
        } else if (body.collisionFilterGroup === this.COLLISION_GROUPS.PROJECTILE) {
            return 'projectile';
        }
        
        return null;
    }

    /**
     * Get approximate radius of a physics body
     */
    _getBodyRadius(body) {
        if (!body.shapes || body.shapes.length === 0) return 1;
        
        const shape = body.shapes[0];
        
        if (shape instanceof CANNON.Sphere) {
            return shape.radius;
        } else if (shape instanceof CANNON.Box) {
            // Use largest dimension as radius
            return Math.max(shape.halfExtents.x, shape.halfExtents.y, shape.halfExtents.z);
        } else if (shape instanceof CANNON.Cylinder) {
            return Math.max(shape.radiusTop, shape.radiusBottom);
        }
        
        return 1; // Default radius
    }

    /**
     * Clean up collision detector
     */
    dispose() {
        this.collisionCallbacks.clear();
        this.activeCollisions.clear();
        console.log('CollisionDetector disposed');
    }
}