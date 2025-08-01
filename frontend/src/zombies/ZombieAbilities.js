import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * ZombieAbilities handles special abilities for different zombie types
 */
export class ZombieAbilities {
    constructor(zombie, gameEngine) {
        this.zombie = zombie;
        this.gameEngine = gameEngine;
        this.activeAbilities = new Map();
        this.cooldowns = new Map();
        
        // Initialize abilities based on zombie config
        this._initializeAbilities();
    }

    /**
     * Initialize abilities for this zombie
     */
    _initializeAbilities() {
        if (!this.zombie.config.abilities) return;
        
        this.zombie.config.abilities.forEach(abilityName => {
            this.cooldowns.set(abilityName, 0);
        });
    }

    /**
     * Update ability cooldowns and active effects
     */
    update(deltaTime) {
        // Update cooldowns
        for (const [ability, cooldown] of this.cooldowns.entries()) {
            if (cooldown > 0) {
                this.cooldowns.set(ability, Math.max(0, cooldown - deltaTime));
            }
        }
        
        // Update active abilities
        for (const [ability, data] of this.activeAbilities.entries()) {
            this._updateAbility(ability, data, deltaTime);
        }
    }

    /**
     * Use an ability if available
     */
    useAbility(abilityName, target = null) {
        if (!this.zombie.config.abilities.includes(abilityName)) {
            return false;
        }
        
        if (this.cooldowns.get(abilityName) > 0) {
            return false;
        }
        
        const success = this._executeAbility(abilityName, target);
        
        if (success) {
            // Set cooldown based on ability
            const cooldownTime = this._getAbilityCooldown(abilityName);
            this.cooldowns.set(abilityName, cooldownTime);
        }
        
        return success;
    }

    /**
     * Check if an ability is available
     */
    isAbilityAvailable(abilityName) {
        return this.zombie.config.abilities.includes(abilityName) && 
               this.cooldowns.get(abilityName) <= 0;
    }

    /**
     * Execute a specific ability
     */
    _executeAbility(abilityName, target) {
        switch (abilityName) {
            case 'sprint':
                return this._executeSprint();
            case 'low_profile':
                return this._executeLowProfile();
            case 'acid_spit':
                return this._executeAcidSpit(target);
            case 'toxic_cloud':
                return this._executeToxicCloud();
            case 'explosion_on_death':
                return this._executeExplosionOnDeath();
            case 'damage_resistance':
                return this._executeDamageResistance();
            case 'shield_bash':
                return this._executeShieldBash(target);
            case 'toxic_aura':
                return this._executeToxicAura();
            case 'chemical_immunity':
                return this._executeChemicalImmunity();
            case 'sonic_scream':
                return this._executeSonicScream();
            case 'call_horde':
                return this._executeCallHorde();
            case 'suicide_explosion':
                return this._executeSuicideExplosion();
            case 'poison_attack':
                return this._executePoisonAttack(target);
            case 'toxic_trail':
                return this._executeToxicTrail();
            case 'leap_attack':
                return this._executeLeapAttack(target);
            case 'wall_climb':
                return this._executeWallClimb();
            case 'stealth':
                return this._executeStealth();
            case 'backstab':
                return this._executeBackstab(target);
            case 'rage_mode':
                return this._executeRageMode();
            case 'frenzy_attacks':
                return this._executeFrenzyAttacks();
            case 'ground_slam':
                return this._executeGroundSlam();
            case 'throw_debris':
                return this._executeThrowDebris(target);
            case 'charge_attack':
                return this._executeChargeAttack(target);
            case 'knockback':
                return this._executeKnockback(target);
            case 'rampage':
                return this._executeRampage();
            case 'vehicle_grab':
                return this._executeVehicleGrab(target);
            case 'pack_bonus':
                return this._executePackBonus();
            case 'swarm_tactics':
                return this._executeSwarmTactics();
            case 'command_pack':
                return this._executeCommandPack();
            case 'buff_allies':
                return this._executeBuffAllies();
            case 'drop_attack':
                return this._executeDropAttack(target);
            case 'burrow':
                return this._executeBurrow();
            case 'surprise_attack':
                return this._executeSurpriseAttack(target);
            
            // Boss abilities
            case 'roar_stun':
                return this._executeRoarStun();
            case 'regeneration':
                return this._executeRegeneration();
            case 'summon_horde':
                return this._executeSummonHorde();
            case 'buff_zombies':
                return this._executeBuffZombies();
            case 'teleport':
                return this._executeTeleport();
            case 'mind_control':
                return this._executeMindControl(target);
            case 'toxic_breath':
                return this._executeToxicBreath();
            case 'tentacle_grab':
                return this._executeTentacleGrab(target);
            case 'mutation':
                return this._executeMutation();
            case 'raise_dead':
                return this._executeRaiseDead();
            case 'dark_magic':
                return this._executeDarkMagic(target);
            case 'soul_drain':
                return this._executeSoulDrain(target);
            case 'phase_shift':
                return this._executePhaseShift();
            case 'devastating_slam':
                return this._executeDevastatingSlam();
            case 'spawn_minions':
                return this._executeSpawnMinions();
            case 'berserker_rage':
                return this._executeBerserkerRage();
            case 'earthquake':
                return this._executeEarthquake();
            
            default:
                console.warn(`Unknown ability: ${abilityName}`);
                return false;
        }
    }

    /**
     * Update active ability effects
     */
    _updateAbility(abilityName, data, deltaTime) {
        switch (abilityName) {
            case 'sprint':
                this._updateSprint(data, deltaTime);
                break;
            case 'toxic_aura':
                this._updateToxicAura(data, deltaTime);
                break;
            case 'stealth':
                this._updateStealth(data, deltaTime);
                break;
            case 'rage_mode':
                this._updateRageMode(data, deltaTime);
                break;
            case 'regeneration':
                this._updateRegeneration(data, deltaTime);
                break;
            // Add more active ability updates as needed
        }
    }

    /**
     * Get ability cooldown time
     */
    _getAbilityCooldown(abilityName) {
        const cooldownMap = {
            'sprint': 5.0,
            'acid_spit': 3.0,
            'toxic_cloud': 8.0,
            'shield_bash': 4.0,
            'sonic_scream': 10.0,
            'call_horde': 15.0,
            'suicide_explosion': 0.1, // One-time use
            'leap_attack': 6.0,
            'stealth': 12.0,
            'rage_mode': 20.0,
            'ground_slam': 8.0,
            'charge_attack': 6.0,
            'rampage': 25.0,
            'burrow': 10.0,
            'roar_stun': 15.0,
            'summon_horde': 30.0,
            'teleport': 8.0,
            'toxic_breath': 12.0,
            'devastating_slam': 20.0,
            'earthquake': 35.0
        };
        
        return cooldownMap[abilityName] || 5.0;
    }

    // Basic Abilities Implementation
    _executeSprint() {
        this.activeAbilities.set('sprint', {
            duration: 3.0,
            speedMultiplier: 2.0,
            originalSpeed: this.zombie.speed
        });
        this.zombie.speed *= 2.0;
        return true;
    }

    _updateSprint(data, deltaTime) {
        data.duration -= deltaTime;
        if (data.duration <= 0) {
            this.zombie.speed = data.originalSpeed;
            this.activeAbilities.delete('sprint');
        }
    }

    _executeLowProfile() {
        // Makes zombie harder to detect and hit
        this.zombie.detectionDifficulty = 0.5;
        return true;
    }

    _executeAcidSpit(target) {
        if (!target) return false;
        
        const distance = this.zombie.getPosition().distanceTo(target.getPosition());
        if (distance > this.zombie.config.attackRange) return false;
        
        // Create acid projectile
        this._createAcidProjectile(target);
        return true;
    }

    _executeToxicCloud() {
        // Create toxic cloud around zombie
        this._createToxicCloud(this.zombie.getPosition(), 5.0);
        return true;
    }

    _executeExplosionOnDeath() {
        if (this.zombie.health > 0) return false;
        
        // Create explosion effect
        this._createExplosion(this.zombie.getPosition(), 8.0, 50);
        return true;
    }

    _executeDamageResistance() {
        // Passive ability - handled in damage calculation
        return true;
    }

    _executeShieldBash(target) {
        if (!target) return false;
        
        const distance = this.zombie.getPosition().distanceTo(target.getPosition());
        if (distance > this.zombie.config.attackRange) return false;
        
        // Apply knockback and damage
        this._applyKnockback(target, this.zombie.getPosition(), 10.0);
        target.takeDamage(this.zombie.config.damage * 1.5);
        return true;
    }

    _executeToxicAura() {
        this.activeAbilities.set('toxic_aura', {
            duration: 10.0,
            damageInterval: 1.0,
            lastDamage: 0
        });
        return true;
    }

    _updateToxicAura(data, deltaTime) {
        data.duration -= deltaTime;
        data.lastDamage += deltaTime;
        
        if (data.lastDamage >= data.damageInterval) {
            // Damage nearby vehicles
            this._damageNearbyVehicles(this.zombie.getPosition(), 3.0, 5);
            data.lastDamage = 0;
        }
        
        if (data.duration <= 0) {
            this.activeAbilities.delete('toxic_aura');
        }
    }

    _executeSonicScream() {
        // Stun nearby vehicles and call zombies
        this._stunNearbyVehicles(this.zombie.getPosition(), 15.0, 2.0);
        this._callNearbyZombies(this.zombie.getPosition(), 30.0);
        return true;
    }

    _executeCallHorde() {
        // Spawn additional zombies
        this._spawnZombieReinforcements(this.zombie.getPosition(), 5);
        return true;
    }

    _executeSuicideExplosion() {
        // Explode and die
        this._createExplosion(this.zombie.getPosition(), 6.0, 80);
        this.zombie.takeDamage(this.zombie.health); // Kill self
        return true;
    }

    _executeLeapAttack(target) {
        if (!target) return false;
        
        const targetPos = target.getPosition();
        const zombiePos = this.zombie.getPosition();
        const distance = zombiePos.distanceTo(targetPos);
        
        if (distance > this.zombie.config.attackRange) return false;
        
        // Launch zombie towards target
        const direction = targetPos.clone().sub(zombiePos).normalize();
        const leapForce = direction.multiplyScalar(20.0);
        
        if (this.zombie.body && this.zombie.body.velocity && this.zombie.body.velocity.vadd) {
            this.zombie.body.velocity.vadd({ x: leapForce.x, y: leapForce.y + 10, z: leapForce.z });
        }
        
        return true;
    }

    _executeStealth() {
        this.activeAbilities.set('stealth', {
            duration: 8.0,
            originalOpacity: 1.0
        });
        
        // Make zombie semi-transparent
        if (this.zombie.mesh) {
            this.zombie.mesh.traverse(child => {
                if (child.material) {
                    child.material.transparent = true;
                    child.material.opacity = 0.3;
                }
            });
        }
        
        return true;
    }

    _updateStealth(data, deltaTime) {
        data.duration -= deltaTime;
        if (data.duration <= 0) {
            // Restore visibility
            if (this.zombie.mesh) {
                this.zombie.mesh.traverse(child => {
                    if (child.material) {
                        child.material.opacity = data.originalOpacity;
                        child.material.transparent = false;
                    }
                });
            }
            this.activeAbilities.delete('stealth');
        }
    }

    _executeRageMode() {
        this.activeAbilities.set('rage_mode', {
            duration: 15.0,
            damageMultiplier: 2.0,
            speedMultiplier: 1.5,
            originalDamage: this.zombie.config.damage,
            originalSpeed: this.zombie.speed
        });
        
        this.zombie.config.damage *= 2.0;
        this.zombie.speed *= 1.5;
        
        // Visual effect - red tint
        if (this.zombie.mesh) {
            this.zombie.mesh.traverse(child => {
                if (child.material) {
                    child.material.emissive = new THREE.Color(0x440000);
                }
            });
        }
        
        return true;
    }

    _updateRageMode(data, deltaTime) {
        data.duration -= deltaTime;
        if (data.duration <= 0) {
            // Restore original stats
            this.zombie.config.damage = data.originalDamage;
            this.zombie.speed = data.originalSpeed;
            
            // Remove visual effect
            if (this.zombie.mesh) {
                this.zombie.mesh.traverse(child => {
                    if (child.material) {
                        child.material.emissive = new THREE.Color(0x000000);
                    }
                });
            }
            
            this.activeAbilities.delete('rage_mode');
        }
    }

    // Boss Abilities
    _executeRoarStun() {
        this._stunNearbyVehicles(this.zombie.getPosition(), 25.0, 3.0);
        this._createShockwave(this.zombie.getPosition(), 25.0);
        return true;
    }

    _executeRegeneration() {
        this.activeAbilities.set('regeneration', {
            duration: 20.0,
            healRate: 5.0, // HP per second
            healInterval: 1.0,
            lastHeal: 0
        });
        return true;
    }

    _updateRegeneration(data, deltaTime) {
        data.duration -= deltaTime;
        data.lastHeal += deltaTime;
        
        if (data.lastHeal >= data.healInterval) {
            this.zombie.heal(data.healRate);
            data.lastHeal = 0;
        }
        
        if (data.duration <= 0) {
            this.activeAbilities.delete('regeneration');
        }
    }

    _executeSummonHorde() {
        this._spawnZombieReinforcements(this.zombie.getPosition(), 10);
        return true;
    }

    _executeTeleport() {
        // Find a random position near the target
        const vehicles = this.gameEngine.vehicleManager?.getAllVehicles() || [];
        if (vehicles.length === 0) return false;
        
        const target = vehicles[0]; // Target player vehicle
        const targetPos = target.getPosition();
        
        // Teleport to a position behind the target
        const angle = Math.random() * Math.PI * 2;
        const distance = 10 + Math.random() * 10;
        const newPos = new THREE.Vector3(
            targetPos.x + Math.cos(angle) * distance,
            targetPos.y + 2,
            targetPos.z + Math.sin(angle) * distance
        );
        
        if (this.zombie.body && this.zombie.body.position) {
            if (this.zombie.body.position.set) {
                this.zombie.body.position.set(newPos.x, newPos.y, newPos.z);
            } else {
                this.zombie.body.position.x = newPos.x;
                this.zombie.body.position.y = newPos.y;
                this.zombie.body.position.z = newPos.z;
            }
        }
        
        return true;
    }

    // Helper methods for ability effects
    _createAcidProjectile(target) {
        // Implementation would create a projectile that travels to target
        console.log('Creating acid projectile');
    }

    _createToxicCloud(position, radius) {
        // Implementation would create visual and damage effects
        console.log('Creating toxic cloud at', position);
    }

    _createExplosion(position, radius, damage) {
        // Implementation would create explosion effects and damage
        console.log('Creating explosion at', position, 'with radius', radius);
    }

    _applyKnockback(target, sourcePos, force) {
        if (!target.body) return;
        
        const direction = target.getPosition().sub(sourcePos).normalize();
        const knockbackForce = direction.multiplyScalar(force);
        
        if (target.body && target.body.velocity && target.body.velocity.vadd) {
            target.body.velocity.vadd({ x: knockbackForce.x, y: knockbackForce.y, z: knockbackForce.z });
        }
    }

    _damageNearbyVehicles(position, radius, damage) {
        const vehicles = this.gameEngine.vehicleManager?.getVehiclesInRadius(position, radius) || [];
        vehicles.forEach(vehicle => {
            vehicle.takeDamage(damage);
        });
    }

    _stunNearbyVehicles(position, radius, duration) {
        const vehicles = this.gameEngine.vehicleManager?.getVehiclesInRadius(position, radius) || [];
        vehicles.forEach(vehicle => {
            // Apply stun effect (would need to be implemented in vehicle)
            console.log('Stunning vehicle', vehicle.id);
        });
    }

    _callNearbyZombies(position, radius) {
        // Implementation would alert nearby zombies to converge on position
        console.log('Calling zombies to', position);
    }

    _spawnZombieReinforcements(position, count) {
        // Implementation would spawn additional zombies
        console.log('Spawning', count, 'zombie reinforcements at', position);
    }

    _createShockwave(position, radius) {
        // Implementation would create visual shockwave effect
        console.log('Creating shockwave at', position);
    }

    /**
     * Dispose of abilities and clean up
     */
    dispose() {
        this.activeAbilities.clear();
        this.cooldowns.clear();
    }
}