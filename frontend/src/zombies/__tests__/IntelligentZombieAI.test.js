/**
 * Intelligent Zombie AI System Tests
 * Comprehensive tests for the advanced zombie AI system
 */

import { IntelligentZombieAI } from '../IntelligentZombieAI.js';

// Mock electron integration
jest.mock('../../electron/ElectronIntegration.js', () => ({
    electronIntegration: {
        getLogger: () => ({
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        })
    }
}));

// Mock timers
jest.useFakeTimers();

describe('IntelligentZombieAI', () => {
    let zombieAI;

    beforeEach(() => {
        zombieAI = new IntelligentZombieAI({
            maxZombies: 50,
            updateFrequency: 60,
            pathfindingFrequency: 10,
            enableBehaviorTrees: true,
            enablePathfinding: true,
            enableSwarmIntelligence: true,
            enableGroupBehavior: true
        });
    });

    afterEach(() => {
        zombieAI.dispose();
        jest.clearAllTimers();
    });

    describe('Initialization', () => {
        test('should initialize with default settings', () => {
            expect(zombieAI.options.maxZombies).toBe(50);
            expect(zombieAI.options.updateFrequency).toBe(60);
            expect(zombieAI.zombies.size).toBe(0);
            expect(zombieAI.groups.size).toBe(0);
        });

        test('should create behavior trees for all zombie types', () => {
            const behaviorTrees = Object.keys(zombieAI.behaviorTrees);
            expect(behaviorTrees).toContain('basic');
            expect(behaviorTrees).toContain('runner');
            expect(behaviorTrees).toContain('brute');
            expect(behaviorTrees).toContain('spitter');
            expect(behaviorTrees).toContain('swarm');
        });

        test('should create zombie type definitions', () => {
            const zombieTypes = Object.keys(zombieAI.zombieTypes);
            expect(zombieTypes).toContain('basic');
            expect(zombieTypes).toContain('runner');
            expect(zombieTypes).toContain('brute');
            expect(zombieTypes).toContain('spitter');
            expect(zombieTypes).toContain('swarm');
            expect(zombieTypes).toContain('boss');
        });
    });

    describe('Zombie Spawning', () => {
        test('should spawn zombie with correct properties', () => {
            const spawnSpy = jest.fn();
            zombieAI.on('zombieSpawned', spawnSpy);

            const position = { x: 100, y: 200 };
            const zombieId = zombieAI.spawnZombie(position, 'basic');

            expect(zombieId).toBeDefined();
            expect(zombieAI.zombies.has(zombieId)).toBe(true);
            expect(spawnSpy).toHaveBeenCalledWith({
                zombieId,
                type: 'basic',
                position,
                groupId: null
            });

            const zombie = zombieAI.zombies.get(zombieId);
            expect(zombie.position).toEqual(position);
            expect(zombie.type).toBe('basic');
            expect(zombie.health).toBe(100);
            expect(zombie.isAlive).toBe(true);
        });

        test('should spawn zombie with group assignment', () => {
            const position = { x: 100, y: 200 };
            const groupId = 'test_group';
            const zombieId = zombieAI.spawnZombie(position, 'basic', groupId);

            const zombie = zombieAI.zombies.get(zombieId);
            expect(zombie.groupId).toBe(groupId);
            expect(zombieAI.groups.has(groupId)).toBe(true);

            const group = zombieAI.groups.get(groupId);
            expect(group.members.has(zombieId)).toBe(true);
            expect(group.leader).toBe(zombieId);
        });

        test('should throw error for invalid zombie type', () => {
            expect(() => {
                zombieAI.spawnZombie({ x: 0, y: 0 }, 'invalid_type');
            }).toThrow('Invalid zombie type: invalid_type');
        });

        test('should initialize behavior tree for spawned zombie', () => {
            const zombieId = zombieAI.spawnZombie({ x: 0, y: 0 }, 'basic');
            const zombie = zombieAI.zombies.get(zombieId);

            expect(zombie.behaviorTree).toBeDefined();
            expect(zombie.currentNode).toBe(zombie.behaviorTree.root);
            expect(zombie.blackboard.has('startTime')).toBe(true);
            expect(zombie.blackboard.has('spawnPosition')).toBe(true);
        });
    });

    describe('Behavior Trees', () => {
        let zombie;

        beforeEach(() => {
            const zombieId = zombieAI.spawnZombie({ x: 100, y: 100 }, 'basic');
            zombie = zombieAI.zombies.get(zombieId);
        });

        test('should execute selector node correctly', () => {
            const selectorNode = {
                type: 'selector',
                children: [
                    { type: 'condition', check: 'isPlayerInRange', range: 30 },
                    { type: 'action', action: 'wander' }
                ]
            };

            const result = zombieAI.executeBehaviorNode(zombie, selectorNode);
            expect(['success', 'failure', 'running']).toContain(result);
        });

        test('should execute sequence node correctly', () => {
            const sequenceNode = {
                type: 'sequence',
                children: [
                    { type: 'condition', check: 'isPlayerInRange', range: 30 },
                    { type: 'action', action: 'attackPlayer' }
                ]
            };

            const result = zombieAI.executeBehaviorNode(zombie, sequenceNode);
            expect(['success', 'failure', 'running']).toContain(result);
        });

        test('should execute condition nodes', () => {
            // Mock player position for testing
            jest.spyOn(zombieAI, 'getPlayerPosition').mockReturnValue({ x: 120, y: 120 });

            const conditionNode = { type: 'condition', check: 'isPlayerInRange', range: 50 };
            const result = zombieAI.executeBehaviorNode(zombie, conditionNode);

            expect(result).toBe('success'); // Distance is ~28, within range of 50
        });

        test('should execute action nodes', () => {
            const actionNode = { type: 'action', action: 'wander' };
            const result = zombieAI.executeBehaviorNode(zombie, actionNode);

            expect(result).toBe('running');
            expect(zombie.targetPosition).toBeDefined();
            expect(zombie.state).toBe('wandering');
        });

        test('should handle invalid node types', () => {
            const invalidNode = { type: 'invalid' };
            const result = zombieAI.executeBehaviorNode(zombie, invalidNode);

            expect(result).toBe('failure');
        });
    });

    describe('Pathfinding', () => {
        test('should initialize pathfinding grid', () => {
            expect(zombieAI.pathfindingGrid).toBeDefined();
            expect(zombieAI.pathfindingGrid.width).toBe(100);
            expect(zombieAI.pathfindingGrid.height).toBe(100);
            expect(zombieAI.pathfindingGrid.cellSize).toBe(10);
        });

        test('should convert world coordinates to grid coordinates', () => {
            const worldPos = { x: 55, y: 75 };
            const gridPos = zombieAI.worldToGrid(worldPos);

            expect(gridPos.x).toBe(5);
            expect(gridPos.y).toBe(7);
        });

        test('should convert grid coordinates to world coordinates', () => {
            const gridPos = { x: 5, y: 7 };
            const worldPos = zombieAI.gridToWorld(gridPos);

            expect(worldPos.x).toBe(55);
            expect(worldPos.y).toBe(75);
        });

        test('should calculate path for zombie', () => {
            const zombieId = zombieAI.spawnZombie({ x: 0, y: 0 }, 'basic');
            const zombie = zombieAI.zombies.get(zombieId);
            zombie.targetPosition = { x: 100, y: 100 };

            zombieAI.calculatePath(zombie);

            // Path should be calculated (may be empty if no valid path)
            expect(Array.isArray(zombie.path)).toBe(true);
        });
    });

    describe('Group Behavior', () => {
        test('should create group when adding zombie', () => {
            const groupId = 'test_group';
            const zombieId = zombieAI.spawnZombie({ x: 0, y: 0 }, 'basic');

            zombieAI.addZombieToGroup(zombieId, groupId);

            expect(zombieAI.groups.has(groupId)).toBe(true);
            const group = zombieAI.groups.get(groupId);
            expect(group.members.has(zombieId)).toBe(true);
            expect(group.leader).toBe(zombieId);

            const zombie = zombieAI.zombies.get(zombieId);
            expect(zombie.groupId).toBe(groupId);
            expect(zombie.isGroupLeader).toBe(true);
        });

        test('should assign leader to existing group', () => {
            const groupId = 'test_group';
            const zombie1Id = zombieAI.spawnZombie({ x: 0, y: 0 }, 'basic');
            const zombie2Id = zombieAI.spawnZombie({ x: 10, y: 10 }, 'basic');

            zombieAI.addZombieToGroup(zombie1Id, groupId);
            zombieAI.addZombieToGroup(zombie2Id, groupId);

            const group = zombieAI.groups.get(groupId);
            expect(group.members.size).toBe(2);
            expect(group.leader).toBe(zombie1Id); // First zombie becomes leader

            const zombie1 = zombieAI.zombies.get(zombie1Id);
            const zombie2 = zombieAI.zombies.get(zombie2Id);
            expect(zombie1.isGroupLeader).toBe(true);
            expect(zombie2.isGroupLeader).toBe(false);
        });

        test('should calculate flocking behavior', () => {
            const groupId = 'flock_group';
            const positions = [
                { x: 100, y: 100 },
                { x: 110, y: 105 },
                { x: 95, y: 110 }
            ];

            const zombieIds = positions.map(pos => 
                zombieAI.spawnZombie(pos, 'swarm', groupId)
            );

            const group = zombieAI.groups.get(groupId);
            const zombie = zombieAI.zombies.get(zombieIds[0]);

            zombieAI.applyFlockingBehavior(zombie, group);

            // Flocking should modify target position
            expect(zombie.targetPosition).toBeDefined();
        });

        test('should coordinate swarm positions', () => {
            const groupId = 'swarm_group';
            const zombieIds = [];

            for (let i = 0; i < 5; i++) {
                const zombieId = zombieAI.spawnZombie({ x: i * 20, y: i * 20 }, 'swarm', groupId);
                zombieIds.push(zombieId);
            }

            const group = zombieAI.groups.get(groupId);
            const playerPosition = { x: 200, y: 200 };

            zombieAI.coordinateSwarmPositions(group, playerPosition);

            // All zombies should have target positions around the player
            zombieIds.forEach(zombieId => {
                const zombie = zombieAI.zombies.get(zombieId);
                expect(zombie.targetPosition).toBeDefined();
                expect(zombie.state).toBe('coordinated_attack');
            });
        });
    });

    describe('AI Update Loop', () => {
        test('should update zombie AI', () => {
            const zombieId = zombieAI.spawnZombie({ x: 0, y: 0 }, 'basic');
            const updateSpy = jest.fn();
            zombieAI.on('aiUpdated', updateSpy);

            zombieAI.updateAI();

            expect(updateSpy).toHaveBeenCalled();
            const updateData = updateSpy.mock.calls[0][0];
            expect(updateData.zombiesProcessed).toBeGreaterThanOrEqual(0);
            expect(updateData.updateTime).toBeGreaterThanOrEqual(0);
        });

        test('should skip updates for high LOD zombies', () => {
            const zombieId = zombieAI.spawnZombie({ x: 1000, y: 1000 }, 'basic'); // Far away
            const zombie = zombieAI.zombies.get(zombieId);
            
            // Mock player position to be far away
            jest.spyOn(zombieAI, 'getPlayerPosition').mockReturnValue({ x: 0, y: 0 });
            
            zombieAI.updateZombieLOD(zombie);
            expect(zombie.lodLevel).toBeGreaterThan(2);

            const initialState = zombie.state;
            zombieAI.updateAI();
            
            // State should not change for high LOD zombies
            expect(zombie.state).toBe(initialState);
        });

        test('should update zombie movement', () => {
            const zombieId = zombieAI.spawnZombie({ x: 0, y: 0 }, 'basic');
            const zombie = zombieAI.zombies.get(zombieId);
            zombie.targetPosition = { x: 100, y: 100 };

            const initialPosition = { ...zombie.position };
            zombieAI.updateZombieMovement(zombie);

            // Position should change towards target
            expect(zombie.position.x).not.toBe(initialPosition.x);
            expect(zombie.position.y).not.toBe(initialPosition.y);
            expect(zombie.velocity.x).not.toBe(0);
            expect(zombie.velocity.y).not.toBe(0);
        });

        test('should stop movement when reaching target', () => {
            const zombieId = zombieAI.spawnZombie({ x: 0, y: 0 }, 'basic');
            const zombie = zombieAI.zombies.get(zombieId);
            zombie.targetPosition = { x: 2, y: 2 }; // Very close target

            zombieAI.updateZombieMovement(zombie);

            expect(zombie.targetPosition).toBeNull();
            expect(zombie.velocity.x).toBe(0);
            expect(zombie.velocity.y).toBe(0);
        });
    });

    describe('Combat Actions', () => {
        let zombie;

        beforeEach(() => {
            const zombieId = zombieAI.spawnZombie({ x: 100, y: 100 }, 'basic');
            zombie = zombieAI.zombies.get(zombieId);
            jest.spyOn(zombieAI, 'getPlayerPosition').mockReturnValue({ x: 110, y: 110 });
        });

        test('should perform attack action', () => {
            const attackSpy = jest.fn();
            zombieAI.on('zombieAttack', attackSpy);

            const result = zombieAI.actionAttackPlayer(zombie);

            expect(result).toBe('success');
            expect(attackSpy).toHaveBeenCalled();
            expect(zombie.state).toBe('attacking');
            expect(zombie.lastAttack).toBeGreaterThan(0);
        });

        test('should respect attack cooldown', () => {
            zombie.lastAttack = Date.now();

            const result = zombieAI.actionAttackPlayer(zombie);

            expect(result).toBe('running');
        });

        test('should fail attack if player out of range', () => {
            jest.spyOn(zombieAI, 'getPlayerPosition').mockReturnValue({ x: 1000, y: 1000 });

            const result = zombieAI.actionAttackPlayer(zombie);

            expect(result).toBe('failure');
        });

        test('should move towards player', () => {
            const result = zombieAI.actionMoveTowardsPlayer(zombie);

            expect(result).toBe('running');
            expect(zombie.targetPosition).toEqual({ x: 110, y: 110 });
            expect(zombie.state).toBe('chasing');
            expect(zombie.lastKnownPlayerPosition).toEqual({ x: 110, y: 110 });
        });

        test('should perform spitter retreat action', () => {
            const spitterId = zombieAI.spawnZombie({ x: 100, y: 100 }, 'spitter');
            const spitter = zombieAI.zombies.get(spitterId);

            const result = zombieAI.actionRetreatFromPlayer(spitter);

            expect(result).toBe('running');
            expect(spitter.targetPosition).toBeDefined();
            expect(spitter.state).toBe('retreating');

            // Target should be away from player
            const dx = spitter.targetPosition.x - spitter.position.x;
            const dy = spitter.targetPosition.y - spitter.position.y;
            const playerDx = 110 - spitter.position.x;
            const playerDy = 110 - spitter.position.y;

            // Retreat direction should be opposite to player direction
            expect(dx * playerDx + dy * playerDy).toBeLessThan(0);
        });
    });

    describe('Zombie Types', () => {
        test('should create runner zombie with correct properties', () => {
            const zombieId = zombieAI.spawnZombie({ x: 0, y: 0 }, 'runner');
            const zombie = zombieAI.zombies.get(zombieId);

            expect(zombie.typeData.speed).toBe(45);
            expect(zombie.typeData.health).toBe(80);
            expect(zombie.typeData.abilities).toContain('sprint');
            expect(zombie.typeData.abilities).toContain('flank');
        });

        test('should create brute zombie with correct properties', () => {
            const zombieId = zombieAI.spawnZombie({ x: 0, y: 0 }, 'brute');
            const zombie = zombieAI.zombies.get(zombieId);

            expect(zombie.typeData.speed).toBe(15);
            expect(zombie.typeData.health).toBe(300);
            expect(zombie.typeData.damage).toBe(50);
            expect(zombie.typeData.abilities).toContain('charge');
            expect(zombie.typeData.abilities).toContain('smash');
        });

        test('should create spitter zombie with correct properties', () => {
            const zombieId = zombieAI.spawnZombie({ x: 0, y: 0 }, 'spitter');
            const zombie = zombieAI.zombies.get(zombieId);

            expect(zombie.typeData.attackRange).toBe(100);
            expect(zombie.typeData.abilities).toContain('spit');
            expect(zombie.typeData.abilities).toContain('retreat');
        });

        test('should create boss zombie with correct properties', () => {
            const zombieId = zombieAI.spawnZombie({ x: 0, y: 0 }, 'boss');
            const zombie = zombieAI.zombies.get(zombieId);

            expect(zombie.typeData.health).toBe(800);
            expect(zombie.typeData.damage).toBe(80);
            expect(zombie.typeData.abilities).toContain('multiAttack');
            expect(zombie.typeData.abilities).toContain('summon');
            expect(zombie.typeData.intelligence).toBe(6);
        });
    });

    describe('Swarm Intelligence', () => {
        test('should detect formation patterns', () => {
            const swarm = zombieAI.swarmIntelligence;
            const members = [
                { position: { x: 100, y: 100 } },
                { position: { x: 105, y: 105 } },
                { position: { x: 95, y: 95 } }
            ];

            const formation = swarm.detectFormation(members);
            expect(['cluster', 'spread', 'swarm']).toContain(formation);
        });

        test('should apply collective decision making', () => {
            const groupId = 'swarm_group';
            const zombieIds = [];

            for (let i = 0; i < 5; i++) {
                const zombieId = zombieAI.spawnZombie({ x: i * 10, y: i * 10 }, 'swarm', groupId);
                zombieIds.push(zombieId);
                
                const zombie = zombieAI.zombies.get(zombieId);
                zombie.lastKnownPlayerPosition = { x: 200 + i * 5, y: 200 + i * 5 };
            }

            const group = zombieAI.groups.get(groupId);
            zombieAI.swarmIntelligence.applyCollectiveDecisionMaking(group, zombieAI.zombies);

            expect(group.target).toBeDefined();
        });
    });

    describe('Performance Optimization', () => {
        test('should update LOD based on distance', () => {
            const zombieId = zombieAI.spawnZombie({ x: 0, y: 0 }, 'basic');
            const zombie = zombieAI.zombies.get(zombieId);

            // Ensure LOD is enabled
            zombieAI.options.enableLOD = true;
            
            // Reset lastLODUpdate to force updates
            zombie.lastLODUpdate = 0;

            // Mock player at different distances
            jest.spyOn(zombieAI, 'getPlayerPosition').mockReturnValue({ x: 50, y: 50 });
            zombieAI.updateZombieLOD(zombie);
            expect(zombie.lodLevel).toBe(0); // Close = full detail

            // Reset lastLODUpdate to force next update
            zombie.lastLODUpdate = 0;
            jest.spyOn(zombieAI, 'getPlayerPosition').mockReturnValue({ x: 120, y: 120 });
            zombieAI.updateZombieLOD(zombie);
            expect(zombie.lodLevel).toBe(1); // Medium distance = reduced detail (distance ~170)

            // Reset lastLODUpdate to force next update
            zombie.lastLODUpdate = 0;
            jest.spyOn(zombieAI, 'getPlayerPosition').mockReturnValue({ x: 500, y: 500 });
            zombieAI.updateZombieLOD(zombie);
            expect(zombie.lodLevel).toBe(3); // Far = no updates
        });

        test('should track performance metrics', () => {
            const zombieId = zombieAI.spawnZombie({ x: 0, y: 0 }, 'basic');
            
            zombieAI.updateAI();

            expect(zombieAI.performance.updateTime).toBeGreaterThanOrEqual(0);
            expect(zombieAI.performance.zombiesProcessed).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Zombie Removal', () => {
        test('should remove zombie from system', () => {
            const zombieId = zombieAI.spawnZombie({ x: 0, y: 0 }, 'basic');
            const removeSpy = jest.fn();
            zombieAI.on('zombieRemoved', removeSpy);

            expect(zombieAI.zombies.has(zombieId)).toBe(true);

            zombieAI.removeZombie(zombieId);

            expect(zombieAI.zombies.has(zombieId)).toBe(false);
            expect(removeSpy).toHaveBeenCalledWith({ zombieId });
        });

        test('should remove zombie from group and reassign leader', () => {
            const groupId = 'test_group';
            const zombie1Id = zombieAI.spawnZombie({ x: 0, y: 0 }, 'basic', groupId);
            const zombie2Id = zombieAI.spawnZombie({ x: 10, y: 10 }, 'basic', groupId);

            const group = zombieAI.groups.get(groupId);
            expect(group.leader).toBe(zombie1Id);

            zombieAI.removeZombie(zombie1Id);

            expect(group.leader).toBe(zombie2Id);
            expect(group.members.has(zombie1Id)).toBe(false);
            expect(group.members.has(zombie2Id)).toBe(true);

            const zombie2 = zombieAI.zombies.get(zombie2Id);
            expect(zombie2.isGroupLeader).toBe(true);
        });

        test('should remove empty groups', () => {
            const groupId = 'test_group';
            const zombieId = zombieAI.spawnZombie({ x: 0, y: 0 }, 'basic', groupId);

            expect(zombieAI.groups.has(groupId)).toBe(true);

            zombieAI.removeZombie(zombieId);

            expect(zombieAI.groups.has(groupId)).toBe(false);
        });
    });

    describe('System Management', () => {
        test('should get system status', () => {
            zombieAI.spawnZombie({ x: 0, y: 0 }, 'basic');
            zombieAI.spawnZombie({ x: 10, y: 10 }, 'runner', 'group1');

            const status = zombieAI.getStatus();

            expect(status.zombieCount).toBe(2);
            expect(status.groupCount).toBe(1);
            expect(status.performance).toBeDefined();
            expect(status.options).toBeDefined();
        });

        test('should dispose properly', () => {
            const zombie1Id = zombieAI.spawnZombie({ x: 0, y: 0 }, 'basic');
            const zombie2Id = zombieAI.spawnZombie({ x: 10, y: 10 }, 'runner', 'group1');

            zombieAI.dispose();

            expect(zombieAI.zombies.size).toBe(0);
            expect(zombieAI.groups.size).toBe(0);
        });
    });

    describe('A* Pathfinding', () => {
        test('should find path between two points', () => {
            const pathfinder = zombieAI.pathfinder;
            const start = { x: 0, y: 0 };
            const end = { x: 5, y: 5 };

            const path = pathfinder.findPath(start, end);

            expect(Array.isArray(path)).toBe(true);
            if (path) {
                expect(path.length).toBeGreaterThan(0);
                expect(path[0]).toEqual(start);
                expect(path[path.length - 1]).toEqual(end);
            }
        });

        test('should return null for blocked path', () => {
            const pathfinder = zombieAI.pathfinder;
            
            // Block all cells
            zombieAI.pathfindingGrid.cells.fill(1);
            
            const start = { x: 0, y: 0 };
            const end = { x: 5, y: 5 };

            const path = pathfinder.findPath(start, end);

            expect(path).toBeNull();
        });

        test('should calculate heuristic distance correctly', () => {
            const pathfinder = zombieAI.pathfinder;
            const a = { x: 0, y: 0 };
            const b = { x: 3, y: 4 };

            const heuristic = pathfinder.heuristic(a, b);

            expect(heuristic).toBe(7); // Manhattan distance: |3-0| + |4-0| = 7
        });
    });

    describe('Edge Cases', () => {
        test('should handle missing player position gracefully', () => {
            jest.spyOn(zombieAI, 'getPlayerPosition').mockReturnValue(null);

            const zombieId = zombieAI.spawnZombie({ x: 0, y: 0 }, 'basic');
            const zombie = zombieAI.zombies.get(zombieId);

            const result = zombieAI.actionMoveTowardsPlayer(zombie);
            expect(result).toBe('failure');

            const attackResult = zombieAI.actionAttackPlayer(zombie);
            expect(attackResult).toBe('failure');
        });

        test('should handle behavior tree execution errors', () => {
            const zombieId = zombieAI.spawnZombie({ x: 0, y: 0 }, 'basic');
            const zombie = zombieAI.zombies.get(zombieId);

            // Create invalid node that will cause error
            const invalidNode = { type: 'condition', check: 'nonexistentCheck' };

            expect(() => {
                zombieAI.executeBehaviorNode(zombie, invalidNode);
            }).not.toThrow();

            // Should reset to root node after error
            expect(zombie.currentNode).toBe(zombie.behaviorTree.root);
        });

        test('should handle empty groups in swarm intelligence', () => {
            const emptyGroup = {
                id: 'empty_group',
                members: new Set(),
                formation: 'swarm'
            };

            expect(() => {
                zombieAI.swarmIntelligence.applyCollectiveDecisionMaking(emptyGroup, zombieAI.zombies);
            }).not.toThrow();
        });

        test('should handle zombie removal for non-existent zombie', () => {
            expect(() => {
                zombieAI.removeZombie('non_existent_id');
            }).not.toThrow();
        });
    });
});