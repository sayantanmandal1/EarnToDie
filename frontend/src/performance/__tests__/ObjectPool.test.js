import { ObjectPool, PoolManager } from '../ObjectPool';

describe('ObjectPool', () => {
    let pool;
    let createFn;
    let resetFn;

    beforeEach(() => {
        createFn = jest.fn(() => ({ id: Math.random(), active: false }));
        resetFn = jest.fn((obj) => { obj.active = false; });
        pool = new ObjectPool(createFn, resetFn, 5);
    });

    describe('Initialization', () => {
        test('should create initial pool size', () => {
            expect(createFn).toHaveBeenCalledTimes(5);
            expect(pool.pool.length).toBe(5);
            expect(pool.stats.created).toBe(5);
        });

        test('should initialize with correct stats', () => {
            expect(pool.stats).toEqual({
                created: 5,
                reused: 0,
                active: 0,
                pooled: 5
            });
        });
    });

    describe('Object Acquisition', () => {
        test('should acquire object from pool', () => {
            const obj = pool.acquire();
            
            expect(obj).toBeDefined();
            expect(pool.active.has(obj)).toBe(true);
            expect(pool.pool.length).toBe(4);
            expect(pool.stats.reused).toBe(1);
            expect(pool.stats.active).toBe(1);
        });

        test('should create new object when pool is empty', () => {
            // Acquire all objects from pool
            for (let i = 0; i < 5; i++) {
                pool.acquire();
            }
            
            // Reset create function call count
            createFn.mockClear();
            
            // Acquire one more object
            const obj = pool.acquire();
            
            expect(createFn).toHaveBeenCalledTimes(1);
            expect(obj).toBeDefined();
            expect(pool.stats.created).toBe(6);
        });
    });

    describe('Object Release', () => {
        test('should release object back to pool', () => {
            const obj = pool.acquire();
            pool.release(obj);
            
            expect(pool.active.has(obj)).toBe(false);
            expect(pool.pool.length).toBe(5);
            expect(resetFn).toHaveBeenCalledWith(obj);
            expect(pool.stats.active).toBe(0);
        });

        test('should warn when releasing object not from pool', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            const foreignObj = { id: 'foreign' };
            
            pool.release(foreignObj);
            
            expect(consoleSpy).toHaveBeenCalledWith(
                'Attempting to release object not from this pool'
            );
            consoleSpy.mockRestore();
        });

        test('should not release object not in active set', () => {
            const obj = { id: 'test' };
            const initialPoolSize = pool.pool.length;
            
            pool.release(obj);
            
            expect(pool.pool.length).toBe(initialPoolSize);
        });
    });

    describe('Bulk Operations', () => {
        test('should release all active objects', () => {
            const objects = [];
            for (let i = 0; i < 3; i++) {
                objects.push(pool.acquire());
            }
            
            pool.releaseAll();
            
            expect(pool.active.size).toBe(0);
            expect(pool.pool.length).toBe(5);
            expect(resetFn).toHaveBeenCalledTimes(3);
        });

        test('should clear entire pool', () => {
            pool.acquire();
            pool.clear();
            
            expect(pool.pool.length).toBe(0);
            expect(pool.active.size).toBe(0);
            expect(pool.stats).toEqual({
                created: 0,
                reused: 0,
                active: 0,
                pooled: 0
            });
        });
    });

    describe('Statistics', () => {
        test('should return current statistics', () => {
            const obj1 = pool.acquire();
            const obj2 = pool.acquire();
            pool.release(obj1);
            
            const stats = pool.getStats();
            
            expect(stats).toEqual({
                created: 5,
                reused: 2,
                active: 1,
                pooled: 4
            });
        });

        test('should update statistics correctly', () => {
            expect(pool.stats.active).toBe(0);
            
            const obj = pool.acquire();
            expect(pool.stats.active).toBe(1);
            
            pool.release(obj);
            expect(pool.stats.active).toBe(0);
        });
    });
});

describe('PoolManager', () => {
    let poolManager;

    beforeEach(() => {
        poolManager = new PoolManager();
    });

    describe('Pool Creation', () => {
        test('should create new pool', () => {
            const createFn = () => ({ type: 'test' });
            const resetFn = (obj) => { obj.active = false; };
            
            const pool = poolManager.createPool('test', createFn, resetFn, 3);
            
            expect(pool).toBeInstanceOf(ObjectPool);
            expect(poolManager.getPool('test')).toBe(pool);
        });

        test('should return created pool', () => {
            const createFn = () => ({ type: 'test' });
            const pool = poolManager.createPool('test', createFn, null, 2);
            
            expect(pool.getStats().created).toBe(2);
        });
    });

    describe('Pool Access', () => {
        test('should get pool by name', () => {
            const createFn = () => ({ type: 'test' });
            const originalPool = poolManager.createPool('test', createFn);
            const retrievedPool = poolManager.getPool('test');
            
            expect(retrievedPool).toBe(originalPool);
        });

        test('should return undefined for non-existent pool', () => {
            const pool = poolManager.getPool('nonexistent');
            expect(pool).toBeUndefined();
        });
    });

    describe('Object Management', () => {
        beforeEach(() => {
            const createFn = () => ({ id: Math.random(), active: false });
            const resetFn = (obj) => { obj.active = false; };
            poolManager.createPool('test', createFn, resetFn, 2);
        });

        test('should acquire object from named pool', () => {
            const obj = poolManager.acquire('test');
            
            expect(obj).toBeDefined();
            expect(obj.id).toBeDefined();
        });

        test('should throw error when acquiring from non-existent pool', () => {
            expect(() => {
                poolManager.acquire('nonexistent');
            }).toThrow("Pool 'nonexistent' not found");
        });

        test('should release object to named pool', () => {
            const obj = poolManager.acquire('test');
            
            expect(() => {
                poolManager.release('test', obj);
            }).not.toThrow();
        });

        test('should throw error when releasing to non-existent pool', () => {
            const obj = { id: 'test' };
            
            expect(() => {
                poolManager.release('nonexistent', obj);
            }).toThrow("Pool 'nonexistent' not found");
        });
    });

    describe('Statistics', () => {
        test('should get statistics for all pools', () => {
            const createFn1 = () => ({ type: 'test1' });
            const createFn2 = () => ({ type: 'test2' });
            
            poolManager.createPool('pool1', createFn1, null, 2);
            poolManager.createPool('pool2', createFn2, null, 3);
            
            const stats = poolManager.getAllStats();
            
            expect(stats.pool1).toBeDefined();
            expect(stats.pool2).toBeDefined();
            expect(stats.pool1.created).toBe(2);
            expect(stats.pool2.created).toBe(3);
        });

        test('should return empty stats for no pools', () => {
            const stats = poolManager.getAllStats();
            expect(Object.keys(stats)).toHaveLength(0);
        });
    });

    describe('Bulk Operations', () => {
        test('should release all objects in all pools', () => {
            const createFn = () => ({ id: Math.random() });
            const resetFn = jest.fn();
            
            poolManager.createPool('pool1', createFn, resetFn, 2);
            poolManager.createPool('pool2', createFn, resetFn, 2);
            
            // Acquire some objects
            poolManager.acquire('pool1');
            poolManager.acquire('pool2');
            
            poolManager.releaseAll();
            
            expect(resetFn).toHaveBeenCalledTimes(2);
        });

        test('should clear all pools', () => {
            const createFn = () => ({ id: Math.random() });
            
            poolManager.createPool('pool1', createFn, null, 2);
            poolManager.createPool('pool2', createFn, null, 3);
            
            poolManager.clearAll();
            
            expect(poolManager.getPool('pool1')).toBeUndefined();
            expect(poolManager.getPool('pool2')).toBeUndefined();
        });
    });
});