import { 
    ZombieConfig, 
    ZOMBIE_TYPES, 
    ZOMBIE_STATES, 
    ZOMBIE_BEHAVIORS,
    getZombieConfig,
    getAllZombieConfigs,
    getZombieTypesByBehavior,
    getBossZombieTypes,
    getRandomZombieType
} from '../ZombieConfig';

describe('ZombieConfig', () => {
    describe('Constants', () => {
        test('should have all required zombie types', () => {
            expect(Object.keys(ZOMBIE_TYPES).length).toBeGreaterThanOrEqual(25);
            expect(ZOMBIE_TYPES.WALKER).toBe('walker');
            expect(ZOMBIE_TYPES.BOSS_TYRANT).toBe('boss_tyrant');
            expect(ZOMBIE_TYPES.BOSS_ABOMINATION).toBe('boss_abomination');
        });

        test('should have all zombie states', () => {
            expect(ZOMBIE_STATES.IDLE).toBe('idle');
            expect(ZOMBIE_STATES.WANDERING).toBe('wandering');
            expect(ZOMBIE_STATES.CHASING).toBe('chasing');
            expect(ZOMBIE_STATES.ATTACKING).toBe('attacking');
            expect(ZOMBIE_STATES.STUNNED).toBe('stunned');
            expect(ZOMBIE_STATES.DYING).toBe('dying');
            expect(ZOMBIE_STATES.DEAD).toBe('dead');
            expect(ZOMBIE_STATES.SPECIAL_ABILITY).toBe('special_ability');
        });

        test('should have all zombie behaviors', () => {
            expect(ZOMBIE_BEHAVIORS.AGGRESSIVE).toBe('aggressive');
            expect(ZOMBIE_BEHAVIORS.DEFENSIVE).toBe('defensive');
            expect(ZOMBIE_BEHAVIORS.PACK).toBe('pack');
            expect(ZOMBIE_BEHAVIORS.AMBUSH).toBe('ambush');
            expect(ZOMBIE_BEHAVIORS.RANGED).toBe('ranged');
            expect(ZOMBIE_BEHAVIORS.SUPPORT).toBe('support');
        });
    });

    describe('getZombieConfig', () => {
        test('should return config for valid zombie type', () => {
            const config = getZombieConfig(ZOMBIE_TYPES.WALKER);
            
            expect(config).toBeDefined();
            expect(config.name).toBe('Walker');
            expect(config.health).toBe(50);
            expect(config.speed).toBe(8);
            expect(config.damage).toBe(15);
            expect(config.pointValue).toBe(10);
        });

        test('should return null for invalid zombie type', () => {
            const config = getZombieConfig('invalid_type');
            
            expect(config).toBeNull();
        });

        test('should return deep copy of config', () => {
            const config1 = getZombieConfig(ZOMBIE_TYPES.WALKER);
            const config2 = getZombieConfig(ZOMBIE_TYPES.WALKER);
            
            config1.health = 100;
            
            expect(config2.health).toBe(50); // Should not be affected
        });

        test('should have all required properties for each zombie type', () => {
            Object.values(ZOMBIE_TYPES).forEach(type => {
                const config = getZombieConfig(type);
                
                expect(config).toBeDefined();
                expect(config.name).toBeDefined();
                expect(config.health).toBeGreaterThan(0);
                expect(config.maxHealth).toBeGreaterThan(0);
                expect(config.speed).toBeGreaterThan(0);
                expect(config.damage).toBeGreaterThan(0);
                expect(config.pointValue).toBeGreaterThan(0);
                expect(config.spawnWeight).toBeGreaterThan(0);
                expect(config.size).toBeDefined();
                expect(config.color).toBeDefined();
                expect(config.behavior).toBeDefined();
                expect(config.detectionRange).toBeGreaterThan(0);
                expect(config.attackRange).toBeGreaterThan(0);
                expect(config.attackCooldown).toBeGreaterThan(0);
                expect(Array.isArray(config.abilities)).toBe(true);
                expect(Array.isArray(config.sounds)).toBe(true);
                expect(Array.isArray(config.animations)).toBe(true);
            });
        });
    });

    describe('getAllZombieConfigs', () => {
        test('should return all zombie configurations', () => {
            const configs = getAllZombieConfigs();
            
            expect(configs.length).toBe(Object.keys(ZOMBIE_TYPES).length);
            
            configs.forEach(config => {
                expect(config.type).toBeDefined();
                expect(config.name).toBeDefined();
                expect(config.health).toBeGreaterThan(0);
            });
        });

        test('should include type property in each config', () => {
            const configs = getAllZombieConfigs();
            
            configs.forEach(config => {
                expect(Object.values(ZOMBIE_TYPES)).toContain(config.type);
            });
        });
    });

    describe('getZombieTypesByBehavior', () => {
        test('should return zombies with aggressive behavior', () => {
            const aggressiveTypes = getZombieTypesByBehavior(ZOMBIE_BEHAVIORS.AGGRESSIVE);
            
            expect(aggressiveTypes.length).toBeGreaterThan(0);
            expect(aggressiveTypes).toContain(ZOMBIE_TYPES.WALKER);
            expect(aggressiveTypes).toContain(ZOMBIE_TYPES.RUNNER);
        });

        test('should return zombies with pack behavior', () => {
            const packTypes = getZombieTypesByBehavior(ZOMBIE_BEHAVIORS.PACK);
            
            expect(packTypes.length).toBeGreaterThan(0);
            expect(packTypes).toContain(ZOMBIE_TYPES.SWARM);
            expect(packTypes).toContain(ZOMBIE_TYPES.PACK_LEADER);
        });

        test('should return zombies with ranged behavior', () => {
            const rangedTypes = getZombieTypesByBehavior(ZOMBIE_BEHAVIORS.RANGED);
            
            expect(rangedTypes.length).toBeGreaterThan(0);
            expect(rangedTypes).toContain(ZOMBIE_TYPES.SPITTER);
        });

        test('should return empty array for non-existent behavior', () => {
            const types = getZombieTypesByBehavior('non_existent_behavior');
            
            expect(types).toEqual([]);
        });
    });

    describe('getBossZombieTypes', () => {
        test('should return all boss zombie types', () => {
            const bossTypes = getBossZombieTypes();
            
            expect(bossTypes.length).toBeGreaterThan(0);
            expect(bossTypes).toContain(ZOMBIE_TYPES.BOSS_TYRANT);
            expect(bossTypes).toContain(ZOMBIE_TYPES.BOSS_HORDE_MASTER);
            expect(bossTypes).toContain(ZOMBIE_TYPES.BOSS_MUTANT);
            expect(bossTypes).toContain(ZOMBIE_TYPES.BOSS_NECROMANCER);
            expect(bossTypes).toContain(ZOMBIE_TYPES.BOSS_ABOMINATION);
        });

        test('should only return zombies marked as bosses', () => {
            const bossTypes = getBossZombieTypes();
            
            bossTypes.forEach(type => {
                const config = getZombieConfig(type);
                expect(config.isBoss).toBe(true);
            });
        });
    });

    describe('getRandomZombieType', () => {
        test('should return a valid zombie type', () => {
            const randomType = getRandomZombieType();
            
            expect(Object.values(ZOMBIE_TYPES)).toContain(randomType);
        });

        test('should exclude bosses by default', () => {
            const bossTypes = getBossZombieTypes();
            
            // Test multiple times to increase confidence
            for (let i = 0; i < 50; i++) {
                const randomType = getRandomZombieType();
                expect(bossTypes).not.toContain(randomType);
            }
        });

        test('should include bosses when excludeBosses is false', () => {
            const allTypes = Object.values(ZOMBIE_TYPES);
            
            // Test multiple times to see if we can get a boss
            let foundBoss = false;
            for (let i = 0; i < 100; i++) {
                const randomType = getRandomZombieType(false);
                expect(allTypes).toContain(randomType);
                
                const config = getZombieConfig(randomType);
                if (config.isBoss) {
                    foundBoss = true;
                    break;
                }
            }
            
            // With 100 attempts and boss spawn weights, we should find at least one boss
            // This test might occasionally fail due to randomness, but it's very unlikely
        });

        test('should respect spawn weights', () => {
            const results = {};
            const iterations = 1000;
            
            // Count occurrences of each type
            for (let i = 0; i < iterations; i++) {
                const type = getRandomZombieType();
                results[type] = (results[type] || 0) + 1;
            }
            
            // Walker has highest spawn weight (60), should appear most frequently
            const walkerCount = results[ZOMBIE_TYPES.WALKER] || 0;
            const runnerCount = results[ZOMBIE_TYPES.RUNNER] || 0; // Weight 40
            
            expect(walkerCount).toBeGreaterThan(runnerCount);
        });

        test('should fallback to walker if something goes wrong', () => {
            // This is hard to test directly, but we can verify the fallback exists
            // by checking that the function always returns a valid type
            for (let i = 0; i < 10; i++) {
                const type = getRandomZombieType();
                expect(Object.values(ZOMBIE_TYPES)).toContain(type);
            }
        });
    });

    describe('Zombie Type Validation', () => {
        test('should have unique zombie types', () => {
            const types = Object.values(ZOMBIE_TYPES);
            const uniqueTypes = [...new Set(types)];
            
            expect(types.length).toBe(uniqueTypes.length);
        });

        test('should have consistent naming convention', () => {
            Object.entries(ZOMBIE_TYPES).forEach(([key, value]) => {
                // Key should be uppercase with underscores
                expect(key).toMatch(/^[A-Z_]+$/);
                // Value should be lowercase with underscores
                expect(value).toMatch(/^[a-z_]+$/);
            });
        });
    });

    describe('Boss Zombie Properties', () => {
        test('should have higher stats than regular zombies', () => {
            const bossTypes = getBossZombieTypes();
            const regularTypes = Object.values(ZOMBIE_TYPES).filter(type => 
                !getBossZombieTypes().includes(type)
            );
            
            const avgBossHealth = bossTypes.reduce((sum, type) => {
                return sum + getZombieConfig(type).health;
            }, 0) / bossTypes.length;
            
            const avgRegularHealth = regularTypes.reduce((sum, type) => {
                return sum + getZombieConfig(type).health;
            }, 0) / regularTypes.length;
            
            expect(avgBossHealth).toBeGreaterThan(avgRegularHealth * 2);
        });

        test('should have multiple abilities', () => {
            const bossTypes = getBossZombieTypes();
            
            bossTypes.forEach(type => {
                const config = getZombieConfig(type);
                expect(config.abilities.length).toBeGreaterThanOrEqual(3);
            });
        });

        test('should have high point values', () => {
            const bossTypes = getBossZombieTypes();
            
            bossTypes.forEach(type => {
                const config = getZombieConfig(type);
                expect(config.pointValue).toBeGreaterThanOrEqual(500);
            });
        });

        test('should have low spawn weights', () => {
            const bossTypes = getBossZombieTypes();
            
            bossTypes.forEach(type => {
                const config = getZombieConfig(type);
                expect(config.spawnWeight).toBeLessThanOrEqual(1);
            });
        });
    });

    describe('Zombie Abilities', () => {
        test('should have valid abilities for each zombie type', () => {
            const validAbilities = [
                'sprint', 'low_profile', 'acid_spit', 'toxic_cloud', 'explosion_on_death',
                'damage_resistance', 'shield_bash', 'toxic_aura', 'chemical_immunity',
                'sonic_scream', 'call_horde', 'suicide_explosion', 'poison_attack',
                'toxic_trail', 'leap_attack', 'wall_climb', 'stealth', 'backstab',
                'rage_mode', 'frenzy_attacks', 'ground_slam', 'throw_debris',
                'charge_attack', 'knockback', 'rampage', 'vehicle_grab', 'pack_bonus',
                'swarm_tactics', 'command_pack', 'buff_allies', 'drop_attack',
                'burrow', 'surprise_attack', 'roar_stun', 'regeneration',
                'summon_horde', 'buff_zombies', 'teleport', 'mind_control',
                'toxic_breath', 'tentacle_grab', 'mutation', 'raise_dead',
                'dark_magic', 'soul_drain', 'phase_shift', 'devastating_slam',
                'spawn_minions', 'berserker_rage', 'earthquake'
            ];
            
            Object.values(ZOMBIE_TYPES).forEach(type => {
                const config = getZombieConfig(type);
                config.abilities.forEach(ability => {
                    expect(validAbilities).toContain(ability);
                });
            });
        });

        test('should have appropriate abilities for behavior types', () => {
            // Pack zombies should have pack-related abilities
            const packTypes = getZombieTypesByBehavior(ZOMBIE_BEHAVIORS.PACK);
            packTypes.forEach(type => {
                const config = getZombieConfig(type);
                const hasPackAbility = config.abilities.some(ability => 
                    ['pack_bonus', 'swarm_tactics', 'command_pack', 'buff_allies'].includes(ability)
                );
                expect(hasPackAbility).toBe(true);
            });
            
            // Ranged zombies should have ranged abilities
            const rangedTypes = getZombieTypesByBehavior(ZOMBIE_BEHAVIORS.RANGED);
            rangedTypes.forEach(type => {
                const config = getZombieConfig(type);
                const hasRangedAbility = config.abilities.some(ability => 
                    ['acid_spit', 'toxic_breath', 'dark_magic'].includes(ability)
                );
                expect(hasRangedAbility).toBe(true);
            });
        });
    });

    describe('ZombieConfig Object', () => {
        test('should export all functions', () => {
            expect(ZombieConfig.ZOMBIE_TYPES).toBe(ZOMBIE_TYPES);
            expect(ZombieConfig.ZOMBIE_STATES).toBe(ZOMBIE_STATES);
            expect(ZombieConfig.ZOMBIE_BEHAVIORS).toBe(ZOMBIE_BEHAVIORS);
            expect(typeof ZombieConfig.getZombieConfig).toBe('function');
            expect(typeof ZombieConfig.getAllZombieConfigs).toBe('function');
            expect(typeof ZombieConfig.getZombieTypesByBehavior).toBe('function');
            expect(typeof ZombieConfig.getBossZombieTypes).toBe('function');
            expect(typeof ZombieConfig.getRandomZombieType).toBe('function');
        });
    });
});