/**
 * 2D Zombie System Integration Demo
 * Demonstrates the zombie obstacle system and combat mechanics
 */

import { Zombie2D } from './Zombie2D.js';
import { ZombieManager2D } from './ZombieManager2D.js';
import { CombatSystem2D } from '../combat/CombatSystem2D.js';
import { ZOMBIE_TYPES } from './ZombieConfig.js';

export class ZombieSystem2DDemo {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        
        // Initialize systems
        this.zombieManager = new ZombieManager2D(gameEngine);
        this.combatSystem = new CombatSystem2D(gameEngine);
        
        // Demo state
        this.demoVehicle = null;
        this.demoZombies = [];
        this.isRunning = false;
        
        // Demo settings
        this.spawnInterval = 2000; // 2 seconds
        this.lastSpawnTime = 0;
        this.maxDemoZombies = 10;
        
        console.log('2D Zombie System Demo initialized');
    }

    /**
     * Initialize the demo
     */
    async initialize() {
        try {
            // Initialize systems
            await this.zombieManager.initialize();
            await this.combatSystem.initialize();
            
            // Connect systems
            this.combatSystem.setZombieManager(this.zombieManager);
            this.zombieManager.setCombatSystem(this.combatSystem);
            
            // Create demo vehicle
            this._createDemoVehicle();
            
            console.log('2D Zombie System Demo ready');
            return true;
        } catch (error) {
            console.error('Failed to initialize zombie demo:', error);
            return false;
        }
    }

    /**
     * Start the demo
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastSpawnTime = Date.now();
        
        // Spawn initial zombies
        this._spawnDemoZombies();
        
        console.log('2D Zombie System Demo started');
    }

    /**
     * Stop the demo
     */
    stop() {
        this.isRunning = false;
        
        // Clean up demo zombies
        this.zombieManager.clearAllZombies();
        this.demoZombies = [];
        
        console.log('2D Zombie System Demo stopped');
    }

    /**
     * Update the demo
     */
    update(deltaTime) {
        if (!this.isRunning) return;
        
        // Update systems
        this.zombieManager.update(deltaTime);
        this.combatSystem.update(deltaTime);
        
        // Update demo vehicle
        this._updateDemoVehicle(deltaTime);
        
        // Spawn zombies periodically
        this._handleZombieSpawning();
        
        // Update demo statistics
        this._updateDemoStats();
    }

    /**
     * Render demo information
     */
    render(ctx) {
        if (!this.isRunning) return;
        
        // Render demo UI
        this._renderDemoUI(ctx);
        
        // Render zombie information
        this._renderZombieInfo(ctx);
        
        // Render combat statistics
        this._renderCombatStats(ctx);
    }

    /**
     * Create a demo vehicle for testing
     */
    _createDemoVehicle() {
        this.demoVehicle = {
            id: 'demo_vehicle',
            position: { x: 100, y: 300 },
            velocity: { x: 0, y: 0 },
            health: 100,
            maxHealth: 100,
            damageMultiplier: 1.0,
            isDestroyed: false,
            
            // Mock physics body
            body: {
                position: { x: 100, y: 300 },
                velocity: { x: 0, y: 0 },
                bounds: { min: { x: 80, y: 280 }, max: { x: 120, y: 320 } },
                collisionFilter: { category: 0x0001, mask: 0x0002 | 0x0004 },
                userData: { type: 'vehicle', gameObject: null }
            },
            
            getPosition: function() {
                return { x: this.position.x, y: this.position.y };
            },
            
            takeDamage: function(damage) {
                this.health = Math.max(0, this.health - damage);
                console.log(`Demo vehicle took ${damage} damage, health: ${this.health}`);
                return damage;
            }
        };
        
        // Set up circular reference
        this.demoVehicle.body.userData.gameObject = this.demoVehicle;
        
        // Register with combat system
        this.combatSystem.registerVehicle(this.demoVehicle);
    }

    /**
     * Update demo vehicle movement
     */
    _updateDemoVehicle(deltaTime) {
        if (!this.demoVehicle) return;
        
        // Simple movement pattern - move right slowly
        this.demoVehicle.position.x += 20 * (deltaTime / 1000);
        this.demoVehicle.body.position.x = this.demoVehicle.position.x;
        this.demoVehicle.body.velocity.x = 20;
        
        // Wrap around screen
        if (this.demoVehicle.position.x > 1200) {
            this.demoVehicle.position.x = -50;
            this.demoVehicle.body.position.x = -50;
        }
    }

    /**
     * Handle zombie spawning for demo
     */
    _handleZombieSpawning() {
        const currentTime = Date.now();
        
        if (currentTime - this.lastSpawnTime >= this.spawnInterval) {
            if (this.demoZombies.length < this.maxDemoZombies) {
                this._spawnDemoZombie();
            }
            this.lastSpawnTime = currentTime;
        }
    }

    /**
     * Spawn demo zombies
     */
    async _spawnDemoZombies() {
        const zombieTypes = [
            ZOMBIE_TYPES.WALKER,
            ZOMBIE_TYPES.RUNNER,
            ZOMBIE_TYPES.CRAWLER,
            ZOMBIE_TYPES.SPITTER
        ];
        
        for (let i = 0; i < 5; i++) {
            const randomType = zombieTypes[Math.floor(Math.random() * zombieTypes.length)];
            const x = 200 + i * 100;
            const y = 300 + (Math.random() - 0.5) * 100;
            
            const zombie = await this.zombieManager.spawnZombie(randomType, x, y);
            if (zombie) {
                this.demoZombies.push(zombie);
            }
        }
    }

    /**
     * Spawn a single demo zombie
     */
    async _spawnDemoZombie() {
        const zombieTypes = [
            ZOMBIE_TYPES.WALKER,
            ZOMBIE_TYPES.RUNNER,
            ZOMBIE_TYPES.CRAWLER,
            ZOMBIE_TYPES.SPITTER,
            ZOMBIE_TYPES.BLOATER
        ];
        
        const randomType = zombieTypes[Math.floor(Math.random() * zombieTypes.length)];
        const x = 1300; // Spawn off-screen right
        const y = 250 + Math.random() * 300;
        
        const zombie = await this.zombieManager.spawnZombie(randomType, x, y);
        if (zombie) {
            this.demoZombies.push(zombie);
            console.log(`Spawned demo zombie: ${randomType} at (${x}, ${y})`);
        }
    }

    /**
     * Update demo statistics
     */
    _updateDemoStats() {
        // Remove destroyed zombies from demo list
        this.demoZombies = this.demoZombies.filter(zombie => !zombie.isDestroyed);
    }

    /**
     * Render demo UI
     */
    _renderDemoUI(ctx) {
        // Demo title
        ctx.fillStyle = '#d4a574';
        ctx.font = '24px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('2D Zombie System Demo', 600, 50);
        
        // Instructions
        ctx.font = '16px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('Vehicle moves automatically', 20, 100);
        ctx.fillText('Zombies spawn and chase vehicle', 20, 120);
        ctx.fillText('Combat occurs on collision', 20, 140);
        
        // Demo controls
        ctx.fillText('Press SPACE to spawn zombie horde', 20, 180);
        ctx.fillText('Press R to reset demo', 20, 200);
    }

    /**
     * Render zombie information
     */
    _renderZombieInfo(ctx) {
        const stats = this.zombieManager.getPerformanceStats();
        
        ctx.fillStyle = 'rgba(42, 42, 42, 0.8)';
        ctx.fillRect(20, 220, 300, 120);
        
        ctx.strokeStyle = '#8b4513';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 220, 300, 120);
        
        ctx.fillStyle = '#d4a574';
        ctx.font = '14px "Courier New", monospace';
        ctx.textAlign = 'left';
        
        let y = 240;
        ctx.fillText(`Active Zombies: ${stats.activeZombies}`, 30, y);
        y += 20;
        ctx.fillText(`Total Spawned: ${stats.totalSpawned}`, 30, y);
        y += 20;
        ctx.fillText(`Total Killed: ${stats.totalKilled}`, 30, y);
        y += 20;
        ctx.fillText(`Current Stage: ${stats.currentStage}`, 30, y);
        y += 20;
        ctx.fillText(`Zombie Density: ${(stats.zombieDensity * 100).toFixed(1)}%`, 30, y);
    }

    /**
     * Render combat statistics
     */
    _renderCombatStats(ctx) {
        const stats = this.combatSystem.getCombatStats();
        
        ctx.fillStyle = 'rgba(42, 42, 42, 0.8)';
        ctx.fillRect(350, 220, 300, 120);
        
        ctx.strokeStyle = '#8b4513';
        ctx.lineWidth = 2;
        ctx.strokeRect(350, 220, 300, 120);
        
        ctx.fillStyle = '#d4a574';
        ctx.font = '14px "Courier New", monospace';
        ctx.textAlign = 'left';
        
        let y = 240;
        ctx.fillText(`Total Collisions: ${stats.totalCollisions}`, 360, y);
        y += 20;
        ctx.fillText(`Damage Dealt: ${stats.totalDamageDealt}`, 360, y);
        y += 20;
        ctx.fillText(`Zombies Killed: ${stats.zombiesKilled}`, 360, y);
        y += 20;
        ctx.fillText(`Critical Hits: ${stats.criticalHits}`, 360, y);
        y += 20;
        ctx.fillText(`Vehicle Health: ${this.demoVehicle ? this.demoVehicle.health : 0}`, 360, y);
    }

    /**
     * Handle demo input
     */
    handleInput(keys) {
        if (keys['Space']) {
            // Spawn zombie horde
            this._spawnZombieHorde();
            keys['Space'] = false; // Prevent repeat
        }
        
        if (keys['KeyR']) {
            // Reset demo
            this.stop();
            setTimeout(() => this.start(), 100);
            keys['KeyR'] = false; // Prevent repeat
        }
    }

    /**
     * Spawn a horde of zombies for testing
     */
    async _spawnZombieHorde() {
        const vehiclePos = this.demoVehicle.getPosition();
        const horde = await this.zombieManager.spawnHorde(
            vehiclePos.x + 200,
            vehiclePos.y,
            8,
            100
        );
        
        this.demoZombies.push(...horde);
        console.log(`Spawned horde of ${horde.length} zombies`);
    }

    /**
     * Get demo statistics
     */
    getDemoStats() {
        return {
            isRunning: this.isRunning,
            zombieStats: this.zombieManager.getPerformanceStats(),
            combatStats: this.combatSystem.getCombatStats(),
            demoZombies: this.demoZombies.length,
            vehicleHealth: this.demoVehicle ? this.demoVehicle.health : 0
        };
    }

    /**
     * Dispose of the demo
     */
    dispose() {
        this.stop();
        
        if (this.zombieManager) {
            this.zombieManager.dispose();
        }
        
        if (this.combatSystem) {
            this.combatSystem.dispose();
        }
        
        console.log('2D Zombie System Demo disposed');
    }
}