/**
 * Vehicle Renderer for Zombie Car Game
 * Handles rendering of vehicles with weathered appearance and post-apocalyptic modifications
 */

export class VehicleRenderer {
    constructor() {
        this.particleEffects = [];
        this.damageTextures = new Map();
        this.upgradeVisuals = new Map();
    }
    
    /**
     * Render a vehicle instance to canvas context
     */
    renderVehicle(ctx, vehicleInstance, camera) {
        if (!vehicleInstance || vehicleInstance.isDestroyed()) return;
        
        const appearance = vehicleInstance.getVisualAppearance();
        const position = vehicleInstance.position;
        const rotation = vehicleInstance.rotation;
        
        ctx.save();
        
        // Transform to vehicle position and rotation
        ctx.translate(position.x, position.y);
        ctx.rotate(rotation);
        
        // Render vehicle body with weathering
        this.renderVehicleBody(ctx, vehicleInstance, appearance);
        
        // Render upgrades and modifications
        this.renderUpgrades(ctx, vehicleInstance, appearance);
        
        // Render damage effects
        this.renderDamageEffects(ctx, vehicleInstance, appearance);
        
        // Render weathering and rust
        this.renderWeathering(ctx, vehicleInstance, appearance);
        
        ctx.restore();
        
        // Render particle effects (not affected by vehicle transform)
        this.renderParticleEffects(ctx, vehicleInstance, appearance);
    }
    
    /**
     * Render the main vehicle body
     */
    renderVehicleBody(ctx, vehicleInstance, appearance) {
        const config = vehicleInstance.config;
        const colors = appearance.colors;
        
        // Get vehicle dimensions based on type
        const dimensions = this.getVehicleDimensions(vehicleInstance.type);
        
        // Create gradient for metallic appearance
        const gradient = ctx.createLinearGradient(
            -dimensions.width / 2, -dimensions.height / 2,
            dimensions.width / 2, dimensions.height / 2
        );
        gradient.addColorStop(0, colors.primary);
        gradient.addColorStop(0.5, this.lightenColor(colors.primary, 0.2));
        gradient.addColorStop(1, colors.secondary);
        
        // Render main body
        ctx.fillStyle = gradient;
        ctx.strokeStyle = this.darkenColor(colors.primary, 0.3);
        ctx.lineWidth = 2;
        
        ctx.fillRect(-dimensions.width / 2, -dimensions.height / 2, dimensions.width, dimensions.height);
        ctx.strokeRect(-dimensions.width / 2, -dimensions.height / 2, dimensions.width, dimensions.height);
        
        // Render vehicle-specific details
        this.renderVehicleDetails(ctx, vehicleInstance.type, dimensions, colors);
    }
    
    /**
     * Render vehicle-specific details
     */
    renderVehicleDetails(ctx, vehicleType, dimensions, colors) {
        switch (vehicleType) {
            case 'STARTER_CAR':
                this.renderSedanDetails(ctx, dimensions, colors);
                break;
            case 'OLD_TRUCK':
                this.renderTruckDetails(ctx, dimensions, colors);
                break;
            case 'SPORTS_CAR':
                this.renderSportsCarDetails(ctx, dimensions, colors);
                break;
            case 'MONSTER_TRUCK':
                this.renderMonsterTruckDetails(ctx, dimensions, colors);
                break;
            case 'ARMORED_VAN':
                this.renderArmoredVanDetails(ctx, dimensions, colors);
                break;
        }
    }
    
    /**
     * Render sedan-specific details
     */
    renderSedanDetails(ctx, dimensions, colors) {
        // Windshield
        ctx.fillStyle = 'rgba(135, 206, 235, 0.6)'; // Light blue with transparency
        ctx.fillRect(-dimensions.width / 2 + 8, -dimensions.height / 2 + 4, dimensions.width - 16, 12);
        
        // Headlights
        ctx.fillStyle = '#ffff99';
        ctx.beginPath();
        ctx.arc(dimensions.width / 2 - 4, -6, 3, 0, Math.PI * 2);
        ctx.arc(dimensions.width / 2 - 4, 6, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Grille
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            const y = -8 + (i * 4);
            ctx.beginPath();
            ctx.moveTo(dimensions.width / 2 - 8, y);
            ctx.lineTo(dimensions.width / 2 - 2, y);
            ctx.stroke();
        }
        
        // Door handles
        ctx.fillStyle = colors.secondary;
        ctx.fillRect(-dimensions.width / 4, -dimensions.height / 2 - 1, 3, 2);
        ctx.fillRect(dimensions.width / 4, -dimensions.height / 2 - 1, 3, 2);
    }
    
    /**
     * Render truck-specific details
     */
    renderTruckDetails(ctx, dimensions, colors) {
        // Truck bed
        ctx.fillStyle = this.darkenColor(colors.primary, 0.2);
        ctx.fillRect(-dimensions.width / 2 + 5, -dimensions.height / 2 - 8, dimensions.width - 10, 8);
        ctx.strokeRect(-dimensions.width / 2 + 5, -dimensions.height / 2 - 8, dimensions.width - 10, 8);
        
        // Cab
        ctx.fillStyle = colors.primary;
        ctx.fillRect(-dimensions.width / 2, dimensions.height / 4, dimensions.width, dimensions.height / 4);
        
        // Large headlights
        ctx.fillStyle = '#ffff99';
        ctx.beginPath();
        ctx.arc(dimensions.width / 2 - 3, -8, 4, 0, Math.PI * 2);
        ctx.arc(dimensions.width / 2 - 3, 8, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Exhaust pipe
        ctx.fillStyle = '#444444';
        ctx.fillRect(-dimensions.width / 2 - 6, dimensions.height / 2 - 3, 8, 3);
    }
    
    /**
     * Render sports car-specific details
     */
    renderSportsCarDetails(ctx, dimensions, colors) {
        // Sleek windshield
        ctx.fillStyle = 'rgba(135, 206, 235, 0.8)';
        ctx.beginPath();
        ctx.moveTo(-dimensions.width / 2 + 10, -dimensions.height / 2 + 2);
        ctx.lineTo(dimensions.width / 2 - 10, -dimensions.height / 2 + 2);
        ctx.lineTo(dimensions.width / 2 - 15, dimensions.height / 2 - 2);
        ctx.lineTo(-dimensions.width / 2 + 15, dimensions.height / 2 - 2);
        ctx.closePath();
        ctx.fill();
        
        // Racing stripes
        ctx.fillStyle = colors.secondary;
        ctx.fillRect(-3, -dimensions.height / 2, 6, dimensions.height);
        
        // Spoiler
        ctx.fillStyle = colors.primary;
        ctx.fillRect(-dimensions.width / 3, -dimensions.height / 2 - 4, dimensions.width / 1.5, 2);
        
        // Performance headlights
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(dimensions.width / 2 - 2, -5, 2, 0, Math.PI * 2);
        ctx.arc(dimensions.width / 2 - 2, 5, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    /**
     * Render monster truck-specific details
     */
    renderMonsterTruckDetails(ctx, dimensions, colors) {
        // Lift kit (extended body)
        ctx.fillStyle = this.darkenColor(colors.primary, 0.1);
        ctx.fillRect(-dimensions.width / 2, dimensions.height / 2, dimensions.width, 8);
        
        // Roll cage
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, dimensions.width / 3, 0, Math.PI, true);
        ctx.stroke();
        
        // Large exhaust stacks
        ctx.fillStyle = '#333333';
        ctx.fillRect(-dimensions.width / 4, -dimensions.height / 2 - 12, 4, 12);
        ctx.fillRect(dimensions.width / 4, -dimensions.height / 2 - 12, 4, 12);
        
        // Massive headlights
        ctx.fillStyle = '#ffff99';
        ctx.beginPath();
        ctx.arc(dimensions.width / 2 - 2, -10, 5, 0, Math.PI * 2);
        ctx.arc(dimensions.width / 2 - 2, 0, 5, 0, Math.PI * 2);
        ctx.arc(dimensions.width / 2 - 2, 10, 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    /**
     * Render armored van-specific details
     */
    renderArmoredVanDetails(ctx, dimensions, colors) {
        // Reinforced windows
        ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
        ctx.fillRect(-dimensions.width / 2 + 6, -dimensions.height / 2 + 3, dimensions.width - 12, 8);
        
        // Window bars
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            const x = -dimensions.width / 2 + 10 + (i * 8);
            ctx.beginPath();
            ctx.moveTo(x, -dimensions.height / 2 + 3);
            ctx.lineTo(x, -dimensions.height / 2 + 11);
            ctx.stroke();
        }
        
        // Armored panels
        ctx.fillStyle = this.darkenColor(colors.primary, 0.2);
        ctx.fillRect(-dimensions.width / 2 - 2, -dimensions.height / 2, 2, dimensions.height);
        ctx.fillRect(dimensions.width / 2, -dimensions.height / 2, 2, dimensions.height);
        
        // Heavy-duty bumper
        ctx.fillStyle = '#555555';
        ctx.fillRect(dimensions.width / 2, -dimensions.height / 2 + 5, 6, dimensions.height - 10);
    }
    
    /**
     * Render vehicle upgrades and modifications
     */
    renderUpgrades(ctx, vehicleInstance, appearance) {
        const modifications = appearance.modifications;
        const dimensions = this.getVehicleDimensions(vehicleInstance.type);
        
        modifications.forEach(mod => {
            switch (mod.type) {
                case 'exhaust':
                    this.renderExhaustUpgrade(ctx, mod.level, dimensions);
                    break;
                case 'armor_plating':
                    this.renderArmorUpgrade(ctx, mod.level, dimensions);
                    break;
                case 'weapons':
                    this.renderWeaponUpgrade(ctx, mod.level, dimensions);
                    break;
                case 'fuel_tanks':
                    this.renderFuelTankUpgrade(ctx, mod.level, dimensions);
                    break;
                case 'wheels':
                    this.renderWheelUpgrade(ctx, mod.level, dimensions);
                    break;
            }
        });
    }
    
    /**
     * Render exhaust upgrade
     */
    renderExhaustUpgrade(ctx, level, dimensions) {
        const exhaustCount = Math.min(level, 3);
        
        for (let i = 0; i < exhaustCount; i++) {
            const y = -8 + (i * 8);
            const length = 8 + (level * 2);
            
            // Exhaust pipe
            ctx.fillStyle = '#333333';
            ctx.fillRect(-dimensions.width / 2 - length, y - 1, length, 2);
            
            // Exhaust tip
            ctx.fillStyle = '#666666';
            ctx.beginPath();
            ctx.arc(-dimensions.width / 2 - length, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    /**
     * Render armor upgrade
     */
    renderArmorUpgrade(ctx, level, dimensions) {
        const plateThickness = 2 + level;
        
        // Side armor plates
        ctx.fillStyle = '#555555';
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        
        // Left plate
        ctx.fillRect(-dimensions.width / 2 - plateThickness, -dimensions.height / 2, plateThickness, dimensions.height);
        ctx.strokeRect(-dimensions.width / 2 - plateThickness, -dimensions.height / 2, plateThickness, dimensions.height);
        
        // Right plate
        ctx.fillRect(dimensions.width / 2, -dimensions.height / 2, plateThickness, dimensions.height);
        ctx.strokeRect(dimensions.width / 2, -dimensions.height / 2, plateThickness, dimensions.height);
        
        // Front bumper for higher levels
        if (level >= 3) {
            ctx.fillRect(dimensions.width / 2, -dimensions.height / 2 + 5, 8, dimensions.height - 10);
            ctx.strokeRect(dimensions.width / 2, -dimensions.height / 2 + 5, 8, dimensions.height - 10);
        }
        
        // Spikes for maximum level
        if (level >= 5) {
            this.renderArmorSpikes(ctx, dimensions);
        }
    }
    
    /**
     * Render armor spikes
     */
    renderArmorSpikes(ctx, dimensions) {
        ctx.fillStyle = '#444444';
        
        const spikeCount = 8;
        for (let i = 0; i < spikeCount; i++) {
            const angle = (i / spikeCount) * Math.PI * 2;
            const x = Math.cos(angle) * (dimensions.width / 2 + 5);
            const y = Math.sin(angle) * (dimensions.height / 2 + 5);
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            
            // Draw spike
            ctx.beginPath();
            ctx.moveTo(0, -2);
            ctx.lineTo(8, 0);
            ctx.lineTo(0, 2);
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        }
    }
    
    /**
     * Render weapon upgrade
     */
    renderWeaponUpgrade(ctx, level, dimensions) {
        // Roof-mounted gun
        const gunLength = 15 + (level * 3);
        const gunWidth = 2 + (level * 0.5);
        
        ctx.fillStyle = '#333333';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        
        // Gun mount
        ctx.fillRect(-gunWidth / 2, -dimensions.height / 2 - 5, gunWidth, -gunLength);
        ctx.strokeRect(-gunWidth / 2, -dimensions.height / 2 - 5, gunWidth, -gunLength);
        
        // Gun barrel
        ctx.fillStyle = '#222222';
        ctx.fillRect(-1, -dimensions.height / 2 - 5 - gunLength, 2, -5);
        
        // Additional weapons for higher levels
        if (level >= 3) {
            // Side-mounted weapons
            ctx.fillStyle = '#444444';
            ctx.fillRect(-dimensions.width / 2 - 3, -5, 8, 2);
            ctx.fillRect(dimensions.width / 2 - 5, -5, 8, 2);
        }
        
        if (level >= 5) {
            // Heavy cannon
            ctx.fillStyle = '#222222';
            ctx.fillRect(-3, -dimensions.height / 2 - 8, 6, -12);
        }
    }
    
    /**
     * Render fuel tank upgrade
     */
    renderFuelTankUpgrade(ctx, level, dimensions) {
        const tankWidth = 6 + level;
        const tankHeight = 12 + (level * 2);
        
        ctx.fillStyle = '#8b4513';
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 1;
        
        // Left tank
        ctx.fillRect(-dimensions.width / 2 - tankWidth - 2, -tankHeight / 2, tankWidth, tankHeight);
        ctx.strokeRect(-dimensions.width / 2 - tankWidth - 2, -tankHeight / 2, tankWidth, tankHeight);
        
        // Right tank
        ctx.fillRect(dimensions.width / 2 + 2, -tankHeight / 2, tankWidth, tankHeight);
        ctx.strokeRect(dimensions.width / 2 + 2, -tankHeight / 2, tankWidth, tankHeight);
        
        // Fuel lines
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-dimensions.width / 2 - 2, 0);
        ctx.lineTo(-dimensions.width / 2, 0);
        ctx.moveTo(dimensions.width / 2, 0);
        ctx.lineTo(dimensions.width / 2 + 2, 0);
        ctx.stroke();
    }
    
    /**
     * Render wheel upgrade (visual only, actual wheels rendered separately)
     */
    renderWheelUpgrade(ctx, level, dimensions) {
        // Render wheel well modifications
        if (level >= 3) {
            ctx.fillStyle = '#444444';
            
            // Wheel well armor
            const wheelPositions = [
                { x: -dimensions.width / 3, y: dimensions.height / 2 + 2 },
                { x: dimensions.width / 3, y: dimensions.height / 2 + 2 }
            ];
            
            wheelPositions.forEach(pos => {
                ctx.fillRect(pos.x - 8, pos.y, 16, 3);
            });
        }
    }
    
    /**
     * Render damage effects
     */
    renderDamageEffects(ctx, vehicleInstance, appearance) {
        const healthRatio = vehicleInstance.getHealthPercentage();
        const dimensions = this.getVehicleDimensions(vehicleInstance.type);
        
        if (healthRatio < 0.7) {
            // Render damage cracks
            ctx.strokeStyle = '#8b0000';
            ctx.lineWidth = 1;
            
            const numCracks = Math.floor((1 - healthRatio) * 8);
            for (let i = 0; i < numCracks; i++) {
                const startX = (Math.random() - 0.5) * dimensions.width;
                const startY = (Math.random() - 0.5) * dimensions.height;
                const endX = startX + (Math.random() - 0.5) * 15;
                const endY = startY + (Math.random() - 0.5) * 15;
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }
        
        if (healthRatio < 0.5) {
            // Render dents
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            
            const numDents = Math.floor((1 - healthRatio) * 5);
            for (let i = 0; i < numDents; i++) {
                const x = (Math.random() - 0.5) * dimensions.width;
                const y = (Math.random() - 0.5) * dimensions.height;
                const size = 3 + Math.random() * 5;
                
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        if (healthRatio < 0.3) {
            // Render missing parts
            ctx.fillStyle = '#333333';
            
            const numHoles = Math.floor((1 - healthRatio) * 3);
            for (let i = 0; i < numHoles; i++) {
                const x = (Math.random() - 0.5) * dimensions.width * 0.8;
                const y = (Math.random() - 0.5) * dimensions.height * 0.8;
                const width = 4 + Math.random() * 6;
                const height = 3 + Math.random() * 4;
                
                ctx.fillRect(x - width / 2, y - height / 2, width, height);
            }
        }
    }
    
    /**
     * Render weathering and rust effects
     */
    renderWeathering(ctx, vehicleInstance, appearance) {
        const weatheringLevel = appearance.weatheringLevel;
        const rustLevel = appearance.rustLevel;
        const dimensions = this.getVehicleDimensions(vehicleInstance.type);
        
        // Rust spots
        if (rustLevel > 0.3) {
            ctx.fillStyle = `rgba(139, 69, 19, ${rustLevel * 0.6})`;
            
            const numRustSpots = Math.floor(rustLevel * 12);
            for (let i = 0; i < numRustSpots; i++) {
                const x = (Math.random() - 0.5) * dimensions.width;
                const y = (Math.random() - 0.5) * dimensions.height;
                const size = 2 + Math.random() * 4;
                
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Dirt and grime
        if (weatheringLevel > 0.2) {
            ctx.fillStyle = `rgba(101, 67, 33, ${weatheringLevel * 0.4})`;
            
            const numDirtSpots = Math.floor(weatheringLevel * 15);
            for (let i = 0; i < numDirtSpots; i++) {
                const x = (Math.random() - 0.5) * dimensions.width;
                const y = (Math.random() - 0.5) * dimensions.height;
                const width = 3 + Math.random() * 8;
                const height = 2 + Math.random() * 4;
                
                ctx.fillRect(x - width / 2, y - height / 2, width, height);
            }
        }
        
        // Scratches
        if (weatheringLevel > 0.4) {
            ctx.strokeStyle = `rgba(80, 80, 80, ${weatheringLevel * 0.5})`;
            ctx.lineWidth = 1;
            
            const numScratches = Math.floor(weatheringLevel * 8);
            for (let i = 0; i < numScratches; i++) {
                const startX = (Math.random() - 0.5) * dimensions.width;
                const startY = (Math.random() - 0.5) * dimensions.height;
                const length = 5 + Math.random() * 15;
                const angle = Math.random() * Math.PI * 2;
                const endX = startX + Math.cos(angle) * length;
                const endY = startY + Math.sin(angle) * length;
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }
    }
    
    /**
     * Render particle effects
     */
    renderParticleEffects(ctx, vehicleInstance, appearance) {
        const healthRatio = vehicleInstance.getHealthPercentage();
        const position = vehicleInstance.position;
        
        // Smoke from damage
        if (healthRatio < 0.3) {
            const smokeOpacity = (1 - healthRatio) * 0.5;
            ctx.fillStyle = `rgba(50, 50, 50, ${smokeOpacity})`;
            
            for (let i = 0; i < 3; i++) {
                const x = position.x + (Math.random() - 0.5) * 20;
                const y = position.y - 15 - (i * 8);
                const size = 4 + (i * 2);
                
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Engine exhaust (if engine upgrades and throttling)
        const modifications = appearance.modifications;
        const hasEngineUpgrades = modifications.some(mod => mod.type === 'exhaust');
        
        if (hasEngineUpgrades && vehicleInstance.controls && Math.abs(vehicleInstance.controls.throttle) > 0.1) {
            const exhaustIntensity = Math.abs(vehicleInstance.controls.throttle);
            ctx.fillStyle = `rgba(100, 100, 100, ${0.3 * exhaustIntensity})`;
            
            for (let i = 0; i < 3; i++) {
                const x = position.x - 25 - (i * 5);
                const y = position.y + (Math.random() - 0.5) * 10;
                const size = 3 + (i * 2);
                
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    /**
     * Get vehicle dimensions based on type
     */
    getVehicleDimensions(vehicleType) {
        const dimensionMap = {
            'STARTER_CAR': { width: 60, height: 30 },
            'OLD_TRUCK': { width: 70, height: 35 },
            'SPORTS_CAR': { width: 65, height: 25 },
            'MONSTER_TRUCK': { width: 80, height: 45 },
            'ARMORED_VAN': { width: 75, height: 40 }
        };
        
        return dimensionMap[vehicleType] || dimensionMap['STARTER_CAR'];
    }
    
    /**
     * Lighten a color by a factor
     */
    lightenColor(color, factor) {
        // Simple color lightening - in a real implementation, this would be more sophisticated
        if (color.startsWith('#')) {
            const r = parseInt(color.substr(1, 2), 16);
            const g = parseInt(color.substr(3, 2), 16);
            const b = parseInt(color.substr(5, 2), 16);
            
            const newR = Math.min(255, Math.floor(r + (255 - r) * factor));
            const newG = Math.min(255, Math.floor(g + (255 - g) * factor));
            const newB = Math.min(255, Math.floor(b + (255 - b) * factor));
            
            return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
        }
        return color;
    }
    
    /**
     * Darken a color by a factor
     */
    darkenColor(color, factor) {
        // Simple color darkening
        if (color.startsWith('#')) {
            const r = parseInt(color.substr(1, 2), 16);
            const g = parseInt(color.substr(3, 2), 16);
            const b = parseInt(color.substr(5, 2), 16);
            
            const newR = Math.floor(r * (1 - factor));
            const newG = Math.floor(g * (1 - factor));
            const newB = Math.floor(b * (1 - factor));
            
            return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
        }
        return color;
    }
    
    /**
     * Dispose of renderer resources
     */
    dispose() {
        this.particleEffects = [];
        this.damageTextures.clear();
        this.upgradeVisuals.clear();
    }
}