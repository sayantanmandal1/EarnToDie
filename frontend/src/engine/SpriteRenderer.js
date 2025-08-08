/**
 * Sprite Rendering System for 2D Desert Survival Game
 * Handles sprite rendering, animations, and visual effects
 */

class SpriteRenderer {
  constructor() {
    this.sprites = new Map();
    this.animations = new Map();
    this.effects = new Map();
    
    // Animation frame tracking
    this.animationTime = 0;
    
    // Rendering statistics
    this.spritesRendered = 0;
    this.effectsRendered = 0;
    
    console.log('Sprite rendering system initialized');
  }
  
  /**
   * Register a sprite for rendering
   */
  registerSprite(id, spriteData) {
    this.sprites.set(id, {
      image: spriteData.image,
      x: spriteData.x || 0,
      y: spriteData.y || 0,
      width: spriteData.width || spriteData.image.width,
      height: spriteData.height || spriteData.image.height,
      rotation: spriteData.rotation || 0,
      scaleX: spriteData.scaleX || 1,
      scaleY: spriteData.scaleY || 1,
      alpha: spriteData.alpha || 1,
      visible: spriteData.visible !== false,
      flipX: spriteData.flipX || false,
      flipY: spriteData.flipY || false,
      tint: spriteData.tint || null,
      layer: spriteData.layer || 0
    });
    
    return id;
  }
  
  /**
   * Register an animated sprite
   */
  registerAnimatedSprite(id, animationData) {
    this.animations.set(id, {
      spriteSheet: animationData.spriteSheet,
      frameWidth: animationData.frameWidth,
      frameHeight: animationData.frameHeight,
      frames: animationData.frames || [],
      currentFrame: 0,
      frameTime: animationData.frameTime || 100, // ms per frame
      lastFrameTime: 0,
      loop: animationData.loop !== false,
      playing: animationData.playing !== false,
      x: animationData.x || 0,
      y: animationData.y || 0,
      rotation: animationData.rotation || 0,
      scaleX: animationData.scaleX || 1,
      scaleY: animationData.scaleY || 1,
      alpha: animationData.alpha || 1,
      visible: animationData.visible !== false,
      flipX: animationData.flipX || false,
      flipY: animationData.flipY || false,
      tint: animationData.tint || null,
      layer: animationData.layer || 0,
      onComplete: animationData.onComplete || null
    });
    
    return id;
  }
  
  /**
   * Register a visual effect
   */
  registerEffect(id, effectData) {
    this.effects.set(id, {
      type: effectData.type, // 'particle', 'explosion', 'dust', etc.
      x: effectData.x || 0,
      y: effectData.y || 0,
      particles: effectData.particles || [],
      duration: effectData.duration || 1000,
      startTime: Date.now(),
      intensity: effectData.intensity || 1,
      color: effectData.color || '#ffffff',
      size: effectData.size || 5,
      velocity: effectData.velocity || { x: 0, y: 0 },
      gravity: effectData.gravity || 0,
      fade: effectData.fade !== false,
      layer: effectData.layer || 10 // Effects typically on top
    });
    
    return id;
  }
  
  /**
   * Update sprite animations and effects
   */
  update(deltaTime) {
    this.animationTime += deltaTime;
    
    // Update animations
    for (const [id, animation] of this.animations) {
      if (animation.playing && animation.frames.length > 0) {
        if (this.animationTime - animation.lastFrameTime >= animation.frameTime) {
          animation.currentFrame++;
          animation.lastFrameTime = this.animationTime;
          
          if (animation.currentFrame >= animation.frames.length) {
            if (animation.loop) {
              animation.currentFrame = 0;
            } else {
              animation.currentFrame = animation.frames.length - 1;
              animation.playing = false;
              
              if (animation.onComplete) {
                animation.onComplete(id);
              }
            }
          }
        }
      }
    }
    
    // Update effects
    const currentTime = Date.now();
    for (const [id, effect] of this.effects) {
      const elapsed = currentTime - effect.startTime;
      
      if (elapsed >= effect.duration) {
        this.effects.delete(id);
        continue;
      }
      
      // Update particles for particle effects
      if (effect.type === 'particle' && effect.particles.length > 0) {
        for (const particle of effect.particles) {
          particle.x += particle.vx * (deltaTime / 1000);
          particle.y += particle.vy * (deltaTime / 1000);
          particle.vy += effect.gravity * (deltaTime / 1000);
          
          if (effect.fade) {
            particle.alpha = Math.max(0, 1 - (elapsed / effect.duration));
          }
        }
      }
    }
  }
  
  /**
   * Render all sprites, animations, and effects
   */
  render(ctx, camera) {
    this.spritesRendered = 0;
    this.effectsRendered = 0;
    
    // Collect all renderable objects and sort by layer
    const renderables = [];
    
    // Add sprites
    for (const [id, sprite] of this.sprites) {
      if (sprite.visible && this.isInView(sprite, camera)) {
        renderables.push({ type: 'sprite', id, data: sprite });
      }
    }
    
    // Add animations
    for (const [id, animation] of this.animations) {
      if (animation.visible && this.isInView(animation, camera)) {
        renderables.push({ type: 'animation', id, data: animation });
      }
    }
    
    // Add effects
    for (const [id, effect] of this.effects) {
      if (this.isInView(effect, camera)) {
        renderables.push({ type: 'effect', id, data: effect });
      }
    }
    
    // Sort by layer (lower numbers render first)
    renderables.sort((a, b) => a.data.layer - b.data.layer);
    
    // Render all objects
    for (const renderable of renderables) {
      switch (renderable.type) {
        case 'sprite':
          if (this.renderSprite(ctx, renderable.data, camera)) {
            this.spritesRendered++;
          }
          break;
        case 'animation':
          if (this.renderAnimation(ctx, renderable.data, camera)) {
            this.spritesRendered++;
          }
          break;
        case 'effect':
          if (this.renderEffect(ctx, renderable.data, camera)) {
            this.effectsRendered++;
          }
          break;
      }
    }
  }
  
  /**
   * Render a single sprite
   */
  renderSprite(ctx, sprite, camera) {
    if (!sprite.image || sprite.alpha <= 0) return false;
    
    const screenPos = camera.worldToScreen(sprite.x, sprite.y);
    
    ctx.save();
    
    // Set alpha
    ctx.globalAlpha = sprite.alpha;
    
    // Move to sprite position
    ctx.translate(screenPos.x + sprite.width / 2, screenPos.y + sprite.height / 2);
    
    // Apply transformations
    ctx.rotate(sprite.rotation);
    ctx.scale(sprite.scaleX * (sprite.flipX ? -1 : 1), sprite.scaleY * (sprite.flipY ? -1 : 1));
    
    // Apply tint if specified
    if (sprite.tint) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = sprite.tint;
      ctx.fillRect(-sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height);
      ctx.globalCompositeOperation = 'source-over';
    }
    
    // Draw the sprite
    ctx.drawImage(
      sprite.image,
      -sprite.width / 2,
      -sprite.height / 2,
      sprite.width,
      sprite.height
    );
    
    ctx.restore();
    return true;
  }
  
  /**
   * Render an animated sprite
   */
  renderAnimation(ctx, animation, camera) {
    if (!animation.spriteSheet || animation.alpha <= 0 || animation.frames.length === 0) return false;
    
    const screenPos = camera.worldToScreen(animation.x, animation.y);
    const frame = animation.frames[animation.currentFrame];
    
    ctx.save();
    
    // Set alpha
    ctx.globalAlpha = animation.alpha;
    
    // Move to animation position
    ctx.translate(screenPos.x + animation.frameWidth / 2, screenPos.y + animation.frameHeight / 2);
    
    // Apply transformations
    ctx.rotate(animation.rotation);
    ctx.scale(animation.scaleX * (animation.flipX ? -1 : 1), animation.scaleY * (animation.flipY ? -1 : 1));
    
    // Apply tint if specified
    if (animation.tint) {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = animation.tint;
      ctx.fillRect(-animation.frameWidth / 2, -animation.frameHeight / 2, animation.frameWidth, animation.frameHeight);
      ctx.globalCompositeOperation = 'source-over';
    }
    
    // Draw the current frame
    ctx.drawImage(
      animation.spriteSheet,
      frame.x, frame.y, animation.frameWidth, animation.frameHeight,
      -animation.frameWidth / 2, -animation.frameHeight / 2, animation.frameWidth, animation.frameHeight
    );
    
    ctx.restore();
    return true;
  }
  
  /**
   * Render a visual effect
   */
  renderEffect(ctx, effect, camera) {
    const screenPos = camera.worldToScreen(effect.x, effect.y);
    
    ctx.save();
    
    switch (effect.type) {
      case 'particle':
        this.renderParticleEffect(ctx, effect, screenPos);
        break;
      case 'explosion':
        this.renderExplosionEffect(ctx, effect, screenPos);
        break;
      case 'dust':
        this.renderDustEffect(ctx, effect, screenPos);
        break;
      case 'smoke':
        this.renderSmokeEffect(ctx, effect, screenPos);
        break;
      default:
        this.renderGenericEffect(ctx, effect, screenPos);
        break;
    }
    
    ctx.restore();
    return true;
  }
  
  /**
   * Render particle effect
   */
  renderParticleEffect(ctx, effect, screenPos) {
    for (const particle of effect.particles) {
      const particleScreenPos = {
        x: screenPos.x + particle.x,
        y: screenPos.y + particle.y
      };
      
      ctx.globalAlpha = particle.alpha || 1;
      ctx.fillStyle = particle.color || effect.color;
      
      ctx.beginPath();
      ctx.arc(particleScreenPos.x, particleScreenPos.y, particle.size || effect.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  /**
   * Render explosion effect
   */
  renderExplosionEffect(ctx, effect, screenPos) {
    const currentTime = Date.now();
    const elapsed = currentTime - effect.startTime;
    const progress = elapsed / effect.duration;
    
    // Expanding circle with fading alpha
    const radius = progress * 50 * effect.intensity;
    const alpha = Math.max(0, 1 - progress);
    
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 3;
    
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner flash
    if (progress < 0.3) {
      ctx.globalAlpha = alpha * 0.5;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  /**
   * Render dust effect
   */
  renderDustEffect(ctx, effect, screenPos) {
    const currentTime = Date.now();
    const elapsed = currentTime - effect.startTime;
    const progress = elapsed / effect.duration;
    
    // Multiple dust particles
    const particleCount = 8;
    const alpha = Math.max(0, 1 - progress);
    
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#d4a574'; // Desert dust color
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const distance = progress * 30;
      const x = screenPos.x + Math.cos(angle) * distance;
      const y = screenPos.y + Math.sin(angle) * distance - progress * 20; // Rise up
      
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  /**
   * Render smoke effect
   */
  renderSmokeEffect(ctx, effect, screenPos) {
    const currentTime = Date.now();
    const elapsed = currentTime - effect.startTime;
    const progress = elapsed / effect.duration;
    
    // Rising smoke clouds
    const cloudCount = 5;
    const alpha = Math.max(0, 1 - progress);
    
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#696969'; // Smoke color
    
    for (let i = 0; i < cloudCount; i++) {
      const offset = (i / cloudCount) * 20 - 10;
      const x = screenPos.x + offset;
      const y = screenPos.y - progress * 50; // Rise up
      const size = 5 + progress * 10;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  /**
   * Render generic effect
   */
  renderGenericEffect(ctx, effect, screenPos) {
    const currentTime = Date.now();
    const elapsed = currentTime - effect.startTime;
    const progress = elapsed / effect.duration;
    const alpha = effect.fade ? Math.max(0, 1 - progress) : 1;
    
    ctx.globalAlpha = alpha;
    ctx.fillStyle = effect.color;
    
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, effect.size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  /**
   * Check if object is in camera view
   */
  isInView(object, camera) {
    const margin = 100; // Extra margin for off-screen objects
    const bounds = camera.getViewBounds();
    
    const objWidth = object.width || object.frameWidth || 50;
    const objHeight = object.height || object.frameHeight || 50;
    
    return !(object.x + objWidth < bounds.left - margin ||
             object.x > bounds.right + margin ||
             object.y + objHeight < bounds.top - margin ||
             object.y > bounds.bottom + margin);
  }
  
  /**
   * Update sprite properties
   */
  updateSprite(id, updates) {
    const sprite = this.sprites.get(id);
    if (sprite) {
      Object.assign(sprite, updates);
    }
  }
  
  /**
   * Update animation properties
   */
  updateAnimation(id, updates) {
    const animation = this.animations.get(id);
    if (animation) {
      Object.assign(animation, updates);
    }
  }
  
  /**
   * Remove sprite
   */
  removeSprite(id) {
    return this.sprites.delete(id);
  }
  
  /**
   * Remove animation
   */
  removeAnimation(id) {
    return this.animations.delete(id);
  }
  
  /**
   * Remove effect
   */
  removeEffect(id) {
    return this.effects.delete(id);
  }
  
  /**
   * Clear all sprites
   */
  clearSprites() {
    this.sprites.clear();
  }
  
  /**
   * Clear all animations
   */
  clearAnimations() {
    this.animations.clear();
  }
  
  /**
   * Clear all effects
   */
  clearEffects() {
    this.effects.clear();
  }
  
  /**
   * Clear all rendering objects
   */
  clearAll() {
    this.clearSprites();
    this.clearAnimations();
    this.clearEffects();
  }
  
  /**
   * Get sprite by ID
   */
  getSprite(id) {
    return this.sprites.get(id);
  }
  
  /**
   * Get animation by ID
   */
  getAnimation(id) {
    return this.animations.get(id);
  }
  
  /**
   * Get effect by ID
   */
  getEffect(id) {
    return this.effects.get(id);
  }
  
  /**
   * Play animation
   */
  playAnimation(id) {
    const animation = this.animations.get(id);
    if (animation) {
      animation.playing = true;
      animation.currentFrame = 0;
      animation.lastFrameTime = this.animationTime;
    }
  }
  
  /**
   * Stop animation
   */
  stopAnimation(id) {
    const animation = this.animations.get(id);
    if (animation) {
      animation.playing = false;
    }
  }
  
  /**
   * Pause animation
   */
  pauseAnimation(id) {
    const animation = this.animations.get(id);
    if (animation) {
      animation.playing = false;
    }
  }
  
  /**
   * Resume animation
   */
  resumeAnimation(id) {
    const animation = this.animations.get(id);
    if (animation) {
      animation.playing = true;
    }
  }
  
  /**
   * Create dust effect at position
   */
  createDustEffect(x, y, intensity = 1) {
    const id = `dust_${Date.now()}_${Math.random()}`;
    this.registerEffect(id, {
      type: 'dust',
      x: x,
      y: y,
      duration: 800,
      intensity: intensity,
      color: '#d4a574'
    });
    return id;
  }
  
  /**
   * Create explosion effect at position
   */
  createExplosionEffect(x, y, intensity = 1) {
    const id = `explosion_${Date.now()}_${Math.random()}`;
    this.registerEffect(id, {
      type: 'explosion',
      x: x,
      y: y,
      duration: 600,
      intensity: intensity,
      color: '#ff6600'
    });
    return id;
  }
  
  /**
   * Create particle effect at position
   */
  createParticleEffect(x, y, particleCount = 10, color = '#ffffff') {
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 20,
        y: (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 100,
        vy: (Math.random() - 0.5) * 100,
        size: Math.random() * 3 + 1,
        alpha: 1,
        color: color
      });
    }
    
    const id = `particles_${Date.now()}_${Math.random()}`;
    this.registerEffect(id, {
      type: 'particle',
      x: x,
      y: y,
      particles: particles,
      duration: 1000,
      gravity: 50,
      color: color
    });
    return id;
  }
  
  /**
   * Get rendering statistics
   */
  getStats() {
    return {
      sprites: this.sprites.size,
      animations: this.animations.size,
      effects: this.effects.size,
      spritesRendered: this.spritesRendered,
      effectsRendered: this.effectsRendered
    };
  }
  
  /**
   * Render debug information
   */
  renderDebug(ctx) {
    const stats = this.getStats();
    
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 120, 200, 100);
    
    ctx.fillStyle = '#00ff00';
    ctx.font = '12px "Courier New", monospace';
    ctx.textAlign = 'left';
    
    let y = 135;
    ctx.fillText(`Sprites: ${stats.sprites}`, 15, y);
    y += 15;
    ctx.fillText(`Animations: ${stats.animations}`, 15, y);
    y += 15;
    ctx.fillText(`Effects: ${stats.effects}`, 15, y);
    y += 15;
    ctx.fillText(`Rendered: ${stats.spritesRendered}`, 15, y);
    y += 15;
    ctx.fillText(`FX Rendered: ${stats.effectsRendered}`, 15, y);
    
    ctx.restore();
  }
}

export default SpriteRenderer;