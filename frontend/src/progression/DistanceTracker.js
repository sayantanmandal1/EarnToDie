/**
 * DistanceTracker - Measures vehicle travel distance and manages currency conversion
 * Handles distance calculation, milestone bonuses, and run ending conditions
 */
class DistanceTracker {
  constructor() {
    this.startPosition = { x: 0, y: 0 }
    this.currentPosition = { x: 0, y: 0 }
    this.totalDistance = 0
    this.runDistance = 0
    this.isRunActive = false
    this.milestones = [500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000]
    this.reachedMilestones = new Set()
    
    // Currency conversion rates
    this.baseMoneyRate = 0.1 // 1 money per 10 distance units
    this.milestoneBonus = 50 // Base bonus for reaching milestones
    
    // Run ending conditions
    this.runEndReasons = {
      FUEL_DEPLETED: 'fuel_depleted',
      VEHICLE_DESTROYED: 'vehicle_destroyed',
      MANUAL_END: 'manual_end',
      STAGE_COMPLETED: 'stage_completed'
    }
    
    this.currentRunEndReason = null
  }

  /**
   * Start a new run from the given position
   * @param {Object} startPos - Starting position {x, y}
   */
  startRun(startPos = { x: 0, y: 0 }) {
    this.startPosition = { ...startPos }
    this.currentPosition = { ...startPos }
    this.runDistance = 0
    this.isRunActive = true
    this.reachedMilestones.clear()
    this.currentRunEndReason = null
  }

  /**
   * Update the current vehicle position and calculate distance
   * @param {Object} position - Current vehicle position {x, y}
   */
  updatePosition(position) {
    if (!this.isRunActive) return

    const previousPosition = { ...this.currentPosition }
    this.currentPosition = { ...position }
    
    // Calculate distance traveled since last update (primarily horizontal)
    const deltaX = this.currentPosition.x - previousPosition.x
    const deltaY = this.currentPosition.y - previousPosition.y
    const segmentDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    
    // Only count forward progress (positive X movement)
    if (deltaX > 0) {
      this.runDistance += segmentDistance
      this.totalDistance += segmentDistance
    }
  }

  /**
   * Get the current run distance
   * @returns {number} Distance traveled in current run
   */
  getCurrentRunDistance() {
    return Math.floor(this.runDistance)
  }

  /**
   * Get the total distance across all runs
   * @returns {number} Total distance traveled
   */
  getTotalDistance() {
    return Math.floor(this.totalDistance)
  }

  /**
   * Calculate money earned from distance traveled
   * @param {number} distance - Distance to convert to money
   * @returns {number} Money earned
   */
  calculateMoneyFromDistance(distance) {
    return Math.floor(distance * this.baseMoneyRate)
  }

  /**
   * Check for milestone bonuses and return any new ones reached
   * @returns {Array} Array of milestone objects {distance, bonus}
   */
  checkMilestones() {
    const newMilestones = []
    const currentDistance = this.getCurrentRunDistance()
    
    for (const milestone of this.milestones) {
      if (currentDistance >= milestone && !this.reachedMilestones.has(milestone)) {
        this.reachedMilestones.add(milestone)
        const bonus = this.calculateMilestoneBonus(milestone)
        newMilestones.push({
          distance: milestone,
          bonus: bonus
        })
      }
    }
    
    return newMilestones
  }

  /**
   * Calculate bonus money for reaching a milestone
   * @param {number} milestone - Milestone distance
   * @returns {number} Bonus money amount
   */
  calculateMilestoneBonus(milestone) {
    // Bonus increases with milestone distance
    const multiplier = Math.floor(milestone / 1000) + 1
    return this.milestoneBonus * multiplier
  }

  /**
   * End the current run with specified reason
   * @param {string} reason - Reason for ending run
   * @returns {Object} Run results
   */
  endRun(reason) {
    if (!this.isRunActive) {
      return null
    }

    this.isRunActive = false
    this.currentRunEndReason = reason
    
    const runDistance = this.getCurrentRunDistance()
    const baseMoney = this.calculateMoneyFromDistance(runDistance)
    
    // Calculate milestone bonuses
    const milestones = this.checkMilestones()
    const milestoneBonus = milestones.reduce((total, milestone) => total + milestone.bonus, 0)
    
    const totalMoney = baseMoney + milestoneBonus
    
    return {
      distance: runDistance,
      baseMoney: baseMoney,
      milestoneBonus: milestoneBonus,
      totalMoney: totalMoney,
      milestones: milestones,
      endReason: reason
    }
  }

  /**
   * Check if run should end based on vehicle conditions
   * @param {Object} vehicle - Vehicle object with fuel and health
   * @returns {string|null} End reason or null if run should continue
   */
  checkRunEndConditions(vehicle) {
    if (!this.isRunActive) return null
    
    if (vehicle.fuel <= 0) {
      return this.runEndReasons.FUEL_DEPLETED
    }
    
    if (vehicle.health <= 0) {
      return this.runEndReasons.VEHICLE_DESTROYED
    }
    
    return null
  }

  /**
   * Get current run statistics
   * @returns {Object} Current run stats
   */
  getRunStats() {
    return {
      distance: this.getCurrentRunDistance(),
      isActive: this.isRunActive,
      milestones: Array.from(this.reachedMilestones),
      estimatedMoney: this.calculateMoneyFromDistance(this.getCurrentRunDistance()),
      endReason: this.currentRunEndReason
    }
  }

  /**
   * Reset all tracking data
   */
  reset() {
    this.startPosition = { x: 0, y: 0 }
    this.currentPosition = { x: 0, y: 0 }
    this.totalDistance = 0
    this.runDistance = 0
    this.isRunActive = false
    this.reachedMilestones.clear()
    this.currentRunEndReason = null
  }
}

export default DistanceTracker