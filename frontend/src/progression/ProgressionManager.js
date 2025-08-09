import DistanceTracker from './DistanceTracker.js'
import CurrencySystem from './CurrencySystem.js'

/**
 * ProgressionManager - Integrates distance tracking and currency systems
 * Manages the complete progression loop for runs
 */
class ProgressionManager {
  constructor(saveManager) {
    this.distanceTracker = new DistanceTracker()
    this.currencySystem = new CurrencySystem(saveManager)
    this.saveManager = saveManager
    
    // Run state
    this.currentRun = null
    this.runHistory = []
    
    // Load progression data
    this.loadProgressionData()
  }

  /**
   * Load progression data from save system
   */
  loadProgressionData() {
    const saveData = this.saveManager.loadGame()
    
    // Load total distance
    if (saveData.statistics?.totalDistance) {
      this.distanceTracker.totalDistance = saveData.statistics.totalDistance
    }
    
    // Load run history
    this.runHistory = saveData.runHistory || []
  }

  /**
   * Save progression data to persistent storage
   */
  saveProgressionData() {
    const saveData = this.saveManager.loadGame()
    
    if (!saveData.statistics) {
      saveData.statistics = {}
    }
    
    saveData.statistics.totalDistance = this.distanceTracker.getTotalDistance()
    saveData.runHistory = this.runHistory.slice(-50) // Keep last 50 runs
    
    this.saveManager.saveGame(saveData)
  }

  /**
   * Start a new run
   * @param {Object} startPosition - Starting position {x, y}
   * @param {Object} vehicle - Vehicle object
   */
  startRun(startPosition = { x: 0, y: 0 }, vehicle = null) {
    this.distanceTracker.startRun(startPosition)
    
    this.currentRun = {
      startTime: Date.now(),
      startPosition: { ...startPosition },
      vehicle: vehicle ? {
        type: vehicle.type,
        upgrades: { ...vehicle.upgrades }
      } : null,
      milestones: [],
      endReason: null
    }
    
    // Dispatch run start event
    this.dispatchProgressionEvent('run_started', {
      startPosition: startPosition,
      vehicle: this.currentRun.vehicle
    })
  }

  /**
   * Update vehicle position and check for progression events
   * @param {Object} position - Current vehicle position {x, y}
   * @param {Object} vehicle - Current vehicle state
   */
  updateProgress(position, vehicle) {
    if (!this.distanceTracker.isRunActive) return

    // Update distance tracking
    this.distanceTracker.updatePosition(position)
    
    // Check for new milestones
    const newMilestones = this.distanceTracker.checkMilestones()
    if (newMilestones.length > 0) {
      if (!this.currentRun.milestones) {
        this.currentRun.milestones = []
      }
      this.currentRun.milestones.push(...newMilestones)
      
      // Dispatch milestone events
      newMilestones.forEach(milestone => {
        this.dispatchProgressionEvent('milestone_reached', {
          distance: milestone.distance,
          bonus: milestone.bonus,
          totalDistance: this.distanceTracker.getCurrentRunDistance()
        })
      })
    }
    
    // Check for run end conditions
    const endReason = this.distanceTracker.checkRunEndConditions(vehicle)
    if (endReason) {
      this.endRun(endReason)
    }
  }

  /**
   * End the current run
   * @param {string} reason - Reason for ending run
   * @returns {Object} Run results
   */
  endRun(reason) {
    if (!this.distanceTracker.isRunActive || !this.currentRun) {
      return null
    }

    // End distance tracking and get results
    const runResults = this.distanceTracker.endRun(reason)
    
    if (!runResults) return null

    // Complete current run data
    this.currentRun.endTime = Date.now()
    this.currentRun.duration = this.currentRun.endTime - this.currentRun.startTime
    this.currentRun.distance = runResults.distance
    this.currentRun.baseMoney = runResults.baseMoney
    this.currentRun.milestoneBonus = runResults.milestoneBonus
    this.currentRun.totalMoney = runResults.totalMoney
    this.currentRun.endReason = reason
    
    // Add to run history
    this.runHistory.push({ ...this.currentRun })
    
    // Process currency
    this.currencySystem.processRunCompletion(runResults)
    
    // Update best distance if needed
    this.updateBestDistance(runResults.distance)
    
    // Save progression data
    this.saveProgressionData()
    
    // Dispatch run end event
    this.dispatchProgressionEvent('run_ended', {
      ...runResults,
      duration: this.currentRun.duration,
      newBalance: this.currencySystem.getCurrentMoney()
    })
    
    // Clear current run
    this.currentRun = null
    
    return runResults
  }

  /**
   * Update best distance record
   * @param {number} distance - Distance achieved
   */
  updateBestDistance(distance) {
    const saveData = this.saveManager.loadGame()
    
    if (!saveData.statistics) {
      saveData.statistics = {}
    }
    
    if (!saveData.statistics.bestDistance || distance > saveData.statistics.bestDistance) {
      saveData.statistics.bestDistance = distance
      this.saveManager.saveGame(saveData)
      
      // Dispatch new record event
      this.dispatchProgressionEvent('new_distance_record', {
        distance: distance,
        previousRecord: saveData.statistics.bestDistance || 0
      })
    }
  }

  /**
   * Get current run statistics
   * @returns {Object} Current run stats
   */
  getCurrentRunStats() {
    if (!this.distanceTracker.isRunActive) return null
    
    const distanceStats = this.distanceTracker.getRunStats()
    
    return {
      ...distanceStats,
      startTime: this.currentRun?.startTime,
      duration: this.currentRun ? Date.now() - this.currentRun.startTime : 0,
      milestones: this.currentRun?.milestones || []
    }
  }

  /**
   * Get progression statistics
   * @returns {Object} Progression statistics
   */
  getProgressionStats() {
    const saveData = this.saveManager.loadGame()
    const currencyStats = this.currencySystem.getStatistics()
    
    return {
      totalDistance: this.distanceTracker.getTotalDistance(),
      bestDistance: saveData.statistics?.bestDistance || 0,
      totalRuns: this.runHistory.length,
      averageDistance: this.runHistory.length > 0 
        ? this.runHistory.reduce((sum, run) => sum + run.distance, 0) / this.runHistory.length 
        : 0,
      ...currencyStats
    }
  }

  /**
   * Get recent run history
   * @param {number} count - Number of recent runs to return
   * @returns {Array} Recent runs
   */
  getRecentRuns(count = 10) {
    return this.runHistory.slice(-count).reverse()
  }

  /**
   * Get currency system reference
   * @returns {CurrencySystem} Currency system instance
   */
  getCurrencySystem() {
    return this.currencySystem
  }

  /**
   * Get distance tracker reference
   * @returns {DistanceTracker} Distance tracker instance
   */
  getDistanceTracker() {
    return this.distanceTracker
  }

  /**
   * Reset all progression data
   */
  reset() {
    this.distanceTracker.reset()
    this.currencySystem.reset()
    this.currentRun = null
    this.runHistory = []
    this.saveProgressionData()
    
    this.dispatchProgressionEvent('progression_reset', {})
  }

  /**
   * Dispatch progression-related events
   * @param {string} eventType - Type of event
   * @param {Object} data - Event data
   */
  dispatchProgressionEvent(eventType, data) {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      const event = new CustomEvent(`progression_${eventType}`, {
        detail: data
      })
      window.dispatchEvent(event)
    }
  }

  /**
   * Add event listener for progression events
   * @param {string} eventType - Event type
   * @param {Function} callback - Callback function
   */
  addEventListener(eventType, callback) {
    if (typeof window !== 'undefined') {
      window.addEventListener(`progression_${eventType}`, callback)
    }
  }

  /**
   * Remove event listener
   * @param {string} eventType - Event type
   * @param {Function} callback - Callback function
   */
  removeEventListener(eventType, callback) {
    if (typeof window !== 'undefined') {
      window.removeEventListener(`progression_${eventType}`, callback)
    }
  }
}

export default ProgressionManager