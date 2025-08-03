/**
 * Intelligent Zombie AI System
 * Advanced AI with behavior trees, pathfinding, and swarm intelligence
 */

import { EventEmitter } from 'events';
import { electronIntegration } from '../electron/ElectronIntegration.js';

export class IntelligentZombieAI extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            // AI Performance settings
            maxZombies: options.maxZombies || 100,
            updateFrequency: options.updateFrequency || 60, // Hz
            pathfindingFrequency: options.pathfindingFrequency || 10, // Hz
            
            // Behavior settings
            enableBehaviorTrees: options.enableBehaviorTrees !== false,
            enablePathfinding: options.enablePathfinding !== false,
            enableSwarmIntelligence: options.enableSwarmIntelligence !== false,
            enableGroupBehavior: options.enableGroupBehavior !== false,
            
            // Performance optimization
            enableLOD: options.enableLOD !== false, // Level of Detail
            maxPathfindingDistance: options.maxPathfindingDistance || 500,
            groupRadius: options.groupRadius || 50,
            
            ...options
        };
        
        // AI State Management
        this.zombies = new Map(); // zombie ID -> zombie AI state
        this.groups = new Map(); // group ID -> group data
        this.pathfindingGrid = null;
        this.lastUpdate = Date.now();
        
        // Behavior Tree Definitions
        this.behaviorTrees = this.createBehaviorTrees();
        
        // Zombie Type Definitions
        this.zombieTypes = this.createZombieTypes();
        
        // Pathfinding system
        this.pathfinder = new AStarPathfinder();
        
        // Swarm intelligence system
        this.swarmIntelligence = new SwarmIntelligence(this.options);
        
        // Performance tracking
        this.performance = {
            updateTime: 0,
            pathfindingTime: 0,
            behaviorTreeTime: 0,
            zombiesProcessed: 0,
            pathsCalculated: 0
        };
        
        this.logger = electronIntegration.getLogger();
        
        // Initialize AI system
        this.initialize();
    }

    /**
     * Initialize the AI system
     */
    initialize() {
        // Initialize pathfinding grid
        this.initializePathfindingGrid();
        
        // Set up update intervals
        this.setupUpdateIntervals();
        
        this.emit('initialized', {
            maxZombies: this.options.maxZombies,
            zombieTypes: Object.keys(this.zombieTypes),
            behaviorTrees: Object.keys(this.behaviorTrees)
        });
        
        this.logger.info('Intelligent Zombie AI System initialized', {
            maxZombies: this.options.maxZombies,
            options: this.options
        });
    }

    /**
     * Create behavior tree definitions for different zombie types
     */
    createBehaviorTrees() {
        return {
            basic: {
                name: 'Basic Zombie Behavior',
                root: {
                    type: 'selector',
                    children: [
                        {
                            type: 'sequence',
                            name: 'attack_sequence',
                            children: [
                                { type: 'condition', check: 'isPlayerInRange', range: 30 },
                                { type: 'condition', check: 'hasLineOfSight' },
                                { type: 'action', action: 'attackPlayer' }
                            ]
                        },
                        {
                            type: 'sequence',
                            name: 'chase_sequence',
                            children: [
                                { type: 'condition', check: 'canSensePlayer', range: 100 },
                                { type: 'action', action: 'moveTowardsPlayer' }
                            ]
                        },
                        {
                            type: 'sequence',
                            name: 'investigate_sequence',
                            children: [
                                { type: 'condition', check: 'heardSound' },
                                { type: 'action', action: 'investigateSound' }
                            ]
                        },
                        {
                            type: 'action',
                            action: 'wander'
                        }
                    ]
                }
            },
            
            runner: {
                name: 'Fast Runner Zombie',
                root: {
                    type: 'selector',
                    children: [
                        {
                            type: 'sequence',
                            name: 'sprint_attack',
                            children: [
                                { type: 'condition', check: 'isPlayerInRange', range: 150 },
                                { type: 'condition', check: 'hasLineOfSight' },
                                { type: 'action', action: 'sprintTowardsPlayer' }
                            ]
                        },
                        {
                            type: 'sequence',
                            name: 'flank_maneuver',
                            children: [
                                { type: 'condition', check: 'isPlayerStationary' },
                                { type: 'condition', check: 'canFlank' },
                                { type: 'action', action: 'flankPlayer' }
                            ]
                        },
                        {
                            type: 'sequence',
                            name: 'group_coordination',
                            children: [
                                { type: 'condition', check: 'hasNearbyAllies' },
                                { type: 'action', action: 'coordinateWithGroup' }
                            ]
                        },
                        {
                            type: 'action',
                            action: 'patrol'
                        }
                    ]
                }
            },
            
            brute: {
                name: 'Brute Zombie',
                root: {
                    type: 'selector',
                    children: [
                        {
                            type: 'sequence',
                            name: 'charge_attack',
                            children: [
                                { type: 'condition', check: 'isPlayerInRange', range: 200 },
                                { type: 'condition', check: 'hasChargeOpportunity' },
                                { type: 'action', action: 'chargePlayer' }
                            ]
                        },
                        {
                            type: 'sequence',
                            name: 'break_obstacles',
                            children: [
                                { type: 'condition', check: 'obstacleInPath' },
                                { type: 'action', action: 'breakObstacle' }
                            ]
                        },
                        {
                            type: 'sequence',
                            name: 'intimidate',
                            children: [
                                { type: 'condition', check: 'isPlayerNearby', range: 80 },
                                { type: 'action', action: 'roarAndIntimidate' }
                            ]
                        },
                        {
                            type: 'action',
                            action: 'guardArea'
                        }
                    ]
                }
            },
            
            spitter: {
                name: 'Spitter Zombie',
                root: {
                    type: 'selector',
                    children: [
                        {
                            type: 'sequence',
                            name: 'ranged_attack',
                            children: [
                                { type: 'condition', check: 'isPlayerInRange', range: 120 },
                                { type: 'condition', check: 'hasLineOfSight' },
                                { type: 'condition', check: 'canSpit' },
                                { type: 'action', action: 'spitAtPlayer' }
                            ]
                        },
                        {
                            type: 'sequence',
                            name: 'maintain_distance',
                            children: [
                                { type: 'condition', check: 'isPlayerTooClose', range: 40 },
                                { type: 'action', action: 'retreatFromPlayer' }
                            ]
                        },
                        {
                            type: 'sequence',
                            name: 'find_vantage',
                            children: [
                                { type: 'condition', check: 'canSensePlayer', range: 200 },
                                { type: 'action', action: 'findVantagePoint' }
                            ]
                        },
                        {
                            type: 'action',
                            action: 'seekHighGround'
                        }
                    ]
                }
            },
            
            swarm: {
                name: 'Swarm Coordinator',
                root: {
                    type: 'selector',
                    children: [
                        {
                            type: 'sequence',
                            name: 'coordinate_swarm',
                            children: [
                                { type: 'condition', check: 'isSwarmLeader' },
                                { type: 'condition', check: 'hasSwarmMembers' },
                                { type: 'action', action: 'coordinateSwarmAttack' }
                            ]
                        },
                        {
                            type: 'sequence',
                            name: 'follow_leader',
                            children: [
                                { type: 'condition', check: 'hasSwarmLeader' },
                                { type: 'action', action: 'followSwarmLeader' }
                            ]
                        },
                        {
                            type: 'sequence',
                            name: 'form_swarm',
                            children: [
                                { type: 'condition', check: 'nearbyZombiesAvailable' },
                                { type: 'action', action: 'formSwarm' }
                            ]
                        },
                        {
                            type: 'action',
                            action: 'seekOthers'
                        }
                    ]
                }
            }
        };
    }

    /**
     * Create zombie type definitions
     */
    createZombieTypes() {
        return {
            basic: {
                name: 'Basic Zombie',
                health: 100,
                speed: 25,
                damage: 20,
                detectionRange: 80,
                attackRange: 25,
                behaviorTree: 'basic',
                abilities: ['bite', 'grab'],
                spawnWeight: 60, // Higher = more common
                groupSize: { min: 1, max: 3 },
                intelligence: 1,
                aggressiveness: 0.7,
                fearFactor: 0.3
            },
            
            runner: {
                name: 'Fast Runner',
                health: 80,
                speed: 45,
                damage: 15,
                detectionRange: 120,
                attackRange: 30,
                behaviorTree: 'runner',
                abilities: ['sprint', 'leap', 'flank'],
                spawnWeight: 25,
                groupSize: { min: 2, max: 5 },
                intelligence: 3,
                aggressiveness: 0.9,
                fearFactor: 0.1
            },
            
            brute: {
                name: 'Brute Zombie',
                health: 300,
                speed: 15,
                damage: 50,
                detectionRange: 60,
                attackRange: 40,
                behaviorTree: 'brute',
                abilities: ['charge', 'smash', 'intimidate'],
                spawnWeight: 8,
                groupSize: { min: 1, max: 2 },
                intelligence: 2,
                aggressiveness: 0.8,
                fearFactor: 0.9
            },
            
            spitter: {
                name: 'Acid Spitter',
                health: 120,
                speed: 20,
                damage: 30,
                detectionRange: 150,
                attackRange: 100,
                behaviorTree: 'spitter',
                abilities: ['spit', 'retreat', 'climb'],
                spawnWeight: 15,
                groupSize: { min: 1, max: 2 },
                intelligence: 4,
                aggressiveness: 0.6,
                fearFactor: 0.4
            },
            
            swarm: {
                name: 'Swarm Zombie',
                health: 60,
                speed: 30,
                damage: 12,
                detectionRange: 100,
                attackRange: 20,
                behaviorTree: 'swarm',
                abilities: ['coordinate', 'communicate', 'overwhelm'],
                spawnWeight: 20,
                groupSize: { min: 5, max: 15 },
                intelligence: 5,
                aggressiveness: 0.5,
                fearFactor: 0.2
            },
            
            boss: {
                name: 'Zombie Boss',
                health: 800,
                speed: 35,
                damage: 80,
                detectionRange: 200,
                attackRange: 60,
                behaviorTree: 'brute', // Uses brute behavior but enhanced
                abilities: ['multiAttack', 'summon', 'rage', 'heal'],
                spawnWeight: 1,
                groupSize: { min: 1, max: 1 },
                intelligence: 6,
                aggressiveness: 1.0,
                fearFactor: 1.0
            }
        };
    }

    /**
     * Initialize pathfinding grid
     */
    initializePathfindingGrid() {
        // Create a grid for pathfinding (simplified for demo)
        const gridSize = 100;
        const cellSize = 10;
        
        this.pathfindingGrid = {
            width: gridSize,
            height: gridSize,
            cellSize: cellSize,
            cells: new Array(gridSize * gridSize).fill(0), // 0 = walkable, 1 = blocked
            obstacles: new Set()
        };
        
        this.pathfinder.setGrid(this.pathfindingGrid);
    }

    /**
     * Set up update intervals for different AI systems
     */
    setupUpdateIntervals() {
        // Main AI update loop
        this.aiUpdateInterval = setInterval(() => {
            this.updateAI();
        }, 1000 / this.options.updateFrequency);
        
        // Pathfinding update (less frequent)
        this.pathfindingInterval = setInterval(() => {
            this.updatePathfinding();
        }, 1000 / this.options.pathfindingFrequency);
    }

    /**
     * Spawn a zombie with AI
     */
    spawnZombie(position, type = 'basic', groupId = null) {
        const zombieType = this.zombieTypes[type];
        if (!zombieType) {
            throw new Error(`Invalid zombie type: ${type}`);
        }
        
        const zombieId = `zombie_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const zombieAI = {
            id: zombieId,
            type: type,
            typeData: { ...zombieType },
            
            // Position and movement
            position: { ...position },
            velocity: { x: 0, y: 0 },
            rotation: 0,
            targetPosition: null,
            path: [],
            pathIndex: 0,
            
            // AI State
            behaviorTree: this.behaviorTrees[zombieType.behaviorTree],
            currentNode: null,
            blackboard: new Map(), // AI memory/state storage
            
            // Status
            health: zombieType.health,
            maxHealth: zombieType.health,
            isAlive: true,
            isActive: true,
            
            // Behavior state
            state: 'idle', // idle, chasing, attacking, investigating, etc.
            target: null,
            lastKnownPlayerPosition: null,
            alertLevel: 0, // 0-1, how aware the zombie is
            
            // Group behavior
            groupId: groupId,
            isGroupLeader: false,
            groupRole: 'member',
            
            // Timers
            lastAttack: 0,
            lastPathUpdate: 0,
            lastBehaviorUpdate: 0,
            stateChangeTime: Date.now(),
            
            // Performance optimization
            lodLevel: 0, // 0 = full detail, higher = less detail
            lastLODUpdate: 0,
            
            // Abilities cooldowns
            abilityCooldowns: new Map()
        };
        
        // Add to zombies collection
        this.zombies.set(zombieId, zombieAI);
        
        // Add to group if specified
        if (groupId) {
            this.addZombieToGroup(zombieId, groupId);
        }
        
        // Initialize behavior tree
        this.initializeBehaviorTree(zombieAI);
        
        this.emit('zombieSpawned', {
            zombieId,
            type,
            position,
            groupId
        });
        
        this.logger.info('Zombie spawned', { zombieId, type, position });
        
        return zombieId;
    }

    /**
     * Initialize behavior tree for a zombie
     */
    initializeBehaviorTree(zombie) {
        if (!this.options.enableBehaviorTrees) return;
        
        zombie.currentNode = zombie.behaviorTree.root;
        zombie.blackboard.set('startTime', Date.now());
        zombie.blackboard.set('spawnPosition', { ...zombie.position });
    }

    /**
     * Main AI update loop
     */
    updateAI() {
        const startTime = performance.now();
        let zombiesProcessed = 0;
        
        for (const [zombieId, zombie] of this.zombies) {
            if (!zombie.isAlive || !zombie.isActive) continue;
            
            // Update Level of Detail
            this.updateZombieLOD(zombie);
            
            // Skip detailed updates for distant zombies
            if (zombie.lodLevel > 2) continue;
            
            // Update behavior tree
            if (this.options.enableBehaviorTrees) {
                this.updateBehaviorTree(zombie);
            }
            
            // Update movement
            this.updateZombieMovement(zombie);
            
            // Update group behavior
            if (this.options.enableGroupBehavior && zombie.groupId) {
                this.updateGroupBehavior(zombie);
            }
            
            zombiesProcessed++;
        }
        
        // Update swarm intelligence
        if (this.options.enableSwarmIntelligence) {
            this.swarmIntelligence.update(this.zombies, this.groups);
        }
        
        // Update performance metrics
        this.performance.updateTime = performance.now() - startTime;
        this.performance.zombiesProcessed = zombiesProcessed;
        
        this.emit('aiUpdated', {
            zombiesProcessed,
            updateTime: this.performance.updateTime
        });
    }

    /**
     * Update Level of Detail for performance optimization
     */
    updateZombieLOD(zombie) {
        if (!this.options.enableLOD) {
            zombie.lodLevel = 0;
            return;
        }
        
        const now = Date.now();
        if (now - zombie.lastLODUpdate < 1000) return; // Update LOD once per second
        
        // Calculate distance to player (simplified)
        const playerPosition = this.getPlayerPosition();
        if (!playerPosition) {
            zombie.lodLevel = 3; // Highest LOD when no player
            return;
        }
        
        const distance = this.calculateDistance(zombie.position, playerPosition);
        
        if (distance < 100) {
            zombie.lodLevel = 0; // Full detail
        } else if (distance < 200) {
            zombie.lodLevel = 1; // Reduced detail
        } else if (distance < 400) {
            zombie.lodLevel = 2; // Minimal detail
        } else {
            zombie.lodLevel = 3; // No updates
        }
        
        zombie.lastLODUpdate = now;
    }    /**

     * Update behavior tree for a zombie
     */
    updateBehaviorTree(zombie) {
        const now = Date.now();
        if (now - zombie.lastBehaviorUpdate < 100) return; // Update 10 times per second
        
        const startTime = performance.now();
        
        try {
            const result = this.executeBehaviorNode(zombie, zombie.currentNode);
            
            // Handle behavior tree result
            if (result === 'success' || result === 'failure') {
                // Reset to root for next iteration
                zombie.currentNode = zombie.behaviorTree.root;
            }
            
        } catch (error) {
            this.logger.error('Behavior tree execution error:', error);
            zombie.currentNode = zombie.behaviorTree.root;
        }
        
        zombie.lastBehaviorUpdate = now;
        this.performance.behaviorTreeTime += performance.now() - startTime;
    }

    /**
     * Execute a behavior tree node
     */
    executeBehaviorNode(zombie, node) {
        if (!node) return 'failure';
        
        switch (node.type) {
            case 'selector':
                return this.executeSelectorNode(zombie, node);
            case 'sequence':
                return this.executeSequenceNode(zombie, node);
            case 'condition':
                return this.executeConditionNode(zombie, node);
            case 'action':
                return this.executeActionNode(zombie, node);
            default:
                return 'failure';
        }
    }

    /**
     * Execute selector node (OR logic)
     */
    executeSelectorNode(zombie, node) {
        for (const child of node.children) {
            const result = this.executeBehaviorNode(zombie, child);
            if (result === 'success' || result === 'running') {
                return result;
            }
        }
        return 'failure';
    }

    /**
     * Execute sequence node (AND logic)
     */
    executeSequenceNode(zombie, node) {
        for (const child of node.children) {
            const result = this.executeBehaviorNode(zombie, child);
            if (result === 'failure' || result === 'running') {
                return result;
            }
        }
        return 'success';
    }

    /**
     * Execute condition node
     */
    executeConditionNode(zombie, node) {
        switch (node.check) {
            case 'isPlayerInRange':
                return this.checkPlayerInRange(zombie, node.range) ? 'success' : 'failure';
            case 'hasLineOfSight':
                return this.checkLineOfSight(zombie) ? 'success' : 'failure';
            case 'canSensePlayer':
                return this.checkCanSensePlayer(zombie, node.range) ? 'success' : 'failure';
            case 'heardSound':
                return this.checkHeardSound(zombie) ? 'success' : 'failure';
            case 'isPlayerStationary':
                return this.checkPlayerStationary(zombie) ? 'success' : 'failure';
            case 'canFlank':
                return this.checkCanFlank(zombie) ? 'success' : 'failure';
            case 'hasNearbyAllies':
                return this.checkHasNearbyAllies(zombie) ? 'success' : 'failure';
            case 'hasChargeOpportunity':
                return this.checkChargeOpportunity(zombie) ? 'success' : 'failure';
            case 'obstacleInPath':
                return this.checkObstacleInPath(zombie) ? 'success' : 'failure';
            case 'isPlayerNearby':
                return this.checkPlayerInRange(zombie, node.range) ? 'success' : 'failure';
            case 'isPlayerTooClose':
                return this.checkPlayerInRange(zombie, node.range) ? 'success' : 'failure';
            case 'canSpit':
                return this.checkCanSpit(zombie) ? 'success' : 'failure';
            case 'isSwarmLeader':
                return zombie.isGroupLeader ? 'success' : 'failure';
            case 'hasSwarmMembers':
                return this.checkHasSwarmMembers(zombie) ? 'success' : 'failure';
            case 'hasSwarmLeader':
                return this.checkHasSwarmLeader(zombie) ? 'success' : 'failure';
            case 'nearbyZombiesAvailable':
                return this.checkNearbyZombiesAvailable(zombie) ? 'success' : 'failure';
            default:
                return 'failure';
        }
    }

    /**
     * Execute action node
     */
    executeActionNode(zombie, node) {
        switch (node.action) {
            case 'attackPlayer':
                return this.actionAttackPlayer(zombie);
            case 'moveTowardsPlayer':
                return this.actionMoveTowardsPlayer(zombie);
            case 'investigateSound':
                return this.actionInvestigateSound(zombie);
            case 'wander':
                return this.actionWander(zombie);
            case 'sprintTowardsPlayer':
                return this.actionSprintTowardsPlayer(zombie);
            case 'flankPlayer':
                return this.actionFlankPlayer(zombie);
            case 'coordinateWithGroup':
                return this.actionCoordinateWithGroup(zombie);
            case 'patrol':
                return this.actionPatrol(zombie);
            case 'chargePlayer':
                return this.actionChargePlayer(zombie);
            case 'breakObstacle':
                return this.actionBreakObstacle(zombie);
            case 'roarAndIntimidate':
                return this.actionRoarAndIntimidate(zombie);
            case 'guardArea':
                return this.actionGuardArea(zombie);
            case 'spitAtPlayer':
                return this.actionSpitAtPlayer(zombie);
            case 'retreatFromPlayer':
                return this.actionRetreatFromPlayer(zombie);
            case 'findVantagePoint':
                return this.actionFindVantagePoint(zombie);
            case 'seekHighGround':
                return this.actionSeekHighGround(zombie);
            case 'coordinateSwarmAttack':
                return this.actionCoordinateSwarmAttack(zombie);
            case 'followSwarmLeader':
                return this.actionFollowSwarmLeader(zombie);
            case 'formSwarm':
                return this.actionFormSwarm(zombie);
            case 'seekOthers':
                return this.actionSeekOthers(zombie);
            default:
                return 'failure';
        }
    }

    /**
     * Condition: Check if player is in range
     */
    checkPlayerInRange(zombie, range) {
        const playerPosition = this.getPlayerPosition();
        if (!playerPosition) return false;
        
        const distance = this.calculateDistance(zombie.position, playerPosition);
        return distance <= range;
    }

    /**
     * Condition: Check line of sight to player
     */
    checkLineOfSight(zombie) {
        const playerPosition = this.getPlayerPosition();
        if (!playerPosition) return false;
        
        // Simplified line of sight check
        return this.hasLineOfSight(zombie.position, playerPosition);
    }

    /**
     * Condition: Check if zombie can sense player
     */
    checkCanSensePlayer(zombie, range) {
        const playerPosition = this.getPlayerPosition();
        if (!playerPosition) return false;
        
        const distance = this.calculateDistance(zombie.position, playerPosition);
        
        // Adjust detection based on zombie intelligence and alert level
        const detectionRange = range * (1 + zombie.alertLevel) * (zombie.typeData.intelligence / 3);
        
        return distance <= detectionRange;
    }

    /**
     * Action: Attack player
     */
    actionAttackPlayer(zombie) {
        const now = Date.now();
        const attackCooldown = 1000; // 1 second between attacks
        
        if (now - zombie.lastAttack < attackCooldown) {
            return 'running';
        }
        
        const playerPosition = this.getPlayerPosition();
        if (!playerPosition) return 'failure';
        
        const distance = this.calculateDistance(zombie.position, playerPosition);
        if (distance > zombie.typeData.attackRange) {
            return 'failure';
        }
        
        // Perform attack
        this.performAttack(zombie, playerPosition);
        zombie.lastAttack = now;
        zombie.state = 'attacking';
        
        return 'success';
    }

    /**
     * Action: Move towards player
     */
    actionMoveTowardsPlayer(zombie) {
        const playerPosition = this.getPlayerPosition();
        if (!playerPosition) return 'failure';
        
        zombie.targetPosition = { ...playerPosition };
        zombie.lastKnownPlayerPosition = { ...playerPosition };
        zombie.state = 'chasing';
        
        // Update path if needed
        this.updateZombiePath(zombie);
        
        return 'running';
    }

    /**
     * Action: Wander randomly
     */
    actionWander(zombie) {
        const now = Date.now();
        
        // Change wander target every 5 seconds
        if (!zombie.targetPosition || now - zombie.stateChangeTime > 5000) {
            const wanderRadius = 100;
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * wanderRadius;
            
            zombie.targetPosition = {
                x: zombie.position.x + Math.cos(angle) * distance,
                y: zombie.position.y + Math.sin(angle) * distance
            };
            
            zombie.stateChangeTime = now;
            zombie.state = 'wandering';
        }
        
        return 'running';
    }

    /**
     * Action: Sprint towards player (runner zombie)
     */
    actionSprintTowardsPlayer(zombie) {
        const playerPosition = this.getPlayerPosition();
        if (!playerPosition) return 'failure';
        
        zombie.targetPosition = { ...playerPosition };
        zombie.state = 'sprinting';
        
        // Increase speed for sprinting
        zombie.sprintMultiplier = 1.5;
        
        return 'running';
    }

    /**
     * Action: Coordinate swarm attack
     */
    actionCoordinateSwarmAttack(zombie) {
        if (!zombie.groupId) return 'failure';
        
        const group = this.groups.get(zombie.groupId);
        if (!group) return 'failure';
        
        const playerPosition = this.getPlayerPosition();
        if (!playerPosition) return 'failure';
        
        // Coordinate attack positions for swarm members
        this.coordinateSwarmPositions(group, playerPosition);
        
        zombie.state = 'coordinating';
        return 'success';
    }

    /**
     * Update zombie movement
     */
    updateZombieMovement(zombie) {
        if (!zombie.targetPosition) return;
        
        const speed = zombie.typeData.speed * (zombie.sprintMultiplier || 1);
        const deltaTime = 1 / this.options.updateFrequency;
        
        // Calculate direction to target
        const dx = zombie.targetPosition.x - zombie.position.x;
        const dy = zombie.targetPosition.y - zombie.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 5) {
            // Reached target
            zombie.targetPosition = null;
            zombie.velocity = { x: 0, y: 0 };
            return;
        }
        
        // Normalize direction and apply speed
        const dirX = dx / distance;
        const dirY = dy / distance;
        
        zombie.velocity.x = dirX * speed;
        zombie.velocity.y = dirY * speed;
        
        // Update position
        zombie.position.x += zombie.velocity.x * deltaTime;
        zombie.position.y += zombie.velocity.y * deltaTime;
        
        // Update rotation to face movement direction
        zombie.rotation = Math.atan2(dy, dx);
        
        // Reset sprint multiplier
        zombie.sprintMultiplier = 1;
    }

    /**
     * Update pathfinding for zombies
     */
    updatePathfinding() {
        if (!this.options.enablePathfinding) return;
        
        const startTime = performance.now();
        let pathsCalculated = 0;
        
        for (const [zombieId, zombie] of this.zombies) {
            if (!zombie.isAlive || !zombie.isActive || zombie.lodLevel > 1) continue;
            
            const now = Date.now();
            if (now - zombie.lastPathUpdate < 500) continue; // Update paths every 500ms
            
            if (zombie.targetPosition) {
                this.calculatePath(zombie);
                pathsCalculated++;
            }
            
            zombie.lastPathUpdate = now;
        }
        
        this.performance.pathfindingTime = performance.now() - startTime;
        this.performance.pathsCalculated = pathsCalculated;
    }

    /**
     * Calculate path for zombie using A*
     */
    calculatePath(zombie) {
        if (!zombie.targetPosition) return;
        
        const start = this.worldToGrid(zombie.position);
        const end = this.worldToGrid(zombie.targetPosition);
        
        const path = this.pathfinder.findPath(start, end);
        
        if (path && path.length > 0) {
            zombie.path = path.map(gridPos => this.gridToWorld(gridPos));
            zombie.pathIndex = 0;
        }
    }

    /**
     * Update zombie path following
     */
    updateZombiePath(zombie) {
        if (!zombie.path || zombie.path.length === 0) return;
        
        const currentTarget = zombie.path[zombie.pathIndex];
        if (!currentTarget) return;
        
        const distance = this.calculateDistance(zombie.position, currentTarget);
        
        if (distance < 10) {
            // Reached current path node, move to next
            zombie.pathIndex++;
            
            if (zombie.pathIndex >= zombie.path.length) {
                // Reached end of path
                zombie.path = [];
                zombie.pathIndex = 0;
            }
        }
        
        // Set current path node as target
        if (zombie.pathIndex < zombie.path.length) {
            zombie.targetPosition = zombie.path[zombie.pathIndex];
        }
    }

    /**
     * Add zombie to group
     */
    addZombieToGroup(zombieId, groupId) {
        let group = this.groups.get(groupId);
        
        if (!group) {
            group = {
                id: groupId,
                members: new Set(),
                leader: null,
                formation: 'swarm',
                target: null,
                state: 'idle',
                cohesion: 0.8,
                separation: 0.6,
                alignment: 0.7
            };
            this.groups.set(groupId, group);
        }
        
        group.members.add(zombieId);
        
        // Assign leader if none exists
        if (!group.leader) {
            group.leader = zombieId;
            const zombie = this.zombies.get(zombieId);
            if (zombie) {
                zombie.isGroupLeader = true;
                zombie.groupRole = 'leader';
            }
        }
        
        const zombie = this.zombies.get(zombieId);
        if (zombie) {
            zombie.groupId = groupId;
        }
    }

    /**
     * Update group behavior
     */
    updateGroupBehavior(zombie) {
        if (!zombie.groupId) return;
        
        const group = this.groups.get(zombie.groupId);
        if (!group) return;
        
        // Apply flocking behavior
        this.applyFlockingBehavior(zombie, group);
        
        // Update group state
        this.updateGroupState(group);
    }

    /**
     * Apply flocking behavior (boids algorithm)
     */
    applyFlockingBehavior(zombie, group) {
        const neighbors = this.getNearbyGroupMembers(zombie, group);
        if (neighbors.length === 0) return;
        
        // Calculate flocking forces
        const cohesion = this.calculateCohesion(zombie, neighbors);
        const separation = this.calculateSeparation(zombie, neighbors);
        const alignment = this.calculateAlignment(zombie, neighbors);
        
        // Apply forces with group weights
        const cohesionForce = this.multiplyVector(cohesion, group.cohesion);
        const separationForce = this.multiplyVector(separation, group.separation);
        const alignmentForce = this.multiplyVector(alignment, group.alignment);
        
        // Combine forces
        const totalForce = this.addVectors([cohesionForce, separationForce, alignmentForce]);
        
        // Apply to zombie's target position
        if (zombie.targetPosition) {
            zombie.targetPosition.x += totalForce.x;
            zombie.targetPosition.y += totalForce.y;
        }
    }

    /**
     * Get nearby group members
     */
    getNearbyGroupMembers(zombie, group) {
        const neighbors = [];
        const maxDistance = this.options.groupRadius;
        
        for (const memberId of group.members) {
            if (memberId === zombie.id) continue;
            
            const member = this.zombies.get(memberId);
            if (!member || !member.isAlive) continue;
            
            const distance = this.calculateDistance(zombie.position, member.position);
            if (distance <= maxDistance) {
                neighbors.push(member);
            }
        }
        
        return neighbors;
    }

    /**
     * Calculate cohesion force (move towards center of group)
     */
    calculateCohesion(zombie, neighbors) {
        if (neighbors.length === 0) return { x: 0, y: 0 };
        
        let centerX = 0;
        let centerY = 0;
        
        for (const neighbor of neighbors) {
            centerX += neighbor.position.x;
            centerY += neighbor.position.y;
        }
        
        centerX /= neighbors.length;
        centerY /= neighbors.length;
        
        return {
            x: (centerX - zombie.position.x) * 0.01,
            y: (centerY - zombie.position.y) * 0.01
        };
    }

    /**
     * Calculate separation force (avoid crowding)
     */
    calculateSeparation(zombie, neighbors) {
        let separationX = 0;
        let separationY = 0;
        
        for (const neighbor of neighbors) {
            const dx = zombie.position.x - neighbor.position.x;
            const dy = zombie.position.y - neighbor.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0 && distance < 30) {
                separationX += dx / distance;
                separationY += dy / distance;
            }
        }
        
        return {
            x: separationX * 0.05,
            y: separationY * 0.05
        };
    }

    /**
     * Calculate alignment force (match velocity of neighbors)
     */
    calculateAlignment(zombie, neighbors) {
        if (neighbors.length === 0) return { x: 0, y: 0 };
        
        let avgVelX = 0;
        let avgVelY = 0;
        
        for (const neighbor of neighbors) {
            avgVelX += neighbor.velocity.x;
            avgVelY += neighbor.velocity.y;
        }
        
        avgVelX /= neighbors.length;
        avgVelY /= neighbors.length;
        
        return {
            x: (avgVelX - zombie.velocity.x) * 0.02,
            y: (avgVelY - zombie.velocity.y) * 0.02
        };
    }

    /**
     * Coordinate swarm positions for attack
     */
    coordinateSwarmPositions(group, playerPosition) {
        const members = Array.from(group.members).map(id => this.zombies.get(id)).filter(Boolean);
        const attackRadius = 80;
        const angleStep = (Math.PI * 2) / members.length;
        
        members.forEach((zombie, index) => {
            const angle = angleStep * index;
            const targetX = playerPosition.x + Math.cos(angle) * attackRadius;
            const targetY = playerPosition.y + Math.sin(angle) * attackRadius;
            
            zombie.targetPosition = { x: targetX, y: targetY };
            zombie.state = 'coordinated_attack';
        });
    }

    /**
     * Perform attack on target
     */
    performAttack(zombie, targetPosition) {
        const damage = zombie.typeData.damage;
        
        this.emit('zombieAttack', {
            zombieId: zombie.id,
            position: zombie.position,
            targetPosition,
            damage,
            attackType: zombie.typeData.abilities[0] || 'bite'
        });
        
        // Add screen shake and effects
        this.emit('combatEffect', {
            type: 'attack',
            position: zombie.position,
            intensity: damage / 50
        });
    }

    /**
     * Utility functions
     */
    calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    hasLineOfSight(from, to) {
        // Simplified line of sight check
        // In a real implementation, this would check for obstacles
        return true;
    }

    getPlayerPosition() {
        // This would be provided by the game engine
        // For now, return a mock position
        return { x: 400, y: 300 };
    }

    worldToGrid(worldPos) {
        return {
            x: Math.floor(worldPos.x / this.pathfindingGrid.cellSize),
            y: Math.floor(worldPos.y / this.pathfindingGrid.cellSize)
        };
    }

    gridToWorld(gridPos) {
        return {
            x: gridPos.x * this.pathfindingGrid.cellSize + this.pathfindingGrid.cellSize / 2,
            y: gridPos.y * this.pathfindingGrid.cellSize + this.pathfindingGrid.cellSize / 2
        };
    }

    multiplyVector(vector, scalar) {
        return {
            x: vector.x * scalar,
            y: vector.y * scalar
        };
    }

    addVectors(vectors) {
        return vectors.reduce((sum, vector) => ({
            x: sum.x + vector.x,
            y: sum.y + vector.y
        }), { x: 0, y: 0 });
    }

    /**
     * Additional condition checks
     */
    checkHeardSound(zombie) {
        // Check if zombie heard a sound (gunshot, car engine, etc.)
        return zombie.blackboard.get('heardSound') || false;
    }

    checkPlayerStationary(zombie) {
        const playerPosition = this.getPlayerPosition();
        const lastPlayerPos = zombie.blackboard.get('lastPlayerPosition');
        
        if (!playerPosition || !lastPlayerPos) return false;
        
        const distance = this.calculateDistance(playerPosition, lastPlayerPos);
        return distance < 10; // Player hasn't moved much
    }

    checkCanFlank(zombie) {
        // Check if zombie can flank the player
        const playerPosition = this.getPlayerPosition();
        if (!playerPosition) return false;
        
        // Simplified flank check - look for alternative paths
        return Math.random() > 0.7; // 30% chance to attempt flanking
    }

    checkHasNearbyAllies(zombie) {
        let allyCount = 0;
        const searchRadius = 50;
        
        for (const [otherId, other] of this.zombies) {
            if (otherId === zombie.id || !other.isAlive) continue;
            
            const distance = this.calculateDistance(zombie.position, other.position);
            if (distance <= searchRadius) {
                allyCount++;
            }
        }
        
        return allyCount >= 2;
    }

    checkChargeOpportunity(zombie) {
        const playerPosition = this.getPlayerPosition();
        if (!playerPosition) return false;
        
        const distance = this.calculateDistance(zombie.position, playerPosition);
        return distance > 50 && distance < 200 && this.hasLineOfSight(zombie.position, playerPosition);
    }

    checkObstacleInPath(zombie) {
        // Check if there's an obstacle in the zombie's path
        return zombie.blackboard.get('obstacleDetected') || false;
    }

    checkCanSpit(zombie) {
        const cooldown = zombie.abilityCooldowns.get('spit') || 0;
        return Date.now() - cooldown > 3000; // 3 second cooldown
    }

    checkHasSwarmMembers(zombie) {
        if (!zombie.groupId) return false;
        const group = this.groups.get(zombie.groupId);
        return group && group.members.size > 1;
    }

    checkHasSwarmLeader(zombie) {
        if (!zombie.groupId) return false;
        const group = this.groups.get(zombie.groupId);
        return group && group.leader && group.leader !== zombie.id;
    }

    checkNearbyZombiesAvailable(zombie) {
        let nearbyCount = 0;
        const searchRadius = 100;
        
        for (const [otherId, other] of this.zombies) {
            if (otherId === zombie.id || !other.isAlive || other.groupId) continue;
            
            const distance = this.calculateDistance(zombie.position, other.position);
            if (distance <= searchRadius) {
                nearbyCount++;
            }
        }
        
        return nearbyCount >= 3;
    }

    /**
     * Additional action implementations
     */
    actionInvestigateSound(zombie) {
        const soundPosition = zombie.blackboard.get('soundPosition');
        if (!soundPosition) return 'failure';
        
        zombie.targetPosition = { ...soundPosition };
        zombie.state = 'investigating';
        
        return 'running';
    }

    actionPatrol(zombie) {
        const patrolPoints = zombie.blackboard.get('patrolPoints') || [];
        
        if (patrolPoints.length === 0) {
            // Generate patrol points around spawn area
            const spawnPos = zombie.blackboard.get('spawnPosition');
            const patrolRadius = 150;
            
            for (let i = 0; i < 4; i++) {
                const angle = (Math.PI * 2 / 4) * i;
                patrolPoints.push({
                    x: spawnPos.x + Math.cos(angle) * patrolRadius,
                    y: spawnPos.y + Math.sin(angle) * patrolRadius
                });
            }
            
            zombie.blackboard.set('patrolPoints', patrolPoints);
            zombie.blackboard.set('currentPatrolIndex', 0);
        }
        
        const currentIndex = zombie.blackboard.get('currentPatrolIndex') || 0;
        zombie.targetPosition = patrolPoints[currentIndex];
        
        // Check if reached patrol point
        if (zombie.targetPosition) {
            const distance = this.calculateDistance(zombie.position, zombie.targetPosition);
            if (distance < 20) {
                const nextIndex = (currentIndex + 1) % patrolPoints.length;
                zombie.blackboard.set('currentPatrolIndex', nextIndex);
            }
        }
        
        zombie.state = 'patrolling';
        return 'running';
    }

    actionChargePlayer(zombie) {
        const playerPosition = this.getPlayerPosition();
        if (!playerPosition) return 'failure';
        
        zombie.targetPosition = { ...playerPosition };
        zombie.state = 'charging';
        zombie.sprintMultiplier = 2.0; // Double speed for charge
        
        return 'running';
    }

    actionBreakObstacle(zombie) {
        // Simulate breaking an obstacle
        zombie.blackboard.set('obstacleDetected', false);
        zombie.state = 'breaking_obstacle';
        
        this.emit('obstacleDestroyed', {
            zombieId: zombie.id,
            position: zombie.position
        });
        
        return 'success';
    }

    actionRoarAndIntimidate(zombie) {
        zombie.state = 'intimidating';
        
        this.emit('zombieRoar', {
            zombieId: zombie.id,
            position: zombie.position,
            intensity: zombie.typeData.fearFactor
        });
        
        return 'success';
    }

    actionGuardArea(zombie) {
        const guardPosition = zombie.blackboard.get('guardPosition') || zombie.blackboard.get('spawnPosition');
        const distance = this.calculateDistance(zombie.position, guardPosition);
        
        if (distance > 30) {
            zombie.targetPosition = { ...guardPosition };
        } else {
            zombie.targetPosition = null;
        }
        
        zombie.state = 'guarding';
        return 'running';
    }

    actionSpitAtPlayer(zombie) {
        const playerPosition = this.getPlayerPosition();
        if (!playerPosition) return 'failure';
        
        zombie.abilityCooldowns.set('spit', Date.now());
        zombie.state = 'spitting';
        
        this.emit('zombieSpit', {
            zombieId: zombie.id,
            from: zombie.position,
            to: playerPosition,
            damage: zombie.typeData.damage
        });
        
        return 'success';
    }

    actionRetreatFromPlayer(zombie) {
        const playerPosition = this.getPlayerPosition();
        if (!playerPosition) return 'failure';
        
        // Calculate retreat direction (opposite of player)
        const dx = zombie.position.x - playerPosition.x;
        const dy = zombie.position.y - playerPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const retreatDistance = 80;
            zombie.targetPosition = {
                x: zombie.position.x + (dx / distance) * retreatDistance,
                y: zombie.position.y + (dy / distance) * retreatDistance
            };
        }
        
        zombie.state = 'retreating';
        return 'running';
    }

    actionFindVantagePoint(zombie) {
        // Find a high ground position for better spit attacks
        const vantagePoints = zombie.blackboard.get('vantagePoints') || [];
        
        if (vantagePoints.length === 0) {
            // Generate some vantage points (simplified)
            for (let i = 0; i < 3; i++) {
                vantagePoints.push({
                    x: zombie.position.x + (Math.random() - 0.5) * 200,
                    y: zombie.position.y + (Math.random() - 0.5) * 200,
                    height: Math.random() * 50 + 20
                });
            }
            zombie.blackboard.set('vantagePoints', vantagePoints);
        }
        
        // Choose closest vantage point
        let closestPoint = vantagePoints[0];
        let closestDistance = this.calculateDistance(zombie.position, closestPoint);
        
        for (const point of vantagePoints) {
            const distance = this.calculateDistance(zombie.position, point);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestPoint = point;
            }
        }
        
        zombie.targetPosition = { ...closestPoint };
        zombie.state = 'seeking_vantage';
        
        return 'running';
    }

    actionSeekHighGround(zombie) {
        // Move towards higher elevation
        const currentHeight = zombie.blackboard.get('currentHeight') || 0;
        const targetHeight = currentHeight + 20;
        
        // Simplified - just move in a direction that might have higher ground
        const angle = Math.random() * Math.PI * 2;
        const distance = 100;
        
        zombie.targetPosition = {
            x: zombie.position.x + Math.cos(angle) * distance,
            y: zombie.position.y + Math.sin(angle) * distance
        };
        
        zombie.state = 'seeking_high_ground';
        return 'running';
    }

    actionFollowSwarmLeader(zombie) {
        if (!zombie.groupId) return 'failure';
        
        const group = this.groups.get(zombie.groupId);
        if (!group || !group.leader) return 'failure';
        
        const leader = this.zombies.get(group.leader);
        if (!leader) return 'failure';
        
        // Follow leader with some offset
        const followDistance = 40;
        const angle = Math.random() * Math.PI * 2;
        
        zombie.targetPosition = {
            x: leader.position.x + Math.cos(angle) * followDistance,
            y: leader.position.y + Math.sin(angle) * followDistance
        };
        
        zombie.state = 'following_leader';
        return 'running';
    }

    actionFormSwarm(zombie) {
        // Create a new swarm group
        const groupId = `swarm_${Date.now()}`;
        this.addZombieToGroup(zombie.id, groupId);
        
        // Find nearby zombies to add to swarm
        const searchRadius = 100;
        for (const [otherId, other] of this.zombies) {
            if (otherId === zombie.id || !other.isAlive || other.groupId) continue;
            
            const distance = this.calculateDistance(zombie.position, other.position);
            if (distance <= searchRadius) {
                this.addZombieToGroup(otherId, groupId);
            }
        }
        
        zombie.state = 'forming_swarm';
        return 'success';
    }

    actionSeekOthers(zombie) {
        // Look for other zombies to form groups with
        let closestZombie = null;
        let closestDistance = Infinity;
        
        for (const [otherId, other] of this.zombies) {
            if (otherId === zombie.id || !other.isAlive || other.groupId) continue;
            
            const distance = this.calculateDistance(zombie.position, other.position);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestZombie = other;
            }
        }
        
        if (closestZombie) {
            zombie.targetPosition = { ...closestZombie.position };
            zombie.state = 'seeking_others';
            return 'running';
        }
        
        return 'failure';
    }

    /**
     * Remove zombie from AI system
     */
    removeZombie(zombieId) {
        const zombie = this.zombies.get(zombieId);
        if (!zombie) return;
        
        // Remove from group if in one
        if (zombie.groupId) {
            const group = this.groups.get(zombie.groupId);
            if (group) {
                group.members.delete(zombieId);
                
                // If this was the leader, assign new leader
                if (group.leader === zombieId && group.members.size > 0) {
                    group.leader = Array.from(group.members)[0];
                    const newLeader = this.zombies.get(group.leader);
                    if (newLeader) {
                        newLeader.isGroupLeader = true;
                        newLeader.groupRole = 'leader';
                    }
                }
                
                // Remove group if empty
                if (group.members.size === 0) {
                    this.groups.delete(zombie.groupId);
                }
            }
        }
        
        this.zombies.delete(zombieId);
        
        this.emit('zombieRemoved', { zombieId });
    }

    /**
     * Get AI system status
     */
    getStatus() {
        return {
            zombieCount: this.zombies.size,
            groupCount: this.groups.size,
            performance: { ...this.performance },
            options: { ...this.options }
        };
    }

    /**
     * Dispose of AI system
     */
    dispose() {
        if (this.aiUpdateInterval) {
            clearInterval(this.aiUpdateInterval);
        }
        
        if (this.pathfindingInterval) {
            clearInterval(this.pathfindingInterval);
        }
        
        this.zombies.clear();
        this.groups.clear();
        
        this.removeAllListeners();
        this.logger.info('Intelligent Zombie AI System disposed');
    }
}

/**
 * A* Pathfinding Implementation
 */
class AStarPathfinder {
    constructor() {
        this.grid = null;
    }

    setGrid(grid) {
        this.grid = grid;
    }

    findPath(start, end) {
        if (!this.grid) return null;
        
        const openSet = [start];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();
        
        gScore.set(this.positionKey(start), 0);
        fScore.set(this.positionKey(start), this.heuristic(start, end));
        
        while (openSet.length > 0) {
            // Find node with lowest fScore
            let current = openSet[0];
            let currentIndex = 0;
            
            for (let i = 1; i < openSet.length; i++) {
                if (fScore.get(this.positionKey(openSet[i])) < fScore.get(this.positionKey(current))) {
                    current = openSet[i];
                    currentIndex = i;
                }
            }
            
            // Remove current from openSet
            openSet.splice(currentIndex, 1);
            closedSet.add(this.positionKey(current));
            
            // Check if we reached the goal
            if (current.x === end.x && current.y === end.y) {
                return this.reconstructPath(cameFrom, current);
            }
            
            // Check neighbors
            const neighbors = this.getNeighbors(current);
            
            for (const neighbor of neighbors) {
                const neighborKey = this.positionKey(neighbor);
                
                if (closedSet.has(neighborKey)) continue;
                if (!this.isWalkable(neighbor)) continue;
                
                const tentativeGScore = gScore.get(this.positionKey(current)) + 1;
                
                if (!openSet.some(pos => pos.x === neighbor.x && pos.y === neighbor.y)) {
                    openSet.push(neighbor);
                } else if (tentativeGScore >= gScore.get(neighborKey)) {
                    continue;
                }
                
                cameFrom.set(neighborKey, current);
                gScore.set(neighborKey, tentativeGScore);
                fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, end));
            }
        }
        
        return null; // No path found
    }

    positionKey(pos) {
        return `${pos.x},${pos.y}`;
    }

    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    getNeighbors(pos) {
        const neighbors = [];
        const directions = [
            { x: -1, y: 0 }, { x: 1, y: 0 },
            { x: 0, y: -1 }, { x: 0, y: 1 },
            { x: -1, y: -1 }, { x: 1, y: -1 },
            { x: -1, y: 1 }, { x: 1, y: 1 }
        ];
        
        for (const dir of directions) {
            const neighbor = {
                x: pos.x + dir.x,
                y: pos.y + dir.y
            };
            
            if (this.isInBounds(neighbor)) {
                neighbors.push(neighbor);
            }
        }
        
        return neighbors;
    }

    isInBounds(pos) {
        return pos.x >= 0 && pos.x < this.grid.width &&
               pos.y >= 0 && pos.y < this.grid.height;
    }

    isWalkable(pos) {
        if (!this.isInBounds(pos)) return false;
        const index = pos.y * this.grid.width + pos.x;
        return this.grid.cells[index] === 0;
    }

    reconstructPath(cameFrom, current) {
        const path = [current];
        
        while (cameFrom.has(this.positionKey(current))) {
            current = cameFrom.get(this.positionKey(current));
            path.unshift(current);
        }
        
        return path;
    }
}

/**
 * Swarm Intelligence System
 */
class SwarmIntelligence {
    constructor(options) {
        this.options = options;
        this.emergentBehaviors = new Map();
    }

    update(zombies, groups) {
        // Analyze swarm patterns and emergent behaviors
        this.analyzeSwarmPatterns(zombies, groups);
        
        // Apply swarm intelligence modifications
        this.applySwarmIntelligence(zombies, groups);
    }

    analyzeSwarmPatterns(zombies, groups) {
        // Detect emergent behaviors like flanking, surrounding, etc.
        for (const [groupId, group] of groups) {
            if (group.members.size < 3) continue;
            
            const members = Array.from(group.members)
                .map(id => zombies.get(id))
                .filter(Boolean);
            
            // Detect formation patterns
            const formation = this.detectFormation(members);
            if (formation !== group.formation) {
                group.formation = formation;
            }
        }
    }

    detectFormation(members) {
        // Simplified formation detection
        const center = this.calculateCenter(members);
        const distances = members.map(member => 
            this.calculateDistance(member.position, center)
        );
        
        const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length;
        
        if (variance < 100) {
            return 'cluster';
        } else if (avgDistance > 80) {
            return 'spread';
        } else {
            return 'swarm';
        }
    }

    applySwarmIntelligence(zombies, groups) {
        // Apply collective intelligence behaviors
        for (const [groupId, group] of groups) {
            if (group.members.size < 5) continue;
            
            // Implement collective decision making
            this.applyCollectiveDecisionMaking(group, zombies);
        }
    }

    applyCollectiveDecisionMaking(group, zombies) {
        const members = Array.from(group.members)
            .map(id => zombies.get(id))
            .filter(Boolean);
        
        // Collective target selection
        const targetVotes = new Map();
        
        for (const member of members) {
            const target = member.lastKnownPlayerPosition;
            if (target) {
                const key = `${Math.floor(target.x / 50)},${Math.floor(target.y / 50)}`;
                targetVotes.set(key, (targetVotes.get(key) || 0) + 1);
            }
        }
        
        // Select most voted target
        let bestTarget = null;
        let maxVotes = 0;
        
        for (const [targetKey, votes] of targetVotes) {
            if (votes > maxVotes) {
                maxVotes = votes;
                const [x, y] = targetKey.split(',').map(Number);
                bestTarget = { x: x * 50, y: y * 50 };
            }
        }
        
        if (bestTarget) {
            group.target = bestTarget;
        }
    }

    calculateCenter(members) {
        let centerX = 0;
        let centerY = 0;
        
        for (const member of members) {
            centerX += member.position.x;
            centerY += member.position.y;
        }
        
        return {
            x: centerX / members.length,
            y: centerY / members.length
        };
    }

    calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

export default IntelligentZombieAI;