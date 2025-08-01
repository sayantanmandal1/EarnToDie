import * as THREE from 'three';

/**
 * Asset loader with progress tracking and error handling
 */
export class AssetLoader {
  constructor() {
    this.loadingManager = new THREE.LoadingManager();
    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
    this.gltfLoader = null; // Will be initialized if needed
    this.audioLoader = new THREE.AudioLoader(this.loadingManager);
    
    // Asset caches
    this.textures = new Map();
    this.models = new Map();
    this.sounds = new Map();
    this.materials = new Map();
    
    // Loading state
    this.isLoading = false;
    this.loadingProgress = 0;
    this.loadingErrors = [];
    
    // Callbacks
    this.onProgress = null;
    this.onComplete = null;
    this.onError = null;
    
    this._setupLoadingManager();
  }

  /**
   * Load a texture with caching
   */
  async loadTexture(url, options = {}) {
    if (this.textures.has(url)) {
      return this.textures.get(url);
    }

    try {
      const texture = await this._loadTextureAsync(url);
      
      // Apply options
      if (options.wrapS) texture.wrapS = options.wrapS;
      if (options.wrapT) texture.wrapT = options.wrapT;
      if (options.repeat) texture.repeat.set(options.repeat.x, options.repeat.y);
      if (options.flipY !== undefined) texture.flipY = options.flipY;
      if (options.generateMipmaps !== undefined) texture.generateMipmaps = options.generateMipmaps;
      
      this.textures.set(url, texture);
      return texture;
    } catch (error) {
      console.error(`Failed to load texture: ${url}`, error);
      this._handleError(error, 'texture', url);
      return this._createErrorTexture();
    }
  }

  /**
   * Load multiple textures
   */
  async loadTextures(textureConfigs) {
    const promises = textureConfigs.map(config => 
      this.loadTexture(config.url, config.options)
    );
    
    try {
      const textures = await Promise.all(promises);
      return textures;
    } catch (error) {
      console.error('Failed to load textures batch', error);
      throw error;
    }
  }

  /**
   * Load a 3D model (GLTF format)
   */
  async loadModel(url, options = {}) {
    if (this.models.has(url)) {
      return this.models.get(url).clone();
    }

    try {
      if (!this.gltfLoader) {
        // Dynamically import GLTFLoader to avoid bundling if not used
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        this.gltfLoader = new GLTFLoader(this.loadingManager);
      }

      const gltf = await this._loadModelAsync(url);
      
      // Process the model
      const model = gltf.scene;
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = options.castShadow !== false;
          child.receiveShadow = options.receiveShadow !== false;
          
          // Ensure materials are properly configured
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => this._configureMaterial(mat, options));
            } else {
              this._configureMaterial(child.material, options);
            }
          }
        }
      });
      
      this.models.set(url, model);
      return model.clone();
    } catch (error) {
      console.error(`Failed to load model: ${url}`, error);
      this._handleError(error, 'model', url);
      return this._createErrorModel();
    }
  }

  /**
   * Load an audio file
   */
  async loadSound(url, options = {}) {
    if (this.sounds.has(url)) {
      return this.sounds.get(url);
    }

    try {
      const audioBuffer = await this._loadSoundAsync(url);
      this.sounds.set(url, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.error(`Failed to load sound: ${url}`, error);
      this._handleError(error, 'sound', url);
      return null;
    }
  }

  /**
   * Create a material with texture
   */
  createMaterial(name, config) {
    if (this.materials.has(name)) {
      return this.materials.get(name);
    }

    let material;
    
    switch (config.type) {
      case 'standard':
        material = new THREE.MeshStandardMaterial(config.properties);
        break;
      case 'phong':
        material = new THREE.MeshPhongMaterial(config.properties);
        break;
      case 'lambert':
        material = new THREE.MeshLambertMaterial(config.properties);
        break;
      case 'basic':
        material = new THREE.MeshBasicMaterial(config.properties);
        break;
      default:
        material = new THREE.MeshStandardMaterial(config.properties);
    }
    
    this.materials.set(name, material);
    return material;
  }

  /**
   * Load a batch of assets with progress tracking
   */
  async loadAssetBatch(assetConfigs) {
    this.isLoading = true;
    this.loadingProgress = 0;
    this.loadingErrors = [];
    
    const promises = [];
    
    // Process each asset config
    for (const config of assetConfigs) {
      switch (config.type) {
        case 'texture':
          promises.push(this.loadTexture(config.url, config.options));
          break;
        case 'model':
          promises.push(this.loadModel(config.url, config.options));
          break;
        case 'sound':
          promises.push(this.loadSound(config.url, config.options));
          break;
        default:
          console.warn(`Unknown asset type: ${config.type}`);
      }
    }
    
    try {
      const results = await Promise.allSettled(promises);
      
      // Process results
      const assets = {};
      results.forEach((result, index) => {
        const config = assetConfigs[index];
        if (result.status === 'fulfilled') {
          assets[config.name] = result.value;
        } else {
          console.error(`Failed to load asset ${config.name}:`, result.reason);
          this.loadingErrors.push({
            name: config.name,
            error: result.reason
          });
        }
      });
      
      this.isLoading = false;
      this.loadingProgress = 1.0;
      
      if (this.onComplete) {
        this.onComplete(assets, this.loadingErrors);
      }
      
      return assets;
    } catch (error) {
      this.isLoading = false;
      console.error('Asset batch loading failed:', error);
      if (this.onError) {
        this.onError(error);
      }
      throw error;
    }
  }

  /**
   * Get loading progress (0 to 1)
   */
  getProgress() {
    return this.loadingProgress;
  }

  /**
   * Check if currently loading
   */
  getIsLoading() {
    return this.isLoading;
  }

  /**
   * Get loading errors
   */
  getErrors() {
    return [...this.loadingErrors];
  }

  /**
   * Clear all cached assets
   */
  clearCache() {
    // Dispose of textures
    this.textures.forEach(texture => texture.dispose());
    this.textures.clear();
    
    // Dispose of materials
    this.materials.forEach(material => material.dispose());
    this.materials.clear();
    
    // Clear other caches
    this.models.clear();
    this.sounds.clear();
    
    console.log('Asset cache cleared');
  }

  /**
   * Setup loading manager callbacks
   */
  _setupLoadingManager() {
    this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      this.loadingProgress = itemsLoaded / itemsTotal;
      
      if (this.onProgress) {
        this.onProgress(this.loadingProgress, itemsLoaded, itemsTotal);
      }
    };
    
    this.loadingManager.onLoad = () => {
      this.isLoading = false;
      this.loadingProgress = 1.0;
    };
    
    this.loadingManager.onError = (url) => {
      console.error(`Loading manager error for: ${url}`);
    };
  }

  /**
   * Load texture asynchronously
   */
  _loadTextureAsync(url) {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        resolve,
        undefined,
        reject
      );
    });
  }

  /**
   * Load model asynchronously
   */
  _loadModelAsync(url) {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        resolve,
        undefined,
        reject
      );
    });
  }

  /**
   * Load sound asynchronously
   */
  _loadSoundAsync(url) {
    return new Promise((resolve, reject) => {
      this.audioLoader.load(
        url,
        resolve,
        undefined,
        reject
      );
    });
  }

  /**
   * Configure material properties
   */
  _configureMaterial(material, options) {
    if (options.metalness !== undefined) material.metalness = options.metalness;
    if (options.roughness !== undefined) material.roughness = options.roughness;
    if (options.transparent !== undefined) material.transparent = options.transparent;
    if (options.opacity !== undefined) material.opacity = options.opacity;
  }

  /**
   * Create error texture (red checkerboard)
   */
  _createErrorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    
    // Create red checkerboard pattern
    context.fillStyle = '#ff0000';
    context.fillRect(0, 0, 64, 64);
    context.fillStyle = '#800000';
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if ((i + j) % 2 === 0) {
          context.fillRect(i * 8, j * 8, 8, 8);
        }
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  /**
   * Create error model (red cube)
   */
  _createErrorModel() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  /**
   * Handle loading errors
   */
  _handleError(error, type, url) {
    const errorInfo = {
      type,
      url,
      error: error.message || error,
      timestamp: Date.now()
    };
    
    this.loadingErrors.push(errorInfo);
    
    if (this.onError) {
      this.onError(errorInfo);
    }
  }
}