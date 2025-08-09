/**
 * VisualStyleManager - Manages post-apocalyptic visual aesthetics
 * Handles desert backgrounds, sky gradients, dust particles, and atmospheric effects
 */
export class VisualStyleManager {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    
    // Color palette for post-apocalyptic aesthetic
    this.colorPalette = {
      desert: '#d4a574',
      sky: '#ff8c42',
      skyDark: '#cc6a2a',
      zombie: '#4a5d23',
      rust: '#8b4513',
      metal: '#696969',
      dust: 'rgba(212, 165, 116, 0.3)',
      weathered: '#a0855b'
    };
    
    // Dust particle system
    this.dustParticles = [];
    this.maxDustParticles = 50;
    
    // Weather effects
    this.weatherEffects = [];
    
    // Stage configurations for increasing desolation
    this.stageConfigs = {
      0: {
        name: "Outskirts",
        backgroundColor: '#d4a574',
        skyColor: '#ff8c42',
        skyDarkColor: '#cc6a2a',
        dustDensity: 0.3,
        desolationLevel: 0.2,
        atmosphericHaze: 0.1
      },
      1: {
        name: "Deep Desert",
        backgroundColor: '#c49464',
        skyColor: '#ff7a2e',
        skyDarkColor: '#b8551a',
        dustDensity: 0.5,
        desolationLevel: 0.5,
        atmosphericHaze: 0.3
      },
      2: {
        name: "Death Valley",
        backgroundColor: '#b48454',
        skyColor: '#ff681a',
        skyDarkColor: '#a44d06',
        dustDensity: 0.8,
        desolationLevel: 0.8,
        atmosphericHaze: 0.5
      }
    };
    
    this.currentStage = 0;
    this.initializeDustParticles();
  }
  
  /**
   * Initialize dust particle system
   */
  initializeDustParticles() {
    this.dustParticles = [];
    
    // Handle missing canvas gracefully
    if (!this.canvas) return;
    
    const config = this.stageConfigs[this.currentStage];
    const particleCount = Math.floor(this.maxDustParticles * config.dustDensity);
    
    for (let i = 0; i < particleCount; i++) {
      this.dustParticles.push({
        x: Math.random() * this.canvas.width * 2,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 0.5 + 0.2,
        opacity: Math.random() * 0.3 + 0.1,
        drift: Math.random() * 0.1 - 0.05
      });
    }
  }
  
  /**
   * Set current stage for visual styling
   */
  setStage(stageIndex) {
    if (this.stageConfigs[stageIndex]) {
      this.currentStage = stageIndex;
      this.initializeDustParticles();
    }
  }
  
  /**
   * Render desert background with orange-hued sky gradient
   */
  renderBackground(cameraX = 0) {
    if (!this.ctx || !this.canvas) return;
    
    const config = this.stageConfigs[this.currentStage];
    
    // Create gradient sky with orange hues
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    if (gradient && gradient.addColorStop) {
      gradient.addColorStop(0, config.skyColor);
      gradient.addColorStop(0.7, config.skyDarkColor);
      gradient.addColorStop(1, config.backgroundColor);
    }
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Add atmospheric haze effect
    this.renderAtmosphericHaze(config);
    
    // Render distant desert mountains/hills
    this.renderDistantTerrain(cameraX, config);
  }
  
  /**
   * Render atmospheric haze for depth and desolation
   */
  renderAtmosphericHaze(config) {
    const hazeIntensity = config.atmosphericHaze;
    
    // Create horizontal haze bands
    for (let i = 0; i < 3; i++) {
      const y = this.canvas.height * 0.3 + (i * this.canvas.height * 0.2);
      const gradient = this.ctx.createLinearGradient(0, y - 20, 0, y + 20);
      gradient.addColorStop(0, `rgba(212, 165, 116, 0)`);
      gradient.addColorStop(0.5, `rgba(212, 165, 116, ${hazeIntensity})`);
      gradient.addColorStop(1, `rgba(212, 165, 116, 0)`);
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, y - 20, this.canvas.width, 40);
    }
  }
  
  /**
   * Render distant terrain silhouettes
   */
  renderDistantTerrain(cameraX, config) {
    const parallaxFactor = 0.1;
    const offsetX = -cameraX * parallaxFactor;
    
    // Multiple layers of distant hills
    const layers = [
      { distance: 0.8, opacity: 0.2, height: 0.3 },
      { distance: 0.6, opacity: 0.15, height: 0.25 },
      { distance: 0.4, opacity: 0.1, height: 0.2 }
    ];
    
    layers.forEach((layer, index) => {
      this.ctx.save();
      this.ctx.globalAlpha = layer.opacity;
      this.ctx.fillStyle = config.backgroundColor;
      
      const baseY = this.canvas.height * (0.7 - layer.height);
      const points = [];
      
      for (let x = -200; x < this.canvas.width + 200; x += 50) {
        const adjustedX = x + offsetX * layer.distance;
        const hillHeight = Math.sin((adjustedX + index * 100) * 0.01) * 30 + 
                          Math.sin((adjustedX + index * 200) * 0.005) * 50;
        points.push({ x: adjustedX, y: baseY + hillHeight });
      }
      
      // Draw hill silhouette
      this.ctx.beginPath();
      this.ctx.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i < points.length; i++) {
        this.ctx.lineTo(points[i].x, points[i].y);
      }
      
      this.ctx.lineTo(this.canvas.width + 200, this.canvas.height);
      this.ctx.lineTo(-200, this.canvas.height);
      this.ctx.closePath();
      this.ctx.fill();
      
      this.ctx.restore();
    });
  }
  
  /**
   * Update and render dust particle effects
   */
  updateAndRenderDustParticles(deltaTime, windSpeed = 1) {
    if (!this.ctx || !this.canvas) return;
    
    const config = this.stageConfigs[this.currentStage];
    
    this.dustParticles.forEach(particle => {
      // Update particle position
      particle.x -= particle.speed * windSpeed * deltaTime * 60;
      particle.y += particle.drift * deltaTime * 60;
      
      // Wrap particles around screen
      if (particle.x < -10) {
        particle.x = this.canvas.width + 10;
        particle.y = Math.random() * this.canvas.height;
      }
      
      // Render particle
      this.ctx.save();
      this.ctx.globalAlpha = particle.opacity;
      this.ctx.fillStyle = this.colorPalette.dust;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
  }
  
  /**
   * Apply weathered texture effect to sprites
   */
  applyWeatheredEffect(imageData, intensity = 0.5) {
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Add rust/weathering tint
      const rustFactor = Math.random() * intensity;
      data[i] = Math.min(255, data[i] + rustFactor * 50);     // Red
      data[i + 1] = Math.max(0, data[i + 1] - rustFactor * 20); // Green
      data[i + 2] = Math.max(0, data[i + 2] - rustFactor * 30); // Blue
      
      // Add dirt/dust overlay
      if (Math.random() < intensity * 0.1) {
        const dustIntensity = Math.random() * 0.3;
        data[i] = Math.min(255, data[i] + dustIntensity * 100);
        data[i + 1] = Math.min(255, data[i + 1] + dustIntensity * 80);
        data[i + 2] = Math.min(255, data[i + 2] + dustIntensity * 60);
      }
    }
    
    return imageData;
  }
  
  /**
   * Create weathered vehicle texture
   */
  createWeatheredVehicleTexture(originalCanvas, weatheringLevel = 0.5) {
    const weatheredCanvas = document.createElement('canvas');
    weatheredCanvas.width = originalCanvas.width;
    weatheredCanvas.height = originalCanvas.height;
    const weatheredCtx = weatheredCanvas.getContext('2d');
    
    // Draw original sprite
    weatheredCtx.drawImage(originalCanvas, 0, 0);
    
    // Apply weathering effects
    const imageData = weatheredCtx.getImageData(0, 0, weatheredCanvas.width, weatheredCanvas.height);
    const weatheredData = this.applyWeatheredEffect(imageData, weatheringLevel);
    weatheredCtx.putImageData(weatheredData, 0, 0);
    
    // Add rust spots
    this.addRustSpots(weatheredCtx, weatheredCanvas.width, weatheredCanvas.height, weatheringLevel);
    
    // Add scratches and wear marks
    this.addWearMarks(weatheredCtx, weatheredCanvas.width, weatheredCanvas.height, weatheringLevel);
    
    return weatheredCanvas;
  }
  
  /**
   * Add rust spots to weathered texture
   */
  addRustSpots(ctx, width, height, intensity) {
    const rustSpots = Math.floor(intensity * 10);
    
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    
    for (let i = 0; i < rustSpots; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 8 + 2;
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      gradient.addColorStop(0, this.colorPalette.rust);
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
  
  /**
   * Add wear marks and scratches
   */
  addWearMarks(ctx, width, height, intensity) {
    const scratchCount = Math.floor(intensity * 5);
    
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.strokeStyle = this.colorPalette.weathered;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    
    for (let i = 0; i < scratchCount; i++) {
      const startX = Math.random() * width;
      const startY = Math.random() * height;
      const length = Math.random() * 20 + 5;
      const angle = Math.random() * Math.PI * 2;
      
      const endX = startX + Math.cos(angle) * length;
      const endY = startY + Math.sin(angle) * length;
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
    
    ctx.restore();
  }
  
  /**
   * Render screen effects for atmosphere
   */
  renderScreenEffects() {
    const config = this.stageConfigs[this.currentStage];
    
    // Heat shimmer effect
    if (config.desolationLevel > 0.3) {
      this.renderHeatShimmer();
    }
    
    // Dust storm overlay
    if (config.dustDensity > 0.6) {
      this.renderDustStormOverlay();
    }
  }
  
  /**
   * Render heat shimmer effect
   */
  renderHeatShimmer() {
    const shimmerIntensity = 0.02;
    const time = Date.now() * 0.001;
    
    // Create subtle distortion effect
    this.ctx.save();
    this.ctx.globalAlpha = 0.1;
    
    for (let y = this.canvas.height * 0.6; y < this.canvas.height; y += 4) {
      const offset = Math.sin(time + y * 0.1) * shimmerIntensity * this.canvas.width;
      
      this.ctx.drawImage(
        this.canvas,
        0, y, this.canvas.width, 2,
        offset, y, this.canvas.width, 2
      );
    }
    
    this.ctx.restore();
  }
  
  /**
   * Render dust storm overlay
   */
  renderDustStormOverlay() {
    const config = this.stageConfigs[this.currentStage];
    
    this.ctx.save();
    this.ctx.globalAlpha = config.dustDensity * 0.2;
    
    const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.5, this.colorPalette.dust);
    gradient.addColorStop(1, 'transparent');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.restore();
  }
  
  /**
   * Get current stage configuration
   */
  getCurrentStageConfig() {
    return this.stageConfigs[this.currentStage];
  }
  
  /**
   * Update visual effects
   */
  update(deltaTime, cameraX = 0, windSpeed = 1) {
    this.updateAndRenderDustParticles(deltaTime, windSpeed);
  }
  
  /**
   * Render complete visual style
   */
  render(cameraX = 0, windSpeed = 1) {
    this.renderBackground(cameraX);
    this.renderScreenEffects();
  }
}