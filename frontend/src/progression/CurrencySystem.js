/**
 * CurrencySystem - Manages persistent currency storage and transactions
 * Handles money earning, spending, and persistence across runs
 */
class CurrencySystem {
  constructor(saveManager) {
    this.saveManager = saveManager
    this.currentMoney = 0
    this.totalEarned = 0
    this.totalSpent = 0
    
    // Load existing currency data
    this.loadCurrencyData()
  }

  /**
   * Load currency data from save system
   */
  loadCurrencyData() {
    const saveData = this.saveManager.loadGame()
    
    // Handle invalid money data
    this.currentMoney = (typeof saveData.money === 'number' && saveData.money >= 0) ? saveData.money : 0
    
    // Handle invalid statistics
    if (saveData.statistics && typeof saveData.statistics === 'object') {
      this.totalEarned = (typeof saveData.statistics.totalMoneyEarned === 'number' && saveData.statistics.totalMoneyEarned >= 0) 
        ? saveData.statistics.totalMoneyEarned : 0
      this.totalSpent = (typeof saveData.statistics.totalMoneySpent === 'number' && saveData.statistics.totalMoneySpent >= 0) 
        ? saveData.statistics.totalMoneySpent : 0
    } else {
      this.totalEarned = 0
      this.totalSpent = 0
    }
  }

  /**
   * Save currency data to persistent storage
   */
  saveCurrencyData() {
    const saveData = this.saveManager.loadGame()
    saveData.money = this.currentMoney
    
    if (!saveData.statistics) {
      saveData.statistics = {}
    }
    saveData.statistics.totalMoneyEarned = this.totalEarned
    saveData.statistics.totalMoneySpent = this.totalSpent
    
    this.saveManager.saveGame(saveData)
  }

  /**
   * Get current money amount
   * @returns {number} Current money
   */
  getCurrentMoney() {
    return this.currentMoney
  }

  /**
   * Add money to current balance
   * @param {number} amount - Amount to add
   * @param {string} source - Source of money (distance, milestone, bonus)
   */
  addMoney(amount, source = 'unknown') {
    if (amount <= 0) return

    this.currentMoney += amount
    this.totalEarned += amount
    
    // Save immediately to prevent loss
    this.saveCurrencyData()
    
    // Dispatch event for UI updates
    this.dispatchCurrencyEvent('money_added', {
      amount: amount,
      newTotal: this.currentMoney,
      source: source
    })
  }

  /**
   * Spend money if sufficient funds available
   * @param {number} amount - Amount to spend
   * @param {string} purpose - Purpose of spending (upgrade, vehicle, etc.)
   * @returns {boolean} True if transaction successful
   */
  spendMoney(amount, purpose = 'unknown') {
    if (amount <= 0) return false
    if (this.currentMoney < amount) return false

    this.currentMoney -= amount
    this.totalSpent += amount
    
    // Save immediately
    this.saveCurrencyData()
    
    // Dispatch event for UI updates
    this.dispatchCurrencyEvent('money_spent', {
      amount: amount,
      newTotal: this.currentMoney,
      purpose: purpose
    })
    
    return true
  }

  /**
   * Check if player can afford a purchase
   * @param {number} cost - Cost to check
   * @returns {boolean} True if affordable
   */
  canAfford(cost) {
    return this.currentMoney >= cost
  }

  /**
   * Process run completion and add earned money
   * @param {Object} runResults - Results from DistanceTracker.endRun()
   */
  processRunCompletion(runResults) {
    if (!runResults || runResults.totalMoney <= 0) return

    // Add base money from distance
    if (runResults.baseMoney > 0) {
      this.addMoney(runResults.baseMoney, 'distance')
    }

    // Add milestone bonuses
    if (runResults.milestoneBonus > 0) {
      this.addMoney(runResults.milestoneBonus, 'milestone')
    }

    // Dispatch run completion event
    this.dispatchCurrencyEvent('run_completed', {
      distance: runResults.distance,
      baseMoney: runResults.baseMoney,
      milestoneBonus: runResults.milestoneBonus,
      totalMoney: runResults.totalMoney,
      newBalance: this.currentMoney
    })
  }

  /**
   * Get currency statistics
   * @returns {Object} Currency statistics
   */
  getStatistics() {
    return {
      currentMoney: this.currentMoney,
      totalEarned: this.totalEarned,
      totalSpent: this.totalSpent,
      netEarnings: this.totalEarned - this.totalSpent
    }
  }

  /**
   * Reset currency to starting state (for testing or new game)
   */
  reset() {
    this.currentMoney = 0
    this.totalEarned = 0
    this.totalSpent = 0
    this.saveCurrencyData()
    
    this.dispatchCurrencyEvent('currency_reset', {
      newTotal: this.currentMoney
    })
  }

  /**
   * Dispatch currency-related events for UI updates
   * @param {string} eventType - Type of event
   * @param {Object} data - Event data
   */
  dispatchCurrencyEvent(eventType, data) {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      const event = new CustomEvent(`currency_${eventType}`, {
        detail: data
      })
      window.dispatchEvent(event)
    }
  }

  /**
   * Add event listener for currency changes
   * @param {string} eventType - Event type (added, spent, reset)
   * @param {Function} callback - Callback function
   */
  addEventListener(eventType, callback) {
    if (typeof window !== 'undefined') {
      window.addEventListener(`currency_${eventType}`, callback)
    }
  }

  /**
   * Remove event listener
   * @param {string} eventType - Event type
   * @param {Function} callback - Callback function
   */
  removeEventListener(eventType, callback) {
    if (typeof window !== 'undefined') {
      window.removeEventListener(`currency_${eventType}`, callback)
    }
  }
}

export default CurrencySystem