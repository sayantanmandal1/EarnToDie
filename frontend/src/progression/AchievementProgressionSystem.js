/**
 * Achievement and Progression System
 * Comprehensive achievement tracking, progression management, and unlock system
 */
class AchievementProgressionSystem {
    constructor(config = {}) {
        this.config = {
            // Achievement system settings
            enableAchievements: true,
            enableProgressionTracking: true,
            enableLeaderboards: true,
            enableUnlockSystem: true,
            enableStatistics: true,

            // Progression settings
            enableLevelProgression: true,
            enableSkillTrees: true,
            enablePrestige: true,
            maxLevel: 100,
            prestigeLevels: 10,

            // Leaderboard settings
            enableGlobalLeaderboards: true,
            enableFriendLeaderboards: true,
            leaderboardSize: 100,
            leaderboardUpdateInterval: 300000, // 5 minutes

            // Unlock system settings
            enableVehicleUnlocks: true,
            enableLevelUnlocks: true,
            enableCustomizationUnlocks: true,
            enableFeatureUnlocks: true,

            // Storage settings
            enableCloudSync: true,
            enableLocalBackup: true,
            syncInterval: 600000, // 10 minutes

            // Notification settings
            enableAchievementNotifications: true,
            enableProgressNotifications: true,
            enableLevelUpNotifications: true,

            debugMode: process.env.NODE_ENV === 'development',
            ...config
        };

        // System components
        this.achievementManager = null;
        this.progressionTracker = null;
        this.leaderboardManager = null;
        this.unlockSystem = null;
        this.statisticsTracker = null;
        this.notificationSystem = null;

        // Data storage
        this.playerData = {
            level: 1,
            experience: 0,
            prestigeLevel: 0,
            achievements: new Map(),
            statistics: new Map(),
            unlockedContent: new Set(),
            progressionData: new Map()
        };

        // Achievement definitions
        this.achievementDefinitions = new Map();
        this.progressionDefinitions = new Map();
        this.unlockDefinitions = new Map();

        // Event listeners
        this.eventListeners = new Map();

        this.initialize();
    }

    /**
     * Initialize achievement and progression system
     */
    async initialize() {
        console.log('Initializing Achievement and Progression System...');

        try {
            // Initialize system components
            await this.initializeComponents();

            // Load achievement definitions
            await this.loadAchievementDefinitions();

            // Load progression definitions
            await this.loadProgressionDefinitions();

            // Load unlock definitions
            await this.loadUnlockDefinitions();

            // Load player data
            await this.loadPlayerData();

            // Setup event listeners
            this.setupEventListeners();

            console.log('Achievement and Progression System initialized');
            this.emit('initialized', {
                config: this.config,
                playerLevel: this.playerData.level,
                achievementsUnlocked: this.playerData.achievements.size
            });

        } catch (error) {
            console.error('Failed to initialize Achievement and Progression System:', error);
            throw error;
        }
    }

    /**
     * Initialize system components
     */
    async initializeComponents() {
        console.log('Initializing system components...');

        // Achievement manager
        this.achievementManager = new AchievementManager({
            enableNotifications: this.config.enableAchievementNotifications,
            debugMode: this.config.debugMode
        });

        // Progression tracker
        this.progressionTracker = new ProgressionTracker({
            maxLevel: this.config.maxLevel,
            prestigeLevels: this.config.prestigeLevels,
            enableSkillTrees: this.config.enableSkillTrees,
            debugMode: this.config.debugMode
        });

        // Leaderboard manager
        this.leaderboardManager = new LeaderboardManager({
            enableGlobalLeaderboards: this.config.enableGlobalLeaderboards,
            enableFriendLeaderboards: this.config.enableFriendLeaderboards,
            leaderboardSize: this.config.leaderboardSize,
            updateInterval: this.config.leaderboardUpdateInterval,
            debugMode: this.config.debugMode
        });

        // Unlock system
        this.unlockSystem = new UnlockSystem({
            enableVehicleUnlocks: this.config.enableVehicleUnlocks,
            enableLevelUnlocks: this.config.enableLevelUnlocks,
            enableCustomizationUnlocks: this.config.enableCustomizationUnlocks,
            debugMode: this.config.debugMode
        });

        // Statistics tracker
        this.statisticsTracker = new StatisticsTracker({
            enableDetailedStats: true,
            enablePerformanceStats: true,
            debugMode: this.config.debugMode
        });

        // Notification system
        this.notificationSystem = new NotificationSystem({
            enableAchievementNotifications: this.config.enableAchievementNotifications,
            enableProgressNotifications: this.config.enableProgressNotifications,
            enableLevelUpNotifications: this.config.enableLevelUpNotifications,
            debugMode: this.config.debugMode
        });

        console.log('System components initialized');
    }

    /**
     * Load achievement definitions
     */
    async loadAchievementDefinitions() {
        console.log('Loading achievement definitions...');

        // Define achievement categories and achievements
        const achievements = [
            // Combat Achievements
            {
                id: 'first_kill',
                name: 'First Blood',
                description: 'Kill your first zombie',
                category: 'combat',
                type: 'milestone',
                requirements: { zombiesKilled: 1 },
                rewards: { experience: 100, currency: 50 },
                icon: 'first_kill.png',
                rarity: 'common'
            },
            {
                id: 'zombie_slayer',
                name: 'Zombie Slayer',
                description: 'Kill 100 zombies',
                category: 'combat',
                type: 'milestone',
                requirements: { zombiesKilled: 100 },
                rewards: { experience: 500, currency: 200, unlock: 'weapon_upgrade' },
                icon: 'zombie_slayer.png',
                rarity: 'uncommon'
            },
            {
                id: 'zombie_hunter',
                name: 'Zombie Hunter',
                description: 'Kill 1000 zombies',
                category: 'combat',
                type: 'milestone',
                requirements: { zombiesKilled: 1000 },
                rewards: { experience: 2000, currency: 1000, unlock: 'special_vehicle' },
                icon: 'zombie_hunter.png',
                rarity: 'rare'
            },
            {
                id: 'combo_master',
                name: 'Combo Master',
                description: 'Achieve a 50x combo',
                category: 'combat',
                type: 'skill',
                requirements: { maxCombo: 50 },
                rewards: { experience: 300, currency: 150 },
                icon: 'combo_master.png',
                rarity: 'uncommon'
            },

            // Driving Achievements
            {
                id: 'speed_demon',
                name: 'Speed Demon',
                description: 'Reach 200 km/h',
                category: 'driving',
                type: 'skill',
                requirements: { maxSpeed: 200 },
                rewards: { experience: 200, currency: 100 },
                icon: 'speed_demon.png',
                rarity: 'common'
            },
            {
                id: 'distance_driver',
                name: 'Distance Driver',
                description: 'Drive 100 km total',
                category: 'driving',
                type: 'milestone',
                requirements: { totalDistance: 100000 },
                rewards: { experience: 400, currency: 200 },
                icon: 'distance_driver.png',
                rarity: 'uncommon'
            },
            {
                id: 'stunt_master',
                name: 'Stunt Master',
                description: 'Perform 100 stunts',
                category: 'driving',
                type: 'milestone',
                requirements: { stuntsPerformed: 100 },
                rewards: { experience: 600, currency: 300, unlock: 'stunt_vehicle' },
                icon: 'stunt_master.png',
                rarity: 'rare'
            },

            // Survival Achievements
            {
                id: 'survivor',
                name: 'Survivor',
                description: 'Survive for 10 minutes',
                category: 'survival',
                type: 'time',
                requirements: { survivalTime: 600 },
                rewards: { experience: 300, currency: 150 },
                icon: 'survivor.png',
                rarity: 'common'
            },
            {
                id: 'endurance_master',
                name: 'Endurance Master',
                description: 'Survive for 30 minutes',
                category: 'survival',
                type: 'time',
                requirements: { survivalTime: 1800 },
                rewards: { experience: 1000, currency: 500, unlock: 'endurance_mode' },
                icon: 'endurance_master.png',
                rarity: 'epic'
            },

            // Collection Achievements
            {
                id: 'collector',
                name: 'Collector',
                description: 'Collect 50 power-ups',
                category: 'collection',
                type: 'milestone',
                requirements: { powerUpsCollected: 50 },
                rewards: { experience: 250, currency: 125 },
                icon: 'collector.png',
                rarity: 'common'
            },
            {
                id: 'treasure_hunter',
                name: 'Treasure Hunter',
                description: 'Find 10 secret areas',
                category: 'collection',
                type: 'exploration',
                requirements: { secretAreasFound: 10 },
                rewards: { experience: 500, currency: 250, unlock: 'treasure_map' },
                icon: 'treasure_hunter.png',
                rarity: 'rare'
            },

            // Special Achievements
            {
                id: 'perfectionist',
                name: 'Perfectionist',
                description: 'Complete a level with 100% score',
                category: 'special',
                type: 'skill',
                requirements: { perfectLevel: 1 },
                rewards: { experience: 1000, currency: 500, unlock: 'perfect_badge' },
                icon: 'perfectionist.png',
                rarity: 'legendary'
            },
            {
                id: 'unstoppable',
                name: 'Unstoppable',
                description: 'Complete 10 levels without taking damage',
                category: 'special',
                type: 'skill',
                requirements: { noDamageLevels: 10 },
                rewards: { experience: 2000, currency: 1000, unlock: 'invincible_mode' },
                icon: 'unstoppable.png',
                rarity: 'legendary'
            }
        ];

        // Store achievement definitions
        achievements.forEach(achievement => {
            this.achievementDefinitions.set(achievement.id, achievement);
        });

        console.log(`Loaded ${achievements.length} achievement definitions`);
    }

    /**
     * Load progression definitions
     */
    async loadProgressionDefinitions() {
        console.log('Loading progression definitions...');

        const progressionData = {
            experiencePerLevel: 1000,
            levelMultiplier: 1.1,
            prestigeRequirement: 100,
            skillTrees: {
                combat: {
                    name: 'Combat Mastery',
                    skills: [
                        { id: 'damage_boost', name: 'Damage Boost', maxLevel: 10, cost: 100 },
                        { id: 'combo_multiplier', name: 'Combo Multiplier', maxLevel: 5, cost: 200 },
                        { id: 'critical_chance', name: 'Critical Chance', maxLevel: 8, cost: 150 }
                    ]
                },
                driving: {
                    name: 'Driving Excellence',
                    skills: [
                        { id: 'speed_boost', name: 'Speed Boost', maxLevel: 10, cost: 100 },
                        { id: 'handling_improvement', name: 'Handling', maxLevel: 8, cost: 120 },
                        { id: 'fuel_efficiency', name: 'Fuel Efficiency', maxLevel: 6, cost: 180 }
                    ]
                },
                survival: {
                    name: 'Survival Instinct',
                    skills: [
                        { id: 'health_boost', name: 'Health Boost', maxLevel: 10, cost: 100 },
                        { id: 'armor_enhancement', name: 'Armor Enhancement', maxLevel: 8, cost: 150 },
                        { id: 'regeneration', name: 'Health Regeneration', maxLevel: 5, cost: 250 }
                    ]
                }
            }
        };

        this.progressionDefinitions.set('main', progressionData);
        console.log('Progression definitions loaded');
    }

    /**
     * Load unlock definitions
     */
    async loadUnlockDefinitions() {
        console.log('Loading unlock definitions...');

        const unlocks = [
            // Vehicle Unlocks
            {
                id: 'sports_car',
                name: 'Sports Car',
                type: 'vehicle',
                requirements: { level: 10, achievement: 'speed_demon' },
                description: 'High-speed sports car with excellent handling'
            },
            {
                id: 'monster_truck',
                name: 'Monster Truck',
                type: 'vehicle',
                requirements: { level: 20, achievement: 'zombie_slayer' },
                description: 'Heavy-duty truck perfect for crushing zombies'
            },
            {
                id: 'armored_vehicle',
                name: 'Armored Vehicle',
                type: 'vehicle',
                requirements: { level: 30, achievement: 'survivor' },
                description: 'Heavily armored vehicle for maximum protection'
            },

            // Level Unlocks
            {
                id: 'desert_level',
                name: 'Desert Wasteland',
                type: 'level',
                requirements: { level: 15 },
                description: 'Survive in the harsh desert environment'
            },
            {
                id: 'city_level',
                name: 'Urban Chaos',
                type: 'level',
                requirements: { level: 25, achievement: 'zombie_hunter' },
                description: 'Navigate through zombie-infested city streets'
            },

            // Feature Unlocks
            {
                id: 'replay_mode',
                name: 'Replay Mode',
                type: 'feature',
                requirements: { level: 5 },
                description: 'Record and replay your best runs'
            },
            {
                id: 'custom_controls',
                name: 'Custom Controls',
                type: 'feature',
                requirements: { level: 8 },
                description: 'Customize your control scheme'
            },

            // Customization Unlocks
            {
                id: 'red_paint',
                name: 'Red Paint Job',
                type: 'customization',
                requirements: { achievement: 'first_kill' },
                description: 'Paint your vehicle red'
            },
            {
                id: 'flame_decals',
                name: 'Flame Decals',
                type: 'customization',
                requirements: { achievement: 'speed_demon' },
                description: 'Add flame decals to your vehicle'
            }
        ];

        unlocks.forEach(unlock => {
            this.unlockDefinitions.set(unlock.id, unlock);
        });

        console.log(`Loaded ${unlocks.length} unlock definitions`);
    }

    /**
     * Load player data
     */
    async loadPlayerData() {
        console.log('Loading player data...');

        try {
            // Try to load from local storage first
            const savedData = localStorage.getItem('achievementProgressionData');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                this.playerData = {
                    ...this.playerData,
                    ...parsedData,
                    achievements: new Map(parsedData.achievements || []),
                    statistics: new Map(parsedData.statistics || []),
                    unlockedContent: new Set(parsedData.unlockedContent || []),
                    progressionData: new Map(parsedData.progressionData || [])
                };
            }

            // Initialize default statistics if not present
            if (this.playerData.statistics.size === 0) {
                this.initializeDefaultStatistics();
            }

            console.log('Player data loaded');
        } catch (error) {
            console.warn('Failed to load player data, using defaults:', error);
            this.initializeDefaultStatistics();
        }
    }

    /**
     * Initialize default statistics
     */
    initializeDefaultStatistics() {
        const defaultStats = [
            'zombiesKilled', 'totalDistance', 'survivalTime', 'maxSpeed',
            'stuntsPerformed', 'powerUpsCollected', 'secretAreasFound',
            'maxCombo', 'perfectLevels', 'noDamageLevels', 'gamesPlayed',
            'totalPlayTime', 'highScore', 'levelsCompleted'
        ];

        defaultStats.forEach(stat => {
            this.playerData.statistics.set(stat, 0);
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        console.log('Setting up event listeners...');

        // Listen for game events to update statistics and check achievements
        this.on('zombieKilled', (data) => this.handleZombieKilled(data));
        this.on('distanceTraveled', (data) => this.handleDistanceTraveled(data));
        this.on('speedReached', (data) => this.handleSpeedReached(data));
        this.on('comboAchieved', (data) => this.handleComboAchieved(data));
        this.on('stuntPerformed', (data) => this.handleStuntPerformed(data));
        this.on('powerUpCollected', (data) => this.handlePowerUpCollected(data));
        this.on('secretAreaFound', (data) => this.handleSecretAreaFound(data));
        this.on('levelCompleted', (data) => this.handleLevelCompleted(data));
        this.on('survivalTimeReached', (data) => this.handleSurvivalTimeReached(data));

        console.log('Event listeners setup complete');
    }

    /**
     * Update progress for a specific statistic
     */
    updateProgress(statistic, value, increment = true) {
        const currentValue = this.playerData.statistics.get(statistic) || 0;
        const newValue = increment ? currentValue + value : value;
        
        this.playerData.statistics.set(statistic, newValue);
        
        // Check for achievements
        this.checkAchievements(statistic, newValue);
        
        // Update experience if applicable
        this.addExperience(this.calculateExperienceGain(statistic, value));
        
        // Save progress
        this.savePlayerData();
        
        // Emit progress update event
        this.emit('progressUpdated', {
            statistic,
            oldValue: currentValue,
            newValue,
            increment: value
        });
    }

    /**
     * Check achievements based on updated statistics
     */
    checkAchievements(statistic, value) {
        const unlockedAchievements = [];

        for (const [achievementId, achievement] of this.achievementDefinitions.entries()) {
            // Skip if already unlocked
            if (this.playerData.achievements.has(achievementId)) {
                continue;
            }

            // Check if requirements are met
            if (this.checkAchievementRequirements(achievement, statistic, value)) {
                this.unlockAchievement(achievementId);
                unlockedAchievements.push(achievement);
            }
        }

        return unlockedAchievements;
    }

    /**
     * Check if achievement requirements are met
     */
    checkAchievementRequirements(achievement, statistic, value) {
        const requirements = achievement.requirements;
        
        for (const [reqStat, reqValue] of Object.entries(requirements)) {
            const currentValue = reqStat === statistic ? value : this.playerData.statistics.get(reqStat) || 0;
            
            if (currentValue < reqValue) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Unlock an achievement
     */
    unlockAchievement(achievementId) {
        const achievement = this.achievementDefinitions.get(achievementId);
        if (!achievement) {
            console.warn(`Achievement not found: ${achievementId}`);
            return;
        }

        // Mark as unlocked
        this.playerData.achievements.set(achievementId, {
            unlockedAt: Date.now(),
            progress: 1.0
        });

        // Apply rewards
        this.applyAchievementRewards(achievement);

        // Show notification
        this.notificationSystem.showAchievementNotification(achievement);

        // Check for unlocks
        this.checkUnlocks();

        // Save data
        this.savePlayerData();

        console.log(`Achievement unlocked: ${achievement.name}`);
        this.emit('achievementUnlocked', {
            achievementId,
            achievement,
            timestamp: Date.now()
        });
    }

    /**
     * Apply achievement rewards
     */
    applyAchievementRewards(achievement) {
        const rewards = achievement.rewards || {};

        // Add experience
        if (rewards.experience) {
            this.addExperience(rewards.experience);
        }

        // Add currency
        if (rewards.currency) {
            this.addCurrency(rewards.currency);
        }

        // Unlock content
        if (rewards.unlock) {
            this.playerData.unlockedContent.add(rewards.unlock);
        }
    }

    /**
     * Add experience and handle level ups
     */
    addExperience(amount) {
        const oldLevel = this.playerData.level;
        this.playerData.experience += amount;

        // Check for level up
        const newLevel = this.calculateLevel(this.playerData.experience);
        if (newLevel > oldLevel) {
            this.handleLevelUp(oldLevel, newLevel);
        }

        this.emit('experienceGained', {
            amount,
            totalExperience: this.playerData.experience,
            level: this.playerData.level
        });
    }

    /**
     * Calculate level from experience
     */
    calculateLevel(experience) {
        const progressionData = this.progressionDefinitions.get('main');
        const baseExp = progressionData.experiencePerLevel;
        const multiplier = progressionData.levelMultiplier;

        let level = 1;
        let requiredExp = baseExp;
        let totalExp = 0;

        while (totalExp + requiredExp <= experience && level < this.config.maxLevel) {
            totalExp += requiredExp;
            level++;
            requiredExp = Math.floor(baseExp * Math.pow(multiplier, level - 1));
        }

        return level;
    }

    /**
     * Handle level up
     */
    handleLevelUp(oldLevel, newLevel) {
        this.playerData.level = newLevel;

        // Show notification
        this.notificationSystem.showLevelUpNotification(oldLevel, newLevel);

        // Check for unlocks
        this.checkUnlocks();

        // Award skill points
        const skillPointsGained = newLevel - oldLevel;
        this.addSkillPoints(skillPointsGained);

        console.log(`Level up! ${oldLevel} -> ${newLevel}`);
        this.emit('levelUp', {
            oldLevel,
            newLevel,
            skillPointsGained
        });
    }

    /**
     * Add currency
     */
    addCurrency(amount) {
        this.playerData.currency = (this.playerData.currency || 0) + amount;
        
        this.emit('currencyGained', {
            amount,
            totalCurrency: this.playerData.currency
        });
    }

    /**
     * Add skill points
     */
    addSkillPoints(amount) {
        this.playerData.skillPoints = (this.playerData.skillPoints || 0) + amount;
        
        this.emit('skillPointsGained', {
            amount,
            totalSkillPoints: this.playerData.skillPoints
        });
    }

    /**
     * Check for content unlocks
     */
    checkUnlocks() {
        const newUnlocks = [];

        for (const [unlockId, unlock] of this.unlockDefinitions.entries()) {
            // Skip if already unlocked
            if (this.playerData.unlockedContent.has(unlockId)) {
                continue;
            }

            // Check requirements
            if (this.checkUnlockRequirements(unlock)) {
                this.playerData.unlockedContent.add(unlockId);
                newUnlocks.push(unlock);
                
                this.notificationSystem.showUnlockNotification(unlock);
                console.log(`Content unlocked: ${unlock.name}`);
            }
        }

        if (newUnlocks.length > 0) {
            this.emit('contentUnlocked', {
                unlocks: newUnlocks,
                timestamp: Date.now()
            });
        }

        return newUnlocks;
    }

    /**
     * Check unlock requirements
     */
    checkUnlockRequirements(unlock) {
        const requirements = unlock.requirements || {};

        // Check level requirement
        if (requirements.level && this.playerData.level < requirements.level) {
            return false;
        }

        // Check achievement requirement
        if (requirements.achievement && !this.playerData.achievements.has(requirements.achievement)) {
            return false;
        }

        // Check statistic requirements
        for (const [stat, value] of Object.entries(requirements)) {
            if (stat !== 'level' && stat !== 'achievement') {
                const currentValue = this.playerData.statistics.get(stat) || 0;
                if (currentValue < value) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Calculate experience gain for actions
     */
    calculateExperienceGain(statistic, value) {
        const experienceMap = {
            zombiesKilled: 10,
            totalDistance: 0.1,
            stuntsPerformed: 25,
            powerUpsCollected: 15,
            secretAreasFound: 100,
            levelsCompleted: 200
        };

        return Math.floor((experienceMap[statistic] || 5) * value);
    }

    /**
     * Event handlers
     */
    handleZombieKilled(data) {
        this.updateProgress('zombiesKilled', 1);
        this.updateProgress('gamesPlayed', 0, false); // Update current game
    }

    handleDistanceTraveled(data) {
        this.updateProgress('totalDistance', data.distance);
    }

    handleSpeedReached(data) {
        const currentMax = this.playerData.statistics.get('maxSpeed') || 0;
        if (data.speed > currentMax) {
            this.updateProgress('maxSpeed', data.speed, false);
        }
    }

    handleComboAchieved(data) {
        const currentMax = this.playerData.statistics.get('maxCombo') || 0;
        if (data.combo > currentMax) {
            this.updateProgress('maxCombo', data.combo, false);
        }
    }

    handleStuntPerformed(data) {
        this.updateProgress('stuntsPerformed', 1);
    }

    handlePowerUpCollected(data) {
        this.updateProgress('powerUpsCollected', 1);
    }

    handleSecretAreaFound(data) {
        this.updateProgress('secretAreasFound', 1);
    }

    handleLevelCompleted(data) {
        this.updateProgress('levelsCompleted', 1);
        
        if (data.perfect) {
            this.updateProgress('perfectLevels', 1);
        }
        
        if (data.noDamage) {
            this.updateProgress('noDamageLevels', 1);
        }
    }

    handleSurvivalTimeReached(data) {
        const currentMax = this.playerData.statistics.get('survivalTime') || 0;
        if (data.time > currentMax) {
            this.updateProgress('survivalTime', data.time, false);
        }
    }

    /**
     * Get player statistics
     */
    getPlayerStatistics() {
        return {
            level: this.playerData.level,
            experience: this.playerData.experience,
            prestigeLevel: this.playerData.prestigeLevel,
            currency: this.playerData.currency || 0,
            skillPoints: this.playerData.skillPoints || 0,
            achievementsUnlocked: this.playerData.achievements.size,
            totalAchievements: this.achievementDefinitions.size,
            unlockedContent: Array.from(this.playerData.unlockedContent),
            statistics: Object.fromEntries(this.playerData.statistics)
        };
    }

    /**
     * Get achievement progress
     */
    getAchievementProgress() {
        const achievements = [];

        for (const [achievementId, achievement] of this.achievementDefinitions.entries()) {
            const isUnlocked = this.playerData.achievements.has(achievementId);
            const progress = this.calculateAchievementProgress(achievement);

            achievements.push({
                ...achievement,
                id: achievementId,
                unlocked: isUnlocked,
                progress: progress,
                unlockedAt: isUnlocked ? this.playerData.achievements.get(achievementId).unlockedAt : null
            });
        }

        return achievements.sort((a, b) => {
            if (a.unlocked !== b.unlocked) {
                return b.unlocked ? 1 : -1;
            }
            return b.progress - a.progress;
        });
    }

    /**
     * Calculate achievement progress
     */
    calculateAchievementProgress(achievement) {
        if (this.playerData.achievements.has(achievement.id)) {
            return 1.0;
        }

        const requirements = achievement.requirements;
        let totalProgress = 0;
        let requirementCount = 0;

        for (const [stat, requiredValue] of Object.entries(requirements)) {
            const currentValue = this.playerData.statistics.get(stat) || 0;
            const progress = Math.min(currentValue / requiredValue, 1.0);
            totalProgress += progress;
            requirementCount++;
        }

        return requirementCount > 0 ? totalProgress / requirementCount : 0;
    }

    /**
     * Get available unlocks
     */
    getAvailableUnlocks() {
        const unlocks = [];

        for (const [unlockId, unlock] of this.unlockDefinitions.entries()) {
            const isUnlocked = this.playerData.unlockedContent.has(unlockId);
            const canUnlock = !isUnlocked && this.checkUnlockRequirements(unlock);

            if (canUnlock) {
                unlocks.push({
                    ...unlock,
                    id: unlockId
                });
            }
        }

        return unlocks;
    }

    /**
     * Submit score to leaderboard
     */
    async submitScore(category, score, metadata = {}) {
        try {
            await this.leaderboardManager.submitScore(category, score, {
                playerLevel: this.playerData.level,
                playerName: this.playerData.name || 'Anonymous',
                ...metadata
            });

            this.emit('scoreSubmitted', {
                category,
                score,
                metadata
            });
        } catch (error) {
            console.error('Failed to submit score:', error);
        }
    }

    /**
     * Get leaderboard
     */
    async getLeaderboard(category, limit = 10) {
        try {
            return await this.leaderboardManager.getLeaderboard(category, limit);
        } catch (error) {
            console.error('Failed to get leaderboard:', error);
            return [];
        }
    }

    /**
     * Save player data
     */
    async savePlayerData() {
        try {
            const dataToSave = {
                ...this.playerData,
                achievements: Array.from(this.playerData.achievements.entries()),
                statistics: Array.from(this.playerData.statistics.entries()),
                unlockedContent: Array.from(this.playerData.unlockedContent),
                progressionData: Array.from(this.playerData.progressionData.entries())
            };

            localStorage.setItem('achievementProgressionData', JSON.stringify(dataToSave));

            // Cloud sync if enabled
            if (this.config.enableCloudSync) {
                // Implement cloud sync logic here
            }

            this.emit('dataSaved', {
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Failed to save player data:', error);
        }
    }

    /**
     * Reset player progress
     */
    resetProgress(confirmationCode) {
        if (confirmationCode !== 'RESET_ALL_PROGRESS') {
            throw new Error('Invalid confirmation code');
        }

        this.playerData = {
            level: 1,
            experience: 0,
            prestigeLevel: 0,
            achievements: new Map(),
            statistics: new Map(),
            unlockedContent: new Set(),
            progressionData: new Map()
        };

        this.initializeDefaultStatistics();
        this.savePlayerData();

        this.emit('progressReset', {
            timestamp: Date.now()
        });

        console.log('Player progress has been reset');
    }

    /**
     * Event emitter functionality
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        console.log('Cleaning up Achievement and Progression System...');
        
        // Save final data
        await this.savePlayerData();
        
        // Cleanup components
        if (this.achievementManager) await this.achievementManager.cleanup();
        if (this.progressionTracker) await this.progressionTracker.cleanup();
        if (this.leaderboardManager) await this.leaderboardManager.cleanup();
        if (this.unlockSystem) await this.unlockSystem.cleanup();
        if (this.statisticsTracker) await this.statisticsTracker.cleanup();
        if (this.notificationSystem) await this.notificationSystem.cleanup();
        
        // Clear event listeners
        this.eventListeners.clear();
        
        console.log('Achievement and Progression System cleanup completed');
    }
}

/**
 * Achievement Manager
 */
class AchievementManager {
    constructor(config) {
        this.config = config;
    }

    async cleanup() {
        console.log('Achievement Manager cleanup completed');
    }
}

/**
 * Progression Tracker
 */
class ProgressionTracker {
    constructor(config) {
        this.config = config;
    }

    async cleanup() {
        console.log('Progression Tracker cleanup completed');
    }
}

/**
 * Leaderboard Manager
 */
class LeaderboardManager {
    constructor(config) {
        this.config = config;
        this.leaderboards = new Map();
    }

    async submitScore(category, score, metadata) {
        if (!this.leaderboards.has(category)) {
            this.leaderboards.set(category, []);
        }

        const leaderboard = this.leaderboards.get(category);
        leaderboard.push({
            score,
            metadata,
            timestamp: Date.now()
        });

        // Sort by score (descending)
        leaderboard.sort((a, b) => b.score - a.score);

        // Keep only top entries
        if (leaderboard.length > this.config.leaderboardSize) {
            leaderboard.splice(this.config.leaderboardSize);
        }
    }

    async getLeaderboard(category, limit) {
        const leaderboard = this.leaderboards.get(category) || [];
        return leaderboard.slice(0, limit);
    }

    async cleanup() {
        console.log('Leaderboard Manager cleanup completed');
    }
}

/**
 * Unlock System
 */
class UnlockSystem {
    constructor(config) {
        this.config = config;
    }

    async cleanup() {
        console.log('Unlock System cleanup completed');
    }
}

/**
 * Statistics Tracker
 */
class StatisticsTracker {
    constructor(config) {
        this.config = config;
    }

    async cleanup() {
        console.log('Statistics Tracker cleanup completed');
    }
}

/**
 * Notification System
 */
class NotificationSystem {
    constructor(config) {
        this.config = config;
    }

    showAchievementNotification(achievement) {
        if (!this.config.enableAchievementNotifications) return;
        
        console.log(`🏆 Achievement Unlocked: ${achievement.name}`);
        // Implement visual notification here
    }

    showLevelUpNotification(oldLevel, newLevel) {
        if (!this.config.enableLevelUpNotifications) return;
        
        console.log(`📈 Level Up! ${oldLevel} → ${newLevel}`);
        // Implement visual notification here
    }

    showUnlockNotification(unlock) {
        console.log(`🔓 Unlocked: ${unlock.name}`);
        // Implement visual notification here
    }

    async cleanup() {
        console.log('Notification System cleanup completed');
    }
}

export default AchievementProgressionSystem;