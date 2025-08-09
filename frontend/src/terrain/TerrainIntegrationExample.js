/**
 * Terrain Integration Example
 * 
 * Demonstrates how to integrate the 2D terrain system with the game engine
 * for the zombie car game. Shows terrain generation, physics integration,
 * and rendering in a complete game context.
 */

import GameEngine from '../engine/GameEngine.js';
import TerrainManager from './TerrainManager.js';
import Camera from '../engine/Camera.js';
import Matter from 'matter-js';

class TerrainIntegrationExample {
  constructor() {
    this.gameEngine = null;
    this.terrainManager = null;
    this.camera = null;
    this.vehicle = null;
    
    // Demo state
    this.isRunning = false;
    this.cameraX = 0;
    this.vehicleSpeed = 200; // pixels per second
    
    console.log('🏜️ Terrain Integration Example initialized');
  }
  
  /**
   * Initialize the terrain integration example
   */
  async initialize() {
    try {
      // Initialize game engine
      this.gameEngine = new GameEngine();
      await this.gameEngine.initialize();
      
      // Initialize terrain manager
      this.terrainManager = new TerrainManager({
        chunkSize: 1000,
        loadDistance: 2000,
        unloadDistance: 3000,
        maxLoadedChunks: 8,
        seed: 12345
      });
      
      // Set physics world for terrain
      this.terrainManager.setPhysicsWorld(this.gameEngine.physics.world);
      
      // Initialize camera
      this.camera = this.gameEngine.camera;
      this.camera.debug = true; // Enable debug info
      
      // Create demo vehicle
      this.createDemoVehicle();
      
      // Register terrain manager as a system
      this.gameEngine.registerSystem('terrainManager', this.terrainManager);
      
      console.log('🏜️ Terrain integration example initialized successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to initialize terrain integration example:', error);
      return false;
    }
  }
  
  /**
   * Create a demo vehicle for testing terrain interaction
   */
  createDemoVehicle() {
    // Create vehicle physics body
    this.vehicle = Matter.Bodies.rectangle(
      100, // Start position X
      300, // Start position Y
      80,  // Width
      40,  // Height
      {
        density: 0.001,
        friction: 0.8,
        frictionAir: 0.01,
        restitution: 0.3,
        label: 'vehicle',
        render: { fillStyle: '#8b4513' }
      }
    );
    
    // Add vehicle to physics world
    Matter.World.add(this.gameEngine.physics.world, this.vehicle);
    
    console.log('🚗 Demo vehicle created');
  }
  
  /**
   * Start the terrain demo
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Override game engine update to include terrain demo logic
    const originalUpdate = this.gameEngine.update.bind(this.gameEngine);
    this.gameEngine.update = (deltaTime) => {
      originalUpdate(deltaTime);
      this.updateDemo(deltaTime);
    };
    
    // Override game engine render to include terrain rendering
    const originalRender = this.gameEngine.render.bind(this.gameEngine);
    this.gameEngine.render = () => {
      this.renderDemo();
    };
    
    // Start game engine
    this.gameEngine.start();
    
    console.log('🏜️ Terrain demo started');
  }
  
  /**
   * Stop the terrain demo
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    this.gameEngine.stop();
    
    console.log('🏜️ Terrain demo stopped');
  }
  
  /**
   * Update demo logic
   */
  updateDemo(deltaTime) {
    if (!this.vehicle) return;
    
    // Move vehicle forward automatically
    const forceX = this.vehicleSpeed * deltaTime * 0.001;
    Matter.Body.applyForce(this.vehicle, this.vehicle.position, { x: forceX, y: 0 });
    
    // Update camera to follow vehicle
    this.cameraX = this.vehicle.position.x;
    this.camera.followTarget = { position: { x: this.cameraX, y: this.vehicle.position.y } };
    
    // Update terrain manager
    this.terrainManager.update(this.cameraX, deltaTime);
    
    // Check terrain collisions
    this.checkTerrainCollisions();
    
    // Handle input for demo controls
    this.handleDemoInput();
  }
  
  /**
   * Check collisions between vehicle and terrain
   */
  checkTerrainCollisions() {
    const collisions = this.terrainManager.checkCollision(
      this.vehicle.position.x,
      this.vehicle.position.y,
      80, // Vehicle width
      40  // Vehicle height
    );
    
    // Handle terrain collisions
    for (const collision of collisions) {
      if (collision.type === 'terrain') {
        // Adjust vehicle position to stay on terrain
        const adjustment = collision.penetration * 0.1;
        Matter.Body.translate(this.vehicle, { x: 0, y: -adjustment });
      } else if (collision.type === 'obstacle') {
        // Handle obstacle collision
        this.handleObstacleCollision(collision);
      }
    }
  }
  
  /**
   * Handle collision with obstacle
   */
  handleObstacleCollision(collision) {
    const obstacle = collision.obstacle;
    
    // Damage obstacle
    const damage = 25;
    const destroyed = this.terrainManager.damageObstacle(obstacle.id, damage);
    
    if (destroyed) {
      console.log(`🏜️ Destroyed obstacle: ${obstacle.type}`);
    } else {
      console.log(`🏜️ Damaged obstacle: ${obstacle.type} (${obstacle.health}/${obstacle.maxHealth})`);
    }
    
    // Apply force to vehicle (bounce back)
    const bounceForce = { x: -collision.normal.x * 0.01, y: -collision.normal.y * 0.01 };
    Matter.Body.applyForce(this.vehicle, this.vehicle.position, bounceForce);
  }
  
  /**
   * Handle demo input controls
   */
  handleDemoInput() {
    // Speed up with arrow up
    if (this.gameEngine.isKeyPressed('ArrowUp')) {
      this.vehicleSpeed = Math.min(400, this.vehicleSpeed + 5);
    }
    
    // Slow down with arrow down
    if (this.gameEngine.isKeyPressed('ArrowDown')) {
      this.vehicleSpeed = Math.max(50, this.vehicleSpeed - 5);
    }
    
    // Jump with space
    if (this.gameEngine.isKeyPressed('Space')) {
      Matter.Body.applyForce(this.vehicle, this.vehicle.position, { x: 0, y: -0.02 });
    }
    
    // Toggle debug with F3
    if (this.gameEngine.isKeyPressed('F3')) {
      this.camera.debug = !this.camera.debug;
    }
  }
  
  /**
   * Render the demo
   */
  renderDemo() {
    const ctx = this.gameEngine.ctx;
    
    // Clear canvas
    ctx.clearRect(0, 0, this.gameEngine.canvas.width, this.gameEngine.canvas.height);
    
    // Render background
    this.renderBackground(ctx);
    
    // Save context for camera transformations
    ctx.save();
    
    // Apply camera transformations
    this.camera.applyTransform(ctx);
    
    // Render terrain
    this.terrainManager.render(ctx, this.camera);
    
    // Render vehicle
    this.renderVehicle(ctx);
    
    // Render physics debug (if enabled)
    if (this.camera.debug) {
      this.renderPhysicsDebug(ctx);
    }
    
    // Restore context
    ctx.restore();
    
    // Render UI
    this.renderUI(ctx);
  }
  
  /**
   * Render desert background
   */
  renderBackground(ctx) {
    // Create desert gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, this.gameEngine.canvas.height);
    gradient.addColorStop(0, '#ff8c42'); // Orange sky
    gradient.addColorStop(0.6, '#d4a574'); // Desert sand
    gradient.addColorStop(1, '#c49464'); // Darker sand
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.gameEngine.canvas.width, this.gameEngine.canvas.height);
    
    // Add some atmospheric effects
    this.renderAtmosphericEffects(ctx);
  }
  
  /**
   * Render atmospheric effects
   */
  renderAtmosphericEffects(ctx) {
    // Simple dust particles
    ctx.fillStyle = 'rgba(212, 165, 116, 0.3)';
    
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
      const x = (this.cameraX + Math.sin(Date.now() * 0.001 + i) * 200) % this.gameEngine.canvas.width;
      const y = 100 + Math.cos(Date.now() * 0.0008 + i) * 50;
      const size = 2 + Math.sin(Date.now() * 0.002 + i) * 2;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  /**
   * Render the demo vehicle
   */
  renderVehicle(ctx) {
    if (!this.vehicle) return;
    
    ctx.save();
    
    // Apply vehicle transformations
    ctx.translate(this.vehicle.position.x, this.vehicle.position.y);
    ctx.rotate(this.vehicle.angle);
    
    // Draw vehicle body
    ctx.fillStyle = '#8b4513';
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    
    ctx.fillRect(-40, -20, 80, 40);
    ctx.strokeRect(-40, -20, 80, 40);
    
    // Draw vehicle details
    ctx.fillStyle = '#333333';
    ctx.fillRect(-30, -15, 60, 30); // Windows
    
    // Draw wheels
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.arc(-25, 20, 8, 0, Math.PI * 2);
    ctx.arc(25, 20, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
  
  /**
   * Render physics debug information
   */
  renderPhysicsDebug(ctx) {
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    
    // Draw physics bodies
    for (const body of this.gameEngine.physics.world.bodies) {
      if (body.label === 'terrain') {
        ctx.strokeStyle = '#0000ff';
      } else if (body.label === 'obstacle') {
        ctx.strokeStyle = '#ff0000';
      } else if (body.label === 'vehicle') {
        ctx.strokeStyle = '#00ff00';
      }
      
      // Draw body bounds
      const vertices = body.vertices;
      if (vertices.length > 0) {
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        
        for (let i = 1; i < vertices.length; i++) {
          ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        
        ctx.closePath();
        ctx.stroke();
      }
    }
  }
  
  /**
   * Render UI elements
   */
  renderUI(ctx) {
    // Demo controls
    ctx.fillStyle = 'rgba(42, 42, 42, 0.8)';
    ctx.fillRect(10, 10, 300, 140);
    
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 300, 140);
    
    ctx.fillStyle = '#d4a574';
    ctx.font = '14px "Courier New", monospace';
    ctx.textAlign = 'left';
    
    let y = 30;
    ctx.fillText('TERRAIN DEMO CONTROLS:', 20, y); y += 20;
    ctx.fillText('↑/↓ - Adjust Speed', 20, y); y += 15;
    ctx.fillText('SPACE - Jump', 20, y); y += 15;
    ctx.fillText('F3 - Toggle Debug', 20, y); y += 15;
    ctx.fillText(`Speed: ${this.vehicleSpeed.toFixed(0)} px/s`, 20, y); y += 15;
    ctx.fillText(`Position: ${this.cameraX.toFixed(0)}`, 20, y);
    
    // Terrain stats
    const stats = this.terrainManager.getStats();
    
    ctx.fillStyle = 'rgba(42, 42, 42, 0.8)';
    ctx.fillRect(this.gameEngine.canvas.width - 250, 10, 240, 120);
    
    ctx.strokeStyle = '#8b4513';
    ctx.strokeRect(this.gameEngine.canvas.width - 250, 10, 240, 120);
    
    ctx.fillStyle = '#d4a574';
    
    y = 30;
    ctx.textAlign = 'left';
    ctx.fillText('TERRAIN STATS:', this.gameEngine.canvas.width - 240, y); y += 20;
    ctx.fillText(`Loaded Chunks: ${stats.loadedChunks}`, this.gameEngine.canvas.width - 240, y); y += 15;
    ctx.fillText(`Total Generated: ${stats.chunksGenerated}`, this.gameEngine.canvas.width - 240, y); y += 15;
    ctx.fillText(`Total Obstacles: ${stats.totalObstacles}`, this.gameEngine.canvas.width - 240, y); y += 15;
    ctx.fillText(`Avg Gen Time: ${stats.averageGenerationTime.toFixed(2)}ms`, this.gameEngine.canvas.width - 240, y); y += 15;
    ctx.fillText(`Physics Bodies: ${this.gameEngine.physics.world.bodies.length}`, this.gameEngine.canvas.width - 240, y);
  }
  
  /**
   * Dispose of the demo
   */
  dispose() {
    this.stop();
    
    if (this.terrainManager) {
      this.terrainManager.dispose();
    }
    
    if (this.gameEngine) {
      this.gameEngine.dispose();
    }
    
    console.log('🏜️ Terrain integration example disposed');
  }
}

// Export for use in other modules
export default TerrainIntegrationExample;

// Auto-start demo if this file is loaded directly
if (typeof window !== 'undefined' && window.location.pathname.includes('terrain-demo')) {
  document.addEventListener('DOMContentLoaded', async () => {
    const demo = new TerrainIntegrationExample();
    
    if (await demo.initialize()) {
      demo.start();
      
      // Add cleanup on page unload
      window.addEventListener('beforeunload', () => {
        demo.dispose();
      });
    }
  });
}