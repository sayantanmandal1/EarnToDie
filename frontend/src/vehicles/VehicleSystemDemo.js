/**
 * Vehicle System Demo
 * Demonstrates the vehicle system functionality including progression, upgrades, and fuel consumption
 */

import { VehicleSystem, VehicleInstance } from './VehicleSystem.js';
import { VehicleRenderer } from './VehicleRenderer.js';
import { ZombieCarSaveManager } from '../save/ZombieCarSaveManager.js';

export class VehicleSystemDemo {
    constructor() {
        this.saveManager = new ZombieCarSaveManager();
        this.vehicleSystem = new VehicleSystem(this.saveManager);
        this.renderer = new VehicleRenderer();
        
        // Demo state
        this.currentVehicle = null;
        this.isRunning = false;
        this.lastTime = 0;
        
        // Canvas setup
        this.canvas = null;
        this.ctx = null;
        
        this.setupDemo();
    }
    
    /**
     * Setup the demo
     */
    setupDemo() {
        // Initialize with some demo data
        const saveData = this.saveManager.getSaveData();
        
        // Give player some money and distance for testing
        saveData.player.money = 5000;
        saveData.player.bestDistance = 10000;
        
        // Unlock some vehicles
        saveData.vehicles.owned = ['STARTER_CAR', 'OLD_TRUCK', 'SPORTS_CAR'];
        
        // Add some upgrades to starter car
        saveData.vehicles.upgrades.STARTER_CAR = {
            engine: 2,
            fuel: 1,
            armor: 1,
            weapon: 1,
            wheels: 1
        };
        
        this.saveManager.saveGame(saveData);
        
        // Select starter car as current
        this.currentVehicle = this.vehicleSystem.getCurrentVehicle();
        
        console.log('Vehicle System Demo initialized');
        console.log('Available vehicles:', this.vehicleSystem.getUnlockedVehicles().map(v => v.type));
        console.log('Current vehicle:', this.currentVehicle.type);
    }
    
    /**
     * Setup canvas for rendering demo
     */
    setupCanvas(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size
        this.canvas.width = 800;
        this.canvas.height = 400;
        
        console.log('Canvas setup complete');
    }
    
    /**
     * Start the demo
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
        
        console.log('Demo started');
    }
    
    /**
     * Stop the demo
     */
    stop() {
        this.isRunning = false;
        console.log('Demo stopped');
    }
    
    /**
     * Main game loop
     */
    gameLoop() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        // Update vehicle
        this.updateVehicle(deltaTime);
        
        // Render if canvas is available
        if (this.canvas && this.ctx) {
            this.render();
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    /**
     * Update vehicle simulation
     */
    updateVehicle(deltaTime) {
        if (!this.currentVehicle) return;
        
        // Simulate throttle input (0.5 = half throttle)
        const throttleInput = 0.5;
        
        // Consume fuel
        const stillHasFuel = this.currentVehicle.consumeFuel(deltaTime, throttleInput);
        
        // Simulate movement (just for demo)
        this.currentVehicle.position.x += (throttleInput * 50) * (deltaTime / 1000);
        
        // Check if out of fuel
        if (!stillHasFuel) {
            console.log('Vehicle out of fuel! Run ended.');
            this.endRun();
        }
    }
    
    /**
     * Render the demo
     */
    render() {
        if (!this.ctx || !this.currentVehicle) return;
        
        // Clear canvas
        this.ctx.fillStyle = '#87ceeb'; // Sky blue
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw ground
        this.ctx.fillStyle = '#daa520'; // Desert sand
        this.ctx.fillRect(0, this.canvas.height - 100, this.canvas.width, 100);
        
        // Center vehicle on screen
        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2, this.canvas.height - 150);
        
        // Render vehicle
        this.renderer.renderVehicle(this.ctx, this.currentVehicle);
        
        this.ctx.restore();
        
        // Render UI
        this.renderUI();
    }
    
    /**
     * Render UI information
     */
    renderUI() {
        if (!this.ctx || !this.currentVehicle) return;
        
        const summary = this.currentVehicle.getSummary();
        
        // Set text style
        this.ctx.fillStyle = '#000000';
        this.ctx.font = '16px Arial';
        
        let y = 30;
        const lineHeight = 20;
        
        // Vehicle info
        this.ctx.fillText(`Vehicle: ${summary.name}`, 10, y);
        y += lineHeight;
        
        this.ctx.fillText(`Health: ${Math.round(summary.health)}%`, 10, y);
        y += lineHeight;
        
        this.ctx.fillText(`Fuel: ${Math.round(summary.fuel)}/${summary.fuelCapacity} (${Math.round(summary.fuelPercentage * 100)}%)`, 10, y);
        y += lineHeight;
        
        this.ctx.fillText(`Position: ${Math.round(this.currentVehicle.position.x)}m`, 10, y);
        y += lineHeight;
        
        // Performance metrics
        y += 10;
        this.ctx.fillText('Performance:', 10, y);
        y += lineHeight;
        
        Object.entries(summary.performance).forEach(([metric, value]) => {
            this.ctx.fillText(`  ${metric}: ${Math.round(value)}`, 10, y);
            y += lineHeight;
        });
        
        // Upgrades
        y += 10;
        this.ctx.fillText('Upgrades:', 10, y);
        y += lineHeight;
        
        Object.entries(summary.upgrades).forEach(([category, level]) => {
            this.ctx.fillText(`  ${category}: Level ${level}`, 10, y);
            y += lineHeight;
        });
        
        // Controls info
        this.ctx.fillStyle = '#666666';
        this.ctx.font = '12px Arial';
        this.ctx.fillText('Press R to refuel, D to damage, H to repair, U to upgrade', 10, this.canvas.height - 10);
    }
    
    /**
     * End the current run
     */
    endRun() {
        const distance = this.currentVehicle.position.x;
        const money = Math.round(distance * 0.1); // 1 money per 10 distance
        
        console.log(`Run ended! Distance: ${Math.round(distance)}m, Money earned: ${money}`);
        
        // Add money to player
        const saveData = this.saveManager.getSaveData();
        saveData.player.money += money;
        saveData.player.totalRuns += 1;
        
        if (distance > saveData.player.bestDistance) {
            saveData.player.bestDistance = distance;
            console.log('New best distance!');
        }
        
        this.saveManager.saveGame(saveData);
        
        // Reset vehicle
        this.resetVehicle();
    }
    
    /**
     * Reset vehicle for new run
     */
    resetVehicle() {
        this.currentVehicle.position.x = 0;
        this.currentVehicle.health = 100;
        this.currentVehicle.refillFuel();
        
        console.log('Vehicle reset for new run');
    }
    
    /**
     * Handle keyboard input
     */
    handleKeyPress(key) {
        if (!this.currentVehicle) return;
        
        switch (key.toLowerCase()) {
            case 'r':
                // Refuel
                this.currentVehicle.refillFuel();
                console.log('Vehicle refueled');
                break;
                
            case 'd':
                // Take damage
                const damage = this.currentVehicle.takeDamage(20);
                console.log(`Vehicle took ${Math.round(damage)} damage`);
                break;
                
            case 'h':
                // Repair
                this.currentVehicle.repair(25);
                console.log('Vehicle repaired');
                break;
                
            case 'u':
                // Upgrade (try to upgrade engine)
                try {
                    const result = this.currentVehicle.purchaseUpgrade('engine');
                    console.log(`Engine upgraded to level ${result.newLevel}! Cost: ${result.cost}`);
                } catch (error) {
                    console.log(`Upgrade failed: ${error.message}`);
                }
                break;
                
            case 's':
                // Switch vehicle
                this.switchToNextVehicle();
                break;
                
            case 'p':
                // Purchase vehicle
                this.purchaseNextVehicle();
                break;
        }
    }
    
    /**
     * Switch to next available vehicle
     */
    switchToNextVehicle() {
        const unlockedVehicles = this.vehicleSystem.getUnlockedVehicles();
        const currentIndex = unlockedVehicles.findIndex(v => v.type === this.currentVehicle.type);
        const nextIndex = (currentIndex + 1) % unlockedVehicles.length;
        const nextVehicle = unlockedVehicles[nextIndex];
        
        this.vehicleSystem.selectVehicle(nextVehicle.type);
        this.currentVehicle = this.vehicleSystem.getCurrentVehicle();
        this.resetVehicle();
        
        console.log(`Switched to ${nextVehicle.type}`);
    }
    
    /**
     * Purchase next available vehicle
     */
    purchaseNextVehicle() {
        const lockedVehicles = this.vehicleSystem.getLockedVehicles();
        
        if (lockedVehicles.length === 0) {
            console.log('All vehicles already owned!');
            return;
        }
        
        const nextVehicle = lockedVehicles[0];
        
        try {
            const result = this.vehicleSystem.purchaseVehicle(nextVehicle.type);
            console.log(`Purchased ${nextVehicle.type} for ${result.cost}! Remaining money: ${result.remainingMoney}`);
        } catch (error) {
            console.log(`Purchase failed: ${error.message}`);
        }
    }
    
    /**
     * Get demo statistics
     */
    getStats() {
        const saveData = this.saveManager.getSaveData();
        const unlockedVehicles = this.vehicleSystem.getUnlockedVehicles();
        const vehicleProgress = this.vehicleSystem.getVehicleUnlockProgress();
        
        return {
            player: saveData.player,
            currentVehicle: this.currentVehicle ? this.currentVehicle.getSummary() : null,
            unlockedVehicles: unlockedVehicles.map(v => v.type),
            vehicleProgress,
            totalVehicles: Object.keys(this.vehicleSystem.vehicles).length
        };
    }
    
    /**
     * Dispose of demo resources
     */
    dispose() {
        this.stop();
        this.renderer.dispose();
        
        console.log('Demo disposed');
    }
}

// Export for use in HTML demo
if (typeof window !== 'undefined') {
    window.VehicleSystemDemo = VehicleSystemDemo;
}