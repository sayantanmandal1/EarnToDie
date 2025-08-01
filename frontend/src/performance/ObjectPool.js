/**
 * Object Pool - Manages reusable objects to reduce garbage collection
 */
export class ObjectPool {
    constructor(createFn, resetFn, initialSize = 10) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        this.active = new Set();
        
        // Pre-populate pool
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createFn());
        }
        
        this.stats = {
            created: initialSize,
            reused: 0,
            active: 0,
            pooled: initialSize
        };
    }

    /**
     * Get an object from the pool
     */
    acquire() {
        let obj;
        
        if (this.pool.length > 0) {
            obj = this.pool.pop();
            this.stats.reused++;
        } else {
            obj = this.createFn();
            this.stats.created++;
        }
        
        this.active.add(obj);
        this.stats.active = this.active.size;
        this.stats.pooled = this.pool.length;
        
        return obj;
    }

    /**
     * Return an object to the pool
     */
    release(obj) {
        if (!this.active.has(obj)) {
            console.warn('Attempting to release object not from this pool');
            return;
        }
        
        this.active.delete(obj);
        
        // Reset object state
        if (this.resetFn) {
            this.resetFn(obj);
        }
        
        this.pool.push(obj);
        this.stats.active = this.active.size;
        this.stats.pooled = this.pool.length;
    }

    /**
     * Release all active objects
     */
    releaseAll() {
        this.active.forEach(obj => {
            if (this.resetFn) {
                this.resetFn(obj);
            }
            this.pool.push(obj);
        });
        
        this.active.clear();
        this.stats.active = 0;
        this.stats.pooled = this.pool.length;
    }

    /**
     * Get pool statistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Clear the entire pool
     */
    clear() {
        this.pool = [];
        this.active.clear();
        this.stats = {
            created: 0,
            reused: 0,
            active: 0,
            pooled: 0
        };
    }
}

/**
 * Pool Manager - Manages multiple object pools
 */
export class PoolManager {
    constructor() {
        this.pools = new Map();
    }

    /**
     * Create a new pool
     */
    createPool(name, createFn, resetFn, initialSize = 10) {
        const pool = new ObjectPool(createFn, resetFn, initialSize);
        this.pools.set(name, pool);
        return pool;
    }

    /**
     * Get a pool by name
     */
    getPool(name) {
        return this.pools.get(name);
    }

    /**
     * Acquire object from named pool
     */
    acquire(poolName) {
        const pool = this.pools.get(poolName);
        if (!pool) {
            throw new Error(`Pool '${poolName}' not found`);
        }
        return pool.acquire();
    }

    /**
     * Release object to named pool
     */
    release(poolName, obj) {
        const pool = this.pools.get(poolName);
        if (!pool) {
            throw new Error(`Pool '${poolName}' not found`);
        }
        pool.release(obj);
    }

    /**
     * Get statistics for all pools
     */
    getAllStats() {
        const stats = {};
        this.pools.forEach((pool, name) => {
            stats[name] = pool.getStats();
        });
        return stats;
    }

    /**
     * Release all objects in all pools
     */
    releaseAll() {
        this.pools.forEach(pool => pool.releaseAll());
    }

    /**
     * Clear all pools
     */
    clearAll() {
        this.pools.forEach(pool => pool.clear());
        this.pools.clear();
    }
}