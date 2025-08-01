import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Vehicle class representing a single vehicle with physics, rendering, and stats
 */
export class Vehicle {
    constructor(type, stats, gameEngine) {
        this.id = this._generateId();
        this.type = type;
        this.baseStats = { ...stats }; // Store original stats
        this.stats = { ...stats }; // Working stats that get modified
        this.gameEngine = gameEngine;
        
        // 3D rendering components
        this.mesh = null;
        this.wheels = [];
        
        // Physics components
        this.body = null;
        this.wheelBodies = [];
        this.constraints = [];
        
        // Vehicle state
        this.position = new THREE.Vector3();
        this.rotation = new THREE.Euler();
        this.velocity = new THREE.Vector3();
        this.health = 100;
        this.fuel = this.stats.fuelCapacity;
        
        // Control inputs
        this.controls = {
            forward: 0,
            backward: 0,
            left: 0,
            right: 0,
            brake: 0
        };
        
        // Upgrades applied to this vehicle
        this.upgrades = {
            engine: 0,
            armor: 0,
            weapons: 0,
            fuel: 0,
            tires: 0
        };
        
        this.isDestroyed = false;
    }

    /**
     * Initialize the vehicle with mesh and physics body
     */
    async initialize() {
        try {
            await this._createMesh();
            this._createPhysicsBody();
            this._setupWheels();
            this._applyUpgrades();
            
            // Add to game engine
            this.gameEngine.addObject(this.mesh, this.body);
            
            console.log(`Vehicle ${this.type} initialized successfully`);
            return true;
        } catch (error) {
            console.error(`Failed to initialize vehicle ${this.type}:`, error);
            throw error;
        }
    }

    /**
     * Update vehicle physics and rendering each frame
     */
    update(deltaTime) {
        if (this.isDestroyed) return;
        
        this._updatePhysics(deltaTime);
        this._updateMesh();
        this._updateFuel(deltaTime);
        this._checkHealth();
    }

    /**
     * Apply control inputs to the vehicle
     */
    setControls(controls) {
        this.controls = { ...this.controls, ...controls };
    }

    /**
     * Apply damage to the vehicle
     */
    takeDamage(amount, damageType = 'impact', source = null) {
        if (this.isDestroyed) return 0;
        
        const armorReduction = this.stats.armor * 0.01; // 1% damage reduction per armor point
        const actualDamage = amount * (1 - armorReduction);
        
        this.health = Math.max(0, this.health - actualDamage);
        
        // Apply visual damage effects
        this._applyVisualDamage(actualDamage, damageType);
        
        // Affect vehicle performance based on damage
        this._updatePerformanceFromDamage();
        
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
     * Apply upgrades to the vehicle
     */
    applyUpgrade(category, level) {
        this.upgrades[category] = level;
        this._applyUpgrades();
    }

    /**
     * Get current vehicle position
     */
    getPosition() {
        if (this.body) {
            this.position.copy(this.body.position);
        }
        return this.position.clone();
    }

    /**
     * Get current vehicle rotation
     */
    getRotation() {
        if (this.body) {
            this.rotation.setFromQuaternion(this.body.quaternion);
        }
        return this.rotation.clone();
    }

    /**
     * Get current vehicle velocity
     */
    getVelocity() {
        if (this.body) {
            this.velocity.copy(this.body.velocity);
        }
        return this.velocity.clone();
    }

    /**
     * Get vehicle speed in km/h
     */
    getSpeed() {
        const velocity = this.getVelocity();
        return velocity.length() * 3.6; // Convert m/s to km/h
    }

    /**
     * Dispose of the vehicle and clean up resources
     */
    dispose() {
        if (this.mesh) {
            this.gameEngine.removeObject(this.mesh, this.body);
        }
        
        // Clean up wheel constraints
        this.constraints.forEach(constraint => {
            this.gameEngine.physics.removeConstraint(constraint);
        });
        
        // Clean up wheel bodies
        this.wheelBodies.forEach(wheelBody => {
            this.gameEngine.physics.remove(wheelBody);
        });
        
        // Clean up upgrade visual elements
        this._disposeUpgradeVisuals();
        
        this.isDestroyed = true;
    }

    /**
     * Clean up upgrade visual elements
     */
    _disposeUpgradeVisuals() {
        // Remove all upgrade visual elements
        const upgradeElements = [
            'engineGlow', 'turboFlame', 'armorPlating', 'armorSpikes', 
            'reinforcedBumper', 'weaponMounts', 'missileLaunchers', 
            'heavyCannon', 'fuelTanks', 'fuelIndicators'
        ];
        
        upgradeElements.forEach(elementName => {
            if (this[elementName]) {
                if (this.mesh && this[elementName].parent === this.mesh) {
                    this.mesh.remove(this[elementName]);
                }
                
                // Dispose of geometries and materials
                if (this[elementName].geometry) {
                    this[elementName].geometry.dispose();
                }
                if (this[elementName].material) {
                    if (Array.isArray(this[elementName].material)) {
                        this[elementName].material.forEach(material => material.dispose());
                    } else {
                        this[elementName].material.dispose();
                    }
                }
                
                // Clean up group elements
                if (this[elementName].children) {
                    this[elementName].children.forEach(child => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(material => material.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    });
                }
                
                this[elementName] = null;
            }
        });
    }

    /**
     * Create the 3D mesh for the vehicle
     */
    async _createMesh() {
        // Create a basic box geometry for now - in a real implementation,
        // this would load actual 3D models for each vehicle type
        const geometry = this._getVehicleGeometry();
        const material = this._getVehicleMaterial();
        
        this.mesh = new THREE.Group();
        
        // Main body
        const bodyMesh = new THREE.Mesh(geometry, material);
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        this.mesh.add(bodyMesh);
        
        // Create wheels
        this._createWheelMeshes();
    }

    /**
     * Get geometry based on vehicle type
     */
    _getVehicleGeometry() {
        const dimensions = this._getVehicleDimensions();
        return new THREE.BoxGeometry(dimensions.width, dimensions.height, dimensions.length);
    }

    /**
     * Get material based on vehicle type
     */
    _getVehicleMaterial() {
        const color = this._getVehicleColor();
        return new THREE.MeshLambertMaterial({ color });
    }

    /**
     * Get vehicle dimensions based on type
     */
    _getVehicleDimensions() {
        const dimensionMap = {
            sedan: { width: 1.8, height: 1.4, length: 4.5 },
            suv: { width: 2.0, height: 1.8, length: 4.8 },
            truck: { width: 2.2, height: 2.0, length: 6.0 },
            sports_car: { width: 1.9, height: 1.2, length: 4.2 },
            monster_truck: { width: 2.5, height: 2.5, length: 5.0 },
            armored_car: { width: 2.1, height: 1.6, length: 5.2 },
            buggy: { width: 1.6, height: 1.8, length: 3.5 },
            motorcycle: { width: 0.8, height: 1.2, length: 2.2 },
            tank: { width: 3.0, height: 2.2, length: 7.0 },
            hovercraft: { width: 2.5, height: 1.0, length: 4.0 },
            muscle_car: { width: 1.9, height: 1.3, length: 4.8 },
            racing_car: { width: 1.8, height: 1.0, length: 4.0 }
        };
        
        return dimensionMap[this.type] || dimensionMap.sedan;
    }

    /**
     * Get vehicle color based on type
     */
    _getVehicleColor() {
        const colorMap = {
            sedan: 0x3366cc,
            suv: 0x228b22,
            truck: 0x8b4513,
            sports_car: 0xff4500,
            monster_truck: 0x800080,
            armored_car: 0x696969,
            buggy: 0xffd700,
            motorcycle: 0x000000,
            tank: 0x556b2f,
            hovercraft: 0x00ced1,
            muscle_car: 0xdc143c,
            racing_car: 0xff1493
        };
        
        return colorMap[this.type] || colorMap.sedan;
    }

    /**
     * Create wheel meshes
     */
    _createWheelMeshes() {
        const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        
        const wheelPositions = this._getWheelPositions();
        
        wheelPositions.forEach((pos, index) => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.copy(pos);
            wheel.castShadow = true;
            this.wheels.push(wheel);
            this.mesh.add(wheel);
        });
    }

    /**
     * Get wheel positions based on vehicle dimensions
     */
    _getWheelPositions() {
        const dimensions = this._getVehicleDimensions();
        const wheelbase = dimensions.length * 0.6;
        const track = dimensions.width * 0.8;
        
        return [
            new THREE.Vector3(-track/2, -dimensions.height/2, wheelbase/2),   // Front left
            new THREE.Vector3(track/2, -dimensions.height/2, wheelbase/2),    // Front right
            new THREE.Vector3(-track/2, -dimensions.height/2, -wheelbase/2),  // Rear left
            new THREE.Vector3(track/2, -dimensions.height/2, -wheelbase/2)    // Rear right
        ];
    }

    /**
     * Create physics body for the vehicle
     */
    _createPhysicsBody() {
        const dimensions = this._getVehicleDimensions();
        const shape = new CANNON.Box(new CANNON.Vec3(
            dimensions.width / 2,
            dimensions.height / 2,
            dimensions.length / 2
        ));
        
        this.body = new CANNON.Body({
            mass: this.stats.mass || 1000,
            shape: shape,
            position: new CANNON.Vec3(0, 2, 0),
            material: new CANNON.Material({ friction: 0.4, restitution: 0.3 })
        });
        
        // Set linear and angular damping for realistic movement
        this.body.linearDamping = 0.1;
        this.body.angularDamping = 0.1;
    }

    /**
     * Setup wheel physics
     */
    _setupWheels() {
        const wheelPositions = this._getWheelPositions();
        const wheelShape = new CANNON.Cylinder(0.4, 0.4, 0.3, 8);
        
        wheelPositions.forEach((pos, index) => {
            const wheelBody = new CANNON.Body({
                mass: 50,
                shape: wheelShape,
                material: new CANNON.Material({ friction: 0.8, restitution: 0.1 })
            });
            
            wheelBody.position.set(
                this.body.position.x + pos.x,
                this.body.position.y + pos.y,
                this.body.position.z + pos.z
            );
            
            this.wheelBodies.push(wheelBody);
            this.gameEngine.physics.add(wheelBody);
            
            // Create constraint between body and wheel
            const constraint = new CANNON.PointToPointConstraint(
                this.body,
                new CANNON.Vec3(pos.x, pos.y, pos.z),
                wheelBody,
                new CANNON.Vec3(0, 0, 0)
            );
            
            this.constraints.push(constraint);
            this.gameEngine.physics.addConstraint(constraint);
        });
    }

    /**
     * Update physics based on controls
     */
    _updatePhysics(deltaTime) {
        if (!this.body || this.fuel <= 0) return;
        
        const force = new CANNON.Vec3();
        const torque = new CANNON.Vec3();
        
        // Use current stats (affected by damage) or base stats
        const currentStats = this.currentStats || this.stats;
        
        // Calculate engine force
        const enginePower = currentStats.speed * (1 + this.upgrades.engine * 0.1);
        const acceleration = currentStats.acceleration * (1 + this.upgrades.engine * 0.15);
        
        // Forward/backward movement
        if (this.controls.forward > 0) {
            force.z = -enginePower * acceleration * this.controls.forward;
        }
        if (this.controls.backward > 0) {
            force.z = enginePower * acceleration * 0.5 * this.controls.backward; // Reverse is slower
        }
        
        // Steering
        const steeringForce = currentStats.handling * (1 + this.upgrades.tires * 0.1);
        if (this.controls.left > 0) {
            torque.y = steeringForce * this.controls.left;
        }
        if (this.controls.right > 0) {
            torque.y = -steeringForce * this.controls.right;
        }
        
        // Apply braking
        if (this.controls.brake > 0) {
            const brakingForce = this.body.velocity.clone();
            const brakingPower = currentStats.braking || currentStats.speed * 0.8;
            brakingForce.scale(-brakingPower * this.controls.brake);
            force.vadd(brakingForce, force);
        }
        
        // Apply forces in local space
        this.body.vectorToWorldFrame(force, force);
        this.body.applyForce(force, this.body.position);
        this.body.applyTorque(torque);
    }

    /**
     * Update mesh position and rotation from physics body
     */
    _updateMesh() {
        if (!this.mesh || !this.body) return;
        
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);
        
        // Update wheel rotations
        this.wheelBodies.forEach((wheelBody, index) => {
            if (this.wheels[index]) {
                this.wheels[index].position.copy(wheelBody.position);
                this.wheels[index].quaternion.copy(wheelBody.quaternion);
            }
        });
    }

    /**
     * Update fuel consumption
     */
    _updateFuel(deltaTime) {
        if (this.controls.forward > 0 || this.controls.backward > 0) {
            const consumption = this.stats.fuelConsumption || 10; // Units per second
            const efficiency = 1 + this.upgrades.fuel * 0.1; // 10% better efficiency per upgrade
            this.fuel = Math.max(0, this.fuel - (consumption / efficiency) * deltaTime);
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
     * Apply upgrade effects to vehicle stats
     */
    _applyUpgrades() {
        // Reset stats to base values before applying upgrades
        this.stats = { ...this.baseStats };
        
        // Engine upgrades affect speed and acceleration
        this.stats.speed *= (1 + this.upgrades.engine * 0.1);
        this.stats.acceleration *= (1 + this.upgrades.engine * 0.15);
        
        // Armor upgrades affect damage resistance
        this.stats.armor += this.upgrades.armor * 10;
        
        // Fuel upgrades affect capacity and efficiency
        this.stats.fuelCapacity *= (1 + this.upgrades.fuel * 0.2);
        
        // Tire upgrades affect handling
        this.stats.handling *= (1 + this.upgrades.tires * 0.1);
        
        // Apply visual appearance changes
        this._applyUpgradeVisuals();
    }

    /**
     * Apply visual appearance changes based on upgrades
     */
    _applyUpgradeVisuals() {
        if (!this.mesh) return;

        // Engine upgrades - add exhaust effects and engine glow
        if (this.upgrades.engine > 0) {
            this._addEngineVisualEffects();
        }

        // Armor upgrades - add armor plating and reinforcement visuals
        if (this.upgrades.armor > 0) {
            this._addArmorVisualEffects();
        }

        // Weapon upgrades - add weapon attachments and modifications
        if (this.upgrades.weapons > 0) {
            this._addWeaponVisualEffects();
        }

        // Fuel upgrades - add fuel tank modifications
        if (this.upgrades.fuel > 0) {
            this._addFuelVisualEffects();
        }

        // Tire upgrades - modify tire appearance and add tread effects
        if (this.upgrades.tires > 0) {
            this._addTireVisualEffects();
        }
    }

    /**
     * Add visual effects for engine upgrades
     */
    _addEngineVisualEffects() {
        const engineLevel = this.upgrades.engine;
        
        // Add engine glow effect
        if (engineLevel >= 2 && !this.engineGlow) {
            const glowGeometry = new THREE.SphereGeometry(0.3, 8, 8);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0xff4500,
                transparent: true,
                opacity: 0.3 + (engineLevel * 0.1)
            });
            
            this.engineGlow = new THREE.Mesh(glowGeometry, glowMaterial);
            this.engineGlow.position.set(0, 0, -2); // Behind the vehicle
            this.mesh.add(this.engineGlow);
        }

        // Add exhaust smoke particles for higher levels
        if (engineLevel >= 3) {
            this._addExhaustParticles();
        }

        // Add turbo boost visual for max level
        if (engineLevel >= 5) {
            this._addTurboBoostEffect();
        }
    }

    /**
     * Add visual effects for armor upgrades
     */
    _addArmorVisualEffects() {
        const armorLevel = this.upgrades.armor;
        
        // Add armor plating
        if (armorLevel >= 1 && !this.armorPlating) {
            const plateGeometry = new THREE.BoxGeometry(0.1, 0.8, 3.5);
            const plateMaterial = new THREE.MeshLambertMaterial({
                color: 0x666666,
                metalness: 0.8
            });
            
            // Add side armor plates
            this.armorPlating = new THREE.Group();
            
            const leftPlate = new THREE.Mesh(plateGeometry, plateMaterial);
            leftPlate.position.set(-1.0, 0, 0);
            this.armorPlating.add(leftPlate);
            
            const rightPlate = new THREE.Mesh(plateGeometry, plateMaterial);
            rightPlate.position.set(1.0, 0, 0);
            this.armorPlating.add(rightPlate);
            
            this.mesh.add(this.armorPlating);
        }

        // Add spikes for higher armor levels
        if (armorLevel >= 3) {
            this._addArmorSpikes();
        }

        // Add reinforced bumper for max level
        if (armorLevel >= 5) {
            this._addReinforcedBumper();
        }
    }

    /**
     * Add visual effects for weapon upgrades
     */
    _addWeaponVisualEffects() {
        const weaponLevel = this.upgrades.weapons;
        
        // Add weapon mounts
        if (weaponLevel >= 1 && !this.weaponMounts) {
            this.weaponMounts = new THREE.Group();
            
            // Add gun barrels on the hood
            const barrelGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8);
            const barrelMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
            
            const leftBarrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
            leftBarrel.position.set(-0.3, 0.5, 1.5);
            leftBarrel.rotation.z = Math.PI / 2;
            this.weaponMounts.add(leftBarrel);
            
            const rightBarrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
            rightBarrel.position.set(0.3, 0.5, 1.5);
            rightBarrel.rotation.z = Math.PI / 2;
            this.weaponMounts.add(rightBarrel);
            
            this.mesh.add(this.weaponMounts);
        }

        // Add missile launchers for higher levels
        if (weaponLevel >= 3) {
            this._addMissileLaunchers();
        }

        // Add heavy cannon for max level
        if (weaponLevel >= 5) {
            this._addHeavyCannon();
        }
    }

    /**
     * Add visual effects for fuel upgrades
     */
    _addFuelVisualEffects() {
        const fuelLevel = this.upgrades.fuel;
        
        // Add external fuel tanks
        if (fuelLevel >= 2 && !this.fuelTanks) {
            const tankGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1.0, 8);
            const tankMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
            
            this.fuelTanks = new THREE.Group();
            
            const leftTank = new THREE.Mesh(tankGeometry, tankMaterial);
            leftTank.position.set(-1.2, 0, -1);
            leftTank.rotation.z = Math.PI / 2;
            this.fuelTanks.add(leftTank);
            
            const rightTank = new THREE.Mesh(tankGeometry, tankMaterial);
            rightTank.position.set(1.2, 0, -1);
            rightTank.rotation.z = Math.PI / 2;
            this.fuelTanks.add(rightTank);
            
            this.mesh.add(this.fuelTanks);
        }

        // Add fuel efficiency indicators for higher levels
        if (fuelLevel >= 4) {
            this._addFuelEfficiencyIndicators();
        }
    }

    /**
     * Add visual effects for tire upgrades
     */
    _addTireVisualEffects() {
        const tireLevel = this.upgrades.tires;
        
        // Modify existing wheels with better treads
        this.wheels.forEach((wheel, index) => {
            if (tireLevel >= 1) {
                // Add tread pattern texture
                wheel.material.color.setHex(0x222222); // Darker rubber
            }
            
            if (tireLevel >= 3) {
                // Add racing stripes
                const stripeGeometry = new THREE.RingGeometry(0.35, 0.4, 16);
                const stripeMaterial = new THREE.MeshBasicMaterial({ 
                    color: 0xff0000,
                    side: THREE.DoubleSide
                });
                
                const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
                stripe.rotation.x = Math.PI / 2;
                wheel.add(stripe);
            }
            
            if (tireLevel >= 5) {
                // Add performance rim effects
                wheel.scale.set(1.1, 1.1, 1.1); // Slightly larger wheels
            }
        });
    }

    /**
     * Add exhaust particle effects
     */
    _addExhaustParticles() {
        // Placeholder for particle system integration
        // In a full implementation, this would create particle effects
        console.log('Adding exhaust particle effects');
    }

    /**
     * Add turbo boost visual effect
     */
    _addTurboBoostEffect() {
        // Add blue flame effect behind the vehicle
        if (!this.turboFlame) {
            const flameGeometry = new THREE.ConeGeometry(0.2, 0.8, 8);
            const flameMaterial = new THREE.MeshBasicMaterial({
                color: 0x0066ff,
                transparent: true,
                opacity: 0.7
            });
            
            this.turboFlame = new THREE.Mesh(flameGeometry, flameMaterial);
            this.turboFlame.position.set(0, 0, -2.5);
            this.turboFlame.rotation.x = Math.PI;
            this.mesh.add(this.turboFlame);
        }
    }

    /**
     * Add armor spikes
     */
    _addArmorSpikes() {
        if (!this.armorSpikes) {
            this.armorSpikes = new THREE.Group();
            
            const spikeGeometry = new THREE.ConeGeometry(0.1, 0.3, 6);
            const spikeMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
            
            // Add spikes around the vehicle
            for (let i = 0; i < 8; i++) {
                const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
                const angle = (i / 8) * Math.PI * 2;
                spike.position.set(
                    Math.cos(angle) * 1.2,
                    0.2,
                    Math.sin(angle) * 1.8
                );
                spike.rotation.z = angle;
                this.armorSpikes.add(spike);
            }
            
            this.mesh.add(this.armorSpikes);
        }
    }

    /**
     * Add reinforced bumper
     */
    _addReinforcedBumper() {
        if (!this.reinforcedBumper) {
            const bumperGeometry = new THREE.BoxGeometry(2.2, 0.3, 0.4);
            const bumperMaterial = new THREE.MeshLambertMaterial({
                color: 0x555555,
                metalness: 0.9
            });
            
            this.reinforcedBumper = new THREE.Mesh(bumperGeometry, bumperMaterial);
            this.reinforcedBumper.position.set(0, -0.5, 2.5);
            this.mesh.add(this.reinforcedBumper);
        }
    }

    /**
     * Add missile launchers
     */
    _addMissileLaunchers() {
        if (!this.missileLaunchers) {
            this.missileLaunchers = new THREE.Group();
            
            const launcherGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.6);
            const launcherMaterial = new THREE.MeshLambertMaterial({ color: 0x2d2d2d });
            
            const leftLauncher = new THREE.Mesh(launcherGeometry, launcherMaterial);
            leftLauncher.position.set(-0.8, 0.8, 0);
            this.missileLaunchers.add(leftLauncher);
            
            const rightLauncher = new THREE.Mesh(launcherGeometry, launcherMaterial);
            rightLauncher.position.set(0.8, 0.8, 0);
            this.missileLaunchers.add(rightLauncher);
            
            this.mesh.add(this.missileLaunchers);
        }
    }

    /**
     * Add heavy cannon
     */
    _addHeavyCannon() {
        if (!this.heavyCannon) {
            const cannonGeometry = new THREE.CylinderGeometry(0.15, 0.15, 2.0, 12);
            const cannonMaterial = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
            
            this.heavyCannon = new THREE.Mesh(cannonGeometry, cannonMaterial);
            this.heavyCannon.position.set(0, 0.8, 1.0);
            this.heavyCannon.rotation.z = Math.PI / 2;
            this.mesh.add(this.heavyCannon);
        }
    }

    /**
     * Add fuel efficiency indicators
     */
    _addFuelEfficiencyIndicators() {
        if (!this.fuelIndicators) {
            this.fuelIndicators = new THREE.Group();
            
            // Add green efficiency lights
            const lightGeometry = new THREE.SphereGeometry(0.05, 8, 8);
            const lightMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.8
            });
            
            for (let i = 0; i < 3; i++) {
                const light = new THREE.Mesh(lightGeometry, lightMaterial);
                light.position.set(-0.5 + (i * 0.5), 0.3, -2);
                this.fuelIndicators.add(light);
            }
            
            this.mesh.add(this.fuelIndicators);
        }
    }

    /**
     * Apply visual damage effects to the vehicle
     */
    _applyVisualDamage(damage, damageType) {
        if (!this.mesh) return;
        
        // Calculate damage intensity for visual effects
        const damageIntensity = damage / 100; // Normalize damage
        
        // Apply damage-based color changes
        const healthRatio = this.health / 100;
        const damageColor = new THREE.Color().lerpColors(
            new THREE.Color(0xffffff), // White (undamaged)
            new THREE.Color(0x8b0000),  // Dark red (heavily damaged)
            1 - healthRatio
        );
        
        // Update vehicle material to show damage
        this.mesh.traverse(child => {
            if (child.material && child.material.color) {
                child.material.color.lerp(damageColor, damageIntensity * 0.1);
            }
        });
        
        // Add smoke effect for heavy damage
        if (healthRatio < 0.3) {
            this._addSmokeEffect();
        }
        
        // Add sparks for electrical damage
        if (damageType === 'electric') {
            this._addSparkEffect();
        }
    }

    /**
     * Update vehicle performance based on damage
     */
    _updatePerformanceFromDamage() {
        const healthRatio = this.health / 100;
        
        // Reduce performance as health decreases
        const performanceMultiplier = 0.5 + (healthRatio * 0.5); // 50% to 100% performance
        
        // Apply performance reduction to stats (temporary)
        this.currentStats = {
            speed: this.stats.speed * performanceMultiplier,
            acceleration: this.stats.acceleration * performanceMultiplier,
            handling: this.stats.handling * performanceMultiplier,
            braking: (this.stats.braking || this.stats.speed * 0.8) * performanceMultiplier
        };
    }

    /**
     * Add smoke effect for damaged vehicle
     */
    _addSmokeEffect() {
        // Placeholder for smoke particle effect
        console.log(`Adding smoke effect to damaged vehicle ${this.type}`);
    }

    /**
     * Add spark effect for electrical damage
     */
    _addSparkEffect() {
        // Placeholder for spark particle effect
        console.log(`Adding spark effect to vehicle ${this.type}`);
    }

    /**
     * Destroy the vehicle
     */
    _destroy() {
        this.isDestroyed = true;
        this.health = 0;
        
        // Add destruction effects here (particles, sound, etc.)
        console.log(`Vehicle ${this.type} destroyed`);
        
        // Create explosion effect if combat system is available
        if (this.gameEngine.combatSystem) {
            this.gameEngine.combatSystem.createExplosion(
                this.getPosition(),
                3.0, // radius
                50,  // damage
                this
            );
        }
    }

    /**
     * Generate unique ID for the vehicle
     */
    _generateId() {
        return 'vehicle_' + Math.random().toString(36).substr(2, 9);
    }
}