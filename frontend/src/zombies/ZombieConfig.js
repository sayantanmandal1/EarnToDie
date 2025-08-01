/**
 * Zombie types enumeration
 */
export const ZOMBIE_TYPES = {
    // Basic zombies
    WALKER: 'walker',
    RUNNER: 'runner',
    CRAWLER: 'crawler',
    SPITTER: 'spitter',
    BLOATER: 'bloater',
    
    // Armored zombies
    ARMORED: 'armored',
    RIOT_ZOMBIE: 'riot_zombie',
    HAZMAT_ZOMBIE: 'hazmat_zombie',
    
    // Special ability zombies
    SCREAMER: 'screamer',
    EXPLODER: 'exploder',
    TOXIC: 'toxic',
    LEAPER: 'leaper',
    STALKER: 'stalker',
    BERSERKER: 'berserker',
    
    // Large zombies
    GIANT: 'giant',
    BRUTE: 'brute',
    HULK: 'hulk',
    
    // Swarm zombies
    SWARM: 'swarm',
    PACK_LEADER: 'pack_leader',
    
    // Environmental zombies
    CLIMBER: 'climber',
    BURROWER: 'burrower',
    
    // Boss zombies
    BOSS_TYRANT: 'boss_tyrant',
    BOSS_HORDE_MASTER: 'boss_horde_master',
    BOSS_MUTANT: 'boss_mutant',
    BOSS_NECROMANCER: 'boss_necromancer',
    BOSS_ABOMINATION: 'boss_abomination'
};

/**
 * Zombie AI states
 */
export const ZOMBIE_STATES = {
    IDLE: 'idle',
    WANDERING: 'wandering',
    CHASING: 'chasing',
    ATTACKING: 'attacking',
    STUNNED: 'stunned',
    DYING: 'dying',
    DEAD: 'dead',
    SPECIAL_ABILITY: 'special_ability'
};

/**
 * Zombie behavior types
 */
export const ZOMBIE_BEHAVIORS = {
    AGGRESSIVE: 'aggressive',
    DEFENSIVE: 'defensive',
    PACK: 'pack',
    AMBUSH: 'ambush',
    RANGED: 'ranged',
    SUPPORT: 'support'
};

/**
 * Zombie configuration data
 */
const ZOMBIE_CONFIGS = {
    [ZOMBIE_TYPES.WALKER]: {
        name: 'Walker',
        health: 50,
        maxHealth: 50,
        speed: 8,
        damage: 15,
        pointValue: 10,
        spawnWeight: 60,
        size: { width: 0.6, height: 1.8, depth: 0.4 },
        color: 0x8B4513,
        behavior: ZOMBIE_BEHAVIORS.AGGRESSIVE,
        detectionRange: 15,
        attackRange: 1.5,
        attackCooldown: 2.0,
        abilities: [],
        sounds: ['walker_moan', 'walker_attack'],
        animations: ['walk', 'attack', 'death']
    },
    
    [ZOMBIE_TYPES.RUNNER]: {
        name: 'Runner',
        health: 30,
        maxHealth: 30,
        speed: 20,
        damage: 12,
        pointValue: 15,
        spawnWeight: 40,
        size: { width: 0.6, height: 1.8, depth: 0.4 },
        color: 0x654321,
        behavior: ZOMBIE_BEHAVIORS.AGGRESSIVE,
        detectionRange: 20,
        attackRange: 1.2,
        attackCooldown: 1.5,
        abilities: ['sprint'],
        sounds: ['runner_scream', 'runner_attack'],
        animations: ['run', 'sprint', 'attack', 'death']
    },
    
    [ZOMBIE_TYPES.CRAWLER]: {
        name: 'Crawler',
        health: 25,
        maxHealth: 25,
        speed: 5,
        damage: 20,
        pointValue: 12,
        spawnWeight: 30,
        size: { width: 0.8, height: 0.5, depth: 0.6 },
        color: 0x2F4F2F,
        behavior: ZOMBIE_BEHAVIORS.AMBUSH,
        detectionRange: 10,
        attackRange: 1.0,
        attackCooldown: 1.8,
        abilities: ['low_profile'],
        sounds: ['crawler_hiss', 'crawler_attack'],
        animations: ['crawl', 'attack', 'death']
    },
    
    [ZOMBIE_TYPES.SPITTER]: {
        name: 'Spitter',
        health: 40,
        maxHealth: 40,
        speed: 6,
        damage: 25,
        pointValue: 20,
        spawnWeight: 20,
        size: { width: 0.7, height: 1.9, depth: 0.5 },
        color: 0x9ACD32,
        behavior: ZOMBIE_BEHAVIORS.RANGED,
        detectionRange: 25,
        attackRange: 8.0,
        attackCooldown: 3.0,
        abilities: ['acid_spit'],
        sounds: ['spitter_gurgle', 'spitter_spit'],
        animations: ['walk', 'spit', 'death']
    },
    
    [ZOMBIE_TYPES.BLOATER]: {
        name: 'Bloater',
        health: 80,
        maxHealth: 80,
        speed: 4,
        damage: 35,
        pointValue: 30,
        spawnWeight: 15,
        size: { width: 1.2, height: 2.0, depth: 0.8 },
        color: 0x8FBC8F,
        behavior: ZOMBIE_BEHAVIORS.DEFENSIVE,
        detectionRange: 12,
        attackRange: 2.0,
        attackCooldown: 4.0,
        abilities: ['toxic_cloud', 'explosion_on_death'],
        sounds: ['bloater_wheeze', 'bloater_explode'],
        animations: ['walk', 'attack', 'explode', 'death']
    },
    
    [ZOMBIE_TYPES.ARMORED]: {
        name: 'Armored Zombie',
        health: 120,
        maxHealth: 120,
        speed: 6,
        damage: 25,
        pointValue: 40,
        spawnWeight: 12,
        size: { width: 0.8, height: 1.9, depth: 0.6 },
        color: 0x696969,
        behavior: ZOMBIE_BEHAVIORS.AGGRESSIVE,
        detectionRange: 18,
        attackRange: 1.8,
        attackCooldown: 2.5,
        abilities: ['damage_resistance'],
        sounds: ['armored_clank', 'armored_attack'],
        animations: ['walk', 'attack', 'death'],
        armor: 0.5 // 50% damage reduction
    },
    
    [ZOMBIE_TYPES.RIOT_ZOMBIE]: {
        name: 'Riot Zombie',
        health: 150,
        maxHealth: 150,
        speed: 7,
        damage: 30,
        pointValue: 50,
        spawnWeight: 8,
        size: { width: 0.9, height: 2.0, depth: 0.7 },
        color: 0x2F2F2F,
        behavior: ZOMBIE_BEHAVIORS.AGGRESSIVE,
        detectionRange: 20,
        attackRange: 2.0,
        attackCooldown: 2.0,
        abilities: ['shield_bash', 'damage_resistance'],
        sounds: ['riot_roar', 'riot_bash'],
        animations: ['walk', 'bash', 'attack', 'death'],
        armor: 0.7 // 70% damage reduction
    },
    
    [ZOMBIE_TYPES.HAZMAT_ZOMBIE]: {
        name: 'Hazmat Zombie',
        health: 60,
        maxHealth: 60,
        speed: 8,
        damage: 20,
        pointValue: 35,
        spawnWeight: 10,
        size: { width: 0.7, height: 1.9, depth: 0.5 },
        color: 0xFFFF00,
        behavior: ZOMBIE_BEHAVIORS.AGGRESSIVE,
        detectionRange: 15,
        attackRange: 1.5,
        attackCooldown: 2.2,
        abilities: ['toxic_aura', 'chemical_immunity'],
        sounds: ['hazmat_hiss', 'hazmat_attack'],
        animations: ['walk', 'attack', 'death']
    },
    
    [ZOMBIE_TYPES.SCREAMER]: {
        name: 'Screamer',
        health: 35,
        maxHealth: 35,
        speed: 10,
        damage: 10,
        pointValue: 25,
        spawnWeight: 15,
        size: { width: 0.6, height: 1.7, depth: 0.4 },
        color: 0xDC143C,
        behavior: ZOMBIE_BEHAVIORS.SUPPORT,
        detectionRange: 30,
        attackRange: 12.0,
        attackCooldown: 8.0,
        abilities: ['sonic_scream', 'call_horde'],
        sounds: ['screamer_wail', 'screamer_scream'],
        animations: ['walk', 'scream', 'death']
    },
    
    [ZOMBIE_TYPES.EXPLODER]: {
        name: 'Exploder',
        health: 45,
        maxHealth: 45,
        speed: 12,
        damage: 60,
        pointValue: 30,
        spawnWeight: 12,
        size: { width: 0.7, height: 1.8, depth: 0.5 },
        color: 0xFF4500,
        behavior: ZOMBIE_BEHAVIORS.AGGRESSIVE,
        detectionRange: 18,
        attackRange: 3.0,
        attackCooldown: 0.5,
        abilities: ['suicide_explosion'],
        sounds: ['exploder_tick', 'exploder_boom'],
        animations: ['walk', 'explode', 'death']
    },
    
    [ZOMBIE_TYPES.TOXIC]: {
        name: 'Toxic Zombie',
        health: 55,
        maxHealth: 55,
        speed: 7,
        damage: 18,
        pointValue: 28,
        spawnWeight: 18,
        size: { width: 0.6, height: 1.8, depth: 0.4 },
        color: 0x32CD32,
        behavior: ZOMBIE_BEHAVIORS.AGGRESSIVE,
        detectionRange: 16,
        attackRange: 1.5,
        attackCooldown: 2.5,
        abilities: ['poison_attack', 'toxic_trail'],
        sounds: ['toxic_bubble', 'toxic_attack'],
        animations: ['walk', 'attack', 'death']
    },
    
    [ZOMBIE_TYPES.LEAPER]: {
        name: 'Leaper',
        health: 40,
        maxHealth: 40,
        speed: 15,
        damage: 22,
        pointValue: 25,
        spawnWeight: 20,
        size: { width: 0.5, height: 1.6, depth: 0.4 },
        color: 0x4169E1,
        behavior: ZOMBIE_BEHAVIORS.AGGRESSIVE,
        detectionRange: 22,
        attackRange: 6.0,
        attackCooldown: 3.0,
        abilities: ['leap_attack', 'wall_climb'],
        sounds: ['leaper_growl', 'leaper_leap'],
        animations: ['walk', 'leap', 'attack', 'death']
    },
    
    [ZOMBIE_TYPES.STALKER]: {
        name: 'Stalker',
        health: 65,
        maxHealth: 65,
        speed: 12,
        damage: 28,
        pointValue: 35,
        spawnWeight: 10,
        size: { width: 0.6, height: 1.8, depth: 0.4 },
        color: 0x2F2F2F,
        behavior: ZOMBIE_BEHAVIORS.AMBUSH,
        detectionRange: 25,
        attackRange: 1.8,
        attackCooldown: 2.0,
        abilities: ['stealth', 'backstab'],
        sounds: ['stalker_whisper', 'stalker_attack'],
        animations: ['walk', 'stealth', 'attack', 'death']
    },
    
    [ZOMBIE_TYPES.BERSERKER]: {
        name: 'Berserker',
        health: 90,
        maxHealth: 90,
        speed: 18,
        damage: 40,
        pointValue: 45,
        spawnWeight: 8,
        size: { width: 0.8, height: 2.0, depth: 0.6 },
        color: 0x8B0000,
        behavior: ZOMBIE_BEHAVIORS.AGGRESSIVE,
        detectionRange: 20,
        attackRange: 2.0,
        attackCooldown: 1.0,
        abilities: ['rage_mode', 'frenzy_attacks'],
        sounds: ['berserker_roar', 'berserker_attack'],
        animations: ['walk', 'rage', 'attack', 'death']
    },
    
    [ZOMBIE_TYPES.GIANT]: {
        name: 'Giant Zombie',
        health: 200,
        maxHealth: 200,
        speed: 5,
        damage: 50,
        pointValue: 60,
        spawnWeight: 5,
        size: { width: 1.5, height: 3.0, depth: 1.0 },
        color: 0x8B4513,
        behavior: ZOMBIE_BEHAVIORS.AGGRESSIVE,
        detectionRange: 25,
        attackRange: 3.0,
        attackCooldown: 3.5,
        abilities: ['ground_slam', 'throw_debris'],
        sounds: ['giant_roar', 'giant_slam'],
        animations: ['walk', 'slam', 'throw', 'death']
    },
    
    [ZOMBIE_TYPES.BRUTE]: {
        name: 'Brute',
        health: 180,
        maxHealth: 180,
        speed: 8,
        damage: 45,
        pointValue: 55,
        spawnWeight: 6,
        size: { width: 1.2, height: 2.2, depth: 0.8 },
        color: 0x556B2F,
        behavior: ZOMBIE_BEHAVIORS.AGGRESSIVE,
        detectionRange: 22,
        attackRange: 2.5,
        attackCooldown: 2.8,
        abilities: ['charge_attack', 'knockback'],
        sounds: ['brute_growl', 'brute_charge'],
        animations: ['walk', 'charge', 'attack', 'death']
    },
    
    [ZOMBIE_TYPES.HULK]: {
        name: 'Hulk Zombie',
        health: 250,
        maxHealth: 250,
        speed: 6,
        damage: 55,
        pointValue: 70,
        spawnWeight: 4,
        size: { width: 1.8, height: 2.5, depth: 1.2 },
        color: 0x228B22,
        behavior: ZOMBIE_BEHAVIORS.AGGRESSIVE,
        detectionRange: 28,
        attackRange: 3.5,
        attackCooldown: 4.0,
        abilities: ['rampage', 'vehicle_grab'],
        sounds: ['hulk_roar', 'hulk_smash'],
        animations: ['walk', 'rampage', 'grab', 'death']
    },
    
    [ZOMBIE_TYPES.SWARM]: {
        name: 'Swarm Zombie',
        health: 20,
        maxHealth: 20,
        speed: 14,
        damage: 8,
        pointValue: 5,
        spawnWeight: 50,
        size: { width: 0.4, height: 1.4, depth: 0.3 },
        color: 0x8B4513,
        behavior: ZOMBIE_BEHAVIORS.PACK,
        detectionRange: 12,
        attackRange: 1.0,
        attackCooldown: 1.0,
        abilities: ['pack_bonus', 'swarm_tactics'],
        sounds: ['swarm_chatter', 'swarm_attack'],
        animations: ['walk', 'attack', 'death']
    },
    
    [ZOMBIE_TYPES.PACK_LEADER]: {
        name: 'Pack Leader',
        health: 100,
        maxHealth: 100,
        speed: 16,
        damage: 35,
        pointValue: 50,
        spawnWeight: 3,
        size: { width: 0.8, height: 2.0, depth: 0.6 },
        color: 0x4B0082,
        behavior: ZOMBIE_BEHAVIORS.PACK,
        detectionRange: 30,
        attackRange: 2.0,
        attackCooldown: 2.0,
        abilities: ['command_pack', 'buff_allies'],
        sounds: ['leader_howl', 'leader_command'],
        animations: ['walk', 'howl', 'attack', 'death']
    },
    
    [ZOMBIE_TYPES.CLIMBER]: {
        name: 'Climber',
        health: 45,
        maxHealth: 45,
        speed: 10,
        damage: 20,
        pointValue: 22,
        spawnWeight: 15,
        size: { width: 0.5, height: 1.7, depth: 0.4 },
        color: 0x8B4513,
        behavior: ZOMBIE_BEHAVIORS.AMBUSH,
        detectionRange: 18,
        attackRange: 1.5,
        attackCooldown: 2.0,
        abilities: ['wall_climb', 'drop_attack'],
        sounds: ['climber_scratch', 'climber_drop'],
        animations: ['walk', 'climb', 'drop', 'death']
    },
    
    [ZOMBIE_TYPES.BURROWER]: {
        name: 'Burrower',
        health: 50,
        maxHealth: 50,
        speed: 8,
        damage: 25,
        pointValue: 30,
        spawnWeight: 12,
        size: { width: 0.7, height: 1.5, depth: 0.5 },
        color: 0x8B7355,
        behavior: ZOMBIE_BEHAVIORS.AMBUSH,
        detectionRange: 15,
        attackRange: 1.2,
        attackCooldown: 2.5,
        abilities: ['burrow', 'surprise_attack'],
        sounds: ['burrower_dig', 'burrower_emerge'],
        animations: ['walk', 'burrow', 'emerge', 'death']
    },
    
    // Boss Zombies
    [ZOMBIE_TYPES.BOSS_TYRANT]: {
        name: 'Tyrant',
        health: 1000,
        maxHealth: 1000,
        speed: 12,
        damage: 80,
        pointValue: 500,
        spawnWeight: 1,
        size: { width: 2.0, height: 3.5, depth: 1.5 },
        color: 0x8B0000,
        behavior: ZOMBIE_BEHAVIORS.AGGRESSIVE,
        detectionRange: 40,
        attackRange: 4.0,
        attackCooldown: 2.0,
        abilities: ['charge_attack', 'roar_stun', 'ground_slam', 'regeneration'],
        sounds: ['tyrant_roar', 'tyrant_charge', 'tyrant_slam'],
        animations: ['walk', 'charge', 'roar', 'slam', 'death'],
        isBoss: true
    },
    
    [ZOMBIE_TYPES.BOSS_HORDE_MASTER]: {
        name: 'Horde Master',
        health: 800,
        maxHealth: 800,
        speed: 10,
        damage: 60,
        pointValue: 600,
        spawnWeight: 1,
        size: { width: 1.8, height: 3.0, depth: 1.2 },
        color: 0x4B0082,
        behavior: ZOMBIE_BEHAVIORS.SUPPORT,
        detectionRange: 50,
        attackRange: 3.0,
        attackCooldown: 3.0,
        abilities: ['summon_horde', 'buff_zombies', 'teleport', 'mind_control'],
        sounds: ['horde_master_chant', 'horde_master_summon'],
        animations: ['walk', 'summon', 'teleport', 'death'],
        isBoss: true
    },
    
    [ZOMBIE_TYPES.BOSS_MUTANT]: {
        name: 'Mutant Abomination',
        health: 1200,
        maxHealth: 1200,
        speed: 8,
        damage: 100,
        pointValue: 700,
        spawnWeight: 1,
        size: { width: 2.5, height: 4.0, depth: 2.0 },
        color: 0x32CD32,
        behavior: ZOMBIE_BEHAVIORS.AGGRESSIVE,
        detectionRange: 35,
        attackRange: 5.0,
        attackCooldown: 2.5,
        abilities: ['toxic_breath', 'tentacle_grab', 'acid_spit', 'mutation'],
        sounds: ['mutant_screech', 'mutant_breath'],
        animations: ['walk', 'breath', 'grab', 'mutate', 'death'],
        isBoss: true
    },
    
    [ZOMBIE_TYPES.BOSS_NECROMANCER]: {
        name: 'Necromancer',
        health: 600,
        maxHealth: 600,
        speed: 6,
        damage: 40,
        pointValue: 800,
        spawnWeight: 1,
        size: { width: 1.5, height: 2.8, depth: 1.0 },
        color: 0x2F2F2F,
        behavior: ZOMBIE_BEHAVIORS.SUPPORT,
        detectionRange: 60,
        attackRange: 15.0,
        attackCooldown: 4.0,
        abilities: ['raise_dead', 'dark_magic', 'soul_drain', 'phase_shift'],
        sounds: ['necromancer_chant', 'necromancer_magic'],
        animations: ['walk', 'cast', 'raise', 'phase', 'death'],
        isBoss: true
    },
    
    [ZOMBIE_TYPES.BOSS_ABOMINATION]: {
        name: 'The Abomination',
        health: 1500,
        maxHealth: 1500,
        speed: 4,
        damage: 120,
        pointValue: 1000,
        spawnWeight: 1,
        size: { width: 3.0, height: 5.0, depth: 2.5 },
        color: 0x8B0000,
        behavior: ZOMBIE_BEHAVIORS.AGGRESSIVE,
        detectionRange: 45,
        attackRange: 6.0,
        attackCooldown: 3.0,
        abilities: ['devastating_slam', 'spawn_minions', 'berserker_rage', 'earthquake'],
        sounds: ['abomination_roar', 'abomination_slam'],
        animations: ['walk', 'slam', 'spawn', 'rage', 'death'],
        isBoss: true
    }
};

/**
 * Get zombie configuration by type
 */
export function getZombieConfig(type) {
    const config = ZOMBIE_CONFIGS[type];
    if (!config) {
        console.warn(`Unknown zombie type: ${type}`);
        return null;
    }
    
    // Return a deep copy to prevent modification of the original config
    return JSON.parse(JSON.stringify(config));
}

/**
 * Get all zombie configurations
 */
export function getAllZombieConfigs() {
    return Object.keys(ZOMBIE_CONFIGS).map(type => ({
        type,
        ...getZombieConfig(type)
    }));
}

/**
 * Get zombie types by behavior
 */
export function getZombieTypesByBehavior(behavior) {
    return Object.entries(ZOMBIE_CONFIGS)
        .filter(([type, config]) => config.behavior === behavior)
        .map(([type, config]) => type);
}

/**
 * Get boss zombie types
 */
export function getBossZombieTypes() {
    return Object.entries(ZOMBIE_CONFIGS)
        .filter(([type, config]) => config.isBoss)
        .map(([type, config]) => type);
}

/**
 * Get random zombie type based on spawn weights
 */
export function getRandomZombieType(excludeBosses = true) {
    const availableTypes = Object.entries(ZOMBIE_CONFIGS)
        .filter(([type, config]) => !excludeBosses || !config.isBoss);
    
    const totalWeight = availableTypes.reduce((sum, [type, config]) => sum + config.spawnWeight, 0);
    let random = Math.random() * totalWeight;
    
    for (const [type, config] of availableTypes) {
        random -= config.spawnWeight;
        if (random <= 0) {
            return type;
        }
    }
    
    // Fallback to walker if something goes wrong
    return ZOMBIE_TYPES.WALKER;
}

/**
 * Zombie configuration export
 */
export const ZombieConfig = {
    ZOMBIE_TYPES,
    ZOMBIE_STATES,
    ZOMBIE_BEHAVIORS,
    getZombieConfig,
    getAllZombieConfigs,
    getZombieTypesByBehavior,
    getBossZombieTypes,
    getRandomZombieType
};