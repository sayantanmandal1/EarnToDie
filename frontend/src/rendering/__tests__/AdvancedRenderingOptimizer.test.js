/**
 * Unit Tests for AdvancedRenderingOptimizer
 */
import AdvancedRenderingOptimizer from '../AdvancedRenderingOptimizer';
import * as THREE from 'three';

// Mock Three.js
jest.mock('three', () => ({
    Frustum: jest.fn(() => ({
        setFromProjectionMatrix: jest.fn(),
        intersectsSphere: jest.fn(() => true)
    })),
    Matrix4: jest.fn(() => ({
        multiplyMatrices: jest.fn()
    })),
    Sphere: jest.fn(() => ({
        copy: jest.fn(),
        applyMatrix4: jest.fn()
    })),
    Vector3: jest.fn(() => ({
        distanceTo: jest.fn(() => 100),
        sub: jest.fn(() => ({ normalize: jest.fn() })),
        normalize: jest.fn()
    })),
    Raycaster: jest.fn(() => ({
        intersectObjects: jest.fn(() => [])
    })),
    TextureLoader: jest.fn(() => ({
        load: jest.fn((url, onLoad) => {
            const mockTexture = {
                userData: {},
                format: null,
                image: { width: 512, height: 512 },
                needsUpdate: false
            };
            setTimeout(() => onLoad(mockTexture), 10);
        })
    })),
    RGB_S3TC_DXT1_Format: 'RGB_S3TC_DXT1_Format',
    RGB_ETC1_Format: 'RGB_ETC1_Format',
    RGB_PVRTC_4BPPV1_Format: 'RGB_PVRTC_4BPPV1_Format'
}));

// Mock performance API
global.performance = {
    now: jest.fn(() => Date.now()),
    memory: {
        usedJSHeapSize: 50 * 1024 * 1024 // 50MB
    }
};

// Mock canvas
global.document.createElement = jest.fn((tagName) => {
    if (tagName === 'canvas') {
        return {
            getContext: jest.fn(() => ({
                drawImage: jest.fn()
            })),
            width: 0,
            height: 0
        };
    }
    return {};
});

describe('AdvancedRenderingOptimizer', () => {
    let mockRenderer, mockScene, mockCamera, optimizer;

    beforeEach(() => {
        // Mock renderer
        mockRenderer = {
            getContext: jest.fn(() => ({
                getExtension: jest.fn((ext) => {
                    if (ext === 'WEBGL_compressed_texture_s3tc') return {};
                    return null;
                })
            })),
            info: {
                render: {
                    calls: 50,
                    triangles: 10000
                }
            },
            capabilities: {
                isWebGL2: true
            }
        };

        // Mock scene
        mockScene = {
            traverse: jest.fn((callback) => {
                // Mock some objects
                const mockObjects = [
                    {
                        isMesh: true,
                        geometry: {
                            boundingSphere: { clone: jest.fn(() => ({ applyMatrix4: jest.fn() })) },
                            computeBoundingSphere: jest.fn()
                        },
                        uuid: 'object1',
                        visible: true,
                        position: { x: 0, y: 0, z: 0 },
                        matrixWorld: {},
                        material: { map: null },
                        userData: {}
                    }
                ];
                mockObjects.forEach(callback);
            }),
            children: []
        };

        // Mock camera
        mockCamera = {
            position: { x: 0, y: 0, z: 0, distanceTo: jest.fn(() => 100) },
            projectionMatrix: {},
            matrixWorldInverse: {},
            getWorldDirection: jest.fn(() => ({ x: 0, y: 0, z: -1 }))
        };

        optimizer = new AdvancedRenderingOptimizer(mockRenderer, mockScene, mockCamera);
    });

    afterEach(() => {
        if (optimizer) {
            optimizer.dispose();
        }
        jest.clearAllMocks();
    });

    test('initializes correctly', () => {
        expect(optimizer).toBeDefined();
        expect(optimizer.performanceMetrics).toBeDefined();
        expect(optimizer.qualitySettings).toBeDefined();
        expect(optimizer.lodSystem).toBeDefined();
        expect(optimizer.cullingSystem).toBeDefined();
        expect(optimizer.textureStreaming).toBeDefined();
    });

    test('sets up LOD system', () => {
        expect(optimizer.lodSystem.enabled).toBe(true);
        expect(optimizer.lodSystem.levels).toBeInstanceOf(Map);
        expect(optimizer.lodSystem.distances).toEqual([50, 100, 200, 500]);
    });

    test('sets up culling system', () => {
        expect(optimizer.cullingSystem.frustumCulling).toBe(true);
        expect(optimizer.cullingSystem.occlusionCulling).toBe(true);
        expect(optimizer.cullingSystem.distanceCulling).toBe(true);
        expect(optimizer.cullingSystem.maxDistance).toBe(1000);
    });

    test('detects texture compression support', () => {
        expect(optimizer.textureManager.compressionSupport).toBeDefined();
        expect(optimizer.textureStreaming.compressionFormat).toBe('S3TC');
    });

    test('registers LOD object', () => {
        const mockObject = {
            uuid: 'test-object',
            geometry: {
                computeBoundingSphere: jest.fn(),
                boundingSphere: { copy: jest.fn() }
            }
        };

        const lodLevels = [
            { distance: 50, geometry: {}, material: {} },
            { distance: 100, geometry: {}, material: {} }
        ];

        optimizer.registerLODObject(mockObject, lodLevels);

        expect(optimizer.lodManager.objects.has('test-object')).toBe(true);
    });

    test('updates LOD system', () => {
        const mockObject = {
            uuid: 'test-object',
            geometry: {
                computeBoundingSphere: jest.fn(),
                boundingSphere: { copy: jest.fn() }
            },
            visible: true,
            position: { x: 0, y: 0, z: 0 }
        };

        const lodLevels = [
            { distance: 50, geometry: {}, material: {} },
            { distance: 100, geometry: {}, material: {} }
        ];

        optimizer.registerLODObject(mockObject, lodLevels);
        optimizer.updateLODSystem();

        // Should have processed the object
        expect(mockObject.geometry.computeBoundingSphere).toHaveBeenCalled();
    });

    test('updates frustum culling', () => {
        optimizer.updateFrustumCulling();

        expect(mockScene.traverse).toHaveBeenCalled();
        expect(optimizer.cullingSystem.frustum.setFromProjectionMatrix).toHaveBeenCalled();
    });

    test('updates distance culling', () => {
        optimizer.updateDistanceCulling();

        expect(mockScene.traverse).toHaveBeenCalled();
        expect(mockCamera.position.distanceTo).toHaveBeenCalled();
    });

    test('processes texture queue', () => {
        const mockTextureRequest = {
            url: 'test-texture.jpg',
            material: { map: null, needsUpdate: false },
            type: 'high'
        };

        optimizer.textureManager.textureQueue.push(mockTextureRequest);
        optimizer.processTextureQueue();

        expect(optimizer.textureManager.currentLoads).toBeGreaterThan(0);
    });

    test('applies texture compression', () => {
        const mockTexture = {
            format: null,
            image: { width: 512, height: 512 },
            needsUpdate: false
        };

        optimizer.applyTextureCompression(mockTexture);

        expect(mockTexture.format).toBe('RGB_S3TC_DXT1_Format');
    });

    test('resizes large textures', () => {
        const mockTexture = {
            image: { width: 4096, height: 4096 },
            needsUpdate: false
        };

        optimizer.resizeTexture(mockTexture, 2048);

        expect(mockTexture.needsUpdate).toBe(true);
    });

    test('updates dynamic quality', () => {
        // Simulate poor performance
        optimizer.performanceMetrics.lastFrameTime = performance.now() - 50; // 20fps

        optimizer.updateDynamicQuality();

        expect(optimizer.qualityAdjuster.frameTimeHistory).toContain(50);
    });

    test('decreases quality when performance is poor', () => {
        const initialQuality = optimizer.qualitySettings.level;
        
        // Simulate consistently poor performance
        for (let i = 0; i < 60; i++) {
            optimizer.qualityAdjuster.frameTimeHistory[i] = 50; // 20fps
        }
        optimizer.qualityAdjuster.averageFrameTime = 50;
        optimizer.qualityAdjuster.lastQualityChange = 0; // Allow immediate change

        optimizer.updateDynamicQuality();

        // Quality should have been decreased
        expect(optimizer.qualitySettings.level).not.toBe(initialQuality);
    });

    test('increases quality when performance is good', () => {
        // Set to low quality first
        optimizer.qualitySettings.level = 'low';
        
        // Simulate consistently good performance
        for (let i = 0; i < 60; i++) {
            optimizer.qualityAdjuster.frameTimeHistory[i] = 10; // 100fps
        }
        optimizer.qualityAdjuster.averageFrameTime = 10;
        optimizer.qualityAdjuster.lastQualityChange = 0; // Allow immediate change

        optimizer.updateDynamicQuality();

        // Quality should have been increased
        expect(optimizer.qualitySettings.level).toBe('medium');
    });

    test('updates shadow quality', () => {
        const mockLight = {
            isDirectionalLight: true,
            shadow: {
                mapSize: { width: 512, height: 512 },
                map: { dispose: jest.fn() }
            }
        };

        mockScene.traverse = jest.fn((callback) => {
            callback(mockLight);
        });

        optimizer.updateShadowQuality(1024);

        expect(mockLight.shadow.mapSize.width).toBe(1024);
        expect(mockLight.shadow.mapSize.height).toBe(1024);
        expect(mockLight.shadow.map.dispose).toHaveBeenCalled();
    });

    test('updates particle quality', () => {
        const mockParticleSystem = {
            maxParticles: 1000,
            baseMaxParticles: 1000
        };

        const mockObject = {
            userData: { particleSystem: mockParticleSystem }
        };

        mockScene.traverse = jest.fn((callback) => {
            callback(mockObject);
        });

        optimizer.updateParticleQuality(0.5);

        expect(mockParticleSystem.maxParticles).toBe(500);
    });

    test('updates performance monitoring', () => {
        optimizer.updatePerformanceMonitoring();

        expect(optimizer.performanceMetrics.drawCalls).toBe(50);
        expect(optimizer.performanceMetrics.triangles).toBe(10000);
        expect(optimizer.performanceMetrics.memoryUsage).toBeGreaterThan(0);
    });

    test('stores performance samples', () => {
        const initialSampleCount = optimizer.performanceMonitor.samples.fps.length;
        
        optimizer.updatePerformanceMonitoring();

        expect(optimizer.performanceMonitor.samples.fps.length).toBe(initialSampleCount + 1);
    });

    test('limits sample history', () => {
        // Fill samples beyond max
        const maxSamples = optimizer.performanceMonitor.maxSamples;
        for (let i = 0; i < maxSamples + 10; i++) {
            optimizer.performanceMonitor.samples.fps.push(60);
        }

        optimizer.updatePerformanceMonitoring();

        expect(optimizer.performanceMonitor.samples.fps.length).toBeLessThanOrEqual(maxSamples);
    });

    test('gets performance metrics', () => {
        const metrics = optimizer.getPerformanceMetrics();

        expect(metrics).toHaveProperty('fps');
        expect(metrics).toHaveProperty('frameTime');
        expect(metrics).toHaveProperty('drawCalls');
        expect(metrics).toHaveProperty('triangles');
        expect(metrics).toHaveProperty('memoryUsage');
    });

    test('gets quality settings', () => {
        const settings = optimizer.getQualitySettings();

        expect(settings).toHaveProperty('level');
        expect(settings).toHaveProperty('lodBias');
        expect(settings).toHaveProperty('shadowQuality');
        expect(settings).toHaveProperty('textureQuality');
    });

    test('sets quality level manually', () => {
        optimizer.setQualityLevel('low');

        expect(optimizer.qualitySettings.level).toBe('low');
    });

    test('enables/disables dynamic quality', () => {
        optimizer.setDynamicQuality(false);

        expect(optimizer.dynamicQuality.enabled).toBe(false);

        optimizer.setDynamicQuality(true);

        expect(optimizer.dynamicQuality.enabled).toBe(true);
    });

    test('main update function calls all subsystems', () => {
        const updateLODSpy = jest.spyOn(optimizer, 'updateLODSystem');
        const updateFrustumSpy = jest.spyOn(optimizer, 'updateFrustumCulling');
        const updateDistanceSpy = jest.spyOn(optimizer, 'updateDistanceCulling');
        const updateTextureSpy = jest.spyOn(optimizer, 'updateTextureStreaming');
        const updateQualitySpy = jest.spyOn(optimizer, 'updateDynamicQuality');
        const updatePerfSpy = jest.spyOn(optimizer, 'updatePerformanceMonitoring');

        optimizer.update();

        expect(updateLODSpy).toHaveBeenCalled();
        expect(updateFrustumSpy).toHaveBeenCalled();
        expect(updateDistanceSpy).toHaveBeenCalled();
        expect(updateTextureSpy).toHaveBeenCalled();
        expect(updateQualitySpy).toHaveBeenCalled();
        expect(updatePerfSpy).toHaveBeenCalled();
    });

    test('disposes resources correctly', () => {
        const mockTexture = { dispose: jest.fn() };
        optimizer.textureManager.loadedTextures.set('test', mockTexture);

        optimizer.dispose();

        expect(mockTexture.dispose).toHaveBeenCalled();
        expect(optimizer.lodManager.objects.size).toBe(0);
        expect(optimizer.textureManager.loadedTextures.size).toBe(0);
    });

    test('handles missing WebGL2 support', () => {
        mockRenderer.capabilities.isWebGL2 = false;
        
        const newOptimizer = new AdvancedRenderingOptimizer(mockRenderer, mockScene, mockCamera);

        expect(newOptimizer.cullingSystem.occlusionCulling).toBe(false);
        
        newOptimizer.dispose();
    });

    test('handles texture loading errors', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        
        // Mock failed texture loading
        THREE.TextureLoader.mockImplementation(() => ({
            load: jest.fn((url, onLoad, onProgress, onError) => {
                setTimeout(() => onError(new Error('Failed to load')), 10);
            })
        }));

        const textureRequest = {
            url: 'invalid-texture.jpg',
            material: { map: null },
            type: 'high'
        };

        optimizer.textureManager.textureQueue.push(textureRequest);
        optimizer.processTextureQueue();

        // Wait for async operation
        return new Promise(resolve => {
            setTimeout(() => {
                expect(consoleSpy).toHaveBeenCalledWith(
                    'Failed to load texture:',
                    'invalid-texture.jpg',
                    expect.any(Error)
                );
                consoleSpy.mockRestore();
                resolve();
            }, 20);
        });
    });

    test('handles occlusion culling when disabled', () => {
        optimizer.cullingSystem.occlusionCulling = false;
        
        const traverseSpy = jest.spyOn(mockScene, 'traverse');
        
        optimizer.updateOcclusionCulling();

        // Should not traverse scene when occlusion culling is disabled
        expect(traverseSpy).not.toHaveBeenCalled();
    });

    test('applies quality settings correctly', () => {
        const qualityStep = {
            name: 'test',
            shadowRes: 512,
            textureRes: 1024,
            particles: 0.7,
            postFX: true
        };

        const updateShadowSpy = jest.spyOn(optimizer, 'updateShadowQuality');
        const updateParticleSpy = jest.spyOn(optimizer, 'updateParticleQuality');

        optimizer.applyQualitySettings(qualityStep);

        expect(optimizer.qualitySettings.level).toBe('test');
        expect(optimizer.textureStreaming.maxTextureSize).toBe(1024);
        expect(optimizer.qualitySettings.postProcessing).toBe(true);
        expect(optimizer.lodSystem.bias).toBe(0.7);
        expect(updateShadowSpy).toHaveBeenCalledWith(512);
        expect(updateParticleSpy).toHaveBeenCalledWith(0.7);
    });
});