/**
 * Vehicle Visual Damage Renderer
 * Handles visual representation of vehicle damage including deformation and particle effects
 */

import { EventEmitter } from 'events';

export class VehicleVisualDamage extends EventEmitter {
    constructor(canvas, options = {}) {
        super();
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.options = {
            // Rendering options
            enableParticleEffects: options.enableParticleEffects !== false,
            enableDeformation: options.enableDeformation !== false,
            enableDamageTextures: options.enableDamageTextures !== false,
            
            // Visual settings
            particleCount: options.particleCount || 50,
            particleLifetime: options.particleLifetime || 2000, // ms
            deformationScale: options.deformationScale || 1.0,
            
            ...options
        };
        
        // Particle systems for different damage types
        this.particleSystems = {
            sparks: [],
            smoke: [],
            debris: [],
            fluid: [],
            glass: []
        };
        
        // Damage textures and overlays
        this.damageOverlays = {
            scratches: null,
            dents: null,
            rust: null,
            cracks: null
        };
        
        // Vehicle mesh deformation data
        this.deformationData = {
            vertices: [],
            originalVertices: [],
            deformationMap: new Map()
        };
        
        // Animation state
        this.animationFrame = null;
        this.lastUpdate = Date.now();
        
        this.initialize();
    }

    /**
     * Initialize visual damage system
     */
    initialize() {
        // Create damage overlay textures
        this.createDamageTextures();
        
        // Start render loop
        this.startRenderLoop();
        
        this.emit('initialized');
    }

    /**
     * Create damage overlay textures
     */
    createDamageTextures() {
        // Create scratch texture
        this.damageOverlays.scratches = this.createScratchTexture();
        
        // Create dent normal map
        this.damageOverlays.dents = this.createDentTexture();
        
        // Create rust texture
        this.damageOverlays.rust = this.createRustTexture();
        
        // Create crack texture
        this.damageOverlays.cracks = this.createCrackTexture();
    }

    /**
     * Create scratch texture overlay
     */
    createScratchTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Generate random scratches
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            const startX = Math.random() * canvas.width;
            const startY = Math.random() * canvas.height;
            const length = 20 + Math.random() * 100;
            const angle = Math.random() * Math.PI * 2;
            
            ctx.moveTo(startX, startY);
            ctx.lineTo(
                startX + Math.cos(angle) * length,
                startY + Math.sin(angle) * length
            );
            ctx.stroke();
        }
        
        return canvas;
    }

    /**
     * Create dent texture for normal mapping
     */
    createDentTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Create radial gradient for dent effect
        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        gradient.addColorStop(0, 'rgba(128, 128, 255, 1)'); // Normal (no deformation)
        gradient.addColorStop(0.7, 'rgba(100, 100, 200, 0.8)'); // Slight inward
        gradient.addColorStop(1, 'rgba(80, 80, 150, 0.6)'); // Deep inward
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        return canvas;
    }

    /**
     * Create rust texture overlay
     */
    createRustTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Create rust pattern
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const noise = Math.random();
            if (noise > 0.7) {
                data[i] = 139 + Math.random() * 50;     // Red
                data[i + 1] = 69 + Math.random() * 30;  // Green
                data[i + 2] = 19 + Math.random() * 20;  // Blue
                data[i + 3] = 100 + Math.random() * 100; // Alpha
            } else {
                data[i + 3] = 0; // Transparent
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        return canvas;
    }

    /**
     * Create crack texture for glass/windshield
     */
    createCrackTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Draw crack pattern
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        
        // Main crack
        ctx.beginPath();
        ctx.moveTo(256, 100);
        ctx.quadraticCurveTo(300, 200, 256, 300);
        ctx.quadraticCurveTo(200, 400, 256, 500);
        ctx.stroke();
        
        // Branch cracks
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            const startX = 200 + Math.random() * 112;
            const startY = 150 + Math.random() * 200;
            const length = 30 + Math.random() * 60;
            const angle = Math.random() * Math.PI * 2;
            
            ctx.moveTo(startX, startY);
            ctx.lineTo(
                startX + Math.cos(angle) * length,
                startY + Math.sin(angle) * length
            );
            ctx.stroke();
        }
        
        return canvas;
    }

    /**
     * Apply visual damage based on damage data
     */
    applyDamage(damageData) {
        const { deformation, scratches, brokenParts, fluids } = damageData;
        
        // Apply deformation
        if (this.options.enableDeformation) {
            this.applyDeformation(deformation);
        }
        
        // Apply surface damage
        this.applySurfaceDamage(scratches);
        
        // Handle broken parts
        this.handleBrokenParts(brokenParts);
        
        // Create fluid leak effects
        if (this.options.enableParticleEffects) {
            this.createFluidEffects(fluids);
        }
        
        this.emit('damageApplied', damageData);
    }

    /**
     * Apply mesh deformation
     */
    applyDeformation(deformation) {
        // This would typically work with a 3D mesh
        // For 2D representation, we'll simulate with shape distortion
        
        Object.keys(deformation).forEach(area => {
            const deformAmount = deformation[area] * this.options.deformationScale;
            
            if (deformAmount > 0) {
                this.deformationData.deformationMap.set(area, {
                    amount: deformAmount,
                    type: 'inward', // Could be 'outward' for different damage types
                    timestamp: Date.now()
                });
            }
        });
    }

    /**
     * Apply surface damage (scratches, paint damage)
     */
    applySurfaceDamage(scratches) {
        Object.keys(scratches).forEach(area => {
            const scratchLevel = scratches[area];
            
            if (scratchLevel > 0) {
                // This would apply scratch textures to the vehicle surface
                // For now, we'll store the data for rendering
                this.surfaceDamage = this.surfaceDamage || {};
                this.surfaceDamage[area] = scratchLevel;
            }
        });
    }

    /**
     * Handle broken parts (lights, windows, etc.)
     */
    handleBrokenParts(brokenParts) {
        // Headlights
        brokenParts.headlights.forEach((broken, index) => {
            if (broken) {
                this.createGlassBreakEffect(`headlight_${index}`);
            }
        });
        
        // Windows
        brokenParts.windows.forEach((broken, index) => {
            if (broken) {
                this.createGlassBreakEffect(`window_${index}`);
            }
        });
        
        // Store broken parts state
        this.brokenParts = { ...brokenParts };
    }

    /**
     * Create glass break particle effect
     */
    createGlassBreakEffect(partName) {
        if (!this.options.enableParticleEffects) return;
        
        const particleCount = 15 + Math.random() * 20;
        
        for (let i = 0; i < particleCount; i++) {
            this.particleSystems.glass.push({
                x: 400 + Math.random() * 200, // Approximate position
                y: 200 + Math.random() * 100,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                size: 2 + Math.random() * 4,
                life: this.options.particleLifetime,
                maxLife: this.options.particleLifetime,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2,
                partName
            });
        }
    }

    /**
     * Create fluid leak effects
     */
    createFluidEffects(fluids) {
        Object.keys(fluids).forEach(fluidType => {
            if (fluids[fluidType]) {
                this.createFluidParticles(fluidType);
            }
        });
    }

    /**
     * Create fluid leak particles
     */
    createFluidParticles(fluidType) {
        const colors = {
            oil: { r: 20, g: 20, b: 20 },
            coolant: { r: 0, g: 255, b: 100 },
            fuel: { r: 200, g: 200, b: 0 },
            brake_fluid: { r: 150, g: 100, b: 50 }
        };
        
        const color = colors[fluidType] || { r: 100, g: 100, b: 100 };
        
        // Create dripping effect
        for (let i = 0; i < 5; i++) {
            this.particleSystems.fluid.push({
                x: 350 + Math.random() * 300,
                y: 450, // Bottom of vehicle
                vx: (Math.random() - 0.5) * 20,
                vy: 50 + Math.random() * 30,
                size: 3 + Math.random() * 5,
                color,
                life: this.options.particleLifetime * 2,
                maxLife: this.options.particleLifetime * 2,
                fluidType,
                gravity: 100
            });
        }
    }

    /**
     * Create collision impact effects
     */
    createImpactEffect(position, severity, impactType = 'collision') {
        if (!this.options.enableParticleEffects) return;
        
        // Sparks
        const sparkCount = Math.floor(severity * 10);
        for (let i = 0; i < sparkCount; i++) {
            this.particleSystems.sparks.push({
                x: position.x,
                y: position.y,
                vx: (Math.random() - 0.5) * 300,
                vy: (Math.random() - 0.5) * 300,
                size: 1 + Math.random() * 2,
                life: 500 + Math.random() * 1000,
                maxLife: 500 + Math.random() * 1000,
                color: {
                    r: 255,
                    g: 200 + Math.random() * 55,
                    b: 100 + Math.random() * 100
                }
            });
        }
        
        // Debris
        const debrisCount = Math.floor(severity * 5);
        for (let i = 0; i < debrisCount; i++) {
            this.particleSystems.debris.push({
                x: position.x,
                y: position.y,
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                size: 2 + Math.random() * 6,
                life: this.options.particleLifetime,
                maxLife: this.options.particleLifetime,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.3,
                color: {
                    r: 100 + Math.random() * 100,
                    g: 100 + Math.random() * 100,
                    b: 100 + Math.random() * 100
                }
            });
        }
        
        // Smoke (for severe impacts)
        if (severity > 5) {
            const smokeCount = Math.floor(severity * 2);
            for (let i = 0; i < smokeCount; i++) {
                this.particleSystems.smoke.push({
                    x: position.x + (Math.random() - 0.5) * 50,
                    y: position.y + (Math.random() - 0.5) * 50,
                    vx: (Math.random() - 0.5) * 50,
                    vy: -50 - Math.random() * 50,
                    size: 10 + Math.random() * 20,
                    life: this.options.particleLifetime * 3,
                    maxLife: this.options.particleLifetime * 3,
                    color: {
                        r: 50 + Math.random() * 50,
                        g: 50 + Math.random() * 50,
                        b: 50 + Math.random() * 50
                    },
                    expansion: 1 + Math.random() * 2
                });
            }
        }
    }

    /**
     * Update particle systems
     */
    updateParticles(deltaTime) {
        Object.keys(this.particleSystems).forEach(systemName => {
            const particles = this.particleSystems[systemName];
            
            for (let i = particles.length - 1; i >= 0; i--) {
                const particle = particles[i];
                
                // Update position
                particle.x += particle.vx * deltaTime;
                particle.y += particle.vy * deltaTime;
                
                // Apply gravity for certain particle types
                if (particle.gravity) {
                    particle.vy += particle.gravity * deltaTime;
                }
                
                // Update rotation
                if (particle.rotationSpeed) {
                    particle.rotation += particle.rotationSpeed * deltaTime;
                }
                
                // Update size (expansion for smoke)
                if (particle.expansion) {
                    particle.size += particle.expansion * deltaTime;
                }
                
                // Update life
                particle.life -= deltaTime * 1000;
                
                // Remove dead particles
                if (particle.life <= 0) {
                    particles.splice(i, 1);
                }
            }
        });
    }

    /**
     * Render vehicle with damage
     */
    render(vehicleData) {
        const currentTime = Date.now();
        const deltaTime = (currentTime - this.lastUpdate) / 1000;
        this.lastUpdate = currentTime;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Render vehicle base
        this.renderVehicleBase(vehicleData);
        
        // Render deformation
        this.renderDeformation();
        
        // Render surface damage
        this.renderSurfaceDamage();
        
        // Render broken parts
        this.renderBrokenParts();
        
        // Render particles
        this.renderParticles();
        
        // Render damage overlays
        this.renderDamageOverlays();
    }

    /**
     * Render vehicle base shape
     */
    renderVehicleBase(vehicleData) {
        this.ctx.fillStyle = vehicleData.color || '#ff0000';
        this.ctx.fillRect(300, 200, 400, 150); // Simple rectangle for demo
        
        // Windows
        this.ctx.fillStyle = 'rgba(100, 150, 255, 0.7)';
        this.ctx.fillRect(320, 210, 360, 60);
        
        // Wheels
        this.ctx.fillStyle = '#333';
        this.ctx.beginPath();
        this.ctx.arc(350, 370, 30, 0, Math.PI * 2);
        this.ctx.arc(650, 370, 30, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * Render deformation effects
     */
    renderDeformation() {
        this.deformationData.deformationMap.forEach((deform, area) => {
            // Apply visual deformation based on area and amount
            this.ctx.save();
            
            // This would typically modify vertex positions in 3D
            // For 2D demo, we'll use transform effects
            const deformScale = 1 - (deform.amount * 0.1);
            
            switch (area) {
                case 'front':
                    this.ctx.transform(deformScale, 0, 0, 1, 0, 0);
                    break;
                case 'rear':
                    this.ctx.transform(deformScale, 0, 0, 1, 0, 0);
                    break;
                // Add more deformation areas as needed
            }
            
            this.ctx.restore();
        });
    }

    /**
     * Render surface damage (scratches, rust, etc.)
     */
    renderSurfaceDamage() {
        if (this.surfaceDamage) {
            Object.keys(this.surfaceDamage).forEach(area => {
                const damageLevel = this.surfaceDamage[area];
                
                if (damageLevel > 0) {
                    this.ctx.save();
                    this.ctx.globalAlpha = damageLevel / 10;
                    
                    // Apply scratch texture
                    if (this.damageOverlays.scratches) {
                        this.ctx.drawImage(this.damageOverlays.scratches, 300, 200, 400, 150);
                    }
                    
                    this.ctx.restore();
                }
            });
        }
    }

    /**
     * Render broken parts
     */
    renderBrokenParts() {
        if (this.brokenParts) {
            // Broken headlights
            this.brokenParts.headlights.forEach((broken, index) => {
                if (broken) {
                    this.ctx.fillStyle = '#333';
                    const x = index === 0 ? 310 : 680;
                    this.ctx.fillRect(x, 220, 20, 15);
                }
            });
            
            // Broken windows
            this.brokenParts.windows.forEach((broken, index) => {
                if (broken && this.damageOverlays.cracks) {
                    this.ctx.save();
                    this.ctx.globalAlpha = 0.8;
                    this.ctx.drawImage(this.damageOverlays.cracks, 320, 210, 360, 60);
                    this.ctx.restore();
                }
            });
        }
    }

    /**
     * Render particle effects
     */
    renderParticles() {
        Object.keys(this.particleSystems).forEach(systemName => {
            const particles = this.particleSystems[systemName];
            
            particles.forEach(particle => {
                this.ctx.save();
                
                // Set alpha based on life remaining
                const alpha = particle.life / particle.maxLife;
                this.ctx.globalAlpha = alpha;
                
                // Set color
                if (particle.color) {
                    this.ctx.fillStyle = `rgb(${particle.color.r}, ${particle.color.g}, ${particle.color.b})`;
                } else {
                    this.ctx.fillStyle = '#fff';
                }
                
                // Render based on particle type
                if (systemName === 'sparks') {
                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    this.ctx.fill();
                } else if (systemName === 'smoke') {
                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    this.ctx.fill();
                } else if (systemName === 'debris' || systemName === 'glass') {
                    this.ctx.translate(particle.x, particle.y);
                    this.ctx.rotate(particle.rotation);
                    this.ctx.fillRect(-particle.size/2, -particle.size/2, particle.size, particle.size);
                } else if (systemName === 'fluid') {
                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                
                this.ctx.restore();
            });
        });
    }

    /**
     * Render damage overlays
     */
    renderDamageOverlays() {
        // This would render additional damage textures and effects
        // For now, we'll just add some visual indicators
        
        if (this.deformationData.deformationMap.size > 0) {
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
            this.ctx.fillRect(300, 200, 400, 150);
            this.ctx.restore();
        }
    }

    /**
     * Start render loop
     */
    startRenderLoop() {
        const renderFrame = () => {
            this.render({ color: '#ff0000' }); // Default red vehicle
            this.animationFrame = requestAnimationFrame(renderFrame);
        };
        
        renderFrame();
    }

    /**
     * Stop render loop
     */
    stopRenderLoop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    /**
     * Dispose of visual damage system
     */
    dispose() {
        this.stopRenderLoop();
        this.removeAllListeners();
        
        // Clear particle systems
        Object.keys(this.particleSystems).forEach(key => {
            this.particleSystems[key] = [];
        });
    }
}

export default VehicleVisualDamage;