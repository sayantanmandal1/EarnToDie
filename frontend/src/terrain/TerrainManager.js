/**
 * Terrain Manager for 2D Desert Terrain
 * 
 * Manages terrain chunks for efficient rendering and physics simulation
 * in the side-scrolling zombie car game. Handles loading/unloading of
 * terrain chunks based on camera position.
 */

import Matter from 'matter-js';
import TerrainGenerator2D from './TerrainGenerator2D.js';

class TerrainManager {
  constructor(options = {}) {
    this.options = {
      chunkSize: options.chunkSize || 1000,
      loadDistance: options.loadDistance || 2000, // Distance ahead to load chunks
      unloadDistance: options.unloadDistance || 3000, // Distance behind to unload chunks
      maxLoadedChunks: options.maxLoadedChunks || 10,
      ...options
    };
    
    // Initialize terrain generator
    this.terrainGenerator = new TerrainGenerator2D({
      chunkSize: this.options.chunkSize,
      ...options
    });
    
    // Chunk management
    this.loadedChunks = new Map();
    this.lastCameraX = 0;
    this.physicsWorld = null;
    
    // Performance tracking
    this.stats = {
      chunksLoaded: 0,
      chunksUnloaded: 0,
      totalLoadTime: 0,
      totalUnloadTime: 0
    };
    
    console.log('🏜️ Terrain Manager initialized');
  }
  
  /**
   * Set physics world for terrain physics bodies
   */
  setPhysicsWorld(physicsWorld) {
    this.physicsWorld = physicsWorld;
  }
  
  /**
   * Update terrain based on camera position
   */
  update(cameraX, deltaTime) {
    const cameraMoved = Math.abs(cameraX - this.lastCameraX) > 100;
    
    if (cameraMoved || this.loadedChunks.size === 0) {
      this.updateChunks(cameraX);
      this.lastCameraX = cameraX;
    }
  }
  
  /**
   * Update loaded chunks based on camera position
   */
  updateChunks(cameraX) {
    const startTime = performance.now();
    
    // Calculate chunk range to load
    const currentChunk = Math.floor(cameraX / this.options.chunkSize);
    const loadRange = Math.ceil(this.options.loadDistance / this.options.chunkSize);
    const unloadRange = Math.ceil(this.options.unloadDistance / this.options.chunkSize);
    
    const minLoadChunk = currentChunk - 1; // Load one chunk behind
    const maxLoadChunk = currentChunk + loadRange;
    
    // Load new chunks
    for (let chunkX = minLoadChunk; chunkX <= maxLoadChunk; chunkX++) {
      this.loadChunk(chunkX);
    }
    
    // Unload distant chunks
    const chunksToUnload = [];
    for (const [chunkKey, chunk] of this.loadedChunks) {
      const chunkX = chunk.x;
      const distance = Math.abs(chunkX - currentChunk);
      
      if (distance > unloadRange) {
        chunksToUnload.push(chunkX);
      }
    }
    
    for (const chunkX of chunksToUnload) {
      this.unloadChunk(chunkX);
    }
    
    // Enforce maximum loaded chunks limit
    this.enforceChunkLimit();
    
    const updateTime = performance.now() - startTime;
    if (updateTime > 5) { // Log if update takes more than 5ms
      console.log(`🏜️ Chunk update took ${updateTime.toFixed(2)}ms`);
    }
  }
  
  /**
   * Load a terrain chunk
   */
  loadChunk(chunkX) {
    const chunkKey = `chunk_${chunkX}`;
    
    // Skip if already loaded
    if (this.loadedChunks.has(chunkKey)) {
      return this.loadedChunks.get(chunkKey);
    }
    
    const startTime = performance.now();
    
    // Generate chunk using terrain generator
    const chunk = this.terrainGenerator.generateChunk(chunkX, this.physicsWorld);
    
    // Store loaded chunk
    this.loadedChunks.set(chunkKey, chunk);
    
    const loadTime = performance.now() - startTime;
    this.stats.chunksLoaded++;
    this.stats.totalLoadTime += loadTime;
    
    console.log(`🏜️ Loaded chunk ${chunkX} in ${loadTime.toFixed(2)}ms`);
    
    return chunk;
  }
  
  /**
   * Unload a terrain chunk
   */
  unloadChunk(chunkX) {
    const chunkKey = `chunk_${chunkX}`;
    const chunk = this.loadedChunks.get(chunkKey);
    
    if (!chunk) return;
    
    const startTime = performance.now();
    
    // Remove physics bodies if physics world exists
    if (this.physicsWorld && chunk.terrainBodies) {
      chunk.terrainBodies.forEach(body => {
        try {
          if (this.physicsWorld.bodies.includes(body)) {
            Matter.World.remove(this.physicsWorld, body);
          }
        } catch (error) {
          console.warn(`Failed to remove terrain body:`, error);
        }
      });
    }
    
    if (this.physicsWorld && chunk.obstacleBodies) {
      chunk.obstacleBodies.forEach(body => {
        try {
          if (this.physicsWorld.bodies.includes(body)) {
            Matter.World.remove(this.physicsWorld, body);
          }
        } catch (error) {
          console.warn(`Failed to remove obstacle body:`, error);
        }
      });
    }
    
    // Remove from loaded chunks
    this.loadedChunks.delete(chunkKey);
    
    const unloadTime = performance.now() - startTime;
    this.stats.chunksUnloaded++;
    this.stats.totalUnloadTime += unloadTime;
    
    console.log(`🏜️ Unloaded chunk ${chunkX} in ${unloadTime.toFixed(2)}ms`);
  }
  
  /**
   * Enforce maximum loaded chunks limit
   */
  enforceChunkLimit() {
    if (this.loadedChunks.size <= this.options.maxLoadedChunks) {
      return;
    }
    
    // Find oldest chunks to unload
    const chunks = Array.from(this.loadedChunks.values());
    chunks.sort((a, b) => a.generated - b.generated);
    
    const chunksToRemove = chunks.slice(0, this.loadedChunks.size - this.options.maxLoadedChunks);
    
    for (const chunk of chunksToRemove) {
      this.unloadChunk(chunk.x);
    }
  }
  
  /**
   * Get terrain height at world position
   */
  getHeightAtPosition(worldX) {
    return this.terrainGenerator.getHeightAtPosition(worldX);
  }
  
  /**
   * Check collision with terrain and obstacles
   */
  checkCollision(vehicleX, vehicleY, vehicleWidth, vehicleHeight) {
    return this.terrainGenerator.checkTerrainCollision(
      vehicleX, vehicleY, vehicleWidth, vehicleHeight
    );
  }
  
  /**
   * Damage obstacle by ID
   */
  damageObstacle(obstacleId, damage) {
    return this.terrainGenerator.damageObstacle(obstacleId, damage);
  }
  
  /**
   * Get obstacles in range
   */
  getObstaclesInRange(centerX, range) {
    return this.terrainGenerator.getObstaclesInRange(centerX, range);
  }
  
  /**
   * Get zombie spawn points in range
   */
  getZombieSpawnsInRange(centerX, range) {
    return this.terrainGenerator.getZombieSpawnsInRange(centerX, range);
  }
  
  /**
   * Mark zombie spawn as used
   */
  useZombieSpawn(spawnId) {
    for (const [chunkKey, spawns] of this.terrainGenerator.zombieSpawns) {
      const spawn = spawns.find(s => s.id === spawnId);
      if (spawn) {
        spawn.used = true;
        return true;
      }
    }
    return false;
  }
  
  /**
   * Render visible terrain chunks
   */
  render(ctx, camera) {
    if (!camera) return;
    
    // Calculate visible chunk range
    const leftX = camera.x - camera.canvas.width / 2;
    const rightX = camera.x + camera.canvas.width / 2;
    
    const leftChunk = Math.floor(leftX / this.options.chunkSize);
    const rightChunk = Math.floor(rightX / this.options.chunkSize);
    
    // Render visible chunks
    for (let chunkX = leftChunk; chunkX <= rightChunk; chunkX++) {
      const chunkKey = `chunk_${chunkX}`;
      const chunk = this.loadedChunks.get(chunkKey);
      
      if (chunk) {
        this.renderChunk(ctx, chunk, camera);
      }
    }
    
    // Render debug info if enabled
    if (camera.debug) {
      this.renderDebugInfo(ctx, camera);
    }
  }
  
  /**
   * Render a single terrain chunk
   */
  renderChunk(ctx, chunk, camera) {
    ctx.save();
    
    // Render terrain surface
    this.renderTerrainSurface(ctx, chunk.heightMap, camera);
    
    // Render obstacles
    this.renderObstacles(ctx, chunk.obstacles, camera);
    
    // Render zombie spawn points (debug)
    if (camera.debug) {
      this.renderZombieSpawns(ctx, chunk.zombieSpawns, camera);
    }
    
    ctx.restore();
  }
  
  /**
   * Render terrain surface
   */
  renderTerrainSurface(ctx, heightMap, camera) {
    if (heightMap.length < 2) return;
    
    ctx.beginPath();
    ctx.moveTo(heightMap[0].x, heightMap[0].y);
    
    // Draw terrain outline
    for (let i = 1; i < heightMap.length; i++) {
      ctx.lineTo(heightMap[i].x, heightMap[i].y);
    }
    
    // Close path for fill
    const lastPoint = heightMap[heightMap.length - 1];
    const firstPoint = heightMap[0];
    ctx.lineTo(lastPoint.x, camera.canvas.height + 200);
    ctx.lineTo(firstPoint.x, camera.canvas.height + 200);
    ctx.closePath();
    
    // Fill with desert gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, camera.canvas.height);
    gradient.addColorStop(0, '#d4a574'); // Desert sand
    gradient.addColorStop(0.7, '#c49464'); // Darker sand
    gradient.addColorStop(1, '#b48454'); // Deep sand
    
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw terrain outline
    ctx.strokeStyle = '#a0522d';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  
  /**
   * Render obstacles
   */
  renderObstacles(ctx, obstacles, camera) {
    for (const obstacle of obstacles) {
      if (obstacle.destroyed) continue;
      
      // Check if obstacle is visible
      const screenX = obstacle.x - camera.x + camera.canvas.width / 2;
      if (screenX < -obstacle.width || screenX > camera.canvas.width + obstacle.width) {
        continue;
      }
      
      ctx.save();
      
      // Apply obstacle transformations
      ctx.translate(obstacle.x, obstacle.y);
      ctx.rotate(obstacle.rotation);
      ctx.scale(obstacle.scale, obstacle.scale);
      
      // Render obstacle based on type
      this.renderObstacleType(ctx, obstacle);
      
      // Render health bar if damaged
      if (obstacle.health < obstacle.maxHealth) {
        this.renderObstacleHealthBar(ctx, obstacle);
      }
      
      ctx.restore();
    }
  }
  
  /**
   * Render specific obstacle type
   */
  renderObstacleType(ctx, obstacle) {
    const halfWidth = obstacle.width / 2;
    const halfHeight = obstacle.height / 2;
    
    // Set colors based on health
    const healthRatio = obstacle.health / obstacle.maxHealth;
    const baseColor = obstacle.color;
    const damageColor = this.interpolateColor(baseColor, '#8b0000', 1 - healthRatio);
    
    ctx.fillStyle = damageColor;
    ctx.strokeStyle = this.darkenColor(damageColor, 0.3);
    ctx.lineWidth = 2;
    
    switch (obstacle.type) {
      case 'WRECKED_CAR':
        this.renderWreckedCar(ctx, obstacle, halfWidth, halfHeight);
        break;
        
      case 'LARGE_ROCK':
      case 'SMALL_ROCK':
        this.renderRock(ctx, obstacle, halfWidth, halfHeight);
        break;
        
      case 'DEBRIS':
        this.renderDebris(ctx, obstacle, halfWidth, halfHeight);
        break;
        
      case 'CACTUS':
        this.renderCactus(ctx, obstacle, halfWidth, halfHeight);
        break;
        
      default:
        // Default rectangular obstacle
        ctx.fillRect(-halfWidth, -halfHeight, obstacle.width, obstacle.height);
        ctx.strokeRect(-halfWidth, -halfHeight, obstacle.width, obstacle.height);
    }
  }
  
  /**
   * Render wrecked car obstacle
   */
  renderWreckedCar(ctx, obstacle, halfWidth, halfHeight) {
    // Car body
    ctx.fillRect(-halfWidth, -halfHeight, obstacle.width, obstacle.height);
    ctx.strokeRect(-halfWidth, -halfHeight, obstacle.width, obstacle.height);
    
    // Broken windows
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-halfWidth + 8, -halfHeight + 4, obstacle.width - 16, obstacle.height - 8);
    
    // Damage details
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-halfWidth + 10, -halfHeight);
    ctx.lineTo(-halfWidth + 20, halfHeight);
    ctx.moveTo(halfWidth - 15, -halfHeight + 5);
    ctx.lineTo(halfWidth - 5, halfHeight - 3);
    ctx.stroke();
  }
  
  /**
   * Render rock obstacle
   */
  renderRock(ctx, obstacle, halfWidth, halfHeight) {
    // Main rock shape
    ctx.beginPath();
    ctx.ellipse(0, 0, halfWidth, halfHeight, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Rock texture
    ctx.strokeStyle = this.darkenColor(obstacle.color, 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-halfWidth * 0.6, -halfHeight * 0.3);
    ctx.lineTo(halfWidth * 0.4, halfHeight * 0.2);
    ctx.moveTo(-halfWidth * 0.3, halfHeight * 0.5);
    ctx.lineTo(halfWidth * 0.6, -halfHeight * 0.2);
    ctx.moveTo(-halfWidth * 0.1, -halfHeight * 0.7);
    ctx.lineTo(halfWidth * 0.2, halfHeight * 0.6);
    ctx.stroke();
  }
  
  /**
   * Render debris obstacle
   */
  renderDebris(ctx, obstacle, halfWidth, halfHeight) {
    // Main debris pile
    ctx.fillRect(-halfWidth, -halfHeight, obstacle.width, obstacle.height);
    ctx.strokeRect(-halfWidth, -halfHeight, obstacle.width, obstacle.height);
    
    // Scattered pieces
    ctx.fillStyle = this.darkenColor(obstacle.color, 0.3);
    const pieceCount = 3 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < pieceCount; i++) {
      const pieceX = (Math.random() - 0.5) * obstacle.width * 0.8;
      const pieceY = (Math.random() - 0.5) * obstacle.height * 0.8;
      const pieceSize = 3 + Math.random() * 8;
      
      ctx.fillRect(pieceX - pieceSize/2, pieceY - pieceSize/2, pieceSize, pieceSize);
    }
  }
  
  /**
   * Render cactus obstacle
   */
  renderCactus(ctx, obstacle, halfWidth, halfHeight) {
    // Main trunk
    ctx.fillRect(-halfWidth * 0.3, -halfHeight, obstacle.width * 0.6, obstacle.height);
    ctx.strokeRect(-halfWidth * 0.3, -halfHeight, obstacle.width * 0.6, obstacle.height);
    
    // Side arms
    ctx.fillRect(-halfWidth, -halfHeight * 0.4, obstacle.width * 0.5, obstacle.height * 0.15);
    ctx.fillRect(halfWidth * 0.5, -halfHeight * 0.7, obstacle.width * 0.5, obstacle.height * 0.15);
    
    // Spines
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 1;
    const spineCount = 8;
    
    for (let i = 0; i < spineCount; i++) {
      const spineX = (Math.random() - 0.5) * obstacle.width * 0.5;
      const spineY = (Math.random() - 0.5) * obstacle.height * 0.8;
      
      ctx.beginPath();
      ctx.moveTo(spineX, spineY);
      ctx.lineTo(spineX + (Math.random() - 0.5) * 6, spineY - 3 - Math.random() * 4);
      ctx.stroke();
    }
  }
  
  /**
   * Render obstacle health bar
   */
  renderObstacleHealthBar(ctx, obstacle) {
    const barWidth = obstacle.width * 0.8;
    const barHeight = 4;
    const barY = -obstacle.height / 2 - 10;
    
    // Background
    ctx.fillStyle = '#333333';
    ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);
    
    // Health bar
    const healthRatio = obstacle.health / obstacle.maxHealth;
    const healthColor = healthRatio > 0.5 ? '#00ff00' : healthRatio > 0.25 ? '#ffff00' : '#ff0000';
    
    ctx.fillStyle = healthColor;
    ctx.fillRect(-barWidth / 2, barY, barWidth * healthRatio, barHeight);
    
    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight);
  }
  
  /**
   * Render zombie spawn points (debug)
   */
  renderZombieSpawns(ctx, spawns, camera) {
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 1;
    
    for (const spawn of spawns) {
      if (spawn.used) continue;
      
      ctx.beginPath();
      ctx.arc(spawn.x, spawn.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // Spawn ID
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(spawn.id.split('_').pop(), spawn.x, spawn.y - 15);
    }
  }
  
  /**
   * Render debug information
   */
  renderDebugInfo(ctx, camera) {
    const currentChunk = Math.floor(camera.x / this.options.chunkSize);
    const stats = this.getStats();
    
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for UI
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 250, 120);
    
    ctx.fillStyle = '#00ff00';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    
    let y = 25;
    ctx.fillText(`Current Chunk: ${currentChunk}`, 15, y); y += 15;
    ctx.fillText(`Loaded Chunks: ${this.loadedChunks.size}`, 15, y); y += 15;
    ctx.fillText(`Total Loaded: ${stats.chunksLoaded}`, 15, y); y += 15;
    ctx.fillText(`Total Unloaded: ${stats.chunksUnloaded}`, 15, y); y += 15;
    ctx.fillText(`Avg Load Time: ${stats.averageLoadTime.toFixed(2)}ms`, 15, y); y += 15;
    ctx.fillText(`Avg Unload Time: ${stats.averageUnloadTime.toFixed(2)}ms`, 15, y); y += 15;
    ctx.fillText(`Total Obstacles: ${stats.totalObstacles}`, 15, y); y += 15;
    
    ctx.restore();
  }
  
  /**
   * Interpolate between two colors
   */
  interpolateColor(color1, color2, factor) {
    // Simple color interpolation - in production you'd use proper color space
    return color1; // Simplified for now
  }
  
  /**
   * Darken a color by a factor
   */
  darkenColor(color, factor) {
    // Simple color darkening
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - factor));
      const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - factor));
      const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - factor));
      
      return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
    }
    
    return color;
  }
  
  /**
   * Get terrain manager statistics
   */
  getStats() {
    const terrainStats = this.terrainGenerator.getStats();
    
    return {
      ...this.stats,
      ...terrainStats,
      loadedChunks: this.loadedChunks.size,
      averageLoadTime: this.stats.totalLoadTime / Math.max(1, this.stats.chunksLoaded),
      averageUnloadTime: this.stats.totalUnloadTime / Math.max(1, this.stats.chunksUnloaded)
    };
  }
  
  /**
   * Dispose of terrain manager
   */
  dispose() {
    // Unload all chunks
    const chunkKeys = Array.from(this.loadedChunks.keys());
    for (const chunkKey of chunkKeys) {
      const chunkX = parseInt(chunkKey.split('_')[1]);
      this.unloadChunk(chunkX);
    }
    
    // Dispose terrain generator
    if (this.terrainGenerator) {
      this.terrainGenerator.dispose(this.physicsWorld);
    }
    
    console.log('🏜️ Terrain Manager disposed');
  }
}

export default TerrainManager;