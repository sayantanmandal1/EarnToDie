import { Vehicle } from './Vehicle';
import { getVehicleConfig, VEHICLE_TYPES } from './VehicleConfig';

/**
 * VehicleManager handles spawning, updating, and managing vehicle instances
 */
export class VehicleManager {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.vehicles = new Map();
        this.activeVehicle = null;
        this.playerVehicle = null;
        
        // Vehicle management settings
        this.maxVehicles = 10;
        this.vehiclePool = [];
        
        // Event callbacks
        this.onVehicleDestroyed = null;
        this.onVehicleSpawned = null;
        this.onActiveVehicleChanged = null;
    }

    /**
     * Initialize the vehicle manager
     */
    initialize() {
        console.log('VehicleManager initialized');
        return true;
    }

    /**
     * Create a new vehicle instance
     */
    async createVehicle(type, position = { x: 0, y: 2, z: 0 }, upgrades = {}) {
        try {
            const config = getVehicleConfig(type);
            if (!config) {
                throw new Error(`Unknown vehicle type: ${type}`);
            }

            const vehicle = new Vehicle(type, config.stats, this.gameEngine);
            
            // Apply upgrades if provided
            Object.entries(upgrades).forEach(([category, level]) => {
                vehicle.applyUpgrade(category, level);
            });

            // Initialize the vehicle
            await vehicle.initialize();
            
            // Set position
            if (vehicle.body) {
                vehicle.body.position.set(position.x, position.y, position.z);
            }

            // Add to managed vehicles
            this.vehicles.set(vehicle.id, vehicle);

            // Trigger callback
            if (this.onVehicleSpawned) {
                this.onVehicleSpawned(vehicle);
            }

            console.log(`Created vehicle: ${type} at position`, position);
            return vehicle;
        } catch (error) {
            console.error(`Failed to create vehicle ${type}:`, error);
            throw error;
        }
    }

    /**
     * Spawn the player's vehicle
     */
    async spawnPlayerVehicle(type, position, upgrades = {}) {
        try {
            // Remove existing player vehicle if any
            if (this.playerVehicle) {
                this.removeVehicle(this.playerVehicle.id);
            }

            const vehicle = await this.createVehicle(type, position, upgrades);
            this.playerVehicle = vehicle;
            this.setActiveVehicle(vehicle.id);

            console.log(`Player vehicle spawned: ${type}`);
            return vehicle;
        } catch (error) {
            console.error('Failed to spawn player vehicle:', error);
            throw error;
        }
    }

    /**
     * Set the active vehicle (the one receiving input)
     */
    setActiveVehicle(vehicleId) {
        const vehicle = this.vehicles.get(vehicleId);
        if (!vehicle) {
            console.warn(`Vehicle ${vehicleId} not found`);
            return false;
        }

        this.activeVehicle = vehicle;
        
        if (this.onActiveVehicleChanged) {
            this.onActiveVehicleChanged(vehicle);
        }

        console.log(`Active vehicle set to: ${vehicle.type}`);
        return true;
    }

    /**
     * Get the currently active vehicle
     */
    getActiveVehicle() {
        return this.activeVehicle;
    }

    /**
     * Get the player's vehicle
     */
    getPlayerVehicle() {
        return this.playerVehicle;
    }

    /**
     * Remove a vehicle from the manager
     */
    removeVehicle(vehicleId) {
        const vehicle = this.vehicles.get(vehicleId);
        if (!vehicle) {
            console.warn(`Vehicle ${vehicleId} not found for removal`);
            return false;
        }

        // Dispose of the vehicle
        vehicle.dispose();

        // Remove from collections
        this.vehicles.delete(vehicleId);
        
        if (this.activeVehicle && this.activeVehicle.id === vehicleId) {
            this.activeVehicle = null;
        }
        
        if (this.playerVehicle && this.playerVehicle.id === vehicleId) {
            this.playerVehicle = null;
        }

        // Trigger callback
        if (this.onVehicleDestroyed) {
            this.onVehicleDestroyed(vehicle);
        }

        console.log(`Vehicle ${vehicleId} removed`);
        return true;
    }

    /**
     * Update all vehicles
     */
    update(deltaTime) {
        // Update all vehicles
        for (const vehicle of this.vehicles.values()) {
            vehicle.update(deltaTime);
            
            // Check if vehicle is destroyed and should be removed
            if (vehicle.isDestroyed) {
                this.removeVehicle(vehicle.id);
            }
        }
    }

    /**
     * Apply control inputs to the active vehicle
     */
    applyControls(controls) {
        if (this.activeVehicle && !this.activeVehicle.isDestroyed) {
            this.activeVehicle.setControls(controls);
        }
    }

    /**
     * Get vehicle by ID
     */
    getVehicle(vehicleId) {
        return this.vehicles.get(vehicleId);
    }

    /**
     * Get all vehicles
     */
    getAllVehicles() {
        return Array.from(this.vehicles.values());
    }

    /**
     * Get vehicles within a radius of a position
     */
    getVehiclesInRadius(position, radius) {
        const vehicles = [];
        
        for (const vehicle of this.vehicles.values()) {
            const vehiclePos = vehicle.getPosition();
            const distance = vehiclePos.distanceTo(position);
            
            if (distance <= radius) {
                vehicles.push({
                    vehicle,
                    distance
                });
            }
        }
        
        // Sort by distance
        vehicles.sort((a, b) => a.distance - b.distance);
        return vehicles.map(item => item.vehicle);
    }

    /**
     * Repair a vehicle
     */
    repairVehicle(vehicleId, amount) {
        const vehicle = this.vehicles.get(vehicleId);
        if (vehicle) {
            vehicle.repair(amount);
            return true;
        }
        return false;
    }

    /**
     * Refuel a vehicle
     */
    refuelVehicle(vehicleId, amount) {
        const vehicle = this.vehicles.get(vehicleId);
        if (vehicle) {
            vehicle.refuel(amount);
            return true;
        }
        return false;
    }

    /**
     * Upgrade a vehicle
     */
    upgradeVehicle(vehicleId, category, level) {
        const vehicle = this.vehicles.get(vehicleId);
        if (vehicle) {
            vehicle.applyUpgrade(category, level);
            return true;
        }
        return false;
    }

    /**
     * Get vehicle statistics
     */
    getVehicleStats(vehicleId) {
        const vehicle = this.vehicles.get(vehicleId);
        if (!vehicle) return null;

        return {
            id: vehicle.id,
            type: vehicle.type,
            health: vehicle.health,
            fuel: vehicle.fuel,
            position: vehicle.getPosition(),
            velocity: vehicle.getVelocity(),
            speed: vehicle.getSpeed(),
            stats: { ...vehicle.stats },
            upgrades: { ...vehicle.upgrades },
            isDestroyed: vehicle.isDestroyed
        };
    }

    /**
     * Spawn multiple AI vehicles for testing or gameplay
     */
    async spawnAIVehicles(count, types = null, spawnRadius = 50) {
        const spawnedVehicles = [];
        const availableTypes = types || Object.values(VEHICLE_TYPES);

        for (let i = 0; i < count; i++) {
            try {
                // Random vehicle type
                const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
                
                // Random position within spawn radius
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * spawnRadius;
                const position = {
                    x: Math.cos(angle) * distance,
                    y: 2,
                    z: Math.sin(angle) * distance
                };

                const vehicle = await this.createVehicle(randomType, position);
                spawnedVehicles.push(vehicle);
            } catch (error) {
                console.error(`Failed to spawn AI vehicle ${i}:`, error);
            }
        }

        console.log(`Spawned ${spawnedVehicles.length} AI vehicles`);
        return spawnedVehicles;
    }

    /**
     * Clear all vehicles
     */
    clearAllVehicles() {
        const vehicleIds = Array.from(this.vehicles.keys());
        vehicleIds.forEach(id => this.removeVehicle(id));
        
        this.activeVehicle = null;
        this.playerVehicle = null;
        
        console.log('All vehicles cleared');
    }

    /**
     * Get vehicle count
     */
    getVehicleCount() {
        return this.vehicles.size;
    }

    /**
     * Check if at maximum vehicle capacity
     */
    isAtMaxCapacity() {
        return this.vehicles.size >= this.maxVehicles;
    }

    /**
     * Set maximum vehicle capacity
     */
    setMaxVehicles(max) {
        this.maxVehicles = max;
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return {
            totalVehicles: this.vehicles.size,
            maxVehicles: this.maxVehicles,
            activeVehicle: this.activeVehicle ? this.activeVehicle.id : null,
            playerVehicle: this.playerVehicle ? this.playerVehicle.id : null
        };
    }

    /**
     * Dispose of the vehicle manager and clean up all resources
     */
    dispose() {
        this.clearAllVehicles();
        
        // Clear callbacks
        this.onVehicleDestroyed = null;
        this.onVehicleSpawned = null;
        this.onActiveVehicleChanged = null;
        
        console.log('VehicleManager disposed');
    }
}