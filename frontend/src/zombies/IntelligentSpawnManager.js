/**
 * Intelligent Spawn Manager
 * 
 * Manages zombie spawning with intelligent patterns based on player behavior,
 * game state, and difficulty level. Creates engaging and balanced encounters.
 */

class IntelligentSpawnManager {
    constructor() {
        this.spawnPatterns = new Map();
        this.activeSpawns = [];
        this.spawnHistory = [];
        this.spawnCooldowns = new Map();
        
        // Spawn configuration
        this.maxActiveZombies = 50;
        this.baseSpawnRate = 2000; // ms between spawns
        this.spawnRadius = {
            min: 30,
            max: 100
        };
        
        // Pattern weights based on difficulty
        this.patternWeights = {
            scattered: { base: 0.4, difficultyScale: -0.1 },
            clustered: { base: 0.3, difficultyScale: 0.1 },
            ambush: { base: 0.2, difficultyScale: 0.15 },
            swarm: { base: 0.1, difficultyScale: 0.2 }
        };
        
        // Zombie type probabilities
        this.zombieTypes = {
            normal: { base: 0.7, difficultyScale: -0.1 },
            fast: { base: 0.2, difficultyScale: 0.05 },
            heavy: { base: 0.08, difficultyScale: 0.03 },
            special: { base: 0.02, difficultyScale: 0.02 }
        };
        
        this.statistics = {
            totalSpawned: 0,
            spawnsByType: {},
            spawnsByPattern: {},
            averageSpawnRate: 0,
            spawnEfficiency: 0
        };
        
        this.lastSpawnTime = 0;
        this.gameState = null;
        
        this.initializePatterns();
    }
    
    initialize(gameState) {
        console.log('🧟 Initializing Intelligent Spawn Manager');
        this.gameState = gameState;
        this.resetStatistics();
    }
    
    initializePatterns() {
        // Scattered pattern - zombies spawn randomly around player
        this.spawnPatterns.set('scattered', {
            name: 'Scattered',
            execute: (playerPos, count, difficulty) => this.executeScatteredPattern(playerPos, count, difficulty),
            description: 'Random spawns around player area'
        });
        
        // Clustered pattern - zombies spawn in groups
        this.spawnPatterns.set('clustered', {
            name: 'Clustered',
            execute: (playerPos, count, difficulty) => this.executeClusteredPattern(playerPos, count, difficulty),
            description: 'Zombies spawn in concentrated groups'
        });
        
        // Ambush pattern - zombies spawn ahead of player movement
        this.spawnPatterns.set('ambush', {
            name: 'Ambush',
            execute: (playerPos, count, difficulty) => this.executeAmbushPattern(playerPos, count, difficulty),
            description: 'Zombies spawn to intercept player path'
        });
        
        // Swarm pattern - large coordinated group spawn
        this.spawnPatterns.set('swarm', {
            name: 'Swarm',
            execute: (playerPos, count, difficulty) => this.executeSwarmPattern(playerPos, count, difficulty),
            description: 'Large coordinated zombie group'
        });
    }
    
    update(deltaTime, difficultyLevel) {
        const currentTime = Date.now();
        
        // Clean up completed spawns
        this.cleanupCompletedSpawns();
        
        // Update spawn cooldowns
        this.updateSpawnCooldowns(deltaTime);
        
        // Check if we should spawn new zombies
        if (this.shouldSpawn(currentTime, difficultyLevel)) {
            this.executeSpawnCycle(difficultyLevel);
            this.lastSpawnTime = currentTime;
        }
        
        // Update statistics
        this.updateStatistics(deltaTime);
    }
    
    shouldSpawn(currentTime, difficultyLevel) {
        // Don't spawn if at max capacity
        if (this.getActiveZombieCount() >= this.maxActiveZombies * difficultyLevel) {
            return false;
        }
        
        // Check spawn rate based on difficulty
        const adjustedSpawnRate = this.baseSpawnRate / Math.max(0.5, difficultyLevel);
        
        return currentTime - this.lastSpawnTime >= adjustedSpawnRate;
    }
    
    executeSpawnCycle(difficultyLevel) {
        if (!this.gameState || !this.gameState.player || !this.gameState.player.position) {
            return;
        }
        
        const playerPosition = this.gameState.player.position;
        const spawnCount = this.calculateSpawnCount(difficultyLevel);
        const pattern = this.selectSpawnPattern(difficultyLevel);
        
        console.log(`🧟 Executing ${pattern.name} spawn pattern (${spawnCount} zombies, difficulty: ${difficultyLevel.toFixed(2)})`);
        
        const spawnPositions = pattern.execute(playerPosition, spawnCount, difficultyLevel);
        
        // Create spawn requests
        spawnPositions.forEach(spawnData => {
            this.createSpawnRequest(spawnData, pattern.name);
        });
        
        // Update statistics
        this.statistics.spawnsByPattern[pattern.name] = 
            (this.statistics.spawnsByPattern[pattern.name] || 0) + spawnCount;
    }
    
    calculateSpawnCount(difficultyLevel) {
        const baseCount = 2;
        const difficultyBonus = Math.floor(difficultyLevel * 2);
        const randomVariation = Math.floor(Math.random() * 3);
        
        return Math.max(1, baseCount + difficultyBonus + randomVariation);
    }
    
    selectSpawnPattern(difficultyLevel) {
        const weights = [];
        const patterns = [];
        
        for (const [patternName, config] of this.spawnPatterns) {
            const weight = Math.max(0.1, 
                this.patternWeights[patternName].base + 
                (this.patternWeights[patternName].difficultyScale * difficultyLevel)
            );
            weights.push(weight);
            patterns.push(config);
        }
        
        // Weighted random selection
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return patterns[i];
            }
        }
        
        return patterns[0]; // Fallback
    }
    
    executeScatteredPattern(playerPos, count, difficulty) {
        const spawns = [];
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = this.spawnRadius.min + 
                Math.random() * (this.spawnRadius.max - this.spawnRadius.min);
            
            const position = {
                x: playerPos.x + Math.cos(angle) * distance,
                y: playerPos.y,
                z: playerPos.z + Math.sin(angle) * distance
            };
            
            spawns.push({
                position,
                type: this.selectZombieType(difficulty),
                priority: Math.random()
            });
        }
        
        return spawns;
    }
    
    executeClusteredPattern(playerPos, count, difficulty) {
        const spawns = [];
        const clusterCount = Math.max(1, Math.floor(count / 3));
        const zombiesPerCluster = Math.ceil(count / clusterCount);
        
        for (let cluster = 0; cluster < clusterCount; cluster++) {
            // Select cluster center
            const clusterAngle = (cluster / clusterCount) * Math.PI * 2;
            const clusterDistance = this.spawnRadius.min + 
                Math.random() * (this.spawnRadius.max - this.spawnRadius.min);
            
            const clusterCenter = {
                x: playerPos.x + Math.cos(clusterAngle) * clusterDistance,
                y: playerPos.y,
                z: playerPos.z + Math.sin(clusterAngle) * clusterDistance
            };
            
            // Spawn zombies around cluster center
            for (let i = 0; i < zombiesPerCluster && spawns.length < count; i++) {
                const localAngle = Math.random() * Math.PI * 2;
                const localDistance = Math.random() * 10; // Tight clustering
                
                const position = {
                    x: clusterCenter.x + Math.cos(localAngle) * localDistance,
                    y: clusterCenter.y,
                    z: clusterCenter.z + Math.sin(localAngle) * localDistance
                };
                
                spawns.push({
                    position,
                    type: this.selectZombieType(difficulty),
                    priority: 0.7 + Math.random() * 0.3 // Higher priority for clusters
                });
            }
        }
        
        return spawns;
    }
    
    executeAmbushPattern(playerPos, count, difficulty) {
        const spawns = [];
        
        // Predict player movement direction
        const playerVelocity = this.gameState.player.velocity || { x: 0, z: 0 };
        const speed = Math.sqrt(playerVelocity.x * playerVelocity.x + playerVelocity.z * playerVelocity.z);
        
        if (speed > 1) {
            // Player is moving - spawn ahead
            const moveDirection = {
                x: playerVelocity.x / speed,
                z: playerVelocity.z / speed
            };
            
            const ambushDistance = 40 + difficulty * 20;
            
            for (let i = 0; i < count; i++) {
                const spreadAngle = (Math.random() - 0.5) * Math.PI * 0.5; // 45 degree spread
                const distance = ambushDistance + Math.random() * 20;
                
                const finalDirection = {
                    x: moveDirection.x * Math.cos(spreadAngle) - moveDirection.z * Math.sin(spreadAngle),
                    z: moveDirection.x * Math.sin(spreadAngle) + moveDirection.z * Math.cos(spreadAngle)
                };
                
                const position = {
                    x: playerPos.x + finalDirection.x * distance,
                    y: playerPos.y,
                    z: playerPos.z + finalDirection.z * distance
                };
                
                spawns.push({
                    position,
                    type: this.selectZombieType(difficulty, 'ambush'),
                    priority: 0.8 + Math.random() * 0.2 // High priority for ambush
                });
            }
        } else {
            // Player is stationary - surround them
            return this.executeScatteredPattern(playerPos, count, difficulty);
        }
        
        return spawns;
    }
    
    executeSwarmPattern(playerPos, count, difficulty) {
        const spawns = [];
        const swarmCenter = this.selectSwarmCenter(playerPos);
        
        // Create a large coordinated group
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
            const distance = 5 + Math.random() * 15; // Tight formation
            
            const position = {
                x: swarmCenter.x + Math.cos(angle) * distance,
                y: swarmCenter.y,
                z: swarmCenter.z + Math.sin(angle) * distance
            };
            
            spawns.push({
                position,
                type: this.selectZombieType(difficulty, 'swarm'),
                priority: 0.9, // Very high priority
                swarmId: `swarm_${Date.now()}` // Group identifier
            });
        }
        
        return spawns;
    }
    
    selectSwarmCenter(playerPos) {
        // Select a position that's threatening but not too close
        const angle = Math.random() * Math.PI * 2;
        const distance = this.spawnRadius.max * 0.8;
        
        return {
            x: playerPos.x + Math.cos(angle) * distance,
            y: playerPos.y,
            z: playerPos.z + Math.sin(angle) * distance
        };
    }
    
    selectZombieType(difficulty, context = 'normal') {
        const weights = [];
        const types = [];
        
        for (const [typeName, config] of Object.entries(this.zombieTypes)) {
            let weight = config.base + (config.difficultyScale * difficulty);
            
            // Context-based adjustments
            if (context === 'ambush' && typeName === 'fast') {
                weight *= 1.5; // More fast zombies in ambushes
            } else if (context === 'swarm' && typeName === 'normal') {
                weight *= 1.3; // More normal zombies in swarms
            }
            
            weights.push(Math.max(0.01, weight));
            types.push(typeName);
        }
        
        // Weighted random selection
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return types[i];
            }
        }
        
        return 'normal'; // Fallback
    }
    
    createSpawnRequest(spawnData, patternName) {
        const spawnRequest = {
            id: `spawn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            position: spawnData.position,
            type: spawnData.type,
            priority: spawnData.priority,
            pattern: patternName,
            swarmId: spawnData.swarmId,
            timestamp: Date.now(),
            status: 'pending'
        };
        
        this.activeSpawns.push(spawnRequest);
        this.spawnHistory.push(spawnRequest);
        
        // Limit history size
        while (this.spawnHistory.length > 1000) {
            this.spawnHistory.shift();
        }
        
        // Update statistics
        this.statistics.totalSpawned++;
        this.statistics.spawnsByType[spawnData.type] = 
            (this.statistics.spawnsByType[spawnData.type] || 0) + 1;
        
        return spawnRequest;
    }
    
    requestSpawn(position, type = 'normal', difficulty = 1.0) {
        // Manual spawn request (for special events, etc.)
        const spawnData = {
            position,
            type,
            priority: 0.5
        };
        
        return this.createSpawnRequest(spawnData, 'manual');
    }
    
    getActiveZombieCount() {
        return this.activeSpawns.filter(spawn => spawn.status === 'active').length;
    }
    
    cleanupCompletedSpawns() {
        this.activeSpawns = this.activeSpawns.filter(spawn => 
            spawn.status !== 'completed' && spawn.status !== 'failed'
        );
    }
    
    updateSpawnCooldowns(deltaTime) {
        // Update any pattern-specific cooldowns
        for (const [pattern, cooldown] of this.spawnCooldowns) {
            this.spawnCooldowns.set(pattern, Math.max(0, cooldown - deltaTime));
        }
    }
    
    updateStatistics(deltaTime) {
        // Calculate average spawn rate
        if (this.spawnHistory.length > 1) {
            const timeSpan = this.spawnHistory[this.spawnHistory.length - 1].timestamp - 
                           this.spawnHistory[0].timestamp;
            this.statistics.averageSpawnRate = this.spawnHistory.length / (timeSpan / 1000); // per second
        }
        
        // Calculate spawn efficiency (successful spawns vs attempts)
        const successfulSpawns = this.spawnHistory.filter(spawn => spawn.status === 'completed').length;
        this.statistics.spawnEfficiency = this.spawnHistory.length > 0 ? 
            successfulSpawns / this.spawnHistory.length : 0;
    }
    
    getStatistics() {
        return {
            ...this.statistics,
            activeSpawns: this.activeSpawns.length,
            patternDistribution: this.calculatePatternDistribution(),
            typeDistribution: this.calculateTypeDistribution()
        };
    }
    
    calculatePatternDistribution() {
        const total = Object.values(this.statistics.spawnsByPattern).reduce((sum, count) => sum + count, 0);
        const distribution = {};
        
        for (const [pattern, count] of Object.entries(this.statistics.spawnsByPattern)) {
            distribution[pattern] = total > 0 ? count / total : 0;
        }
        
        return distribution;
    }
    
    calculateTypeDistribution() {
        const total = Object.values(this.statistics.spawnsByType).reduce((sum, count) => sum + count, 0);
        const distribution = {};
        
        for (const [type, count] of Object.entries(this.statistics.spawnsByType)) {
            distribution[type] = total > 0 ? count / total : 0;
        }
        
        return distribution;
    }
    
    resetStatistics() {
        this.statistics = {
            totalSpawned: 0,
            spawnsByType: {},
            spawnsByPattern: {},
            averageSpawnRate: 0,
            spawnEfficiency: 0
        };
        
        this.activeSpawns = [];
        this.spawnHistory = [];
    }
    
    // Debug methods
    getSpawnHistory(limit = 50) {
        return this.spawnHistory.slice(-limit);
    }
    
    getActiveSpawns() {
        return [...this.activeSpawns];
    }
}

export default IntelligentSpawnManager;