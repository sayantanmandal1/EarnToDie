/**
 * Vehicle System Demo
 * Interactive demonstration of the vehicle system functionality
 */

import { VehicleSystem } from './VehicleSystem.js';
import { VehicleRenderer } from './VehicleRenderer.js';
import { ZombieCarSaveManager } from '../save/ZombieCarSaveManager.js';
import { VehicleTypes } from '../save/GameDataModels.js';

class VehicleSystemDemo {
    constructor() {
        this.saveManager = null;
        this.vehicleSystem = null;
        this.renderer = new VehicleRenderer();
        this.canvases = new Map();
        this.animationFrames = new Map();
        
        this.init();
    }
    
    async init() {
        try {
            // Initialize save manager
            this.saveManager = new ZombieCarSaveManager();
            await this.saveManager.initialize();
            
            // Initialize vehicle system
            this.vehicleSystem = new VehicleSystem(this.saveManager);
            
            // Set up demo with some initial money and distance
            const saveData = this.saveManager.getSaveData();
            if (saveData.player.money === 0) {
                saveData.player.money = 1000;
                saveData.player.bestDistance = 2000;
                await this.saveManager.saveToDisk();
            }
            
            this.setupUI();
            this.updateDisplay();
            
            console.log('Vehicle System Demo initialized successfully');
        } catch (error) {
            console.error('Failed to initialize demo:', error);
            this.showMessage('Failed to initialize demo: ' + error.message, 'error');
        }
    }
    
    setupUI() {
        // Create vehicle cards
        this.createVehicleCards();
        
        // Set up global functions for buttons
        window.simulateRun = () => this.simulateRun();
        window.addMoney = () => this.addMoney();
        window.addDistance = () => this.addDistance();
        window.resetProgress = () => this.resetProgress();
        window.refuelAll = () => this.refuelAll();
    }
    
    createVehicleCards() {
        const vehicleGrid = document.getElementById('vehicleGrid');
        vehicleGrid.innerHTML = '';
        
        Object.keys(VehicleTypes).forEach(vehicleType => {
            const vehicleConfig = VehicleTypes[vehicleType];
            const vehicleInstance = this.vehicleSystem.getVehicle(vehicleType);
            const isOwned = this.saveManager.getSaveData().vehicles.owned.includes(vehicleType);
            const isCurrent = this.vehicleSystem.getCurrentVehicle()?.type === vehicleType;
            
            const card = document.createElement('div');
            card.className = 'vehicle-card';
            card.innerHTML = `
                <h3>${vehicleConfig.name} ${isCurrent ? '⭐' : ''}</h3>
                <p>${vehicleConfig.description}</p>
                
                <canvas class="vehicle-canvas" id="canvas-${vehicleType}" width="280" height="140"></canvas>
                
                <div class="fuel-gauge">
                    <div class="fuel-fill" id="fuel-${vehicleType}" style="width: ${vehicleInstance.getFuelPercentage() * 100}%"></div>
                    <div class="fuel-text">Fuel: ${Math.round(vehicleInstance.getFuelPercentage() * 100)}%</div>
                </div>
                
                <div class="vehicle-stats">
                    <div>
                        <div>Engine: ${vehicleInstance.getEffectiveStats().engine}</div>
                        <div class="stat-bar"><div class="stat-fill" style="width: ${vehicleInstance.getEffectiveStats().engine}%"></div></div>
                    </div>
                    <div>
                        <div>Fuel: ${vehicleInstance.getEffectiveStats().fuel}</div>
                        <div class="stat-bar"><div class="stat-fill" style="width: ${Math.min(100, vehicleInstance.getEffectiveStats().fuel)}%"></div></div>
                    </div>
                    <div>
                        <div>Armor: ${vehicleInstance.getEffectiveStats().armor}</div>
                        <div class="stat-bar"><div class="stat-fill" style="width: ${vehicleInstance.getEffectiveStats().armor}%"></div></div>
                    </div>
                    <div>
                        <div>Weapon: ${vehicleInstance.getEffectiveStats().weapon}</div>
                        <div class="stat-bar"><div class="stat-fill" style="width: ${vehicleInstance.getEffectiveStats().weapon}%"></div></div>
                    </div>
                </div>
                
                <div class="controls">
                    ${!isOwned ? `
                        <button onclick="purchaseVehicle('${vehicleType}')" 
                                ${this.canPurchaseVehicle(vehicleType) ? '' : 'disabled'}>
                            Buy ($${vehicleConfig.cost})
                        </button>
                    ` : `
                        <button onclick="selectVehicle('${vehicleType}')" 
                                ${isCurrent ? 'disabled' : ''}>
                            ${isCurrent ? 'Selected' : 'Select'}
                        </button>
                        <button onclick="consumeFuel('${vehicleType}')">
                            🔥 Use Fuel
                        </button>
                        <button onclick="refuelVehicle('${vehicleType}')">
                            ⛽ Refuel
                        </button>
                    `}
                </div>
                
                ${isOwned ? `
                    <div class="upgrade-section">
                        <h4>Upgrades</h4>
                        <div class="upgrade-grid">
                            ${['engine', 'fuel', 'armor', 'weapon', 'wheels'].map(category => `
                                <div class="upgrade-item">
                                    <div>${category.charAt(0).toUpperCase() + category.slice(1)}</div>
                                    <div class="upgrade-level">
                                        ${Array.from({length: 5}, (_, i) => `
                                            <div class="upgrade-dot ${i < vehicleInstance.getCurrentUpgrades()[category] ? 'active' : ''}"></div>
                                        `).join('')}
                                    </div>
                                    <button onclick="upgradeVehicle('${vehicleType}', '${category}')" 
                                            ${this.canUpgradeVehicle(vehicleType, category) ? '' : 'disabled'}>
                                        $${vehicleInstance.getUpgradeCost(category) || 'MAX'}
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            `;
            
            vehicleGrid.appendChild(card);
            
            // Set up canvas rendering
            const canvas = document.getElementById(`canvas-${vehicleType}`);
            this.canvases.set(vehicleType, canvas);
            this.startVehicleAnimation(vehicleType);
        });
        
        // Set up global functions for vehicle actions
        window.purchaseVehicle = (vehicleType) => this.purchaseVehicle(vehicleType);
        window.selectVehicle = (vehicleType) => this.selectVehicle(vehicleType);
        window.upgradeVehicle = (vehicleType, category) => this.upgradeVehicle(vehicleType, category);
        window.consumeFuel = (vehicleType) => this.consumeFuel(vehicleType);
        window.refuelVehicle = (vehicleType) => this.refuelVehicle(vehicleType);
    }
    
    startVehicleAnimation(vehicleType) {
        const canvas = this.canvases.get(vehicleType);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const vehicleInstance = this.vehicleSystem.getVehicle(vehicleType);
        
        const animate = () => {
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Set up camera-like transform
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            
            // Render vehicle
            this.renderer.renderVehicle(ctx, vehicleInstance);
            
            ctx.restore();
            
            // Continue animation
            this.animationFrames.set(vehicleType, requestAnimationFrame(animate));
        };
        
        animate();
    }
    
    canPurchaseVehicle(vehicleType) {
        const result = this.vehicleSystem.canPurchaseVehicle(vehicleType);
        return result.canPurchase;
    }
    
    canUpgradeVehicle(vehicleType, category) {
        const vehicleInstance = this.vehicleSystem.getVehicle(vehicleType);
        const cost = vehicleInstance.getUpgradeCost(category);
        const playerMoney = this.saveManager.getSaveData().player.money;
        
        return cost !== null && playerMoney >= cost;
    }
    
    async purchaseVehicle(vehicleType) {
        try {
            const result = this.vehicleSystem.purchaseVehicle(vehicleType);
            this.showMessage(`Successfully purchased ${VehicleTypes[vehicleType].name} for $${result.cost}!`, 'success');
            this.updateDisplay();
        } catch (error) {
            this.showMessage(`Failed to purchase vehicle: ${error.message}`, 'error');
        }
    }
    
    async selectVehicle(vehicleType) {
        try {
            this.vehicleSystem.selectVehicle(vehicleType);
            this.showMessage(`Selected ${VehicleTypes[vehicleType].name} as current vehicle!`, 'success');
            this.updateDisplay();
        } catch (error) {
            this.showMessage(`Failed to select vehicle: ${error.message}`, 'error');
        }
    }
    
    async upgradeVehicle(vehicleType, category) {
        try {
            const vehicleInstance = this.vehicleSystem.getVehicle(vehicleType);
            const result = vehicleInstance.purchaseUpgrade(category);
            this.showMessage(`Upgraded ${category} to level ${result.newLevel} for $${result.cost}!`, 'success');
            this.updateDisplay();
        } catch (error) {
            this.showMessage(`Failed to upgrade: ${error.message}`, 'error');
        }
    }
    
    consumeFuel(vehicleType) {
        const vehicleInstance = this.vehicleSystem.getVehicle(vehicleType);
        vehicleInstance.consumeFuel(5000, 0.8); // 5 seconds at 80% throttle
        this.updateFuelDisplay(vehicleType);
        this.showMessage(`${VehicleTypes[vehicleType].name} consumed fuel!`, 'success');
    }
    
    refuelVehicle(vehicleType) {
        const vehicleInstance = this.vehicleSystem.getVehicle(vehicleType);
        vehicleInstance.refillFuel();
        this.updateFuelDisplay(vehicleType);
        this.showMessage(`${VehicleTypes[vehicleType].name} refueled!`, 'success');
    }
    
    async simulateRun() {
        try {
            const currentVehicle = this.vehicleSystem.getCurrentVehicle();
            if (!currentVehicle) {
                this.showMessage('No vehicle selected!', 'error');
                return;
            }
            
            // Simulate a run
            const distance = Math.random() * 2000 + 500; // 500-2500m
            const zombiesKilled = Math.floor(Math.random() * 20);
            const moneyEarned = Math.floor(distance * 0.1);
            
            // Update save data
            await this.saveManager.updateRunStats(distance, zombiesKilled, moneyEarned);
            
            // Consume fuel
            currentVehicle.consumeFuel(10000, 0.6); // 10 seconds of driving
            
            this.showMessage(`Run completed! Distance: ${Math.round(distance)}m, Money: $${moneyEarned}, Zombies: ${zombiesKilled}`, 'success');
            this.updateDisplay();
        } catch (error) {
            this.showMessage(`Run failed: ${error.message}`, 'error');
        }
    }
    
    async addMoney() {
        try {
            await this.saveManager.addMoney(500);
            this.showMessage('Added $500!', 'success');
            this.updateDisplay();
        } catch (error) {
            this.showMessage(`Failed to add money: ${error.message}`, 'error');
        }
    }
    
    async addDistance() {
        try {
            const saveData = this.saveManager.getSaveData();
            saveData.player.bestDistance += 1000;
            await this.saveManager.saveToDisk();
            this.showMessage('Added 1000m to best distance!', 'success');
            this.updateDisplay();
        } catch (error) {
            this.showMessage(`Failed to add distance: ${error.message}`, 'error');
        }
    }
    
    async resetProgress() {
        try {
            await this.saveManager.resetSaveData();
            
            // Reinitialize vehicle system
            this.vehicleSystem = new VehicleSystem(this.saveManager);
            
            // Add some initial money and distance for demo
            const saveData = this.saveManager.getSaveData();
            saveData.player.money = 1000;
            saveData.player.bestDistance = 2000;
            await this.saveManager.saveToDisk();
            
            this.showMessage('Progress reset!', 'success');
            this.updateDisplay();
        } catch (error) {
            this.showMessage(`Failed to reset: ${error.message}`, 'error');
        }
    }
    
    refuelAll() {
        const vehicles = this.vehicleSystem.getAllVehicles();
        vehicles.forEach(vehicle => {
            vehicle.refillFuel();
            this.updateFuelDisplay(vehicle.type);
        });
        this.showMessage('All vehicles refueled!', 'success');
    }
    
    updateDisplay() {
        // Update status panel
        const saveData = this.saveManager.getSaveData();
        document.getElementById('playerMoney').textContent = `$${saveData.player.money.toLocaleString()}`;
        document.getElementById('playerDistance').textContent = `${saveData.player.bestDistance.toLocaleString()}m`;
        document.getElementById('playerRuns').textContent = saveData.player.totalRuns.toLocaleString();
        
        const currentVehicle = this.vehicleSystem.getCurrentVehicle();
        document.getElementById('currentVehicle').textContent = currentVehicle ? VehicleTypes[currentVehicle.type].name : 'None';
        
        // Recreate vehicle cards to reflect changes
        this.createVehicleCards();
    }
    
    updateFuelDisplay(vehicleType) {
        const vehicleInstance = this.vehicleSystem.getVehicle(vehicleType);
        const fuelFill = document.getElementById(`fuel-${vehicleType}`);
        const fuelText = fuelFill.nextElementSibling;
        
        if (fuelFill && fuelText) {
            const fuelPercentage = vehicleInstance.getFuelPercentage() * 100;
            fuelFill.style.width = `${fuelPercentage}%`;
            fuelText.textContent = `Fuel: ${Math.round(fuelPercentage)}%`;
        }
    }
    
    showMessage(message, type = 'success') {
        const messagesDiv = document.getElementById('messages');
        const messageElement = document.createElement('div');
        messageElement.className = type;
        messageElement.textContent = message;
        
        messagesDiv.appendChild(messageElement);
        
        // Remove message after 3 seconds
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 3000);
        
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
    
    dispose() {
        // Stop all animations
        this.animationFrames.forEach(frameId => {
            cancelAnimationFrame(frameId);
        });
        this.animationFrames.clear();
        
        // Dispose renderer
        this.renderer.dispose();
        
        // Clear canvases
        this.canvases.clear();
    }
}

// Initialize demo when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.vehicleDemo = new VehicleSystemDemo();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.vehicleDemo) {
        window.vehicleDemo.dispose();
    }
});

export { VehicleSystemDemo };