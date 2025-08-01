/**
 * Level configuration constants and data
 */

export const ENVIRONMENT_TYPES = {
    CITY: 'city',
    HIGHWAY: 'highway',
    INDUSTRIAL: 'industrial',
    DESERT: 'desert',
    FOREST: 'forest',
    APOCALYPSE: 'apocalypse'
};

export const OBSTACLE_TYPES = {
    BUILDING: 'building',
    CAR_WRECK: 'car_wreck',
    BARRIER: 'barrier',
    DEBRIS: 'debris',
    CRATER: 'crater',
    TREE: 'tree',
    ROCK: 'rock'
};

export const LEVEL_OBJECTIVES = {
    SURVIVE_DISTANCE: 'survive_distance',
    KILL_COUNT: 'kill_count',
    TIME_LIMIT: 'time_limit',
    REACH_CHECKPOINT: 'reach_checkpoint',
    BOSS_DEFEAT: 'boss_defeat'
};

export const LEVEL_CONFIGS = {
    'level-1': {
        id: 'level-1',
        name: 'City Outskirts',
        description: 'Escape the infected city suburbs',
        environmentType: ENVIRONMENT_TYPES.CITY,
        difficulty: 1,
        unlockRequirements: {
            level: 1,
            currency: 0,
            previousLevels: []
        },
        objectives: [
            {
                type: LEVEL_OBJECTIVES.SURVIVE_DISTANCE,
                target: 1000,
                description: 'Travel 1000 meters'
            }
        ],
        terrain: {
            length: 1500,
            width: 200,
            heightVariation: 5,
            obstacleCount: 15
        },
        zombieSpawns: {
            density: 0.3,
            types: ['walker', 'crawler'],
            bossSpawns: []
        },
        rewards: {
            currency: 100,
            experience: 50
        }
    },
    'level-2': {
        id: 'level-2',
        name: 'Highway of Death',
        description: 'Navigate the zombie-filled highway',
        environmentType: ENVIRONMENT_TYPES.HIGHWAY,
        difficulty: 2,
        unlockRequirements: {
            level: 2,
            currency: 200,
            previousLevels: ['level-1']
        },
        objectives: [
            {
                type: LEVEL_OBJECTIVES.SURVIVE_DISTANCE,
                target: 2000,
                description: 'Travel 2000 meters'
            },
            {
                type: LEVEL_OBJECTIVES.KILL_COUNT,
                target: 50,
                description: 'Eliminate 50 zombies'
            }
        ],
        terrain: {
            length: 2500,
            width: 300,
            heightVariation: 8,
            obstacleCount: 25
        },
        zombieSpawns: {
            density: 0.4,
            types: ['walker', 'crawler', 'runner'],
            bossSpawns: []
        },
        rewards: {
            currency: 200,
            experience: 100
        }
    },
    'level-3': {
        id: 'level-3',
        name: 'Industrial Wasteland',
        description: 'Survive the toxic industrial zone',
        environmentType: ENVIRONMENT_TYPES.INDUSTRIAL,
        difficulty: 3,
        unlockRequirements: {
            level: 3,
            currency: 500,
            previousLevels: ['level-1', 'level-2']
        },
        objectives: [
            {
                type: LEVEL_OBJECTIVES.REACH_CHECKPOINT,
                target: 3,
                description: 'Reach 3 checkpoints'
            },
            {
                type: LEVEL_OBJECTIVES.KILL_COUNT,
                target: 75,
                description: 'Eliminate 75 zombies'
            }
        ],
        terrain: {
            length: 3000,
            width: 250,
            heightVariation: 12,
            obstacleCount: 40
        },
        zombieSpawns: {
            density: 0.5,
            types: ['walker', 'crawler', 'runner', 'spitter'],
            bossSpawns: []
        },
        rewards: {
            currency: 350,
            experience: 150
        }
    },
    'level-4': {
        id: 'level-4',
        name: 'Desert Storm',
        description: 'Cross the infected desert wasteland',
        environmentType: ENVIRONMENT_TYPES.DESERT,
        difficulty: 4,
        unlockRequirements: {
            level: 4,
            currency: 1000,
            previousLevels: ['level-1', 'level-2', 'level-3']
        },
        objectives: [
            {
                type: LEVEL_OBJECTIVES.SURVIVE_DISTANCE,
                target: 3500,
                description: 'Travel 3500 meters'
            },
            {
                type: LEVEL_OBJECTIVES.TIME_LIMIT,
                target: 300,
                description: 'Complete within 5 minutes'
            }
        ],
        terrain: {
            length: 4000,
            width: 400,
            heightVariation: 15,
            obstacleCount: 30
        },
        zombieSpawns: {
            density: 0.4,
            types: ['walker', 'runner', 'bloater'],
            bossSpawns: []
        },
        rewards: {
            currency: 500,
            experience: 200
        }
    },
    'level-5': {
        id: 'level-5',
        name: 'Forest of the Damned',
        description: 'Navigate through the infected forest',
        environmentType: ENVIRONMENT_TYPES.FOREST,
        difficulty: 5,
        unlockRequirements: {
            level: 5,
            currency: 1500,
            previousLevels: ['level-1', 'level-2', 'level-3', 'level-4']
        },
        objectives: [
            {
                type: LEVEL_OBJECTIVES.BOSS_DEFEAT,
                target: 1,
                description: 'Defeat the Forest Guardian'
            },
            {
                type: LEVEL_OBJECTIVES.KILL_COUNT,
                target: 100,
                description: 'Eliminate 100 zombies'
            }
        ],
        terrain: {
            length: 3500,
            width: 300,
            heightVariation: 20,
            obstacleCount: 60
        },
        zombieSpawns: {
            density: 0.6,
            types: ['walker', 'runner', 'crawler', 'spitter', 'bloater'],
            bossSpawns: [
                {
                    type: 'boss_tyrant',
                    position: { x: 0, z: 2800 },
                    minions: 10
                }
            ]
        },
        rewards: {
            currency: 750,
            experience: 300
        }
    },
    'level-6': {
        id: 'level-6',
        name: 'Apocalypse Ground Zero',
        description: 'Face the source of the infection',
        environmentType: ENVIRONMENT_TYPES.APOCALYPSE,
        difficulty: 6,
        unlockRequirements: {
            level: 6,
            currency: 2500,
            previousLevels: ['level-1', 'level-2', 'level-3', 'level-4', 'level-5']
        },
        objectives: [
            {
                type: LEVEL_OBJECTIVES.BOSS_DEFEAT,
                target: 2,
                description: 'Defeat 2 boss zombies'
            },
            {
                type: LEVEL_OBJECTIVES.SURVIVE_DISTANCE,
                target: 4000,
                description: 'Travel 4000 meters'
            }
        ],
        terrain: {
            length: 5000,
            width: 350,
            heightVariation: 25,
            obstacleCount: 80
        },
        zombieSpawns: {
            density: 0.8,
            types: ['walker', 'runner', 'crawler', 'spitter', 'bloater', 'armored', 'giant'],
            bossSpawns: [
                {
                    type: 'boss_horde_master',
                    position: { x: 0, z: 2000 },
                    minions: 15
                },
                {
                    type: 'boss_abomination',
                    position: { x: 0, z: 4000 },
                    minions: 20
                }
            ]
        },
        rewards: {
            currency: 1000,
            experience: 500
        }
    }
};

export const CHECKPOINT_CONFIGS = {
    'level-1': [
        { id: 'cp-1-1', position: { x: 0, z: 500 }, radius: 20 },
        { id: 'cp-1-2', position: { x: 0, z: 1000 }, radius: 20 }
    ],
    'level-2': [
        { id: 'cp-2-1', position: { x: 0, z: 800 }, radius: 25 },
        { id: 'cp-2-2', position: { x: 0, z: 1600 }, radius: 25 },
        { id: 'cp-2-3', position: { x: 0, z: 2400 }, radius: 25 }
    ],
    'level-3': [
        { id: 'cp-3-1', position: { x: 0, z: 1000 }, radius: 30 },
        { id: 'cp-3-2', position: { x: 0, z: 2000 }, radius: 30 },
        { id: 'cp-3-3', position: { x: 0, z: 3000 }, radius: 30 }
    ],
    'level-4': [
        { id: 'cp-4-1', position: { x: 0, z: 1200 }, radius: 35 },
        { id: 'cp-4-2', position: { x: 0, z: 2400 }, radius: 35 },
        { id: 'cp-4-3', position: { x: 0, z: 3600 }, radius: 35 }
    ],
    'level-5': [
        { id: 'cp-5-1', position: { x: 0, z: 1000 }, radius: 25 },
        { id: 'cp-5-2', position: { x: 0, z: 2000 }, radius: 25 },
        { id: 'cp-5-3', position: { x: 0, z: 3000 }, radius: 25 }
    ],
    'level-6': [
        { id: 'cp-6-1', position: { x: 0, z: 1500 }, radius: 40 },
        { id: 'cp-6-2', position: { x: 0, z: 3000 }, radius: 40 },
        { id: 'cp-6-3', position: { x: 0, z: 4500 }, radius: 40 }
    ]
};