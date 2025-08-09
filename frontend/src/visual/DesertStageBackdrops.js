/**
 * DesertStageBackdrops - Manages different desert stage environments
 * Creates increasingly desolate backdrops as stages progress
 */
export class DesertStageBackdrops {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    
    // Stage backdrop configurations with increasing desolation
    this.stageBackdrops = {
      0: {
        name: "Desert Outskirts",
        description: "The edge of civilization, still some hope remains",
        skyGradient: {
          top: '#ff8c42',
          middle: '#e67a35',
          bottom: '#d4a574'
        },
        terrain: {
          baseColor: '#d4a574',
          shadowColor: '#c49464',
          highlightColor: '#e4b584'
        },
        atmosphere: {
          dustDensity: 0.2,
          heatShimmer: 0.1,
          visibility: 0.9
        },
        landmarks: [
          { type: 'distant_city', opacity: 0.3, position: 0.1 },
          { type: 'radio_tower', opacity: 0.4, position: 0.3 },
          { type: 'highway_signs', opacity: 0.5, position: 0.6 }
        ],
        vegetation: {
          density: 0.3,
          types: ['dead_tree', 'cactus', 'scrub_brush']
        }
      },
      
      1: {
        name: "Deep Wasteland",
        description: "The heart of the apocalypse, civilization is a memory",
        skyGradient: {
          top: '#ff7a2e',
          middle: '#d4651a',
          bottom: '#c49464'
        },
        terrain: {
          baseColor: '#c49464',
          shadowColor: '#b48454',
          highlightColor: '#d4a474'
        },
        atmosphere: {
          dustDensity: 0.5,
          heatShimmer: 0.3,
          visibility: 0.7
        },
        landmarks: [
          { type: 'ruined_building', opacity: 0.4, position: 0.2 },
          { type: 'crashed_plane', opacity: 0.3, position: 0.5 },
          { type: 'abandoned_gas_station', opacity: 0.5, position: 0.8 }
        ],
        vegetation: {
          density: 0.1,
          types: ['dead_tree', 'thorny_bush']
        }
      },
      
      2: {
        name: "Death Valley",
        description: "The final approach, where hope comes to die",
        skyGradient: {
          top: '#ff681a',
          middle: '#cc5214',
          bottom: '#b48454'
        },
        terrain: {
          baseColor: '#b48454',
          shadowColor: '#a47444',
          highlightColor: '#c49464'
        },
        atmosphere: {
          dustDensity: 0.8,
          heatShimmer: 0.5,
          visibility: 0.5
        },
        landmarks: [
          { type: 'military_base_ruins', opacity: 0.6, position: 0.1 },
          { type: 'nuclear_crater', opacity: 0.4, position: 0.4 },
          { type: 'evacuation_point', opacity: 0.8, position: 0.9 }
        ],
        vegetation: {
          density: 0.05,
          types: ['dead_tree']
        }
      }
    };
    
    this.currentStage = 0;
    this.parallaxLayers = [];
    this.initializeParallaxLayers();
  }
  
  /**
   * Initialize parallax background layers
   */
  initializeParallaxLayers() {
    this.parallaxLayers = [
      { distance: 0.95, elements: [], speed: 0.05 }, // Far background
      { distance: 0.8, elements: [], speed: 0.1 },   // Mid background
      { distance: 0.6, elements: [], speed: 0.2 },   // Near background
      { distance: 0.4, elements: [], speed: 0.3 }    // Foreground details
    ];
  }
  
  /**
   * Set current stage and update backdrop
   */
  setStage(stageIndex) {
    if (this.stageBackdrops[stageIndex]) {
      this.currentStage = stageIndex;
      this.generateStageElements();
    }
  }
  
  /**
   * Generate stage-specific background elements
   */
  generateStageElements() {
    const backdrop = this.stageBackdrops[this.currentStage];
    
    // Clear existing elements
    this.parallaxLayers.forEach(layer => layer.elements = []);
    
    // Generate landmarks
    backdrop.landmarks.forEach(landmark => {
      const layer = this.getLayerForLandmark(landmark.type);
      layer.elements.push({
        type: landmark.type,
        x: landmark.position * this.canvas.width * 3, // Spread across wider area
        opacity: landmark.opacity,
        scale: this.getScaleForLandmark(landmark.type)
      });
    });
    
    // Generate vegetation
    this.generateVegetation(backdrop.vegetation);
    
    // Generate atmospheric elements
    this.generateAtmosphericElements(backdrop.atmosphere);
  }
  
  /**
   * Get appropriate parallax layer for landmark type
   */
  getLayerForLandmark(landmarkType) {
    const layerMap = {
      'distant_city': this.parallaxLayers[0],
      'radio_tower': this.parallaxLayers[1],
      'highway_signs': this.parallaxLayers[2],
      'ruined_building': this.parallaxLayers[1],
      'crashed_plane': this.parallaxLayers[2],
      'abandoned_gas_station': this.parallaxLayers[2],
      'military_base_ruins': this.parallaxLayers[0],
      'nuclear_crater': this.parallaxLayers[1],
      'evacuation_point': this.parallaxLayers[0]
    };
    
    return layerMap[landmarkType] || this.parallaxLayers[1];
  }
  
  /**
   * Get scale factor for landmark type
   */
  getScaleForLandmark(landmarkType) {
    const scaleMap = {
      'distant_city': 0.3,
      'radio_tower': 0.5,
      'highway_signs': 0.7,
      'ruined_building': 0.6,
      'crashed_plane': 0.8,
      'abandoned_gas_station': 0.9,
      'military_base_ruins': 0.4,
      'nuclear_crater': 1.2,
      'evacuation_point': 0.5
    };
    
    return scaleMap[landmarkType] || 0.6;
  }
  
  /**
   * Generate vegetation elements
   */
  generateVegetation(vegetationConfig) {
    const vegetationCount = Math.floor(vegetationConfig.density * 20);
    
    for (let i = 0; i < vegetationCount; i++) {
      const vegetationType = vegetationConfig.types[
        Math.floor(Math.random() * vegetationConfig.types.length)
      ];
      
      const layer = this.parallaxLayers[2]; // Near background
      layer.elements.push({
        type: vegetationType,
        x: Math.random() * this.canvas.width * 3,
        opacity: 0.6 + Math.random() * 0.4,
        scale: 0.5 + Math.random() * 0.5
      });
    }
  }
  
  /**
   * Generate atmospheric elements
   */
  generateAtmosphericElements(atmosphereConfig) {
    // Add dust clouds
    const dustCloudCount = Math.floor(atmosphereConfig.dustDensity * 5);
    
    for (let i = 0; i < dustCloudCount; i++) {
      const layer = this.parallaxLayers[0]; // Far background
      layer.elements.push({
        type: 'dust_cloud',
        x: Math.random() * this.canvas.width * 4,
        y: this.canvas.height * 0.3 + Math.random() * this.canvas.height * 0.3,
        opacity: 0.1 + Math.random() * 0.2,
        scale: 1 + Math.random() * 2,
        drift: Math.random() * 0.5 - 0.25
      });
    }
  }
  
  /**
   * Render sky gradient for current stage
   */
  renderSkyGradient() {
    const backdrop = this.stageBackdrops[this.currentStage];
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    
    gradient.addColorStop(0, backdrop.skyGradient.top);
    gradient.addColorStop(0.6, backdrop.skyGradient.middle);
    gradient.addColorStop(1, backdrop.skyGradient.bottom);
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  /**
   * Render parallax background layers
   */
  renderParallaxLayers(cameraX) {
    this.parallaxLayers.forEach(layer => {
      const parallaxOffset = -cameraX * layer.speed;
      
      layer.elements.forEach(element => {
        const screenX = element.x + parallaxOffset;
        
        // Only render if element is visible on screen
        if (screenX > -200 && screenX < this.canvas.width + 200) {
          this.renderBackgroundElement(element, screenX);
        }
      });
    });
  }
  
  /**
   * Render individual background element
   */
  renderBackgroundElement(element, x) {
    this.ctx.save();
    this.ctx.globalAlpha = element.opacity;
    
    const y = element.y || this.getElementBaseY(element.type);
    const scale = element.scale || 1;
    
    this.ctx.translate(x, y);
    this.ctx.scale(scale, scale);
    
    switch (element.type) {
      case 'distant_city':
        this.drawDistantCity();
        break;
      case 'radio_tower':
        this.drawRadioTower();
        break;
      case 'highway_signs':
        this.drawHighwaySigns();
        break;
      case 'ruined_building':
        this.drawRuinedBuilding();
        break;
      case 'crashed_plane':
        this.drawCrashedPlane();
        break;
      case 'abandoned_gas_station':
        this.drawAbandonedGasStation();
        break;
      case 'military_base_ruins':
        this.drawMilitaryBaseRuins();
        break;
      case 'nuclear_crater':
        this.drawNuclearCrater();
        break;
      case 'evacuation_point':
        this.drawEvacuationPoint();
        break;
      case 'dead_tree':
        this.drawDeadTree();
        break;
      case 'cactus':
        this.drawCactus();
        break;
      case 'scrub_brush':
        this.drawScrubBrush();
        break;
      case 'thorny_bush':
        this.drawThornyBush();
        break;
      case 'dust_cloud':
        this.drawDustCloud(element);
        break;
    }
    
    this.ctx.restore();
  }
  
  /**
   * Get base Y position for element type
   */
  getElementBaseY(elementType) {
    const baseYMap = {
      'distant_city': this.canvas.height * 0.4,
      'radio_tower': this.canvas.height * 0.3,
      'highway_signs': this.canvas.height * 0.6,
      'ruined_building': this.canvas.height * 0.5,
      'crashed_plane': this.canvas.height * 0.7,
      'abandoned_gas_station': this.canvas.height * 0.65,
      'military_base_ruins': this.canvas.height * 0.45,
      'nuclear_crater': this.canvas.height * 0.8,
      'evacuation_point': this.canvas.height * 0.4,
      'dead_tree': this.canvas.height * 0.75,
      'cactus': this.canvas.height * 0.8,
      'scrub_brush': this.canvas.height * 0.85,
      'thorny_bush': this.canvas.height * 0.8
    };
    
    return baseYMap[elementType] || this.canvas.height * 0.7;
  }
  
  // Drawing methods for different elements
  drawDistantCity() {
    const backdrop = this.stageBackdrops[this.currentStage];
    this.ctx.fillStyle = backdrop.terrain.shadowColor;
    
    // Draw city silhouette
    for (let i = 0; i < 8; i++) {
      const buildingWidth = 15 + Math.random() * 20;
      const buildingHeight = 30 + Math.random() * 60;
      
      this.ctx.fillRect(i * buildingWidth, -buildingHeight, buildingWidth, buildingHeight);
    }
  }
  
  drawRadioTower() {
    const backdrop = this.stageBackdrops[this.currentStage];
    this.ctx.strokeStyle = backdrop.terrain.shadowColor;
    this.ctx.lineWidth = 2;
    
    // Tower structure
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(-10, -80);
    this.ctx.lineTo(10, -80);
    this.ctx.closePath();
    this.ctx.stroke();
    
    // Cross beams
    for (let i = 0; i < 4; i++) {
      const y = -20 * (i + 1);
      this.ctx.beginPath();
      this.ctx.moveTo(-5 - i, y);
      this.ctx.lineTo(5 + i, y);
      this.ctx.stroke();
    }
  }
  
  drawHighwaySigns() {
    const backdrop = this.stageBackdrops[this.currentStage];
    this.ctx.fillStyle = backdrop.terrain.shadowColor;
    
    // Sign post
    this.ctx.fillRect(-2, -40, 4, 40);
    
    // Sign board
    this.ctx.fillRect(-20, -50, 40, 15);
  }
  
  drawRuinedBuilding() {
    const backdrop = this.stageBackdrops[this.currentStage];
    this.ctx.fillStyle = backdrop.terrain.shadowColor;
    
    // Main structure (partially collapsed)
    this.ctx.fillRect(-25, -60, 50, 60);
    
    // Collapsed section
    this.ctx.beginPath();
    this.ctx.moveTo(25, -60);
    this.ctx.lineTo(35, -30);
    this.ctx.lineTo(25, 0);
    this.ctx.fill();
  }
  
  drawCrashedPlane() {
    const backdrop = this.stageBackdrops[this.currentStage];
    this.ctx.fillStyle = backdrop.terrain.shadowColor;
    
    // Fuselage
    this.ctx.fillRect(-40, -10, 80, 20);
    
    // Broken wing
    this.ctx.fillRect(-20, -5, 30, 10);
    
    // Tail (broken)
    this.ctx.fillRect(30, -15, 15, 25);
  }
  
  drawAbandonedGasStation() {
    const backdrop = this.stageBackdrops[this.currentStage];
    this.ctx.fillStyle = backdrop.terrain.shadowColor;
    
    // Main building
    this.ctx.fillRect(-30, -40, 60, 40);
    
    // Canopy
    this.ctx.fillRect(-40, -45, 80, 5);
    
    // Gas pumps
    this.ctx.fillRect(-15, -20, 5, 20);
    this.ctx.fillRect(10, -20, 5, 20);
  }
  
  drawMilitaryBaseRuins() {
    const backdrop = this.stageBackdrops[this.currentStage];
    this.ctx.fillStyle = backdrop.terrain.shadowColor;
    
    // Bunker remains
    this.ctx.fillRect(-50, -30, 100, 30);
    
    // Watchtower (collapsed)
    this.ctx.fillRect(30, -50, 15, 50);
    
    // Fence posts
    for (let i = -3; i <= 3; i++) {
      this.ctx.fillRect(i * 15, -10, 2, 10);
    }
  }
  
  drawNuclearCrater() {
    const backdrop = this.stageBackdrops[this.currentStage];
    this.ctx.fillStyle = backdrop.terrain.shadowColor;
    
    // Crater rim
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, 60, 20, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Inner crater
    this.ctx.fillStyle = '#2a2a2a';
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, 40, 12, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  drawEvacuationPoint() {
    const backdrop = this.stageBackdrops[this.currentStage];
    this.ctx.fillStyle = '#4a5d23'; // Slightly green for hope
    
    // Landing pad
    this.ctx.fillRect(-40, -5, 80, 10);
    
    // Control tower
    this.ctx.fillRect(-10, -60, 20, 60);
    
    // Beacon light
    this.ctx.fillStyle = '#ff8c42';
    this.ctx.beginPath();
    this.ctx.arc(0, -65, 5, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  drawDeadTree() {
    const backdrop = this.stageBackdrops[this.currentStage];
    this.ctx.strokeStyle = backdrop.terrain.shadowColor;
    this.ctx.lineWidth = 3;
    
    // Trunk
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(0, -30);
    this.ctx.stroke();
    
    // Branches
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -20);
    this.ctx.lineTo(-10, -25);
    this.ctx.moveTo(0, -15);
    this.ctx.lineTo(8, -22);
    this.ctx.stroke();
  }
  
  drawCactus() {
    const backdrop = this.stageBackdrops[this.currentStage];
    this.ctx.fillStyle = '#4a5d23';
    
    // Main body
    this.ctx.fillRect(-3, -25, 6, 25);
    
    // Arms
    this.ctx.fillRect(-8, -20, 5, 3);
    this.ctx.fillRect(3, -15, 5, 3);
  }
  
  drawScrubBrush() {
    const backdrop = this.stageBackdrops[this.currentStage];
    this.ctx.fillStyle = backdrop.terrain.shadowColor;
    
    // Irregular bush shape
    this.ctx.beginPath();
    this.ctx.arc(-5, -5, 4, 0, Math.PI * 2);
    this.ctx.arc(0, -8, 3, 0, Math.PI * 2);
    this.ctx.arc(5, -6, 4, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  drawThornyBush() {
    const backdrop = this.stageBackdrops[this.currentStage];
    this.ctx.fillStyle = backdrop.terrain.shadowColor;
    
    // Bush body
    this.ctx.beginPath();
    this.ctx.arc(0, -8, 6, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Thorns
    this.ctx.strokeStyle = backdrop.terrain.shadowColor;
    this.ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * 6;
      const y = -8 + Math.sin(angle) * 6;
      
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x + Math.cos(angle) * 3, y + Math.sin(angle) * 3);
      this.ctx.stroke();
    }
  }
  
  drawDustCloud(element) {
    const backdrop = this.stageBackdrops[this.currentStage];
    
    // Create dust cloud gradient
    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
    gradient.addColorStop(0, backdrop.terrain.baseColor);
    gradient.addColorStop(1, 'transparent');
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 30, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  /**
   * Update backdrop elements (for animated effects)
   */
  update(deltaTime) {
    // Update dust cloud positions
    this.parallaxLayers.forEach(layer => {
      layer.elements.forEach(element => {
        if (element.type === 'dust_cloud' && element.drift) {
          element.x += element.drift * deltaTime * 60;
          
          // Wrap around screen
          if (element.x > this.canvas.width * 4) {
            element.x = -200;
          }
        }
      });
    });
  }
  
  /**
   * Render complete backdrop
   */
  render(cameraX) {
    this.renderSkyGradient();
    this.renderParallaxLayers(cameraX);
  }
  
  /**
   * Get current stage configuration
   */
  getCurrentStageConfig() {
    return this.stageBackdrops[this.currentStage];
  }
}