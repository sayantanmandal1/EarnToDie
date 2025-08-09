/**
 * Vehicle Visual Enhancement System
 * Handles visual representation of upgrades on vehicles
 */

export class VehicleVisualEnhancer {
    constructor() {
        this.enhancementCache = new Map();
        this.spriteCache = new Map();
    }
    
    /**
     * Apply visual enhancements to a vehicle based on its upgrades
     */
    applyEnhancements(ctx, vehicle, upgrades, position, rotation) {
        ctx.save();
        
        // Transform to vehicle position and rotation
        ctx.translate(position.x, position.y);
        ctx.rotate(rotation);
        
        // Apply enhancements in order (back to front)
        this.renderFuelTankEnhancements(ctx, vehicle, upgrades.fuel);
        this.renderArmorEnhancements(ctx, vehicle, upgrades.armor);
        this.renderEngineEnhancements(ctx, vehicle, upgrades.engine);
        this.renderWheelEnhancements(ctx, vehicle, upgrades.wheels);
        this.renderWeaponEnhancements(ctx, vehicle, upgrades.weapon);
        
        ctx.restore();
    }
    
    /**
     * Render engine upgrade enhancements
     */
    renderEngineEnhancements(ctx, vehicle, engineLevel) {
        if (engineLevel <= 0) return;
        
        const vehicleWidth = vehicle.width || 80;
        const vehicleHeight = vehicle.height || 40;
        
        // Enhanced exhaust system
        this.renderExhaustSystem(ctx, vehicleWidth, vehicleHeight, engineLevel);
        
        // Turbo charger (level 3+)
        if (engineLevel >= 3) {
            this.renderTurboCharger(ctx, vehicleWidth, vehicleHeight, engineLevel - 2);
        }
        
        // Engine modifications (level 4+)
        if (engineLevel >= 4) {
            this.renderEngineModifications(ctx, vehicleWidth, vehicleHeight, engineLevel - 3);
        }
    }
    
    /**
     * Render exhaust system enhancements
     */
    renderExhaustSystem(ctx, vehicleWidth, vehicleHeight, level) {
        ctx.fillStyle = '#444444';
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1;
        
        // Main exhaust pipe
        const pipeWidth = 3 + level;
        const pipeLength = 8 + (level * 2);
        
        ctx.fillRect(-vehicleWidth / 2 - pipeLength, vehicleHeight / 2 - 8, pipeLength, pipeWidth);
        ctx.strokeRect(-vehicleWidth / 2 - pipeLength, vehicleHeight / 2 - 8, pipeLength, pipeWidth);
        
        // Dual exhaust for higher levels
        if (level >= 3) {
            ctx.fillRect(-vehicleWidth / 2 - pipeLength, -vehicleHeight / 2 + 5, pipeLength, pipeWidth);
            ctx.strokeRect(-vehicleWidth / 2 - pipeLength, -vehicleHeight / 2 + 5, pipeLength, pipeWidth);
        }
        
        // Performance exhaust tips
        if (level >= 4) {
            ctx.fillStyle = '#666666';
            const tipRadius = 2 + level * 0.5;
            
            ctx.beginPath();
            ctx.arc(-vehicleWidth / 2 - pipeLength - 2, vehicleHeight / 2 - 8 + pipeWidth / 2, tipRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            if (level >= 3) {
                ctx.beginPath();
                ctx.arc(-vehicleWidth / 2 - pipeLength - 2, -vehicleHeight / 2 + 5 + pipeWidth / 2, tipRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        }
    }
    
    /**
     * Render turbo charger
     */
    renderTurboCharger(ctx, vehicleWidth, vehicleHeight, level) {
        ctx.fillStyle = '#555555';
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        
        const turboSize = 6 + (level * 2);
        const turboX = -vehicleWidth / 4;
        const turboY = -vehicleHeight / 2 - turboSize - 2;
        
        // Turbo housing
        ctx.fillRect(turboX - turboSize / 2, turboY, turboSize, turboSize);
        ctx.strokeRect(turboX - turboSize / 2, turboY, turboSize, turboSize);
        
        // Intake pipe
        ctx.fillStyle = '#666666';
        ctx.fillRect(turboX - 2, turboY + turboSize, 4, 8);
        ctx.strokeRect(turboX - 2, turboY + turboSize, 4, 8);
        
        // Intercooler (level 2+)
        if (level >= 2) {
            ctx.fillStyle = '#777777';
            const intercoolerWidth = turboSize + 4;
            const intercoolerHeight = 3;
            
            ctx.fillRect(turboX - intercoolerWidth / 2, turboY - intercoolerHeight - 2, intercoolerWidth, intercoolerHeight);
            ctx.strokeRect(turboX - intercoolerWidth / 2, turboY - intercoolerHeight - 2, intercoolerWidth, intercoolerHeight);
        }
    }
    
    /**
     * Render engine modifications
     */
    renderEngineModifications(ctx, vehicleWidth, vehicleHeight, level) {
        // Hood scoop
        ctx.fillStyle = '#333333';
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1;
        
        const scoopWidth = 12 + (level * 2);
        const scoopHeight = 4 + level;
        const scoopX = vehicleWidth / 4;
        const scoopY = -vehicleHeight / 2 - scoopHeight;
        
        ctx.fillRect(scoopX - scoopWidth / 2, scoopY, scoopWidth, scoopHeight);
        ctx.strokeRect(scoopX - scoopWidth / 2, scoopY, scoopWidth, scoopHeight);
        
        // Air intake grilles
        ctx.strokeStyle = '#111111';
        for (let i = 0; i < 3; i++) {
            const grillY = scoopY + 1 + i;
            ctx.beginPath();
            ctx.moveTo(scoopX - scoopWidth / 2 + 2, grillY);
            ctx.lineTo(scoopX + scoopWidth / 2 - 2, grillY);
            ctx.stroke();
        }
    }
    
    /**
     * Render fuel tank upgrade enhancements
     */
    renderFuelTankEnhancements(ctx, vehicle, fuelLevel) {
        if (fuelLevel <= 2) return; // Only show external tanks at level 3+
        
        const vehicleWidth = vehicle.width || 80;
        const vehicleHeight = vehicle.height || 40;
        
        ctx.fillStyle = '#8b4513';
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 1;
        
        const tankWidth = 6 + (fuelLevel - 2) * 2;
        const tankHeight = 12 + (fuelLevel - 2) * 3;
        
        // Left external fuel tank
        const leftTankX = -vehicleWidth / 2 - tankWidth - 2;
        const leftTankY = -tankHeight / 2;
        
        ctx.fillRect(leftTankX, leftTankY, tankWidth, tankHeight);
        ctx.strokeRect(leftTankX, leftTankY, tankWidth, tankHeight);
        
        // Right external fuel tank
        const rightTankX = vehicleWidth / 2 + 2;
        const rightTankY = -tankHeight / 2;
        
        ctx.fillRect(rightTankX, rightTankY, tankWidth, tankHeight);
        ctx.strokeRect(rightTankX, rightTankY, tankWidth, tankHeight);
        
        // Fuel lines
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        
        // Left fuel line
        ctx.beginPath();
        ctx.moveTo(leftTankX + tankWidth, leftTankY + tankHeight / 2);
        ctx.lineTo(-vehicleWidth / 2, leftTankY + tankHeight / 2);
        ctx.stroke();
        
        // Right fuel line
        ctx.beginPath();
        ctx.moveTo(rightTankX, rightTankY + tankHeight / 2);
        ctx.lineTo(vehicleWidth / 2, rightTankY + tankHeight / 2);
        ctx.stroke();
        
        // Fuel caps
        if (fuelLevel >= 4) {
            ctx.fillStyle = '#444444';
            ctx.beginPath();
            ctx.arc(leftTankX + tankWidth / 2, leftTankY - 2, 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(rightTankX + tankWidth / 2, rightTankY - 2, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    /**
     * Render armor upgrade enhancements
     */
    renderArmorEnhancements(ctx, vehicle, armorLevel) {
        if (armorLevel <= 0) return;
        
        const vehicleWidth = vehicle.width || 80;
        const vehicleHeight = vehicle.height || 40;
        
        ctx.fillStyle = '#555555';
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        
        const plateThickness = 1 + armorLevel;
        
        // Side armor plates
        ctx.fillRect(-vehicleWidth / 2 - plateThickness, -vehicleHeight / 2, plateThickness, vehicleHeight);
        ctx.strokeRect(-vehicleWidth / 2 - plateThickness, -vehicleHeight / 2, plateThickness, vehicleHeight);
        
        ctx.fillRect(vehicleWidth / 2, -vehicleHeight / 2, plateThickness, vehicleHeight);
        ctx.strokeRect(vehicleWidth / 2, -vehicleHeight / 2, plateThickness, vehicleHeight);
        
        // Reinforced bumper (level 2+)
        if (armorLevel >= 2) {
            const bumperWidth = 6 + armorLevel;
            const bumperHeight = vehicleHeight - 10;
            
            ctx.fillRect(vehicleWidth / 2, -bumperHeight / 2, bumperWidth, bumperHeight);
            ctx.strokeRect(vehicleWidth / 2, -bumperHeight / 2, bumperWidth, bumperHeight);
            
            // Bumper spikes (level 3+)
            if (armorLevel >= 3) {
                ctx.fillStyle = '#444444';
                for (let i = 0; i < 3; i++) {
                    const spikeY = -bumperHeight / 2 + (i + 1) * (bumperHeight / 4);
                    ctx.beginPath();
                    ctx.moveTo(vehicleWidth / 2 + bumperWidth, spikeY);
                    ctx.lineTo(vehicleWidth / 2 + bumperWidth + 4, spikeY);
                    ctx.lineTo(vehicleWidth / 2 + bumperWidth + 2, spikeY + 3);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }
            }
        }
        
        // Roll cage (level 4+)
        if (armorLevel >= 4) {
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 2;
            
            // Main roll cage structure
            ctx.beginPath();
            ctx.arc(0, -vehicleHeight / 2 - 8, vehicleWidth / 2 + 5, 0, Math.PI);
            ctx.stroke();
            
            // Cross braces
            ctx.beginPath();
            ctx.moveTo(-vehicleWidth / 3, -vehicleHeight / 2 - 2);
            ctx.lineTo(vehicleWidth / 3, -vehicleHeight / 2 - 2);
            ctx.stroke();
        }
        
        // Armor plating details
        if (armorLevel >= 3) {
            ctx.fillStyle = '#666666';
            ctx.strokeStyle = '#444444';
            ctx.lineWidth = 1;
            
            // Rivets on armor plates
            for (let i = 0; i < armorLevel; i++) {
                const rivetY = -vehicleHeight / 2 + 5 + (i * 8);
                
                // Left side rivets
                ctx.beginPath();
                ctx.arc(-vehicleWidth / 2 - plateThickness / 2, rivetY, 1, 0, Math.PI * 2);
                ctx.fill();
                
                // Right side rivets
                ctx.beginPath();
                ctx.arc(vehicleWidth / 2 + plateThickness / 2, rivetY, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    /**
     * Render weapon upgrade enhancements
     */
    renderWeaponEnhancements(ctx, vehicle, weaponLevel) {
        if (weaponLevel <= 0) return;
        
        const vehicleWidth = vehicle.width || 80;
        const vehicleHeight = vehicle.height || 40;
        
        // Main roof-mounted weapon
        this.renderRoofMountedWeapon(ctx, vehicleWidth, vehicleHeight, weaponLevel);
        
        // Additional weapons for higher levels
        if (weaponLevel >= 3) {
            this.renderSideWeapons(ctx, vehicleWidth, vehicleHeight, weaponLevel - 2);
        }
        
        if (weaponLevel >= 5) {
            this.renderFrontWeapons(ctx, vehicleWidth, vehicleHeight, 1);
        }
    }
    
    /**
     * Render roof-mounted weapon
     */
    renderRoofMountedWeapon(ctx, vehicleWidth, vehicleHeight, level) {
        ctx.fillStyle = '#333333';
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1;
        
        // Weapon mount
        const mountSize = 6 + level;
        const mountX = 0;
        const mountY = -vehicleHeight / 2 - mountSize / 2;
        
        ctx.fillRect(mountX - mountSize / 2, mountY, mountSize, mountSize / 2);
        ctx.strokeRect(mountX - mountSize / 2, mountY, mountSize, mountSize / 2);
        
        // Gun barrel
        const barrelLength = 12 + (level * 3);
        const barrelWidth = 2 + (level * 0.5);
        
        ctx.fillStyle = '#222222';
        ctx.fillRect(mountX - barrelWidth / 2, mountY - barrelLength, barrelWidth, barrelLength);
        ctx.strokeRect(mountX - barrelWidth / 2, mountY - barrelLength, barrelWidth, barrelLength);
        
        // Muzzle brake (level 2+)
        if (level >= 2) {
            ctx.fillStyle = '#444444';
            const brakeSize = barrelWidth + 2;
            ctx.fillRect(mountX - brakeSize / 2, mountY - barrelLength - 3, brakeSize, 3);
            ctx.strokeRect(mountX - brakeSize / 2, mountY - barrelLength - 3, brakeSize, 3);
        }
        
        // Rotating turret (level 3+)
        if (level >= 3) {
            ctx.fillStyle = '#555555';
            ctx.beginPath();
            ctx.arc(mountX, mountY + mountSize / 4, mountSize / 2 + 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        
        // Dual barrels (level 4+)
        if (level >= 4) {
            const secondBarrelX = mountX + barrelWidth + 2;
            ctx.fillStyle = '#222222';
            ctx.fillRect(secondBarrelX - barrelWidth / 2, mountY - barrelLength, barrelWidth, barrelLength);
            ctx.strokeRect(secondBarrelX - barrelWidth / 2, mountY - barrelLength, barrelWidth, barrelLength);
            
            if (level >= 2) {
                ctx.fillStyle = '#444444';
                const brakeSize = barrelWidth + 2;
                ctx.fillRect(secondBarrelX - brakeSize / 2, mountY - barrelLength - 3, brakeSize, 3);
                ctx.strokeRect(secondBarrelX - brakeSize / 2, mountY - barrelLength - 3, brakeSize, 3);
            }
        }
    }
    
    /**
     * Render side-mounted weapons
     */
    renderSideWeapons(ctx, vehicleWidth, vehicleHeight, level) {
        ctx.fillStyle = '#333333';
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1;
        
        const weaponLength = 8 + (level * 2);
        const weaponWidth = 2;
        
        // Left side weapon
        ctx.fillRect(-vehicleWidth / 2 - weaponLength, -weaponWidth / 2, weaponLength, weaponWidth);
        ctx.strokeRect(-vehicleWidth / 2 - weaponLength, -weaponWidth / 2, weaponLength, weaponWidth);
        
        // Right side weapon
        ctx.fillRect(vehicleWidth / 2, -weaponWidth / 2, weaponLength, weaponWidth);
        ctx.strokeRect(vehicleWidth / 2, -weaponWidth / 2, weaponLength, weaponWidth);
        
        // Weapon mounts
        ctx.fillStyle = '#444444';
        ctx.fillRect(-vehicleWidth / 2 - 3, -3, 3, 6);
        ctx.strokeRect(-vehicleWidth / 2 - 3, -3, 3, 6);
        
        ctx.fillRect(vehicleWidth / 2, -3, 3, 6);
        ctx.strokeRect(vehicleWidth / 2, -3, 3, 6);
    }
    
    /**
     * Render front-mounted weapons
     */
    renderFrontWeapons(ctx, vehicleWidth, vehicleHeight, level) {
        ctx.fillStyle = '#333333';
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1;
        
        const weaponLength = 6;
        const weaponWidth = 1.5;
        
        // Front weapons (machine guns)
        for (let i = 0; i < 2; i++) {
            const weaponY = -vehicleHeight / 4 + (i * vehicleHeight / 2);
            
            ctx.fillRect(vehicleWidth / 2, weaponY - weaponWidth / 2, weaponLength, weaponWidth);
            ctx.strokeRect(vehicleWidth / 2, weaponY - weaponWidth / 2, weaponLength, weaponWidth);
        }
    }
    
    /**
     * Render wheel upgrade enhancements
     */
    renderWheelEnhancements(ctx, vehicle, wheelLevel) {
        if (wheelLevel <= 0) return;
        
        // This method would be called for each wheel
        // For now, we'll add visual indicators that wheels are upgraded
        const vehicleWidth = vehicle.width || 80;
        const vehicleHeight = vehicle.height || 40;
        
        // Enhanced wheel wells
        if (wheelLevel >= 2) {
            ctx.strokeStyle = '#444444';
            ctx.lineWidth = 2;
            
            // Front wheel well
            ctx.beginPath();
            ctx.arc(vehicleWidth / 3, vehicleHeight / 2 + 5, 12 + wheelLevel, 0, Math.PI);
            ctx.stroke();
            
            // Rear wheel well
            ctx.beginPath();
            ctx.arc(-vehicleWidth / 3, vehicleHeight / 2 + 5, 12 + wheelLevel, 0, Math.PI);
            ctx.stroke();
        }
        
        // Fender flares (level 3+)
        if (wheelLevel >= 3) {
            ctx.fillStyle = '#555555';
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 1;
            
            const flareSize = 3 + wheelLevel;
            
            // Front fender flares
            ctx.fillRect(vehicleWidth / 3 - flareSize / 2, vehicleHeight / 2, flareSize, 4);
            ctx.strokeRect(vehicleWidth / 3 - flareSize / 2, vehicleHeight / 2, flareSize, 4);
            
            // Rear fender flares
            ctx.fillRect(-vehicleWidth / 3 - flareSize / 2, vehicleHeight / 2, flareSize, 4);
            ctx.strokeRect(-vehicleWidth / 3 - flareSize / 2, vehicleHeight / 2, flareSize, 4);
        }
    }
    
    /**
     * Render upgrade glow effects
     */
    renderUpgradeGlowEffects(ctx, vehicle, upgrades, position, rotation) {
        ctx.save();
        ctx.translate(position.x, position.y);
        ctx.rotate(rotation);
        
        // Engine glow (when throttling)
        if (upgrades.engine >= 3 && vehicle.controls && Math.abs(vehicle.controls.throttle) > 0.5) {
            ctx.shadowColor = '#ff4500';
            ctx.shadowBlur = 10;
            ctx.fillStyle = 'rgba(255, 69, 0, 0.3)';
            ctx.fillRect(-vehicle.width / 2 - 15, -5, 10, 10);
        }
        
        // Weapon charge glow
        if (upgrades.weapon >= 4) {
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 8;
            ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.fillRect(-2, -vehicle.height / 2 - 20, 4, 15);
        }
        
        ctx.restore();
    }
    
    /**
     * Get upgrade visual summary
     */
    getUpgradeVisualSummary(upgrades) {
        const summary = {
            totalVisualChanges: 0,
            categories: {}
        };
        
        Object.keys(upgrades).forEach(category => {
            const level = upgrades[category];
            const changes = this.getVisualChangesForCategory(category, level);
            
            summary.categories[category] = {
                level,
                changes: changes.length,
                descriptions: changes
            };
            
            summary.totalVisualChanges += changes.length;
        });
        
        return summary;
    }
    
    /**
     * Get visual changes for a specific category and level
     */
    getVisualChangesForCategory(category, level) {
        const changes = [];
        
        switch (category) {
            case 'engine':
                if (level >= 1) changes.push('Enhanced exhaust system');
                if (level >= 3) changes.push('Turbo charger');
                if (level >= 4) changes.push('Hood scoop and air intake');
                break;
                
            case 'fuel':
                if (level >= 3) changes.push('External fuel tanks');
                if (level >= 4) changes.push('Fuel tank caps and lines');
                break;
                
            case 'armor':
                if (level >= 1) changes.push('Side armor plating');
                if (level >= 2) changes.push('Reinforced bumper');
                if (level >= 3) changes.push('Bumper spikes and rivets');
                if (level >= 4) changes.push('Roll cage');
                break;
                
            case 'weapon':
                if (level >= 1) changes.push('Roof-mounted gun');
                if (level >= 2) changes.push('Muzzle brake');
                if (level >= 3) changes.push('Rotating turret and side weapons');
                if (level >= 4) changes.push('Dual barrel system');
                if (level >= 5) changes.push('Front-mounted machine guns');
                break;
                
            case 'wheels':
                if (level >= 2) changes.push('Enhanced wheel wells');
                if (level >= 3) changes.push('Fender flares');
                break;
        }
        
        return changes;
    }
    
    /**
     * Clear enhancement cache
     */
    clearCache() {
        this.enhancementCache.clear();
        this.spriteCache.clear();
    }
}

export default VehicleVisualEnhancer;