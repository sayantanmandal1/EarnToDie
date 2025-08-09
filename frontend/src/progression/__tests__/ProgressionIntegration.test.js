import ProgressionManager from '../ProgressionManager.js'
import DistanceTracker from '../DistanceTracker.js'
import CurrencySystem from '../CurrencySystem.js'

// Mock SaveManager for integration testing
class MockSaveManager {
  constructor() {
    this.saveData = {
      money: 0,
      statistics: {
        totalDistance: 0,
        bestDistance: 0,
        totalMoneyEarned: 0,
        totalMoneySpent: 0
      },
      runHistory: []
    }
  }

  loadGame() {
    return JSON.parse(JSON.stringify(this.saveData))
  }

  saveGame(data) {
    this.saveData = JSON.parse(JSON.stringify(data))
  }
}

describe('Progression System Integration', () => {
  let progressionManager
  let mockSaveManager
  let originalWindow

  beforeEach(() => {
    mockSaveManager = new MockSaveManager()
    progressionManager = new ProgressionManager(mockSaveManager)
    
    // Mock window for events
    originalWindow = global.window
    global.window = {
      dispatchEvent: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }
  })

  afterEach(() => {
    global.window = originalWindow
  })

  describe('Complete Run Workflow', () => {
    test('should handle a complete successful run', () => {
      const vehicle = { 
        type: 'STARTER_CAR', 
        upgrades: { engine: 1 },
        fuel: 100,
        health: 100
      }

      // Start run
      progressionManager.startRun({ x: 0, y: 0 }, vehicle)
      expect(progressionManager.distanceTracker.isRunActive).toBe(true)

      // Simulate driving progress
      const positions = [
        { x: 200, y: 0 },   // 200m
        { x: 600, y: 0 },   // 600m (milestone at 500m)
        { x: 1200, y: 0 },  // 1200m (milestone at 1000m)
        { x: 1800, y: 0 }   // 1800m
      ]

      positions.forEach(pos => {
        progressionManager.updateProgress(pos, vehicle)
      })

      // Check current stats
      const currentStats = progressionManager.getCurrentRunStats()
      expect(currentStats.distance).toBe(1800)
      expect(currentStats.milestones).toHaveLength(2) // 500m and 1000m

      // End run due to fuel depletion
      vehicle.fuel = 0
      progressionManager.updateProgress({ x: 1800, y: 0 }, vehicle)

      // Verify run ended automatically
      expect(progressionManager.distanceTracker.isRunActive).toBe(false)
      expect(progressionManager.runHistory).toHaveLength(1)

      // Check final results
      const run = progressionManager.runHistory[0]
      expect(run.distance).toBe(1800)
      expect(run.endReason).toBe('fuel_depleted')
      expect(run.baseMoney).toBe(180) // 1800 * 0.1
      expect(run.milestoneBonus).toBe(150) // 50 + 100
      expect(run.totalMoney).toBe(330)

      // Check currency was added
      expect(progressionManager.currencySystem.getCurrentMoney()).toBe(330)
    })

    test('should handle multiple runs with persistent data', () => {
      const vehicle = { fuel: 100, health: 100 }

      // First run - 1000m
      progressionManager.startRun({ x: 0, y: 0 })
      progressionManager.updateProgress({ x: 1000, y: 0 }, vehicle)
      progressionManager.endRun('fuel_depleted')

      const firstRunMoney = progressionManager.currencySystem.getCurrentMoney()
      expect(firstRunMoney).toBe(250) // 100 base + 150 milestones (500m + 1000m)

      // Second run - 1500m
      progressionManager.startRun({ x: 0, y: 0 })
      progressionManager.updateProgress({ x: 1500, y: 0 }, vehicle)
      progressionManager.endRun('vehicle_destroyed')

      const secondRunMoney = progressionManager.currencySystem.getCurrentMoney()
      expect(secondRunMoney).toBe(firstRunMoney + 300) // +150 base + 150 milestones

      // Check total statistics
      const stats = progressionManager.getProgressionStats()
      expect(stats.totalDistance).toBe(2500)
      expect(stats.totalRuns).toBe(2)
      expect(stats.averageDistance).toBe(1250)
      expect(stats.bestDistance).toBe(1500)
    })

    test('should persist data across manager instances', () => {
      // First manager instance
      const vehicle = { fuel: 100, health: 100 }
      progressionManager.startRun({ x: 0, y: 0 })
      progressionManager.updateProgress({ x: 2000, y: 0 }, vehicle)
      progressionManager.endRun('fuel_depleted')

      const firstMoney = progressionManager.currencySystem.getCurrentMoney()
      expect(firstMoney).toBeGreaterThan(0)

      // Create new manager instance (simulating game restart)
      const newManager = new ProgressionManager(mockSaveManager)
      
      // Check data was loaded
      expect(newManager.currencySystem.getCurrentMoney()).toBe(firstMoney)
      expect(newManager.distanceTracker.getTotalDistance()).toBe(2000)
      expect(newManager.runHistory).toHaveLength(1)
      
      const stats = newManager.getProgressionStats()
      expect(stats.bestDistance).toBe(2000)
    })
  })

  describe('Currency and Distance Integration', () => {
    test('should correctly calculate money from distance and milestones', () => {
      const testCases = [
        { distance: 0, expectedBase: 0, expectedMilestones: 0 },
        { distance: 400, expectedBase: 40, expectedMilestones: 0 },
        { distance: 500, expectedBase: 50, expectedMilestones: 50 },
        { distance: 1000, expectedBase: 100, expectedMilestones: 150 }, // 50 + 100
        { distance: 2500, expectedBase: 250, expectedMilestones: 400 }, // 50+100+150+100 (2000m bonus)
      ]

      testCases.forEach(({ distance, expectedBase, expectedMilestones }) => {
        // Reset for each test
        progressionManager.reset()
        
        const vehicle = { fuel: 100, health: 100 }
        progressionManager.startRun({ x: 0, y: 0 })
        progressionManager.updateProgress({ x: distance, y: 0 }, vehicle)
        const results = progressionManager.endRun('fuel_depleted')

        expect(results.baseMoney).toBe(expectedBase)
        expect(results.milestoneBonus).toBe(expectedMilestones)
        expect(progressionManager.currencySystem.getCurrentMoney()).toBe(expectedBase + expectedMilestones)
      })
    })

    test('should handle spending money and track statistics', () => {
      // Earn some money first
      const vehicle = { fuel: 100, health: 100 }
      progressionManager.startRun({ x: 0, y: 0 })
      progressionManager.updateProgress({ x: 1000, y: 0 }, vehicle)
      progressionManager.endRun('fuel_depleted')

      const initialMoney = progressionManager.currencySystem.getCurrentMoney()
      expect(initialMoney).toBe(250)

      // Spend money on upgrades
      const success1 = progressionManager.currencySystem.spendMoney(100, 'engine_upgrade')
      const success2 = progressionManager.currencySystem.spendMoney(50, 'fuel_upgrade')
      const success3 = progressionManager.currencySystem.spendMoney(200, 'expensive_upgrade') // Should fail

      expect(success1).toBe(true)
      expect(success2).toBe(true)
      expect(success3).toBe(false)

      expect(progressionManager.currencySystem.getCurrentMoney()).toBe(100)

      // Check statistics
      const stats = progressionManager.currencySystem.getStatistics()
      expect(stats.totalEarned).toBe(250)
      expect(stats.totalSpent).toBe(150)
      expect(stats.netEarnings).toBe(100)
    })
  })

  describe('Run End Conditions', () => {
    test('should automatically end run when fuel depleted', () => {
      const vehicle = { fuel: 10, health: 100 }
      
      progressionManager.startRun({ x: 0, y: 0 })
      progressionManager.updateProgress({ x: 500, y: 0 }, vehicle)
      
      expect(progressionManager.distanceTracker.isRunActive).toBe(true)
      
      // Deplete fuel
      vehicle.fuel = 0
      progressionManager.updateProgress({ x: 600, y: 0 }, vehicle)
      
      expect(progressionManager.distanceTracker.isRunActive).toBe(false)
      expect(progressionManager.runHistory[0].endReason).toBe('fuel_depleted')
    })

    test('should automatically end run when vehicle destroyed', () => {
      const vehicle = { fuel: 100, health: 20 }
      
      progressionManager.startRun({ x: 0, y: 0 })
      progressionManager.updateProgress({ x: 500, y: 0 }, vehicle)
      
      expect(progressionManager.distanceTracker.isRunActive).toBe(true)
      
      // Destroy vehicle
      vehicle.health = 0
      progressionManager.updateProgress({ x: 600, y: 0 }, vehicle)
      
      expect(progressionManager.distanceTracker.isRunActive).toBe(false)
      expect(progressionManager.runHistory[0].endReason).toBe('vehicle_destroyed')
    })

    test('should prioritize fuel depletion over vehicle destruction', () => {
      const vehicle = { fuel: 0, health: 0 }
      
      progressionManager.startRun({ x: 0, y: 0 })
      progressionManager.updateProgress({ x: 500, y: 0 }, vehicle)
      
      expect(progressionManager.runHistory[0].endReason).toBe('fuel_depleted')
    })
  })

  describe('Milestone System Integration', () => {
    test('should track milestones correctly across multiple runs', () => {
      const vehicle = { fuel: 100, health: 100 }

      // First run - reach 1000m
      progressionManager.startRun({ x: 0, y: 0 })
      progressionManager.updateProgress({ x: 1000, y: 0 }, vehicle)
      progressionManager.endRun('fuel_depleted')

      expect(progressionManager.runHistory[0].milestones).toHaveLength(2) // 500m, 1000m

      // Second run - reach 2000m
      progressionManager.startRun({ x: 0, y: 0 })
      progressionManager.updateProgress({ x: 2000, y: 0 }, vehicle)
      progressionManager.endRun('fuel_depleted')

      expect(progressionManager.runHistory[1].milestones).toHaveLength(3) // 500m, 1000m, 2000m

      // Check that milestones are independent between runs
      const firstRunMilestones = progressionManager.runHistory[0].milestones.map(m => m.distance)
      const secondRunMilestones = progressionManager.runHistory[1].milestones.map(m => m.distance)
      
      expect(firstRunMilestones).toEqual([500, 1000])
      expect(secondRunMilestones).toEqual([500, 1000, 2000])
    })

    test('should calculate milestone bonuses with correct scaling', () => {
      const vehicle = { fuel: 100, health: 100 }
      
      progressionManager.startRun({ x: 0, y: 0 })
      progressionManager.updateProgress({ x: 5000, y: 0 }, vehicle)
      const results = progressionManager.endRun('fuel_depleted')

      // Expected milestones: 500, 1000, 2000, 3000, 5000
      // Expected bonuses: 50, 100, 150, 200, 300
      expect(results.milestoneBonus).toBe(800) // 50+100+150+200+300
    })
  })

  describe('Best Distance Tracking', () => {
    test('should update best distance and dispatch events', () => {
      const vehicle = { fuel: 100, health: 100 }
      let recordEvents = []

      // Mock event listener
      global.window.dispatchEvent = jest.fn((event) => {
        if (event.type === 'progression_new_distance_record') {
          recordEvents.push(event.detail)
        }
      })

      // First run - 1000m (new record)
      progressionManager.startRun({ x: 0, y: 0 })
      progressionManager.updateProgress({ x: 1000, y: 0 }, vehicle)
      progressionManager.endRun('fuel_depleted')

      expect(recordEvents).toHaveLength(1)
      expect(recordEvents[0].distance).toBe(1000)

      // Second run - 800m (not a record)
      progressionManager.startRun({ x: 0, y: 0 })
      progressionManager.updateProgress({ x: 800, y: 0 }, vehicle)
      progressionManager.endRun('fuel_depleted')

      expect(recordEvents).toHaveLength(1) // No new record event

      // Third run - 1500m (new record)
      progressionManager.startRun({ x: 0, y: 0 })
      progressionManager.updateProgress({ x: 1500, y: 0 }, vehicle)
      progressionManager.endRun('fuel_depleted')

      expect(recordEvents).toHaveLength(2)
      expect(recordEvents[1].distance).toBe(1500)

      // Check final best distance
      const stats = progressionManager.getProgressionStats()
      expect(stats.bestDistance).toBe(1500)
    })
  })

  describe('Data Persistence and Recovery', () => {
    test('should handle corrupted save data gracefully', () => {
      // Corrupt the save data
      mockSaveManager.saveData = {
        money: 'invalid',
        statistics: null,
        runHistory: 'not an array'
      }

      // Should not throw and should use defaults
      expect(() => {
        const newManager = new ProgressionManager(mockSaveManager)
        expect(newManager.currencySystem.getCurrentMoney()).toBe(0)
        expect(newManager.runHistory).toEqual([])
      }).not.toThrow()
    })

    test('should maintain data integrity across save/load cycles', () => {
      const vehicle = { fuel: 100, health: 100 }

      // Perform several runs
      for (let i = 1; i <= 3; i++) {
        progressionManager.startRun({ x: 0, y: 0 })
        progressionManager.updateProgress({ x: i * 1000, y: 0 }, vehicle)
        progressionManager.endRun('fuel_depleted')
      }

      const originalStats = progressionManager.getProgressionStats()
      const originalMoney = progressionManager.currencySystem.getCurrentMoney()

      // Create new manager (simulating restart)
      const newManager = new ProgressionManager(mockSaveManager)
      const loadedStats = newManager.getProgressionStats()
      const loadedMoney = newManager.currencySystem.getCurrentMoney()

      // Verify data integrity
      expect(loadedStats.totalDistance).toBe(originalStats.totalDistance)
      expect(loadedStats.bestDistance).toBe(originalStats.bestDistance)
      expect(loadedStats.totalRuns).toBe(originalStats.totalRuns)
      expect(loadedMoney).toBe(originalMoney)
      expect(newManager.runHistory).toHaveLength(3)
    })
  })

  describe('Performance and Edge Cases', () => {
    test('should handle rapid position updates efficiently', () => {
      const vehicle = { fuel: 100, health: 100 }
      progressionManager.startRun({ x: 0, y: 0 })

      // Simulate 1000 rapid updates
      const startTime = Date.now()
      for (let i = 1; i <= 1000; i++) {
        progressionManager.updateProgress({ x: i, y: 0 }, vehicle)
      }
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(100) // Should complete in under 100ms
      expect(progressionManager.distanceTracker.getCurrentRunDistance()).toBe(1000)
    })

    test('should handle very large distances', () => {
      const vehicle = { fuel: 100, health: 100 }
      progressionManager.startRun({ x: 0, y: 0 })
      progressionManager.updateProgress({ x: 1000000, y: 0 }, vehicle) // 1 million units
      const results = progressionManager.endRun('fuel_depleted')

      expect(results.distance).toBe(1000000)
      expect(results.baseMoney).toBe(100000)
      expect(results.totalMoney).toBeGreaterThan(100000) // Should include milestone bonuses
    })

    test('should handle zero or negative movements correctly', () => {
      const vehicle = { fuel: 100, health: 100 }
      progressionManager.startRun({ x: 0, y: 0 })
      
      // Move forward
      progressionManager.updateProgress({ x: 100, y: 0 }, vehicle)
      expect(progressionManager.distanceTracker.getCurrentRunDistance()).toBe(100)
      
      // Move backward (should not increase distance)
      progressionManager.updateProgress({ x: 50, y: 0 }, vehicle)
      expect(progressionManager.distanceTracker.getCurrentRunDistance()).toBe(100)
      
      // Stay in same position
      progressionManager.updateProgress({ x: 50, y: 0 }, vehicle)
      expect(progressionManager.distanceTracker.getCurrentRunDistance()).toBe(100)
    })
  })
})