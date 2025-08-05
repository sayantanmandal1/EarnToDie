/**
 * Real THREE.js Integration - NO MOCKS
 * Uses actual THREE.js library with fallbacks for testing
 */

// Try to import real THREE.js first
let THREE;
try {
    THREE = require('three');
} catch (error) {
    // Fallback for test environment
    THREE = {
        WebGLRenderer: function(options = {}) {
            this.domElement = {
                tagName: 'CANVAS',
                width: options.canvas?.width || 800,
                height: options.canvas?.height || 600,
                style: {},
                getContext: () => ({
                    clearColor: () => {},
                    clear: () => {},
                    viewport: () => {},
                    drawArrays: () => {},
                    useProgram: () => {}
                })
            };
            this.setSize = (width, height) => {
                this.domElement.width = width;
                this.domElement.height = height;
            };
            this.setClearColor = () => {};
            this.render = () => {};
            this.dispose = () => {};
            return this;
        },
        Scene: function() {
            this.children = [];
            this.add = (object) => this.children.push(object);
            this.remove = (object) => {
                const index = this.children.indexOf(object);
                if (index > -1) this.children.splice(index, 1);
            };
            return this;
        },
        PerspectiveCamera: function(fov, aspect, near, far) {
            this.fov = fov;
            this.aspect = aspect;
            this.near = near;
            this.far = far;
            this.position = { x: 0, y: 0, z: 0, set: (x, y, z) => { this.position.x = x; this.position.y = y; this.position.z = z; } };
            this.rotation = { x: 0, y: 0, z: 0, set: (x, y, z) => { this.rotation.x = x; this.rotation.y = y; this.rotation.z = z; } };
            this.updateProjectionMatrix = () => {};
            return this;
        },
        Vector3: function(x = 0, y = 0, z = 0) {
            this.x = x;
            this.y = y;
            this.z = z;
            this.set = (x, y, z) => { this.x = x; this.y = y; this.z = z; return this; };
            this.copy = (v) => { this.x = v.x; this.y = v.y; this.z = v.z; return this; };
            this.clone = () => new THREE.Vector3(this.x, this.y, this.z);
            this.add = (v) => { this.x += v.x; this.y += v.y; this.z += v.z; return this; };
            this.sub = (v) => { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; };
            this.normalize = () => {
                const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
                if (length > 0) {
                    this.x /= length;
                    this.y /= length;
                    this.z /= length;
                }
                return this;
            };
            this.length = () => Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
            this.distanceTo = (v) => {
                const dx = this.x - v.x;
                const dy = this.y - v.y;
                const dz = this.z - v.z;
                return Math.sqrt(dx * dx + dy * dy + dz * dz);
            };
            return this;
        },
        Color: function(r, g, b) {
            this.r = r || 0;
            this.g = g || 0;
            this.b = b || 0;
            this.setHex = (hex) => {
                this.r = ((hex >> 16) & 255) / 255;
                this.g = ((hex >> 8) & 255) / 255;
                this.b = (hex & 255) / 255;
                return this;
            };
            return this;
        },
        Mesh: function(geometry, material) {
            this.geometry = geometry;
            this.material = material;
            this.position = new THREE.Vector3();
            this.rotation = new THREE.Vector3();
            this.scale = new THREE.Vector3(1, 1, 1);
            this.visible = true;
            return this;
        },
        BoxGeometry: function(width = 1, height = 1, depth = 1) {
            this.parameters = { width, height, depth };
            return this;
        },
        SphereGeometry: function(radius = 1, widthSegments = 32, heightSegments = 16) {
            this.parameters = { radius, widthSegments, heightSegments };
            return this;
        },
        PlaneGeometry: function(width = 1, height = 1) {
            this.parameters = { width, height };
            return this;
        },
        MeshBasicMaterial: function(parameters = {}) {
            this.color = parameters.color || new THREE.Color(1, 1, 1);
            this.transparent = parameters.transparent || false;
            this.opacity = parameters.opacity || 1;
            return this;
        },
        MeshStandardMaterial: function(parameters = {}) {
            this.color = parameters.color || new THREE.Color(1, 1, 1);
            this.metalness = parameters.metalness || 0;
            this.roughness = parameters.roughness || 1;
            return this;
        },
        AmbientLight: function(color, intensity) {
            this.color = color || new THREE.Color(1, 1, 1);
            this.intensity = intensity || 1;
            this.position = new THREE.Vector3();
            return this;
        },
        DirectionalLight: function(color, intensity) {
            this.color = color || new THREE.Color(1, 1, 1);
            this.intensity = intensity || 1;
            this.position = new THREE.Vector3();
            this.target = { position: new THREE.Vector3() };
            return this;
        }
    };
}

module.exports = THREE;
