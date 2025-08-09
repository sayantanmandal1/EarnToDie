import ProgressionManager from '../ProgressionManager.js'

// Mock SaveManager
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
    return { ...this.saveData }
  }

  saveGame(data) {
    this.saveData = { ...data }
  }

  reset() {
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
}

// Mock window events
const mockEvents = []
const mockWindow = {
  dispatchEvent: jest.fn((event) => {
    mockEvents.push(event)
  }),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}

describe('ProgressionManager', () => {
  let progressionManager
  let mockSaveManager
  let originalWindow

  beforeEach(() => {
    mockSaveManager = new MockSaveManager()
    progressionManager = new ProgressionManager(mockSaveManager)
    mockEvents.length = 0
    
    // Mock window
    originalWindow = global.window
    global.window = mockWindow
  })

  afterEach(() => {
    global.window = originalWindow
  })

  describe('Initialization', () => {
    test('should initialize with correct components', () => {
      expect(progressionManager.distanceTracker).toBeDefined()
      expect(progressionManager.currencySystem).toBeDefined()
      expect(progressionManager.currentRun).toBeNull()
      expect(progressionManager.runHistory).toEqual([])
    })

    test('should load existing progression data', () => {
      mockSaveManager.saveData = {
        statistics: { totalDistance: 5000 },
        runHistory: [{ distance: 1000, endReason: 'fuel_depleted' }]
      }

      const newManager = new ProgressionManager(mockSaveManager)
      expect(newManager.distanceTracker.getTotalDistance()).toBe(5000)
      expect(newManager.runHistory).toHaveLength(1)
    })
  })

  describe('Run Management', () => {
    test('should start a run correctly', () => {
      const startPos = { x: 0, y: 0 }
      const vehicle = { type: 'STARTER_CAR', upgrades: { engine: 1 } }

      progressionManager.startRun(startPos, vehicle)

      expect(progressionManager.distanceTracker.isRunActive).toBe(true)
      expect(progressionManager.currentRun).toBeDefined()
      expect(progressionManager.currentRun.startPosition).toEqual(startPos)
      expect(progressionManager.currentRun.vehicle.type).toBe('STARTER_CAR')
    })

    test('should start run with default parameters', () => {
      progressionManager.startRun()

      expect(progressionManager.distanceTracker.isRunActive).toBe(true)
      expect(progressionManager.currentRun.startPosition).toEqual({ x: 0, y: 0 })
      expect(progressionManager.currentRun.vehicle).toBeNull()
    })

    test('should dispatch run started event', () => {
      const startPos = { x: 100, y: 200 }
      progressionManager.startRun(startPos)

      expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'progression_run_started',
          detail: {
            startPosition: startPos,
            vehicle: null
          }
        })
      )
    })
  })

  describe('Progress Updates', () => {
    beforeEach(() => {
      progressionManager.startRun({ x: 0, y: 0 })
    })

    test('should update progress correctly', () => {
      const position = { x: 500, y: 0 }
      const vehicle = { fuel: 80, health: 100 }

      progressionManager.updateProgress(position, vehicle)

      expect(progressionManager.distanceTracker.getCurrentRunDistance()).toBe(500)
    })

    test('should detect and dispatch milestone events', () => {
      const position = { x: 1000, y: 0 }
      const vehicle = { fuel: 80, health: 100 }

      progressionManager.updateProgress(position, vehicle)

      // Should dispatch milestone events for 500m and 1000m
      const milestoneEvents = mockEvents.filter(e => e.type === 'progression_milestone_reached')
      expect(milestoneEvents).toHaveLength(2)
      expect(milestoneEvents[0].detail.distance).toBe(500)
      expect(milestoneEvents[1].detail.distance).toBe(1000)
    })

    test('should auto-end run when fuel depleted', () => {
      const position = { x: 500, y: 0 }
      const vehicle = { fuel: 0, health: 100 }

      progressionManager.updateProgress(position, vehicle)

      expect(progressionManager.distanceTracker.isRunActive).toBe(false)
      expect(progressionManager.currentRun).toBeNull()
    })

    test('should auto-end run when vehicle destroyed', () => {
      const position = { x: 500, y: 0 }
      const vehicle = { fuel: 50, health: 0 }

      progressionManager.updateProgress(position, vehicle)

      expect(progressionManager.distanceTracker.isRunActive).toBe(false)
      expect(progressionManager.currentRun).toBeNull()
    })

    test('should not update when run is not active', () => {
      progressionManager.endRun('manual_end')
      
      const position = { x: 500, y: 0 }
      const vehicle = { fuel: 50, health: 100 }

      progressionManager.updateProgress(position, vehicle)

      expect(progressionManager.distanceTracker.getCurrentRunDistance()).toBe(0)
    })
  })

  describe('Run Ending', () => {
    beforeEach(() => {
      progressionManager.startRun({ x: 0, y: 0 })
      // Simulate some progress
      progressionManager.updateProgress({ x: 1500, y: 0 }, { fuel: 100, health: 100 })
    })

    test('should end run and return results', () => {
      const results = progressionManager.endRun('fuel_depleted')

      expect(results).toBeDefined()
      expect(results.distance).toBe(1500)
      expect(results.endReason).toBe('fuel_depleted')
      expect(progressionManager.distanceTracker.isRunActive).toBe(false)
      expect(progressionManager.currentRun).toBeNull()
    })

    test('should add run to history', () => {
      progressionManager.endRun('fuel_depleted')

      expect(progressionManager.runHistory).toHaveLength(1)
      expect(progressionManager.runHistory[0].distance).toBe(1500)
      expect(progressionManager.runHistory[0].endReason).toBe('fuel_depleted')
    })

    test('should update currency system', () => {
      const initialMoney = progressionManager.currencySystem.getCurrentMoney()
      progressionManager.endRun('fuel_depleted')

      const finalMoney = progressionManager.currencySystem.getCurrentMoney()
      expect(finalMoney).toBeGreaterThan(initialMoney)
    })

    test('should save progression data', () => {
      progressionManager.endRun('fuel_depleted')

      const savedData = mockSaveManager.loadGame()
      expect(savedData.statistics.totalDistance).toBe(1500)
      expect(savedData.runHistory).toHaveLength(1)
    })

    test('should dispatch run ended event', () => {
      progressionManager.endRun('fuel_depleted')

      expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'progression_run_ended',
          detail: expect.objectContaining({
            distance: 1500,
            endReason: 'fuel_depleted'
          })
        })
      )
    })

    test('should return null when ending inactive run', () => {
      progressionManager.endRun('manual_end')
      const results = progressionManager.endRun('fuel_depleted')

      expect(results).toBeNull()
    })
  })

  describe('Best Distance Tracking', () => {
    test('should update best distance on new record', () => {
      progressionManager.startRun({ x: 0, y: 0 })
      progressionManager.updateProgress({ x: 2000, y: 0 }, { fuel: 100, health: 100 })
      progressionManager.endRun('fuel_depleted')

      const savedData = mockSaveManager.loadGame()
      expect(savedData.statistics.bestDistance).toBe(2000)
    })

    test('should not update best distance if not exceeded', () => {
      // Set existing best distance
      mockSaveManager.saveData.statistics.bestDistance = 3000

      progressionManager.startRun({ x: 0, y: 0 })
      progressionManager.updateProgress({ x: 2000, y: 0 }, { fuel: 100, health: 100 })
      progressionManager.endRun('fuel_depleted')

      const savedData = mockSaveManager.loadGame()
      expect(savedData.statistics.bestDistance).toBe(3000)
    })

    test('should dispatch new record event', () => {
      progressionManager.startRun({ x: 0, y: 0 })
      progressionManager.updateProgress({ x: 2000, y: 0 }, { fuel: 100, health: 100 })
      progressionManager.endRun('fuel_depleted')

      expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'progression_new_distance_record',
          detail: expect.objectContaining({
            distance: 2000
          })
        })
      )
    })
  })

  describe('Statistics', () => {
    beforeEach(() => {
      // Add some run history
      progressionManager.runHistory = [
        { distance: 1000, endReason: 'fuel_depleted' },
        { distance: 1500, endReason: 'vehicle_destroyed' },
        { distance: 800, endReason: 'fuel_depleted' }
      ]
      progressionManager.distanceTracker.totalDistance = 3300
    })

    test('should return current run stats', () => {
      progressionManager.startRun({ x: 0, y: 0 })
      progressionManager.updateProgress({ x: 750, y: 0 }, { fuel: 100, health: 100 })

      const stats = progressionManager.getCurrentRunStats()

      expect(stats).toBeDefined()
      expect(stats.distance).toBe(750)
      expect(stats.isActive).toBe(true)
      expect(stats.startTime).toBeDefined()
      expect(stats.duration).toBeGreaterThan(0)
    })

    test('should return null for current run stats when no active run', () => {
      const stats = progressionManager.getCurrentRunStats()
      expect(stats).toBeNull()
    })

    test('should return progression statistics', () => {
      mockSaveManager.saveData.statistics.bestDistance = 1500

      const stats = progressionManager.getProgressionStats()

      expect(stats).toEqual({
        totalDistance: 3300,
        bestDistance: 1500,
        totalRuns: 3,
        averageDistance: 1100, // (1000 + 1500 + 800) / 3
        currentMoney: expect.any(Number),
        totalEarned: expect.any(Number),
        totalSpent: expect.any(Number),
        netEarnings: expect.any(Number)
      })
    })

    test('should handle empty run history', () => {
      progressionManager.runHistory = []
      progressionManager.distanceTracker.totalDistance = 0

      const stats = progressionManager.getProgressionStats()

      expect(stats.totalRuns).toBe(0)
      expect(stats.averageDistance).toBe(0)
    })
  })

  describe('Run History', () => {
    beforeEach(() => {
      // Add multiple runs to history
      for (let i = 0; i < 15; i++) {
        progressionManager.runHistory.push({
          distance: 1000 + i * 100,
          endReason: 'fuel_depleted',
          startTime: Date.now() - (15 - i) * 60000
        })
      }
    })

    test('should return recent runs in reverse order', () => {
      const recentRuns = progressionManager.getRecentRuns(5)

      expect(recentRuns).toHaveLength(5)
      expect(recentRuns[0].distance).toBe(2400) // Most recent
      expect(recentRuns[4].distance).toBe(2000) // 5th most recent
    })

    test('should return all runs if count exceeds history length', () => {
      progressionManager.runHistory = [
        { distance: 1000 },
        { distance: 1500 }
      ]

      const recentRuns = progressionManager.getRecentRuns(10)
      expect(recentRuns).toHaveLength(2)
    })

    test('should limit run history to 50 entries when saving', () => {
      // Add 60 runs
      for (let i = 0; i < 60; i++) {
        progressionManager.runHistory.push({ distance: i * 100 })
      }

      progressionManager.saveProgressionData()

      const savedData = mockSaveManager.loadGame()
      expect(savedData.runHistory).toHaveLength(50)
    })
  })

  describe('Component Access', () => {
    test('should provide access to currency system', () => {
      const currencySystem = progressionManager.getCurrencySystem()
      expect(currencySystem).toBe(progressionManager.currencySystem)
    })

    test('should provide access to distance tracker', () => {
      const distanceTracker = progressionManager.getDistanceTracker()
      expect(distanceTracker).toBe(progressionManager.distanceTracker)
    })
  })

  describe('Reset Functionality', () => {
    beforeEach(() => {
      // Set up some data
      progressionManager.startRun({ x: 0, y: 0 })
      progressionManager.updateProgress({ x: 1000, y: 0 }, { fuel: 100, health: 100 })
      progressionManager.endRun('fuel_depleted')
    })

    test('should reset all progression data', () => {
      progressionManager.reset()

      expect(progressionManager.distanceTracker.getTotalDistance()).toBe(0)
      expect(progressionManager.currencySystem.getCurrentMoney()).toBe(0)
      expect(progressionManager.currentRun).toBeNull()
      expect(progressionManager.runHistory).toEqual([])
    })

    test('should save reset data', () => {
      progressionManager.reset()

      const savedData = mockSaveManager.loadGame()
      expect(savedData.statistics.totalDistance).toBe(0)
      expect(savedData.runHistory).toEqual([])
      expect(savedData.money).toBe(0)
    })

    test('should dispatch reset event', () => {
      progressionManager.reset()

      expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'progression_progression_reset',
          detail: {}
        })
      )
    })
  })

  describe('Event Management', () => {
    test('should add event listeners', () => {
      const callback = jest.fn()
      progressionManager.addEventListener('run_started', callback)

      expect(mockWindow.addEventListener).toHaveBeenCalledWith('progression_run_started', callback)
    })

    test('should remove event listeners', () => {
      const callback = jest.fn()
      progressionManager.removeEventListener('run_ended', callback)

      expect(mockWindow.removeEventListener).toHaveBeenCalledWith('progression_run_ended', callback)
    })
  })

  describe('Edge Cases', () => {
    test('should handle missing save data gracefully', () => {
      mockSaveManager.saveData = {}
      
      const newManager = new ProgressionManager(mockSaveManager)
      expect(newManager.distanceTracker.getTotalDistance()).toBe(0)
      expect(newManager.runHistory).toEqual([])
    })

    test('should handle corrupted run history', () => {
      mockSaveManager.saveData.runHistory = null
      
      const newManager = new ProgressionManager(mockSaveManager)
      expect(newManager.runHistory).toEqual([])
    })

    test('should handle missing window object', () => {
      global.window = undefined

      expect(() => {
        progressionManager.addEventListener('test', () => {})
        progressionManager.dispatchProgressionEvent('test', {})
      }).not.toThrow()
    })
  })
})