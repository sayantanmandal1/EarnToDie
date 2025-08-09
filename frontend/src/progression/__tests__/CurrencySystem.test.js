import CurrencySystem from '../CurrencySystem.js'

// Mock SaveManager
class MockSaveManager {
  constructor() {
    this.saveData = {
      money: 0,
      statistics: {
        totalMoneyEarned: 0,
        totalMoneySpent: 0
      }
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
        totalMoneyEarned: 0,
        totalMoneySpent: 0
      }
    }
  }
}

// Mock window events for testing
const mockEvents = []
const mockWindow = {
  dispatchEvent: jest.fn((event) => {
    mockEvents.push(event)
  }),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}

describe('CurrencySystem', () => {
  let currencySystem
  let mockSaveManager
  let originalWindow

  beforeEach(() => {
    mockSaveManager = new MockSaveManager()
    mockEvents.length = 0
    
    // Mock window
    originalWindow = global.window
    global.window = mockWindow
    
    // Reset mock functions
    mockWindow.dispatchEvent.mockClear()
    mockWindow.addEventListener.mockClear()
    mockWindow.removeEventListener.mockClear()
    
    currencySystem = new CurrencySystem(mockSaveManager)
  })

  afterEach(() => {
    global.window = originalWindow
  })

  describe('Initialization', () => {
    test('should initialize with zero money by default', () => {
      expect(currencySystem.getCurrentMoney()).toBe(0)
      expect(currencySystem.totalEarned).toBe(0)
      expect(currencySystem.totalSpent).toBe(0)
    })

    test('should load existing currency data from save', () => {
      mockSaveManager.saveData = {
        money: 500,
        statistics: {
          totalMoneyEarned: 1000,
          totalMoneySpent: 500
        }
      }

      const newCurrencySystem = new CurrencySystem(mockSaveManager)
      expect(newCurrencySystem.getCurrentMoney()).toBe(500)
      expect(newCurrencySystem.totalEarned).toBe(1000)
      expect(newCurrencySystem.totalSpent).toBe(500)
    })

    test('should handle missing statistics in save data', () => {
      mockSaveManager.saveData = { money: 100 }
      
      const newCurrencySystem = new CurrencySystem(mockSaveManager)
      expect(newCurrencySystem.getCurrentMoney()).toBe(100)
      expect(newCurrencySystem.totalEarned).toBe(0)
      expect(newCurrencySystem.totalSpent).toBe(0)
    })
  })

  describe('Adding Money', () => {
    test('should add money correctly', () => {
      currencySystem.addMoney(100, 'distance')
      
      expect(currencySystem.getCurrentMoney()).toBe(100)
      expect(currencySystem.totalEarned).toBe(100)
    })

    test('should accumulate money from multiple sources', () => {
      currencySystem.addMoney(50, 'distance')
      currencySystem.addMoney(25, 'milestone')
      currencySystem.addMoney(10, 'bonus')
      
      expect(currencySystem.getCurrentMoney()).toBe(85)
      expect(currencySystem.totalEarned).toBe(85)
    })

    test('should not add negative or zero amounts', () => {
      currencySystem.addMoney(-50)
      currencySystem.addMoney(0)
      
      expect(currencySystem.getCurrentMoney()).toBe(0)
      expect(currencySystem.totalEarned).toBe(0)
    })

    test('should save data after adding money', () => {
      currencySystem.addMoney(100, 'distance')
      
      const savedData = mockSaveManager.loadGame()
      expect(savedData.money).toBe(100)
      expect(savedData.statistics.totalMoneyEarned).toBe(100)
    })

    test('should dispatch money added event', () => {
      currencySystem.addMoney(100, 'distance')
      
      expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'currency_money_added',
          detail: {
            amount: 100,
            newTotal: 100,
            source: 'distance'
          }
        })
      )
    })
  })

  describe('Spending Money', () => {
    beforeEach(() => {
      currencySystem.addMoney(500, 'test')
    })

    test('should spend money when sufficient funds available', () => {
      const success = currencySystem.spendMoney(200, 'upgrade')
      
      expect(success).toBe(true)
      expect(currencySystem.getCurrentMoney()).toBe(300)
      expect(currencySystem.totalSpent).toBe(200)
    })

    test('should not spend money when insufficient funds', () => {
      const success = currencySystem.spendMoney(600, 'upgrade')
      
      expect(success).toBe(false)
      expect(currencySystem.getCurrentMoney()).toBe(500)
      expect(currencySystem.totalSpent).toBe(0)
    })

    test('should not spend negative or zero amounts', () => {
      const success1 = currencySystem.spendMoney(-50)
      const success2 = currencySystem.spendMoney(0)
      
      expect(success1).toBe(false)
      expect(success2).toBe(false)
      expect(currencySystem.getCurrentMoney()).toBe(500)
    })

    test('should save data after spending money', () => {
      currencySystem.spendMoney(200, 'upgrade')
      
      const savedData = mockSaveManager.loadGame()
      expect(savedData.money).toBe(300)
      expect(savedData.statistics.totalMoneySpent).toBe(200)
    })

    test('should dispatch money spent event', () => {
      currencySystem.spendMoney(200, 'upgrade')
      
      expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'currency_money_spent',
          detail: {
            amount: 200,
            newTotal: 300,
            purpose: 'upgrade'
          }
        })
      )
    })
  })

  describe('Affordability Check', () => {
    beforeEach(() => {
      currencySystem.addMoney(100, 'test')
    })

    test('should return true when player can afford cost', () => {
      expect(currencySystem.canAfford(50)).toBe(true)
      expect(currencySystem.canAfford(100)).toBe(true)
    })

    test('should return false when player cannot afford cost', () => {
      expect(currencySystem.canAfford(150)).toBe(false)
      expect(currencySystem.canAfford(101)).toBe(false)
    })

    test('should handle edge cases', () => {
      expect(currencySystem.canAfford(0)).toBe(true)
      expect(currencySystem.canAfford(-10)).toBe(true) // Negative costs are always affordable
    })
  })

  describe('Run Completion Processing', () => {
    test('should process run results correctly', () => {
      const runResults = {
        distance: 1000,
        baseMoney: 100,
        milestoneBonus: 50,
        totalMoney: 150
      }

      currencySystem.processRunCompletion(runResults)
      
      expect(currencySystem.getCurrentMoney()).toBe(150)
      expect(currencySystem.totalEarned).toBe(150)
    })

    test('should handle run results with zero money', () => {
      const runResults = {
        distance: 0,
        baseMoney: 0,
        milestoneBonus: 0,
        totalMoney: 0
      }

      currencySystem.processRunCompletion(runResults)
      
      expect(currencySystem.getCurrentMoney()).toBe(0)
      expect(currencySystem.totalEarned).toBe(0)
    })

    test('should handle null or invalid run results', () => {
      currencySystem.processRunCompletion(null)
      currencySystem.processRunCompletion({})
      currencySystem.processRunCompletion({ totalMoney: -10 })
      
      expect(currencySystem.getCurrentMoney()).toBe(0)
    })

    test('should dispatch run completion event', () => {
      const runResults = {
        distance: 1000,
        baseMoney: 100,
        milestoneBonus: 50,
        totalMoney: 150
      }

      currencySystem.processRunCompletion(runResults)
      
      expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'currency_run_completed',
          detail: expect.objectContaining({
            distance: 1000,
            baseMoney: 100,
            milestoneBonus: 50,
            totalMoney: 150,
            newBalance: 150
          })
        })
      )
    })
  })

  describe('Statistics', () => {
    test('should return correct statistics', () => {
      currencySystem.addMoney(500, 'distance')
      currencySystem.spendMoney(200, 'upgrade')
      currencySystem.addMoney(100, 'milestone')
      
      const stats = currencySystem.getStatistics()
      
      expect(stats).toEqual({
        currentMoney: 400,
        totalEarned: 600,
        totalSpent: 200,
        netEarnings: 400
      })
    })

    test('should handle negative net earnings', () => {
      currencySystem.addMoney(100, 'distance')
      currencySystem.spendMoney(100, 'upgrade')
      
      // Simulate loading save with more spent than earned
      mockSaveManager.saveData.statistics.totalMoneySpent = 150
      currencySystem.loadCurrencyData()
      
      const stats = currencySystem.getStatistics()
      expect(stats.netEarnings).toBe(-50)
    })
  })

  describe('Reset Functionality', () => {
    test('should reset all currency data', () => {
      currencySystem.addMoney(500, 'distance')
      currencySystem.spendMoney(200, 'upgrade')
      
      currencySystem.reset()
      
      expect(currencySystem.getCurrentMoney()).toBe(0)
      expect(currencySystem.totalEarned).toBe(0)
      expect(currencySystem.totalSpent).toBe(0)
    })

    test('should save reset data', () => {
      currencySystem.addMoney(500, 'distance')
      currencySystem.reset()
      
      const savedData = mockSaveManager.loadGame()
      expect(savedData.money).toBe(0)
      expect(savedData.statistics.totalMoneyEarned).toBe(0)
      expect(savedData.statistics.totalMoneySpent).toBe(0)
    })

    test('should dispatch reset event', () => {
      currencySystem.reset()
      
      expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'currency_currency_reset',
          detail: { newTotal: 0 }
        })
      )
    })
  })

  describe('Event Management', () => {
    test('should add event listeners', () => {
      const callback = jest.fn()
      currencySystem.addEventListener('money_added', callback)
      
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('currency_money_added', callback)
    })

    test('should remove event listeners', () => {
      const callback = jest.fn()
      currencySystem.removeEventListener('money_spent', callback)
      
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith('currency_money_spent', callback)
    })

    test('should handle missing window object gracefully', () => {
      global.window = undefined
      
      expect(() => {
        currencySystem.addEventListener('test', () => {})
        currencySystem.removeEventListener('test', () => {})
        currencySystem.addMoney(100, 'test')
      }).not.toThrow()
    })
  })

  describe('Data Persistence', () => {
    test('should create statistics object if missing', () => {
      mockSaveManager.saveData = { money: 100 }
      currencySystem.addMoney(50, 'test')
      
      const savedData = mockSaveManager.loadGame()
      expect(savedData.statistics).toBeDefined()
      expect(savedData.statistics.totalMoneyEarned).toBe(50)
    })

    test('should preserve existing save data structure', () => {
      mockSaveManager.saveData = {
        money: 100,
        vehicles: ['STARTER_CAR'],
        otherData: 'preserved'
      }
      
      // Create new currency system to load the existing data
      const newCurrencySystem = new CurrencySystem(mockSaveManager)
      newCurrencySystem.addMoney(50, 'test')
      
      const savedData = mockSaveManager.loadGame()
      expect(savedData.vehicles).toEqual(['STARTER_CAR'])
      expect(savedData.otherData).toBe('preserved')
      expect(savedData.money).toBe(150)
    })
  })
})