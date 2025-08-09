/**
 * 2D Vehicle class for Desert Survival Zombie Car Game
 * Integrates with Matter.js physics and 2D canvas rendering
 */

import VehiclePhysics from '../physics/VehiclePhysics.js';

class Vehicle2D {
  constructor(type, gameEngine, x = 0, y = 0) {
    this.id = this._generateId();
    this.type = type;
    this.gameEngine = gameEngine;
    
    // Vehicle physics
    this.physics = new VehiclePhysics(gameEngine);
    
    // Vehicle stats based on type
    this.baseStats = this._getVehicleStats(type);
    this.stats = { ...this.baseStats };
    
    // Vehicle state
    this.health = 100;
    this.fuel = this.stats.fuelCapacity;
    this.position = { x, y };
    this.rotation = 0;
    this.velocity = { x: 0, y: 0 };
    
    // Control inputs
    this.controls = {
      throttle: 0,    // -1 to 1 (reverse to forward)
      steering: 0,    // -1 to 1 (left to right)
      brake: 0,       // 0 to 1
      tilt: 0         // -1 to 1 (for mid-air maneuvering)
    };
    
    // Upgrades
    this.upgrades = {
      engine: 0,
      fuel: 0,
      armor: 0,
      weapon: 0,
      wheels: 0
    };
    
    // Visual properties
    this.sprite = null;
    this.width = 80;
    this.height = 40;
    this.color = this._getVehicleColor(type);
    
    // State flags
    this.isDestroyed = false;
    this.isInitialized = false;
  }
  
  /**
   * Initialize the vehicle
   */
  async initialize() {
    try {
      // Create physics body
      this.physics.createVehicleBody(
        this.position.x,
        this.position.y,
        this.width,
        this.height,
        this.stats.mass
      );
      
      // Load sprite if available
      await this._loadSprite();
      
      // Apply initial upgrades
      this._applyUpgrades();
      
      this.isInitialized = true;
      console.log(`Vehicle ${this.type} initialized at (${this.position.x}, ${this.position.y})`);
      
      return true;
    } catch (error) {
      console.error(`Failed to initialize vehicle ${this.type}:`, error);
      throw error;
    }
  }
  
  /**
   * Update vehicle each frame
   */
  update(deltaTime) {
    if (!this.isInitialized || this.isDestroyed) return;
    
    // Update physics
    this.physics.update(deltaTime, this.controls);
    
    // Update position and rotation from physics
    this._updateFromPhysics();
    
    // Update fuel consumption
    this._updateFuel(deltaTime);
    
    // Check health status
    this._checkHealth();
    
    // Update visual effects
    this._updateVisualEffects(deltaTime);
  }
  
  /**
   * Render the vehicle
   */
  render(ctx) {
    if (!this.isInitialized || this.isDestroyed) return;
    
    ctx.save();
    
    // Transform to vehicle position and rotation
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.rotation);
    
    // Render vehicle body
    this._renderBody(ctx);
    
    // Render upgrades
    this._renderUpgrades(ctx);
    
    // Render damage effects
    this._renderDamageEffects(ctx);
    
    ctx.restore();
    
    // Render wheels separately (they have their own physics bodies)
    this._renderWheels(ctx);
  }
  
  /**
   * Set control inputs
   */
  setControls(controls) {
    this.controls = { ...this.controls, ...controls };
  }
  
  /**
   * Apply damage to the vehicle
   */
  takeDamage(amount, damageType = 'impact') {
    if (this.isDestroyed) return 0;
    
    // Calculate armor reduction (max 50% reduction)
    const armorReduction = Math.min(0.5, this.stats.armor * 0.005);
    const actualDamage = amount * (1 - armorReduction);
    
    this.health = Math.max(0, this.health - actualDamage);
    
    // Create damage visual effect
    this._createDamageEffect(actualDamage, damageType);
    
    // Check if vehicle is destroyed
    if (this.health <= 0) {
      this._destroy();
    }
    
    return actualDamage;
  }
  
  /**
   * Repair the vehicle
   */
  repair(amount) {
    if (this.isDestroyed) return;
    this.health = Math.min(100, this.health + amount);
  }
  
  /**
   * Refuel the vehicle
   */
  refuel(amount) {
    this.fuel = Math.min(this.stats.fuelCapacity, this.fuel + amount);
  }
  
  /**
   * Apply upgrade to specific category
   */
  applyUpgrade(category, level) {
    if (this.upgrades.hasOwnProperty(category)) {
      this.upgrades[category] = Math.max(0, Math.min(5, level));
      this._applyUpgrades();
    }
  }
  
  /**
   * Get current vehicle position
   */
  getPosition() {
    return { ...this.position };
  }
  
  /**
   * Get current vehicle velocity
   */
  getVelocity() {
    return { ...this.velocity };
  }
  
  /**
   * Get current vehicle speed
   */
  getSpeed() {
    return this.physics.getSpeed();
  }
  
  /**
   * Check if vehicle is airborne
   */
  isAirborne() {
    return this.physics.getIsAirborne();
  }
  
  /**
   * Get vehicle health percentage
   */
  getHealthPercentage() {
    return this.health / 100;
  }
  
  /**
   * Get fuel percentage
   */
  getFuelPercentage() {
    return this.fuel / this.stats.fuelCapacity;
  }
  
  /**
   * Dispose of the vehicle
   */
  dispose() {
    if (this.physics) {
      this.physics.dispose();
    }
    
    this.isDestroyed = true;
    this.isInitialized = false;
    
    console.log(`Vehicle ${this.type} disposed`);
  }
  
  /**
   * Generate unique ID for the vehicle
   */
  _generateId() {
    return 'vehicle_' + Math.random().toString(36).substr(2, 9);
  }
  
  /**
   * Get vehicle stats based on type
   */
  _getVehicleStats(type) {
    const statsMap = {
      'starter_car': {
        mass: 1000,
        enginePower: 50,
        maxSpeed: 15,
        acceleration: 0.8,
        handling: 0.7,
        armor: 10,
        fuelCapacity: 100,
        fuelConsumption: 1.0
      },
      'old_truck': {
        mass: 1500,
        enginePower: 60,
        maxSpeed: 12,
        acceleration: 0.6,
        handling: 0.5,
        armor: 25,
        fuelCapacity: 150,
        fuelConsumption: 1.5
      },
      'sports_car': {
        mass: 800,
        enginePower: 90,
        maxSpeed: 25,
        acceleration: 1.2,
        handling: 1.0,
        armor: 5,
        fuelCapacity: 80,
        fuelConsumption: 1.8
      },
      'monster_truck': {
        mass: 2000,
        enginePower: 70,
        maxSpeed: 18,
        acceleration: 0.7,
        handling: 0.4,
        armor: 40,
        fuelCapacity: 200,
        fuelConsumption: 2.0
      },
      'armored_van': {
        mass: 1800,
        enginePower: 65,
        maxSpeed: 14,
        acceleration: 0.5,
        handling: 0.6,
        armor: 60,
        fuelCapacity: 120,
        fuelConsumption: 1.3
      }
    };
    
    return statsMap[type] || statsMap['starter_car'];
  }
  
  /**
   * Get vehicle color based on type
   */
  _getVehicleColor(type) {
    const colorMap = {
      'starter_car': '#8b4513',
      'old_truck': '#654321',
      'sports_car': '#ff4500',
      'monster_truck': '#800080',
      'armored_van': '#696969'
    };
    
    return colorMap[type] || colorMap['starter_car'];
  }
  
  /**
   * Load vehicle sprite
   */
  async _loadSprite() {
    // Try to get sprite from game engine assets
    const spriteName = `${this.type}_sprite`;
    this.sprite = this.gameEngine.getAsset(spriteName);
    
    if (!this.sprite) {
      console.log(`No sprite found for ${this.type}, using default rendering`);
    }
  }
  
  /**
   * Update position and rotation from physics
   */
  _updateFromPhysics() {
    this.position = this.physics.getPosition();
    this.velocity = this.physics.getVelocity();
    this.rotation = this.physics.getRotation();
  }
  
  /**
   * Update fuel consumption
   */
  _updateFuel(deltaTime) {
    if (Math.abs(this.controls.throttle) > 0.1) {
      const consumption = this.stats.fuelConsumption * Math.abs(this.controls.throttle);
      const efficiency = 1 + (this.upgrades.fuel * 0.1); // 10% better efficiency per upgrade
      this.fuel = Math.max(0, this.fuel - (consumption / efficiency) * (deltaTime / 1000));
    }
  }
  
  /**
   * Check vehicle health and handle destruction
   */
  _checkHealth() {
    if (this.health <= 0 && !this.isDestroyed) {
      this._destroy();
    }
  }
  
  /**
   * Apply all upgrades to vehicle stats
   */
  _applyUpgrades() {
    // Reset stats to base values
    this.stats = { ...this.baseStats };
    
    // Apply engine upgrades
    this.stats.enginePower *= (1 + this.upgrades.engine * 0.2);
    this.stats.maxSpeed *= (1 + this.upgrades.engine * 0.15);
    this.stats.acceleration *= (1 + this.upgrades.engine * 0.1);
    
    // Apply fuel upgrades
    this.stats.fuelCapacity *= (1 + this.upgrades.fuel * 0.25);
    
    // Apply armor upgrades
    this.stats.armor += this.upgrades.armor * 15;
    
    // Apply wheel upgrades
    this.stats.handling *= (1 + this.upgrades.wheels * 0.15);
    
    // Update physics properties if initialized
    if (this.physics && this.physics.body) {
      // Update suspension based on upgrades
      this.physics.suspensionStiffness = 0.8 + (this.upgrades.wheels * 0.1);
      this.physics.suspensionDamping = 0.3 + (this.upgrades.wheels * 0.05);
    }
  }
  
  /**
   * Update visual effects
   */
  _updateVisualEffects(deltaTime) {
    // Update engine effects based on throttle
    if (Math.abs(this.controls.throttle) > 0.1) {
      this._updateEngineEffects();
    }
    
    // Update damage smoke if heavily damaged
    if (this.health < 30) {
      this._updateDamageSmoke();
    }
  }
  
  /**
   * Render vehicle body
   */
  _renderBody(ctx) {
    if (this.sprite) {
      // Render sprite if available
      ctx.drawImage(
        this.sprite,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );
    } else {
      // Render basic rectangle
      ctx.fillStyle = this.color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
      
      // Add some basic details
      this._renderBasicDetails(ctx);
    }
  }
  
  /**
   * Render basic vehicle details
   */
  _renderBasicDetails(ctx) {
    // Windshield
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(-this.width / 2 + 5, -this.height / 2 + 5, this.width - 10, 8);
    
    // Headlights
    ctx.fillStyle = '#ffff99';
    ctx.beginPath();
    ctx.arc(this.width / 2 - 5, -5, 3, 0, Math.PI * 2);
    ctx.arc(this.width / 2 - 5, 5, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Grille
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const x = this.width / 2 - 8;
      const y = -8 + (i * 5);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 6, y);
      ctx.stroke();
    }
  }
  
  /**
   * Render vehicle upgrades
   */
  _renderUpgrades(ctx) {
    // Engine upgrades - exhaust smoke
    if (this.upgrades.engine > 0 && Math.abs(this.controls.throttle) > 0.1) {
      this._renderExhaustSmoke(ctx);
    }
    
    // Armor upgrades - armor plating
    if (this.upgrades.armor > 0) {
      this._renderArmorPlating(ctx);
    }
    
    // Weapon upgrades - mounted weapons
    if (this.upgrades.weapon > 0) {
      this._renderWeapons(ctx);
    }
    
    // Fuel upgrades - external tanks
    if (this.upgrades.fuel > 2) {
      this._renderFuelTanks(ctx);
    }
  }
  
  /**
   * Render exhaust smoke
   */
  _renderExhaustSmoke(ctx) {
    const smokeIntensity = Math.abs(this.controls.throttle) * this.upgrades.engine;
    
    ctx.fillStyle = `rgba(100, 100, 100, ${0.3 * smokeIntensity})`;
    
    for (let i = 0; i < 3; i++) {
      const x = -this.width / 2 - 10 - (i * 5);
      const y = (Math.random() - 0.5) * 10;
      const size = 3 + (i * 2);
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  /**
   * Render armor plating
   */
  _renderArmorPlating(ctx) {
    ctx.fillStyle = '#555555';
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    
    // Side armor plates
    const plateThickness = 2 + this.upgrades.armor;
    
    // Left plate
    ctx.fillRect(-this.width / 2 - plateThickness, -this.height / 2, plateThickness, this.height);
    ctx.strokeRect(-this.width / 2 - plateThickness, -this.height / 2, plateThickness, this.height);
    
    // Right plate
    ctx.fillRect(this.width / 2, -this.height / 2, plateThickness, this.height);
    ctx.strokeRect(this.width / 2, -this.height / 2, plateThickness, this.height);
    
    // Front bumper
    if (this.upgrades.armor >= 3) {
      ctx.fillRect(this.width / 2, -this.height / 2 + 5, 8, this.height - 10);
      ctx.strokeRect(this.width / 2, -this.height / 2 + 5, 8, this.height - 10);
    }
  }
  
  /**
   * Render mounted weapons
   */
  _renderWeapons(ctx) {
    ctx.fillStyle = '#333333';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    
    // Roof-mounted gun
    const gunLength = 15 + (this.upgrades.weapon * 3);
    const gunWidth = 2;
    
    ctx.fillRect(-gunWidth / 2, -this.height / 2 - 5, gunWidth, -gunLength);
    ctx.strokeRect(-gunWidth / 2, -this.height / 2 - 5, gunWidth, -gunLength);
    
    // Gun barrel
    ctx.fillStyle = '#222222';
    ctx.fillRect(-1, -this.height / 2 - 5 - gunLength, 2, -5);
    
    // Muzzle flash if firing (placeholder)
    if (this.controls.fire) {
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(0, -this.height / 2 - 5 - gunLength - 5, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  /**
   * Render external fuel tanks
   */
  _renderFuelTanks(ctx) {
    ctx.fillStyle = '#8b4513';
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 1;
    
    const tankWidth = 8;
    const tankHeight = 15;
    
    // Left tank
    ctx.fillRect(-this.width / 2 - tankWidth - 2, -tankHeight / 2, tankWidth, tankHeight);
    ctx.strokeRect(-this.width / 2 - tankWidth - 2, -tankHeight / 2, tankWidth, tankHeight);
    
    // Right tank
    ctx.fillRect(this.width / 2 + 2, -tankHeight / 2, tankWidth, tankHeight);
    ctx.strokeRect(this.width / 2 + 2, -tankHeight / 2, tankWidth, tankHeight);
  }
  
  /**
   * Render wheels
   */
  _renderWheels(ctx) {
    if (!this.physics.wheels) return;
    
    ctx.fillStyle = '#333333';
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 2;
    
    this.physics.wheels.forEach(wheel => {
      const pos = wheel.position;
      const radius = this.physics.wheelRadius;
      
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(wheel.angle);
      
      // Wheel body
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Tire tread
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x1 = Math.cos(angle) * (radius - 3);
        const y1 = Math.sin(angle) * (radius - 3);
        const x2 = Math.cos(angle) * (radius - 1);
        const y2 = Math.sin(angle) * (radius - 1);
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      
      ctx.restore();
    });
  }
  
  /**
   * Render damage effects
   */
  _renderDamageEffects(ctx) {
    const healthRatio = this.health / 100;
    
    if (healthRatio < 0.7) {
      // Render damage cracks
      ctx.strokeStyle = '#8b0000';
      ctx.lineWidth = 1;
      
      const numCracks = Math.floor((1 - healthRatio) * 5);
      for (let i = 0; i < numCracks; i++) {
        const startX = (Math.random() - 0.5) * this.width;
        const startY = (Math.random() - 0.5) * this.height;
        const endX = startX + (Math.random() - 0.5) * 20;
        const endY = startY + (Math.random() - 0.5) * 20;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    }
    
    if (healthRatio < 0.3) {
      // Render smoke
      this._renderDamageSmoke(ctx);
    }
  }
  
  /**
   * Render damage smoke
   */
  _renderDamageSmoke(ctx) {
    const smokeOpacity = (1 - this.health / 100) * 0.5;
    
    ctx.fillStyle = `rgba(50, 50, 50, ${smokeOpacity})`;
    
    for (let i = 0; i < 3; i++) {
      const x = (Math.random() - 0.5) * this.width;
      const y = -this.height / 2 - 5 - (i * 8);
      const size = 4 + (i * 2);
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  /**
   * Update engine effects
   */
  _updateEngineEffects() {
    // Placeholder for engine sound and visual effects
    // This would integrate with the audio system
  }
  
  /**
   * Update damage smoke effects
   */
  _updateDamageSmoke() {
    // Placeholder for particle system integration
  }
  
  /**
   * Create damage effect
   */
  _createDamageEffect(damage, damageType) {
    // Emit event for particle system
    this.gameEngine.emit('vehicleDamageEffect', {
      position: this.position,
      damage: damage,
      type: damageType
    });
  }
  
  /**
   * Destroy the vehicle
   */
  _destroy() {
    this.isDestroyed = true;
    this.health = 0;
    
    // Create explosion effect
    this.gameEngine.emit('vehicleDestroyed', {
      position: this.position,
      vehicle: this
    });
    
    console.log(`Vehicle ${this.type} destroyed`);
  }
}

export default Vehicle2D;