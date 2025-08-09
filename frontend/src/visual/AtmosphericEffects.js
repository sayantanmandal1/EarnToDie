/**
 * AtmosphericEffects - Manages atmospheric visual elements
 * Handles dust particles, heat shimmer, and environmental effects
 */
export class AtmosphericEffects {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    
    // Particle systems
    this.dustParticles = [];
    this.heatShimmerLines = [];
    this.atmosphericParticles = [];
    
    // Effect configurations
    this.effects = {
      dustStorm: {
        active: false,
        intensity: 0,
        particles: []
      },
      heatShimmer: {
        active: true,
        intensity: 0.3,
        frequency: 0.02
      },
      atmosphericHaze: {
        active: true,
        layers: 3,
        opacity: 0.1
      },
      windEffect: {
        active: true,
        strength: 1,
        direction: -1 // Left to right
      }
    };
    
    this.time = 0;
    this.initializeEffects();
  }
  
  /**
   * Initialize atmospheric effects
   */
  initializeEffects() {
    this.initializeDustParticles();
    this.initializeHeatShimmer();
    this.initializeAtmosphericHaze();
  }
  
  /**
   * Initialize dust particle system
   */
  initializeDustParticles() {
    const particleCount = 30;
    
    // Handle missing canvas gracefully
    if (!this.canvas) return;
    
    for (let i = 0; i < particleCount; i++) {
      this.dustParticles.push({
        x: Math.random() * this.canvas.width * 2,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 1 + 0.5,
        opacity: Math.random() * 0.3 + 0.1,
        drift: Math.random() * 0.2 - 0.1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02
      });
    }
  }
  
  /**
   * Initialize heat shimmer effect
   */
  initializeHeatShimmer() {
    const lineCount = 20;
    
    for (let i = 0; i < lineCount; i++) {
      this.heatShimmerLines.push({
        x: (i / lineCount) * this.canvas.width,
        baseY: this.canvas.height * 0.7,
        amplitude: Math.random() * 10 + 5,
        frequency: Math.random() * 0.02 + 0.01,
        phase: Math.random() * Math.PI * 2,
        opacity: Math.random() * 0.1 + 0.05
      });
    }
  }
  
  /**
   * Initialize atmospheric haze layers
   */
  initializeAtmosphericHaze() {
    // Haze layers are generated dynamically in render
  }
  
  /**
   * Update atmospheric effects
   */
  update(deltaTime, windSpeed = 1, stageConfig = {}) {
    this.time += deltaTime;
    
    this.updateDustParticles(deltaTime, windSpeed);
    this.updateHeatShimmer(deltaTime);
    this.updateDustStorm(deltaTime, stageConfig);
    this.updateAtmosphericEffects(deltaTime, stageConfig);
  }
  
  /**
   * Update dust particles
   */
  updateDustParticles(deltaTime, windSpeed) {
    if (!this.canvas) return;
    
    this.dustParticles.forEach(particle => {
      // Move particles with wind
      particle.x += particle.speed * windSpeed * this.effects.windEffect.strength * deltaTime * 60;
      particle.y += particle.drift * deltaTime * 60;
      
      // Rotate particles
      particle.rotation += particle.rotationSpeed * deltaTime * 60;
      
      // Wrap particles around screen
      if (particle.x > this.canvas.width + 50) {
        particle.x = -50;
        particle.y = Math.random() * this.canvas.height;
      }
      
      if (particle.y > this.canvas.height + 10) {
        particle.y = -10;
      } else if (particle.y < -10) {
        particle.y = this.canvas.height + 10;
      }
    });
  }
  
  /**
   * Update heat shimmer effect
   */
  updateHeatShimmer(deltaTime) {
    if (!this.effects.heatShimmer.active) return;
    
    this.heatShimmerLines.forEach(line => {
      line.phase += line.frequency * deltaTime * 60;
    });
  }
  
  /**
   * Update dust storm effect
   */
  updateDustStorm(deltaTime, stageConfig) {
    if (!this.effects.dustStorm.active) return;
    
    // Add new dust storm particles
    if (this.effects.dustStorm.particles.length < this.effects.dustStorm.intensity * 50) {
      this.effects.dustStorm.particles.push({
        x: this.canvas.width + 50,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 5 + 2,
        speed: Math.random() * 3 + 2,
        opacity: Math.random() * 0.4 + 0.2,
        life: 1.0
      });
    }
    
    // Update existing particles
    this.effects.dustStorm.particles.forEach((particle, index) => {
      particle.x -= particle.speed * deltaTime * 60;
      particle.life -= deltaTime * 0.5;
      
      if (particle.x < -50 || particle.life <= 0) {
        this.effects.dustStorm.particles.splice(index, 1);
      }
    });
  }
  
  /**
   * Update atmospheric effects based on stage
   */
  updateAtmosphericEffects(deltaTime, stageConfig) {
    // Adjust effect intensities based on stage
    if (stageConfig && stageConfig.dustDensity !== undefined) {
      this.effects.heatShimmer.intensity = stageConfig.dustDensity * 0.5;
      this.effects.atmosphericHaze.opacity = stageConfig.dustDensity * 0.2;
    }
  }
  
  /**
   * Render dust particles
   */
  renderDustParticles() {
    if (!this.ctx) return;
    
    this.dustParticles.forEach(particle => {
      this.ctx.save();
      
      this.ctx.globalAlpha = particle.opacity;
      this.ctx.translate(particle.x, particle.y);
      this.ctx.rotate(particle.rotation);
      
      // Create dust particle gradient
      const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, particle.size);
      if (gradient && gradient.addColorStop) {
        gradient.addColorStop(0, 'rgba(212, 165, 116, 0.8)');
        gradient.addColorStop(1, 'rgba(212, 165, 116, 0)');
      }
      
      this.ctx.fillStyle = gradient || 'rgba(212, 165, 116, 0.5)';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.restore();
    });
  }
  
  /**
   * Render heat shimmer effect
   */
  renderHeatShimmer() {
    if (!this.effects.heatShimmer.active) return;
    
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';
    
    this.heatShimmerLines.forEach(line => {
      this.ctx.save();
      this.ctx.globalAlpha = line.opacity * this.effects.heatShimmer.intensity;
      
      // Create shimmer gradient
      const gradient = this.ctx.createLinearGradient(
        line.x, line.baseY - line.amplitude,
        line.x, line.baseY + line.amplitude
      );
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(0.5, 'rgba(255, 140, 66, 0.3)');
      gradient.addColorStop(1, 'transparent');
      
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = 2;
      
      // Draw wavy shimmer line
      this.ctx.beginPath();
      for (let y = line.baseY - line.amplitude; y <= line.baseY + line.amplitude; y += 2) {
        const offset = Math.sin(line.phase + y * 0.1) * 3;
        const x = line.x + offset;
        
        if (y === line.baseY - line.amplitude) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      this.ctx.stroke();
      
      this.ctx.restore();
    });
    
    this.ctx.restore();
  }
  
  /**
   * Render atmospheric haze
   */
  renderAtmosphericHaze() {
    if (!this.effects.atmosphericHaze.active) return;
    
    this.ctx.save();
    
    for (let i = 0; i < this.effects.atmosphericHaze.layers; i++) {
      const layerY = this.canvas.height * (0.3 + i * 0.2);
      const layerHeight = 40 + i * 20;
      
      const gradient = this.ctx.createLinearGradient(
        0, layerY - layerHeight / 2,
        0, layerY + layerHeight / 2
      );
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(0.5, `rgba(212, 165, 116, ${this.effects.atmosphericHaze.opacity})`);
      gradient.addColorStop(1, 'transparent');
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, layerY - layerHeight / 2, this.canvas.width, layerHeight);
    }
    
    this.ctx.restore();
  }
  
  /**
   * Render dust storm effect
   */
  renderDustStorm() {
    if (!this.effects.dustStorm.active) return;
    
    this.effects.dustStorm.particles.forEach(particle => {
      this.ctx.save();
      
      this.ctx.globalAlpha = particle.opacity * particle.life;
      
      // Create storm particle gradient
      const gradient = this.ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.size
      );
      gradient.addColorStop(0, 'rgba(139, 69, 19, 0.8)');
      gradient.addColorStop(1, 'rgba(139, 69, 19, 0)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.restore();
    });
  }
  
  /**
   * Render screen distortion effects
   */
  renderScreenDistortion() {
    // Heat distortion effect
    if (this.effects.heatShimmer.intensity > 0.3) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.05;
      
      const distortionOffset = Math.sin(this.time * 2) * 2;
      
      // Create subtle screen warping
      for (let y = this.canvas.height * 0.6; y < this.canvas.height; y += 4) {
        const sourceY = y;
        const targetY = y + distortionOffset * Math.sin(y * 0.01);
        
        this.ctx.drawImage(
          this.canvas,
          0, sourceY, this.canvas.width, 2,
          0, targetY, this.canvas.width, 2
        );
      }
      
      this.ctx.restore();
    }
  }
  
  /**
   * Activate dust storm effect
   */
  activateDustStorm(intensity = 0.5, duration = 5000) {
    this.effects.dustStorm.active = true;
    this.effects.dustStorm.intensity = intensity;
    
    // Auto-deactivate after duration
    setTimeout(() => {
      this.effects.dustStorm.active = false;
      this.effects.dustStorm.particles = [];
    }, duration);
  }
  
  /**
   * Set wind effect
   */
  setWindEffect(strength, direction = -1) {
    this.effects.windEffect.strength = strength;
    this.effects.windEffect.direction = direction;
  }
  
  /**
   * Set heat shimmer intensity
   */
  setHeatShimmerIntensity(intensity) {
    this.effects.heatShimmer.intensity = Math.max(0, Math.min(1, intensity));
  }
  
  /**
   * Render all atmospheric effects
   */
  render() {
    this.renderAtmosphericHaze();
    this.renderDustParticles();
    this.renderHeatShimmer();
    this.renderDustStorm();
    this.renderScreenDistortion();
  }
  
  /**
   * Get current effect status
   */
  getEffectStatus() {
    return {
      dustStorm: this.effects.dustStorm.active,
      heatShimmer: this.effects.heatShimmer.active,
      atmosphericHaze: this.effects.atmosphericHaze.active,
      windEffect: this.effects.windEffect.active,
      particleCount: this.dustParticles.length + this.effects.dustStorm.particles.length
    };
  }
}