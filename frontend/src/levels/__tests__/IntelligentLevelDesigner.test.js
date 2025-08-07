/**
 * Intelligent Level Designer Test Suite
 * 
 * Comprehensive tests for the intelligent level design system,
 * including objective generation, reward distribution, secret areas,
 * and checkpoint management.
 */

import IntelligentLevelDesigner, { RewardSystem, SecretAreaGenerator, CheckpointManager } from '../IntelligentLevelDesigner';

// Mock terrain data for testing
const createMockTerrainData = () => ({
    bounds: { minX: -500, maxX: 500, minZ: -500, maxZ: 500 },
    biomes: new Map([
        ['0,0', 'city'],
        ['1,0', 'forest'],
        ['0,1', 'desert']
    ]),
    features: [
        { type: 'building', position: { x: 100, y: 0, z: 100 } },
        { type: 'tree', position: { x: -100, y: 0, z: -100 } }
    ]
});

// Mock player progress for testing
const createMockPlayerProgress = () => ({
    level: 5,
    totalScore: 2500,
    zombiesKilled: 150,
    distanceTraveled: 5000,
    objectivesCompleted: 12,
    secretsFound: 3,
    averageCompletionTime: 240,
    skillRating: 0.6,
    preferredPlayStyle: 'balanced'
});

describe('IntelligentLevelDesigner', () => {
    let levelDesigner;
    let mockPlayerProgress;
    let mockTerrainData;
    
    beforeEach(() => {
        levelDesigner = new IntelligentLevelDesigner({
            maxObjectives: 4,
            secretAreaChance: 0.5,
            bonusObjectiveChance: 0.6
        });
        
        mockPlayerProgress = createMockPlayerProgress();
        mockTerrainData = createMockTerrainData();
        
        // Mock console.log to reduce test output
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    
    afterEach(() => {
        jest.restoreAllMocks();
    });
    
    describe('Initialization', () => {
        test('should initialize with default options', () => {
            const designer = new IntelligentLevelDesigner();
            
            expect(designer.options.maxObjectives).toBe(5);
            expect(designer.options.secretAreaChance).toBe(0.3);
            expect(designer.options.bonusObjectiveChance).toBe(0.4);
            expect(designer.options.rewardScaling).toBe(1.0);
        });
        
        test('should initialize with custom options', () => {
            const options = {
                maxObjectives: 3,
                secretAreaChance: 0.8,
                rewardScaling: 1.5
            };
            
            const designer = new IntelligentLevelDesigner(options);
            
            expect(designer.options.maxObjectives).toBe(3);
            expect(designer.options.secretAreaChance).toBe(0.8);
            expect(designer.options.rewardScaling).toBe(1.5);
        });
        
        test('should initialize objective templates', () => {
            expect(levelDesigner.objectiveTemplates.size).toBeGreaterThan(0);
            expect(levelDesigner.objectiveTemplates.has('survival')).toBe(true);
            expect(levelDesigner.objectiveTemplates.has('elimination')).toBe(true);
            expect(levelDesigner.objectiveTemplates.has('collection')).toBe(true);
            expect(levelDesigner.objectiveTemplates.has('escort')).toBe(true);
            expect(levelDesigner.objectiveTemplates.has('exploration')).toBe(true);
        });
        
        test('should initialize subsystems', () => {
            expect(levelDesigner.rewardSystem).toBeInstanceOf(RewardSystem);
            expect(levelDesigner.secretAreaGenerator).toBeInstanceOf(SecretAreaGenerator);
            expect(levelDesigner.checkpointManager).toBeInstanceOf(CheckpointManager);
        });
    });
    
    describe('Level Generation', () => {
        test('should generate a complete level', () => {
            const level = levelDesigner.generateLevel(mockPlayerProgress, mockTerrainData, 1.5);
            
            expect(level).toHaveProperty('id');
            expect(level).toHaveProperty('difficulty');
            expect(level).toHaveProperty('objectives');
            expect(level).toHaveProperty('secretAreas');
            expect(level).toHaveProperty('checkpoints');
            expect(level).toHaveProperty('rewards');
            expect(level).toHaveProperty('estimatedDuration');
            expect(level).toHaveProperty('metadata');
            
            expect(level.difficulty).toBe(1.5);
            expect(level.playerLevel).toBe(mockPlayerProgress.level);
        });
        
        test('should generate appropriate number of objectives', () => {
            const level = levelDesigner.generateLevel(mockPlayerProgress, mockTerrainData, 1.0);
            
            expect(level.objectives.primary.length).toBeGreaterThan(0);
            expect(level.objectives.primary.length).toBeLessThanOrEqual(levelDesigner.options.maxObjectives);
            expect(level.objectives.total).toBe(level.objectives.primary.length + level.objectives.bonus.length);
        });
        
        test('should scale objectives with difficulty', () => {
            const easyLevel = levelDesigner.generateLevel(mockPlayerProgress, mockTerrainData, 0.5);
            const hardLevel = levelDesigner.generateLevel(mockPlayerProgress, mockTerrainData, 2.5);
            
            expect(hardLevel.objectives.primary.length).toBeGreaterThanOrEqual(easyLevel.objectives.primary.length);
        });
        
        test('should include metadata about generation', () => {
            const level = levelDesigner.generateLevel(mockPlayerProgress, mockTerrainData, 1.0);
            
            expect(level.metadata).toHaveProperty('generatedAt');
            expect(level.metadata).toHaveProperty('playerSkillRating');
            expect(level.metadata).toHaveProperty('preferredPlayStyle');
            expect(level.metadata).toHaveProperty('adaptations');
            
            expect(level.metadata.playerSkillRating).toBe(mockPlayerProgress.skillRating);
            expect(level.metadata.preferredPlayStyle).toBe(mockPlayerProgress.preferredPlayStyle);
        });
    });
    
    describe('Objective Generation', () => {
        test('should generate primary objectives', () => {
            const objectives = levelDesigner.generatePrimaryObjectives(1.0);
            
            expect(objectives.length).toBeGreaterThan(0);
            
            objectives.forEach(objective => {
                expect(objective).toHaveProperty('id');
                expect(objective).toHaveProperty('type');
                expect(objective).toHaveProperty('category');
                expect(objective).toHaveProperty('name');
                expect(objective).toHaveProperty('description');
                expect(objective).toHaveProperty('difficulty');
                expect(objective).toHaveProperty('reward');
                expect(objective).toHaveProperty('parameters');
                expect(objective).toHaveProperty('status');
                
                expect(objective.category).toBe('primary');
                expect(objective.status).toBe('pending');
                expect(objective.reward).toBeGreaterThan(0);
            });
        });
        
        test('should generate bonus objectives', () => {
            // Set high chance to ensure bonus objectives are generated
            levelDesigner.options.bonusObjectiveChance = 1.0;
            
            const objectives = levelDesigner.generateBonusObjectives(1.0);
            
            expect(objectives.length).toBeGreaterThan(0);
            
            objectives.forEach(objective => {
                expect(objective.category).toBe('bonus');
                expect(objective.optional).toBe(true);
                expect(objective.reward).toBeGreaterThan(0);
            });
        });
        
        test('should create objectives with proper structure', () => {
            const objective = levelDesigner.createObjective('survival', 1.0, 'primary');
            
            expect(objective).toHaveProperty('id');
            expect(objective).toHaveProperty('type');
            expect(objective).toHaveProperty('name');
            expect(objective).toHaveProperty('description');
            expect(objective).toHaveProperty('difficulty');
            expect(objective).toHaveProperty('reward');
            expect(objective).toHaveProperty('parameters');
            expect(objective).toHaveProperty('maxProgress');
            expect(objective).toHaveProperty('requirements');
            expect(objective).toHaveProperty('hints');
            
            expect(objective.type).toBe('survival');
            expect(objective.difficulty).toBeGreaterThan(0);
            expect(objective.reward).toBeGreaterThan(0);
            expect(Array.isArray(objective.hints)).toBe(true);
        });
        
        test('should scale objective difficulty and rewards', () => {
            const easyObjective = levelDesigner.createObjective('elimination', 0.5, 'primary');
            const hardObjective = levelDesigner.createObjective('elimination', 2.0, 'primary');
            
            expect(hardObjective.difficulty).toBeGreaterThan(easyObjective.difficulty);
            expect(hardObjective.reward).toBeGreaterThan(easyObjective.reward);
        });
        
        test('should generate appropriate parameters for objectives', () => {
            const survivalObjective = levelDesigner.createObjective('survival', 1.0, 'primary');
            const eliminationObjective = levelDesigner.createObjective('elimination', 1.0, 'primary');
            
            // Survival objectives should have duration or waves
            expect(survivalObjective.parameters.duration || survivalObjective.parameters.waves).toBeDefined();
            
            // Elimination objectives should have count
            expect(eliminationObjective.parameters.count).toBeDefined();
            expect(eliminationObjective.parameters.count).toBeGreaterThan(0);
        });
    });
    
    describe('Player Progress Analysis', () => {
        test('should calculate skill rating correctly', () => {
            const highSkillProgress = {
                ...mockPlayerProgress,
                objectivesCompleted: 20,
                zombiesKilled: 500,
                distanceTraveled: 2000,
                secretsFound: 10
            };
            
            levelDesigner.updatePlayerProgress(highSkillProgress);
            expect(levelDesigner.playerProgress.skillRating).toBeGreaterThan(0.5);
        });
        
        test('should analyze play style correctly', () => {
            const aggressiveProgress = {
                ...mockPlayerProgress,
                zombiesKilled: 1000,
                distanceTraveled: 2000,
                averageCompletionTime: 120
            };
            
            levelDesigner.updatePlayerProgress(aggressiveProgress);
            expect(['aggressive', 'speedrun']).toContain(levelDesigner.playerProgress.preferredPlayStyle);
        });
        
        test('should detect explorer play style', () => {
            const explorerProgress = {
                ...mockPlayerProgress,
                secretsFound: 15,
                averageCompletionTime: 400
            };
            
            levelDesigner.updatePlayerProgress(explorerProgress);
            expect(levelDesigner.playerProgress.preferredPlayStyle).toBe('explorer');
        });
    });
    
    describe('Objective Type Selection', () => {
        test('should select appropriate types for aggressive players', () => {
            levelDesigner.playerProgress.preferredPlayStyle = 'aggressive';
            
            const types = levelDesigner.selectObjectiveTypes(['survival', 'elimination', 'collection'], 3);
            
            expect(types).toContain('elimination');
            expect(types.filter(type => type === 'elimination').length).toBeGreaterThan(0);
        });
        
        test('should select appropriate types for explorers', () => {
            levelDesigner.playerProgress.preferredPlayStyle = 'explorer';
            
            const types = levelDesigner.selectObjectiveTypes(['exploration', 'collection', 'survival'], 3);
            
            expect(types).toContain('exploration');
        });
        
        test('should ensure variety in objective types', () => {
            const types = levelDesigner.selectObjectiveTypes(
                ['survival', 'elimination', 'collection', 'escort', 'exploration'], 
                4
            );
            
            const uniqueTypes = new Set(types);
            expect(uniqueTypes.size).toBeGreaterThan(1); // Should have variety
        });
    });
    
    describe('Reward Distribution', () => {
        test('should calculate reward distribution correctly', () => {
            const primaryObjectives = [
                { reward: 100 },
                { reward: 150 }
            ];
            const bonusObjectives = [
                { reward: 80 }
            ];
            const secretAreas = [
                { reward: 120 }
            ];
            
            const distribution = levelDesigner.calculateRewardDistribution(
                primaryObjectives, bonusObjectives, secretAreas
            );
            
            expect(distribution.primary.total).toBe(250);
            expect(distribution.bonus.total).toBe(80);
            expect(distribution.secret.total).toBe(120);
            expect(distribution.total).toBe(450);
            
            expect(distribution.primary.percentage).toBeCloseTo(55.6, 1);
            expect(distribution.bonus.percentage).toBeCloseTo(17.8, 1);
            expect(distribution.secret.percentage).toBeCloseTo(26.7, 1);
        });
        
        test('should identify reward balance correctly', () => {
            const primaryHeavy = levelDesigner.calculateRewardBalance(800, 100, 100);
            const bonusHeavy = levelDesigner.calculateRewardBalance(300, 500, 200);
            const balanced = levelDesigner.calculateRewardBalance(400, 300, 200);
            
            expect(primaryHeavy).toBe('primary_heavy');
            expect(bonusHeavy).toBe('bonus_heavy');
            expect(balanced).toBe('balanced');
        });
    });
    
    describe('Duration Estimation', () => {
        test('should estimate level duration correctly', () => {
            const primaryObjectives = [
                { type: 'survival', parameters: { duration: 60 } },
                { type: 'elimination', parameters: { count: 20 } }
            ];
            const bonusObjectives = [
                { type: 'collection', parameters: { amount: 5 } }
            ];
            
            const duration = levelDesigner.calculateEstimatedDuration(primaryObjectives, bonusObjectives);
            
            expect(duration).toBeGreaterThan(0);
            expect(duration).toBeLessThan(1000); // Reasonable upper bound
        });
        
        test('should account for objective complexity', () => {
            const simpleObjectives = [
                { type: 'collection', parameters: { amount: 2 } }
            ];
            const complexObjectives = [
                { type: 'escort', parameters: { distance: 2000 } },
                { type: 'survival', parameters: { duration: 120 } }
            ];
            
            const simpleDuration = levelDesigner.calculateEstimatedDuration(simpleObjectives, []);
            const complexDuration = levelDesigner.calculateEstimatedDuration(complexObjectives, []);
            
            expect(complexDuration).toBeGreaterThan(simpleDuration);
        });
    });
    
    describe('Adaptations', () => {
        test('should generate adaptations for high skill players', () => {
            levelDesigner.playerProgress.skillRating = 0.8;
            
            const adaptations = levelDesigner.getAdaptations(2.0);
            
            expect(adaptations).toContain('increased_zombie_aggression');
            expect(adaptations).toContain('reduced_resource_spawns');
        });
        
        test('should generate adaptations for low skill players', () => {
            levelDesigner.playerProgress.skillRating = 0.2;
            
            const adaptations = levelDesigner.getAdaptations(1.0);
            
            expect(adaptations).toContain('additional_health_pickups');
            expect(adaptations).toContain('extended_time_limits');
        });
        
        test('should generate adaptations for explorers', () => {
            levelDesigner.playerProgress.preferredPlayStyle = 'explorer';
            
            const adaptations = levelDesigner.getAdaptations(1.0);
            
            expect(adaptations).toContain('additional_secret_areas');
            expect(adaptations).toContain('exploration_bonuses');
        });
    });
    
    describe('Statistics Tracking', () => {
        test('should track level generation statistics', () => {
            const initialStats = levelDesigner.getLevelStats();
            
            levelDesigner.generateLevel(mockPlayerProgress, mockTerrainData, 1.0);
            
            const updatedStats = levelDesigner.getLevelStats();
            
            expect(updatedStats.objectivesGenerated).toBeGreaterThan(initialStats.objectivesGenerated);
        });
        
        test('should provide player progress information', () => {
            levelDesigner.updatePlayerProgress(mockPlayerProgress);
            
            const progress = levelDesigner.getPlayerProgress();
            
            expect(progress.level).toBe(mockPlayerProgress.level);
            expect(progress.skillRating).toBeDefined();
            expect(progress.preferredPlayStyle).toBeDefined();
        });
    });
});

describe('RewardSystem', () => {
    let rewardSystem;
    
    beforeEach(() => {
        rewardSystem = new RewardSystem();
    });
    
    describe('Reward Calculation', () => {
        test('should calculate rewards with difficulty scaling', () => {
            const baseReward = 100;
            const easyReward = rewardSystem.calculateReward(baseReward, 0.5);
            const hardReward = rewardSystem.calculateReward(baseReward, 2.0);
            
            expect(hardReward).toBeGreaterThan(easyReward);
            expect(easyReward).toBeGreaterThan(0);
        });
        
        test('should apply bonus multipliers correctly', () => {
            const baseReward = 100;
            const normalReward = rewardSystem.calculateReward(baseReward, 1.0);
            const bonusReward = rewardSystem.calculateReward(baseReward, 1.0, ['perfect_completion']);
            
            expect(bonusReward).toBeGreaterThan(normalReward);
            expect(bonusReward).toBe(Math.floor(normalReward * 1.5));
        });
        
        test('should stack multiple bonuses', () => {
            const baseReward = 100;
            const singleBonus = rewardSystem.calculateReward(baseReward, 1.0, ['speed_bonus']);
            const multiBonus = rewardSystem.calculateReward(baseReward, 1.0, ['speed_bonus', 'no_damage']);
            
            expect(multiBonus).toBeGreaterThan(singleBonus);
        });
    });
    
    describe('Reward Package Generation', () => {
        test('should generate reward packages with appropriate distribution', () => {
            const rewardPackage = rewardSystem.generateRewardPackage(500, 5);
            
            expect(rewardPackage).toHaveProperty('currency');
            expect(rewardPackage).toHaveProperty('experience');
            expect(rewardPackage).toHaveProperty('items');
            expect(rewardPackage).toHaveProperty('upgrades');
            
            expect(rewardPackage.currency).toBeGreaterThan(0);
            expect(rewardPackage.experience).toBeGreaterThan(0);
            expect(Array.isArray(rewardPackage.items)).toBe(true);
            expect(Array.isArray(rewardPackage.upgrades)).toBe(true);
        });
        
        test('should include items for high value rewards', () => {
            const lowValuePackage = rewardSystem.generateRewardPackage(100, 1);
            const highValuePackage = rewardSystem.generateRewardPackage(600, 5);
            
            expect(highValuePackage.items.length).toBeGreaterThanOrEqual(lowValuePackage.items.length);
            expect(highValuePackage.upgrades.length).toBeGreaterThan(0);
        });
    });
});

describe('SecretAreaGenerator', () => {
    let secretGenerator;
    let mockTerrainData;
    let mockPlayerProgress;
    
    beforeEach(() => {
        secretGenerator = new SecretAreaGenerator();
        mockTerrainData = createMockTerrainData();
        mockPlayerProgress = createMockPlayerProgress();
    });
    
    describe('Secret Area Generation', () => {
        test('should generate secret areas with proper structure', () => {
            const secretArea = secretGenerator.generateSecretArea(mockTerrainData, 1.0, mockPlayerProgress);
            
            if (secretArea) {
                expect(secretArea).toHaveProperty('id');
                expect(secretArea).toHaveProperty('name');
                expect(secretArea).toHaveProperty('type');
                expect(secretArea).toHaveProperty('description');
                expect(secretArea).toHaveProperty('location');
                expect(secretArea).toHaveProperty('difficulty');
                expect(secretArea).toHaveProperty('reward');
                expect(secretArea).toHaveProperty('requirements');
                expect(secretArea).toHaveProperty('hints');
                expect(secretArea).toHaveProperty('contents');
                
                expect(secretArea.discovered).toBe(false);
                expect(secretArea.accessed).toBe(false);
                expect(secretArea.reward).toBeGreaterThan(0);
                expect(Array.isArray(secretArea.requirements)).toBe(true);
                expect(Array.isArray(secretArea.hints)).toBe(true);
            }
        });
        
        test('should scale difficulty and rewards appropriately', () => {
            const easySecret = secretGenerator.generateSecretArea(mockTerrainData, 0.5, mockPlayerProgress);
            const hardSecret = secretGenerator.generateSecretArea(mockTerrainData, 2.0, mockPlayerProgress);
            
            if (easySecret && hardSecret) {
                expect(hardSecret.difficulty).toBeGreaterThan(easySecret.difficulty);
                expect(hardSecret.reward).toBeGreaterThan(easySecret.reward);
            }
        });
        
        test('should generate appropriate contents for different secret types', () => {
            // Generate multiple secrets to test different types
            const secrets = [];
            for (let i = 0; i < 10; i++) {
                const secret = secretGenerator.generateSecretArea(mockTerrainData, 1.0, mockPlayerProgress);
                if (secret) secrets.push(secret);
            }
            
            secrets.forEach(secret => {
                expect(secret.contents).toHaveProperty('currency');
                expect(secret.contents).toHaveProperty('items');
                expect(secret.contents.currency).toBeGreaterThan(0);
                expect(Array.isArray(secret.contents.items)).toBe(true);
            });
        });
    });
    
    describe('Secret Requirements', () => {
        test('should generate type-appropriate requirements', () => {
            const cacheType = { type: 'cache' };
            const bunkerType = { type: 'bunker' };
            
            const cacheRequirements = secretGenerator.generateSecretRequirements(cacheType, 1.0);
            const bunkerRequirements = secretGenerator.generateSecretRequirements(bunkerType, 1.0);
            
            expect(cacheRequirements[0].type).toBe('exploration');
            expect(bunkerRequirements[0].type).toBe('combat');
        });
    });
});

describe('CheckpointManager', () => {
    let checkpointManager;
    let mockTerrainData;
    let mockObjectives;
    
    beforeEach(() => {
        checkpointManager = new CheckpointManager();
        mockTerrainData = createMockTerrainData();
        mockObjectives = [
            { location: { x: 100, y: 0, z: 100 }, difficulty: 0.5 },
            { location: { x: -100, y: 0, z: -100 }, difficulty: 0.8 },
            { location: { x: 200, y: 0, z: 200 }, difficulty: 0.6 }
        ];
    });
    
    describe('Checkpoint Generation', () => {
        test('should generate checkpoints with proper structure', () => {
            const checkpoints = checkpointManager.generateCheckpoints(mockTerrainData, mockObjectives);
            
            expect(checkpoints.length).toBeGreaterThan(0);
            
            checkpoints.forEach(checkpoint => {
                expect(checkpoint).toHaveProperty('id');
                expect(checkpoint).toHaveProperty('type');
                expect(checkpoint).toHaveProperty('name');
                expect(checkpoint).toHaveProperty('location');
                expect(checkpoint).toHaveProperty('radius');
                expect(checkpoint).toHaveProperty('protection');
                expect(checkpoint).toHaveProperty('services');
                expect(checkpoint).toHaveProperty('purpose');
                
                expect(checkpoint.activated).toBe(false);
                expect(checkpoint.discovered).toBe(false);
                expect(Array.isArray(checkpoint.services)).toBe(true);
            });
        });
        
        test('should always include start and end checkpoints', () => {
            const checkpoints = checkpointManager.generateCheckpoints(mockTerrainData, mockObjectives);
            
            const startCheckpoint = checkpoints.find(cp => cp.purpose === 'start');
            const endCheckpoint = checkpoints.find(cp => cp.purpose === 'end');
            
            expect(startCheckpoint).toBeDefined();
            expect(endCheckpoint).toBeDefined();
            expect(startCheckpoint.type).toBe('safe_zone');
            expect(endCheckpoint.type).toBe('safe_zone');
        });
        
        test('should place checkpoints based on objectives', () => {
            const checkpoints = checkpointManager.generateCheckpoints(mockTerrainData, mockObjectives);
            
            // Should have at least start and end checkpoints
            expect(checkpoints.length).toBeGreaterThanOrEqual(2);
        });
    });
    
    describe('Checkpoint Services', () => {
        test('should provide appropriate services for checkpoint types', () => {
            const safeZone = checkpointManager.createCheckpoint('safe_zone', { x: 0, y: 0, z: 0 }, 'test');
            const outpost = checkpointManager.createCheckpoint('outpost', { x: 0, y: 0, z: 0 }, 'test');
            const waypoint = checkpointManager.createCheckpoint('waypoint', { x: 0, y: 0, z: 0 }, 'test');
            
            expect(safeZone.services).toContain('repair');
            expect(safeZone.services).toContain('refuel');
            expect(safeZone.services).toContain('save');
            expect(safeZone.protection).toBe(true);
            
            expect(outpost.services).toContain('save');
            expect(outpost.services).toContain('trade');
            expect(outpost.protection).toBe(false);
            
            expect(waypoint.services).toContain('save');
            expect(waypoint.protection).toBe(false);
        });
    });
    
    describe('Checkpoint Activation', () => {
        test('should activate checkpoints correctly', () => {
            const result = checkpointManager.activateCheckpoint('test_checkpoint', { playerId: 'test' });
            
            expect(result.success).toBe(true);
            expect(result.saveId).toBeDefined();
            expect(result.timestamp).toBeDefined();
        });
        
        test('should provide available services', () => {
            const services = checkpointManager.getAvailableServices('test_checkpoint');
            
            expect(Array.isArray(services)).toBe(true);
            expect(services.length).toBeGreaterThan(0);
        });
    });
});

describe('Integration Tests', () => {
    let levelDesigner;
    let mockPlayerProgress;
    let mockTerrainData;
    
    beforeEach(() => {
        levelDesigner = new IntelligentLevelDesigner();
        mockPlayerProgress = createMockPlayerProgress();
        mockTerrainData = createMockTerrainData();
        
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });
    
    afterEach(() => {
        jest.restoreAllMocks();
    });
    
    describe('Complete Level Generation Flow', () => {
        test('should generate consistent levels for same parameters', () => {
            const level1 = levelDesigner.generateLevel(mockPlayerProgress, mockTerrainData, 1.0);
            const level2 = levelDesigner.generateLevel(mockPlayerProgress, mockTerrainData, 1.0);
            
            // Should have similar structure but different content
            expect(level1.difficulty).toBe(level2.difficulty);
            expect(level1.playerLevel).toBe(level2.playerLevel);
        });
        
        test('should adapt to different player skill levels', () => {
            const noviceProgress = { ...mockPlayerProgress, skillRating: 0.2 };
            const expertProgress = { ...mockPlayerProgress, skillRating: 0.9 };
            
            const noviceLevel = levelDesigner.generateLevel(noviceProgress, mockTerrainData, 1.0);
            const expertLevel = levelDesigner.generateLevel(expertProgress, mockTerrainData, 1.0);
            
            expect(noviceLevel.metadata.adaptations).toContain('additional_health_pickups');
            expect(expertLevel.metadata.adaptations).toContain('increased_zombie_aggression');
        });
        
        test('should create balanced reward distribution', () => {
            const level = levelDesigner.generateLevel(mockPlayerProgress, mockTerrainData, 1.5);
            
            expect(level.rewards.total).toBeGreaterThan(0);
            expect(level.rewards.primary.percentage).toBeGreaterThan(0);
            expect(level.rewards.balance).toBeDefined();
        });
    });
    
    describe('Player Style Adaptation', () => {
        test('should adapt objectives for aggressive players', () => {
            const aggressiveProgress = { ...mockPlayerProgress, preferredPlayStyle: 'aggressive' };
            const level = levelDesigner.generateLevel(aggressiveProgress, mockTerrainData, 1.0);
            
            const eliminationObjectives = level.objectives.primary.filter(obj => obj.type === 'elimination');
            expect(eliminationObjectives.length).toBeGreaterThan(0);
        });
        
        test('should adapt objectives for explorer players', () => {
            const explorerProgress = { ...mockPlayerProgress, preferredPlayStyle: 'explorer' };
            const level = levelDesigner.generateLevel(explorerProgress, mockTerrainData, 1.0);
            
            expect(level.metadata.adaptations).toContain('additional_secret_areas');
            expect(level.secretAreas.length).toBeGreaterThanOrEqual(0);
        });
    });
});