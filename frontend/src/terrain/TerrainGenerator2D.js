/**
 * 2D Desert Terrain Generator for Zombie Car Game
 * 
 * Generates procedural desert landscapes with hills, ramps, dips, and obstacles
 * for side-scrolling vehicle gameplay. Uses noise functions and mathematical curves
 * to create realistic terrain with efficient chunking system.
 */

import Matter from 'matter-js';

class TerrainGenerator2D {
  constructor(options = {}) {
    this.options = {
      chunkSize: options.chunkSize || 1000, // pixels per chunk
      terrainHeight: options.terrainHeight || 400, // base terrain height
      heightVariation: options.heightVariation || 100, // max height variation
      pointSpacing: options.pointSpacing || 10, // distance between height points
      seed: options.seed || Math.random() * 1000000,
      ...options
    };
    
    // Terrain data storage
    this.chunks = new Map();
    this.obstacles = new Map();
    this.zombieSpawns = new Map();
    
    // Noise parameters for terrain generation
    this.noiseOffset = this.options.seed;
    
    // Obstacle types for desert environment
    this.obstacleTypes = {
      WRECKED_CAR: {
        width: 80,
        height: 30,
        mass: 0, // Static obstacle
        color: '#8b4513',
        health: 100,
        spawnChance: 0.3
      },
      LARGE_ROCK: {
        width: 60,
        height: 40,
        mass: 0,
        color: '#696969',
        health: 200,
        spawnChance: 0.4
      },
      DEBRIS: {
        width: 30,
        height: 15,
        mass: 0,
        color: '#654321',
        health: 50,
        spawnChance: 0.5
      },
      SMALL_ROCK: {
        width: 25,
        height: 20,
        mass: 0,
        color: '#808080',
        health: 75,
        spawnChance: 0.6
      },
      CACTUS: {
        width: 20,
        height: 50,
        mass: 0,
        color: '#2d5a2d',
        health: 30,
        spawnChance: 0.2
      }
    };
    
    // Performance tracking
    this.stats = {
      chunksGenerated: 0,
      obstaclesCreated: 0,
      generationTime: 0
    };
    
    console.log('🏜️ 2D Desert Terrain Generator initialized');
  }
  
  /**
   * Generate terrain chunk at specified world position
   */
  generateChunk(chunkX, physicsWorld = null) {
    const startTime = performance.now();
    const chunkKey = `chunk_${chunkX}`;
    
    // Check if chunk already exists
    if (this.chunks.has(chunkKey)) {
      return this.chunks.get(chunkKey);
    }
    
    const worldX = chunkX * this.options.chunkSize;
    const chunkSize = this.options.chunkSize;
    
    // Generate height map for this chunk
    const heightMap = this.generateHeightMap(worldX, chunkSize);
    
    // Generate obstacles for this chunk
    const obstacles = this.generateObstacles(worldX, chunkSize, heightMap);
    
    // Generate zombie spawn points
    const zombieSpawns = this.generateZombieSpawns(worldX, chunkSize, heightMap, obstacles);
    
    // Create physics bodies if physics world provided
    let terrainBodies = [];
    let obstacleBodies = [];
    
    if (physicsWorld) {
      terrainBodies = this.createTerrainPhysics(heightMap, worldX, physicsWorld);
      obstacleBodies = this.createObstaclePhysics(obstacles, physicsWorld);
    }
    
    // Create chunk data
    const chunk = {
      x: chunkX,
      worldX: worldX,
      size: chunkSize,
      heightMap: heightMap,
      obstacles: obstacles,
      zombieSpawns: zombieSpawns,
      terrainBodies: terrainBodies,
      obstacleBodies: obstacleBodies,
      generated: Date.now()
    };
    
    // Store chunk
    this.chunks.set(chunkKey, chunk);
    this.obstacles.set(chunkKey, obstacles);
    this.zombieSpawns.set(chunkKey, zombieSpawns);
    
    // Update stats
    const generationTime = performance.now() - startTime;
    this.stats.chunksGenerated++;
    this.stats.obstaclesCreated += obstacles.length;
    this.stats.generationTime += generationTime;
    
    console.log(`🏜️ Generated chunk ${chunkX} in ${generationTime.toFixed(2)}ms`);
    
    return chunk;
  }
  
  /**
   * Generate height map using noise functions and mathematical curves
   */
  generateHeightMap(worldX, chunkSize) {
    const heightMap = [];
    const pointCount = Math.ceil(chunkSize / this.options.pointSpacing);
    
    for (let i = 0; i <= pointCount; i++) {
      const x = worldX + (i * this.options.pointSpacing);
      
      // Multi-octave noise for realistic terrain variation
      let height = this.options.terrainHeight;
      
      // Large hills and valleys (low frequency)
      height += Math.sin(x * 0.001 + this.noiseOffset) * 80;
      height += Math.cos(x * 0.0008 + this.noiseOffset * 1.5) * 60;
      
      // Medium terrain features (medium frequency)
      height += Math.sin(x * 0.003 + this.noiseOffset * 2) * 40;
      height += Math.cos(x * 0.004 + this.noiseOffset * 2.5) * 30;
      
      // Small bumps and dips (high frequency)
      height += Math.sin(x * 0.01 + this.noiseOffset * 3) * 20;
      height += Math.cos(x * 0.015 + this.noiseOffset * 3.5) * 15;
      
      // Add some randomness for natural variation
      height += (this.pseudoRandom(x + this.noiseOffset) - 0.5) * 25;
      
      // Create occasional ramps and jumps
      const rampNoise = this.pseudoRandom(x * 0.002 + this.noiseOffset * 4);
      if (rampNoise > 0.85) {
        // Create upward ramp
        const rampHeight = (rampNoise - 0.85) * 400;
        height += rampHeight;
      } else if (rampNoise < 0.15) {
        // Create downward dip
        const dipDepth = (0.15 - rampNoise) * 200;
        height -= dipDepth;
      }
      
      heightMap.push({
        x: x,
        y: Math.max(100, height), // Ensure minimum height
        worldX: x
      });
    }
    
    // Smooth the terrain to avoid sharp edges
    this.smoothHeightMap(heightMap);
    
    return heightMap;
  }
  
  /**
   * Smooth height map to create more natural terrain
   */
  smoothHeightMap(heightMap) {
    const smoothingPasses = 2;
    
    for (let pass = 0; pass < smoothingPasses; pass++) {
      for (let i = 1; i < heightMap.length - 1; i++) {
        const prev = heightMap[i - 1].y;
        const current = heightMap[i].y;
        const next = heightMap[i + 1].y;
        
        // Apply smoothing filter
        heightMap[i].y = (prev + current * 2 + next) / 4;
      }
    }
  }
  
  /**
   * Generate obstacles for the chunk
   */
  generateObstacles(worldX, chunkSize, heightMap) {
    const obstacles = [];
    const obstacleSpacing = 150; // Minimum distance between obstacles
    const maxObstacles = Math.floor(chunkSize / obstacleSpacing);
    
    for (let i = 0; i < maxObstacles; i++) {
      const x = worldX + (i * obstacleSpacing) + (Math.random() * obstacleSpacing * 0.5);
      
      // Get terrain height at this position
      const terrainY = this.getHeightAtPosition(x, heightMap);
      
      // Choose obstacle type based on spawn chances
      const obstacleType = this.selectObstacleType();
      const obstacleData = this.obstacleTypes[obstacleType];
      
      // Create obstacle
      const obstacle = {
        id: `obstacle_${worldX}_${i}`,
        type: obstacleType,
        x: x,
        y: terrainY - obstacleData.height / 2,
        width: obstacleData.width,
        height: obstacleData.height,
        color: obstacleData.color,
        health: obstacleData.health,
        maxHealth: obstacleData.health,
        rotation: (Math.random() - 0.5) * 0.4, // Slight random rotation
        scale: 0.8 + Math.random() * 0.4, // Random scale variation
        destroyed: false,
        created: Date.now()
      };
      
      obstacles.push(obstacle);
    }
    
    return obstacles;
  }
  
  /**
   * Select obstacle type based on spawn chances
   */
  selectObstacleType() {
    const rand = Math.random();
    let cumulativeChance = 0;
    
    for (const [type, data] of Object.entries(this.obstacleTypes)) {
      cumulativeChance += data.spawnChance;
      if (rand <= cumulativeChance) {
        return type;
      }
    }
    
    // Fallback to debris
    return 'DEBRIS';
  }
  
  /**
   * Generate zombie spawn points
   */
  generateZombieSpawns(worldX, chunkSize, heightMap, obstacles) {
    const spawns = [];
    const spawnSpacing = 200; // Distance between spawn points
    const maxSpawns = Math.floor(chunkSize / spawnSpacing);
    
    for (let i = 0; i < maxSpawns; i++) {
      const x = worldX + (i * spawnSpacing) + (Math.random() * spawnSpacing * 0.3);
      const terrainY = this.getHeightAtPosition(x, heightMap);
      
      // Check if spawn point is clear of obstacles
      const isClear = this.isSpawnPointClear(x, terrainY, obstacles);
      
      if (isClear) {
        spawns.push({
          id: `spawn_${worldX}_${i}`,
          x: x,
          y: terrainY - 20, // Spawn slightly above ground
          used: false,
          created: Date.now()
        });
      }
    }
    
    return spawns;
  }
  
  /**
   * Check if spawn point is clear of obstacles
   */
  isSpawnPointClear(x, y, obstacles) {
    const clearanceRadius = 50;
    
    for (const obstacle of obstacles) {
      const dx = x - obstacle.x;
      const dy = y - obstacle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < clearanceRadius) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Create physics bodies for terrain
   */
  createTerrainPhysics(heightMap, worldX, physicsWorld) {
    const bodies = [];
    
    // Create physics bodies for terrain segments
    for (let i = 0; i < heightMap.length - 1; i++) {
      const point1 = heightMap[i];
      const point2 = heightMap[i + 1];
      
      // Calculate segment properties
      const segmentX = (point1.x + point2.x) / 2;
      const segmentY = (point1.y + point2.y) / 2;
      const segmentWidth = Math.abs(point2.x - point1.x);
      const segmentHeight = 20; // Thickness of terrain
      
      // Create physics body
      const body = Matter.Bodies.rectangle(
        segmentX,
        segmentY + segmentHeight / 2,
        segmentWidth,
        segmentHeight,
        {
          isStatic: true,
          friction: 0.8,
          frictionStatic: 1.0,
          restitution: 0.1,
          label: 'terrain',
          render: { visible: false }
        }
      );
      
      // Calculate rotation based on terrain slope
      const angle = Math.atan2(point2.y - point1.y, point2.x - point1.x);
      Matter.Body.setAngle(body, angle);
      
      Matter.World.add(physicsWorld, body);
      bodies.push(body);
    }
    
    return bodies;
  }
  
  /**
   * Create physics bodies for obstacles
   */
  createObstaclePhysics(obstacles, physicsWorld) {
    const bodies = [];
    
    for (const obstacle of obstacles) {
      const body = Matter.Bodies.rectangle(
        obstacle.x,
        obstacle.y,
        obstacle.width * obstacle.scale,
        obstacle.height * obstacle.scale,
        {
          isStatic: true,
          friction: 0.6,
          frictionStatic: 0.8,
          restitution: 0.3,
          label: 'obstacle',
          obstacleId: obstacle.id,
          obstacleType: obstacle.type,
          render: { visible: false }
        }
      );
      
      Matter.Body.setAngle(body, obstacle.rotation);
      Matter.World.add(physicsWorld, body);
      bodies.push(body);
    }
    
    return bodies;
  }
  
  /**
   * Get terrain height at specific world position
   */
  getHeightAtPosition(worldX, heightMap = null) {
    // If no height map provided, find the appropriate chunk
    if (!heightMap) {
      const chunkX = Math.floor(worldX / this.options.chunkSize);
      const chunk = this.chunks.get(`chunk_${chunkX}`);
      
      if (!chunk) {
        // Generate chunk if it doesn't exist
        const newChunk = this.generateChunk(chunkX);
        heightMap = newChunk.heightMap;
      } else {
        heightMap = chunk.heightMap;
      }
    }
    
    // Find the two closest points and interpolate
    let closestIndex = 0;
    let minDistance = Infinity;
    
    for (let i = 0; i < heightMap.length; i++) {
      const distance = Math.abs(heightMap[i].x - worldX);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    
    // Linear interpolation between adjacent points
    if (closestIndex < heightMap.length - 1) {
      const point1 = heightMap[closestIndex];
      const point2 = heightMap[closestIndex + 1];
      
      const t = (worldX - point1.x) / (point2.x - point1.x);
      return point1.y + (point2.y - point1.y) * t;
    }
    
    return heightMap[closestIndex].y;
  }
  
  /**
   * Check collision between vehicle and terrain/obstacles
   */
  checkTerrainCollision(vehicleX, vehicleY, vehicleWidth, vehicleHeight) {
    const collisions = [];
    
    // Check terrain collision
    const terrainY = this.getHeightAtPosition(vehicleX);
    const vehicleBottom = vehicleY + vehicleHeight / 2;
    
    if (vehicleBottom >= terrainY) {
      collisions.push({
        type: 'terrain',
        penetration: vehicleBottom - terrainY,
        normal: { x: 0, y: -1 },
        point: { x: vehicleX, y: terrainY }
      });
    }
    
    // Check obstacle collisions
    const chunkX = Math.floor(vehicleX / this.options.chunkSize);
    const obstacles = this.obstacles.get(`chunk_${chunkX}`) || [];
    
    for (const obstacle of obstacles) {
      if (obstacle.destroyed) continue;
      
      const dx = Math.abs(vehicleX - obstacle.x);
      const dy = Math.abs(vehicleY - obstacle.y);
      
      const halfVehicleWidth = vehicleWidth / 2;
      const halfVehicleHeight = vehicleHeight / 2;
      const halfObstacleWidth = (obstacle.width * obstacle.scale) / 2;
      const halfObstacleHeight = (obstacle.height * obstacle.scale) / 2;
      
      if (dx < halfVehicleWidth + halfObstacleWidth && 
          dy < halfVehicleHeight + halfObstacleHeight) {
        
        collisions.push({
          type: 'obstacle',
          obstacle: obstacle,
          penetration: Math.min(
            halfVehicleWidth + halfObstacleWidth - dx,
            halfVehicleHeight + halfObstacleHeight - dy
          ),
          normal: { 
            x: vehicleX > obstacle.x ? 1 : -1, 
            y: vehicleY > obstacle.y ? 1 : -1 
          },
          point: { x: obstacle.x, y: obstacle.y }
        });
      }
    }
    
    return collisions;
  }
  
  /**
   * Damage obstacle
   */
  damageObstacle(obstacleId, damage) {
    for (const [chunkKey, obstacles] of this.obstacles) {
      const obstacle = obstacles.find(obs => obs.id === obstacleId);
      if (obstacle) {
        obstacle.health -= damage;
        
        if (obstacle.health <= 0) {
          obstacle.destroyed = true;
          obstacle.destroyedAt = Date.now();
          
          console.log(`🏜️ Obstacle ${obstacleId} destroyed`);
          return true;
        }
        
        return false;
      }
    }
    
    return false;
  }
  
  /**
   * Get obstacles in range
   */
  getObstaclesInRange(centerX, range) {
    const obstacles = [];
    const minChunk = Math.floor((centerX - range) / this.options.chunkSize);
    const maxChunk = Math.floor((centerX + range) / this.options.chunkSize);
    
    for (let chunkX = minChunk; chunkX <= maxChunk; chunkX++) {
      const chunkObstacles = this.obstacles.get(`chunk_${chunkX}`) || [];
      
      for (const obstacle of chunkObstacles) {
        if (!obstacle.destroyed && Math.abs(obstacle.x - centerX) <= range) {
          obstacles.push(obstacle);
        }
      }
    }
    
    return obstacles;
  }
  
  /**
   * Get zombie spawn points in range
   */
  getZombieSpawnsInRange(centerX, range) {
    const spawns = [];
    const minChunk = Math.floor((centerX - range) / this.options.chunkSize);
    const maxChunk = Math.floor((centerX + range) / this.options.chunkSize);
    
    for (let chunkX = minChunk; chunkX <= maxChunk; chunkX++) {
      const chunkSpawns = this.zombieSpawns.get(`chunk_${chunkX}`) || [];
      
      for (const spawn of chunkSpawns) {
        if (!spawn.used && Math.abs(spawn.x - centerX) <= range) {
          spawns.push(spawn);
        }
      }
    }
    
    return spawns;
  }
  
  /**
   * Render terrain chunk
   */
  renderChunk(ctx, chunkX, camera) {
    const chunk = this.chunks.get(`chunk_${chunkX}`);
    if (!chunk) return;
    
    const { heightMap, obstacles } = chunk;
    
    // Render terrain
    this.renderTerrain(ctx, heightMap, camera);
    
    // Render obstacles
    this.renderObstacles(ctx, obstacles, camera);
  }
  
  /**
   * Render terrain surface
   */
  renderTerrain(ctx, heightMap, camera) {
    if (heightMap.length < 2) return;
    
    ctx.save();
    
    // Create terrain path
    ctx.beginPath();
    ctx.moveTo(heightMap[0].x, heightMap[0].y);
    
    for (let i = 1; i < heightMap.length; i++) {
      ctx.lineTo(heightMap[i].x, heightMap[i].y);
    }
    
    // Close path to bottom of screen for fill
    const lastPoint = heightMap[heightMap.length - 1];
    ctx.lineTo(lastPoint.x, camera.canvas.height + 100);
    ctx.lineTo(heightMap[0].x, camera.canvas.height + 100);
    ctx.closePath();
    
    // Fill terrain with desert gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, camera.canvas.height);
    gradient.addColorStop(0, '#d4a574'); // Desert sand
    gradient.addColorStop(1, '#c49464'); // Darker sand
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw terrain outline
    ctx.strokeStyle = '#b48454';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.restore();
  }
  
  /**
   * Render obstacles
   */
  renderObstacles(ctx, obstacles, camera) {
    ctx.save();
    
    for (const obstacle of obstacles) {
      if (obstacle.destroyed) continue;
      
      ctx.save();
      
      // Apply transformations
      ctx.translate(obstacle.x, obstacle.y);
      ctx.rotate(obstacle.rotation);
      ctx.scale(obstacle.scale, obstacle.scale);
      
      // Draw obstacle based on type
      this.renderObstacleType(ctx, obstacle);
      
      ctx.restore();
    }
    
    ctx.restore();
  }
  
  /**
   * Render specific obstacle type
   */
  renderObstacleType(ctx, obstacle) {
    const halfWidth = obstacle.width / 2;
    const halfHeight = obstacle.height / 2;
    
    ctx.fillStyle = obstacle.color;
    ctx.strokeStyle = this.darkenColor(obstacle.color, 0.3);
    ctx.lineWidth = 2;
    
    switch (obstacle.type) {
      case 'WRECKED_CAR':
        // Draw car body
        ctx.fillRect(-halfWidth, -halfHeight, obstacle.width, obstacle.height);
        ctx.strokeRect(-halfWidth, -halfHeight, obstacle.width, obstacle.height);
        
        // Draw windows
        ctx.fillStyle = '#333333';
        ctx.fillRect(-halfWidth + 10, -halfHeight + 5, obstacle.width - 20, obstacle.height - 10);
        break;
        
      case 'LARGE_ROCK':
      case 'SMALL_ROCK':
        // Draw irregular rock shape
        ctx.beginPath();
        ctx.ellipse(0, 0, halfWidth, halfHeight, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Add rock texture lines
        ctx.strokeStyle = this.darkenColor(obstacle.color, 0.5);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-halfWidth * 0.5, -halfHeight * 0.3);
        ctx.lineTo(halfWidth * 0.3, halfHeight * 0.2);
        ctx.moveTo(-halfWidth * 0.2, halfHeight * 0.4);
        ctx.lineTo(halfWidth * 0.5, -halfHeight * 0.1);
        ctx.stroke();
        break;
        
      case 'DEBRIS':
        // Draw irregular debris pile
        ctx.fillRect(-halfWidth, -halfHeight, obstacle.width, obstacle.height);
        ctx.strokeRect(-halfWidth, -halfHeight, obstacle.width, obstacle.height);
        
        // Add debris details
        ctx.fillStyle = this.darkenColor(obstacle.color, 0.4);
        ctx.fillRect(-halfWidth * 0.5, -halfHeight * 0.5, obstacle.width * 0.3, obstacle.height * 0.3);
        ctx.fillRect(halfWidth * 0.2, halfHeight * 0.1, obstacle.width * 0.2, obstacle.height * 0.2);
        break;
        
      case 'CACTUS':
        // Draw cactus trunk
        ctx.fillRect(-halfWidth * 0.3, -halfHeight, obstacle.width * 0.6, obstacle.height);
        ctx.strokeRect(-halfWidth * 0.3, -halfHeight, obstacle.width * 0.6, obstacle.height);
        
        // Draw cactus arms
        ctx.fillRect(-halfWidth, -halfHeight * 0.3, obstacle.width * 0.4, obstacle.height * 0.2);
        ctx.fillRect(halfWidth * 0.6, -halfHeight * 0.6, obstacle.width * 0.4, obstacle.height * 0.2);
        break;
        
      default:
        // Default rectangular obstacle
        ctx.fillRect(-halfWidth, -halfHeight, obstacle.width, obstacle.height);
        ctx.strokeRect(-halfWidth, -halfHeight, obstacle.width, obstacle.height);
    }
  }
  
  /**
   * Darken a color by a factor
   */
  darkenColor(color, factor) {
    // Simple color darkening - in a full implementation you'd use proper color manipulation
    const hex = color.replace('#', '');
    const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - factor));
    const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - factor));
    const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - factor));
    
    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
  }
  
  /**
   * Pseudo-random number generator for consistent terrain
   */
  pseudoRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }
  
  /**
   * Clear chunk data and physics bodies
   */
  clearChunk(chunkX, physicsWorld = null) {
    const chunkKey = `chunk_${chunkX}`;
    const chunk = this.chunks.get(chunkKey);
    
    if (chunk && physicsWorld) {
      // Remove physics bodies
      chunk.terrainBodies.forEach(body => {
        Matter.World.remove(physicsWorld, body);
      });
      
      chunk.obstacleBodies.forEach(body => {
        Matter.World.remove(physicsWorld, body);
      });
    }
    
    // Remove chunk data
    this.chunks.delete(chunkKey);
    this.obstacles.delete(chunkKey);
    this.zombieSpawns.delete(chunkKey);
    
    console.log(`🏜️ Cleared chunk ${chunkX}`);
  }
  
  /**
   * Get generation statistics
   */
  getStats() {
    return {
      ...this.stats,
      chunksLoaded: this.chunks.size,
      totalObstacles: Array.from(this.obstacles.values()).reduce((sum, obs) => sum + obs.length, 0),
      averageGenerationTime: this.stats.generationTime / Math.max(1, this.stats.chunksGenerated)
    };
  }
  
  /**
   * Dispose of terrain generator
   */
  dispose(physicsWorld = null) {
    // Clear all chunks
    for (const chunkX of this.chunks.keys()) {
      const chunkIndex = parseInt(chunkX.split('_')[1]);
      this.clearChunk(chunkIndex, physicsWorld);
    }
    
    console.log('🏜️ Terrain generator disposed');
  }
}

export default TerrainGenerator2D;