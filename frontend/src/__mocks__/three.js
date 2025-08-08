// PERFECT THREE.JS MOCK - FIXES ALL CONSTRUCTOR ISSUES
const THREE = {
    // CORE CLASSES WITH PROPER CONSTRUCTORS
    Color: function (r = 1, g = 1, b = 1) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.isColor = true;

        this.set = jest.fn().mockReturnThis();
        this.setHex = jest.fn().mockReturnThis();
        this.setRGB = jest.fn().mockReturnThis();
        this.setHSL = jest.fn().mockReturnThis();
        this.clone = jest.fn().mockReturnThis();
        this.copy = jest.fn().mockReturnThis();
        this.getHex = jest.fn(() => 0xffffff);
        this.getHexString = jest.fn(() => 'ffffff');
        this.getStyle = jest.fn(() => 'rgb(255,255,255)');

        return this;
    },

    Vector3: function (x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.isVector3 = true;

        this.set = jest.fn().mockReturnThis();
        this.add = jest.fn().mockReturnThis();
        this.sub = jest.fn().mockReturnThis();
        this.multiply = jest.fn().mockReturnThis();
        this.normalize = jest.fn().mockReturnThis();
        this.length = jest.fn(() => 1);
        this.clone = jest.fn().mockReturnThis();
        this.copy = jest.fn().mockReturnThis();

        return this;
    },

    Vector2: function (x = 0, y = 0) {
        this.x = x;
        this.y = y;
        this.isVector2 = true;

        this.set = jest.fn().mockReturnThis();
        this.add = jest.fn().mockReturnThis();
        this.sub = jest.fn().mockReturnThis();
        this.normalize = jest.fn().mockReturnThis();
        this.length = jest.fn(() => 1);
        this.clone = jest.fn().mockReturnThis();

        return this;
    },

    Scene: function () {
        this.type = 'Scene';
        this.children = [];
        this.background = null;
        this.fog = null;

        this.add = jest.fn();
        this.remove = jest.fn();
        this.traverse = jest.fn();
        this.getObjectByName = jest.fn();

        return this;
    },

    PerspectiveCamera: function (fov = 50, aspect = 1, near = 0.1, far = 2000) {
        this.type = 'PerspectiveCamera';
        this.fov = fov;
        this.aspect = aspect;
        this.near = near;
        this.far = far;
        this.position = new THREE.Vector3();
        this.rotation = { x: 0, y: 0, z: 0 };

        this.lookAt = jest.fn();
        this.updateProjectionMatrix = jest.fn();

        return this;
    },

    WebGLRenderer: function (parameters = {}) {
        this.domElement = document.createElement('canvas');
        this.shadowMap = { enabled: false, type: THREE.PCFShadowMap };

        this.setSize = jest.fn();
        this.setPixelRatio = jest.fn();
        this.setClearColor = jest.fn();
        this.render = jest.fn();
        this.dispose = jest.fn();

        return this;
    },

    Mesh: function (geometry, material) {
        this.type = 'Mesh';
        this.geometry = geometry;
        this.material = material;
        this.position = new THREE.Vector3();
        this.rotation = { x: 0, y: 0, z: 0 };
        this.scale = new THREE.Vector3(1, 1, 1);

        this.add = jest.fn();
        this.remove = jest.fn();
        this.lookAt = jest.fn();

        return this;
    },

    BoxGeometry: function (width = 1, height = 1, depth = 1) {
        this.type = 'BoxGeometry';
        this.parameters = { width, height, depth };

        return this;
    },

    BufferGeometry: function () {
        this.type = 'BufferGeometry';
        this.attributes = {};
        this.index = null;

        this.setAttribute = jest.fn().mockReturnThis();
        this.setIndex = jest.fn().mockReturnThis();
        this.computeBoundingBox = jest.fn();
        this.computeBoundingSphere = jest.fn();
        this.dispose = jest.fn();

        return this;
    },

    SphereGeometry: function (radius = 1, widthSegments = 32, heightSegments = 16) {
        this.type = 'SphereGeometry';
        this.parameters = { radius, widthSegments, heightSegments };

        return this;
    },

    MeshBasicMaterial: function (parameters = {}) {
        this.type = 'MeshBasicMaterial';
        this.color = new THREE.Color();
        this.transparent = parameters.transparent || false;
        this.opacity = parameters.opacity || 1;

        return this;
    },

    AmbientLight: function (color = 0xffffff, intensity = 1) {
        this.type = 'AmbientLight';
        this.color = new THREE.Color(color);
        this.intensity = intensity;

        return this;
    },

    DirectionalLight: function (color = 0xffffff, intensity = 1) {
        this.type = 'DirectionalLight';
        this.color = new THREE.Color(color);
        this.intensity = intensity;
        this.position = new THREE.Vector3();
        this.target = { position: new THREE.Vector3() };

        return this;
    },

    // CONSTANTS
    PCFShadowMap: 1,
    NoToneMapping: 0,
    LinearToneMapping: 1,
    ReinhardToneMapping: 2,
    CineonToneMapping: 3,
    ACESFilmicToneMapping: 4,

    // MATH UTILITIES
    MathUtils: {
        degToRad: (degrees) => degrees * Math.PI / 180,
        radToDeg: (radians) => radians * 180 / Math.PI,
        clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
        lerp: (x, y, t) => (1 - t) * x + t * y,
        generateUUID: () => 'mock-uuid-' + Math.random().toString(36).substr(2, 9)
    }
};

// Make constructors work properly
Object.keys(THREE).forEach(key => {
    if (typeof THREE[key] === 'function' && key !== 'MathUtils') {
        THREE[key].prototype = THREE[key].prototype || {};
        THREE[key].prototype.constructor = THREE[key];
    }
});

module.exports = THREE;
export default THREE;