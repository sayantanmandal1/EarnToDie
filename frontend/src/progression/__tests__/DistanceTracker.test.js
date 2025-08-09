import DistanceTracker from '../DistanceTracker.js'

describe('DistanceTracker', () => {
  let tracker

  beforeEach(() => {
    tracker = new DistanceTracker()
  })

  describe('Run Management', () => {
    test('should initialize with correct default values', () => {
      expect(tracker.isRunActive).toBe(false)
      expect(tracker.getCurrentRunDistance()).toBe(0)
      expect(tracker.getTotalDistance()).toBe(0)
    })

    test('should start a run correctly', () => {
      const startPos = { x: 100, y: 200 }
      tracker.startRun(startPos)

      expect(tracker.isRunActive).toBe(true)
      expect(tracker.startPosition).toEqual(startPos)
      expect(tracker.currentPosition).toEqual(startPos)
      expect(tracker.getCurrentRunDistance()).toBe(0)
      expect(tracker.reachedMilestones.size).toBe(0)
    })

    test('should start run with default position if none provided', () => {
      tracker.startRun()

      expect(tracker.startPosition).toEqual({ x: 0, y: 0 })
      expect(tracker.currentPosition).toEqual({ x: 0, y: 0 })
    })
  })

  describe('Distance Calculation', () => {
    beforeEach(() => {
      tracker.startRun({ x: 0, y: 0 })
    })

    test('should calculate distance correctly for horizontal movement', () => {
      tracker.updatePosition({ x: 100, y: 0 })
      expect(tracker.getCurrentRunDistance()).toBe(100)

      tracker.updatePosition({ x: 200, y: 0 })
      expect(tracker.getCurrentRunDistance()).toBe(200)
    })

    test('should calculate distance correctly for diagonal movement', () => {
      tracker.updatePosition({ x: 30, y: 40 }) // 3-4-5 triangle
      expect(tracker.getCurrentRunDistance()).toBe(50)
    })

    test('should only count forward progress', () => {
      tracker.updatePosition({ x: 100, y: 0 })
      expect(tracker.getCurrentRunDistance()).toBe(100)

      // Move backward - should not increase distance
      tracker.updatePosition({ x: 50, y: 0 })
      expect(tracker.getCurrentRunDistance()).toBe(100)

      // Move forward again
      tracker.updatePosition({ x: 150, y: 0 })
      expect(tracker.getCurrentRunDistance()).toBe(200)
    })

    test('should accumulate total distance across runs', () => {
      // First run
      tracker.updatePosition({ x: 100, y: 0 })
      tracker.endRun('fuel_depleted')
      expect(tracker.getTotalDistance()).toBe(100)

      // Second run
      tracker.startRun({ x: 0, y: 0 })
      tracker.updatePosition({ x: 150, y: 0 })
      expect(tracker.getCurrentRunDistance()).toBe(150)
      expect(tracker.getTotalDistance()).toBe(250)
    })

    test('should not update position when run is not active', () => {
      tracker.endRun('manual_end')
      tracker.updatePosition({ x: 100, y: 0 })
      expect(tracker.getCurrentRunDistance()).toBe(0)
    })
  })

  describe('Currency Conversion', () => {
    test('should calculate money from distance correctly', () => {
      expect(tracker.calculateMoneyFromDistance(0)).toBe(0)
      expect(tracker.calculateMoneyFromDistance(100)).toBe(10)
      expect(tracker.calculateMoneyFromDistance(1000)).toBe(100)
      expect(tracker.calculateMoneyFromDistance(1550)).toBe(155)
    })

    test('should handle fractional distances', () => {
      expect(tracker.calculateMoneyFromDistance(99.9)).toBe(9)
      expect(tracker.calculateMoneyFromDistance(100.1)).toBe(10)
    })
  })

  describe('Milestone System', () => {
    beforeEach(() => {
      tracker.startRun({ x: 0, y: 0 })
    })

    test('should detect first milestone', () => {
      tracker.updatePosition({ x: 500, y: 0 })
      const milestones = tracker.checkMilestones()

      expect(milestones).toHaveLength(1)
      expect(milestones[0].distance).toBe(500)
      expect(milestones[0].bonus).toBe(50) // Base bonus
    })

    test('should detect multiple milestones at once', () => {
      tracker.updatePosition({ x: 1500, y: 0 })
      const milestones = tracker.checkMilestones()

      expect(milestones).toHaveLength(2) // 500, 1000 (1500 doesn't reach 2000)
      expect(milestones.map(m => m.distance)).toEqual([500, 1000])
    })

    test('should not repeat milestones in same run', () => {
      tracker.updatePosition({ x: 600, y: 0 })
      let milestones = tracker.checkMilestones()
      expect(milestones).toHaveLength(1)

      tracker.updatePosition({ x: 700, y: 0 })
      milestones = tracker.checkMilestones()
      expect(milestones).toHaveLength(0) // No new milestones
    })

    test('should calculate milestone bonuses correctly', () => {
      expect(tracker.calculateMilestoneBonus(500)).toBe(50)   // (500/1000 + 1) * 50 = 50
      expect(tracker.calculateMilestoneBonus(1000)).toBe(100) // (1000/1000 + 1) * 50 = 100
      expect(tracker.calculateMilestoneBonus(2000)).toBe(150) // (2000/1000 + 1) * 50 = 150
      expect(tracker.calculateMilestoneBonus(5000)).toBe(300) // (5000/1000 + 1) * 50 = 300
    })

    test('should reset milestones for new run', () => {
      tracker.updatePosition({ x: 1000, y: 0 })
      tracker.checkMilestones()
      tracker.endRun('fuel_depleted')

      tracker.startRun({ x: 0, y: 0 })
      tracker.updatePosition({ x: 500, y: 0 })
      const milestones = tracker.checkMilestones()

      expect(milestones).toHaveLength(1)
      expect(milestones[0].distance).toBe(500)
    })
  })

  describe('Run Ending Conditions', () => {
    beforeEach(() => {
      tracker.startRun({ x: 0, y: 0 })
    })

    test('should detect fuel depletion', () => {
      const vehicle = { fuel: 0, health: 100 }
      const endReason = tracker.checkRunEndConditions(vehicle)
      expect(endReason).toBe('fuel_depleted')
    })

    test('should detect vehicle destruction', () => {
      const vehicle = { fuel: 50, health: 0 }
      const endReason = tracker.checkRunEndConditions(vehicle)
      expect(endReason).toBe('vehicle_destroyed')
    })

    test('should prioritize fuel depletion over destruction', () => {
      const vehicle = { fuel: 0, health: 0 }
      const endReason = tracker.checkRunEndConditions(vehicle)
      expect(endReason).toBe('fuel_depleted')
    })

    test('should return null when vehicle is healthy', () => {
      const vehicle = { fuel: 50, health: 100 }
      const endReason = tracker.checkRunEndConditions(vehicle)
      expect(endReason).toBeNull()
    })

    test('should return null when run is not active', () => {
      tracker.endRun('manual_end')
      const vehicle = { fuel: 0, health: 0 }
      const endReason = tracker.checkRunEndConditions(vehicle)
      expect(endReason).toBeNull()
    })
  })

  describe('Run Results', () => {
    beforeEach(() => {
      tracker.startRun({ x: 0, y: 0 })
    })

    test('should end run and return correct results', () => {
      tracker.updatePosition({ x: 1500, y: 0 })
      const results = tracker.endRun('fuel_depleted')

      expect(results).toEqual({
        distance: 1500,
        baseMoney: 150, // 1500 * 0.1
        milestoneBonus: 150, // 50 (500m) + 100 (1000m)
        totalMoney: 300,
        milestones: [
          { distance: 500, bonus: 50 },
          { distance: 1000, bonus: 100 }
        ],
        endReason: 'fuel_depleted'
      })

      expect(tracker.isRunActive).toBe(false)
    })

    test('should return null when ending inactive run', () => {
      tracker.endRun('manual_end')
      const results = tracker.endRun('fuel_depleted')
      expect(results).toBeNull()
    })

    test('should handle run with no distance', () => {
      const results = tracker.endRun('vehicle_destroyed')

      expect(results).toEqual({
        distance: 0,
        baseMoney: 0,
        milestoneBonus: 0,
        totalMoney: 0,
        milestones: [],
        endReason: 'vehicle_destroyed'
      })
    })
  })

  describe('Run Statistics', () => {
    test('should return correct stats during active run', () => {
      tracker.startRun({ x: 0, y: 0 })
      tracker.updatePosition({ x: 750, y: 0 })
      tracker.checkMilestones() // Trigger milestone check

      const stats = tracker.getRunStats()
      expect(stats).toEqual({
        distance: 750,
        isActive: true,
        milestones: [500],
        estimatedMoney: 75,
        endReason: null
      })
    })

    test('should return correct stats for inactive run', () => {
      const stats = tracker.getRunStats()
      expect(stats).toEqual({
        distance: 0,
        isActive: false,
        milestones: [],
        estimatedMoney: 0,
        endReason: null
      })
    })
  })

  describe('Reset Functionality', () => {
    test('should reset all tracking data', () => {
      tracker.startRun({ x: 100, y: 200 })
      tracker.updatePosition({ x: 500, y: 200 })
      tracker.totalDistance = 1000
      tracker.endRun('manual_end')

      tracker.reset()

      expect(tracker.startPosition).toEqual({ x: 0, y: 0 })
      expect(tracker.currentPosition).toEqual({ x: 0, y: 0 })
      expect(tracker.totalDistance).toBe(0)
      expect(tracker.runDistance).toBe(0)
      expect(tracker.isRunActive).toBe(false)
      expect(tracker.reachedMilestones.size).toBe(0)
      expect(tracker.currentRunEndReason).toBeNull()
    })
  })

  describe('Edge Cases', () => {
    test('should handle very small movements', () => {
      tracker.startRun({ x: 0, y: 0 })
      tracker.updatePosition({ x: 0.1, y: 0 })
      expect(tracker.getCurrentRunDistance()).toBe(0) // Floored to 0
    })

    test('should handle negative coordinates', () => {
      tracker.startRun({ x: -100, y: -100 })
      tracker.updatePosition({ x: 0, y: -100 })
      expect(tracker.getCurrentRunDistance()).toBe(100)
    })

    test('should handle same position updates', () => {
      tracker.startRun({ x: 0, y: 0 })
      tracker.updatePosition({ x: 0, y: 0 })
      tracker.updatePosition({ x: 0, y: 0 })
      expect(tracker.getCurrentRunDistance()).toBe(0)
    })
  })
})