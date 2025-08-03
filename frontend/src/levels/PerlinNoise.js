/**
 * Perlin Noise Implementation
 * 
 * High-performance Perlin noise generator for terrain generation.
 * Based on Ken Perlin's improved noise algorithm with optimizations
 * for real-time terrain generation.
 */

class PerlinNoise {
    constructor(seed = 0) {
        this.seed = seed;
        this.permutation = [];
        this.gradients = [];
        
        this.initializePermutation();
        this.initializeGradients();
    }
    
    initializePermutation() {
        // Create base permutation array
        const basePermutation = [];
        for (let i = 0; i < 256; i++) {
            basePermutation[i] = i;
        }
        
        // Shuffle using seeded random
        this.seedRandom(this.seed);
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(this.seededRandom() * (i + 1));
            [basePermutation[i], basePermutation[j]] = [basePermutation[j], basePermutation[i]];
        }
        
        // Duplicate for wrapping
        this.permutation = new Array(512);
        for (let i = 0; i < 512; i++) {
            this.permutation[i] = basePermutation[i & 255];
        }
    }
    
    initializeGradients() {
        // Pre-computed gradient vectors for 2D noise
        this.gradients = [
            [1, 1], [-1, 1], [1, -1], [-1, -1],
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [Math.SQRT1_2, Math.SQRT1_2], [-Math.SQRT1_2, Math.SQRT1_2],
            [Math.SQRT1_2, -Math.SQRT1_2], [-Math.SQRT1_2, -Math.SQRT1_2]
        ];
    }
    
    seedRandom(seed) {
        this.randomSeed = seed;
    }
    
    seededRandom() {
        // Simple seeded random number generator
        this.randomSeed = (this.randomSeed * 9301 + 49297) % 233280;
        return this.randomSeed / 233280;
    }
    
    fade(t) {
        // Improved fade function: 6t^5 - 15t^4 + 10t^3
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    lerp(a, b, t) {
        return a + t * (b - a);
    }
    
    grad(hash, x, y) {
        // Get gradient vector from hash
        const gradient = this.gradients[hash & 11];
        return gradient[0] * x + gradient[1] * y;
    }
    
    noise(x, y) {
        // Find unit square containing point
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        
        // Find relative position within square
        x -= Math.floor(x);
        y -= Math.floor(y);
        
        // Compute fade curves
        const u = this.fade(x);
        const v = this.fade(y);
        
        // Hash coordinates of square corners
        const A = this.permutation[X] + Y;
        const AA = this.permutation[A];
        const AB = this.permutation[A + 1];
        const B = this.permutation[X + 1] + Y;
        const BA = this.permutation[B];
        const BB = this.permutation[B + 1];
        
        // Blend results from corners
        return this.lerp(
            this.lerp(
                this.grad(this.permutation[AA], x, y),
                this.grad(this.permutation[BA], x - 1, y),
                u
            ),
            this.lerp(
                this.grad(this.permutation[AB], x, y - 1),
                this.grad(this.permutation[BB], x - 1, y - 1),
                u
            ),
            v
        );
    }
    
    // Octave noise for more complex patterns
    octaveNoise(x, y, octaves = 4, persistence = 0.5, scale = 1) {
        let value = 0;
        let amplitude = 1;
        let frequency = scale;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
            value += this.noise(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }
        
        return value / maxValue;
    }
    
    // Ridged noise for mountain-like features
    ridgedNoise(x, y, octaves = 4, persistence = 0.5, scale = 1) {
        let value = 0;
        let amplitude = 1;
        let frequency = scale;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
            let n = Math.abs(this.noise(x * frequency, y * frequency));
            n = 1 - n; // Invert for ridges
            n = n * n; // Square for sharper ridges
            
            value += n * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }
        
        return value / maxValue;
    }
    
    // Turbulence for chaotic patterns
    turbulence(x, y, octaves = 4, scale = 1) {
        let value = 0;
        let amplitude = 1;
        let frequency = scale;
        
        for (let i = 0; i < octaves; i++) {
            value += Math.abs(this.noise(x * frequency, y * frequency)) * amplitude;
            amplitude *= 0.5;
            frequency *= 2;
        }
        
        return value;
    }
    
    // Fractal Brownian Motion
    fbm(x, y, octaves = 4, persistence = 0.5, lacunarity = 2, scale = 1) {
        let value = 0;
        let amplitude = 1;
        let frequency = scale;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
            value += this.noise(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }
        
        return value / maxValue;
    }
    
    // Domain warping for more organic shapes
    domainWarp(x, y, warpStrength = 1) {
        const warpX = this.noise(x * 0.1, y * 0.1) * warpStrength;
        const warpY = this.noise((x + 100) * 0.1, (y + 100) * 0.1) * warpStrength;
        
        return this.noise(x + warpX, y + warpY);
    }
    
    // Cellular noise for organic patterns
    cellular(x, y, cellSize = 1) {
        const cellX = Math.floor(x / cellSize);
        const cellY = Math.floor(y / cellSize);
        
        let minDistance = Infinity;
        
        // Check surrounding cells
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const neighborX = cellX + i;
                const neighborY = cellY + j;
                
                // Generate random point in cell
                this.seedRandom(neighborX * 73856093 + neighborY * 19349663);
                const pointX = (neighborX + this.seededRandom()) * cellSize;
                const pointY = (neighborY + this.seededRandom()) * cellSize;
                
                // Calculate distance
                const dx = x - pointX;
                const dy = y - pointY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                minDistance = Math.min(minDistance, distance);
            }
        }
        
        return minDistance / cellSize;
    }
    
    // Voronoi noise for cell-like patterns
    voronoi(x, y, cellSize = 1) {
        const cellX = Math.floor(x / cellSize);
        const cellY = Math.floor(y / cellSize);
        
        let minDistance = Infinity;
        let cellValue = 0;
        
        // Check surrounding cells
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                const neighborX = cellX + i;
                const neighborY = cellY + j;
                
                // Generate random point in cell
                this.seedRandom(neighborX * 73856093 + neighborY * 19349663);
                const pointX = (neighborX + this.seededRandom()) * cellSize;
                const pointY = (neighborY + this.seededRandom()) * cellSize;
                
                // Calculate distance
                const dx = x - pointX;
                const dy = y - pointY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    cellValue = this.seededRandom();
                }
            }
        }
        
        return cellValue;
    }
    
    // Simplex-style noise (approximation)
    simplexNoise(x, y) {
        // Skew input space to determine which simplex cell we're in
        const F2 = 0.5 * (Math.sqrt(3) - 1);
        const s = (x + y) * F2;
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);
        
        // Unskew the cell origin back to (x,y) space
        const G2 = (3 - Math.sqrt(3)) / 6;
        const t = (i + j) * G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = x - X0;
        const y0 = y - Y0;
        
        // Determine which simplex we are in
        let i1, j1;
        if (x0 > y0) {
            i1 = 1; j1 = 0;
        } else {
            i1 = 0; j1 = 1;
        }
        
        // Offsets for middle and last corners
        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + 2 * G2;
        const y2 = y0 - 1 + 2 * G2;
        
        // Work out the hashed gradient indices
        const ii = i & 255;
        const jj = j & 255;
        const gi0 = this.permutation[ii + this.permutation[jj]] % 12;
        const gi1 = this.permutation[ii + i1 + this.permutation[jj + j1]] % 12;
        const gi2 = this.permutation[ii + 1 + this.permutation[jj + 1]] % 12;
        
        // Calculate contributions from the three corners
        let n0, n1, n2;
        
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 < 0) {
            n0 = 0;
        } else {
            t0 *= t0;
            n0 = t0 * t0 * this.grad(gi0, x0, y0);
        }
        
        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 < 0) {
            n1 = 0;
        } else {
            t1 *= t1;
            n1 = t1 * t1 * this.grad(gi1, x1, y1);
        }
        
        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 < 0) {
            n2 = 0;
        } else {
            t2 *= t2;
            n2 = t2 * t2 * this.grad(gi2, x2, y2);
        }
        
        // Add contributions from each corner to get the final noise value
        return 70 * (n0 + n1 + n2);
    }
    
    // Utility method to generate noise maps
    generateNoiseMap(width, height, scale = 1, offsetX = 0, offsetY = 0) {
        const noiseMap = [];
        
        for (let x = 0; x < width; x++) {
            noiseMap[x] = [];
            for (let y = 0; y < height; y++) {
                const sampleX = (x + offsetX) * scale;
                const sampleY = (y + offsetY) * scale;
                noiseMap[x][y] = this.noise(sampleX, sampleY);
            }
        }
        
        return noiseMap;
    }
    
    // Normalize noise values to a specific range
    normalize(value, min = 0, max = 1) {
        // Assuming noise is in range [-1, 1]
        const normalized = (value + 1) * 0.5; // Convert to [0, 1]
        return min + normalized * (max - min);
    }
    
    // Apply smoothstep function for smoother transitions
    smoothstep(edge0, edge1, x) {
        const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return t * t * (3 - 2 * t);
    }
    
    // Combine multiple noise functions
    combineNoise(x, y, functions) {
        let result = 0;
        let totalWeight = 0;
        
        functions.forEach(func => {
            const weight = func.weight || 1;
            const value = func.function(x, y);
            result += value * weight;
            totalWeight += weight;
        });
        
        return totalWeight > 0 ? result / totalWeight : 0;
    }
}

export default PerlinNoise;