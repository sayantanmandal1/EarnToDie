/**
 * Unit tests for Vehicle2D class
 * Tests vehicle behavior, upgrades, and rendering
 */

import Vehicle2D from '../vehicles/Vehicle2D.js';

// Mock game engine
const mockGameEngine = {
  physics: {
    world: {
      bodies: [],
      constraints: []
    }
  },
  getAsset: jest.fn(),
  emit: jest.fn()
};

// Mock canvas context
const mockCtx = {
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  drawImage: jest.fn(),
  set fillStyle(value) { this._fillStyle = value; },
  get fillStyle() { return this._fillStyle; },
  set strokeStyle(value) { this._strokeStyle = value; },
  get strokeStyle() { return this._strokeStyle; },
  set lineWidth(value) { this._lineWidth = value; },
  get lineWidth() { return this._lineWidth; }
};

describe('Vehicle2D', () => {
  let vehicle;
  
  beforeEach(() => {
    vehicle = new Vehicle2D('starter_car', mockGameEngine, 100, 200);
    mockGameEngine.getAsset.mockClear();
    mockGameEngine.emit.mockClear();
  });
  
  afterEach(() => {
    if (vehicle) {
      vehicle.dispose();
    }
  });
  
  describe('Vehicle Creation', () => {
    test('should create vehicle with correct properties', () => {
      expect(vehicle.type).toBe('starter_car');
      expect(vehicle.position.x).toBe(100);
      expect(vehicle.position.y).toBe(200);
      expect(vehicle.health).toBe(100);
      expect(vehicle.isDestroyed).toBe(false);
      expect(vehicle.isInitialized).toBe(false);
    });
    
    test('should generate unique ID', () => {
      const vehicle2 = new Vehicle2D('starter_car', mockGameEngine);
      expect(vehicle.id).toBeDefined();
      expect(vehicle2.id).toBeDefined();
      expect(vehicle.id).not.toBe(vehicle2.id);
      vehicle2.dispose();
    });
    
    test('should set correct stats for vehicle type', () => {
      expect(vehicle.baseStats.mass).toBe(1000);
      expect(vehicle.baseStats.enginePower).toBe(50);
      expect(vehicle.baseStats.fuelCapacity).toBe(100);
      expect(vehicle.fuel).toBe(100);
    });
    
    test('should set correct stats for different vehicle types', () => {
      const sportsCarVehicle = new Vehicle2D('sports_car', mockGameEngine);
      expect(sportsCarVehicle.baseStats.maxSpeed).toBe(25);
      expect(sportsCarVehicle.baseStats.armor).toBe(5);
      sportsCarVehicle.dispose();
      
      const truckVehicle = new Vehicle2D('old_truck', mockGameEngine);
      expect(truckVehicle.baseStats.mass).toBe(1500);
      expect(truckVehicle.baseStats.armor).toBe(25);
      truckVehicle.dispose();
    });
  });
  
  describe('Vehicle Initialization', () => {
    test('should initialize successfully', async () => {
      const result = await vehicle.initialize();
      
      expect(result).toBe(true);
      expect(vehicle.isInitialized).toBe(true);
      expect(vehicle.physics).toBeDefined();
      expect(vehicle.physics.body).toBeDefined();
    });
    
    test('should try to load sprite', async () => {
      await vehicle.initialize();
      
      expect(mockGameEngine.getAsset).toHaveBeenCalledWith('starter_car_sprite');
    });
  });
  
  describe('Vehicle Controls', () => {
    beforeEach(async () => {
      await vehicle.initialize();
    });
    
    test('should set controls correctly', () => {
      const controls = {
        throttle: 0.8,
        steering: -0.5,
        brake: 0.2,
        tilt: 0.3
      };
      
      vehicle.setControls(controls);
      
      expect(vehicle.controls.throttle).toBe(0.8);
      expect(vehicle.controls.steering).toBe(-0.5);
      expect(vehicle.controls.brake).toBe(0.2);
      expect(vehicle.controls.tilt).toBe(0.3);
    });
    
    test('should merge controls with existing values', () => {
      vehicle.setControls({ throttle: 0.5, steering: 0.2 });
      vehicle.setControls({ throttle: 0.8 });
      
      expect(vehicle.controls.throttle).toBe(0.8);
      expect(vehicle.controls.steering).toBe(0.2); // Should remain unchanged
    });
  });
  
  describe('Vehicle Damage System', () => {
    beforeEach(async () => {
      await vehicle.initialize();
    });
    
    test('should take damage correctly', () => {
      const damage = vehicle.takeDamage(30);
      
      expect(damage).toBeCloseTo(30); // No armor initially
      expect(vehicle.health).toBe(70);
    });
    
    test('should reduce damage based on armor', () => {
      vehicle.stats.armor = 50; // 50% damage reduction
      const damage = vehicle.takeDamage(100);
      
      expect(damage).toBeCloseTo(50);
      expect(vehicle.health).toBe(50);
    });
    
    test('should not take damage when destroyed', () => {
      vehicle.health = 0;
      vehicle.isDestroyed = true;
      
      const damage = vehicle.takeDamage(50);
      
      expect(damage).toBe(0);
      expect(vehicle.health).toBe(0);
    });
    
    test('should destroy vehicle when health reaches zero', () => {
      vehicle.takeDamage(100);
      
      expect(vehicle.health).toBe(0);
      expect(vehicle.isDestroyed).toBe(true);
      expect(mockGameEngine.emit).toHaveBeenCalledWith('vehicleDestroyed',
        expect.objectContaining({
          position: vehicle.position,
          vehicle: vehicle
        })
      );
    });
    
    test('should emit damage effect event', () => {
      vehicle.takeDamage(25, 'explosion');
      
      expect(mockGameEngine.emit).toHaveBeenCalledWith('vehicleDamageEffect',
        expect.objectContaining({
          position: vehicle.position,
          damage: 25,
          type: 'explosion'
        })
      );
    });
  });
  
  describe('Vehicle Repair and Refuel', () => {
    beforeEach(async () => {
      await vehicle.initialize();
    });
    
    test('should repair vehicle correctly', () => {
      vehicle.health = 50;
      vehicle.repair(30);
      
      expect(vehicle.health).toBe(80);
    });
    
    test('should not repair above maximum health', () => {
      vehicle.health = 90;
      vehicle.repair(20);
      
      expect(vehicle.health).toBe(100);
    });
    
    test('should not repair destroyed vehicle', () => {
      vehicle.isDestroyed = true;
      vehicle.health = 0;
      vehicle.repair(50);
      
      expect(vehicle.health).toBe(0);
    });
    
    test('should refuel vehicle correctly', () => {
      vehicle.fuel = 50;
      vehicle.refuel(30);
      
      expect(vehicle.fuel).toBe(80);
    });
    
    test('should not refuel above capacity', () => {
      vehicle.fuel = 90;
      vehicle.refuel(20);
      
      expect(vehicle.fuel).toBe(100); // Capacity is 100 for starter car
    });
  });
  
  describe('Vehicle Upgrades', () => {
    beforeEach(async () => {
      await vehicle.initialize();
    });
    
    test('should apply engine upgrades', () => {
      const originalPower = vehicle.stats.enginePower;
      const originalSpeed = vehicle.stats.maxSpeed;
      
      vehicle.applyUpgrade('engine', 2);
      
      expect(vehicle.upgrades.engine).toBe(2);
      expect(vehicle.stats.enginePower).toBeGreaterThan(originalPower);
      expect(vehicle.stats.maxSpeed).toBeGreaterThan(originalSpeed);
    });
    
    test('should apply fuel upgrades', () => {
      const originalCapacity = vehicle.stats.fuelCapacity;
      
      vehicle.applyUpgrade('fuel', 3);
      
      expect(vehicle.upgrades.fuel).toBe(3);
      expect(vehicle.stats.fuelCapacity).toBeGreaterThan(originalCapacity);
    });
    
    test('should apply armor upgrades', () => {
      const originalArmor = vehicle.stats.armor;
      
      vehicle.applyUpgrade('armor', 2);
      
      expect(vehicle.upgrades.armor).toBe(2);
      expect(vehicle.stats.armor).toBeGreaterThan(originalArmor);
    });
    
    test('should apply wheel upgrades', () => {
      const originalHandling = vehicle.stats.handling;
      
      vehicle.applyUpgrade('wheels', 1);
      
      expect(vehicle.upgrades.wheels).toBe(1);
      expect(vehicle.stats.handling).toBeGreaterThan(originalHandling);
    });
    
    test('should clamp upgrade levels between 0 and 5', () => {
      vehicle.applyUpgrade('engine', -1);
      expect(vehicle.upgrades.engine).toBe(0);
      
      vehicle.applyUpgrade('engine', 10);
      expect(vehicle.upgrades.engine).toBe(5);
    });
    
    test('should ignore invalid upgrade categories', () => {
      const originalUpgrades = { ...vehicle.upgrades };
      
      vehicle.applyUpgrade('invalid_category', 3);
      
      expect(vehicle.upgrades).toEqual(originalUpgrades);
    });
  });
  
  describe('Vehicle State Getters', () => {
    beforeEach(async () => {
      await vehicle.initialize();
    });
    
    test('should get position correctly', () => {
      vehicle.position = { x: 150, y: 250 };
      const position = vehicle.getPosition();
      
      expect(position.x).toBe(150);
      expect(position.y).toBe(250);
      expect(position).not.toBe(vehicle.position); // Should return copy
    });
    
    test('should get velocity correctly', () => {
      vehicle.velocity = { x: 5, y: -2 };
      const velocity = vehicle.getVelocity();
      
      expect(velocity.x).toBe(5);
      expect(velocity.y).toBe(-2);
      expect(velocity).not.toBe(vehicle.velocity); // Should return copy
    });
    
    test('should get health percentage', () => {
      vehicle.health = 75;
      expect(vehicle.getHealthPercentage()).toBe(0.75);
      
      vehicle.health = 0;
      expect(vehicle.getHealthPercentage()).toBe(0);
    });
    
    test('should get fuel percentage', () => {
      vehicle.fuel = 50;
      expect(vehicle.getFuelPercentage()).toBe(0.5);
      
      vehicle.fuel = 0;
      expect(vehicle.getFuelPercentage()).toBe(0);
    });
  });
  
  describe('Vehicle Update', () => {
    beforeEach(async () => {
      await vehicle.initialize();
    });
    
    test('should not update when not initialized', () => {
      const uninitializedVehicle = new Vehicle2D('starter_car', mockGameEngine);
      const spy = jest.spyOn(uninitializedVehicle.physics, 'update');
      
      uninitializedVehicle.update(16);
      
      expect(spy).not.toHaveBeenCalled();
      uninitializedVehicle.dispose();
    });
    
    test('should not update when destroyed', () => {
      vehicle.isDestroyed = true;
      const spy = jest.spyOn(vehicle.physics, 'update');
      
      vehicle.update(16);
      
      expect(spy).not.toHaveBeenCalled();
    });
    
    test('should update physics when active', () => {
      const spy = jest.spyOn(vehicle.physics, 'update');
      
      vehicle.update(16);
      
      expect(spy).toHaveBeenCalledWith(16, vehicle.controls);
    });
    
    test('should consume fuel when throttling', () => {
      vehicle.controls.throttle = 0.8;
      const initialFuel = vehicle.fuel;
      
      vehicle.update(1000); // 1 second
      
      expect(vehicle.fuel).toBeLessThan(initialFuel);
    });
    
    test('should not consume fuel when not throttling', () => {
      vehicle.controls.throttle = 0;
      const initialFuel = vehicle.fuel;
      
      vehicle.update(1000);
      
      expect(vehicle.fuel).toBe(initialFuel);
    });
    
    test('should consume fuel more efficiently with upgrades', () => {
      vehicle.applyUpgrade('fuel', 2); // 20% better efficiency
      vehicle.controls.throttle = 1.0;
      
      const fuelWithUpgrade = vehicle.fuel;
      vehicle.update(1000);
      const fuelAfterWithUpgrade = vehicle.fuel;
      
      // Create comparison vehicle without upgrades
      const compareVehicle = new Vehicle2D('starter_car', mockGameEngine);
      compareVehicle.initialize().then(() => {
        compareVehicle.controls.throttle = 1.0;
        compareVehicle.update(1000);
        
        const consumptionWithUpgrade = fuelWithUpgrade - fuelAfterWithUpgrade;
        const consumptionWithoutUpgrade = 100 - compareVehicle.fuel;
        
        expect(consumptionWithUpgrade).toBeLessThan(consumptionWithoutUpgrade);
        compareVehicle.dispose();
      });
    });
  });
  
  describe('Vehicle Rendering', () => {
    beforeEach(async () => {
      await vehicle.initialize();
    });
    
    test('should not render when not initialized', () => {
      const uninitializedVehicle = new Vehicle2D('starter_car', mockGameEngine);
      
      uninitializedVehicle.render(mockCtx);
      
      expect(mockCtx.save).not.toHaveBeenCalled();
      uninitializedVehicle.dispose();
    });
    
    test('should not render when destroyed', () => {
      vehicle.isDestroyed = true;
      
      vehicle.render(mockCtx);
      
      expect(mockCtx.save).not.toHaveBeenCalled();
    });
    
    test('should render vehicle body', () => {
      vehicle.render(mockCtx);
      
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.translate).toHaveBeenCalledWith(vehicle.position.x, vehicle.position.y);
      expect(mockCtx.rotate).toHaveBeenCalledWith(vehicle.rotation);
      expect(mockCtx.restore).toHaveBeenCalled();
    });
    
    test('should render sprite if available', () => {
      const mockSprite = { width: 80, height: 40 };
      mockGameEngine.getAsset.mockReturnValue(mockSprite);
      vehicle.sprite = mockSprite;
      
      vehicle.render(mockCtx);
      
      expect(mockCtx.drawImage).toHaveBeenCalledWith(
        mockSprite,
        -vehicle.width / 2,
        -vehicle.height / 2,
        vehicle.width,
        vehicle.height
      );
    });
    
    test('should render basic rectangle when no sprite', () => {
      vehicle.sprite = null;
      
      vehicle.render(mockCtx);
      
      expect(mockCtx.fillRect).toHaveBeenCalledWith(
        -vehicle.width / 2,
        -vehicle.height / 2,
        vehicle.width,
        vehicle.height
      );
    });
    
    test('should render upgrades when present', () => {
      vehicle.applyUpgrade('engine', 2);
      vehicle.controls.throttle = 0.5; // For exhaust smoke
      
      vehicle.render(mockCtx);
      
      // Should render exhaust smoke
      expect(mockCtx.arc).toHaveBeenCalled();
    });
    
    test('should render damage effects when damaged', () => {
      vehicle.health = 50; // 50% health for damage effects
      
      vehicle.render(mockCtx);
      
      // Should render damage cracks
      expect(mockCtx.moveTo).toHaveBeenCalled();
      expect(mockCtx.lineTo).toHaveBeenCalled();
    });
  });
  
  describe('Vehicle Disposal', () => {
    test('should dispose correctly', async () => {
      await vehicle.initialize();
      const physicsSpy = jest.spyOn(vehicle.physics, 'dispose');
      
      vehicle.dispose();
      
      expect(physicsSpy).toHaveBeenCalled();
      expect(vehicle.isDestroyed).toBe(true);
      expect(vehicle.isInitialized).toBe(false);
    });
  });
  
  describe('Vehicle Color System', () => {
    test('should return correct colors for different vehicle types', () => {
      const starterCar = new Vehicle2D('starter_car', mockGameEngine);
      expect(starterCar.color).toBe('#8b4513');
      
      const sportsCar = new Vehicle2D('sports_car', mockGameEngine);
      expect(sportsCar.color).toBe('#ff4500');
      
      const truck = new Vehicle2D('old_truck', mockGameEngine);
      expect(truck.color).toBe('#654321');
      
      starterCar.dispose();
      sportsCar.dispose();
      truck.dispose();
    });
    
    test('should return default color for unknown vehicle type', () => {
      const unknownVehicle = new Vehicle2D('unknown_type', mockGameEngine);
      expect(unknownVehicle.color).toBe('#8b4513'); // Default starter car color
      unknownVehicle.dispose();
    });
  });
});