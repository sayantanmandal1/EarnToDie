/**
 * Comprehensive Three.js Mock System Fixes
 * Addresses missing constructors, methods, and properties
 */

// Enhanced Vector3 mock with all required methods
const createVector3Mock = (x = 0, y = 0, z = 0) => ({
    x,
    y,
    z,
    set: jest.fn(function(newX, newY, newZ) {
        this.x = newX;
        this.y = newY;
        this.z = newZ;
        return this;
    }),
    copy: jest.fn(function(vector) {
        this.x = vector.x;
        this.y = vector.y;
        this.z = vector.z;
        return this;
    }),
    add: jest.fn(function(vector) {
        this.x += vector.x;
        this.y += vector.y;
        this.z += vector.z;
        return this;
    }),
    subtract: jest.fn(function(vector) {
        this.x -= vector.x;
        this.y -= vector.y;
        this.z -= vector.z;
        return this;
    }),
    sub: jest.fn(function(vector) {
        this.x -= vector.x;
        this.y -= vector.y;
        this.z -= vector.z;
        return this;
    }),
    multiply: jest.fn(function(vector) {
        this.x *= vector.x;
        this.y *= vector.y;
        this.z *= vector.z;
        return this;
    }),
    multiplyScalar: jest.fn(function(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
    }),
    normalize: jest.fn(function() {
        const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        if (length > 0) {
            this.x /= length;
            this.y /= length;
            this.z /= length;
        }
        return this;
    }),
    clone: jest.fn(function() {
        return createVector3Mock(this.x, this.y, this.z);
    }),
    distanceTo: jest.fn(function(vector) {
        const dx = this.x - vector.x;
        const dy = this.y - vector.y;
        const dz = this.z - vector.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }),
    length: jest.fn(function() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }),
    lengthSq: jest.fn(function() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }),
    dot: jest.fn(function(vector) {
        return this.x * vector.x + this.y * vector.y + this.z * vector.z;
    }),
    cross: jest.fn(function(vector) {
        const x = this.y * vector.z - this.z * vector.y;
        const y = this.z * vector.x - this.x * vector.z;
        const z = this.x * vector.y - this.y * vector.x;
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }),
    lerp: jest.fn(function(vector, alpha) {
        this.x += (vector.x - this.x) * alpha;
        this.y += (vector.y - this.y) * alpha;
        this.z += (vector.z - this.z) * alpha;
        return this;
    }),
    equals: jest.fn(function(vector) {
        return this.x === vector.x && this.y === vector.y && this.z === vector.z;
    }),
    fromArray: jest.fn(function(array, offset = 0) {
        this.x = array[offset];
        this.y = array[offset + 1];
        this.z = array[offset + 2];
        return this;
    }),
    toArray: jest.fn(function(array = [], offset = 0) {
        array[offset] = this.x;
        array[offset + 1] = this.y;
        array[offset + 2] = this.z;
        return array;
    })
});

// Enhanced Color mock
const createColorMock = (r = 1, g = 1, b = 1) => ({
    r,
    g,
    b,
    set: jest.fn(function(value) {
        if (typeof value === 'string') {
            // Handle hex strings
            const hex = value.replace('#', '');
            this.r = parseInt(hex.substr(0, 2), 16) / 255;
            this.g = parseInt(hex.substr(2, 2), 16) / 255;
            this.b = parseInt(hex.substr(4, 2), 16) / 255;
        } else if (typeof value === 'number') {
            // Handle hex numbers
            this.r = ((value >> 16) & 255) / 255;
            this.g = ((value >> 8) & 255) / 255;
            this.b = (value & 255) / 255;
        }
        return this;
    }),
    setHex: jest.fn(function(hex) {
        this.r = ((hex >> 16) & 255) / 255;
        this.g = ((hex >> 8) & 255) / 255;
        this.b = (hex & 255) / 255;
        return this;
    }),
    setRGB: jest.fn(function(r, g, b) {
        this.r = r;
        this.g = g;
        this.b = b;
        return this;
    }),
    setHSL: jest.fn(function(h, s, l) {
        // Simple HSL to RGB conversion
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h * 6) % 2 - 1));
        const m = l - c / 2;
        
        let r, g, b;
        if (h < 1/6) { r = c; g = x; b = 0; }
        else if (h < 2/6) { r = x; g = c; b = 0; }
        else if (h < 3/6) { r = 0; g = c; b = x; }
        else if (h < 4/6) { r = 0; g = x; b = c; }
        else if (h < 5/6) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        
        this.r = r + m;
        this.g = g + m;
        this.b = b + m;
        return this;
    }),
    clone: jest.fn(function() {
        return createColorMock(this.r, this.g, this.b);
    }),
    copy: jest.fn(function(color) {
        this.r = color.r;
        this.g = color.g;
        this.b = color.b;
        return this;
    }),
    getHex: jest.fn(function() {
        return (Math.round(this.r * 255) << 16) + (Math.round(this.g * 255) << 8) + Math.round(this.b * 255);
    }),
    getHexString: jest.fn(function() {
        return this.getHex().toString(16).padStart(6, '0');
    }),
    lerp: jest.fn(function(color, alpha) {
        this.r += (color.r - this.r) * alpha;
        this.g += (color.g - this.g) * alpha;
        this.b += (color.b - this.b) * alpha;
        return this;
    }),
    equals: jest.fn(function(color) {
        return this.r === color.r && this.g === color.g && this.b === color.b;
    })
});

// Enhanced Material mocks
const createBasicMaterialMock = () => ({
    color: createColorMock(),
    transparent: false,
    opacity: 1,
    visible: true,
    side: 'FrontSide',
    needsUpdate: false,
    dispose: jest.fn(),
    clone: jest.fn(function() {
        return createBasicMaterialMock();
    }),
    copy: jest.fn(function(material) {
        this.color.copy(material.color);
        this.transparent = material.transparent;
        this.opacity = material.opacity;
        this.visible = material.visible;
        return this;
    })
});

// Enhanced Geometry mocks
const createGeometryMock = () => ({
    vertices: [],
    faces: [],
    boundingBox: null,
    boundingSphere: null,
    dispose: jest.fn(),
    computeBoundingBox: jest.fn(),
    computeBoundingSphere: jest.fn(),
    clone: jest.fn(function() {
        return createGeometryMock();
    }),
    copy: jest.fn(function(geometry) {
        this.vertices = [...geometry.vertices];
        this.faces = [...geometry.faces];
        return this;
    })
});

// Enhanced Texture mock
const createTextureMock = () => ({
    image: null,
    wrapS: 'ClampToEdgeWrapping',
    wrapT: 'ClampToEdgeWrapping',
    magFilter: 'LinearFilter',
    minFilter: 'LinearMipmapLinearFilter',
    format: 'RGBAFormat',
    type: 'UnsignedByteType',
    generateMipmaps: true,
    flipY: true,
    needsUpdate: false,
    dispose: jest.fn(),
    clone: jest.fn(function() {
        return createTextureMock();
    }),
    copy: jest.fn(function(texture) {
        this.image = texture.image;
        this.wrapS = texture.wrapS;
        this.wrapT = texture.wrapT;
        return this;
    })
});

// Enhanced Object3D mock
const createObject3DMock = () => ({
    position: createVector3Mock(),
    rotation: createVector3Mock(),
    scale: createVector3Mock(1, 1, 1),
    quaternion: { x: 0, y: 0, z: 0, w: 1 },
    visible: true,
    parent: null,
    children: [],
    userData: {},
    matrix: {
        elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
    },
    matrixWorld: {
        elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
    },
    add: jest.fn(function(object) {
        this.children.push(object);
        object.parent = this;
    }),
    remove: jest.fn(function(object) {
        const index = this.children.indexOf(object);
        if (index !== -1) {
            this.children.splice(index, 1);
            object.parent = null;
        }
    }),
    traverse: jest.fn(function(callback) {
        callback(this);
        this.children.forEach(child => {
            if (child.traverse) {
                child.traverse(callback);
            }
        });
    }),
    clone: jest.fn(function() {
        return createObject3DMock();
    }),
    copy: jest.fn(function(object) {
        this.position.copy(object.position);
        this.rotation.copy(object.rotation);
        this.scale.copy(object.scale);
        return this;
    }),
    lookAt: jest.fn(),
    updateMatrix: jest.fn(),
    updateMatrixWorld: jest.fn(),
    getWorldPosition: jest.fn(function(target = createVector3Mock()) {
        return target.copy(this.position);
    }),
    getWorldDirection: jest.fn(function(target = createVector3Mock()) {
        return target.set(0, 0, -1);
    })
});

// Apply enhanced Three.js mocks
export function applyEnhancedThreeJSMocks() {
    // Update existing THREE global with enhanced mocks
    if (global.THREE) {
        // Enhanced Vector3
        global.THREE.Vector3 = jest.fn((x, y, z) => createVector3Mock(x, y, z));
        
        // Enhanced Color
        global.THREE.Color = jest.fn((r, g, b) => createColorMock(r, g, b));
        
        // Enhanced Materials
        global.THREE.MeshBasicMaterial = jest.fn(() => createBasicMaterialMock());
        global.THREE.MeshLambertMaterial = jest.fn(() => createBasicMaterialMock());
        global.THREE.MeshPhongMaterial = jest.fn(() => createBasicMaterialMock());
        global.THREE.MeshStandardMaterial = jest.fn(() => createBasicMaterialMock());
        global.THREE.LineBasicMaterial = jest.fn(() => createBasicMaterialMock());
        global.THREE.PointsMaterial = jest.fn(() => createBasicMaterialMock());
        
        // Enhanced Geometries
        global.THREE.BoxGeometry = jest.fn(() => createGeometryMock());
        global.THREE.SphereGeometry = jest.fn(() => createGeometryMock());
        global.THREE.PlaneGeometry = jest.fn(() => createGeometryMock());
        global.THREE.CylinderGeometry = jest.fn(() => createGeometryMock());
        global.THREE.ConeGeometry = jest.fn(() => createGeometryMock());
        global.THREE.RingGeometry = jest.fn(() => createGeometryMock());
        global.THREE.TorusGeometry = jest.fn(() => createGeometryMock());
        
        // Enhanced Texture
        global.THREE.Texture = jest.fn(() => createTextureMock());
        global.THREE.CanvasTexture = jest.fn(() => createTextureMock());
        global.THREE.DataTexture = jest.fn(() => createTextureMock());
        
        // Enhanced Object3D and derived classes
        global.THREE.Object3D = jest.fn(() => createObject3DMock());
        global.THREE.Group = jest.fn(() => createObject3DMock());
        global.THREE.Mesh = jest.fn(() => ({
            ...createObject3DMock(),
            geometry: createGeometryMock(),
            material: createBasicMaterialMock(),
            isMesh: true
        }));
        
        // Enhanced Lights
        global.THREE.DirectionalLight = jest.fn(() => ({
            ...createObject3DMock(),
            color: createColorMock(),
            intensity: 1,
            target: createObject3DMock(),
            shadow: {
                camera: {
                    left: -5,
                    right: 5,
                    top: 5,
                    bottom: -5,
                    near: 0.1,
                    far: 50
                },
                mapSize: { width: 1024, height: 1024 }
            }
        }));
        
        global.THREE.AmbientLight = jest.fn(() => ({
            ...createObject3DMock(),
            color: createColorMock(),
            intensity: 1
        }));
        
        global.THREE.PointLight = jest.fn(() => ({
            ...createObject3DMock(),
            color: createColorMock(),
            intensity: 1,
            distance: 0,
            decay: 1
        }));
        
        global.THREE.SpotLight = jest.fn(() => ({
            ...createObject3DMock(),
            color: createColorMock(),
            intensity: 1,
            distance: 0,
            angle: Math.PI / 3,
            penumbra: 0,
            decay: 1,
            target: createObject3DMock()
        }));
        
        // Enhanced Camera
        global.THREE.PerspectiveCamera = jest.fn(() => ({
            ...createObject3DMock(),
            fov: 75,
            aspect: 1,
            near: 0.1,
            far: 1000,
            updateProjectionMatrix: jest.fn(),
            setViewOffset: jest.fn(),
            clearViewOffset: jest.fn()
        }));
        
        global.THREE.OrthographicCamera = jest.fn(() => ({
            ...createObject3DMock(),
            left: -1,
            right: 1,
            top: 1,
            bottom: -1,
            near: 0.1,
            far: 1000,
            updateProjectionMatrix: jest.fn()
        }));
        
        // Enhanced Scene
        global.THREE.Scene = jest.fn(() => ({
            ...createObject3DMock(),
            background: null,
            environment: null,
            fog: null,
            overrideMaterial: null,
            autoUpdate: true
        }));
        
        // Constants
        global.THREE.FrontSide = 0;
        global.THREE.BackSide = 1;
        global.THREE.DoubleSide = 2;
        global.THREE.ClampToEdgeWrapping = 1001;
        global.THREE.RepeatWrapping = 1000;
        global.THREE.MirroredRepeatWrapping = 1002;
        global.THREE.LinearFilter = 1006;
        global.THREE.LinearMipmapLinearFilter = 1008;
        global.THREE.RGBAFormat = 1023;
        global.THREE.UnsignedByteType = 1009;
        
        // Math utilities
        global.THREE.MathUtils = {
            degToRad: jest.fn(degrees => degrees * Math.PI / 180),
            radToDeg: jest.fn(radians => radians * 180 / Math.PI),
            clamp: jest.fn((value, min, max) => Math.max(min, Math.min(max, value))),
            lerp: jest.fn((x, y, t) => x + (y - x) * t),
            smoothstep: jest.fn((x, min, max) => {
                if (x <= min) return 0;
                if (x >= max) return 1;
                x = (x - min) / (max - min);
                return x * x * (3 - 2 * x);
            }),
            randFloat: jest.fn((low, high) => low + Math.random() * (high - low)),
            randInt: jest.fn((low, high) => Math.floor(low + Math.random() * (high - low + 1)))
        };
        
        // Enhanced Raycaster
        global.THREE.Raycaster = jest.fn(() => ({
            ray: {
                origin: createVector3Mock(),
                direction: createVector3Mock(0, 0, -1)
            },
            near: 0,
            far: Infinity,
            setFromCamera: jest.fn(),
            intersectObjects: jest.fn(() => []),
            intersectObject: jest.fn(() => [])
        }));
        
        // Enhanced Clock
        global.THREE.Clock = jest.fn(() => ({
            autoStart: true,
            startTime: 0,
            oldTime: 0,
            elapsedTime: 0,
            running: false,
            start: jest.fn(),
            stop: jest.fn(),
            getElapsedTime: jest.fn(() => 1.0),
            getDelta: jest.fn(() => 0.016)
        }));
        
        console.log('Enhanced Three.js mocks applied successfully');
    }
}

// Auto-apply when imported
applyEnhancedThreeJSMocks();