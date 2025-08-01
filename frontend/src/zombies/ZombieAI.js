import * as THREE from 'three';
import { ZOMBIE_STATES, ZOMBIE_BEHAVIORS } from './ZombieConfig';

/**
 * ZombieAI handles AI behavior, pathfinding, and state management for zombies
 */
export class ZombieAI {
    constructor(zombie, gameEngine) {
        this.zombie = zombie;
        this.gameEngine = gameEngine;
        
        // AI State
        this.currentState = ZOMBIE_STATES.IDLE;
        this.previousState = ZOMBIE_STATES.IDLE;
        this.stateTimer = 0;
        this.stateDuration = 0;
        
        // Targets and awareness
        this.currentTarget = null;
        this.lastKnownTargetPosition = null;
        this.awarenessLevel = 0; // 0-1, how aware the zombie is of threats
        this.alertLevel = 0; // 0-1, how agitated the zombie is
        
        // Pathfinding
        this.path = [];
        this.currentPathIndex = 0;
        this.pathfindingCooldown = 0;
        this.stuckTimer = 0;
        this.lastPosition = new THREE.Vector3();
        
        // Behavior parameters
        this.wanderTarget = null;
        this.wanderRadius = 20;
        this.chaseDistance = this.zombie.config.detectionRange;
        this.attackDistance = this.zombie.config.attackRange;
        this.giveUpDistance = this.zombie.config.detectionRange * 2;
        
        // Attack timing
        this.attackCooldown = 0;
        this.lastAttackTime = 0;
        
        // Group behavior
        this.packMembers = [];
        this.packLeader = null;
        this.isPackLeader = false;
        
        // Special behavior flags
        this.isStealthed = false;
        this.isBurrowed = false;
        this.isRaging = false;
        
        // Decision making
        this.decisionTimer = 0;
        this.decisionInterval = 0.5; // Make decisions every 0.5 seconds
        
        this._initializeBehavior();
    }

    /**
     * Initialize behavior based on zombie type
     */
    _initializeBehavior() {
        switch (this.zombie.config.behavior) {
            case ZOMBIE_BEHAVIORS.AGGRESSIVE:
                this.chaseDistance *= 1.2;
                this.giveUpDistance *= 0.8;
                break;
            case ZOMBIE_BEHAVIORS.DEFENSIVE:
                this.chaseDistance *= 0.8;
                this.giveUpDistance *= 1.2;
                break;
            case ZOMBIE_BEHAVIORS.PACK:
                this.wanderRadius *= 0.5; // Stay closer to pack
                break;
            case ZOMBIE_BEHAVIORS.AMBUSH:
                this.chaseDistance *= 0.6;
                this.awarenessLevel = 0.8; // More aware of surroundings
                break;
            case ZOMBIE_BEHAVIORS.RANGED:
                this.attackDistance = this.zombie.config.attackRange;
                this.chaseDistance *= 1.5;
                break;
            case ZOMBIE_BEHAVIORS.SUPPORT:
                this.chaseDistance *= 0.7;
                this.alertLevel = 0.3; // More likely to call for help
                break;
        }
    }

    /**
     * Update AI behavior each frame
     */
    update(deltaTime) {
        this.stateTimer += deltaTime;
        this.decisionTimer += deltaTime;
        this.pathfindingCooldown = Math.max(0, this.pathfindingCooldown - deltaTime);
        this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);
        
        // Update awareness and alert levels
        this._updateAwareness(deltaTime);
        
        // Make decisions periodically
        if (this.decisionTimer >= this.decisionInterval) {
            this._makeDecision();
            this.decisionTimer = 0;
        }
        
        // Execute current state behavior
        this._executeState(deltaTime);
        
        // Update movement
        this._updateMovement(deltaTime);
        
        // Check for stuck condition
        this._checkStuckCondition(deltaTime);
    }

    /**
     * Update awareness and alert levels based on environment
     */
    _updateAwareness(deltaTime) {
        const vehicles = this._getNearbyVehicles();
        const zombies = this._getNearbyZombies();
        
        // Increase awareness if vehicles are nearby
        if (vehicles.length > 0) {
            this.awarenessLevel = Math.min(1, this.awarenessLevel + deltaTime * 0.5);
            this.alertLevel = Math.min(1, this.alertLevel + deltaTime * 0.3);
        } else {
            this.awarenessLevel = Math.max(0, this.awarenessLevel - deltaTime * 0.2);
            this.alertLevel = Math.max(0, this.alertLevel - deltaTime * 0.1);
        }
        
        // Pack behavior - share awareness
        if (this.zombie.config.behavior === ZOMBIE_BEHAVIORS.PACK) {
            this._sharePackAwareness(zombies);
        }
    }

    /**
     * Make AI decisions based on current situation
     */
    _makeDecision() {
        const vehicles = this._getNearbyVehicles();
        const closestVehicle = vehicles.length > 0 ? vehicles[0] : null;
        
        // State transition logic
        switch (this.currentState) {
            case ZOMBIE_STATES.IDLE:
                this._decideFromIdle(closestVehicle);
                break;
            case ZOMBIE_STATES.WANDERING:
                this._decideFromWandering(closestVehicle);
                break;
            case ZOMBIE_STATES.CHASING:
                this._decideFromChasing(closestVehicle);
                break;
            case ZOMBIE_STATES.ATTACKING:
                this._decideFromAttacking(closestVehicle);
                break;
            case ZOMBIE_STATES.STUNNED:
                this._decideFromStunned();
                break;
        }
    }

    /**
     * Decision making from idle state
     */
    _decideFromIdle(closestVehicle) {
        if (closestVehicle && this._canDetectTarget(closestVehicle)) {
            this._setState(ZOMBIE_STATES.CHASING);
            this.currentTarget = closestVehicle;
        } else if (this.stateTimer > 2.0) {
            this._setState(ZOMBIE_STATES.WANDERING);
        }
    }

    /**
     * Decision making from wandering state
     */
    _decideFromWandering(closestVehicle) {
        if (closestVehicle && this._canDetectTarget(closestVehicle)) {
            this._setState(ZOMBIE_STATES.CHASING);
            this.currentTarget = closestVehicle;
        } else if (this._hasReachedWanderTarget()) {
            this._setState(ZOMBIE_STATES.IDLE);
        }
    }

    /**
     * Decision making from chasing state
     */
    _decideFromChasing(closestVehicle) {
        if (!this.currentTarget || this.currentTarget.isDestroyed) {
            this.currentTarget = closestVehicle;
        }
        
        if (!this.currentTarget) {
            this._setState(ZOMBIE_STATES.WANDERING);
            return;
        }
        
        const distance = this._getDistanceToTarget(this.currentTarget);
        
        if (distance <= this.attackDistance && this.attackCooldown <= 0) {
            this._setState(ZOMBIE_STATES.ATTACKING);
        } else if (distance > this.giveUpDistance) {
            this._setState(ZOMBIE_STATES.WANDERING);
            this.currentTarget = null;
        }
    }

    /**
     * Decision making from attacking state
     */
    _decideFromAttacking(closestVehicle) {
        if (!this.currentTarget || this.currentTarget.isDestroyed) {
            this._setState(ZOMBIE_STATES.CHASING);
            this.currentTarget = closestVehicle;
            return;
        }
        
        const distance = this._getDistanceToTarget(this.currentTarget);
        
        if (distance > this.attackDistance) {
            this._setState(ZOMBIE_STATES.CHASING);
        } else if (this.stateTimer > this.zombie.config.attackCooldown) {
            this._setState(ZOMBIE_STATES.CHASING);
        }
    }

    /**
     * Decision making from stunned state
     */
    _decideFromStunned() {
        if (this.stateTimer > this.stateDuration) {
            this._setState(ZOMBIE_STATES.IDLE);
        }
    }

    /**
     * Execute behavior for current state
     */
    _executeState(deltaTime) {
        switch (this.currentState) {
            case ZOMBIE_STATES.IDLE:
                this._executeIdle(deltaTime);
                break;
            case ZOMBIE_STATES.WANDERING:
                this._executeWandering(deltaTime);
                break;
            case ZOMBIE_STATES.CHASING:
                this._executeChasing(deltaTime);
                break;
            case ZOMBIE_STATES.ATTACKING:
                this._executeAttacking(deltaTime);
                break;
            case ZOMBIE_STATES.STUNNED:
                this._executeStunned(deltaTime);
                break;
            case ZOMBIE_STATES.SPECIAL_ABILITY:
                this._executeSpecialAbility(deltaTime);
                break;
        }
    }

    /**
     * Execute idle behavior
     */
    _executeIdle(deltaTime) {
        // Occasionally look around or make idle sounds
        if (Math.random() < 0.01) {
            this._playSound('idle');
        }
    }

    /**
     * Execute wandering behavior
     */
    _executeWandering(deltaTime) {
        if (!this.wanderTarget || this._hasReachedWanderTarget()) {
            this._setNewWanderTarget();
        }
        
        this._moveTowards(this.wanderTarget, this.zombie.speed * 0.5);
    }

    /**
     * Execute chasing behavior
     */
    _executeChasing(deltaTime) {
        if (!this.currentTarget) return;
        
        const targetPosition = this.currentTarget.getPosition();
        this.lastKnownTargetPosition = targetPosition.clone();
        
        // Use pathfinding for complex navigation
        if (this.pathfindingCooldown <= 0) {
            this._findPathToTarget(targetPosition);
            this.pathfindingCooldown = 1.0; // Recalculate path every second
        }
        
        this._followPath();
        
        // Use special abilities while chasing
        this._considerSpecialAbilities();
    }

    /**
     * Execute attacking behavior
     */
    _executeAttacking(deltaTime) {
        if (!this.currentTarget) return;
        
        // Face the target
        this._faceTarget(this.currentTarget);
        
        // Perform attack
        if (this.stateTimer > 0.5) { // Attack delay
            this._performAttack(this.currentTarget);
            this.attackCooldown = this.zombie.config.attackCooldown;
        }
    }

    /**
     * Execute stunned behavior
     */
    _executeStunned(deltaTime) {
        // Do nothing while stunned
    }

    /**
     * Execute special ability behavior
     */
    _executeSpecialAbility(deltaTime) {
        // Handled by ZombieAbilities system
        if (this.stateTimer > 2.0) { // Max ability duration
            this._setState(this.previousState);
        }
    }

    /**
     * Update movement based on AI decisions
     */
    _updateMovement(deltaTime) {
        if (this.currentState === ZOMBIE_STATES.STUNNED) return;
        
        // Apply movement to physics body
        if (this.zombie.body && this.zombie.moveDirection) {
            const force = this.zombie.moveDirection.clone().multiplyScalar(this.zombie.speed * 100);
            this.zombie.body.applyForce(new CANNON.Vec3(force.x, 0, force.z), this.zombie.body.position);
        }
    }

    /**
     * Check if zombie is stuck and handle it
     */
    _checkStuckCondition(deltaTime) {
        const currentPos = this.zombie.getPosition();
        const distanceMoved = currentPos.distanceTo(this.lastPosition);
        
        if (distanceMoved < 0.1 && this.currentState !== ZOMBIE_STATES.IDLE) {
            this.stuckTimer += deltaTime;
            
            if (this.stuckTimer > 3.0) {
                // Try to unstuck
                this._handleStuckCondition();
                this.stuckTimer = 0;
            }
        } else {
            this.stuckTimer = 0;
        }
        
        this.lastPosition.copy(currentPos);
    }

    /**
     * Handle stuck condition
     */
    _handleStuckCondition() {
        // Try jumping or moving in a random direction
        if (this.zombie.body) {
            const randomDirection = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                0,
                (Math.random() - 0.5) * 2
            ).normalize();
            
            const force = randomDirection.multiplyScalar(this.zombie.speed * 200);
            if (this.zombie.body && this.zombie.body.applyForce) {
                this.zombie.body.applyForce({ x: force.x, y: 500, z: force.z }, this.zombie.body.position);
            }
        }
        
        // Clear current path
        this.path = [];
        this.currentPathIndex = 0;
    }

    /**
     * Set new AI state
     */
    _setState(newState) {
        if (newState === this.currentState) return;
        
        this.previousState = this.currentState;
        this.currentState = newState;
        this.stateTimer = 0;
        
        // State entry actions
        this._onStateEnter(newState);
    }

    /**
     * Handle state entry actions
     */
    _onStateEnter(state) {
        switch (state) {
            case ZOMBIE_STATES.CHASING:
                this._playSound('chase');
                break;
            case ZOMBIE_STATES.ATTACKING:
                this._playSound('attack');
                break;
            case ZOMBIE_STATES.STUNNED:
                // Don't override stateDuration if already set (e.g., by stun method)
                if (this.stateDuration === 0) {
                    this.stateDuration = 2.0; // Default stun duration
                }
                break;
        }
    }

    /**
     * Get nearby vehicles within detection range
     */
    _getNearbyVehicles() {
        const vehicles = this.gameEngine.vehicleManager?.getAllVehicles() || [];
        const zombiePos = this.zombie.getPosition();
        
        return vehicles
            .filter(vehicle => !vehicle.isDestroyed)
            .map(vehicle => ({
                vehicle,
                distance: zombiePos.distanceTo(vehicle.getPosition())
            }))
            .filter(item => item.distance <= this.chaseDistance)
            .sort((a, b) => a.distance - b.distance)
            .map(item => item.vehicle);
    }

    /**
     * Get nearby zombies
     */
    _getNearbyZombies() {
        const zombies = this.gameEngine.zombieManager?.getAllZombies() || [];
        const zombiePos = this.zombie.getPosition();
        
        return zombies
            .filter(zombie => zombie !== this.zombie && !zombie.isDestroyed)
            .map(zombie => ({
                zombie,
                distance: zombiePos.distanceTo(zombie.getPosition())
            }))
            .filter(item => item.distance <= 20) // 20 unit communication range
            .sort((a, b) => a.distance - b.distance)
            .map(item => item.zombie);
    }

    /**
     * Check if zombie can detect target
     */
    _canDetectTarget(target) {
        if (!target || target.isDestroyed) return false;
        
        const distance = this._getDistanceToTarget(target);
        const detectionRange = this.chaseDistance * (this.awarenessLevel + 0.5);
        
        // Line of sight check (simplified)
        if (distance > detectionRange) return false;
        
        // Special detection modifiers
        if (this.isStealthed) return distance <= detectionRange * 0.3;
        if (this.zombie.config.behavior === ZOMBIE_BEHAVIORS.AMBUSH) {
            return distance <= detectionRange * 0.8;
        }
        
        return true;
    }

    /**
     * Get distance to target
     */
    _getDistanceToTarget(target) {
        if (!target) return Infinity;
        return this.zombie.getPosition().distanceTo(target.getPosition());
    }

    /**
     * Set new wander target
     */
    _setNewWanderTarget() {
        const zombiePos = this.zombie.getPosition();
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * this.wanderRadius;
        
        this.wanderTarget = new THREE.Vector3(
            zombiePos.x + Math.cos(angle) * distance,
            zombiePos.y,
            zombiePos.z + Math.sin(angle) * distance
        );
    }

    /**
     * Check if zombie has reached wander target
     */
    _hasReachedWanderTarget() {
        if (!this.wanderTarget) return true;
        return this.zombie.getPosition().distanceTo(this.wanderTarget) < 2.0;
    }

    /**
     * Move towards a position
     */
    _moveTowards(targetPosition, speed) {
        if (!targetPosition) return;
        
        const zombiePos = this.zombie.getPosition();
        const direction = targetPosition.clone().sub(zombiePos).normalize();
        
        this.zombie.moveDirection = direction;
        this.zombie.speed = speed;
        
        // Face movement direction
        this._faceDirection(direction);
    }

    /**
     * Face a specific target
     */
    _faceTarget(target) {
        if (!target) return;
        
        const targetPos = target.getPosition();
        const zombiePos = this.zombie.getPosition();
        const direction = targetPos.clone().sub(zombiePos).normalize();
        
        this._faceDirection(direction);
    }

    /**
     * Face a specific direction
     */
    _faceDirection(direction) {
        if (!this.zombie.body) return;
        
        const angle = Math.atan2(direction.x, direction.z);
        if (this.zombie.body && this.zombie.body.quaternion && this.zombie.body.quaternion.setFromAxisAngle) {
            this.zombie.body.quaternion.setFromAxisAngle({ x: 0, y: 1, z: 0 }, angle);
        }
    }

    /**
     * Simple pathfinding to target
     */
    _findPathToTarget(targetPosition) {
        // Simplified pathfinding - direct path with obstacle avoidance
        const zombiePos = this.zombie.getPosition();
        const direction = targetPosition.clone().sub(zombiePos).normalize();
        
        // Check for obstacles and create waypoints
        this.path = [targetPosition.clone()];
        this.currentPathIndex = 0;
        
        // TODO: Implement proper A* pathfinding for complex environments
    }

    /**
     * Follow current path
     */
    _followPath() {
        if (this.path.length === 0) return;
        
        const currentWaypoint = this.path[this.currentPathIndex];
        if (!currentWaypoint) return;
        
        const distance = this.zombie.getPosition().distanceTo(currentWaypoint);
        
        if (distance < 2.0) {
            this.currentPathIndex++;
            if (this.currentPathIndex >= this.path.length) {
                this.path = [];
                this.currentPathIndex = 0;
            }
        } else {
            this._moveTowards(currentWaypoint, this.zombie.speed);
        }
    }

    /**
     * Consider using special abilities
     */
    _considerSpecialAbilities() {
        if (!this.zombie.abilities) return;
        
        // Use abilities based on situation and cooldowns
        const abilities = this.zombie.config.abilities || [];
        
        abilities.forEach(ability => {
            if (this.zombie.abilities.isAbilityAvailable(ability)) {
                const shouldUse = this._shouldUseAbility(ability);
                if (shouldUse) {
                    this.zombie.abilities.useAbility(ability, this.currentTarget);
                }
            }
        });
    }

    /**
     * Determine if an ability should be used
     */
    _shouldUseAbility(abilityName) {
        const random = Math.random();
        
        switch (abilityName) {
            case 'sprint':
                return random < 0.1 && this.currentTarget; // 10% chance when chasing
            case 'leap_attack':
                return random < 0.2 && this.currentTarget && 
                       this._getDistanceToTarget(this.currentTarget) <= 8;
            case 'stealth':
                return random < 0.05 && this.currentState === ZOMBIE_STATES.CHASING;
            case 'rage_mode':
                return random < 0.1 && this.zombie.health < this.zombie.config.maxHealth * 0.5;
            case 'call_horde':
                return random < 0.05 && this.alertLevel > 0.7;
            default:
                return random < 0.05; // 5% chance for other abilities
        }
    }

    /**
     * Perform attack on target
     */
    _performAttack(target) {
        if (!target || target.isDestroyed) return;
        
        const damage = this.zombie.config.damage;
        target.takeDamage(damage);
        
        this._playSound('attack');
        
        // Special attack effects based on zombie type
        this._applyAttackEffects(target);
    }

    /**
     * Apply special attack effects
     */
    _applyAttackEffects(target) {
        // Implement special attack effects based on zombie abilities
        if (this.zombie.config.abilities.includes('poison_attack')) {
            // Apply poison effect
        }
        
        if (this.zombie.config.abilities.includes('knockback')) {
            // Apply knockback force
            this._applyKnockback(target);
        }
    }

    /**
     * Apply knockback to target
     */
    _applyKnockback(target) {
        if (!target.body) return;
        
        const direction = target.getPosition().sub(this.zombie.getPosition()).normalize();
        const force = direction.multiplyScalar(500);
        
        target.body.applyForce(new CANNON.Vec3(force.x, force.y, force.z), target.body.position);
    }

    /**
     * Share awareness with pack members
     */
    _sharePackAwareness(nearbyZombies) {
        nearbyZombies.forEach(zombie => {
            if (zombie.ai && zombie.config.behavior === ZOMBIE_BEHAVIORS.PACK) {
                // Share target information
                if (this.currentTarget && !zombie.ai.currentTarget) {
                    zombie.ai.currentTarget = this.currentTarget;
                    zombie.ai._setState(ZOMBIE_STATES.CHASING);
                }
                
                // Share awareness level
                zombie.ai.awarenessLevel = Math.max(zombie.ai.awarenessLevel, this.awarenessLevel * 0.8);
            }
        });
    }

    /**
     * Stun the zombie for a duration
     */
    stun(duration) {
        this._setState(ZOMBIE_STATES.STUNNED);
        this.stateDuration = duration;
    }

    /**
     * Play zombie sound
     */
    _playSound(soundType) {
        // Implementation would play appropriate sound
        console.log(`Playing ${this.zombie.type} ${soundType} sound`);
    }

    /**
     * Get current AI state
     */
    getState() {
        return this.currentState;
    }

    /**
     * Get current target
     */
    getTarget() {
        return this.currentTarget;
    }

    /**
     * Set target manually
     */
    setTarget(target) {
        this.currentTarget = target;
        if (target && this.currentState === ZOMBIE_STATES.IDLE) {
            this._setState(ZOMBIE_STATES.CHASING);
        }
    }

    /**
     * Get AI debug information
     */
    getDebugInfo() {
        return {
            state: this.currentState,
            target: this.currentTarget ? this.currentTarget.id : null,
            awarenessLevel: this.awarenessLevel,
            alertLevel: this.alertLevel,
            pathLength: this.path.length,
            stuckTimer: this.stuckTimer
        };
    }

    /**
     * Dispose of AI and clean up
     */
    dispose() {
        this.currentTarget = null;
        this.path = [];
        this.packMembers = [];
        this.packLeader = null;
    }
}