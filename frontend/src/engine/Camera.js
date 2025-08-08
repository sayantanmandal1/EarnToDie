/**
 * Camera System for 2D Side-Scrolling Desert Survival Game
 * Handles fixed side-view perspective with vehicle following and airborne zoom
 */

class Camera {
  constructor(canvas) {
    this.canvas = canvas;
    this.x = 0;
    this.y = 0;
    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.followTarget = null;
    this.smoothing = 0.1;
    this.zoomSmoothness = 0.05;
    
    // Camera bounds and constraints
    this.minZoom = 0.5;
    this.maxZoom = 2.0;
    this.airborneZoom = 0.8;
    this.groundZoom = 1.0;
    
    // Offset for better vehicle positioning
    this.offsetX = -200; // Keep vehicle slightly left of center
    this.offsetY = 0;
    
    // Shake effect for impacts
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    
    console.log('Camera system initialized');
  }
  
  /**
   * Set the target for the camera to follow
   */
  followVehicle(vehicle) {
    this.followTarget = vehicle;
    console.log('Camera now following vehicle');
  }
  
  /**
   * Update camera position and zoom
   */
  update(deltaTime) {
    if (this.followTarget) {
      this.updateFollowing(deltaTime);
    }
    
    this.updateZoom(deltaTime);
    this.updateShake(deltaTime);
  }
  
  /**
   * Update camera following behavior
   */
  updateFollowing(deltaTime) {
    // Calculate target position
    const targetX = this.followTarget.position.x + this.offsetX - this.canvas.width / 2;
    const targetY = this.followTarget.position.y + this.offsetY - this.canvas.height / 2;
    
    // Smooth camera movement
    this.x += (targetX - this.x) * this.smoothing;
    this.y += (targetY - this.y) * this.smoothing;
    
    // Determine if vehicle is airborne for zoom adjustment
    if (this.followTarget.isAirborne) {
      this.targetZoom = this.airborneZoom;
    } else {
      this.targetZoom = this.groundZoom;
    }
    
    // Keep camera within reasonable bounds (prevent going too far up/down)
    const maxY = -100; // Don't go too high above ground
    const minY = 200;  // Don't go too far below ground
    this.y = Math.max(minY, Math.min(maxY, this.y));
  }
  
  /**
   * Update camera zoom
   */
  updateZoom(deltaTime) {
    // Smooth zoom transition
    this.zoom += (this.targetZoom - this.zoom) * this.zoomSmoothness;
    
    // Clamp zoom to bounds
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));
  }
  
  /**
   * Update screen shake effect
   */
  updateShake(deltaTime) {
    if (this.shakeDuration > 0) {
      this.shakeDuration -= deltaTime;
      
      // Generate random shake offset
      const intensity = this.shakeIntensity * (this.shakeDuration / 1000);
      this.shakeX = (Math.random() - 0.5) * intensity;
      this.shakeY = (Math.random() - 0.5) * intensity;
      
      if (this.shakeDuration <= 0) {
        this.shakeX = 0;
        this.shakeY = 0;
        this.shakeIntensity = 0;
      }
    }
  }
  
  /**
   * Apply camera transformations to the rendering context
   */
  applyTransform(ctx) {
    // Save the current transformation matrix
    ctx.save();
    
    // Apply zoom (scale from center)
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    ctx.translate(centerX, centerY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-centerX, -centerY);
    
    // Apply camera position (with shake)
    ctx.translate(-this.x + this.shakeX, -this.y + this.shakeY);
  }
  
  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(worldX, worldY) {
    const screenX = (worldX - this.x + this.shakeX) * this.zoom;
    const screenY = (worldY - this.y + this.shakeY) * this.zoom;
    
    return { x: screenX, y: screenY };
  }
  
  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(screenX, screenY) {
    const worldX = (screenX / this.zoom) + this.x - this.shakeX;
    const worldY = (screenY / this.zoom) + this.y - this.shakeY;
    
    return { x: worldX, y: worldY };
  }
  
  /**
   * Check if a world position is visible on screen
   */
  isVisible(worldX, worldY, margin = 100) {
    const screen = this.worldToScreen(worldX, worldY);
    
    return screen.x >= -margin && 
           screen.x <= this.canvas.width + margin &&
           screen.y >= -margin && 
           screen.y <= this.canvas.height + margin;
  }
  
  /**
   * Check if a rectangular area is visible on screen
   */
  isRectVisible(worldX, worldY, width, height, margin = 100) {
    const topLeft = this.worldToScreen(worldX, worldY);
    const bottomRight = this.worldToScreen(worldX + width, worldY + height);
    
    return !(bottomRight.x < -margin || 
             topLeft.x > this.canvas.width + margin ||
             bottomRight.y < -margin || 
             topLeft.y > this.canvas.height + margin);
  }
  
  /**
   * Get the current view bounds in world coordinates
   */
  getViewBounds() {
    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(this.canvas.width, this.canvas.height);
    
    return {
      left: topLeft.x,
      top: topLeft.y,
      right: bottomRight.x,
      bottom: bottomRight.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y
    };
  }
  
  /**
   * Set camera position directly
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }
  
  /**
   * Set camera zoom directly
   */
  setZoom(zoom) {
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    this.targetZoom = this.zoom;
  }
  
  /**
   * Trigger screen shake effect
   */
  shake(intensity = 10, duration = 300) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
  }
  
  /**
   * Focus camera on a specific world position
   */
  focusOn(worldX, worldY, zoom = null) {
    this.x = worldX - this.canvas.width / 2;
    this.y = worldY - this.canvas.height / 2;
    
    if (zoom !== null) {
      this.setZoom(zoom);
    }
  }
  
  /**
   * Smoothly move camera to a position
   */
  moveTo(worldX, worldY, zoom = null) {
    // This will be smoothly interpolated in the update loop
    this.followTarget = null; // Stop following any target
    
    // Create a temporary target object
    this.followTarget = {
      position: { x: worldX, y: worldY },
      isAirborne: false
    };
    
    if (zoom !== null) {
      this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    }
  }
  
  /**
   * Stop following any target
   */
  stopFollowing() {
    this.followTarget = null;
  }
  
  /**
   * Reset camera to default state
   */
  reset() {
    this.x = 0;
    this.y = 0;
    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.followTarget = null;
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    
    console.log('Camera reset to default state');
  }
  
  /**
   * Get camera information for debugging
   */
  getDebugInfo() {
    return {
      position: { x: this.x, y: this.y },
      zoom: this.zoom,
      targetZoom: this.targetZoom,
      hasTarget: !!this.followTarget,
      shake: { intensity: this.shakeIntensity, duration: this.shakeDuration },
      viewBounds: this.getViewBounds()
    };
  }
  
  /**
   * Render camera debug information
   */
  renderDebug(ctx) {
    const info = this.getDebugInfo();
    
    ctx.save();
    ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.font = '12px "Courier New", monospace';
    ctx.textAlign = 'left';
    
    let y = 20;
    const x = 10;
    
    ctx.fillText(`Camera X: ${info.position.x.toFixed(1)}`, x, y);
    y += 15;
    ctx.fillText(`Camera Y: ${info.position.y.toFixed(1)}`, x, y);
    y += 15;
    ctx.fillText(`Zoom: ${info.zoom.toFixed(2)}`, x, y);
    y += 15;
    ctx.fillText(`Target Zoom: ${info.targetZoom.toFixed(2)}`, x, y);
    y += 15;
    ctx.fillText(`Following: ${info.hasTarget ? 'Yes' : 'No'}`, x, y);
    y += 15;
    ctx.fillText(`Shake: ${info.shake.intensity.toFixed(1)}`, x, y);
    
    ctx.restore();
  }
}

export default Camera;