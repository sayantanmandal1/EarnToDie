import { AssetLoader } from '../AssetLoader';

// Mock Three.js
jest.mock('three', () => ({
  LoadingManager: jest.fn(() => ({
    onProgress: null,
    onLoad: null,
    onError: null
  })),
  TextureLoader: jest.fn(() => ({
    load: jest.fn()
  })),
  AudioLoader: jest.fn(() => ({
    load: jest.fn()
  })),
  CanvasTexture: jest.fn(() => ({
    wrapS: null,
    wrapT: null
  })),
  MeshStandardMaterial: jest.fn(() => ({
    dispose: jest.fn()
  })),
  MeshPhongMaterial: jest.fn(() => ({
    dispose: jest.fn()
  })),
  MeshLambertMaterial: jest.fn(() => ({
    dispose: jest.fn()
  })),
  MeshBasicMaterial: jest.fn(() => ({
    dispose: jest.fn()
  })),
  BoxGeometry: jest.fn(),
  Mesh: jest.fn(() => ({})),
  RepeatWrapping: 'RepeatWrapping'
}));

describe('AssetLoader', () => {
  let assetLoader;

  beforeEach(() => {
    assetLoader = new AssetLoader();
    
    // Mock document.createElement for canvas
    global.document = {
      createElement: jest.fn(() => ({
        width: 0,
        height: 0,
        getContext: jest.fn(() => ({
          fillStyle: '',
          fillRect: jest.fn()
        }))
      }))
    };
    
    // Mock HTMLCanvasElement.prototype.getContext
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: jest.fn(() => ({
        fillStyle: '',
        fillRect: jest.fn()
      }))
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    test('should initialize with correct default values', () => {
      expect(assetLoader.loadingManager).toBeDefined();
      expect(assetLoader.textureLoader).toBeDefined();
      expect(assetLoader.audioLoader).toBeDefined();
      expect(assetLoader.textures).toBeInstanceOf(Map);
      expect(assetLoader.models).toBeInstanceOf(Map);
      expect(assetLoader.sounds).toBeInstanceOf(Map);
      expect(assetLoader.materials).toBeInstanceOf(Map);
      expect(assetLoader.isLoading).toBe(false);
      expect(assetLoader.loadingProgress).toBe(0);
      expect(assetLoader.loadingErrors).toEqual([]);
    });
  });

  describe('loadTexture', () => {
    test('should load texture successfully', async () => {
      const mockTexture = { 
        wrapS: null, 
        wrapT: null, 
        repeat: { set: jest.fn() },
        flipY: true,
        generateMipmaps: true
      };
      
      // Mock successful texture loading
      assetLoader.textureLoader.load.mockImplementation((url, onLoad) => {
        setTimeout(() => onLoad(mockTexture), 0);
      });

      const texture = await assetLoader.loadTexture('test.jpg');
      
      expect(texture).toBe(mockTexture);
      expect(assetLoader.textures.has('test.jpg')).toBe(true);
    });

    test('should return cached texture on subsequent calls', async () => {
      const mockTexture = { wrapS: null, wrapT: null };
      assetLoader.textures.set('cached.jpg', mockTexture);

      const texture = await assetLoader.loadTexture('cached.jpg');
      
      expect(texture).toBe(mockTexture);
      expect(assetLoader.textureLoader.load).not.toHaveBeenCalled();
    });

    test('should handle texture loading errors', async () => {
      const mockError = new Error('Failed to load texture');
      
      assetLoader.textureLoader.load.mockImplementation((url, onLoad, onProgress, onError) => {
        setTimeout(() => onError(mockError), 0);
      });

      const texture = await assetLoader.loadTexture('error.jpg');
      
      // Should return error texture
      expect(texture).toBeDefined();
      expect(assetLoader.loadingErrors).toHaveLength(1);
    });

    test('should apply texture options', async () => {
      const mockTexture = { 
        wrapS: null, 
        wrapT: null, 
        repeat: { set: jest.fn() },
        flipY: true,
        generateMipmaps: true
      };
      
      assetLoader.textureLoader.load.mockImplementation((url, onLoad) => {
        setTimeout(() => onLoad(mockTexture), 0);
      });

      const options = {
        wrapS: 'RepeatWrapping',
        repeat: { x: 2, y: 2 },
        flipY: false
      };

      await assetLoader.loadTexture('test.jpg', options);
      
      expect(mockTexture.wrapS).toBe('RepeatWrapping');
      expect(mockTexture.repeat.set).toHaveBeenCalledWith(2, 2);
      expect(mockTexture.flipY).toBe(false);
    });
  });

  describe('loadTextures', () => {
    test('should load multiple textures', async () => {
      const mockTexture1 = { wrapS: null, wrapT: null };
      const mockTexture2 = { wrapS: null, wrapT: null };
      
      assetLoader.textureLoader.load
        .mockImplementationOnce((url, onLoad) => setTimeout(() => onLoad(mockTexture1), 0))
        .mockImplementationOnce((url, onLoad) => setTimeout(() => onLoad(mockTexture2), 0));

      const textureConfigs = [
        { url: 'texture1.jpg', options: {} },
        { url: 'texture2.jpg', options: {} }
      ];

      const textures = await assetLoader.loadTextures(textureConfigs);
      
      expect(textures).toHaveLength(2);
      expect(textures[0]).toBe(mockTexture1);
      expect(textures[1]).toBe(mockTexture2);
    });
  });

  describe('loadModel', () => {
    test('should load model successfully', async () => {
      const mockModel = {
        scene: {
          clone: jest.fn(() => ({ cloned: true })),
          traverse: jest.fn()
        }
      };
      
      // Mock dynamic import
      jest.doMock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
        GLTFLoader: jest.fn(() => ({
          load: jest.fn((url, onLoad) => {
            setTimeout(() => onLoad(mockModel), 0);
          })
        }))
      }), { virtual: true });

      const model = await assetLoader.loadModel('test.gltf');
      
      expect(model).toEqual({ cloned: true });
      expect(assetLoader.models.has('test.gltf')).toBe(true);
    });

    test('should return cached model clone on subsequent calls', async () => {
      const mockModel = {
        clone: jest.fn(() => ({ cloned: true }))
      };
      assetLoader.models.set('cached.gltf', mockModel);

      const model = await assetLoader.loadModel('cached.gltf');
      
      expect(model).toEqual({ cloned: true });
      expect(mockModel.clone).toHaveBeenCalled();
    });
  });

  describe('loadSound', () => {
    test('should load sound successfully', async () => {
      const mockAudioBuffer = { duration: 5.0 };
      
      assetLoader.audioLoader.load.mockImplementation((url, onLoad) => {
        setTimeout(() => onLoad(mockAudioBuffer), 0);
      });

      const sound = await assetLoader.loadSound('test.mp3');
      
      expect(sound).toBe(mockAudioBuffer);
      expect(assetLoader.sounds.has('test.mp3')).toBe(true);
    });

    test('should return cached sound on subsequent calls', async () => {
      const mockAudioBuffer = { duration: 3.0 };
      assetLoader.sounds.set('cached.mp3', mockAudioBuffer);

      const sound = await assetLoader.loadSound('cached.mp3');
      
      expect(sound).toBe(mockAudioBuffer);
      expect(assetLoader.audioLoader.load).not.toHaveBeenCalled();
    });
  });

  describe('createMaterial', () => {
    test('should create standard material', () => {
      const config = {
        type: 'standard',
        properties: { color: 0xff0000 }
      };

      const material = assetLoader.createMaterial('testMaterial', config);
      
      expect(material).toBeDefined();
      expect(assetLoader.materials.has('testMaterial')).toBe(true);
    });

    test('should return cached material on subsequent calls', () => {
      const mockMaterial = { type: 'cached' };
      assetLoader.materials.set('cachedMaterial', mockMaterial);

      const material = assetLoader.createMaterial('cachedMaterial', {});
      
      expect(material).toBe(mockMaterial);
    });

    test('should create different material types', () => {
      const configs = [
        { type: 'phong', properties: {} },
        { type: 'lambert', properties: {} },
        { type: 'basic', properties: {} },
        { type: 'unknown', properties: {} } // Should default to standard
      ];

      configs.forEach((config, index) => {
        const material = assetLoader.createMaterial(`material${index}`, config);
        expect(material).toBeDefined();
      });
    });
  });

  describe('loadAssetBatch', () => {
    test('should load batch of assets successfully', async () => {
      const mockTexture = { wrapS: null, wrapT: null };
      const mockSound = { duration: 2.0 };
      
      assetLoader.textureLoader.load.mockImplementation((url, onLoad) => {
        setTimeout(() => onLoad(mockTexture), 0);
      });
      
      assetLoader.audioLoader.load.mockImplementation((url, onLoad) => {
        setTimeout(() => onLoad(mockSound), 0);
      });

      const assetConfigs = [
        { type: 'texture', name: 'testTexture', url: 'test.jpg' },
        { type: 'sound', name: 'testSound', url: 'test.mp3' }
      ];

      const assets = await assetLoader.loadAssetBatch(assetConfigs);
      
      expect(assets.testTexture).toBe(mockTexture);
      expect(assets.testSound).toBe(mockSound);
      expect(assetLoader.isLoading).toBe(false);
      expect(assetLoader.loadingProgress).toBe(1.0);
    });

    test('should handle mixed success and failure', async () => {
      const mockTexture = { wrapS: null, wrapT: null };
      
      assetLoader.textureLoader.load.mockImplementation((url, onLoad) => {
        setTimeout(() => onLoad(mockTexture), 0);
      });
      
      assetLoader.audioLoader.load.mockImplementation((url, onLoad, onProgress, onError) => {
        setTimeout(() => onError(new Error('Audio load failed')), 0);
      });

      const assetConfigs = [
        { type: 'texture', name: 'testTexture', url: 'test.jpg' },
        { type: 'sound', name: 'testSound', url: 'test.mp3' }
      ];

      const assets = await assetLoader.loadAssetBatch(assetConfigs);
      
      expect(assets.testTexture).toBe(mockTexture);
      expect(assets.testSound).toBeNull();
      expect(assetLoader.loadingErrors).toHaveLength(1);
    });
  });

  describe('Progress and State', () => {
    test('should track loading progress', () => {
      assetLoader.loadingProgress = 0.5;
      expect(assetLoader.getProgress()).toBe(0.5);
    });

    test('should track loading state', () => {
      assetLoader.isLoading = true;
      expect(assetLoader.getIsLoading()).toBe(true);
    });

    test('should return copy of errors', () => {
      const error = { type: 'texture', error: 'Failed' };
      assetLoader.loadingErrors.push(error);
      
      const errors = assetLoader.getErrors();
      expect(errors).toEqual([error]);
      expect(errors).not.toBe(assetLoader.loadingErrors); // Should be a copy
    });
  });

  describe('clearCache', () => {
    test('should clear all cached assets', () => {
      const mockTexture = { dispose: jest.fn() };
      const mockMaterial = { dispose: jest.fn() };
      
      assetLoader.textures.set('test', mockTexture);
      assetLoader.materials.set('test', mockMaterial);
      assetLoader.models.set('test', {});
      assetLoader.sounds.set('test', {});

      assetLoader.clearCache();
      
      expect(mockTexture.dispose).toHaveBeenCalled();
      expect(mockMaterial.dispose).toHaveBeenCalled();
      expect(assetLoader.textures.size).toBe(0);
      expect(assetLoader.materials.size).toBe(0);
      expect(assetLoader.models.size).toBe(0);
      expect(assetLoader.sounds.size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should create error texture', () => {
      const errorTexture = assetLoader._createErrorTexture();
      expect(errorTexture).toBeDefined();
    });

    test('should create error model', () => {
      const errorModel = assetLoader._createErrorModel();
      expect(errorModel).toBeDefined();
    });

    test('should handle errors properly', () => {
      const error = new Error('Test error');
      assetLoader._handleError(error, 'texture', 'test.jpg');
      
      expect(assetLoader.loadingErrors).toHaveLength(1);
      expect(assetLoader.loadingErrors[0]).toMatchObject({
        type: 'texture',
        url: 'test.jpg',
        error: 'Test error'
      });
    });
  });
});