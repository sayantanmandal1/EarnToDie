/**
 * Intelligent Level Design System
 * 
 * Creates objective generation based on player progress, implements balanced
 * reward distribution, adds secret areas and bonus objectives, and integrates
 * with checkpoint and save systems.
 * 
 * Features:
 * - Dynamic objective generation based on player skill and progress
 * - Balanced reward distribution with risk/reward mechanics
 * - Secret areas and bonus objectives for exploration
 * - Checkpoint and save system integration
 * - Adaptive level difficulty scaling
 */

class IntelligentLevelDesigner {
    constructor(options = {}) {
        this.options = {
            maxObjectives: options.maxObjectives || 5,
            secretAreaChance: options.secretAreaChance || 0.3,
            bonusObjectiveChance: options.bonusObjectiveChance || 0.4,
            rewardScaling: options.rewardScaling || 1.0,
            difficultyProgression: options.difficultyProgression || 1.2,
            ...options
        };
        
        // Player progress tracking
        this.playerProgress = {
            level: 1,
            totalScore: 0,
            zombiesKilled: 0,
            distanceTraveled: 0,
            objectivesCompleted: 0,
            secretsFound: 0,
            averageCompletionTime: 0,
            skillRating: 0.5, // 0-1 scale
            preferredPlayStyle: 'balanced' // aggressive, defensive, explorer, speedrun
        };
        
        // Objective templates
        this.objectiveTemplates = new Map();
        this.initializeObjectiveTemplates();
        
        // Reward system
        this.rewardSystem = new RewardSystem();
        
        // Secret area generator
        this.secretAreaGenerator = new SecretAreaGenerator();
        
        // Checkpoint integration
        this.checkpointManager = new CheckpointManager();
        
        // Level statistics
        this.levelStats = {
            objectivesGenerated: 0,
            secretAreasCreated: 0,
            bonusObjectivesCreated: 0,
            averageDifficulty: 0,
            playerSatisfactionScore: 0
        };
        
        console.log('🎯 Intelligent Level Designer initialized');
    }
    
    initializeObjectiveTemplates() {
        // Survival Objectives
        this.objectiveTemplates.set('survival', {
            name: 'Survival Challenge',
            type: 'survival',
            description: 'Survive for a specified duration',
            difficulty: 0.6,
            baseReward: 100,
            variants: [
                {
                    id: 'survive_time',
                    name: 'Survive the Onslaught',
                    description: 'Survive for {duration} seconds',
                    parameters: { duration: [30, 60, 90, 120] },
                    scalingFactor: 1.5
                },
                {
                    id: 'survive_waves',
                    name: 'Withstand the Waves',
                    description: 'Survive {waves} waves of zombies',
                    parameters: { waves: [3, 5, 7, 10] },
                    scalingFactor: 1.3
                }
            ]
        });
        
        // Elimination Objectives
        this.objectiveTemplates.set('elimination', {
            name: 'Elimination Mission',
            type: 'elimination',
            description: 'Eliminate specified targets',
            difficulty: 0.7,
            baseReward: 150,
            variants: [
                {
                    id: 'kill_count',
                    name: 'Zombie Extermination',
                    description: 'Kill {count} zombies',
                    parameters: { count: [10, 25, 50, 100] },
                    scalingFactor: 1.2
                },
                {
                    id: 'kill_type',
                    name: 'Specialized Hunt',
                    description: 'Kill {count} {type} zombies',
                    parameters: { 
                        count: [5, 10, 15, 20],
                        type: ['fast', 'heavy', 'special', 'boss']
                    },
                    scalingFactor: 1.8
                }
            ]
        });
        
        // Collection Objectives
        this.objectiveTemplates.set('collection', {
            name: 'Collection Mission',
            type: 'collection',
            description: 'Collect specified items',
            difficulty: 0.4,
            baseReward: 80,
            variants: [
                {
                    id: 'collect_fuel',
                    name: 'Fuel Run',
                    description: 'Collect {amount} fuel canisters',
                    parameters: { amount: [3, 5, 8, 12] },
                    scalingFactor: 1.1
                },
                {
                    id: 'collect_parts',
                    name: 'Scavenger Hunt',
                    description: 'Collect {amount} vehicle parts',
                    parameters: { amount: [2, 4, 6, 10] },
                    scalingFactor: 1.4
                }
            ]
        });
        
        // Escort Objectives
        this.objectiveTemplates.set('escort', {
            name: 'Escort Mission',
            type: 'escort',
            description: 'Protect and escort targets',
            difficulty: 0.8,
            baseReward: 200,
            variants: [
                {
                    id: 'escort_survivor',
                    name: 'Survivor Rescue',
                    description: 'Escort {count} survivors to safety',
                    parameters: { count: [1, 2, 3, 5] },
                    scalingFactor: 1.6
                },
                {
                    id: 'escort_convoy',
                    name: 'Convoy Protection',
                    description: 'Protect convoy for {distance}m',
                    parameters: { distance: [500, 1000, 1500, 2000] },
                    scalingFactor: 1.4
                }
            ]
        });
        
        // Exploration Objectives
        this.objectiveTemplates.set('exploration', {
            name: 'Exploration Mission',
            type: 'exploration',
            description: 'Explore and discover locations',
            difficulty: 0.5,
            baseReward: 120,
            variants: [
                {
                    id: 'explore_area',
                    name: 'Area Reconnaissance',
                    description: 'Explore {percentage}% of the area',
                    parameters: { percentage: [60, 75, 85, 95] },
                    scalingFactor: 1.2
                },
                {
                    id: 'find_locations',
                    name: 'Location Discovery',
                    description: 'Discover {count} hidden locations',
                    parameters: { count: [2, 3, 5, 7] },
                    scalingFactor: 1.5
                }
            ]
        });
    }
    
    generateLevel(playerProgress, terrainData, difficultyLevel = 1.0) {
        console.log(`🎯 Generating level for player level ${playerProgress.level} at difficulty ${difficultyLevel}`);
        
        // Update player progress
        this.updatePlayerProgress(playerProgress);
        
        // Generate primary objectives
        const primaryObjectives = this.generatePrimaryObjectives(difficultyLevel);
        
        // Generate bonus objectives
        const bonusObjectives = this.generateBonusObjectives(difficultyLevel);
        
        // Generate secret areas
        const secretAreas = this.generateSecretAreas(terrainData, difficultyLevel);
        
        // Calculate reward distribution
        const rewardDistribution = this.calculateRewardDistribution(
            primaryObjectives, bonusObjectives, secretAreas
        );
        
        // Generate checkpoints
        const checkpoints = this.generateCheckpoints(terrainData, primaryObjectives);
        
        // Create level structure
        const level = {
            id: `level_${Date.now()}`,
            difficulty: difficultyLevel,
            playerLevel: this.playerProgress.level,
            objectives: {
                primary: primaryObjectives,
                bonus: bonusObjectives,
                total: primaryObjectives.length + bonusObjectives.length
            },
            secretAreas: secretAreas,
            checkpoints: checkpoints,
            rewards: rewardDistribution,
            estimatedDuration: this.calculateEstimatedDuration(primaryObjectives, bonusObjectives),
            metadata: {
                generatedAt: Date.now(),
                playerSkillRating: this.playerProgress.skillRating,
                preferredPlayStyle: this.playerProgress.preferredPlayStyle,
                adaptations: this.getAdaptations(difficultyLevel)
            }
        };
        
        // Update statistics
        this.updateLevelStats(level);
        
        console.log(`🎯 Generated level with ${level.objectives.total} objectives, ${secretAreas.length} secret areas`);
        
        return level;
    }
    
    generatePrimaryObjectives(difficultyLevel) {
        const objectives = [];
        const objectiveCount = Math.min(
            this.options.maxObjectives,
            Math.max(2, Math.floor(2 + difficultyLevel * 2))
        );
        
        // Ensure variety in objective types
        const availableTypes = Array.from(this.objectiveTemplates.keys());
        const selectedTypes = this.selectObjectiveTypes(availableTypes, objectiveCount);
        
        for (let i = 0; i < objectiveCount; i++) {
            const objectiveType = selectedTypes[i % selectedTypes.length];
            const objective = this.createObjective(objectiveType, difficultyLevel, 'primary');
            
            if (objective) {
                objectives.push(objective);
            }
        }
        
        return objectives;
    }
    
    generateBonusObjectives(difficultyLevel) {
        const bonusObjectives = [];
        
        if (Math.random() < this.options.bonusObjectiveChance) {
            const bonusCount = Math.floor(1 + Math.random() * 2); // 1-2 bonus objectives
            
            for (let i = 0; i < bonusCount; i++) {
                const objectiveTypes = Array.from(this.objectiveTemplates.keys());
                const randomType = objectiveTypes[Math.floor(Math.random() * objectiveTypes.length)];
                const objective = this.createObjective(randomType, difficultyLevel * 0.8, 'bonus');
                
                if (objective) {
                    // Bonus objectives have higher rewards but are optional
                    objective.reward = Math.floor(objective.reward * 1.5);
                    objective.optional = true;
                    bonusObjectives.push(objective);
                }
            }
        }
        
        return bonusObjectives;
    }
    
    selectObjectiveTypes(availableTypes, count) {
        const selected = [];
        const playerStyle = this.playerProgress.preferredPlayStyle;
        
        // Weight selection based on player preference
        const typeWeights = this.getObjectiveTypeWeights(playerStyle);
        
        // Ensure at least one of each major type if possible
        const priorityTypes = this.getPriorityTypes(playerStyle);
        
        // Add priority types first
        for (const type of priorityTypes) {
            if (selected.length < count && availableTypes.includes(type)) {
                selected.push(type);
            }
        }
        
        // Fill remaining slots with weighted random selection
        while (selected.length < count) {
            const remainingTypes = availableTypes.filter(type => 
                !selected.includes(type) || selected.filter(t => t === type).length < 2
            );
            
            if (remainingTypes.length === 0) break;
            
            const weightedType = this.selectWeightedType(remainingTypes, typeWeights);
            selected.push(weightedType);
        }
        
        return selected;
    }
    
    getObjectiveTypeWeights(playerStyle) {
        const baseWeights = {
            survival: 1.0,
            elimination: 1.0,
            collection: 1.0,
            escort: 1.0,
            exploration: 1.0
        };
        
        switch (playerStyle) {
            case 'aggressive':
                baseWeights.elimination *= 2.0;
                baseWeights.survival *= 1.5;
                baseWeights.collection *= 0.7;
                break;
            case 'defensive':
                baseWeights.survival *= 2.0;
                baseWeights.escort *= 1.5;
                baseWeights.elimination *= 0.8;
                break;
            case 'explorer':
                baseWeights.exploration *= 2.0;
                baseWeights.collection *= 1.5;
                baseWeights.survival *= 0.8;
                break;
            case 'speedrun':
                baseWeights.elimination *= 1.5;
                baseWeights.collection *= 1.3;
                baseWeights.escort *= 0.6;
                break;
            default: // balanced
                // No modifications for balanced style
                break;
        }
        
        return baseWeights;
    }
    
    getPriorityTypes(playerStyle) {
        switch (playerStyle) {
            case 'aggressive':
                return ['elimination', 'survival'];
            case 'defensive':
                return ['survival', 'escort'];
            case 'explorer':
                return ['exploration', 'collection'];
            case 'speedrun':
                return ['elimination', 'collection'];
            default:
                return ['survival', 'elimination'];
        }
    }
    
    selectWeightedType(types, weights) {
        const totalWeight = types.reduce((sum, type) => sum + (weights[type] || 1), 0);
        let random = Math.random() * totalWeight;
        
        for (const type of types) {
            random -= (weights[type] || 1);
            if (random <= 0) {
                return type;
            }
        }
        
        return types[0]; // Fallback
    }
    
    createObjective(type, difficultyLevel, category = 'primary') {
        const template = this.objectiveTemplates.get(type);
        if (!template) return null;
        
        // Select variant based on difficulty and player skill
        const variant = this.selectObjectiveVariant(template, difficultyLevel);
        if (!variant) return null;
        
        // Generate parameters
        const parameters = this.generateObjectiveParameters(variant, difficultyLevel);
        
        // Calculate reward
        const baseReward = template.baseReward * this.options.rewardScaling;
        const difficultyMultiplier = 1 + (difficultyLevel - 1) * 0.5;
        const skillMultiplier = 1 + (this.playerProgress.skillRating - 0.5) * 0.3;
        const reward = Math.floor(baseReward * difficultyMultiplier * skillMultiplier * variant.scalingFactor);
        
        // Create objective
        const objective = {
            id: `${type}_${variant.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: type,
            category: category,
            name: variant.name,
            description: this.formatDescription(variant.description, parameters),
            difficulty: template.difficulty * difficultyLevel,
            reward: reward,
            parameters: parameters,
            status: 'pending',
            progress: 0,
            maxProgress: this.calculateMaxProgress(variant, parameters),
            timeLimit: this.calculateTimeLimit(variant, difficultyLevel),
            location: null, // Will be set during level placement
            requirements: this.generateRequirements(variant, difficultyLevel),
            hints: this.generateHints(variant, parameters),
            created: Date.now()
        };
        
        return objective;
    }
    
    selectObjectiveVariant(template, difficultyLevel) {
        const variants = template.variants;
        if (!variants || variants.length === 0) return null;
        
        // Select variant based on difficulty level
        const difficultyIndex = Math.min(
            variants.length - 1,
            Math.floor(difficultyLevel * variants.length)
        );
        
        return variants[difficultyIndex];
    }
    
    generateObjectiveParameters(variant, difficultyLevel) {
        const parameters = {};
        
        for (const [key, values] of Object.entries(variant.parameters)) {
            if (Array.isArray(values)) {
                // Select value based on difficulty
                const index = Math.min(
                    values.length - 1,
                    Math.floor(difficultyLevel * values.length)
                );
                parameters[key] = values[index];
            } else {
                parameters[key] = values;
            }
        }
        
        return parameters;
    }
    
    formatDescription(description, parameters) {
        let formatted = description;
        
        for (const [key, value] of Object.entries(parameters)) {
            formatted = formatted.replace(`{${key}}`, value);
        }
        
        return formatted;
    }
    
    calculateMaxProgress(variant, parameters) {
        // Calculate based on objective type and parameters
        if (parameters.count) return parameters.count;
        if (parameters.amount) return parameters.amount;
        if (parameters.duration) return parameters.duration;
        if (parameters.waves) return parameters.waves;
        if (parameters.distance) return parameters.distance;
        if (parameters.percentage) return parameters.percentage;
        
        return 1; // Default for completion-based objectives
    }
    
    calculateTimeLimit(variant, difficultyLevel) {
        // Base time limits in seconds
        const baseTimeLimits = {
            survive_time: 0, // No additional time limit for survival
            survive_waves: 300, // 5 minutes
            kill_count: 180, // 3 minutes
            kill_type: 240, // 4 minutes
            collect_fuel: 120, // 2 minutes
            collect_parts: 180, // 3 minutes
            escort_survivor: 300, // 5 minutes
            escort_convoy: 240, // 4 minutes
            explore_area: 360, // 6 minutes
            find_locations: 300 // 5 minutes
        };
        
        const baseTime = baseTimeLimits[variant.id] || 180;
        if (baseTime === 0) return null; // No time limit
        
        // Adjust based on difficulty (higher difficulty = less time)
        const timeMultiplier = Math.max(0.5, 1.5 - difficultyLevel * 0.3);
        
        return Math.floor(baseTime * timeMultiplier);
    }
    
    generateRequirements(variant, difficultyLevel) {
        const requirements = [];
        
        // Add difficulty-based requirements
        if (difficultyLevel > 1.5) {
            requirements.push({
                type: 'health_threshold',
                description: 'Maintain at least 50% health',
                value: 0.5
            });
        }
        
        if (difficultyLevel > 2.0) {
            requirements.push({
                type: 'no_vehicle_damage',
                description: 'Complete without major vehicle damage',
                value: 0.8 // Max 20% damage allowed
            });
        }
        
        // Add variant-specific requirements
        if (variant.id.includes('escort')) {
            requirements.push({
                type: 'protect_target',
                description: 'Keep all targets alive',
                value: 1.0
            });
        }
        
        return requirements;
    }
    
    generateHints(variant, parameters) {
        const hints = [];
        
        // Generate contextual hints based on objective type
        switch (variant.id) {
            case 'survive_time':
                hints.push('Find a defensible position with good visibility');
                hints.push('Conserve ammunition and use the environment to your advantage');
                break;
            case 'kill_count':
                hints.push('Look for zombie spawn points to maximize efficiency');
                hints.push('Use vehicle ramming for quick eliminations');
                break;
            case 'collect_fuel':
                hints.push('Check abandoned vehicles and gas stations');
                hints.push('Fuel canisters often spawn near industrial areas');
                break;
            case 'escort_survivor':
                hints.push('Clear the path ahead before moving survivors');
                hints.push('Stay close to provide protection');
                break;
            case 'explore_area':
                hints.push('Use high ground to survey the area');
                hints.push('Check building interiors and hidden passages');
                break;
        }
        
        return hints;
    }
    
    generateSecretAreas(terrainData, difficultyLevel) {
        const secretAreas = [];
        
        if (Math.random() < this.options.secretAreaChance) {
            const areaCount = Math.floor(1 + Math.random() * 3); // 1-3 secret areas
            
            for (let i = 0; i < areaCount; i++) {
                const secretArea = this.secretAreaGenerator.generateSecretArea(
                    terrainData, difficultyLevel, this.playerProgress
                );
                
                if (secretArea) {
                    secretAreas.push(secretArea);
                }
            }
        }
        
        return secretAreas;
    }
    
    calculateRewardDistribution(primaryObjectives, bonusObjectives, secretAreas) {
        const totalPrimaryReward = primaryObjectives.reduce((sum, obj) => sum + obj.reward, 0);
        const totalBonusReward = bonusObjectives.reduce((sum, obj) => sum + obj.reward, 0);
        const totalSecretReward = secretAreas.reduce((sum, area) => sum + area.reward, 0);
        
        const totalReward = totalPrimaryReward + totalBonusReward + totalSecretReward;
        
        return {
            primary: {
                total: totalPrimaryReward,
                percentage: totalReward > 0 ? (totalPrimaryReward / totalReward) * 100 : 0,
                objectives: primaryObjectives.length
            },
            bonus: {
                total: totalBonusReward,
                percentage: totalReward > 0 ? (totalBonusReward / totalReward) * 100 : 0,
                objectives: bonusObjectives.length
            },
            secret: {
                total: totalSecretReward,
                percentage: totalReward > 0 ? (totalSecretReward / totalReward) * 100 : 0,
                areas: secretAreas.length
            },
            total: totalReward,
            balance: this.calculateRewardBalance(totalPrimaryReward, totalBonusReward, totalSecretReward)
        };
    }
    
    calculateRewardBalance(primary, bonus, secret) {
        const total = primary + bonus + secret;
        if (total === 0) return 'balanced';
        
        const primaryRatio = primary / total;
        const bonusRatio = bonus / total;
        const secretRatio = secret / total;
        
        if (primaryRatio > 0.7) return 'primary_heavy';
        if (bonusRatio > 0.4) return 'bonus_heavy';
        if (secretRatio > 0.3) return 'exploration_heavy';
        
        return 'balanced';
    }
    
    generateCheckpoints(terrainData, objectives) {
        return this.checkpointManager.generateCheckpoints(terrainData, objectives);
    }
    
    calculateEstimatedDuration(primaryObjectives, bonusObjectives) {
        let totalDuration = 0;
        
        // Base duration for primary objectives
        primaryObjectives.forEach(obj => {
            totalDuration += this.getObjectiveDuration(obj);
        });
        
        // Add bonus objective time (weighted since they're optional)
        bonusObjectives.forEach(obj => {
            totalDuration += this.getObjectiveDuration(obj) * 0.7;
        });
        
        // Add base exploration and travel time
        totalDuration += 120; // 2 minutes base
        
        return Math.floor(totalDuration);
    }
    
    getObjectiveDuration(objective) {
        const baseDurations = {
            survival: objective.parameters.duration || 60,
            elimination: Math.min(180, (objective.parameters.count || 10) * 5),
            collection: Math.min(120, (objective.parameters.amount || 5) * 15),
            escort: Math.min(300, (objective.parameters.distance || 1000) / 5),
            exploration: Math.min(240, (objective.parameters.percentage || 75) * 2)
        };
        
        return baseDurations[objective.type] || 60;
    }
    
    getAdaptations(difficultyLevel) {
        const adaptations = [];
        
        if (this.playerProgress.skillRating > 0.7) {
            adaptations.push('increased_zombie_aggression');
            adaptations.push('reduced_resource_spawns');
        }
        
        if (this.playerProgress.skillRating < 0.3) {
            adaptations.push('additional_health_pickups');
            adaptations.push('extended_time_limits');
        }
        
        if (this.playerProgress.preferredPlayStyle === 'explorer') {
            adaptations.push('additional_secret_areas');
            adaptations.push('exploration_bonuses');
        }
        
        if (difficultyLevel > 2.0) {
            adaptations.push('elite_zombie_spawns');
            adaptations.push('environmental_hazards');
        }
        
        return adaptations;
    }
    
    updatePlayerProgress(progress) {
        // Update internal player progress tracking
        Object.assign(this.playerProgress, progress);
        
        // Recalculate skill rating based on recent performance
        this.playerProgress.skillRating = this.calculateSkillRating(progress);
        
        // Update preferred play style based on behavior patterns
        this.playerProgress.preferredPlayStyle = this.analyzePlayStyle(progress);
    }
    
    calculateSkillRating(progress) {
        let skillScore = 0.5; // Base skill
        
        // Factor in completion rate
        if (progress.objectivesCompleted > 0) {
            const completionRate = progress.objectivesCompleted / (progress.level * 3); // Assume 3 objectives per level
            skillScore += (completionRate - 0.5) * 0.3;
        }
        
        // Factor in efficiency (zombies killed per distance)
        if (progress.distanceTraveled > 0) {
            const efficiency = progress.zombiesKilled / (progress.distanceTraveled / 1000);
            skillScore += Math.min(0.2, efficiency / 10);
        }
        
        // Factor in secret finding ability
        if (progress.secretsFound > 0) {
            skillScore += Math.min(0.1, progress.secretsFound / 20);
        }
        
        return Math.max(0, Math.min(1, skillScore));
    }
    
    analyzePlayStyle(progress) {
        const styles = {
            aggressive: 0,
            defensive: 0,
            explorer: 0,
            speedrun: 0,
            balanced: 0
        };
        
        // Analyze based on metrics
        if (progress.zombiesKilled > progress.distanceTraveled / 100) {
            styles.aggressive += 2;
        }
        
        if (progress.averageCompletionTime > 300) { // More than 5 minutes average
            styles.defensive += 1;
            styles.explorer += 1;
        } else if (progress.averageCompletionTime < 180) { // Less than 3 minutes
            styles.speedrun += 2;
        }
        
        if (progress.secretsFound > progress.level) {
            styles.explorer += 2;
        }
        
        // Default to balanced if no clear preference
        styles.balanced = 1;
        
        // Return style with highest score
        return Object.keys(styles).reduce((a, b) => styles[a] > styles[b] ? a : b);
    }
    
    updateLevelStats(level) {
        this.levelStats.objectivesGenerated += level.objectives.total;
        this.levelStats.secretAreasCreated += level.secretAreas.length;
        this.levelStats.bonusObjectivesCreated += level.objectives.bonus.length;
        this.levelStats.averageDifficulty = (this.levelStats.averageDifficulty + level.difficulty) / 2;
    }
    
    // Public API methods
    getPlayerProgress() {
        return { ...this.playerProgress };
    }
    
    getLevelStats() {
        return { ...this.levelStats };
    }
    
    getObjectiveTemplates() {
        return Array.from(this.objectiveTemplates.keys());
    }
    
    updateObjectiveProgress(objectiveId, progress) {
        // This would integrate with the game's objective tracking system
        console.log(`🎯 Objective ${objectiveId} progress: ${progress}`);
    }
    
    completeObjective(objectiveId, completionData) {
        // This would handle objective completion and reward distribution
        console.log(`🎯 Objective ${objectiveId} completed:`, completionData);
    }
}

export default IntelligentLevelDesigner;
/
**
 * Reward System
 * 
 * Manages balanced reward distribution and scaling based on difficulty and player performance.
 */
class RewardSystem {
    constructor() {
        this.rewardTypes = {
            currency: { base: 100, scaling: 1.2 },
            experience: { base: 50, scaling: 1.1 },
            items: { base: 1, scaling: 1.0 },
            upgrades: { base: 0.1, scaling: 1.5 }
        };
        
        this.bonusMultipliers = {
            perfect_completion: 1.5,
            speed_bonus: 1.3,
            no_damage: 1.4,
            exploration_bonus: 1.2,
            combo_bonus: 1.1
        };
    }
    
    calculateReward(baseReward, difficulty, bonuses = []) {
        let totalReward = baseReward * Math.pow(1.2, difficulty - 1);
        
        // Apply bonus multipliers
        bonuses.forEach(bonus => {
            if (this.bonusMultipliers[bonus]) {
                totalReward *= this.bonusMultipliers[bonus];
            }
        });
        
        return Math.floor(totalReward);
    }
    
    generateRewardPackage(totalReward, playerLevel) {
        const package = {
            currency: Math.floor(totalReward * 0.6),
            experience: Math.floor(totalReward * 0.3),
            items: [],
            upgrades: []
        };
        
        // Add items based on reward value
        if (totalReward > 200) {
            package.items.push(this.generateRandomItem(playerLevel));
        }
        
        if (totalReward > 500) {
            package.upgrades.push(this.generateRandomUpgrade(playerLevel));
        }
        
        return package;
    }
    
    generateRandomItem(playerLevel) {
        const items = [
            { name: 'Health Kit', rarity: 'common', value: 50 },
            { name: 'Fuel Canister', rarity: 'common', value: 30 },
            { name: 'Armor Plating', rarity: 'uncommon', value: 100 },
            { name: 'Weapon Upgrade', rarity: 'rare', value: 200 }
        ];
        
        return items[Math.floor(Math.random() * items.length)];
    }
    
    generateRandomUpgrade(playerLevel) {
        const upgrades = [
            { name: 'Engine Boost', category: 'engine', value: 0.1 },
            { name: 'Armor Enhancement', category: 'defense', value: 0.15 },
            { name: 'Weapon Efficiency', category: 'combat', value: 0.12 }
        ];
        
        return upgrades[Math.floor(Math.random() * upgrades.length)];
    }
}

/**
 * Secret Area Generator
 * 
 * Creates hidden areas with special rewards and challenges.
 */
class SecretAreaGenerator {
    constructor() {
        this.secretTypes = [
            {
                name: 'Hidden Cache',
                type: 'cache',
                difficulty: 0.3,
                reward: 150,
                description: 'A hidden stash of supplies'
            },
            {
                name: 'Survivor Hideout',
                type: 'hideout',
                difficulty: 0.5,
                reward: 200,
                description: 'An abandoned survivor shelter'
            },
            {
                name: 'Underground Bunker',
                type: 'bunker',
                difficulty: 0.7,
                reward: 300,
                description: 'A fortified underground facility'
            },
            {
                name: 'Rooftop Garden',
                type: 'garden',
                difficulty: 0.4,
                reward: 180,
                description: 'A hidden rooftop sanctuary'
            }
        ];
    }
    
    generateSecretArea(terrainData, difficultyLevel, playerProgress) {
        // Select appropriate secret type based on difficulty
        const availableTypes = this.secretTypes.filter(type => 
            type.difficulty <= difficultyLevel + 0.2
        );
        
        if (availableTypes.length === 0) return null;
        
        const secretType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        
        // Generate location based on terrain
        const location = this.findSecretLocation(terrainData);
        if (!location) return null;
        
        // Create secret area
        const secretArea = {
            id: `secret_${secretType.type}_${Date.now()}`,
            name: secretType.name,
            type: secretType.type,
            description: secretType.description,
            location: location,
            difficulty: secretType.difficulty * difficultyLevel,
            reward: Math.floor(secretType.reward * difficultyLevel),
            requirements: this.generateSecretRequirements(secretType, difficultyLevel),
            hints: this.generateSecretHints(secretType, location),
            discovered: false,
            accessed: false,
            contents: this.generateSecretContents(secretType, difficultyLevel),
            created: Date.now()
        };
        
        return secretArea;
    }
    
    findSecretLocation(terrainData) {
        // This would integrate with the terrain system to find suitable locations
        // For now, generate a random location
        return {
            x: Math.random() * 1000 - 500,
            y: 0,
            z: Math.random() * 1000 - 500,
            biome: 'city', // Would be determined by terrain data
            accessibility: Math.random() * 0.5 + 0.3 // 0.3-0.8 accessibility
        };
    }
    
    generateSecretRequirements(secretType, difficultyLevel) {
        const requirements = [];
        
        switch (secretType.type) {
            case 'cache':
                requirements.push({
                    type: 'exploration',
                    description: 'Find the hidden entrance',
                    hint: 'Look for unusual markings or debris'
                });
                break;
                
            case 'hideout':
                requirements.push({
                    type: 'puzzle',
                    description: 'Solve the access code',
                    hint: 'Check nearby graffiti for clues'
                });
                break;
                
            case 'bunker':
                requirements.push({
                    type: 'combat',
                    description: 'Clear the guardian zombies',
                    hint: 'Elite zombies guard valuable locations'
                });
                break;
                
            case 'garden':
                requirements.push({
                    type: 'platforming',
                    description: 'Reach the elevated area',
                    hint: 'Use vehicle momentum to reach high places'
                });
                break;
        }
        
        return requirements;
    }
    
    generateSecretHints(secretType, location) {
        const hints = [
            'Strange sounds echo from this direction',
            'The debris here looks deliberately placed',
            'Fresh tire tracks lead to a dead end',
            'This area feels different from the rest'
        ];
        
        return [hints[Math.floor(Math.random() * hints.length)]];
    }
    
    generateSecretContents(secretType, difficultyLevel) {
        const contents = {
            currency: Math.floor(100 * difficultyLevel),
            items: [],
            lore: null
        };
        
        // Add type-specific contents
        switch (secretType.type) {
            case 'cache':
                contents.items.push({ name: 'Rare Parts', quantity: 2 });
                contents.items.push({ name: 'Fuel', quantity: 3 });
                break;
                
            case 'hideout':
                contents.items.push({ name: 'Survivor Notes', quantity: 1 });
                contents.items.push({ name: 'Medical Supplies', quantity: 2 });
                contents.lore = 'A journal entry revealing the fate of previous survivors';
                break;
                
            case 'bunker':
                contents.items.push({ name: 'Military Equipment', quantity: 1 });
                contents.items.push({ name: 'Weapon Mods', quantity: 2 });
                contents.lore = 'Classified documents about the zombie outbreak';
                break;
                
            case 'garden':
                contents.items.push({ name: 'Seeds', quantity: 5 });
                contents.items.push({ name: 'Pure Water', quantity: 3 });
                contents.lore = 'A message of hope from the last gardener';
                break;
        }
        
        return contents;
    }
}

/**
 * Checkpoint Manager
 * 
 * Manages checkpoint placement and save system integration.
 */
class CheckpointManager {
    constructor() {
        this.checkpointTypes = {
            safe_zone: {
                name: 'Safe Zone',
                radius: 50,
                protection: true,
                services: ['repair', 'refuel', 'save']
            },
            outpost: {
                name: 'Outpost',
                radius: 30,
                protection: false,
                services: ['save', 'trade']
            },
            waypoint: {
                name: 'Waypoint',
                radius: 20,
                protection: false,
                services: ['save']
            }
        };
    }
    
    generateCheckpoints(terrainData, objectives) {
        const checkpoints = [];
        
        // Always place a starting checkpoint
        checkpoints.push(this.createCheckpoint('safe_zone', { x: 0, y: 0, z: 0 }, 'start'));
        
        // Place checkpoints based on objectives
        objectives.forEach((objective, index) => {
            if (index > 0 && index % 2 === 0) { // Every 2nd objective
                const location = this.findCheckpointLocation(terrainData, objective);
                const type = this.selectCheckpointType(objective, index);
                const checkpoint = this.createCheckpoint(type, location, `objective_${index}`);
                checkpoints.push(checkpoint);
            }
        });
        
        // Place final checkpoint
        const finalLocation = this.findFinalCheckpointLocation(terrainData, objectives);
        checkpoints.push(this.createCheckpoint('safe_zone', finalLocation, 'end'));
        
        return checkpoints;
    }
    
    createCheckpoint(type, location, purpose) {
        const checkpointType = this.checkpointTypes[type];
        
        return {
            id: `checkpoint_${purpose}_${Date.now()}`,
            type: type,
            name: checkpointType.name,
            location: location,
            radius: checkpointType.radius,
            protection: checkpointType.protection,
            services: [...checkpointType.services],
            purpose: purpose,
            activated: false,
            discovered: false,
            lastUsed: null,
            saveData: null,
            created: Date.now()
        };
    }
    
    findCheckpointLocation(terrainData, objective) {
        // This would integrate with terrain data to find safe locations
        // For now, generate a location near the objective
        return {
            x: (objective.location?.x || 0) + (Math.random() - 0.5) * 100,
            y: 0,
            z: (objective.location?.z || 0) + (Math.random() - 0.5) * 100
        };
    }
    
    selectCheckpointType(objective, index) {
        if (objective.difficulty > 0.7) return 'safe_zone';
        if (index === 0) return 'safe_zone';
        return Math.random() < 0.3 ? 'outpost' : 'waypoint';
    }
    
    findFinalCheckpointLocation(terrainData, objectives) {
        // Place final checkpoint at a strategic location
        return {
            x: Math.random() * 200 - 100,
            y: 0,
            z: Math.random() * 200 - 100
        };
    }
    
    activateCheckpoint(checkpointId, playerData) {
        console.log(`🏁 Checkpoint ${checkpointId} activated`);
        
        // This would integrate with the save system
        return {
            success: true,
            saveId: `save_${checkpointId}_${Date.now()}`,
            timestamp: Date.now()
        };
    }
    
    getAvailableServices(checkpointId) {
        // Return services available at this checkpoint
        return ['save', 'repair', 'refuel', 'trade'];
    }
}

// Export the additional classes
export { RewardSystem, SecretAreaGenerator, CheckpointManager };