/**
 * Collectibles and Lore Manager
 * Manages collectible items, lore elements, and narrative discovery system
 */

export class CollectiblesLoreManager {
    constructor(databaseIntegration, audioManager, options = {}) {
        this.databaseIntegration = databaseIntegration;
        this.audioManager = audioManager;
        
        this.options = {
            enableAudioFeedback: true,
            enableVisualEffects: true,
            discoveryRadius: 5.0,
            autoSave: true,
            rarityBonusMultiplier: 2.0,
            ...options
        };

        // Collectible tracking
        this.collectibles = new Map();
        this.discoveredCollectibles = new Set();
        this.loreEntries = new Map();
        this.unlockedLore = new Set();
        
        // Discovery tracking
        this.discoveryStats = {
            totalCollectibles: 0,
            totalDiscovered: 0,
            totalLoreUnlocked: 0,
            discoveryRate: 0,
            rarityBreakdown: {
                common: { total: 0, discovered: 0 },
                uncommon: { total: 0, discovered: 0 },
                rare: { total: 0, discovered: 0 },
                legendary: { total: 0, discovered: 0 }
            }
        };

        // Achievement tracking
        this.achievements = new Map();
        this.unlockedAchievements = new Set();

        // Performance metrics
        this.performanceMetrics = {
            collectiblesProcessed: 0,
            loreEntriesProcessed: 0,
            averageDiscoveryTime: 0,
            totalProcessingTime: 0
        };

        this.isInitialized = false;
        this.initializeAchievements();
    }

    /**
     * Initialize achievements system
     */
    initializeAchievements() {
        const achievementDefinitions = {
            first_discovery: {
                id: 'first_discovery',
                name: 'First Steps',
                description: 'Discover your first collectible',
                condition: { type: 'collectibles_found', value: 1 },
                reward: { experience: 50, currency: 25 },
                rarity: 'common'
            },
            lore_seeker: {
                id: 'lore_seeker',
                name: 'Lore Seeker',
                description: 'Unlock 10 lore entries',
                condition: { type: 'lore_unlocked', value: 10 },
                reward: { experience: 200, currency: 100 },
                rarity: 'uncommon'
            },
            completionist: {
                id: 'completionist',
                name: 'Completionist',
                description: 'Discover all collectibles in a level',
                condition: { type: 'level_completion_rate', value: 1.0 },
                reward: { experience: 500, currency: 250 },
                rarity: 'rare'
            },
            master_explorer: {
                id: 'master_explorer',
                name: 'Master Explorer',
                description: 'Discover 100 collectibles across all levels',
                condition: { type: 'total_collectibles', value: 100 },
                reward: { experience: 1000, currency: 500, unlock: 'special_vehicle' },
                rarity: 'legendary'
            },
            story_unraveler: {
                id: 'story_unraveler',
                name: 'Story Unraveler',
                description: 'Unlock all lore entries in a category',
                condition: { type: 'category_completion', category: 'any' },
                reward: { experience: 300, currency: 150 },
                rarity: 'rare'
            }
        };

        Object.values(achievementDefinitions).forEach(achievement => {
            this.achievements.set(achievement.id, achievement);
        });
    }

    /**
     * Initialize the collectibles and lore manager
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Load discovered collectibles and lore from database
            await this.loadDiscoveryData();
            
            this.isInitialized = true;
            console.log('Collectibles and Lore Manager initialized');
        } catch (error) {
            console.error('Failed to initialize Collectibles and Lore Manager:', error);
            throw error;
        }
    }

    /**
     * Load discovery data from database
     */
    async loadDiscoveryData() {
        try {
            if (this.databaseIntegration && this.databaseIntegration.isAvailable()) {
                // Load discovered collectibles
                const achievements = await this.databaseIntegration.getStatistics('collectibles');
                achievements.forEach(achievement => {
                    if (achievement.achievement_id.startsWith('collectible_')) {
                        this.discoveredCollectibles.add(achievement.achievement_id.replace('collectible_', ''));
                    } else if (achievement.achievement_id.startsWith('lore_')) {
                        this.unlockedLore.add(achievement.achievement_id.replace('lore_', ''));
                    }
                });
            }
        } catch (error) {
            console.warn('Failed to load discovery data:', error);
        }
    }

    /**
     * Add collectible to the level
     */
    addCollectible(collectibleData) {
        const collectible = this.createCollectibleInstance(collectibleData);
        this.collectibles.set(collectible.id, collectible);
        
        // Update stats
        this.discoveryStats.totalCollectibles++;
        this.discoveryStats.rarityBreakdown[collectible.rarity].total++;
        
        return collectible.id;
    }

    /**
     * Create collectible instance
     */
    createCollectibleInstance(data) {
        return {
            id: data.id || `collectible_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: data.type || 'document',
            name: data.name || 'Unknown Item',
            description: data.description || 'A mysterious item',
            
            // Position and interaction
            position: data.position || { x: 0, y: 0, z: 0 },
            discoveryRadius: data.discoveryRadius || this.options.discoveryRadius,
            interactionType: data.interactionType || 'automatic',
            
            // Content
            content: data.content || '',
            audioFile: data.audioFile || null,
            visualAsset: data.visualAsset || null,
            
            // Metadata
            rarity: data.rarity || 'common',
            loreCategory: data.loreCategory || 'general',
            emotionalImpact: data.emotionalImpact || 0.5,
            discoveryBonus: data.discoveryBonus || 10,
            
            // State
            discovered: false,
            discoveredAt: null,
            discoveredBy: null,
            
            // Lore connections
            loreUnlocks: data.loreUnlocks || [],
            relatedCollectibles: data.relatedCollectibles || [],
            
            // Visual properties
            glowColor: data.glowColor || this.getRarityColor(data.rarity || 'common'),
            glowIntensity: data.glowIntensity || this.getRarityGlowIntensity(data.rarity || 'common'),
            
            // Audio properties
            discoverySound: data.discoverySound || this.getRaritySound(data.rarity || 'common'),
            ambientSound: data.ambientSound || null
        };
    }

    /**
     * Get rarity color
     */
    getRarityColor(rarity) {
        const colors = {
            common: '#ffffff',
            uncommon: '#00ff00',
            rare: '#0080ff',
            legendary: '#ff8000'
        };
        return colors[rarity] || colors.common;
    }

    /**
     * Get rarity glow intensity
     */
    getRarityGlowIntensity(rarity) {
        const intensities = {
            common: 0.3,
            uncommon: 0.5,
            rare: 0.7,
            legendary: 1.0
        };
        return intensities[rarity] || intensities.common;
    }

    /**
     * Get rarity sound
     */
    getRaritySound(rarity) {
        const sounds = {
            common: 'collectible_common.ogg',
            uncommon: 'collectible_uncommon.ogg',
            rare: 'collectible_rare.ogg',
            legendary: 'collectible_legendary.ogg'
        };
        return sounds[rarity] || sounds.common;
    }

    /**
     * Check for collectible discoveries
     */
    checkDiscoveries(playerPosition) {
        const discoveries = [];
        
        this.collectibles.forEach((collectible, id) => {
            if (collectible.discovered) return;
            
            const distance = this.calculateDistance(playerPosition, collectible.position);
            
            if (distance <= collectible.discoveryRadius) {
                if (collectible.interactionType === 'automatic' || 
                    this.isPlayerInteracting(collectible)) {
                    const discovery = this.discoverCollectible(id);
                    if (discovery) {
                        discoveries.push(discovery);
                    }
                }
            }
        });
        
        return discoveries;
    }

    /**
     * Discover a collectible
     */
    discoverCollectible(collectibleId) {
        const startTime = performance.now();
        
        const collectible = this.collectibles.get(collectibleId);
        if (!collectible || collectible.discovered) return null;

        try {
            // Mark as discovered
            collectible.discovered = true;
            collectible.discoveredAt = Date.now();
            this.discoveredCollectibles.add(collectibleId);

            // Update stats
            this.discoveryStats.totalDiscovered++;
            this.discoveryStats.rarityBreakdown[collectible.rarity].discovered++;
            this.discoveryStats.discoveryRate = 
                this.discoveryStats.totalDiscovered / this.discoveryStats.totalCollectibles;

            // Play discovery effects
            this.playDiscoveryEffects(collectible);

            // Unlock related lore
            const unlockedLore = this.unlockRelatedLore(collectible);

            // Calculate rewards
            const rewards = this.calculateDiscoveryRewards(collectible);

            // Grant rewards
            this.grantRewards(rewards);

            // Check for achievements
            const newAchievements = this.checkAchievements();

            // Save to database
            if (this.options.autoSave) {
                this.saveDiscovery(collectible);
            }

            // Update performance metrics
            const processingTime = performance.now() - startTime;
            this.updatePerformanceMetrics(processingTime);

            const discovery = {
                collectible: { ...collectible },
                unlockedLore,
                rewards,
                newAchievements,
                discoveryTime: processingTime
            };

            console.log(`Discovered collectible: ${collectible.name} (${collectible.rarity})`);
            return discovery;

        } catch (error) {
            console.error(`Failed to discover collectible ${collectibleId}:`, error);
            return null;
        }
    }

    /**
     * Play discovery effects
     */
    playDiscoveryEffects(collectible) {
        // Play audio feedback
        if (this.options.enableAudioFeedback && this.audioManager) {
            this.audioManager.playSound(collectible.discoverySound, {
                volume: 0.7,
                spatial: true,
                position: collectible.position
            });

            // Play content audio if available
            if (collectible.audioFile) {
                setTimeout(() => {
                    this.audioManager.playSound(collectible.audioFile, {
                        volume: 0.8,
                        spatial: false
                    });
                }, 1000);
            }
        }

        // Trigger visual effects
        if (this.options.enableVisualEffects) {
            this.triggerDiscoveryVisualEffects(collectible);
        }
    }

    /**
     * Trigger discovery visual effects
     */
    triggerDiscoveryVisualEffects(collectible) {
        // This would integrate with the visual effects system
        const effectData = {
            type: 'collectible_discovery',
            position: collectible.position,
            color: collectible.glowColor,
            intensity: collectible.glowIntensity,
            duration: 3000,
            particles: {
                count: 50,
                spread: 2.0,
                lifetime: 2000
            }
        };

        // Emit event for visual effects system to handle
        this.emitEvent('visual_effect_requested', effectData);
    }

    /**
     * Unlock related lore
     */
    unlockRelatedLore(collectible) {
        const unlockedLore = [];

        collectible.loreUnlocks.forEach(loreId => {
            if (!this.unlockedLore.has(loreId)) {
                const loreEntry = this.unlockLore(loreId);
                if (loreEntry) {
                    unlockedLore.push(loreEntry);
                }
            }
        });

        return unlockedLore;
    }

    /**
     * Unlock lore entry
     */
    unlockLore(loreId) {
        if (this.unlockedLore.has(loreId)) return null;

        const loreEntry = this.loreEntries.get(loreId);
        if (!loreEntry) {
            console.warn(`Lore entry not found: ${loreId}`);
            return null;
        }

        this.unlockedLore.add(loreId);
        this.discoveryStats.totalLoreUnlocked++;

        // Save to database
        if (this.options.autoSave && this.databaseIntegration) {
            this.databaseIntegration.incrementStatistic(`lore_${loreId}`, 1, 'lore');
        }

        console.log(`Unlocked lore: ${loreEntry.title}`);
        return { ...loreEntry };
    }

    /**
     * Calculate discovery rewards
     */
    calculateDiscoveryRewards(collectible) {
        const baseReward = collectible.discoveryBonus;
        const rarityMultiplier = this.getRarityMultiplier(collectible.rarity);
        const emotionalMultiplier = 1 + (collectible.emotionalImpact * 0.5);
        
        const totalMultiplier = rarityMultiplier * emotionalMultiplier;
        
        return {
            experience: Math.floor(baseReward * totalMultiplier),
            currency: Math.floor(baseReward * totalMultiplier * 0.5),
            discoveryPoints: Math.floor(baseReward * totalMultiplier * 0.1)
        };
    }

    /**
     * Get rarity multiplier
     */
    getRarityMultiplier(rarity) {
        const multipliers = {
            common: 1.0,
            uncommon: 1.5,
            rare: 2.0,
            legendary: 3.0
        };
        return multipliers[rarity] || 1.0;
    }

    /**
     * Grant rewards
     */
    grantRewards(rewards) {
        if (this.databaseIntegration && this.databaseIntegration.isAvailable()) {
            // Grant experience
            if (rewards.experience > 0) {
                this.databaseIntegration.addExperience(rewards.experience);
            }
            
            // Grant currency
            if (rewards.currency > 0) {
                this.databaseIntegration.addCurrency(rewards.currency);
            }
        }

        // Emit reward event
        this.emitEvent('rewards_granted', rewards);
    }

    /**
     * Check for achievements
     */
    checkAchievements() {
        const newAchievements = [];

        this.achievements.forEach((achievement, id) => {
            if (this.unlockedAchievements.has(id)) return;

            if (this.evaluateAchievementCondition(achievement.condition)) {
                this.unlockAchievement(achievement);
                newAchievements.push({ ...achievement });
            }
        });

        return newAchievements;
    }

    /**
     * Evaluate achievement condition
     */
    evaluateAchievementCondition(condition) {
        switch (condition.type) {
            case 'collectibles_found':
                return this.discoveryStats.totalDiscovered >= condition.value;
            case 'lore_unlocked':
                return this.discoveryStats.totalLoreUnlocked >= condition.value;
            case 'level_completion_rate':
                return this.discoveryStats.discoveryRate >= condition.value;
            case 'total_collectibles':
                return this.discoveryStats.totalDiscovered >= condition.value;
            case 'category_completion':
                return this.isCategoryComplete(condition.category);
            default:
                return false;
        }
    }

    /**
     * Check if lore category is complete
     */
    isCategoryComplete(category) {
        if (category === 'any') {
            // Check if any category is complete
            const categories = new Map();
            
            this.loreEntries.forEach(entry => {
                if (!categories.has(entry.category)) {
                    categories.set(entry.category, { total: 0, unlocked: 0 });
                }
                categories.get(entry.category).total++;
                
                if (this.unlockedLore.has(entry.id)) {
                    categories.get(entry.category).unlocked++;
                }
            });

            return Array.from(categories.values()).some(cat => cat.total === cat.unlocked && cat.total > 0);
        } else {
            // Check specific category
            let total = 0;
            let unlocked = 0;
            
            this.loreEntries.forEach(entry => {
                if (entry.category === category) {
                    total++;
                    if (this.unlockedLore.has(entry.id)) {
                        unlocked++;
                    }
                }
            });

            return total > 0 && total === unlocked;
        }
    }

    /**
     * Unlock achievement
     */
    unlockAchievement(achievement) {
        this.unlockedAchievements.add(achievement.id);

        // Grant achievement rewards
        if (achievement.reward) {
            this.grantRewards(achievement.reward);
        }

        // Save to database
        if (this.options.autoSave && this.databaseIntegration) {
            this.databaseIntegration.incrementStatistic(`achievement_${achievement.id}`, 1, 'achievements');
        }

        console.log(`Achievement unlocked: ${achievement.name}`);
        this.emitEvent('achievement_unlocked', achievement);
    }

    /**
     * Save discovery to database
     */
    async saveDiscovery(collectible) {
        if (!this.databaseIntegration || !this.databaseIntegration.isAvailable()) return;

        try {
            await this.databaseIntegration.incrementStatistic(
                `collectible_${collectible.id}`, 
                1, 
                'collectibles'
            );
        } catch (error) {
            console.error('Failed to save discovery:', error);
        }
    }

    /**
     * Add lore entry
     */
    addLoreEntry(loreData) {
        const loreEntry = {
            id: loreData.id || `lore_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: loreData.title || 'Unknown Entry',
            content: loreData.content || '',
            category: loreData.category || 'general',
            emotionalWeight: loreData.emotionalWeight || 0.5,
            unlockCondition: loreData.unlockCondition || null,
            relatedEntries: loreData.relatedEntries || [],
            audioFile: loreData.audioFile || null,
            visualAsset: loreData.visualAsset || null
        };

        this.loreEntries.set(loreEntry.id, loreEntry);
        return loreEntry.id;
    }

    /**
     * Get discovered collectibles
     */
    getDiscoveredCollectibles() {
        const discovered = [];
        
        this.collectibles.forEach(collectible => {
            if (collectible.discovered) {
                discovered.push({ ...collectible });
            }
        });

        return discovered.sort((a, b) => b.discoveredAt - a.discoveredAt);
    }

    /**
     * Get unlocked lore
     */
    getUnlockedLore() {
        const unlocked = [];
        
        this.loreEntries.forEach(entry => {
            if (this.unlockedLore.has(entry.id)) {
                unlocked.push({ ...entry });
            }
        });

        return unlocked.sort((a, b) => a.category.localeCompare(b.category));
    }

    /**
     * Get lore by category
     */
    getLoreByCategory(category) {
        const categoryLore = [];
        
        this.loreEntries.forEach(entry => {
            if (entry.category === category && this.unlockedLore.has(entry.id)) {
                categoryLore.push({ ...entry });
            }
        });

        return categoryLore;
    }

    /**
     * Get discovery statistics
     */
    getDiscoveryStatistics() {
        return { ...this.discoveryStats };
    }

    /**
     * Get unlocked achievements
     */
    getUnlockedAchievements() {
        const unlocked = [];
        
        this.achievements.forEach(achievement => {
            if (this.unlockedAchievements.has(achievement.id)) {
                unlocked.push({ ...achievement });
            }
        });

        return unlocked;
    }

    /**
     * Calculate distance between two points
     */
    calculateDistance(pos1, pos2) {
        return Math.sqrt(
            Math.pow(pos1.x - pos2.x, 2) +
            Math.pow(pos1.y - pos2.y, 2) +
            Math.pow(pos1.z - pos2.z, 2)
        );
    }

    /**
     * Check if player is interacting
     */
    isPlayerInteracting(collectible) {
        // This would be implemented based on the game's input system
        // For now, return false to require automatic discovery
        return false;
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(processingTime) {
        this.performanceMetrics.collectiblesProcessed++;
        this.performanceMetrics.totalProcessingTime += processingTime;
        this.performanceMetrics.averageDiscoveryTime = 
            this.performanceMetrics.totalProcessingTime / this.performanceMetrics.collectiblesProcessed;
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }

    /**
     * Emit event
     */
    emitEvent(eventType, data) {
        // This would integrate with the game's event system
        console.log(`Event emitted: ${eventType}`, data);
    }

    /**
     * Clear level collectibles
     */
    clearLevelCollectibles() {
        this.collectibles.clear();
        
        // Reset level-specific stats
        this.discoveryStats.totalCollectibles = 0;
        this.discoveryStats.totalDiscovered = 0;
        this.discoveryStats.discoveryRate = 0;
        
        Object.keys(this.discoveryStats.rarityBreakdown).forEach(rarity => {
            this.discoveryStats.rarityBreakdown[rarity].total = 0;
            this.discoveryStats.rarityBreakdown[rarity].discovered = 0;
        });
    }

    /**
     * Export discovery data
     */
    exportDiscoveryData() {
        return {
            discoveredCollectibles: Array.from(this.discoveredCollectibles),
            unlockedLore: Array.from(this.unlockedLore),
            unlockedAchievements: Array.from(this.unlockedAchievements),
            discoveryStats: { ...this.discoveryStats },
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Import discovery data
     */
    importDiscoveryData(data) {
        try {
            if (data.discoveredCollectibles) {
                data.discoveredCollectibles.forEach(id => {
                    this.discoveredCollectibles.add(id);
                });
            }

            if (data.unlockedLore) {
                data.unlockedLore.forEach(id => {
                    this.unlockedLore.add(id);
                });
            }

            if (data.unlockedAchievements) {
                data.unlockedAchievements.forEach(id => {
                    this.unlockedAchievements.add(id);
                });
            }

            if (data.discoveryStats) {
                Object.assign(this.discoveryStats, data.discoveryStats);
            }

            console.log('Discovery data imported successfully');
            return true;

        } catch (error) {
            console.error('Failed to import discovery data:', error);
            return false;
        }
    }

    /**
     * Dispose of the manager
     */
    dispose() {
        this.collectibles.clear();
        this.loreEntries.clear();
        this.discoveredCollectibles.clear();
        this.unlockedLore.clear();
        this.unlockedAchievements.clear();
        
        this.isInitialized = false;
        console.log('Collectibles and Lore Manager disposed');
    }
}

export default CollectiblesLoreManager;