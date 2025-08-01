/**
 * DamageCalculator handles damage calculations between vehicles and zombies
 * based on vehicle stats, zombie types, and collision parameters
 */
export class DamageCalculator {
    constructor() {
        // Damage type multipliers
        this.DAMAGE_TYPES = {
            IMPACT: 'impact',
            EXPLOSION: 'explosion',
            FIRE: 'fire',
            POISON: 'poison',
            ELECTRIC: 'electric'
        };
        
        // Base damage modifiers
        this.BASE_DAMAGE_MULTIPLIER = 1.0;
        this.SPEED_DAMAGE_FACTOR = 0.1; // Damage per km/h of speed
        this.MASS_DAMAGE_FACTOR = 0.001; // Damage per kg of mass
        
        // Zombie resistance multipliers
        this.ZOMBIE_RESISTANCES = {
            walker: { impact: 1.0, explosion: 1.2, fire: 0.8, poison: 0.5, electric: 1.0 },
            runner: { impact: 0.9, explosion: 1.1, fire: 0.9, poison: 0.6, electric: 1.1 },
            crawler: { impact: 1.1, explosion: 1.0, fire: 0.7, poison: 0.4, electric: 0.9 },
            spitter: { impact: 0.8, explosion: 0.9, fire: 1.2, poison: 0.2, electric: 1.0 },
            bloater: { impact: 1.3, explosion: 0.6, fire: 1.5, poison: 0.1, electric: 0.8 },
            armored: { impact: 0.5, explosion: 0.7, fire: 0.9, poison: 0.8, electric: 1.2 },
            giant: { impact: 0.7, explosion: 0.8, fire: 1.0, poison: 0.9, electric: 0.6 },
            screamer: { impact: 1.0, explosion: 1.1, fire: 0.8, poison: 0.7, electric: 1.3 },
            exploder: { impact: 1.2, explosion: 0.3, fire: 2.0, poison: 0.6, electric: 0.9 },
            toxic: { impact: 0.9, explosion: 1.0, fire: 0.6, poison: 0.1, electric: 1.1 },
            berserker: { impact: 0.8, explosion: 0.9, fire: 0.7, poison: 0.8, electric: 1.0 },
            leaper: { impact: 1.1, explosion: 1.0, fire: 0.9, poison: 0.7, electric: 1.2 },
            stalker: { impact: 0.9, explosion: 1.1, fire: 0.8, poison: 0.6, electric: 1.0 },
            brute: { impact: 0.6, explosion: 0.7, fire: 0.8, poison: 0.9, electric: 0.5 },
            swarm: { impact: 1.2, explosion: 1.4, fire: 1.1, poison: 0.8, electric: 1.3 },
            boss_tyrant: { impact: 0.3, explosion: 0.4, fire: 0.5, poison: 0.7, electric: 0.2 },
            boss_horde_master: { impact: 0.4, explosion: 0.5, fire: 0.6, poison: 0.3, electric: 0.3 },
            boss_mutant: { impact: 0.5, explosion: 0.3, fire: 0.4, poison: 0.2, electric: 0.6 },
            boss_necromancer: { impact: 0.6, explosion: 0.7, fire: 0.3, poison: 0.1, electric: 0.8 },
            boss_abomination: { impact: 0.2, explosion: 0.2, fire: 0.7, poison: 0.1, electric: 0.1 }
        };
        
        // Vehicle damage multipliers based on type
        this.VEHICLE_DAMAGE_MULTIPLIERS = {
            sedan: 1.0,
            suv: 1.2,
            truck: 1.5,
            sports_car: 0.8,
            monster_truck: 2.0,
            armored_car: 1.8,
            buggy: 0.9,
            motorcycle: 0.6,
            tank: 3.0,
            hovercraft: 0.7,
            muscle_car: 1.3,
            racing_car: 0.9
        };
    }

    /**
     * Calculate damage dealt by vehicle to zombie
     */
    calculateVehicleToZombieDamage(vehicle, zombie, collisionData) {
        const vehicleStats = vehicle.stats;
        const zombieConfig = zombie.config;
        const impact = collisionData.impact;
        
        // Base damage from vehicle stats
        let baseDamage = vehicleStats.damage || 25;
        
        // Speed-based damage bonus
        const speed = impact.speed * 3.6; // Convert m/s to km/h
        const speedBonus = speed * this.SPEED_DAMAGE_FACTOR;
        
        // Mass-based damage bonus
        const mass = vehicle.body ? vehicle.body.mass : 1000;
        const massBonus = mass * this.MASS_DAMAGE_FACTOR;
        
        // Vehicle type multiplier
        const vehicleMultiplier = this.VEHICLE_DAMAGE_MULTIPLIERS[vehicle.type] || 1.0;
        
        // Calculate raw damage
        let rawDamage = (baseDamage + speedBonus + massBonus) * vehicleMultiplier;
        
        // Apply upgrade bonuses
        if (vehicle.upgrades) {
            // Weapon upgrades increase damage
            rawDamage *= (1 + vehicle.upgrades.weapons * 0.2);
            
            // Engine upgrades provide minor damage bonus through speed
            rawDamage *= (1 + vehicle.upgrades.engine * 0.05);
        }
        
        // Apply zombie resistance
        const damageType = this._getDamageTypeFromVehicle(vehicle);
        const resistance = this._getZombieResistance(zombie.type, damageType);
        const finalDamage = rawDamage * resistance;
        
        // Apply critical hit chance
        const criticalChance = this._calculateCriticalChance(vehicle, zombie, impact);
        const isCritical = Math.random() < criticalChance;
        const criticalMultiplier = isCritical ? 2.0 : 1.0;
        
        return {
            damage: Math.round(finalDamage * criticalMultiplier),
            isCritical,
            damageType,
            components: {
                baseDamage,
                speedBonus,
                massBonus,
                vehicleMultiplier,
                resistance,
                criticalMultiplier
            }
        };
    }

    /**
     * Calculate damage dealt by zombie to vehicle
     */
    calculateZombieToVehicleDamage(zombie, vehicle, collisionData) {
        const zombieConfig = zombie.config;
        const vehicleStats = vehicle.stats;
        const impact = collisionData.impact;
        
        // Base damage from zombie stats
        let baseDamage = zombieConfig.damage || 10;
        
        // Impact force bonus for zombie attacks
        const impactBonus = impact.force * 0.01;
        
        // Zombie type multipliers
        const zombieMultipliers = {
            walker: 1.0,
            runner: 0.8,
            crawler: 0.6,
            spitter: 1.2,
            bloater: 1.5,
            armored: 1.3,
            giant: 2.0,
            screamer: 0.7,
            exploder: 3.0, // High damage but self-destructs
            toxic: 1.1,
            berserker: 1.8,
            leaper: 1.4,
            stalker: 1.2,
            brute: 2.5,
            swarm: 0.5, // Individual swarm units are weak
            boss_tyrant: 5.0,
            boss_horde_master: 4.0,
            boss_mutant: 4.5,
            boss_necromancer: 3.5,
            boss_abomination: 6.0
        };
        
        const zombieMultiplier = zombieMultipliers[zombie.type] || 1.0;
        
        // Calculate raw damage
        let rawDamage = (baseDamage + impactBonus) * zombieMultiplier;
        
        // Apply zombie abilities
        if (zombieConfig.abilities) {
            if (zombieConfig.abilities.includes('armor_piercing')) {
                rawDamage *= 1.5; // Ignore some armor
            }
            if (zombieConfig.abilities.includes('poison_attack')) {
                rawDamage *= 1.2; // Poison damage over time
            }
            if (zombieConfig.abilities.includes('explosive_death') && zombie.health <= 0) {
                rawDamage *= 2.0; // Explosion on death
            }
        }
        
        // Apply vehicle armor reduction
        const armorReduction = this._calculateArmorReduction(vehicle);
        const finalDamage = rawDamage * (1 - armorReduction);
        
        return {
            damage: Math.round(Math.max(1, finalDamage)), // Minimum 1 damage
            damageType: this._getDamageTypeFromZombie(zombie),
            components: {
                baseDamage,
                impactBonus,
                zombieMultiplier,
                armorReduction
            }
        };
    }

    /**
     * Calculate explosion damage in area of effect
     */
    calculateExplosionDamage(center, radius, baseDamage, targets) {
        const damageResults = [];
        
        targets.forEach(target => {
            const distance = center.distanceTo(target.getPosition());
            
            if (distance <= radius) {
                // Damage falls off with distance
                const distanceFactor = 1 - (distance / radius);
                const damage = baseDamage * distanceFactor * distanceFactor; // Quadratic falloff
                
                // Apply target-specific modifiers
                let finalDamage = damage;
                if (target.type) {
                    const resistance = this._getZombieResistance(target.type, this.DAMAGE_TYPES.EXPLOSION);
                    finalDamage *= resistance;
                } else if (target.stats) {
                    // Vehicle target
                    const armorReduction = this._calculateArmorReduction(target);
                    finalDamage *= (1 - armorReduction);
                }
                
                damageResults.push({
                    target,
                    damage: Math.round(finalDamage),
                    distance,
                    distanceFactor
                });
            }
        });
        
        return damageResults;
    }

    /**
     * Calculate damage over time effects
     */
    calculateDamageOverTime(target, damageType, baseDamage, duration, tickRate = 1.0) {
        const totalTicks = Math.ceil(duration / tickRate);
        const damagePerTick = baseDamage / totalTicks;
        
        // Apply resistance
        let finalDamagePerTick = damagePerTick;
        if (target.type) {
            const resistance = this._getZombieResistance(target.type, damageType);
            finalDamagePerTick *= resistance;
        } else if (target.stats) {
            const armorReduction = this._calculateArmorReduction(target);
            finalDamagePerTick *= (1 - armorReduction);
        }
        
        return {
            damagePerTick: Math.round(finalDamagePerTick),
            totalTicks,
            totalDamage: Math.round(finalDamagePerTick * totalTicks),
            tickRate,
            duration
        };
    }

    /**
     * Get damage type from vehicle
     */
    _getDamageTypeFromVehicle(vehicle) {
        // Determine damage type based on vehicle type and upgrades
        if (vehicle.type === 'tank') {
            return this.DAMAGE_TYPES.EXPLOSION;
        } else if (vehicle.upgrades && vehicle.upgrades.weapons > 2) {
            return this.DAMAGE_TYPES.FIRE; // High-level weapon upgrades add fire damage
        } else {
            return this.DAMAGE_TYPES.IMPACT;
        }
    }

    /**
     * Get damage type from zombie
     */
    _getDamageTypeFromZombie(zombie) {
        const typeMap = {
            spitter: this.DAMAGE_TYPES.POISON,
            exploder: this.DAMAGE_TYPES.EXPLOSION,
            toxic: this.DAMAGE_TYPES.POISON,
            screamer: this.DAMAGE_TYPES.ELECTRIC
        };
        
        return typeMap[zombie.type] || this.DAMAGE_TYPES.IMPACT;
    }

    /**
     * Get zombie resistance to damage type
     */
    _getZombieResistance(zombieType, damageType) {
        const resistances = this.ZOMBIE_RESISTANCES[zombieType];
        if (!resistances) return 1.0;
        
        return resistances[damageType] || 1.0;
    }

    /**
     * Calculate armor reduction for vehicle
     */
    _calculateArmorReduction(vehicle) {
        let armorValue = vehicle.stats.armor || 0;
        
        // Apply armor upgrades
        if (vehicle.upgrades && vehicle.upgrades.armor) {
            armorValue += vehicle.upgrades.armor * 10;
        }
        
        // Convert armor value to damage reduction percentage
        // Formula: reduction = armor / (armor + 100)
        // This gives diminishing returns and caps at 100% reduction
        const reduction = armorValue / (armorValue + 100);
        
        return Math.min(0.9, reduction); // Cap at 90% reduction
    }

    /**
     * Calculate critical hit chance
     */
    _calculateCriticalChance(vehicle, zombie, impact) {
        let baseCritChance = 0.05; // 5% base critical chance
        
        // Speed increases critical chance
        const speed = impact.speed * 3.6;
        const speedBonus = Math.min(0.15, speed * 0.001); // Max 15% bonus
        
        // Vehicle type modifiers
        const vehicleCritModifiers = {
            sports_car: 0.03,
            racing_car: 0.04,
            motorcycle: 0.02,
            tank: -0.02
        };
        
        const vehicleBonus = vehicleCritModifiers[vehicle.type] || 0;
        
        // Weapon upgrades increase crit chance
        let upgradeBonus = 0;
        if (vehicle.upgrades && vehicle.upgrades.weapons) {
            upgradeBonus = vehicle.upgrades.weapons * 0.01;
        }
        
        return Math.min(0.5, baseCritChance + speedBonus + vehicleBonus + upgradeBonus);
    }

    /**
     * Calculate knockback force
     */
    calculateKnockback(attacker, target, damage, direction) {
        // Base knockback force
        let knockbackForce = damage * 0.1;
        
        // Mass ratio affects knockback
        const attackerMass = attacker.body ? attacker.body.mass : 1000;
        const targetMass = target.body ? target.body.mass : 70;
        const massRatio = attackerMass / targetMass;
        
        knockbackForce *= Math.sqrt(massRatio);
        
        // Apply direction
        const knockbackVector = direction.clone().normalize();
        knockbackVector.multiplyScalar(knockbackForce);
        
        return knockbackVector;
    }

    /**
     * Get damage color for UI display
     */
    getDamageColor(damageType, isCritical = false) {
        const colors = {
            [this.DAMAGE_TYPES.IMPACT]: isCritical ? '#ffff00' : '#ffffff',
            [this.DAMAGE_TYPES.EXPLOSION]: isCritical ? '#ff8800' : '#ff4400',
            [this.DAMAGE_TYPES.FIRE]: isCritical ? '#ff6600' : '#ff0000',
            [this.DAMAGE_TYPES.POISON]: isCritical ? '#88ff00' : '#00ff00',
            [this.DAMAGE_TYPES.ELECTRIC]: isCritical ? '#88ffff' : '#0088ff'
        };
        
        return colors[damageType] || '#ffffff';
    }
}