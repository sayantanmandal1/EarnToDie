/**
 * Zombie AI Test Fixes
 * Addresses specific issues with ZombieAI test mocks and logic
 */

// Enhanced position mock that includes all Vector3 methods
export const createPositionMock = (x = 0, y = 0, z = 0) => ({
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
        return createPositionMock(this.x, this.y, this.z);
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
    })
});

// Apply zombie test fixes
export function applyZombieTestFixes() {
    // Ensure THREE.Vector3 constructor returns objects that pass instanceof checks
    if (global.THREE && global.THREE.Vector3) {
        const originalVector3 = global.THREE.Vector3;
        global.THREE.Vector3 = jest.fn((x, y, z) => {
            const instance = createPositionMock(x, y, z);
            // Make it pass instanceof checks
            Object.setPrototypeOf(instance, originalVector3.prototype);
            instance.constructor = originalVector3;
            return instance;
        });
        
        // Copy static methods if any
        Object.setPrototypeOf(global.THREE.Vector3, originalVector3);
        global.THREE.Vector3.prototype = originalVector3.prototype;
    }
    
    console.log('Zombie test fixes applied');
}

// Auto-apply when imported
applyZombieTestFixes();